from __future__ import annotations

import os
from contextlib import contextmanager

from app.db.models import Base
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

DB_PATH = os.getenv(
    "LOKIFI_DB_PATH", os.path.join(os.path.dirname(__file__), "..", "..", "data", "lokifi.sqlite")
)
DB_URI = f"sqlite:///{DB_PATH}"

os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)

engine = create_engine(DB_URI, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False)


def init_db():
    Base.metadata.create_all(bind=engine)


@contextmanager
def get_session() -> Session:
    db = SessionLocal()
    try:
        yield db
        db.commit()
    except:
        db.rollback()
        raise
    finally:
        db.close()
