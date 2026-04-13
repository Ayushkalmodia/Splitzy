from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_budget_insights_endpoint():
    res = client.post(
        "/budget-insights",
        json={
            "month": "2026-04",
            "budgets": [
                {"category": "food", "monthly_limit": 100, "spent": 90, "currency": "USD"}
            ],
        },
    )
    assert res.status_code == 200
    body = res.json()
    assert "alerts" in body
    assert "recommendations" in body
    assert any("food" in r.lower() for r in body["recommendations"])
