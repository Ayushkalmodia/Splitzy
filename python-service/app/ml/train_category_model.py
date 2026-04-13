"""
Train a lightweight text classifier for expense categories.

Run from `python-service` directory:
  python -m app.ml.train_category_model

Outputs `category_model.pkl` next to this file (TfidfVectorizer + LogisticRegression pipeline).
"""

from __future__ import annotations

import json
from pathlib import Path

import joblib
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline

# Sample training rows: (combined text for TF-IDF, label)
# Combined text uses description + merchant + coarse amount hint for variety.
SAMPLE_DATA: list[tuple[str, str]] = [
    ("pizza party dominos dinner", "Food"),
    ("lunch with team cafe restaurant", "Food"),
    ("groceries whole foods supermarket", "Food"),
    ("coffee starbucks morning", "Food"),
    ("sushi dinner japanese restaurant", "Food"),
    ("burger mcdonalds fast food", "Food"),
    ("uber to office ride share", "Travel"),
    ("taxi airport flight", "Travel"),
    ("train ticket metro transit", "Travel"),
    ("gas station fuel car", "Travel"),
    ("hotel booking accommodation trip", "Travel"),
    ("amazon order electronics online", "Shopping"),
    ("target clothes purchase", "Shopping"),
    ("best buy gadget", "Shopping"),
    ("nike shoes mall", "Shopping"),
    ("electricity bill utility power", "Utilities"),
    ("water bill municipal", "Utilities"),
    ("internet broadband isp", "Utilities"),
    ("phone bill mobile carrier", "Utilities"),
    ("netflix subscription streaming", "Entertainment"),
    ("movie tickets cinema", "Entertainment"),
    ("concert tickets music", "Entertainment"),
    ("spotify music", "Entertainment"),
    ("monthly rent landlord apartment", "Rent"),
    ("rent payment housing", "Rent"),
    ("lease deposit apartment", "Rent"),
    ("random misc unknown", "Other"),
    ("bank fee adjustment", "Other"),
    ("cash withdrawal atm", "Other"),
]


def build_pipeline() -> Pipeline:
    return Pipeline(
        [
            (
                "tfidf",
                TfidfVectorizer(
                    lowercase=True,
                    ngram_range=(1, 2),
                    min_df=1,
                    max_features=5000,
                ),
            ),
            (
                "clf",
                LogisticRegression(
                    max_iter=500,
                    class_weight="balanced",
                    random_state=42,
                ),
            ),
        ]
    )


def main() -> None:
    out_dir = Path(__file__).resolve().parent
    texts = [row[0] for row in SAMPLE_DATA]
    labels = [row[1] for row in SAMPLE_DATA]

    model = build_pipeline()
    model.fit(texts, labels)

    artifact_path = out_dir / "category_model.pkl"
    joblib.dump(model, artifact_path)

    meta = {
        "classes": list(model.named_steps["clf"].classes_),
        "artifact": str(artifact_path.name),
    }
    (out_dir / "category_model_meta.json").write_text(json.dumps(meta, indent=2), encoding="utf-8")
    print(f"Saved model to {artifact_path}")


if __name__ == "__main__":
    main()
