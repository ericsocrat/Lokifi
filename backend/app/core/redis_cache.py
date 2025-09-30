"""
Redis Cache Decorators for Frequently Accessed API Endpoints
High-performance caching with intelligent TTL management
"""

import json
import logging
import hashlib
from functools import wraps
from typing import Any, Dict, Optional, Callable
import redis.asyncio as redis
from fastapi import Request
from app.core.config import Settings
import time

logger = logging.getLogger(__name__)

class RedisCache:
    """Redis caching utility with smart TTL management"""
    
    def __init__(self, redis_url: str = None):
        settings = Settings()
        self.redis_url = redis_url or getattr(settings, 'REDIS_URL', 'redis://localhost:6379/0')
        self._client: Optional[redis.Redis] = None
        self.default_ttl = 300  # 5 minutes default
        
    async def get_client(self) -> redis.Redis:
        """Get or create Redis client"""
        if self._client is None:
            self._client = redis.from_url(self.redis_url)
        return self._client
    
    def _generate_cache_key(self, prefix: str, *args, **kwargs) -> str:
        """Generate unique cache key from function arguments"""
        
        # Create a string representation of arguments
        key_data = {
            'args': args,
            'kwargs': {k: v for k, v in kwargs.items() if k not in ['request', 'response']}
        }
        
        # Hash the key data for consistent, compact keys
        key_str = json.dumps(key_data, sort_keys=True, default=str)
        key_hash = hashlib.md5(key_str.encode()).hexdigest()[:12]
        
        return f"cache:{prefix}:{key_hash}"
    
    async def get(self, key: str) -> Optional[Any]:
        """Get cached value"""
        try:
            client = await self.get_client()
            cached_data = await client.get(key)
            
            if cached_data:
                try:
                    data = json.loads(cached_data)
                    
                    # Check if data has expiration metadata
                    if isinstance(data, dict) and '__cached_at__' in data:
                        cached_at = data.pop('__cached_at__')
                        cache_age = time.time() - cached_at
                        logger.debug(f"Cache hit for {key}, age: {cache_age:.1f}s")
                        return data.get('data')
                    
                    return data
                    
                except json.JSONDecodeError:
                    logger.warning(f"Invalid JSON in cache for key: {key}")
                    await self.delete(key)
                    
        except Exception as e:
            logger.error(f"Redis get error for key {key}: {e}")
        
        return None
    
    async def set(self, key: str, value: Any, ttl: Optional[int] = None) -> bool:
        """Set cached value with TTL"""
        try:
            client = await self.get_client()
            
            # Add caching metadata
            cached_data = {
                'data': value,
                '__cached_at__': time.time()
            }
            
            json_data = json.dumps(cached_data, default=str)
            ttl = ttl or self.default_ttl
            
            success = await client.set(key, json_data, ex=ttl)
            logger.debug(f"Cache set for {key}, TTL: {ttl}s")
            return bool(success)
            
        except Exception as e:
            logger.error(f"Redis set error for key {key}: {e}")
            return False
    
    async def delete(self, key: str) -> bool:
        """Delete cached value"""
        try:
            client = await self.get_client()
            deleted = await client.delete(key)
            return bool(deleted)
        except Exception as e:
            logger.error(f"Redis delete error for key {key}: {e}")
            return False
    
    async def clear_pattern(self, pattern: str) -> int:
        """Clear all keys matching pattern"""
        try:
            client = await self.get_client()
            keys = await client.keys(pattern)
            if keys:
                deleted = await client.delete(*keys)
                logger.info(f"Cleared {deleted} cache keys matching {pattern}")
                return deleted
            return 0
        except Exception as e:
            logger.error(f"Redis clear pattern error: {e}")
            return 0

# Global cache instance
cache = RedisCache()

