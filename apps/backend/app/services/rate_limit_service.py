"""
Rate limiting service for direct messaging (J4).
"""

import time
import uuid

import redis.asyncio as redis

from app.core.config import settings


class RateLimitService:
    """Redis-based sliding window rate limiter for messaging."""

    def __init__(self, redis_client: redis.Redis | None = None):
        self.redis = redis_client or redis.from_url(
            settings.redis_url or "redis://localhost:6379", decode_responses=True
        )

        # Rate limit settings
        self.MESSAGE_LIMIT = 30  # messages per window
        self.WINDOW_SIZE = 60  # seconds

    async def check_rate_limit(self, user_id: uuid.UUID) -> tuple[bool, int | None]:
        """
        Check if user is within rate limits using sliding window.
        Returns (allowed, retry_after_seconds).
        """
        key = f"rate_limit:messages:{user_id}"
        now = time.time()
        window_start = now - self.WINDOW_SIZE

        async with self.redis.pipeline() as pipe:
            # Remove old entries outside the window
            pipe.zremrangebyscore(key, 0, window_start)

            # Count current entries in window
            pipe.zcard(key)

            # Add current timestamp
            pipe.zadd(key, {str(now): now})

            # Set expiration for cleanup
            pipe.expire(key, self.WINDOW_SIZE + 1)

            results = await pipe.execute()
            current_count = results[1]

        # Check if limit exceeded
        if current_count >= self.MESSAGE_LIMIT:
            # Get oldest entry in window to calculate retry time
            oldest_entries = await self.redis.zrange(key, 0, 0, withscores=True)
            if oldest_entries:
                oldest_time = oldest_entries[0][1]
                retry_after = int(oldest_time + self.WINDOW_SIZE - now)
                return False, retry_after
            return False, self.WINDOW_SIZE

        return True, None

    async def get_current_usage(self, user_id: uuid.UUID) -> tuple[int, int]:
        """Get current usage count and remaining quota."""
        key = f"rate_limit:messages:{user_id}"
        now = time.time()
        window_start = now - self.WINDOW_SIZE

        # Clean up old entries and count current
        async with self.redis.pipeline() as pipe:
            pipe.zremrangebyscore(key, 0, window_start)
            pipe.zcard(key)
            results = await pipe.execute()
            current_count = results[1]

        remaining = max(0, self.MESSAGE_LIMIT - current_count)
        return current_count, remaining

    async def close(self):
        """Close Redis connection."""
        await self.redis.close()


# Global rate limiter instance
rate_limiter = RateLimitService()
