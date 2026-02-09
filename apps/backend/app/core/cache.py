"""
Redis cache utilities for Lokifi analytics endpoints.

Provides:
- Redis connection management
- Serialization/deserialization helpers
- Cache decorators for endpoints
- Metrics tracking
"""

import json
import logging
from datetime import timedelta
from typing import Any, Generic, Optional, TypeVar, cast

import redis.asyncio as redis
from redis.asyncio import Redis

logger = logging.getLogger(__name__)

# Type variable for generic caching
T = TypeVar("T")


class RedisCache:
    """Redis cache client with async support."""

    def __init__(self, redis_url: str = "redis://localhost:6379/0"):
        """Initialize Redis connection."""
        self.redis_url = redis_url
        self.client: Redis | None = None

    async def connect(self) -> None:
        """Connect to Redis."""
        try:
            self.client = await redis.from_url(self.redis_url, decode_responses=True)
            # Test connection
            await self.client.ping()
            logger.info(
                "Redis connected",
                extra={"redis_url": self.redis_url.split("@")[-1]},
            )
        except Exception as e:
            logger.error(
                "Redis connection failed",
                extra={"error": str(e), "redis_url": self.redis_url},
            )
            raise

    async def disconnect(self) -> None:
        """Disconnect from Redis."""
        if self.client:
            await self.client.close()
            logger.info("Redis disconnected")
            self.client = None

    async def get(self, key: str) -> Any | None:
        """Get value from cache."""
        if not self.client:
            return None

        try:
            value = await self.client.get(key)
            if value:
                logger.debug(f"Cache hit: {key}")
                return json.loads(value)
            logger.debug(f"Cache miss: {key}")
            return None
        except Exception as e:
            logger.warning(f"Cache get error: {key}", extra={"error": str(e)})
            return None

    async def set(
        self, key: str, value: Any, ttl: int = 3600
    ) -> bool:
        """Set value in cache with TTL."""
        if not self.client:
            return False

        try:
            serialized = json.dumps(value)
            await self.client.setex(key, ttl, serialized)
            logger.debug(f"Cache set: {key} (TTL: {ttl}s)")
            return True
        except Exception as e:
            logger.warning(f"Cache set error: {key}", extra={"error": str(e)})
            return False

    async def delete(self, key: str) -> bool:
        """Delete key from cache."""
        if not self.client:
            return False

        try:
            await self.client.delete(key)
            logger.debug(f"Cache invalidated: {key}")
            return True
        except Exception as e:
            logger.warning(f"Cache delete error: {key}", extra={"error": str(e)})
            return False

    async def delete_pattern(self, pattern: str) -> int:
        """Delete all keys matching pattern."""
        if not self.client:
            return 0

        try:
            cursor = 0
            count = 0
            while True:
                cursor, keys = await self.client.scan(cursor, match=pattern)
                if keys:
                    await self.client.delete(*keys)
                    count += len(keys)
                if cursor == 0:
                    break
            logger.debug(f"Cache pattern invalidated: {pattern} ({count} keys)")
            return count
        except Exception as e:
            logger.warning(
                f"Cache pattern delete error: {pattern}",
                extra={"error": str(e)},
            )
            return 0

    async def clear_all(self) -> bool:
        """Clear entire cache (use with caution!)."""
        if not self.client:
            return False

        try:
            await self.client.flushdb()
            logger.warning("Redis cache cleared (flushdb)")
            return True
        except Exception as e:
            logger.warning("Cache clear error", extra={"error": str(e)})
            return False

    async def get_info(self) -> dict[str, Any]:
        """Get Redis server info."""
        if not self.client:
            return {}

        try:
            info = await self.client.info()
            return {
                "connected": True,
                "memory_used_mb": info.get("used_memory_mb"),
                "connected_clients": info.get("connected_clients"),
                "expired_keys": info.get("expired_keys"),
                "evicted_keys": info.get("evicted_keys"),
            }
        except Exception as e:
            logger.warning("Cache info error", extra={"error": str(e)})
            return {"connected": False}


# Global cache instance
_cache_instance: RedisCache | None = None


async def get_cache() -> RedisCache:
    """Get or create global Redis cache instance."""
    global _cache_instance

    if _cache_instance is None:
        _cache_instance = RedisCache()
        await _cache_instance.connect()

    return _cache_instance


async def shutdown_cache() -> None:
    """Shutdown global cache instance."""
    global _cache_instance

    if _cache_instance:
        await _cache_instance.disconnect()
        _cache_instance = None


class CacheConfig:
    """Cache configuration for different endpoint types."""

    # Analytics endpoints - static 30 min to 1 hour
    USERS_GROWTH_TTL = 3600  # 1 hour - user growth is relatively static
    USERS_ACTIVITY_TTL = 1800  # 30 min - activity changes hourly
    USERS_DEMOGRAPHICS_TTL = 3600  # 1 hour - demographic distribution is static
    MODERATION_TTL = 1800  # 30 min - moderation data changes frequently

    # Cache key prefixes
    PREFIX_ANALYTICS = "analytics:"
    PREFIX_USERS = "users:"
    PREFIX_MODERATION = "moderation:"

    @staticmethod
    def make_cache_key(
        endpoint: str, *args, **kwargs
    ) -> str:
        """Generate cache key from endpoint and parameters."""
        parts = [CacheConfig.PREFIX_ANALYTICS, endpoint]

        if args:
            parts.extend(str(arg) for arg in args)

        if kwargs:
            parts.extend(f"{k}:{v}" for k, v in sorted(kwargs.items()))

        return ":".join(parts)
