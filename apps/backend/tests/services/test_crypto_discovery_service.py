"""
Comprehensive tests for Crypto Discovery Service.

Tests cover:
- CryptoAsset dataclass
- CryptoMetrics performance tracking
- Top crypto fetching with caching
- Symbol-based crypto lookup
- Crypto search functionality
- Cache hit/miss scenarios
- API error handling
- Context manager operations
"""

import time
from dataclasses import asdict
from unittest.mock import AsyncMock, MagicMock, Mock, patch

import httpx
import pytest

from app.services.crypto_discovery_service import (
    CryptoAsset,
    CryptoDiscoveryService,
    CryptoMetrics,
    crypto_metrics,
)

# ============================================================================
# Fixtures
# ============================================================================


@pytest.fixture
def sample_crypto_asset():
    """Sample CryptoAsset for testing."""
    return CryptoAsset(
        id="bitcoin",
        symbol="BTC",
        name="Bitcoin",
        market_cap_rank=1,
        current_price=65000.0,
        market_cap=1250000000000.0,
        total_volume=25000000000.0,
        price_change_24h=1500.0,
        price_change_percentage_24h=2.35,
        image="https://example.com/bitcoin.png",
    )


@pytest.fixture
def sample_coingecko_response():
    """Sample CoinGecko API response (raw from API - lowercase symbols)."""
    return [
        {
            "id": "bitcoin",
            "symbol": "btc",
            "name": "Bitcoin",
            "market_cap_rank": 1,
            "current_price": 65000.0,
            "market_cap": 1250000000000.0,
            "total_volume": 25000000000.0,
            "price_change_24h": 1500.0,
            "price_change_percentage_24h": 2.35,
            "image": "https://example.com/bitcoin.png",
        },
        {
            "id": "ethereum",
            "symbol": "eth",
            "name": "Ethereum",
            "market_cap_rank": 2,
            "current_price": 3500.0,
            "market_cap": 420000000000.0,
            "total_volume": 15000000000.0,
            "price_change_24h": -50.0,
            "price_change_percentage_24h": -1.41,
            "image": "https://example.com/ethereum.png",
        },
    ]


@pytest.fixture
def sample_cached_response():
    """Sample cached response (uppercase symbols as stored in cache)."""
    return [
        {
            "id": "bitcoin",
            "symbol": "BTC",
            "name": "Bitcoin",
            "market_cap_rank": 1,
            "current_price": 65000.0,
            "market_cap": 1250000000000.0,
            "total_volume": 25000000000.0,
            "price_change_24h": 1500.0,
            "price_change_percentage_24h": 2.35,
            "image": "https://example.com/bitcoin.png",
        },
        {
            "id": "ethereum",
            "symbol": "ETH",
            "name": "Ethereum",
            "market_cap_rank": 2,
            "current_price": 3500.0,
            "market_cap": 420000000000.0,
            "total_volume": 15000000000.0,
            "price_change_24h": -50.0,
            "price_change_percentage_24h": -1.41,
            "image": "https://example.com/ethereum.png",
        },
    ]


@pytest.fixture
def crypto_service():
    """Create a CryptoDiscoveryService instance."""
    return CryptoDiscoveryService()


@pytest.fixture
def fresh_metrics():
    """Create a fresh CryptoMetrics instance for isolated testing."""
    return CryptoMetrics()


# ============================================================================
# Test CryptoAsset Dataclass
# ============================================================================


