"""
Tests for app.routers.market_data

Comprehensive tests for market data API endpoints.
"""

from datetime import datetime
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient

from app.routers.market_data import (
    AssetTypeStats,
    MarketOverview,
    OHLCResponse,
    SymbolSearchResponse,
    get_market_overview,
    get_ohlc_data,
    get_popular_symbols,
    get_similar_symbols,
    get_symbol_info,
    list_symbols,
    router,
    search_symbols,
    stream_symbol_data,
)
from app.services.data_service import AssetType, OHLCData, Symbol

# ============================================================================
# FIXTURES
# ============================================================================


@pytest.fixture
def sample_symbol():
    """Create a sample Symbol object."""
    return Symbol(
        symbol="AAPL",
        name="Apple Inc.",
        asset_type=AssetType.STOCK,
        exchange="NASDAQ",
        currency="USD",
        is_active=True,
        sector="Technology",
        industry="Consumer Electronics",
        last_updated=datetime.now(),
    )


@pytest.fixture
def sample_crypto_symbol():
    """Create a sample crypto Symbol object."""
    return Symbol(
        symbol="BTCUSD",
        name="Bitcoin",
        asset_type=AssetType.CRYPTO,
        exchange="CRYPTO",
        currency="USD",
        is_active=True,
        last_updated=datetime.now(),
    )


@pytest.fixture
def sample_ohlc_data():
    """Create sample OHLC data."""
    from app.services.data_service import DataProvider

    return [
        OHLCData(
            symbol="AAPL",
            timestamp=datetime(2024, 1, 1, 10, 0),
            open=150.0,
            high=155.0,
            low=149.0,
            close=154.0,
            volume=1000000,
            provider=DataProvider.ALPHA_VANTAGE,
        ),
        OHLCData(
            symbol="AAPL",
            timestamp=datetime(2024, 1, 2, 10, 0),
            open=154.0,
            high=158.0,
            low=153.0,
            close=157.0,
            volume=1200000,
            provider=DataProvider.ALPHA_VANTAGE,
        ),
    ]


@pytest.fixture
def inactive_symbol():
    """Create an inactive Symbol object."""
    return Symbol(
        symbol="INACTIVE",
        name="Inactive Stock",
        asset_type=AssetType.STOCK,
        exchange="NYSE",
        currency="USD",
        is_active=False,
        last_updated=datetime.now(),
    )


# ============================================================================
# RESPONSE MODEL TESTS
# ============================================================================


class TestResponseModels:
    """Tests for response model classes."""

    def test_symbol_search_response(self, sample_symbol):
        """Test SymbolSearchResponse model."""
        response = SymbolSearchResponse(
            symbols=[sample_symbol],
            total=1,
            query="AAPL",
        )
        assert response.total == 1
        assert response.query == "AAPL"
        assert len(response.symbols) == 1

    def test_ohlc_response(self, sample_ohlc_data):
        """Test OHLCResponse model."""
        response = OHLCResponse(
            symbol="AAPL",
            timeframe="1D",
            data=sample_ohlc_data,
            count=2,
            provider="fmp",
        )
        assert response.symbol == "AAPL"
        assert response.timeframe == "1D"
        assert response.count == 2
        assert response.provider == "fmp"

    def test_asset_type_stats(self):
        """Test AssetTypeStats model."""
        stats = AssetTypeStats(
            asset_type=AssetType.STOCK,
            count=100,
        )
        assert stats.asset_type == AssetType.STOCK
        assert stats.count == 100

    def test_market_overview(self):
        """Test MarketOverview model."""
        stats = [AssetTypeStats(asset_type=AssetType.STOCK, count=50)]
        overview = MarketOverview(
            total_symbols=50,
            asset_types=stats,
            last_updated=datetime.now(),
        )
        assert overview.total_symbols == 50
        assert len(overview.asset_types) == 1


# ============================================================================
# SEARCH SYMBOLS TESTS
# ============================================================================


