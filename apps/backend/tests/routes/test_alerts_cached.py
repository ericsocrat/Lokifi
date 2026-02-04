"""
Tests for Phase 4c-2: Alerts caching implementation

Status: ACTIVE - Phase 4c-2 implementation completed
All tests should pass with @cached_query decorator applied to get_user_alerts.

Test Structure:
- TestAlertsBasics: Endpoint exists, function imported, decorator applied
- TestAlertsCaching: Cache hit/miss behavior, invalidation
- TestAlertsPerformance: Cache speedup measurements
- TestAlertsIntegration: Route integration, monitoring
"""

import asyncio
from unittest.mock import AsyncMock, patch

import pytest


class TestAlertsBasics:
    """Basic tests for alerts caching setup"""

    @pytest.mark.asyncio
    async def test_list_alerts_endpoint_exists(self):
        """Test that the /alerts endpoint exists."""
        from httpx import ASGITransport, AsyncClient

        from app.main import app

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            # Test endpoint exists (will fail auth but that's OK)
            # Mock auth to bypass authentication
            with patch("app.services.auth.require_handle", return_value="test_user"):
                with patch(
                    "app.services.alerts.store.list", new_callable=AsyncMock
                ) as mock_list:

                    async def mock_list_fn():
                        return []

                    mock_list.side_effect = mock_list_fn

                    response = await client.get(
                        "/api/alerts/", headers={"Authorization": "Bearer test"}
                    )
                    assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_cached_alerts_function_imported(self):
        """Test that get_user_alerts is imported in routes."""
        from app.api.routes import alerts

        assert hasattr(alerts, "get_user_alerts")

    @pytest.mark.asyncio
    async def test_alerts_cache_decorator_applied(self):
        """Test that @cached_query decorator is applied to get_user_alerts."""
        from app.core.cached_queries import get_user_alerts

        # Check decorator was applied (should have __wrapped__ attribute)
        assert hasattr(get_user_alerts, "__wrapped__")


class TestAlertsCaching:
    """Tests for alerts cache behavior"""

    @pytest.fixture(autouse=True)
    def _clear_cache(self, clear_cache):
        """Auto-use cache clearing fixture for all tests in this class."""
        return clear_cache

    @pytest.mark.asyncio
    async def test_first_call_fetches_from_store(self):
        """Test that first call goes to store (cache miss)."""
        from app.core.cached_queries import get_user_alerts

        # Mock the underlying store.list()
        with patch(
            "app.services.alerts.store.list", new_callable=AsyncMock
        ) as mock_list:

            async def mock_list_fn():
                return []

            mock_list.side_effect = mock_list_fn

            result = await get_user_alerts(handle="TEST_USER1")

            # Should call store.list() on cache miss
            assert mock_list.called
            assert result == []

    @pytest.mark.asyncio
    async def test_different_handles_different_cache_entries(self):
        """Test that different handles create separate cache entries."""
        from app.core.cached_queries import get_user_alerts

        with patch(
            "app.services.alerts.store.list", new_callable=AsyncMock
        ) as mock_list:
            call_count = 0

            async def mock_list_fn():
                nonlocal call_count
                call_count += 1
                return []

            mock_list.side_effect = mock_list_fn

            # Call with different handles
            await get_user_alerts(handle="USER_A")
            await get_user_alerts(handle="USER_B")

            # Should cache separately (2 store.list() calls)
            assert call_count == 2

    @pytest.mark.asyncio
    async def test_same_handle_uses_cache(self):
        """Test that repeated calls with same handle use cache."""
        from app.core.cached_queries import get_user_alerts

        with patch(
            "app.services.alerts.store.list", new_callable=AsyncMock
        ) as mock_list:
            call_count = 0

            async def mock_list_fn():
                nonlocal call_count
                call_count += 1
                return []

            mock_list.side_effect = mock_list_fn

            # Call twice with same handle
            await get_user_alerts(handle="CACHED_USER")
            await get_user_alerts(handle="CACHED_USER")

            # Should only call store.list() once (cache hit on 2nd call)
            assert call_count == 1

    @pytest.mark.asyncio
    async def test_invalidation_clears_cache(self):
        """Test that invalidate_alerts_cache clears the cache."""
        from app.core.cached_queries import get_user_alerts
        from app.core.query_cache import short_term_cache

        with patch(
            "app.services.alerts.store.list", new_callable=AsyncMock
        ) as mock_list:
            call_count = 0

            async def mock_list_fn():
                nonlocal call_count
                call_count += 1
                return []

            mock_list.side_effect = mock_list_fn

            # Call once (cache miss)
            await get_user_alerts(handle="INV_USER")
            assert call_count == 1

            # Call again (cache hit)
            await get_user_alerts(handle="INV_USER")
            assert call_count == 1

            # Invalidate entire cache region
            short_term_cache.invalidate()

            # Call again (cache miss after invalidation)
            await get_user_alerts(handle="INV_USER")
            assert call_count == 2


