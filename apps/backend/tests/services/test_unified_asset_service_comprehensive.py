"""
Comprehensive tests for UnifiedAssetService

Session 147 - Backend Coverage Expansion (87.06% → 95%+)
Follows AsyncMock Pattern from Pattern Library (TEST018)
Targets unified_asset_service.py (46% → 85%+)
"""

import json
from unittest.mock import AsyncMock, MagicMock, patch

import httpx
import pytest

from app.services.unified_asset_service import UnifiedAsset, UnifiedAssetService

# ============================================================================
# FIXTURES
# ============================================================================


@pytest.fixture
def mock_coingecko_response():
    """Mock CoinGecko API response"""
    return [
        {
            "id": "bitcoin",
            "symbol": "btc",
            "name": "Bitcoin",
            "image": "https://example.com/btc.png",
            "market_cap_rank": 1,
        },
        {
            "id": "ethereum",
            "symbol": "eth",
            "name": "Ethereum",
            "image": "https://example.com/eth.png",
            "market_cap_rank": 2,
        },
        {
            "id": "cardano",
            "symbol": "ada",
            "name": "Cardano",
            "image": "https://example.com/ada.png",
            "market_cap_rank": 3,
        },
    ]


@pytest.fixture
def mock_redis_data():
    """Mock Redis cached registry data"""
    return {
        "crypto_symbols": ["BTC", "ETH", "ADA"],
        "stock_symbols": ["AAPL", "GOOGL", "MSFT"],
    }


@pytest.fixture
async def service_with_cache(mock_redis_data):
    """Service instance with cached data"""
    service = UnifiedAssetService()
    service.client = AsyncMock(spec=httpx.AsyncClient)

    # Simulate cache hit
    with patch(
        "app.services.unified_asset_service.advanced_redis_client"
    ) as mock_redis:
        mock_redis.get = AsyncMock(return_value=mock_redis_data)
        await service._initialize_registry()

    return service


@pytest.fixture
async def service_no_cache(mock_coingecko_response):
    """Service instance without cache (forces API call)"""
    service = UnifiedAssetService()

    mock_response = MagicMock()
    mock_response.json.return_value = mock_coingecko_response
    mock_response.raise_for_status = MagicMock()

    mock_client = AsyncMock(spec=httpx.AsyncClient)
    mock_client.get = AsyncMock(return_value=mock_response)
    mock_client.__aenter__ = AsyncMock(return_value=mock_client)
    mock_client.__aexit__ = AsyncMock(return_value=None)
    service.client = mock_client

    with patch(
        "app.services.unified_asset_service.advanced_redis_client"
    ) as mock_redis:
        mock_redis.get = AsyncMock(return_value=None)
        mock_redis.set = AsyncMock()
        await service._initialize_registry()

    return service


# ============================================================================
# INITIALIZATION TESTS
# ============================================================================


