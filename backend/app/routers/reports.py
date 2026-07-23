from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Any
from backend.app.core.database import get_db
from backend.app.core.security import get_current_user_id, check_role
from backend.app.models.models import Report, AuditLog, User
from backend.app.schemas import schemas

router = APIRouter(prefix="/reports", tags=["Diagnostic Reports"])

@router.get("/{report_id}", response_model=schemas.ReportResponse)
def get_report(
    report_id: int,
    db: Session = Depends(get_db),
    current_user_id: int = Depends(get_current_user_id)
) -> Any:
    report = db.query(Report).filter(Report.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
        
    # Role-based restriction: patients can view but if the report belongs to someone else they are blocked
    user = db.query(User).filter(User.id == current_user_id).first()
    if user.role == "patient" and report.scan.user_id != current_user_id and user.username.lower() not in report.scan.patient_name.lower():
        raise HTTPException(status_code=403, detail="Not authorized to access this report.")
        
    # Log read action
    audit = AuditLog(
        user_id=current_user_id,
        action="VIEW_REPORT",
        details=f"Report ID: {report_id}, Scan ID: {report.scan_id}"
    )
    db.add(audit)
    db.commit()
    
    return report

@router.put("/{report_id}", response_model=schemas.ReportResponse)
def update_report(
    report_id: int,
    report_update: schemas.ReportBase,
    db: Session = Depends(get_db),
    current_user: User = Depends(check_role(["doctor", "radiologist", "admin"]))
) -> Any:
    """Allows authorized clinical practitioners to override or edit report content."""
    report = db.query(Report).filter(Report.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
        
    if report_update.clinician_summary is not None:
        report.clinician_summary = report_update.clinician_summary
    if report_update.patient_summary is not None:
        report.patient_summary = report_update.patient_summary
    if report_update.confidence_score is not None:
        report.confidence_score = report_update.confidence_score
        
    db.commit()
    db.refresh(report)
    
    # Audit edit action
    audit = AuditLog(
        user_id=current_user.id,
        action="EDIT_REPORT_OVERRIDE",
        details=f"Report ID: {report_id}, By: {current_user.username}"
    )
    db.add(audit)
    db.commit()
    
    return report