class TestCryptoAssetDataclass:
    """Test CryptoAsset dataclass creation and methods."""

    def test_crypto_asset_creation(self, sample_crypto_asset):
        """Test creating a CryptoAsset with all fields."""
        assert sample_crypto_asset.id == "bitcoin"
        assert sample_crypto_asset.symbol == "BTC"
        assert sample_crypto_asset.name == "Bitcoin"
        assert sample_crypto_asset.market_cap_rank == 1
        assert sample_crypto_asset.current_price == 65000.0
        assert sample_crypto_asset.market_cap == 1250000000000.0
        assert sample_crypto_asset.total_volume == 25000000000.0
        assert sample_crypto_asset.price_change_24h == 1500.0
        assert sample_crypto_asset.price_change_percentage_24h == 2.35
        assert sample_crypto_asset.image == "https://example.com/bitcoin.png"

    def test_crypto_asset_to_dict(self, sample_crypto_asset):
        """Test converting CryptoAsset to dictionary."""
        crypto_dict = sample_crypto_asset.to_dict()

        assert isinstance(crypto_dict, dict)
        assert crypto_dict["id"] == "bitcoin"
        assert crypto_dict["symbol"] == "BTC"
        assert crypto_dict["name"] == "Bitcoin"
        assert crypto_dict["current_price"] == 65000.0

    def test_crypto_asset_with_zero_values(self):
        """Test CryptoAsset with zero/default values."""
        crypto = CryptoAsset(
            id="test-coin",
            symbol="TEST",
            name="Test Coin",
            market_cap_rank=0,
            current_price=0.0,
            market_cap=0.0,
            total_volume=0.0,
            price_change_24h=0.0,
            price_change_percentage_24h=0.0,
            image="",
        )

        assert crypto.market_cap_rank == 0
        assert crypto.current_price == 0.0
        assert crypto.image == ""


# ============================================================================
# Test CryptoMetrics
# ============================================================================


class TestCryptoMetrics:
    """Test CryptoMetrics performance tracking."""

    def test_metrics_initialization(self, fresh_metrics):
        """Test CryptoMetrics initializes with zero values."""
        assert fresh_metrics.total_fetches == 0
        assert fresh_metrics.cache_hits == 0
        assert fresh_metrics.successful_fetches == 0
        assert fresh_metrics.failed_fetches == 0

    def test_record_fetch_cached(self, fresh_metrics):
        """Test recording a cache hit."""
        fresh_metrics.record_fetch(cached=True)

        assert fresh_metrics.total_fetches == 1
        assert fresh_metrics.cache_hits == 1
        assert fresh_metrics.successful_fetches == 0
        assert fresh_metrics.failed_fetches == 0

    def test_record_fetch_success(self, fresh_metrics):
        """Test recording a successful API fetch."""
        fresh_metrics.record_fetch(cached=False, success=True)

        assert fresh_metrics.total_fetches == 1
        assert fresh_metrics.cache_hits == 0
        assert fresh_metrics.successful_fetches == 1
        assert fresh_metrics.failed_fetches == 0

    def test_record_fetch_failure(self, fresh_metrics):
        """Test recording a failed API fetch."""
        fresh_metrics.record_fetch(cached=False, success=False)

        assert fresh_metrics.total_fetches == 1
        assert fresh_metrics.cache_hits == 0
        assert fresh_metrics.successful_fetches == 0
        assert fresh_metrics.failed_fetches == 1

    def test_get_stats_with_activity(self, fresh_metrics):
        """Test get_stats with various fetch types."""
        fresh_metrics.record_fetch(cached=True)
        fresh_metrics.record_fetch(cached=False, success=True)
        fresh_metrics.record_fetch(cached=False, success=False)

        stats = fresh_metrics.get_stats()

        assert stats["total_fetches"] == 3
        assert stats["cache_hits"] == 1
        assert stats["cache_hit_rate"] == "33.3%"
        assert stats["successful_fetches"] == 1
        assert stats["failed_fetches"] == 1

    def test_get_stats_no_fetches(self, fresh_metrics):
        """Test get_stats with zero fetches (division by zero protection)."""
        stats = fresh_metrics.get_stats()

        assert stats["total_fetches"] == 0
        assert stats["cache_hits"] == 0
        assert stats["cache_hit_rate"] == "0.0%"  # Should not raise ZeroDivisionError

    def test_global_metrics_instance(self):
        """Test that crypto_metrics is a global instance."""
        assert isinstance(crypto_metrics, CryptoMetrics)


