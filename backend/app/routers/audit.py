from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Any
from backend.app.core.database import get_db
from backend.app.core.security import check_role
from backend.app.models.models import AuditLog, User
from backend.app.schemas import schemas

router = APIRouter(prefix="/audit", tags=["Security Audit Logs"])

@router.get("/logs", response_model=List[schemas.AuditLogResponse])
def get_audit_logs(
    db: Session = Depends(get_db),
    current_user: User = Depends(check_role(["admin"]))
) -> Any:
    """Restricted endpoint: Retrieves system rate-limiting and access audit logs."""
    logs = db.query(AuditLog).order_by(AuditLog.timestamp.desc()).limit(100).all()
    return logs
