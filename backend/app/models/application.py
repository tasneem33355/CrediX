"""LoanApplication, Document, and TimelineEvent ORM Models."""

from datetime import datetime
from sqlalchemy import (
    Boolean, CheckConstraint, Column, DateTime, Float, ForeignKey, Integer,
    JSON, Numeric, String, Text, UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
from app.database import Base

# Queryable JSONB on PostgreSQL, plain JSON on SQLite (tests).
JSONType = JSON().with_variant(JSONB(), "postgresql")


class LoanApplication(Base):
    __tablename__ = "loan_applications"
    __table_args__ = (
        CheckConstraint("requested_amount > 0", name="ck_loan_applications_amount_positive"),
        CheckConstraint("tenure_months BETWEEN 1 AND 480", name="ck_loan_applications_tenure_range"),
    )

    id = Column(String(50), primary_key=True, index=True)  # e.g., 'APP-2026-0839'
    applicant_id = Column(String(50), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    applicant_name = Column(String(150), nullable=False)
    applicant_name_en = Column(String(150), nullable=False)
    national_id = Column(String(30), index=True, nullable=False)
    mobile_number = Column(String(30), nullable=False)
    client_type = Column(String(20), default="current")  # 'current' | 'new'
    occupation = Column(String(150), nullable=True)
    occupation_en = Column(String(150), nullable=True)
    
    # Loan Specs
    loan_type = Column(String(30), nullable=False, default="personal")  # 'personal' | 'sme' | 'auto' | 'mortgage'
    loan_type_label = Column(String(100), nullable=True)
    loan_type_label_en = Column(String(100), nullable=True)
    requested_amount = Column(Numeric(14, 2), nullable=False)
    currency = Column(String(10), default="ج.م")
    tenure_months = Column(Integer, default=36)
    purpose = Column(Text, nullable=True)
    date = Column(String(50), nullable=True)
    last_updated = Column(String(50), nullable=True)
    status = Column(String(30), nullable=False, default="under_review")  # 'under_review' | 'approved' | 'suspicious' | 'rejected'
    submitted_at = Column(DateTime, default=datetime.utcnow, nullable=True)

    # قرار الموظف منفصل عن توصية الـ AI
    final_decision = Column(String(20), nullable=True)  # 'approve' | 'reject' | 'manual'
    decided_by = Column(String(50), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    decided_at = Column(DateTime, nullable=True)
    decision_notes = Column(Text, nullable=True)

    # Explainable AI Recommendation (placeholders with sensible defaults)
    ai_recommendation = Column(String(30), nullable=True)  # 'approve' | 'manual_review' | 'reject'
    ai_recommendation_label = Column(String(100), nullable=True)
    ai_recommendation_label_en = Column(String(100), nullable=True)
    ai_confidence = Column(Float, nullable=True)
    recommendation_reasons = Column(JSON, nullable=True, default=list)  # [{ar: str, en: str}]

    # Processing Pipeline
    pipeline_completed_steps = Column(Integer, default=1)
    pipeline_total_steps = Column(Integer, default=5)
    pipeline_steps = Column(JSON, nullable=True, default=list)

    # Extracted Data (OCR)
    ocr_accuracy = Column(Float, nullable=True)
    extracted_from_doc_count = Column(Integer, default=0)
    extracted_fields = Column(JSON, nullable=True, default=list)
    bank_summary = Column(JSON, nullable=True, default=dict)

    # Credit Assessment
    credit_score = Column(Integer, nullable=True)
    credit_risk_category = Column(String(20), nullable=True)  # 'low' | 'medium' | 'high' | 'critical'
    credit_risk_label = Column(String(50), nullable=True)
    credit_risk_label_en = Column(String(50), nullable=True)
    calculated_factors_count = Column(Integer, default=0)
    credit_factors = Column(JSON, nullable=True, default=list)

    # Fraud Detection
    fraud_risk_score = Column(Integer, nullable=True)
    fraud_risk_category = Column(String(20), nullable=True)  # 'low' | 'medium' | 'high' | 'critical'
    fraud_risk_label = Column(String(50), nullable=True)
    fraud_risk_label_en = Column(String(50), nullable=True)
    analyzed_signals_count = Column(Integer, default=0)
    fraud_signals = Column(JSON, nullable=True, default=list)

    # Relationships
    applicant = relationship("User", back_populates="applications", foreign_keys=[applicant_id])
    documents = relationship("Document", back_populates="application", cascade="all, delete-orphan")
    timeline = relationship("TimelineEvent", back_populates="application", cascade="all, delete-orphan")

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class Document(Base):
    __tablename__ = "documents"

    id = Column(String(50), primary_key=True, index=True)
    application_id = Column(String(50), ForeignKey("loan_applications.id", ondelete="CASCADE"), nullable=True, index=True)
    code = Column(String(10), default="DOC")  # e.g., 'ID', 'BA', 'IC', 'CR'
    name = Column(String(150), nullable=False)
    name_en = Column(String(150), nullable=False)
    size = Column(String(30), default="2.0 MB")
    upload_date = Column(String(50), default="الآن")
    status = Column(String(20), default="processing")  # 'success' | 'processing' | 'failed'
    status_label = Column(String(50), default="قيد المعالجة")
    status_label_en = Column(String(50), default="Processing")
    file_url = Column(String(255), nullable=True)
    storage_key = Column(String(255), nullable=True)
    mime_type = Column(String(100), nullable=True)
    extracted_data = Column(JSON, nullable=True, default=dict)

    application = relationship("LoanApplication", back_populates="documents")
    created_at = Column(DateTime, default=datetime.utcnow)
    uploaded_at = Column(DateTime, default=datetime.utcnow)


class TimelineEvent(Base):
    __tablename__ = "timeline_events"

    id = Column(String(50), primary_key=True, index=True)
    application_id = Column(String(50), ForeignKey("loan_applications.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(150), nullable=False)
    title_en = Column(String(150), nullable=False)
    timestamp = Column(String(50), nullable=False)
    description = Column(Text, nullable=False)
    description_en = Column(Text, nullable=False)
    status = Column(String(20), default="completed")  # 'completed' | 'current' | 'pending'
    icon_type = Column(String(30), default="receipt")  # 'receipt' | 'ocr' | 'score' | 'fraud' | 'review'

    application = relationship("LoanApplication", back_populates="timeline")
    created_at = Column(DateTime, default=datetime.utcnow)


class ExtractionResult(Base):
    """Raw OCR/extraction payload exactly as received."""
    __tablename__ = "extraction_results"
    __table_args__ = (UniqueConstraint("application_id", "payload_sha256", name="uq_extraction_application_payload"),)

    id = Column(String(50), primary_key=True)
    application_id = Column(String(50), ForeignKey("loan_applications.id", ondelete="CASCADE"), nullable=False, index=True)
    source = Column(String(50), nullable=False, default="ocr")
    schema_version = Column(String(20), nullable=False, default="1")
    payload_sha256 = Column(String(64), nullable=False)
    payload = Column(JSONType, nullable=False)
    is_consistent = Column(Boolean, nullable=True)
    warnings = Column(JSON, nullable=False, default=list)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)


class ModelRun(Base):
    """One call to an ML/LLM service: what ran, which version, what came back."""
    __tablename__ = "model_runs"

    id = Column(String(50), primary_key=True)
    application_id = Column(String(50), ForeignKey("loan_applications.id", ondelete="CASCADE"), nullable=False, index=True)
    kind = Column(String(20), nullable=False, index=True)  # 'ocr' | 'fraud' | 'pd' | 'explain'
    model_name = Column(String(100), nullable=False)
    model_version = Column(String(50), nullable=True)
    status = Column(String(20), nullable=False, default="pending")  # pending|success|failed|timeout|skipped
    input_sha256 = Column(String(64), nullable=True)
    output = Column(JSONType, nullable=True)
    error = Column(Text, nullable=True)
    latency_ms = Column(Integer, nullable=True)
    requested_by = Column(String(50), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)


class DecisionAudit(Base):
    """Append-only trail. No FK to loan_applications on purpose: it survives deletion."""
    __tablename__ = "decision_audit"

    id = Column(String(50), primary_key=True)
    application_id = Column(String(50), nullable=False, index=True)
    action = Column(String(20), nullable=False)  # created | decision | edited | deleted
    decision = Column(String(20), nullable=True)
    previous_status = Column(String(30), nullable=True)
    new_status = Column(String(30), nullable=True)
    actor_user_id = Column(String(50), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    actor_name = Column(String(100), nullable=True)
    notes = Column(Text, nullable=True)
    snapshot = Column(JSONType, nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow, index=True)
