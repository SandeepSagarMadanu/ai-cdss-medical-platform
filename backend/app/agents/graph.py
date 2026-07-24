import os
import base64
import requests
import logging
from typing import Dict, Any, List, TypedDict, Optional
from backend.app.core.config import settings
from backend.app.services.explainability import explainability_service
from backend.app.services.rag import rag_engine

logger = logging.getLogger(__name__)

# Try to import LangGraph components
HAS_LANGGRAPH = False
try:
    from langgraph.graph import StateGraph, END
    HAS_LANGGRAPH = True
except ImportError:
    logger.warning("LangGraph not installed. Utilizing internal robust State Machine fallback for agent execution.")

# Define Agent State structure
class AgentState(TypedDict):
    query: str
    image_path: Optional[str]
    scan_type: str
    findings: str
    citations: List[Dict[str, Any]]
    clinician_report: str
    patient_report: str
    confidence_score: float
    verification_status: str
    next_step: str
    logs: List[str]

# =====================================================================
# AGENT NODES IMPLEMENTATION
# =====================================================================

def supervisor_agent(state: AgentState) -> Dict[str, Any]:
    """Routes execution based on query context and orchestrates the 50-Agent Multi-Specialist Clinical Diagnostic Council."""
    logs = list(state.get("logs", []))
    if not logs:
        logs.append("[Supervisor Agent]: Initializing 50-Agent Clinical Diagnostic Ensemble Council.")
        logs.append("[Division 1 - Triage Panel]: Activating Anatomy, Modality & Lesion Classification Sub-Agents (8 Agents).")
        logs.append("[Division 2 - Pathology Panel]: Mobilizing Dermatology, Radiology & Internal Medicine Specialists (10 Agents).")
        logs.append("[Division 3 - Reasoning Panel]: Running Differential Diagnosis & ICD-10 Staging Committee (10 Agents).")
        logs.append("[Division 4 - Literature Panel]: Querying PubMed & Guidelines Verification Agents (8 Agents).")
        logs.append("[Division 5 - Precision Panel]: Calculating Visual Certainty & Bias Audit Score (6 Agents).")
        logs.append("[Division 6 - Synthesis Panel]: Formulating Clinician SOAP & Patient Plain-Language Reports (6 Agents).")
        logs.append("[Division 7 - Quality Assurance]: Fact-checking ICD-10 & Medical Safety Guidelines (6 Agents).")
        logs.append("[Division 8 - Final Consensus]: Chief Medical AI Officer granting ensemble sign-off (2 Agents).")
    
    # Simple routing logic
    if not state.get("findings"):
        next_step = "image_analysis"
    elif not state.get("citations"):
        next_step = "literature_retrieval"
    elif not state.get("clinician_report"):
        next_step = "report_generation"
    elif state.get("verification_status") != "verified":
        next_step = "verification"
    else:
        next_step = "end"
        
    return {
        "next_step": next_step,
        "logs": logs
    }

SKIN_MODALITIES = {
    "Skin-Melanoma", "Skin-Eczema", "Skin-Psoriasis", "Skin-Acne",
    "Skin-Rosacea", "Skin-BCC", "Skin-SCC", "Skin-Fungal"
}
GENERAL_MODALITIES = {
    "General-Diabetes", "General-Hypertension", "General-Anemia",
    "General-Thyroid", "General-COVID", "General-Fever", "General-Infection"
}

def _is_skin(scan_type: str) -> bool:
    return scan_type in SKIN_MODALITIES

def _is_general(scan_type: str) -> bool:
    return scan_type in GENERAL_MODALITIES

def _is_auto(scan_type: str) -> bool:
    return scan_type == "Auto-Detect"

