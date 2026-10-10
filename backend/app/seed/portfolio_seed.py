"""Demo core-banking facilities so the portfolio dashboard is never empty on a fresh database."""

import random
from datetime import date, timedelta
from sqlalchemy.orm import Session
from app.models.portfolio import LoanFacility


def seed_loan_facilities(db: Session, n: int = 300) -> int:
    if db.query(LoanFacility.facility_id).first() is not None:
        return 0
    rnd = random.Random(42)  # deterministic
    ranges = {"CASH_LOAN": (20_000, 300_000), "CAR_LOAN": (150_000, 800_000), "CREDIT_CARD": (5_000, 100_000)}
    today = date.today()
    rows = []
    for i in range(n):
        ctype = rnd.choices(list(ranges), weights=[60, 25, 15])[0]
        status = rnd.choices(
            ["ACTIVE_PERFORMING", "CLOSED_PAID_OFF", "DEFAULTED_NPL", "RESTRUCTURED"], weights=[86, 6, 6, 2]
        )[0]
        lo, hi = ranges[ctype]
        tenor = rnd.choice([12, 24, 36, 48, 60])
        rows.append(LoanFacility(
            facility_id=f"DEMO-{i + 1:04d}",
            customer_id=f"DEMO-CUST-{i + 1:04d}",
            contract_type=ctype,
            granted_amount=round(rnd.randint(lo // 1000, hi // 1000) * 1000, 2),
            granted_date=today - timedelta(days=rnd.randint(30, 900)),
            tenor_months=tenor,
            facility_status=status,
            historical_max_dpd=rnd.randint(90, 210) if status == "DEFAULTED_NPL" else rnd.choice([0, 0, 0, 5, 15, 30]),
            is_demo=True,
        ))
    db.add_all(rows)
    db.commit()
    return len(rows)
