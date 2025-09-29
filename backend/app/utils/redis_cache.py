"""
Redis Caching Decorator for Performance Optimization
Usage: @redis_cache(expire=300) above function definitions
"""

import functools
import json
import hashlib
import logging
from typing import Any, Callable, Optional
from app.core.redis_client import redis_client

logger = logging.getLogger(__name__)

def redis_cache(expire: int = 300, key_prefix: str = None):
    """
    Redis caching decorator
    
    Args:
        expire: Expiration time in seconds (default 5 minutes)
        key_prefix: Optional prefix for cache keys
    """
    def decorator(func: Callable) -> Callable:
        @functools.wraps(func)
        async def wrapper(*args, **kwargs) -> Any:
            # Generate cache key
            key_data = f"{func.__name__}:{args}:{sorted(kwargs.items())}"
            cache_key = hashlib.md5(key_data.encode()).hexdigest()
            
            if key_prefix:
                cache_key = f"{key_prefix}:{cache_key}"
            
            try:
                # Try to get from cache
                cached_result = await redis_client.get(cache_key)
                if cached_result:
                    logger.debug(f"Cache HIT for {func.__name__}")
                    return json.loads(cached_result)
                
                # Cache miss - execute function
                logger.debug(f"Cache MISS for {func.__name__}")
                result = await func(*args, **kwargs)
                
                # Store in cache
                await redis_client.set(
                    cache_key, 
                    json.dumps(result, default=str),
                    expire=expire
                )
                
                return result
                
            except Exception as e:
                logger.error(f"Cache error for {func.__name__}: {e}")
                # Fallback to direct execution
                return await func(*args, **kwargs)
        
        return wrapper
    return decorator

# Example usage:
# @redis_cache(expire=300)
# async def get_user_profile(user_id: str):
#     # Your function implementation
#     pass
