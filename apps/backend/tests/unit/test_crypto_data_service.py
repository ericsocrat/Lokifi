"""
Comprehensive test suite for CryptoDataService

Coverage Target: 85%+ (151 statements)
Test Categories:
  1. Initialization & Context Manager (3 tests)
  2. Cache Operations (5 tests)
  3. Rate Limiting (4 tests)
  4. Top Coins Fetching (4 tests)
  5. Global Market Data (4 tests)
  6. Coin Details (4 tests)
  7. OHLC Data (4 tests)
  8. Simple Price (4 tests)
  9. Search & Trending (4 tests)
  10. Edge Cases & Error Handling (5 tests)

Patterns Used:
  - AsyncMock for httpx.AsyncClient and Redis client
  - Response mocking with status codes and JSON data
  - Time-based testing with freezegun/patch for rate limits
  - Cache validation with get/set verification
  - Comprehensive error scenarios (HTTP errors, timeouts, cache failures)

Session: 77 Phase 2 - Backend Test Coverage Campaign
"""

import logging
from datetime import datetime, timedelta
from typing import Any
from unittest.mock import AsyncMock, MagicMock, patch

import httpx
import pytest

from app.services.crypto_data_service import CryptoDataService


# Helper function for creating async mock responses
def create_mock_response(data: Any, status_code: int = 200):
    """Helper to create a properly mocked httpx response

    Note: httpx response.json() is NOT async, it's a regular method
    Also: response.raise_for_status() is NOT async either
    """
    mock_response = MagicMock()
    mock_response.status_code = status_code
    # json() should return data directly (not async)
    mock_response.json = lambda: data
    # raise_for_status() should be a no-op function (not async)
    mock_response.raise_for_status = lambda: None
    return mock_response


# Test fixtures


@pytest.fixture
def crypto_service():
    """Create a CryptoDataService instance for testing"""
    return CryptoDataService()


@pytest.fixture
def mock_redis_client():
    """Mock advanced_redis_client for cache operations"""
    mock_client = MagicMock()
    mock_client.client = MagicMock()  # Simulate Redis connection exists
    mock_client.get = AsyncMock(return_value=None)
    mock_client.set = AsyncMock()
    return mock_client


@pytest.fixture
def mock_httpx_client():
    """Mock httpx.AsyncClient for API requests"""
    mock_client = AsyncMock(spec=httpx.AsyncClient)
    # Support async context manager protocol
    mock_client.__aenter__ = AsyncMock(return_value=mock_client)
    mock_client.__aexit__ = AsyncMock(return_value=None)
    mock_client.aclose = AsyncMock()
    return mock_client


@pytest.fixture
def sample_top_coins_data():
    """Sample response data for top coins endpoint"""
    return [
        {
            "id": "bitcoin",
            "symbol": "btc",
            "name": "Bitcoin",
            "current_price": 50000,
            "market_cap": 1000000000000,
            "market_cap_rank": 1,
            "total_volume": 50000000000,
            "price_change_percentage_24h": 2.5,
            "sparkline_in_7d": {"price": [49000, 49500, 50000]},
        },
        {
            "id": "ethereum",
            "symbol": "eth",
            "name": "Ethereum",
            "current_price": 3000,
            "market_cap": 400000000000,
            "market_cap_rank": 2,
            "total_volume": 20000000000,
            "price_change_percentage_24h": 3.2,
            "sparkline_in_7d": {"price": [2900, 2950, 3000]},
        },
    ]


@pytest.fixture
def sample_global_data():
    """Sample response data for global market endpoint"""
    return {
        "data": {
            "total_market_cap": {"usd": 2000000000000},
            "total_volume": {"usd": 100000000000},
            "market_cap_percentage": {"btc": 45.5, "eth": 18.2},
            "market_cap_change_percentage_24h_usd": 1.5,
            "active_cryptocurrencies": 10000,
            "markets": 500,
        }
    }


@pytest.fixture
def sample_coin_details():
    """Sample response data for coin details endpoint"""
    return {
        "id": "bitcoin",
        "symbol": "btc",
        "name": "Bitcoin",
        "description": {"en": "Bitcoin is a decentralized cryptocurrency"},
        "market_data": {
            "current_price": {"usd": 50000},
            "market_cap": {"usd": 1000000000000},
            "total_volume": {"usd": 50000000000},
            "ath": {"usd": 69000},
            "atl": {"usd": 100},
        },
        "community_data": {"twitter_followers": 5000000},
    }


