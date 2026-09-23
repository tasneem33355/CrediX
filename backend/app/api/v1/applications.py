"""Loan Applications API Router."""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.crud.crud_application import (
    get_application_by_id,
    get_applications,
    create_application,
    update_application,
    record_officer_decision,
    delete_application,
)
from app.schemas.application import (
    LoanApplicationResponse,
    LoanApplicationCreate,
    LoanApplicationUpdate,
    OfficerDecisionRequest,
)

router = APIRouter(prefix="/applications", tags=["Loan Applications"])


@router.get("", response_model=List[LoanApplicationResponse])
def list_applications(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    status_filter: Optional[str] = Query(None, alias="status"),
    loan_type: Optional[str] = Query(None, alias="loanType"),
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    """List loan applications with optional status, loan type, and search filters."""
    items, _ = get_applications(
        db,
        skip=skip,
        limit=limit,
        status=status_filter,
        loan_type=loan_type,
        search=search,
    )
    return items


@router.get("/{app_id}", response_model=LoanApplicationResponse)
def get_application(app_id: str, db: Session = Depends(get_db)):
    """Retrieve full details of a loan application by ID."""
    app = get_application_by_id(db, app_id)
    if not app:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Application {app_id} not found")
    return app


@router.post("", response_model=LoanApplicationResponse, status_code=status.HTTP_201_CREATED)
def submit_loan_application(app_in: LoanApplicationCreate, db: Session = Depends(get_db)):
    """Submit a new loan application from the client portal/apply wizard."""
    return create_application(db, app_in)


@router.patch("/{app_id}", response_model=LoanApplicationResponse)
def modify_application(app_id: str, app_update: LoanApplicationUpdate, db: Session = Depends(get_db)):
    """Update fields of an existing loan application."""
    updated = update_application(db, app_id, app_update)
    if not updated:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Application {app_id} not found")
    return updated


@router.post("/{app_id}/decision", response_model=LoanApplicationResponse)
def process_decision(app_id: str, decision_req: OfficerDecisionRequest, db: Session = Depends(get_db)):
    """Submit credit officer decision: 'approve', 'reject', or 'manual'."""
    updated = record_officer_decision(db, app_id, decision_req.decision, decision_req.notes)
    if not updated:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Application {app_id} not found")
    return updated


@router.delete("/{app_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_application(app_id: str, db: Session = Depends(get_db)):
    """Delete a loan application."""
    success = delete_application(db, app_id)
    if not success:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Application {app_id} not found")
    return None

