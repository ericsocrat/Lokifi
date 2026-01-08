"""
Tests for app.core.redis_keys

Comprehensive tests for RedisKeyManager and utility functions.
"""

import pytest

from app.core.redis_keys import (
    RedisKeyManager,
    RedisKeyspace,
    get_api_cache_key,
    get_rate_limit_key,
    get_user_cache_key,
    redis_keys,
)

# ============================================================================
# FIXTURES
# ============================================================================


@pytest.fixture
def key_manager():
    """Create a test key manager instance."""
    return RedisKeyManager(app_prefix="test", environment="test")


@pytest.fixture
def prod_key_manager():
    """Create a production-like key manager instance."""
    return RedisKeyManager(app_prefix="lokifi", environment="prod")


# ============================================================================
# RedisKeyspace ENUM TESTS
# ============================================================================


class TestRedisKeyspace:
    """Test RedisKeyspace enum."""

    def test_keyspace_values(self):
        """Test all keyspace values exist and are strings."""
        assert RedisKeyspace.USERS.value == "users"
        assert RedisKeyspace.SESSIONS.value == "sessions"
        assert RedisKeyspace.AUTH.value == "auth"
        assert RedisKeyspace.WEBSOCKET.value == "ws"
        assert RedisKeyspace.NOTIFICATIONS.value == "notifications"
        assert RedisKeyspace.MESSAGES.value == "messages"
        assert RedisKeyspace.PRESENCE.value == "presence"
        assert RedisKeyspace.CACHE.value == "cache"
        assert RedisKeyspace.API_CACHE.value == "api"
        assert RedisKeyspace.DB_CACHE.value == "db"
        assert RedisKeyspace.RATE_LIMIT.value == "rate_limit"
        assert RedisKeyspace.THROTTLE.value == "throttle"
        assert RedisKeyspace.METRICS.value == "metrics"
        assert RedisKeyspace.ANALYTICS.value == "analytics"
        assert RedisKeyspace.PERFORMANCE.value == "perf"
        assert RedisKeyspace.TASKS.value == "tasks"
        assert RedisKeyspace.JOBS.value == "jobs"
        assert RedisKeyspace.SCHEDULER.value == "scheduler"

    def test_keyspace_is_string_enum(self):
        """Test keyspace inherits from str."""
        assert isinstance(RedisKeyspace.USERS, str)
        assert isinstance(RedisKeyspace.CACHE, str)

    def test_keyspace_count(self):
        """Test expected number of keyspaces."""
        assert len(RedisKeyspace) == 18


# ============================================================================
# RedisKeyManager INITIALIZATION TESTS
# ============================================================================


class TestRedisKeyManagerInit:
    """Test RedisKeyManager initialization."""

    def test_default_initialization(self, key_manager):
        """Test key manager with test configuration."""
        assert key_manager.app_prefix == "test"
        assert key_manager.environment == "test"
        assert key_manager.base_prefix == "test:test"

    def test_production_initialization(self, prod_key_manager):
        """Test key manager with production configuration."""
        assert prod_key_manager.app_prefix == "lokifi"
        assert prod_key_manager.environment == "prod"
        assert prod_key_manager.base_prefix == "lokifi:prod"

    def test_global_instance_exists(self):
        """Test global redis_keys instance is configured."""
        assert redis_keys is not None
        assert redis_keys.app_prefix == "lokifi"
        assert redis_keys.environment == "dev"


# ============================================================================
# KEY BUILDING TESTS
# ============================================================================


class TestKeyBuilding:
    """Test _build_key method."""

    def test_build_simple_key(self, key_manager):
        """Test building a simple key."""
        key = key_manager._build_key(RedisKeyspace.USERS, "profile")
        assert key == "test:test:users:profile"

    def test_build_key_with_multiple_components(self, key_manager):
        """Test building a key with multiple components."""
        key = key_manager._build_key(RedisKeyspace.CACHE, "users", "profile", "123")
        assert key == "test:test:cache:users:profile:123"

    def test_build_key_with_integer_component(self, key_manager):
        """Test building a key with integer component."""
        key = key_manager._build_key(RedisKeyspace.SESSIONS, "user", 12345)
        assert key == "test:test:sessions:user:12345"

    def test_build_key_sanitizes_colons(self, key_manager):
        """Test that colons in components are sanitized."""
        key = key_manager._build_key(RedisKeyspace.CACHE, "user:data")
        assert key == "test:test:cache:user_data"

    def test_build_key_sanitizes_spaces(self, key_manager):
        """Test that spaces in components are sanitized."""
        key = key_manager._build_key(RedisKeyspace.CACHE, "my data")
        assert key == "test:test:cache:my_data"

    def test_build_key_ignores_none_components(self, key_manager):
        """Test that None components are skipped."""
        key = key_manager._build_key(RedisKeyspace.CACHE, "users", None, "profile")
        assert key == "test:test:cache:users:profile"