@pytest.fixture
def sample_ohlc_data():
    """Sample response data for OHLC endpoint"""
    return [
        [1609459200000, 29000, 29500, 28500, 29200],  # timestamp, open, high, low, close
        [1609545600000, 29200, 30000, 29000, 29800],
        [1609632000000, 29800, 30500, 29500, 30200],
    ]


@pytest.fixture
def sample_simple_price_data():
    """Sample response data for simple price endpoint"""
    return {
        "bitcoin": {
            "usd": 50000,
            "usd_24h_change": 2.5,
            "usd_24h_vol": 50000000000,
            "usd_market_cap": 1000000000000,
        },
        "ethereum": {
            "usd": 3000,
            "usd_24h_change": 3.2,
            "usd_24h_vol": 20000000000,
            "usd_market_cap": 400000000000,
        },
    }


@pytest.fixture
def sample_search_data():
    """Sample response data for search endpoint"""
    return {
        "coins": [
            {"id": "bitcoin", "symbol": "btc", "name": "Bitcoin", "market_cap_rank": 1},
            {
                "id": "bitcoin-cash",
                "symbol": "bch",
                "name": "Bitcoin Cash",
                "market_cap_rank": 25,
            },
        ]
    }


@pytest.fixture
def sample_trending_data():
    """Sample response data for trending endpoint"""
    return {
        "coins": [
            {"item": {"id": "meme-coin", "symbol": "MEME", "name": "Meme Coin"}},
            {"item": {"id": "ai-token", "symbol": "AI", "name": "AI Token"}},
        ]
    }


# Test Class 1: Initialization & Context Manager


class TestCryptoDataServiceInit:
    """Test service initialization and context manager behavior"""

    def test_init_default_state(self, crypto_service):
        """Test CryptoDataService initializes with correct default state"""
        assert crypto_service.client is None
        assert crypto_service._last_request_time is None
        assert crypto_service._request_count == 0
        assert isinstance(crypto_service._rate_limit_reset, datetime)

    @pytest.mark.asyncio
    async def test_context_manager_enter_creates_client(self, crypto_service):
        """Test __aenter__ creates httpx.AsyncClient"""
        async with crypto_service as service:
            assert service.client is not None
            assert isinstance(service.client, httpx.AsyncClient)

    @pytest.mark.asyncio
    async def test_context_manager_exit_closes_client(self, crypto_service):
        """Test __aexit__ closes httpx.AsyncClient"""
        async with crypto_service as service:
            client = service.client
            # Mock aclose to verify it's called
            client.aclose = AsyncMock()

        # After exiting context, aclose should have been called
        client.aclose.assert_awaited_once()


# Test Class 2: Cache Operations


class TestCacheOperations:
    """Test cache key generation, get, and set operations"""

    def test_get_cache_key_single_param(self, crypto_service):
        """Test cache key generation with single parameter"""
        key = crypto_service._get_cache_key("test_prefix", coin_id="bitcoin")
        assert key == "crypto:test_prefix:coin_id=bitcoin"

    def test_get_cache_key_multiple_params(self, crypto_service):
        """Test cache key generation with multiple parameters (sorted)"""
        key = crypto_service._get_cache_key("test_prefix", currency="usd", limit=100, page=1)
        # Parameters should be sorted alphabetically
        assert key == "crypto:test_prefix:currency=usd:limit=100:page=1"

    @pytest.mark.asyncio
    async def test_get_cached_returns_data(self, crypto_service, mock_redis_client):
        """Test _get_cached returns cached data when available"""
        mock_redis_client.get.return_value = {"cached": "data"}

        with patch("app.services.crypto_data_service.advanced_redis_client", mock_redis_client):
            result = await crypto_service._get_cached("test_key")
            assert result == {"cached": "data"}
            mock_redis_client.get.assert_awaited_once_with("test_key")

    @pytest.mark.asyncio
    async def test_get_cached_returns_none_on_error(self, crypto_service, mock_redis_client):
        """Test _get_cached returns None when Redis fails"""
        mock_redis_client.get.side_effect = Exception("Redis error")

        with patch("app.services.crypto_data_service.advanced_redis_client", mock_redis_client):
            result = await crypto_service._get_cached("test_key")
            assert result is None

    @pytest.mark.asyncio
    async def test_set_cache_stores_data(self, crypto_service, mock_redis_client):
        """Test _set_cache stores data in Redis with TTL"""
        data = {"test": "data"}
        ttl = 60

        with patch("app.services.crypto_data_service.advanced_redis_client", mock_redis_client):
            await crypto_service._set_cache("test_key", data, ttl)
            mock_redis_client.set.assert_awaited_once_with("test_key", data, expire=ttl)

    @pytest.mark.asyncio
    async def test_set_cache_handles_error_gracefully(self, crypto_service, mock_redis_client):
        """Test _set_cache handles Redis errors gracefully (no exception raised)"""
        mock_redis_client.set.side_effect = Exception("Redis error")

        with patch("app.services.crypto_data_service.advanced_redis_client", mock_redis_client):
            # Should not raise exception
            await crypto_service._set_cache("test_key", {"test": "data"}, 60)


