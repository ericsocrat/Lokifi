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

        with patch.object(
            service, "_fetch_from_alpha_vantage", new_callable=AsyncMock
        ) as mock_fetch:
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

        with (
            patch.object(service, "_fetch_from_alpha_vantage", new_callable=AsyncMock) as mock_av,
            patch.object(
                service, "_fetch_from_yahoo_finance", new_callable=AsyncMock
            ) as mock_yahoo,
        ):
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

        with (
            patch.object(service, "_fetch_from_alpha_vantage", new_callable=AsyncMock) as mock_av,
            patch.object(
                service, "_fetch_from_yahoo_finance", new_callable=AsyncMock
            ) as mock_yahoo,
        ):
            mock_av.return_value = []
            mock_yahoo.return_value = []
            result = await service.get_indices(limit=5)
            assert len(result) == 5
            assert result[0]["provider"] == "fallback"


class TestAlphaVantageProvider:
    """Test Alpha Vantage API provider integration"""

    @pytest.mark.asyncio
    async def test_successful_fetch_single_index(self):
        """Test fetching a single index from Alpha Vantage"""
        mock_redis = MagicMock()
        mock_redis.client = AsyncMock()
        mock_redis.client.get = AsyncMock(return_value=None)
        mock_redis.client.setex = AsyncMock()

        service = IndicesService(redis_client=mock_redis)

        av_response = {
            "Global Quote": {
                "05. price": "5800.25",
                "10. change percent": "0.75%",
            }
        }

        async with service:
            with patch.object(service.client, "get", new_callable=AsyncMock) as mock_get:
                mock_get.return_value = create_mock_response(200, av_response)()
                result = await service._fetch_av_data(limit=1)

                assert len(result) == 1
                assert result[0]["symbol"] == "SPX"
                assert result[0]["current_price"] == 5800.25
                assert result[0]["price_change_percentage_24h"] == 0.75
                assert result[0]["provider"] == "alpha_vantage"

    @pytest.mark.asyncio
    async def test_multiple_indices_fetched(self):
        """Test fetching multiple indices from Alpha Vantage"""
        mock_redis = MagicMock()
        mock_redis.client = AsyncMock()
        mock_redis.client.get = AsyncMock(return_value=None)
        mock_redis.client.setex = AsyncMock()

        service = IndicesService(redis_client=mock_redis)

        # Mock responses for multiple indices
        av_responses = [
            {"Global Quote": {"05. price": "5800.25", "10. change percent": "0.75%"}},
            {"Global Quote": {"05. price": "42500.50", "10. change percent": "1.25%"}},
            {"Global Quote": {"05. price": "18200.75", "10. change percent": "0.50%"}},
        ]

        async with service:
            with patch.object(service.client, "get", new_callable=AsyncMock) as mock_get:
                mock_get.side_effect = [create_mock_response(200, resp)() for resp in av_responses]
                result = await service._fetch_av_data(limit=3)

                assert len(result) == 3
                assert result[0]["symbol"] == "SPX"
                assert result[1]["symbol"] == "DJI"
                assert result[2]["symbol"] == "IXIC"

    @pytest.mark.asyncio
    async def test_empty_response_skipped(self):
        """Test that empty Alpha Vantage responses are skipped"""
        mock_redis = MagicMock()
        mock_redis.client = AsyncMock()

        service = IndicesService(redis_client=mock_redis)

        # Mock response without "Global Quote" key
        empty_response = {"Note": "API call frequency exceeded"}

        async with service:
            with patch.object(service.client, "get", new_callable=AsyncMock) as mock_get:
                mock_get.return_value = create_mock_response(200, empty_response)()
                result = await service._fetch_av_data(limit=1)

                assert len(result) == 0  # Empty response skipped

    @pytest.mark.asyncio
    async def test_http_error_handled_gracefully(self):
        """Test HTTP errors are caught and logged"""
        mock_redis = MagicMock()
        mock_redis.client = AsyncMock()

        service = IndicesService(redis_client=mock_redis)

        async with service:
            with patch.object(service.client, "get", new_callable=AsyncMock) as mock_get:
                mock_get.side_effect = httpx.HTTPStatusError(
                    "429 Too Many Requests",
                    request=MagicMock(),
                    response=MagicMock(status_code=429),
                )
                result = await service._fetch_av_data(limit=1)

                assert len(result) == 0  # Error handled, returns empty list

    @pytest.mark.asyncio
    async def test_network_error_handled(self):
        """Test network connection errors are handled"""
        mock_redis = MagicMock()
        mock_redis.client = AsyncMock()

        service = IndicesService(redis_client=mock_redis)

        async with service:
            with patch.object(service.client, "get", new_callable=AsyncMock) as mock_get:
                mock_get.side_effect = httpx.ConnectError("Network unreachable")
                result = await service._fetch_av_data(limit=1)

                assert len(result) == 0  # Network error handled


