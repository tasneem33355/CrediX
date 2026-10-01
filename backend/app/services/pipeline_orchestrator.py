"""Pipeline Orchestrator for CrediX Underwriting Flow.

Orchestrates:
1. Ingest OCR JSON / documents
2. Run validation checks (National ID, Name, Freshness, Income Discrepancy)
3. Persist raw OCR payload into ExtractionResult
4. Initialize or update LoanApplication
5. Run Fraud Analysis -> log ModelRun(kind="fraud")
6. Run Credit Risk ML Scoring -> log ModelRun(kind="pd")
7. Generate Arabic AI Explanation -> log ModelRun(kind="explain")
8. Update LoanApplication with scores, recommendation, and audit trails
"""

import json
import hashlib
import time
from datetime import datetime
from decimal import Decimal
from typing import Any, Dict, Optional
from sqlalchemy.orm import Session

from app.database import new_id
from app.models.application import Document, LoanApplication, ExtractionResult, ModelRun, TimelineEvent
from app.models.user import User
from app.services.ocr_validator import run_full_ocr_validation
from app.services.fraud_client import score_fraud
from app.services.credit_risk_client import score_credit_risk
from app.services.llm_explainer_client import generate_explanation
from app.services.scoring_payload import build_scoring_payload

def _sha256(data: Any) -> str:
    """Compute SHA256 hex digest of dictionary or string."""
    if isinstance(data, dict):
        serialized = json.dumps(data, sort_keys=True, default=str)
    else:
        serialized = str(data)
    return hashlib.sha256(serialized.encode("utf-8")).hexdigest()