# Test Class 3: Rate Limiting


class TestRateLimiting:
    """Test rate limiting behavior"""

    @pytest.mark.asyncio
    async def test_check_rate_limit_increments_counter(self, crypto_service):
        """Test _check_rate_limit increments request counter"""
        initial_count = crypto_service._request_count
        await crypto_service._check_rate_limit()
        assert crypto_service._request_count == initial_count + 1

    @pytest.mark.asyncio
    async def test_check_rate_limit_resets_after_minute(self, crypto_service):
        """Test rate limit counter resets after 1 minute"""
        crypto_service._request_count = 25
        crypto_service._rate_limit_reset = datetime.now() - timedelta(seconds=1)

        await crypto_service._check_rate_limit()

        # Counter should reset to 1 (incremented from 0)
        assert crypto_service._request_count == 1
        assert crypto_service._rate_limit_reset > datetime.now()

    @pytest.mark.asyncio
    async def test_check_rate_limit_with_api_key(self, crypto_service):
        """Test rate limit allows 30 requests/min with API key"""
        with patch("app.services.crypto_data_service.settings") as mock_settings:
            mock_settings.COINGECKO_KEY = "test_api_key"

            # Simulate 29 requests and set rate limit reset to future
            crypto_service._request_count = 29
            crypto_service._rate_limit_reset = datetime.now() + timedelta(minutes=1)
            await crypto_service._check_rate_limit()

            # Should allow 30th request (counter incremented to 30)
            assert crypto_service._request_count == 30

    @pytest.mark.asyncio
    async def test_check_rate_limit_without_api_key(self, crypto_service):
        """Test rate limit allows 10 requests/min without API key"""
        with patch("app.services.crypto_data_service.settings") as mock_settings:
            mock_settings.COINGECKO_KEY = None

            # Simulate 9 requests and set rate limit reset to future
            crypto_service._request_count = 9
            crypto_service._rate_limit_reset = datetime.now() + timedelta(minutes=1)
            await crypto_service._check_rate_limit()

            # Should allow 10th request (counter incremented to 10)
            assert crypto_service._request_count == 10


# Test Class 4: Top Coins Fetching


