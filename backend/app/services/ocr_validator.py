"""OCR Extraction Validation and Discrepancy Analysis Engine.

Validates:
1. Egyptian National ID format, date of birth, and cross-document consistency.
2. Applicant name validity and cross-document consistency (ID vs I-Score).
3. Document freshness / recency (salary certificate, bank statement, I-Score, ID expiry).
4. Income discrepancy between declared net salary and average monthly bank inflow.
5. Overall document quality and tampering indicators.
"""

from datetime import datetime, date
import re
from typing import Any, Dict, List, Optional, Tuple


def _parse_date(val: Optional[str]) -> Optional[date]:
    """Safely parse ISO or standard date strings (YYYY-MM-DD or YYYY-MM-DDTHH:MM:SS)."""
    if not val or not isinstance(val, str):
        return None
    try:
        val = val.split("T")[0]
        return datetime.strptime(val.strip(), "%Y-%m-%d").date()
    except Exception:
        return None


def validate_national_id(nid: str, consistency_flag: bool = True) -> Tuple[bool, List[Dict[str, Any]]]:
    """Validate Egyptian 14-digit National ID and check consistency."""
    warnings: List[Dict[str, Any]] = []

    if not nid or not isinstance(nid, str):
        warnings.append({
            "field": "national_id",
            "severity": "critical",
            "code": "NID_MISSING",
            "message": "الرقم القومي مفقود أو غير مقروء",
            "message_en": "National ID is missing or unreadable",
        })
        return False, warnings

    nid = nid.strip()
    if not re.fullmatch(r"^[23]\d{13}$", nid):
        warnings.append({
            "field": "national_id",
            "severity": "critical",
            "code": "NID_INVALID_FORMAT",
            "message": f"صيغة الرقم القومي غير صحيحة ({nid}) — يجب أن يتكون من 14 رقماً ويبدأ بـ 2 أو 3",
            "message_en": f"Invalid Egyptian National ID ({nid}) — must be 14 digits starting with 2 or 3",
        })
        return False, warnings

    # Century & Birth Date sanity
    century = 1900 if nid[0] == "2" else 2000
    year = century + int(nid[1:3])
    month = int(nid[3:5])
    day = int(nid[5:7])

    if not (1 <= month <= 12 and 1 <= day <= 31):
        warnings.append({
            "field": "national_id",
            "severity": "high",
            "code": "NID_DATE_INVALID",
            "message": f"تاريخ الميلاد المشفر في الرقم القومي غير صالح ({year}/{month}/{day})",
            "message_en": f"Invalid birth date encoded in National ID ({year}/{month}/{day})",
        })

    if not consistency_flag:
        warnings.append({
            "field": "national_id",
            "severity": "high",
            "code": "NID_CROSS_MISMATCH",
            "message": "عدم تطابق في الرقم القومي بين بطاقة الرقم القومي وتقرير الآي سكور (I-Score)",
            "message_en": "National ID mismatch between National ID card and I-Score report",
        })

    return len(warnings) == 0, warnings


def validate_name(name: str, consistency_flag: bool = True) -> Tuple[bool, List[Dict[str, Any]]]:
    """Validate applicant name and check cross-document consistency."""
    warnings: List[Dict[str, Any]] = []
    if not name or not isinstance(name, str) or len(name.strip().split()) < 2:
        warnings.append({
            "field": "full_name",
            "severity": "medium",
            "code": "NAME_INCOMPLETE",
            "message": "الاسم المستخرج غير كامل (أقل من مقطعين)",
            "message_en": "Extracted applicant name is incomplete (less than two tokens)",
        })

    if not consistency_flag:
        warnings.append({
            "field": "full_name",
            "severity": "high",
            "code": "NAME_CROSS_MISMATCH",
            "message": "عدم تطابق في اسم العميل بين بطاقة الهوية وتقرير الآي سكور (I-Score)",
            "message_en": "Customer name mismatch between National ID and I-Score report",
        })

    return len(warnings) == 0, warnings


