"""Reusable FastAPI dependencies for verified Supabase identities and DB roles."""

from typing import Callable

from fastapi import Depends, Header, HTTPException, status
from sqlalchemy.orm import Session

from app.auth.claims import AuthClaims
from app.auth.jwt_verifier import (
    SupabaseJWTConfigurationError,
    SupabaseJWTVerificationError,
    SupabaseJWTVerifier,
)
from app.crud.crud_user import get_user_by_external_auth_id
from app.database import get_db
from app.models.user import User


_jwt_verifier = SupabaseJWTVerifier()


def get_jwt_verifier() -> SupabaseJWTVerifier:
    """Dependency boundary that tests can override without calling Supabase."""
    return _jwt_verifier


def _unauthorized(message: str) -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail={"code": "INVALID_AUTH_TOKEN", "message": message},
        headers={"WWW-Authenticate": "Bearer"},
    )


def get_auth_claims(
    authorization: str | None = Header(default=None),
    verifier: SupabaseJWTVerifier = Depends(get_jwt_verifier),
) -> AuthClaims:
    """Parse and verify one Bearer access token without trusting raw claims."""
    if not authorization:
        raise _unauthorized("Authorization Bearer token is required")

    parts = authorization.strip().split()
    if len(parts) != 2 or parts[0].lower() != "bearer" or not parts[1]:
        raise _unauthorized("Authorization header must use Bearer token format")

    try:
        return verifier.verify_access_token(parts[1])
    except SupabaseJWTConfigurationError as error:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={"code": "AUTH_NOT_CONFIGURED", "message": "Supabase JWT verification is not configured"},
        ) from error
    except SupabaseJWTVerificationError as error:
        raise _unauthorized(error.message) from error


def get_current_user(
    claims: AuthClaims = Depends(get_auth_claims),
    db: Session = Depends(get_db),
) -> User:
    """Load a CrediX profile using verified ``sub`` -> ``external_auth_id``."""
    user = get_user_by_external_auth_id(db, claims.sub)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "code": "PROFILE_NOT_PROVISIONED",
                "message": "No CrediX profile is provisioned for this authenticated identity",
            },
        )
    return user


def require_role(*allowed_roles: str) -> Callable[..., User]:
    """Return a dependency that authorizes against the operational DB role only."""
    allowed = frozenset(allowed_roles)

    def role_dependency(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in allowed:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={"code": "INSUFFICIENT_ROLE", "message": "Your profile role cannot access this resource"},
            )
        return current_user

    return role_dependency


# Reusable role guards. Authorization is always the operational DB role
# (users.role), never a role claim coming from the token or the request.
require_officer = require_role("officer")
require_authenticated_user = require_role("officer", "client")


def is_officer(user: User) -> bool:
    return user.role == "officer"
