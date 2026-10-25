"""Transparent composite hotspot score (documented in README and About page).

Formula, for a grid cell with count n and severity-weighted mean severity s:
    freq_norm = n / max_cell_count_in_the_loaded_data
    sev_norm  = (s - 1) / 3            # severity range is 1..4 in the dataset
    risk_score = 100 * (0.6 * freq_norm + 0.4 * sev_norm)
Levels: score >= 70 High, >= 40 Medium, otherwise Low.
Cells below MIN_HOTSPOT_COUNT are dropped: a hotspot needs enough
observations to be meaningful. This is a HISTORICAL score, not a calibrated
probability of a future crash. Unavailable traffic/road data are treated as
missing, never as zero risk.
"""
import math
from collections import Counter, defaultdict

from app.core.config import (
    GRID_SIZE_DEG, HOTSPOT_WEIGHT_FREQUENCY, HOTSPOT_WEIGHT_SEVERITY,
    MIN_HOTSPOT_COUNT,
)


def risk_level(score: float) -> str:
    if score >= 70:
        return "High"
    if score >= 40:
        return "Medium"
    return "Low"


def grid_key(lat: float, lng: float, grid: float = GRID_SIZE_DEG):
    return (math.floor(lat / grid), math.floor(lng / grid))


def compute_hotspots(cells: dict, min_count: int = MIN_HOTSPOT_COUNT):
    """cells: {(glat, glng): {'count': int, 'severity_sum': float,
    'weather': Counter, 'infra': Counter, 'city': Counter, 'state': Counter,
    'start_min': str, 'start_max': str}} -> sorted list of hotspot dicts."""
    kept = {k: v for k, v in cells.items() if v["count"] >= min_count}
    if not kept:
        return []
    max_count = max(v["count"] for v in kept.values())
    out = []
    for (glat, glng), v in kept.items():
        mean_sev = v["severity_sum"] / v["count"]
        freq_norm = v["count"] / max_count if max_count else 0.0
        sev_norm = (mean_sev - 1.0) / 3.0
        score = 100 * (HOTSPOT_WEIGHT_FREQUENCY * freq_norm + HOTSPOT_WEIGHT_SEVERITY * sev_norm)
        weather = v.get("weather") or Counter()
        infra = v.get("infra") or Counter()
        out.append({
            "grid_lat": glat, "grid_lng": glng,
            "center_lat": round((glat + 0.5) * GRID_SIZE_DEG, 5),
            "center_lng": round((glng + 0.5) * GRID_SIZE_DEG, 5),
            "bounds": [glat * GRID_SIZE_DEG, glng * GRID_SIZE_DEG,
                       (glat + 1) * GRID_SIZE_DEG, (glng + 1) * GRID_SIZE_DEG],
            "accident_count": int(v["count"]),
            "mean_severity": round(mean_sev, 3),
            "risk_score": round(score, 2),
            "risk_level": risk_level(score),
            "severity_distribution": {str(k): int(x) for k, x in sorted((v.get("severity_dist") or Counter()).items())},
            "top_weather": [w for w, _ in weather.most_common(3)],
            "weather_counts": dict(weather.most_common(5)),
            "infra_counts": dict(infra),
            "city": (v.get("city") or Counter()).most_common(1)[0][0] if v.get("city") else "",
            "state": (v.get("state") or Counter()).most_common(1)[0][0] if v.get("state") else "",
            "observation_start": v.get("start_min", ""),
            "observation_end": v.get("start_max", ""),
        })
    out.sort(key=lambda h: h["risk_score"], reverse=True)
    return out
