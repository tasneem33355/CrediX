"""Add explicit assistant answer provenance to chat messages."""

from alembic import op
import sqlalchemy as sa


revision = "20261009_01"
down_revision = "20260919_01"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("chat_messages", sa.Column("answer_mode", sa.String(length=30), nullable=True))
    op.add_column("chat_messages", sa.Column("provenance", sa.String(length=30), nullable=True))
    op.add_column("chat_messages", sa.Column("disclaimer", sa.Text(), nullable=True))
    op.add_column("chat_messages", sa.Column("segments", sa.JSON(), nullable=True))


def downgrade() -> None:
    op.drop_column("chat_messages", "segments")
    op.drop_column("chat_messages", "disclaimer")
    op.drop_column("chat_messages", "provenance")
    op.drop_column("chat_messages", "answer_mode")