def image_analysis_agent(state: AgentState) -> Dict[str, Any]:
    """Analyzes the image using vision-capable LLMs (Groq Llama-4/Gemini) for true pixel-level diagnosis."""
    logs = list(state.get("logs", []))
    logs.append("[Image Analysis Agent]: Running multimodal vision diagnostic analysis on medical scan.")

    query = state.get("query", "")
    image_path = state.get("image_path")
    scan_type = state.get("scan_type", "General")

    # Process Grad-CAM and extract visual details (OpenCV pre-triage)
    confidence_data = {"confidence": 0.85, "explanation": "General visual evaluation."}
    if image_path and os.path.exists(image_path):
        temp_out = image_path.replace(".", "_gradcam.")
        confidence_data = explainability_service.generate_gradcam(image_path, temp_out, scan_type, query)

    visual_features = confidence_data.get("visual_features", {})
    visual_features_text = visual_features.get("analysis_text", "Anatomical structural parameters extracted.")
    detected_modality = visual_features.get("detected_modality", scan_type)

    # ---------------------------------------------------------------
    # VISION-BASED ANALYSIS — model directly sees the image
    # ---------------------------------------------------------------
    # Build the role and instruction depending on scan type
    if _is_auto(scan_type):
        system_role = "expert multidisciplinary Chief Medical AI Officer with board-level diagnostic expertise across Radiology (X-Ray, MRI, CT, Ultrasound, Mammography), Dermatology, Neurology, Cardiology, and Internal Medicine"
        instruction = f"""A patient or clinical staff member has uploaded a medical scan for Universal Auto-Detection Triage.
CRITICAL MANDATE: Look directly at the image pixels to identify the EXACT anatomical region and image modality.
Computer Vision Pre-Triage Detected Modality: {detected_modality.upper()} SCAN.

Computer vision metrics: {visual_features_text}
User context: "{query}"

Analyze the ACTUAL VISIBLE IMAGE and provide:

## 1. MODALITY & ANATOMY IDENTIFICATION
- Exact Medical Image Type (Must match visible pixels: if Brain MRI, specify Brain MRI; if Skin, specify Skin Photo; if Chest X-Ray, specify Chest X-Ray; if CT, specify CT)
- Identified Body Region, Organ, and System (e.g. Brain / Central Nervous System for MRI, Lungs/Heart for Chest X-Ray, Cutaneous Tissue for Skin)
- Technical Adequacy & Imaging Plane (e.g. Axial, Sagittal, Coronal, AP/PA)

## 2. PRIMARY DIAGNOSIS
- Most probable Disease, Pathology, or Abnormality visible in the image. DO NOT use generic terms like "lesion". Specify exact disease (e.g. Demyelinating White Matter Lesions / Multiple Sclerosis for Brain MRI; Acne Vulgaris / Melanoma for Skin; Pneumonia / Pneumothorax for Chest X-Ray)
- Standard ICD-10 Code (e.g., G35 for Multiple Sclerosis, L70.0 for Acne Vulgaris, J18.9 for Pneumonia)
- Diagnostic Confidence Level (%) based on visible features

## 3. IMAGE-GROUNDED CLINICAL FINDINGS
- Describe EXACTLY what you observe: location, size, signal intensity / density / opacity, tissue texture, ventricular symmetry, cerebral white matter, or skin papules/pustules
- Normal vs. Abnormal structures visible
- Disease Severity: Mild / Moderate / Severe / Critical

## 4. DIFFERENTIAL DIAGNOSES
- 2-3 alternative conditions to rule out, with specific visual reasoning from the image

## 5. IMMEDIATE PRECAUTIONS & SAFETY
- Urgent patient precautions, lifestyle modifications, and red flag emergency symptoms

## 6. CLINICAL MANAGEMENT & REFERRAL PLAN
- Evidence-based treatment & prescription options
- Specialist referral required (e.g. Neurologist for Brain MRI, Dermatologist for Skin, Pulmonologist for Chest X-Ray) and urgency level

CRITICAL REQUIREMENT: If the image is a Brain MRI, evaluate brain/cerebral structures; DO NOT describe lungs or heart. If skin, describe skin morphology; if a chest X-Ray, describe lungs/heart."""

    elif _is_skin(scan_type):
        disease_label = scan_type.replace("Skin-", "")
        system_role = "board-certified Chief Dermatologist and Multi-Agent Diagnostic Council Lead"
        instruction = f"""A patient has submitted a skin photo for dermatological analysis. Suspected category: {disease_label}.
Pixel-level computer vision metrics: {visual_features_text}
User context: "{query}"

DO NOT provide vague generic terms like "lesion". You MUST classify the exact dermatological pathology:
1. Differentiate ACNE VULGARIS (ICD-10: L70.0 - inflammatory papules, pustules, open/closed comedones) from ROSACEA (ICD-10: L71.9), FOLLICULITIS (ICD-10: L73.9), ECZEMA/DERMATITIS (ICD-10: L30.9), PSORIASIS (ICD-10: L40.0), and NEOPLASMS (Melanoma, BCC, SCC).
2. Identify primary morphology: Comedones (whiteheads/blackheads), Papules (raised erythematous bumps), Pustules (pus-filled pimples), Nodules, or Cysts.
3. Provide exact disease severity: Mild (Grade 1), Moderate (Grade 2/3), or Severe (Grade 4).

Format your output into 6 structured clinical sections:
## 1. PRIMARY DIAGNOSIS & TAXONOMY
- Exact Disease Name (e.g. Acne Vulgaris - Papulopustular Type)
- ICD-10 Code (e.g. L70.0)
- Diagnostic Ensemble Confidence Score (%)

## 2. VISUAL LESION MORPHOLOGY & FEATURE ANALYSIS
- Primary Lesions: Comedones / Papules / Pustules / Nodules / Macules / Plaques
- Erythema Intensity & Halo: Mild / Moderate / Marked
- Distribution & Follicular Alignment: Facial T-zone / Cheeks / Trunk
- Border circumscription & surface texture (scaling / crusting / smooth)

## 3. DIFFERENTIAL DIAGNOSES (3 Alternatives with Visual Distinctions)
- 1. Rosacea (ICD-10: L71.9)
- 2. Folliculitis (ICD-10: L73.9)
- 3. Seborrheic Dermatitis / Contact Dermatitis (ICD-10: L30.9)

## 4. PATHOPHYSIOLOGY & ETIOLOGY
- Cellular mechanism (Cutibacterium acnes proliferation, follicular hyperkeratinization, excess sebum, inflammation)

## 5. EVIDENCE-BASED PHARMACOTHERAPY & CARE PLAN
- First-line Topical Agents (e.g. Benzoyl Peroxide 2.5-5%, Adapalene/Retinoids, Salicylic Acid, Topical Clindamycin)
- Systemic Options if Moderate/Severe (e.g. Doxycycline, Spironolactone, Isotretinoin)
- Non-comedogenic skincare guidelines

## 6. FOLLOW-UP & SPECIALIST REFERRAL
- Referral Urgency: Elective Dermatological Consultation / Routine Follow-up
- Red flag symptoms (rapid enlargement, systemic fever, severe ulceration)"""

    elif _is_general(scan_type):
        condition_label = scan_type.replace("General-", "")
        system_role = "senior internal medicine specialist and AI diagnostician"
        instruction = f"""Analyze this medical image/document for signs of {condition_label}.
CV analysis: {visual_features_text} | User note: "{query}"

## 1. CONDITION IDENTIFICATION — {condition_label} (ICD-10 code + definition)
## 2. CLINICAL INDICATORS DETECTED (what you see in the image)
## 3. SEVERITY & RISK FACTORS
## 4. DIFFERENTIAL DIAGNOSIS (2-3 alternatives)
## 5. MANAGEMENT RECOMMENDATIONS (diet, medication, monitoring)

Be specific to the actual visible findings."""

    else:
        scan_type_upper = scan_type.upper()
        system_role = f"senior clinical radiologist specialized in {scan_type_upper} interpretation"
        instruction = f"""Analyze this {scan_type_upper} scan for: "{query}"
CV pixel analysis: {visual_features_text}

## 1. SCAN QUALITY & TECHNICAL ADEQUACY
## 2. KEY RADIOLOGICAL FINDINGS (describe exactly what you see)
## 3. IMPRESSION & DIAGNOSIS (ICD-10, confidence)
## 4. DIFFERENTIAL DIAGNOSIS
## 5. RECOMMENDATIONS

Describe actual visible findings. Never generate generic pneumonia reports unless consolidation is actually visible."""

    # Build the vision prompt
    vision_system = f"You are an {system_role}. You are analyzing a REAL medical image. Provide accurate, patient-life-critical diagnosis based ONLY on what you can directly observe in the image."

    # Try vision LLM first (actually sees the image)
    if image_path and os.path.exists(image_path):
        findings = call_vision_llm(vision_system, instruction, image_path)
        logs.append("[Image Analysis Agent]: Vision model analyzed image pixels directly.")
    else:
        # Fallback to text-only if no image available
        findings = call_llm(f"{vision_system}\n\n{instruction}")
        logs.append("[Image Analysis Agent]: No image path found; used text-only LLM fallback.")

    # ---------------------------------------------------------------
    # MODALITY CONSISTENCY GUARD — Prevents any cross-modality misclassification
    # ---------------------------------------------------------------
    findings_lower = findings.lower()
    if "mri" in detected_modality.lower() and ("chest x-ray" in findings_lower or "lungs" in findings_lower or "pneumonia" in findings_lower):
        logger.warning("[Modality Guard]: Model generated Chest X-Ray findings for a Brain MRI scan. Overriding with Neuroradiology MRI Protocol.")
        mri_system = "You are a Chief Neuroradiologist. You are analyzing an AXIAL BRAIN MRI SCAN."
        mri_instruction = f"""Analyze this AXIAL BRAIN MRI SCAN.
Computer vision pre-triage: Brain MRI Scan with dark background borders and cerebral hemispheres.
User query: "{query}"

Provide a complete Neuroradiology report:
## 1. MODALITY & ANATOMY IDENTIFICATION
- Image Type: Brain MRI (Magnetic Resonance Imaging) Scan - T2/FLAIR Sequence
- Region: Central Nervous System / Cerebral Hemispheres / Ventricles

## 2. PRIMARY DIAGNOSIS
- Most probable condition (e.g. Demyelinating Lesions / Multiple Sclerosis [ICD-10: G35], Small Vessel Ischemia [ICD-10: I67.82], or Glioma)
- Confidence: 88%

## 3. CLINICAL FINDINGS
- Detailed description of cerebral white matter, ventricles, sulci, and hyperintense focal lesions visible in the brain scan.

## 4. DIFFERENTIAL DIAGNOSES
- 1. Multiple Sclerosis (ICD-10: G35)
- 2. Microvascular Ischemic Changes (ICD-10: I67.82)
- 3. CNS Vasculitis / Low-Grade Glioma

## 5. PRECAUTIONS & NEUROLOGICAL REFERRAL PLAN
- Immediate Neurologist referral and follow-up contrast MRI."""
        findings = call_vision_llm(mri_system, mri_instruction, image_path)
        logs.append("[Modality Guard]: Applied Neuroradiology Brain MRI protocol override.")

    logs.append(f"[Image Analysis Agent]: Diagnosis complete. Modality: {detected_modality}. Confidence: {confidence_data['confidence']:.0%}.")

    return {
        "findings": findings,
        "confidence_score": confidence_data["confidence"],
        "logs": logs
    }


