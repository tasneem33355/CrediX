"""Deterministic SQLite configuration for the automated API test suite."""

import os

os.environ["APP_ENV"] = "test"
os.environ["DATABASE_URL"] = "sqlite:///./test_credix.db"
os.environ["ENABLE_LEGACY_LOGIN"] = "true"

import pytest

from app.database import Base, SessionLocal, engine
from app.seed.seed_data import seed_database


@pytest.fixture(autouse=True)
def reset_database() -> None:
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        seed_database(db)
    finally:
        db.close()
    yield
    Base.metadata.drop_all(bind=engine)
