from fastapi import APIRouter

from app.models.schemas import OptimizeSettlementRequest, OptimizeSettlementResponse
from app.services.settlement_service import optimize_settlement

router = APIRouter(prefix="/optimize-settlement", tags=["settlement"])


@router.post("", response_model=OptimizeSettlementResponse)
def settlement(payload: OptimizeSettlementRequest):
    return optimize_settlement(payload)