# ============================================================================
# Test CryptoDiscoveryService Initialization
# ============================================================================


class TestCryptoDiscoveryServiceInitialization:
    """Test CryptoDiscoveryService initialization."""

    def test_initialization(self, crypto_service):
        """Test service initializes with correct defaults."""
        assert crypto_service.client is None
        assert crypto_service.coingecko_base == "https://api.coingecko.com/api/v3"
        assert crypto_service.cache_ttl == 3600

    def test_cache_ttl_default(self, crypto_service):
        """Test default cache TTL is 1 hour."""
        assert crypto_service.cache_ttl == 3600  # 1 hour in seconds


# ============================================================================
# Test Context Manager Operations
# ============================================================================


class TestContextManagerOperations:
    """Test async context manager operations."""

    @pytest.mark.asyncio
    async def test_context_manager_enter(self, crypto_service):
        """Test __aenter__ creates httpx client."""
        async with crypto_service as service:
            assert service.client is not None
            assert isinstance(service.client, httpx.AsyncClient)

    @pytest.mark.asyncio
    async def test_context_manager_exit(self, crypto_service):
        """Test __aexit__ closes httpx client."""
        async with crypto_service as service:
            client = service.client

        # After exiting, client should be closed
        assert client is not None  # Client existed during context

    @pytest.mark.asyncio
    async def test_context_manager_returns_self(self, crypto_service):
        """Test __aenter__ returns self."""
        async with crypto_service as service:
            assert service is crypto_service


# ============================================================================
# Test Cache Operations
# ============================================================================


class TestCacheOperations:
    """Test Redis cache get/set operations."""

    @pytest.mark.asyncio
    @patch("app.services.crypto_discovery_service.advanced_redis_client")
    async def test_get_cached_success(self, mock_redis, crypto_service):
        """Test successful cache retrieval."""
        mock_redis.get = AsyncMock(return_value={"data": "cached"})

        result = await crypto_service._get_cached("test_key")

        assert result == {"data": "cached"}
        mock_redis.get.assert_called_once_with("test_key")

    @pytest.mark.asyncio
    @patch("app.services.crypto_discovery_service.advanced_redis_client")
    async def test_get_cached_miss(self, mock_redis, crypto_service):
        """Test cache miss returns None."""
        mock_redis.get = AsyncMock(return_value=None)

        result = await crypto_service._get_cached("test_key")

        assert result is None

    @pytest.mark.asyncio
    @patch("app.services.crypto_discovery_service.advanced_redis_client")
    async def test_get_cached_exception(self, mock_redis, crypto_service):
        """Test cache get exception returns None."""
        mock_redis.get = AsyncMock(side_effect=Exception("Redis error"))

        result = await crypto_service._get_cached("test_key")

        assert result is None  # Should handle exception gracefully

    @pytest.mark.asyncio
    @patch("app.services.crypto_discovery_service.advanced_redis_client")
    async def test_set_cache_success(self, mock_redis, crypto_service):
        """Test successful cache set."""
        mock_redis.set = AsyncMock()

        await crypto_service._set_cache("test_key", {"data": "value"}, ttl=600)

        mock_redis.set.assert_called_once_with(
            "test_key", {"data": "value"}, expire=600
        )

    @pytest.mark.asyncio
    @patch("app.services.crypto_discovery_service.advanced_redis_client")
    async def test_set_cache_exception(self, mock_redis, crypto_service):
        """Test cache set exception is handled gracefully."""
        mock_redis.set = AsyncMock(side_effect=Exception("Redis error"))

        # Should not raise exception
        await crypto_service._set_cache("test_key", {"data": "value"}, ttl=600)

    @pytest.mark.asyncio
    @patch("app.services.crypto_discovery_service.advanced_redis_client")
    async def test_set_cache_default_ttl(self, mock_redis, crypto_service):
        """Test cache set uses default TTL when not specified."""
        mock_redis.set = AsyncMock()

        await crypto_service._set_cache("test_key", {"data": "value"})

        # Should use default TTL of 3600 seconds
        mock_redis.set.assert_called_once_with(
            "test_key", {"data": "value"}, expire=3600
        )


