"""AI Assistant Chat Pydantic Schemas."""

from typing import Optional, List
from pydantic import BaseModel, ConfigDict, Field


class ChatCitation(BaseModel):
    document_name: str = Field(..., alias="documentName")
    document_name_en: str = Field(..., alias="documentNameEn")
    page: int
    quote: str

    model_config = ConfigDict(populate_by_name=True, from_attributes=True)


class SuggestedAction(BaseModel):
    label: str
    label_en: str = Field(..., alias="labelEn")
    description: str
    description_en: str = Field(..., alias="descriptionEn")

    model_config = ConfigDict(populate_by_name=True, from_attributes=True)


class ChatMessageCreate(BaseModel):
    text: str
    text_en: Optional[str] = Field(None, alias="textEn")

    model_config = ConfigDict(populate_by_name=True)


class ChatMessageResponse(BaseModel):
    id: str
    sender: str  # 'user' | 'assistant'
    text: str
    text_en: Optional[str] = Field(None, alias="textEn")
    timestamp: str
    citations: Optional[List[ChatCitation]] = Field(default_factory=list)
    suggested_action: Optional[SuggestedAction] = Field(None, alias="suggestedAction")

    model_config = ConfigDict(populate_by_name=True, from_attributes=True)


class ChatSessionCreate(BaseModel):
    title: str
    title_en: Optional[str] = Field(None, alias="titleEn")

    model_config = ConfigDict(populate_by_name=True)


class ChatSessionResponse(BaseModel):
    id: str
    title: str
    title_en: str = Field(..., alias="titleEn")
    time_ago: str = Field("الآن", alias="timeAgo")
    time_ago_en: str = Field("Just now", alias="timeAgoEn")
    active: bool = True

    model_config = ConfigDict(populate_by_name=True, from_attributes=True)


class ChatSessionWithMessagesResponse(ChatSessionResponse):
    messages: List[ChatMessageResponse] = []