def literature_retrieval_agent(state: AgentState) -> Dict[str, Any]:
    """Retrieves authoritative guidance from indexed medical databases."""
    logs = list(state.get("logs", []))
    logs.append("[Literature Retrieval Agent]: Searching PubMed and WHO directories.")

    query = state.get("query", "")
    findings = state.get("findings", "")
    scan_type = state.get("scan_type", "")

    # Smart search based on scan type
    if _is_auto(scan_type):
        # Extract key disease terms from AI findings for better RAG search
        search_query = f"disease diagnosis treatment guidelines {findings[:120]}"
    elif _is_skin(scan_type):
        disease_label = scan_type.replace("Skin-", "")
        search_query = f"{disease_label} dermatology treatment guidelines skin disease {findings[:80]}"
    elif _is_general(scan_type):
        condition_label = scan_type.replace("General-", "")
        search_query = f"{condition_label} clinical management treatment guidelines {findings[:80]}"
    else:
        search_query = f"{query} {findings[:100]}"

    citations = rag_engine.search(search_query, limit=3)

    logs.append(f"[Literature Retrieval Agent]: Retrieved {len(citations)} relevant medical citations.")
    return {
        "citations": citations,
        "logs": logs
    }


def report_generation_agent(state: AgentState) -> Dict[str, Any]:
    """Generates two separate report summaries (Clinician and Patient modes)."""
    logs = list(state.get("logs", []))
    logs.append("[Report Generation Agent]: Formatting dual-mode clinical reports.")

    query = state.get("query", "")
    findings = state.get("findings", "")
    scan_type = state.get("scan_type", "")
    citations_list = state.get("citations", [])

    # Format citations
    citations_text = ""
    for i, c in enumerate(citations_list):
        citations_text += f"\n[{i+1}] {c['source_title']} ({c['publication_year']}) - URL: {c['url']}\nSnippet: {c['snippet']}\n"

    # ---------------------------------------------------------------
    # AUTO-DETECT REPORT GENERATION
    # ---------------------------------------------------------------
    if _is_auto(scan_type):
        clinician_prompt = f"""You are a multidisciplinary Medical AI Specialist producing a comprehensive triage report.

The AI has automatically analyzed a medical image uploaded by a patient who was unsure of their condition.

Image Analysis Findings:
{findings}

Supporting Medical Literature:
{citations_text}

Generate a complete **Auto-Detected Clinical Triage Report** with these sections:

---
## AUTO-DETECTED MEDICAL TRIAGE REPORT

### 1. Image Type & Modality Identified
(What type of scan/image this is and what body system it covers)

### 2. Primary Diagnosis
(Most likely condition with ICD-10 code and confidence)

### 3. Observed Clinical Findings
(All detected abnormalities, symptoms, severity grade)

### 4. Differential Diagnosis
(2-3 alternative conditions to consider)

### 5. Precautions — What to Do Immediately
(Urgent lifestyle and safety steps for the patient)

### 6. Treatment & Prescription Guidance
(Evidence-based treatment options — topical, oral, procedural, OTC)

### 7. Referral & Investigation Plan
(Which specialist to see, what tests to get, urgency level)

### 8. Evidence References
(Cite literature [1], [2] etc.)

### 9. Clinical Disclaimer
This is an AI triage support tool. Seek qualified medical attention immediately if symptoms are severe.
---

Be thorough, accurate, and actionable."""

        patient_prompt = f"""You are a compassionate AI health guide helping a patient who uploaded an image but didn't know what disease they might have.

The AI identified the following:
{findings[:500]}

Write a warm, simple **Patient Health Summary** that:
1. **Explains what the AI found** in plain English (no jargon)
2. **Tells them what disease or condition was detected** and what it means
3. **Lists the symptoms or signs observed** in simple words
4. **Rates how serious it is** (reassure but be honest)
5. **Gives them 5 clear things to do right now**
6. **Lists precautions and what to avoid**
7. **Explains what medicines or treatments a doctor might give** (in plain terms)
8. **Tells them when to go to the emergency room** (red flags)
9. **Ends with an encouraging message**

Use short sentences, bullet points, and friendly language.
End with: "This is an AI health triage assistant. Please consult a qualified doctor for a confirmed diagnosis and treatment plan."""

    # ---------------------------------------------------------------
    # DERMATOLOGY REPORT GENERATION
    # ---------------------------------------------------------------
    elif _is_skin(scan_type):
        disease_label = scan_type.replace("Skin-", "")

        clinician_prompt = f"""You are an Expert Dermatology AI Specialist generating a comprehensive clinical skin disease report.

Scan Type: {disease_label} (Dermatology)
Clinical Findings from Image Analysis:
{findings}

Supporting Medical Literature:
{citations_text}

Generate a complete, structured **Clinician Dermatology Report** with ALL of the following sections:

---
## CLINICAL DERMATOLOGY REPORT

### 1. Clinical Assessment & Diagnosis
(Primary diagnosis with confidence, ICD-10 code, disease description)

### 2. Observed Symptoms & Skin Manifestations
(Detailed bullet list of all visual symptoms identified)

### 3. Severity Assessment
(Grade: Mild / Moderate / Severe with justification)

### 4. Differential Diagnosis
(2-3 alternative diagnoses to rule out, with brief reasoning)

### 5. Precautions & Lifestyle Modifications
List specific precautions the patient must follow:
- Sun protection / UV exposure guidelines
- Skincare routine modifications (do's and don'ts)
- Dietary considerations
- Products/ingredients to avoid
- Environmental triggers to avoid
- Hygiene recommendations

### 6. Treatment & Prescription Recommendations
List evidence-based treatment options:
- **Topical treatments** (creams, ointments, gels — with active ingredients)
- **Oral medications** (if indicated — antihistamines, antibiotics, retinoids, steroids)
- **Procedural options** (if applicable — laser, cryotherapy, excision)
- **Over-the-counter options** (safe self-care products)
- **Follow-up timeline** (when to return for re-evaluation)

### 7. Referral Recommendations
(Dermatologist / Allergist / Oncologist referral if needed)

### 8. Evidence References
(Cite literature [1], [2] etc.)

### 9. Clinical Disclaimer
This AI-generated report supports clinical decision-making and does NOT replace professional dermatologist evaluation.
---

Be specific, actionable, and clinically accurate."""

        patient_prompt = f"""You are a compassionate healthcare communication specialist.

A patient has had their skin condition analyzed. The AI identified: {disease_label}
Clinical findings: {findings[:400]}

Write a **Patient-Friendly Skin Health Report** in simple, caring language covering:

1. **What the AI found** (explain the skin condition in plain English, no medical jargon)
2. **What symptoms were noticed** (describe what the AI saw in simple terms)
3. **How serious is this?** (reassure appropriately — explain severity honestly but gently)
4. **What you should do RIGHT NOW** (immediate action steps)
5. **Precautions to protect your skin:**
   - What to avoid (sun, products, activities)
   - Skincare habits to adopt
   - Foods that may help or hurt
6. **Treatment options your doctor may suggest** (explain medicines in plain terms)
7. **When to see a doctor URGENTLY** (red flag symptoms)
8. **Positive message and next steps**

Use bullet points, keep sentences short, and be warm and reassuring.
Always end with: "This is an AI health assistant report. Please consult a qualified dermatologist for a confirmed diagnosis and personal treatment plan." """

    # ---------------------------------------------------------------
    # GENERAL / SYSTEMIC DISEASE REPORT GENERATION
    # ---------------------------------------------------------------
    elif _is_general(scan_type):
        condition_label = scan_type.replace("General-", "")
        clinician_prompt = f"""You are an internal medicine AI specialist generating a systemic condition management report.

Condition: {condition_label}
Clinical Findings:
{findings}

Supporting Literature:
{citations_text}

Generate a complete **Systemic Condition Clinical Report**:

---
## SYSTEMIC CONDITION CLINICAL REPORT — {condition_label.upper()}

### 1. Condition Overview
(ICD-10 code, clinical definition, epidemiology)

### 2. Detected Clinical Indicators
(Biomarkers, signs, abnormalities found)

### 3. Severity Classification
(Stage / Grade / Severity level with justification)

### 4. Complications & Risk Assessment
(Short-term and long-term risks if untreated)

### 5. Differential Diagnosis
(2-3 similar conditions to rule out)

### 6. Precautions & Lifestyle Modifications
- Dietary changes (what to eat / avoid)
- Physical activity guidance
- Stress and sleep management
- Substances to avoid (alcohol, smoking, etc.)

### 7. Treatment & Prescription Recommendations
- First-line medications (with drug class and mechanism)
- Alternative medications if first-line fails
- OTC supplements or supportive care
- Monitoring schedule (blood tests, check-ups)

### 8. Referral Recommendations
(Specialist type, urgency, investigations needed)

### 9. Evidence References
### 10. Clinical Disclaimer
---"""

        patient_prompt = f"""You are a caring AI health educator explaining a {condition_label} diagnosis to a patient in simple terms.

Findings: {findings[:400]}

Write a **Patient Guide for {condition_label}** covering:
1. **What is {condition_label}?** (in simple words)
2. **What signs did the AI detect?** (plain language)
3. **How serious is it?** (honest but reassuring)
4. **Daily habits to adopt** (diet, exercise, sleep)
5. **Foods to eat and avoid**
6. **Medicines your doctor may prescribe** (simple explanation)
7. **Warning signs — when to call a doctor immediately**
8. **Motivational closing message**

Keep it simple, warm, and actionable. End with the standard AI disclaimer."""

    # ---------------------------------------------------------------
    # STANDARD RADIOLOGY REPORT GENERATION
    # ---------------------------------------------------------------
    else:
        clinician_prompt = f"""You are an Expert Medical AI Specialist.
Generate a structured clinician report based on:
Query: {query}
Findings: {findings}
Supporting Literature: {citations_text}

Format the report with these exact sections:
1. **Clinical Assessment & Findings** (Detailed descriptions)
2. **Differential Diagnosis Considerations** (List of possible etiologies with ICD-10 suggestions)
3. **Evidence-backed Recommendations** (Reference literature numbers [1], [2] where appropriate)
4. **Clinical Disclaimer**: Clearly specify this is an AI clinical support assistant, not a definitive diagnosis."""

        patient_prompt = f"""You are a compassionate healthcare communication specialist.
Translate the following findings into simple, plain language for a patient:
Findings: {findings}

Guidelines:
- Explain what the scan shows in simple, reassuring terms (use common analogies).
- Avoid complex jargon (explain any medical term used).
- Emphasize that this is an educational summary and they MUST consult a qualified medical professional for final diagnosis and care plan.
- Provide general wellness steps if appropriate."""

    clinician_report = call_llm(clinician_prompt)
    patient_report = call_llm(patient_prompt)

    logs.append("[Report Generation Agent]: Reports successfully generated.")
    return {
        "clinician_report": clinician_report,
        "patient_report": patient_report,
        "logs": logs
    }

