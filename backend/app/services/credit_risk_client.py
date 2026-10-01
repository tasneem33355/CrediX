"""Client for Credit Risk ML Scoring Service."""

import httpx
from typing import Any, Dict
from app.config import settings


async def score_credit_risk(
    ocr_payload: Dict[str, Any],
    timeout_sec: float = 30.0,
) -> Dict[str, Any]:
    """Invoke the Credit Risk ML System to score a new customer application."""
    url = f"{settings.CREDIT_RISK_SERVICE_URL.rstrip('/')}/api/v1/score/new-customer"

    async with httpx.AsyncClient(timeout=timeout_sec) as client:
        try:
            response = await client.post(url, json=ocr_payload)
            response.raise_for_status()
            return response.json()
        except httpx.HTTPStatusError as exc:
            # If service returns validation error or failure, return clean fallback with error detail
            return {
                "error": True,
                "status_code": exc.response.status_code,
                "detail": exc.response.text,
                "credit_score": 650,
                "default_probability": 0.15,
                "decision": "MANUAL REVIEW",
                "risk_tier": "Medium Risk",
                "reason_codes": ["External scoring service returned non-200 status"],
            }
        except Exception as exc:
            return {
                "error": True,
                "detail": str(exc),
                "credit_score": 650,
                "default_probability": 0.15,
                "decision": "MANUAL REVIEW",
                "risk_tier": "Medium Risk",
                "reason_codes": [f"Scoring service call failed: {str(exc)}"],
            }
