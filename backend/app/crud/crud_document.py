"""CRUD operations for Documents."""

import random
from typing import List, Optional
from sqlalchemy.orm import Session
from app.models.application import Document
from app.schemas.document import DocumentCreate


def get_document_by_id(db: Session, doc_id: str) -> Optional[Document]:
    return db.query(Document).filter(Document.id == doc_id).first()


def get_documents(db: Session, application_id: Optional[str] = None, skip: int = 0, limit: int = 100) -> List[Document]:
    query = db.query(Document)
    if application_id:
        query = query.filter(Document.application_id == application_id)
    return query.order_by(Document.created_at.desc()).offset(skip).limit(limit).all()


def create_document(db: Session, doc_in: DocumentCreate) -> Document:
    doc_id = doc_in.id or f"doc_{random.randint(1000, 9999)}"
    db_doc = Document(
        id=doc_id,
        application_id=doc_in.application_id,
        code=doc_in.code,
        name=doc_in.name,
        name_en=doc_in.name_en,
        size=doc_in.size,
        upload_date=doc_in.upload_date,
        status=doc_in.status,
        status_label=doc_in.status_label,
        status_label_en=doc_in.status_label_en,
        file_url=doc_in.file_url,
        extracted_data=doc_in.extracted_data or {},
    )
    db.add(db_doc)
    db.commit()
    db.refresh(db_doc)
    return db_doc


def delete_document(db: Session, doc_id: str) -> bool:
    db_doc = get_document_by_id(db, doc_id)
    if not db_doc:
        return False
    db.delete(db_doc)
    db.commit()
    return True