class TestSearchSymbols:
    """Tests for search_symbols endpoint."""

    @pytest.mark.asyncio
    async def test_search_symbols_success(self, sample_symbol):
        """Test successful symbol search."""
        with patch("app.routers.market_data.symbol_directory") as mock_directory:
            mock_directory.search_symbols = AsyncMock(return_value=[sample_symbol])

            response = await search_symbols(q="AAPL")

            assert response.query == "AAPL"
            assert response.total == 1
            assert len(response.symbols) == 1
            mock_directory.search_symbols.assert_called_once()

    @pytest.mark.asyncio
    async def test_search_symbols_with_asset_type(self, sample_symbol):
        """Test symbol search with asset type filter."""
        with patch("app.routers.market_data.symbol_directory") as mock_directory:
            mock_directory.search_symbols = AsyncMock(return_value=[sample_symbol])

            response = await search_symbols(q="tech", asset_type=AssetType.STOCK)

            mock_directory.search_symbols.assert_called_once()
            call_kwargs = mock_directory.search_symbols.call_args.kwargs
            assert call_kwargs["query"] == "tech"

    @pytest.mark.asyncio
    async def test_search_symbols_with_limit(self, sample_symbol):
        """Test symbol search with custom limit."""
        with patch("app.routers.market_data.symbol_directory") as mock_directory:
            mock_directory.search_symbols = AsyncMock(return_value=[sample_symbol])

            response = await search_symbols(q="AAPL", limit=10)

            mock_directory.search_symbols.assert_called_once()
            call_kwargs = mock_directory.search_symbols.call_args.kwargs
            assert call_kwargs["query"] == "AAPL"

    @pytest.mark.asyncio
    async def test_search_symbols_empty_results(self):
        """Test symbol search with no results."""
        with patch("app.routers.market_data.symbol_directory") as mock_directory:
            mock_directory.search_symbols = AsyncMock(return_value=[])

            response = await search_symbols(q="NONEXISTENT")

            assert response.total == 0
            assert response.symbols == []

    @pytest.mark.asyncio
    async def test_search_symbols_exception(self):
        """Test symbol search error handling."""
        with patch("app.routers.market_data.symbol_directory") as mock_directory:
            mock_directory.search_symbols = AsyncMock(
                side_effect=Exception("Database error")
            )

            with pytest.raises(HTTPException) as exc_info:
                await search_symbols(q="AAPL")

            assert exc_info.value.status_code == 500
            assert "Search failed" in str(exc_info.value.detail)


# ============================================================================
# GET SYMBOL INFO TESTS
# ============================================================================


class TestGetSymbolInfo:
    """Tests for get_symbol_info endpoint."""

    @pytest.mark.asyncio
    async def test_get_symbol_info_success(self, sample_symbol):
        """Test successful symbol info retrieval."""
        with patch("app.routers.market_data.symbol_directory") as mock_directory:
            mock_directory.get_symbol.return_value = sample_symbol

            response = await get_symbol_info(symbol="aapl")

            assert response.symbol == "AAPL"
            mock_directory.get_symbol.assert_called_once_with("AAPL")

    @pytest.mark.asyncio
    async def test_get_symbol_info_uppercase_conversion(self, sample_symbol):
        """Test symbol is converted to uppercase."""
        with patch("app.routers.market_data.symbol_directory") as mock_directory:
            mock_directory.get_symbol.return_value = sample_symbol

            await get_symbol_info(symbol="aapl")

            mock_directory.get_symbol.assert_called_once_with("AAPL")

    @pytest.mark.asyncio
    async def test_get_symbol_info_not_found(self):
        """Test symbol not found error."""
        with patch("app.routers.market_data.symbol_directory") as mock_directory:
            mock_directory.get_symbol.return_value = None

            with pytest.raises(HTTPException) as exc_info:
                await get_symbol_info(symbol="INVALID")

            assert exc_info.value.status_code == 404
            assert "not found" in str(exc_info.value.detail)


# ============================================================================
# LIST SYMBOLS TESTS
# ============================================================================


