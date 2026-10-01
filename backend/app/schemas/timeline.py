"""TimelineEvent Pydantic Schemas."""

from datetime import datetime, timezone
from typing import Annotated, Optional
from pydantic import AfterValidator, BaseModel, ConfigDict, Field


def _as_utc(value: datetime) -> datetime:
    """DB timestamps are naive UTC; always serialize them as UTC-aware ISO."""
    return value if value.tzinfo else value.replace(tzinfo=timezone.utc)


UTCDatetime = Annotated[datetime, AfterValidator(_as_utc)]


class TimelineEventBase(BaseModel):
    title: str
    title_en: str = Field(..., alias="titleEn")
    timestamp: str
    description: str
    description_en: str = Field(..., alias="descriptionEn")
    status: str = "completed"  # 'completed' | 'current' | 'pending'
    icon_type: str = Field("receipt", alias="iconType")  # 'receipt' | 'ocr' | 'score' | 'fraud' | 'review'

    model_config = ConfigDict(populate_by_name=True, from_attributes=True)


class TimelineEventCreate(TimelineEventBase):
    id: Optional[str] = None
    application_id: Optional[str] = Field(None, alias="applicationId")


class TimelineEventResponse(TimelineEventBase):
    id: str
    application_id: Optional[str] = Field(None, alias="applicationId")
    created_at: Optional[UTCDatetime] = Field(None, alias="createdAt")