class TestHashKey:
    """Test _hash_key method."""

    def test_hash_produces_16_chars(self, key_manager):
        """Test hash output is 16 characters."""
        hash_result = key_manager._hash_key("test-data")
        assert len(hash_result) == 16

    def test_hash_is_deterministic(self, key_manager):
        """Test same input produces same hash."""
        hash1 = key_manager._hash_key("identical-data")
        hash2 = key_manager._hash_key("identical-data")
        assert hash1 == hash2

    def test_hash_is_different_for_different_inputs(self, key_manager):
        """Test different inputs produce different hashes."""
        hash1 = key_manager._hash_key("data-one")
        hash2 = key_manager._hash_key("data-two")
        assert hash1 != hash2

    def test_hash_is_alphanumeric(self, key_manager):
        """Test hash contains only hex characters."""
        hash_result = key_manager._hash_key("test")
        assert all(c in "0123456789abcdef" for c in hash_result)


# ============================================================================
# USER KEY TESTS
# ============================================================================


class TestUserKeys:
    """Test user-related key generation."""

    def test_user_session_key_without_session_id(self, key_manager):
        """Test user session key without session ID."""
        key = key_manager.user_session_key("user123")
        assert key == "test:test:sessions:user:user123"

    def test_user_session_key_with_session_id(self, key_manager):
        """Test user session key with session ID."""
        key = key_manager.user_session_key("user123", "session456")
        assert key == "test:test:sessions:user:user123:session456"

    def test_user_profile_cache_key(self, key_manager):
        """Test user profile cache key."""
        key = key_manager.user_profile_cache_key("user123")
        assert key == "test:test:cache:users:profile:user123"

    def test_user_preferences_key(self, key_manager):
        """Test user preferences key."""
        key = key_manager.user_preferences_key("user123")
        assert key == "test:test:users:preferences:user123"


# ============================================================================
# AUTHENTICATION KEY TESTS
# ============================================================================


class TestAuthKeys:
    """Test authentication-related key generation."""

    def test_auth_token_key(self, key_manager):
        """Test auth token key."""
        key = key_manager.auth_token_key("abc123hash")
        assert key == "test:test:auth:tokens:abc123hash"

    def test_auth_reset_token_key(self, key_manager):
        """Test password reset token key."""
        key = key_manager.auth_reset_token_key("user123")
        assert key == "test:test:auth:reset:user123"

    def test_auth_login_attempts_key(self, key_manager):
        """Test login attempts key uses hashed identifier."""
        key = key_manager.auth_login_attempts_key("user@example.com")
        # Key should contain auth:attempts and a 16-char hash
        assert "test:test:auth:attempts:" in key
        parts = key.split(":")
        assert len(parts[-1]) == 16  # Hash length


# ============================================================================
# WEBSOCKET KEY TESTS
# ============================================================================


class TestWebSocketKeys:
    """Test WebSocket-related key generation."""

    def test_websocket_connection_key(self, key_manager):
        """Test WebSocket connection key."""
        key = key_manager.websocket_connection_key("conn123")
        assert key == "test:test:ws:connections:conn123"

    def test_websocket_user_connections_key(self, key_manager):
        """Test WebSocket user connections key."""
        key = key_manager.websocket_user_connections_key("user123")
        assert key == "test:test:ws:users:user123"

    def test_websocket_room_key(self, key_manager):
        """Test WebSocket room key."""
        key = key_manager.websocket_room_key("chat-room")
        assert key == "test:test:ws:rooms:chat-room"

    def test_websocket_typing_key(self, key_manager):
        """Test WebSocket typing indicator key."""
        key = key_manager.websocket_typing_key("conv123")
        assert key == "test:test:ws:typing:conv123"


# ============================================================================
# NOTIFICATION KEY TESTS
# ============================================================================


class TestNotificationKeys:
    """Test notification-related key generation."""

    def test_notification_queue_key(self, key_manager):
        """Test notification queue key."""
        key = key_manager.notification_queue_key("user123")
        assert key == "test:test:notifications:queue:user123"

    def test_notification_unread_count_key(self, key_manager):
        """Test unread notification count key."""
        key = key_manager.notification_unread_count_key("user123")
        assert key == "test:test:notifications:unread:user123"

    def test_notification_preferences_key(self, key_manager):
        """Test notification preferences key."""
        key = key_manager.notification_preferences_key("user123")
        assert key == "test:test:notifications:prefs:user123"