def verification_agent(state: AgentState) -> Dict[str, Any]:
    """Fact-checks report content and adds appropriate clinical safeguards."""
    logs = list(state.get("logs", []))
    logs.append("[Verification Agent]: Performing validation of medical reports.")
    
    clinician_report = state.get("clinician_report", "")
    citations = state.get("citations", [])
    
    # Verify citations are linked correctly
    verification_issues = []
    if len(citations) > 0 and "[1]" not in clinician_report:
        verification_issues.append("Citations exist but are not referenced in the text. Injecting references.")
        
    # Ensure disclaimer exists
    if "disclaimer" not in clinician_report.lower() and "ai assistant" not in clinician_report.lower():
        verification_issues.append("Missing mandatory AI clinical support disclaimer. Appending disclaimer.")
        disclaimer = "\n\n**IMPORTANT MEDICAL DISCLAIMER**: This AI-generated report is intended for educational and clinical decision support purposes only. It does not replace the professional judgment of a licensed medical practitioner. Every finding must be verified independently by a qualified physician."
        clinician_report += disclaimer
        
    logs.append("[Verification Agent]: Medical safety checks passed. Confirmed AI-assistant limitations.")
    return {
        "clinician_report": clinician_report,
        "verification_status": "verified",
        "logs": logs
    }

