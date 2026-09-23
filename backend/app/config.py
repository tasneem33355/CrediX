"""Application configuration loaded from environment variables."""

import json
from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    PROJECT_NAME: str = "CrediX Banking API"
    SERVICE_NAME: str = "credix-backend"
    VERSION: str = "1.0.0"
    APP_ENV: str = "development"
    API_V1_PREFIX: str = "/api/v1"

    # The single source of truth for the synchronous SQLAlchemy connection.
    # Local development uses PostgreSQL; tests override this with SQLite.
    DATABASE_URL: str

    # Comma-separated, explicit browser origins. Wildcards are never a fallback.
    CORS_ORIGINS: str = "http://localhost:3000"
    SUPABASE_URL: str = ""
    SUPABASE_JWT_AUDIENCE: str = "authenticated"

    @property
    def supabase_issuer(self) -> str:
        """Return the issuer expected on Supabase user access tokens."""
        if not self.SUPABASE_URL:
            raise ValueError("SUPABASE_URL must be configured for JWT verification")
        return f"{self.SUPABASE_URL.rstrip('/')}/auth/v1"

    @property
    def supabase_jwks_url(self) -> str:
        """Return the public JWKS discovery endpoint for the configured project."""
        return f"{self.supabase_issuer}/.well-known/jwks.json"

    @property
    def cors_origins(self) -> List[str]:
        """Return normalized explicit origins for FastAPI's CORS middleware."""
        raw_origins = self.CORS_ORIGINS.strip()
        if raw_origins.startswith("["):
            try:
                configured_origins = json.loads(raw_origins)
            except json.JSONDecodeError as error:
                raise ValueError("CORS_ORIGINS must be a comma-separated string or JSON string list") from error
            if not isinstance(configured_origins, list) or not all(isinstance(origin, str) for origin in configured_origins):
                raise ValueError("CORS_ORIGINS JSON value must be a list of strings")
        else:
            configured_origins = raw_origins.split(",")

        origins = [origin.strip().rstrip("/") for origin in configured_origins if origin.strip()]
        if not origins or "*" in origins:
            raise ValueError("CORS_ORIGINS must contain one or more explicit origins")
        return origins

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )


settings = Settings()
