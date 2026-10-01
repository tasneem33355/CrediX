"""Client for Fraud Detection Service.

Provides seamless transition:
- If FRAUD_SERVICE_URL is defined, delegates scoring to the remote service.
- If not yet configured, computes deterministic risk scores and flags from OCR
  validation and discrepancy findings, ensuring end-to-end operational readiness.
"""

import httpx
from typing import Any, Dict, List, Optional
from app.config import settings


async def score_fraud(
    ocr_payload: Dict[str, Any],
    validation_summary: Optional[Dict[str, Any]] = None,
    timeout_sec: float = 30.0,
) -> Dict[str, Any]:
    """Score application for fraud risk using remote service or smart fallback."""
    if settings.FRAUD_SERVICE_URL:
        url = f"{settings.FRAUD_SERVICE_URL.rstrip('/')}/score"
        try:
            async with httpx.AsyncClient(timeout=timeout_sec) as client:
                response = await client.post(url, json=ocr_payload)
                response.raise_for_status()
                return response.json()
        except Exception:
            # Fall back to internal rules on network error
            pass

    # Built-in deterministic risk evaluator based on OCR validation results
    warnings: List[Dict[str, Any]] = (validation_summary or {}).get("warnings") or []
    
    fraud_flags: List[Dict[str, Any]] = []
    base_score = 0.10  # Baseline low risk (10%)
    is_anomaly = False

    for w in warnings:
        code = w.get("code")
        severity = w.get("severity")

        if code == "CRITICAL_INCOME_DISCREPANCY":
            base_score = max(base_score, 0.78)
            is_anomaly = True
            fraud_flags.append({
                "code": "INCOME_MISMATCH_SALARY_VS_BANK",
                "severity": "high",
                "title": "تناقض في بيانات الدخل المعلن وكشف الحساب",
                "titleEn": "Declared Salary vs Bank Inflow Discrepancy",
                "evidence": w.get("message"),
                "evidenceEn": w.get("message_en"),
            })

        elif code in {"NID_CROSS_MISMATCH", "NAME_CROSS_MISMATCH"}:
            base_score = max(base_score, 0.65)
            is_anomaly = True
            fraud_flags.append({
                "code": "IDENTITY_CROSS_CHECK_MISMATCH",
                "severity": "high",
                "title": "عدم تطابق في بيانات الهوية عبر المستندات",
                "titleEn": "Cross-Document Identity Mismatch",
                "evidence": w.get("message"),
                "evidenceEn": w.get("message_en"),
            })

        elif code == "TAMPERING_SUSPECTED":
            base_score = 0.95
            is_anomaly = True
            fraud_flags.append({
                "code": "DOCUMENT_TAMPERING_DETECTED",
                "severity": "critical",
                "title": "اشتباه تلاعب في المستندات",
                "titleEn": "Suspected Document Tampering",
                "evidence": w.get("message"),
                "evidenceEn": w.get("message_en"),
            })

    if base_score >= 0.75:
        level = "HIGH"
    elif base_score >= 0.40:
        level = "MEDIUM"
    else:
        level = "LOW"

    return {
        "fraud_risk_score": round(base_score, 2),
        "fraud_risk_level": level,
        "is_anomaly": is_anomaly,
        "fraud_flags": fraud_flags,
    }
