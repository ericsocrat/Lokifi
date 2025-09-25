from __future__ import annotations
from typing import Iterable
from app.utils.redis import redis_json_get, redis_json_set
from app.services.providers import polygon, finnhub, alphavantage, coingecko, cmc

def _is_equity(symbol: str) -> bool:
    s = symbol.replace("-", "").replace(".", "").replace(":", "")
    return s.isalpha() and 1 < len(s) <= 5

async def _try_chain(tasks: Iterable[callable]):
    last = None
    for fn in tasks:
        try:
            data = await fn()
            if data:
                return data
        except Exception as e:
            last = e
    if last: raise last
    return []

async def get_ohlc(symbol: str, timeframe: str, limit: int):
    key = f"ohlc:{symbol}:{timeframe}:{limit}"
    cached = await redis_json_get(key)
    if cached:
        return cached

    if _is_equity(symbol):
        data = await _try_chain([
            lambda: polygon.fetch_ohlc(symbol, timeframe, limit),
            lambda: finnhub.fetch_ohlc(symbol, timeframe, limit),
            lambda: alphavantage.fetch_ohlc(symbol, timeframe, limit),
        ])
    else:
        data = await _try_chain([
            lambda: coingecko.fetch_ohlc(symbol, timeframe, limit),
            lambda: cmc.fetch_ohlc(symbol, timeframe, limit),
        ])

    await redis_json_set(key, data, ttl=60)
    return data