class TestGetTopCoins:
    """Test get_top_coins method"""

    @pytest.mark.asyncio
    async def test_get_top_coins_returns_cached_data(
        self, crypto_service, mock_redis_client, sample_top_coins_data
    ):
        """Test get_top_coins returns cached data when available"""
        mock_redis_client.get.return_value = sample_top_coins_data

        with patch("app.services.crypto_data_service.advanced_redis_client", mock_redis_client):
            result = await crypto_service.get_top_coins(limit=100)
            assert result == sample_top_coins_data
            mock_redis_client.get.assert_awaited_once()

    @pytest.mark.asyncio
    async def test_get_top_coins_fetches_from_api(
        self, crypto_service, mock_httpx_client, mock_redis_client, sample_top_coins_data
    ):
        """Test get_top_coins fetches from API when cache miss"""
        mock_redis_client.get.return_value = None
        mock_httpx_client.get = AsyncMock(return_value=create_mock_response(sample_top_coins_data))

        with (
            patch("app.services.crypto_data_service.advanced_redis_client", mock_redis_client),
            patch("httpx.AsyncClient", return_value=mock_httpx_client),
        ):
            result = await crypto_service.get_top_coins(limit=100)
            assert result == sample_top_coins_data
            mock_redis_client.set.assert_awaited_once()

    @pytest.mark.asyncio
    async def test_get_top_coins_with_custom_params(
        self, crypto_service, mock_httpx_client, mock_redis_client, sample_top_coins_data
    ):
        """Test get_top_coins with custom parameters"""
        mock_redis_client.get.return_value = None
        mock_httpx_client.get = AsyncMock(return_value=create_mock_response(sample_top_coins_data))

        with (
            patch("app.services.crypto_data_service.advanced_redis_client", mock_redis_client),
            patch("httpx.AsyncClient", return_value=mock_httpx_client),
        ):
            result = await crypto_service.get_top_coins(limit=50, vs_currency="eur")
            assert result == sample_top_coins_data

            # Verify API was called with correct params
            call_args = mock_httpx_client.get.call_args
            params = call_args.kwargs["params"]
            assert params["vs_currency"] == "eur"
            assert params["per_page"] == 50

    @pytest.mark.asyncio
    async def test_get_top_coins_force_refresh(
        self, crypto_service, mock_httpx_client, mock_redis_client, sample_top_coins_data
    ):
        """Test get_top_coins with force_refresh bypasses cache"""
        # Set cached data (should be ignored)
        mock_redis_client.get.return_value = {"cached": "data"}
        mock_httpx_client.get = AsyncMock(return_value=create_mock_response(sample_top_coins_data))

        with (
            patch("app.services.crypto_data_service.advanced_redis_client", mock_redis_client),
            patch("httpx.AsyncClient", return_value=mock_httpx_client),
        ):
            result = await crypto_service.get_top_coins(force_refresh=True)
            assert result == sample_top_coins_data

            # Verify cache was not checked (force refresh)
            mock_redis_client.get.assert_not_awaited()


# Test Class 5: Global Market Data


class TestGetGlobalMarketData:
    """Test get_global_market_data method"""

    @pytest.mark.asyncio
    async def test_get_global_market_data_returns_cached(self, crypto_service, mock_redis_client):
        """Test get_global_market_data returns cached data"""
        cached_data = {"total_market_cap": 2000000000000}
        mock_redis_client.get.return_value = cached_data

        with patch("app.services.crypto_data_service.advanced_redis_client", mock_redis_client):
            result = await crypto_service.get_global_market_data()
            assert result == cached_data

    @pytest.mark.asyncio
    async def test_get_global_market_data_formats_response(
        self, crypto_service, mock_httpx_client, mock_redis_client, sample_global_data
    ):
        """Test get_global_market_data formats API response correctly"""
        mock_redis_client.get.return_value = None
        mock_httpx_client.get = AsyncMock(return_value=create_mock_response(sample_global_data))

        with (
            patch("app.services.crypto_data_service.advanced_redis_client", mock_redis_client),
            patch("httpx.AsyncClient", return_value=mock_httpx_client),
        ):
            result = await crypto_service.get_global_market_data()

            assert result["total_market_cap"] == 2000000000000
            assert result["total_volume_24h"] == 100000000000
            assert result["bitcoin_dominance"] == 45.5
            assert result["ethereum_dominance"] == 18.2
            assert result["market_cap_change_24h"] == 1.5
            assert result["active_coins"] == 10000
            assert result["markets"] == 500
            assert result["market_sentiment"] == 70  # Placeholder

    @pytest.mark.asyncio
    async def test_get_global_market_data_handles_empty_response(
        self, crypto_service, mock_httpx_client, mock_redis_client
    ):
        """Test get_global_market_data returns empty dict for invalid response"""
        mock_redis_client.get.return_value = None
        # No "data" key in response
        mock_httpx_client.get = AsyncMock(return_value=create_mock_response({}))

        with (
            patch("app.services.crypto_data_service.advanced_redis_client", mock_redis_client),
            patch("httpx.AsyncClient", return_value=mock_httpx_client),
        ):
            result = await crypto_service.get_global_market_data()
            assert result == {}

    @pytest.mark.asyncio
    async def test_get_global_market_data_caches_formatted_data(
        self, crypto_service, mock_httpx_client, mock_redis_client, sample_global_data
    ):
        """Test get_global_market_data caches the formatted data"""
        mock_redis_client.get.return_value = None
        mock_httpx_client.get = AsyncMock(return_value=create_mock_response(sample_global_data))

        with (
            patch("app.services.crypto_data_service.advanced_redis_client", mock_redis_client),
            patch("httpx.AsyncClient", return_value=mock_httpx_client),
        ):
            await crypto_service.get_global_market_data()

            # Verify formatted data was cached
            mock_redis_client.set.assert_awaited_once()
            cached_data = mock_redis_client.set.call_args.args[1]
            assert "total_market_cap" in cached_data
            assert "bitcoin_dominance" in cached_data


