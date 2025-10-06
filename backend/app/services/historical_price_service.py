"""Historical Price Service - OHLCV and Time Series Data"""
import logging
import time
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Literal
from dataclasses import dataclass, asdict
import httpx
from app.core.advanced_redis_client import advanced_redis_client
from app.core.config import settings

logger = logging.getLogger(__name__)

# Performance tracking
class PerformanceMetrics:
    def __init__(self):
        self.total_requests = 0
        self.cache_hits = 0
        self.cache_misses = 0
        self.api_errors = 0
        self.total_time = 0.0
        
    def record_request(self, cached: bool, duration: float, error: bool = False):
        self.total_requests += 1
        self.total_time += duration
        if error:
            self.api_errors += 1
        elif cached:
            self.cache_hits += 1
        else:
            self.cache_misses += 1
    
    def get_stats(self):
        return {
            "total_requests": self.total_requests,
            "cache_hits": self.cache_hits,
            "cache_misses": self.cache_misses,
            "api_errors": self.api_errors,
            "cache_hit_rate": f"{(self.cache_hits / max(self.total_requests, 1)) * 100:.1f}%",
            "avg_response_time_ms": f"{(self.total_time / max(self.total_requests, 1)) * 1000:.2f}ms"
        }

performance_metrics = PerformanceMetrics()

PeriodType = Literal["1d", "1w", "1m", "3m", "6m", "1y", "5y", "all"]

@dataclass
class OHLCVData:
    """Open, High, Low, Close, Volume data point"""
    timestamp: int  # Unix timestamp
    open: float
    high: float
    low: float
    close: float
    volume: float
    
    def to_dict(self):
        return asdict(self)

@dataclass
class HistoricalPricePoint:
    """Simple price point for historical data"""
    timestamp: int
    price: float
    
    def to_dict(self):
        return asdict(self)

