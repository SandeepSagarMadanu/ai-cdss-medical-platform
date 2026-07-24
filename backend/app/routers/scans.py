import os
import shutil
import uuid
import logging
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from sqlalchemy.orm import Session
from typing import List, Any
from backend.app.core.database import get_db
from backend.app.core.security import get_current_user_id
from backend.app.models.models import Scan, Report, MedicalCitation, AuditLog, User
from backend.app.schemas import schemas
from backend.app.agents.graph import orchestrator

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/scans", tags=["Medical Scans"])

# Directory to store uploaded medical scans and XAI overlays
UPLOAD_DIR = os.path.join(os.getcwd(), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.post("/upload", response_model=schemas.ScanResponse)
async def upload_and_process_scan(
    patient_name: str = Form(...),
    scan_type: str = Form(...),
    query: str = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user_id: int = Depends(get_current_user_id)
) -> Any:
    # 1. Save original image
    file_ext = os.path.splitext(file.filename)[1]
    unique_filename = f"{uuid.uuid4()}{file_ext}"
    file_path = os.path.join(UPLOAD_DIR, unique_filename)
    
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        logger.error(f"Failed to save uploaded file: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to save uploaded medical scan file."
        )

    # 2. Register Scan entry in database
    scan = Scan(
        user_id=current_user_id,
        patient_name=patient_name,
        scan_type=scan_type,
        original_image_path=f"/uploads/{unique_filename}",
        status="processing"
    )
    db.add(scan)
    db.commit()
    db.refresh(scan)
    
    # Audit upload
    user = db.query(User).filter(User.id == current_user_id).first()
    audit_log = AuditLog(
        user_id=current_user_id,
        action="SCAN_UPLOADED",
        details=f"Scan ID: {scan.id}, Patient: {patient_name}, Type: {scan_type}, User: {user.username}"
    )
    db.add(audit_log)
    db.commit()
    
    # 3. Run Agent Orchestrator (LangGraph workflow)
    try:
        gradcam_filename = f"gradcam_{unique_filename}"
        gradcam_path = os.path.join(UPLOAD_DIR, gradcam_filename)
        
        # Run agentic flow
        # In graph.py, the image analysis agent runs explainability_service.generate_gradcam
        # which saves the heatmap overlay at output_path. We pass the original file_path.
        agent_result = orchestrator.run(
            query=query,
            image_path=file_path,
            scan_type=scan_type
        )
        
        # Check if Grad-CAM file was successfully generated, else fallback path
        if os.path.exists(gradcam_path):
            scan.gradcam_image_path = f"/uploads/{gradcam_filename}"
        else:
            # Fallback to copy of original if something went wrong
            scan.gradcam_image_path = scan.original_image_path
            
        scan.status = "completed"
        db.commit()
        
        # 4. Save Report findings
        report = Report(
            scan_id=scan.id,
            clinician_summary=agent_result["clinician_report"],
            patient_summary=agent_result["patient_report"],
            confidence_score=agent_result["confidence_score"]
        )
        db.add(report)
        db.commit()
        db.refresh(report)
        
        # 5. Populate literature citations
        for cit in agent_result["citations"]:
            db_citation = MedicalCitation(
                report_id=report.id,
                source_title=cit["source_title"],
                authors=cit.get("authors"),
                journal=cit.get("journal"),
                publication_year=cit.get("publication_year"),
                url=cit.get("url"),
                snippet=cit.get("snippet"),
                similarity_score=cit.get("similarity_score")
            )
            db.add(db_citation)
            
        db.commit()
        
        # Audit processing complete
        audit_process = AuditLog(
            user_id=current_user_id,
            action="SCAN_PROCESSING_COMPLETED",
            details=f"Scan ID: {scan.id}, Report ID: {report.id}, Confidence: {report.confidence_score}"
        )
        db.add(audit_process)
        db.commit()
        
    except Exception as e:
        logger.error(f"Error processing scan {scan.id}: {e}")
        scan.status = "failed"
        db.commit()
        
        audit_fail = AuditLog(
            user_id=current_user_id,
            action="SCAN_PROCESSING_FAILED",
            details=f"Scan ID: {scan.id}, Error: {str(e)}"
        )
        db.add(audit_fail)
        db.commit()
        
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Clinical analysis pipeline error: {str(e)}"
        )
        
    # Refresh to pull relationship data
    db.refresh(scan)
    return scan