class TestServiceInitialization:
    """Test service initialization and context manager"""

    @pytest.mark.asyncio
    async def test_context_manager_lifecycle(self):
        """Test async context manager __aenter__ and __aexit__"""
        with patch(
            "app.services.unified_asset_service.advanced_redis_client"
        ) as mock_redis:
            mock_redis.get = AsyncMock(return_value=None)

            with patch("httpx.AsyncClient") as mock_client_class:
                mock_client = AsyncMock()  # Remove spec to avoid InvalidSpecError
                mock_client.aclose = AsyncMock()
                mock_client_class.return_value = mock_client

                async with UnifiedAssetService() as service:
                    assert service.client is not None
                    assert isinstance(service._asset_registry, dict)
                    assert isinstance(service._crypto_symbols, set)
                    assert isinstance(service._stock_symbols, set)

                # Verify client was closed
                mock_client.aclose.assert_called_once()

    @pytest.mark.asyncio
    async def test_initialize_from_cache(self, mock_redis_data):
        """Test initialization loads from cache successfully"""
        service = UnifiedAssetService()

        with patch(
            "app.services.unified_asset_service.advanced_redis_client"
        ) as mock_redis:
            mock_redis.get = AsyncMock(return_value=mock_redis_data)

            await service._initialize_registry()

            # Verify symbols loaded from cache
            assert len(service._crypto_symbols) == 3
            assert "BTC" in service._crypto_symbols
            assert len(service._stock_symbols) == 3
            assert "AAPL" in service._stock_symbols

    @pytest.mark.asyncio
    async def test_initialize_from_api_on_cache_miss(self, mock_coingecko_response):
        """Test initialization fetches from API when cache is empty"""
        service = UnifiedAssetService()

        mock_response = MagicMock()
        mock_response.json.return_value = mock_coingecko_response
        mock_response.raise_for_status = MagicMock()

        mock_client = AsyncMock(spec=httpx.AsyncClient)
        mock_client.get = AsyncMock(return_value=mock_response)
        service.client = mock_client

        with patch(
            "app.services.unified_asset_service.advanced_redis_client"
        ) as mock_redis:
            mock_redis.get = AsyncMock(return_value=None)
            mock_redis.set = AsyncMock()

            await service._initialize_registry()

            # Verify API was called
            mock_client.get.assert_called_once()

            # Verify symbols extracted
            assert len(service._crypto_symbols) == 3
            assert "BTC" in service._crypto_symbols
            assert "ETH" in service._crypto_symbols

    @pytest.mark.asyncio
    async def test_initialize_handles_cache_error_gracefully(
        self, mock_coingecko_response
    ):
        """Test initialization continues after cache error"""
        service = UnifiedAssetService()

        mock_response = MagicMock()
        mock_response.json.return_value = mock_coingecko_response
        mock_response.raise_for_status = MagicMock()

        mock_client = AsyncMock(spec=httpx.AsyncClient)
        mock_client.get = AsyncMock(return_value=mock_response)
        service.client = mock_client

        with patch(
            "app.services.unified_asset_service.advanced_redis_client"
        ) as mock_redis:
            # Simulate cache error
            mock_redis.get = AsyncMock(side_effect=Exception("Redis connection failed"))
            mock_redis.set = AsyncMock()

            # Should not raise, should fall back to API
            await service._initialize_registry()

            assert len(service._crypto_symbols) > 0


# ============================================================================
# CRYPTO SYMBOL FETCHING TESTS
# ============================================================================


class TestCryptoSymbolFetching:
    """Test CoinGecko API interaction"""

    @pytest.mark.asyncio
    async def test_fetch_crypto_symbols_success(self, mock_coingecko_response):
        """Test successful crypto symbols fetch"""
        service = UnifiedAssetService()

        mock_response = MagicMock()
        mock_response.json.return_value = mock_coingecko_response
        mock_response.raise_for_status = MagicMock()

        mock_client = AsyncMock(spec=httpx.AsyncClient)
        mock_client.get = AsyncMock(return_value=mock_response)
        service.client = mock_client

        await service._fetch_crypto_symbols()

        # Verify registry populated
        assert len(service._crypto_symbols) == 3
        assert "BTC" in service._crypto_symbols

        # Verify asset details stored
        btc_asset = service._asset_registry.get("BTC")
        assert btc_asset is not None
        assert btc_asset.name == "Bitcoin"
        assert btc_asset.type == "crypto"
        assert btc_asset.provider == "coingecko"
        assert btc_asset.provider_id == "bitcoin"

    @pytest.mark.asyncio
    async def test_fetch_crypto_symbols_handles_api_error(self):
        """Test fetch handles API errors gracefully"""
        service = UnifiedAssetService()

        mock_client = AsyncMock(spec=httpx.AsyncClient)
        mock_client.get = AsyncMock(side_effect=httpx.HTTPError("API error"))
        service.client = mock_client

        # Should not raise, should log error
        await service._fetch_crypto_symbols()

        # Registry remains empty
        assert len(service._crypto_symbols) == 0

    @pytest.mark.asyncio
    async def test_fetch_crypto_symbols_without_client(self, mock_coingecko_response):
        """Test fetch creates temporary client when none exists"""
        service = UnifiedAssetService()
        service.client = None  # No client set

        mock_response = MagicMock()
        mock_response.json.return_value = mock_coingecko_response
        mock_response.raise_for_status = MagicMock()

        with patch("httpx.AsyncClient") as mock_client_class:
            mock_client = AsyncMock()  # Remove spec to avoid InvalidSpecError
            mock_client.get = AsyncMock(return_value=mock_response)
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock()
            mock_client_class.return_value = mock_client

            await service._fetch_crypto_symbols()

            # Verify symbols fetched
            assert len(service._crypto_symbols) == 3


