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

    Accepts both legacy and standard field names:
    - national_id_front / national_id_front_file
    - national_id_back / national_id_back_file
    - salary_cert / salary_certificate_file
    - bank_statement / bank_statement_file
    - iscore / iscore_file
    """
    url = f"{settings.OCR_SERVICE_URL.rstrip('/')}/api/v1/ocr/process-documents"
    data = {"application_id": application_id}

    # Normalize file keys to match the active OCR service schema
    normalized_files = {}
    key_mapping = {
        "national_id_front_file": "national_id_front",
        "national_id_back_file": "national_id_back",
        "salary_certificate_file": "salary_cert",
        "bank_statement_file": "bank_statement",
        "iscore_file": "iscore",
    }
    for k, v in files.items():
        mapped_key = key_mapping.get(k, k)
        normalized_files[mapped_key] = v

    async with httpx.AsyncClient(timeout=timeout_sec) as client:
        response = await client.post(url, data=data, files=normalized_files)
        response.raise_for_status()
        return response.json()
