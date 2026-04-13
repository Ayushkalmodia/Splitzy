from fastapi import APIRouter

from app.models.schemas import CategorizeRequest, CategorizeResponse
from app.services.categorize_service import categorize_expense

router = APIRouter(prefix="/categorize", tags=["categorize"])


@router.post("", response_model=CategorizeResponse)
def categorize(payload: CategorizeRequest):
    return categorize_expense(payload)