# Test Class 6: Coin Details


class TestGetCoinDetails:
    """Test get_coin_details method"""

    @pytest.mark.asyncio
    async def test_get_coin_details_returns_cached(
        self, crypto_service, mock_redis_client, sample_coin_details
    ):
        """Test get_coin_details returns cached data"""
        mock_redis_client.get.return_value = sample_coin_details

        with patch("app.services.crypto_data_service.advanced_redis_client", mock_redis_client):
            result = await crypto_service.get_coin_details("bitcoin")
            assert result == sample_coin_details

    @pytest.mark.asyncio
    async def test_get_coin_details_fetches_from_api(
        self, crypto_service, mock_httpx_client, mock_redis_client, sample_coin_details
    ):
        """Test get_coin_details fetches from API when cache miss"""
        mock_redis_client.get.return_value = None
        mock_httpx_client.get = AsyncMock(return_value=create_mock_response(sample_coin_details))

        with (
            patch("app.services.crypto_data_service.advanced_redis_client", mock_redis_client),
            patch("httpx.AsyncClient", return_value=mock_httpx_client),
        ):
            result = await crypto_service.get_coin_details("bitcoin")
            assert result == sample_coin_details
            mock_redis_client.set.assert_awaited_once()

    @pytest.mark.asyncio
    async def test_get_coin_details_with_correct_params(
        self, crypto_service, mock_httpx_client, mock_redis_client, sample_coin_details
    ):
        """Test get_coin_details calls API with correct parameters"""
        mock_redis_client.get.return_value = None
        mock_httpx_client.get = AsyncMock(return_value=create_mock_response(sample_coin_details))

        with (
            patch("app.services.crypto_data_service.advanced_redis_client", mock_redis_client),
            patch("httpx.AsyncClient", return_value=mock_httpx_client),
        ):
            await crypto_service.get_coin_details("bitcoin")

            # Verify API endpoint and params
            call_args = mock_httpx_client.get.call_args
            assert "coins/bitcoin" in call_args.args[0]
            params = call_args.kwargs["params"]
            assert params["localization"] == "false"
            assert params["market_data"] == "true"
            assert params["community_data"] == "true"

    @pytest.mark.asyncio
    async def test_get_coin_details_force_refresh(
        self, crypto_service, mock_httpx_client, mock_redis_client, sample_coin_details
    ):
        """Test get_coin_details bypasses cache with force_refresh"""
        mock_redis_client.get.return_value = {"old": "data"}
        mock_httpx_client.get = AsyncMock(return_value=create_mock_response(sample_coin_details))

        with (
            patch("app.services.crypto_data_service.advanced_redis_client", mock_redis_client),
            patch("httpx.AsyncClient", return_value=mock_httpx_client),
        ):
            result = await crypto_service.get_coin_details("bitcoin", force_refresh=True)
            assert result == sample_coin_details
            mock_redis_client.get.assert_not_awaited()


# Test Class 7: OHLC Data