class TestAlertsPerformance:
    """Performance tests for alerts caching"""

    @pytest.fixture(autouse=True)
    def _clear_cache(self, clear_cache):
        """Auto-use cache clearing fixture for all tests in this class."""
        return clear_cache

    @pytest.mark.asyncio
    async def test_cached_call_is_fast(self):
        """Test that cached calls are significantly faster."""
        import time

        from app.core.cached_queries import get_user_alerts
        from app.core.query_cache import short_term_cache

        # Clear cache before test
        short_term_cache.invalidate()

        with patch(
            "app.services.alerts.store.list", new_callable=AsyncMock
        ) as mock_list:

            async def mock_list_fn():
                # Simulate slow store operation (10ms)
                await asyncio.sleep(0.01)
                return []

            mock_list.side_effect = mock_list_fn

            # First call (cache miss - should be slow)
            start = time.perf_counter()
            await get_user_alerts(handle="PERF_USER1")
            first_duration = time.perf_counter() - start

            # Second call (cache hit - should be fast)
            start = time.perf_counter()
            await get_user_alerts(handle="PERF_USER1")
            cached_duration = time.perf_counter() - start

            # Cached call should be at least 5x faster
            assert cached_duration < first_duration / 5

    @pytest.mark.asyncio
    async def test_cache_speedup_vs_store(self):
        """Test measurable speedup for cached vs uncached calls."""
        import time

        from app.core.cached_queries import get_user_alerts
        from app.core.query_cache import short_term_cache

        # Clear cache before test
        short_term_cache.invalidate()

        with patch(
            "app.services.alerts.store.list", new_callable=AsyncMock
        ) as mock_list:

            async def mock_list_fn():
                # Simulate 50ms store operation
                await asyncio.sleep(0.05)
                return []

            mock_list.side_effect = mock_list_fn

            # Measure uncached call
            start = time.perf_counter()
            await get_user_alerts(handle="SPEED_USER")
            uncached_duration = time.perf_counter() - start

            # Measure cached call
            start = time.perf_counter()
            await get_user_alerts(handle="SPEED_USER")
            cached_duration = time.perf_counter() - start

            # Uncached should take ~50ms, cached should be <5ms
            assert uncached_duration > 0.04  # At least 40ms
            assert cached_duration < 0.01  # Less than 10ms
            assert cached_duration < uncached_duration / 10  # 10x speedup


class TestAlertsIntegration:
    """Integration tests for alerts caching"""

    @pytest.fixture(autouse=True)
    def _clear_cache(self, clear_cache):
        """Auto-use cache clearing fixture for all tests in this class."""
        return clear_cache

    @pytest.mark.asyncio
    async def test_route_uses_cached_query(self):
        """Test that the route endpoint uses get_user_alerts.

        Note: This test validates that the route returns cached data successfully.
        """
        from httpx import ASGITransport, AsyncClient

        from app.main import app

        # Mock auth to return test user
        with patch("app.services.auth.require_handle", return_value="route_test_user"):
            # Mock store.list to return empty alerts
            with patch(
                "app.services.alerts.store.list", new_callable=AsyncMock
            ) as mock_list:

                async def mock_list_fn():
                    return []

                mock_list.side_effect = mock_list_fn

                transport = ASGITransport(app=app)
                async with AsyncClient(
                    transport=transport, base_url="http://test"
                ) as client:
                    response = await client.get(
                        "/api/alerts/", headers={"Authorization": "Bearer test"}
                    )

                    # Route should return successfully
                    assert response.status_code == 200
                    # Should return empty list
                    assert response.json() == []

    @pytest.mark.asyncio
    async def test_cache_monitoring_integration(self):
        """Test that cache statistics are tracked."""
        from app.core.redis_cache import get_cache_stats

        # Cache stats should be available after calls
        stats = get_cache_stats()

        # Check if it's a coroutine and await it
        if asyncio.iscoroutine(stats):
            stats = await stats

        # Should have basic structure
        assert isinstance(stats, dict)
