-- Splitzy Power BI reporting layer (PostgreSQL)
-- Run order: 001 -> 002

-- ---------------------------------------------------------------------------
-- Dimension: category (manual + predicted slugs from app)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS dim_category (
    category_slug   VARCHAR(64) PRIMARY KEY,
    category_label  VARCHAR(128) NOT NULL,
    sort_order      INT NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_dim_category_sort ON dim_category (sort_order);

-- ---------------------------------------------------------------------------
-- Dimension: calendar date (one row per calendar day)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS dim_date (
    date_key        DATE PRIMARY KEY,
    year_num        INT NOT NULL,
    month_num       INT NOT NULL,
    day_of_month    INT NOT NULL,
    week_of_year    INT NOT NULL,
    iso_year        INT NOT NULL,
    iso_week        INT NOT NULL,
    month_name      VARCHAR(16) NOT NULL,
    day_of_week     INT NOT NULL,
    day_name        VARCHAR(16) NOT NULL,
    is_weekend      BOOLEAN NOT NULL DEFAULT FALSE,
    quarter_num     INT NOT NULL,
    year_month      VARCHAR(7) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_dim_date_ym ON dim_date (year_month);
CREATE INDEX IF NOT EXISTS idx_dim_date_yw ON dim_date (iso_year, iso_week);

-- ---------------------------------------------------------------------------
-- Dimension: user (Mongo User._id as text)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS dim_user (
    user_id         VARCHAR(32) PRIMARY KEY,
    email           VARCHAR(255),
    display_name    VARCHAR(255),
    role            VARCHAR(32),
    source_updated_at TIMESTAMPTZ
);

-- ---------------------------------------------------------------------------
-- Dimension: group
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS dim_group (
    group_id        VARCHAR(32) PRIMARY KEY,
    group_name      VARCHAR(255) NOT NULL,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    source_updated_at TIMESTAMPTZ
);

-- ---------------------------------------------------------------------------
-- Fact: expense (grain = one expense document)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS fact_expense (
    expense_id              VARCHAR(32) PRIMARY KEY,
    group_id                  VARCHAR(32) NOT NULL REFERENCES dim_group (group_id),
    user_id                   VARCHAR(32) NOT NULL REFERENCES dim_user (user_id),
    created_by_user_id        VARCHAR(32) REFERENCES dim_user (user_id),
    expense_date              DATE NOT NULL,
    amount                    NUMERIC(18, 4) NOT NULL CHECK (amount >= 0),
    currency                  VARCHAR(3) NOT NULL DEFAULT 'USD',
    category                  VARCHAR(128) NOT NULL,
    predicted_category        VARCHAR(128),
    category_confidence       NUMERIC(8, 6),
    description               TEXT,
    merchant                  VARCHAR(255),
    created_at                TIMESTAMPTZ NOT NULL,
    updated_at                TIMESTAMPTZ,
    source_updated_at         TIMESTAMPTZ,
    is_manual_override        BOOLEAN GENERATED ALWAYS AS (
        predicted_category IS NOT NULL
        AND LENGTH(TRIM(predicted_category)) > 0
        AND LOWER(TRIM(category)) IS DISTINCT FROM LOWER(TRIM(predicted_category))
    ) STORED
);

CREATE INDEX IF NOT EXISTS idx_fact_expense_date ON fact_expense (expense_date);
CREATE INDEX IF NOT EXISTS idx_fact_expense_group_date ON fact_expense (group_id, expense_date DESC);
CREATE INDEX IF NOT EXISTS idx_fact_expense_user_date ON fact_expense (user_id, expense_date DESC);
CREATE INDEX IF NOT EXISTS idx_fact_expense_category ON fact_expense (category);
CREATE INDEX IF NOT EXISTS idx_fact_expense_predicted ON fact_expense (predicted_category);
CREATE INDEX IF NOT EXISTS idx_fact_expense_override ON fact_expense (is_manual_override);

-- ---------------------------------------------------------------------------
-- Fact: ML prediction (1:1 with expense; optional denormalized slice)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS fact_ml_prediction (
    expense_id            VARCHAR(32) PRIMARY KEY
        REFERENCES fact_expense (expense_id) ON DELETE CASCADE,
    predicted_category    VARCHAR(128),
    category_confidence   NUMERIC(8, 6),
    manual_category       VARCHAR(128) NOT NULL,
    is_override           BOOLEAN NOT NULL DEFAULT FALSE,
    synced_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fact_ml_pred_conf ON fact_ml_prediction (category_confidence);
CREATE INDEX IF NOT EXISTS idx_fact_ml_pred_override ON fact_ml_prediction (is_override);

-- Seed category dimension (app slugs; extend in ETL if new values appear)
INSERT INTO dim_category (category_slug, category_label, sort_order) VALUES
    ('food', 'Food & Dining', 10),
    ('transport', 'Travel & Transport', 20),
    ('shopping', 'Shopping', 30),
    ('utilities', 'Utilities', 40),
    ('entertainment', 'Entertainment', 50),
    ('rent', 'Rent', 55),
    ('accommodation', 'Accommodation', 58),
    ('other', 'Other', 99)
ON CONFLICT (category_slug) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Aggregation tables (rebuilt each ETL run)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS daily_spend_summary (
    summary_date        DATE NOT NULL,
    group_id            VARCHAR(32) NOT NULL,
    total_amount        NUMERIC(18, 4) NOT NULL DEFAULT 0,
    transaction_count   INT NOT NULL DEFAULT 0,
    PRIMARY KEY (summary_date, group_id)
);

CREATE INDEX IF NOT EXISTS idx_daily_spend_group ON daily_spend_summary (group_id);

CREATE TABLE IF NOT EXISTS monthly_spend_summary (
    year_month          VARCHAR(7) NOT NULL,
    group_id            VARCHAR(32) NOT NULL,
    total_amount        NUMERIC(18, 4) NOT NULL DEFAULT 0,
    transaction_count   INT NOT NULL DEFAULT 0,
    days_in_month       INT NOT NULL DEFAULT 30,
    avg_daily_spend     NUMERIC(18, 6) GENERATED ALWAYS AS (
        CASE WHEN days_in_month > 0 THEN total_amount / days_in_month ELSE 0 END
    ) STORED,
    PRIMARY KEY (year_month, group_id)
);

CREATE TABLE IF NOT EXISTS category_summary (
    period_month        VARCHAR(7) NOT NULL,
    group_id            VARCHAR(32) NOT NULL,
    category            VARCHAR(128) NOT NULL,
    total_amount        NUMERIC(18, 4) NOT NULL DEFAULT 0,
    transaction_count   INT NOT NULL DEFAULT 0,
    PRIMARY KEY (period_month, group_id, category)
);

CREATE INDEX IF NOT EXISTS idx_category_summary_month ON category_summary (period_month);

CREATE TABLE IF NOT EXISTS ml_prediction_summary (
    period_month        VARCHAR(7) NOT NULL,
    group_id            VARCHAR(32) NOT NULL,
    prediction_count    INT NOT NULL DEFAULT 0,
    avg_confidence      NUMERIC(10, 6),
    override_count      INT NOT NULL DEFAULT 0,
    override_rate       NUMERIC(10, 6),
    PRIMARY KEY (period_month, group_id)
);