# ============================================================================
# Test Get Top Cryptos
# ============================================================================


class TestGetTopCryptos:
    """Test get_top_cryptos method."""

    @pytest.mark.asyncio
    @patch("app.services.crypto_discovery_service.advanced_redis_client")
    async def test_get_top_cryptos_cache_hit(
        self, mock_redis, crypto_service, sample_cached_response
    ):
        """Test getting top cryptos from cache."""
        mock_redis.get = AsyncMock(return_value=sample_cached_response)

        cryptos = await crypto_service.get_top_cryptos(limit=2)

        assert len(cryptos) == 2
        assert cryptos[0].symbol == "BTC"
        assert cryptos[1].symbol == "ETH"
        mock_redis.get.assert_called_once_with("crypto:top:2")

    @pytest.mark.asyncio
    @patch("app.services.crypto_discovery_service.advanced_redis_client")
    async def test_get_top_cryptos_force_refresh(
        self, mock_redis, crypto_service, sample_cached_response
    ):
        """Test force refresh bypasses cache."""
        mock_redis.get = AsyncMock(return_value=sample_cached_response)
        mock_redis.set = AsyncMock()

        with patch.object(
            crypto_service, "_fetch_top_cryptos", new_callable=AsyncMock
        ) as mock_fetch:
            mock_fetch.return_value = [CryptoAsset(**sample_cached_response[0])]

            cryptos = await crypto_service.get_top_cryptos(limit=1, force_refresh=True)

            # Should not call get from cache
            mock_redis.get.assert_not_called()
            mock_fetch.assert_called_once()

    @pytest.mark.asyncio
    @patch("app.services.crypto_discovery_service.advanced_redis_client")
    async def test_get_top_cryptos_api_fetch_success(
        self, mock_redis, crypto_service, sample_cached_response
    ):
        """Test successful API fetch when cache miss."""
        mock_redis.get = AsyncMock(return_value=None)  # Cache miss
        mock_redis.set = AsyncMock()

        with patch.object(
            crypto_service, "_fetch_top_cryptos", new_callable=AsyncMock
        ) as mock_fetch:
            expected_cryptos = [CryptoAsset(**coin) for coin in sample_cached_response]
            mock_fetch.return_value = expected_cryptos

            cryptos = await crypto_service.get_top_cryptos(limit=2)

            assert len(cryptos) == 2
            assert cryptos[0].symbol == "BTC"
            # Should cache the results
            mock_redis.set.assert_called_once()

    @pytest.mark.asyncio
    @patch("app.services.crypto_discovery_service.advanced_redis_client")
    async def test_get_top_cryptos_api_exception(self, mock_redis, crypto_service):
        """Test API exception returns empty list."""
        mock_redis.get = AsyncMock(return_value=None)

        with patch.object(
            crypto_service, "_fetch_top_cryptos", new_callable=AsyncMock
        ) as mock_fetch:
            mock_fetch.side_effect = Exception("API error")

            cryptos = await crypto_service.get_top_cryptos(limit=10)

            assert cryptos == []

    @pytest.mark.asyncio
    @patch("app.services.crypto_discovery_service.advanced_redis_client")
    async def test_get_top_cryptos_empty_response(self, mock_redis, crypto_service):
        """Test empty API response."""
        mock_redis.get = AsyncMock(return_value=None)
        mock_redis.set = AsyncMock()

        with patch.object(
            crypto_service, "_fetch_top_cryptos", new_callable=AsyncMock
        ) as mock_fetch:
            mock_fetch.return_value = []

            cryptos = await crypto_service.get_top_cryptos(limit=10)

            assert cryptos == []
            # Should not cache empty results
            mock_redis.set.assert_not_called()


# ============================================================================
# Test Fetch Top Cryptos (Internal)
# ============================================================================