# ============================================================================
# ASSET CLASSIFICATION TESTS
# ============================================================================


class TestAssetClassification:
    """Test is_crypto() and is_stock() logic"""

    @pytest.mark.asyncio
    async def test_is_crypto_returns_true_for_known_crypto(self, service_with_cache):
        """Test is_crypto identifies known cryptocurrencies"""
        assert service_with_cache.is_crypto("BTC") is True
        assert service_with_cache.is_crypto("btc") is True  # Case insensitive
        assert service_with_cache.is_crypto("ETH") is True

    @pytest.mark.asyncio
    async def test_is_crypto_returns_false_for_unknown(self, service_with_cache):
        """Test is_crypto returns False for non-crypto symbols"""
        assert service_with_cache.is_crypto("AAPL") is False
        assert service_with_cache.is_crypto("GOOGL") is False
        assert service_with_cache.is_crypto("INVALID") is False

    @pytest.mark.asyncio
    async def test_is_stock_returns_false_for_crypto(self, service_with_cache):
        """Test is_stock returns False for known crypto"""
        assert service_with_cache.is_stock("BTC") is False
        assert service_with_cache.is_stock("ETH") is False

    @pytest.mark.asyncio
    async def test_is_stock_returns_true_for_valid_symbols(self, service_with_cache):
        """Test is_stock identifies valid stock symbols"""
        assert service_with_cache.is_stock("AAPL") is True
        assert service_with_cache.is_stock("GOOGL") is True
        assert service_with_cache.is_stock("MSFT") is True

    @pytest.mark.asyncio
    async def test_is_stock_validates_symbol_length(self, service_with_cache):
        """Test is_stock validates symbol length (2-5 chars)"""
        assert service_with_cache.is_stock("A") is False  # Too short
        assert service_with_cache.is_stock("AB") is True
        assert service_with_cache.is_stock("ABCDE") is True
        assert service_with_cache.is_stock("ABCDEF") is False  # Too long


# ============================================================================
# ASSET INFO RETRIEVAL TESTS
# ============================================================================


class TestAssetInfoRetrieval:
    """Test get_asset_info(), get_provider(), get_coingecko_id()"""

    @pytest.mark.asyncio
    async def test_get_asset_info_returns_crypto_details(self, service_with_cache):
        """Test get_asset_info retrieves crypto asset details"""
        # Add known crypto to registry
        service_with_cache._asset_registry["BTC"] = UnifiedAsset(
            symbol="BTC",
            name="Bitcoin",
            type="crypto",
            provider="coingecko",
            provider_id="bitcoin",
            market_cap_rank=1,
        )

        asset = service_with_cache.get_asset_info("BTC")
        assert asset is not None
        assert asset.symbol == "BTC"
        assert asset.name == "Bitcoin"
        assert asset.type == "crypto"

    @pytest.mark.asyncio
    async def test_get_asset_info_returns_none_for_unknown(self, service_with_cache):
        """Test get_asset_info returns None for unknown symbols"""
        asset = service_with_cache.get_asset_info("UNKNOWN")
        assert asset is None

    @pytest.mark.asyncio
    async def test_get_provider_returns_coingecko_for_crypto(self, service_with_cache):
        """Test get_provider returns 'coingecko' for crypto symbols"""
        assert service_with_cache.get_provider("BTC") == "coingecko"
        assert service_with_cache.get_provider("ETH") == "coingecko"

    @pytest.mark.asyncio
    async def test_get_provider_returns_finnhub_for_stocks(self, service_with_cache):
        """Test get_provider returns 'finnhub' for stock symbols"""
        assert service_with_cache.get_provider("AAPL") == "finnhub"
        assert service_with_cache.get_provider("GOOGL") == "finnhub"

    @pytest.mark.asyncio
    async def test_get_coingecko_id_returns_id_for_crypto(self, service_with_cache):
        """Test get_coingecko_id retrieves CoinGecko ID"""
        # Add known crypto with ID
        service_with_cache._asset_registry["BTC"] = UnifiedAsset(
            symbol="BTC",
            name="Bitcoin",
            type="crypto",
            provider="coingecko",
            provider_id="bitcoin",
        )

        cg_id = service_with_cache.get_coingecko_id("BTC")
        assert cg_id == "bitcoin"

    @pytest.mark.asyncio
    async def test_get_coingecko_id_returns_none_for_stocks(self, service_with_cache):
        """Test get_coingecko_id returns None for non-crypto"""
        # Add stock (no CoinGecko ID)
        service_with_cache._asset_registry["AAPL"] = UnifiedAsset(
            symbol="AAPL",
            name="Apple Inc.",
            type="stock",
            provider="finnhub",
            provider_id="AAPL",
        )

        cg_id = service_with_cache.get_coingecko_id("AAPL")
        assert cg_id is None


