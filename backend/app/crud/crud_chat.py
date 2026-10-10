"""CRUD operations for AI Assistant Chat Sessions and Messages."""

import logging
from typing import List, Optional, Tuple
from sqlalchemy.orm import Session
from app.database import new_id
from app.models.chat import ChatSession, ChatMessage
from app.schemas.chat import ChatSessionCreate, ChatMessageCreate

logger = logging.getLogger(__name__)


def get_chat_sessions(db: Session, user_id: Optional[str] = None) -> List[ChatSession]:
    query = db.query(ChatSession)
    if user_id:
        query = query.filter(ChatSession.user_id == user_id)
    return query.order_by(ChatSession.created_at.desc()).all()


def get_chat_session_by_id(db: Session, session_id: str) -> Optional[ChatSession]:
    return db.query(ChatSession).filter(ChatSession.id == session_id).first()


def create_chat_session(db: Session, session_in: ChatSessionCreate, user_id: Optional[str] = None) -> ChatSession:
    # Random three-digit IDs collided with existing/seeded sessions, causing a
    # newly-created chat to display another session's old demo messages.
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


def add_chat_message_and_respond(
    db: Session,
    session_id: str,
    message_in: ChatMessageCreate,
) -> Tuple[ChatMessage, ChatMessage]:
    """Persist a chat answer using explicit grounded/general/hybrid routing.

    Auto is conservative and falls back to grounded for ambiguous queries;
    general mode is explicit (or selected only by a clear general intent).
    """
    user_msg_id = new_id("msg_user")
    user_msg = ChatMessage(
        id=user_msg_id,
        session_id=session_id,
        sender="user",
        text=message_in.text,
        text_en=message_in.text_en or message_in.text,
        timestamp="الآن",
        citations=[],
    )
    db.add(user_msg)

    segments = []
    try:
        if message_in.mode == "auto":
            from app.services.rag_assistant import answer_auto_query, answer_citations

            routed_answer = answer_auto_query(message_in.text)
            bot_text = routed_answer.answer
            bot_text_en = routed_answer.answer
            citations = answer_citations(routed_answer) if routed_answer.answer_mode in {"grounded", "hybrid"} else []
            answer_mode = routed_answer.answer_mode
            provenance = routed_answer.provenance
            disclaimer = routed_answer.disclaimer
            segments = [
                {
                    "text": segment.text,
                    "sourceType": segment.source_type,
                    "citationHandles": list(segment.citation_handles),
                    "supportStatus": segment.support_status,
                }
                for segment in routed_answer.segments
            ]
        elif message_in.mode == "general":
            from app.services.rag_assistant import answer_general_query

            general_answer = answer_general_query(message_in.text)
            bot_text = general_answer.answer
            bot_text_en = general_answer.answer
            citations = []
            answer_mode = general_answer.answer_mode
            provenance = general_answer.provenance
            disclaimer = general_answer.disclaimer
        elif message_in.mode == "grounded":
            from app.services.rag_assistant import answer_citations
            from app.services.rag_assistant import answer_query

            rag_answer = answer_query(message_in.text)
            bot_text = rag_answer.answer
            bot_text_en = rag_answer.answer
            citations = answer_citations(rag_answer)
            answer_mode = "insufficient_evidence" if rag_answer.no_answer else "grounded"
            provenance = "retrieved"
            disclaimer = None
    except Exception:
        # Keep the endpoint explicit about which isolated runtime failed; never
        # turn a provider failure into a fabricated answer or a misleading
        # document citation.
        logger.exception("AI assistant answer failed for chat session %s", session_id)
        failed_general = message_in.mode == "general"
        if failed_general:
            bot_text = "تعذر تشغيل المساعد العام حالياً. يرجى المحاولة مرة أخرى."
            bot_text_en = "The general AI assistant is temporarily unavailable. Please try again."
            answer_mode = "general"
        elif message_in.mode == "auto":
            arabic = any("\u0600" <= char <= "\u06ff" for char in message_in.text)
            bot_text = (
                "تعذر تصنيف السؤال أو الإجابة عنه بأمان حالياً. لم يتم إنشاء أي معلومة غير مدعومة."
                if arabic
                else "Unable to safely classify or answer this question right now. No unsupported claim was generated."
            )
            bot_text_en = "The assistant could not safely classify or answer this question. No unsupported claim was generated."
            answer_mode = "insufficient_evidence"
        else:
            bot_text = "تعذر تشغيل مساعد المستندات حالياً. يرجى التأكد من إعداد خدمة RAG ثم المحاولة مرة أخرى."
            bot_text_en = "The document assistant is temporarily unavailable. Check the RAG runtime configuration and try again."
            answer_mode = "grounded"
        citations = []
        provenance = "unavailable"
        disclaimer = None
        segments = []
    suggested_action = None

    bot_msg_id = new_id("msg_bot")
    bot_msg = ChatMessage(
        id=bot_msg_id,
        session_id=session_id,
        sender="assistant",
        text=bot_text,
        text_en=bot_text_en,
        timestamp="الآن",
        citations=citations,
        suggested_action=suggested_action,
        answer_mode=answer_mode,
        provenance=provenance,
        disclaimer=disclaimer,
        segments=segments,
    )
    db.add(bot_msg)

    # Update session time
    db_session = get_chat_session_by_id(db, session_id)
    if db_session:
        db_session.time_ago = "الآن"
        db_session.time_ago_en = "Just now"

    db.commit()
    db.refresh(user_msg)
    db.refresh(bot_msg)
    return user_msg, bot_msg


def save_chat_exchange(db: Session, session_id: str, message_in: ChatMessageCreate, answer: str):
    """Persist an answer produced by the legacy application explainer."""
    user_msg = ChatMessage(
        id=new_id("msg_user"),
        session_id=session_id,
        sender="user",
        text=message_in.text,
        text_en=message_in.text_en or message_in.text,
        timestamp="الآن",
        citations=[],
    )
    bot_msg = ChatMessage(
        id=new_id("msg_bot"),
        session_id=session_id,
        sender="assistant",
        text=answer,
        text_en=answer,
        timestamp="الآن",
        citations=[],
        answer_mode="grounded",
        provenance="retrieved",
        segments=[],
    )
    db.add_all([user_msg, bot_msg])
    db.commit()
    db.refresh(user_msg)
    db.refresh(bot_msg)
    return user_msg, bot_msg
