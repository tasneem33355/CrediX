"""Explicit, idempotent demo-data seed command: python -m app.seed."""

from app.config import settings
from app.database import SessionLocal
from app.seed.seed_data import seed_database


def main() -> None:
    if settings.is_production:
        raise SystemExit("Refusing to load demo seed data when APP_ENV=production")
    db = SessionLocal()
    try:
        seed_database(db)
    finally:
        db.close()


if __name__ == "__main__":
    main()
