"""OCR Processing & Underwriting Scoring API Router."""

from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from sqlalchemy.orm import Session

from app.auth.dependencies import require_authenticated_user, require_officer
from app.database import get_db
from app.models.user import User
from app.models.application import ExtractionResult, LoanApplication
from app.schemas.ocr import OCRSubmissionRequest, OCRIngestResponse, OCRGateResponse, FullPipelineScoreResponse
from app.services.pipeline_orchestrator import (
    ingest_ocr_and_create_application,
    run_scoring_pipeline_for_application,
)
from app.services.ocr_client import call_ocr_service
from app.services.ocr_gate import evaluate_gate
from app.services.service_errors import ExternalServiceError

router = APIRouter(prefix="/ocr", tags=["OCR & Scoring Pipeline"])

async def _ingest_or_422(**kwargs):
    try:
        return await ingest_ocr_and_create_application(**kwargs)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc))

@router.post("/ingest-json", response_model=OCRIngestResponse, status_code=status.HTTP_201_CREATED)
async def ingest_ocr_json_endpoint(
    req: OCRSubmissionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_authenticated_user),
):
    """Ingest OCR JSON payload directly (e.g. response_Fixed.json).

    Validates National ID, Name, Freshness, and Income Discrepancy.
    Persists into extraction_results and initializes a loan application.
    """
    result = await _ingest_or_422(
        db=db,
        ocr_payload=req.ocr_data,
        actor=current_user,
        loan_type=req.loan_type or "personal",
        requested_amount=req.requested_amount or 100000.0,
        tenure_months=req.tenure_months or 36,
        purpose=req.purpose,
        mobile_number=req.mobile_number,
    )
    return result

@router.post("/upload-and-check", response_model=OCRGateResponse)
async def upload_documents_and_check(
    national_id_front_file: UploadFile = File(...),
    national_id_back_file: UploadFile = File(...),
    salary_certificate_file: UploadFile = File(...),
    bank_statement_file: UploadFile = File(...),
    iscore_file: UploadFile = File(...),
    current_user: User = Depends(require_authenticated_user),
):
    """Run OCR + the validation gate WITHOUT creating an application."""
    files_payload = {
        "national_id_front_file": (national_id_front_file.filename, await national_id_front_file.read(), national_id_front_file.content_type),
        "national_id_back_file": (national_id_back_file.filename, await national_id_back_file.read(), national_id_back_file.content_type),
        "salary_certificate_file": (salary_certificate_file.filename, await salary_certificate_file.read(), salary_certificate_file.content_type),
        "bank_statement_file": (bank_statement_file.filename, await bank_statement_file.read(), bank_statement_file.content_type),
        "iscore_file": (iscore_file.filename, await iscore_file.read(), iscore_file.content_type),
    }

    try:
        ocr_data = await call_ocr_service(files_payload, application_id="pending")
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"OCR service communication failed: {str(exc)}",
        )

    return {**evaluate_gate(ocr_data), "ocr_data": ocr_data}

@router.post("/upload-and-process", response_model=OCRIngestResponse, status_code=status.HTTP_201_CREATED)
async def upload_documents_and_process(
    national_id_front_file: UploadFile = File(...),
    national_id_back_file: UploadFile = File(...),
    salary_certificate_file: UploadFile = File(...),
    bank_statement_file: UploadFile = File(...),
    iscore_file: UploadFile = File(...),
    loan_type: str = Form("personal"),
    requested_amount: float = Form(100000.0),
    tenure_months: int = Form(36),
    purpose: Optional[str] = Form(None),
    mobile_number: Optional[str] = Form(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_authenticated_user),
):
    """Upload all 5 credit documents, call external OCR service, validate, and create application."""
    files_payload = {
        "national_id_front_file": (national_id_front_file.filename, await national_id_front_file.read(), national_id_front_file.content_type),
        "national_id_back_file": (national_id_back_file.filename, await national_id_back_file.read(), national_id_back_file.content_type),
        "salary_certificate_file": (salary_certificate_file.filename, await salary_certificate_file.read(), salary_certificate_file.content_type),
        "bank_statement_file": (bank_statement_file.filename, await bank_statement_file.read(), bank_statement_file.content_type),
        "iscore_file": (iscore_file.filename, await iscore_file.read(), iscore_file.content_type),
    }

    try:
        ocr_data = await call_ocr_service(files_payload, application_id="pending")
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"OCR service communication failed: {str(exc)}",
        )

    result = await _ingest_or_422(
        db=db,
        ocr_payload=ocr_data,
        actor=current_user,
        loan_type=loan_type,
        requested_amount=requested_amount,
        tenure_months=tenure_months,
        purpose=purpose,
        mobile_number=mobile_number,
    )
    return result


@router.post("/applications/{app_id}/score", response_model=FullPipelineScoreResponse)
async def score_application_endpoint(
    app_id: str,
    db: Session = Depends(get_db),
    officer: User = Depends(require_officer),
):
    """Execute Fraud -> Credit Risk -> LLM Explainer scoring pipeline for an application."""
    try:
        result = await run_scoring_pipeline_for_application(db=db, app_id=app_id, actor=officer)
        return result
    except ExternalServiceError as exc:
        db.rollback()
        raise HTTPException(
            status_code=exc.status_code,
            detail=f"{exc.service} service error: {exc.detail}",
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Pipeline error: {str(exc)}")


@router.get("/applications/{app_id}/extractions")
def get_application_extractions(
    app_id: str,
    db: Session = Depends(get_db),
    officer: User = Depends(require_officer),
):
    """Retrieve raw extraction records and validation audit trail for an application."""
    items = db.query(ExtractionResult).filter(ExtractionResult.application_id == app_id).order_by(ExtractionResult.created_at.desc()).all()
    return [
        {
            "id": it.id,
            "application_id": it.application_id,
            "source": it.source,
            "schema_version": it.schema_version,
            "payload_sha256": it.payload_sha256,
            "is_consistent": it.is_consistent,
            "warnings": it.warnings,
            "created_at": it.created_at.isoformat() if it.created_at else None,
        }
        for it in items
    ]


@router.get("/semantic-match")
def semantic_match_endpoint(
    term: str,
    compare_with: Optional[str] = None,
    threshold: float = 0.55,
    current_user: User = Depends(require_authenticated_user),
):
    """Resolve a multi-bank financial term or compare job titles using Vector Taxonomy Embeddings."""
    from app.services.semantic_taxonomy import get_taxonomy_resolver
    resolver = get_taxonomy_resolver()
    if compare_with:
        return resolver.match_job_titles(term, compare_with)
    return resolver.resolve_field(term, threshold=threshold)


@router.post("/normalize-schema")
def normalize_schema_endpoint(
    payload: Dict[str, Any],
    current_user: User = Depends(require_authenticated_user),
):
    """Normalize arbitrary multi-bank OCR fields into the canonical financial schema."""
    from app.services.semantic_taxonomy import get_taxonomy_resolver
    resolver = get_taxonomy_resolver()
    return resolver.normalize_extracted_fields(payload)

