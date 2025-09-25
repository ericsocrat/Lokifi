from sqlalchemy import ForeignKey, String, TIMESTAMP, func, ARRAY
from sqlalchemy.orm import Mapped, mapped_column
from app.db.base import Base

class Post(Base):
    __tablename__ = "posts"
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    body: Mapped[str] = mapped_column(String(2000))
    symbols: Mapped[list[str] | None] = mapped_column(ARRAY(String))
    media_url: Mapped[str | None]
    created_at: Mapped[str] = mapped_column(TIMESTAMP(timezone=True), server_default=func.now())
