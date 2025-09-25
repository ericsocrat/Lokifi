from .base import _get
from app.core.config import settings

def _tf(timeframe: str):
    return {"15m": (15, "minute"), "30m": (30, "minute"), "1h": (1, "hour"), "4h": (4, "hour"), "1d": (1, "day"), "1w": (1, "week")}[timeframe]

async def fetch_ohlc(symbol: str, timeframe: str, limit: int):
    mult, unit = _tf(timeframe)
    url = f"https://api.polygon.io/v2/aggs/ticker/{symbol}/range/{mult}/{unit}/2024-01-01/2025-12-31"
    data = await _get(url, {"apiKey": settings.POLYGON_KEY, "limit": limit})
    return [{"ts": r["t"], "o": r["o"], "h": r["h"], "l": r["l"], "c": r["c"], "v": r.get("v", 0)} for r in data.get("results", [])][-limit:]
