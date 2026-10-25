"""Reads the JSON aggregates written by scripts/preprocess_dataset.py.
Every function returns None when processed data is absent, so callers can
return a setup-mode response instead of invented numbers."""
import json
from pathlib import Path

from app.core.config import processed_dir

_CACHE: dict = {}


def _load(name: str):
    path = processed_dir() / name
    if not path.exists():
        return None
    mtime = path.stat().st_mtime
    if _CACHE.get(name, (None, None))[1] != mtime:
        _CACHE[name] = (json.loads(path.read_text()), mtime)
    return _CACHE[name][0]


def data_available() -> bool:
    return (processed_dir() / "summary.json").exists()


def summary():
    return _load("summary.json")


def hotspots():
    data = _load("hotspots.json")
    return data["hotspots"] if data else None


def trends():
    return _load("trends.json")


def severity():
    return _load("severity.json")


def weather():
    return _load("weather.json")


def hourly():
    return _load("hourly.json")


def weekday():
    return _load("weekday.json")


def infra():
    return _load("infra.json")


def accidents_sample():
    import csv

    path = processed_dir() / "accidents_sample.csv"
    if not path.exists():
        return None
    with path.open(newline="") as f:
        return list(csv.DictReader(f))
