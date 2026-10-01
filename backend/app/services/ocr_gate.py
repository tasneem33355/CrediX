"""OCR Validation Gate.

Runs on the OCR output BEFORE any application is created. It does not write to
the database. It reports:
  - critical fields that are missing or were read with low confidence,
  - the findings from ocr_validator (mismatches, stale/expired documents, income gap),
  - a verdict: "blocked" (suspected tampering), "needs_acknowledgement", or "passed".
"""

from typing import Any, Dict, List

from app.services.ocr_validator import run_full_ocr_validation

CONFIDENCE_THRESHOLD = 0.5

DOC_LABELS = {
    "national_id": ("بطاقة الرقم القومي", "National ID"),
    "salary_certificate": ("شهادة الراتب", "Salary certificate"),
    "bank_statement": ("كشف الحساب البنكي", "Bank statement"),
    "iscore": ("تقرير الآي سكور", "I-Score report"),
    "general": ("عام", "General"),
}

# (document key, OCR section, field key, Arabic label, English label)
CRITICAL_FIELDS = [
    ("national_id", "national_id_fields", "full_name", "الاسم بالكامل", "Full name"),
    ("national_id", "national_id_fields", "national_id", "الرقم القومي", "National ID number"),
    ("national_id", "national_id_fields", "date_of_birth", "تاريخ الميلاد", "Date of birth"),
    ("salary_certificate", "salary_certificate_fields", "employer_name", "جهة العمل", "Employer name"),
    ("salary_certificate", "salary_certificate_fields", "declared_net_salary", "صافي الراتب المعلن", "Declared net salary"),
    ("bank_statement", "bank_statement_fields", "avg_monthly_net_inflow", "متوسط التدفق البنكي الشهري", "Average monthly net inflow"),
    ("bank_statement", "bank_statement_fields", "statement_period_months", "فترة كشف الحساب", "Statement period"),
    ("iscore", "iscore_report_fields", "credit_score", "درجة الآي سكور", "I-Score value"),
]

_DOC_TYPE_TO_KEY = {
    "national_id": "national_id",
    "salary_certificate": "salary_certificate",
    "bank_statement": "bank_statement",
    "iscore_report": "iscore",
}


def _doc_key_for_warning(w: Dict[str, Any]) -> str:
    field = str(w.get("field") or "")
    code = str(w.get("code") or "")
    if code == "CRITICAL_INCOME_DISCREPANCY":
        return "salary_certificate"
    if field.startswith("document."):
        return _DOC_TYPE_TO_KEY.get(field.split(".", 1)[1], "general")
    if field.startswith(("national_id", "full_name")):
        return "national_id"
    if field.startswith("salary_certificate"):
        return "salary_certificate"
    if field.startswith("bank_statement"):
        return "bank_statement"
    if field.startswith("iscore_report"):
        return "iscore"
    return "general"


def evaluate_gate(ocr_data: Dict[str, Any]) -> Dict[str, Any]:
    issues: List[Dict[str, Any]] = []

    # 1. Critical fields: missing value, or confidence below the threshold.
    for doc_key, section, key, label_ar, label_en in CRITICAL_FIELDS:
        raw = (ocr_data.get(section) or {}).get(key)
        value = raw.get("value") if isinstance(raw, dict) else raw
        confidence = raw.get("confidence") if isinstance(raw, dict) else None
        doc_ar, doc_en = DOC_LABELS[doc_key]

        if value in (None, ""):
            issues.append({
                "document": doc_key, "document_label": doc_ar, "document_label_en": doc_en,
                "field": key, "severity": "high", "code": "CRITICAL_FIELD_MISSING",
                "message": f"الحقل الأساسي «{label_ar}» لم يُقرأ من المستند",
                "message_en": f"Critical field \"{label_en}\" could not be read from the document",
            })
        elif isinstance(confidence, (int, float)) and confidence < CONFIDENCE_THRESHOLD:
            issues.append({
                "document": doc_key, "document_label": doc_ar, "document_label_en": doc_en,
                "field": key, "severity": "medium", "code": "LOW_CONFIDENCE",
                "message": f"الحقل «{label_ar}» قُرئ بثقة منخفضة ({confidence * 100:.0f}%)",
                "message_en": f"Field \"{label_en}\" was read with low confidence ({confidence * 100:.0f}%)",
            })

    iscore = ocr_data.get("iscore_report_fields") or {}
    if iscore.get("is_available") is False:
        doc_ar, doc_en = DOC_LABELS["iscore"]
        issues.append({
            "document": "iscore", "document_label": doc_ar, "document_label_en": doc_en,
            "field": "is_available", "severity": "high", "code": "ISCORE_UNAVAILABLE",
            "message": "تقرير الآي سكور غير متاح أو غير مقروء",
            "message_en": "The I-Score report is unavailable or unreadable",
        })

    # 2. Findings from the existing validator (mismatches, stale/expired, income gap, tampering).
    validation = run_full_ocr_validation(ocr_data)
    warnings = validation["warnings"]
    # The OCR service's raw mismatch text duplicates our own NID/NAME mismatch findings.
    if any(w.get("code") in {"NID_CROSS_MISMATCH", "NAME_CROSS_MISMATCH"} for w in warnings):
        warnings = [w for w in warnings if w.get("code") != "OCR_RAW_WARNING"]
    for w in warnings:
        doc_key = _doc_key_for_warning(w)
        doc_ar, doc_en = DOC_LABELS[doc_key]
        issues.append({
            "document": doc_key, "document_label": doc_ar, "document_label_en": doc_en,
            "field": w.get("field"), "severity": str(w.get("severity") or "medium").lower(),
            "code": w.get("code"), "message": w.get("message"), "message_en": w.get("message_en"),
        })

    # 3. Verdict.
    tampered = any(
        d.get("is_tampered_suspected") for d in (ocr_data.get("documents") or [])
    )
    if tampered:
        status = "blocked"
    elif issues:
        status = "needs_acknowledgement"
    else:
        status = "passed"

    return {
        "status": status,
        "can_proceed": status != "blocked",
        "requires_acknowledgement": status == "needs_acknowledgement",
        "is_tampered_suspected": tampered,
        "issues": issues,
    }
