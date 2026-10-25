"""Chunked preprocessing for the real Kaggle CSV.

Reads data/raw/US_Accidents_March23.csv in chunks (never the whole file in
memory), validates columns, parses timestamps, validates coordinates, and
writes only aggregates + bounded samples to data/processed/:
  summary.json, hotspots.json, trends.json, severity.json, weather.json,
  hourly.json, weekday.json, infra.json, accidents_sample.csv (<=5000),
  training_sample.csv (<=200000, deterministic sample for train.py).

Dataset: US Accidents (2016-2023), Sobhan Moosavi.
Source: https://www.kaggle.com/datasets/sobhanmoosavi/us-accidents
License: CC BY-NC-SA 4.0 (per Kaggle metadata). This script downloads nothing
and never commits the raw CSV (see .gitignore).

Usage:  python scripts/preprocess_dataset.py [--input PATH] [--chunksize 200000]
"""
import argparse
import json
import math
import os
import sys
from collections import Counter, defaultdict
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))
from app.core.config import DATASET_SOURCE_URL, GRID_SIZE_DEG  # noqa: E402
from app.ml.risk import compute_hotspots, grid_key  # noqa: E402

BOOL_COLS = ["Traffic_Signal", "Junction", "Crossing", "Stop", "Traffic_Calming",
             "Give_Way", "Railway", "Roundabout", "Turning_Loop"]
DTYPES = {"Severity": "float32", "Start_Lat": "float32", "Start_Lng": "float32",
          "Temperature(F)": "float32", "Humidity(%)": "float32", "Visibility(mi)": "float32",
          "Wind_Speed(mph)": "float32", "Precipitation(in)": "float32", "Distance(mi)": "float32"}