async def ingest_ocr_and_create_application(
    db: Session,
    ocr_payload: Dict[str, Any],
    actor: Optional[User] = None,
    loan_type: str = "personal",
    requested_amount: float = 100000.0,
    tenure_months: int = 36,
    purpose: Optional[str] = None,
) -> Dict[str, Any]:
    """Validate OCR payload, persist extraction result, and initialize loan application."""
    # 1. Validation
    validation_res = run_full_ocr_validation(ocr_payload)
    profile = validation_res["extracted_profile"]
    warnings = validation_res["warnings"]
    is_consistent = validation_res["is_consistent"]

    # 2. Generate application ID
    year = datetime.utcnow().year
    app_id = f"APP-{year}-{new_id('').replace('_', '').upper()[:8]}"

    # Map status & initial fraud risk based on validation findings
    has_critical_discrepancy = any(w.get("code") == "CRITICAL_INCOME_DISCREPANCY" for w in warnings)
    has_identity_mismatch = any(w.get("code") in {"NID_CROSS_MISMATCH", "NAME_CROSS_MISMATCH"} for w in warnings)

    if has_critical_discrepancy:
        initial_status = "suspicious"
        fraud_risk_score = 78
        fraud_risk_category = "high"
        fraud_risk_label = "مرتفع"
        fraud_risk_label_en = "High"
    elif has_identity_mismatch or not is_consistent:
        initial_status = "under_review"
        fraud_risk_score = 55
        fraud_risk_category = "medium"
        fraud_risk_label = "متوسط"
        fraud_risk_label_en = "Medium"
    else:
        initial_status = "under_review"
        fraud_risk_score = 15
        fraud_risk_category = "low"
        fraud_risk_label = "منخفض"
        fraud_risk_label_en = "Low"

    # Convert warnings into initial fraud signals
    fraud_signals = []
    for w in warnings:
        code = w.get("code")
        if code in {"CRITICAL_INCOME_DISCREPANCY", "NID_CROSS_MISMATCH", "NAME_CROSS_MISMATCH", "TAMPERING_SUSPECTED"}:
            fraud_signals.append({
                "code": code,
                "severity": w.get("severity", "high"),
                "title": w.get("message", ""),
                "titleEn": w.get("message_en", ""),
                "evidence": w.get("message", ""),
                "evidenceEn": w.get("message_en", ""),
            })

    # Bank summary record
    bank_fields = ocr_payload.get("bank_statement_fields") or {}
    bank_summary = {
        "bank_name": profile.get("bank_name") or "غير محدد",
        "avg_monthly_net_inflow": profile.get("avg_monthly_net_inflow"),
        "declared_net_salary": profile.get("declared_net_salary"),
        "statement_period_months": (bank_fields.get("statement_period_months") or {}).get("value")
        if isinstance(bank_fields.get("statement_period_months"), dict)
        else bank_fields.get("statement_period_months"),
        "income_regularity_score": (bank_fields.get("income_regularity_score") or {}).get("value")
        if isinstance(bank_fields.get("income_regularity_score"), dict)
        else bank_fields.get("income_regularity_score"),
    }

    # 3. Create LoanApplication
    app = LoanApplication(
        id=app_id,
        applicant_id=actor.id if actor else None,
        applicant_name=profile.get("applicant_name") or "عميل غير معروف",
        applicant_name_en=profile.get("applicant_name") or "Applicant",
        national_id=profile.get("national_id") or "00000000000000",
        mobile_number="01000000000",
        client_type="new",
        occupation=f"{profile.get('job_title') or ''} - {profile.get('employer') or ''}".strip(" -"),
        loan_type=loan_type,
        loan_type_label="تمويل شخصي" if loan_type == "personal" else loan_type,
        loan_type_label_en="Personal Financing" if loan_type == "personal" else loan_type,
        requested_amount=Decimal(str(requested_amount)),
        tenure_months=tenure_months,
        purpose=purpose or "طلب تمويل مستند إلى بيانات الاستخراج الآلي",
        status=initial_status,
        submitted_at=datetime.utcnow(),
        ocr_accuracy=95.0,
        extracted_from_doc_count=len(ocr_payload.get("documents") or []),
        extracted_fields=[
            {"label": "جهة العمل", "value": profile.get("employer")},
            {"label": "المسمى الوظيفي", "value": profile.get("job_title")},
            {"label": "الراتب المعلن", "value": f"{profile.get('declared_net_salary') or 0:,.2f} ج.م"},
            {"label": "التدفق البنكي الشهري", "value": f"{profile.get('avg_monthly_net_inflow') or 0:,.2f} ج.م"},
            {"label": "المحافظة", "value": profile.get("governorate")},
        ],
        bank_summary=bank_summary,
        fraud_risk_score=fraud_risk_score,
        fraud_risk_category=fraud_risk_category,
        fraud_risk_label=fraud_risk_label,
        fraud_risk_label_en=fraud_risk_label_en,
        analyzed_signals_count=len(fraud_signals),
        fraud_signals=fraud_signals,
        pipeline_completed_steps=2,
        pipeline_total_steps=5,
    )
    db.add(app)
    db.flush()

    # 4. Save ExtractionResult
    payload_sha = _sha256(ocr_payload)
    extraction = ExtractionResult(
        id=new_id("ext"),
        application_id=app.id,
        source="ocr",
        schema_version="1",
        payload_sha256=payload_sha,
        payload=ocr_payload,
        is_consistent=is_consistent,
        warnings=warnings,
        created_at=datetime.utcnow(),
    )
    db.add(extraction)


    # 4b. Register one Document row per OCR-processed document so /documents and
    #     the application's documents tab are backed by real rows.
    doc_labels = {
        "national_id": ("ID", "بطاقة الرقم القومي", "National ID"),
        "salary_certificate": ("SC", "شهادة الراتب", "Salary Certificate"),
        "bank_statement": ("BS", "كشف الحساب البنكي", "Bank Statement"),
        "iscore": ("IS", "تقرير الآي سكور", "I-Score Report"),
        "iscore_report": ("IS", "تقرير الآي سكور", "I-Score Report"),
    }
    for doc in ocr_payload.get("documents") or []:
        dtype = str(doc.get("document_type") or "document")
        code, name_ar, name_en = doc_labels.get(dtype, ("DOC", dtype, dtype))
        quality = doc.get("overall_quality_score")
        tampered = bool(doc.get("is_tampered_suspected"))
        ok = not tampered and (quality is None or quality >= 0.6)
        db.add(
            Document(
                id=new_id("doc"),
                application_id=app.id,
                code=code,
                name=name_ar,
                name_en=name_en,
                size="—",
                status="success" if ok else "failed",
                status_label="تم الاستخراج" if ok else "يحتاج مراجعة",
                status_label_en="Extracted" if ok else "Needs review",
                extracted_data={
                    "document_type": dtype,
                    "overall_quality_score": quality,
                    "is_tampered_suspected": tampered,
                },
            )
        )
    
    # 5. Add Timeline Event
    timeline = TimelineEvent(
        id=new_id("tl"),
        application_id=app.id,
        title="استلام المستندات والتحقق الآلي",
        title_en="Documents Ingested & OCR Validated",
        timestamp=datetime.utcnow().strftime("%Y-%m-%d %H:%M"),
        description=(
            f"تم استخراج البيانات والتحقق من الرقم القومي والاسم. "
            f"تم رصد {len(warnings)} ملاحظات تدقيقية."
        ),
        description_en=(
            f"Data extracted and verified. {len(warnings)} audit warning(s) logged."
        ),
        status="completed",
        icon_type="ocr",
    )
    db.add(timeline)
    db.commit()
    db.refresh(app)

    return {
        "application_id": app.id,
        "is_consistent": is_consistent,
        "applicant_name": app.applicant_name,
        "national_id": app.national_id,
        "status": app.status,
        "warnings": warnings,
        "extraction_id": extraction.id,
    }


