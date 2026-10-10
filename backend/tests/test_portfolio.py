"""Portfolio analytics endpoints: computed from the database, empty-safe."""

from datetime import datetime, timedelta

from fastapi.testclient import TestClient

from app.database import SessionLocal
from app.main import app
from app.models.portfolio import DecisionAuditLog, LoanFacility
from app.seed.portfolio_seed import seed_loan_facilities
from app.api.v1.portfolio import population_stability_index
from tests.test_api import as_officer, auth_verifier_override  # noqa: F401  (fixtures)

client = TestClient(app)


def test_empty_portfolio_is_honest(as_officer):
    kpis = client.get("/api/v1/portfolio/kpis", headers=as_officer).json()
    assert kpis["has_data"] is False and kpis["total_loans_count"] == 0 and kpis["npl_ratio"] == 0.0
    assert client.get("/api/v1/portfolio/drift", headers=as_officer).json()["system_health"] == "INSUFFICIENT_DATA"
    assert client.get("/api/v1/portfolio/scored-kpis", headers=as_officer).json()["has_data"] is False
    st = client.post("/api/v1/portfolio/stress-test", json={}, headers=as_officer).json()
    assert st["has_data"] is False


def test_kpis_concentration_and_stress_from_facilities(as_officer):
    db = SessionLocal()
    seed_loan_facilities(db, n=300)
    db.close()
    kpis = client.get("/api/v1/portfolio/kpis", headers=as_officer).json()
    assert kpis["has_data"] and kpis["includes_demo_data"]
    assert kpis["performing_loans_count"] + kpis["npl_loans_count"] == kpis["total_loans_count"]
    conc = client.get("/api/v1/portfolio/concentration", headers=as_officer).json()
    assert sum(conc["by_product"].values()) == kpis["total_loans_count"]
    st = client.post("/api/v1/portfolio/stress-test", json={"pd_multiplier": 2.0, "lgd_multiplier": 1.3}, headers=as_officer).json()
    r = st["scenario_results"]
    assert r["stressed_ecl"] > r["baseline_ecl"] > 0 and r["ecl_delta"] > 0
    assert st["sensitivity_curve"][0]["rate_hike_bps"] == 0
    assert st["sensitivity_curve"][-1]["stressed_ecl"] > st["sensitivity_curve"][0]["stressed_ecl"]


def test_drift_detects_shift_and_stable(as_officer):
    db = SessionLocal()
    t0 = datetime.utcnow() - timedelta(days=100)
    for i in range(60):
        shifted = i >= 30
        db.add(DecisionAuditLog(
            decision_id=f"d{i}", application_id=f"a{i}", created_at=t0 + timedelta(hours=i),
            dti_ratio=0.9 if shifted else 0.1 + (i % 10) * 0.01,
            credit_score=700 + (i % 7), default_probability=0.05, requested_amount=50000,
            fraud_risk_score=0.1, fraud_risk_level="LOW", final_decision="AUTO-APPROVE",
        ))
    db.commit()
    db.close()
    d = client.get("/api/v1/portfolio/drift", headers=as_officer).json()
    assert d["has_enough_data"] and d["max_psi_feature"] == "dti_ratio" and d["system_health"] == "CRITICAL"
    s = client.get("/api/v1/portfolio/scored-kpis", headers=as_officer).json()
    assert s["has_data"] and s["total_decisions"] == 60 and s["by_decision"]["AUTO-APPROVE"] == 60


def test_psi_identical_is_zero():
    xs = [float(i) for i in range(100)]
    assert population_stability_index(xs, xs) < 1e-6


def test_portfolio_requires_officer():
    assert client.get("/api/v1/portfolio/kpis").status_code in (401, 403)