class TestGetCoinOHLC:
    """Test get_coin_ohlc method"""

    @pytest.mark.asyncio
    async def test_get_coin_ohlc_returns_cached(
        self, crypto_service, mock_redis_client, sample_ohlc_data
    ):
        """Test get_coin_ohlc returns cached formatted data"""
        formatted_data = [
            {
                "timestamp": candle[0],
                "open": candle[1],
                "high": candle[2],
                "low": candle[3],
                "close": candle[4],
            }
            for candle in sample_ohlc_data
        ]
        mock_redis_client.get.return_value = formatted_data

        with patch("app.services.crypto_data_service.advanced_redis_client", mock_redis_client):
            result = await crypto_service.get_coin_ohlc("bitcoin")
            assert result == formatted_data

    @pytest.mark.asyncio
    async def test_get_coin_ohlc_formats_response(
        self, crypto_service, mock_httpx_client, mock_redis_client, sample_ohlc_data
    ):
        """Test get_coin_ohlc formats OHLC data correctly"""
        mock_redis_client.get.return_value = None
        mock_httpx_client.get = AsyncMock(return_value=create_mock_response(sample_ohlc_data))

        with (
            patch("app.services.crypto_data_service.advanced_redis_client", mock_redis_client),
            patch("httpx.AsyncClient", return_value=mock_httpx_client),
        ):
            result = await crypto_service.get_coin_ohlc("bitcoin", days=7)

            assert len(result) == 3
            assert result[0]["timestamp"] == 1609459200000
            assert result[0]["open"] == 29000
            assert result[0]["high"] == 29500
            assert result[0]["low"] == 28500
            assert result[0]["close"] == 29200

    @pytest.mark.asyncio
    async def test_get_coin_ohlc_with_custom_params(
        self, crypto_service, mock_httpx_client, mock_redis_client, sample_ohlc_data
    ):
        """Test get_coin_ohlc with custom currency and days"""
        mock_redis_client.get.return_value = None
        mock_httpx_client.get = AsyncMock(return_value=create_mock_response(sample_ohlc_data))

        with (
            patch("app.services.crypto_data_service.advanced_redis_client", mock_redis_client),
            patch("httpx.AsyncClient", return_value=mock_httpx_client),
        ):
            await crypto_service.get_coin_ohlc("ethereum", vs_currency="eur", days=30)

            # Verify API params
            call_args = mock_httpx_client.get.call_args
            params = call_args.kwargs["params"]
            assert params["vs_currency"] == "eur"
            assert params["days"] == 30

    @pytest.mark.asyncio
    async def test_get_coin_ohlc_caches_formatted_data(
        self, crypto_service, mock_httpx_client, mock_redis_client, sample_ohlc_data
    ):
        """Test get_coin_ohlc caches formatted data (not raw)"""
        mock_redis_client.get.return_value = None
        mock_httpx_client.get = AsyncMock(return_value=create_mock_response(sample_ohlc_data))

        with (
            patch("app.services.crypto_data_service.advanced_redis_client", mock_redis_client),
            patch("httpx.AsyncClient", return_value=mock_httpx_client),
        ):
            await crypto_service.get_coin_ohlc("bitcoin")

            # Verify formatted data was cached
            mock_redis_client.set.assert_awaited_once()
            cached_data = mock_redis_client.set.call_args.args[1]
            assert isinstance(cached_data, list)
            assert "timestamp" in cached_data[0]
            assert "open" in cached_data[0]


# Test Class 8: Simple Price


