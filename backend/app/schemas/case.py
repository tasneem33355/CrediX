"""CaseCard Pydantic Schemas for Kanban Case Management."""

from typing import Optional
from pydantic import BaseModel, ConfigDict, Field


class CaseCardBase(BaseModel):
    application_id: str = Field(..., alias="applicationId")
    client_name: str = Field(..., alias="clientName")
    client_name_en: str = Field(..., alias="clientNameEn")
    initials: str
    amount: float
    currency: str = "ج.م"
    stage_tag: str = Field(..., alias="stageTag")
    stage_tag_en: str = Field(..., alias="stageTagEn")
    column_id: str = Field("processing", alias="columnId")  # 'processing' | 'human_review' | 'completed'

    model_config = ConfigDict(populate_by_name=True, from_attributes=True)


class CaseCardCreate(BaseModel):
    id: Optional[str] = None
    application_id: Optional[str] = Field(None, alias="applicationId")
    client_name: str = Field(..., alias="clientName")
    client_name_en: Optional[str] = Field(None, alias="clientNameEn")
    initials: Optional[str] = None
    amount: float
    currency: Optional[str] = "ج.م"
    stage_tag: str = Field("استخراج البيانات", alias="stageTag")
    stage_tag_en: Optional[str] = Field("Data Extraction", alias="stageTagEn")
    column_id: Optional[str] = Field("processing", alias="columnId")

    model_config = ConfigDict(populate_by_name=True)


class CaseCardUpdate(BaseModel):
    column_id: Optional[str] = Field(None, alias="columnId")
    stage_tag: Optional[str] = Field(None, alias="stageTag")
    stage_tag_en: Optional[str] = Field(None, alias="stageTagEn")

    model_config = ConfigDict(populate_by_name=True)


class CaseCardResponse(CaseCardBase):
    id: str

