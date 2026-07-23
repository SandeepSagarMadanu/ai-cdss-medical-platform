import logging
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from backend.app.core.config import settings

logger = logging.getLogger(__name__)

Base = declarative_base()

# Determine which database engine to use
engine = None
SessionLocal = None

try:
    # Try PostgreSQL first
    engine = create_engine(
        settings.DATABASE_URL,
        pool_pre_ping=True
    )
    # Test connection
    with engine.connect() as conn:
        logger.info("Successfully connected to PostgreSQL database.")
except Exception as e:
    logger.warning(
        f"PostgreSQL connection failed ({e}). Falling back to local SQLite database: {settings.SQLITE_URL}"
    )
    # Fallback to SQLite
    engine = create_engine(
        settings.SQLITE_URL,
        connect_args={"check_same_thread": False}
    )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
