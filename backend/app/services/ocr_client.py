"""Client for Document OCR Service."""

import httpx
from typing import Any, Dict, Optional
from app.config import settings


async def call_ocr_service(
    files: Dict[str, Any],
    application_id: str,
    timeout_sec: float = 60.0,
) -> Dict[str, Any]:
    """Forward uploaded credit document files to the external OCR service.

    Expected files:
    - national_id_front_file
    - national_id_back_file
    - salary_certificate_file
    - bank_statement_file
    - iscore_file
    """
    url = f"{settings.OCR_SERVICE_URL.rstrip('/')}/api/v1/ocr/process-documents"
    data = {"application_id": application_id}

    async with httpx.AsyncClient(timeout=timeout_sec) as client:
        response = await client.post(url, data=data, files=files)
        response.raise_for_status()
        return response.json()