# ============================================================================
# MESSAGE KEY TESTS
# ============================================================================


class TestMessageKeys:
    """Test message-related key generation."""

    def test_message_cache_key(self, key_manager):
        """Test message cache key."""
        key = key_manager.message_cache_key("msg123")
        assert key == "test:test:cache:messages:msg123"

    def test_conversation_cache_key(self, key_manager):
        """Test conversation cache key."""
        key = key_manager.conversation_cache_key("conv123")
        assert key == "test:test:cache:conversations:conv123"

    def test_message_read_receipts_key(self, key_manager):
        """Test message read receipts key."""
        key = key_manager.message_read_receipts_key("msg123")
        assert key == "test:test:messages:receipts:msg123"


# ============================================================================
# PRESENCE KEY TESTS
# ============================================================================


class TestPresenceKeys:
    """Test presence-related key generation."""

    def test_user_presence_key(self, key_manager):
        """Test user presence key."""
        key = key_manager.user_presence_key("user123")
        assert key == "test:test:presence:users:user123"

    def test_presence_heartbeat_key(self, key_manager):
        """Test presence heartbeat key."""
        key = key_manager.presence_heartbeat_key("user123")
        assert key == "test:test:presence:heartbeat:user123"


# ============================================================================
# CACHING KEY TESTS
# ============================================================================


class TestCachingKeys:
    """Test caching-related key generation."""

    def test_api_cache_key(self, key_manager):
        """Test API cache key."""
        key = key_manager.api_cache_key("users_list", "abc123")
        assert key == "test:test:api:cache:users_list:abc123"

    def test_db_query_cache_key(self, key_manager):
        """Test database query cache key."""
        key = key_manager.db_query_cache_key("query_hash_123")
        assert key == "test:test:db:cache:query_hash_123"

    def test_system_stats_cache_key(self, key_manager):
        """Test system stats cache key."""
        key = key_manager.system_stats_cache_key()
        assert key == "test:test:cache:system:stats"


# ============================================================================
# RATE LIMITING KEY TESTS
# ============================================================================


class TestRateLimitingKeys:
    """Test rate limiting key generation."""

    def test_rate_limit_key(self, key_manager):
        """Test rate limit key uses hashed identifier."""
        key = key_manager.rate_limit_key("user123:action", "1h")
        assert "test:test:rate_limit:" in key
        assert ":1h" in key

    def test_api_throttle_key(self, key_manager):
        """Test API throttle key."""
        key = key_manager.api_throttle_key("user123", "get_users")
        assert key == "test:test:throttle:user123:get_users"


# ============================================================================
# METRICS AND ANALYTICS KEY TESTS
# ============================================================================


class TestMetricsKeys:
    """Test metrics and analytics key generation."""

    def test_metrics_counter_key(self, key_manager):
        """Test metrics counter key."""
        key = key_manager.metrics_counter_key("api_calls")
        assert key == "test:test:metrics:counters:api_calls"

    def test_metrics_histogram_key(self, key_manager):
        """Test metrics histogram key."""
        key = key_manager.metrics_histogram_key("response_time")
        assert key == "test:test:metrics:histograms:response_time"

    def test_analytics_event_key(self, key_manager):
        """Test analytics event key."""
        key = key_manager.analytics_event_key("page_view", "2026-01-08")
        assert key == "test:test:analytics:events:page_view:2026-01-08"

    def test_performance_metric_key(self, key_manager):
        """Test performance metric key."""
        key = key_manager.performance_metric_key("api", "latency")
        assert key == "test:test:perf:api:latency"


# ============================================================================
# BACKGROUND TASK KEY TESTS
# ============================================================================


class TestBackgroundTaskKeys:
    """Test background task key generation."""

    def test_task_queue_key_default(self, key_manager):
        """Test task queue key with default queue."""
        key = key_manager.task_queue_key()
        assert key == "test:test:tasks:queues:default"

    def test_task_queue_key_custom(self, key_manager):
        """Test task queue key with custom queue name."""
        key = key_manager.task_queue_key("high_priority")
        assert key == "test:test:tasks:queues:high_priority"

    def test_task_result_key(self, key_manager):
        """Test task result key."""
        key = key_manager.task_result_key("task123")
        assert key == "test:test:tasks:results:task123"

    def test_job_status_key(self, key_manager):
        """Test job status key."""
        key = key_manager.job_status_key("job456")
        assert key == "test:test:jobs:status:job456"

    def test_scheduler_lock_key(self, key_manager):
        """Test scheduler lock key."""
        key = key_manager.scheduler_lock_key("daily_cleanup")
        assert key == "test:test:scheduler:locks:daily_cleanup"


