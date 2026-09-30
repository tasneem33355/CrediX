"""
CrediX Core Banking Realistic Population Seeder
==============================================
Seeds database with calibrated Egyptian retail banking population:
  - 40% New-to-Bank applicants (thin internal files, external bureau only)
  - 60% Returning borrowers (prime, subprime, and restructured loan histories)
  - Granular daily transaction ledgers & installment repayment tracking
  - Historical decision audit trail for immediate Portfolio Analytics availability
"""

import os
import random
import uuid
from datetime import datetime, timedelta
import numpy as np

from db_manager import CoreBankingDB

# Deterministic seed for reproducible population benchmarks
random.seed(42)
np.random.seed(42)

GOVERNORATES = ["Cairo", "Giza", "Alexandria", "Sharqia", "Dakahlia", "Qalyubia", "Gharbia", "Asyut"]
SECTORS = ["Banking / Financial", "Telecommunications", "Government / Public Sector", "Oil & Gas", "Healthcare", "Retail & Commerce"]
COMPANIES = ["Telecom Egypt", "Vodafone Egypt", "National Bank of Egypt", "Banque Misr", "CBE", "Elsewedy Electric", "Ezz Steel", "Dar Al-Fouad"]
JOB_TITLES = ["Software Engineer", "Accountant", "Branch Operations Specialist", "Civil Engineer", "Medical Doctor", "Sales Manager", "Teacher"]


def generate_national_id(birth_year: int, gender: str, gov_code: int = 1) -> str:
    """Generates a valid 14-digit Egyptian National ID matching CBE validation regex."""
    century = "2" if birth_year < 2000 else "3"
    yy = str(birth_year)[2:]
    mm = f"{random.randint(1, 12):02d}"
    dd = f"{random.randint(1, 28):02d}"
    gov = f"{gov_code:02d}"
    seq = f"{random.randint(100, 999):03d}"
    gender_digit = str(random.choice([1, 3, 5, 7, 9]) if gender == "M" else random.choice([2, 4, 6, 8]))
    checksum = str(random.randint(1, 9))
    return f"{century}{yy}{mm}{dd}{gov}{seq}{gender_digit}{checksum}"


