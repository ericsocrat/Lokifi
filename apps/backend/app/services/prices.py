from __future__ import annotations

from collections.abc import Awaitable, Callable, Iterable
from typing import Any

from app.services.providers import alphavantage, cmc, coingecko, finnhub, polygon
from app.utils.redis import redis_json_get, redis_json_set


def _is_equity(symbol: str) -> bool:
    s = symbol.replace("-", "").replace(".", "").replace(":", "")
    return s.isalpha() and 1 < len(s) <= 5


async def _try_chain(tasks: Iterable[Callable[[], Awaitable[Any]]]):
    for fn in tasks:
        try:
            data = await fn()
            if data:
                return data
        except Exception:
            continue  # Continue to next provider instead of raising

    # Don't raise exception, return empty list so fallback can be used
    return []


async def get_ohlc(symbol: str, timeframe: str, limit: int):
    key = f"ohlc:{symbol}:{timeframe}:{limit}"
    cached = await redis_json_get(key)
    if cached:
        return cached

    if _is_equity(symbol):
        data = await _try_chain(
            [
                lambda: polygon.fetch_ohlc(symbol, timeframe, limit),
                lambda: finnhub.fetch_ohlc(symbol, timeframe, limit),
                lambda: alphavantage.fetch_ohlc(symbol, timeframe, limit),
            ]
        )
    else:
        data = await _try_chain(
            [
                lambda: coingecko.fetch_ohlc(symbol, timeframe, limit),
                lambda: cmc.fetch_ohlc(symbol, timeframe, limit),
            ]
        )

    await redis_json_set(key, data, ttl=60)
    return data
