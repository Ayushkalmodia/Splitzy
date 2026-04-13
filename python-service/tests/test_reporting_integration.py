"""
End-to-end ETL + validation against real MongoDB + PostgreSQL.

Enable with:
  export RUN_REPORTING_INTEGRATION=1
  export REPORTING_DATABASE_URL=postgresql://...
  export MONGODB_URI=...  (optional; uses app config defaults)

Requires migrations applied first:
  PYTHONPATH=. python scripts/apply_reporting_migrations.py
"""

from __future__ import annotations

import os

import pytest

pytestmark = pytest.mark.skipif(
    os.getenv("RUN_REPORTING_INTEGRATION") != "1",
    reason="Set RUN_REPORTING_INTEGRATION=1 and REPORTING_DATABASE_URL to run",
)


def test_sync_and_validate_round_trip():
    from etl.sync_expenses import run_sync
    from etl.validate_sync import validate_against_mongo

    stats = run_sync()
    assert stats["fact_rows"] >= 0
    result = validate_against_mongo()
    assert result.ok, result.errors
    assert result.metrics["pg_fact_rows"] == result.metrics["mongo_valid_expense_rows"]
