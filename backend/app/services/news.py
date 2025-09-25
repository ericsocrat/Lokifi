from app.services.providers import marketaux, newsapi, fmp

async def get_news(symbol: str, limit: int = 20):
    for fn in (
        lambda: marketaux.fetch_news(symbol, limit),
        lambda: newsapi.fetch_news(symbol, limit),
        lambda: fmp.fetch_news(symbol, limit),
    ):
        try:
            data = await fn()
            if data:
                return data[:limit]
        except Exception:
            pass
    return []
