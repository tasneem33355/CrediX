"""Portfolio analytics API, computed from the bank's own database.

Reads two tables:
  * loan_facilities      - granted loans/cards (core-banking portfolio)
  * decision_audit_logs  - one row per scored application (written by the scoring pipeline)

Nothing here is hardcoded: when there is no data the endpoints say so instead of inventing numbers.
"""

from bisect import bisect_right
from math import log
from typing import Dict, List, Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.auth.dependencies import require_officer
from app.config import settings
from app.database import get_db
from app.models.portfolio import DecisionAuditLog, LoanFacility

router = APIRouter(prefix="/portfolio", tags=["Portfolio Analytics"], dependencies=[Depends(require_officer)])

CLOSED = "CLOSED_PAID_OFF"
NPL = "DEFAULTED_NPL"
PRODUCTS = ["CASH_LOAN", "CAR_LOAN", "CREDIT_CARD", "SME_LOAN", "MORTGAGE"]
STATUSES = ["ACTIVE_PERFORMING", "RESTRUCTURED", "DEFAULTED_NPL", "CLOSED_PAID_OFF"]

# Drift: compare the older half of scored decisions against the newer half.
DRIFT_MIN_DECISIONS = 30
DRIFT_FEATURES = ["dti_ratio", "credit_score", "default_probability", "requested_amount", "fraud_risk_score"]
PSI_MONITOR = 0.10
PSI_CRITICAL = 0.25

RATE_HIKE_STEPS_BPS = [0, 100, 200, 300, 500, 750]


def _f(value) -> float:
    return float(value) if value is not None else 0.0


def _active_filter():
    return LoanFacility.facility_status != CLOSED


def _portfolio_totals(db: Session) -> Dict:
    """Active book: every facility that is not closed. NPL ratio is by granted amount."""
    count, volume = db.query(func.count(LoanFacility.facility_id), func.coalesce(func.sum(LoanFacility.granted_amount), 0)).filter(_active_filter()).one()
    npl_count, npl_volume = (
        db.query(func.count(LoanFacility.facility_id), func.coalesce(func.sum(LoanFacility.granted_amount), 0))
        .filter(LoanFacility.facility_status == NPL)
        .one()
    )
    demo_count = db.query(func.count(LoanFacility.facility_id)).filter(_active_filter(), LoanFacility.is_demo.is_(True)).scalar() or 0
    volume, npl_volume = _f(volume), _f(npl_volume)
    return {
        "count": int(count),
        "volume": volume,
        "npl_count": int(npl_count),
        "npl_volume": npl_volume,
        "demo_count": int(demo_count),
    }


@router.get("/kpis")
def portfolio_kpis(db: Session = Depends(get_db)):
    t = _portfolio_totals(db)
    count = t["count"]
    return {
        "total_loans_count": count,
        "total_portfolio_volume": round(t["volume"], 2),
        "average_loan_size": round(t["volume"] / count, 2) if count else 0.0,
        "npl_ratio": round(t["npl_volume"] / t["volume"], 4) if t["volume"] else 0.0,
        "performing_loans_count": count - t["npl_count"],
        "npl_loans_count": t["npl_count"],
        "has_data": count > 0,
        "includes_demo_data": t["demo_count"] > 0,
    }


@router.get("/concentration")
def portfolio_concentration(db: Session = Depends(get_db)):
    by_product = {p: 0 for p in PRODUCTS}
    by_product_volume = {p: 0.0 for p in PRODUCTS}
    for ctype, n, vol in (
        db.query(LoanFacility.contract_type, func.count(LoanFacility.facility_id), func.coalesce(func.sum(LoanFacility.granted_amount), 0))
        .filter(_active_filter())
        .group_by(LoanFacility.contract_type)
        .all()
    ):
        by_product[ctype] = int(n)
        by_product_volume[ctype] = round(_f(vol), 2)

    by_status = {s: 0 for s in STATUSES}
    for status, n in db.query(LoanFacility.facility_status, func.count(LoanFacility.facility_id)).group_by(LoanFacility.facility_status).all():
        by_status[status] = int(n)

    return {"by_product": by_product, "by_product_volume": by_product_volume, "by_status": by_status}


