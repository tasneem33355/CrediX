"""CRUD operations for Kanban Case Cards."""

import random
from typing import List, Optional
from sqlalchemy.orm import Session
from app.models.case import CaseCard
from app.schemas.case import CaseCardCreate, CaseCardUpdate


def get_case_by_id(db: Session, case_id: str) -> Optional[CaseCard]:
    return db.query(CaseCard).filter(CaseCard.id == case_id).first()


def get_cases(db: Session, column_id: Optional[str] = None) -> List[CaseCard]:
    query = db.query(CaseCard)
    if column_id:
        query = query.filter(CaseCard.column_id == column_id)
    return query.order_by(CaseCard.created_at.desc()).all()


def create_case(db: Session, case_in: CaseCardCreate) -> CaseCard:
    case_id = case_in.id or f"case_{random.randint(100, 999)}"
    app_id = case_in.application_id or f"APP-2026-{random.randint(1000, 9999)}"
    initials = case_in.initials or (case_in.client_name.strip()[:1] if case_in.client_name else "ع")

    db_case = CaseCard(
        id=case_id,
        application_id=app_id,
        client_name=case_in.client_name,
        client_name_en=case_in.client_name_en or case_in.client_name,
        initials=initials,
        amount=case_in.amount,
        currency=case_in.currency or "ج.م",
        stage_tag=case_in.stage_tag,
        stage_tag_en=case_in.stage_tag_en or case_in.stage_tag,
        column_id=case_in.column_id or "processing",
    )
    db.add(db_case)
    db.commit()
    db.refresh(db_case)
    return db_case


def update_case(db: Session, case_id: str, case_update: CaseCardUpdate) -> Optional[CaseCard]:
    db_case = get_case_by_id(db, case_id)
    if not db_case:
        return None

    update_data = case_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_case, field, value)

    db.commit()
    db.refresh(db_case)
    return db_case


def delete_case(db: Session, case_id: str) -> bool:
    db_case = get_case_by_id(db, case_id)
    if not db_case:
        return False
    db.delete(db_case)
    db.commit()
    return True

