"""Minimal, verified Supabase access-token claims used by CrediX."""

from typing import Any, Union

from pydantic import BaseModel, ConfigDict, Field


class AuthClaims(BaseModel):
    """Claims accepted only after cryptographic JWT verification."""

    sub: str = Field(min_length=1)
    email: str | None = None
    email_verified: bool | None = None
    user_metadata: dict[str, Any] | None = None
    aud: Union[str, list[str]]
    iss: str
    exp: int

    model_config = ConfigDict(extra="ignore")
