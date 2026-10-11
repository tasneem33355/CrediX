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
    from sqlalchemy import inspect, text
    try:
        with engine.begin() as conn:
            if conn.dialect.name == "postgresql":
                conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS officer_tier VARCHAR(50);"))
                conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS approval_limit_egp DOUBLE PRECISION DEFAULT 0.0;"))
                conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS can_override_policy BOOLEAN DEFAULT FALSE;"))

                # The assistant provenance migration is intentionally also
                # applied here.  Vercel/serverless deployments may start the
                # API without running Alembic against the configured Supabase
                # database; without these nullable columns every chat write
                # fails with ``UndefinedColumn`` once the ORM serializes the
                # new answer metadata.
                conn.execute(text("ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS answer_mode VARCHAR(30);"))
                conn.execute(text("ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS provenance VARCHAR(30);"))
                conn.execute(text("ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS disclaimer TEXT;"))
                conn.execute(text("ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS segments JSON;"))
            elif conn.dialect.name == "sqlite":
                # SQLite has no portable ``ADD COLUMN IF NOT EXISTS``.  Check
                # the live table first so this remains safe and idempotent for
                # local databases created before the provenance migration.
                inspector = inspect(conn)
                if "chat_messages" not in inspector.get_table_names():
                    return
                existing = {column["name"] for column in inspector.get_columns("chat_messages")}
                sqlite_columns = {
                    "answer_mode": "VARCHAR(30)",
                    "provenance": "VARCHAR(30)",
                    "disclaimer": "TEXT",
                    "segments": "JSON",
                }
                for name, column_type in sqlite_columns.items():
                    if name not in existing:
                        conn.execute(text(f'ALTER TABLE chat_messages ADD COLUMN "{name}" {column_type}'))
    except Exception:
        # Prevent non-blocking startup failure if read-only user or tables not yet created
        pass


def ensure_pgvector_schema() -> None:
    """Set up pgvector extension and vector_embeddings table for semantic similarity search.

    - Enables the 'vector' PostgreSQL extension (requires superuser on first run in Supabase).
    - Creates the vector_embeddings table with a 128-dim float vector column.
    - Creates an ivfflat index for approximate cosine similarity queries (fast at scale).

    This is idempotent: all DDL uses IF NOT EXISTS, safe to run on every startup.
    Silently no-ops on SQLite (used in tests) and on any permission error.
    """
    from sqlalchemy import text
    try:
        with engine.begin() as conn:
            if conn.dialect.name != "postgresql":
                return

            # 1. Enable pgvector extension (idempotent)
            conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector;"))

            # 2. Create vector_embeddings table
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS vector_embeddings (
                    id              TEXT PRIMARY KEY,
                    application_id  TEXT NOT NULL REFERENCES loan_applications(id) ON DELETE CASCADE,
                    embedding_key   TEXT NOT NULL,
                    source_text     TEXT,
                    vector          vector(128) NOT NULL,
                    model_name      TEXT DEFAULT 'credix-hashvec-v1',
                    created_at      TIMESTAMPTZ DEFAULT NOW(),
                    UNIQUE (application_id, embedding_key)
                );
            """))

            # 3. ivfflat index for fast cosine-distance neighbours
            conn.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_vector_embeddings_cosine
                    ON vector_embeddings
                    USING ivfflat (vector vector_cosine_ops)
                    WITH (lists = 100);
            """))
    except Exception:
        # pgvector may not be available on all Supabase tiers — fail silently so
        # the rest of the API remains functional.
        pass

