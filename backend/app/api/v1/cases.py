"""Case Management (Kanban) API Router."""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.crud.crud_case import get_case_by_id, get_cases, create_case, update_case, delete_case
from app.schemas.case import CaseCardResponse, CaseCardCreate, CaseCardUpdate

router = APIRouter(prefix="/cases", tags=["Case Management"])


@router.get("", response_model=List[CaseCardResponse])
def list_cases(
    column_id: Optional[str] = Query(None, alias="columnId"),
    db: Session = Depends(get_db),
):
    """List Kanban case cards, optionally filtered by column (processing, human_review, completed)."""
    return get_cases(db, column_id=column_id)


@router.get("/{case_id}", response_model=CaseCardResponse)
def get_case(case_id: str, db: Session = Depends(get_db)):
    """Get single Kanban case card by ID."""
    case = get_case_by_id(db, case_id)
    if not case:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Case {case_id} not found")
    return case


@router.post("", response_model=CaseCardResponse, status_code=status.HTTP_201_CREATED)
def create_case_card(case_in: CaseCardCreate, db: Session = Depends(get_db)):
    """Create a new case card for the Kanban pipeline."""
    return create_case(db, case_in)


@router.patch("/{case_id}", response_model=CaseCardResponse)
def update_case_column(case_id: str, case_update: CaseCardUpdate, db: Session = Depends(get_db)):
    """Update case status / move across columns."""
    updated = update_case(db, case_id, case_update)
    if not updated:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Case {case_id} not found")
    return updated


@router.delete("/{case_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_case(case_id: str, db: Session = Depends(get_db)):
    """Delete a case card."""
    success = delete_case(db, case_id)
    if not success:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Case {case_id} not found")
    return None