def _is_true(v) -> bool:
    return str(v).strip().lower() in ("true", "1", "t", "yes")


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--input", default=str(ROOT / "data" / "raw" / "US_Accidents_March23.csv"))
    ap.add_argument("--chunksize", type=int, default=200000)
    ap.add_argument("--max-training-rows", type=int, default=200000)
    args = ap.parse_args()
    src = Path(args.input)
    if not src.exists():
        print(f"Dataset not found: {src}\n"
              "Download it from https://www.kaggle.com/datasets/sobhanmoosavi/us-accidents "
              "(Kaggle login required; see README section 6 and scripts/download_dataset.py) "
              "and place it at data/raw/US_Accidents_March23.csv. Nothing is fabricated in its place.")
        return 2
    out = Path(os.environ["ROADSENSE_PROCESSED_DIR"]) if os.environ.get("ROADSENSE_PROCESSED_DIR") else ROOT / "data" / "processed"
    out.mkdir(parents=True, exist_ok=True)

    total = valid = 0
    sev = Counter(); weather = Counter(); hourly = Counter(); weekday_c = Counter()
    monthly = Counter(); states = Counter(); cities = Counter(); infra = Counter()
    cells: dict = defaultdict(lambda: {"count": 0, "severity_sum": 0.0, "weather": Counter(),
                                       "infra": Counter(), "city": Counter(), "state": Counter(),
                                       "severity_dist": Counter(), "start_min": None, "start_max": None})
    sample_rows, train_rows = [], []
    seen_ids = set()
    first_chunk = True
    for chunk in pd.read_csv(src, chunksize=args.chunksize, dtype=DTYPES, low_memory=False, usecols=None):
        if first_chunk:
            print("Columns found:", list(chunk.columns))
            missing = [c for c in ["Severity", "Start_Time", "Start_Lat", "Start_Lng"] if c not in chunk.columns]
            if missing:
                print(f"ERROR: required columns missing: {missing}")
                return 2
            first_chunk = False
        chunk = chunk.drop_duplicates(subset=["ID"]) if "ID" in chunk.columns else chunk
        times = pd.to_datetime(chunk["Start_Time"], errors="coerce")
        chunk = chunk.assign(_t=times).dropna(subset=["_t", "Severity", "Start_Lat", "Start_Lng"])
        chunk = chunk[(chunk["Severity"].between(1, 4)) & (chunk["Start_Lat"].between(-90, 90)) & (chunk["Start_Lng"].between(-180, 180))]
        total += len(chunk)
        for row in chunk.itertuples(index=False):
            d = row._asdict() if hasattr(row, "_asdict") else {}
        # Vectorised counters (fast path)
        sev.update(chunk["Severity"].astype(int).tolist())
        hourly.update(chunk["_t"].dt.hour.tolist())
        weekday_c.update(chunk["_t"].dt.weekday.tolist())
        monthly.update(chunk["_t"].dt.strftime("%Y-%m").tolist())
        if "State" in chunk: states.update(chunk["State"].dropna().astype(str).tolist())
        if "City" in chunk: cities.update(chunk["City"].dropna().astype(str).tolist())
        if "Weather_Condition" in chunk: weather.update(chunk["Weather_Condition"].dropna().astype(str).str.strip().tolist())
        for col in BOOL_COLS:
            if col in chunk:
                infra[col] += int(chunk[col].map(_is_true).sum())
        # Grid aggregation + bounded samples (row loop only over this chunk)
        for _, r in chunk.iterrows():
            lat, lng, s = float(r["Start_Lat"]), float(r["Start_Lng"]), int(r["Severity"])
            cell = cells[grid_key(lat, lng)]
            cell["count"] += 1; cell["severity_sum"] += s
            cell["severity_dist"][s] += 1
            if "Weather_Condition" in chunk and pd.notna(r.get("Weather_Condition")):
                cell["weather"][str(r["Weather_Condition"]).strip()] += 1
            for col in BOOL_COLS:
                if col in chunk and _is_true(r.get(col)):
                    cell["infra"][col] += 1
            if "City" in chunk and pd.notna(r.get("City")): cell["city"][str(r["City"])] += 1
            if "State" in chunk and pd.notna(r.get("State")): cell["state"][str(r["State"])] += 1
            t = str(r["_t"].date())
            cell["start_min"] = t if cell["start_min"] is None else min(cell["start_min"], t)
            cell["start_max"] = t if cell["start_max"] is None else max(cell["start_max"], t)
        if len(sample_rows) < 5000:
            sample_rows.extend(chunk.head(5000 - len(sample_rows)).to_dict("records"))
        if len(train_rows) < args.max_training_rows:
            take = chunk.sample(n=min(args.max_training_rows - len(train_rows), len(chunk)), random_state=42) if len(chunk) > 0 else chunk
            train_rows.extend(take.to_dict("records"))
        valid += len(chunk)
        print(f"  processed {valid:,} valid rows...", flush=True)

    hotspots = compute_hotspots(cells)
    summary = {"total_records": valid, "total_rows_seen": total,
               "states_covered": len(states), "cities_covered": len(cities),
               "top_states": states.most_common(10), "top_cities": cities.most_common(10),
               "dataset_source": DATASET_SOURCE_URL, "grid_size_deg": GRID_SIZE_DEG,
               "hotspot_count": len(hotspots)}
    (out / "summary.json").write_text(json.dumps(summary, indent=2))
    (out / "hotspots.json").write_text(json.dumps({"hotspots": hotspots}, indent=2))
    (out / "trends.json").write_text(json.dumps({"monthly": [{"month": k, "count": v} for k, v in sorted(monthly.items())]}, indent=2))
    (out / "severity.json").write_text(json.dumps({"severity": {str(k): v for k, v in sorted(sev.items())}}, indent=2))
    (out / "weather.json").write_text(json.dumps({"weather": weather.most_common(20)}, indent=2))
    (out / "hourly.json").write_text(json.dumps({"hourly": [{"hour": k, "count": v} for k, v in sorted(hourly.items())]}, indent=2))
    (out / "weekday.json").write_text(json.dumps({"weekday": [{"weekday": k, "count": v} for k, v in sorted(weekday_c.items())]}, indent=2))
    (out / "infra.json").write_text(json.dumps({"infrastructure": dict(infra)}, indent=2))
    if sample_rows:
        pd.DataFrame(sample_rows).drop(columns=["_t"], errors="ignore").to_csv(out / "accidents_sample.csv", index=False)
    if train_rows:
        pd.DataFrame(train_rows).drop(columns=["_t"], errors="ignore").to_csv(out / "training_sample.csv", index=False)
    print(f"Done: {valid:,} valid records, {len(hotspots):,} hotspots -> {out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
