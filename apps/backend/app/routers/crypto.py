"""
Cryptocurrency Market Data Router
Provides endpoints for fetching crypto market data, prices, and market overview
"""


import httpx
from fastapi import APIRouter, HTTPException, Query

from app.core.config import settings
from typing import Any


router = APIRouter(prefix="/crypto", tags=["crypto"])

# CoinGecko API endpoints
COINGECKO_BASE_URL = "https://api.coingecko.com/api/v3"


async def fetch_from_coingecko(endpoint: str, params: dict | None = None) -> dict:
    """Fetch data from CoinGecko API"""
    url = f"{COINGECKO_BASE_URL}/{endpoint}"
    
    # Add API key if available
    if params is None:
        params = {}
    
    if settings.COINGECKO_KEY:
        params["x_cg_demo_api_key"] = settings.COINGECKO_KEY
    
    try:
        # Use proper SSL verification (removed verify=False security issue)
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(url, params=params: dict[str, Any])
            response.raise_for_status()
            return response.json()
    except httpx.HTTPStatusError as e:
        raise HTTPException(
            status_code=503, 
            detail=f"CoinGecko API error: {e.response.status_code}"
        )
    except httpx.TimeoutException:
        raise HTTPException(
            status_code=504, 
            detail="CoinGecko API request timed out"
        )
    except Exception as e:
        # Log error for debugging without exposing internal details
        import logging
        logging.error(f"CoinGecko API error: {type(e).__name__}: {e}")
        raise HTTPException(
            status_code=500, 
            detail="Failed to fetch cryptocurrency data"
        )


@router.get("/top")
async def get_top_cryptocurrencies(
    limit: int = Query(default=100, ge=1, le=250),
    vs_currency: str = Query(default="usd")
):
    """
    Get top cryptocurrencies by market cap
    
    Args:
        limit: Number of cryptocurrencies to return (1-250)
        vs_currency: Currency to use for prices (default: usd)
    
    Returns:
        List of cryptocurrency data with prices, market cap, volume, etc.
    """
    params = {
        "vs_currency": vs_currency,
        "order": "market_cap_desc",
        "per_page": limit,
        "page": 1,
        "sparkline": False,
        "price_change_percentage": "1h,24h,7d"
    }
    
    data = await fetch_from_coingecko("coins/markets", params)
    return data


@router.get("/market/overview")
async def get_market_overview():
    """
    Get global cryptocurrency market overview
    
    Returns:
        Global market data including total market cap, volume, BTC dominance, etc.
    """
    try:
        data = await fetch_from_coingecko("global", {})
        
        if "data" in data:
            global_data = data["data"]
            
            return {
                "total_market_cap": global_data.get("total_market_cap", {}).get("usd", 0),
                "total_volume_24h": global_data.get("total_volume", {}).get("usd", 0),
                "bitcoin_dominance": round(global_data.get("market_cap_percentage", {}).get("btc", 0), 2),
                "ethereum_dominance": round(global_data.get("market_cap_percentage", {}).get("eth", 0), 2),
                "market_sentiment": 70,  # Placeholder - CoinGecko doesn't provide this in free tier
                "active_coins": global_data.get("active_cryptocurrencies", 0),
                "markets": global_data.get("markets", 0),
                "market_cap_change_24h": global_data.get("market_cap_change_percentage_24h_usd", 0),
            }
        
        raise HTTPException(status_code=500, detail="Invalid response from CoinGecko")
        
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=500, detail="Failed to fetch market overview")


@router.get("/coin/{coin_id}")
async def get_coin_details(
    coin_id: str,
    localization: bool = Query(default=False),
    tickers: bool = Query(default=False),
    market_data: bool = Query(default=True),
    community_data: bool = Query(default=False),
    developer_data: bool = Query(default=False)
):
    """
    Get detailed information about a specific cryptocurrency
    
    Args:
        coin_id: CoinGecko coin ID (e.g., 'bitcoin', 'ethereum')
        localization: Include localized data
        tickers: Include ticker data
        market_data: Include market data
        community_data: Include community data
        developer_data: Include developer data
    
    Returns:
        Detailed coin information
    """
    params = {
        "localization": str(localization).lower(),
        "tickers": str(tickers).lower(),
        "market_data": str(market_data).lower(),
        "community_data": str(community_data).lower(),
        "developer_data": str(developer_data).lower()
    }
    
    data = await fetch_from_coingecko(f"coins/{coin_id}", params)
    return data


