"""Tests for OCR validation engine and OCR ingestion endpoints."""

import json
from decimal import Decimal
from app.services.ocr_validator import (
    validate_national_id,
    validate_name,
    validate_document_freshness,
    validate_income_discrepancy,
    run_full_ocr_validation,
)


def sample_ocr_payload():
    return {
        "application_id": "5623",
        "applicant_type": "individual",
        "submission_timestamp": "2026-09-28T00:02:46.928048Z",
        "documents": [
            {
                "document_type": "national_id",
                "overall_quality_score": 1.0,
                "is_tampered_suspected": False,
                "extracted_fields": {
                    "full_name": "كريم حمدى على احمد",
                    "national_id": "30306052103394",
                    "date_of_birth": "2003-06-05",
                },
            },
            {
                "document_type": "salary_certificate",
                "overall_quality_score": 1.0,
                "is_tampered_suspected": False,
                "extracted_fields": {
                    "employer_name": "Careem Deliveries LLC",
                    "job_title": "Senior Care Ops Team Lead",
                    "declared_net_salary": 22880,
                    "employment_date": "2023-12-10",
                },
            },
            {
                "document_type": "bank_statement",
                "overall_quality_score": 1.0,
                "is_tampered_suspected": False,
                "extracted_fields": {
                    "bank_name": "mashreq",
                    "avg_monthly_net_inflow": 2998.5,
                },
            },
        ],
        "national_id_fields": {
            "full_name": {"value": "كريم حمدى على احمد", "confidence": 0.95},
            "national_id": {"value": "30306052103394", "confidence": 0.95},
            "governorate": {"value": "Giza", "confidence": 0.95},
        },
        "salary_certificate_fields": {
            "employer_name": {"value": "Careem Deliveries LLC", "confidence": 0.95},
            "job_title": {"value": "Senior Care Ops Team Lead", "confidence": 0.95},
            "declared_net_salary": {"value": 22880, "confidence": 0.95},
            "issue_date": {"value": "2024-10-05", "confidence": 0.95},
        },
        "bank_statement_fields": {
            "bank_name": {"value": "mashreq", "confidence": 0.95},
            "avg_monthly_net_inflow": {"value": 2998.5, "confidence": 0.95},
            "statement_period_months": {"value": 5, "confidence": 0.95},
        },
        "iscore_report_fields": {
            "credit_score": {"value": 780, "confidence": 0.95},
            "score_date": {"value": "2024-11-20", "confidence": 0.95},
        },
        "consistency_checks": {
            "national_id_consistent": False,
            "name_consistent": False,
            "overall_consistency": False,
            "warnings": [
                "National ID mismatch between National ID document and I-Score.",
                "Customer name mismatch between National ID and I-Score.",
            ],
        },
    }


def test_national_id_validation():
    ok, warnings = validate_national_id("30306052103394", consistency_flag=True)
    assert ok is True
    assert len(warnings) == 0

    bad_ok, bad_warnings = validate_national_id("123", consistency_flag=True)
    assert bad_ok is False
    assert any(w["code"] == "NID_INVALID_FORMAT" for w in bad_warnings)

    mismatch_ok, mismatch_warnings = validate_national_id("30306052103394", consistency_flag=False)
    assert mismatch_ok is False
    assert any(w["code"] == "NID_CROSS_MISMATCH" for w in mismatch_warnings)


def test_name_validation():
    ok, warnings = validate_name("كريم حمدى على احمد", consistency_flag=True)
    assert ok is True

    bad_ok, bad_warnings = validate_name("كريم", consistency_flag=False)
    assert bad_ok is False
    assert any(w["code"] == "NAME_INCOMPLETE" for w in bad_warnings)
    assert any(w["code"] == "NAME_CROSS_MISMATCH" for w in bad_warnings)


def test_income_discrepancy_detection():
    # 22,880 salary vs 2,998.5 bank inflow (7.63x gap)
    ok, warnings = validate_income_discrepancy(22880.0, 2998.5)
    assert ok is False
    assert len(warnings) == 1
    assert warnings[0]["code"] == "CRITICAL_INCOME_DISCREPANCY"
    assert warnings[0]["discrepancy_ratio"] > 7.0

    # Matching income: 25,000 salary vs 24,000 inflow -> should pass
    ok_match, match_warnings = validate_income_discrepancy(25000.0, 24000.0)
    assert ok_match is True
    assert len(match_warnings) == 0


def test_document_freshness_detection():
    payload = sample_ocr_payload()
    warnings = validate_document_freshness(payload)
    # Both 2024 dates should be flagged as stale in 2026
    assert any(w["code"] == "STALE_SALARY_CERTIFICATE" for w in warnings)
    assert any(w["code"] == "STALE_ISCORE_REPORT" for w in warnings)


def test_full_ocr_validation_run():
    payload = sample_ocr_payload()
    res = run_full_ocr_validation(payload)
    assert res["is_consistent"] is False
    codes = {w["code"] for w in res["warnings"]}
    assert "CRITICAL_INCOME_DISCREPANCY" in codes
    assert "NID_CROSS_MISMATCH" in codes
    assert "NAME_CROSS_MISMATCH" in codes
    assert res["extracted_profile"]["applicant_name"] == "كريم حمدى على احمد"
    assert res["extracted_profile"]["national_id"] == "30306052103394"
    assert res["extracted_profile"]["declared_net_salary"] == 22880.0
    assert res["extracted_profile"]["avg_monthly_net_inflow"] == 2998.5
