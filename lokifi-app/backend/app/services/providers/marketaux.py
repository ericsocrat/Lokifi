from app.core.config import settings

from .base import _get


async def fetch_news(symbol: str, limit: int=20):
    data = await _get("https://api.marketaux.com/v1/news/all", {"symbols": symbol, "filter_entities": "true", "api_token": settings.MARKETAUX_KEY, "limit": limit})
    return [{"id": a.get("uuid", i), "symbol": symbol, "source": a.get("source"), "title": a.get("title"), "url": a.get("url"), "published_at": a.get("published_at")} for i,a in enumerate(data.get("data", []))]
