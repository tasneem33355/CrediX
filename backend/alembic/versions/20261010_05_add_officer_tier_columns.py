"""add officer tier delegation columns to users table

Revision ID: 20261010_05
Revises: 20261002_04
"""
from alembic import op
import sqlalchemy as sa

revision = "20261010_05"
down_revision = "20261002_04"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("users", sa.Column("officer_tier", sa.String(50), nullable=True))
    op.add_column("users", sa.Column("approval_limit_egp", sa.Float(), nullable=True, server_default="0.0"))
    op.add_column("users", sa.Column("can_override_policy", sa.Boolean(), nullable=False, server_default=sa.false()))


def downgrade() -> None:
    op.drop_column("users", "can_override_policy")
    op.drop_column("users", "approval_limit_egp")
    op.drop_column("users", "officer_tier")
