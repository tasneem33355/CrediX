"""LoanApplication Pydantic Schemas matching frontend/src/types/index.ts."""

from typing import Optional, List, Dict, Any, Literal
from pydantic import BaseModel, ConfigDict, Field, field_validator
from app.schemas.document import DocumentResponse
from app.schemas.timeline import TimelineEventResponse, UTCDatetime
from app.schemas.fraud import FraudSignal


class ExtractedDataField(BaseModel):
    label: str
    label_en: str = Field(..., alias="labelEn")
    value: str
    confidence: float

    model_config = ConfigDict(populate_by_name=True, from_attributes=True)


class BankStatementSummary(BaseModel):
    total_deposits: float = Field(0, alias="totalDeposits")
    monthly_average: float = Field(0, alias="monthlyAverage")
    total_transactions: int = Field(0, alias="totalTransactions")
    average_balance: float = Field(0, alias="averageBalance")
    period_months: int = Field(3, alias="periodMonths")

    model_config = ConfigDict(populate_by_name=True, from_attributes=True)


class CreditScoreFactor(BaseModel):
    id: str
    name: str
    name_en: str = Field(..., alias="nameEn")
    percentage: float
    rating: str  # 'good' | 'medium' | 'weak'
    rating_label: str = Field(..., alias="ratingLabel")
    rating_label_en: str = Field(..., alias="ratingLabelEn")

    model_config = ConfigDict(populate_by_name=True, from_attributes=True)


class PipelineStep(BaseModel):
    id: str
    label: str
    label_en: str = Field(..., alias="labelEn")
    status: str  # 'completed' | 'current' | 'pending'

    model_config = ConfigDict(populate_by_name=True, from_attributes=True)


class RecommendationReason(BaseModel):
    ar: str
    en: str


class LoanApplicationBase(BaseModel):
    applicant_name: str = Field(..., alias="applicantName")
    applicant_name_en: Optional[str] = Field(None, alias="applicantNameEn")
    national_id: str = Field(..., alias="nationalId")
    mobile_number: str = Field(..., alias="mobileNumber")
    client_type: str = Field("current", alias="clientType")  # 'current' | 'new'
    occupation: Optional[str] = "موظف"
    occupation_en: Optional[str] = Field("Employee", alias="occupationEn")
    loan_type: str = Field("personal", alias="loanType")  # 'personal' | 'sme' | 'auto' | 'mortgage'
    loan_type_label: Optional[str] = Field("تمويل شخصي", alias="loanTypeLabel")
    loan_type_label_en: Optional[str] = Field("Personal Financing", alias="loanTypeLabelEn")
    requested_amount: float = Field(..., alias="requestedAmount")
    currency: str = "ج.م"
    tenure_months: int = Field(36, alias="tenureMonths")
    purpose: Optional[str] = None
    date: Optional[str] = "الآن"
    last_updated: Optional[str] = Field("الآن", alias="lastUpdated")
    status: str = "under_review"  # 'under_review' | 'approved' | 'suspicious' | 'rejected'

    # Explainable AI Recommendation (placeholders with sensible defaults)
    ai_recommendation: Optional[str] = Field("manual_review", alias="aiRecommendation")
    ai_recommendation_label: Optional[str] = Field("مراجعة بشرية", alias="aiRecommendationLabel")
    ai_recommendation_label_en: Optional[str] = Field("Manual Review", alias="aiRecommendationLabelEn")
    ai_confidence: Optional[float] = Field(85.0, alias="aiConfidence")
    recommendation_reasons: Optional[List[RecommendationReason]] = Field(default_factory=list, alias="recommendationReasons")

    # Processing Pipeline
    pipeline_completed_steps: int = Field(1, alias="pipelineCompletedSteps")
    pipeline_total_steps: int = Field(5, alias="pipelineTotalSteps")
    pipeline_steps: Optional[List[PipelineStep]] = Field(default_factory=list, alias="pipelineSteps")

    # Extracted Data (OCR)
    ocr_accuracy: Optional[float] = Field(95.0, alias="ocrAccuracy")
    extracted_from_doc_count: int = Field(0, alias="extractedFromDocCount")
    extracted_fields: Optional[List[ExtractedDataField]] = Field(default_factory=list, alias="extractedFields")
    bank_summary: Optional[BankStatementSummary] = Field(default_factory=BankStatementSummary, alias="bankSummary")

    # Credit Assessment
    credit_score: Optional[int] = Field(70, alias="creditScore")
    credit_risk_category: Optional[str] = Field("medium", alias="creditRiskCategory")
    credit_risk_label: Optional[str] = Field("مخاطر متوسطة", alias="creditRiskLabel")
    credit_risk_label_en: Optional[str] = Field("Medium Risk", alias="creditRiskLabelEn")
    calculated_factors_count: int = Field(0, alias="calculatedFactorsCount")
    credit_factors: Optional[List[CreditScoreFactor]] = Field(default_factory=list, alias="creditFactors")

    # Fraud Detection
    fraud_risk_score: Optional[int] = Field(20, alias="fraudRiskScore")
    fraud_risk_category: Optional[str] = Field("low", alias="fraudRiskCategory")
    fraud_risk_label: Optional[str] = Field("مخاطر منخفضة", alias="fraudRiskLabel")
    fraud_risk_label_en: Optional[str] = Field("Low Risk", alias="fraudRiskLabelEn")
    analyzed_signals_count: int = Field(0, alias="analyzedSignalsCount")
    fraud_signals: Optional[List[FraudSignal]] = Field(default_factory=list, alias="fraudSignals")

    model_config = ConfigDict(populate_by_name=True, from_attributes=True)


