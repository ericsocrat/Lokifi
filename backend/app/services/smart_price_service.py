"""Smart Price Service with Redis caching"""
import logging
from datetime import datetime
from typing import Dict, Optional
from dataclasses import dataclass
import httpx
from app.core.advanced_redis_client import advanced_redis_client
from app.core.config import settings

logger = logging.getLogger(__name__)

@dataclass
class PriceData:
    symbol: str
    price: float
    change: Optional[float] = None
    change_percent: Optional[float] = None
    volume: Optional[float] = None
    market_cap: Optional[float] = None
    high: Optional[float] = None
    low: Optional[float] = None
    last_updated: datetime = None
    source: str = "unknown"
    cached: bool = False

class SmartPriceService:
    def __init__(self):
        self.client: Optional[httpx.AsyncClient] = None
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
    
    async def get_price(self, symbol: str, force_refresh: bool = False) -> Optional[PriceData]:
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
    
    async def _fetch_price(self, client: httpx.AsyncClient, symbol: str) -> Optional[PriceData]:
        try:
            if symbol in ["BTC", "ETH", "SOL", "DOGE", "ADA", "DOT", "MATIC", "LINK"]:
                coin_ids = {"BTC": "bitcoin", "ETH": "ethereum", "SOL": "solana", "DOGE": "dogecoin", "ADA": "cardano", "DOT": "polkadot", "MATIC": "matic-network", "LINK": "chainlink"}
                coin_id = coin_ids.get(symbol, symbol.lower())
                url = f"{self.providers['coingecko']}/simple/price?ids={coin_id}&vs_currencies=usd&include_24hr_change=true&include_market_cap=true&include_24hr_vol=true"
                resp = await client.get(url)
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
            else:
                url = f"{self.providers['finnhub']}/quote?symbol={symbol}&token={settings.FINNHUB_KEY}"
                resp = await client.get(url)
                data = resp.json()
                if "c" in data and data["c"] > 0:
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
    
    async def get_batch_prices(self, symbols: list, force_refresh: bool = False) -> Dict[str, PriceData]:
        results = {}
        for symbol in symbols:
            price = await self.get_price(symbol, force_refresh)
            if price:
                results[symbol] = price
        return results

# Global performance stats instance
