"""Unit tests for ETL transform (no databases)."""

from datetime import datetime, timezone

import pandas as pd
import pytest

from etl.transform_expenses import (
    build_summary_tables,
    expense_document_to_fact_row,
    expenses_to_dataframes,
    extract_oid,
    ml_row_from_fact_row,
)


def test_extract_oid_objectid_like():
    assert extract_oid("507f1f77bcf86cd799439011") == "507f1f77bcf86cd799439011"
    assert extract_oid({"_id": "abc123"}) == "abc123"


def test_expense_to_fact_basic():
    doc = {
        "_id": "507f1f77bcf86cd799439011",
        "description": "pizza party",
        "amount": 45.5,
        "category": "food",
        "predictedCategory": "food",
        "categoryConfidence": 0.92,
        "groupId": "507f1f77bcf86cd799439012",
        "paidBy": "507f1f77bcf86cd799439013",
        "createdBy": "507f1f77bcf86cd799439013",
        "date": datetime(2026, 3, 15, 12, 0, 0, tzinfo=timezone.utc),
        "createdAt": datetime(2026, 3, 15, 12, 0, 0, tzinfo=timezone.utc),
    }
    row = expense_document_to_fact_row(doc)
    assert row is not None
    assert row["expense_id"] == "507f1f77bcf86cd799439011"
    assert row["amount"] == 45.5
    assert row["category"] == "food"
    assert row["predicted_category"] == "food"
    assert row["category_confidence"] == pytest.approx(0.92)
    assert row["group_id"] == "507f1f77bcf86cd799439012"


def test_invalid_confidence_dropped():
    doc = {
        "_id": "507f1f77bcf86cd799439011",
        "description": "x",
        "amount": 10,
        "groupId": "507f1f77bcf86cd799439012",
        "paidBy": "507f1f77bcf86cd799439013",
        "createdBy": "507f1f77bcf86cd799439013",
        "date": datetime(2026, 1, 1, tzinfo=timezone.utc),
        "createdAt": datetime(2026, 1, 1, tzinfo=timezone.utc),
        "categoryConfidence": 9.99,
    }
    row = expense_document_to_fact_row(doc)
    assert row["category_confidence"] is None


def test_missing_required_returns_none():
    doc = {"_id": "507f1f77bcf86cd799439011", "description": "x", "amount": 10}
    assert expense_document_to_fact_row(doc) is None


def test_duplicate_expense_id_last_wins_in_dataframe():
    docs = [
        {
            "_id": "e1",
            "description": "a",
            "amount": 10,
            "groupId": "g1",
            "paidBy": "u1",
            "createdBy": "u1",
            "date": datetime(2026, 1, 1, tzinfo=timezone.utc),
            "createdAt": datetime(2026, 1, 1, tzinfo=timezone.utc),
        },
        {
            "_id": "e1",
            "description": "b",
            "amount": 20,
            "groupId": "g1",
            "paidBy": "u1",
            "createdBy": "u1",
            "date": datetime(2026, 1, 1, tzinfo=timezone.utc),
            "createdAt": datetime(2026, 1, 1, tzinfo=timezone.utc),
        },
    ]
    _, _, _, _, fact_df, _ = expenses_to_dataframes(docs, [], [{"_id": "g1", "name": "G", "members": ["u1"], "createdBy": "u1"}])
    assert len(fact_df) == 1
    assert float(fact_df.iloc[0]["amount"]) == 20.0


def test_ml_row_override_detection():
    fact = {
        "expense_id": "e1",
        "category": "utilities",
        "predicted_category": "food",
        "category_confidence": 0.8,
    }
    ml = ml_row_from_fact_row(fact)
    assert ml is not None
    assert ml["is_override"] is True


def test_summary_totals_match_fact():
    docs = []
    for i, amt in enumerate([10, 20, 30]):
        docs.append(
            {
                "_id": f"id{i}",
                "description": "d",
                "amount": amt,
                "category": "food",
                "predictedCategory": "food",
                "categoryConfidence": 0.9,
                "groupId": "g1",
                "paidBy": "u1",
                "createdBy": "u1",
                "date": datetime(2026, 4, 5, tzinfo=timezone.utc),
                "createdAt": datetime(2026, 4, 5, tzinfo=timezone.utc),
            }
        )
    _, _, _, _, fact_df, _ = expenses_to_dataframes(
        docs, [{"_id": "u1", "email": "a@b.com", "name": "U", "passwordHash": "x"}], [{"_id": "g1", "name": "G", "members": ["u1"], "createdBy": "u1"}]
    )
    daily, monthly, cat, ml = build_summary_tables(fact_df)
    assert float(daily["total_amount"].sum()) == pytest.approx(60.0)
    assert float(monthly["total_amount"].sum()) == pytest.approx(60.0)
    assert float(cat["total_amount"].sum()) == pytest.approx(60.0)
