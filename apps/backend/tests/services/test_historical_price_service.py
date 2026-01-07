"""
Tests for app.services.historical_price_service

Comprehensive tests for:
- PerformanceMetrics class
- OHLCVData dataclass
- HistoricalPricePoint dataclass
- HistoricalPriceService class
"""

from datetime import datetime, timedelta
from unittest.mock import AsyncMock, MagicMock, patch

import httpx
import pytest

from app.services.historical_price_service import (
    HistoricalPricePoint,
    HistoricalPriceService,
    OHLCVData,
    PerformanceMetrics,
    performance_metrics,
)

# ============================================================================
# PerformanceMetrics Tests
# ============================================================================


class TestPerformanceMetrics:
    """Tests for PerformanceMetrics class."""

    @pytest.fixture
    def metrics(self):
        """Create fresh metrics instance."""
        return PerformanceMetrics()

    def test_init(self, metrics):
        """Test initial state."""
        assert metrics.total_requests == 0
        assert metrics.cache_hits == 0
        assert metrics.cache_misses == 0
        assert metrics.api_errors == 0
        assert metrics.total_time == 0.0

    def test_record_request_cache_hit(self, metrics):
        """Test recording cache hit."""
        metrics.record_request(cached=True, duration=0.05)

        assert metrics.total_requests == 1
        assert metrics.cache_hits == 1
        assert metrics.cache_misses == 0
        assert metrics.api_errors == 0
        assert metrics.total_time == 0.05

    def test_record_request_cache_miss(self, metrics):
        """Test recording cache miss."""
        metrics.record_request(cached=False, duration=0.1)

        assert metrics.total_requests == 1
        assert metrics.cache_hits == 0
        assert metrics.cache_misses == 1
        assert metrics.api_errors == 0

    def test_record_request_error(self, metrics):
        """Test recording error."""
        metrics.record_request(cached=False, duration=0.2, error=True)

        assert metrics.total_requests == 1
        assert metrics.api_errors == 1
        assert metrics.cache_misses == 0

    def test_get_stats_empty(self, metrics):
        """Test get_stats with no requests."""
        stats = metrics.get_stats()

        assert stats["total_requests"] == 0
        assert stats["cache_hits"] == 0
        assert stats["cache_hit_rate"] == "0.0%"
        assert stats["avg_response_time_ms"] == "0.00ms"

    def test_get_stats_with_data(self, metrics):
        """Test get_stats with recorded requests."""
        metrics.record_request(cached=True, duration=0.01)
        metrics.record_request(cached=True, duration=0.02)
        metrics.record_request(cached=False, duration=0.1)
        metrics.record_request(cached=False, duration=0.2, error=True)

        stats = metrics.get_stats()

        assert stats["total_requests"] == 4
        assert stats["cache_hits"] == 2
        assert stats["cache_misses"] == 1
        assert stats["api_errors"] == 1
        assert stats["cache_hit_rate"] == "50.0%"


class TestGlobalPerformanceMetrics:
    """Tests for global performance_metrics instance."""

    def test_global_instance_exists(self):
        """Test global instance exists."""
        assert performance_metrics is not None
        assert isinstance(performance_metrics, PerformanceMetrics)


# ============================================================================
# OHLCVData Tests
# ============================================================================


class TestOHLCVData:
    """Tests for OHLCVData dataclass."""

    @pytest.fixture
    def sample_ohlcv(self):
        """Create sample OHLCV data."""
        return OHLCVData(
            timestamp=1704067200,
            open=150.0,
            high=155.0,
            low=148.0,
            close=153.0,
            volume=1000000.0,
        )

    def test_creation(self, sample_ohlcv):
        """Test dataclass creation."""
        assert sample_ohlcv.timestamp == 1704067200
        assert sample_ohlcv.open == 150.0
        assert sample_ohlcv.high == 155.0
        assert sample_ohlcv.low == 148.0
        assert sample_ohlcv.close == 153.0
        assert sample_ohlcv.volume == 1000000.0

    def test_to_dict(self, sample_ohlcv):
        """Test to_dict method."""
        result = sample_ohlcv.to_dict()

        assert result == {
            "timestamp": 1704067200,
            "open": 150.0,
            "high": 155.0,
            "low": 148.0,
            "close": 153.0,
            "volume": 1000000.0,
        }


