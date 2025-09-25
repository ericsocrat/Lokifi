from sqlalchemy import ForeignKey, Numeric, String, TIMESTAMP, func
from sqlalchemy.orm import Mapped, mapped_column
from app.db.base import Base

class Portfolio(Base):
    __tablename__ = "portfolios"
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    name: Mapped[str] = mapped_column(String(64))
    is_public: Mapped[bool] = mapped_column(default=False)
    benchmark_symbol: Mapped[str | None] = mapped_column(String(16))
    created_at: Mapped[str] = mapped_column(TIMESTAMP(timezone=True), server_default=func.now())

class Holding(Base):
    __tablename__ = "holdings"
    id: Mapped[int] = mapped_column(primary_key=True)
    portfolio_id: Mapped[int] = mapped_column(ForeignKey("portfolios.id", ondelete="CASCADE"), index=True)
    symbol: Mapped[str] = mapped_column(String(16), index=True)
    quantity: Mapped[float] = mapped_column(Numeric(20,8))
    cost_basis: Mapped[float] = mapped_column(Numeric(20,8))
    created_at: Mapped[str] = mapped_column(TIMESTAMP(timezone=True), server_default=func.now())
