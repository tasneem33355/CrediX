"""Pydantic schemas for OCR Ingestion, Validation, and Scoring."""

from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class OCRSubmissionRequest(BaseModel):
    """Payload containing OCR JSON and loan configuration."""
    ocr_data: Dict[str, Any] = Field(..., description="Full OCR JSON response from document extraction")
    loan_type: Optional[str] = Field("personal", description="personal, sme, auto, mortgage")
    requested_amount: Optional[float] = Field(100000.0, gt=0, description="Requested financing amount in EGP")
    tenure_months: Optional[int] = Field(36, ge=1, le=480, description="Tenure in months")
    purpose: Optional[str] = Field(None, description="Financing purpose")


class OCRIngestResponse(BaseModel):
    """Response returned upon ingesting and validating OCR data."""
    application_id: str
    is_consistent: bool
    applicant_name: str
    national_id: str
    status: str
    warnings: List[Dict[str, Any]]
    extraction_id: str


class FullPipelineScoreResponse(BaseModel):
    """Response after end-to-end execution of scoring pipeline."""
    application_id: str
    customer_name: str
    national_id: str
    credit_risk: Dict[str, Any]
    fraud: Dict[str, Any]
    explanation: Dict[str, Any]
    validation_warnings: List[Dict[str, Any]]
