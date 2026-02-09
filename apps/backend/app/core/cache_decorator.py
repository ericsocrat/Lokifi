"""
Decorator for caching FastAPI endpoint responses.

Usage:
    @cached_endpoint(ttl=3600)
    async def get_analytics(...) -> ResponseModel:
        ...
"""

import functools
import inspect
import logging
from collections.abc import Callable
from typing import Any, TypeVar, cast

from app.core.cache import CacheConfig, get_cache

logger = logging.getLogger(__name__)

T = TypeVar("T")


def cached_endpoint(
    ttl: int = 3600,
    key_prefix: str = "",
) -> Callable:
    """
    Decorator to cache FastAPI endpoint responses in Redis.

    Args:
        ttl: Time-to-live in seconds
        key_prefix: Custom cache key prefix (defaults to endpoint name)

    Example:
        @router.get("/analytics/users/growth")
        @cached_endpoint(ttl=3600)
        async def get_user_growth(...) -> UserGrowthMetrics:
            ...

    Note: Must be applied AFTER the @router decorator.
    """

    def decorator(func: Callable) -> Callable:
        endpoint_name = key_prefix or func.__name__

        @functools.wraps(func)
        async def wrapper(*args, **kwargs) -> Any:
            # Generate cache key from function name and args/kwargs
            cache_key = CacheConfig.make_cache_key(endpoint_name)

            try:
                # Try to get from cache first
                cache = await get_cache()
                cached_result = await cache.get(cache_key)

                if cached_result is not None:
                    logger.info(
                        f"Cache hit: {endpoint_name}",
                        extra={"cache_key": cache_key},
                    )
                    return cached_result

            except Exception as e:
                logger.warning(
                    f"Cache get error: {endpoint_name}",
                    extra={"error": str(e), "cache_key": cache_key},
                )
                # Continue without cache on error

            # Execute function (cache miss or error)
            result = await func(*args, **kwargs)

            try:
                # Store in cache
                cache = await get_cache()
                await cache.set(cache_key, result, ttl)
                logger.debug(
                    f"Cache set: {endpoint_name}",
                    extra={"cache_key": cache_key, "ttl": ttl},
                )
            except Exception as e:
                logger.warning(
                    f"Cache set error: {endpoint_name}",
                    extra={"error": str(e), "cache_key": cache_key},
                )
                # Return result even if cache storage fails

            return result

        return wrapper

    return decorator


class CacheInvalidator:
    """Helper for invalidating cache entries."""

    @staticmethod
    async def invalidate_user_cache() -> None:
        """Invalidate all user-related cache entries."""
        cache = await get_cache()

        # Invalidate user analytics caches
        await cache.delete_pattern(f"{CacheConfig.PREFIX_ANALYTICS}users:*")

        logger.info("User cache invalidated")

    @staticmethod
    async def invalidate_moderation_cache() -> None:
        """Invalidate moderation cache entries."""
        cache = await get_cache()

        await cache.delete(
            CacheConfig.make_cache_key("moderation")
        )

        logger.info("Moderation cache invalidated")

    @staticmethod
    async def invalidate_analytics_cache() -> None:
        """Invalidate all analytics cache entries."""
        cache = await get_cache()

        count = await cache.delete_pattern(f"{CacheConfig.PREFIX_ANALYTICS}*")

        logger.info(f"Analytics cache invalidated ({count} keys)")