class LoanApplicationCreate(BaseModel):
    id: Optional[str] = None
    applicant_name: str = Field(..., alias="applicantName")
    applicant_name_en: Optional[str] = Field(None, alias="applicantNameEn")
    national_id: str = Field(..., alias="nationalId")
    mobile_number: str = Field(..., alias="mobileNumber")
    client_type: Optional[str] = Field("current", alias="clientType")
    occupation: Optional[str] = "أعمال حرة"
    occupation_en: Optional[str] = Field("Business Owner", alias="occupationEn")
    loan_type: str = Field("personal", alias="loanType")
    loan_type_label: Optional[str] = Field(None, alias="loanTypeLabel")
    loan_type_label_en: Optional[str] = Field(None, alias="loanTypeLabelEn")
    requested_amount: float = Field(..., gt=0, le=1_000_000_000, alias="requestedAmount")
    currency: Optional[str] = "ج.م"
    tenure_months: Optional[int] = Field(36, ge=1, le=480, alias="tenureMonths")
    purpose: Optional[str] = None

    model_config = ConfigDict(populate_by_name=True)

    @field_validator("national_id")
    @classmethod
    def _national_id_is_14_digits(cls, value: str) -> str:
        value = value.strip()
        if not (value.isascii() and value.isdigit() and len(value) == 14):
            raise ValueError("national ID must be exactly 14 digits")
        return value

    @field_validator("mobile_number")
    @classmethod
    def _mobile_is_egyptian(cls, value: str) -> str:
        value = value.strip()
        if not (value.isascii() and value.isdigit() and len(value) == 11 and value[:3] in {"010", "011", "012", "015"}):
            raise ValueError("mobile number must be an 11-digit Egyptian mobile (010/011/012/015)")
        return value


class LoanApplicationUpdate(BaseModel):
    """Officer-editable details only. Status/scores are NOT editable here:
    status goes through the audited /decision endpoint, scores come from model runs."""

    applicant_name: Optional[str] = Field(None, alias="applicantName")
    requested_amount: Optional[float] = Field(None, gt=0, le=1_000_000_000, alias="requestedAmount")
    occupation: Optional[str] = None
    purpose: Optional[str] = None

    model_config = ConfigDict(populate_by_name=True, extra="forbid")


class OfficerDecisionRequest(BaseModel):
    decision: Literal["approve", "reject", "manual"]
    notes: Optional[str] = None


class DecisionAuditResponse(BaseModel):
    id: str
    application_id: str = Field(..., alias="applicationId")
    action: str
    decision: Optional[str] = None
    previous_status: Optional[str] = Field(None, alias="previousStatus")
    new_status: Optional[str] = Field(None, alias="newStatus")
    actor_user_id: Optional[str] = Field(None, alias="actorUserId")
    actor_name: Optional[str] = Field(None, alias="actorName")
    notes: Optional[str] = None
    snapshot: Optional[Dict[str, Any]] = None
    created_at: UTCDatetime = Field(..., alias="createdAt")

    model_config = ConfigDict(populate_by_name=True, from_attributes=True)


class LoanApplicationResponse(LoanApplicationBase):
    id: str
    submitted_at: Optional[UTCDatetime] = Field(None, alias="submittedAt")
    updated_at: Optional[UTCDatetime] = Field(None, alias="updatedAt")
    final_decision: Optional[str] = Field(None, alias="finalDecision")
    decided_by: Optional[str] = Field(None, alias="decidedBy")
    decided_at: Optional[UTCDatetime] = Field(None, alias="decidedAt")
    decision_notes: Optional[str] = Field(None, alias="decisionNotes")
    documents: List[DocumentResponse] = []
    timeline: List[TimelineEventResponse] = []


class LoanApplicationListResponse(BaseModel):
    total: int
    items: List[LoanApplicationResponse]

