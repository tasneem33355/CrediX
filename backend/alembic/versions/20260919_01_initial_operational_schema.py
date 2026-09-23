"""Initial operational schema.

Revision ID: 20260919_01
Revises:
Create Date: 2026-09-19
"""

from alembic import op
import sqlalchemy as sa


revision = "20260919_01"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.String(length=50), nullable=False),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("name_en", sa.String(length=100), nullable=False),
        sa.Column("email", sa.String(length=150), nullable=False),
        sa.Column("external_auth_id", sa.String(length=255), nullable=True),
        sa.Column("role", sa.String(length=20), nullable=False),
        sa.Column("avatar", sa.String(length=255), nullable=True),
        sa.Column("title", sa.String(length=100), nullable=True),
        sa.Column("title_en", sa.String(length=100), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_users_id", "users", ["id"])
    op.create_index("ix_users_email", "users", ["email"], unique=True)
    op.create_index("ix_users_external_auth_id", "users", ["external_auth_id"], unique=True)

    op.create_table(
        "loan_applications",
        sa.Column("id", sa.String(length=50), nullable=False),
        sa.Column("applicant_id", sa.String(length=50), nullable=True),
        sa.Column("applicant_name", sa.String(length=150), nullable=False),
        sa.Column("applicant_name_en", sa.String(length=150), nullable=False),
        sa.Column("national_id", sa.String(length=30), nullable=False),
        sa.Column("mobile_number", sa.String(length=30), nullable=False),
        sa.Column("client_type", sa.String(length=20), nullable=True),
        sa.Column("occupation", sa.String(length=150), nullable=True),
        sa.Column("occupation_en", sa.String(length=150), nullable=True),
        sa.Column("loan_type", sa.String(length=30), nullable=False),
        sa.Column("loan_type_label", sa.String(length=100), nullable=True),
        sa.Column("loan_type_label_en", sa.String(length=100), nullable=True),
        sa.Column("requested_amount", sa.Float(), nullable=False),
        sa.Column("currency", sa.String(length=10), nullable=True),
        sa.Column("tenure_months", sa.Integer(), nullable=True),
        sa.Column("purpose", sa.Text(), nullable=True),
        sa.Column("date", sa.String(length=50), nullable=True),
        sa.Column("last_updated", sa.String(length=50), nullable=True),
        sa.Column("status", sa.String(length=30), nullable=False),
        sa.Column("submitted_at", sa.DateTime(), nullable=True),
        sa.Column("ai_recommendation", sa.String(length=30), nullable=True),
        sa.Column("ai_recommendation_label", sa.String(length=100), nullable=True),
        sa.Column("ai_recommendation_label_en", sa.String(length=100), nullable=True),
        sa.Column("ai_confidence", sa.Float(), nullable=True),
        sa.Column("recommendation_reasons", sa.JSON(), nullable=True),
        sa.Column("pipeline_completed_steps", sa.Integer(), nullable=True),
        sa.Column("pipeline_total_steps", sa.Integer(), nullable=True),
        sa.Column("pipeline_steps", sa.JSON(), nullable=True),
        sa.Column("ocr_accuracy", sa.Float(), nullable=True),
        sa.Column("extracted_from_doc_count", sa.Integer(), nullable=True),
        sa.Column("extracted_fields", sa.JSON(), nullable=True),
        sa.Column("bank_summary", sa.JSON(), nullable=True),
        sa.Column("credit_score", sa.Integer(), nullable=True),
        sa.Column("credit_risk_category", sa.String(length=20), nullable=True),
        sa.Column("credit_risk_label", sa.String(length=50), nullable=True),
        sa.Column("credit_risk_label_en", sa.String(length=50), nullable=True),
        sa.Column("calculated_factors_count", sa.Integer(), nullable=True),
        sa.Column("credit_factors", sa.JSON(), nullable=True),
        sa.Column("fraud_risk_score", sa.Integer(), nullable=True),
        sa.Column("fraud_risk_category", sa.String(length=20), nullable=True),
        sa.Column("fraud_risk_label", sa.String(length=50), nullable=True),
        sa.Column("fraud_risk_label_en", sa.String(length=50), nullable=True),
        sa.Column("analyzed_signals_count", sa.Integer(), nullable=True),
        sa.Column("fraud_signals", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["applicant_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_loan_applications_id", "loan_applications", ["id"])
    op.create_index("ix_loan_applications_applicant_id", "loan_applications", ["applicant_id"])
    op.create_index("ix_loan_applications_national_id", "loan_applications", ["national_id"])

    op.create_table(
        "documents",
        sa.Column("id", sa.String(length=50), nullable=False),
        sa.Column("application_id", sa.String(length=50), nullable=True),
        sa.Column("code", sa.String(length=10), nullable=True),
        sa.Column("name", sa.String(length=150), nullable=False),
        sa.Column("name_en", sa.String(length=150), nullable=False),
        sa.Column("size", sa.String(length=30), nullable=True),
        sa.Column("upload_date", sa.String(length=50), nullable=True),
        sa.Column("status", sa.String(length=20), nullable=True),
        sa.Column("status_label", sa.String(length=50), nullable=True),
        sa.Column("status_label_en", sa.String(length=50), nullable=True),
        sa.Column("file_url", sa.String(length=255), nullable=True),
        sa.Column("storage_key", sa.String(length=255), nullable=True),
        sa.Column("mime_type", sa.String(length=100), nullable=True),
        sa.Column("extracted_data", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("uploaded_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["application_id"], ["loan_applications.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_documents_id", "documents", ["id"])
    op.create_index("ix_documents_application_id", "documents", ["application_id"])

    op.create_table(
        "timeline_events",
        sa.Column("id", sa.String(length=50), nullable=False),
        sa.Column("application_id", sa.String(length=50), nullable=False),
        sa.Column("title", sa.String(length=150), nullable=False),
        sa.Column("title_en", sa.String(length=150), nullable=False),
        sa.Column("timestamp", sa.String(length=50), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("description_en", sa.Text(), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=True),
        sa.Column("icon_type", sa.String(length=30), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["application_id"], ["loan_applications.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_timeline_events_id", "timeline_events", ["id"])
    op.create_index("ix_timeline_events_application_id", "timeline_events", ["application_id"])

    op.create_table(
        "case_cards",
        sa.Column("id", sa.String(length=50), nullable=False),
        sa.Column("application_id", sa.String(length=50), nullable=False),
        sa.Column("client_name", sa.String(length=150), nullable=False),
        sa.Column("client_name_en", sa.String(length=150), nullable=False),
        sa.Column("initials", sa.String(length=10), nullable=False),
        sa.Column("amount", sa.Float(), nullable=False),
        sa.Column("currency", sa.String(length=10), nullable=True),
        sa.Column("stage_tag", sa.String(length=100), nullable=False),
        sa.Column("stage_tag_en", sa.String(length=100), nullable=False),
        sa.Column("column_id", sa.String(length=30), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_case_cards_id", "case_cards", ["id"])
    op.create_index("ix_case_cards_application_id", "case_cards", ["application_id"])

    op.create_table(
        "chat_sessions",
        sa.Column("id", sa.String(length=50), nullable=False),
        sa.Column("user_id", sa.String(length=50), nullable=True),
        sa.Column("title", sa.String(length=200), nullable=False),
        sa.Column("title_en", sa.String(length=200), nullable=False),
        sa.Column("time_ago", sa.String(length=50), nullable=True),
        sa.Column("time_ago_en", sa.String(length=50), nullable=True),
        sa.Column("active", sa.Boolean(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_chat_sessions_id", "chat_sessions", ["id"])

    op.create_table(
        "chat_messages",
        sa.Column("id", sa.String(length=50), nullable=False),
        sa.Column("session_id", sa.String(length=50), nullable=False),
        sa.Column("sender", sa.String(length=20), nullable=False),
        sa.Column("text", sa.Text(), nullable=False),
        sa.Column("text_en", sa.Text(), nullable=True),
        sa.Column("timestamp", sa.String(length=50), nullable=False),
        sa.Column("citations", sa.JSON(), nullable=True),
        sa.Column("suggested_action", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["session_id"], ["chat_sessions.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_chat_messages_id", "chat_messages", ["id"])
    op.create_index("ix_chat_messages_session_id", "chat_messages", ["session_id"])


def downgrade() -> None:
    op.drop_index("ix_chat_messages_session_id", table_name="chat_messages")
    op.drop_index("ix_chat_messages_id", table_name="chat_messages")
    op.drop_table("chat_messages")
    op.drop_index("ix_chat_sessions_id", table_name="chat_sessions")
    op.drop_table("chat_sessions")
    op.drop_index("ix_case_cards_application_id", table_name="case_cards")
    op.drop_index("ix_case_cards_id", table_name="case_cards")
    op.drop_table("case_cards")
    op.drop_index("ix_timeline_events_application_id", table_name="timeline_events")
    op.drop_index("ix_timeline_events_id", table_name="timeline_events")
    op.drop_table("timeline_events")
    op.drop_index("ix_documents_application_id", table_name="documents")
    op.drop_index("ix_documents_id", table_name="documents")
    op.drop_table("documents")
    op.drop_index("ix_loan_applications_national_id", table_name="loan_applications")
    op.drop_index("ix_loan_applications_applicant_id", table_name="loan_applications")
    op.drop_index("ix_loan_applications_id", table_name="loan_applications")
    op.drop_table("loan_applications")
    op.drop_index("ix_users_external_auth_id", table_name="users")
    op.drop_index("ix_users_email", table_name="users")
    op.drop_index("ix_users_id", table_name="users")
    op.drop_table("users")
