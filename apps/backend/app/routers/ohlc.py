import logging
import random
import time

from fastapi import APIRouter, Query

from app.db.schemas.market import OHLCResponse, Timeframe
from app.services.data_service import ohlc_aggregator

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/ohlc", tags=["market"])


def generate_mock_data(symbol: str, timeframe: str, limit: int):
    """Generate mock OHLC data when real APIs fail"""
    candles = []
    base_price = 50000.0 if "BTC" in symbol else 100.0
    current_time = int(time.time()) - (limit * 3600)
    current_price: float = base_price

    for i in range(limit):
        change = random.uniform(-0.02, 0.02)
        open_price = current_price
        close_price = open_price * (1 + change)
        high_price = max(open_price, close_price) * random.uniform(1.001, 1.01)
        low_price = min(open_price, close_price) * random.uniform(0.99, 0.999)
        volume = random.uniform(100, 1000)

        candles.append(
            {
                "ts": (current_time + i * 3600) * 1000,
                "o": round(open_price, 2),
                "h": round(high_price, 2),
                "l": round(low_price, 2),
                "c": round(close_price, 2),
                "v": round(volume, 2),
            }
        )

        current_price = close_price

    return candles


def convert_to_yahoo_symbol(symbol: str) -> str:
    """Convert common symbol formats to Yahoo Finance format"""
    symbol = symbol.upper()

    # Crypto symbols: BTCUSD -> BTC-USD, ETHUSD -> ETH-USD
    crypto_pairs = {
        "BTCUSD": "BTC-USD",
        "ETHUSD": "ETH-USD",
        "ADAUSD": "ADA-USD",
        "SOLUSD": "SOL-USD",
        "DOGEUSD": "DOGE-USD",
        "DOGEUSDT": "DOGE-USD",
        "XRPUSD": "XRP-USD",
        "BNBUSD": "BNB-USD",
        "AVAXUSD": "AVAX-USD",
        "LTCUSD": "LTC-USD",
    }

    if symbol in crypto_pairs:
        return crypto_pairs[symbol]

    # If it's already in Yahoo format (e.g., BTC-USD), return as-is
    return symbol


@router.get("/", response_model=OHLCResponse)
async def ohlc(
    symbol: str = Query(..., description="Ticker or crypto id (e.g., AAPL, BTC, bitcoin, BTCUSD)"),
    timeframe: Timeframe = "1h",
    limit: int = 500,
):
    """
    Fetch OHLC data for a given symbol.

    Uses real market data providers (Yahoo Finance, Alpha Vantage, Finnhub) with automatic failover.
    Falls back to mock data if all providers fail.
    """
    try:
        # Ensure aggregator is initialized
        if ohlc_aggregator.session is None:
            await ohlc_aggregator.initialize()

        # Convert symbol to Yahoo Finance format
        yahoo_symbol = convert_to_yahoo_symbol(symbol)

        # Fetch real data from providers (Yahoo Finance is free, no API key needed)
        ohlc_data = await ohlc_aggregator.get_ohlc_data(
            symbol=yahoo_symbol, timeframe=str(timeframe), limit=limit
        )

        # Convert to response format
        candles = [
            {
                "ts": int(d.timestamp.timestamp() * 1000),  # Convert to milliseconds
                "o": round(d.open, 2),
                "h": round(d.high, 2),
                "l": round(d.low, 2),
                "c": round(d.close, 2),
                "v": round(d.volume, 2),
            }
            for d in ohlc_data
        ]

        logger.info(f"Fetched {len(candles)} candles for {symbol} ({timeframe})")
        return {"symbol": symbol, "timeframe": str(timeframe), "candles": candles}

    except Exception as e:
        logger.warning(f"Failed to fetch real data for {symbol}: {e}, using mock data")
        mock_candles = generate_mock_data(symbol, str(timeframe), limit)
        return {"symbol": symbol, "timeframe": str(timeframe), "candles": mock_candles}
