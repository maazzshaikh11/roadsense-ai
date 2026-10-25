"""Configuration. No secrets here; credentials come only from the environment."""
import os
from pathlib import Path

# --- Real dataset source (mandatory, embedded in code) -----------------------
DATASET_NAME = "US Accidents (2016-2023)"
DATASET_AUTHOR = "Sobhan Moosavi"
DATASET_COVERAGE = "February 2016 through March 2023"
DATASET_SOURCE_URL = "https://www.kaggle.com/datasets/sobhanmoosavi/us-accidents"
DATASET_METADATA_URL = "https://www.kaggle.com/datasets/sobhanmoosavi/us-accidents/metadata"
DATASET_LICENSE = "CC BY-NC-SA 4.0 (per Kaggle dataset metadata)"
DATASET_FILENAME = "US_Accidents_March23.csv"
MODEL_VERSION = "severity-rf-v1"
RANDOM_SEED = 42

# Project root = roadsense-ai/ (three levels above this file's directory's parent chain:
# app/core/config.py -> app -> backend -> roadsense-ai)
PROJECT_ROOT = Path(__file__).resolve().parents[3]
BACKEND_DIR = PROJECT_ROOT / "backend"


def _dir(env_name: str, default: Path) -> Path:
    value = os.environ.get(env_name)
    return Path(value).expanduser() if value else default


def raw_dir() -> Path:
    return _dir("ROADSENSE_RAW_DIR", PROJECT_ROOT / "data" / "raw")


def processed_dir() -> Path:
    return _dir("ROADSENSE_PROCESSED_DIR", PROJECT_ROOT / "data" / "processed")


def artifacts_dir() -> Path:
    return _dir("ROADSENSE_ARTIFACTS_DIR", BACKEND_DIR / "artifacts")


def raw_csv_path() -> Path:
    return raw_dir() / DATASET_FILENAME


def model_path() -> Path:
    return artifacts_dir() / "accident_severity_model.joblib"


def metrics_path() -> Path:
    return artifacts_dir() / "model_metrics.json"


DATABASE_URL = os.environ.get(
    "DATABASE_URL", f"sqlite:///{BACKEND_DIR / 'roadsense.db'}"
)
FRONTEND_ORIGIN = os.environ.get("FRONTEND_ORIGIN", "http://localhost:5173")
GRID_SIZE_DEG = float(os.environ.get("GRID_SIZE_DEG", "0.05"))
MIN_HOTSPOT_COUNT = int(os.environ.get("MIN_HOTSPOT_COUNT", "10"))
HOTSPOT_WEIGHT_FREQUENCY = float(os.environ.get("HOTSPOT_WEIGHT_FREQUENCY", "0.6"))
HOTSPOT_WEIGHT_SEVERITY = float(os.environ.get("HOTSPOT_WEIGHT_SEVERITY", "0.4"))