# ============================================================================
# HistoricalPricePoint Tests
# ============================================================================


class TestHistoricalPricePoint:
    """Tests for HistoricalPricePoint dataclass."""

    @pytest.fixture
    def sample_point(self):
        """Create sample price point."""
        return HistoricalPricePoint(timestamp=1704067200, price=150.0)

    def test_creation(self, sample_point):
        """Test dataclass creation."""
        assert sample_point.timestamp == 1704067200
        assert sample_point.price == 150.0

    def test_to_dict(self, sample_point):
        """Test to_dict method."""
        result = sample_point.to_dict()

        assert result == {"timestamp": 1704067200, "price": 150.0}


# ============================================================================
# HistoricalPriceService Init Tests
# ============================================================================


class TestHistoricalPriceServiceInit:
    """Tests for HistoricalPriceService initialization."""

    def test_init(self):
        """Test service initialization."""
        service = HistoricalPriceService()

        assert service.client is None
        assert service.coingecko_base == "https://api.coingecko.com/api/v3"
        assert service.finnhub_base == "https://finnhub.io/api/v1"

    def test_coin_ids_mapping(self):
        """Test coin ID mappings exist."""
        service = HistoricalPriceService()

        assert "BTC" in service.coin_ids
        assert "ETH" in service.coin_ids
        assert service.coin_ids["BTC"] == "bitcoin"
        assert service.coin_ids["ETH"] == "ethereum"


# ============================================================================
# HistoricalPriceService Context Manager Tests
# ============================================================================


class TestHistoricalPriceServiceContextManager:
    """Tests for context manager protocol."""

    @pytest.mark.asyncio
    async def test_aenter_creates_client(self):
        """Test __aenter__ creates HTTP client."""
        service = HistoricalPriceService()

        async with service as svc:
            assert svc.client is not None
            assert isinstance(svc.client, httpx.AsyncClient)

    @pytest.mark.asyncio
    async def test_aexit_closes_client(self):
        """Test __aexit__ closes HTTP client."""
        service = HistoricalPriceService()

        async with service:
            client = service.client

        assert client.is_closed


# ============================================================================
# Period Conversion Tests
# ============================================================================


class TestPeriodConversion:
    """Tests for period conversion methods."""

    @pytest.fixture
    def service(self):
        """Create service instance."""
        return HistoricalPriceService()

    def test_period_to_days_1d(self, service):
        """Test 1d period."""
        assert service._period_to_days("1d") == 1

    def test_period_to_days_1w(self, service):
        """Test 1w period."""
        assert service._period_to_days("1w") == 7

    def test_period_to_days_1m(self, service):
        """Test 1m period."""
        assert service._period_to_days("1m") == 30

    def test_period_to_days_3m(self, service):
        """Test 3m period."""
        assert service._period_to_days("3m") == 90

    def test_period_to_days_6m(self, service):
        """Test 6m period."""
        assert service._period_to_days("6m") == 180

    def test_period_to_days_1y(self, service):
        """Test 1y period."""
        assert service._period_to_days("1y") == 365

    def test_period_to_days_5y(self, service):
        """Test 5y period."""
        assert service._period_to_days("5y") == 1825

    def test_period_to_days_all(self, service):
        """Test all period."""
        assert service._period_to_days("all") == 3650

    def test_period_to_days_unknown(self, service):
        """Test unknown period defaults to 30."""
        assert service._period_to_days("unknown") == 30

    def test_period_to_resolution_1d(self, service):
        """Test resolution for 1d."""
        assert service._period_to_resolution("1d") == "5"

    def test_period_to_resolution_1w(self, service):
        """Test resolution for 1w."""
        assert service._period_to_resolution("1w") == "15"

    def test_period_to_resolution_1m(self, service):
        """Test resolution for 1m."""
        assert service._period_to_resolution("1m") == "60"

    def test_period_to_resolution_3m(self, service):
        """Test resolution for 3m."""
        assert service._period_to_resolution("3m") == "60"

    def test_period_to_resolution_6m(self, service):
        """Test resolution for 6m and above."""
        assert service._period_to_resolution("6m") == "D"

    def test_period_to_resolution_1y(self, service):
        """Test resolution for 1y."""
        assert service._period_to_resolution("1y") == "D"


