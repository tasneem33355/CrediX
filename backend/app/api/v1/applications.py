"""Loan Applications API Router.

Access rules (enforced from the operational DB role, never from client input):
- officer: full access to every application and the only role that may edit,
  decide on, or delete applications.
- client: may submit applications and read only the applications they own.
  Someone else's application returns 404 (not 403) so IDs cannot be enumerated.
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.auth.dependencies import is_officer, require_authenticated_user, require_officer
from app.database import get_db
from app.crud.crud_application import (
    get_application_by_id,
    get_applications,
    create_application,
    update_application,
    record_officer_decision,
    delete_application,
)
from app.models.user import User
from app.schemas.application import (
    LoanApplicationResponse,
    LoanApplicationCreate,
    LoanApplicationUpdate,
    OfficerDecisionRequest,
)

router = APIRouter(prefix="/applications", tags=["Loan Applications"])


def _not_found(app_id: str) -> HTTPException:
    return HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Application {app_id} not found")


def _load_accessible_application(db: Session, app_id: str, user: User):
    """Return the application if the user may see it, otherwise raise 404."""
    app = get_application_by_id(db, app_id)
    if not app or (not is_officer(user) and app.applicant_id != user.id):
        raise _not_found(app_id)
    return app


@router.get("", response_model=List[LoanApplicationResponse])
def list_applications(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    status_filter: Optional[str] = Query(None, alias="status"),
    loan_type: Optional[str] = Query(None, alias="loanType"),
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_authenticated_user),
):
    """List loan applications (officers: all, clients: only their own)."""
    items, _ = get_applications(
        db,
        skip=skip,
        limit=limit,
        status=status_filter,
        loan_type=loan_type,
        search=search,
        applicant_id=None if is_officer(current_user) else current_user.id,
    )
    return items


@router.get("/{app_id}", response_model=LoanApplicationResponse)
def get_application(
    app_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_authenticated_user),
):
    """Retrieve full details of a loan application by ID."""
    return _load_accessible_application(db, app_id, current_user)


@router.post("", response_model=LoanApplicationResponse, status_code=status.HTTP_201_CREATED)
def submit_loan_application(
    app_in: LoanApplicationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_authenticated_user),
):
    """Submit a new loan application from the client portal/apply wizard.

    The owner is always the authenticated caller. Clients cannot choose the
    application ID, which prevents overwriting or probing existing records.
    """
    if not is_officer(current_user):
        app_in.id = None
    return create_application(db, app_in, applicant_id=current_user.id)


@router.patch("/{app_id}", response_model=LoanApplicationResponse)
def modify_application(
    app_id: str,
    app_update: LoanApplicationUpdate,
    db: Session = Depends(get_db),
    _officer: User = Depends(require_officer),
):
    """Update fields of an existing loan application (officers only)."""
    updated = update_application(db, app_id, app_update)
    if not updated:
        raise _not_found(app_id)
    return updated


@router.post("/{app_id}/decision", response_model=LoanApplicationResponse)
def process_decision(
    app_id: str,
    decision_req: OfficerDecisionRequest,
    db: Session = Depends(get_db),
    _officer: User = Depends(require_officer),
):
    """Submit credit officer decision: 'approve', 'reject', or 'manual' (officers only)."""
    updated = record_officer_decision(db, app_id, decision_req.decision, decision_req.notes)
    if not updated:
        raise _not_found(app_id)
    return updated


@router.delete("/{app_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_application(
    app_id: str,
    db: Session = Depends(get_db),
    _officer: User = Depends(require_officer),
):
    """Delete a loan application (officers only)."""
    if not delete_application(db, app_id):
        raise _not_found(app_id)
    return None
