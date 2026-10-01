"""User ORM Model."""

from sqlalchemy import Column, String, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(String(50), primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    name_en = Column(String(100), nullable=False)
    email = Column(String(150), unique=True, index=True, nullable=False)
    # Reserved for future Supabase/Auth subject mapping; credentials stay external.
    external_auth_id = Column(String(255), unique=True, index=True, nullable=True)
    role = Column(String(20), nullable=False, default="officer")  # 'officer' | 'client'
    avatar = Column(String(255), nullable=True)
    title = Column(String(100), nullable=True)
    title_en = Column(String(100), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    applications = relationship("LoanApplication", back_populates="applicant", foreign_keys="LoanApplication.applicant_id")
    chat_sessions = relationship("ChatSession", back_populates="user")
