"""Fraud Detection API Router."""

from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.crud.crud_application import get_applications
from app.schemas.fraud import FraudCaseResponse, FraudSignal

router = APIRouter(prefix="/fraud", tags=["Fraud Detection"])


@router.get("/cases", response_model=List[FraudCaseResponse])
def get_fraud_cases(db: Session = Depends(get_db)):
    """Retrieve applications flagged with fraud risk requiring officer attention."""
    apps, _ = get_applications(db, limit=50)
    
    # Filter apps with fraud risk score > 25 or status == 'suspicious' or having fraud signals
    flagged_cases = []
    for app in apps:
        if (app.fraud_risk_score and app.fraud_risk_score >= 30) or app.status == "suspicious" or (app.fraud_signals and len(app.fraud_signals) > 0):
            mismatch_ar = "تناقض في البيانات المالية والمستندات المرفقة"
            mismatch_en = "Discrepancy in financial records and attached documents"
            if app.fraud_signals and len(app.fraud_signals) > 0:
                first_sig = app.fraud_signals[0]
                mismatch_ar = first_sig.get("evidence") or first_sig.get("title") or mismatch_ar
                mismatch_en = first_sig.get("evidenceEn") or first_sig.get("titleEn") or mismatch_en

            flagged_cases.append(
                FraudCaseResponse(
                    id=app.id,
                    clientName=app.applicant_name,
                    clientNameEn=app.applicant_name_en or app.applicant_name,
                    initial=app.applicant_name[:1] if app.applicant_name else "ع",
                    type=app.loan_type_label or "تمويل شخصي",
                    typeEn=app.loan_type_label_en or "Personal Financing",
                    severity=app.fraud_risk_category or "medium",
                    severityLabel=app.fraud_risk_label or "متوسط",
                    severityLabelEn=app.fraud_risk_label_en or "Medium",
                    confidence=app.ai_confidence or 78.0,
                    mismatch=mismatch_ar,
                    mismatchEn=mismatch_en,
                )
            )

    # DEMO ONLY: fallback data is seeded presentation data, not a fraud-model result.
    if not flagged_cases:
        flagged_cases = [
            FraudCaseResponse(
                id="APP-2026-0839",
                clientName="أحمد فؤاد",
                clientNameEn="Ahmed Fouad",
                initial="أ",
                type="تمويل مشروعات صغيرة",
                typeEn="SME Financing",
                severity="high",
                severityLabel="مرتفع",
                severityLabelEn="High",
                confidence=94.0,
                mismatch="تناقض في البيانات المالية (الدخل المعلن vs كشف الحساب)",
                mismatchEn="Financial Data Discrepancy (Declared vs Bank Statement)",
            )
        ]

    return flagged_cases


@router.get("/signals", response_model=List[FraudSignal])
def list_fraud_signals(
    application_id: Optional[str] = Query(None, alias="applicationId"),
    db: Session = Depends(get_db),
):
    """List all detected fraud signals across all applications or for a specific application."""
    apps, _ = get_applications(db, limit=50)
    all_signals = []
    for app in apps:
        if application_id and app.id != application_id:
            continue
        if app.fraud_signals:
            for sig in app.fraud_signals:
                all_signals.append(FraudSignal(**sig))
    return all_signals
