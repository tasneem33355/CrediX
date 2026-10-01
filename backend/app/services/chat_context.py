"""Builds the explainer blocks for one application from data we already store."""

from typing import Any, Dict, List, Optional
from sqlalchemy.orm import Session

from app.models.application import ExtractionResult, LoanApplication, ModelRun


def _latest_run_output(db: Session, application_id: str, kind: str) -> Optional[Dict[str, Any]]:
    run = (
        db.query(ModelRun)
        .filter(
            ModelRun.application_id == application_id,
            ModelRun.kind == kind,
            ModelRun.status == "success",
        )
        .order_by(ModelRun.created_at.desc())
        .first()
    )
    return run.output if run and isinstance(run.output, dict) else None


def build_application_blocks(db: Session, application_id: str) -> Optional[List[Dict[str, Any]]]:
    """Return explainer blocks for the application, or None if it does not exist."""
    app = db.query(LoanApplication).filter(LoanApplication.id == application_id).first()
    if app is None:
        return None

    blocks: List[Dict[str, Any]] = []

    credit = _latest_run_output(db, application_id, "pd")
    if credit:
        blocks.append({"type": "credit_risk", "data": credit})
    fraud = _latest_run_output(db, application_id, "fraud")
    if fraud:
        blocks.append({"type": "fraud", "data": fraud})

    extraction = (
        db.query(ExtractionResult)
        .filter(ExtractionResult.application_id == application_id)
        .order_by(ExtractionResult.created_at.desc())
        .first()
    )

    summary: Dict[str, Any] = {
        "application_id": app.id,
        "status": app.status,
        "loan_type": app.loan_type,
        "requested_amount": float(app.requested_amount) if app.requested_amount is not None else None,
        "tenure_months": app.tenure_months,
        "credit_score": app.credit_score,
        "fraud_risk_score": app.fraud_risk_score,
        "bank_summary": app.bank_summary or {},
        "fraud_signals": [
            {
                "title": s.get("titleEn") or s.get("title"),
                "evidence": s.get("evidenceEn") or s.get("evidence"),
                "severity": s.get("severity"),
            }
            for s in (app.fraud_signals or [])
        ],
    }
    if extraction is not None:
        payload = extraction.payload if isinstance(extraction.payload, dict) else {}
        summary["validation_warnings"] = extraction.warnings or []
        for section in ("salary_certificate_fields", "bank_statement_fields", "iscore_report_fields"):
            if payload.get(section):
                summary[section] = payload[section]

    blocks.append({"type": "custom", "data": summary})
    return blocks