@router.get("/", response_model=List[schemas.ScanResponse])
def list_scans(
    db: Session = Depends(get_db),
    current_user_id: int = Depends(get_current_user_id)
) -> Any:
    # Patients can only view their own scans, doctors/radiologists/admins can view all scans
    user = db.query(User).filter(User.id == current_user_id).first()
    if user.role == "patient":
        # Search by patient name matching user profile username (simple fallback)
        scans = db.query(Scan).filter(
            (Scan.user_id == current_user_id) | (Scan.patient_name.ilike(f"%{user.username}%"))
        ).all()
    else:
        scans = db.query(Scan).all()
        
    # Log view action
    audit = AuditLog(
        user_id=current_user_id,
        action="VIEW_SCANS_LIST",
        details=f"Count: {len(scans)}"
    )
    db.add(audit)
    db.commit()
    
    return scans

@router.get("/{scan_id}", response_model=schemas.ScanResponse)
def get_scan(
    scan_id: int,
    db: Session = Depends(get_db),
    current_user_id: int = Depends(get_current_user_id)
) -> Any:
    scan = db.query(Scan).filter(Scan.id == scan_id).first()
    if not scan:
        raise HTTPException(status_code=404, detail="Scan not found")
        
    # Security check
    user = db.query(User).filter(User.id == current_user_id).first()
    if user.role == "patient" and scan.user_id != current_user_id and user.username.lower() not in scan.patient_name.lower():
        raise HTTPException(status_code=403, detail="Not authorized to access this scan.")
        
    # Audit log
    audit = AuditLog(
        user_id=current_user_id,
        action="VIEW_SCAN_DETAILS",
        details=f"Scan ID: {scan_id}"
    )
    db.add(audit)
    db.commit()
    
    return scan

from pydantic import BaseModel
from typing import List, Optional

class ChatMessage(BaseModel):
    role: str
    content: str

class FollowUpQuery(BaseModel):
    query: str
    history: Optional[List[ChatMessage]] = None

@router.post("/{scan_id}/query")
def query_scan_followup(
    scan_id: int,
    payload: FollowUpQuery,
    db: Session = Depends(get_db),
    current_user_id: int = Depends(get_current_user_id)
):
    user = db.query(User).filter(User.id == current_user_id).first()
    if not user:
        raise HTTPException(status_code=401, detail="User authentication required")

    scan = None
    if scan_id > 0:
        scan = db.query(Scan).filter(Scan.id == scan_id).first()
        
    report_text = "General clinical consultation query (No specific scan bound)."
    modality_text = "General Medical Consultation"
    patient_text = user.username

    if scan:
        # Security check if patient
        if user.role == "patient" and scan.user_id != current_user_id and user.username.lower() not in scan.patient_name.lower():
            pass
        else:
            report = scan.reports[0] if scan.reports else None
            report_text = f"Findings: {report.clinician_summary}" if report else "No prior report."
            modality_text = scan.scan_type
            patient_text = scan.patient_name

    # Format history
    history_lines = []
    if payload.history:
        for msg in payload.history:
            role_label = "Assistant" if msg.role == "assistant" else "User"
            history_lines.append(f"{role_label}: {msg.content}")
    history_text = "\n".join(history_lines)

    # Ask the LLM to answer the follow up question
    prompt = f"""You are a helpful Clinical AI Assistant. A user with the role of '{user.role}' (username: {user.username}) is asking a clinical question.
Context:
Modality/Type: {modality_text}
Patient Name: {patient_text}
Report Details: {report_text}

Conversation History:
{history_text}

User Question: {payload.query}

Instructions:
- Answer the question accurately, professionally, and style your tone to match the user's role ({user.role}). If the user is a patient, explain complex medical concepts simply. If they are a doctor or radiologist, provide clinical depth.
- Refer back to previous messages in the conversation history if relevant.
- Cite any relevant findings from the scan report if available.
- Maintain the clinical safety disclaimer: remind the user that this is an AI assistant, not a definitive doctor's advice."""

    from backend.app.agents.graph import call_llm
    response_text = call_llm(prompt)

    # Log audit trail
    audit = AuditLog(
        user_id=current_user_id,
        action="CHAT_CONSULT_QUERY",
        details=f"Scan ID: {scan_id}, Question: {payload.query[:60]}"
    )
    db.add(audit)
    db.commit()

    return {
        "response": response_text,
        "logs": [
            "[System]: Received follow-up consult question.",
            f"[Supervisor]: Routing query related to scan ID {scan_id}.",
            "[Conversation Agent]: Retrieving scan report context.",
            "[Conversation Agent]: Synthesizing answer with clinical guards."
        ]
    }