# ============================================================================
# SYMBOL LISTING TESTS
# ============================================================================


class TestSymbolListing:
    """Test get_all_cryptos(), get_all_stocks()"""

    @pytest.mark.asyncio
    async def test_get_all_cryptos_returns_list(self, service_with_cache):
        """Test get_all_cryptos returns all registered cryptos"""
        cryptos = await service_with_cache.get_all_cryptos()
        assert isinstance(cryptos, list)
        assert len(cryptos) == 3
        assert "BTC" in cryptos
        assert "ETH" in cryptos

    @pytest.mark.asyncio
    async def test_get_all_stocks_returns_list(self, service_with_cache):
        """Test get_all_stocks returns all registered stocks"""
        stocks = await service_with_cache.get_all_stocks()
        assert isinstance(stocks, list)
        assert len(stocks) == 3
        assert "AAPL" in stocks
        assert "GOOGL" in stocks


# ============================================================================
# STOCK REGISTRATION TESTS
# ============================================================================


class TestStockRegistration:
    """Test register_stock() method"""

    @pytest.mark.asyncio
    async def test_register_stock_adds_to_registry(self, service_with_cache):
        """Test register_stock adds new stock to registry"""
        service_with_cache.register_stock("TSLA", "Tesla Inc.")

        assert "TSLA" in service_with_cache._stock_symbols
        asset = service_with_cache._asset_registry.get("TSLA")
        assert asset is not None
        assert asset.name == "Tesla Inc."
        assert asset.type == "stock"
        assert asset.provider == "finnhub"

    @pytest.mark.asyncio
    async def test_register_stock_does_not_overwrite_crypto(self, service_with_cache):
        """Test register_stock does not overwrite known crypto"""
        initial_crypto_count = len(service_with_cache._crypto_symbols)

        # Try to register BTC as stock (should be ignored)
        service_with_cache.register_stock("BTC", "Fake Bitcoin Stock")

        # Crypto symbols unchanged
        assert len(service_with_cache._crypto_symbols) == initial_crypto_count
        assert "BTC" not in service_with_cache._stock_symbols


# ============================================================================
# CACHE MANAGEMENT TESTS
# ============================================================================


class TestCacheManagement:
    """Test _cache_registry() method"""

    @pytest.mark.asyncio
    async def test_cache_registry_saves_to_redis(self, service_with_cache):
        """Test _cache_registry stores registry in Redis"""
        with patch(
            "app.services.unified_asset_service.advanced_redis_client"
        ) as mock_redis:
            mock_redis.set = AsyncMock()

            await service_with_cache._cache_registry()

            # Verify Redis set was called
            mock_redis.set.assert_called_once()
            call_args = mock_redis.set.call_args
            assert call_args[0][0] == "unified:asset_registry"
            assert "crypto_symbols" in call_args[0][1]
            assert "stock_symbols" in call_args[0][1]

    @pytest.mark.asyncio
    async def test_cache_registry_handles_redis_error(self, service_with_cache):
        """Test _cache_registry handles Redis errors gracefully"""
        with patch(
            "app.services.unified_asset_service.advanced_redis_client"
        ) as mock_redis:
            mock_redis.set = AsyncMock(side_effect=Exception("Redis unavailable"))

            # Should not raise
            await service_with_cache._cache_registry()


