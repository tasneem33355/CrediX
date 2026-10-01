"""SQLAlchemy Database Engine and Session Management."""

import secrets
from typing import Generator
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker, Session
from app.config import settings

# SQLite remains supported for isolated automated tests.
connect_args = {}
if settings.DATABASE_URL.startswith("sqlite"):
    connect_args["check_same_thread"] = False

engine_options = {"connect_args": connect_args, "echo": False}
if not settings.DATABASE_URL.startswith("sqlite"):
    engine_options["pool_pre_ping"] = True

engine = create_engine(settings.DATABASE_URL, **engine_options)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db() -> Generator[Session, None, None]:
    """FastAPI Dependency for database session lifecycle."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def new_id(prefix: str) -> str:
    """Collision-safe opaque identifier, e.g. ``doc_3fa91c0b7d2e`` (48 random bits)."""
    return f"{prefix}_{secrets.token_hex(6)}"
