from app.core.config import settings

from .base import _get


async def fetch_ohlc(symbol: str, timeframe: str, limit: int):
    res = await _get("https://finnhub.io/api/v1/stock/candle", {
        "symbol": symbol,
        "resolution": timeframe.replace("1d","D").replace("1w","W").replace("4h","240").replace("1h","60").replace("30m","30").replace("15m","15"),
        "count": limit,
        "token": settings.FINNHUB_KEY,
    })
    if res.get("s") != "ok":
        return []
    return [{"ts": int(t*1000), "o": o, "h": h, "low": low, "c": c, "v": v} for t,o,h,low,c,v in zip(res["t"], res["o"], res["h"], res["l"], res["c"], res.get("v", [0]*len(res["t"])), strict=False)]