# ============================================================================
# Cache Tests
# ============================================================================


class TestCacheMethods:
    """Tests for cache methods."""

    @pytest.fixture
    def service(self):
        """Create service instance."""
        return HistoricalPriceService()

    @pytest.mark.asyncio
    async def test_get_cached_history_success(self, service):
        """Test successful cache retrieval."""
        with patch(
            "app.services.historical_price_service.advanced_redis_client"
        ) as mock_redis:
            mock_redis.get = AsyncMock(
                return_value=[{"timestamp": 1704067200, "price": 150.0}]
            )

            result = await service._get_cached_history("test_key")

            assert result == [{"timestamp": 1704067200, "price": 150.0}]
            mock_redis.get.assert_called_once_with("test_key")

    @pytest.mark.asyncio
    async def test_get_cached_history_miss(self, service):
        """Test cache miss."""
        with patch(
            "app.services.historical_price_service.advanced_redis_client"
        ) as mock_redis:
            mock_redis.get = AsyncMock(side_effect=Exception("Cache miss"))

            result = await service._get_cached_history("test_key")

            assert result is None

    @pytest.mark.asyncio
    async def test_set_cache_history_success(self, service):
        """Test successful cache set."""
        with patch(
            "app.services.historical_price_service.advanced_redis_client"
        ) as mock_redis:
            mock_redis.set = AsyncMock()

            await service._set_cache_history(
                "test_key", [{"timestamp": 1704067200, "price": 150.0}], ttl=1800
            )

            mock_redis.set.assert_called_once()

    @pytest.mark.asyncio
    async def test_set_cache_history_failure(self, service):
        """Test cache set failure is handled."""
        with patch(
            "app.services.historical_price_service.advanced_redis_client"
        ) as mock_redis:
            mock_redis.set = AsyncMock(side_effect=Exception("Redis error"))

            # Should not raise
            await service._set_cache_history("test_key", [{"price": 100}])


# ============================================================================
# get_history Tests
# ============================================================================


class TestGetHistory:
    """Tests for get_history method."""

    @pytest.fixture
    def service(self):
        """Create service instance."""
        return HistoricalPriceService()

    @pytest.mark.asyncio
    async def test_get_history_cache_hit(self, service):
        """Test get_history returns cached data."""
        cached_data = [{"timestamp": 1704067200, "price": 150.0}]

        with patch.object(
            service, "_get_cached_history", AsyncMock(return_value=cached_data)
        ):
            result = await service.get_history("BTC", "1m")

            assert len(result) == 1
            assert isinstance(result[0], HistoricalPricePoint)
            assert result[0].price == 150.0

    @pytest.mark.asyncio
    async def test_get_history_force_refresh(self, service):
        """Test force_refresh bypasses cache."""
        with patch.object(
            service, "_get_cached_history", AsyncMock(return_value=None)
        ) as mock_cache:
            with patch.object(
                service,
                "_fetch_history",
                AsyncMock(
                    return_value=[HistoricalPricePoint(timestamp=1704067200, price=150)]
                ),
            ):
                with patch.object(service, "_set_cache_history", AsyncMock()):
                    result = await service.get_history("BTC", "1m", force_refresh=True)

                    # Cache should not be checked
                    mock_cache.assert_not_called()
                    assert len(result) == 1

    @pytest.mark.asyncio
    async def test_get_history_api_fetch(self, service):
        """Test get_history fetches from API on cache miss."""
        with patch.object(service, "_get_cached_history", AsyncMock(return_value=None)):
            with patch.object(
                service,
                "_fetch_history",
                AsyncMock(
                    return_value=[HistoricalPricePoint(timestamp=1704067200, price=150)]
                ),
            ):
                with patch.object(service, "_set_cache_history", AsyncMock()):
                    result = await service.get_history("BTC", "1m")

                    assert len(result) == 1

    @pytest.mark.asyncio
    async def test_get_history_error_handling(self, service):
        """Test error handling returns empty list."""
        with patch.object(
            service, "_get_cached_history", AsyncMock(side_effect=Exception("Error"))
        ):
            result = await service.get_history("BTC", "1m")

            assert result == []


