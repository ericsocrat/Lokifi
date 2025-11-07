"""
Tests for IndicesService - Real-time global market indices

Pattern: Reuses proven httpx AsyncMock patterns from Sessions 77 Phases 2-4
Success Criteria: 80%+ coverage, 100% pass rate
"""

import json
from unittest.mock import AsyncMock, MagicMock, patch
import httpx
import pytest
from app.services.indices_service import IndicesService


def create_mock_response(status_code: int = 200, json_data: dict | None = None):
    """Create mock httpx Response for AsyncMock compatibility"""
    response = MagicMock(spec=httpx.Response)
    response.status_code = status_code
    response.json = MagicMock(return_value=json_data or {})
    response.raise_for_status = MagicMock()
    return lambda: response


class TestIndicesServiceInit:
    """Test service initialization"""

    def test_init_without_redis(self):
        service = IndicesService()
        assert service.redis_client is not None
        assert service.cache_ttl == 60

    def test_indices_map_has_15_indices(self):
        service = IndicesService()
        assert len(service.INDICES_MAP) == 15

    @pytest.mark.asyncio
    async def test_context_manager_initializes_client(self):
        service = IndicesService()
        async with service:
            assert service.client is not None


class TestCacheOperations:
    """Test Redis caching"""

    @pytest.mark.asyncio
    async def test_cache_hit_returns_data(self):
        mock_redis = MagicMock()
        mock_redis.client = AsyncMock()
        cached_data = [{"symbol": "SPX", "current_price": 5800.0}]
        mock_redis.client.get = AsyncMock(return_value=json.dumps(cached_data))

        service = IndicesService(redis_client=mock_redis)
        result = await service.get_indices(limit=5)

        assert result == cached_data

    @pytest.mark.asyncio
    async def test_cache_miss_fetches_api(self):
        mock_redis = MagicMock()
        mock_redis.client = AsyncMock()
        mock_redis.client.get = AsyncMock(return_value=None)
        mock_redis.client.setex = AsyncMock()

        service = IndicesService(redis_client=mock_redis)

        with patch.object(service, "_fetch_from_alpha_vantage", new_callable=AsyncMock) as mock_fetch:
            mock_fetch.return_value = [{"symbol": "SPX"}]
            result = await service.get_indices(limit=5)
            assert len(result) > 0


class TestProviderCascade:
    """Test API provider fallback chain"""

    @pytest.mark.asyncio
    async def test_uses_alpha_vantage_primary(self):
        mock_redis = MagicMock()
        mock_redis.client = AsyncMock()
        mock_redis.client.get = AsyncMock(return_value=None)
        mock_redis.client.setex = AsyncMock()

        service = IndicesService(redis_client=mock_redis)

        with patch.object(service, "_fetch_from_alpha_vantage", new_callable=AsyncMock) as mock_av:
            mock_av.return_value = [{"provider": "alpha_vantage"}]
            result = await service.get_indices(limit=5)
            assert result[0]["provider"] == "alpha_vantage"

    @pytest.mark.asyncio
    async def test_fallback_to_yahoo_when_av_fails(self):
        mock_redis = MagicMock()
        mock_redis.client = AsyncMock()
        mock_redis.client.get = AsyncMock(return_value=None)
        mock_redis.client.setex = AsyncMock()

        service = IndicesService(redis_client=mock_redis)

        with patch.object(service, "_fetch_from_alpha_vantage", new_callable=AsyncMock) as mock_av, \
             patch.object(service, "_fetch_from_yahoo_finance", new_callable=AsyncMock) as mock_yahoo:
            mock_av.return_value = []
            mock_yahoo.return_value = [{"provider": "yahoo_finance"}]
            result = await service.get_indices(limit=5)
            assert result[0]["provider"] == "yahoo_finance"

    @pytest.mark.asyncio
    async def test_fallback_to_static_when_all_fail(self):
        mock_redis = MagicMock()
        mock_redis.client = AsyncMock()
        mock_redis.client.get = AsyncMock(return_value=None)
        mock_redis.client.setex = AsyncMock()

        service = IndicesService(redis_client=mock_redis)

        with patch.object(service, "_fetch_from_alpha_vantage", new_callable=AsyncMock) as mock_av, \
             patch.object(service, "_fetch_from_yahoo_finance", new_callable=AsyncMock) as mock_yahoo:
            mock_av.return_value = []
            mock_yahoo.return_value = []
            result = await service.get_indices(limit=5)
            assert len(result) == 5
            assert result[0]["provider"] == "fallback"
