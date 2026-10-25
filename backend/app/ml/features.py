"""Feature engineering shared by preprocessing, training and prediction.

Only predictors that could be known when a severity assessment is made are
used. The target (Severity) is never a predictor. Latitude/longitude are
deliberately NOT model features: they drive the hotspot lookup, not the
severity classifier, and claiming otherwise would conflate the two outputs.
"""
import math

import numpy as np
import pandas as pd

NUMERIC_FEATURES = [
    "hour", "weekday", "month", "is_weekend",
    "Temperature(F)", "Humidity(%)", "Visibility(mi)",
    "Wind_Speed(mph)", "Precipitation(in)", "Distance(mi)",
]
CATEGORICAL_FEATURES = ["Weather_Condition", "Sunrise_Sunset"]
BOOLEAN_FEATURES = [
    "Traffic_Signal", "Junction", "Crossing", "Stop", "Traffic_Calming",
    "Give_Way", "Railway", "Roundabout", "Turning_Loop",
]
ALL_FEATURES = NUMERIC_FEATURES + CATEGORICAL_FEATURES + BOOLEAN_FEATURES

# Columns the real CSV may carry, mapped to the canonical names above.
COLUMN_ALIASES = {
    "temperature(f)": "Temperature(F)", "humidity(%)": "Humidity(%)",
    "visibility(mi)": "Visibility(mi)", "wind_speed(mph)": "Wind_Speed(mph)",
    "precipitation(in)": "Precipitation(in)", "distance(mi)": "Distance(mi)",
    "start_lat": "Start_Lat", "start_lng": "Start_Lng",
    "weather_condition": "Weather_Condition", "sunrise_sunset": "Sunrise_Sunset",
}


def normalize_columns(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    rename = {c: COLUMN_ALIASES.get(str(c).lower(), c) for c in df.columns}
    return df.rename(columns=rename)


def _to_bool(series: pd.Series) -> pd.Series:
    if series.dtype == bool:
        return series.astype(float)
    return series.map(
        lambda v: 1.0 if str(v).strip().lower() in ("true", "1", "t", "yes")
        else 0.0 if str(v).strip().lower() in ("false", "0", "f", "no", "")
        else np.nan
    )


def validate_lat_lng(lat, lng) -> bool:
    try:
        return -90 <= float(lat) <= 90 and -180 <= float(lng) <= 180 and not (
            math.isnan(float(lat)) or math.isnan(float(lng))
        )
    except (TypeError, ValueError):
        return False


def engineer_features(df: pd.DataFrame) -> pd.DataFrame:
    """Return a frame with exactly ALL_FEATURES (missing columns -> NaN,
    later imputed by the pipeline) plus, when present, 'Severity'."""
    df = normalize_columns(df)
    out = pd.DataFrame(index=df.index)
    times = pd.to_datetime(df["Start_Time"], errors="coerce") if "Start_Time" in df else pd.Series(pd.NaT, index=df.index)
    out["hour"] = times.dt.hour
    out["weekday"] = times.dt.weekday
    out["month"] = times.dt.month
    out["is_weekend"] = (times.dt.weekday >= 5).astype(float)
    for col in NUMERIC_FEATURES[4:]:
        out[col] = pd.to_numeric(df[col], errors="coerce") if col in df else np.nan
    for col in CATEGORICAL_FEATURES:
        if col in df:
            out[col] = df[col].astype(str).str.strip().replace({"nan": np.nan, "None": np.nan})
            out.loc[out[col].str.len() > 80, col] = np.nan
        else:
            out[col] = np.nan
    for col in BOOLEAN_FEATURES:
        out[col] = _to_bool(df[col]) if col in df else np.nan
    if "Severity" in df:
        out["Severity"] = pd.to_numeric(df["Severity"], errors="coerce")
    return out


def build_pipeline():
    from sklearn.compose import ColumnTransformer
    from sklearn.ensemble import RandomForestClassifier
    from sklearn.impute import SimpleImputer
    from sklearn.pipeline import Pipeline
    from sklearn.preprocessing import OneHotEncoder, StandardScaler

    numeric = Pipeline([("imputer", SimpleImputer(strategy="median")), ("scaler", StandardScaler())])
    categorical = Pipeline([
        ("imputer", SimpleImputer(strategy="most_frequent")),
        ("encoder", OneHotEncoder(handle_unknown="ignore")),
    ])
    boolean = Pipeline([("imputer", SimpleImputer(strategy="most_frequent"))])
    pre = ColumnTransformer([
        ("num", numeric, NUMERIC_FEATURES),
        ("cat", categorical, CATEGORICAL_FEATURES),
        ("bool", boolean, BOOLEAN_FEATURES),
    ])
    clf = RandomForestClassifier(n_estimators=200, random_state=42, n_jobs=-1, class_weight="balanced_subsample")
    return Pipeline([("preprocess", pre), ("classifier", clf)])
