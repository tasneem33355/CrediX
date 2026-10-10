"""CRUD operations for Users."""

from typing import List, Optional
from sqlalchemy.orm import Session
from app.models.user import User
from app.schemas.user import UserCreate


def get_user_by_id(db: Session, user_id: str) -> Optional[User]:
    return db.query(User).filter(User.id == user_id).first()


def get_user_by_email(db: Session, email: str) -> Optional[User]:
    return db.query(User).filter(User.email == email).first()


def get_user_by_external_auth_id(db: Session, external_auth_id: str) -> Optional[User]:
    """Look up the operational profile mapped to a verified Supabase subject."""
    return db.query(User).filter(User.external_auth_id == external_auth_id).first()


def get_users(db: Session, skip: int = 0, limit: int = 100) -> List[User]:
    return db.query(User).offset(skip).limit(limit).all()


def create_user(db: Session, user_in: UserCreate) -> User:
    user_id = user_in.id or f"usr_{user_in.role}_{db.query(User).count() + 1:02d}"
    db_user = User(
        id=user_id,
        name=user_in.name,
        name_en=user_in.name_en,
        email=user_in.email,
        role=user_in.role,
        officer_tier=user_in.officer_tier,
        approval_limit_egp=user_in.approval_limit_egp,
        can_override_policy=user_in.can_override_policy or False,
        avatar=user_in.avatar,
        title=user_in.title,
        title_en=user_in.title_en,
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user


def update_user_permissions(db: Session, user: User, update_data: dict) -> User:
    for field, value in update_data.items():
        if value is not None and hasattr(user, field):
            setattr(user, field, value)
    db.commit()
    db.refresh(user)
    return user

