-- =============================================================================
-- CrediX Enterprise Core Banking & Underwriting Relational Schema
-- Standard: Compatible with SQLite (Native Embedded) & PostgreSQL (Cloud)
-- Version: 1.1.0
-- =============================================================================

-- 1. Primary Customers Table (Differentiates New-to-Bank vs. Returning Borrowers)
CREATE TABLE IF NOT EXISTS customers (
    customer_id VARCHAR(36) PRIMARY KEY,
    national_id VARCHAR(14) UNIQUE NOT NULL,
    customer_type VARCHAR(20) NOT NULL CHECK (customer_type IN ('NEW_TO_BANK', 'EXISTING_RETURNING')),
    full_name_ar VARCHAR(150),
    full_name_en VARCHAR(150),
    gender VARCHAR(1) CHECK (gender IN ('M', 'F')),
    birth_date DATE NOT NULL,
    governorate VARCHAR(50),
    declared_employer VARCHAR(150),
    employer_tax_id VARCHAR(15),
    job_title VARCHAR(100),
    tenure_years NUMERIC(4,1) DEFAULT 0.0,
    declared_monthly_salary NUMERIC(12,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Core Banking Accounts Table
CREATE TABLE IF NOT EXISTS accounts (
    account_id VARCHAR(36) PRIMARY KEY,
    customer_id VARCHAR(36) REFERENCES customers(customer_id),
    account_number VARCHAR(30) UNIQUE NOT NULL,
    account_type VARCHAR(30) NOT NULL,
    currency VARCHAR(3) DEFAULT 'EGP',
    current_balance NUMERIC(14,2) DEFAULT 0.0,
    avg_monthly_balance NUMERIC(14,2) DEFAULT 0.0,
    min_monthly_balance NUMERIC(14,2) DEFAULT 0.0,
    max_monthly_balance NUMERIC(14,2) DEFAULT 0.0,
    balance_volatility_std NUMERIC(14,2) DEFAULT 0.0,
    income_regularity_score NUMERIC(4,3) DEFAULT 1.0,
    payroll_depositor_name VARCHAR(150),
    payroll_channel VARCHAR(30) DEFAULT 'CORPORATE_ACH',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Daily Transactions Ledger
CREATE TABLE IF NOT EXISTS transactions (
    transaction_id VARCHAR(36) PRIMARY KEY,
    account_id VARCHAR(36) REFERENCES accounts(account_id),
    transaction_date TIMESTAMP NOT NULL,
    amount NUMERIC(12,2) NOT NULL,
    transaction_type VARCHAR(10) CHECK (transaction_type IN ('CREDIT', 'DEBIT')),
    channel VARCHAR(30),
    description TEXT,
    balance_after NUMERIC(14,2)
);

-- 4. Historical Credit Facilities Table
CREATE TABLE IF NOT EXISTS loan_facilities (
    facility_id VARCHAR(36) PRIMARY KEY,
    customer_id VARCHAR(36) REFERENCES customers(customer_id),
    contract_type VARCHAR(30) DEFAULT 'CASH_LOAN',
    granted_amount NUMERIC(14,2) NOT NULL,
    granted_date DATE NOT NULL,
    tenor_months INT NOT NULL,
    facility_status VARCHAR(20) CHECK (facility_status IN ('ACTIVE_PERFORMING', 'CLOSED_PAID_OFF', 'DEFAULTED_NPL', 'RESTRUCTURED')),
    historical_max_dpd INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. Installment Repayments Ledger
CREATE TABLE IF NOT EXISTS installment_repayments (
    installment_id VARCHAR(36) PRIMARY KEY,
    facility_id VARCHAR(36) REFERENCES loan_facilities(facility_id),
    due_date DATE NOT NULL,
    payment_date DATE,
    scheduled_amount NUMERIC(12,2) NOT NULL,
    paid_amount NUMERIC(12,2) NOT NULL,
    days_past_due INT DEFAULT 0
);

-- 6. External Credit Bureau Reports (I-Score)
CREATE TABLE IF NOT EXISTS iscore_bureau_reports (
    report_id VARCHAR(36) PRIMARY KEY,
    national_id VARCHAR(14) NOT NULL,
    report_date DATE NOT NULL,
    credit_score INT CHECK (credit_score BETWEEN 300 AND 850),
    active_facilities_count INT DEFAULT 0,
    total_active_loans_limit NUMERIC(14,2) DEFAULT 0.0,
    total_outstanding_balance NUMERIC(14,2) DEFAULT 0.0,
    max_days_past_due INT DEFAULT 0,
    has_active_judicial_action BOOLEAN DEFAULT FALSE
);

-- 7. Underwriting Decisions Audit Trail (Feeds Portfolio Analytics)
CREATE TABLE IF NOT EXISTS decision_audit_logs (
    decision_id VARCHAR(36) PRIMARY KEY,
    application_id VARCHAR(50) UNIQUE NOT NULL,
    national_id VARCHAR(14) NOT NULL,
    submission_timestamp TIMESTAMP NOT NULL,
    customer_segment VARCHAR(20) CHECK (customer_segment IN ('NEW_TO_BANK', 'RETURNING')),
    requested_amount NUMERIC(14,2),
    fraud_risk_score NUMERIC(5,4),
    fraud_risk_level VARCHAR(20),
    is_anomaly BOOLEAN DEFAULT FALSE,
    haircut_percentage NUMERIC(5,2),
    risk_adjusted_salary NUMERIC(12,2),
    dti_ratio NUMERIC(5,4),
    model_version VARCHAR(100),
    credit_score INT,
    default_probability NUMERIC(6,5),
    approved_tenure_months INT,
    final_decision VARCHAR(30),
    risk_tier VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Query Performance Optimization Indexes
CREATE INDEX IF NOT EXISTS idx_customers_nid ON customers(national_id);
CREATE INDEX IF NOT EXISTS idx_accounts_customer ON accounts(customer_id);
CREATE INDEX IF NOT EXISTS idx_tx_account_date ON transactions(account_id, transaction_date);
CREATE INDEX IF NOT EXISTS idx_installments_facility ON installment_repayments(facility_id);
CREATE INDEX IF NOT EXISTS idx_iscore_nid ON iscore_bureau_reports(national_id);
CREATE INDEX IF NOT EXISTS idx_decisions_app_id ON decision_audit_logs(application_id);
CREATE INDEX IF NOT EXISTS idx_decisions_nid ON decision_audit_logs(national_id);
