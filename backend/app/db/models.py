"""SQLAlchemy 2.x models. Tables are created on startup (best effort);
PostgreSQL is used when DATABASE_URL points at it, otherwise SQLite.
The API itself serves aggregated JSON produced by preprocessing, so a
missing/unreachable database never breaks the dashboard -- it is reported
in /api/health instead of being silently faked."""
from sqlalchemy import DateTime, Float, Integer, String, Text
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    pass


class DatasetInfo(Base):
    __tablename__ = "dataset_info"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(255))
    author: Mapped[str] = mapped_column(String(255))
    source_url: Mapped[str] = mapped_column(Text)
    coverage: Mapped[str] = mapped_column(String(255))
    license: Mapped[str] = mapped_column(String(255))
    total_records: Mapped[int] = mapped_column(Integer, default=0)


class Hotspot(Base):
    __tablename__ = "hotspots"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    grid_lat: Mapped[float] = mapped_column(Float)
    grid_lng: Mapped[float] = mapped_column(Float)
    center_lat: Mapped[float] = mapped_column(Float)
    center_lng: Mapped[float] = mapped_column(Float)
    accident_count: Mapped[int] = mapped_column(Integer)
    mean_severity: Mapped[float] = mapped_column(Float)
    risk_score: Mapped[float] = mapped_column(Float)
    risk_level: Mapped[str] = mapped_column(String(32))
    state: Mapped[str] = mapped_column(String(64), default="")
    city: Mapped[str] = mapped_column(String(128), default="")


class AccidentRecord(Base):
    """Optional persistence for a bounded, pre-processed sample only.
    Never used to claim the full multi-million-row dataset is in the DB."""
    __tablename__ = "accident_records"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    severity: Mapped[int] = mapped_column(Integer)
    start_time: Mapped[str] = mapped_column(DateTime, nullable=True)
    latitude: Mapped[float] = mapped_column(Float)
    longitude: Mapped[float] = mapped_column(Float)
    city: Mapped[str] = mapped_column(String(128), default="")
    state: Mapped[str] = mapped_column(String(64), default="")
    weather_condition: Mapped[str] = mapped_column(String(128), default="")
