"""Aggregated API Router."""

from fastapi import APIRouter
from app.api.v1 import auth, applications, documents, fraud, cases, chat, dashboard, ocr

api_router = APIRouter()

api_router.include_router(auth.router)
api_router.include_router(applications.router)
api_router.include_router(documents.router)
api_router.include_router(fraud.router)
api_router.include_router(cases.router)
api_router.include_router(chat.router)
api_router.include_router(dashboard.router)
api_router.include_router(ocr.router)

