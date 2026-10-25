import joblib
import pandas as pd

from app.core.config import metrics_path, model_path
from app.ml.features import ALL_FEATURES
from app.schemas.schemas import PredictRequest


def model_available() -> bool:
    return model_path().exists()


def load_model():
    return joblib.load(model_path())


def predict_severity(req: PredictRequest) -> dict:
    bundle = load_model()
    pipe, labels = bundle["pipeline"], bundle["labels"]
    row = {
        "hour": req.hour, "weekday": req.weekday, "month": req.month,
        "is_weekend": 1.0 if req.weekday >= 5 else 0.0,
        "Temperature(F)": req.temperature_f, "Humidity(%)": req.humidity_pct,
        "Visibility(mi)": req.visibility_mi, "Wind_Speed(mph)": req.wind_speed_mph,
        "Precipitation(in)": req.precipitation_in, "Distance(mi)": req.distance_mi,
        "Weather_Condition": req.weather_condition, "Sunrise_Sunset": req.sunrise_sunset,
        "Traffic_Signal": float(req.traffic_signal), "Junction": float(req.junction),
        "Crossing": float(req.crossing), "Stop": float(req.stop),
        "Traffic_Calming": float(req.traffic_calming), "Give_Way": float(req.give_way),
        "Railway": float(req.railway), "Roundabout": float(req.roundabout),
        "Turning_Loop": float(req.turning_loop),
    }
    X = pd.DataFrame([row])[ALL_FEATURES]
    pred = int(pipe.predict(X)[0])
    probs = {}
    if hasattr(pipe, "predict_proba"):
        for cls, p in zip(pipe.classes_, pipe.predict_proba(X)[0]):
            probs[str(int(cls))] = round(float(p), 4)
    return {
        "predicted_severity": pred,
        "class_probabilities": probs,
        "features_used": row,
        "model_version": bundle.get("model_version", "unknown"),
        "explanation": "Predicted severity IF an accident with these recorded conditions occurred. "
                       "These probabilities are the classifier's class probabilities, "
                       "not the probability that an accident will happen at this location.",
        "limitations": [
            "Severity classification only; not an accident-occurrence forecast.",
            "Latitude/longitude locate the assessment on the map; they are not severity-model features.",
            "Traffic volume was not supplied by the dataset and is not used by the model.",
        ],
        "traffic_source": req.traffic_source or "not provided / unavailable",
    }


def model_info():
    if metrics_path().exists():
        import json

        return json.loads(metrics_path().read_text())
    return None