def seed_database(num_customers: int = 500):
    print(f"[*] Initializing database and seeding {num_customers} realistic banking profiles...")
    db = CoreBankingDB()

    with db._get_connection() as conn:
        cursor = conn.cursor()

        # Clean existing test data to ensure pristine state
        cursor.execute("DELETE FROM decision_audit_logs")
        cursor.execute("DELETE FROM iscore_bureau_reports")
        cursor.execute("DELETE FROM installment_repayments")
        cursor.execute("DELETE FROM loan_facilities")
        cursor.execute("DELETE FROM transactions")
        cursor.execute("DELETE FROM accounts")
        cursor.execute("DELETE FROM customers")

        now = datetime.utcnow()

        for i in range(num_customers):
            cust_id = str(uuid.uuid4())
            is_returning = i < int(num_customers * 0.60)
            cust_type = "EXISTING_RETURNING" if is_returning else "NEW_TO_BANK"

            gender = random.choice(["M", "F"])
            birth_year = random.randint(1965, 2002)
            birth_date = f"{birth_year}-{random.randint(1, 12):02d}-{random.randint(1, 28):02d}"
            national_id = generate_national_id(birth_year, gender, random.randint(1, 25))

            employer = random.choice(COMPANIES)
            job = random.choice(JOB_TITLES)
            sector = random.choice(SECTORS)
            tenure = round(random.uniform(1.0, 20.0), 1) if is_returning else round(random.uniform(0.5, 6.0), 1)
            salary = float(round(np.random.gamma(shape=8.0, scale=2500.0), -2)) # Realistic Egyptian salary distribution

            # 1. Insert Customer
            cursor.execute(
                """
                INSERT INTO customers (
                    customer_id, national_id, customer_type, full_name_ar, full_name_en,
                    gender, birth_date, governorate, declared_employer, job_title,
                    tenure_years, declared_monthly_salary
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    cust_id, national_id, cust_type,
                    f"عميل بنكي {i+1}", f"Customer {i+1}",
                    gender, birth_date, random.choice(GOVERNORATES),
                    employer, job, tenure, salary
                )
            )

            # 2. Insert Core Banking Account
            acc_id = str(uuid.uuid4())
            acc_num = f"EG{random.randint(10, 99)}0001{random.randint(10000000, 99999999)}"
            avg_bal = float(round(salary * random.uniform(0.8, 3.2), 2))
            min_bal = float(round(avg_bal * random.uniform(0.1, 0.4), 2))
            max_bal = float(round(avg_bal * random.uniform(1.5, 2.5), 2))
            volat_std = float(round(avg_bal * random.uniform(0.15, 0.45), 2))
            regularity = round(random.uniform(0.80, 0.99), 3)

            cursor.execute(
                """
                INSERT INTO accounts (
                    account_id, customer_id, account_number, account_type, currency,
                    current_balance, avg_monthly_balance, min_monthly_balance, max_monthly_balance,
                    balance_volatility_std, income_regularity_score, payroll_depositor_name, payroll_channel
                ) VALUES (?, ?, ?, 'PAYROLL', 'EGP', ?, ?, ?, ?, ?, ?, ?, 'CORPORATE_ACH')
                """,
                (
                    acc_id, cust_id, acc_num, avg_bal, avg_bal, min_bal,
                    max_bal, volat_std, regularity, employer
                )
            )

            # 3. Insert Realistic Transactions (30 per account)
            curr_b = min_bal
            for t_idx in range(30):
                t_date = (now - timedelta(days=90 - t_idx * 3)).strftime("%Y-%m-%d %H:%M:%S")
                # Monthly recurring salary credit
                if t_idx in [0, 10, 20]:
                    tx_type, amount, channel, desc = "CREDIT", salary, "ACH", f"Salary Transfer - {employer}"
                else:
                    tx_type = "DEBIT"
                    channel = random.choice(["ATM", "POS", "INSTAPAY"])
                    amount = round(random.uniform(45.50, 1850.0), 2)
                    desc = random.choice(["Supermarket POS", "Utility Bill Telecom", "ATM Cash Withdrawal", "Pharmacy Retail"])
                
                curr_b += amount if tx_type == "CREDIT" else -amount
                cursor.execute(
                    """
                    INSERT INTO transactions (transaction_id, account_id, transaction_date, amount, transaction_type, channel, description, balance_after)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (str(uuid.uuid4()), acc_id, t_date, amount, tx_type, channel, desc, max(curr_b, 50.0))
                )

            # 4. If Returning Borrower -> Seed Loan Facilities & Installments
            if is_returning:
                fac_id = str(uuid.uuid4())
                loan_amt = float(round(random.uniform(50000.0, 300000.0), -3))
                tenor = random.choice([12, 24, 36, 48])
                monthly_inst = round((loan_amt * 1.25) / tenor, 2)
                granted_d = (now - timedelta(days=tenor * 30)).strftime("%Y-%m-%d")

                # Define borrower behavior archetype: 85% Prime, 12% Subprime, 3% NPL
                archetype = random.choices(["PRIME", "SUBPRIME", "NPL"], weights=[0.85, 0.12, 0.03])[0]
                fac_status = "DEFAULTED_NPL" if archetype == "NPL" else "ACTIVE_PERFORMING"
                max_dpd = random.randint(60, 120) if archetype == "NPL" else random.randint(5, 25) if archetype == "SUBPRIME" else 0

                cursor.execute(
                    """
                    INSERT INTO loan_facilities (facility_id, customer_id, contract_type, granted_amount, granted_date, tenor_months, facility_status, historical_max_dpd)
                    VALUES (?, ?, 'CASH_LOAN', ?, ?, ?, ?, ?)
                    """,
                    (fac_id, cust_id, loan_amt, granted_d, tenor, fac_status, max_dpd)
                )

                # Seed installment schedule
                num_paid = tenor if fac_status == "CLOSED_PAID_OFF" else min(18, tenor)
                for inst_idx in range(1, num_paid + 1):
                    due_date = (now - timedelta(days=(num_paid - inst_idx) * 30)).strftime("%Y-%m-%d")
                    dpd = 0
                    if archetype == "SUBPRIME" and inst_idx in [4, 9]:
                        dpd = random.randint(5, 20)
                    elif archetype == "NPL" and inst_idx >= 12:
                        dpd = random.randint(60, 95)

                    pay_date = (now - timedelta(days=(num_paid - inst_idx) * 30 - dpd)).strftime("%Y-%m-%d")
                    cursor.execute(
                        """
                        INSERT INTO installment_repayments (installment_id, facility_id, due_date, payment_date, scheduled_amount, paid_amount, days_past_due)
                        VALUES (?, ?, ?, ?, ?, ?, ?)
                        """,
                        (str(uuid.uuid4()), fac_id, due_date, pay_date, monthly_inst, monthly_inst, dpd)
                    )

            # 5. Insert I-Score Credit Bureau Report
            credit_score = random.randint(710, 840) if is_returning else random.randint(580, 750)
            cursor.execute(
                """
                INSERT INTO iscore_bureau_reports (
                    report_id, national_id, report_date, credit_score, active_facilities_count,
                    total_active_loans_limit, total_outstanding_balance, max_days_past_due, has_active_judicial_action
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    str(uuid.uuid4()), national_id, (now - timedelta(days=5)).strftime("%Y-%m-%d"),
                    credit_score, random.randint(1, 4), float(round(salary * 8.0, 2)),
                    float(round(salary * 2.5, 2)), 0, False
                )
            )

            # 6. Insert Historical Decision Audit Log (Provides instant data for Portfolio Analytics)
            if is_returning:
                cursor.execute(
                    """
                    INSERT INTO decision_audit_logs (
                        decision_id, application_id, national_id, submission_timestamp,
                        customer_segment, requested_amount, fraud_risk_score, fraud_risk_level,
                        haircut_percentage, risk_adjusted_salary, credit_score, default_probability,
                        final_decision, risk_tier
                    ) VALUES (?, ?, ?, ?, 'RETURNING', ?, ?, 'LOW', 0.0, ?, ?, ?, 'AUTO-APPROVE', 'Low Risk (Grade A)')
                    """,
                    (
                        str(uuid.uuid4()), f"APP-HIST-2026-{i:05d}", national_id,
                        (now - timedelta(days=random.randint(1, 60))).isoformat(),
                        float(round(salary * 5.0, 2)), round(random.uniform(0.01, 0.08), 4),
                        salary, credit_score, round(random.uniform(0.015, 0.045), 5)
                    )
                )

        conn.commit()
    print("[*] Successfully seeded database with realistic banking population!")


if __name__ == "__main__":
    seed_database(500)
