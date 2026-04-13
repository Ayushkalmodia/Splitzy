-- Power BI–oriented views (run after 001_reporting_schema.sql)

DROP VIEW IF EXISTS vw_confidence_histogram CASCADE;
DROP VIEW IF EXISTS vw_category_ml_insights CASCADE;
DROP VIEW IF EXISTS vw_spending_trends CASCADE;

-- Dashboard 1: Spending trends — transaction grain + calendar attributes
CREATE VIEW vw_spending_trends AS
SELECT
    f.expense_id,
    f.group_id,
    g.group_name,
    f.user_id,
    u.display_name AS payer_name,
    u.email AS payer_email,
    f.expense_date,
    d.year_num,
    d.month_num,
    d.month_name,
    d.year_month,
    d.week_of_year,
    d.iso_year,
    d.iso_week,
    d.day_name,
    d.is_weekend,
    d.quarter_num,
    f.amount,
    f.currency,
    f.category,
    f.created_at,
    SUM(f.amount) OVER (PARTITION BY f.expense_date, f.group_id) AS daily_group_spend,
    COUNT(*) OVER (PARTITION BY f.expense_date, f.group_id) AS daily_group_transaction_count,
    AVG(f.amount) OVER (PARTITION BY f.expense_date, f.group_id) AS avg_tx_amount_that_day
FROM fact_expense f
JOIN dim_date d ON f.expense_date = d.date_key
JOIN dim_group g ON f.group_id = g.group_id
LEFT JOIN dim_user u ON f.user_id = u.user_id;

-- Dashboard 2: Category + ML insights
CREATE VIEW vw_category_ml_insights AS
SELECT
    f.expense_id,
    f.group_id,
    g.group_name,
    f.expense_date,
    f.amount,
    f.category AS manual_category_slug,
    COALESCE(dc_m.category_label, INITCAP(REPLACE(f.category, '_', ' '))) AS manual_category_label,
    f.predicted_category AS predicted_category_slug,
    COALESCE(dc_p.category_label, INITCAP(REPLACE(f.predicted_category, '_', ' '))) AS predicted_category_label,
    f.category_confidence,
    f.is_manual_override,
    CASE
        WHEN f.category_confidence IS NULL THEN 'unknown'
        WHEN f.category_confidence < 0.5 THEN '0-49%'
        WHEN f.category_confidence < 0.7 THEN '50-69%'
        WHEN f.category_confidence < 0.85 THEN '70-84%'
        ELSE '85-100%'
    END AS confidence_bucket,
    m.synced_at AS ml_synced_at
FROM fact_expense f
JOIN dim_group g ON f.group_id = g.group_id
LEFT JOIN dim_category dc_m ON LOWER(dc_m.category_slug) = LOWER(TRIM(f.category))
LEFT JOIN dim_category dc_p ON f.predicted_category IS NOT NULL
    AND LOWER(dc_p.category_slug) = LOWER(TRIM(f.predicted_category))
LEFT JOIN fact_ml_prediction m ON m.expense_id = f.expense_id;

-- Histogram dataset for Power BI column / bar chart
CREATE VIEW vw_confidence_histogram AS
SELECT
    f.group_id,
    g.group_name,
    CASE
        WHEN f.category_confidence < 0.5 THEN '0-49%'
        WHEN f.category_confidence < 0.7 THEN '50-69%'
        WHEN f.category_confidence < 0.85 THEN '70-84%'
        ELSE '85-100%'
    END AS confidence_bucket,
    COUNT(*) AS expense_count,
    AVG(f.category_confidence) AS avg_confidence_in_bucket
FROM fact_expense f
JOIN dim_group g ON f.group_id = g.group_id
WHERE f.category_confidence IS NOT NULL
GROUP BY f.group_id, g.group_name,
    CASE
        WHEN f.category_confidence < 0.5 THEN '0-49%'
        WHEN f.category_confidence < 0.7 THEN '50-69%'
        WHEN f.category_confidence < 0.85 THEN '70-84%'
        ELSE '85-100%'
    END;
