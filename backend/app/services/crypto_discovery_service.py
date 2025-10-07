"""Crypto Discovery Service - Fetch and manage cryptocurrency list from CoinGecko"""
import logging
import time
from typing import Dict, List, Optional
from dataclasses import dataclass, asdict
import httpx
from app.core.advanced_redis_client import advanced_redis_client
from app.core.config import settings

logger = logging.getLogger(__name__)

# Performance tracking
class CryptoMetrics:
    def __init__(self):
        self.total_fetches = 0
        self.cache_hits = 0
        self.successful_fetches = 0
        self.failed_fetches = 0
        
    def record_fetch(self, cached: bool, success: bool = True):
        self.total_fetches += 1
        if cached:
            self.cache_hits += 1
        elif success:
            self.successful_fetches += 1
        else:
            self.failed_fetches += 1
    
    def get_stats(self):
        return {
            "total_fetches": self.total_fetches,
            "cache_hits": self.cache_hits,
            "cache_hit_rate": f"{(self.cache_hits / max(self.total_fetches, 1)) * 100:.1f}%",
            "successful_fetches": self.successful_fetches,
            "failed_fetches": self.failed_fetches
        }

crypto_metrics = CryptoMetrics()

@dataclass
class CryptoAsset:
    """Cryptocurrency asset information"""
    id: str  # CoinGecko ID
    symbol: str  # Trading symbol (BTC, ETH, etc.)
    name: str  # Full name
    market_cap_rank: int
    current_price: float
    market_cap: float
    total_volume: float
    price_change_24h: float
    price_change_percentage_24h: float
    image: str  # Icon URL
    
    def to_dict(self):
        return asdict(self)

