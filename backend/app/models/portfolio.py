"""Core-banking portfolio tables that feed the executive dashboard."""

from datetime import datetime
from sqlalchemy import Boolean, Column, Date, DateTime, Float, Integer, Numeric, String
from app.database import Base


class LoanFacility(Base):
    """A granted loan/card. Created when an officer approves an application (or by the demo seed)."""
    __tablename__ = "loan_facilities"

    facility_id = Column(String(50), primary_key=True)
    application_id = Column(String(50), nullable=True, unique=True, index=True)
    customer_id = Column(String(50), nullable=True)
    contract_type = Column(String(30), nullable=False)  # CASH_LOAN | CAR_LOAN | CREDIT_CARD | SME_LOAN | MORTGAGE
    granted_amount = Column(Numeric(14, 2), nullable=False)
    granted_date = Column(Date, nullable=False)
    tenor_months = Column(Integer, nullable=False)
    facility_status = Column(String(20), nullable=False, default="ACTIVE_PERFORMING", index=True)
    # ACTIVE_PERFORMING | CLOSED_PAID_OFF | DEFAULTED_NPL | RESTRUCTURED
    historical_max_dpd = Column(Integer, nullable=False, default=0)
    is_demo = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)


class DecisionAuditLog(Base):
    """One row per scored application (latest scoring wins). Feeds scored KPIs and drift."""
    __tablename__ = "decision_audit_logs"

    decision_id = Column(String(50), primary_key=True)
    application_id = Column(String(50), nullable=False, unique=True, index=True)
    national_id = Column(String(14), nullable=True)
    submission_timestamp = Column(DateTime, nullable=True)
    customer_segment = Column(String(20), nullable=True)  # NEW_TO_BANK | RETURNING
    requested_amount = Column(Numeric(14, 2), nullable=True)
    fraud_risk_score = Column(Float, nullable=True)  # 0..1
    fraud_risk_level = Column(String(20), nullable=True)
    is_anomaly = Column(Boolean, nullable=False, default=False)
    dti_ratio = Column(Float, nullable=True)
    model_version = Column(String(100), nullable=True)
    credit_score = Column(Integer, nullable=True)
    default_probability = Column(Float, nullable=True)
    approved_tenure_months = Column(Integer, nullable=True)
    final_decision = Column(String(30), nullable=True)  # AUTO-APPROVE | MANUAL REVIEW | AUTO-REJECT
    risk_tier = Column(String(150), nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow, index=True)
