from app.core.config import settings

from .base import _get


async def fetch_ohlc(symbol: str, timeframe: str, limit: int):
    func = "TIME_SERIES_INTRADAY" if timeframe in ("15m","30m","1h","4h") else "TIME_SERIES_DAILY_ADJUSTED"
    interval = {"15m":"15min","30m":"30min","1h":"60min","4h":"60min"}.get(timeframe)
    params = {"function": func, "symbol": symbol, "apikey": settings.ALPHAVANTAGE_KEY}
    if interval:
        params["interval"] = interval
    data = await _get("https://www.alphavantage.co/query", params)
    series = next((v for k,v in data.items() if "Time Series" in k), {})
    items = []
    for ts, row in list(series.items())[:limit][::-1]:
        from datetime import datetime
        items.append({
            "ts": int(datetime.fromisoformat(ts).timestamp()*1000),
            "o": float(row.get("1. open")),
            "h": float(row.get("2. high")),
            "l": float(row.get("3. low")),
            "c": float(row.get("4. close")),
            "v": float(row.get("6. volume", 0)),
        })
    return items
