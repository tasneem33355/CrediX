"""ChatSession and ChatMessage ORM Models for AI Assistant."""

from datetime import datetime
from sqlalchemy import Column, String, DateTime, Text, JSON, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from app.database import Base


class ChatSession(Base):
    __tablename__ = "chat_sessions"

    id = Column(String(50), primary_key=True, index=True)
    user_id = Column(String(50), ForeignKey("users.id", ondelete="CASCADE"), nullable=True)
    title = Column(String(200), nullable=False)
    title_en = Column(String(200), nullable=False)
    time_ago = Column(String(50), default="الآن")
    time_ago_en = Column(String(50), default="Just now")
    active = Column(Boolean, default=True)

    user = relationship("User", back_populates="chat_sessions")
    messages = relationship("ChatMessage", back_populates="session", cascade="all, delete-orphan", order_by="ChatMessage.created_at")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id = Column(String(50), primary_key=True, index=True)
    session_id = Column(String(50), ForeignKey("chat_sessions.id", ondelete="CASCADE"), nullable=False, index=True)
    sender = Column(String(20), nullable=False)  # 'user' | 'assistant'
    text = Column(Text, nullable=False)
    text_en = Column(Text, nullable=True)
    timestamp = Column(String(50), nullable=False)
    citations = Column(JSON, nullable=True, default=list)  # [{documentName, documentNameEn, page, quote}]
    suggested_action = Column(JSON, nullable=True)         # {label, labelEn, description, descriptionEn}

    session = relationship("ChatSession", back_populates="messages")
    created_at = Column(DateTime, default=datetime.utcnow)
