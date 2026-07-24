import os
import traceback
import logging
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
from backend.app.core.config import settings
from backend.app.core.database import engine, Base
from backend.app.routers import auth, scans, reports, literature, audit

logger = logging.getLogger(__name__)

# Initialize database schemas & auto-seed default users
try:
    Base.metadata.create_all(bind=engine)
    from backend.app.core.database import SessionLocal
    from backend.app.models.models import User
    from backend.app.core.security import get_password_hash
    db = SessionLocal()
    try:
        default_users = [
            {"username": "admin",       "email": "admin@cdss.org",       "password": "Adm!n@CDSS#2024",      "role": "admin"},
            {"username": "doctor",      "email": "doctor@cdss.org",      "password": "D0ct0r$CDSS#99",      "role": "doctor"},
            {"username": "radiologist", "email": "radiologist@cdss.org", "password": "R4d!0l0g!st@CDSS#7",  "role": "radiologist"},
            {"username": "patient",     "email": "patient@cdss.org",     "password": "P4t!ent$Care#2024",    "role": "patient"},
        ]
        for uinfo in default_users:
            if not db.query(User).filter(User.username == uinfo["username"]).first():
                db_u = User(
                    username=uinfo["username"],
                    email=uinfo["email"],
                    hashed_password=get_password_hash(uinfo["password"]),
                    role=uinfo["role"]
                )
                db.add(db_u)
        db.commit()
    except Exception as se:
        print(f"Auto-seeding database error: {se}")
    finally:
        db.close()
except Exception as e:
    print(f"Error creating database schemas: {e}")

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Enterprise-grade AI Clinical Decision Support Platform for healthcare imaging and diagnostics.",
    version="1.0.0"
)

# Configure CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify front-end domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount Static directory to serve scans and Grad-CAM overlays
UPLOAD_DIR = os.path.join(os.getcwd(), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

# Global exception handler – always return JSON so the frontend can parse it
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    tb = traceback.format_exc()
    logger.error(f"Unhandled exception on {request.method} {request.url}:\n{tb}")
    return JSONResponse(
        status_code=500,
        content={
            "detail": f"Internal server error: {str(exc)}",
            "type": type(exc).__name__,
        },
    )

# Include Routers
app.include_router(auth.router, prefix=settings.API_V1_STR)
app.include_router(scans.router, prefix=settings.API_V1_STR)
app.include_router(reports.router, prefix=settings.API_V1_STR)
app.include_router(literature.router, prefix=settings.API_V1_STR)
app.include_router(audit.router, prefix=settings.API_V1_STR)

@app.get("/", tags=["System Status"])
async def root():
    return {
        "status": "online",
        "service": settings.PROJECT_NAME,
        "docs": "/docs",
        "health": "/health"
    }

@app.get("/health", tags=["System Health"])
async def health_check():
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "database": "connected" if engine else "error"
    }

@app.get("/internal/config", tags=["System Health"])
@app.get("/config", tags=["System Health"])
async def hf_internal_config():
    return {"status": "ok", "service": settings.PROJECT_NAME}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.app.main:app", host="0.0.0.0", port=8000, reload=True)
