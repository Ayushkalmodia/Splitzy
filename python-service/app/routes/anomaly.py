from fastapi import APIRouter

from app.models.schemas import DetectAnomalyRequest, DetectAnomalyResponse
from app.services.anomaly_service import detect_anomaly

router = APIRouter(prefix="/detect-anomaly", tags=["anomaly"])


@router.post("", response_model=DetectAnomalyResponse)
def anomaly(payload: DetectAnomalyRequest):
    return detect_anomaly(payload)
