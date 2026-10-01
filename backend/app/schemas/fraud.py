"""Fraud Detection Pydantic Schemas."""

from typing import Optional, List
from pydantic import BaseModel, ConfigDict, Field


class FraudSignal(BaseModel):
    id: str
    title: str
    title_en: str = Field(..., alias="titleEn")
    severity: str  # 'low' | 'medium' | 'high'
    severity_label: str = Field(..., alias="severityLabel")
    severity_label_en: str = Field(..., alias="severityLabelEn")
    confidence: Optional[float] = None
    evidence: str
    evidence_en: str = Field(..., alias="evidenceEn")
    related_document: str = Field(..., alias="relatedDocument")
    related_document_en: str = Field(..., alias="relatedDocumentEn")
    timestamp: str
    recommended_action: str = Field(..., alias="recommendedAction")
    recommended_action_en: str = Field(..., alias="recommendedActionEn")
    declared_value: Optional[str] = Field(None, alias="declaredValue")
    actual_value: Optional[str] = Field(None, alias="actualValue")

    model_config = ConfigDict(populate_by_name=True, from_attributes=True)


class FraudCaseResponse(BaseModel):
    id: str
    client_name: str = Field(..., alias="clientName")
    client_name_en: str = Field(..., alias="clientNameEn")
    initial: str
    type: str
    type_en: str = Field(..., alias="typeEn")
    severity: str
    severity_label: str = Field(..., alias="severityLabel")
    severity_label_en: str = Field(..., alias="severityLabelEn")
    confidence: Optional[float] = None
    mismatch: str
    mismatch_en: str = Field(..., alias="mismatchEn")

    model_config = ConfigDict(populate_by_name=True, from_attributes=True)