class TestGetSimplePrice:
    """Test get_simple_price method"""

    @pytest.mark.asyncio
    async def test_get_simple_price_returns_cached(
        self, crypto_service, mock_redis_client, sample_simple_price_data
    ):
        """Test get_simple_price returns cached data"""
        mock_redis_client.get.return_value = sample_simple_price_data

        with patch("app.services.crypto_data_service.advanced_redis_client", mock_redis_client):
            result = await crypto_service.get_simple_price(["bitcoin", "ethereum"])
            assert result == sample_simple_price_data

    @pytest.mark.asyncio
    async def test_get_simple_price_multiple_coins(
        self,
        crypto_service,
        mock_httpx_client,
        mock_redis_client,
        sample_simple_price_data,
    ):
        """Test get_simple_price fetches data for multiple coins"""
        mock_redis_client.get.return_value = None
        mock_httpx_client.get = AsyncMock(
            return_value=create_mock_response(sample_simple_price_data)
        )

        with (
            patch("app.services.crypto_data_service.advanced_redis_client", mock_redis_client),
            patch("httpx.AsyncClient", return_value=mock_httpx_client),
        ):
            result = await crypto_service.get_simple_price(["bitcoin", "ethereum"])
            assert result == sample_simple_price_data

    @pytest.mark.asyncio
    async def test_get_simple_price_with_multiple_currencies(
        self,
        crypto_service,
        mock_httpx_client,
        mock_redis_client,
        sample_simple_price_data,
    ):
        """Test get_simple_price with multiple vs_currencies"""
        mock_redis_client.get.return_value = None
        mock_httpx_client.get = AsyncMock(
            return_value=create_mock_response(sample_simple_price_data)
        )

        with (
            patch("app.services.crypto_data_service.advanced_redis_client", mock_redis_client),
            patch("httpx.AsyncClient", return_value=mock_httpx_client),
        ):
            await crypto_service.get_simple_price(["bitcoin"], vs_currencies=["usd", "eur", "gbp"])

            # Verify API params
            call_args = mock_httpx_client.get.call_args
            params = call_args.kwargs["params"]
            assert params["ids"] == "bitcoin"
            assert params["vs_currencies"] == "usd,eur,gbp"
            assert params["include_24hr_change"] == "true"

    @pytest.mark.asyncio
    async def test_get_simple_price_defaults_to_usd(
        self,
        crypto_service,
        mock_httpx_client,
        mock_redis_client,
        sample_simple_price_data,
    ):
        """Test get_simple_price defaults to USD when vs_currencies omitted"""
        mock_redis_client.get.return_value = None
        mock_httpx_client.get = AsyncMock(
            return_value=create_mock_response(sample_simple_price_data)
        )

        with (
            patch("app.services.crypto_data_service.advanced_redis_client", mock_redis_client),
            patch("httpx.AsyncClient", return_value=mock_httpx_client),
        ):
            await crypto_service.get_simple_price(["bitcoin"])

            # Verify default currency is USD
            call_args = mock_httpx_client.get.call_args
            params = call_args.kwargs["params"]
            assert params["vs_currencies"] == "usd"


# Test Class 9: Search & Trending


class TestSearchAndTrending:
    """Test search_coins and get_trending methods"""

    @pytest.mark.asyncio
    async def test_search_coins_fetches_from_api(
        self, crypto_service, mock_httpx_client, mock_redis_client, sample_search_data
    ):
        """Test search_coins fetches from API (no cache for search)"""
        mock_httpx_client.get = AsyncMock(return_value=create_mock_response(sample_search_data))

        with (
            patch("app.services.crypto_data_service.advanced_redis_client", mock_redis_client),
            patch("httpx.AsyncClient", return_value=mock_httpx_client),
        ):
            result = await crypto_service.search_coins("bitcoin")
            assert result == sample_search_data

            # Verify search query parameter
            call_args = mock_httpx_client.get.call_args
            params = call_args.kwargs["params"]
            assert params["query"] == "bitcoin"

    @pytest.mark.asyncio
    async def test_search_coins_does_not_cache(
        self, crypto_service, mock_httpx_client, mock_redis_client, sample_search_data
    ):
        """Test search_coins does not cache results (query-specific)"""
        mock_httpx_client.get = AsyncMock(return_value=create_mock_response(sample_search_data))

        with (
            patch("app.services.crypto_data_service.advanced_redis_client", mock_redis_client),
            patch("httpx.AsyncClient", return_value=mock_httpx_client),
        ):
            await crypto_service.search_coins("bitcoin")

            # Cache set should NOT be called
            mock_redis_client.set.assert_not_awaited()

    @pytest.mark.asyncio
    async def test_get_trending_returns_cached(
        self, crypto_service, mock_redis_client, sample_trending_data
    ):
        """Test get_trending returns cached data"""
        mock_redis_client.get.return_value = sample_trending_data

        with patch("app.services.crypto_data_service.advanced_redis_client", mock_redis_client):
            result = await crypto_service.get_trending()
            assert result == sample_trending_data

    @pytest.mark.asyncio
    async def test_get_trending_fetches_from_api(
        self, crypto_service, mock_httpx_client, mock_redis_client, sample_trending_data
    ):
        """Test get_trending fetches from API when cache miss"""
        mock_redis_client.get.return_value = None
        mock_httpx_client.get = AsyncMock(return_value=create_mock_response(sample_trending_data))

        with (
            patch("app.services.crypto_data_service.advanced_redis_client", mock_redis_client),
            patch("httpx.AsyncClient", return_value=mock_httpx_client),
        ):
            result = await crypto_service.get_trending()
            assert result == sample_trending_data
            mock_redis_client.set.assert_awaited_once()


