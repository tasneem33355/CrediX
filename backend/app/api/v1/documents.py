"""Document Management API Router.

- officer: full read access, may delete documents.
- client: may read documents of their own applications and register metadata
  only against an application they own.
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.auth.dependencies import is_officer, require_authenticated_user, require_officer
from app.database import get_db
from app.crud.crud_application import get_application_by_id
from app.crud.crud_document import get_document_by_id, get_documents, create_document, delete_document
from app.models.user import User
from app.schemas.document import DocumentResponse, DocumentCreate

router = APIRouter(prefix="/documents", tags=["Document Management"])


def _doc_not_found(doc_id: str) -> HTTPException:
    return HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Document {doc_id} not found")


@router.get("", response_model=List[DocumentResponse])
def list_documents(
    application_id: Optional[str] = Query(None, alias="applicationId"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_authenticated_user),
):
    """List documents optionally filtered by application ID."""
    return get_documents(
        db,
        application_id=application_id,
        skip=skip,
        limit=limit,
        applicant_id=None if is_officer(current_user) else current_user.id,
    )


@router.get("/{doc_id}", response_model=DocumentResponse)
def get_document(
    doc_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_authenticated_user),
):
    """Retrieve document details by ID."""
    doc = get_document_by_id(db, doc_id)
    if not doc:
        raise _doc_not_found(doc_id)
    if not is_officer(current_user):
        owner_app = get_application_by_id(db, doc.application_id) if doc.application_id else None
        if not owner_app or owner_app.applicant_id != current_user.id:
            raise _doc_not_found(doc_id)
    return doc


@router.post("", response_model=DocumentResponse, status_code=status.HTTP_201_CREATED)
def upload_document_metadata(
    doc_in: DocumentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_authenticated_user),
):
    """Register/Upload document metadata for OCR analysis."""
    if not is_officer(current_user):
        # Clients must attach documents to one of their own applications and
        # cannot pick the document ID.
        owner_app = get_application_by_id(db, doc_in.application_id) if doc_in.application_id else None
        if not owner_app or owner_app.applicant_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Application {doc_in.application_id} not found",
            )
        doc_in.id = None
    return create_document(db, doc_in)


@router.delete("/{doc_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_document(
    doc_id: str,
    db: Session = Depends(get_db),
    _officer: User = Depends(require_officer),
):
    """Delete a document by ID (officers only)."""
    if not delete_document(db, doc_id):
        raise _doc_not_found(doc_id)
    return None