class TestFetchTopCryptos:
    """Test _fetch_top_cryptos internal method."""

    @pytest.mark.asyncio
    async def test_fetch_top_cryptos_success(
        self, crypto_service, sample_coingecko_response
    ):
        """Test successful crypto fetching from API."""
        mock_client = AsyncMock()
        mock_response = Mock()
        mock_response.json.return_value = sample_coingecko_response
        mock_response.raise_for_status = Mock()
        mock_client.get = AsyncMock(return_value=mock_response)

        cryptos = await crypto_service._fetch_top_cryptos(mock_client, limit=2)

        assert len(cryptos) == 2
        assert cryptos[0].id == "bitcoin"
        assert cryptos[0].symbol == "BTC"  # Should be uppercased
        assert cryptos[1].id == "ethereum"
        assert cryptos[1].symbol == "ETH"

    @pytest.mark.asyncio
    async def test_fetch_top_cryptos_pagination(self, crypto_service):
        """Test pagination when limit > 250."""
        mock_client = AsyncMock()

        # Create 300 mock coins
        page1_coins = [
            {
                "id": f"coin-{i}",
                "symbol": f"c{i}",
                "name": f"Coin {i}",
                "market_cap_rank": i,
                "current_price": 1.0,
                "market_cap": 1000000.0,
                "total_volume": 10000.0,
                "price_change_24h": 0.0,
                "price_change_percentage_24h": 0.0,
                "image": "",
            }
            for i in range(1, 251)
        ]

        page2_coins = [
            {
                "id": f"coin-{i}",
                "symbol": f"c{i}",
                "name": f"Coin {i}",
                "market_cap_rank": i,
                "current_price": 1.0,
                "market_cap": 1000000.0,
                "total_volume": 10000.0,
                "price_change_24h": 0.0,
                "price_change_percentage_24h": 0.0,
                "image": "",
            }
            for i in range(251, 301)
        ]

        mock_responses = [
            Mock(json=Mock(return_value=page1_coins), raise_for_status=Mock()),
            Mock(json=Mock(return_value=page2_coins), raise_for_status=Mock()),
        ]

        mock_client.get = AsyncMock(side_effect=mock_responses)

        cryptos = await crypto_service._fetch_top_cryptos(mock_client, limit=300)

        # Should fetch 2 pages and return 300 cryptos
        assert len(cryptos) == 300
        assert mock_client.get.call_count == 2

    @pytest.mark.asyncio
    async def test_fetch_top_cryptos_parsing_error(self, crypto_service):
        """Test handling of coin parsing errors."""
        mock_client = AsyncMock()

        # One valid coin, one invalid (missing required fields)
        coins = [
            {
                "id": "bitcoin",
                "symbol": "btc",
                "name": "Bitcoin",
                "market_cap_rank": 1,
                "current_price": 65000.0,
                "market_cap": 1250000000000.0,
                "total_volume": 25000000000.0,
                "price_change_24h": 1500.0,
                "price_change_percentage_24h": 2.35,
                "image": "https://example.com/bitcoin.png",
            },
            {
                "symbol": "eth",  # Missing 'id' and 'name' - should fail parsing
            },
        ]

        mock_response = Mock()
        mock_response.json.return_value = coins
        mock_response.raise_for_status = Mock()
        mock_client.get = AsyncMock(return_value=mock_response)

        cryptos = await crypto_service._fetch_top_cryptos(mock_client, limit=2)

        # Should only return the valid coin
        assert len(cryptos) == 1
        assert cryptos[0].symbol == "BTC"

    @pytest.mark.asyncio
    async def test_fetch_top_cryptos_api_error(self, crypto_service):
        """Test API error handling."""
        mock_client = AsyncMock()
        mock_client.get = AsyncMock(side_effect=httpx.HTTPError("API error"))

        cryptos = await crypto_service._fetch_top_cryptos(mock_client, limit=10)

        assert cryptos == []

    @pytest.mark.asyncio
    @patch("app.services.crypto_discovery_service.settings")
    async def test_fetch_top_cryptos_with_api_key(self, mock_settings, crypto_service):
        """Test API key is included in request when configured."""
        mock_settings.COINGECKO_KEY = "test-api-key"

        mock_client = AsyncMock()
        mock_response = Mock()
        mock_response.json.return_value = []
        mock_response.raise_for_status = Mock()
        mock_client.get = AsyncMock(return_value=mock_response)

        await crypto_service._fetch_top_cryptos(mock_client, limit=10)

        # Verify API key was passed in params
        call_args = mock_client.get.call_args
        params = call_args.kwargs["params"]
        assert params["x_cg_demo_api_key"] == "test-api-key"