# ============================================================================
# MOCK DATA GENERATORS TESTS
# ============================================================================


class TestMockDataGenerators:
    """Test _get_mock_stocks(), _get_mock_indices(), _get_mock_forex()"""

    @pytest.mark.asyncio
    async def test_get_mock_stocks_returns_list(self, service_with_cache):
        """Test _get_mock_stocks returns list of mock stock data"""
        stocks = service_with_cache._get_mock_stocks(limit=5)

        assert isinstance(stocks, list)
        assert len(stocks) <= 5
        if len(stocks) > 0:
            assert "symbol" in stocks[0]
            assert "name" in stocks[0]
            assert "type" in stocks[0]

    @pytest.mark.asyncio
    async def test_get_mock_indices_returns_list(self, service_with_cache):
        """Test _get_mock_indices returns list of mock index data"""
        indices = service_with_cache._get_mock_indices()

        assert isinstance(indices, list)
        assert len(indices) > 0
        assert "symbol" in indices[0]
        assert "name" in indices[0]
        assert "type" in indices[0]

    @pytest.mark.asyncio
    async def test_get_mock_forex_returns_list(self, service_with_cache):
        """Test _get_mock_forex returns list of mock forex data"""
        forex = service_with_cache._get_mock_forex(limit=3)

        assert isinstance(forex, list)
        assert len(forex) <= 3
        if len(forex) > 0:
            assert "symbol" in forex[0]
            assert "name" in forex[0]
            assert "type" in forex[0]


# ============================================================================
# EDGE CASES & ERROR HANDLING
# ============================================================================


class TestEdgeCases:
    """Edge case and error handling tests"""

    @pytest.mark.asyncio
    async def test_handles_empty_coingecko_response(self):
        """Test service handles empty CoinGecko response"""
        service = UnifiedAssetService()

        mock_response = MagicMock()
        mock_response.json.return_value = []  # Empty list
        mock_response.raise_for_status = MagicMock()

        mock_client = AsyncMock(spec=httpx.AsyncClient)
        mock_client.get = AsyncMock(return_value=mock_response)
        service.client = mock_client

        await service._fetch_crypto_symbols()

        # Should have 0 symbols but not crash
        assert len(service._crypto_symbols) == 0

    @pytest.mark.asyncio
    async def test_handles_malformed_coingecko_response(self):
        """Test service handles malformed API responses"""
        service = UnifiedAssetService()

        mock_response = MagicMock()
        # Missing required fields
        mock_response.json.return_value = [{"symbol": "btc"}]  # Missing name, id, etc.
        mock_response.raise_for_status = MagicMock()

        mock_client = AsyncMock(spec=httpx.AsyncClient)
        mock_client.get = AsyncMock(return_value=mock_response)
        service.client = mock_client

        # Should handle KeyError gracefully
        try:
            await service._fetch_crypto_symbols()
        except KeyError:
            pytest.fail("Should handle missing fields gracefully")

    @pytest.mark.asyncio
    async def test_case_insensitive_symbol_lookup(self, service_with_cache):
        """Test all methods handle case-insensitive symbol lookup"""
        # Add symbol in uppercase
        service_with_cache._asset_registry["TEST"] = UnifiedAsset(
            symbol="TEST",
            name="Test Asset",
            type="crypto",
            provider="coingecko",
            provider_id="test-coin",
        )
        service_with_cache._crypto_symbols.add("TEST")

        # Test with different cases
        assert service_with_cache.is_crypto("test") is True
        assert service_with_cache.is_crypto("Test") is True
        assert service_with_cache.is_crypto("TEST") is True

        asset_lower = service_with_cache.get_asset_info("test")
        asset_upper = service_with_cache.get_asset_info("TEST")
        assert asset_lower == asset_upper
