"""TimelineEvent Pydantic Schemas."""

from typing import Optional
from pydantic import BaseModel, ConfigDict, Field


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

