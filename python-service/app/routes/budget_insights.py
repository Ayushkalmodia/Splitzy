from fastapi import APIRouter

from app.models.schemas import BudgetInsightsRequest, BudgetInsightsResponse
from app.services.budget_insights_service import build_insights

router = APIRouter(prefix="/budget-insights", tags=["budget-insights"])


@router.post("", response_model=BudgetInsightsResponse)
def budget_insights(payload: BudgetInsightsRequest):
    return build_insights(payload)
