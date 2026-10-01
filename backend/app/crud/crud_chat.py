"""CRUD operations for AI Assistant Chat Sessions and Messages.

The generated assistant response is DEMO ONLY, not a real RAG/LLM result.
"""

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


def add_chat_message_and_respond(
    db: Session,
    session_id: str,
    message_in: ChatMessageCreate,
) -> Tuple[ChatMessage, ChatMessage]:
    """Adds user message and generates a realistic placeholder AI response with citations."""
    user_msg_id = new_id("msg")
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

    # Generate placeholder AI Assistant response
    q = message_in.text.lower()
    if "متناقض" in q or "discrepanc" in q or "احتيال" in q or "fraud" in q:
        bot_text = "تم رصد تناقض بين شهادة الدخل (المعلن: 85,000 ج.م) وكشف الحساب البنكي الصادر من البنك الأهلي المصري (المتوسط الفعلي: 53,700 ج.م شهرياً)."
        bot_text_en = "Discrepancy identified between declared income (85,000 EGP) and actual bank statement deposits (53,700 EGP/month)."
        citations = [
            {"documentName": "كشف حساب بنكي - صفحة 3", "documentNameEn": "Bank Statement - Page 3", "page": 3, "quote": "متوسط التدفق الشهري الدائن: 53,700 ج.م"},
            {"documentName": "شهادة الدخل", "documentNameEn": "Income Certificate", "page": 1, "quote": "الدخل الصافي المعلن: 85,000 ج.م"}
        ]
        suggested_action = {
            "label": "إجراء مقترح",
            "labelEn": "Suggested Action",
            "description": "طلب كشف حساب بنكي لـ 6 أشهر إضافية أو إقرار ضريبي موثق.",
            "descriptionEn": "Request an additional 6-month bank statement or certified tax return."
        }
    elif "إيداع" in q or "deposit" in q or "رصيد" in q or "balance" in q:
        bot_text = "إجمالي الإيداعات خلال آخر 3 شهور هو 485,200 ج.م، بمتوسط شهري قدره 161,733 ج.م ومتوسط رصيد ختامي 126,450 ج.م."
        bot_text_en = "Total deposits over the last 3 months amount to 485,200 EGP, with a monthly average of 161,733 EGP and average balance of 126,450 EGP."
        citations = [
            {"documentName": "كشف الحساب البنكي", "documentNameEn": "Bank Statement", "page": 2, "quote": "إجمالي الإيداعات: 485,200 ج.م - صفحة 2"}
        ]
        suggested_action = None
    else:
        bot_text = "بناءً على وثائق الطلب المفحوصة، فإن درجة الجدارة الائتمانية تبلغ 78/100 ونسبة عبء الدين DBR تتوافق مع معايير البنك المركزي المصري."
        bot_text_en = "Based on analyzed application documents, creditworthiness score is 78/100 and DTI complies with Central Bank of Egypt regulations."
        citations = [
            {"documentName": "تقرير الاستعلام الائتماني i-Score", "documentNameEn": "i-Score Credit Report", "page": 1, "quote": "السجل الائتماني منتظم وبدون تعثر"}
        ]
        suggested_action = None

    bot_msg_id = new_id("msg")
    bot_msg = ChatMessage(
        id=bot_msg_id,
        session_id=session_id,
        sender="assistant",
        text=bot_text,
        text_en=bot_text_en,
        timestamp="الآن",
        citations=citations,
        suggested_action=suggested_action,
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
