"""Dashboard Analytics Pydantic Schemas."""

from typing import List
from pydantic import BaseModel, ConfigDict, Field


class DashboardStats(BaseModel):
    total_applications: int = Field(..., alias="totalApplications")
    total_growth: float = Field(..., alias="totalGrowth")
    approval_rate: float = Field(..., alias="approvalRate")
    approval_growth: float = Field(..., alias="approvalGrowth")
    under_review: int = Field(..., alias="underReview")
    under_review_change: float = Field(..., alias="underReviewChange")
    suspicious_fraud: int = Field(..., alias="suspiciousFraud")
    suspicious_attention_count: int = Field(..., alias="suspiciousAttentionCount")

    model_config = ConfigDict(populate_by_name=True, from_attributes=True)


class TrendItem(BaseModel):
    day: str
    count: int


class StatusDonutItem(BaseModel):
    name: str
    name_en: str = Field(..., alias="nameEn")
    value: float
    color: str

    model_config = ConfigDict(populate_by_name=True)


class LoanTypeItem(BaseModel):
    type: str
    type_en: str = Field(..., alias="typeEn")
    count: int

    model_config = ConfigDict(populate_by_name=True)

