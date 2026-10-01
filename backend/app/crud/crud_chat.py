"""CRUD operations for AI Assistant Chat Sessions and Messages."""

from typing import List, Optional, Tuple
from sqlalchemy.orm import Session
from app.models.chat import ChatSession, ChatMessage
from app.schemas.chat import ChatSessionCreate, ChatMessageCreate
from app.database import new_id


def get_chat_sessions(db: Session, user_id: Optional[str] = None) -> List[ChatSession]:
    query = db.query(ChatSession)
    if user_id is not None:
        query = query.filter(ChatSession.user_id == user_id)
    return query.order_by(ChatSession.created_at.desc()).all()


def get_chat_session_by_id(db: Session, session_id: str) -> Optional[ChatSession]:
    return db.query(ChatSession).filter(ChatSession.id == session_id).first()


def create_chat_session(db: Session, session_in: ChatSessionCreate, user_id: Optional[str] = None) -> ChatSession:
    session_id = new_id("sess")
    db_session = ChatSession(
        id=session_id,
        user_id=user_id,
        title=session_in.title,
        title_en=session_in.title_en or session_in.title,
        time_ago="الآن",
        time_ago_en="Just now",
        active=True,
    )
    db.add(db_session)
    db.commit()
    db.refresh(db_session)
    return db_session


def delete_chat_session(db: Session, session_id: str) -> bool:
    db_session = get_chat_session_by_id(db, session_id)
    if not db_session:
        return False
    db.delete(db_session)
    db.commit()
    return True


def get_session_messages(db: Session, session_id: str) -> List[ChatMessage]:
    return db.query(ChatMessage).filter(ChatMessage.session_id == session_id).order_by(ChatMessage.created_at.asc()).all()


def save_chat_exchange(
    db: Session,
    session_id: str,
    message_in: ChatMessageCreate,
    answer: str,
) -> Tuple[ChatMessage, ChatMessage]:
    """Persist the officer's question and the assistant's answer (called after the LLM replied)."""
    user_msg = ChatMessage(
        id=new_id("msg"),
        session_id=session_id,
        sender="user",
        text=message_in.text,
        text_en=message_in.text_en or message_in.text,
        timestamp="الآن",
        citations=[],
    )
    db.add(user_msg)

    bot_msg = ChatMessage(
        id=new_id("msg"),
        session_id=session_id,
        sender="assistant",
        text=answer,
        text_en=answer,
        timestamp="الآن",
        citations=[],
        suggested_action=None,
    )
    db.add(bot_msg)

    db_session = get_chat_session_by_id(db, session_id)
    if db_session:
        db_session.time_ago = "الآن"
        db_session.time_ago_en = "Just now"

    db.commit()
    db.refresh(user_msg)
    db.refresh(bot_msg)
    return user_msg, bot_msg