class TestListSymbols:
    """Tests for list_symbols endpoint."""

    @pytest.mark.asyncio
    async def test_list_symbols_all(self, sample_symbol):
        """Test listing all symbols."""
        with patch("app.routers.market_data.symbol_directory") as mock_directory:
            mock_directory.symbols = {"AAPL": sample_symbol}

            response = await list_symbols(asset_type=None, limit=100)

            assert len(response) == 1
            assert response[0].symbol == "AAPL"

    @pytest.mark.asyncio
    async def test_list_symbols_by_asset_type(self, sample_symbol):
        """Test listing symbols by asset type."""
        with patch("app.routers.market_data.symbol_directory") as mock_directory:
            mock_directory.get_symbols_by_type.return_value = [sample_symbol]

            response = await list_symbols(asset_type=AssetType.STOCK, limit=100)

            mock_directory.get_symbols_by_type.assert_called_once_with(AssetType.STOCK)
            assert len(response) == 1

    @pytest.mark.asyncio
    async def test_list_symbols_limit(self, sample_symbol):
        """Test listing symbols with limit."""
        with patch("app.routers.market_data.symbol_directory") as mock_directory:
            # Create multiple active symbols
            symbols = {f"SYM{i}": MagicMock(is_active=True) for i in range(10)}
            mock_directory.symbols = symbols

            response = await list_symbols(asset_type=None, limit=5)

            assert len(response) <= 5

    @pytest.mark.asyncio
    async def test_list_symbols_filters_inactive(self, sample_symbol, inactive_symbol):
        """Test that inactive symbols are filtered out."""
        with patch("app.routers.market_data.symbol_directory") as mock_directory:
            mock_directory.symbols = {
                "AAPL": sample_symbol,
                "INACTIVE": inactive_symbol,
            }

            response = await list_symbols(asset_type=None, limit=100)

            assert len(response) == 1
            assert response[0].symbol == "AAPL"


# ============================================================================
# GET OHLC DATA TESTS
# ============================================================================


class TestGetOHLCData:
    """Tests for get_ohlc_data endpoint."""

    @pytest.mark.asyncio
    async def test_get_ohlc_data_success(self, sample_symbol, sample_ohlc_data):
        """Test successful OHLC data retrieval."""
        with patch("app.routers.market_data.symbol_directory") as mock_directory, patch(
            "app.routers.market_data.ohlc_aggregator"
        ) as mock_aggregator:
            mock_directory.get_symbol.return_value = sample_symbol
            mock_aggregator.get_ohlc_data = AsyncMock(return_value=sample_ohlc_data)

            response = await get_ohlc_data(symbol="AAPL", timeframe="1D")

            assert response.symbol == "AAPL"
            assert response.timeframe == "1D"
            assert response.count == 2

    @pytest.mark.asyncio
    async def test_get_ohlc_data_with_dates(self, sample_symbol, sample_ohlc_data):
        """Test OHLC data with date filters."""
        start = datetime(2024, 1, 1)
        end = datetime(2024, 1, 31)

        with patch("app.routers.market_data.symbol_directory") as mock_directory, patch(
            "app.routers.market_data.ohlc_aggregator"
        ) as mock_aggregator:
            mock_directory.get_symbol.return_value = sample_symbol
            mock_aggregator.get_ohlc_data = AsyncMock(return_value=sample_ohlc_data)

            response = await get_ohlc_data(
                symbol="AAPL",
                timeframe="1D",
                limit=100,
                start_date=start,
                end_date=end,
            )

            mock_aggregator.get_ohlc_data.assert_called_once()
            call_kwargs = mock_aggregator.get_ohlc_data.call_args.kwargs
            assert call_kwargs["symbol"] == "AAPL"
            assert call_kwargs["timeframe"] == "1D"
            assert call_kwargs["start_date"] == start
            assert call_kwargs["end_date"] == end

    @pytest.mark.asyncio
    async def test_get_ohlc_data_symbol_not_found(self):
        """Test OHLC data for non-existent symbol."""
        with patch("app.routers.market_data.symbol_directory") as mock_directory:
            mock_directory.get_symbol.return_value = None

            with pytest.raises(HTTPException) as exc_info:
                await get_ohlc_data(symbol="INVALID", timeframe="1D")

            assert exc_info.value.status_code == 404
            assert "not found" in str(exc_info.value.detail)

    @pytest.mark.asyncio
    async def test_get_ohlc_data_invalid_timeframe(self, sample_symbol):
        """Test OHLC data with invalid timeframe."""
        with patch("app.routers.market_data.symbol_directory") as mock_directory:
            mock_directory.get_symbol.return_value = sample_symbol

            with pytest.raises(HTTPException) as exc_info:
                await get_ohlc_data(symbol="AAPL", timeframe="INVALID")

            assert exc_info.value.status_code == 400
            assert "Invalid timeframe" in str(exc_info.value.detail)

    @pytest.mark.asyncio
    async def test_get_ohlc_data_valid_timeframes(
        self, sample_symbol, sample_ohlc_data
    ):
        """Test all valid timeframes."""
        valid_timeframes = ["1m", "5m", "15m", "30m", "1h", "1D", "1W", "1M"]

        with patch("app.routers.market_data.symbol_directory") as mock_directory, patch(
            "app.routers.market_data.ohlc_aggregator"
        ) as mock_aggregator:
            mock_directory.get_symbol.return_value = sample_symbol
            mock_aggregator.get_ohlc_data = AsyncMock(return_value=sample_ohlc_data)

            for tf in valid_timeframes:
                response = await get_ohlc_data(symbol="AAPL", timeframe=tf)
                assert response.timeframe == tf

    @pytest.mark.asyncio
    async def test_get_ohlc_data_empty_response(self, sample_symbol):
        """Test OHLC data with empty response."""
        with patch("app.routers.market_data.symbol_directory") as mock_directory, patch(
            "app.routers.market_data.ohlc_aggregator"
        ) as mock_aggregator:
            mock_directory.get_symbol.return_value = sample_symbol
            mock_aggregator.get_ohlc_data = AsyncMock(return_value=[])

            response = await get_ohlc_data(symbol="AAPL", timeframe="1D")

            assert response.count == 0
            assert response.provider == "none"

    @pytest.mark.asyncio
    async def test_get_ohlc_data_exception(self, sample_symbol):
        """Test OHLC data error handling."""
        with patch("app.routers.market_data.symbol_directory") as mock_directory, patch(
            "app.routers.market_data.ohlc_aggregator"
        ) as mock_aggregator:
            mock_directory.get_symbol.return_value = sample_symbol
            mock_aggregator.get_ohlc_data = AsyncMock(
                side_effect=Exception("API error")
            )

            with pytest.raises(HTTPException) as exc_info:
                await get_ohlc_data(symbol="AAPL", timeframe="1D")

            assert exc_info.value.status_code == 500
            assert "Failed to fetch OHLC data" in str(exc_info.value.detail)