@router.get("/scored-kpis")
def scored_kpis(db: Session = Depends(get_db)):
    total = db.query(func.count(DecisionAuditLog.decision_id)).scalar() or 0
    if total == 0:
        return {
            "has_data": False,
            "total_decisions": 0,
            "by_decision": {},
            "by_fraud_level": {},
            "anomalies_count": 0,
            "avg_credit_score": None,
            "avg_default_probability": None,
            "avg_dti_ratio": None,
        }
    avg_score, avg_pd, avg_dti = db.query(
        func.avg(DecisionAuditLog.credit_score),
        func.avg(DecisionAuditLog.default_probability),
        func.avg(DecisionAuditLog.dti_ratio),
    ).one()
    by_decision = {
        (d or "UNKNOWN"): int(n)
        for d, n in db.query(DecisionAuditLog.final_decision, func.count(DecisionAuditLog.decision_id)).group_by(DecisionAuditLog.final_decision).all()
    }
    by_level = {
        (lvl or "UNKNOWN"): int(n)
        for lvl, n in db.query(DecisionAuditLog.fraud_risk_level, func.count(DecisionAuditLog.decision_id)).group_by(DecisionAuditLog.fraud_risk_level).all()
    }
    anomalies = db.query(func.count(DecisionAuditLog.decision_id)).filter(DecisionAuditLog.is_anomaly.is_(True)).scalar() or 0
    return {
        "has_data": True,
        "total_decisions": int(total),
        "by_decision": by_decision,
        "by_fraud_level": by_level,
        "anomalies_count": int(anomalies),
        "avg_credit_score": round(float(avg_score), 1) if avg_score is not None else None,
        "avg_default_probability": round(float(avg_pd), 4) if avg_pd is not None else None,
        "avg_dti_ratio": round(float(avg_dti), 4) if avg_dti is not None else None,
    }


def population_stability_index(baseline: List[float], current: List[float], bins: int = 10) -> float:
    """PSI of `current` against `baseline`, using baseline quantiles as bin edges."""
    if not baseline or not current:
        return 0.0
    ordered = sorted(baseline)
    edges = sorted({ordered[min(len(ordered) - 1, int(len(ordered) * i / bins))] for i in range(1, bins)})

    def shares(values: List[float]) -> List[float]:
        counts = [0] * (len(edges) + 1)
        for v in values:
            counts[bisect_right(edges, v)] += 1
        total = len(values)
        return [max(c / total, 1e-4) for c in counts]

    base_share, curr_share = shares(baseline), shares(current)
    return sum((c - b) * log(c / b) for b, c in zip(base_share, curr_share))


