# J6.2 Redis Client - Enhanced Caching and Pub/Sub
"""
Enhanced Redis client for J6.2 with improved error handling, connection pooling,
and notification caching capabilities.
"""

import json
import logging
from datetime import datetime
from typing import Any

import redis.asyncio as redis
from app.core.config import settings
from redis.asyncio import ConnectionPool
from redis.exceptions import ConnectionError as RedisConnectionError
from redis.exceptions import RedisError

logger = logging.getLogger(__name__)


class RedisClient:
    """Enhanced Redis client with connection pooling and error handling"""

    def __init__(self):
        self.pool: ConnectionPool | None = None
        self.client: redis.Redis | None = None
        self.connected = False
        self.connection_attempts = 0
        self.max_attempts = 3

    async def initialize(self) -> bool:
        """Initialize Redis connection with retry logic"""
        try:
            # Create connection pool
            self.pool = ConnectionPool.from_url(
                settings.redis_url,
                max_connections=20,
                retry_on_timeout=True,
                socket_keepalive=True,
                socket_keepalive_options={},
                health_check_interval=30,
            )

            self.client = redis.Redis(connection_pool=self.pool)

            # Test connection
            await self.client.ping()
            self.connected = True
            logger.info("✅ Redis connection established successfully")
            return True

        except (RedisConnectionError, RedisError) as e:
            self.connection_attempts += 1
            logger.warning(
                f"Redis connection failed (attempt {self.connection_attempts}/{self.max_attempts}): {e}"
            )

            if self.connection_attempts >= self.max_attempts:
                logger.info("Redis unavailable, running without caching")
                self.connected = False

            return False

    async def close(self):
        """Close Redis connections"""
        if self.client:
            await self.client.close()
        if self.pool:
            await self.pool.disconnect()
        self.connected = False

    async def is_available(self) -> bool:
        """Check if Redis is available"""
        if not self.connected or not self.client:
            return False

        try:
            await self.client.ping()
            return True
        except (RedisConnectionError, RedisError):
            self.connected = False
            return False

    # Basic Redis Operations
    async def set(self, key: str, value: str, ttl: int | None = None) -> bool:
        """Set a key-value pair with optional TTL"""
        if not await self.is_available() or not self.client:
            return False

        try:
            if ttl:
                await self.client.setex(key, ttl, value)
            else:
                await self.client.set(key, value)
            return True
        except Exception as e:
            logger.error(f"Redis SET failed: {e}")
            return False

    async def get(self, key: str) -> str | None:
        """Get value by key"""
        if not await self.is_available() or not self.client:
            return None

        try:
            result = await self.client.get(key)
            return result.decode("utf-8") if isinstance(result, bytes) else result
        except Exception as e:
            logger.error(f"Redis GET failed: {e}")
            return None

    # Notification Caching Methods
    async def cache_notification(
        self, notification_id: str, notification_data: dict[str, Any], ttl: int = 3600
    ) -> None:
        """Cache notification data"""
        if not await self.is_available() or not self.client:
            return

        try:
            await self.client.setex(
                f"notification:{notification_id}", ttl, json.dumps(notification_data, default=str)
            )
        except RedisError as e:
            logger.warning(f"Failed to cache notification {notification_id}: {e}")

    async def get_cached_notification(self, notification_id: str) -> dict[str, Any] | None:
        """Get cached notification data"""
        if not await self.is_available() or not self.client:
            return None

        try:
            data = await self.client.get(f"notification:{notification_id}")
            if data:
                decoded_data = data.decode("utf-8") if isinstance(data, bytes) else data
                return json.loads(decoded_data)
            return None
        except (RedisError, json.JSONDecodeError) as e:
            logger.warning(f"Failed to get cached notification {notification_id}: {e}")
            return None

    async def cache_unread_count(self, user_id: str, count: int, ttl: int = 300) -> None:
        """Cache user's unread notification count"""
        if not await self.is_available() or not self.client:
            return

        try:
            await self.client.setex(f"unread_count:{user_id}", ttl, count)
        except RedisError as e:
            logger.warning(f"Failed to cache unread count for {user_id}: {e}")

    async def get_cached_unread_count(self, user_id: str) -> int | None:
        """Get cached unread count"""
        if not await self.is_available() or not self.client:
            return None

        try:
            count = await self.client.get(f"unread_count:{user_id}")
            if count:
                decoded_count = count.decode("utf-8") if isinstance(count, bytes) else count
                return int(decoded_count)
            return None
        except (RedisError, ValueError) as e:
            logger.warning(f"Failed to get cached unread count for {user_id}: {e}")
            return None

    async def invalidate_user_cache(self, user_id: str) -> None:
        """Invalidate all cache for a user"""
        if not await self.is_available() or not self.client:
            return

        try:
            # Get all keys for this user
            keys = await self.client.keys(f"*:{user_id}")
            if keys:
                await self.client.delete(*keys)
        except RedisError as e:
            logger.warning(f"Failed to invalidate cache for {user_id}: {e}")

    # Pub/Sub Methods for Real-time Notifications
    async def publish_notification(self, user_id: str, notification_data: dict[str, Any]) -> None:
        """Publish notification to user's channel"""
        if not await self.is_available() or not self.client:
            return

        try:
            await self.client.publish(
                f"notifications:{user_id}", json.dumps(notification_data, default=str)
            )
        except RedisError as e:
            logger.warning(f"Failed to publish notification to {user_id}: {e}")

    async def subscribe_to_notifications(self, user_id: str):
        """Subscribe to user's notification channel"""
        if not await self.is_available() or not self.client:
            return None

        try:
            pubsub = self.client.pubsub()
            await pubsub.subscribe(f"notifications:{user_id}")
            return pubsub
        except RedisError as e:
            logger.warning(f"Failed to subscribe to notifications for {user_id}: {e}")
            return None

    # Rate Limiting Methods
    async def check_rate_limit(self, key: str, limit: int, window: int) -> bool:
        """Check if rate limit is exceeded"""
        if not await self.is_available() or not self.client:
            return True  # Allow if Redis unavailable

        try:
            current = await self.client.incr(key)
            if current == 1:
                await self.client.expire(key, window)
            return current <= limit
        except RedisError as e:
            logger.warning(f"Failed to check rate limit for {key}: {e}")
            return True  # Allow if error

    # Session Management
    async def store_websocket_session(
        self, user_id: str, connection_id: str, metadata: dict[str, Any]
    ) -> None:
        """Store WebSocket session data"""
        if not await self.is_available() or not self.client:
            return

        try:
            await self.client.hset(
                f"websocket_sessions:{user_id}", connection_id, json.dumps(metadata, default=str)
            )
        except RedisError as e:
            logger.warning(f"Failed to store WebSocket session for {user_id}: {e}")

    async def remove_websocket_session(self, user_id: str, connection_id: str) -> None:
        """Remove WebSocket session data"""
        if not await self.is_available() or not self.client:
            return

        try:
            await self.client.hdel(f"websocket_sessions:{user_id}", connection_id)
        except RedisError as e:
            logger.warning(f"Failed to remove WebSocket session for {user_id}: {e}")

    async def get_user_websocket_sessions(self, user_id: str) -> list[dict[str, Any]]:
        """Get all WebSocket sessions for a user"""
        if not await self.is_available() or not self.client:
            return []

        try:
            sessions = await self.client.hgetall(f"websocket_sessions:{user_id}")
            result: list[dict[str, Any]] = []
            for session_data in sessions.values():
                decoded = (
                    session_data.decode("utf-8")
                    if isinstance(session_data, bytes)
                    else session_data
                )
                result.append(json.loads(decoded))
            return result
        except (RedisError, json.JSONDecodeError) as e:
            logger.warning(f"Failed to get WebSocket sessions for {user_id}: {e}")
            return []

    async def add_websocket_session(
        self, user_id: str, session_id: str, metadata: dict[str, Any] | None = None
    ) -> None:
        """Add WebSocket session tracking"""
        if metadata is None:
            metadata = {"connected_at": datetime.now().isoformat()}

        if not await self.is_available() or not self.client:
            return

        try:
            await self.client.hset(
                f"websocket_sessions:{user_id}", session_id, json.dumps(metadata, default=str)
            )
        except RedisError as e:
            logger.warning(f"Failed to add WebSocket session for {user_id}: {e}")

    async def get_websocket_sessions(self, user_id: str) -> list[str]:
        """Get WebSocket session IDs for user"""
        if not await self.is_available() or not self.client:
            return []

        try:
            sessions = await self.client.hgetall(f"websocket_sessions:{user_id}")
            return [
                key.decode("utf-8") if isinstance(key, bytes) else key for key in sessions.keys()
            ]
        except RedisError as e:
            logger.warning(f"Failed to get WebSocket sessions for {user_id}: {e}")
            return []


# Global Redis client instance
redis_client = RedisClient()


async def initialize_redis() -> bool:
    """Initialize Redis connection"""
    return await redis_client.initialize()


async def close_redis():
    """Close Redis connection"""
    await redis_client.close()


# Utility functions
async def get_redis_info() -> dict[str, Any]:
    """Get Redis connection info"""
    return {
        "connected": redis_client.connected,
        "attempts": redis_client.connection_attempts,
        "available": await redis_client.is_available(),
    }