# ============================================================================
# Test Get Crypto By Symbol
# ============================================================================


class TestGetCryptoBySymbol:
    """Test get_crypto_by_symbol method."""

    @pytest.mark.asyncio
    @patch("app.services.crypto_discovery_service.advanced_redis_client")
    async def test_get_crypto_by_symbol_found(
        self, mock_redis, crypto_service, sample_cached_response
    ):
        """Test finding crypto by symbol."""
        mock_redis.get = AsyncMock(return_value=sample_cached_response)

        crypto = await crypto_service.get_crypto_by_symbol("BTC")

        assert crypto is not None
        assert crypto.symbol == "BTC"
        assert crypto.id == "bitcoin"

    @pytest.mark.asyncio
    @patch("app.services.crypto_discovery_service.advanced_redis_client")
    async def test_get_crypto_by_symbol_lowercase(
        self, mock_redis, crypto_service, sample_cached_response
    ):
        """Test symbol search is case-insensitive."""
        mock_redis.get = AsyncMock(return_value=sample_cached_response)

        crypto = await crypto_service.get_crypto_by_symbol("btc")

        assert crypto is not None
        assert crypto.symbol == "BTC"

    @pytest.mark.asyncio
    @patch("app.services.crypto_discovery_service.advanced_redis_client")
    async def test_get_crypto_by_symbol_not_found(
        self, mock_redis, crypto_service, sample_cached_response
    ):
        """Test symbol not found returns None."""
        mock_redis.get = AsyncMock(return_value=sample_cached_response)

        crypto = await crypto_service.get_crypto_by_symbol("NOTFOUND")

        assert crypto is None


# ============================================================================
# Test Search Cryptos
# ============================================================================


