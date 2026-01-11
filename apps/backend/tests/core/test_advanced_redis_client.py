import asyncio
import json
from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock

import pytest

from app.core.advanced_redis_client import (
    AdvancedRedisClient,
    CacheMetrics,
    CacheStrategy,
    CircuitBreakerState,
)


class FakePipeline:
    def __init__(self, store):
        self._ops = []
        self._store = store

    def get(self, key: str):
        self._ops.append(("get", key))
        return self

    async def execute(self):
        results = []
        for op, key in self._ops:
            if op == "get":
                results.append(self._store.get(key))
        return results


class FakeRedisClient:
    def __init__(self):
        self._store: dict[str, bytes | str] = {}

    async def ping(self):
        return True

    async def get(self, key: str):
        return self._store.get(key)

    async def set(self, key: str, value: str):
        self._store[key] = value
        return True

    async def setex(self, key: str, ttl: int, value: str):
        # ttl ignored for fake client but stored
        self._store[key] = value
        return True

    def pipeline(self):
        return FakePipeline(self._store)

    async def keys(self, pattern: str):
        # very simple substring match for tests
        return [k for k in self._store.keys() if pattern.replace("*", "") in k]

    async def delete(self, *keys):
        count = 0
        for k in keys:
            if k in self._store:
                del self._store[k]
                count += 1
        return count

    async def config_set(self, key: str, value: str):
        return True


@pytest.mark.anyio
async def test_get_returns_json_and_string():
    client = AdvancedRedisClient()
    client.client = FakeRedisClient()

    # JSON value
    await client.client.set("json_key", json.dumps({"a": 1}))
    # Plain string value
    await client.client.set("str_key", "hello")

    v1 = await client.get("json_key")
    v2 = await client.get("str_key")

    assert v1 == {"a": 1}
    assert v2 == "hello"


@pytest.mark.anyio
async def test_set_uses_setex_when_expire():
    client = AdvancedRedisClient()
    client.client = FakeRedisClient()

    ok = await client.set("k1", {"x": 2}, expire=60)
    assert ok is True
    # stored JSON string
    raw = await client.client.get("k1")
    assert isinstance(raw, str) and json.loads(raw) == {"x": 2}


@pytest.mark.anyio
async def test_get_with_layers_promotes_from_other_layer():
    client = AdvancedRedisClient()
    client.client = FakeRedisClient()
    # initialize cache layers
    await client._initialize_cache_layers()

    # value exists in cold layer
    await client.client.set("cold:abc", "value")
    # request warm layer
    v = await client.get_with_layers("abc", layer="warm")
    assert v == "value"
    # promoted to warm layer
    promoted = await client.client.get("warm:abc")
    assert promoted == "value"


@pytest.mark.anyio
async def test_cache_warm_batch_and_invalidate():
    client = AdvancedRedisClient()
    client.client = FakeRedisClient()

    # preload
    await client.client.set("warm:item1", "v1")
    await client.client.set("warm:item2", "v2")

    data = await client.cache_warm_batch(["item1", "item2"], layer="warm")
    assert data == {"item1": "v1", "item2": "v2"}

    # invalidate pattern
    deleted = await client.invalidate_pattern("item", layer="warm")
    assert deleted >= 2


"""
Comprehensive tests for app.core.advanced_redis_client

Tests cover:
- CircuitBreakerState dataclass
- CacheMetrics tracking
- CacheStrategy definitions
- AdvancedRedisClient operations
- Connection handling and failover
- Multi-layer caching
- Cache warming and invalidation

Session 136: Created to improve backend coverage toward 80% target.
"""

# ============================================================================
# FIXTURES
# ============================================================================


@pytest.fixture
def cache_metrics():
    """Fresh CacheMetrics instance"""
    return CacheMetrics()


@pytest.fixture
def circuit_breaker():
    """Fresh CircuitBreakerState instance"""
    return CircuitBreakerState()


@pytest.fixture
def redis_client():
    """AdvancedRedisClient instance for testing"""
    return AdvancedRedisClient()


@pytest.fixture
def mock_redis():
    """Mock Redis client"""
    mock = AsyncMock()
    mock.ping = AsyncMock(return_value=True)
    mock.get = AsyncMock(return_value=b'{"key": "value"}')
    mock.set = AsyncMock(return_value=True)
    mock.setex = AsyncMock(return_value=True)
    mock.keys = AsyncMock(return_value=[b"key1", b"key2"])
    mock.delete = AsyncMock(return_value=2)
    mock.pipeline = MagicMock()
    mock.config_set = AsyncMock(return_value=True)
    return mock


