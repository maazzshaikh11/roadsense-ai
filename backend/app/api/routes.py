import logging
from typing import Optional

from fastapi import APIRouter, HTTPException, Query

from app.core.config import (
    DATASET_AUTHOR, DATASET_COVERAGE, DATASET_LICENSE, DATASET_NAME,
    DATASET_SOURCE_URL, GRID_SIZE_DEG, MIN_HOTSPOT_COUNT, raw_csv_path,
)
from app.ml import predict as predict_mod
from app.schemas.schemas import PredictRequest
from app.services import data_store as ds

log = logging.getLogger("roadsense")
router = APIRouter()
SETUP_MSG = ("Processed dataset not found. Place the Kaggle CSV at "
             "data/raw/US_Accidents_March23.csv and run: python scripts/preprocess_dataset.py "
             "See README section 6. No data is shown until real processed data exists.")


def _require_data():
    if not ds.data_available():
        raise HTTPException(status_code=503, detail=SETUP_MSG)
    return True


def _filter_hotspots(hotspots, state=None, min_score=None, level=None, bbox=None):
    out = hotspots
    if state:
        out = [h for h in out if h.get("state", "").lower() == state.lower()]
    if level:
        out = [h for h in out if h.get("risk_level", "").lower() == level.lower()]
    if min_score is not None:
        out = [h for h in out if h["risk_score"] >= min_score]
    if bbox:
        min_lat, min_lng, max_lat, max_lng = bbox
        out = [h for h in out if min_lat <= h["center_lat"] <= max_lat and min_lng <= h["center_lng"] <= max_lng]
    return out


@router.get("/health")
def health():
    from app.db.session import init_db

    return {"status": "ok", "data_available": ds.data_available(),
            "model_available": predict_mod.model_available(),
            "database_reachable": init_db()}


@router.get("/dataset/info")
def dataset_info():
    return {"name": DATASET_NAME, "author": DATASET_AUTHOR, "coverage": DATASET_COVERAGE,
            "source_url": DATASET_SOURCE_URL, "license": DATASET_LICENSE,
            "filename": "US_Accidents_March23.csv", "raw_path_present": raw_csv_path().exists(),
            "processed_available": ds.data_available(),
            "setup_message": None if ds.data_available() else SETUP_MSG}


@router.get("/dashboard/summary")
def dashboard_summary(state: Optional[str] = None):
    _require_data()
    s = ds.summary()
    hotspots = _filter_hotspots(ds.hotspots() or [], state=state)
    top = hotspots[0] if hotspots else None
    return {**s, "top_hotspot": top,
            "hotspot_count": len(hotspots),
            "filters_applied": {"state": state}}


@router.get("/analytics/trends")
def trends():
    _require_data()
    return ds.trends()


@router.get("/analytics/severity")
def severity():
    _require_data()
    return ds.severity()


@router.get("/analytics/weather")
def weather():
    _require_data()
    return {"weather": ds.weather(), "hourly": ds.hourly(),
            "weekday": ds.weekday(), "infrastructure": ds.infra()}


@router.get("/analytics/hotspots")
def analytics_hotspots(limit: int = Query(20, ge=1, le=100), state: Optional[str] = None):
    _require_data()
    return {"hotspots": _filter_hotspots(ds.hotspots() or [], state=state)[:limit]}


@router.get("/map/hotspots")
def map_hotspots(state: Optional[str] = None, level: Optional[str] = None,
                 min_score: Optional[float] = None,
                 min_lat: Optional[float] = None, min_lng: Optional[float] = None,
                 max_lat: Optional[float] = None, max_lng: Optional[float] = None,
                 limit: int = Query(2000, ge=1, le=5000)):
    _require_data()
    bbox = (min_lat, min_lng, max_lat, max_lng) if None not in (min_lat, min_lng, max_lat, max_lng) else None
    hs = _filter_hotspots(ds.hotspots() or [], state=state, level=level, min_score=min_score, bbox=bbox)
    return {"hotspots": hs[:limit], "total": len(hs), "grid_size_deg": GRID_SIZE_DEG,
            "min_count": MIN_HOTSPOT_COUNT,
            "method": "risk_score = 100 * (0.6 * count/max_count + 0.4 * (mean_severity-1)/3); "
                      "historical only, not a future-crash probability."}


@router.get("/map/accidents")
def map_accidents(state: Optional[str] = None, severity_level: Optional[int] = None,
                  min_lat: Optional[float] = None, min_lng: Optional[float] = None,
                  max_lat: Optional[float] = None, max_lng: Optional[float] = None,
                  limit: int = Query(500, ge=1, le=1000), offset: int = Query(0, ge=0)):
    _require_data()
    rows = ds.accidents_sample() or []
    out = []
    for r in rows:
        try:
            lat, lng = float(r.get("Start_Lat", "")), float(r.get("Start_Lng", ""))
            sev = int(float(r.get("Severity", 0)))
        except (TypeError, ValueError):
            continue
        if state and str(r.get("State", "")).lower() != state.lower():
            continue
        if severity_level and sev != severity_level:
            continue
        if None not in (min_lat, min_lng, max_lat, max_lng) and not (min_lat <= lat <= max_lat and min_lng <= lng <= max_lng):
            continue
        out.append({"latitude": lat, "longitude": lng, "severity": sev,
                    "start_time": r.get("Start_Time", ""), "city": r.get("City", ""),
                    "state": r.get("State", ""), "weather": r.get("Weather_Condition", "")})
    return {"accidents": out[offset:offset + limit], "total_in_sample": len(out),
            "is_sample": True,
            "note": "Bounded sample from the pre-processed data for map rendering; "
                    "the full dataset is aggregated into hotspots, not sent to the browser."}


@router.post("/predict/severity")
def predict_severity(req: PredictRequest):
    if not predict_mod.model_available():
        raise HTTPException(status_code=503, detail=(
            "Model not trained. Run: python scripts/preprocess_dataset.py && "
            "python -m app.ml.train  (from backend/)"))
    return predict_mod.predict_severity(req)


@router.get("/model/info")
def model_info():
    info = predict_mod.model_info()
    if info is None:
        return {"trained": False, "model_available": predict_mod.model_available(),
                "setup_message": "Model not trained yet. Run python -m app.ml.train from backend/ after preprocessing."}
    return {"trained": True, **info}


@router.get("/model/metrics")
def model_metrics():
    info = predict_mod.model_info()
    if info is None:
        raise HTTPException(status_code=503, detail="Model metrics unavailable: model has not been trained.")
    return info
