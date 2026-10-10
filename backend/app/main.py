"""FastAPI Main Application Entrypoint for CrediX Banking API."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.api.api import api_router


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="""
# CrediX Private Banking Backend API

FastAPI backend service powering the CrediX smart credit & financing analysis platform.

## Features & Modules:
- **Authentication & Roles**: Credit Officer & Applicant Portal user profiles.
- **Loan Applications**: Application intake, OCR extraction data, credit scoring factors, fraud risk signals, and officer decisions.
- **Document Management**: Document metadata, upload status, and OCR bounding data.
- **Fraud Detection**: Flagged anomaly cases and explainable risk signals.
- **Case Management (Kanban)**: Multi-column processing pipeline with status progression.
- **AI Copilot Assistant**: RAG document chat sessions with citations and action recommendations.
- **Executive Analytics**: Real-time KPI summaries, 30-day volume trends, and loan type breakdowns.
""",
    docs_url=None if settings.is_production else "/docs",
    redoc_url=None if settings.is_production else "/redoc",
    openapi_url=None if settings.is_production else "/openapi.json",
)

# Explicit local origins are required because credentials are enabled.
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API Routers
app.include_router(api_router, prefix=settings.API_V1_PREFIX)


@app.on_event("startup")
def on_startup():
    """Ensure database schema has recent column migrations."""
    from app.database import ensure_schema_compatibility
    ensure_schema_compatibility()



@app.get("/", tags=["Health & Status"])
def root():
    """Root health check endpoint."""
    return {
        "status": "online",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "docs_url": None if settings.is_production else "/docs",
        "api_v1": settings.API_V1_PREFIX,
    }


@app.get("/health", tags=["Health & Status"])
def health_check():
    """Unauthenticated process health check; it does not call external services."""
    return {
        "status": "ok",
        "service": settings.SERVICE_NAME,
    }
