from app.models.schemas import DetectAnomalyRequest, DetectAnomalyResponse


def detect_anomaly(payload: DetectAnomalyRequest) -> DetectAnomalyResponse:
    threshold = 5000.0
    score = min(payload.amount / threshold, 1.0)
    is_anomaly = payload.amount > threshold
    reason = "Amount is significantly higher than baseline." if is_anomaly else "Within normal range."

    return DetectAnomalyResponse(
        is_anomaly=is_anomaly,
        score=round(score, 3),
        reason=reason,
    )
