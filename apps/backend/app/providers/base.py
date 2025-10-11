"""
Provider abstraction layer with resilience patterns
"""
import asyncio
import time
from abc import ABC, abstractmethod
from collections.abc import Callable
from dataclasses import dataclass
from enum import Enum
from typing import Any


class ProviderErrorCode(Enum):
    """Standardized provider error codes"""
    RATE_LIMITED = "RATE_LIMITED"
    SYMBOL_NOT_FOUND = "SYMBOL_NOT_FOUND"
    INVALID_TIMEFRAME = "INVALID_TIMEFRAME" 
    NETWORK_ERROR = "NETWORK_ERROR"
    AUTHENTICATION_ERROR = "AUTHENTICATION_ERROR"
    QUOTA_EXCEEDED = "QUOTA_EXCEEDED"
    PROVIDER_UNAVAILABLE = "PROVIDER_UNAVAILABLE"
    DATA_QUALITY_ERROR = "DATA_QUALITY_ERROR"
    INTERNAL_ERROR = "INTERNAL_ERROR"


@dataclass
class ProviderError(Exception):
    """Provider-specific error with standard codes"""
    message: str
    code: ProviderErrorCode
    provider: str
    retry_after: int | None = None
    details: dict[str, Any] | None = None


@dataclass
class Symbol:
    """Standardized symbol representation"""
    symbol: str
    name: str
    base_asset: str
    quote_asset: str
    exchange: str
    type: str = "spot"
    active: bool = True
    logo_url: str | None = None


@dataclass
class OHLCBar:
    """Standardized OHLC bar"""
    timestamp: int
    open: float
    high: float
    low: float
    close: float
    volume: float


class DataProvider(ABC):
    """Abstract base class for market data providers"""
    
    def __init__(self, name: str, api_key: str | None = None):
        self.name = name
        self.api_key = api_key
        self._rate_limiter = RateLimiter()
        self._circuit_breaker = CircuitBreaker()
    
    @abstractmethod
    async def get_symbols(self) -> list[Symbol]:
        """Get list of available symbols"""
        pass
    
    @abstractmethod
    async def get_ohlc(
        self,
        symbol: str,
        timeframe: str,
        limit: int = 500,
        from_timestamp: int | None = None,
        to_timestamp: int | None = None
    ) -> list[OHLCBar]:
        """Get OHLC data for a symbol"""
        pass
    
    @abstractmethod
    async def get_logo(self, symbol: str) -> str | None:
        """Get logo URL for a symbol"""
        pass
    
    async def validate_ohlc_quality(self, bars: list[OHLCBar]) -> list[OHLCBar]:
        """Validate and clean OHLC data"""
        if not bars:
            return bars
        
        cleaned = []
        prev_timestamp = 0
        
        for bar in bars:
            # Check for duplicates
            if bar.timestamp <= prev_timestamp:
                continue
                
            # Check for gaps (basic validation)
            if bar.open <= 0 or bar.high <= 0 or bar.low <= 0 or bar.close <= 0:
                continue
                
            # Check for invalid OHLC relationships
            if not (bar.low <= bar.open <= bar.high and bar.low <= bar.close <= bar.high):
                continue
                
            cleaned.append(bar)
            prev_timestamp = bar.timestamp
            
        return cleaned


class RateLimiter:
    """Rate limiter with exponential backoff"""
    
    def __init__(self):
        self._requests: dict[str, list[float]] = {}
        self._backoff_until: dict[str, float] = {}
    
    async def acquire(self, key: str, max_requests: int = 100, window: int = 60):
        """Acquire rate limit token"""
        now = time.time()
        
        # Check if we're in backoff period
        if key in self._backoff_until and now < self._backoff_until[key]:
            wait_time = self._backoff_until[key] - now
            await asyncio.sleep(wait_time)
        
        # Clean old requests
        if key not in self._requests:
            self._requests[key] = []
        
        self._requests[key] = [
            req_time for req_time in self._requests[key] 
            if now - req_time < window
        ]
        
        # Check rate limit
        if len(self._requests[key]) >= max_requests:
            # Exponential backoff
            backoff_time = min(300, 2 ** len(self._requests[key]))  # Max 5 minutes
            self._backoff_until[key] = now + backoff_time
            await asyncio.sleep(backoff_time)
        
        self._requests[key].append(now)
    
    def set_backoff(self, key: str, retry_after: int):
        """Set explicit backoff time"""
        self._backoff_until[key] = time.time() + retry_after


