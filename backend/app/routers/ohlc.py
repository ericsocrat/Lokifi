from fastapi import APIRouter, HTTPException, Query
from app.db.schemas.market import OHLCResponse, Timeframe
from app.services.prices import get_ohlc
import random
import time

router = APIRouter(prefix="/ohlc", tags=["market"])

def generate_mock_data(symbol: str, timeframe: str, limit: int):
    """Generate mock OHLC data when real APIs fail"""
    candles = []
    base_price = 50000 if "BTC" in symbol else 100
    current_time = int(time.time()) - (limit * 3600)
    current_price = base_price
    
    for i in range(limit):
        change = random.uniform(-0.02, 0.02)
        open_price = current_price
        close_price = open_price * (1 + change)
        high_price = max(open_price, close_price) * random.uniform(1.001, 1.01)
        low_price = min(open_price, close_price) * random.uniform(0.99, 0.999)
        volume = random.uniform(100, 1000)
        
        candles.append({
            "ts": (current_time + i * 3600) * 1000,
            "o": round(open_price, 2),
            "h": round(high_price, 2),
            "l": round(low_price, 2),
            "c": round(close_price, 2),
            "v": round(volume, 2)
        })
        
        current_price = close_price
    
    return candles

@router.get("/", response_model=OHLCResponse)
async def ohlc(
    symbol: str = Query(..., description="Ticker or crypto id (e.g., AAPL, BTC, bitcoin, BTCUSD)"),
    timeframe: Timeframe = "1h",
    limit: int = 500,
):
    # For now, just return mock data to get chart working
    # TODO: Fix real API providers later
    mock_candles = generate_mock_data(symbol, timeframe, limit)
    return {"symbol": symbol, "timeframe": timeframe, "candles": mock_candles}
