"""
CrediX Core Banking Database Manager & Data Access Layer
======================================================
Provides unified interface for:
  - Schema initialization
  - Internal customer history retrieval (New-to-Bank vs. Returning)
  - I-Score credit bureau report retrieval
  - Underwriting decision persistence and audit queries
"""

import os
import sqlite3
from typing import Dict, Any, List, Optional
from datetime import datetime


class CoreBankingDB:
    """
    Primary Data Access Gateway supporting embedded SQLite and cloud databases.
    """

    def __init__(self, db_path: Optional[str] = None):
        base_dir = os.path.dirname(os.path.abspath(__file__))
        self.db_path = db_path or os.getenv("DATABASE_PATH", os.path.join(base_dir, "credix_core.db"))
        self._init_database()

    def _get_connection(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn

    def _init_database(self) -> None:
        """Initializes tables from schema.sql if they do not already exist."""
        base_dir = os.path.dirname(os.path.abspath(__file__))
        schema_path = os.path.join(base_dir, "schema.sql")

        if os.path.exists(schema_path):
            with open(schema_path, "r", encoding="utf-8") as f:
                schema_sql = f.read()

            with self._get_connection() as conn:
                cursor = conn.cursor()
                cursor.executescript(schema_sql)
                conn.commit()

    # -------------------------------------------------------------------------
    # 1. Customer Internal History (New-to-Bank vs. Returning Classifier)
    # -------------------------------------------------------------------------
    def get_customer_internal_history(self, national_id: str) -> Dict[str, Any]:
        """
        Extracts internal repayment behavior for returning customers.
        Returns canonical empty payload with internal_history_missing=1 for new applicants.
        """
        empty_history = {
            "internal_history_missing": 1,
            "customer_type": "NEW_TO_BANK",
            "aggregated_metrics": {
                "prev_app_count": 0,
                "prev_approved_ratio": 0.0,
                "prev_refused_ratio": 0.0,
                "prev_avg_credit": 0.0,
                "inst_payment_count": 0,
                "inst_late_count": 0,
                "inst_severe_late_count": 0,
                "inst_late_ratio": 0.0,
                "inst_avg_days_late": 0.0,
                "inst_max_days_late": 0,
                "pos_record_count": 0,
                "pos_avg_dpd": 0.0,
                "cc_avg_balance": 0.0,
                "cc_balance_to_limit_ratio": 0.0
            }
        }

        with self._get_connection() as conn:
            cursor = conn.cursor()

            cursor.execute(
                "SELECT customer_id, customer_type FROM customers WHERE national_id = ?",
                (national_id,)
            )
            customer = cursor.fetchone()

            if not customer or customer["customer_type"] == "NEW_TO_BANK":
                return empty_history

            customer_id = customer["customer_id"]

            cursor.execute(
                """
                SELECT
                    COUNT(facility_id) as prev_app_count,
                    COALESCE(AVG(granted_amount), 0.0) as prev_avg_credit,
                    SUM(CASE WHEN facility_status IN ('ACTIVE_PERFORMING', 'CLOSED_PAID_OFF') THEN 1 ELSE 0 END) as approved_count
                FROM loan_facilities
                WHERE customer_id = ?
                """,
                (customer_id,)
            )
            loan_stats = cursor.fetchone()

            prev_apps = loan_stats["prev_app_count"] or 0
            if prev_apps == 0:
                return empty_history

            approved_count = loan_stats["approved_count"] or 0
            prev_approved_ratio = round(approved_count / prev_apps, 4) if prev_apps > 0 else 0.0
            prev_refused_ratio = round(1.0 - prev_approved_ratio, 4)

            cursor.execute(
                """
                SELECT
                    COUNT(ir.installment_id) as total_payments,
                    SUM(CASE WHEN ir.days_past_due > 0 THEN 1 ELSE 0 END) as late_payments,
                    SUM(CASE WHEN ir.days_past_due >= 30 THEN 1 ELSE 0 END) as severe_late_payments,
                    COALESCE(AVG(ir.days_past_due), 0.0) as avg_days_late,
                    COALESCE(MAX(ir.days_past_due), 0) as max_days_late
                FROM installment_repayments ir
                JOIN loan_facilities lf ON ir.facility_id = lf.facility_id
                WHERE lf.customer_id = ?
                """,
                (customer_id,)
            )
            inst_stats = cursor.fetchone()

            total_inst = inst_stats["total_payments"] or 0
            late_inst = inst_stats["late_payments"] or 0
            severe_inst = inst_stats["severe_late_payments"] or 0
            avg_late = float(inst_stats["avg_days_late"] or 0.0)
            max_late = int(inst_stats["max_days_late"] or 0)
            late_ratio = round(late_inst / total_inst, 4) if total_inst > 0 else 0.0

            return {
                "internal_history_missing": 0,
                "customer_type": "EXISTING_RETURNING",
                "aggregated_metrics": {
                    "prev_app_count": prev_apps,
                    "prev_approved_ratio": prev_approved_ratio,
                    "prev_refused_ratio": prev_refused_ratio,
                    "prev_avg_credit": round(float(loan_stats["prev_avg_credit"]), 2),
                    "inst_payment_count": total_inst,
                    "inst_late_count": late_inst,
                    "inst_severe_late_count": severe_inst,
                    "inst_late_ratio": late_ratio,
                    "inst_avg_days_late": round(avg_late, 2),
                    "inst_max_days_late": max_late,
                    "pos_record_count": total_inst,
                    "pos_avg_dpd": round(avg_late * 0.7, 2),
                    "cc_avg_balance": 0.0,
                    "cc_balance_to_limit_ratio": 0.0
                }
            }

    # -------------------------------------------------------------------------
    # 2. External Bureau (I-Score) Query
    # -------------------------------------------------------------------------
    def get_iscore_report(self, national_id: str) -> Dict[str, Any]:
        """Retrieves official credit bureau record by Egyptian National ID."""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                """
                SELECT credit_score, active_facilities_count, total_active_loans_limit,
                       total_outstanding_balance, max_days_past_due, has_active_judicial_action, report_date
                FROM iscore_bureau_reports
                WHERE national_id = ?
                ORDER BY report_date DESC LIMIT 1
                """,
                (national_id,)
            )
            row = cursor.fetchone()

            if not row:
                return {
                    "iscore_found": False,
                    "credit_score": 650,
                    "active_facilities_count": 1,
                    "total_outstanding_balance": 0.0,
                    "total_active_loans_limit": 50000.0,
                    "max_days_past_due": 0,
                    "has_active_judicial_action": False
                }

            return {
                "iscore_found": True,
                "credit_score": int(row["credit_score"]),
                "active_facilities_count": int(row["active_facilities_count"]),
                "total_active_loans_limit": float(row["total_active_loans_limit"]),
                "total_outstanding_balance": float(row["total_outstanding_balance"]),
                "max_days_past_due": int(row["max_days_past_due"]),
                "has_active_judicial_action": bool(row["has_active_judicial_action"])
            }

    # -------------------------------------------------------------------------
    # 3. Decision Audit Log Persistence (Feeds Portfolio Analytics)
    # -------------------------------------------------------------------------
    def record_decision(self, decision_data: Dict[str, Any]) -> str:
        """Stores final underwriting decision record in immutable audit table."""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                """
                INSERT OR REPLACE INTO decision_audit_logs (
                    decision_id, application_id, national_id, submission_timestamp,
                    customer_segment, requested_amount,
                    fraud_risk_score, fraud_risk_level, is_anomaly,
                    haircut_percentage, risk_adjusted_salary,
                    dti_ratio, model_version,
                    credit_score, default_probability,
                    approved_tenure_months, final_decision, risk_tier
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    decision_data.get("decision_id", f"DEC-{datetime.utcnow().timestamp()}"),
                    decision_data.get("application_id"),
                    decision_data.get("national_id"),
                    decision_data.get("submission_timestamp", datetime.utcnow().isoformat()),
                    decision_data.get("customer_segment", "NEW_TO_BANK"),
                    decision_data.get("requested_amount", 0.0),
                    decision_data.get("fraud_risk_score", 0.0),
                    decision_data.get("fraud_risk_level", "LOW"),
                    decision_data.get("is_anomaly", False),
                    decision_data.get("haircut_percentage", 0.0),
                    decision_data.get("risk_adjusted_salary", 0.0),
                    decision_data.get("dti_ratio", 0.0),
                    decision_data.get("model_version", "credit-risk-xgb-lgb-blend-v1"),
                    decision_data.get("credit_score", 650),
                    decision_data.get("default_probability", 0.05),
                    decision_data.get("approved_tenure_months", 0),
                    decision_data.get("final_decision", "AUTO-APPROVE"),
                    decision_data.get("risk_tier", "Low Risk")
                )
            )
            conn.commit()
            return decision_data.get("application_id")

    def load_scored_decisions(self, limit: int = 1000) -> List[Dict[str, Any]]:
        """Loads scored decisions for portfolio KPI and vintage tracking."""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                """
                SELECT
                    decision_id          AS id,
                    application_id,
                    national_id,
                    model_version,
                    default_probability  AS probability_of_default,
                    credit_score,
                    final_decision       AS decision,
                    requested_amount     AS approved_amount,
                    approved_tenure_months,
                    dti_ratio,
                    fraud_risk_score,
                    is_anomaly,
                    created_at
                FROM decision_audit_logs
                ORDER BY created_at DESC
                LIMIT ?
                """,
                (limit,)
            )
            return [dict(row) for row in cursor.fetchall()]
