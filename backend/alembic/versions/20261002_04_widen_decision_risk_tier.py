"""widen decision_audit_logs.risk_tier

The credit model returns descriptive tiers such as
"Medium Risk (Grade C/D) - Request Collateral/Guarantor" (55 chars),
which did not fit the original VARCHAR(50).

Revision ID: 20261002_04
Revises: 20261001_03
"""
from alembic import op
import sqlalchemy as sa

revision = "20261002_04"
down_revision = "20261001_03"
branch_labels = None
depends_on = None


def upgrade() -> None:
    if op.get_bind().dialect.name == "sqlite":
        with op.batch_alter_table("decision_audit_logs", recreate="always") as batch:
            batch.alter_column("risk_tier", existing_type=sa.String(50), type_=sa.String(150), existing_nullable=True)
    else:
        op.alter_column(
            "decision_audit_logs",
            "risk_tier",
            existing_type=sa.String(50),
            type_=sa.String(150),
            existing_nullable=True,
        )


def downgrade() -> None:
    if op.get_bind().dialect.name == "sqlite":
        with op.batch_alter_table("decision_audit_logs", recreate="always") as batch:
            batch.alter_column("risk_tier", existing_type=sa.String(150), type_=sa.String(50), existing_nullable=True)
    else:
        op.alter_column(
            "decision_audit_logs",
            "risk_tier",
            existing_type=sa.String(150),
            type_=sa.String(50),
            existing_nullable=True,
        )