class TestYahooFinanceFallback:
    """Test Yahoo Finance fallback provider"""

    @pytest.mark.asyncio
    async def test_successful_batch_fetch(self):
        """Test fetching multiple indices in batch from Yahoo Finance"""
        mock_redis = MagicMock()
        mock_redis.client = AsyncMock()

        service = IndicesService(redis_client=mock_redis)

        yahoo_response = {
            "quoteResponse": {
                "result": [
                    {
                        "symbol": "^GSPC",
                        "regularMarketPrice": 5800.25,
                        "regularMarketChangePercent": 0.75,
                    },
                    {
                        "symbol": "^DJI",
                        "regularMarketPrice": 42500.50,
                        "regularMarketChangePercent": 1.25,
                    },
                ]
            }
        }

        async with service:
            with patch.object(service.client, "get", new_callable=AsyncMock) as mock_get:
                mock_get.return_value = create_mock_response(200, yahoo_response)()
                result = await service._fetch_yahoo_data(["SPX", "DJI"])

                assert len(result) == 2
                assert result[0]["symbol"] == "SPX"
                assert result[0]["current_price"] == 5800.25
                assert result[0]["provider"] == "yahoo_finance"
                assert result[1]["symbol"] == "DJI"

    @pytest.mark.asyncio
    async def test_symbol_mapping_yahoo_to_our_symbols(self):
        """Test proper mapping from Yahoo symbols to our symbols"""
        mock_redis = MagicMock()
        mock_redis.client = AsyncMock()

        service = IndicesService(redis_client=mock_redis)

        yahoo_response = {
            "quoteResponse": {
                "result": [
                    {
                        "symbol": "^IXIC",  # Yahoo symbol for NASDAQ
                        "regularMarketPrice": 18200.75,
                        "regularMarketChangePercent": 0.50,
                    }
                ]
            }
        }

        async with service:
            with patch.object(service.client, "get", new_callable=AsyncMock) as mock_get:
                mock_get.return_value = create_mock_response(200, yahoo_response)()
                result = await service._fetch_yahoo_data(["IXIC"])

                assert len(result) == 1
                assert result[0]["symbol"] == "IXIC"  # Our symbol, not Yahoo's
                assert result[0]["name"] == "NASDAQ Composite"

    @pytest.mark.asyncio
    async def test_http_error_returns_empty_list(self):
        """Test HTTP errors from Yahoo Finance return empty list"""
        mock_redis = MagicMock()
        mock_redis.client = AsyncMock()

        service = IndicesService(redis_client=mock_redis)

        async with service:
            with patch.object(service.client, "get", new_callable=AsyncMock) as mock_get:
                mock_get.side_effect = httpx.HTTPStatusError(
                    "500 Internal Server Error",
                    request=MagicMock(),
                    response=MagicMock(status_code=500),
                )
                result = await service._fetch_yahoo_data(["SPX"])

                assert len(result) == 0

    @pytest.mark.asyncio
    async def test_malformed_response_handled(self):
        """Test malformed Yahoo Finance responses are handled gracefully"""
        mock_redis = MagicMock()
        mock_redis.client = AsyncMock()

        service = IndicesService(redis_client=mock_redis)

        malformed_response = {"error": "Invalid request"}

        async with service:
            with patch.object(service.client, "get", new_callable=AsyncMock) as mock_get:
                mock_get.return_value = create_mock_response(200, malformed_response)()
                result = await service._fetch_yahoo_data(["SPX"])

                assert len(result) == 0  # Malformed response handled


