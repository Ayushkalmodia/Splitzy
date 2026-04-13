"""Rule-based budget recommendations for dashboard UX."""

from __future__ import annotations

from typing import Any, Dict, List, Optional, Tuple

from app.models.schemas import BudgetInsightsRequest, BudgetInsightsResponse


def build_insights(payload: BudgetInsightsRequest) -> BudgetInsightsResponse:
    alerts: List[Dict[str, Any]] = []
    recs: List[str] = []
    worst: Optional[Tuple[float, str]] = None

    for b in payload.budgets:
        if b.monthly_limit <= 0:
            continue
        util = b.spent / b.monthly_limit
        level = "ok"
        if util >= 1.0:
            level = "100"
        elif util >= 0.8:
            level = "80"
        elif util >= 0.5:
            level = "50"

        if level != "ok":
            alerts.append(
                {
                    "category": b.category,
                    "utilization": round(util, 4),
                    "spent": b.spent,
                    "limit": b.monthly_limit,
                    "threshold": level,
                    "currency": b.currency,
                }
            )
        if worst is None or util > worst[0]:
            worst = (util, b.category)

        if util >= 1.0:
            recs.append(
                f"{b.category}: spending has reached or exceeded the monthly limit "
                f"({b.spent:.2f} / {b.monthly_limit:.2f} {b.currency})."
            )
        elif util >= 0.8:
            recs.append(
                f"{b.category}: approaching budget cap ({util * 100:.0f}% used). Consider slowing spend this month."
            )
        elif util >= 0.5:
            recs.append(
                f"{b.category}: past halfway on budget ({util * 100:.0f}% used). Track remaining discretionary spend."
            )

    if not recs and payload.budgets:
        recs.append("No categories are over 50% utilization this month. Keep tracking expenses to stay on target.")

    return BudgetInsightsResponse(
        alerts=alerts,
        recommendations=recs[:12],
        highest_risk_category=worst[1] if worst and worst[0] >= 0.5 else None,
    )