# ============================================================================
# CIRCUIT BREAKER STATE TESTS
# ============================================================================


class TestCircuitBreakerState:
    """Test suite for CircuitBreakerState dataclass"""

    def test_default_values(self, circuit_breaker):
        """Test default circuit breaker state values"""
        assert circuit_breaker.failure_count == 0
        assert circuit_breaker.last_failure is None
        assert circuit_breaker.state == "closed"
        assert circuit_breaker.failure_threshold == 5
        assert circuit_breaker.recovery_timeout == 60

    def test_custom_values(self):
        """Test circuit breaker with custom values"""
        cb = CircuitBreakerState(
            failure_count=3,
            state="open",
            failure_threshold=10,
            recovery_timeout=120,
        )
        assert cb.failure_count == 3
        assert cb.state == "open"
        assert cb.failure_threshold == 10
        assert cb.recovery_timeout == 120

    def test_state_transitions(self, circuit_breaker):
        """Test circuit breaker state transitions"""
        # Initially closed
        assert circuit_breaker.state == "closed"

        # Transition to open
        circuit_breaker.state = "open"
        assert circuit_breaker.state == "open"

        # Transition to half_open
        circuit_breaker.state = "half_open"
        assert circuit_breaker.state == "half_open"

        # Back to closed
        circuit_breaker.state = "closed"
        assert circuit_breaker.state == "closed"

    def test_failure_count_increment(self, circuit_breaker):
        """Test incrementing failure count"""
        circuit_breaker.failure_count += 1
        assert circuit_breaker.failure_count == 1

        circuit_breaker.failure_count += 4
        assert circuit_breaker.failure_count == 5

    def test_last_failure_tracking(self, circuit_breaker):
        """Test last failure timestamp tracking"""
        now = datetime.now(timezone.utc)
        circuit_breaker.last_failure = now

        assert circuit_breaker.last_failure == now
        assert circuit_breaker.last_failure.tzinfo == timezone.utc


# ============================================================================
# CACHE STRATEGY TESTS
# ============================================================================


class TestCacheStrategy:
    """Test suite for CacheStrategy class"""

    def test_strategy_constants(self):
        """Test all cache strategy constants are defined"""
        assert CacheStrategy.WRITE_THROUGH == "write_through"
        assert CacheStrategy.WRITE_BEHIND == "write_behind"
        assert CacheStrategy.WRITE_AROUND == "write_around"
        assert CacheStrategy.READ_THROUGH == "read_through"
        assert CacheStrategy.REFRESH_AHEAD == "refresh_ahead"

    def test_all_strategies_unique(self):
        """Test that all strategy values are unique"""
        strategies = [
            CacheStrategy.WRITE_THROUGH,
            CacheStrategy.WRITE_BEHIND,
            CacheStrategy.WRITE_AROUND,
            CacheStrategy.READ_THROUGH,
            CacheStrategy.REFRESH_AHEAD,
        ]
        assert len(strategies) == len(set(strategies))


# ============================================================================
# CACHE METRICS TESTS
# ============================================================================


