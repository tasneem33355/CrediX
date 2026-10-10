"""Startup compatibility checks for databases created before chat provenance."""

from sqlalchemy import inspect, text

from app.database import engine, ensure_schema_compatibility


def test_startup_restores_chat_provenance_columns() -> None:
    """A pre-provenance SQLite database becomes writable on API startup."""

    column_names = {"answer_mode", "provenance", "disclaimer", "segments"}
    with engine.begin() as connection:
        existing = {column["name"] for column in inspect(connection).get_columns("chat_messages")}
        for name in sorted(column_names & existing):
            connection.execute(text(f'ALTER TABLE chat_messages DROP COLUMN "{name}"'))

    ensure_schema_compatibility()

    with engine.connect() as connection:
        restored = {column["name"] for column in inspect(connection).get_columns("chat_messages")}
    assert column_names <= restored
