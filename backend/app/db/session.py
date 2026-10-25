from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.config import DATABASE_URL

engine = create_engine(DATABASE_URL, pool_pre_ping=True, future=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True)


def init_db() -> bool:
    """Create tables if the database is reachable. Returns False (not an
    exception) when it is not, so the app can still run in setup mode."""
    try:
        from app.db.models import Base

        Base.metadata.create_all(bind=engine)
        return True
    except Exception:
        return False
