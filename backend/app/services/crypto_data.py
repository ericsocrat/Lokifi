"""
Cryptocurrency Data Service
Fetches crypto data from multiple providers with automatic fallback
"""

import json
import logging
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

import httpx
from app.core.config import settings
from app.core.redis_client import redis_client

logger = logging.getLogger(__name__)

CACHE_DURATION = 300  # 5 minutes in seconds


class CryptoDataService:
    """Service for fetching cryptocurrency data with multiple provider support"""

    def __init__(self):
        self.coingecko_key = settings.COINGECKO_KEY
        self.cmc_key = settings.CMC_KEY
        self.timeout = 10.0

    async def get_crypto_list(
        self, limit: int = 100, page: int = 1, category: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Get list of cryptocurrencies from available providers
        Tries CoinGecko first, falls back to CoinMarketCap
        """
        # Generate cache key
        cache_key = f"crypto_list:{limit}:{page}:{category or 'all'}"

        # Check cache first
        cached_data = await self._get_cached_data(cache_key)
        if cached_data:
            logger.info(f"Returning cached crypto list (limit={limit}, page={page})")
            return cached_data

        # Try CoinGecko first (most generous free tier)
        try:
            data = await self._fetch_from_coingecko(limit, page, category)
            await self._cache_data(cache_key, data)
            return data
        except Exception as e:
            logger.warning(f"CoinGecko failed: {e}, trying CoinMarketCap...")

        # Fallback to CoinMarketCap
        try:
            data = await self._fetch_from_coinmarketcap(limit, page, category)
            await self._cache_data(cache_key, data)
            return data
        except Exception as e:
            logger.error(f"CoinMarketCap also failed: {e}")

            # Return cached data even if expired
            stale_data = await self._get_cached_data(cache_key, allow_stale=True)
            if stale_data:
                logger.info("Returning stale cached data")
                stale_data["warning"] = "Using cached data due to API failures"
                return stale_data

            raise Exception("All crypto data providers failed")

    async def _fetch_from_coingecko(
        self, limit: int, page: int, category: Optional[str]
    ) -> Dict[str, Any]:
        """Fetch data from CoinGecko API"""
        logger.info(f"Fetching from CoinGecko (limit={limit}, page={page})")

        params = {
            "vs_currency": "usd",
            "order": "market_cap_desc",
            "per_page": min(limit, 250),  # CoinGecko max is 250
            "page": page,
            "sparkline": True,
            "price_change_percentage": "1h,24h,7d",
        }

        if category and category != "all":
            params["category"] = category.lower()

        headers = {}
        if self.coingecko_key:
            headers["x-cg-demo-api-key"] = self.coingecko_key

        async with httpx.AsyncClient(timeout=self.timeout) as client:
            response = await client.get(
                "https://api.coingecko.com/api/v3/coins/markets",
                params=params,
                headers=headers,
            )
            response.raise_for_status()
            coins = response.json()

        # Transform to standard format
        cryptos = []
        for idx, coin in enumerate(coins):
            rank = (page - 1) * limit + idx + 1
            cryptos.append(
                {
                    "rank": rank,
                    "id": coin["id"],
                    "symbol": coin["symbol"].upper(),
                    "name": coin["name"],
                    "price": coin["current_price"] or 0,
                    "change1h": coin.get("price_change_percentage_1h_in_currency") or 0,
                    "change24h": coin.get("price_change_percentage_24h_in_currency")
                    or 0,
                    "change7d": coin.get("price_change_percentage_7d_in_currency") or 0,
                    "marketCap": coin["market_cap"] or 0,
                    "volume24h": coin["total_volume"] or 0,
                    "circulatingSupply": coin["circulating_supply"] or 0,
                    "logo": coin.get("image", ""),
                    "sparkline": coin.get("sparkline_in_7d", {}).get("price", []),
                    "lastUpdated": coin.get("last_updated", ""),
                }
            )

        return {
            "data": cryptos,
            "total": 14000,  # CoinGecko doesn't provide exact total
            "page": page,
            "limit": limit,
            "provider": "coingecko",
            "timestamp": datetime.utcnow().isoformat(),
        }

    async def _fetch_from_coinmarketcap(
        self, limit: int, page: int, category: Optional[str]
    ) -> Dict[str, Any]:
        """Fetch data from CoinMarketCap API"""
        logger.info(f"Fetching from CoinMarketCap (limit={limit}, page={page})")

        if not self.cmc_key:
            raise Exception("CoinMarketCap API key not configured")

        start = (page - 1) * limit + 1

        params = {
            "start": start,
            "limit": min(limit, 5000),
            "convert": "USD",
            "sort": "market_cap",
            "sort_dir": "desc",
        }

        if category and category != "all":
            # Map categories to CMC tags
            category_map = {
                "defi": "defi",
                "nft": "nft",
                "metaverse": "metaverse",
                "gaming": "gaming",
            }
            if category.lower() in category_map:
                params["tag"] = category_map[category.lower()]

        headers = {"X-CMC_PRO_API_KEY": self.cmc_key, "Accept": "application/json"}

        async with httpx.AsyncClient(timeout=self.timeout) as client:
            response = await client.get(
                "https://pro-api.coinmarketcap.com/v1/cryptocurrency/listings/latest",
                params=params,
                headers=headers,
            )
            response.raise_for_status()
            data = response.json()

        # Transform to standard format
        cryptos = []
        for coin in data["data"]:
            quote = coin["quote"]["USD"]
            cryptos.append(
                {
                    "rank": coin["cmc_rank"],
                    "id": coin["slug"],
                    "symbol": coin["symbol"],
                    "name": coin["name"],
                    "price": quote["price"],
                    "change1h": quote.get("percent_change_1h", 0),
                    "change24h": quote.get("percent_change_24h", 0),
                    "change7d": quote.get("percent_change_7d", 0),
                    "marketCap": quote["market_cap"],
                    "volume24h": quote["volume_24h"],
                    "circulatingSupply": coin.get("circulating_supply", 0),
                    "logo": f"https://s2.coinmarketcap.com/static/img/coins/64x64/{coin['id']}.png",
                    "sparkline": [],  # CMC doesn't provide sparklines in this endpoint
                    "lastUpdated": quote.get("last_updated", ""),
                }
            )

        return {
            "data": cryptos,
            "total": data["status"].get("total_count", 14000),
            "page": page,
            "limit": limit,
            "provider": "coinmarketcap",
            "timestamp": datetime.utcnow().isoformat(),
        }

    async def get_crypto_detail(self, symbol: str) -> Dict[str, Any]:
        """Get detailed information for a specific cryptocurrency"""
        cache_key = f"crypto_detail:{symbol.lower()}"

        # Check cache
        cached_data = await self._get_cached_data(cache_key)
        if cached_data:
            return cached_data

        # Try CoinGecko first
        try:
            data = await self._fetch_detail_from_coingecko(symbol)
            await self._cache_data(cache_key, data, expire=60)  # Cache for 1 minute
            return data
        except Exception as e:
            logger.warning(f"CoinGecko detail failed: {e}")

        # Fallback to CoinMarketCap
        try:
            data = await self._fetch_detail_from_coinmarketcap(symbol)
            await self._cache_data(cache_key, data, expire=60)
            return data
        except Exception as e:
            logger.error(f"CoinMarketCap detail failed: {e}")
            raise Exception(f"Failed to fetch details for {symbol}")

    async def _fetch_detail_from_coingecko(self, symbol: str) -> Dict[str, Any]:
        """Fetch detailed data from CoinGecko"""
        # First, get the coin ID from symbol
        coin_id = await self._get_coingecko_id_from_symbol(symbol)

        headers = {}
        if self.coingecko_key:
            headers["x-cg-demo-api-key"] = self.coingecko_key

        async with httpx.AsyncClient(timeout=self.timeout) as client:
            response = await client.get(
                f"https://api.coingecko.com/api/v3/coins/{coin_id}",
                params={
                    "localization": "false",
                    "tickers": "false",
                    "market_data": "true",
                    "community_data": "false",
                    "developer_data": "false",
                },
                headers=headers,
            )
            response.raise_for_status()
            return response.json()

    async def _fetch_detail_from_coinmarketcap(self, symbol: str) -> Dict[str, Any]:
        """Fetch detailed data from CoinMarketCap"""
        if not self.cmc_key:
            raise Exception("CoinMarketCap API key not configured")

        headers = {"X-CMC_PRO_API_KEY": self.cmc_key, "Accept": "application/json"}

        async with httpx.AsyncClient(timeout=self.timeout) as client:
            response = await client.get(
                "https://pro-api.coinmarketcap.com/v2/cryptocurrency/quotes/latest",
                params={"symbol": symbol.upper()},
                headers=headers,
            )
            response.raise_for_status()
            return response.json()

    async def _get_coingecko_id_from_symbol(self, symbol: str) -> str:
        """Map symbol to CoinGecko coin ID"""
        # Common mappings
        symbol_map = {
            "BTC": "bitcoin",
            "ETH": "ethereum",
            "USDT": "tether",
            "BNB": "binancecoin",
            "SOL": "solana",
            "XRP": "ripple",
            "USDC": "usd-coin",
            "ADA": "cardano",
            "DOGE": "dogecoin",
            "TRX": "tron",
            "TON": "the-open-network",
            "LINK": "chainlink",
            "AVAX": "avalanche-2",
            "MATIC": "matic-network",
            "DOT": "polkadot",
            "UNI": "uniswap",
            "LTC": "litecoin",
            "ATOM": "cosmos",
            "XLM": "stellar",
            "XMR": "monero",
        }

        return symbol_map.get(symbol.upper(), symbol.lower())

    async def _get_cached_data(
        self, key: str, allow_stale: bool = False
    ) -> Optional[Dict[str, Any]]:
        """Get data from Redis cache"""
        try:
            if redis_client.client is None:
                return None

            cached = await redis_client.get(key)
            if cached:
                # Redis returns string, need to parse JSON
                return json.loads(cached)

            # If allowing stale data, try to get expired data
            if allow_stale:
                stale_key = f"{key}:stale"
                stale_data = await redis_client.get(stale_key)
                if stale_data:
                    return json.loads(stale_data)

            return None
        except Exception as e:
            logger.error(f"Cache get error: {e}")
            return None

    async def _cache_data(
        self, key: str, data: Dict[str, Any], expire: int = CACHE_DURATION
    ) -> None:
        """Store data in Redis cache"""
        try:
            if redis_client.client is None:
                return

            # Convert data to JSON string
            json_data = json.dumps(data)

            # Store fresh data
            await redis_client.set(key, json_data, ttl=expire)

            # Also store as stale backup (longer TTL)
            stale_key = f"{key}:stale"
            await redis_client.set(stale_key, json_data, ttl=expire * 12)  # 1 hour

        except Exception as e:
            logger.error(f"Cache set error: {e}")


# Singleton instance
crypto_service = CryptoDataService()
