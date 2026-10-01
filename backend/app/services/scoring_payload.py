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

    # OCR can return null here, but both services declare a boolean.
    payload["is_returning_customer"] = bool(payload.get("is_returning_customer"))

    amount = float(app.requested_amount)
    tenure = int(app.tenure_months or 0)

    form_data = dict(payload.get("form_data") or {})
    form_data["is_returning_customer"] = payload["is_returning_customer"]
    form_data.update(
        {
            "requested_amount": amount,
            "tenure_months": tenure,
            "requested_annuity": round(monthly_annuity(amount, annual_rate_pct(), tenure), 2),
            "loan_purpose": app.purpose or app.loan_type or "unspecified",
            **({"mobile_phone": app.mobile_number} if app.mobile_number else {}),
        }
    )
    payload["form_data"] = form_data
    return payload
