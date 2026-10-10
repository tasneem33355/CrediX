"""Merge the chat provenance and officer-tier migration branches.

Both migrations were valid independently, but Alembic could not resolve
``upgrade head`` while they remained separate heads. This no-op revision keeps
both histories intact and gives new/local databases one canonical head.
"""

revision = "20261010_06"
down_revision: tuple[str, str] = ("20261009_01", "20261010_05")
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Merge only; both parent revisions already perform their DDL."""


def downgrade() -> None:
    """Merge only; Alembic handles downgrade through both parent branches."""
