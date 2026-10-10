"""Client for the Fraud Detection Service (POST /api/v1/fraud/evaluate).

There is no local fallback: if the service is unavailable the caller receives an
ExternalServiceError and no fraud score is invented.
"""

from typing import Any, Dict

import httpx

from app.config import settings
from app.services.service_errors import ExternalServiceError


async def score_fraud(payload: Dict[str, Any], timeout_sec: float = 30.0) -> Dict[str, Any]:
    """Evaluate an application payload for fraud risk using the remote service."""
    base = (settings.FRAUD_SERVICE_URL or "").rstrip("/")
    if not base:
        raise ExternalServiceError("fraud", 503, "FRAUD_SERVICE_URL is not configured")

    url = f"{base}/api/v1/fraud/evaluate"
    try:
        async with httpx.AsyncClient(timeout=timeout_sec) as client:
            response = await client.post(url, json=payload)
    except httpx.TimeoutException as exc:
        raise ExternalServiceError("fraud", 503, "Fraud service timed out") from exc
    except httpx.HTTPError as exc:
        raise ExternalServiceError("fraud", 503, f"Fraud service unreachable: {exc}") from exc

    if response.status_code != 200:
        status = 422 if response.status_code == 422 else 503
        raise ExternalServiceError("fraud", status, response.text[:500])
    return response.json()