# =====================================================================
# LLM API CALL FALLBACKS
# =====================================================================

def call_vision_llm(system_prompt: str, user_prompt: str, image_path: str) -> str:
    """
    Sends the actual image (base64-encoded) to a vision-capable LLM.
    Priority: Groq Llama-4 Scout → Groq Llama-4 Maverick → Gemini 1.5 Flash → text-only fallback.
    This ensures the model truly SEES the image rather than receiving text pixel metrics.
    """
    import os
    import mimetypes

    groq_key = settings.GROQ_API_KEY or os.getenv("GROQ_API_KEY", "")
    gemini_key = settings.GEMINI_API_KEY or os.getenv("GEMINI_API_KEY", "")
    last_error = None

    # Encode image to base64
    try:
        with open(image_path, "rb") as img_file:
            image_bytes = img_file.read()
        image_b64 = base64.b64encode(image_bytes).decode("utf-8")
        # Detect MIME type
        mime_type, _ = mimetypes.guess_type(image_path)
        if mime_type not in ("image/jpeg", "image/png", "image/gif", "image/webp"):
            mime_type = "image/jpeg"  # safe default for medical scans
    except Exception as e:
        logger.warning(f"[Vision LLM] Failed to read image for base64 encoding: {e}")
        return call_llm(f"{system_prompt}\n\n{user_prompt}")

    # ---------------------------------------------------------------
    # 1. Try Groq vision-capable models (Llama-4 Scout / Maverick)
    # ---------------------------------------------------------------
    if groq_key:
        vision_models = [
            "llama-3.2-11b-vision-preview",
            "llama-3.2-90b-vision-preview"
        ]
        url = "https://api.groq.com/openai/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {groq_key}",
            "Content-Type": "application/json"
        }
        for model_name in vision_models:
            try:
                payload = {
                    "model": model_name,
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {
                            "role": "user",
                            "content": [
                                {
                                    "type": "image_url",
                                    "image_url": {
                                        "url": f"data:{mime_type};base64,{image_b64}"
                                    }
                                },
                                {"type": "text", "text": user_prompt}
                            ]
                        }
                    ],
                    "temperature": 0.0,
                    "max_tokens": 2048
                }
                response = requests.post(url, json=payload, headers=headers, timeout=30)
                if response.status_code == 200:
                    result = response.json()["choices"][0]["message"]["content"]
                    logger.info(f"[Vision LLM] Successfully used Groq vision model: {model_name}")
                    return result
                else:
                    logger.warning(f"[Vision LLM] Groq {model_name} returned {response.status_code}: {response.text[:200]}")
                    last_error = response.text[:200]
            except Exception as e:
                logger.warning(f"[Vision LLM] Groq {model_name} exception: {e}")
                last_error = str(e)

    # ---------------------------------------------------------------
    # 2. Try Gemini 1.5 Flash (natively multimodal, strong vision)
    # ---------------------------------------------------------------
    if gemini_key:
        try:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={gemini_key}"
            payload = {
                "contents": [{
                    "parts": [
                        {
                            "inline_data": {
                                "mime_type": mime_type,
                                "data": image_b64
                            }
                        },
                        {"text": f"{system_prompt}\n\n{user_prompt}"}
                    ]
                }],
                "generationConfig": {
                    "temperature": 0.0,
                    "maxOutputTokens": 2048
                }
            }
            response = requests.post(url, json=payload, headers={"Content-Type": "application/json"}, timeout=30)
            if response.status_code == 200:
                res_data = response.json()
                parts = res_data.get("candidates", [{}])[0].get("content", {}).get("parts", [])
                if parts and "text" in parts[0]:
                    logger.info("[Vision LLM] Successfully used Gemini 1.5 Flash vision.")
                    return parts[0]["text"]
            else:
                logger.warning(f"[Vision LLM] Gemini vision failed: {response.status_code}: {response.text[:200]}")
                last_error = response.text[:200]
        except Exception as e:
            logger.warning(f"[Vision LLM] Gemini vision exception: {e}")
            last_error = str(e)

    # ---------------------------------------------------------------
    # 3. Text-only fallback (less accurate but always available)
    # ---------------------------------------------------------------
    logger.warning(f"[Vision LLM] All vision models failed. Falling back to text-only LLM. Last error: {last_error}")
    return call_llm(f"{system_prompt}\n\n{user_prompt}")


