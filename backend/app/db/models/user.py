from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy import String, TIMESTAMP, func
from app.db.base import Base

class User(Base):
    __tablename__ = "users"
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    handle: Mapped[str | None] = mapped_column(String(32), unique=True)
    name: Mapped[str | None] = mapped_column(String(128))
    avatar_url: Mapped[str | None]
    created_at: Mapped[str] = mapped_column(TIMESTAMP(timezone=True), server_default=func.now())
