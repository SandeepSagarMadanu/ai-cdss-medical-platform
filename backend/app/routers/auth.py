import logging
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from datetime import timedelta
from typing import Any
from backend.app.core.database import get_db
from backend.app.core.security import get_password_hash, verify_password, create_access_token
from backend.app.models.models import User, AuditLog
from backend.app.schemas import schemas

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/register", response_model=schemas.UserResponse)
def register(user_in: schemas.UserCreate, db: Session = Depends(get_db)) -> Any:
    try:
        # Check if username or email already exists
        existing_user = db.query(User).filter(
            (User.username == user_in.username) | (User.email == user_in.email)
        ).first()
        if existing_user:
            raise HTTPException(
                status_code=400,
                detail="Username or email already registered"
            )

        hashed_password = get_password_hash(user_in.password)
        user = User(
            username=user_in.username,
            email=user_in.email,
            hashed_password=hashed_password,
            role=user_in.role
        )
        db.add(user)
        db.commit()
        db.refresh(user)

        # Audit log (non-fatal – don't let failures here break registration)
        try:
            audit = AuditLog(
                user_id=user.id,
                action="USER_REGISTERED",
                details=f"Username: {user.username}, Role: {user.role}"
            )
            db.add(audit)
            db.commit()
        except Exception as audit_err:
            logger.warning(f"Audit log failed (non-fatal): {audit_err}")
            db.rollback()

        return user

    except HTTPException:
        raise  # re-raise FastAPI HTTP exceptions as-is
    except IntegrityError as e:
        db.rollback()
        logger.error(f"Integrity error during registration: {e}")
        raise HTTPException(
            status_code=400,
            detail="Username or email already exists (database constraint violation)"
        )
    except Exception as e:
        db.rollback()
        logger.error(f"Unexpected error during registration: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Registration failed due to an internal error: {str(e)}"
        )

@router.post("/login", response_model=schemas.Token)
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
) -> Any:
    try:
        user = db.query(User).filter(User.username == form_data.username).first()
        if not user or not verify_password(form_data.password, user.hashed_password):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect username or password",
                headers={"WWW-Authenticate": "Bearer"},
            )

        access_token = create_access_token(subject=user.id)

        # Audit log (non-fatal)
        try:
            audit = AuditLog(
                user_id=user.id,
                action="USER_LOGIN_SUCCESS",
                details=f"Username: {user.username}"
            )
            db.add(audit)
            db.commit()
        except Exception as audit_err:
            logger.warning(f"Audit log failed (non-fatal): {audit_err}")
            db.rollback()

        return {"access_token": access_token, "token_type": "bearer"}

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Unexpected error during login: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Login failed due to an internal error: {str(e)}"
        )

@router.post("/seed", status_code=201)
def seed_default_users(db: Session = Depends(get_db)):
    """Seeds default accounts for rapid development and testing."""
    default_users = [
        {"username": "admin",       "email": "admin@cdss.org",       "password": "Adm!n@CDSS#2024",      "role": "admin"},
        {"username": "doctor",      "email": "doctor@cdss.org",      "password": "D0ct0r$CDSS#99",      "role": "doctor"},
        {"username": "radiologist", "email": "radiologist@cdss.org", "password": "R4d!0l0g!st@CDSS#7",  "role": "radiologist"},
        {"username": "patient",     "email": "patient@cdss.org",     "password": "P4t!ent$Care#2024",    "role": "patient"},
    ]

    created = []
    for user_info in default_users:
        try:
            user = db.query(User).filter(User.username == user_info["username"]).first()
            if not user:
                hashed_pwd = get_password_hash(user_info["password"])
                db_user = User(
                    username=user_info["username"],
                    email=user_info["email"],
                    hashed_password=hashed_pwd,
                    role=user_info["role"]
                )
                db.add(db_user)
                db.commit()
                db.refresh(db_user)
                created.append(user_info["username"])
        except IntegrityError:
            db.rollback()
            logger.info(f"Seed user '{user_info['username']}' already exists, skipping.")
        except Exception as e:
            db.rollback()
            logger.error(f"Failed to seed user '{user_info['username']}': {e}")

    return {"status": "success", "seeded": created}
