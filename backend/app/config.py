"""Application configuration loaded from environment variables."""

import json
from typing import List
from pydantic import model_validator
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

    # DEMO/LEGACY ONLY. /auth/login returns a profile without authenticating anyone,
    # so it is disabled unless explicitly enabled (local demos and the test-suite).
    ENABLE_LEGACY_LOGIN: bool = False

    # External ML & AI Services
    OCR_SERVICE_URL: str = "https://document-ocr-service-production-93e9.up.railway.app"
    CREDIT_RISK_SERVICE_URL: str = "https://credit-risk-ml-system-v1-production.up.railway.app"
    LLM_EXPLAINER_SERVICE_URL: str = "https://llm-explainer-service-production.up.railway.app"
    PORTFOLIO_ANALYTICS_SERVICE_URL: str = "https://portfolio-analytics-service-production.up.railway.app"
    FRAUD_SERVICE_URL: str = "https://fraud-detection-service-v1-production.up.railway.app"

    # Indicative pricing, used only to estimate the monthly annuity sent to scoring.
    # Base = CBE overnight lending rate (20% at the 24 Sep 2026 MPC meeting).
    BASE_INTEREST_RATE_PCT: float = 20.0
    LOAN_MARGIN_PCT: float = 4.0

    # Portfolio stress-test assumptions (adjustable without code changes).
    STRESS_BASE_LGD: float = 0.45  # Basel foundation-IRB senior unsecured LGD
    STRESS_PD_SENSITIVITY_PER_100BPS: float = 0.05  # relative PD increase per +100 bps
    
    @property
    def is_production(self) -> bool:
        return self.APP_ENV.lower() in {"production", "prod"}

    @model_validator(mode="after")
    def _validate_production_safety(self) -> "Settings":
        """Fail fast at startup instead of running an unsafe production instance."""
        if self.is_production:
            if not self.SUPABASE_URL:
                raise ValueError("SUPABASE_URL is required when APP_ENV=production")
            if self.ENABLE_LEGACY_LOGIN:
                raise ValueError("ENABLE_LEGACY_LOGIN must be false when APP_ENV=production")
            if self.DATABASE_URL.startswith("sqlite"):
                raise ValueError("SQLite is not allowed when APP_ENV=production")
        return self

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
