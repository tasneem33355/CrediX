"""Client for the Credit Risk ML Scoring Service.

There is no local fallback: if the service fails the caller receives an
ExternalServiceError and no score or probability is invented.
"""

from typing import Any, Dict

import httpx

from app.config import settings
from app.services.service_errors import ExternalServiceError


async def score_credit_risk(payload: Dict[str, Any], timeout_sec: float = 30.0) -> Dict[str, Any]:
    """Score a new-to-bank customer application with the credit risk model."""
    url = f"{settings.CREDIT_RISK_SERVICE_URL.rstrip('/')}/api/v1/score/new-customer"
    try:
        async with httpx.AsyncClient(timeout=timeout_sec) as client:
            response = await client.post(url, json=payload)
    except httpx.TimeoutException as exc:
        raise ExternalServiceError("credit_risk", 503, "Credit risk service timed out") from exc
    except httpx.HTTPError as exc:
        raise ExternalServiceError("credit_risk", 503, f"Credit risk service unreachable: {exc}") from exc

    if response.status_code != 200:
        status = 422 if response.status_code == 422 else 503
        raise ExternalServiceError("credit_risk", status, response.text[:500])
    return response.json()
