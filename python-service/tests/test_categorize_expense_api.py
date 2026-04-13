"""Functional tests for POST /categorize-expense (ML + validation)."""

import pytest

from app.services import category_predictor as cp


ALLOWED_LABELS = frozenset(
    {"Food", "Travel", "Shopping", "Utilities", "Entertainment", "Rent", "Other"}
)


@pytest.mark.parametrize(
    "description",
    [
        "pizza with friends",
        "uber to office",
        "electricity bill",
        "amazon shopping",
        "movie tickets",
    ],
)
def test_realistic_descriptions(categorize_client, description):
    res = categorize_client.post("/categorize-expense", json={"description": description})
    assert res.status_code == 200, res.text
    data = res.json()
    assert "predictedCategory" in data
    assert "categoryConfidence" in data
    assert data["predictedCategory"] in ALLOWED_LABELS
    assert isinstance(data["categoryConfidence"], (int, float))
    assert 0 <= float(data["categoryConfidence"]) <= 1


def test_optional_merchant_and_amount(categorize_client):
    res = categorize_client.post(
        "/categorize-expense",
        json={"description": "dinner", "merchant": "dominos", "amount": 42.5},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["predictedCategory"]
    assert isinstance(data["categoryConfidence"], (int, float))


def test_missing_description_validation(categorize_client):
    res = categorize_client.post("/categorize-expense", json={})
    assert res.status_code == 422


def test_empty_description_validation(categorize_client):
    res = categorize_client.post("/categorize-expense", json={"description": ""})
    assert res.status_code == 422


def test_invalid_amount_validation(categorize_client):
    res = categorize_client.post(
        "/categorize-expense",
        json={"description": "ok", "amount": -1},
    )
    assert res.status_code == 422


def test_invalid_json_body(categorize_client):
    res = categorize_client.post(
        "/categorize-expense",
        content=b"not json",
        headers={"Content-Type": "application/json"},
    )
    assert res.status_code == 422


def test_model_loads_and_predict_runs():
    """Direct predictor call ensures joblib pipeline or fallback runs without error."""
    cp.load_category_model()
    out = cp.predict_category("pizza party", merchant=None, amount=100)
    assert "predictedCategory" in out
    assert "categoryConfidence" in out
    assert isinstance(out["categoryConfidence"], float)