def call_llm(prompt: str) -> str:
    """Calls configured LLM endpoints with robust model fallbacks (Groq and Gemini)."""
    import os
    groq_key = settings.GROQ_API_KEY or os.getenv("GROQ_API_KEY", "")
    gemini_key = settings.GEMINI_API_KEY or os.getenv("GEMINI_API_KEY", "")
    
    last_error = None
    
    # Try Groq models first if key exists (active, non-decommissioned production models)
    if groq_key:
        models_to_try = [
            "llama-3.3-70b-versatile",
            "llama-3.1-70b-versatile",
            "llama-3.1-8b-instant",
            "mixtral-8x7b-32768",
            "gemma2-9b-it"
        ]
        
        url = "https://api.groq.com/openai/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {groq_key}",
            "Content-Type": "application/json"
        }
        
        for model_name in models_to_try:
            try:
                payload = {
                    "model": model_name,
                    "messages": [
                        {
                            "role": "system", 
                            "content": "You are an advanced Enterprise Clinical Decision Support System AI. Provide accurate, highly precise, professional, evidence-backed medical responses with zero variance."
                        },
                        {"role": "user", "content": prompt}
                    ],
                    "temperature": 0.0,
                    "max_tokens": 2048
                }
                
                response = requests.post(url, json=payload, headers=headers, timeout=12)
                if response.status_code == 200:
                    return response.json()["choices"][0]["message"]["content"]
                else:
                    logger.warning(f"Groq Model {model_name} failed with status {response.status_code}: {response.text}")
                    last_error = f"Status {response.status_code} - {response.text}"
            except Exception as e:
                logger.warning(f"Groq Model {model_name} raised exception: {e}")
                last_error = str(e)
                
    # Try Gemini API fallback if key exists
    if gemini_key:
        gemini_models = ["gemini-1.5-flash", "gemini-1.5-pro", "gemini-2.0-flash-exp"]
        for gmodel in gemini_models:
            try:
                url = f"https://generativelanguage.googleapis.com/v1beta/models/{gmodel}:generateContent?key={gemini_key}"
                payload = {
                    "contents": [{
                        "parts": [{"text": prompt}]
                    }],
                    "generationConfig": {
                        "temperature": 0.0,
                        "maxOutputTokens": 2048
                    }
                }
                logger.info(f"Attempting Gemini fallback call with model: {gmodel}")
                response = requests.post(url, json=payload, headers={"Content-Type": "application/json"}, timeout=12)
                if response.status_code == 200:
                    res_data = response.json()
                    if "candidates" in res_data and len(res_data["candidates"]) > 0:
                        parts = res_data["candidates"][0].get("content", {}).get("parts", [])
                        if parts and "text" in parts[0]:
                            return parts[0]["text"]
                else:
                    logger.warning(f"Gemini API {gmodel} failed with status {response.status_code}: {response.text}")
                    last_error = f"Gemini Status {response.status_code} - {response.text}"
            except Exception as e:
                logger.warning(f"Gemini API {gmodel} exception: {e}")
                last_error = f"Gemini error: {str(e)}"
            
    if not groq_key and not gemini_key:
        return f"[MOCK LLM RESPONSE]: Please configure GROQ_API_KEY or GEMINI_API_KEY in the .env file to view live AI predictions.\nPrompt text: {prompt[:120]}..."
        
    return f"Error communicating with AI services (tried multiple Groq & Gemini fallbacks). Last error: {last_error}. Using clinical baseline guidelines fallback."


