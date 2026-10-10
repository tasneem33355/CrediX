"""portfolio analytics tables

Revision ID: 20261001_03
Revises: 20260930_02
"""
from alembic import op
import sqlalchemy as sa

revision = "20261001_03"
down_revision = "20260930_02"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "loan_facilities",
        sa.Column("facility_id", sa.String(50), primary_key=True),
        sa.Column("application_id", sa.String(50), nullable=True),
        sa.Column("customer_id", sa.String(50), nullable=True),
        sa.Column("contract_type", sa.String(30), nullable=False),
        sa.Column("granted_amount", sa.Numeric(14, 2), nullable=False),
        sa.Column("granted_date", sa.Date(), nullable=False),
        sa.Column("tenor_months", sa.Integer(), nullable=False),
        sa.Column("facility_status", sa.String(20), nullable=False),
        sa.Column("historical_max_dpd", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("is_demo", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )
    op.create_index("ix_loan_facilities_application_id", "loan_facilities", ["application_id"], unique=True)
    op.create_index("ix_loan_facilities_facility_status", "loan_facilities", ["facility_status"])

    op.create_table(
        "decision_audit_logs",
        sa.Column("decision_id", sa.String(50), primary_key=True),
        sa.Column("application_id", sa.String(50), nullable=False),
        sa.Column("national_id", sa.String(14), nullable=True),
        sa.Column("submission_timestamp", sa.DateTime(), nullable=True),
        sa.Column("customer_segment", sa.String(20), nullable=True),
        sa.Column("requested_amount", sa.Numeric(14, 2), nullable=True),
        sa.Column("fraud_risk_score", sa.Float(), nullable=True),
        sa.Column("fraud_risk_level", sa.String(20), nullable=True),
        sa.Column("is_anomaly", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("dti_ratio", sa.Float(), nullable=True),
        sa.Column("model_version", sa.String(100), nullable=True),
        sa.Column("credit_score", sa.Integer(), nullable=True),
        sa.Column("default_probability", sa.Float(), nullable=True),
        sa.Column("approved_tenure_months", sa.Integer(), nullable=True),
        sa.Column("final_decision", sa.String(30), nullable=True),
        sa.Column("risk_tier", sa.String(50), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )
    op.create_index("ix_decision_audit_logs_application_id", "decision_audit_logs", ["application_id"], unique=True)
    op.create_index("ix_decision_audit_logs_created_at", "decision_audit_logs", ["created_at"])


def downgrade() -> None:
    op.drop_table("decision_audit_logs")
    op.drop_table("loan_facilities")
