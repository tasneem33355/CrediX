"""AI Assistant Chat API Router."""

from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.auth.dependencies import require_officer
from app.database import get_db
from app.models.user import User
from app.services.chat_context import build_application_blocks
from app.services.llm_explainer_client import ask_explainer
from app.crud.crud_chat import (
    get_chat_sessions,
    get_chat_session_by_id,
    create_chat_session,
    delete_chat_session,
    get_session_messages,
    add_chat_message_and_respond,
    save_chat_exchange,
)
from app.schemas.chat import (
    ChatSessionResponse,
    ChatSessionCreate,
    ChatSessionWithMessagesResponse,
    ChatMessageResponse,
    ChatMessageCreate,
)

router = APIRouter(prefix="/ai-assistant", tags=["AI Assistant Copilot"])


def _own_session_or_404(db: Session, session_id: str, user: User):
    session = get_chat_session_by_id(db, session_id)
    if not session or session.user_id != user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Session {session_id} not found")
    return session


@router.get("/sessions", response_model=List[ChatSessionResponse])
def list_chat_sessions(db: Session = Depends(get_db), user: User = Depends(require_officer)):
    """List all AI chat sessions."""
    return get_chat_sessions(db, user_id=user.id)


@router.post("/sessions", response_model=ChatSessionResponse, status_code=status.HTTP_201_CREATED)
def start_chat_session(session_in: ChatSessionCreate, db: Session = Depends(get_db), user: User = Depends(require_officer)):
    """Create a new AI chat session."""
    return create_chat_session(db, session_in, user_id=user.id)


@router.get("/sessions/{session_id}", response_model=ChatSessionWithMessagesResponse)
def get_session_details(session_id: str, db: Session = Depends(get_db), user: User = Depends(require_officer)):
    """Get chat session and its full message history."""
    return _own_session_or_404(db, session_id, user)


@router.get("/sessions/{session_id}/messages", response_model=List[ChatMessageResponse])
def list_session_messages(session_id: str, db: Session = Depends(get_db), user: User = Depends(require_officer)):
    """List messages for a specific chat session."""
    _own_session_or_404(db, session_id, user)
    return get_session_messages(db, session_id)


@router.post("/sessions/{session_id}/messages", response_model=List[ChatMessageResponse])
async def post_chat_prompt(
    session_id: str,
    message_in: ChatMessageCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_officer),
):
    """Send user question and receive user message along with AI response and document citations."""
    _own_session_or_404(db, session_id, user)

    # Preserve the application-specific explainer contract when the UI targets
    # a concrete application. General/grounded/auto questions remain available
    # without an application id when the mode is sent explicitly.
    if message_in.application_id:
        blocks = build_application_blocks(db, message_in.application_id)
        if blocks is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Application not found")
        history = [
            {"role": m.sender, "content": m.text}
            for m in get_session_messages(db, session_id)[-6:]
        ]
        while history and history[0]["role"] != "user":
            history.pop(0)
        lang = message_in.lang if message_in.lang in ("ar", "en") else "ar"
        result = await ask_explainer(blocks, message_in.text, lang=lang, history=history)
        if result.get("error") or not result.get("answer"):
            raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="AI assistant service is unavailable. Please try again.")
        user_msg, bot_msg = save_chat_exchange(db, session_id, message_in, result["answer"])
        return [user_msg, bot_msg]

    if "mode" not in message_in.model_fields_set:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="mode is required for non-application questions")

    user_msg, bot_msg = add_chat_message_and_respond(db, session_id, message_in)
    return [user_msg, bot_msg]


@router.delete("/sessions/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_chat_session(session_id: str, db: Session = Depends(get_db), user: User = Depends(require_officer)):
    """Delete a chat session and its message history."""
    _own_session_or_404(db, session_id, user)
    success = delete_chat_session(db, session_id)
    return None