# ============================================================================
# UTILITY METHOD TESTS
# ============================================================================


class TestUtilityMethods:
    """Test utility methods."""

    def test_get_pattern(self, key_manager):
        """Test pattern generation for key scanning."""
        pattern = key_manager.get_pattern(RedisKeyspace.CACHE, "users:*")
        assert pattern == "test:test:cache:users_*"

    def test_get_pattern_default(self, key_manager):
        """Test pattern generation with default wildcard."""
        pattern = key_manager.get_pattern(RedisKeyspace.SESSIONS)
        assert pattern == "test:test:sessions:*"

    def test_parse_key_valid(self, key_manager):
        """Test parsing a valid key."""
        result = key_manager.parse_key("test:test:cache:users:profile:123")
        assert result["app_prefix"] == "test"
        assert result["environment"] == "test"
        assert result["keyspace"] == "cache"
        assert result["components"] == ["users", "profile", "123"]

    def test_parse_key_invalid_prefix(self, key_manager):
        """Test parsing key with wrong prefix."""
        result = key_manager.parse_key("wrong:prefix:cache:data")
        assert "error" in result
        assert "doesn't match app prefix" in result["error"]

    def test_parse_key_too_short(self, key_manager):
        """Test parsing key that's too short."""
        result = key_manager.parse_key("test:test")
        assert "error" in result
        assert "Invalid key structure" in result["error"]

    def test_parse_key_minimal(self, key_manager):
        """Test parsing minimal valid key."""
        result = key_manager.parse_key("test:test:cache")
        assert result["app_prefix"] == "test"
        assert result["environment"] == "test"
        assert result["keyspace"] == "cache"
        assert result["components"] == []


# ============================================================================
# CONVENIENCE FUNCTION TESTS
# ============================================================================


class TestConvenienceFunctions:
    """Test convenience/utility functions."""

    def test_get_user_cache_key(self):
        """Test get_user_cache_key function."""
        key = get_user_cache_key("user123", "settings")
        assert key == "lokifi:dev:cache:users:settings:user123"

    def test_get_api_cache_key_simple(self):
        """Test get_api_cache_key with simple params."""
        key = get_api_cache_key("users", page=1, limit=10)
        assert "lokifi:dev:api:cache:users:" in key
        # Should contain a hash
        parts = key.split(":")
        assert len(parts[-1]) == 16

    def test_get_api_cache_key_deterministic(self):
        """Test get_api_cache_key produces consistent results."""
        key1 = get_api_cache_key("users", page=1, limit=10)
        key2 = get_api_cache_key("users", limit=10, page=1)  # Different order
        assert key1 == key2  # Should be same due to sorted params

    def test_get_rate_limit_key(self):
        """Test get_rate_limit_key function."""
        key = get_rate_limit_key("user123", "create_post", "1h")
        assert "lokifi:dev:rate_limit:" in key
        assert ":1h" in key

    def test_get_rate_limit_key_default_window(self):
        """Test get_rate_limit_key with default window."""
        key = get_rate_limit_key("user123", "login")
        assert ":1h" in key  # Default window


# ============================================================================
# EDGE CASES
# ============================================================================


class TestEdgeCases:
    """Test edge cases and boundary conditions."""

    def test_empty_string_component(self, key_manager):
        """Test handling of empty string component."""
        key = key_manager._build_key(RedisKeyspace.CACHE, "")
        assert key == "test:test:cache:"

    def test_special_characters_in_component(self, key_manager):
        """Test handling of special characters."""
        key = key_manager._build_key(RedisKeyspace.CACHE, "user@email.com")
        assert "user@email.com" in key

    def test_very_long_component(self, key_manager):
        """Test handling of very long component."""
        long_string = "a" * 1000
        key = key_manager._build_key(RedisKeyspace.CACHE, long_string)
        assert long_string in key

    def test_unicode_in_component(self, key_manager):
        """Test handling of unicode characters."""
        key = key_manager._build_key(RedisKeyspace.CACHE, "用户数据")
        assert "用户数据" in key

    def test_numeric_only_component(self, key_manager):
        """Test handling of numeric-only component."""
        key = key_manager._build_key(RedisKeyspace.CACHE, 0)
        assert key == "test:test:cache:0"

    def test_boolean_component(self, key_manager):
        """Test handling of boolean component."""
        key = key_manager._build_key(RedisKeyspace.CACHE, True)
        assert key == "test:test:cache:True"
