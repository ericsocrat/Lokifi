from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from .config import settings


class Base(DeclarativeBase):
    pass


engine = create_engine(
    settings().database_url,
    pool_pre_ping=True,
    pool_size=settings().database_pool_size,
    max_overflow=2,
    pool_recycle=300,
)
SessionLocal = sessionmaker(engine, expire_on_commit=False)


def get_db():
    with SessionLocal() as db:
        try:
            yield db
            db.commit()
        except Exception:
            db.rollback()
            raise


def owned(db: Session, model, item_id: str, user_id: str):
    from fastapi import HTTPException

    item = db.get(model, item_id)
    if item is None or item.user_id != user_id:
        raise HTTPException(404, "Record not found")
    return item
