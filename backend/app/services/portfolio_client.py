"""Client for Portfolio Analytics Service."""

import httpx
from typing import Any, Dict
from app.config import settings


async def get_portfolio_kpis(timeout_sec: float = 15.0) -> Dict[str, Any]:
    """Retrieve overall portfolio volume, active loans, and NPL ratios."""
    url = f"{settings.PORTFOLIO_ANALYTICS_SERVICE_URL.rstrip('/')}/api/v1/portfolio/kpis"
    async with httpx.AsyncClient(timeout=timeout_sec) as client:
        res = await client.get(url)
        res.raise_for_status()
        return res.json()


async def get_portfolio_concentration(timeout_sec: float = 15.0) -> Dict[str, Any]:
    """Retrieve product breakdown and status distribution."""
    url = f"{settings.PORTFOLIO_ANALYTICS_SERVICE_URL.rstrip('/')}/api/v1/portfolio/concentration"
    async with httpx.AsyncClient(timeout=timeout_sec) as client:
        res = await client.get(url)
        res.raise_for_status()
        return res.json()


async def get_portfolio_drift(timeout_sec: float = 15.0) -> Dict[str, Any]:
    """Retrieve model stability and drift statistics (PSI)."""
    url = f"{settings.PORTFOLIO_ANALYTICS_SERVICE_URL.rstrip('/')}/api/v1/portfolio/drift"
    async with httpx.AsyncClient(timeout=timeout_sec) as client:
        res = await client.get(url)
        res.raise_for_status()
        return res.json()


async def run_portfolio_stress_test(payload: Dict[str, Any], timeout_sec: float = 20.0) -> Dict[str, Any]:
    """Execute macroeconomic stress simulation on current portfolio."""
    url = f"{settings.PORTFOLIO_ANALYTICS_SERVICE_URL.rstrip('/')}/api/v1/portfolio/stress-test"
    async with httpx.AsyncClient(timeout=timeout_sec) as client:
        res = await client.post(url, json=payload)
        res.raise_for_status()
        return res.json()