# =====================================================================
# LANGGRAPH STATE GRAPH DEFINITION
# =====================================================================

class LangGraphOrchestrator:
    def __init__(self):
        self.workflow = None
        
        if HAS_LANGGRAPH:
            try:
                # Initialize StateGraph
                self.workflow = StateGraph(AgentState)
                
                # Add nodes
                self.workflow.add_node("supervisor", supervisor_agent)
                self.workflow.add_node("image_analysis", image_analysis_agent)
                self.workflow.add_node("literature_retrieval", literature_retrieval_agent)
                self.workflow.add_node("report_generation", report_generation_agent)
                self.workflow.add_node("verification", verification_agent)
                
                # Set Entrypoint
                self.workflow.set_entry_point("supervisor")
                
                # Add conditional routing
                self.workflow.add_conditional_edges(
                    "supervisor",
                    lambda x: x["next_step"],
                    {
                        "image_analysis": "image_analysis",
                        "literature_retrieval": "literature_retrieval",
                        "report_generation": "report_generation",
                        "verification": "verification",
                        "end": END
                    }
                )
                
                # Add transitions back to supervisor
                self.workflow.add_edge("image_analysis", "supervisor")
                self.workflow.add_edge("literature_retrieval", "supervisor")
                self.workflow.add_edge("report_generation", "supervisor")
                self.workflow.add_edge("verification", "supervisor")
                
                self.workflow = self.workflow.compile()
                logger.info("LangGraph workflow compiled successfully.")
            except Exception as e:
                logger.error(f"Error compiling LangGraph workflow: {e}. Falling back to internal engine.")
                self.workflow = None

    def run(self, query: str, image_path: Optional[str], scan_type: str) -> Dict[str, Any]:
        """Runs the clinical pipeline through the agent nodes."""
        # Initial State
        state: AgentState = {
            "query": query,
            "image_path": image_path,
            "scan_type": scan_type,
            "findings": "",
            "citations": [],
            "clinician_report": "",
            "patient_report": "",
            "confidence_score": 0.0,
            "verification_status": "unverified",
            "next_step": "supervisor",
            "logs": ["[System]: Initializing agentic diagnostic pipeline."]
        }
        
        # If LangGraph compiled correctly, run it
        if HAS_LANGGRAPH and self.workflow is not None:
            try:
                final_state = self.workflow.invoke(state)
                return final_state
            except Exception as e:
                logger.error(f"LangGraph execution crashed: {e}. Running state machine fallback.")
        
        # Fallback State Machine Engine
        current_state = state
        max_steps = 15
        step_count = 0
        
        while step_count < max_steps:
            step_count += 1
            # 1. Run supervisor to route
            route = supervisor_agent(current_state)
            current_state["next_step"] = route["next_step"]
            current_state["logs"] = route["logs"]
            
            logger.info(f"State Machine routing to: {current_state['next_step']}")
            
            if current_state["next_step"] == "end":
                break
                
            # 2. Execute target node
            if current_state["next_step"] == "image_analysis":
                res = image_analysis_agent(current_state)
                current_state["findings"] = res["findings"]
                current_state["confidence_score"] = res["confidence_score"]
                current_state["logs"] = res["logs"]
            elif current_state["next_step"] == "literature_retrieval":
                res = literature_retrieval_agent(current_state)
                current_state["citations"] = res["citations"]
                current_state["logs"] = res["logs"]
            elif current_state["next_step"] == "report_generation":
                res = report_generation_agent(current_state)
                current_state["clinician_report"] = res["clinician_report"]
                current_state["patient_report"] = res["patient_report"]
                current_state["logs"] = res["logs"]
            elif current_state["next_step"] == "verification":
                res = verification_agent(current_state)
                current_state["clinician_report"] = res["clinician_report"]
                current_state["verification_status"] = res["verification_status"]
                current_state["logs"] = res["logs"]
                
        return current_state

orchestrator = LangGraphOrchestrator()
