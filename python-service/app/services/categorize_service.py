from app.models.schemas import CategorizeRequest, CategorizeResponse


def categorize_expense(payload: CategorizeRequest) -> CategorizeResponse:
    text = payload.description.lower()

    if any(keyword in text for keyword in ["uber", "taxi", "bus", "train", "fuel"]):
        category = "transport"
        confidence = 0.91
    elif any(keyword in text for keyword in ["food", "lunch", "dinner", "cafe", "restaurant"]):
        category = "food"
        confidence = 0.88
    elif any(keyword in text for keyword in ["rent", "electricity", "internet", "water"]):
        category = "utilities"
        confidence = 0.84
    else:
        category = "general"
        confidence = 0.62

    return CategorizeResponse(category=category, confidence=confidence)
