"""Unit tests for validate_sync helpers (no PostgreSQL)."""

from datetime import datetime, timezone

import pytest

from etl.validate_sync import _mongo_ml_stats, _mongo_valid_totals


def test_mongo_valid_totals_skips_invalid():
    docs = [
        {
            "_id": "a",
            "description": "ok",
            "amount": 100,
            "groupId": "g1",
            "paidBy": "u1",
            "createdBy": "u1",
            "date": datetime(2026, 1, 1, tzinfo=timezone.utc),
            "createdAt": datetime(2026, 1, 1, tzinfo=timezone.utc),
        },
        {"_id": "bad", "description": "no group"},
    ]
    n, t = _mongo_valid_totals(docs)
    assert n == 1
    assert t == 100.0


def test_mongo_ml_stats_override():
    docs = [
        {
            "_id": "1",
            "description": "x",
            "amount": 1,
            "category": "food",
            "predictedCategory": "utilities",
            "categoryConfidence": 0.7,
            "groupId": "g1",
            "paidBy": "u1",
            "createdBy": "u1",
            "date": datetime(2026, 1, 1, tzinfo=timezone.utc),
            "createdAt": datetime(2026, 1, 1, tzinfo=timezone.utc),
        }
    ]
    with_pred, overrides, avg_c = _mongo_ml_stats(docs)
    assert with_pred == 1
    assert overrides == 1
    assert avg_c == pytest.approx(0.7)