# ============================================================================
# _fetch_history Tests
# ============================================================================


class TestFetchHistory:
    """Tests for _fetch_history method."""

    @pytest.fixture
    def service(self):
        """Create service instance."""
        return HistoricalPriceService()

    @pytest.mark.asyncio
    async def test_fetch_history_crypto(self, service):
        """Test fetch_history routes crypto to CoinGecko."""
        with patch.object(
            service,
            "_fetch_crypto_history",
            AsyncMock(return_value=[HistoricalPricePoint(timestamp=1, price=100)]),
        ) as mock_crypto:
            async with httpx.AsyncClient() as client:
                await service._fetch_history(client, "BTC", "1m")

            mock_crypto.assert_called_once()

    @pytest.mark.asyncio
    async def test_fetch_history_stock(self, service):
        """Test fetch_history routes stock to Finnhub."""
        with patch.object(
            service,
            "_fetch_stock_history",
            AsyncMock(return_value=[HistoricalPricePoint(timestamp=1, price=100)]),
        ) as mock_stock:
            async with httpx.AsyncClient() as client:
                await service._fetch_history(client, "AAPL", "1m")

            mock_stock.assert_called_once()


# ============================================================================
# _fetch_crypto_history Tests
# ============================================================================


class TestFetchCryptoHistory:
    """Tests for _fetch_crypto_history method."""

    @pytest.fixture
    def service(self):
        """Create service instance."""
        return HistoricalPriceService()

    @pytest.mark.asyncio
    async def test_fetch_crypto_history_success(self, service):
        """Test successful CoinGecko fetch."""
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.raise_for_status = MagicMock()
        mock_response.json.return_value = {
            "prices": [[1704067200000, 42000.0], [1704153600000, 42500.0]]
        }

        mock_client = AsyncMock()
        mock_client.get = AsyncMock(return_value=mock_response)

        result = await service._fetch_crypto_history(mock_client, "BTC", "1m")

        assert len(result) == 2
        assert result[0].price == 42000.0
        assert result[0].timestamp == 1704067200

    @pytest.mark.asyncio
    async def test_fetch_crypto_history_no_prices(self, service):
        """Test CoinGecko with no prices."""
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.raise_for_status = MagicMock()
        mock_response.json.return_value = {"prices": []}

        mock_client = AsyncMock()
        mock_client.get = AsyncMock(return_value=mock_response)

        result = await service._fetch_crypto_history(mock_client, "BTC", "1m")

        assert result == []

    @pytest.mark.asyncio
    async def test_fetch_crypto_history_rate_limit(self, service):
        """Test CoinGecko rate limit handling."""
        mock_response = MagicMock()
        mock_response.status_code = 429
        mock_response.raise_for_status.side_effect = httpx.HTTPStatusError(
            "Rate limited", request=MagicMock(), response=mock_response
        )

        mock_client = AsyncMock()
        mock_client.get = AsyncMock(return_value=mock_response)

        result = await service._fetch_crypto_history(mock_client, "BTC", "1m")

        assert result == []

    @pytest.mark.asyncio
    async def test_fetch_crypto_history_http_error(self, service):
        """Test CoinGecko HTTP error handling."""
        mock_response = MagicMock()
        mock_response.status_code = 500
        mock_response.raise_for_status.side_effect = httpx.HTTPStatusError(
            "Server error", request=MagicMock(), response=mock_response
        )

        mock_client = AsyncMock()
        mock_client.get = AsyncMock(return_value=mock_response)

        result = await service._fetch_crypto_history(mock_client, "BTC", "1m")

        assert result == []

    @pytest.mark.asyncio
    async def test_fetch_crypto_history_exception(self, service):
        """Test general exception handling."""
        mock_client = AsyncMock()
        mock_client.get = AsyncMock(side_effect=Exception("Network error"))

        result = await service._fetch_crypto_history(mock_client, "BTC", "1m")

        assert result == []


# ============================================================================
# _fetch_stock_history Tests
# ============================================================================


