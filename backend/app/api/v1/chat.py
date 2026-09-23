"""AI Assistant Chat API Router."""

from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.crud.crud_chat import (
    get_chat_sessions,
    get_chat_session_by_id,
    create_chat_session,
    delete_chat_session,
    get_session_messages,
    add_chat_message_and_respond,
)
from app.schemas.chat import (
    ChatSessionResponse,
    ChatSessionCreate,
    ChatSessionWithMessagesResponse,
    ChatMessageResponse,
    ChatMessageCreate,
)

router = APIRouter(prefix="/ai-assistant", tags=["AI Assistant Copilot"])


@router.get("/sessions", response_model=List[ChatSessionResponse])
def list_chat_sessions(db: Session = Depends(get_db)):
    """List all AI chat sessions."""
    return get_chat_sessions(db)


@router.post("/sessions", response_model=ChatSessionResponse, status_code=status.HTTP_201_CREATED)
def start_chat_session(session_in: ChatSessionCreate, db: Session = Depends(get_db)):
    """Create a new AI chat session."""
    return create_chat_session(db, session_in)


@router.get("/sessions/{session_id}", response_model=ChatSessionWithMessagesResponse)
def get_session_details(session_id: str, db: Session = Depends(get_db)):
    """Get chat session and its full message history."""
    session = get_chat_session_by_id(db, session_id)
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Session {session_id} not found")
    return session


@router.get("/sessions/{session_id}/messages", response_model=List[ChatMessageResponse])
def list_session_messages(session_id: str, db: Session = Depends(get_db)):
    """List messages for a specific chat session."""
    session = get_chat_session_by_id(db, session_id)
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Session {session_id} not found")
    return get_session_messages(db, session_id)


@router.post("/sessions/{session_id}/messages", response_model=List[ChatMessageResponse])
def post_chat_prompt(session_id: str, message_in: ChatMessageCreate, db: Session = Depends(get_db)):
    """Send user question and receive user message along with AI response and document citations."""
    session = get_chat_session_by_id(db, session_id)
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Session {session_id} not found")

    user_msg, bot_msg = add_chat_message_and_respond(db, session_id, message_in)
    return [user_msg, bot_msg]


@router.delete("/sessions/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_chat_session(session_id: str, db: Session = Depends(get_db)):
    """Delete a chat session and its message history."""
    success = delete_chat_session(db, session_id)
    if not success:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Session {session_id} not found")
    return None

