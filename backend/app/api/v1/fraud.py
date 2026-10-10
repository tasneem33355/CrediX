"""Fraud Detection API Router."""

from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.auth.dependencies import require_officer
from app.database import get_db
from app.crud.crud_application import get_applications
from app.schemas.fraud import FraudCaseResponse, FraudSignal

# Officer-only: every route on this router requires an authenticated credit officer.
router = APIRouter(prefix="/fraud", tags=["Fraud Detection"], dependencies=[Depends(require_officer)])

SEVERITY_LABELS = {
    "low": ("منخفض", "Low"),
    "medium": ("متوسط", "Medium"),
    "high": ("مرتفع", "High"),
    "critical": ("حرج", "Critical"),
}

@router.get("/cases", response_model=List[FraudCaseResponse])
def get_fraud_cases(db: Session = Depends(get_db)):
    """Retrieve applications flagged with fraud risk requiring officer attention."""
    apps, _ = get_applications(db, limit=50)
    
    # Filter apps with fraud risk score > 25 or status == 'suspicious' or having fraud signals
    flagged_cases = []
    for app in apps:
        if (app.fraud_risk_score and app.fraud_risk_score >= 30) or app.status == "suspicious" or (app.fraud_signals and len(app.fraud_signals) > 0):
            mismatch_ar = "تم تصنيف الطلب بدرجة خطر احتيال مرتفعة من نموذج الكشف"
            mismatch_en = "Flagged by the fraud model's risk score"
            if app.fraud_signals and len(app.fraud_signals) > 0:
                first_sig = app.fraud_signals[0]
                mismatch_ar = first_sig.get("evidence") or first_sig.get("title") or mismatch_ar
                mismatch_en = first_sig.get("evidenceEn") or first_sig.get("titleEn") or mismatch_en

            # Severity comes from the fraud model once scored; before scoring, a
            # suspicious status (set by deterministic validation) is shown as high.
            severity = app.fraud_risk_category or ("high" if app.status == "suspicious" else "medium")
            label_ar, label_en = SEVERITY_LABELS.get(severity, SEVERITY_LABELS["medium"])

            flagged_cases.append(
                FraudCaseResponse(
                    id=app.id,
                    clientName=app.applicant_name,
                    clientNameEn=app.applicant_name_en or app.applicant_name,
                    initial=app.applicant_name[:1] if app.applicant_name else "ع",
                    type=app.loan_type_label or "تمويل شخصي",
                    typeEn=app.loan_type_label_en or "Personal Financing",
                    severity=severity,
                    severityLabel=app.fraud_risk_label or label_ar,
                    severityLabelEn=app.fraud_risk_label_en or label_en,
                    confidence=float(app.fraud_risk_score) if app.fraud_risk_score is not None else None,
                    mismatch=mismatch_ar,
                    mismatchEn=mismatch_en,
                )
            )

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