class TestFetchStockHistory:
    """Tests for _fetch_stock_history method."""

    @pytest.fixture
    def service(self):
        """Create service instance."""
        return HistoricalPriceService()

    @pytest.mark.asyncio
    async def test_fetch_stock_history_no_api_key(self, service):
        """Test stock fetch without API key."""
        with patch("app.services.historical_price_service.settings") as mock_settings:
            mock_settings.FINNHUB_KEY = None

            mock_client = AsyncMock()
            result = await service._fetch_stock_history(mock_client, "AAPL", "1m")

            assert result == []

    @pytest.mark.asyncio
    async def test_fetch_stock_history_success(self, service):
        """Test successful Finnhub fetch."""
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.raise_for_status = MagicMock()
        mock_response.json.return_value = {
            "s": "ok",
            "t": [1704067200, 1704153600],
            "c": [150.0, 155.0],
        }

        mock_client = AsyncMock()
        mock_client.get = AsyncMock(return_value=mock_response)

        with patch("app.services.historical_price_service.settings") as mock_settings:
            mock_settings.FINNHUB_KEY = "test_key"

            result = await service._fetch_stock_history(mock_client, "AAPL", "1m")

            assert len(result) == 2
            assert result[0].price == 150.0
            assert result[1].price == 155.0

    @pytest.mark.asyncio
    async def test_fetch_stock_history_no_data(self, service):
        """Test Finnhub no_data response."""
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.raise_for_status = MagicMock()
        mock_response.json.return_value = {"s": "no_data"}

        mock_client = AsyncMock()
        mock_client.get = AsyncMock(return_value=mock_response)

        with patch("app.services.historical_price_service.settings") as mock_settings:
            mock_settings.FINNHUB_KEY = "test_key"

            result = await service._fetch_stock_history(mock_client, "AAPL", "1m")

            assert result == []

    @pytest.mark.asyncio
    async def test_fetch_stock_history_rate_limit(self, service):
        """Test Finnhub rate limit."""
        mock_response = MagicMock()
        mock_response.status_code = 429
        mock_response.raise_for_status.side_effect = httpx.HTTPStatusError(
            "Rate limited", request=MagicMock(), response=mock_response
        )

        mock_client = AsyncMock()
        mock_client.get = AsyncMock(return_value=mock_response)

        with patch("app.services.historical_price_service.settings") as mock_settings:
            mock_settings.FINNHUB_KEY = "test_key"

            result = await service._fetch_stock_history(mock_client, "AAPL", "1m")

            assert result == []

    @pytest.mark.asyncio
    async def test_fetch_stock_history_auth_error(self, service):
        """Test Finnhub 403 auth error."""
        mock_response = MagicMock()
        mock_response.status_code = 403
        mock_response.raise_for_status.side_effect = httpx.HTTPStatusError(
            "Forbidden", request=MagicMock(), response=mock_response
        )

        mock_client = AsyncMock()
        mock_client.get = AsyncMock(return_value=mock_response)

        with patch("app.services.historical_price_service.settings") as mock_settings:
            mock_settings.FINNHUB_KEY = "invalid_key"

            result = await service._fetch_stock_history(mock_client, "AAPL", "1m")

            assert result == []


# ============================================================================
# get_ohlcv Tests
# ============================================================================


