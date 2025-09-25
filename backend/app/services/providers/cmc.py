from .base import _get
from app.core.config import settings

async def fetch_ohlc(symbol: str, timeframe: str, limit: int):
    data = await _get(
        "https://pro-api.coinmarketcap.com/v2/cryptocurrency/ohlcv/historical",
        {"symbol": symbol.replace("USD",""), "convert": "USD", "count": limit, "interval": timeframe, "CMC_PRO_API_KEY": settings.CMC_KEY},
    )
    quotes = data.get("data", {}).get("quotes", [])
    out = []
    for q in quotes:
        usd = q["quote"]["USD"]
        out.append({"ts": 0, "o": usd["open"], "h": usd["high"], "l": usd["low"], "c": usd["close"], "v": usd.get("volume", 0)})
    return out
