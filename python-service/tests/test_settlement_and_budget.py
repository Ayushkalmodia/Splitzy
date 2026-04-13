import pytest

from app.models.schemas import BudgetInsightsRequest, OptimizeSettlementRequest
from app.services.budget_insights_service import build_insights
from app.services.settlement_service import optimize_settlement


def test_optimize_settlement_legacy_saved():
    req = OptimizeSettlementRequest(
        group_id="g1",
        balances={"a": 30.0, "b": -10.0, "c": -20.0},
        legacy_suggestion_count=5,
    )
    out = optimize_settlement(req)
    assert out.transaction_count == 2
    assert out.transactions_saved_vs_legacy == 5 - 2
    assert out.graph_edges == 2


def test_optimize_settlement_single_transfer():
    req = OptimizeSettlementRequest(
        group_id="g1",
        balances={"u1": 100.0, "u2": -100.0},
    )
    out = optimize_settlement(req)
    assert len(out.transactions) == 1
    assert out.transactions[0]["from"] == "u2"
    assert out.transactions[0]["to"] == "u1"


def test_budget_insights_thresholds():
    req = BudgetInsightsRequest(
        month="2026-04",
        budgets=[
            {"category": "food", "monthly_limit": 100, "spent": 55, "currency": "USD"},
            {"category": "shop", "monthly_limit": 50, "spent": 45, "currency": "USD"},
        ],
    )
    out = build_insights(req)
    assert any(a["category"] == "food" and a["threshold"] == "50" for a in out.alerts)
    assert any(a["category"] == "shop" and a["threshold"] == "80" for a in out.alerts)
    assert out.highest_risk_category == "shop"