@router.get("/price")
async def get_simple_price(
    ids: str = Query(..., description="Comma-separated coin IDs (e.g., 'bitcoin,ethereum')"),
    vs_currencies: str = Query(default="usd", description="Comma-separated currencies")
):
    """
    Get simple price data for multiple cryptocurrencies
    
    Args:
        ids: Comma-separated coin IDs
        vs_currencies: Comma-separated currencies
    
    Returns:
        Price data for specified coins
    """
    params = {
        "ids": ids,
        "vs_currencies": vs_currencies,
        "include_24hr_change": "true",
        "include_24hr_vol": "true",
        "include_market_cap": "true"
    }
    
    data = await fetch_from_coingecko("simple/price", params)
    return data


@router.get("/trending")
async def get_trending_coins():
    """
    Get trending cryptocurrencies (most searched on CoinGecko)
    
    Returns:
        List of trending coins
    """
    data = await fetch_from_coingecko("search/trending", {})
    return data


@router.get("/categories")
async def get_categories():
    """
    Get all cryptocurrency categories (DeFi, NFT, Gaming, etc.)
    
    Returns:
        List of categories with market data
    """
    data = await fetch_from_coingecko("coins/categories", {})
    return data


@router.get("/ohlc/{coin_id}")
async def get_ohlc_data(
    coin_id: str,
    vs_currency: str = Query(default="usd"),
    days: int = Query(default=7, ge=1, le=365)
):
    """
    Get OHLC (Open, High, Low, Close) candle data for a cryptocurrency
    
    Args:
        coin_id: CoinGecko coin ID
        vs_currency: Currency to use
        days: Number of days of data (1, 7, 14, 30, 90, 180, 365)
    
    Returns:
        OHLC candle data
    """
    params = {
        "vs_currency": vs_currency,
        "days": days
    }
    
    data = await fetch_from_coingecko(f"coins/{coin_id}/ohlc", params)
    
    # Transform to consistent format
    formatted_data = [
        {
            "timestamp": candle[0],
            "open": candle[1],
            "high": candle[2],
            "low": candle[3],
            "close": candle[4]
        }
        for candle in data
    ]
    
    return formatted_data


@router.get("/search")
async def search_coins(query: str = Query(..., min_length=1)):
    """
    Search for cryptocurrencies by name or symbol
    
    Args:
        query: Search query
    
    Returns:
        List of matching coins
    """
    data = await fetch_from_coingecko("search", {"query": query})
    return data


@router.get("/exchanges")
async def get_exchanges(per_page: int = Query(default=100, ge=1, le=250)):
    """
    Get list of cryptocurrency exchanges
    
    Args:
        per_page: Number of exchanges to return
    
    Returns:
        List of exchanges
    """
    params = {
        "per_page": per_page,
        "page": 1
    }
    
    data = await fetch_from_coingecko("exchanges", params)
    return data


@router.get("/nft/list")
async def get_nft_list(per_page: int = Query(default=100, ge=1, le=250)):
    """
    Get list of NFT collections
    
    Args:
        per_page: Number of NFTs to return
    
    Returns:
        List of NFT collections
    """
    params = {
        "per_page": per_page,
        "page": 1,
        "order": "market_cap_usd_desc"
    }
    
    data = await fetch_from_coingecko("nfts/list", params)
    return data


# Health check endpoint for crypto API
@router.get("/health")
async def crypto_api_health():
    """Check if CoinGecko API is accessible"""
    try:
        # Test with a simple ping
        await fetch_from_coingecko("ping", {})
        return {
            "status": "healthy",
            "provider": "CoinGecko",
            "api_key_configured": bool(settings.COINGECKO_KEY)
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "provider": "CoinGecko",
            "error": str(e),
            "api_key_configured": bool(settings.COINGECKO_KEY)
        }
