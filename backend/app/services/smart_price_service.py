"""Smart Price Service with Redis caching - No duplicate asset fetching"""
import logging
from dataclasses import dataclass
from datetime import datetime

import httpx

from app.core.advanced_redis_client import advanced_redis_client
from app.core.config import settings

logger = logging.getLogger(__name__)

# Lazy import to avoid circular dependency
_unified_service = None

async def get_unified_service():
    global _unified_service
    if _unified_service is None:
        from app.services.unified_asset_service import get_unified_service as get_service
        _unified_service = await get_service()
    return _unified_service

@dataclass
class PriceData:
    symbol: str
    price: float
    change: float | None = None
    change_percent: float | None = None
    volume: float | None = None
    market_cap: float | None = None
    high: float | None = None
    low: float | None = None
    last_updated: datetime = None
    source: str = "unknown"
    cached: bool = False

class SmartPriceService:
    def __init__(self):
        self.client: httpx.AsyncClient | None = None
        self.providers = {"coingecko": "https://api.coingecko.com/api/v3", "finnhub": "https://finnhub.io/api/v1"}
    
    async def __aenter__(self):
        self.client = httpx.AsyncClient(timeout=10.0)
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self.client:
            await self.client.aclose()
    
    async def _check_redis_health(self) -> bool:
        try:
            if advanced_redis_client.client:
                await advanced_redis_client.client.ping()
                return True
        except:
            pass
        return False
    
    async def _get_cached(self, key: str):
        try:
            if advanced_redis_client.client:
                return await advanced_redis_client.get(key)
        except:
            pass
        return None
    
    async def _set_cache(self, key: str, value, ttl: int = 60):
        try:
            if advanced_redis_client.client:
                await advanced_redis_client.set(key, value, expire=ttl)
        except:
            pass
    
    async def get_price(self, symbol: str, force_refresh: bool = False) -> PriceData | None:
        cache_key = f"price:{symbol}"
        if not force_refresh:
            cached = await self._get_cached(cache_key)
            if cached:
                return PriceData(**cached, cached=True)
        
        try:
            if self.client is None:
                async with httpx.AsyncClient(timeout=10.0) as client:
                    price_data = await self._fetch_price(client, symbol)
            else:
                price_data = await self._fetch_price(self.client, symbol)
            
            if price_data:
                await self._set_cache(cache_key, price_data.__dict__, 60)
            return price_data
        except Exception as e:
            logger.error(f"Error fetching price for {symbol}: {e}")
            return None
    
    async def _fetch_price(self, client: httpx.AsyncClient, symbol: str) -> PriceData | None:
        """Fetch price from correct provider (no duplicates)"""
        try:
            # Get unified service to determine asset type
            unified = await get_unified_service()
            
            # Check if it's a crypto (use CoinGecko)
            if unified.is_crypto(symbol):
                coin_id = unified.get_coingecko_id(symbol)
                if not coin_id:
                    logger.warning(f"No CoinGecko ID found for {symbol}")
                    return None
                
                url = f"{self.providers['coingecko']}/simple/price"
                params = {
                    "ids": coin_id,
                    "vs_currencies": "usd",
                    "include_24hr_change": "true",
                    "include_market_cap": "true",
                    "include_24hr_vol": "true"
                }
                
                if settings.COINGECKO_KEY:
                    params["x_cg_demo_api_key"] = settings.COINGECKO_KEY
                
                resp = await client.get(url, params=params)
                data = resp.json()
                
                if coin_id in data:
                    return PriceData(
                        symbol=symbol,
                        price=data[coin_id]["usd"],
                        change_percent=data[coin_id].get("usd_24h_change"),
                        volume=data[coin_id].get("usd_24h_vol"),
                        market_cap=data[coin_id].get("usd_market_cap"),
                        last_updated=datetime.now(),
                        source="coingecko"
                    )
            
            # Otherwise, it's a stock (use Finnhub)
            else:
                url = f"{self.providers['finnhub']}/quote?symbol={symbol}&token={settings.FINNHUB_KEY}"
                resp = await client.get(url)
                data = resp.json()
                
                if "c" in data and data["c"] > 0:
                    # Register this as a stock if not already known
                    if not unified.is_stock(symbol):
                        unified.register_stock(symbol, symbol)
                    
                    return PriceData(
                        symbol=symbol,
                        price=data["c"],
                        change=data.get("d"),
                        change_percent=data.get("dp"),
                        high=data.get("h"),
                        low=data.get("l"),
                        last_updated=datetime.now(),
                        source="finnhub"
                    )
        except Exception as e:
            logger.error(f"Error fetching {symbol}: {e}")
        return None
    
    async def get_batch_prices(self, symbols: list, force_refresh: bool = False) -> dict[str, PriceData]:
        """
        Batch-optimized price fetching:
        - Groups cryptos and stocks separately
        - Fetches all cryptos in ONE CoinGecko request
        - Fetches stocks concurrently from Finnhub
        - Prevents duplicate API calls
        """
        if not symbols:
            return {}
        
        # Remove duplicates
        unique_symbols = list(set(s.upper() for s in symbols))
        
        results = {}
        unified = await get_unified_service()
        
        # Separate cryptos and stocks
        crypto_symbols = [s for s in unique_symbols if unified.is_crypto(s)]
        stock_symbols = [s for s in unique_symbols if not unified.is_crypto(s)]
        
        logger.info(f"📦 Batch request: {len(crypto_symbols)} cryptos, {len(stock_symbols)} stocks")
        
        # Check cache first for all symbols
        uncached_cryptos = []
        uncached_stocks = []
        
        for symbol in crypto_symbols:
            if not force_refresh:
                cached = await self._get_cached(f"price:{symbol}")
                if cached:
                    results[symbol] = PriceData(**cached, cached=True)
                    continue
            uncached_cryptos.append(symbol)
        
        for symbol in stock_symbols:
            if not force_refresh:
                cached = await self._get_cached(f"price:{symbol}")
                if cached:
                    results[symbol] = PriceData(**cached, cached=True)
                    continue
            uncached_stocks.append(symbol)
        
        logger.info(f"⚡ Cache hits: {len(results)}, API calls needed: {len(uncached_cryptos)} cryptos, {len(uncached_stocks)} stocks")
        
        # Fetch all uncached cryptos in ONE batch request
        if uncached_cryptos:
            crypto_results = await self._fetch_batch_cryptos(uncached_cryptos)
            results.update(crypto_results)
        
        # Fetch stocks concurrently
        if uncached_stocks:
            import asyncio
            stock_tasks = [self.get_price(symbol, force_refresh) for symbol in uncached_stocks]
            stock_results = await asyncio.gather(*stock_tasks, return_exceptions=True)
            
            for symbol, result in zip(uncached_stocks, stock_results):
                if not isinstance(result, Exception) and result:
                    results[symbol] = result
        
        return results
    
    async def _fetch_batch_cryptos(self, symbols: list[str]) -> dict[str, PriceData]:
        """Fetch multiple cryptos in ONE CoinGecko API call"""
        if not symbols:
            return {}
        
        try:
            unified = await get_unified_service()
            
            # Get all CoinGecko IDs
            coin_ids = []
            symbol_to_id = {}
            for symbol in symbols:
                coin_id = unified.get_coingecko_id(symbol)
                if coin_id:
                    coin_ids.append(coin_id)
                    symbol_to_id[coin_id] = symbol
            
            if not coin_ids:
                return {}
            
            # Single batch request for all cryptos
            url = f"{self.providers['coingecko']}/simple/price"
            params = {
                "ids": ",".join(coin_ids),  # Comma-separated list
                "vs_currencies": "usd",
                "include_24hr_change": "true",
                "include_market_cap": "true",
                "include_24hr_vol": "true"
            }
            
            if settings.COINGECKO_KEY:
                params["x_cg_demo_api_key"] = settings.COINGECKO_KEY
            
            if self.client is None:
                async with httpx.AsyncClient(timeout=10.0) as client:
                    resp = await client.get(url, params=params)
            else:
                resp = await self.client.get(url, params=params)
            
            resp.raise_for_status()
            data = resp.json()
            
            results = {}
            for coin_id, coin_data in data.items():
                symbol = symbol_to_id.get(coin_id)
                if symbol and "usd" in coin_data:
                    price_data = PriceData(
                        symbol=symbol,
                        price=coin_data["usd"],
                        change_percent=coin_data.get("usd_24h_change"),
                        volume=coin_data.get("usd_24h_vol"),
                        market_cap=coin_data.get("usd_market_cap"),
                        last_updated=datetime.now(),
                        source="coingecko",
                        cached=False
                    )
                    
                    # Cache it
                    await self._set_cache(f"price:{symbol}", price_data.__dict__, 60)
                    results[symbol] = price_data
            
            logger.info(f"✅ Batch fetched {len(results)} cryptos in ONE request")
            return results
            
        except Exception as e:
            logger.error(f"❌ Batch crypto fetch failed: {e}")
            return {}

# Global performance stats instance
