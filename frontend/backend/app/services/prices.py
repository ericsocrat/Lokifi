from __future__ import annotations
from typing import Any, Dict, List, Tuple
import os

from app.services.errors import ProviderError, RateLimitError, NotFoundError
from app.services.timeframes import normalize

# We assume provider adapters exist under app.providers.<name> with a function:
#   get_ohlcv(symbol: str, timeframe: str, limit: int) -> List[Dict]
# Each should raise RateLimitError/NotFoundError/ProviderError on issues.
# If a provider module isn't present, we simply skip it.

def _try_import(name: str):
    try:
        module = __import__(f"app.providers.{name}", fromlist=["*"])
        return module
    except Exception:
        return None

def _provider_chain() -> List[Tuple[str, Any]]:
    """
    Build an ordered list of available providers.
    Order can be influenced via env FYNIX_PROVIDER_ORDER (comma-separated),
    e.g. "polygon,finnhub,alphavantage,coingecko"
    """
    default_order = ["alphavantage", "polygon", "finnhub", "coingecko"]
    env_order = os.getenv("FYNIX_PROVIDER_ORDER")
    names = [n.strip() for n in env_order.split(",")] if env_order else default_order

    chain = []
    for n in names:
        m = _try_import(n)
        if m and hasattr(m, "get_ohlcv"):
            chain.append((n, m))
    return chain

def fetch_ohlc(symbol: str, timeframe: str, limit: int = 500) -> List[Dict[str, Any]]:
    """
    Try providers in order until one returns OHLC.
    Timeframe is normalized to canonical and passed through to adapters
    (adapters should internally map if needed).
    """
    tf = normalize(timeframe)
    errs: List[str] = []
    for name, mod in _provider_chain():
        try:
            data = mod.get_ohlcv(symbol=symbol, timeframe=tf, limit=limit)
            # Validate minimal schema
            if not isinstance(data, list) or not data:
                raise ProviderError(f"{name} returned empty/invalid payload")
            first = data[0]
            for k in ("time", "open", "high", "low", "close", "volume"):
                if k not in first:
                    raise ProviderError(f"{name} payload missing key: {k}")
            return data
        except RateLimitError as e:
            errs.append(f"{name}: rate-limited")
            continue
        except NotFoundError as e:
            errs.append(f"{name}: not found")
            continue
        except ProviderError as e:
            errs.append(f"{name}: {e}")
            continue
        except Exception as e:
            errs.append(f"{name}: {type(e).__name__} {e}")
            continue

    raise ProviderError("All providers failed: " + " | ".join(errs))
