"""Data model hardening: NUMERIC money, decision columns, constraints, audit/extraction/model-run tables.

Revision ID: 20260930_02
Revises: 20260919_01
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "20260930_02"
down_revision = "20260919_01"
branch_labels = None
depends_on = None

JSONType = sa.JSON().with_variant(postgresql.JSONB(), "postgresql")


def upgrade() -> None:
    op.alter_column("loan_applications", "requested_amount", existing_type=sa.Float(), type_=sa.Numeric(14, 2),
                    existing_nullable=False, postgresql_using="round(requested_amount::numeric, 2)")
    op.alter_column("case_cards", "amount", existing_type=sa.Float(), type_=sa.Numeric(14, 2),
                    existing_nullable=False, postgresql_using="round(amount::numeric, 2)")

    op.execute("UPDATE loan_applications SET submitted_at = created_at WHERE submitted_at IS NULL")

    op.add_column("loan_applications", sa.Column("final_decision", sa.String(length=20), nullable=True))
    op.add_column("loan_applications", sa.Column("decided_by", sa.String(length=50), nullable=True))
    op.add_column("loan_applications", sa.Column("decided_at", sa.DateTime(), nullable=True))
    op.add_column("loan_applications", sa.Column("decision_notes", sa.Text(), nullable=True))
    op.create_foreign_key("fk_loan_applications_decided_by_users", "loan_applications", "users",
                          ["decided_by"], ["id"], ondelete="SET NULL")
    op.execute("""
        UPDATE loan_applications
           SET final_decision = CASE status WHEN 'approved' THEN 'approve' ELSE 'reject' END,
               decided_at = updated_at
         WHERE status IN ('approved', 'rejected') AND final_decision IS NULL
    """)

    op.create_check_constraint("ck_loan_applications_amount_positive", "loan_applications", "requested_amount > 0")
    op.create_check_constraint("ck_loan_applications_tenure_range", "loan_applications", "tenure_months BETWEEN 1 AND 480")
    op.create_check_constraint("ck_case_cards_amount_positive", "case_cards", "amount > 0")

    op.create_table(
        "extraction_results",
        sa.Column("id", sa.String(length=50), nullable=False),
        sa.Column("application_id", sa.String(length=50), nullable=False),
        sa.Column("source", sa.String(length=50), nullable=False),
        sa.Column("schema_version", sa.String(length=20), nullable=False),
        sa.Column("payload_sha256", sa.String(length=64), nullable=False),
        sa.Column("payload", JSONType, nullable=False),
        sa.Column("is_consistent", sa.Boolean(), nullable=True),
        sa.Column("warnings", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["application_id"], ["loan_applications.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("application_id", "payload_sha256", name="uq_extraction_application_payload"),
    )
    op.create_index("ix_extraction_results_application_id", "extraction_results", ["application_id"])

    op.create_table(
        "model_runs",
        sa.Column("id", sa.String(length=50), nullable=False),
        sa.Column("application_id", sa.String(length=50), nullable=False),
        sa.Column("kind", sa.String(length=20), nullable=False),
        sa.Column("model_name", sa.String(length=100), nullable=False),
        sa.Column("model_version", sa.String(length=50), nullable=True),
        sa.Column("status", sa.String(length=20), nullable=False),
        sa.Column("input_sha256", sa.String(length=64), nullable=True),
        sa.Column("output", JSONType, nullable=True),
        sa.Column("error", sa.Text(), nullable=True),
        sa.Column("latency_ms", sa.Integer(), nullable=True),
        sa.Column("requested_by", sa.String(length=50), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("completed_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["application_id"], ["loan_applications.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["requested_by"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_model_runs_application_id", "model_runs", ["application_id"])
    op.create_index("ix_model_runs_kind", "model_runs", ["kind"])

    op.create_table(
        "decision_audit",
        sa.Column("id", sa.String(length=50), nullable=False),
        sa.Column("application_id", sa.String(length=50), nullable=False),
        sa.Column("action", sa.String(length=20), nullable=False),
        sa.Column("decision", sa.String(length=20), nullable=True),
        sa.Column("previous_status", sa.String(length=30), nullable=True),
        sa.Column("new_status", sa.String(length=30), nullable=True),
        sa.Column("actor_user_id", sa.String(length=50), nullable=True),
        sa.Column("actor_name", sa.String(length=100), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("snapshot", JSONType, nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["actor_user_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_decision_audit_application_id", "decision_audit", ["application_id"])
    op.create_index("ix_decision_audit_created_at", "decision_audit", ["created_at"])


def downgrade() -> None:
    op.drop_index("ix_decision_audit_created_at", table_name="decision_audit")
    op.drop_index("ix_decision_audit_application_id", table_name="decision_audit")
    op.drop_table("decision_audit")
    op.drop_index("ix_model_runs_kind", table_name="model_runs")
    op.drop_index("ix_model_runs_application_id", table_name="model_runs")
    op.drop_table("model_runs")
    op.drop_index("ix_extraction_results_application_id", table_name="extraction_results")
    op.drop_table("extraction_results")
    op.drop_constraint("ck_case_cards_amount_positive", "case_cards", type_="check")
    op.drop_constraint("ck_loan_applications_tenure_range", "loan_applications", type_="check")
    op.drop_constraint("ck_loan_applications_amount_positive", "loan_applications", type_="check")
    op.drop_constraint("fk_loan_applications_decided_by_users", "loan_applications", type_="foreignkey")
    for col in ("decision_notes", "decided_at", "decided_by", "final_decision"):
        op.drop_column("loan_applications", col)
    op.alter_column("case_cards", "amount", existing_type=sa.Numeric(14, 2), type_=sa.Float(), existing_nullable=False)
    op.alter_column("loan_applications", "requested_amount", existing_type=sa.Numeric(14, 2),
                    type_=sa.Float(), existing_nullable=False)