def redis_cache(
    ttl: int = 300,
    prefix: str = "api",
    vary_on_user: bool = True,
    vary_on_headers: Optional[list] = None,
    skip_cache_if: Optional[Callable] = None,
    invalidate_on_mutation: bool = True
):
    """
    Redis cache decorator for FastAPI endpoints
    
    Args:
        ttl: Cache time-to-live in seconds
        prefix: Cache key prefix
        vary_on_user: Include user ID in cache key
        vary_on_headers: List of headers to include in cache key
        skip_cache_if: Function to determine if caching should be skipped
        invalidate_on_mutation: Clear cache on POST/PUT/DELETE requests
    """
    
    def decorator(func: Callable) -> Callable:
        
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Extract request from arguments
            request = None
            for arg in args:
                if isinstance(arg, Request):
                    request = arg
                    break
            
            # Find request in kwargs if not in args
            if not request:
                request = kwargs.get('request')
            
            if not request:
                logger.warning(f"No request found in {func.__name__}, skipping cache")
                return await func(*args, **kwargs)
            
            # Skip cache if condition is met
            if skip_cache_if and skip_cache_if(request):
                return await func(*args, **kwargs)
            
            # Handle cache invalidation on mutations
            if invalidate_on_mutation and request.method in ['POST', 'PUT', 'DELETE', 'PATCH']:
                # Invalidate related caches
                await cache.clear_pattern(f"cache:{prefix}:*")
                logger.info(f"Cache invalidated for prefix {prefix} due to {request.method} request")
                return await func(*args, **kwargs)
            
            # Skip cache for non-GET requests unless explicitly allowed
            if request.method != 'GET':
                return await func(*args, **kwargs)
            
            # Build cache key components
            key_components = [str(request.url.path)]
            
            # Add query parameters
            if request.query_params:
                query_str = "&".join([f"{k}={v}" for k, v in sorted(request.query_params.items())])
                key_components.append(query_str)
            
            # Add user ID if required
            if vary_on_user:
                user_id = getattr(request.state, 'user_id', None)
                if user_id:
                    key_components.append(f"user:{user_id}")
            
            # Add header variations
            if vary_on_headers:
                for header in vary_on_headers:
                    value = request.headers.get(header)
                    if value:
                        key_components.append(f"{header}:{value}")
            
            # Generate final cache key
            cache_key = cache._generate_cache_key(prefix, *key_components)
            
            # Try to get from cache
            cached_result = await cache.get(cache_key)
            if cached_result is not None:
                logger.debug(f"Cache HIT for {func.__name__}")
                return cached_result
            
            # Cache miss - execute function
            logger.debug(f"Cache MISS for {func.__name__}")
            start_time = time.time()
            result = await func(*args, **kwargs)
            execution_time = (time.time() - start_time) * 1000
            
            # Cache the result (only cache successful responses)
            if result is not None:
                await cache.set(cache_key, result, ttl)
                logger.debug(f"Cached result for {func.__name__}, execution: {execution_time:.1f}ms")
            
            return result
        
        return wrapper
    return decorator

def cache_user_data(ttl: int = 600):
    """Cache user-specific data for 10 minutes"""
    return redis_cache(
        ttl=ttl,
        prefix="user_data",
        vary_on_user=True,
        vary_on_headers=['Authorization']
    )

def cache_public_data(ttl: int = 1800):
    """Cache public data for 30 minutes"""
    return redis_cache(
        ttl=ttl,
        prefix="public",
        vary_on_user=False
    )

def cache_portfolio_data(ttl: int = 300):
    """Cache portfolio data for 5 minutes with user variation"""
    return redis_cache(
        ttl=ttl,
        prefix="portfolio",
        vary_on_user=True,
        invalidate_on_mutation=True
    )

def cache_notifications(ttl: int = 120):
    """Cache notifications for 2 minutes"""
    return redis_cache(
        ttl=ttl,
        prefix="notifications",
        vary_on_user=True,
        invalidate_on_mutation=True
    )

def cache_ai_responses(ttl: int = 900):
    """Cache AI responses for 15 minutes"""
    return redis_cache(
        ttl=ttl,
        prefix="ai_responses",
        vary_on_user=True
    )

def cache_market_data(ttl: int = 60):
    """Cache market data for 1 minute (frequently updated)"""
    return redis_cache(
        ttl=ttl,
        prefix="market_data",
        vary_on_user=False
    )

# Cache management utilities
async def warm_cache():
    """Pre-populate frequently accessed data"""
    
    logger.info("🔥 Warming up cache...")
    
    try:
        # Pre-cache common data patterns here
        # This would typically be called during startup
        
        # Example: Pre-cache user counts, system stats, etc.
        cache_warmed = {
            "cache_warmed_at": time.time(),
            "status": "warmed"
        }
        
        await cache.set("cache:system:warmed", cache_warmed, ttl=3600)
        logger.info("✅ Cache warming completed")
        
    except Exception as e:
        logger.error(f"❌ Cache warming failed: {e}")

async def get_cache_stats() -> Dict[str, Any]:
    """Get cache statistics"""
    
    try:
        client = await cache.get_client()
        info = await client.info()
        
        stats = {
            "redis_version": info.get('redis_version'),
            "connected_clients": info.get('connected_clients'),
            "used_memory": info.get('used_memory_human'),
            "keyspace_hits": info.get('keyspace_hits', 0),
            "keyspace_misses": info.get('keyspace_misses', 0),
            "total_commands_processed": info.get('total_commands_processed', 0)
        }
        
        # Calculate hit ratio
        hits = stats['keyspace_hits']
        misses = stats['keyspace_misses']
        total = hits + misses
        
        if total > 0:
            stats['hit_ratio'] = round((hits / total) * 100, 2)
        else:
            stats['hit_ratio'] = 0
        
        return stats
        
    except Exception as e:
        logger.error(f"Failed to get cache stats: {e}")
        return {"error": str(e)}

async def clear_all_cache():
    """Clear all cached data"""
    
    try:
        await cache.clear_pattern("cache:*")
        logger.info("🧹 All cache data cleared")
        return True
    except Exception as e:
        logger.error(f"Failed to clear cache: {e}")
        return False