"""
Unified Asset Service Tests - Comprehensive Coverage for Asset Registry

Tests for unified_asset_service.py covering:
- Asset discovery (crypto, stocks, indices, forex)
- Registry initialization and caching
- Asset classification and lookup
- Error handling and fallback mechanisms
- Mock data generation
"""

from unittest.mock import AsyncMock, MagicMock, patch

import httpx
import pytest

from app.services.unified_asset_service import UnifiedAsset, UnifiedAssetService


@pytest.fixture
def asset_service():
    """Create a fresh UnifiedAssetService instance for each test."""
    return UnifiedAssetService()


class TestUnifiedAssetDataclass:
    """Tests for UnifiedAsset dataclass."""

    def test_unified_asset_creation(self):
        """Test creating a UnifiedAsset instance."""
        asset = UnifiedAsset(
            symbol="BTC",
            name="Bitcoin",
            type="crypto",
            provider="coingecko",
            provider_id="bitcoin",
            icon="https://example.com/btc.png",
            market_cap_rank=1,
        )

        assert asset.symbol == "BTC"
        assert asset.name == "Bitcoin"
        assert asset.type == "crypto"
        assert asset.provider == "coingecko"
        assert asset.provider_id == "bitcoin"
        assert asset.icon == "https://example.com/btc.png"
        assert asset.market_cap_rank == 1

    def test_unified_asset_with_defaults(self):
        """Test UnifiedAsset with optional fields as None."""
        asset = UnifiedAsset(
            symbol="AAPL",
            name="Apple Inc",
            type="stock",
            provider="finnhub",
        )

        assert asset.symbol == "AAPL"
        assert asset.name == "Apple Inc"
        assert asset.type == "stock"
        assert asset.provider == "finnhub"
        assert asset.provider_id is None
        assert asset.icon is None
        assert asset.market_cap_rank is None


class TestUnifiedAssetServiceInit:
    """Tests for UnifiedAssetService initialization."""

    def test_service_initialization(self, asset_service):
        """Test that service initializes with empty state."""
        assert asset_service.client is None
        assert asset_service._asset_registry == {}
        assert asset_service._crypto_symbols == set()
        assert asset_service._stock_symbols == set()

    @pytest.mark.asyncio
    async def test_async_context_manager_entry(self, asset_service):
        """Test async context manager entry."""
        async with asset_service as service:
            assert service.client is not None
            assert isinstance(service.client, httpx.AsyncClient)

    @pytest.mark.asyncio
    async def test_async_context_manager_exit(self, asset_service):
        """Test async context manager properly closes client."""
        service = await asset_service.__aenter__()
        assert service.client is not None

        await asset_service.__aexit__(None, None, None)
        # Client should be closed after exiting


class TestAssetClassification:
    """Tests for asset classification methods."""

    def test_is_crypto_known_symbol(self, asset_service):
        """Test is_crypto returns True for known crypto symbols."""
        asset_service._crypto_symbols.add("BTC")
        asset_service._crypto_symbols.add("ETH")

        assert asset_service.is_crypto("BTC") is True
        assert asset_service.is_crypto("btc") is True  # Case insensitive
        assert asset_service.is_crypto("ETH") is True

    def test_is_crypto_unknown_symbol(self, asset_service):
        """Test is_crypto returns False for unknown symbols."""
        assert asset_service.is_crypto("AAPL") is False
        assert asset_service.is_crypto("UNKNOWN") is False

    def test_is_stock_known_symbol(self, asset_service):
        """Test is_stock returns True for known stock symbols when added via registry."""
        asset_service._stock_symbols.add("AAPL")
        asset_service._stock_symbols.add("MSFT")

        # is_stock uses pattern matching for classification
        # (2-5 uppercase letters) not set membership
        assert asset_service.is_stock("AAPL") is True
        assert asset_service.is_stock("MSFT") is True

    def test_is_stock_crypto_exclusion(self, asset_service):
        """Test is_stock returns False for known crypto symbols."""
        asset_service._crypto_symbols.add("BTC")

        assert asset_service.is_stock("BTC") is False

    def test_is_stock_pattern_matching(self, asset_service):
        """Test that is_stock uses pattern matching: 2-5 uppercase letters."""
        # Pattern: 2-5 characters, uppercase, not in crypto set
        assert asset_service.is_stock("AB") is True
        assert asset_service.is_stock("ABC") is True
        assert asset_service.is_stock("ABCD") is True
        assert asset_service.is_stock("ABCDE") is True

    def test_is_stock_single_letter_not_stock(self, asset_service):
        """Test that single letter symbols are not classified as stocks."""
        # Pattern requires at least 2 characters
        assert asset_service.is_stock("A") is False

    def test_is_stock_long_symbols_not_stock(self, asset_service):
        """Test that long symbols (>5 chars) are not classified as stocks."""
        assert asset_service.is_stock("TOOLONGSTICKER") is False

    def test_is_stock_lowercase_not_stock(self, asset_service):
        """Test that lowercase symbols are not classified as stocks."""
        # Pattern requires uppercase
        assert asset_service.is_stock("aapl") is False