def validate_document_freshness(ocr_data: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Validate document recency against standard banking underwriting thresholds (typically 90 days)."""
    warnings: List[Dict[str, Any]] = []
    today = date.today()

    # 1. Salary Certificate issue date
    sal_fields = ocr_data.get("salary_certificate_fields") or {}
    issue_date_val = sal_fields.get("issue_date")
    issue_date_str = issue_date_val.get("value") if isinstance(issue_date_val, dict) else issue_date_val
    if issue_date_str:
        issue_date = _parse_date(issue_date_str)
        if issue_date:
            age_days = (today - issue_date).days
            if age_days > 90:
                warnings.append({
                    "field": "salary_certificate.issue_date",
                    "severity": "medium",
                    "code": "STALE_SALARY_CERTIFICATE",
                    "message": f"شهادة الراتب قديمة ({age_days} يوماً — الحد الأقصى المسموح 90 يوماً)",
                    "message_en": f"Salary certificate is stale ({age_days} days old — max allowed 90 days)",
                    "issue_date": str(issue_date),
                    "age_days": age_days,
                })

    # 2. Bank statement period
    bank_fields = ocr_data.get("bank_statement_fields") or {}
    statement_period = bank_fields.get("statement_period_months")
    period_months = statement_period.get("value") if isinstance(statement_period, dict) else statement_period
    if period_months is not None and isinstance(period_months, (int, float)) and period_months < 3:
        warnings.append({
            "field": "bank_statement.period",
            "severity": "medium",
            "code": "SHORT_BANK_STATEMENT_PERIOD",
            "message": f"فترة كشف الحساب البنكي قصيرة ({period_months} أشهر — مطلوب 3 إلى 6 أشهر على الأقل)",
            "message_en": f"Bank statement period is too short ({period_months} months — 3-6 months required)",
        })

    # 3. I-Score report date
    iscore_fields = ocr_data.get("iscore_report_fields") or {}
    score_date_val = iscore_fields.get("score_date")
    score_date_str = score_date_val.get("value") if isinstance(score_date_val, dict) else score_date_val
    if score_date_str:
        score_date = _parse_date(score_date_str)
        if score_date:
            age_days = (today - score_date).days
            if age_days > 90:
                warnings.append({
                    "field": "iscore_report.score_date",
                    "severity": "medium",
                    "code": "STALE_ISCORE_REPORT",
                    "message": f"تقرير الآي سكور قديم ({age_days} يوماً — الحد الأقصى المسموح 90 يوماً)",
                    "message_en": f"I-Score report is stale ({age_days} days old — max allowed 90 days)",
                    "score_date": str(score_date),
                    "age_days": age_days,
                })

    # 4. National ID Expiry
    nid_fields = ocr_data.get("national_id_fields") or {}
    expiry_val = nid_fields.get("id_expiry_date")
    expiry_str = expiry_val.get("value") if isinstance(expiry_val, dict) else expiry_val
    if expiry_str:
        expiry_date = _parse_date(expiry_str)
        if expiry_date and expiry_date < today:
            warnings.append({
                "field": "national_id.id_expiry_date",
                "severity": "critical",
                "code": "EXPIRED_NATIONAL_ID",
                "message": f"بطاقة الرقم القومي منتهية الصلاحية منذ {str(expiry_date)}",
                "message_en": f"National ID card has expired on {str(expiry_date)}",
            })

    return warnings


def validate_income_discrepancy(
    declared_net_salary: Optional[float],
    avg_monthly_net_inflow: Optional[float],
) -> Tuple[bool, List[Dict[str, Any]]]:
    """Check for discrepancy between declared net salary and average monthly bank net inflow."""
    warnings: List[Dict[str, Any]] = []

    if declared_net_salary is None or avg_monthly_net_inflow is None:
        return True, warnings

    if declared_net_salary <= 0:
        return True, warnings

    ratio = declared_net_salary / max(avg_monthly_net_inflow, 1.0)
    inflow_pct = (avg_monthly_net_inflow / declared_net_salary) * 100

    # If declared salary is > 1.5x of bank net inflow (or bank inflow is less than 65% of declared)
    if ratio >= 1.5 or inflow_pct < 65.0:
        severity = "critical" if ratio >= 3.0 else "high"
        warnings.append({
            "field": "income_discrepancy",
            "severity": severity,
            "code": "CRITICAL_INCOME_DISCREPANCY",
            "message": (
                f"تناقض حاد في بيانات الدخل: صافي الراتب المعلن بالشهادة ({declared_net_salary:,.2f} ج.م) "
                f"يفوق متوسط التدفق البنكي الشهري ({avg_monthly_net_inflow:,.2f} ج.م) بـ {ratio:.2f} أضعاف "
                f"(التدفق البنكي يغطي {inflow_pct:.1f}% فقط من الراتب المعلن)"
            ),
            "message_en": (
                f"Critical income discrepancy: Declared salary ({declared_net_salary:,.2f} EGP) "
                f"exceeds average bank inflow ({avg_monthly_net_inflow:,.2f} EGP) by {ratio:.2f}x "
                f"(bank inflow represents only {inflow_pct:.1f}% of declared salary)"
            ),
            "declared_net_salary": declared_net_salary,
            "avg_monthly_net_inflow": avg_monthly_net_inflow,
            "discrepancy_ratio": round(ratio, 2),
            "inflow_coverage_percentage": round(inflow_pct, 1),
        })
        return False, warnings

    return True, warnings


def validate_document_quality_and_tampering(ocr_data: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Inspect quality scores and tamper detection flags across attached documents."""
    warnings: List[Dict[str, Any]] = []
    docs = ocr_data.get("documents") or []

    for doc in docs:
        dtype = doc.get("document_type", "document")
        quality = doc.get("overall_quality_score", 1.0)
        is_tampered = doc.get("is_tampered_suspected", False)

        if is_tampered:
            warnings.append({
                "field": f"document.{dtype}",
                "severity": "critical",
                "code": "TAMPERING_SUSPECTED",
                "message": f"اشتباه تلاعب في مستند {dtype} — تم تفعيل فحص الامتثال الأمني",
                "message_en": f"Suspected tampering detected in {dtype} document",
            })

        if quality is not None and quality < 0.6:
            warnings.append({
                "field": f"document.{dtype}",
                "severity": "high",
                "code": "POOR_DOCUMENT_QUALITY",
                "message": f"جودة صورة مستند {dtype} منخفضة ({quality:.2f}) — يرجى إعادة رفع المستند",
                "message_en": f"Poor document image quality for {dtype} ({quality:.2f})",
            })

    return warnings


def validate_cross_document_job_consistency(ocr_data: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Verify that job title / occupation across documents are semantically compatible using Vector Taxonomy."""
    from app.services.semantic_taxonomy import get_taxonomy_resolver
    warnings: List[Dict[str, Any]] = []

    nid_occ = (ocr_data.get("national_id_fields") or {}).get("occupation")
    nid_occ_str = nid_occ.get("value") if isinstance(nid_occ, dict) else nid_occ

    sal_occ = (ocr_data.get("salary_certificate_fields") or {}).get("job_title")
    sal_occ_str = sal_occ.get("value") if isinstance(sal_occ, dict) else sal_occ

    if nid_occ_str and sal_occ_str:
        resolver = get_taxonomy_resolver()
        res = resolver.match_job_titles(str(nid_occ_str), str(sal_occ_str))
        if not res.get("consistent"):
            warnings.append({
                "field": "occupation_mismatch",
                "severity": "medium",
                "code": "OCCUPATION_DISCREPANCY",
                "message": f"تفاوت في المسمى الوظيفي: بالبطاقة «{nid_occ_str}» بينما بشهادة الراتب «{sal_occ_str}» ({res.get('verdict_ar')})",
                "message_en": f"Occupation discrepancy between National ID ({nid_occ_str}) and Salary Certificate ({sal_occ_str})",
                "similarity_score": res.get("score"),
            })
    return warnings


def run_full_ocr_validation(ocr_data: Dict[str, Any]) -> Dict[str, Any]:
    """Execute all 5 validation checks and extract normalized profile details.

    Returns structured summary with overall consistency flag, warning list,
    extracted candidate fields, and bank metrics.
    """
    all_warnings: List[Dict[str, Any]] = []

    # Consistency checks block from OCR
    consistency = ocr_data.get("consistency_checks") or {}
    nid_consistent = consistency.get("national_id_consistent", True)
    name_consistent = consistency.get("name_consistent", True)

    # 1. National ID
    nid_fields = ocr_data.get("national_id_fields") or {}
    nid_raw = nid_fields.get("national_id")
    national_id = nid_raw.get("value") if isinstance(nid_raw, dict) else nid_raw
    if not national_id:
        # Fallback to document 0
        docs = ocr_data.get("documents") or []
        for d in docs:
            if d.get("document_type") == "national_id":
                national_id = d.get("extracted_fields", {}).get("national_id")
                break

    _, nid_warnings = validate_national_id(str(national_id or ""), consistency_flag=nid_consistent)
    all_warnings.extend(nid_warnings)

    # 2. Name
    name_raw = nid_fields.get("full_name")
    full_name = name_raw.get("value") if isinstance(name_raw, dict) else name_raw
    if not full_name:
        docs = ocr_data.get("documents") or []
        for d in docs:
            if d.get("document_type") == "national_id":
                full_name = d.get("extracted_fields", {}).get("full_name")
                break

    _, name_warnings = validate_name(str(full_name or ""), consistency_flag=name_consistent)
    all_warnings.extend(name_warnings)

    # 3. Document Freshness
    freshness_warnings = validate_document_freshness(ocr_data)
    all_warnings.extend(freshness_warnings)

    # 4. Income Discrepancy
    sal_fields = ocr_data.get("salary_certificate_fields") or {}
    sal_raw = sal_fields.get("declared_net_salary")
    declared_net_salary = sal_raw.get("value") if isinstance(sal_raw, dict) else sal_raw

    bank_fields = ocr_data.get("bank_statement_fields") or {}
    inflow_raw = bank_fields.get("avg_monthly_net_inflow")
    avg_monthly_net_inflow = inflow_raw.get("value") if isinstance(inflow_raw, dict) else inflow_raw

    # Fallback to documents list if missing in fields
    if declared_net_salary is None:
        for d in ocr_data.get("documents", []):
            if d.get("document_type") == "salary_certificate":
                declared_net_salary = d.get("extracted_fields", {}).get("declared_net_salary")
                break

    if avg_monthly_net_inflow is None:
        for d in ocr_data.get("documents", []):
            if d.get("document_type") == "bank_statement":
                avg_monthly_net_inflow = d.get("extracted_fields", {}).get("avg_monthly_net_inflow")
                break

    if declared_net_salary is not None:
        try:
            declared_net_salary = float(declared_net_salary)
        except (ValueError, TypeError):
            declared_net_salary = None

    if avg_monthly_net_inflow is not None:
        try:
            avg_monthly_net_inflow = float(avg_monthly_net_inflow)
        except (ValueError, TypeError):
            avg_monthly_net_inflow = None

    _, income_warnings = validate_income_discrepancy(declared_net_salary, avg_monthly_net_inflow)
    all_warnings.extend(income_warnings)

    # 5. Quality & Tampering
    quality_warnings = validate_document_quality_and_tampering(ocr_data)
    all_warnings.extend(quality_warnings)

    # 6. Semantic Vector Taxonomy Cross-Document Job Compatibility
    job_warnings = validate_cross_document_job_consistency(ocr_data)
    all_warnings.extend(job_warnings)

    # Append any explicit raw warnings present in OCR payload
    raw_warnings = consistency.get("warnings") or []
    for rw in raw_warnings:
        # Avoid duplicate warning text
        if not any(w.get("message_en") == rw or w.get("message") == rw for w in all_warnings):
            all_warnings.append({
                "field": "consistency_checks",
                "severity": "high",
                "code": "OCR_RAW_WARNING",
                "message": rw,
                "message_en": rw,
            })

    # Overall consistency is False if any critical or high warnings exist
    has_critical_or_high = any(w.get("severity") in {"critical", "high"} for w in all_warnings)
    is_consistent = not has_critical_or_high

    # Prepare extracted fields dictionary
    employer_val = sal_fields.get("employer_name")
    employer = employer_val.get("value") if isinstance(employer_val, dict) else employer_val
    job_val = sal_fields.get("job_title")
    job_title = job_val.get("value") if isinstance(job_val, dict) else job_val
    gov_val = nid_fields.get("governorate")
    governorate = gov_val.get("value") if isinstance(gov_val, dict) else gov_val

    iscore_fields = ocr_data.get("iscore_report_fields") or {}
    credit_score_val = iscore_fields.get("credit_score")
    iscore_score = credit_score_val.get("value") if isinstance(credit_score_val, dict) else credit_score_val

    bank_name_val = bank_fields.get("bank_name")
    bank_name = bank_name_val.get("value") if isinstance(bank_name_val, dict) else bank_name_val

    return {
        "is_consistent": is_consistent,
        "warnings": all_warnings,
        "extracted_profile": {
            "applicant_name": full_name or "غير محدد",
            "national_id": str(national_id or ""),
            "employer": employer,
            "job_title": job_title,
            "governorate": governorate,
            "declared_net_salary": declared_net_salary,
            "avg_monthly_net_inflow": avg_monthly_net_inflow,
            "bank_name": bank_name,
            "iscore_credit_score": iscore_score,
        },
    }
