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
    get_audit_trail,
    create_application,
    update_application,
    record_officer_decision,
    delete_application,
    DecisionConflict,
    DelegationLimitExceeded,
)
from app.models.user import User
from app.services.application_analytics import get_application_analytics
from app.schemas.application import (
    LoanApplicationResponse,
    LoanApplicationCreate,
    LoanApplicationUpdate,
    OfficerDecisionRequest,
    DecisionAuditResponse,
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
    return create_application(db, app_in, applicant_id=current_user.id, actor=current_user)


@router.patch("/{app_id}", response_model=LoanApplicationResponse)
def modify_application(
    app_id: str,
    app_update: LoanApplicationUpdate,
    db: Session = Depends(get_db),
    officer: User = Depends(require_officer),
):
    """Update details of an application (officers only; status/scores are not editable here)."""
    updated = update_application(db, app_id, app_update, actor=officer)
    if not updated:
        raise _not_found(app_id)
    return updated


@router.post("/{app_id}/decision", response_model=LoanApplicationResponse)
def process_decision(
    app_id: str,
    decision_req: OfficerDecisionRequest,
    db: Session = Depends(get_db),
    officer: User = Depends(require_officer),
):
    """Submit credit officer decision: 'approve', 'reject' or 'manual' (officers only).
    A final decision (approved/rejected) cannot be overwritten: returns 409.
    Approvals exceeding the officer's delegation limit return 403."""
    try:
        updated = record_officer_decision(db, app_id, decision_req.decision, decision_req.notes, officer=officer)
    except DecisionConflict as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc))
    except DelegationLimitExceeded as exc:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "code": "DELEGATION_LIMIT_EXCEEDED",
                "message": str(exc),
                "approvalLimit": exc.limit,
                "requestedAmount": exc.requested,
            },
        )
    if not updated:
        raise _not_found(app_id)
    return updated


@router.delete("/{app_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_application(
    app_id: str,
    db: Session = Depends(get_db),
    officer: User = Depends(require_officer),
):
    """Delete a loan application (Risk Managers & CRO only; junior/senior cannot delete)."""
    tier = getattr(officer, "officer_tier", None)
    can_override = getattr(officer, "can_override_policy", False)
    if tier in {"junior_officer", "senior_officer"} and not can_override:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "code": "INSUFFICIENT_PRIVILEGE",
                "message": "حذف ملفات التمويل مقصور على مديري المخاطر (Risk Managers) أو رئيس القطاع (CRO) فقط.",
            },
        )
    if not delete_application(db, app_id, actor=officer):
        raise _not_found(app_id)
    return None


@router.get("/{app_id}/audit", response_model=List[DecisionAuditResponse])
def application_audit_trail(
    app_id: str,
    db: Session = Depends(get_db),
    _officer: User = Depends(require_officer),
):
    """Chronological audit trail (officers only; still available after the application is deleted)."""
    return get_audit_trail(db, app_id)


@router.get("/{app_id}/analytics")
def application_analytics(
    app_id: str,
    db: Session = Depends(get_db),
    _officer: User = Depends(require_officer),
):
    """Risk & scenario analytics for one application (officers only)."""
    db_app = get_application_by_id(db, app_id)
    if not db_app:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Application {app_id} not found")
    return get_application_analytics(db, db_app)