class TestGetOHLCV:
    """Tests for get_ohlcv method."""

    @pytest.fixture
    def service(self):
        """Create service instance."""
        return HistoricalPriceService()

    @pytest.mark.asyncio
    async def test_get_ohlcv_cache_hit(self, service):
        """Test get_ohlcv returns cached data."""
        cached_data = [
            {
                "timestamp": 1704067200,
                "open": 150.0,
                "high": 155.0,
                "low": 148.0,
                "close": 153.0,
                "volume": 1000000.0,
            }
        ]

        with patch.object(
            service, "_get_cached_history", AsyncMock(return_value=cached_data)
        ):
            result = await service.get_ohlcv("BTC", "1m")

            assert len(result) == 1
            assert isinstance(result[0], OHLCVData)
            assert result[0].open == 150.0

    @pytest.mark.asyncio
    async def test_get_ohlcv_cache_miss_fetch(self, service):
        """Test get_ohlcv fetches on cache miss."""
        with patch.object(service, "_get_cached_history", AsyncMock(return_value=None)):
            with patch.object(
                service,
                "_fetch_ohlcv",
                AsyncMock(
                    return_value=[
                        OHLCVData(
                            timestamp=1704067200,
                            open=150.0,
                            high=155.0,
                            low=148.0,
                            close=153.0,
                            volume=1000000.0,
                        )
                    ]
                ),
            ):
                with patch.object(service, "_set_cache_history", AsyncMock()):
                    result = await service.get_ohlcv("BTC", "1m")

                    assert len(result) == 1

    @pytest.mark.asyncio
    async def test_get_ohlcv_error_handling(self, service):
        """Test error handling returns empty list."""
        with patch.object(service, "_get_cached_history", AsyncMock(return_value=None)):
            with patch.object(
                service, "_fetch_ohlcv", AsyncMock(side_effect=Exception("Error"))
            ):
                result = await service.get_ohlcv("BTC", "1m")

                assert result == []


# ============================================================================
# _fetch_ohlcv Tests
# ============================================================================


class TestFetchOHLCV:
    """Tests for _fetch_ohlcv method."""

    @pytest.fixture
    def service(self):
        """Create service instance."""
        return HistoricalPriceService()

    @pytest.mark.asyncio
    async def test_fetch_ohlcv_crypto(self, service):
        """Test fetch_ohlcv routes crypto."""
        with patch.object(
            service,
            "_fetch_crypto_ohlcv",
            AsyncMock(
                return_value=[
                    OHLCVData(
                        timestamp=1, open=1, high=2, low=0.5, close=1.5, volume=100
                    )
                ]
            ),
        ) as mock_crypto:
            async with httpx.AsyncClient() as client:
                await service._fetch_ohlcv(client, "BTC", "1m")

            mock_crypto.assert_called_once()

    @pytest.mark.asyncio
    async def test_fetch_ohlcv_stock(self, service):
        """Test fetch_ohlcv routes stock."""
        with patch.object(
            service,
            "_fetch_stock_ohlcv",
            AsyncMock(
                return_value=[
                    OHLCVData(
                        timestamp=1, open=100, high=110, low=95, close=105, volume=1000
                    )
                ]
            ),
        ) as mock_stock:
            async with httpx.AsyncClient() as client:
                await service._fetch_ohlcv(client, "AAPL", "1m")

            mock_stock.assert_called_once()


# ============================================================================
# _fetch_crypto_ohlcv Tests
# ============================================================================


class TestFetchCryptoOHLCV:
    """Tests for _fetch_crypto_ohlcv method."""

    @pytest.fixture
    def service(self):
        """Create service instance."""
        return HistoricalPriceService()

    @pytest.mark.asyncio
    async def test_fetch_crypto_ohlcv_success(self, service):
        """Test successful CoinGecko OHLC fetch."""
        # CoinGecko OHLC format: [timestamp_ms, open, high, low, close]
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.raise_for_status = MagicMock()
        mock_response.json.return_value = [
            [1704067200000, 42000.0, 43000.0, 41500.0, 42500.0],
            [1704153600000, 42500.0, 43500.0, 42000.0, 43000.0],
        ]

        mock_client = AsyncMock()
        mock_client.get = AsyncMock(return_value=mock_response)

        result = await service._fetch_crypto_ohlcv(mock_client, "BTC", "1m")

        assert len(result) == 2
        assert result[0].open == 42000.0
        assert result[0].high == 43000.0
        assert result[0].low == 41500.0
        assert result[0].close == 42500.0
        assert result[0].volume == 0  # CoinGecko doesn't include volume

    @pytest.mark.asyncio
    async def test_fetch_crypto_ohlcv_error(self, service):
        """Test error handling."""
        mock_client = AsyncMock()
        mock_client.get = AsyncMock(side_effect=Exception("Error"))

        result = await service._fetch_crypto_ohlcv(mock_client, "BTC", "1m")

        assert result == []


# ============================================================================
# _fetch_stock_ohlcv Tests
# ============================================================================


