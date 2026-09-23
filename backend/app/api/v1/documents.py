"""Document Management API Router."""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.crud.crud_document import get_document_by_id, get_documents, create_document, delete_document
from app.schemas.document import DocumentResponse, DocumentCreate

router = APIRouter(prefix="/documents", tags=["Document Management"])


@router.get("", response_model=List[DocumentResponse])
def list_documents(
    application_id: Optional[str] = Query(None, alias="applicationId"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=200),
    db: Session = Depends(get_db),
):
    """List documents optionally filtered by application ID."""
    return get_documents(db, application_id=application_id, skip=skip, limit=limit)


@router.get("/{doc_id}", response_model=DocumentResponse)
def get_document(doc_id: str, db: Session = Depends(get_db)):
    """Retrieve document details by ID."""
    doc = get_document_by_id(db, doc_id)
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Document {doc_id} not found")
    return doc


@router.post("", response_model=DocumentResponse, status_code=status.HTTP_201_CREATED)
def upload_document_metadata(doc_in: DocumentCreate, db: Session = Depends(get_db)):
    """Register/Upload document metadata for OCR analysis."""
    return create_document(db, doc_in)


@router.delete("/{doc_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_document(doc_id: str, db: Session = Depends(get_db)):
    """Delete a document by ID."""
    success = delete_document(db, doc_id)
    if not success:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Document {doc_id} not found")
    return None

