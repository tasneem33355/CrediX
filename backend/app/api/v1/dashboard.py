"""Dashboard Analytics & Metrics API Router (computed from the database)."""

from collections import Counter
from datetime import datetime, timedelta
from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.auth.dependencies import require_officer
from app.database import get_db
from app.models.application import LoanApplication
from app.schemas.dashboard import (
    DashboardStats,
    TrendItem,
    StatusDonutItem,
    LoanTypeItem,
)

# Officer-only: every route on this router requires an authenticated credit officer.
router = APIRouter(prefix="/dashboard", tags=["Dashboard Analytics"], dependencies=[Depends(require_officer)])


def _growth_pct(current: int, previous: int) -> float:
    """Percent change vs the previous period; 0 when there is no previous data to compare."""
    if previous <= 0:
        return 0.0
    return round((current - previous) / previous * 100, 1)


@router.get("/stats", response_model=DashboardStats)
def get_dashboard_kpis(db: Session = Depends(get_db)):
    """Executive KPI cards computed from stored applications."""
    apps = db.query(LoanApplication).all()
    now = datetime.utcnow()
    last_30 = now - timedelta(days=30)
    prev_30 = now - timedelta(days=60)

    def _in(a, start, end):
        return a.submitted_at is not None and start <= a.submitted_at < end

    total = len(apps)
    approved = sum(1 for a in apps if a.status == "approved")
    under_review = sum(1 for a in apps if a.status == "under_review")
    suspicious = sum(1 for a in apps if a.status == "suspicious")

    cur_total = sum(1 for a in apps if _in(a, last_30, now))
    prev_total = sum(1 for a in apps if _in(a, prev_30, last_30))

    def _rate(start, end):
        period = [a for a in apps if _in(a, start, end)]
        if not period:
            return 0.0
        return sum(1 for a in period if a.status == "approved") / len(period) * 100

    cur_under = sum(1 for a in apps if a.status == "under_review" and _in(a, last_30, now))
    prev_under = sum(1 for a in apps if a.status == "under_review" and _in(a, prev_30, last_30))

    attention = sum(1 for a in apps if a.fraud_risk_category in ("high", "critical"))

    return DashboardStats(
        totalApplications=total,
        totalGrowth=_growth_pct(cur_total, prev_total),
        approvalRate=round(approved / total * 100, 1) if total else 0.0,
        approvalGrowth=round(_rate(last_30, now) - _rate(prev_30, last_30), 1) if prev_total else 0.0,
        underReview=under_review,
        underReviewChange=_growth_pct(cur_under, prev_under),
        suspiciousFraud=suspicious,
        suspiciousAttentionCount=attention,
    )


@router.get("/trends", response_model=List[TrendItem])
def get_dashboard_trends(db: Session = Depends(get_db)):
    """Daily incoming application counts for the last 30 days."""
    today = datetime.utcnow().date()
    start = today - timedelta(days=29)
    rows = db.query(LoanApplication.submitted_at).filter(LoanApplication.submitted_at >= datetime.combine(start, datetime.min.time())).all()
    per_day = Counter(r[0].date() for r in rows if r[0] is not None)
    return [
        TrendItem(day=(start + timedelta(days=i)).strftime("%d"), count=per_day.get(start + timedelta(days=i), 0))
        for i in range(30)
    ]


@router.get("/status-distribution", response_model=List[StatusDonutItem])
def get_status_distribution(db: Session = Depends(get_db)):
    """Status breakdown (percent of all applications) for the donut chart."""
    statuses = [r[0] for r in db.query(LoanApplication.status).all()]
    total = len(statuses)
    if total == 0:
        return []
    counts = Counter(statuses)
    defs = [
        ("approved", "موافق", "Approved", "#2E9E5B"),
        ("under_review", "قيد المراجعة", "Under Review", "#1B3A5C"),
        ("suspicious", "محل اشتباه", "Suspicious", "#F59E0B"),
        ("rejected", "مرفوض", "Rejected", "#EF4444"),
    ]
    return [
        StatusDonutItem(name=ar, nameEn=en, value=round(counts[key] / total * 100, 1), color=color)
        for key, ar, en, color in defs
        if counts.get(key)
    ]


@router.get("/loan-types", response_model=List[LoanTypeItem])
def get_loan_types_distribution(db: Session = Depends(get_db)):
    """Application count per loan type for the bar chart."""
    rows = db.query(LoanApplication.loan_type, LoanApplication.loan_type_label, LoanApplication.loan_type_label_en).all()
    counts: Counter = Counter()
    labels = {}
    for lt, ar, en in rows:
        counts[lt] += 1
        labels[lt] = (ar or lt, en or lt)
    return [
        LoanTypeItem(type=labels[lt][0], typeEn=labels[lt][1], count=n)
        for lt, n in counts.most_common()
    ]
