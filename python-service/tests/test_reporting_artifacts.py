"""Sanity checks: migration files and view definitions exist."""

from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parent.parent
MIG = ROOT / "sql" / "migrations"


def test_migration_files_present():
    assert (MIG / "001_reporting_schema.sql").is_file()
    assert (MIG / "002_powerbi_views.sql").is_file()


@pytest.mark.parametrize(
    "name,snippet",
    [
        ("001_reporting_schema.sql", "fact_expense"),
        ("001_reporting_schema.sql", "dim_category"),
        ("001_reporting_schema.sql", "daily_spend_summary"),
        ("002_powerbi_views.sql", "vw_spending_trends"),
        ("002_powerbi_views.sql", "vw_category_ml_insights"),
        ("002_powerbi_views.sql", "vw_confidence_histogram"),
    ],
)
def test_sql_contains_reporting_objects(name, snippet):
    text = (MIG / name).read_text(encoding="utf-8")
    assert snippet in text