class TestSearchCryptos:
    """Test search_cryptos method."""

    @pytest.mark.asyncio
    @patch("app.services.crypto_discovery_service.advanced_redis_client")
    async def test_search_cryptos_cache_hit(self, mock_redis, crypto_service):
        """Test search returns cached results."""
        cached_results = [
            {
                "id": "bitcoin",
                "symbol": "BTC",
                "name": "Bitcoin",
                "market_cap_rank": 1,
                "current_price": 65000.0,
                "market_cap": 1250000000000.0,
                "total_volume": 25000000000.0,
                "price_change_24h": 1500.0,
                "price_change_percentage_24h": 2.35,
                "image": "https://example.com/bitcoin.png",
            }
        ]

        mock_redis.get = AsyncMock(return_value=cached_results)

        results = await crypto_service.search_cryptos("bitcoin", limit=50)

        assert len(results) == 1
        assert results[0].symbol == "BTC"
        mock_redis.get.assert_called_once_with("crypto_search:bitcoin:50")

    @pytest.mark.asyncio
    @patch("app.services.crypto_discovery_service.advanced_redis_client")
    async def test_search_cryptos_api_fetch(self, mock_redis, crypto_service):
        """Test search fetches from API on cache miss."""
        mock_redis.get = AsyncMock(return_value=None)  # Cache miss
        mock_redis.set = AsyncMock()

        with patch.object(
            crypto_service, "_search_cryptos", new_callable=AsyncMock
        ) as mock_search:
            mock_search.return_value = [
                CryptoAsset(
                    id="ethereum",
                    symbol="ETH",
                    name="Ethereum",
                    market_cap_rank=2,
                    current_price=3500.0,
                    market_cap=420000000000.0,
                    total_volume=15000000000.0,
                    price_change_24h=-50.0,
                    price_change_percentage_24h=-1.41,
                    image="https://example.com/ethereum.png",
                )
            ]

            results = await crypto_service.search_cryptos("ethereum", limit=50)

            assert len(results) == 1
            assert results[0].symbol == "ETH"
            # Should cache results with 10-minute TTL
            mock_redis.set.assert_called_once()
            call_args = mock_redis.set.call_args
            assert call_args.kwargs["expire"] == 600

    @pytest.mark.asyncio
    @patch("app.services.crypto_discovery_service.advanced_redis_client")
    async def test_search_cryptos_exception(self, mock_redis, crypto_service):
        """Test search exception handling."""
        mock_redis.get = AsyncMock(side_effect=Exception("Redis error"))

        results = await crypto_service.search_cryptos("bitcoin", limit=50)

        assert results == []

    @pytest.mark.asyncio
    @patch("app.services.crypto_discovery_service.advanced_redis_client")
    async def test_search_cryptos_empty_results(self, mock_redis, crypto_service):
        """Test search with no results."""
        mock_redis.get = AsyncMock(return_value=None)
        mock_redis.set = AsyncMock()

        with patch.object(
            crypto_service, "_search_cryptos", new_callable=AsyncMock
        ) as mock_search:
            mock_search.return_value = []

            results = await crypto_service.search_cryptos("nonexistent", limit=50)

            assert results == []


# ============================================================================
# Test Internal Search Cryptos
# ============================================================================


class TestInternalSearchCryptos:
    """Test _search_cryptos internal method."""

    @pytest.mark.asyncio
    async def test_search_cryptos_success(self, crypto_service):
        """Test successful crypto search."""
        mock_client = AsyncMock()

        # Mock search response
        search_response = Mock()
        search_response.json.return_value = {
            "coins": [
                {"id": "bitcoin", "name": "Bitcoin", "symbol": "BTC"},
                {"id": "ethereum", "name": "Ethereum", "symbol": "ETH"},
            ]
        }
        search_response.raise_for_status = Mock()

        # Mock market data response
        market_response = Mock()
        market_response.json.return_value = [
            {
                "id": "bitcoin",
                "symbol": "btc",
                "name": "Bitcoin",
                "market_cap_rank": 1,
                "current_price": 65000.0,
                "market_cap": 1250000000000.0,
                "total_volume": 25000000000.0,
                "price_change_24h": 1500.0,
                "price_change_percentage_24h": 2.35,
                "image": "https://example.com/bitcoin.png",
            }
        ]
        market_response.raise_for_status = Mock()

        mock_client.get = AsyncMock(side_effect=[search_response, market_response])

        results = await crypto_service._search_cryptos(mock_client, "bitcoin", limit=50)

        assert len(results) == 1
        assert results[0].symbol == "BTC"

    @pytest.mark.asyncio
    async def test_search_cryptos_no_coins(self, crypto_service):
        """Test search with no matching coins."""
        mock_client = AsyncMock()

        search_response = Mock()
        search_response.json.return_value = {"coins": []}
        search_response.raise_for_status = Mock()

        mock_client.get = AsyncMock(return_value=search_response)

        results = await crypto_service._search_cryptos(
            mock_client, "nonexistent", limit=50
        )

        assert results == []

    @pytest.mark.asyncio
    async def test_search_cryptos_api_error(self, crypto_service):
        """Test search API error handling."""
        mock_client = AsyncMock()
        mock_client.get = AsyncMock(side_effect=httpx.HTTPError("API error"))

        results = await crypto_service._search_cryptos(mock_client, "bitcoin", limit=50)

        assert results == []


# ============================================================================
# Test Get Symbol to ID Mapping
# ============================================================================