class CryptoDiscoveryService:
    """Service for discovering and managing cryptocurrency assets"""
    
    def __init__(self):
        self.client: Optional[httpx.AsyncClient] = None
        self.coingecko_base = "https://api.coingecko.com/api/v3"
        self.cache_ttl = 3600  # 1 hour cache for crypto list
    
    async def __aenter__(self):
        self.client = httpx.AsyncClient(timeout=30.0)
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self.client:
            await self.client.aclose()
    
    async def _get_cached(self, key: str):
        try:
            return await advanced_redis_client.get(key)
        except Exception as e:
            logger.debug(f"Cache miss: {e}")
        return None
    
    async def _set_cache(self, key: str, value, ttl: int = 3600):
        try:
            await advanced_redis_client.set(key, value, expire=ttl)
        except Exception as e:
            logger.debug(f"Cache set failed: {e}")
    
    async def get_top_cryptos(
        self, 
        limit: int = 300,
        force_refresh: bool = False
    ) -> List[CryptoAsset]:
        """
        Get top cryptocurrencies by market cap
        
        Args:
            limit: Number of cryptos to fetch (max 300)
            force_refresh: Force refresh from API
            
        Returns:
            List of CryptoAsset objects
        """
        start_time = time.time()
        cache_key = f"crypto:top:{limit}"
        
        if not force_refresh:
            cached = await self._get_cached(cache_key)
            if cached:
                crypto_metrics.record_fetch(cached=True)
                duration = time.time() - start_time
                logger.info(f"✅ Cache hit for top {limit} cryptos - {duration*1000:.1f}ms")
                return [CryptoAsset(**crypto) for crypto in cached]
        
        try:
            if self.client is None:
                async with httpx.AsyncClient(timeout=30.0) as client:
                    cryptos = await self._fetch_top_cryptos(client, limit)
            else:
                cryptos = await self._fetch_top_cryptos(self.client, limit)
            
            if cryptos:
                # Cache for 1 hour
                await self._set_cache(
                    cache_key,
                    [crypto.to_dict() for crypto in cryptos],
                    ttl=self.cache_ttl
                )
                crypto_metrics.record_fetch(cached=False, success=True)
                duration = time.time() - start_time
                logger.info(f"📊 Fetched {len(cryptos)} cryptocurrencies - {duration*1000:.1f}ms")
            else:
                crypto_metrics.record_fetch(cached=False, success=False)
                logger.warning(f"⚠️ No cryptocurrencies returned")
            
            return cryptos
        except Exception as e:
            crypto_metrics.record_fetch(cached=False, success=False)
            logger.error(f"❌ Error fetching top cryptos: {e}")
            return []
    
    async def _fetch_top_cryptos(
        self, 
        client: httpx.AsyncClient, 
        limit: int
    ) -> List[CryptoAsset]:
        """Fetch top cryptocurrencies from CoinGecko"""
        try:
            # CoinGecko allows fetching up to 250 per page
            per_page = min(limit, 250)
            pages_needed = (limit + per_page - 1) // per_page
            
            all_cryptos = []
            
            for page in range(1, pages_needed + 1):
                url = f"{self.coingecko_base}/coins/markets"
                params = {
                    "vs_currency": "usd",
                    "order": "market_cap_desc",
                    "per_page": per_page,
                    "page": page,
                    "sparkline": False,
                    "price_change_percentage": "24h"
                }
                
                if settings.COINGECKO_KEY:
                    params["x_cg_demo_api_key"] = settings.COINGECKO_KEY
                
                logger.info(f"Fetching page {page}/{pages_needed} of top cryptos")
                resp = await client.get(url, params=params)
                resp.raise_for_status()
                data = resp.json()
                
                for coin in data:
                    if len(all_cryptos) >= limit:
                        break
                    
                    try:
                        crypto = CryptoAsset(
                            id=coin["id"],
                            symbol=coin["symbol"].upper(),
                            name=coin["name"],
                            market_cap_rank=coin.get("market_cap_rank", 0),
                            current_price=coin.get("current_price", 0),
                            market_cap=coin.get("market_cap", 0),
                            total_volume=coin.get("total_volume", 0),
                            price_change_24h=coin.get("price_change_24h", 0),
                            price_change_percentage_24h=coin.get("price_change_percentage_24h", 0),
                            image=coin.get("image", "")
                        )
                        all_cryptos.append(crypto)
                    except Exception as e:
                        logger.warning(f"Error parsing crypto {coin.get('symbol')}: {e}")
                        continue
                
                if len(all_cryptos) >= limit:
                    break
            
            logger.info(f"Fetched {len(all_cryptos)} cryptocurrencies")
            return all_cryptos[:limit]
            
        except Exception as e:
            logger.error(f"Error fetching cryptos from CoinGecko: {e}")
            return []
    
    async def get_crypto_by_symbol(self, symbol: str) -> Optional[CryptoAsset]:
        """Get specific crypto by symbol"""
        cryptos = await self.get_top_cryptos(limit=300)
        symbol_upper = symbol.upper()
        
        for crypto in cryptos:
            if crypto.symbol == symbol_upper:
                return crypto
        
        return None
    
    async def search_cryptos(self, query: str, limit: int = 50) -> List[CryptoAsset]:
        """
        Search cryptocurrencies by name or symbol
        
        Args:
            query: Search query (name or symbol)
            limit: Max results to return
            
        Returns:
            List of matching CryptoAsset objects
        """
        import time
        start_time = time.time()
        
        try:
            # Check cache first
            cache_key = f"crypto_search:{query}:{limit}"
            cached_data = await advanced_redis_client.get(cache_key)
            if cached_data:
                duration = time.time() - start_time
                crypto_metrics.record_fetch(cached=True)
                logger.info(f"✅ Cache hit for search '{query}' ({len(cached_data)} results) - {duration*1000:.1f}ms")
                return [CryptoAsset(**c) for c in cached_data]
            
            # Fetch from API
            if self.client is None:
                async with httpx.AsyncClient(timeout=30.0) as client:
                    results = await self._search_cryptos(client, query, limit)
            else:
                results = await self._search_cryptos(self.client, query, limit)
            
            # Cache results for 10 minutes
            if results:
                from dataclasses import asdict
                cache_data = [asdict(crypto) for crypto in results]
                await advanced_redis_client.set(cache_key, cache_data, expire=600)
            
            duration = time.time() - start_time
            crypto_metrics.record_fetch(cached=False)
            logger.info(f"✅ API search for '{query}' returned {len(results)} results - {duration*1000:.1f}ms")
            
            return results
            
        except Exception as e:
            duration = time.time() - start_time
            logger.error(f"❌ Error searching cryptos for '{query}': {e} - {duration*1000:.1f}ms")
            return []
    
    async def _search_cryptos(
        self, 
        client: httpx.AsyncClient, 
        query: str,
        limit: int
    ) -> List[CryptoAsset]:
        """Search for cryptocurrencies"""
        try:
            url = f"{self.coingecko_base}/search"
            params = {"query": query}
            
            if settings.COINGECKO_KEY:
                params["x_cg_demo_api_key"] = settings.COINGECKO_KEY
            
            resp = await client.get(url, params=params)
            resp.raise_for_status()
            data = resp.json()
            
            # Get full data for search results
            coin_ids = [coin["id"] for coin in data.get("coins", [])[:limit]]
            
            if not coin_ids:
                return []
            
            # Fetch detailed market data
            markets_url = f"{self.coingecko_base}/coins/markets"
            params = {
                "vs_currency": "usd",
                "ids": ",".join(coin_ids),
                "order": "market_cap_desc",
                "sparkline": False,
                "price_change_percentage": "24h"
            }
            
            if settings.COINGECKO_KEY:
                params["x_cg_demo_api_key"] = settings.COINGECKO_KEY
            
            resp = await client.get(markets_url, params=params)
            resp.raise_for_status()
            market_data = resp.json()
            
            results = []
            for coin in market_data:
                try:
                    crypto = CryptoAsset(
                        id=coin["id"],
                        symbol=coin["symbol"].upper(),
                        name=coin["name"],
                        market_cap_rank=coin.get("market_cap_rank", 0),
                        current_price=coin.get("current_price", 0),
                        market_cap=coin.get("market_cap", 0),
                        total_volume=coin.get("total_volume", 0),
                        price_change_24h=coin.get("price_change_24h", 0),
                        price_change_percentage_24h=coin.get("price_change_percentage_24h", 0),
                        image=coin.get("image", "")
                    )
                    results.append(crypto)
                except Exception as e:
                    logger.warning(f"Error parsing search result: {e}")
                    continue
            
            return results
            
        except Exception as e:
            logger.error(f"Error in crypto search: {e}")
            return []
    
    async def get_symbol_to_id_mapping(self) -> Dict[str, str]:
        """Get mapping of symbol to CoinGecko ID for all top cryptos"""
        cryptos = await self.get_top_cryptos(limit=300)
        return {crypto.symbol: crypto.id for crypto in cryptos}