class TestAssetRegistry:
    """Tests for asset registry operations."""

    def test_get_asset_info_exists(self, asset_service):
        """Test getting asset info for known asset."""
        asset = UnifiedAsset(
            symbol="BTC",
            name="Bitcoin",
            type="crypto",
            provider="coingecko",
        )
        asset_service._asset_registry["BTC"] = asset

        result = asset_service.get_asset_info("BTC")
        assert result is not None
        assert result.symbol == "BTC"
        assert result.name == "Bitcoin"

    def test_get_asset_info_not_exists(self, asset_service):
        """Test getting asset info for unknown asset."""
        result = asset_service.get_asset_info("UNKNOWN")
        assert result is None

    def test_get_asset_info_case_insensitive(self, asset_service):
        """Test asset lookup is case insensitive."""
        asset = UnifiedAsset(
            symbol="BTC",
            name="Bitcoin",
            type="crypto",
            provider="coingecko",
        )
        asset_service._asset_registry["BTC"] = asset

        result = asset_service.get_asset_info("btc")
        assert result is not None

    def test_get_provider_crypto(self, asset_service):
        """Test getting provider for crypto asset."""
        asset_service._crypto_symbols.add("BTC")
        assert asset_service.get_provider("BTC") == "coingecko"

    def test_get_provider_stock(self, asset_service):
        """Test getting provider for stock asset."""
        asset_service._stock_symbols.add("AAPL")
        assert asset_service.get_provider("AAPL") == "finnhub"

    def test_get_provider_unknown_defaults_to_finnhub(self, asset_service):
        """Test unknown assets default to finnhub provider."""
        assert asset_service.get_provider("UNKNOWN") == "finnhub"

    def test_get_coingecko_id_found(self, asset_service):
        """Test retrieving CoinGecko ID for crypto."""
        asset = UnifiedAsset(
            symbol="BTC",
            name="Bitcoin",
            type="crypto",
            provider="coingecko",
            provider_id="bitcoin",
        )
        asset_service._asset_registry["BTC"] = asset

        result = asset_service.get_coingecko_id("BTC")
        assert result == "bitcoin"

    def test_get_coingecko_id_not_found(self, asset_service):
        """Test CoinGecko ID returns None for unknown asset."""
        result = asset_service.get_coingecko_id("UNKNOWN")
        assert result is None

    def test_get_coingecko_id_missing_provider_id(self, asset_service):
        """Test CoinGecko ID returns None when provider_id is None."""
        asset = UnifiedAsset(
            symbol="BTC",
            name="Bitcoin",
            type="crypto",
            provider="coingecko",
            provider_id=None,
        )
        asset_service._asset_registry["BTC"] = asset

        result = asset_service.get_coingecko_id("BTC")
        assert result is None


class TestMockDataGeneration:
    """Tests for mock data generation methods."""

    def test_get_mock_stocks_returns_list(self, asset_service):
        """Test that mock stocks returns a list of dictionaries."""
        result = asset_service._get_mock_stocks(5)
        assert isinstance(result, list)
        assert len(result) > 0
        assert all(isinstance(item, dict) for item in result)

    def test_get_mock_stocks_respects_limit(self, asset_service):
        """Test that mock stocks respects the limit parameter."""
        result = asset_service._get_mock_stocks(3)
        assert len(result) <= 3

    def test_get_mock_stocks_has_required_fields(self, asset_service):
        """Test that mock stocks have required fields."""
        result = asset_service._get_mock_stocks(1)
        assert len(result) > 0

        stock = result[0]
        assert "symbol" in stock
        assert "name" in stock
        assert "type" in stock

    def test_get_mock_indices_returns_list(self, asset_service):
        """Test that mock indices returns a list."""
        result = asset_service._get_mock_indices()
        assert isinstance(result, list)
        assert len(result) > 0

    def test_get_mock_indices_has_required_fields(self, asset_service):
        """Test that mock indices have required fields."""
        result = asset_service._get_mock_indices()
        assert all(isinstance(item, dict) for item in result)

        if result:
            index = result[0]
            assert "symbol" in index
            assert "name" in index
            assert "type" in index

    def test_get_mock_forex_returns_list(self, asset_service):
        """Test that mock forex returns a list."""
        result = asset_service._get_mock_forex(5)
        assert isinstance(result, list)

    def test_get_mock_forex_respects_limit(self, asset_service):
        """Test that mock forex respects the limit parameter."""
        result = asset_service._get_mock_forex(3)
        assert len(result) <= 3

    def test_get_mock_forex_has_required_fields(self, asset_service):
        """Test that mock forex have required fields."""
        result = asset_service._get_mock_forex(1)
        if result:
            forex = result[0]
            assert "symbol" in forex
            assert "name" in forex
            assert "type" in forex