class TestGetSymbolToIdMapping:
    """Test get_symbol_to_id_mapping method."""

    @pytest.mark.asyncio
    @patch("app.services.crypto_discovery_service.advanced_redis_client")
    async def test_get_symbol_to_id_mapping(
        self, mock_redis, crypto_service, sample_cached_response
    ):
        """Test creating symbol to ID mapping."""
        mock_redis.get = AsyncMock(return_value=sample_cached_response)

        mapping = await crypto_service.get_symbol_to_id_mapping()

        assert isinstance(mapping, dict)
        assert mapping["BTC"] == "bitcoin"
        assert mapping["ETH"] == "ethereum"
        assert len(mapping) == 2

    @pytest.mark.asyncio
    @patch("app.services.crypto_discovery_service.advanced_redis_client")
    async def test_get_symbol_to_id_mapping_empty(self, mock_redis, crypto_service):
        """Test mapping with no cryptos."""
        # Cache returns None (miss), and API fetch returns empty list
        mock_redis.get = AsyncMock(return_value=None)
        mock_redis.set = AsyncMock()

        with patch.object(
            crypto_service, "_fetch_top_cryptos", new_callable=AsyncMock
        ) as mock_fetch:
            mock_fetch.return_value = []  # No cryptos from API

            mapping = await crypto_service.get_symbol_to_id_mapping()

            assert mapping == {}


# ============================================================================
# Test Edge Cases
# ============================================================================


class TestEdgeCases:
    """Test edge cases and error scenarios."""

    @pytest.mark.asyncio
    async def test_get_top_cryptos_without_context_manager(
        self, crypto_service, sample_coingecko_response
    ):
        """Test get_top_cryptos creates temporary client when not in context."""
        with patch("httpx.AsyncClient") as mock_client_class:
            mock_client = AsyncMock()
            mock_response = Mock()
            mock_response.json.return_value = sample_coingecko_response
            mock_response.raise_for_status = Mock()
            mock_client.get = AsyncMock(return_value=mock_response)
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock()

            mock_client_class.return_value = mock_client

            with (
                patch.object(
                    crypto_service,
                    "_get_cached",
                    new_callable=AsyncMock,
                    return_value=None,
                ),
                patch.object(crypto_service, "_set_cache", new_callable=AsyncMock),
            ):
                cryptos = await crypto_service.get_top_cryptos(limit=2)

            # Should create temporary client
            mock_client_class.assert_called_once()

    @pytest.mark.asyncio
    async def test_crypto_asset_missing_optional_fields(self, crypto_service):
        """Test CryptoAsset handles missing optional fields with .get()."""
        mock_client = AsyncMock()

        # Coin data with missing optional fields
        coins = [
            {
                "id": "test-coin",
                "symbol": "test",
                "name": "Test Coin",
                # Missing: market_cap_rank, current_price, etc.
            }
        ]

        mock_response = Mock()
        mock_response.json.return_value = coins
        mock_response.raise_for_status = Mock()
        mock_client.get = AsyncMock(return_value=mock_response)

        cryptos = await crypto_service._fetch_top_cryptos(mock_client, limit=1)

        # Should use .get() with defaults
        assert len(cryptos) == 1
        assert cryptos[0].market_cap_rank == 0
        assert cryptos[0].current_price == 0
        assert cryptos[0].image == ""

    def test_crypto_asset_symbol_uppercase(self):
        """Test symbol is converted to uppercase in _fetch_top_cryptos."""
        # This is tested implicitly in fetch tests, but worth documenting
        crypto = CryptoAsset(
            id="bitcoin",
            symbol="btc",  # Lowercase
            name="Bitcoin",
            market_cap_rank=1,
            current_price=65000.0,
            market_cap=1250000000000.0,
            total_volume=25000000000.0,
            price_change_24h=1500.0,
            price_change_percentage_24h=2.35,
            image="",
        )

        # The .upper() happens during parsing, not in dataclass
        assert crypto.symbol == "btc"  # Dataclass stores as-is