@router.get("/drift")
def model_drift(db: Session = Depends(get_db)):
    rows = db.query(DecisionAuditLog).order_by(DecisionAuditLog.created_at.asc()).all()
    if len(rows) < DRIFT_MIN_DECISIONS:
        return {
            "has_enough_data": False,
            "system_health": "INSUFFICIENT_DATA",
            "retraining_recommended": False,
            "max_psi_feature": None,
            "max_psi_score": None,
            "features_psi": {},
            "decisions_analyzed": len(rows),
            "min_decisions_required": DRIFT_MIN_DECISIONS,
            "cbe_audit_comment": (
                f"At least {DRIFT_MIN_DECISIONS} scored decisions are required to measure drift; "
                f"{len(rows)} recorded so far."
            ),
        }

    half = len(rows) // 2
    older, newer = rows[:half], rows[half:]
    features_psi: Dict[str, float] = {}
    for feat in DRIFT_FEATURES:
        base = [float(getattr(r, feat)) for r in older if getattr(r, feat) is not None]
        curr = [float(getattr(r, feat)) for r in newer if getattr(r, feat) is not None]
        if len(base) >= 5 and len(curr) >= 5:
            features_psi[feat] = round(population_stability_index(base, curr), 4)

    if not features_psi:
        return {
            "has_enough_data": False,
            "system_health": "INSUFFICIENT_DATA",
            "retraining_recommended": False,
            "max_psi_feature": None,
            "max_psi_score": None,
            "features_psi": {},
            "decisions_analyzed": len(rows),
            "min_decisions_required": DRIFT_MIN_DECISIONS,
            "cbe_audit_comment": "Scored decisions do not carry enough populated features to measure drift.",
        }

    max_feature = max(features_psi, key=features_psi.get)
    max_psi = features_psi[max_feature]
    if max_psi >= PSI_CRITICAL:
        health, comment = "CRITICAL", "Significant population shift detected; model retraining is recommended."
    elif max_psi >= PSI_MONITOR:
        health, comment = "MONITOR", "Moderate population shift detected; keep the model under close monitoring."
    else:
        health, comment = "HEALTHY", "Feature distributions are stable against the baseline period."
    return {
        "has_enough_data": True,
        "system_health": health,
        "retraining_recommended": max_psi >= PSI_CRITICAL,
        "max_psi_feature": max_feature,
        "max_psi_score": max_psi,
        "features_psi": features_psi,
        "decisions_analyzed": len(rows),
        "min_decisions_required": DRIFT_MIN_DECISIONS,
        "cbe_audit_comment": comment,
    }


class StressRequest(BaseModel):
    scenario_name: str = "Macro Stress Scenario"
    pd_multiplier: float = Field(2.0, gt=0, le=10)
    lgd_multiplier: float = Field(1.3, gt=0, le=5)


@router.post("/stress-test")
def stress_test(body: StressRequest, db: Session = Depends(get_db)):
    """Expected credit loss = exposure x PD x LGD, before and after the stress multipliers."""
    totals = _portfolio_totals(db)
    exposure = totals["volume"]
    if exposure <= 0:
        return {"has_data": False, "scenario_name": body.scenario_name, "scenario_results": None, "sensitivity_curve": []}

    avg_pd = db.query(func.avg(DecisionAuditLog.default_probability)).scalar()
    if avg_pd is not None:
        baseline_pd, pd_source = float(avg_pd), "average model PD of scored applications"
    else:
        baseline_pd, pd_source = totals["npl_volume"] / exposure, "observed NPL ratio of the portfolio"

    base_lgd = settings.STRESS_BASE_LGD
    stressed_pd = min(1.0, baseline_pd * body.pd_multiplier)
    stressed_lgd = min(1.0, base_lgd * body.lgd_multiplier)
    baseline_ecl = exposure * baseline_pd * base_lgd
    stressed_ecl = exposure * stressed_pd * stressed_lgd

    sens = settings.STRESS_PD_SENSITIVITY_PER_100BPS
    curve = []
    for bps in RATE_HIKE_STEPS_BPS:
        pd_h = min(1.0, stressed_pd * (1 + sens * bps / 100))
        curve.append({"rate_hike_bps": bps, "stressed_pd": round(pd_h, 4), "stressed_ecl": round(exposure * pd_h * stressed_lgd, 2)})

    return {
        "has_data": True,
        "scenario_name": body.scenario_name,
        "scenario_results": {
            "portfolio_exposure": round(exposure, 2),
            "baseline_pd": round(baseline_pd, 4),
            "baseline_ecl": round(baseline_ecl, 2),
            "stressed_pd": round(stressed_pd, 4),
            "stressed_ecl": round(stressed_ecl, 2),
            "ecl_delta": round(stressed_ecl - baseline_ecl, 2),
        },
        "sensitivity_curve": curve,
        "assumptions": {
            "baseline_pd_source": pd_source,
            "base_lgd": base_lgd,
            "pd_increase_per_100bps": sens,
        },
    }