# Test Class 10: Edge Cases & Error Handling


class TestEdgeCasesAndErrors:
    """Test edge cases and error handling"""

    @pytest.mark.asyncio
    async def test_fetch_from_api_adds_api_key_if_configured(
        self, crypto_service, mock_httpx_client, mock_redis_client
    ):
        """Test _fetch_from_api adds API key to params when configured"""
        mock_httpx_client.get = AsyncMock(return_value=create_mock_response({"test": "data"}))

        with (
            patch("app.services.crypto_data_service.settings") as mock_settings,
            patch("app.services.crypto_data_service.advanced_redis_client", mock_redis_client),
            patch("httpx.AsyncClient", return_value=mock_httpx_client),
        ):
            mock_settings.COINGECKO_KEY = "test_api_key_12345"

            await crypto_service._fetch_from_api("test/endpoint", {"param": "value"})

            # Verify API key was added to params
            call_args = mock_httpx_client.get.call_args
            params = call_args.kwargs["params"]
            assert params["x_cg_demo_api_key"] == "test_api_key_12345"

    @pytest.mark.asyncio
    async def test_fetch_from_api_handles_429_rate_limit(self, crypto_service, mock_httpx_client):
        """Test _fetch_from_api handles 429 rate limit error"""
        mock_response = MagicMock()
        mock_response.status_code = 429
        mock_response.raise_for_status.side_effect = httpx.HTTPStatusError(
            "Rate limit exceeded", request=MagicMock(), response=mock_response
        )
        mock_httpx_client.get.return_value = mock_response

        with (
            patch("httpx.AsyncClient", return_value=mock_httpx_client),
            pytest.raises(httpx.HTTPStatusError),
        ):
            await crypto_service._fetch_from_api("test/endpoint")

    @pytest.mark.asyncio
    async def test_fetch_from_api_handles_http_errors(self, crypto_service, mock_httpx_client):
        """Test _fetch_from_api handles general HTTP errors"""
        mock_response = MagicMock()
        mock_response.status_code = 500
        mock_response.raise_for_status.side_effect = httpx.HTTPStatusError(
            "Server error", request=MagicMock(), response=mock_response
        )
        mock_httpx_client.get.return_value = mock_response

        with (
            patch("httpx.AsyncClient", return_value=mock_httpx_client),
            pytest.raises(httpx.HTTPStatusError),
        ):
            await crypto_service._fetch_from_api("test/endpoint")

    @pytest.mark.asyncio
    async def test_fetch_from_api_handles_network_errors(self, crypto_service, mock_httpx_client):
        """Test _fetch_from_api handles network/timeout errors"""
        mock_httpx_client.get.side_effect = httpx.ConnectError("Connection failed")

        with (
            patch("httpx.AsyncClient", return_value=mock_httpx_client),
            pytest.raises(httpx.ConnectError),
        ):
            await crypto_service._fetch_from_api("test/endpoint")

    @pytest.mark.asyncio
    async def test_context_manager_without_client(
        self, crypto_service, mock_httpx_client, mock_redis_client, sample_top_coins_data
    ):
        """Test methods work without client (creates temporary client)"""
        # Service without client (not in context manager)
        assert crypto_service.client is None

        mock_redis_client.get.return_value = None
        mock_httpx_client.get = AsyncMock(return_value=create_mock_response(sample_top_coins_data))

        with (
            patch("app.services.crypto_data_service.advanced_redis_client", mock_redis_client),
            patch("httpx.AsyncClient", return_value=mock_httpx_client),
        ):
            # Should create temporary client and work
            result = await crypto_service.get_top_coins()
            assert result == sample_top_coins_data