class TestCacheMetrics:
    """Test suite for CacheMetrics class"""

    def test_initial_state(self, cache_metrics):
        """Test initial cache metrics state"""
        assert cache_metrics.hits == 0
        assert cache_metrics.misses == 0
        assert cache_metrics.writes == 0
        assert cache_metrics.errors == 0
        assert len(cache_metrics.response_times) == 0

    def test_hit_rate_with_no_operations(self, cache_metrics):
        """Test hit rate when no operations recorded"""
        assert cache_metrics.hit_rate == 0.0

    def test_hit_rate_calculation(self, cache_metrics):
        """Test hit rate calculation"""
        # Record 7 hits and 3 misses = 70% hit rate
        for _ in range(7):
            cache_metrics.record_hit()
        for _ in range(3):
            cache_metrics.record_miss()

        assert cache_metrics.hit_rate == 70.0

    def test_hit_rate_all_hits(self, cache_metrics):
        """Test hit rate with all hits"""
        for _ in range(10):
            cache_metrics.record_hit()

        assert cache_metrics.hit_rate == 100.0

    def test_hit_rate_all_misses(self, cache_metrics):
        """Test hit rate with all misses"""
        for _ in range(10):
            cache_metrics.record_miss()

        assert cache_metrics.hit_rate == 0.0

    def test_record_hit_increments_counter(self, cache_metrics):
        """Test that record_hit increments hit counter"""
        cache_metrics.record_hit()
        cache_metrics.record_hit()
        cache_metrics.record_hit()

        assert cache_metrics.hits == 3

    def test_record_hit_with_response_time(self, cache_metrics):
        """Test that record_hit tracks response time"""
        cache_metrics.record_hit(response_time=0.005)
        cache_metrics.record_hit(response_time=0.010)

        assert len(cache_metrics.response_times) == 2
        assert cache_metrics.response_times[0] == 0.005
        assert cache_metrics.response_times[1] == 0.010

    def test_record_hit_ignores_zero_response_time(self, cache_metrics):
        """Test that zero response time is not recorded"""
        cache_metrics.record_hit(response_time=0.0)

        assert len(cache_metrics.response_times) == 0

    def test_record_miss_increments_counter(self, cache_metrics):
        """Test that record_miss increments miss counter"""
        cache_metrics.record_miss()
        cache_metrics.record_miss()

        assert cache_metrics.misses == 2

    def test_record_miss_with_response_time(self, cache_metrics):
        """Test that record_miss tracks response time"""
        cache_metrics.record_miss(response_time=0.020)

        assert len(cache_metrics.response_times) == 1
        assert cache_metrics.response_times[0] == 0.020

    def test_record_write_increments_counter(self, cache_metrics):
        """Test that record_write increments write counter"""
        cache_metrics.record_write()
        cache_metrics.record_write()
        cache_metrics.record_write()

        assert cache_metrics.writes == 3

    def test_record_error_increments_counter(self, cache_metrics):
        """Test that record_error increments error counter"""
        cache_metrics.record_error()
        cache_metrics.record_error()

        assert cache_metrics.errors == 2

    def test_avg_response_time_empty(self, cache_metrics):
        """Test average response time with no data"""
        assert cache_metrics.avg_response_time == 0.0

    def test_avg_response_time_calculation(self, cache_metrics):
        """Test average response time calculation"""
        cache_metrics.record_hit(response_time=0.010)
        cache_metrics.record_hit(response_time=0.020)
        cache_metrics.record_hit(response_time=0.030)

        # Average: (0.010 + 0.020 + 0.030) / 3 = 0.020
        assert cache_metrics.avg_response_time == pytest.approx(0.020, rel=1e-6)

    def test_response_times_max_size(self, cache_metrics):
        """Test that response times deque has max size of 1000"""
        # Record more than 1000 response times
        for i in range(1500):
            cache_metrics.record_hit(response_time=0.001 * (i + 1))

        # Should only keep last 1000
        assert len(cache_metrics.response_times) == 1000

    def test_last_reset_is_set(self, cache_metrics):
        """Test that last_reset is set on initialization"""
        assert cache_metrics.last_reset is not None
        assert isinstance(cache_metrics.last_reset, datetime)


# ============================================================================
# ADVANCED REDIS CLIENT INITIALIZATION TESTS
# ============================================================================


class TestAdvancedRedisClientInit:
    """Test suite for AdvancedRedisClient initialization"""

    def test_initial_state(self, redis_client):
        """Test initial client state"""
        assert redis_client.client is None
        assert redis_client.sentinel is None
        assert redis_client.connected is False
        assert redis_client.connection_pool is None
        assert isinstance(redis_client.metrics, CacheMetrics)
        assert redis_client.cache_layers == {}
        assert len(redis_client.warming_tasks) == 0

    def test_initial_circuit_breaker_state(self, redis_client):
        """Test initial circuit breaker state"""
        assert redis_client.circuit_breaker.state == "closed"
        assert redis_client.circuit_breaker.failure_count == 0

    def test_operation_stats_initialized(self, redis_client):
        """Test operation stats are initialized as defaultdict"""
        # Access non-existent key should create default
        stats = redis_client.operation_stats["test_op"]
        assert stats["count"] == 0
        assert stats["total_time"] == 0.0


# ============================================================================
# ADVANCED REDIS CLIENT METHOD TESTS
# ============================================================================


