from __future__ import annotations

from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class CategorizeRequest(BaseModel):
    description: str = Field(..., min_length=1)
    amount: float
    group_id: Optional[str] = None


class CategorizeResponse(BaseModel):
    category: str
    confidence: float


class CategorizeExpenseRequest(BaseModel):
    """Body for ML-based expense categorization."""

    description: str = Field(..., min_length=1, max_length=500)
    merchant: Optional[str] = Field(default=None, max_length=200)
    amount: Optional[float] = Field(default=None, ge=0)


class CategorizeExpenseResponse(BaseModel):
    predictedCategory: str
    categoryConfidence: float


class DetectAnomalyRequest(BaseModel):
    expense_id: Optional[str] = None
    amount: float
    user_id: str
    group_id: Optional[str] = None


class DetectAnomalyResponse(BaseModel):
    is_anomaly: bool
    score: float
    reason: str


class MonthlyReportResponse(BaseModel):
    month: str
    total_expenses: float
    expense_count: int
    top_categories: List[Dict[str, Any]]


class OptimizeSettlementRequest(BaseModel):
    group_id: str
    balances: Dict[str, float]
    legacy_suggestion_count: Optional[int] = Field(
        default=None,
        ge=0,
        description="Optional count of simplified pairwise suggestions (e.g. from Node) for UX comparison.",
    )


class OptimizeSettlementResponse(BaseModel):
    transactions: List[Dict[str, Any]]
    transaction_count: int = 0
    naive_bipartite_upper_bound: int = 0
    transactions_saved_vs_bipartite: int = 0
    transactions_saved_vs_legacy: Optional[int] = None
    parties_with_nonzero_balance: int = 0
    graph_nodes: int = 0
    graph_edges: int = 0
    algorithm: str = "greedy_net_clearing_networkx"


class BudgetLineIn(BaseModel):
    category: str
    monthly_limit: float = Field(..., ge=0)
    spent: float = Field(..., ge=0)
    currency: str = "USD"


class BudgetInsightsRequest(BaseModel):
    month: str = Field(..., description="YYYY-MM")
    budgets: List[BudgetLineIn] = Field(default_factory=list)


class BudgetInsightsResponse(BaseModel):
    alerts: List[Dict[str, Any]]
    recommendations: List[str]
    highest_risk_category: Optional[str] = None