class TestFetchStockOHLCV:
    """Tests for _fetch_stock_ohlcv method."""

    @pytest.fixture
    def service(self):
        """Create service instance."""
        return HistoricalPriceService()

    @pytest.mark.asyncio
    async def test_fetch_stock_ohlcv_no_api_key(self, service):
        """Test stock OHLCV without API key."""
        with patch("app.services.historical_price_service.settings") as mock_settings:
            mock_settings.FINNHUB_KEY = None

            mock_client = AsyncMock()
            result = await service._fetch_stock_ohlcv(mock_client, "AAPL", "1m")

            assert result == []

    @pytest.mark.asyncio
    async def test_fetch_stock_ohlcv_success(self, service):
        """Test successful Finnhub OHLCV fetch."""
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.raise_for_status = MagicMock()
        mock_response.json.return_value = {
            "s": "ok",
            "t": [1704067200, 1704153600],
            "o": [150.0, 155.0],
            "h": [155.0, 160.0],
            "l": [148.0, 153.0],
            "c": [153.0, 158.0],
            "v": [1000000, 1100000],
        }

        mock_client = AsyncMock()
        mock_client.get = AsyncMock(return_value=mock_response)

        with patch("app.services.historical_price_service.settings") as mock_settings:
            mock_settings.FINNHUB_KEY = "test_key"

            result = await service._fetch_stock_ohlcv(mock_client, "AAPL", "1m")

            assert len(result) == 2
            assert result[0].open == 150.0
            assert result[0].high == 155.0
            assert result[0].low == 148.0
            assert result[0].close == 153.0
            assert result[0].volume == 1000000

    @pytest.mark.asyncio
    async def test_fetch_stock_ohlcv_not_ok(self, service):
        """Test Finnhub non-ok status."""
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.raise_for_status = MagicMock()
        mock_response.json.return_value = {"s": "no_data"}

        mock_client = AsyncMock()
        mock_client.get = AsyncMock(return_value=mock_response)

        with patch("app.services.historical_price_service.settings") as mock_settings:
            mock_settings.FINNHUB_KEY = "test_key"

            result = await service._fetch_stock_ohlcv(mock_client, "AAPL", "1m")

            assert result == []

    @pytest.mark.asyncio
    async def test_fetch_stock_ohlcv_error(self, service):
        """Test error handling."""
        with patch("app.services.historical_price_service.settings") as mock_settings:
            mock_settings.FINNHUB_KEY = "test_key"

            mock_client = AsyncMock()
            mock_client.get = AsyncMock(side_effect=Exception("Error"))

            result = await service._fetch_stock_ohlcv(mock_client, "AAPL", "1m")

            assert result == []


# ============================================================================
# Context Manager with Client Tests
# ============================================================================


class TestServiceWithClient:
    """Tests for service methods using context manager client."""

    @pytest.mark.asyncio
    async def test_get_history_with_context_manager(self):
        """Test get_history uses context manager client."""
        async with HistoricalPriceService() as service:
            with patch.object(
                service, "_get_cached_history", AsyncMock(return_value=None)
            ):
                with patch.object(
                    service,
                    "_fetch_history",
                    AsyncMock(
                        return_value=[
                            HistoricalPricePoint(timestamp=1704067200, price=150)
                        ]
                    ),
                ):
                    with patch.object(service, "_set_cache_history", AsyncMock()):
                        result = await service.get_history("BTC", "1m")

                        assert len(result) == 1
                        # Verify the context manager client was available
                        assert service.client is not None

    @pytest.mark.asyncio
    async def test_get_ohlcv_with_context_manager(self):
        """Test get_ohlcv uses context manager client."""
        async with HistoricalPriceService() as service:
            with patch.object(
                service, "_get_cached_history", AsyncMock(return_value=None)
            ):
                with patch.object(
                    service,
                    "_fetch_ohlcv",
                    AsyncMock(
                        return_value=[
                            OHLCVData(
                                timestamp=1704067200,
                                open=150.0,
                                high=155.0,
                                low=148.0,
                                close=153.0,
                                volume=1000000.0,
                            )
                        ]
                    ),
                ):
                    with patch.object(service, "_set_cache_history", AsyncMock()):
                        result = await service.get_ohlcv("BTC", "1m")

                        assert len(result) == 1
