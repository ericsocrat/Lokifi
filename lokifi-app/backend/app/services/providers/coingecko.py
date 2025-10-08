from app.core.config import settings

from .base import _get


async def fetch_ohlc(symbol: str, timeframe: str, limit: int):
    days = {"15m": 1, "30m": 1, "1h": 1, "4h": 7, "1d": 30, "1w": 90}[timeframe]
    coin = symbol.lower().replace("usd", "").replace("-", "")
    data = await _get(f"https://api.coingecko.com/api/v3/coins/{coin}/ohlc", {
        "vs_currency": "usd",
        "days": days,
        "x_cg_demo_api_key": settings.COINGECKO_KEY,
    })
    return [{"ts": int(x[0]), "o": x[1], "h": x[2], "l": x[3], "c": x[4], "v": 0} for x in data][-limit:]
