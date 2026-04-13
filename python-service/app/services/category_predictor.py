"""
Load persisted sklearn pipeline and predict expense category from text features.

Falls back to keyword rules if `category_model.pkl` is missing (e.g. before training).
"""

import logging
import re
from pathlib import Path
from typing import Any, Dict, Optional, Tuple

import joblib

logger = logging.getLogger(__name__)

_MODEL: Optional[Any] = None
_MODEL_PATH: Optional[Path] = None


def _default_model_path() -> Path:
    return Path(__file__).resolve().parent.parent / "ml" / "category_model.pkl"


def load_category_model(model_path: Optional[Path] = None) -> Optional[Any]:
    """Load joblib pipeline once; returns None if file does not exist."""
    global _MODEL, _MODEL_PATH
    path = model_path or _default_model_path()
    if _MODEL is not None and _MODEL_PATH == path:
        return _MODEL
    if not path.is_file():
        logger.warning("Category model not found at %s — using keyword fallback", path)
        _MODEL = None
        _MODEL_PATH = path
        return None
    _MODEL = joblib.load(path)
    _MODEL_PATH = path
    logger.info("Loaded category model from %s", path)
    return _MODEL


def _combine_text(description: str, merchant: Optional[str], amount: Optional[float]) -> str:
    parts = [description.strip()]
    if merchant and merchant.strip():
        parts.append(merchant.strip())
    if amount is not None:
        try:
            parts.append(f"amount_{round(float(amount))}")
        except (TypeError, ValueError):
            pass
    return " ".join(parts)


def _keyword_fallback(text: str) -> Tuple[str, float]:
    t = text.lower()
    if any(w in t for w in ["uber", "taxi", "train", "flight", "hotel", "gas", "fuel", "metro", "bus"]):
        return "Travel", 0.85
    if any(w in t for w in ["pizza", "food", "lunch", "dinner", "cafe", "restaurant", "coffee", "grocery"]):
        return "Food", 0.82
    if any(w in t for w in ["amazon", "shopping", "mall", "clothes", "target", "best buy"]):
        return "Shopping", 0.8
    if any(w in t for w in ["electric", "utility", "water bill", "internet", "phone bill"]):
        return "Utilities", 0.8
    if any(w in t for w in ["netflix", "movie", "concert", "spotify", "game"]):
        return "Entertainment", 0.78
    if any(w in t for w in ["rent", "lease", "landlord"]):
        return "Rent", 0.8
    return "Other", 0.55


def predict_category(
    description: str,
    merchant: Optional[str] = None,
    amount: Optional[float] = None,
    model_path: Optional[Path] = None,
) -> Dict[str, Any]:
    """
    Return dict with predictedCategory (display label) and categoryConfidence in [0, 1].
    """
    desc = re.sub(r"\s+", " ", (description or "").strip())
    if not desc:
        return {"predictedCategory": "Other", "categoryConfidence": 0.0}

    combined = _combine_text(desc, merchant, amount)
    model = load_category_model(model_path)

    if model is None:
        label, conf = _keyword_fallback(combined)
        return {"predictedCategory": label, "categoryConfidence": float(conf)}

    try:
        proba = model.predict_proba([combined])[0]
        idx = max(range(len(proba)), key=lambda i: proba[i])
        classes = list(model.named_steps["clf"].classes_)
        label = str(classes[idx])
        confidence = float(proba[idx])
        return {"predictedCategory": label, "categoryConfidence": round(confidence, 4)}
    except Exception as exc:  # pragma: no cover - defensive
        logger.exception("Model inference failed: %s", exc)
        label, conf = _keyword_fallback(combined)
        return {"predictedCategory": label, "categoryConfidence": float(conf * 0.9)}
