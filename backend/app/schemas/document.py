"""Document Pydantic Schemas."""

from typing import Optional, Dict, Any
from pydantic import BaseModel, ConfigDict, Field


class DocumentBase(BaseModel):
    code: str = "DOC"
    name: str
    name_en: str = Field(..., alias="nameEn")
    size: str = "2.0 MB"
    upload_date: str = Field("الآن", alias="uploadDate")
    status: str = "processing"  # 'success' | 'processing' | 'failed'
    status_label: str = Field("قيد المعالجة", alias="statusLabel")
    status_label_en: str = Field("Processing", alias="statusLabelEn")
    file_url: Optional[str] = Field(None, alias="fileUrl")
    extracted_data: Optional[Dict[str, Any]] = Field(default_factory=dict, alias="extractedData")

    model_config = ConfigDict(populate_by_name=True, from_attributes=True)


class DocumentCreate(DocumentBase):
    id: Optional[str] = None
    application_id: Optional[str] = Field(None, alias="applicationId")


class DocumentResponse(DocumentBase):
    id: str
    application_id: Optional[str] = Field(None, alias="applicationId")

