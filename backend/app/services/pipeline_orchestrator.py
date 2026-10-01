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

    # Initial status comes from deterministic validation findings only.
    # No fraud or credit score is invented here: the scoring step produces them.
    has_critical_discrepancy = any(w.get("code") == "CRITICAL_INCOME_DISCREPANCY" for w in warnings)
    initial_status = "suspicious" if has_critical_discrepancy else "under_review"

    # Validation findings that are surfaced as fraud signals (shape matches FraudSignal schema)
    signal_ctx = {
        "CRITICAL_INCOME_DISCREPANCY": (
            "شهادة الراتب وكشف الحساب", "Salary certificate & bank statement",
            "مطابقة الدخل المعلن مع كشف الحساب ومستندات إضافية", "Reconcile declared income with the bank statement and extra documents",
        ),
        "NID_CROSS_MISMATCH": (
            "بطاقة الرقم القومي وتقرير الآي سكور", "National ID & I-Score report",
            "مراجعة المستندات الأصلية يدوياً", "Manually review the original documents",
        ),
        "NAME_CROSS_MISMATCH": (
            "بطاقة الرقم القومي وتقرير الآي سكور", "National ID & I-Score report",
            "مراجعة المستندات الأصلية يدوياً", "Manually review the original documents",
        ),
        "TAMPERING_SUSPECTED": (
            "المستندات المرفوعة", "Uploaded documents",
            "إحالة الطلب للتحقيق قبل أي قرار", "Escalate for investigation before any decision",
        ),
    }
    sev_labels = {"high": ("مرتفع", "High"), "medium": ("متوسط", "Medium"), "low": ("منخفض", "Low")}
    now_str = datetime.utcnow().strftime("%Y-%m-%d %H:%M")

    fraud_signals = []
    for w in warnings:
        code = w.get("code")
        if code not in signal_ctx:
            continue
        raw_sev = str(w.get("severity") or "medium").lower()
        severity = "high" if raw_sev in {"critical", "high"} else "low" if raw_sev == "low" else "medium"
        doc_ar, doc_en, act_ar, act_en = signal_ctx[code]
        signal = {
            "id": f"sig_{code.lower()}",
            "code": code,
            "title": w.get("message") or code,
            "titleEn": w.get("message_en") or code,
            "severity": severity,
            "severityLabel": sev_labels[severity][0],
            "severityLabelEn": sev_labels[severity][1],
            "confidence": None,
            "evidence": w.get("message") or "",
            "evidenceEn": w.get("message_en") or "",
            "relatedDocument": doc_ar,
            "relatedDocumentEn": doc_en,
            "timestamp": now_str,
            "recommendedAction": act_ar,
            "recommendedActionEn": act_en,
        }
        if code == "CRITICAL_INCOME_DISCREPANCY":
            if profile.get("declared_net_salary") is not None:
                signal["declaredValue"] = f"{profile['declared_net_salary']:,.2f} ج.م"
            if profile.get("avg_monthly_net_inflow") is not None:
                signal["actualValue"] = f"{profile['avg_monthly_net_inflow']:,.2f} ج.م"
        fraud_signals.append(signal)

    def _ocr_value(section: str, key: str):
        raw = (ocr_payload.get(section) or {}).get(key)
        return raw.get("value") if isinstance(raw, dict) else raw

    # Extracted fields: only values the OCR actually returned, with its own confidence.
    def _field(label, label_en, section, key, fmt=None):
        raw = (ocr_payload.get(section) or {}).get(key)
        value = raw.get("value") if isinstance(raw, dict) else raw
        if value in (None, ""):
            return None
        confidence = raw.get("confidence") if isinstance(raw, dict) else None
        return {
            "label": label,
            "labelEn": label_en,
            "value": fmt(value) if fmt else str(value),
            "confidence": round(float(confidence) * 100, 1) if confidence is not None else 0.0,
        }

    money = lambda v: f"{float(v):,.2f} ج.م"
    extracted_fields = [
        f for f in (
            _field("جهة العمل", "Employer", "salary_certificate_fields", "employer_name"),
            _field("المسمى الوظيفي", "Job Title", "salary_certificate_fields", "job_title"),
            _field("الراتب المعلن", "Declared Net Salary", "salary_certificate_fields", "declared_net_salary", money),
            _field("التدفق البنكي الشهري", "Avg Monthly Net Inflow", "bank_statement_fields", "avg_monthly_net_inflow", money),
            _field("المحافظة", "Governorate", "national_id_fields", "governorate"),
        )
        if f is not None
    ]

    # Bank summary: keys match the BankStatementSummary schema; unknown totals stay absent.
    period = _ocr_value("bank_statement_fields", "statement_period_months")
    bank_summary = {
        "bank_name": profile.get("bank_name"),
        "monthly_average": profile.get("avg_monthly_net_inflow"),
        "average_balance": _ocr_value("bank_statement_fields", "avg_monthly_balance"),
        "period_months": int(period) if period is not None else None,
        "income_regularity_score": _ocr_value("bank_statement_fields", "income_regularity_score"),
        "declared_net_salary": profile.get("declared_net_salary"),
    }
    bank_summary = {k: v for k, v in bank_summary.items() if v is not None}

    # OCR accuracy = mean document quality reported by the OCR service
    qualities = [
        d.get("overall_quality_score")
        for d in (ocr_payload.get("documents") or [])
        if isinstance(d.get("overall_quality_score"), (int, float))
    ]
    ocr_accuracy = round(sum(qualities) / len(qualities) * 100, 1) if qualities else None

    # 3. Create LoanApplication
    app = LoanApplication(
        id=app_id,
        applicant_id=actor.id if actor else None,
        applicant_name=profile.get("applicant_name") or "عميل غير معروف",
        applicant_name_en=profile.get("applicant_name") or "Applicant",
        national_id=profile.get("national_id") or "00000000000000",
        mobile_number="",
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
        ocr_accuracy=ocr_accuracy,
        extracted_from_doc_count=len(ocr_payload.get("documents") or []),
        extracted_fields=extracted_fields,
        bank_summary=bank_summary,
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
        model_version=str(credit_res.get("model_version") or "unknown"),
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

    # 4. Store service results as returned (nothing is invented)
    risk_labels = {
        "low": ("منخفض", "Low"),
        "medium": ("متوسط", "Medium"),
        "high": ("مرتفع", "High"),
        "critical": ("حرج", "Critical"),
    }

    # --- Recommendation (from the credit model's decision) ---
    model_decision = str(credit_res.get("decision") or "").upper()
    if "APPROVE" in model_decision:
        rec, rec_label, rec_label_en = "approve", "موافقة تلقائية", "Auto-Approve"
    elif "REJECT" in model_decision:
        rec, rec_label, rec_label_en = "reject", "رفض", "Auto-Reject"
    else:
        rec, rec_label, rec_label_en = "manual_review", "مراجعة يدوية", "Manual Review"

    fraud_level = str(fraud_res.get("fraud_risk_level") or "").lower()
    has_critical_discrepancy = any(
        w.get("code") == "CRITICAL_INCOME_DISCREPANCY" for w in validation_summary.get("warnings", [])
    )
    if fraud_level in {"high", "critical"} or has_critical_discrepancy:
        rec, rec_label, rec_label_en = (
            "manual_review",
            "مراجعة يدوية (مخاطر احتيال/تناقض دخل)",
            "Manual Review (Fraud/Income Discrepancy)",
        )

    # --- Credit assessment ---
    credit_score = credit_res.get("credit_score")
    app.credit_score = int(credit_score) if credit_score is not None else None
    tier = str(credit_res.get("risk_tier") or "").strip().lower()
    if tier in risk_labels:
        credit_cat = tier
    elif "APPROVE" in model_decision:
        credit_cat = "low"
    elif "REJECT" in model_decision:
        credit_cat = "high"
    else:
        credit_cat = "medium"
    app.credit_risk_category = credit_cat
    app.credit_risk_label, app.credit_risk_label_en = risk_labels[credit_cat]

    reason_codes = credit_res.get("reason_codes") or []
    app.calculated_factors_count = len(reason_codes)

    # --- Fraud assessment ---
    raw_fraud = fraud_res.get("fraud_risk_score")
    if raw_fraud is not None:
        raw_fraud = float(raw_fraud)
        app.fraud_risk_score = round(raw_fraud * 100) if raw_fraud <= 1 else round(raw_fraud)
    if fraud_level in risk_labels:
        app.fraud_risk_category = fraud_level
        app.fraud_risk_label, app.fraud_risk_label_en = risk_labels[fraud_level]

    # Model fraud signals are added next to the validation signals created at ingest.
    sev_map = {"LOW": "low", "MEDIUM": "medium", "HIGH": "high", "CRITICAL": "high"}
    sev_labels = {"low": ("منخفض", "Low"), "medium": ("متوسط", "Medium"), "high": ("مرتفع", "High")}
    now_str = datetime.utcnow().strftime("%Y-%m-%d %H:%M")
    action_ar = fraud_res.get("action_ar") or ""
    action_en = str(fraud_res.get("recommended_action") or "").replace("_", " ").capitalize()

    def _model_signal(sig_id, title, title_en, severity, evidence, evidence_en):
        return {
            "id": sig_id,
            "title": title,
            "titleEn": title_en,
            "severity": severity,
            "severityLabel": sev_labels[severity][0],
            "severityLabelEn": sev_labels[severity][1],
            "confidence": None,
            "evidence": evidence,
            "evidenceEn": evidence_en,
            "relatedDocument": "خدمة كشف الاحتيال",
            "relatedDocumentEn": "Fraud detection service",
            "timestamp": now_str,
            "recommendedAction": action_ar,
            "recommendedActionEn": action_en,
        }

    model_signals = []
    for r in fraud_res.get("triggered_rules") or []:
        model_signals.append(_model_signal(
            f"rule_{r.get('rule_code')}",
            r.get("rule_name_ar") or str(r.get("rule_code")),
            r.get("rule_name_en") or str(r.get("rule_code")),
            sev_map.get(str(r.get("severity")).upper(), "medium"),
            r.get("description_ar") or "",
            r.get("description_en") or "",
        ))
    for a in fraud_res.get("behavioral_anomalies") or []:
        if not a.get("detected"):
            continue
        model_signals.append(_model_signal(
            f"anom_{a.get('anomaly_name')}",
            str(a.get("anomaly_name")),
            str(a.get("anomaly_name")),
            "medium",
            a.get("explanation_ar") or "",
            a.get("explanation_en") or "",
        ))

    # Re-running scoring replaces the previous model signals, keeps the ingest ones.
    kept_signals = [
        s for s in (app.fraud_signals or [])
        if not str(s.get("id", "")).startswith(("rule_", "anom_"))
    ]
    app.fraud_signals = kept_signals + model_signals
    app.analyzed_signals_count = len(app.fraud_signals)

    # --- Recommendation text ---
    app.ai_recommendation = rec
    app.ai_recommendation_label = rec_label
    app.ai_recommendation_label_en = rec_label_en
    app.ai_confidence = None  # no service returns a confidence for the decision

    reasons = [{"ar": r, "en": r} for r in reason_codes]
    if explain_res.get("answer") and not explain_res.get("error"):
        reasons.append({"ar": explain_res["answer"], "en": explain_res["answer"]})
    app.recommendation_reasons = reasons
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
