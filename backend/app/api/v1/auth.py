"""Authentication & User Endpoints."""

from typing import List
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from app.database import get_db
from app.auth.claims import AuthClaims
from app.auth.dependencies import get_auth_claims, get_current_user as get_authenticated_user
from app.crud.crud_user import (
    create_user,
    get_user_by_email,
    get_user_by_external_auth_id,
    get_user_by_id,
    get_users,
)
from app.models.user import User
from app.schemas.user import UserResponse, UserCreate, LoginRequest

router = APIRouter(prefix="", tags=["Authentication & Users"])


@router.post("/auth/login", response_model=UserResponse, deprecated=True)
def login(login_data: LoginRequest, db: Session = Depends(get_db)):
    """DEMO/LEGACY ONLY: return a demo profile; this does not authenticate users."""
    # If real email is provided (not empty and not the default Swagger placeholder 'string')
    if login_data.email and "@" in login_data.email and login_data.email != "string":
        user = get_user_by_email(db, login_data.email)
        if user:
            return user

    # Default role lookup for immediate testing (e.g. 'officer' or 'client')
    role = login_data.role or "officer"
    target_id = "usr_officer_01" if role == "officer" else "usr_client_01"
    user = get_user_by_id(db, target_id)
    if not user:
        # Fallback to first user with that role
        users = get_users(db)
        for u in users:
            if u.role == role:
                return u
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return user


@router.get("/auth/me", response_model=UserResponse)
def get_current_user(current_user: User = Depends(get_authenticated_user)):
    """Return the CrediX profile mapped from a verified Supabase Bearer token."""
    return current_user


@router.post("/auth/provision", response_model=UserResponse)
def provision_client_profile(
    claims: AuthClaims = Depends(get_auth_claims),
    db: Session = Depends(get_db),
):
    """Create or return the client profile for one verified Supabase subject.

    The JWT subject is the only authoritative identity. Public provisioning can
    never create an officer/admin profile or accept a role from the request.
    """
    if claims.email_verified is False:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "code": "EMAIL_NOT_VERIFIED",
                "message": "Email verification is required before profile provisioning",
            },
        )

    email = (claims.email or "").strip().lower()
    if not email:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"code": "EMAIL_CLAIM_REQUIRED", "message": "A verified email claim is required"},
        )

    existing_by_subject = get_user_by_external_auth_id(db, claims.sub)
    if existing_by_subject:
        if existing_by_subject.role != "client":
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail={
                    "code": "PRIVILEGED_PROFILE_CANNOT_BE_PROVISIONED",
                    "message": "This identity is reserved for an institution-controlled profile",
                },
            )
        return existing_by_subject

    existing_by_email = get_user_by_email(db, email)
    if existing_by_email:
        if existing_by_email.role != "client":
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail={
                    "code": "PRIVILEGED_EMAIL_COLLISION",
                    "message": "This email is already assigned to an institution-controlled profile",
                },
            )
        if existing_by_email.external_auth_id and existing_by_email.external_auth_id != claims.sub:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail={
                    "code": "EMAIL_ALREADY_LINKED",
                    "message": "This email is already linked to another authenticated identity",
                },
            )
        existing_by_email.external_auth_id = claims.sub
        try:
            db.commit()
        except IntegrityError:
            db.rollback()
            raced_subject = get_user_by_external_auth_id(db, claims.sub)
            if raced_subject and raced_subject.role == "client":
                return raced_subject
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail={"code": "PROFILE_CONFLICT", "message": "A profile could not be safely provisioned"},
            )
        db.refresh(existing_by_email)
        return existing_by_email

    metadata = claims.user_metadata or {}
    display_name = str(metadata.get("full_name") or "").strip()
    if not display_name:
        display_name = email.split("@", 1)[0] or "CrediX Client"

    new_user = User(
        id=f"usr_client_{uuid4().hex[:12]}",
        name=display_name[:100],
        name_en=display_name[:100],
        email=email[:150],
        external_auth_id=claims.sub,
        role="client",
        title="مقدم طلب تمويل",
        title_en="Financing Applicant",
    )
    db.add(new_user)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raced_subject = get_user_by_external_auth_id(db, claims.sub)
        if raced_subject:
            if raced_subject.role != "client":
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail={"code": "PRIVILEGED_PROFILE_CANNOT_BE_PROVISIONED", "message": "Profile conflict"},
                )
            return raced_subject
        raced_email = get_user_by_email(db, email)
        if raced_email and raced_email.role == "client" and not raced_email.external_auth_id:
            raced_email.external_auth_id = claims.sub
            db.commit()
            db.refresh(raced_email)
            return raced_email
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={"code": "PROFILE_CONFLICT", "message": "A profile could not be safely provisioned"},
        )
    db.refresh(new_user)
    return new_user


@router.get("/users", response_model=List[UserResponse])
def list_users(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """List registered users."""
    return get_users(db, skip=skip, limit=limit)


@router.post("/users", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register_user(user_in: UserCreate, db: Session = Depends(get_db)):
    """Register a new user."""
    existing = get_user_by_email(db, user_in.email)
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")
    return create_user(db, user_in)