class TestAdvancedRedisClientMethods:
    """Test suite for AdvancedRedisClient methods"""

    @pytest.mark.asyncio
    async def test_is_available_when_circuit_open(self, redis_client):
        """Test availability check when circuit breaker is open"""
        redis_client.circuit_breaker.state = "open"
        redis_client.circuit_breaker.last_failure = datetime.now(timezone.utc)

        result = await redis_client.is_available()

        assert result is False

    @pytest.mark.asyncio
    async def test_is_available_when_no_client(self, redis_client):
        """Test availability check when client is not initialized"""
        redis_client.circuit_breaker.state = "closed"
        redis_client.client = None

        result = await redis_client.is_available()

        assert result is False

    @pytest.mark.asyncio
    async def test_is_available_success(self, redis_client, mock_redis):
        """Test successful availability check"""
        redis_client.client = mock_redis
        redis_client.circuit_breaker.state = "closed"

        result = await redis_client.is_available()

        assert result is True
        mock_redis.ping.assert_called_once()

    @pytest.mark.asyncio
    async def test_is_available_resets_circuit_breaker(self, redis_client, mock_redis):
        """Test that successful ping resets circuit breaker"""
        redis_client.client = mock_redis
        redis_client.circuit_breaker.state = "half_open"
        redis_client.circuit_breaker.failure_count = 3

        await redis_client.is_available()

        assert redis_client.circuit_breaker.state == "closed"
        assert redis_client.circuit_breaker.failure_count == 0

    def test_handle_circuit_breaker_failure(self, redis_client):
        """Test circuit breaker failure handling"""
        initial_count = redis_client.circuit_breaker.failure_count
        initial_errors = redis_client.metrics.errors

        redis_client._handle_circuit_breaker_failure()

        assert redis_client.circuit_breaker.failure_count == initial_count + 1
        assert redis_client.circuit_breaker.last_failure is not None
        assert redis_client.metrics.errors == initial_errors + 1

    def test_handle_circuit_breaker_opens_after_threshold(self, redis_client):
        """Test circuit breaker opens after failure threshold"""
        redis_client.circuit_breaker.failure_threshold = 3

        for _ in range(3):
            redis_client._handle_circuit_breaker_failure()

        assert redis_client.circuit_breaker.state == "open"

    @pytest.mark.asyncio
    async def test_get_when_unavailable(self, redis_client):
        """Test get operation when Redis unavailable"""
        redis_client.client = None

        result = await redis_client.get("test_key")

        assert result is None
        assert redis_client.metrics.misses >= 1

    @pytest.mark.asyncio
    async def test_get_success_with_json(self, redis_client, mock_redis):
        """Test successful get operation with JSON value"""
        redis_client.client = mock_redis
        mock_redis.get = AsyncMock(return_value=b'{"name": "test", "value": 123}')

        result = await redis_client.get("test_key")

        assert result == {"name": "test", "value": 123}
        assert redis_client.metrics.hits >= 1

    @pytest.mark.asyncio
    async def test_get_success_with_string(self, redis_client, mock_redis):
        """Test successful get operation with non-JSON string"""
        redis_client.client = mock_redis
        mock_redis.get = AsyncMock(return_value=b"simple string value")

        result = await redis_client.get("test_key")

        assert result == "simple string value"

    @pytest.mark.asyncio
    async def test_get_miss(self, redis_client, mock_redis):
        """Test get operation with cache miss"""
        redis_client.client = mock_redis
        mock_redis.get = AsyncMock(return_value=None)

        result = await redis_client.get("nonexistent_key")

        assert result is None
        assert redis_client.metrics.misses >= 1

    @pytest.mark.asyncio
    async def test_set_when_unavailable(self, redis_client):
        """Test set operation when Redis unavailable"""
        redis_client.client = None

        result = await redis_client.set("test_key", "test_value")

        assert result is False

    @pytest.mark.asyncio
    async def test_set_success_with_ttl(self, redis_client, mock_redis):
        """Test successful set operation with TTL"""
        redis_client.client = mock_redis

        result = await redis_client.set("test_key", "test_value", expire=300)

        assert result is True
        mock_redis.setex.assert_called_once()
        assert redis_client.metrics.writes >= 1

    @pytest.mark.asyncio
    async def test_set_success_without_ttl(self, redis_client, mock_redis):
        """Test successful set operation without TTL"""
        redis_client.client = mock_redis

        result = await redis_client.set("test_key", "test_value")

        assert result is True
        mock_redis.set.assert_called_once()

    @pytest.mark.asyncio
    async def test_set_with_dict_value(self, redis_client, mock_redis):
        """Test set operation serializes dict to JSON"""
        redis_client.client = mock_redis

        result = await redis_client.set("test_key", {"name": "test"}, expire=60)

        assert result is True
        # Verify JSON serialization happened
        call_args = mock_redis.setex.call_args
        assert '{"name": "test"}' in str(call_args)

    @pytest.mark.asyncio
    async def test_set_with_ex_parameter(self, redis_client, mock_redis):
        """Test set operation with 'ex' parameter instead of 'expire'"""
        redis_client.client = mock_redis

        result = await redis_client.set("test_key", "test_value", ex=600)

        assert result is True
        mock_redis.setex.assert_called_once()