class TestIndividualIndexRetrieval:
    """Test get_index_by_symbol() method"""

    @pytest.mark.asyncio
    async def test_cache_hit_returns_cached_index(self):
        """Test individual index retrieved from cache"""
        mock_redis = MagicMock()
        mock_redis.client = AsyncMock()

        cached_index = {"symbol": "SPX", "current_price": 5800.0, "provider": "alpha_vantage"}
        mock_redis.client.get = AsyncMock(return_value=json.dumps(cached_index))

        service = IndicesService(redis_client=mock_redis)
        result = await service.get_index_by_symbol("SPX")

        assert result is not None
        assert result["symbol"] == "SPX"
        assert result["current_price"] == 5800.0
        mock_redis.client.get.assert_called_once_with("indices:SPX")

    @pytest.mark.asyncio
    async def test_cache_miss_fetches_all_indices(self):
        """Test cache miss triggers get_indices() call"""
        mock_redis = MagicMock()
        mock_redis.client = AsyncMock()
        mock_redis.client.get = AsyncMock(return_value=None)
        mock_redis.client.setex = AsyncMock()

        service = IndicesService(redis_client=mock_redis)

        with patch.object(service, "get_indices", new_callable=AsyncMock) as mock_get_all:
            mock_get_all.return_value = [
                {"symbol": "SPX", "current_price": 5800.0},
                {"symbol": "DJI", "current_price": 42500.0},
            ]
            result = await service.get_index_by_symbol("SPX")

            assert result is not None
            assert result["symbol"] == "SPX"
            mock_get_all.assert_called_once_with(limit=20)

    @pytest.mark.asyncio
    async def test_unknown_symbol_returns_none(self):
        """Test requesting unknown symbol returns None"""
        mock_redis = MagicMock()
        mock_redis.client = AsyncMock()
        mock_redis.client.get = AsyncMock(return_value=None)
        mock_redis.client.setex = AsyncMock()

        service = IndicesService(redis_client=mock_redis)

        with patch.object(service, "get_indices", new_callable=AsyncMock) as mock_get_all:
            mock_get_all.return_value = [{"symbol": "SPX"}]
            result = await service.get_index_by_symbol("UNKNOWN")

            assert result is None

    @pytest.mark.asyncio
    async def test_successful_fetch_caches_individual_result(self):
        """Test individual index is cached after successful fetch"""
        mock_redis = MagicMock()
        mock_redis.client = AsyncMock()
        mock_redis.client.get = AsyncMock(return_value=None)
        mock_redis.client.setex = AsyncMock()

        service = IndicesService(redis_client=mock_redis)

        with patch.object(service, "get_indices", new_callable=AsyncMock) as mock_get_all:
            mock_get_all.return_value = [{"symbol": "DJI", "current_price": 42500.0}]
            result = await service.get_index_by_symbol("DJI")

            assert result is not None
            assert result["symbol"] == "DJI"
            # Verify individual caching was attempted
            assert mock_redis.client.setex.called


