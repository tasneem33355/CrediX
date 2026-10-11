"""AI Assistant Chat Pydantic Schemas."""

from typing import Literal, Optional, List
from pydantic import BaseModel, ConfigDict, Field, model_validator


AnswerMode = Literal["grounded", "general", "hybrid", "insufficient_evidence"]
Provenance = Literal["retrieved", "ai_generated", "mixed", "unavailable"]
SegmentSourceType = Literal["retrieved", "ai_generated"]
SegmentSupportStatus = Literal["supported", "inference", "unsupported"]


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


class ChatAnswerSegment(BaseModel):
    text: str
    source_type: SegmentSourceType = Field(..., alias="sourceType")
    citation_handles: List[str] = Field(default_factory=list, alias="citationHandles")
    support_status: SegmentSupportStatus = Field(..., alias="supportStatus")

    model_config = ConfigDict(populate_by_name=True, from_attributes=True)


class ChatMessageCreate(BaseModel):
    text: str
    text_en: Optional[str] = Field(None, alias="textEn")
    application_id: Optional[str] = Field(None, alias="applicationId")
    lang: Optional[str] = None
    # Auto is the default conservative router; grounded/general remain explicit.
    mode: Literal["auto", "grounded", "general"] = "auto"

    model_config = ConfigDict(populate_by_name=True)


class ChatMessageResponse(BaseModel):
    id: str
    sender: str  # 'user' | 'assistant'
    text: str
    text_en: Optional[str] = Field(None, alias="textEn")
    timestamp: str
    citations: Optional[List[ChatCitation]] = Field(default_factory=list)
    suggested_action: Optional[SuggestedAction] = Field(None, alias="suggestedAction")
    answer_mode: Optional[AnswerMode] = Field(None, alias="answerMode")
    provenance: Optional[Provenance] = None
    disclaimer: Optional[str] = None
    segments: Optional[List[ChatAnswerSegment]] = None

    model_config = ConfigDict(populate_by_name=True, from_attributes=True)

    @model_validator(mode="after")
    def validate_provenance_contract(self) -> "ChatMessageResponse":
        """Reject unsafe source labels/citations at the API boundary."""

        if self.answer_mode == "general":
            if self.provenance != "ai_generated" or self.citations:
                # Older deployments persisted provider failures as ``general``
                # with unavailable provenance. Keep those histories readable
                # while preserving the fail-closed source contract.
                self.answer_mode = "insufficient_evidence"
                self.citations = []
                self.segments = []
        if self.answer_mode == "insufficient_evidence" and self.citations:
            raise ValueError("insufficient-evidence responses cannot contain citations")
        for segment in self.segments or []:
            if segment.source_type == "ai_generated" and segment.citation_handles:
                raise ValueError("AI-generated segments cannot contain citation handles")
            if segment.source_type == "retrieved" and segment.support_status == "supported" and not segment.citation_handles:
                raise ValueError("supported retrieved segments require citation handles")
        return self


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