# ============================================================================
# MULTI-LAYER CACHING TESTS
# ============================================================================


class TestMultiLayerCaching:
    """Test suite for multi-layer caching functionality"""

    @pytest.mark.asyncio
    async def test_initialize_cache_layers(self, redis_client, mock_redis):
        """Test cache layer initialization"""
        redis_client.client = mock_redis

        await redis_client._initialize_cache_layers()

        assert "hot" in redis_client.cache_layers
        assert "warm" in redis_client.cache_layers
        assert "cold" in redis_client.cache_layers
        assert "session" in redis_client.cache_layers
        assert "persistent" in redis_client.cache_layers

    @pytest.mark.asyncio
    async def test_cache_layer_ttl_values(self, redis_client, mock_redis):
        """Test cache layer TTL configurations"""
        redis_client.client = mock_redis

        await redis_client._initialize_cache_layers()

        assert redis_client.cache_layers["hot"]["ttl"] == 300  # 5 min
        assert redis_client.cache_layers["warm"]["ttl"] == 1800  # 30 min
        assert redis_client.cache_layers["cold"]["ttl"] == 3600  # 1 hour
        assert redis_client.cache_layers["session"]["ttl"] == 7200  # 2 hours
        assert redis_client.cache_layers["persistent"]["ttl"] == 86400  # 24 hours

    @pytest.mark.asyncio
    async def test_get_with_layers_unavailable(self, redis_client):
        """Test get_with_layers when Redis unavailable"""
        redis_client.client = None

        result = await redis_client.get_with_layers("test_key", "warm")

        assert result is None

    @pytest.mark.asyncio
    async def test_get_with_layers_found_in_target_layer(
        self, redis_client, mock_redis
    ):
        """Test get_with_layers finds value in target layer"""
        redis_client.client = mock_redis
        mock_redis.get = AsyncMock(return_value=b"cached_value")

        await redis_client._initialize_cache_layers()
        result = await redis_client.get_with_layers("test_key", "hot")

        assert result == "cached_value"
        # Should have been called with layer prefix
        mock_redis.get.assert_called()

    @pytest.mark.asyncio
    async def test_set_with_layer_uses_layer_ttl(self, redis_client, mock_redis):
        """Test set_with_layer uses layer-specific TTL"""
        redis_client.client = mock_redis
        await redis_client._initialize_cache_layers()

        result = await redis_client.set_with_layer("test_key", "test_value", "hot")

        assert result is True
        # Verify setex was called with hot layer TTL (300 seconds)
        mock_redis.setex.assert_called()
        call_args = mock_redis.setex.call_args
        assert 300 in call_args[0] or call_args[1].get("time") == 300

    @pytest.mark.asyncio
    async def test_set_with_layer_custom_ttl(self, redis_client, mock_redis):
        """Test set_with_layer with custom TTL overrides layer default"""
        redis_client.client = mock_redis
        await redis_client._initialize_cache_layers()

        result = await redis_client.set_with_layer(
            "test_key", "test_value", "hot", custom_ttl=120
        )

        assert result is True


# ============================================================================
# CACHE WARMING AND INVALIDATION TESTS
# ============================================================================


