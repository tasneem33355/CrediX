"""Cryptographic Supabase access-token verification using the project's JWKS."""

from __future__ import annotations

from typing import Any

import jwt
from jwt import PyJWKClient
from jwt.exceptions import ExpiredSignatureError, InvalidTokenError, PyJWTError

from app.auth.claims import AuthClaims
from app.config import Settings, settings


class SupabaseJWTVerificationError(Exception):
    """A non-sensitive JWT verification failure suitable for API handling."""

    def __init__(self, message: str = "Invalid or expired access token") -> None:
        super().__init__(message)
        self.message = message


class SupabaseJWTConfigurationError(Exception):
    """Raised when JWT verification is requested before Supabase is configured."""


class SupabaseJWTVerifier:
    """Verify asymmetric Supabase JWTs and cache JWKS/key resolution in-process.

    PyJWKClient caches JWKS responses and refreshes when an unknown ``kid`` is
    encountered, allowing normal signing-key rotation without pinned keys.
    """

    _allowed_algorithms = ["RS256", "RS384", "RS512", "ES256", "ES384", "ES512", "EdDSA"]

    def __init__(self, app_settings: Settings = settings) -> None:
        self._settings = app_settings
        self._jwks_client: PyJWKClient | None = None

    def _get_jwks_client(self) -> PyJWKClient:
        try:
            jwks_url = self._settings.supabase_jwks_url
        except ValueError as error:
            raise SupabaseJWTConfigurationError from error

        if self._jwks_client is None:
            self._jwks_client = PyJWKClient(
                jwks_url,
                cache_keys=True,
                cache_jwk_set=True,
                lifespan=600,
            )
        return self._jwks_client

    def verify_access_token(self, token: str) -> AuthClaims:
        """Verify signature, issuer, audience, expiration, and required claims."""
        try:
            signing_key = self._get_jwks_client().get_signing_key_from_jwt(token)
            claims: dict[str, Any] = jwt.decode(
                token,
                signing_key.key,
                algorithms=self._allowed_algorithms,
                audience=self._settings.SUPABASE_JWT_AUDIENCE,
                issuer=self._settings.supabase_issuer,
                options={"require": ["sub", "iss", "aud", "exp"]},
            )
            return AuthClaims.model_validate(claims)
        except SupabaseJWTConfigurationError:
            raise
        except ExpiredSignatureError as error:
            raise SupabaseJWTVerificationError("Access token has expired") from error
        except (InvalidTokenError, PyJWTError, ValueError) as error:
            raise SupabaseJWTVerificationError() from error
