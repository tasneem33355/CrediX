"""
CrediX Database Microservice API Router
======================================
Endpoints for:
  - Fetching customer profiles and internal repayment history
  - Retrieving I-Score credit bureau records
  - Logging underwriting decisions for audit and portfolio analysis
  - Feeding core banking portfolio KPIs to portfolio-analytics-service
"""

from fastapi import APIRouter, HTTPException, Query
from typing import Dict, Any, List, Optional
import os
import sys

# Ensure database directory is importable
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
if CURRENT_DIR not in sys.path:
    sys.path.insert(0, CURRENT_DIR)

from db_manager import CoreBankingDB

router = APIRouter(prefix="/api/v1/db", tags=["Core Banking Database"])
db = CoreBankingDB()


@router.get("/health")
def db_health():
    """Confirms database connectivity and tables readiness."""
    try:
        with db._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT COUNT(*) FROM customers")
            count = cursor.fetchone()[0]
        return {"status": "connected", "total_registered_customers": count}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database connection error: {str(e)}")


@router.get("/customer/{national_id}")
def get_customer_profile(national_id: str):
    """
    Retrieves complete customer profile including:
      - Demographic and employment information
      - Internal repayment history (flags NEW_TO_BANK vs. EXISTING_RETURNING)
      - Latest I-Score credit bureau inquiry
    """
    with db._get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT customer_id, national_id, customer_type, full_name_ar, full_name_en,
                   gender, birth_date, governorate, declared_employer, job_title,
                   tenure_years, declared_monthly_salary
            FROM customers WHERE national_id = ?
            """,
            (national_id,)
        )
        row = cursor.fetchone()

        if not row:
            # Fallback for completely brand-new unregistered applicant
            return {
                "found_in_core_banking": False,
                "national_id": national_id,
                "customer_type": "NEW_TO_BANK",
                "internal_history": db.get_customer_internal_history(national_id),
                "iscore_report": db.get_iscore_report(national_id)
            }

        cust_dict = dict(row)
        cust_dict["found_in_core_banking"] = True
        cust_dict["internal_history"] = db.get_customer_internal_history(national_id)
        cust_dict["iscore_report"] = db.get_iscore_report(national_id)
        return cust_dict


@router.post("/decision/log")
def log_decision(decision_payload: Dict[str, Any]):
    """Stores completed underwriting decision for portfolio KPI calculation."""
    try:
        app_id = db.record_decision(decision_payload)
        return {"status": "recorded", "application_id": app_id}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to record decision: {str(e)}")


@router.get("/decisions/history")
def get_decision_history(limit: int = Query(default=500, le=5000)):
    """Fetches scored decisions log for portfolio analytics."""
    return db.load_scored_decisions(limit=limit)


@router.get("/portfolio/core-data")
def get_core_banking_portfolio_data():
    """
    Direct live database feeder for portfolio-analytics-service.
    Replaces static Excel mockups by extracting active loan facilities and balances.
    """
    with db._get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT lf.facility_id, lf.customer_id, c.national_id, c.customer_type,
                   lf.contract_type, lf.granted_amount, lf.granted_date, lf.tenor_months,
                   lf.facility_status, lf.historical_max_dpd, c.declared_monthly_salary,
                   c.declared_employer, c.governorate
            FROM loan_facilities lf
            JOIN customers c ON lf.customer_id = c.customer_id
            """
        )
        loans = [dict(r) for r in cursor.fetchall()]

        cursor.execute(
            """
            SELECT a.account_id, a.customer_id, a.account_type, a.current_balance,
                   a.avg_monthly_balance, a.balance_volatility_std, a.income_regularity_score
            FROM accounts a
            """
        )
        accounts = [dict(r) for r in cursor.fetchall()]

        return {
            "source": "CrediX Live Core Banking SQL Database",
            "total_active_loans": len(loans),
            "loans": loans,
            "accounts": accounts
        }
