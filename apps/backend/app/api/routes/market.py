from __future__ import annotations

from typing import Any

from fastapi import APIRouter, HTTPException, Query

from app.services.errors import NotFoundError, ProviderError
from app.services.prices import fetch_ohlc

router = APIRouter()


@router.get("/health")
def health() -> dict:
    return {"ok": True}


@router.get("/ohlc")
def get_ohlc(
    symbol: str = Query(..., description="Symbol, e.g., BTCUSD or AAPL"),
    timeframe: str = Query("1h", description="1m, 5m, 15m, 1h, 4h, 1d"),
    limit: int = Query(500, ge=1, le=5000, description="Number of bars"),
) -> list[dict[str, Any]]:
    try:
        return fetch_ohlc(symbol=symbol, timeframe=timeframe, limit=limit)
    except NotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except ProviderError as e:
        raise HTTPException(status_code=502, detail=str(e))
    except Exception:
        raise HTTPException(status_code=500, detail="Internal server error")