class HistoricalPriceService:
    """Service for fetching historical price data"""
    
    def __init__(self):
        self.client: Optional[httpx.AsyncClient] = None
        self.coingecko_base = "https://api.coingecko.com/api/v3"
        self.finnhub_base = "https://finnhub.io/api/v1"
        
        # CoinGecko coin ID mappings (expanded list)
        self.coin_ids = {
            "BTC": "bitcoin", "ETH": "ethereum", "BNB": "binancecoin",
            "SOL": "solana", "XRP": "ripple", "ADA": "cardano",
            "DOGE": "dogecoin", "DOT": "polkadot", "MATIC": "matic-network",
            "LINK": "chainlink", "AVAX": "avalanche-2", "UNI": "uniswap",
            "ATOM": "cosmos", "LTC": "litecoin", "NEAR": "near",
            "ALGO": "algorand", "VET": "vechain", "FIL": "filecoin",
            "HBAR": "hedera-hashgraph", "APT": "aptos", "OP": "optimism",
            "ARB": "arbitrum", "SUI": "sui", "IMX": "immutable-x",
            "RUNE": "thorchain", "INJ": "injective-protocol", "TIA": "celestia",
            "SEI": "sei-network", "STX": "blockstack", "FTM": "fantom",
            "GRT": "the-graph", "AAVE": "aave", "MKR": "maker",
            "SNX": "havven", "CRV": "curve-dao-token", "LDO": "lido-dao"
        }
    
    async def __aenter__(self):
        self.client = httpx.AsyncClient(timeout=30.0)
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self.client:
            await self.client.aclose()
    
    def _period_to_days(self, period: PeriodType) -> int:
        """Convert period string to number of days"""
        mapping = {
            "1d": 1,
            "1w": 7,
            "1m": 30,
            "3m": 90,
            "6m": 180,
            "1y": 365,
            "5y": 1825,
            "all": "max"
        }
        return mapping.get(period, 30)
    
    def _period_to_resolution(self, period: PeriodType) -> str:
        """Convert period to Finnhub resolution"""
        if period in ["1d"]:
            return "5"  # 5 minute
        elif period in ["1w"]:
            return "15"  # 15 minute
        elif period in ["1m", "3m"]:
            return "60"  # 1 hour
        else:
            return "D"  # Daily
    
    async def _get_cached_history(self, key: str):
        """Get cached historical data"""
        try:
            if advanced_redis_client.client:
                cached = await advanced_redis_client.client.get(key)
                if cached:
                    import json
                    return json.loads(cached)
        except Exception as e:
            logger.debug(f"Cache miss: {e}")
        return None
    
    async def _set_cache_history(self, key: str, value, ttl: int = 1800):
        """Cache historical data (default 30 minutes)"""
        try:
            if advanced_redis_client.client:
                import json
                await advanced_redis_client.client.setex(key, ttl, json.dumps(value))
        except Exception as e:
            logger.debug(f"Cache set failed: {e}")
    
    async def get_history(
        self, 
        symbol: str, 
        period: PeriodType = "1m",
        force_refresh: bool = False
    ) -> List[HistoricalPricePoint]:
        """Get historical price data for a symbol"""
        
        start_time = time.time()
        cache_key = f"history:{symbol}:{period}"
        cached = False
        error = False
        
        try:
            if not force_refresh:
                cached_data = await self._get_cached_history(cache_key)
                if cached_data:
                    cached = True
                    duration = time.time() - start_time
                    performance_metrics.record_request(cached=True, duration=duration)
                    logger.info(f"✅ Cache hit for {symbol} history ({period}) - {duration*1000:.1f}ms")
                    return [HistoricalPricePoint(**point) for point in cached_data]
            
            # Fetch from API
            if self.client is None:
                async with httpx.AsyncClient(timeout=30.0) as client:
                    data = await self._fetch_history(client, symbol, period)
            else:
                data = await self._fetch_history(self.client, symbol, period)
            
            if data:
                # Cache for 30 minutes
                await self._set_cache_history(
                    cache_key, 
                    [point.to_dict() for point in data],
                    ttl=1800
                )
                duration = time.time() - start_time
                performance_metrics.record_request(cached=False, duration=duration)
                logger.info(f"📊 Fetched {len(data)} data points for {symbol} ({period}) - {duration*1000:.1f}ms")
            else:
                error = True
                duration = time.time() - start_time
                performance_metrics.record_request(cached=False, duration=duration, error=True)
                logger.warning(f"⚠️ No data returned for {symbol} ({period})")
            
            return data
        except Exception as e:
            error = True
            duration = time.time() - start_time
            performance_metrics.record_request(cached=False, duration=duration, error=True)
            logger.error(f"❌ Error fetching history for {symbol}: {e}")
            return []
    
    async def _fetch_history(
        self, 
        client: httpx.AsyncClient, 
        symbol: str, 
        period: PeriodType
    ) -> List[HistoricalPricePoint]:
        """Fetch historical data from appropriate provider"""
        
        # Check if crypto
        if symbol in self.coin_ids:
            return await self._fetch_crypto_history(client, symbol, period)
        else:
            return await self._fetch_stock_history(client, symbol, period)
    
    async def _fetch_crypto_history(
        self, 
        client: httpx.AsyncClient, 
        symbol: str, 
        period: PeriodType
    ) -> List[HistoricalPricePoint]:
        """Fetch crypto historical data from CoinGecko"""
        try:
            coin_id = self.coin_ids.get(symbol, symbol.lower())
            days = self._period_to_days(period)
            
            url = f"{self.coingecko_base}/coins/{coin_id}/market_chart"
            params = {
                "vs_currency": "usd",
                "days": days,
                "interval": "daily" if days > 90 else "hourly"
            }
            
            if settings.COINGECKO_KEY:
                params["x_cg_demo_api_key"] = settings.COINGECKO_KEY
            
            logger.debug(f"Fetching crypto history: {url} (coin_id={coin_id}, days={days})")
            resp = await client.get(url, params=params)
            resp.raise_for_status()
            data = resp.json()
            
            if "prices" in data and len(data["prices"]) > 0:
                logger.info(f"✅ CoinGecko returned {len(data['prices'])} price points for {symbol}")
                return [
                    HistoricalPricePoint(
                        timestamp=int(point[0] / 1000),  # Convert to seconds
                        price=point[1]
                    )
                    for point in data["prices"]
                ]
            else:
                logger.warning(f"⚠️ CoinGecko returned no price data for {symbol}")
        except httpx.HTTPStatusError as e:
            if e.response.status_code == 429:
                logger.error(f"🚫 CoinGecko rate limit exceeded for {symbol}")
            else:
                logger.error(f"❌ CoinGecko HTTP error for {symbol}: {e.response.status_code}")
        except Exception as e:
            logger.error(f"❌ Error fetching crypto history for {symbol}: {e}")
        
        return []
    
    async def _fetch_stock_history(
        self, 
        client: httpx.AsyncClient, 
        symbol: str, 
        period: PeriodType
    ) -> List[HistoricalPricePoint]:
        """Fetch stock historical data from Finnhub"""
        try:
            if not settings.FINNHUB_KEY:
                logger.error("❌ FINNHUB_KEY not configured - cannot fetch stock data")
                return []
            
            # Calculate timestamps
            end_time = int(datetime.now().timestamp())
            days = self._period_to_days(period)
            
            if days == "max":
                days = 1825  # 5 years max for Finnhub free tier
            
            start_time = int((datetime.now() - timedelta(days=days)).timestamp())
            resolution = self._period_to_resolution(period)
            
            url = f"{self.finnhub_base}/stock/candle"
            params = {
                "symbol": symbol,
                "resolution": resolution,
                "from": start_time,
                "to": end_time,
                "token": settings.FINNHUB_KEY
            }
            
            logger.debug(f"Fetching stock history: {symbol} (resolution={resolution}, days={days})")
            resp = await client.get(url, params=params)
            resp.raise_for_status()
            data = resp.json()
            
            if data.get("s") == "ok" and "c" in data and len(data["c"]) > 0:
                logger.info(f"✅ Finnhub returned {len(data['c'])} candles for {symbol}")
                return [
                    HistoricalPricePoint(
                        timestamp=data["t"][i],
                        price=data["c"][i]
                    )
                    for i in range(len(data["c"]))
                ]
            elif data.get("s") == "no_data":
                logger.warning(f"⚠️ Finnhub: No data available for {symbol}")
            else:
                logger.warning(f"⚠️ Finnhub returned unexpected response for {symbol}: {data.get('s')}")
        except httpx.HTTPStatusError as e:
            if e.response.status_code == 429:
                logger.error(f"🚫 Finnhub rate limit exceeded for {symbol}")
            elif e.response.status_code == 403:
                logger.error(f"🚫 Finnhub API key invalid or expired for {symbol}")
            else:
                logger.error(f"❌ Finnhub HTTP error for {symbol}: {e.response.status_code}")
        except Exception as e:
            logger.error(f"❌ Error fetching stock history for {symbol}: {e}")
        
        return []
    
    async def get_ohlcv(
        self, 
        symbol: str, 
        period: PeriodType = "1m",
        force_refresh: bool = False
    ) -> List[OHLCVData]:
        """Get OHLCV (candlestick) data for a symbol"""
        
        cache_key = f"ohlcv:{symbol}:{period}"
        
        if not force_refresh:
            cached = await self._get_cached_history(cache_key)
            if cached:
                logger.info(f"Cache hit for {symbol} OHLCV ({period})")
                return [OHLCVData(**point) for point in cached]
        
        try:
            if self.client is None:
                async with httpx.AsyncClient(timeout=30.0) as client:
                    data = await self._fetch_ohlcv(client, symbol, period)
            else:
                data = await self._fetch_ohlcv(self.client, symbol, period)
            
            if data:
                # Cache for 30 minutes
                await self._set_cache_history(
                    cache_key,
                    [point.to_dict() for point in data],
                    ttl=1800
                )
            
            return data
        except Exception as e:
            logger.error(f"Error fetching OHLCV for {symbol}: {e}")
            return []
    
    async def _fetch_ohlcv(
        self, 
        client: httpx.AsyncClient, 
        symbol: str, 
        period: PeriodType
    ) -> List[OHLCVData]:
        """Fetch OHLCV data from appropriate provider"""
        
        # Check if crypto
        if symbol in self.coin_ids:
            return await self._fetch_crypto_ohlcv(client, symbol, period)
        else:
            return await self._fetch_stock_ohlcv(client, symbol, period)
    
    async def _fetch_crypto_ohlcv(
        self, 
        client: httpx.AsyncClient, 
        symbol: str, 
        period: PeriodType
    ) -> List[OHLCVData]:
        """Fetch crypto OHLCV from CoinGecko"""
        try:
            coin_id = self.coin_ids.get(symbol, symbol.lower())
            days = self._period_to_days(period)
            
            url = f"{self.coingecko_base}/coins/{coin_id}/ohlc"
            params = {
                "vs_currency": "usd",
                "days": days
            }
            
            if settings.COINGECKO_KEY:
                params["x_cg_demo_api_key"] = settings.COINGECKO_KEY
            
            resp = await client.get(url, params=params)
            resp.raise_for_status()
            data = resp.json()
            
            # CoinGecko OHLC format: [timestamp, open, high, low, close]
            return [
                OHLCVData(
                    timestamp=int(candle[0] / 1000),
                    open=candle[1],
                    high=candle[2],
                    low=candle[3],
                    close=candle[4],
                    volume=0  # CoinGecko doesn't include volume in OHLC endpoint
                )
                for candle in data
            ]
        except Exception as e:
            logger.error(f"Error fetching crypto OHLCV for {symbol}: {e}")
        
        return []
    
    async def _fetch_stock_ohlcv(
        self, 
        client: httpx.AsyncClient, 
        symbol: str, 
        period: PeriodType
    ) -> List[OHLCVData]:
        """Fetch stock OHLCV from Finnhub"""
        try:
            if not settings.FINNHUB_KEY:
                logger.warning("FINNHUB_KEY not configured")
                return []
            
            # Calculate timestamps
            end_time = int(datetime.now().timestamp())
            days = self._period_to_days(period)
            
            if days == "max":
                days = 1825
            
            start_time = int((datetime.now() - timedelta(days=days)).timestamp())
            resolution = self._period_to_resolution(period)
            
            url = f"{self.finnhub_base}/stock/candle"
            params = {
                "symbol": symbol,
                "resolution": resolution,
                "from": start_time,
                "to": end_time,
                "token": settings.FINNHUB_KEY
            }
            
            resp = await client.get(url, params=params)
            resp.raise_for_status()
            data = resp.json()
            
            if data.get("s") == "ok" and "o" in data:
                return [
                    OHLCVData(
                        timestamp=data["t"][i],
                        open=data["o"][i],
                        high=data["h"][i],
                        low=data["l"][i],
                        close=data["c"][i],
                        volume=data["v"][i]
                    )
                    for i in range(len(data["o"]))
                ]
        except Exception as e:
            logger.error(f"Error fetching stock OHLCV for {symbol}: {e}")
        
        return []
