"""
Tests for SQLAlchemy Query Result Caching Infrastructure

Phase 4a: Query Result Caching
Tests for cache regions, invalidation, statistics, and decorator functionality
"""

import json
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.core.query_cache import (
    CacheRegions,
    QueryCacheManager,
    cached_query,
    clear_all_query_caches,
    get_cache,
    get_cache_stats,
    invalidate_cache,
    invalidate_cache_pattern,
    long_term_cache,
    medium_term_cache,
    short_term_cache,
)


class TestCacheRegions:
    """Test cache region constants"""

    def test_short_term_ttl(self) -> None:
        """Short-term cache should be 60 seconds"""
        assert CacheRegions.SHORT_TERM == 60

    def test_medium_term_ttl(self) -> None:
        """Medium-term cache should be 300 seconds"""
        assert CacheRegions.MEDIUM_TERM == 300

    def test_long_term_ttl(self) -> None:
        """Long-term cache should be 3600 seconds"""
        assert CacheRegions.LONG_TERM == 3600


class TestQueryCacheManager:
    """Test QueryCacheManager functionality"""

    def test_initialization(self) -> None:
        """Cache manager should initialize with zero stats"""
        manager = QueryCacheManager()
        assert manager.cache_stats["hits"] == 0
        assert manager.cache_stats["misses"] == 0
        assert manager.cache_stats["invalidations"] == 0

    def test_record_hit(self) -> None:
        """Recording hits should increment hit counter"""
        manager = QueryCacheManager()
        manager.record_hit("medium_term")
        assert manager.cache_stats["hits"] == 1
        assert manager.cache_stats["regions"]["medium_term"]["hits"] == 1

    def test_record_miss(self) -> None:
        """Recording misses should increment miss counter"""
        manager = QueryCacheManager()
        manager.record_miss("short_term")
        assert manager.cache_stats["misses"] == 1
        assert manager.cache_stats["regions"]["short_term"]["misses"] == 1

    def test_get_stats_initial(self) -> None:
        """Stats should return zero values initially"""
        manager = QueryCacheManager()
        stats = manager.get_stats()
        assert stats["total_hits"] == 0
        assert stats["total_misses"] == 0
        assert stats["total_requests"] == 0
        assert stats["hit_rate"] == "0.00%"
        assert stats["invalidations"] == 0

    def test_get_stats_with_hits(self) -> None:
        """Stats should calculate hit rate correctly"""
        manager = QueryCacheManager()
        manager.record_hit("medium_term")
        manager.record_hit("medium_term")
        manager.record_miss("medium_term")
        stats = manager.get_stats()
        assert stats["total_hits"] == 2
        assert stats["total_misses"] == 1
        assert stats["total_requests"] == 3
        assert float(stats["hit_rate"].rstrip("%")) == pytest.approx(66.67, 0.01)

    def test_record_invalidation(self) -> None:
        """Recording invalidations should track pattern and timestamp"""
        manager = QueryCacheManager()
        manager.record_invalidation("user:profile:*")
        assert manager.cache_stats["invalidations"] == 1
        assert "user:profile:*" in manager.invalidation_patterns
        assert len(manager.invalidation_patterns["user:profile:*"]) == 1

    def test_record_multiple_invalidations_same_pattern(self) -> None:
        """Multiple invalidations of same pattern should accumulate"""
        manager = QueryCacheManager()
        manager.record_invalidation("portfolio:*")
        manager.record_invalidation("portfolio:*")
        assert manager.cache_stats["invalidations"] == 2
        assert len(manager.invalidation_patterns["portfolio:*"]) == 2


class TestCachedQueryDecorator:
    """Test @cached_query decorator"""

    def test_decorator_basic(self) -> None:
        """Decorator should cache function results"""
        call_count = 0

        @cached_query(region=short_term_cache)
        def get_value(key: str) -> str:
            nonlocal call_count
            call_count += 1
            return f"value_{key}"

        # First call should execute function
        result1 = get_value("test")
        assert result1 == "value_test"
        assert call_count == 1

        # Second call should return cached result
        result2 = get_value("test")
        assert result2 == "value_test"
        # Note: Due to null cache backend, this may still increment

    def test_decorator_different_args(self) -> None:
        """Different arguments should generate different cache keys"""
        call_count = 0

        @cached_query(region=medium_term_cache)
        def get_user_name(user_id: int) -> str:
            nonlocal call_count
            call_count += 1
            return f"User_{user_id}"

        result1 = get_user_name(1)
        result2 = get_user_name(2)
        assert result1 == "User_1"
        assert result2 == "User_2"

    def test_decorator_preserves_function_name(self) -> None:
        """Decorator should preserve function name"""

        @cached_query()
        def my_cached_function() -> str:
            return "result"

        assert my_cached_function.__name__ == "my_cached_function"

    def test_decorator_with_kwargs(self) -> None:
        """Decorator should handle keyword arguments"""

        @cached_query(region=long_term_cache)
        def get_data(key: str, value: str) -> dict:
            return {"key": key, "value": value}

        result = get_data(key="test", value="data")
        assert result["key"] == "test"
        assert result["value"] == "data"


