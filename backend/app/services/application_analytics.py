"""Risk & scenario analytics for one application, computed from stored data only.

Nothing here is invented: PD and risk tier come from the credit-risk model run,
income comes from the extracted documents, the rate comes from config, and the
bureau table is the I-Score report exactly as the OCR extracted it.
"""

from typing import Any, Dict, List, Optional

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.config import settings
from app.models.application import ExtractionResult, LoanApplication, ModelRun
from app.models.portfolio import DecisionAuditLog
from app.services.scoring_payload import annual_rate_pct, monthly_annuity

RATE_SHOCKS_BPS = (0, 100, 200, 300)


def _val(section: Dict[str, Any], key: str) -> Any:
    raw = (section or {}).get(key)
    return raw.get("value") if isinstance(raw, dict) else raw


def _num(v: Any) -> Optional[float]:
    try:
        return float(v) if v is not None else None
    except (TypeError, ValueError):
        return None


def _pct(numerator: float, income: Optional[float]) -> Optional[float]:
    return round(numerator / income * 100, 1) if income and income > 0 else None


def build_analytics(
    *,
    requested_amount: float,
    tenure_months: int,
    base_rate_pct: float,
    lgd: float,
    payload: Dict[str, Any],
    credit_output: Optional[Dict[str, Any]],
    portfolio_avg_pd: Optional[float],
) -> Dict[str, Any]:
    salary = _num(_val(payload.get("salary_certificate_fields"), "declared_net_salary"))
    inflow = _num(_val(payload.get("bank_statement_fields"), "avg_monthly_net_inflow"))

    installment = None
    scenarios: List[Dict[str, Any]] = []
    if requested_amount > 0 and tenure_months > 0:
        installment = round(monthly_annuity(requested_amount, base_rate_pct, tenure_months), 2)
        for bps in RATE_SHOCKS_BPS:
            rate = base_rate_pct + bps / 100
            value = round(monthly_annuity(requested_amount, rate, tenure_months), 2)
            scenarios.append({
                "bps": bps,
                "rate_pct": round(rate, 2),
                "installment": value,
                "delta": round(value - installment, 2),
            })

    pd_value = _num((credit_output or {}).get("default_probability"))
    expected_loss = round(requested_amount * pd_value * lgd, 2) if pd_value is not None else None

    iscore = payload.get("iscore_report_fields") or {}
    facilities = [
        {
            "facility_type": f.get("facility_type"),
            "lender_name": f.get("lender_name"),
            "granted_amount": _num(f.get("granted_amount")),
            "outstanding_amount": _num(f.get("outstanding_amount")),
            "installment_amount": _num(f.get("installment_amount")),
            "status": f.get("status"),
            "overdue_days": _num(f.get("overdue_days")),
            "overdue_amount": _num(f.get("overdue_amount")),
            "legal_action_flag": bool(f.get("legal_action_flag")),
        }
        for f in (iscore.get("bureau_facilities") or [])
        if isinstance(f, dict)
    ]

    return {
        "has_scoring": credit_output is not None,
        "pd": pd_value,
        "portfolio_avg_pd": portfolio_avg_pd,
        "lgd": lgd,
        "expected_loss": expected_loss,
        "risk_tier": (credit_output or {}).get("risk_tier"),
        "decision": (credit_output or {}).get("decision"),
        "annual_rate_pct": round(base_rate_pct, 2),
        "monthly_installment": installment,
        "declared_salary": salary,
        "verified_inflow": inflow,
        "dbr_declared": _pct(installment, salary) if installment else None,
        "dbr_verified": _pct(installment, inflow) if installment else None,
        "rate_scenarios": scenarios,
        "bureau": {
            "total_outstanding": _num(_val(iscore, "total_outstanding_balance")),
            "total_overdue": _num(_val(iscore, "total_overdue_amount")),
            "max_days_past_due": _num(_val(iscore, "max_days_past_due")),
            "active_cards": _num(_val(iscore, "active_credit_cards_count")),
            "facilities": facilities,
        },
    }


def get_application_analytics(db: Session, app: LoanApplication) -> Dict[str, Any]:
    extraction = (
        db.query(ExtractionResult)
        .filter(ExtractionResult.application_id == app.id)
        .order_by(ExtractionResult.created_at.desc())
        .first()
    )
    payload = extraction.payload if extraction is not None and isinstance(extraction.payload, dict) else {}

    run = (
        db.query(ModelRun)
        .filter(ModelRun.application_id == app.id, ModelRun.kind == "pd", ModelRun.status == "success")
        .order_by(ModelRun.created_at.desc())
        .first()
    )
    credit_output = run.output if run is not None and isinstance(run.output, dict) else None

    avg_pd = db.query(func.avg(DecisionAuditLog.default_probability)).scalar()

    return build_analytics(
        requested_amount=float(app.requested_amount or 0),
        tenure_months=int(app.tenure_months or 0),
        base_rate_pct=annual_rate_pct(),
        lgd=settings.STRESS_BASE_LGD,
        payload=payload,
        credit_output=credit_output,
        portfolio_avg_pd=round(float(avg_pd), 4) if avg_pd is not None else None,
    )