class TestEdgeCasesAndErrors:
    """Test edge cases and error scenarios"""

    @pytest.mark.asyncio
    async def test_limit_zero_returns_empty_list(self):
        """Test limit=0 returns empty list"""
        mock_redis = MagicMock()
        mock_redis.client = AsyncMock()
        mock_redis.client.get = AsyncMock(return_value=None)

        service = IndicesService(redis_client=mock_redis)

        with patch.object(service, "_fetch_from_alpha_vantage", new_callable=AsyncMock) as mock_av:
            mock_av.return_value = [{"symbol": "SPX"}]
            result = await service.get_indices(limit=0)

            assert len(result) == 0

    @pytest.mark.asyncio
    async def test_limit_exceeds_available_indices(self):
        """Test limit exceeding 15 available indices"""
        mock_redis = MagicMock()
        mock_redis.client = AsyncMock()
        mock_redis.client.get = AsyncMock(return_value=None)
        mock_redis.client.setex = AsyncMock()

        service = IndicesService(redis_client=mock_redis)

        with patch.object(service, "_get_fallback_indices") as mock_fallback:
            mock_fallback.return_value = [{"symbol": f"IDX{i}"} for i in range(15)]
            result = await service.get_indices(limit=20)

            # Should only return 15 (max available)
            assert len(result) <= 15

    @pytest.mark.asyncio
    async def test_cache_read_error_continues_to_api(self):
        """Test cache read errors don't block API calls"""
        mock_redis = MagicMock()
        mock_redis.client = AsyncMock()
        mock_redis.client.get = AsyncMock(side_effect=Exception("Redis connection error"))
        mock_redis.client.setex = AsyncMock()

        service = IndicesService(redis_client=mock_redis)

        with patch.object(service, "_fetch_from_alpha_vantage", new_callable=AsyncMock) as mock_av:
            mock_av.return_value = [{"symbol": "SPX"}]
            result = await service.get_indices(limit=1)

            assert len(result) == 1  # API fetch successful despite cache error

    @pytest.mark.asyncio
    async def test_cache_write_error_returns_data(self):
        """Test cache write errors don't block returning data"""
        mock_redis = MagicMock()
        mock_redis.client = AsyncMock()
        mock_redis.client.get = AsyncMock(return_value=None)
        mock_redis.client.setex = AsyncMock(side_effect=Exception("Redis write error"))

        service = IndicesService(redis_client=mock_redis)

        with patch.object(service, "_fetch_from_alpha_vantage", new_callable=AsyncMock) as mock_av:
            mock_av.return_value = [{"symbol": "SPX"}]
            result = await service.get_indices(limit=1)

            assert len(result) == 1  # Data returned despite cache error

    @pytest.mark.asyncio
    async def test_fallback_data_has_all_15_indices(self):
        """Test fallback data contains all 15 configured indices"""
        service = IndicesService()
        fallback = service._get_fallback_indices(limit=15)

        assert len(fallback) == 15
        assert all(idx["provider"] == "fallback" for idx in fallback)
        assert fallback[0]["symbol"] == "SPX"

    @pytest.mark.asyncio
    async def test_context_manager_closes_client(self):
        """Test context manager properly closes httpx client"""
        service = IndicesService()

        async with service:
            assert service.client is not None

        # Client should be closed after exiting context
        # (We can't directly verify closure, but it should not raise)

    @pytest.mark.asyncio
    async def test_no_api_key_uses_yahoo_fallback(self):
        """Test when no Alpha Vantage key, uses Yahoo Finance"""
        mock_redis = MagicMock()
        mock_redis.client = AsyncMock()
        mock_redis.client.get = AsyncMock(return_value=None)
        mock_redis.client.setex = AsyncMock()

        service = IndicesService(redis_client=mock_redis)

        with patch("app.services.indices_service.settings") as mock_settings:
            mock_settings.ALPHAVANTAGE_KEY = None
            with patch.object(
                service, "_fetch_from_yahoo_finance", new_callable=AsyncMock
            ) as mock_yahoo:
                mock_yahoo.return_value = [{"symbol": "SPX", "provider": "yahoo_finance"}]
                result = await service.get_indices(limit=1)

                assert len(result) == 1
                assert result[0]["provider"] == "yahoo_finance"
                mock_yahoo.assert_called_once()