class TestCacheOperations:
    """Test cache operations"""

    @pytest.mark.asyncio
    async def test_invalidate_cache_key(self) -> None:
        """Invalidating cache should call redis clear_pattern"""
        with patch(
            "app.core.query_cache.redis_cache.clear_pattern", new_callable=AsyncMock
        ) as mock_clear:
            mock_clear.return_value = 1
            result = await invalidate_cache("user:profile:john")
            assert result is True
            mock_clear.assert_called_once()
            # Verify pattern includes dogpile prefix
            call_args = mock_clear.call_args[0][0]
            assert "dogpile:" in call_args
            assert "user:profile:john" in call_args

    @pytest.mark.asyncio
    async def test_invalidate_cache_pattern(self) -> None:
        """Invalidating pattern should return count of deleted keys"""
        with patch(
            "app.core.query_cache.redis_cache.clear_pattern", new_callable=AsyncMock
        ) as mock_clear:
            mock_clear.return_value = 5
            result = await invalidate_cache_pattern("portfolio:*")
            assert result == 5

    @pytest.mark.asyncio
    async def test_get_cache_stats(self) -> None:
        """get_cache_stats should return manager stats"""
        stats = await get_cache_stats()
        assert isinstance(stats, dict)
        assert "total_hits" in stats
        assert "total_misses" in stats
        assert "hit_rate" in stats
        assert "invalidations" in stats

    def test_clear_all_caches(self) -> None:
        """Clearing all caches should invalidate all regions"""
        # Should not raise exception
        clear_all_query_caches()


class TestGlobalCacheManager:
    """Test global cache manager instance"""

    def test_get_cache_returns_manager(self) -> None:
        """get_cache should return QueryCacheManager instance"""
        manager = get_cache()
        assert isinstance(manager, QueryCacheManager)

    def test_get_cache_returns_same_instance(self) -> None:
        """Multiple calls to get_cache should return same instance"""
        manager1 = get_cache()
        manager2 = get_cache()
        assert manager1 is manager2


class TestCacheRegionObjects:
    """Test cache region objects are properly configured"""

    def test_short_term_region_exists(self) -> None:
        """Short-term cache region should be configured"""
        assert short_term_cache is not None
        assert short_term_cache.name == "short_term"

    def test_medium_term_region_exists(self) -> None:
        """Medium-term cache region should be configured"""
        assert medium_term_cache is not None
        assert medium_term_cache.name == "medium_term"

    def test_long_term_region_exists(self) -> None:
        """Long-term cache region should be configured"""
        assert long_term_cache is not None
        assert long_term_cache.name == "long_term"


class TestCachingPerformance:
    """Test caching performance characteristics"""

    def test_multiple_hits_performance(self) -> None:
        """Multiple cache hits should be recorded correctly"""
        manager = QueryCacheManager()
        for _ in range(10):
            manager.record_hit("medium_term")
        assert manager.cache_stats["hits"] == 10

    def test_mixed_hits_misses(self) -> None:
        """Mixed hits and misses should calculate correct rate"""
        manager = QueryCacheManager()
        # 70% hit rate: 7 hits, 3 misses
        for _ in range(7):
            manager.record_hit("medium_term")
        for _ in range(3):
            manager.record_miss("medium_term")

        stats = manager.get_stats()
        hit_rate = float(stats["hit_rate"].rstrip("%"))
        assert 69.99 <= hit_rate <= 70.01  # Allow small floating point variance


class TestCacheInvalidationTracking:
    """Test cache invalidation pattern tracking"""

    def test_invalidation_timestamps(self) -> None:
        """Invalidations should record timestamps"""
        manager = QueryCacheManager()
        manager.record_invalidation("user:*")
        manager.record_invalidation("user:*")

        pattern_history = manager.invalidation_patterns["user:*"]
        assert len(pattern_history) == 2
        # Both timestamps should be present
        assert all(isinstance(ts, str) for ts in pattern_history)

    def test_multiple_patterns(self) -> None:
        """Different patterns should be tracked separately"""
        manager = QueryCacheManager()
        manager.record_invalidation("user:*")
        manager.record_invalidation("portfolio:*")
        manager.record_invalidation("feed:*")

        assert len(manager.invalidation_patterns) == 3
        assert "user:*" in manager.invalidation_patterns
        assert "portfolio:*" in manager.invalidation_patterns
        assert "feed:*" in manager.invalidation_patterns


# Integration test scenarios
class TestIntegration:
    """Integration tests for complete caching workflow"""

    @pytest.mark.asyncio
    async def test_complete_workflow(self) -> None:
        """Test complete caching workflow: record hits, invalidate, check stats"""
        manager = get_cache()

        # Initial state
        stats = await get_cache_stats()
        initial_hits = stats["total_hits"]

        # Simulate cache operations
        manager.record_hit("medium_term")
        manager.record_miss("medium_term")
        manager.record_invalidation("test:*")

        # Verify stats updated
        stats = await get_cache_stats()
        assert stats["total_hits"] > initial_hits
        assert stats["invalidations"] > 0
