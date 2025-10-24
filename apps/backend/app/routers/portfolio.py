from fastapi import APIRouter

from app.db.schemas.portfolio import HoldingIn, PortfolioCreate

router = APIRouter(prefix="/portfolio", tags=["portfolio"])


@router.post("/")
async def create_portfolio(body: PortfolioCreate):
    return {"id": 1, **body.model_dump()}


@router.post("/{pid}/holdings")
async def add_holding(pid: int, h: HoldingIn):
    return {"id": 1, **h.model_dump()}
