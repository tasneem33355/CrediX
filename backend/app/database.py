"""SQLAlchemy Database Engine and Session Management."""

import secrets
import os
from typing import Generator
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker, Session
from sqlalchemy.pool import NullPool
from app.config import settings

# SQLite remains supported for isolated automated tests.
connect_args = {}
if settings.DATABASE_URL.startswith("sqlite"):
    connect_args["check_same_thread"] = False

engine_options = {"connect_args": connect_args, "echo": False}
if not settings.DATABASE_URL.startswith("sqlite"):
    engine_options["pool_pre_ping"] = True
    # Safe with Supabase's transaction pooler (pgbouncer): no server-side prepared statements.
    connect_args["prepare_threshold"] = None
    connect_args["connect_timeout"] = 10
    # Serverless: every invocation is short-lived, so let the Supabase pooler own the pooling.
    if os.getenv("VERCEL"):
        engine_options["poolclass"] = NullPool

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


def ensure_schema_compatibility() -> None:
    """Auto-migrate schema changes on startup so existing databases remain compatible."""
    from sqlalchemy import text
    try:
        with engine.begin() as conn:
            if conn.dialect.name == "postgresql":
                conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS officer_tier VARCHAR(50);"))
                conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS approval_limit_egp DOUBLE PRECISION DEFAULT 0.0;"))
                conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS can_override_policy BOOLEAN DEFAULT FALSE;"))
    except Exception:
        # Prevent non-blocking startup failure if read-only user or tables not yet created
        pass

