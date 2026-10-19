"""Builds the request body sent to the fraud and credit-risk services."""

import copy
from typing import Any, Dict

from app.config import settings


def annual_rate_pct() -> float:
    """Indicative annual rate: CBE reference rate plus the bank's margin."""
    return settings.BASE_INTEREST_RATE_PCT + settings.LOAN_MARGIN_PCT


def monthly_annuity(principal: float, annual_rate_percent: float, months: int) -> float:
    """Standard declining-balance (fixed installment) monthly payment."""
    if principal <= 0 or months <= 0:
        raise ValueError("principal and months must be positive to compute an annuity")
    monthly_rate = annual_rate_percent / 100.0 / 12.0
    if monthly_rate == 0:
        return principal / months
    return principal * monthly_rate / (1.0 - (1.0 + monthly_rate) ** (-months))


def build_scoring_payload(ocr_payload: Dict[str, Any], app: Any) -> Dict[str, Any]:
    """Return a copy of the OCR payload completed with the loan request details.

    The stored OCR payload is never mutated. Values come only from the application
    record; nothing is invented (fields we do not have stay absent).
    """
    payload = copy.deepcopy(ocr_payload or {})

    # 1. Normalize boolean fields expected by fraud and credit risk services
    payload["is_returning_customer"] = bool(payload.get("is_returning_customer"))

    for doc in payload.get("documents", []):
        if doc.get("is_tampered_suspected") is None:
            doc["is_tampered_suspected"] = False

    # 2. Ensure internal history exists for new-to-bank borrowers
    if not payload.get("internal_history"):
        payload["internal_history"] = {
            "is_existing_customer": False,
            "relationship_tenure_months": 0,
            "average_historical_balance_l6m": 0.0,
            "max_dpd_historical": 0,
            "historical_bounces_l12m": 0,
            "active_internal_facilities_count": 0,
            "total_internal_limit": 0.0,
            "internal_exposure_current": 0.0,
            "historical_repayment_rate": 1.0,
        }

    amount = float(app.requested_amount)
    tenure = int(app.tenure_months or 0)

    form_data = dict(payload.get("form_data") or {})
    form_data["is_returning_customer"] = payload["is_returning_customer"]

    # Safe normalization of branch_id
    raw_branch = form_data.get("branch_id")
    try:
        branch_id_val = int(raw_branch) if raw_branch is not None else 101
    except (ValueError, TypeError):
        branch_id_val = 101

    form_data.update(
        {
            "requested_amount": amount,
            "tenure_months": tenure,
            "requested_annuity": round(monthly_annuity(amount, annual_rate_pct(), tenure), 2),
            "loan_purpose": app.purpose or app.loan_type or "unspecified",
            "branch_id": branch_id_val,
            "children_count": int(form_data.get("children_count") or 0),
            "family_members_count": int(form_data.get("family_members_count") or 1),
            "owns_car": bool(form_data.get("owns_car")),
            "owns_realty": bool(form_data.get("owns_realty")),
            **({"mobile_phone": app.mobile_number} if app.mobile_number else {}),
        }
    )
    payload["form_data"] = form_data
    return payload
