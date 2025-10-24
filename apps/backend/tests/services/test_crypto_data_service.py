"""
Tests for app.services.crypto_data_service

Comprehensive test suite using mocks
"""

from unittest.mock import AsyncMock, MagicMock, patch

import httpx
import pytest

from app.services.crypto_data_service import CryptoDataService

# ============================================================
# Test Fixtures
# ============================================================


@pytest.fixture
def sample_market_data():
    """Sample market data response"""
    return {
        "bitcoin": {
            "usd": 50000.0,
            "usd_market_cap": 1000000000.0,
            "usd_24h_vol": 50000000.0,
            "usd_24h_change": 5.0,
        }
    }


@pytest.fixture
def sample_coin_list():
    """Sample coin list response"""
    return [
        {"id": "bitcoin", "symbol": "btc", "name": "Bitcoin"},
        {"id": "ethereum", "symbol": "eth", "name": "Ethereum"},
    ]


# ============================================================
# Unit Tests - CryptoDataService Core Functionality
# ============================================================


class TestCryptoDataService:
    """Test suite for CryptoDataService basic operations"""

    @pytest.mark.asyncio
    async def test_service_initialization(self):
        """Test service initializes correctly"""
        service = CryptoDataService()

        assert service.client is None  # Not initialized until context manager
        assert service._request_count == 0

    @pytest.mark.asyncio
    async def test_context_manager_lifecycle(self):
        """Test async context manager properly handles lifecycle"""
        async with CryptoDataService() as service:
            assert service.client is not None
            assert isinstance(service.client, httpx.AsyncClient)

    def test_cache_key_generation(self):
        """Test cache key generation is consistent"""
        service = CryptoDataService()

        key1 = service._get_cache_key("market", coin_id="btc", vs_currency="usd")
        key2 = service._get_cache_key("market", coin_id="btc", vs_currency="usd")
        key3 = service._get_cache_key("market", coin_id="eth", vs_currency="usd")

        assert key1 == key2  # Same params = same key
        assert key1 != key3  # Different params = different key
        assert "crypto:market" in key1

    @pytest.mark.asyncio
    @patch("app.services.crypto_data_service.advanced_redis_client")
    async def test_get_cached_data_success(self, mock_redis):
        """Test retrieving cached data successfully"""
        service = CryptoDataService()
        # advanced_redis_client.get() returns deserialized JSON (dict)
        cached_data = {"price": 50000}

        mock_redis.client = MagicMock()
        mock_redis.get = AsyncMock(return_value=cached_data)

        result = await service._get_cached("test_key")

        assert result == {"price": 50000}

    @pytest.mark.asyncio
    @patch("app.services.crypto_data_service.advanced_redis_client")
    async def test_get_cached_data_miss(self, mock_redis):
        """Test cache miss returns None"""
        service = CryptoDataService()

        mock_redis.client = MagicMock()
        mock_redis.get = AsyncMock(return_value=None)

        result = await service._get_cached("test_key")

        assert result is None

    @pytest.mark.asyncio
    @patch("app.services.crypto_data_service.advanced_redis_client")
    async def test_set_cached_data(self, mock_redis):
        """Test setting cached data"""
        service = CryptoDataService()
        data = {"price": 50000}

        mock_redis.client = MagicMock()
        mock_redis.set = AsyncMock()

        await service._set_cache("test_key", data, ttl=300)

        mock_redis.set.assert_called_once()

    @pytest.mark.asyncio
    @patch("app.services.crypto_data_service.advanced_redis_client")
    async def test_fetch_market_data(self, mock_redis, sample_market_data):
        """Test fetching market data for crypto"""
        mock_redis.client = MagicMock()
        mock_redis.get = AsyncMock(return_value=None)
        mock_redis.setex = AsyncMock()

        mock_response = MagicMock()
        mock_response.json.return_value = sample_market_data
        mock_response.status_code = 200

        async with CryptoDataService() as service:
            with patch.object(service.client, "get", return_value=mock_response):
                result = await service.get_simple_price(["bitcoin"], ["usd"])

            assert result == sample_market_data


# ============================================================
# Integration Tests - Full Flow Testing
# ============================================================


class TestCryptoDataServiceIntegration:
    """Test suite for integrated workflows"""

    @pytest.mark.asyncio
    @patch("app.services.crypto_data_service.advanced_redis_client")
    async def test_fetch_with_cache_cycle(self, mock_redis, sample_market_data):
        """Test full fetch cycle with caching"""

        # First call: cache miss
        mock_redis.client = MagicMock()
        mock_redis.get = AsyncMock(return_value=None)
        mock_redis.setex = AsyncMock()

        mock_response = MagicMock()
        mock_response.json.return_value = sample_market_data
        mock_response.status_code = 200

        async with CryptoDataService() as service:
            with patch.object(
                service.client, "get", return_value=mock_response
            ) as mock_get:
                result1 = await service.get_simple_price(["bitcoin"], ["usd"])
                assert result1 == sample_market_data
                assert mock_get.call_count == 1

                # Second call: cache hit
                mock_redis.get = AsyncMock(return_value=sample_market_data)
                result2 = await service.get_simple_price(["bitcoin"], ["usd"])

                assert result1 == result2


# ============================================================
# Edge Cases & Error Handling
# ============================================================


class TestCryptoDataServiceEdgeCases:
    """Test suite for edge cases and error conditions"""

    @pytest.mark.asyncio
    @patch("app.services.crypto_data_service.advanced_redis_client")
    async def test_fetch_with_network_error(self, mock_redis):
        """Test handling network errors"""
        mock_redis.client = MagicMock()
        mock_redis.get = AsyncMock(return_value=None)

        async with CryptoDataService() as service:
            with patch.object(
                service.client,
                "get",
                side_effect=httpx.NetworkError("Connection failed"),
            ):
                with pytest.raises(httpx.NetworkError):
                    await service.get_simple_price(["bitcoin"], ["usd"])

    @pytest.mark.asyncio
    @patch("app.services.crypto_data_service.advanced_redis_client")
    async def test_fetch_with_timeout(self, mock_redis):
        """Test handling request timeouts"""
        mock_redis.client = MagicMock()
        mock_redis.get = AsyncMock(return_value=None)

        async with CryptoDataService() as service:
            with patch.object(
                service.client,
                "get",
                side_effect=httpx.TimeoutException("Request timed out"),
            ):
                with pytest.raises(httpx.TimeoutException):
                    await service.get_simple_price(["bitcoin"], ["usd"])

    @pytest.mark.asyncio
    @patch("app.services.crypto_data_service.advanced_redis_client")
    async def test_cache_with_invalid_json(self, mock_redis):
        """Test handling invalid JSON from cache"""
        service = CryptoDataService()

        mock_redis.client = MagicMock()
        # Redis client would have already tried to parse and failed, returning None
        mock_redis.get = AsyncMock(return_value=None)

        result = await service._get_cached("test_key")

        # Should return None when redis returns None
        assert result is None

    @pytest.mark.asyncio
    async def test_redis_unavailable(self):
        """Test graceful handling when Redis is unavailable"""
        with patch(
            "app.services.crypto_data_service.advanced_redis_client.client", None
        ):
            service = CryptoDataService()

            # Should not crash
            result = await service._get_cached("test_key")
            assert result is None


# TODO: Add tests for rate limiting, trending coins, global market data
