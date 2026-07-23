from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime

# Token Schemas
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    user_id: Optional[int] = None

# User Schemas
class UserBase(BaseModel):
    username: str
    email: EmailStr
    role: str = "doctor"

class UserCreate(UserBase):
    password: str

class UserResponse(UserBase):
    id: int
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True

# Citation Schemas
class CitationBase(BaseModel):
    source_title: str
    authors: Optional[str] = None
    journal: Optional[str] = None
    publication_year: Optional[int] = None
    url: Optional[str] = None
    snippet: Optional[str] = None
    similarity_score: Optional[float] = None

class CitationResponse(CitationBase):
    id: int
    report_id: int

    class Config:
        from_attributes = True

# Report Schemas
class ReportBase(BaseModel):
    clinician_summary: Optional[str] = None
    patient_summary: Optional[str] = None
    confidence_score: float = 0.0

class ReportCreate(ReportBase):
    scan_id: int

class ReportResponse(ReportBase):
    id: int
    scan_id: int
    created_at: datetime
    citations: List[CitationResponse] = []

    class Config:
        from_attributes = True

# Scan Schemas
class ScanBase(BaseModel):
    patient_name: str
    scan_type: str

class ScanCreate(ScanBase):
    pass

class ScanResponse(ScanBase):
    id: int
    user_id: int
    original_image_path: str
    gradcam_image_path: Optional[str] = None
    status: str
    uploaded_at: datetime
    reports: List[ReportResponse] = []

    class Config:
        from_attributes = True

# Audit Log Schemas
class AuditLogResponse(BaseModel):
    id: int
    user_id: int
    action: str
    ip_address: Optional[str] = None
    timestamp: datetime
    details: Optional[str] = None

    class Config:
        from_attributes = True
