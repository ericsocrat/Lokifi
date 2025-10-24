from app.core.config import settings

from .base import _get


async def fetch_news(symbol: str, limit: int = 20):
    data = await _get(
        "https://financialmodelingprep.com/api/v3/stock_news",
        {"tickers": symbol, "limit": limit, "apikey": settings.FMP_KEY},
    )
    return [
        {
            "id": i,
            "symbol": symbol,
            "source": n.get("site"),
            "title": n.get("title"),
            "url": n.get("url"),
            "published_at": n.get("published"),
        }
        for i, n in enumerate(data)
    ]
