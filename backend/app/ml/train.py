"""Train the severity classifier. Usage:
    python -m app.ml.train [--input data/processed/training_sample.csv]
                           [--max-rows 200000]
The default input is the training sample written by preprocessing, so the
full multi-GB CSV is never loaded here. Metrics are written only after a
real training run -- never fabricated.
"""
import argparse
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

import joblib
import pandas as pd
from sklearn.dummy import DummyClassifier
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix, f1_score, precision_score, recall_score
from sklearn.model_selection import train_test_split

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
from app.core.config import MODEL_VERSION, RANDOM_SEED, artifacts_dir, metrics_path, model_path, processed_dir  # noqa: E402
from app.ml.features import ALL_FEATURES, build_pipeline, engineer_features  # noqa: E402


def evaluate(y_true, y_pred, labels):
    return {
        "accuracy": round(float(accuracy_score(y_true, y_pred)), 4),
        "macro_precision": round(float(precision_score(y_true, y_pred, average="macro", zero_division=0)), 4),
        "macro_recall": round(float(recall_score(y_true, y_pred, average="macro", zero_division=0)), 4),
        "macro_f1": round(float(f1_score(y_true, y_pred, average="macro", zero_division=0)), 4),
        "confusion_matrix": confusion_matrix(y_true, y_pred, labels=labels).tolist(),
        "labels": [int(x) for x in labels],
        "classification_report": classification_report(y_true, y_pred, labels=labels, output_dict=True, zero_division=0),
    }


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--input", default=str(processed_dir() / "training_sample.csv"))
    ap.add_argument("--max-rows", type=int, default=200000)
    args = ap.parse_args()
    path = Path(args.input)
    if not path.exists():
        print(f"Training data not found: {path}\nRun: python scripts/preprocess_dataset.py  (after placing the Kaggle CSV at data/raw/US_Accidents_March23.csv)")
        return 2
    df = pd.read_csv(path, nrows=args.max_rows)
    feats = engineer_features(df)
    feats = feats.dropna(subset=["Severity"])
    feats = feats[(feats["Severity"] >= 1) & (feats["Severity"] <= 4)]
    if feats.empty or feats["Severity"].nunique() < 2:
        print("Not enough labelled rows to train.")
        return 2
    X, y = feats[ALL_FEATURES], feats["Severity"].astype(int)
    labels = sorted(y.unique().tolist())
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=RANDOM_SEED, stratify=y)
    pipe = build_pipeline()
    pipe.fit(X_train, y_train)
    metrics = evaluate(y_test, pipe.predict(X_test), labels)
    baseline = DummyClassifier(strategy="most_frequent")
    baseline.fit(X_train, y_train)
    metrics["baseline_accuracy"] = round(float(accuracy_score(y_test, baseline.predict(X_test))), 4)
    metrics["train_size"] = int(len(X_train)); metrics["test_size"] = int(len(X_test))
    metrics["class_counts"] = {str(k): int(v) for k, v in y.value_counts().sort_index().items()}
    # Feature importances (model associations, not causation)
    try:
        names = pipe.named_steps["preprocess"].get_feature_names_out()
        imps = pipe.named_steps["classifier"].feature_importances_
        metrics["feature_importances"] = sorted(
            [{"feature": str(n), "importance": round(float(v), 4)} for n, v in zip(names, imps)],
            key=lambda d: d["importance"], reverse=True)[:20]
    except Exception:
        metrics["feature_importances"] = []
    artifacts_dir().mkdir(parents=True, exist_ok=True)
    joblib.dump({"pipeline": pipe, "model_version": MODEL_VERSION,
                 "features": ALL_FEATURES, "labels": labels,
                 "trained_at": datetime.now(timezone.utc).isoformat()}, model_path())
    payload = {"model_version": MODEL_VERSION, "model_type": "RandomForestClassifier (scikit-learn Pipeline)",
               "trained_at": datetime.now(timezone.utc).isoformat(),
               "features": ALL_FEATURES, "methodology": "Stratified 80/20 train/test split, random_state=42",
               "target": "Severity (1-4, dataset labels; higher = greater traffic impact)",
               "metrics": metrics, "limitations": [
                   "This is severity classification, NOT a probability that an accident will occur.",
                   "Predictors are conditions recorded with historical accidents; a future location/time needs a separate data source for those conditions.",
                   "Traffic volume is not in the dataset and is not a feature."]}
    metrics_path().write_text(json.dumps(payload, indent=2))
    print(f"Trained. Accuracy={metrics['accuracy']} macro-F1={metrics['macro_f1']} baseline={metrics['baseline_accuracy']}")
    print(f"Model: {model_path()}\nMetrics: {metrics_path()}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