class CircuitBreaker:
    """Circuit breaker pattern implementation"""
    
    def __init__(self, failure_threshold: int = 5, recovery_timeout: int = 60):
        self.failure_threshold = failure_threshold
        self.recovery_timeout = recovery_timeout
        self._failure_count = 0
        self._last_failure_time = 0
        self._state = "closed"  # closed, open, half_open
    
    async def call(self, func: Callable[..., Any], *args: Any, **kwargs: Any):
        """Execute function with circuit breaker protection"""
        if self._state == "open":
            if time.time() - self._last_failure_time > self.recovery_timeout:
                self._state = "half_open"
            else:
                raise ProviderError(
                    "Circuit breaker is open",
                    ProviderErrorCode.PROVIDER_UNAVAILABLE,
                    "circuit_breaker"
                )
        
        try:
            result = await func(*args, **kwargs)
            if self._state == "half_open":
                self._state = "closed"
                self._failure_count = 0
            return result
        except Exception as e:
            self._failure_count += 1
            self._last_failure_time = time.time()
            
            if self._failure_count >= self.failure_threshold:
                self._state = "open"
            
            raise e


class SingleFlightCache:
    """Prevents duplicate requests (stampede protection)"""
    
    def __init__(self):
        self._inflight: dict[str, asyncio.Future] = {}
        self._cache: dict[str, tuple[Any, float]] = {}
        self._etags: dict[str, str] = {}
    
    async def get_or_fetch(
        self,
        key: str,
        fetch_func,
        ttl: int = 300,
        *args: Any,
        **kwargs
    ):
        """Get from cache or fetch with single-flight protection"""
        now = time.time()
        
        # Check cache first
        if key in self._cache:
            value, expires = self._cache[key]
            if now < expires:
                return value
        
        # Check if request is already in flight
        if key in self._inflight:
            return await self._inflight[key]
        
        # Start new request
        future = asyncio.create_task(fetch_func(*args, **kwargs))
        self._inflight[key] = future
        
        try:
            result = await future
            # Cache the result
            self._cache[key] = (result, now + ttl)
            return result
        finally:
            # Remove from inflight
            self._inflight.pop(key, None)
    
    def get_etag(self, key: str) -> str | None:
        """Get ETag for conditional requests"""
        return self._etags.get(key)
    
    def set_etag(self, key: str, etag: str):
        """Set ETag for conditional requests"""
        self._etags[key] = etag


class ProviderManager:
    """Manages multiple data providers with failover"""
    
    def __init__(self):
        self._providers: list[DataProvider] = []
        self._cache = SingleFlightCache()
    
    def add_provider(self, provider: DataProvider):
        """Add a data provider"""
        self._providers.append(provider)
    
    async def get_symbols(self) -> list[Symbol]:
        """Get symbols with failover"""
        cache_key = "symbols"
        
        return await self._cache.get_or_fetch(
            cache_key,
            self._get_symbols_with_failover,
            ttl=3600  # 1 hour TTL
        )
    
    async def get_ohlc(
        self,
        symbol: str,
        timeframe: str,
        limit: int = 500,
        from_timestamp: int | None = None,
        to_timestamp: int | None = None
    ) -> list[OHLCBar]:
        """Get OHLC data with failover"""
        cache_key = f"ohlc:{symbol}:{timeframe}:{limit}:{from_timestamp}:{to_timestamp}"
        
        return await self._cache.get_or_fetch(
            cache_key,
            self._get_ohlc_with_failover,
            ttl=60,  # 1 minute TTL
            symbol=symbol,
            timeframe=timeframe,
            limit=limit,
            from_timestamp=from_timestamp,
            to_timestamp=to_timestamp
        )
    
    async def _get_symbols_with_failover(self) -> list[Symbol]:
        """Get symbols with provider failover"""
        last_error = None
        
        for provider in self._providers:
            try:
                return await provider._circuit_breaker.call(
                    provider.get_symbols
                )
            except Exception as e:
                last_error = e
                continue
        
        if last_error:
            raise last_error
        
        raise ProviderError(
            "No providers available",
            ProviderErrorCode.PROVIDER_UNAVAILABLE,
            "all"
        )
    
    async def _get_ohlc_with_failover(
        self,
        symbol: str,
        timeframe: str,
        limit: int,
        from_timestamp: int | None,
        to_timestamp: int | None
    ) -> list[OHLCBar]:
        """Get OHLC data with provider failover"""
        last_error = None
        
        for provider in self._providers:
            try:
                await provider._rate_limiter.acquire(f"{provider.name}:ohlc")
                
                bars = await provider._circuit_breaker.call(
                    provider.get_ohlc,
                    symbol,
                    timeframe,
                    limit,
                    from_timestamp,
                    to_timestamp
                )
                
                # Validate data quality
                return await provider.validate_ohlc_quality(bars)
                
            except Exception as e:
                last_error = e
                if isinstance(e, ProviderError) and e.code == ProviderErrorCode.RATE_LIMITED:
                    # Set backoff for this provider
                    provider._rate_limiter.set_backoff(
                        f"{provider.name}:ohlc",
                        e.retry_after or 60
                    )
                continue
        
        if last_error:
            raise last_error
        
        raise ProviderError(
            "No providers available for OHLC data",
            ProviderErrorCode.PROVIDER_UNAVAILABLE,
            "all"
        )