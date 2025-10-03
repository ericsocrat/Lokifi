"""
Cryptocurrency API Routes
Provides endpoints for fetching crypto market data
"""

import logging
from typing import Optional

from app.services.crypto_data import crypto_service
from fastapi import APIRouter, HTTPException, Query

logger = logging.getLogger(__name__)

# No prefix here since it will be added by main.py
router = APIRouter(tags=["crypto"])


@router.get("/list")
async def get_crypto_list(
    limit: int = Query(
        default=100, ge=1, le=250, description="Number of cryptos to return"
    ),
    page: int = Query(default=1, ge=1, description="Page number"),
    category: Optional[str] = Query(
        default=None, description="Filter by category (defi, nft, gaming, metaverse)"
    ),
):
    """
    Get list of cryptocurrencies with market data

    Features:
    - Automatic provider fallback (CoinGecko → CoinMarketCap)
    - 5-minute caching
    - Pagination support
    - Category filtering

    Returns:
    - data: List of crypto objects
    - total: Total number of cryptos
    - page: Current page
    - limit: Results per page
    - provider: Which API provided the data
    - timestamp: When data was fetched
    """
    try:
        result = await crypto_service.get_crypto_list(
            limit=limit, page=page, category=category
        )
        return result
    except Exception as e:
        logger.error(f"Failed to fetch crypto list: {e}", exc_info=True)
        raise HTTPException(
            status_code=503, detail=f"Failed to fetch cryptocurrency data: {str(e)}"
        )


@router.get("/{symbol}")
async def get_crypto_detail(symbol: str):
    """
    Get detailed information for a specific cryptocurrency

    Features:
    - Automatic provider fallback (CoinGecko → CoinMarketCap)
    - 1-minute caching
    - Comprehensive market data

    Returns:
    - Complete crypto details including:
      - Price data
      - Market stats
      - Supply information
      - Links and descriptions
    """
    try:
        result = await crypto_service.get_crypto_detail(symbol)
        return result
    except Exception as e:
        logger.error(f"Failed to fetch crypto detail for {symbol}: {e}", exc_info=True)
        raise HTTPException(
            status_code=404, detail=f"Failed to fetch details for {symbol}: {str(e)}"
        )


@router.get("/market/overview")
async def get_market_overview():
    """
    Get overall cryptocurrency market statistics

    Returns:
    - Total market cap
    - 24h volume
    - BTC dominance
    - Active cryptocurrencies count
    - Market sentiment
    """
    try:
        # Get top 100 cryptos to calculate market stats
        data = await crypto_service.get_crypto_list(limit=100, page=1)

        cryptos = data["data"]

        # Calculate totals
        total_market_cap = sum(c["marketCap"] for c in cryptos)
        total_volume_24h = sum(c["volume24h"] for c in cryptos)

        # BTC dominance (BTC market cap / total market cap)
        btc = next((c for c in cryptos if c["symbol"] == "BTC"), None)
        btc_dominance = (btc["marketCap"] / total_market_cap * 100) if btc else 0

        # Calculate market sentiment (simplified)
        gainers = sum(1 for c in cryptos if c["change24h"] > 0)
        losers = sum(1 for c in cryptos if c["change24h"] < 0)
        sentiment_score = (gainers - losers) / len(cryptos) * 100 if cryptos else 0

        # Map sentiment to Fear & Greed scale
        if sentiment_score > 20:
            sentiment = "Extreme Greed"
        elif sentiment_score > 5:
            sentiment = "Greed"
        elif sentiment_score > -5:
            sentiment = "Neutral"
        elif sentiment_score > -20:
            sentiment = "Fear"
        else:
            sentiment = "Extreme Fear"

        return {
            "totalMarketCap": total_market_cap,
            "volume24h": total_volume_24h,
            "btcDominance": round(btc_dominance, 2),
            "activeCryptocurrencies": data.get("total", 14000),
            "sentiment": sentiment,
            "sentimentScore": round(sentiment_score, 2),
            "gainers": gainers,
            "losers": losers,
            "provider": data.get("provider"),
            "timestamp": data.get("timestamp"),
        }
    except Exception as e:
        logger.error(f"Failed to fetch market overview: {e}", exc_info=True)
        raise HTTPException(
            status_code=503, detail=f"Failed to fetch market overview: {str(e)}"
        )


@router.get("/trending")
async def get_trending_cryptos(limit: int = Query(default=5, ge=1, le=20)):
    """
    Get trending cryptocurrencies
    Returns top gainers by 24h change
    """
    try:
        data = await crypto_service.get_crypto_list(limit=50, page=1)

        # Sort by 24h change and take top gainers
        cryptos = sorted(data["data"], key=lambda x: x["change24h"], reverse=True)[
            :limit
        ]

        return {
            "data": cryptos,
            "provider": data.get("provider"),
            "timestamp": data.get("timestamp"),
        }
    except Exception as e:
        logger.error(f"Failed to fetch trending cryptos: {e}", exc_info=True)
        raise HTTPException(
            status_code=503, detail=f"Failed to fetch trending cryptos: {str(e)}"
        )


@router.get("/gainers")
async def get_top_gainers(
    limit: int = Query(default=5, ge=1, le=20),
    timeframe: str = Query(default="24h", description="1h, 24h, or 7d"),
):
    """
    Get top gaining cryptocurrencies
    """
    try:
        data = await crypto_service.get_crypto_list(limit=100, page=1)

        # Determine which change field to use
        change_field = {"1h": "change1h", "24h": "change24h", "7d": "change7d"}.get(
            timeframe, "change24h"
        )

        # Sort by selected timeframe
        cryptos = sorted(
            data["data"], key=lambda x: x.get(change_field, 0), reverse=True
        )[:limit]

        return {
            "data": cryptos,
            "timeframe": timeframe,
            "provider": data.get("provider"),
            "timestamp": data.get("timestamp"),
        }
    except Exception as e:
        logger.error(f"Failed to fetch top gainers: {e}", exc_info=True)
        raise HTTPException(
            status_code=503, detail=f"Failed to fetch top gainers: {str(e)}"
        )


@router.get("/losers")
async def get_top_losers(
    limit: int = Query(default=5, ge=1, le=20),
    timeframe: str = Query(default="24h", description="1h, 24h, or 7d"),
):
    """
    Get top losing cryptocurrencies
    """
    try:
        data = await crypto_service.get_crypto_list(limit=100, page=1)

        # Determine which change field to use
        change_field = {"1h": "change1h", "24h": "change24h", "7d": "change7d"}.get(
            timeframe, "change24h"
        )

        # Sort by selected timeframe (ascending for losers)
        cryptos = sorted(data["data"], key=lambda x: x.get(change_field, 0))[:limit]

        return {
            "data": cryptos,
            "timeframe": timeframe,
            "provider": data.get("provider"),
            "timestamp": data.get("timestamp"),
        }
    except Exception as e:
        logger.error(f"Failed to fetch top losers: {e}", exc_info=True)
        raise HTTPException(
            status_code=503, detail=f"Failed to fetch top losers: {str(e)}"
        )
