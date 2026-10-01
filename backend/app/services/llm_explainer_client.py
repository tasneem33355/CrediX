"""Client for LLM Explainer Service."""

import httpx
from typing import Any, Dict
from app.config import settings


async def generate_explanation(
    credit_risk_data: Dict[str, Any],
    fraud_data: Dict[str, Any],
    lang: str = "ar",
    timeout_sec: float = 45.0,
) -> Dict[str, Any]:
    """Generate underwriting decision explanation via LLM Explainer."""
    url = f"{settings.LLM_EXPLAINER_SERVICE_URL.rstrip('/')}/explain"
    payload = {
        "blocks": [
            {"type": "credit_risk", "data": credit_risk_data},
            {"type": "fraud", "data": fraud_data},
        ],
        "lang": lang,
    }

    async with httpx.AsyncClient(timeout=timeout_sec) as client:
        try:
            response = await client.post(url, json=payload)
            response.raise_for_status()
            return response.json()
        except Exception as exc:
            return {
                "answer": f"تعذر استخراج التفسير الآلي بسبب عدم استجابة خدمة LLM Explainer ({str(exc)})",
                "language": lang,
                "error": True,
            }
