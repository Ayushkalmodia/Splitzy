from fastapi import APIRouter

from app.models.schemas import CategorizeExpenseRequest, CategorizeExpenseResponse
from app.services.category_predictor import predict_category

router = APIRouter(prefix="/categorize-expense", tags=["categorize-expense"])


@router.post("", response_model=CategorizeExpenseResponse)
def categorize_expense_ml(payload: CategorizeExpenseRequest):
    result = predict_category(
        description=payload.description,
        merchant=payload.merchant,
        amount=payload.amount,
    )
    return CategorizeExpenseResponse(
        predictedCategory=result["predictedCategory"],
        categoryConfidence=result["categoryConfidence"],
    )
