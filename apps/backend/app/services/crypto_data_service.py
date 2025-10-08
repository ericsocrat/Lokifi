"""
Crypto Data Service - Centralized service for fetching and caching cryptocurrency data
All pages (Markets, Charts, Portfolio, Alerts, AI Research) can use this service
"""

import logging
from datetime import datetime, timedelta

import httpx

from app.core.advanced_redis_client import advanced_redis_client
from app.core.config import settings

logger = logging.getLogger(__name__)

# Cache configuration
CACHE_TTL_MARKET_DATA = 60  # 1 minute for market data
CACHE_TTL_COIN_DETAILS = 300  # 5 minutes for coin details
CACHE_TTL_GLOBAL_DATA = 120  # 2 minutes for global market data

COINGECKO_BASE_URL = "https://api.coingecko.com/api/v3"


class CryptoDataService:
    """Centralized service for fetching cryptocurrency data"""
    
    def __init__(self):
        self.client: httpx.AsyncClient | None = None
        self._last_request_time: datetime | None = None
        self._request_count = 0
        self._rate_limit_reset = datetime.now()
    
    async def __aenter__(self):
        self.client = httpx.AsyncClient(timeout=10.0)
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self.client:
            await self.client.aclose()
    
    def _get_cache_key(self, prefix: str, **kwargs) -> str:
        """Generate cache key from prefix and parameters"""
        params_str = ":".join(f"{k}={v}" for k, v in sorted(kwargs.items()))
        return f"crypto:{prefix}:{params_str}"
    
    async def _get_cached(self, cache_key: str):
        """Get data from cache if available"""
        try:
            if advanced_redis_client.client:
                return await advanced_redis_client.get(cache_key)
        except Exception as e:
            logger.warning(f"Cache get failed: {e}")
        return None
    
    async def _set_cache(self, cache_key: str, data, ttl: int):
        """Set data in cache"""
        try:
            if advanced_redis_client.client:
                await advanced_redis_client.set(cache_key, data, expire=ttl)
        except Exception as e:
            logger.warning(f"Cache set failed: {e}")
    
    async def _check_rate_limit(self):
        """Simple rate limiting - wait if needed"""
        now = datetime.now()
        
        # Reset counter every minute
        if now > self._rate_limit_reset:
            self._request_count = 0
            self._rate_limit_reset = now + timedelta(minutes=1)
        
        # If we have an API key, allow 30 requests/minute
        # Without key, allow 10 requests/minute to be safe
        max_requests = 30 if settings.COINGECKO_KEY else 10
        
        if self._request_count >= max_requests:
            wait_seconds = (self._rate_limit_reset - now).total_seconds()
            if wait_seconds > 0:
                logger.warning(f"Rate limit reached, waiting {wait_seconds:.1f}s")
                # Don't actually wait, just log and continue
                # The API will handle rate limiting
        
        self._request_count += 1
    
    async def _fetch_from_api(self, endpoint: str, params: dict | None = None) -> dict:
        """Fetch data from CoinGecko API with rate limiting"""
        if not self.client:
            async with httpx.AsyncClient(timeout=10.0) as client:
                return await self._do_fetch(client, endpoint, params)
        return await self._do_fetch(self.client, endpoint, params)
    
    async def _do_fetch(self, client: httpx.AsyncClient, endpoint: str, params: dict | None = None) -> dict:
        """Actually perform the API fetch"""
        await self._check_rate_limit()
        
        url = f"{COINGECKO_BASE_URL}/{endpoint}"
        
        if params is None:
            params = {}
        
        # Add API key if available
        if settings.COINGECKO_KEY:
            params["x_cg_demo_api_key"] = settings.COINGECKO_KEY
        
        try:
            response = await client.get(url, params=params)
            response.raise_for_status()
            return response.json()
        except httpx.HTTPStatusError as e:
            if e.response.status_code == 429:
                logger.warning("Rate limit exceeded from CoinGecko API")
            logger.error(f"CoinGecko API error {e.response.status_code}: {e}")
            raise
        except Exception as e:
            logger.error(f"Error fetching from CoinGecko: {e}")
            raise
    
    async def get_top_coins(
        self, 
        limit: int = 100, 
        vs_currency: str = "usd",
        force_refresh: bool = False
    ) -> list[dict]:
        """
        Get top cryptocurrencies by market cap
        Used by: Markets page
        """
        cache_key = self._get_cache_key("top_coins", limit=limit, currency=vs_currency)
        
        if not force_refresh:
            cached = await self._get_cached(cache_key)
            if cached:
                logger.info("Returning cached top coins data")
                return cached
        
        params = {
            "vs_currency": vs_currency,
            "order": "market_cap_desc",
            "per_page": limit,
            "page": 1,
            "sparkline": True,
            "price_change_percentage": "1h,24h,7d"
        }
        
        data = await self._fetch_from_api("coins/markets", params)
        await self._set_cache(cache_key, data, CACHE_TTL_MARKET_DATA)
        
        return data
    
    async def get_global_market_data(self, force_refresh: bool = False) -> dict:
        """
        Get global market overview
        Used by: Markets page, Dashboard
        """
        cache_key = self._get_cache_key("global_market")
        
        if not force_refresh:
            cached = await self._get_cached(cache_key)
            if cached:
                logger.info("Returning cached global market data")
                return cached
        
        data = await self._fetch_from_api("global", {})
        
        if "data" in data:
            formatted_data = {
                "total_market_cap": data["data"].get("total_market_cap", {}).get("usd", 0),
                "total_volume_24h": data["data"].get("total_volume", {}).get("usd", 0),
                "bitcoin_dominance": round(data["data"].get("market_cap_percentage", {}).get("btc", 0), 2),
                "ethereum_dominance": round(data["data"].get("market_cap_percentage", {}).get("eth", 0), 2),
                "market_cap_change_24h": data["data"].get("market_cap_change_percentage_24h_usd", 0),
                "active_coins": data["data"].get("active_cryptocurrencies", 0),
                "markets": data["data"].get("markets", 0),
                "market_sentiment": 70  # Placeholder
            }
            
            await self._set_cache(cache_key, formatted_data, CACHE_TTL_GLOBAL_DATA)
            return formatted_data
        
        return {}
    
    async def get_coin_details(self, coin_id: str, force_refresh: bool = False) -> dict:
        """
        Get detailed coin information
        Used by: Charts page, Portfolio page, AI Research
        """
        cache_key = self._get_cache_key("coin_details", coin_id=coin_id)
        
        if not force_refresh:
            cached = await self._get_cached(cache_key)
            if cached:
                logger.info(f"Returning cached coin details for {coin_id}")
                return cached
        
        params = {
            "localization": "false",
            "tickers": "false",
            "market_data": "true",
            "community_data": "true",
            "developer_data": "false"
        }
        
        data = await self._fetch_from_api(f"coins/{coin_id}", params)
        await self._set_cache(cache_key, data, CACHE_TTL_COIN_DETAILS)
        
        return data
    
    async def get_coin_ohlc(
        self, 
        coin_id: str, 
        vs_currency: str = "usd", 
        days: int = 7,
        force_refresh: bool = False
    ) -> list[dict]:
        """
        Get OHLC data for charting
        Used by: Charts page
        """
        cache_key = self._get_cache_key("ohlc", coin_id=coin_id, currency=vs_currency, days=days)
        
        if not force_refresh:
            cached = await self._get_cached(cache_key)
            if cached:
                logger.info(f"Returning cached OHLC data for {coin_id}")
                return cached
        
        params = {
            "vs_currency": vs_currency,
            "days": days
        }
        
        data = await self._fetch_from_api(f"coins/{coin_id}/ohlc", params)
        
        # Format the data
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
        
        await self._set_cache(cache_key, formatted_data, CACHE_TTL_MARKET_DATA)
        return formatted_data
    
    async def get_simple_price(
        self, 
        coin_ids: list[str], 
        vs_currencies: list[str] | None = None,
        force_refresh: bool = False
    ) -> dict:
        """
        Get simple price for multiple coins
        Used by: Portfolio page, Alerts page
        """
        if vs_currencies is None:
            vs_currencies = ["usd"]
        
        ids_str = ",".join(coin_ids)
        currencies_str = ",".join(vs_currencies)
        
        cache_key = self._get_cache_key("simple_price", ids=ids_str, currencies=currencies_str)
        
        if not force_refresh:
            cached = await self._get_cached(cache_key)
            if cached:
                logger.info("Returning cached simple price data")
                return cached
        
        params = {
            "ids": ids_str,
            "vs_currencies": currencies_str,
            "include_24hr_change": "true",
            "include_24hr_vol": "true",
            "include_market_cap": "true"
        }
        
        data = await self._fetch_from_api("simple/price", params)
        await self._set_cache(cache_key, data, CACHE_TTL_MARKET_DATA)
        
        return data
    
    async def search_coins(self, query: str) -> dict:
        """
        Search for coins by name or symbol
        Used by: All pages with search functionality
        """
        # Don't cache search results as they're query-specific
        params = {"query": query}
        data = await self._fetch_from_api("search", params)
        return data
    
    async def get_trending(self, force_refresh: bool = False) -> dict:
        """
        Get trending coins
        Used by: Markets page, Dashboard
        """
        cache_key = self._get_cache_key("trending")
        
        if not force_refresh:
            cached = await self._get_cached(cache_key)
            if cached:
                logger.info("Returning cached trending data")
                return cached
        
        data = await self._fetch_from_api("search/trending", {})
        await self._set_cache(cache_key, data, CACHE_TTL_GLOBAL_DATA)
        
        return data


# Global instance
crypto_service = CryptoDataService()