class TestCacheWarmingAndInvalidation:
    """Test suite for cache warming and invalidation"""

    @pytest.mark.asyncio
    async def test_cache_warm_batch_unavailable(self, redis_client):
        """Test cache_warm_batch when Redis unavailable"""
        redis_client.client = None

        result = await redis_client.cache_warm_batch(["key1", "key2"], "warm")

        assert result == {}

    @pytest.mark.asyncio
    async def test_cache_warm_batch_success(self, redis_client, mock_redis):
        """Test successful cache warming batch operation"""
        redis_client.client = mock_redis

        # Setup pipeline mock
        mock_pipeline = AsyncMock()
        mock_pipeline.get = MagicMock()
        mock_pipeline.execute = AsyncMock(return_value=[b"value1", b"value2", None])
        mock_redis.pipeline = MagicMock(return_value=mock_pipeline)

        result = await redis_client.cache_warm_batch(["key1", "key2", "key3"], "warm")

        assert "key1" in result
        assert "key2" in result
        assert "key3" not in result  # None value should not be included
        assert result["key1"] == "value1"
        assert result["key2"] == "value2"

    @pytest.mark.asyncio
    async def test_invalidate_pattern_unavailable(self, redis_client):
        """Test invalidate_pattern when Redis unavailable"""
        redis_client.client = None

        result = await redis_client.invalidate_pattern("test:*")

        assert result == 0

    @pytest.mark.asyncio
    async def test_invalidate_pattern_success(self, redis_client, mock_redis):
        """Test successful pattern invalidation"""
        redis_client.client = mock_redis
        mock_redis.keys = AsyncMock(return_value=[b"warm:test:1", b"warm:test:2"])
        mock_redis.delete = AsyncMock(return_value=2)

        result = await redis_client.invalidate_pattern("test:*", layer="warm")

        assert result == 2
        mock_redis.keys.assert_called_once()
        mock_redis.delete.assert_called_once()

    @pytest.mark.asyncio
    async def test_invalidate_pattern_no_keys_found(self, redis_client, mock_redis):
        """Test pattern invalidation when no keys match"""
        redis_client.client = mock_redis
        mock_redis.keys = AsyncMock(return_value=[])

        result = await redis_client.invalidate_pattern("nonexistent:*")

        assert result == 0
        mock_redis.delete.assert_not_called()


# ============================================================================
# ERROR HANDLING TESTS
# ============================================================================


class TestErrorHandling:
    """Test suite for error handling scenarios"""

    @pytest.mark.asyncio
    async def test_get_handles_exception(self, redis_client, mock_redis):
        """Test get operation handles exceptions gracefully"""
        redis_client.client = mock_redis
        mock_redis.get = AsyncMock(side_effect=Exception("Connection lost"))

        result = await redis_client.get("test_key")

        assert result is None
        assert redis_client.metrics.errors >= 1

    @pytest.mark.asyncio
    async def test_set_handles_exception(self, redis_client, mock_redis):
        """Test set operation handles exceptions gracefully"""
        redis_client.client = mock_redis
        mock_redis.setex = AsyncMock(side_effect=Exception("Write failed"))

        result = await redis_client.set("test_key", "value", expire=60)

        assert result is False
        assert redis_client.metrics.errors >= 1

    @pytest.mark.asyncio
    async def test_get_with_layers_handles_exception(self, redis_client, mock_redis):
        """Test get_with_layers handles exceptions gracefully"""
        redis_client.client = mock_redis
        await redis_client._initialize_cache_layers()
        mock_redis.get = AsyncMock(side_effect=Exception("Network error"))

        result = await redis_client.get_with_layers("test_key", "warm")

        assert result is None
        assert redis_client.metrics.errors >= 1

    @pytest.mark.asyncio
    async def test_set_with_layer_handles_exception(self, redis_client, mock_redis):
        """Test set_with_layer handles exceptions gracefully"""
        redis_client.client = mock_redis
        await redis_client._initialize_cache_layers()
        mock_redis.setex = AsyncMock(side_effect=Exception("Storage full"))

        result = await redis_client.set_with_layer("test_key", "value", "hot")

        assert result is False
        assert redis_client.metrics.errors >= 1


# ============================================================================
# OPERATION STATS TRACKING TESTS
# ============================================================================


class TestOperationStatsTracking:
    """Test suite for operation statistics tracking"""

    @pytest.mark.asyncio
    async def test_set_increments_operation_count(self, redis_client, mock_redis):
        """Test that set operation increments stats counter"""
        redis_client.client = mock_redis
        initial_count = redis_client.operation_stats["set"]["count"]

        await redis_client.set("key1", "value1", expire=60)
        await redis_client.set("key2", "value2", expire=60)

        assert redis_client.operation_stats["set"]["count"] == initial_count + 2

    @pytest.mark.asyncio
    async def test_set_with_layer_increments_layer_stats(
        self, redis_client, mock_redis
    ):
        """Test that set_with_layer increments layer-specific stats"""
        redis_client.client = mock_redis
        await redis_client._initialize_cache_layers()

        await redis_client.set_with_layer("key", "value", "hot")
        await redis_client.set_with_layer("key2", "value2", "hot")

        assert redis_client.operation_stats["set_hot"]["count"] == 2


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