async def run_scoring_pipeline_for_application(
    db: Session,
    app_id: str,
    ocr_payload: Optional[Dict[str, Any]] = None,
    actor: Optional[User] = None,
) -> Dict[str, Any]:
    """Execute Fraud -> Credit Risk -> LLM Explainer scoring pipeline."""
    app = db.query(LoanApplication).filter(LoanApplication.id == app_id).first()
    if not app:
        raise ValueError(f"Application {app_id} not found")

    # If ocr_payload wasn't passed, retrieve from extraction_results
    if not ocr_payload:
        ext = db.query(ExtractionResult).filter(ExtractionResult.application_id == app_id).order_by(ExtractionResult.created_at.desc()).first()
        ocr_payload = ext.payload if ext else {}

    # Extract validation summary
    validation_summary = run_full_ocr_validation(ocr_payload) if ocr_payload else {"warnings": []}
    scoring_payload = build_scoring_payload(ocr_payload, app)
    
    # 1. Step 1: Fraud Scoring
    t0 = time.time()
    fraud_res = await score_fraud(scoring_payload)
    latency_fraud = int((time.time() - t0) * 1000)

    run_fraud = ModelRun(
        id=new_id("run"),
        application_id=app.id,
        kind="fraud",
        model_name="credix-fraud-detector-v1",
        model_version="1.0.0",
        status="success",
        input_sha256=_sha256(scoring_payload),
        output=fraud_res,
        latency_ms=latency_fraud,
        requested_by=actor.id if actor else None,
        created_at=datetime.utcnow(),
        completed_at=datetime.utcnow(),
    )
    db.add(run_fraud)

    # 2. Step 2: Credit Risk ML Scoring
    t0 = time.time()
    credit_res = await score_credit_risk(scoring_payload)
    latency_credit = int((time.time() - t0) * 1000)

    run_credit = ModelRun(
        id=new_id("run"),
        application_id=app.id,
        kind="pd",
        model_name="credit-risk-xgb-lgb-blend-v1",
        model_version="1.0.0",
        status="success" if not credit_res.get("error") else "failed",
        input_sha256=_sha256(scoring_payload),
        output=credit_res,
        latency_ms=latency_credit,
        requested_by=actor.id if actor else None,
        created_at=datetime.utcnow(),
        completed_at=datetime.utcnow(),
    )
    db.add(run_credit)

    # 3. Step 3: LLM Explainer
    t0 = time.time()
    explain_res = await generate_explanation(credit_risk_data=credit_res, fraud_data=fraud_res, lang="ar")
    latency_explain = int((time.time() - t0) * 1000)

    run_explain = ModelRun(
        id=new_id("run"),
        application_id=app.id,
        kind="explain",
        model_name="llm-explainer-gemini",
        model_version="1.0.0",
        status="success" if not explain_res.get("error") else "failed",
        input_sha256=_sha256({"credit": credit_res, "fraud": fraud_res}),
        output=explain_res,
        latency_ms=latency_explain,
        requested_by=actor.id if actor else None,
        created_at=datetime.utcnow(),
        completed_at=datetime.utcnow(),
    )
    db.add(run_explain)

    # 4. Update Application State
    # AI Recommendation
    model_decision = str(credit_res.get("decision", "MANUAL REVIEW")).upper()
    if "APPROVE" in model_decision:
        rec = "approve"
        rec_label = "موافقة تلقائية"
        rec_label_en = "Auto-Approve"
    elif "REJECT" in model_decision:
        rec = "reject"
        rec_label = "رفض"
        rec_label_en = "Auto-Reject"
    else:
        rec = "manual_review"
        rec_label = "مراجعة يدوية"
        rec_label_en = "Manual Review"

    # If critical fraud or discrepancy, force recommendation to manual review or reject
    if fraud_res.get("fraud_risk_level") == "HIGH" or any(w.get("code") == "CRITICAL_INCOME_DISCREPANCY" for w in validation_summary.get("warnings", [])):
        rec = "manual_review"
        rec_label = "مراجعة يدوية (مخاطر احتيال/تناقض دخل)"
        rec_label_en = "Manual Review (Fraud/Income Discrepancy)"

    app.credit_score = int(credit_res.get("credit_score") or 650)
    app.credit_risk_category = "low" if app.credit_score >= 700 else "medium" if app.credit_score >= 600 else "high"
    app.credit_risk_label = "منخفض" if app.credit_risk_category == "low" else "متوسط"
    app.credit_risk_label_en = "Low" if app.credit_risk_category == "low" else "Medium"

    fraud_score_pct = int(fraud_res.get("fraud_risk_score", 0.15) * 100)
    app.fraud_risk_score = fraud_score_pct
    app.fraud_risk_category = fraud_res.get("fraud_risk_level", "LOW").lower()
    app.fraud_risk_label = "مرتفع" if app.fraud_risk_category == "high" else "متوسط" if app.fraud_risk_category == "medium" else "منخفض"
    app.fraud_risk_label_en = app.fraud_risk_category.capitalize()

    app.ai_recommendation = rec
    app.ai_recommendation_label = rec_label
    app.ai_recommendation_label_en = rec_label_en
    app.ai_confidence = 88.0

    reason_texts = credit_res.get("reason_codes") or []
    if explain_res.get("answer"):
        reason_texts.append(explain_res.get("answer"))

    app.recommendation_reasons = [{"ar": r, "en": r} for r in reason_texts]
    app.pipeline_completed_steps = 5

    # Append timeline
    timeline_score = TimelineEvent(
        id=new_id("tl"),
        application_id=app.id,
        title="اكتمال التقييم الائتماني وتفسير الذكاء الاصطناعي",
        title_en="Scoring & AI Explanation Completed",
        timestamp=datetime.utcnow().strftime("%Y-%m-%d %H:%M"),
        description=f"النتيجة: {rec_label} — درجة الائتمان {app.credit_score} — مخاطر الاحتيال {app.fraud_risk_label}",
        description_en=f"Result: {rec_label_en} — Credit Score {app.credit_score} — Fraud Risk {app.fraud_risk_label_en}",
        status="completed",
        icon_type="score",
    )
    db.add(timeline_score)

    db.commit()
    db.refresh(app)

    return {
        "application_id": app.id,
        "customer_name": app.applicant_name,
        "national_id": app.national_id,
        "credit_risk": credit_res,
        "fraud": fraud_res,
        "explanation": explain_res,
        "validation_warnings": validation_summary.get("warnings", []),
    }
