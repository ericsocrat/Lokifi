from fastapi import APIRouter, HTTPException, Query
from app.db.schemas.market import OHLCResponse, Timeframe
from app.services.prices import get_ohlc

router = APIRouter(prefix="/ohlc", tags=["market"])

@router.get("/", response_model=OHLCResponse)
async def ohlc(
    symbol: str = Query(..., description="Ticker or crypto id (e.g., AAPL, BTC, bitcoin, BTCUSD)"),
    timeframe: Timeframe = "1h",
    limit: int = 500,
):
    candles = await get_ohlc(symbol, timeframe, limit)
    if candles is None or len(candles) == 0:
        raise HTTPException(404, "No data")
    return {"symbol": symbol, "timeframe": timeframe, "candles": candles}