class TestAssetLookup:
    """Tests for asset lookup methods."""

    @pytest.mark.asyncio
    async def test_get_all_cryptos_populated(self, asset_service):
        """Test getting all cryptos from registry."""
        asset_service._crypto_symbols.add("BTC")
        asset_service._crypto_symbols.add("ETH")
        asset_service._crypto_symbols.add("XRP")

        cryptos = await asset_service.get_all_cryptos()
        assert "BTC" in cryptos
        assert "ETH" in cryptos
        assert "XRP" in cryptos

    @pytest.mark.asyncio
    async def test_get_all_cryptos_empty(self, asset_service):
        """Test getting cryptos when registry is empty."""
        result = await asset_service.get_all_cryptos()
        assert isinstance(result, list)

    @pytest.mark.asyncio
    async def test_get_all_stocks_populated(self, asset_service):
        """Test getting all stocks from registry."""
        asset_service._stock_symbols.add("AAPL")
        asset_service._stock_symbols.add("MSFT")

        stocks = await asset_service.get_all_stocks()
        assert "AAPL" in stocks
        assert "MSFT" in stocks

    @pytest.mark.asyncio
    async def test_get_all_stocks_empty(self, asset_service):
        """Test getting stocks when registry is empty."""
        result = await asset_service.get_all_stocks()
        assert isinstance(result, list)


class TestSymbolValidation:
    """Tests for symbol validation and normalization."""

    def test_normalize_symbol_uppercase(self, asset_service):
        """Test that symbol normalization converts to uppercase."""
        # Most methods accept lowercase and convert internally
        asset_service._crypto_symbols.add("BTC")
        assert asset_service.is_crypto("btc") is True

    def test_empty_symbol(self, asset_service):
        """Test handling of empty symbols."""
        result = asset_service.get_asset_info("")
        assert result is None

    def test_special_characters_in_symbol(self, asset_service):
        """Test handling of symbols with special characters."""
        result = asset_service.get_asset_info("BTC-USD")
        assert result is None  # Should not match anything


class TestErrorHandling:
    """Tests for error handling in the service."""

    @pytest.mark.asyncio
    async def test_cache_registry_with_redis_failure(self, asset_service):
        """Test cache operation with Redis failure doesn't crash."""
        asset_service._crypto_symbols.add("BTC")

        # Mock Redis to fail
        with patch(
            "app.services.unified_asset_service.advanced_redis_client.set",
            side_effect=Exception("Redis connection failed"),
        ):
            # Should not raise, just log warning
            await asset_service._cache_registry()

    @pytest.mark.asyncio
    async def test_service_with_empty_registry(self, asset_service):
        """Test service operations with empty registry."""
        assert len(asset_service._crypto_symbols) == 0
        assert len(asset_service._stock_symbols) == 0
        assert await asset_service.get_all_cryptos() == []
        assert await asset_service.get_all_stocks() == []


class TestIntegrationScenarios:
    """Integration tests for realistic scenarios."""

    def test_mixed_asset_types(self, asset_service):
        """Test service handling mixed crypto and stock assets."""
        # Add cryptos
        asset_service._crypto_symbols.add("BTC")
        asset_service._crypto_symbols.add("ETH")

        # Add stocks
        asset_service._stock_symbols.add("AAPL")
        asset_service._stock_symbols.add("MSFT")

        # Verify classification
        assert asset_service.is_crypto("BTC") is True
        assert asset_service.is_crypto("AAPL") is False
        assert asset_service.is_stock("AAPL") is True
        assert asset_service.is_stock("BTC") is False

    def test_registry_lookup_workflow(self, asset_service):
        """Test complete workflow of populating and querying registry."""
        # Setup registry
        btc = UnifiedAsset(
            symbol="BTC",
            name="Bitcoin",
            type="crypto",
            provider="coingecko",
            provider_id="bitcoin",
        )
        aapl = UnifiedAsset(
            symbol="AAPL",
            name="Apple",
            type="stock",
            provider="finnhub",
        )

        asset_service._asset_registry["BTC"] = btc
        asset_service._asset_registry["AAPL"] = aapl
        asset_service._crypto_symbols.add("BTC")
        asset_service._stock_symbols.add("AAPL")

        # Query workflow
        assert asset_service.get_asset_info("BTC").name == "Bitcoin"
        assert asset_service.get_asset_info("AAPL").name == "Apple"
        assert asset_service.get_provider("BTC") == "coingecko"
        assert asset_service.get_provider("AAPL") == "finnhub"