# ============================================================================
# GET MARKET OVERVIEW TESTS
# ============================================================================


class TestGetMarketOverview:
    """Tests for get_market_overview endpoint."""

    @pytest.mark.asyncio
    async def test_get_market_overview_success(
        self, sample_symbol, sample_crypto_symbol
    ):
        """Test successful market overview."""
        with patch("app.routers.market_data.symbol_directory") as mock_directory:
            mock_directory.symbols = {
                "AAPL": sample_symbol,
                "BTCUSD": sample_crypto_symbol,
            }

            response = await get_market_overview()

            assert response.total_symbols == 2
            assert len(response.asset_types) == 2
            assert response.last_updated is not None

    @pytest.mark.asyncio
    async def test_get_market_overview_empty(self):
        """Test market overview with no symbols."""
        with patch("app.routers.market_data.symbol_directory") as mock_directory:
            mock_directory.symbols = {}

            response = await get_market_overview()

            assert response.total_symbols == 0
            assert response.asset_types == []

    @pytest.mark.asyncio
    async def test_get_market_overview_filters_inactive(
        self, sample_symbol, inactive_symbol
    ):
        """Test market overview filters inactive symbols."""
        with patch("app.routers.market_data.symbol_directory") as mock_directory:
            mock_directory.symbols = {
                "AAPL": sample_symbol,
                "INACTIVE": inactive_symbol,
            }

            response = await get_market_overview()

            assert response.total_symbols == 1


# ============================================================================
# GET POPULAR SYMBOLS TESTS
# ============================================================================


class TestGetPopularSymbols:
    """Tests for get_popular_symbols endpoint."""

    @pytest.mark.asyncio
    async def test_get_popular_symbols_success(self, sample_symbol):
        """Test successful popular symbols retrieval."""
        with patch("app.routers.market_data.symbol_directory") as mock_directory:
            mock_directory.get_symbol.return_value = sample_symbol

            response = await get_popular_symbols(limit=5)

            assert len(response) <= 5

    @pytest.mark.asyncio
    async def test_get_popular_symbols_some_missing(self, sample_symbol):
        """Test popular symbols when some don't exist."""
        with patch("app.routers.market_data.symbol_directory") as mock_directory:
            # Return symbol for some, None for others
            def get_symbol_side_effect(ticker):
                if ticker in ["AAPL", "MSFT"]:
                    return sample_symbol
                return None

            mock_directory.get_symbol.side_effect = get_symbol_side_effect

            response = await get_popular_symbols(limit=10)

            # Should only include found symbols
            assert len(response) <= 10

    @pytest.mark.asyncio
    async def test_get_popular_symbols_with_inactive(
        self, sample_symbol, inactive_symbol
    ):
        """Test popular symbols filters inactive."""
        with patch("app.routers.market_data.symbol_directory") as mock_directory:

            def get_symbol_side_effect(ticker):
                if ticker == "AAPL":
                    return sample_symbol
                return inactive_symbol

            mock_directory.get_symbol.side_effect = get_symbol_side_effect

            response = await get_popular_symbols(limit=5)

            # Inactive symbols should be filtered
            for sym in response:
                assert sym.is_active


