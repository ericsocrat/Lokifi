from pydantic import BaseModel


class HoldingIn(BaseModel):
    symbol: str
    quantity: float
    cost_basis: float

class PortfolioCreate(BaseModel):
    name: str
    is_public: bool = False
    benchmark_symbol: str | None = None

class PortfolioOut(BaseModel):
    id: int
    name: str
    is_public: bool
    benchmark_symbol: str | None
