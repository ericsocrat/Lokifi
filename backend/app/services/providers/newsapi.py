from app.core.config import settings

from .base import _get


async def fetch_news(symbol: str, limit: int=20):
    data = await _get("https://newsapi.org/v2/everything", {"q": symbol, "apiKey": settings.NEWSAPI_KEY, "pageSize": limit})
    return [{"id": i, "symbol": symbol, "source": a["source"]["name"], "title": a["title"], "url": a["url"], "published_at": a["publishedAt"]} for i,a in enumerate(data.get("articles", []))]
