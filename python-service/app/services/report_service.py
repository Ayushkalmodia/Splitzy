from datetime import datetime
from typing import Optional

from app.db import mongo
from app.models.schemas import MonthlyReportResponse


def monthly_report(month: Optional[str] = None) -> MonthlyReportResponse:
    current_month = month or datetime.utcnow().strftime("%Y-%m")

    # Starter placeholder values. Replace with aggregation queries later.
    total_expenses = 0.0
    expense_count = 0
    top_categories: list[dict] = []

    _ = mongo  # Reserved for upcoming Mongo aggregate usage.

    return MonthlyReportResponse(
        month=current_month,
        total_expenses=total_expenses,
        expense_count=expense_count,
        top_categories=top_categories,
    )
