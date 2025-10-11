"""
K2 - Centralized Redis Key Management for Lokifi Phase K
Provides consistent Redis key patterns and centralized management
"""

import hashlib
from enum import Enum
from typing import Any



class RedisKeyspace(str, Enum):
    """Redis keyspace prefixes for different domains"""
    
    # Core application data
    USERS = "users"
    SESSIONS = "sessions"
    AUTH = "auth"
    
    # Real-time features
    WEBSOCKET = "ws"
    NOTIFICATIONS = "notifications" 
    MESSAGES = "messages"
    PRESENCE = "presence"
    
    # Caching
    CACHE = "cache"
    API_CACHE = "api"
    DB_CACHE = "db"
    
    # Rate limiting
    RATE_LIMIT = "rate_limit"
    THROTTLE = "throttle"
    
    # Analytics and monitoring
    METRICS = "metrics"
    ANALYTICS = "analytics"
    PERFORMANCE = "perf"
    
    # Background tasks
    TASKS = "tasks"
    JOBS = "jobs"
    SCHEDULER = "scheduler"

class RedisKeyManager:
    """Centralized Redis key management with consistent patterns"""
    
    def __init__(self, app_prefix: str = "lokifi", environment: str = "dev"):
        self.app_prefix = app_prefix
        self.environment = environment
        self.base_prefix = f"{app_prefix}:{environment}"
    
    def _build_key(self, keyspace: RedisKeyspace, *components: str | int) -> str:
        """Build a Redis key with consistent structure"""
        parts = [self.base_prefix, keyspace.value]
        
        # Add components, converting to strings and sanitizing
        for component in components:
            if component is not None:
                sanitized = str(component).replace(":", "_").replace(" ", "_")
                parts.append(sanitized)
        
        return ":".join(parts)
    
    def _hash_key(self, data: str) -> str:
        """Create a hash for long or complex keys"""
        return hashlib.sha256(data.encode()).hexdigest()[:16]
    
    # User-related keys
    def user_session_key(self, user_id: str, session_id: str | None = None) -> str:
        """User session key: lokifi:dev:sessions:user:{user_id}[:session_id]"""
        if session_id:
            return self._build_key(RedisKeyspace.SESSIONS, "user", user_id, session_id)
        return self._build_key(RedisKeyspace.SESSIONS, "user", user_id)
    
    def user_profile_cache_key(self, user_id: str) -> str:
        """User profile cache: lokifi:dev:cache:users:profile:{user_id}"""
        return self._build_key(RedisKeyspace.CACHE, "users", "profile", user_id)
    
    def user_preferences_key(self, user_id: str) -> str:
        """User preferences: lokifi:dev:users:preferences:{user_id}"""
        return self._build_key(RedisKeyspace.USERS, "preferences", user_id)
    
    # Authentication keys
    def auth_token_key(self, token_hash: str) -> str:
        """Auth token blacklist: lokifi:dev:auth:tokens:{hash}"""
        return self._build_key(RedisKeyspace.AUTH, "tokens", token_hash)
    
    def auth_reset_token_key(self, user_id: str) -> str:
        """Password reset token: lokifi:dev:auth:reset:{user_id}"""
        return self._build_key(RedisKeyspace.AUTH, "reset", user_id)
    
    def auth_login_attempts_key(self, identifier: str) -> str:
        """Login attempts tracking: lokifi:dev:auth:attempts:{identifier}"""
        hashed_id = self._hash_key(identifier)
        return self._build_key(RedisKeyspace.AUTH, "attempts", hashed_id)
    
    # WebSocket keys
    def websocket_connection_key(self, connection_id: str) -> str:
        """WebSocket connection: lokifi:dev:ws:connections:{connection_id}"""
        return self._build_key(RedisKeyspace.WEBSOCKET, "connections", connection_id)
    
    def websocket_user_connections_key(self, user_id: str) -> str:
        """User's WebSocket connections: lokifi:dev:ws:users:{user_id}"""
        return self._build_key(RedisKeyspace.WEBSOCKET, "users", user_id)
    
    def websocket_room_key(self, room_name: str) -> str:
        """WebSocket room: lokifi:dev:ws:rooms:{room_name}"""
        return self._build_key(RedisKeyspace.WEBSOCKET, "rooms", room_name)
    
    def websocket_typing_key(self, conversation_id: str) -> str:
        """Typing indicators: lokifi:dev:ws:typing:{conversation_id}"""
        return self._build_key(RedisKeyspace.WEBSOCKET, "typing", conversation_id)
    
    # Notification keys
    def notification_queue_key(self, user_id: str) -> str:
        """User notification queue: lokifi:dev:notifications:queue:{user_id}"""
        return self._build_key(RedisKeyspace.NOTIFICATIONS, "queue", user_id)
    
    def notification_unread_count_key(self, user_id: str) -> str:
        """Unread notification count: lokifi:dev:notifications:unread:{user_id}"""
        return self._build_key(RedisKeyspace.NOTIFICATIONS, "unread", user_id)
    
    def notification_preferences_key(self, user_id: str) -> str:
        """Notification preferences: lokifi:dev:notifications:prefs:{user_id}"""
        return self._build_key(RedisKeyspace.NOTIFICATIONS, "prefs", user_id)
    
    # Message keys
    def message_cache_key(self, message_id: str) -> str:
        """Message cache: lokifi:dev:cache:messages:{message_id}"""
        return self._build_key(RedisKeyspace.CACHE, "messages", message_id)
    
    def conversation_cache_key(self, conversation_id: str) -> str:
        """Conversation cache: lokifi:dev:cache:conversations:{conversation_id}"""
        return self._build_key(RedisKeyspace.CACHE, "conversations", conversation_id)
    
    def message_read_receipts_key(self, message_id: str) -> str:
        """Message read receipts: lokifi:dev:messages:receipts:{message_id}"""
        return self._build_key(RedisKeyspace.MESSAGES, "receipts", message_id)
    
    # Presence keys
    def user_presence_key(self, user_id: str) -> str:
        """User presence status: lokifi:dev:presence:users:{user_id}"""
        return self._build_key(RedisKeyspace.PRESENCE, "users", user_id)
    
    def presence_heartbeat_key(self, user_id: str) -> str:
        """User presence heartbeat: lokifi:dev:presence:heartbeat:{user_id}"""
        return self._build_key(RedisKeyspace.PRESENCE, "heartbeat", user_id)
    
    # Caching keys
    def api_cache_key(self, endpoint: str, params_hash: str) -> str:
        """API response cache: lokifi:dev:api:cache:{endpoint}:{params_hash}"""
        return self._build_key(RedisKeyspace.API_CACHE, "cache", endpoint, params_hash)
    
    def db_query_cache_key(self, query_hash: str) -> str:
        """Database query cache: lokifi:dev:db:cache:{query_hash}"""
        return self._build_key(RedisKeyspace.DB_CACHE, "cache", query_hash)
    
    def system_stats_cache_key(self) -> str:
        """System statistics cache: lokifi:dev:cache:system:stats"""
        return self._build_key(RedisKeyspace.CACHE, "system", "stats")
    
    # Rate limiting keys
    def rate_limit_key(self, identifier: str, window: str) -> str:
        """Rate limiting: lokifi:dev:rate_limit:{identifier}:{window}"""
        hashed_id = self._hash_key(identifier)
        return self._build_key(RedisKeyspace.RATE_LIMIT, hashed_id, window)
    
    def api_throttle_key(self, user_id: str, endpoint: str) -> str:
        """API throttling: lokifi:dev:throttle:{user_id}:{endpoint}"""
        return self._build_key(RedisKeyspace.THROTTLE, user_id, endpoint)
    
    # Metrics and analytics keys
    def metrics_counter_key(self, metric_name: str) -> str:
        """Metrics counter: lokifi:dev:metrics:counters:{metric_name}"""
        return self._build_key(RedisKeyspace.METRICS, "counters", metric_name)
    
    def metrics_histogram_key(self, metric_name: str) -> str:
        """Metrics histogram: lokifi:dev:metrics:histograms:{metric_name}"""
        return self._build_key(RedisKeyspace.METRICS, "histograms", metric_name)
    
    def analytics_event_key(self, event_type: str, date: str) -> str:
        """Analytics events: lokifi:dev:analytics:events:{event_type}:{date}"""
        return self._build_key(RedisKeyspace.ANALYTICS, "events", event_type, date)
    
    def performance_metric_key(self, component: str, metric: str) -> str:
        """Performance metrics: lokifi:dev:perf:{component}:{metric}"""
        return self._build_key(RedisKeyspace.PERFORMANCE, component, metric)
    
    # Background task keys
    def task_queue_key(self, queue_name: str = "default") -> str:
        """Task queue: lokifi:dev:tasks:queues:{queue_name}"""
        return self._build_key(RedisKeyspace.TASKS, "queues", queue_name)
    
    def task_result_key(self, task_id: str) -> str:
        """Task result: lokifi:dev:tasks:results:{task_id}"""
        return self._build_key(RedisKeyspace.TASKS, "results", task_id)
    
    def job_status_key(self, job_id: str) -> str:
        """Job status: lokifi:dev:jobs:status:{job_id}"""
        return self._build_key(RedisKeyspace.JOBS, "status", job_id)
    
    def scheduler_lock_key(self, task_name: str) -> str:
        """Scheduler lock: lokifi:dev:scheduler:locks:{task_name}"""
        return self._build_key(RedisKeyspace.SCHEDULER, "locks", task_name)
    
    # Utility methods
    def get_pattern(self, keyspace: RedisKeyspace, pattern: str = "*") -> str:
        """Get pattern for key scanning: lokifi:dev:keyspace:pattern"""
        return self._build_key(keyspace, pattern)
    
    def parse_key(self, key: str) -> dict:
        """Parse a Redis key back into components"""
        if not key.startswith(self.base_prefix):
            return {"error": "Key doesn't match app prefix"}
        
        parts = key.split(":")
        if len(parts) < 3:
            return {"error": "Invalid key structure"}
        
        return {
            "app_prefix": parts[0],
            "environment": parts[1], 
            "keyspace": parts[2],
            "components": parts[3:] if len(parts) > 3 else []
        }

# Global key manager instance
redis_keys = RedisKeyManager(
    app_prefix="lokifi",
    environment="dev"  # This should come from config
)

# Convenience functions for common patterns
def get_user_cache_key(user_id: str, data_type: str) -> str:
    """Get user cache key for any data type"""
    return redis_keys._build_key(RedisKeyspace.CACHE, "users", data_type, user_id)

def get_api_cache_key(endpoint: str, **params: dict[str, Any]) -> str:
    """Get API cache key with parameter hashing"""
    params_str = "&".join(f"{k}={v}" for k, v in sorted(params.items()))
    params_hash = redis_keys._hash_key(params_str)
    return redis_keys.api_cache_key(endpoint, params_hash)

def get_rate_limit_key(user_id: str, action: str, window: str = "1h") -> str:
    """Get rate limit key for user action"""
    identifier = f"user:{user_id}:action:{action}"
    return redis_keys.rate_limit_key(identifier, window)

# Export the key manager and utility functions
__all__ = [
    "RedisKeyspace",
    "RedisKeyManager", 
    "redis_keys",
    "get_user_cache_key",
    "get_api_cache_key",
    "get_rate_limit_key"
]