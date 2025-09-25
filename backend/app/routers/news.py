from fastapi import APIRouter
from app.services.news import get_news

router = APIRouter(prefix="/news", tags=["news"])

@router.get("/")
async def news(symbol: str, limit: int = 20):
    return await get_news(symbol, limit)