# ============================================================================
# GET SIMILAR SYMBOLS TESTS
# ============================================================================


class TestGetSimilarSymbols:
    """Tests for get_similar_symbols endpoint."""

    @pytest.mark.asyncio
    async def test_get_similar_symbols_success(self, sample_symbol):
        """Test successful similar symbols retrieval."""
        similar = Symbol(
            symbol="MSFT",
            name="Microsoft",
            asset_type=AssetType.STOCK,
            exchange="NASDAQ",
            currency="USD",
            is_active=True,
            sector="Technology",
            industry="Software",
            last_updated=datetime.now(),
        )

        with patch("app.routers.market_data.symbol_directory") as mock_directory:
            mock_directory.get_symbol.return_value = sample_symbol
            mock_directory.symbols = {"AAPL": sample_symbol, "MSFT": similar}

            response = await get_similar_symbols(symbol="AAPL", limit=5)

            assert len(response) <= 5
            # Should not include the base symbol itself
            for sym in response:
                assert sym.symbol != "AAPL"

    @pytest.mark.asyncio
    async def test_get_similar_symbols_not_found(self):
        """Test similar symbols for non-existent base symbol."""
        with patch("app.routers.market_data.symbol_directory") as mock_directory:
            mock_directory.get_symbol.return_value = None

            with pytest.raises(HTTPException) as exc_info:
                await get_similar_symbols(symbol="INVALID")

            assert exc_info.value.status_code == 404

    @pytest.mark.asyncio
    async def test_get_similar_symbols_no_matches(self, sample_symbol):
        """Test similar symbols with no matches."""
        with patch("app.routers.market_data.symbol_directory") as mock_directory:
            mock_directory.get_symbol.return_value = sample_symbol
            # Only the base symbol exists
            mock_directory.symbols = {"AAPL": sample_symbol}

            response = await get_similar_symbols(symbol="AAPL")

            assert response == []

    @pytest.mark.asyncio
    async def test_get_similar_symbols_limit_respected(self, sample_symbol):
        """Test similar symbols respects limit."""
        # Create many similar symbols
        similar_symbols = {}
        for i in range(20):
            similar_symbols[f"SYM{i}"] = Symbol(
                symbol=f"SYM{i}",
                name=f"Symbol {i}",
                asset_type=AssetType.STOCK,
                exchange="NASDAQ",
                currency="USD",
                is_active=True,
                sector="Technology",
                industry="Consumer Electronics",
                last_updated=datetime.now(),
            )
        similar_symbols["AAPL"] = sample_symbol

        with patch("app.routers.market_data.symbol_directory") as mock_directory:
            mock_directory.get_symbol.return_value = sample_symbol
            mock_directory.symbols = similar_symbols

            response = await get_similar_symbols(symbol="AAPL", limit=5)

            assert len(response) <= 5


# ============================================================================
# STREAM SYMBOL DATA TESTS
# ============================================================================


class TestStreamSymbolData:
    """Tests for stream_symbol_data endpoint."""

    @pytest.mark.asyncio
    async def test_stream_symbol_data_returns_placeholder(self):
        """Test stream endpoint returns placeholder response."""
        response = await stream_symbol_data(symbol="AAPL")

        assert "message" in response
        assert "AAPL" in response["message"]
        assert response["status"] == "not_implemented"
        assert "endpoint" in response
        assert "ws://" in response["endpoint"]


# ============================================================================
# ROUTER TESTS
# ============================================================================


class TestRouter:
    """Tests for router configuration."""

    def test_router_prefix(self):
        """Test router has correct prefix."""
        assert router.prefix == "/api/v1"

    def test_router_tags(self):
        """Test router has correct tags."""
        assert "market-data" in router.tags
