"""CaseCard ORM Model for Kanban Case Management."""

from datetime import datetime
from sqlalchemy import CheckConstraint, Column, String, Numeric, DateTime
from app.database import Base


class CaseCard(Base):
    __tablename__ = "case_cards"
    __table_args__ = (CheckConstraint("amount > 0", name="ck_case_cards_amount_positive"),)

    id = Column(String(50), primary_key=True, index=True)
    application_id = Column(String(50), index=True, nullable=False)
    client_name = Column(String(150), nullable=False)
    client_name_en = Column(String(150), nullable=False)
    initials = Column(String(10), nullable=False)
    amount = Column(Numeric(14, 2), nullable=False)
    currency = Column(String(10), default="ج.م")
    stage_tag = Column(String(100), nullable=False)
    stage_tag_en = Column(String(100), nullable=False)
    column_id = Column(String(30), nullable=False, default="processing")  # 'processing' | 'human_review' | 'completed'
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

