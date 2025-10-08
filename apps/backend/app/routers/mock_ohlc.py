import random
import time

from fastapi import APIRouter

router = APIRouter(prefix="/mock", tags=["mock"])

@router.get("/ohlc")
async def mock_ohlc(symbol: str = "BTCUSD", timeframe: str = "1h", limit: int = 100):
    """Mock OHLC data for testing chart functionality"""
    
    # Generate mock candlestick data
    candles = []
    base_price = 50000 if "BTC" in symbol else 100  # Base price for different symbols
    current_time = int(time.time()) - (limit * 3600)  # Start from limit hours ago
    
    current_price = base_price
    
    for i in range(limit):
        # Generate realistic OHLC data
        change = random.uniform(-0.02, 0.02)  # ±2% change per candle
        
        open_price = current_price
        close_price = open_price * (1 + change)
        
        # High and low should encompass open/close
        high_price = max(open_price, close_price) * random.uniform(1.001, 1.01)
        low_price = min(open_price, close_price) * random.uniform(0.99, 0.999)
        
        volume = random.uniform(100, 1000)
        
        candles.append({
            "ts": (current_time + i * 3600) * 1000,  # Convert to milliseconds
            "o": round(open_price, 2),
            "h": round(high_price, 2),
            "l": round(low_price, 2),
            "c": round(close_price, 2),
            "v": round(volume, 2)
        })
        
        current_price = close_price
    
    return {
        "symbol": symbol,
        "timeframe": timeframe,
        "candles": candles
    }