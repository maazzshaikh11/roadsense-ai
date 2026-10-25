from typing import Optional

from pydantic import BaseModel, Field


class PredictRequest(BaseModel):
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)
    hour: int = Field(ge=0, le=23)
    weekday: int = Field(ge=0, le=6)
    month: int = Field(ge=1, le=12)
    temperature_f: Optional[float] = Field(default=None, ge=-60, le=140)
    humidity_pct: Optional[float] = Field(default=None, ge=0, le=100)
    visibility_mi: Optional[float] = Field(default=None, ge=0, le=100)
    wind_speed_mph: Optional[float] = Field(default=None, ge=0, le=300)
    precipitation_in: Optional[float] = Field(default=None, ge=0, le=50)
    distance_mi: Optional[float] = Field(default=None, ge=0, le=1000)
    weather_condition: Optional[str] = Field(default=None, max_length=80)
    sunrise_sunset: Optional[str] = Field(default=None, pattern="^(Day|Night)$")
    traffic_signal: bool = False
    junction: bool = False
    crossing: bool = False
    stop: bool = False
    traffic_calming: bool = False
    give_way: bool = False
    railway: bool = False
    roundabout: bool = False
    turning_loop: bool = False
    traffic_source: Optional[str] = Field(
        default=None, description="How traffic info was obtained, if supplied at all. "
        "The dataset has no measured traffic volume; do not claim otherwise.")
