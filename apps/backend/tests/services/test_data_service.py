"""
Tests for app.services.data_service

Comprehensive tests for:
- DataProvider enum
- AssetType enum
- Symbol model
- OHLCData model
- DataProviderConfig model
- SymbolDirectory class
- OHLCAggregator class
- Global instances and startup/shutdown functions
"""

import json
import random
from datetime import datetime, timedelta, timezone
from unittest.mock import AsyncMock, MagicMock, patch

import aiohttp
import pytest

from app.services.data_service import (
    AssetType,
    DataProvider,
    DataProviderConfig,
    OHLCAggregator,
    OHLCData,
    Symbol,
    SymbolDirectory,
    ohlc_aggregator,
    shutdown_data_services,
    startup_data_services,
    symbol_directory,
)

# ============================================================================
# DataProvider Enum Tests
# ============================================================================


class TestDataProvider:
    """Tests for DataProvider enum."""

    def test_alpha_vantage_value(self):
        """Test ALPHA_VANTAGE value."""
        assert DataProvider.ALPHA_VANTAGE.value == "alphavantage"

    def test_finnhub_value(self):
        """Test FINNHUB value."""
        assert DataProvider.FINNHUB.value == "finnhub"

    def test_polygon_value(self):
        """Test POLYGON value."""
        assert DataProvider.POLYGON.value == "polygon"

    def test_twelve_data_value(self):
        """Test TWELVE_DATA value."""
        assert DataProvider.TWELVE_DATA.value == "twelvedata"

    def test_yahoo_finance_value(self):
        """Test YAHOO_FINANCE value."""
        assert DataProvider.YAHOO_FINANCE.value == "yahoo"

    def test_all_providers_exist(self):
        """Test all expected providers exist."""
        providers = [p.value for p in DataProvider]
        assert len(providers) >= 5


# ============================================================================
# AssetType Enum Tests
# ============================================================================


class TestAssetType:
    """Tests for AssetType enum."""

    def test_stock_value(self):
        """Test STOCK value."""
        assert AssetType.STOCK.value == "stock"

    def test_crypto_value(self):
        """Test CRYPTO value."""
        assert AssetType.CRYPTO.value == "crypto"

    def test_forex_value(self):
        """Test FOREX value."""
        assert AssetType.FOREX.value == "forex"

    def test_commodity_value(self):
        """Test COMMODITY value."""
        assert AssetType.COMMODITY.value == "commodity"

    def test_index_value(self):
        """Test INDEX value."""
        assert AssetType.INDEX.value == "index"


# ============================================================================
# Symbol Model Tests
# ============================================================================


class TestSymbol:
    """Tests for Symbol model."""

    @pytest.fixture
    def sample_symbol(self):
        """Create sample symbol."""
        return Symbol(
            symbol="AAPL",
            name="Apple Inc.",
            asset_type=AssetType.STOCK,
            exchange="NASDAQ",
            currency="USD",
            country="US",
            sector="Technology",
            industry="Consumer Electronics",
            market_cap=3000000000000,
            description="Apple Inc. designs, manufactures, and markets...",
            is_active=True,
            last_updated=datetime.now(timezone.utc),
        )

    def test_symbol_creation(self, sample_symbol):
        """Test symbol creation."""
        assert sample_symbol.symbol == "AAPL"
        assert sample_symbol.name == "Apple Inc."
        assert sample_symbol.asset_type == AssetType.STOCK
        assert sample_symbol.is_active is True

    def test_symbol_optional_fields(self):
        """Test symbol with minimal fields."""
        symbol = Symbol(
            symbol="TEST",
            name="Test Asset",
            asset_type=AssetType.CRYPTO,
            exchange="CRYPTO",
            currency="USD",
            last_updated=datetime.now(timezone.utc),
        )
        assert symbol.country is None
        assert symbol.sector is None
        assert symbol.industry is None
        assert symbol.market_cap is None
        assert symbol.description is None


# ============================================================================
# OHLCData Model Tests
# ============================================================================


class TestOHLCData:
    """Tests for OHLCData model."""

    @pytest.fixture
    def sample_ohlc(self):
        """Create sample OHLC data."""
        return OHLCData(
            symbol="AAPL",
            timestamp=datetime.now(timezone.utc),
            open=150.0,
            high=152.0,
            low=149.0,
            close=151.5,
            volume=1000000,
            provider=DataProvider.YAHOO_FINANCE,
            timeframe="1D",
        )

    def test_ohlc_creation(self, sample_ohlc):
        """Test OHLC data creation."""
        assert sample_ohlc.symbol == "AAPL"
        assert sample_ohlc.open == 150.0
        assert sample_ohlc.high == 152.0
        assert sample_ohlc.low == 149.0
        assert sample_ohlc.close == 151.5
        assert sample_ohlc.volume == 1000000
        assert sample_ohlc.provider == DataProvider.YAHOO_FINANCE

    def test_default_timeframe(self):
        """Test default timeframe value."""
        ohlc = OHLCData(
            symbol="TEST",
            timestamp=datetime.now(timezone.utc),
            open=100.0,
            high=101.0,
            low=99.0,
            close=100.5,
            volume=500000,
            provider=DataProvider.ALPHA_VANTAGE,
        )
        assert ohlc.timeframe == "1D"


# ============================================================================
# DataProviderConfig Model Tests
# ============================================================================


class TestDataProviderConfig:
    """Tests for DataProviderConfig model."""

    @pytest.fixture
    def sample_config(self):
        """Create sample config."""
        return DataProviderConfig(
            provider=DataProvider.YAHOO_FINANCE,
            api_key="test_key_123",
            base_url="https://api.example.com",
            rate_limit=100,
            priority=1,
            enabled=True,
        )

    def test_config_creation(self, sample_config):
        """Test config creation."""
        assert sample_config.provider == DataProvider.YAHOO_FINANCE
        assert sample_config.api_key == "test_key_123"
        assert sample_config.base_url == "https://api.example.com"
        assert sample_config.rate_limit == 100
        assert sample_config.priority == 1
        assert sample_config.enabled is True

    def test_config_default_enabled(self):
        """Test default enabled value."""
        config = DataProviderConfig(
            provider=DataProvider.ALPHA_VANTAGE,
            api_key="key",
            base_url="https://example.com",
            rate_limit=5,
            priority=2,
        )
        assert config.enabled is True


# ============================================================================
# SymbolDirectory Tests
# ============================================================================


class TestSymbolDirectory:
    """Tests for SymbolDirectory class."""

    @pytest.fixture
    def directory(self):
        """Create fresh symbol directory."""
        return SymbolDirectory()

    def test_init_loads_default_symbols(self, directory):
        """Test default symbols are loaded."""
        assert len(directory.symbols) > 0

    def test_default_symbols_include_stocks(self, directory):
        """Test default symbols include major stocks."""
        assert "AAPL" in directory.symbols
        assert "MSFT" in directory.symbols
        assert "GOOGL" in directory.symbols

    def test_default_symbols_include_crypto(self, directory):
        """Test default symbols include crypto."""
        assert "BTCUSD" in directory.symbols
        assert "ETHUSD" in directory.symbols

    def test_default_symbols_include_forex(self, directory):
        """Test default symbols include forex."""
        assert "EURUSD" in directory.symbols
        assert "GBPUSD" in directory.symbols

    def test_default_symbols_include_indices(self, directory):
        """Test default symbols include indices."""
        assert "SPY" in directory.symbols
        assert "QQQ" in directory.symbols

    def test_default_symbols_include_commodities(self, directory):
        """Test default symbols include commodities."""
        assert "GOLD" in directory.symbols
        assert "SILVER" in directory.symbols

    def test_get_symbol_existing(self, directory):
        """Test get_symbol with existing symbol."""
        symbol = directory.get_symbol("AAPL")
        assert symbol is not None
        assert symbol.symbol == "AAPL"
        assert symbol.asset_type == AssetType.STOCK

    def test_get_symbol_case_insensitive(self, directory):
        """Test get_symbol is case insensitive."""
        symbol = directory.get_symbol("aapl")
        assert symbol is not None
        assert symbol.symbol == "AAPL"

    def test_get_symbol_nonexistent(self, directory):
        """Test get_symbol with nonexistent symbol."""
        symbol = directory.get_symbol("NOTREAL123")
        assert symbol is None

    def test_get_symbols_by_type_stocks(self, directory):
        """Test get_symbols_by_type for stocks."""
        stocks = directory.get_symbols_by_type(AssetType.STOCK)
        assert len(stocks) > 0
        assert all(s.asset_type == AssetType.STOCK for s in stocks)

    def test_get_symbols_by_type_crypto(self, directory):
        """Test get_symbols_by_type for crypto."""
        crypto = directory.get_symbols_by_type(AssetType.CRYPTO)
        assert len(crypto) > 0
        assert all(s.asset_type == AssetType.CRYPTO for s in crypto)

    @pytest.mark.asyncio
    async def test_search_symbols_exact_match(self, directory):
        """Test search_symbols with exact match."""
        results = await directory.search_symbols("AAPL")
        assert len(results) > 0
        assert results[0].symbol == "AAPL"

    @pytest.mark.asyncio
    async def test_search_symbols_partial_match(self, directory):
        """Test search_symbols with partial match."""
        results = await directory.search_symbols("AA")
        assert len(results) > 0
        assert any(r.symbol == "AAPL" for r in results)

    @pytest.mark.asyncio
    async def test_search_symbols_by_name(self, directory):
        """Test search_symbols matching name."""
        results = await directory.search_symbols("APPLE")
        assert len(results) > 0

    @pytest.mark.asyncio
    async def test_search_symbols_with_type_filter(self, directory):
        """Test search_symbols with asset type filter."""
        results = await directory.search_symbols("BTC", asset_type=AssetType.CRYPTO)
        assert all(r.asset_type == AssetType.CRYPTO for r in results)

    @pytest.mark.asyncio
    async def test_search_symbols_limit(self, directory):
        """Test search_symbols respects limit."""
        results = await directory.search_symbols("USD", limit=3)
        assert len(results) <= 3

    @pytest.mark.asyncio
    async def test_search_symbols_case_insensitive(self, directory):
        """Test search_symbols is case insensitive."""
        results_upper = await directory.search_symbols("AAPL")
        results_lower = await directory.search_symbols("aapl")
        assert len(results_upper) == len(results_lower)


# ============================================================================
# OHLCAggregator Tests
# ============================================================================


class TestOHLCAggregatorInit:
    """Tests for OHLCAggregator initialization."""

    def test_init(self):
        """Test basic initialization."""
        aggregator = OHLCAggregator()

        assert aggregator.providers == []
        assert aggregator.session is None
        assert aggregator.cache == {}
        assert aggregator.cache_ttl == timedelta(minutes=5)


class TestOHLCAggregatorInitialize:
    """Tests for OHLCAggregator.initialize method."""

    @pytest.fixture
    def aggregator(self):
        """Create aggregator instance."""
        return OHLCAggregator()

    @pytest.mark.asyncio
    async def test_initialize_creates_session(self, aggregator):
        """Test initialize creates HTTP session."""
        await aggregator.initialize()

        assert aggregator.session is not None
        assert isinstance(aggregator.session, aiohttp.ClientSession)

        await aggregator.cleanup()

    @pytest.mark.asyncio
    async def test_initialize_configures_providers(self, aggregator):
        """Test initialize configures providers."""
        await aggregator.initialize()

        assert len(aggregator.providers) > 0
        # Check Yahoo Finance is first (priority 1)
        assert aggregator.providers[0].provider == DataProvider.YAHOO_FINANCE

        await aggregator.cleanup()

    @pytest.mark.asyncio
    async def test_initialize_sorts_by_priority(self, aggregator):
        """Test providers are sorted by priority."""
        await aggregator.initialize()

        for i in range(len(aggregator.providers) - 1):
            assert (
                aggregator.providers[i].priority <= aggregator.providers[i + 1].priority
            )

        await aggregator.cleanup()


class TestOHLCAggregatorTimeframeConversion:
    """Tests for timeframe conversion methods."""

    @pytest.fixture
    def aggregator(self):
        """Create aggregator instance."""
        return OHLCAggregator()

    def test_convert_timeframe_yahoo_1m(self, aggregator):
        """Test Yahoo timeframe conversion for 1m."""
        assert aggregator._convert_timeframe_yahoo("1m") == "1m"

    def test_convert_timeframe_yahoo_1h(self, aggregator):
        """Test Yahoo timeframe conversion for 1h."""
        assert aggregator._convert_timeframe_yahoo("1h") == "1h"

    def test_convert_timeframe_yahoo_1d(self, aggregator):
        """Test Yahoo timeframe conversion for 1D."""
        assert aggregator._convert_timeframe_yahoo("1D") == "1d"

    def test_convert_timeframe_yahoo_1w(self, aggregator):
        """Test Yahoo timeframe conversion for 1W."""
        assert aggregator._convert_timeframe_yahoo("1W") == "1wk"

    def test_convert_timeframe_yahoo_unknown(self, aggregator):
        """Test Yahoo timeframe conversion for unknown."""
        assert aggregator._convert_timeframe_yahoo("unknown") == "1d"

    def test_convert_timeframe_av_1m(self, aggregator):
        """Test Alpha Vantage timeframe conversion."""
        assert aggregator._convert_timeframe_av("1m") == "1min"

    def test_convert_timeframe_av_1h(self, aggregator):
        """Test Alpha Vantage timeframe conversion for 1h."""
        assert aggregator._convert_timeframe_av("1h") == "60min"

    def test_convert_timeframe_finnhub_1m(self, aggregator):
        """Test Finnhub timeframe conversion."""
        assert aggregator._convert_timeframe_finnhub("1m") == "1"

    def test_convert_timeframe_finnhub_1D(self, aggregator):
        """Test Finnhub timeframe conversion for 1D."""
        assert aggregator._convert_timeframe_finnhub("1D") == "D"

    def test_get_timeframe_seconds_1m(self, aggregator):
        """Test timeframe seconds for 1m."""
        assert aggregator._get_timeframe_seconds("1m") == 60

    def test_get_timeframe_seconds_1h(self, aggregator):
        """Test timeframe seconds for 1h."""
        assert aggregator._get_timeframe_seconds("1h") == 3600

    def test_get_timeframe_seconds_1D(self, aggregator):
        """Test timeframe seconds for 1D."""
        assert aggregator._get_timeframe_seconds("1D") == 86400


class TestOHLCAggregatorMockData:
    """Tests for mock data generation."""

    @pytest.fixture
    def aggregator(self):
        """Create aggregator instance."""
        return OHLCAggregator()

    @pytest.mark.asyncio
    async def test_generate_mock_data_returns_correct_count(self, aggregator):
        """Test mock data generation returns correct count."""
        data = await aggregator._generate_mock_data("TEST", "1D", 50)

        assert len(data) == 50

    @pytest.mark.asyncio
    async def test_generate_mock_data_correct_symbol(self, aggregator):
        """Test mock data has correct symbol."""
        data = await aggregator._generate_mock_data("AAPL", "1D", 10)

        assert all(d.symbol == "AAPL" for d in data)

    @pytest.mark.asyncio
    async def test_generate_mock_data_valid_ohlc(self, aggregator):
        """Test mock data has valid OHLC values."""
        data = await aggregator._generate_mock_data("TEST", "1D", 10)

        for ohlc in data:
            assert ohlc.high >= ohlc.open
            assert ohlc.high >= ohlc.close
            assert ohlc.low <= ohlc.open
            assert ohlc.low <= ohlc.close
            assert ohlc.volume > 0

    @pytest.mark.asyncio
    async def test_generate_mock_data_sorted_by_timestamp(self, aggregator):
        """Test mock data is sorted by timestamp."""
        data = await aggregator._generate_mock_data("TEST", "1D", 20)

        for i in range(len(data) - 1):
            assert data[i].timestamp <= data[i + 1].timestamp


class TestOHLCAggregatorFetchYahoo:
    """Tests for Yahoo Finance fetching."""

    @pytest.fixture
    def aggregator(self):
        """Create and initialize aggregator."""
        agg = OHLCAggregator()
        return agg

    @pytest.fixture
    def yahoo_config(self):
        """Create Yahoo config."""
        return DataProviderConfig(
            provider=DataProvider.YAHOO_FINANCE,
            api_key="",
            base_url="https://query1.finance.yahoo.com/v7/finance/chart",
            rate_limit=100,
            priority=1,
            enabled=True,
        )

    @pytest.mark.asyncio
    async def test_fetch_yahoo_finance_success(self, aggregator, yahoo_config):
        """Test successful Yahoo Finance fetch."""
        await aggregator.initialize()

        mock_response = {
            "chart": {
                "result": [
                    {
                        "timestamp": [1704067200, 1704153600],
                        "indicators": {
                            "quote": [
                                {
                                    "open": [150.0, 151.0],
                                    "high": [152.0, 153.0],
                                    "low": [149.0, 150.0],
                                    "close": [151.0, 152.0],
                                    "volume": [1000000, 1100000],
                                }
                            ]
                        },
                    }
                ]
            }
        }

        mock_cm = AsyncMock()
        mock_cm.__aenter__.return_value.status = 200
        mock_cm.__aenter__.return_value.json = AsyncMock(return_value=mock_response)
        aggregator.session.get = MagicMock(return_value=mock_cm)

        data = await aggregator._fetch_yahoo_finance(yahoo_config, "AAPL", "1D", 10)

        assert len(data) == 2
        assert data[0].symbol == "AAPL"
        assert data[0].open == 150.0

        await aggregator.cleanup()

    @pytest.mark.asyncio
    async def test_fetch_yahoo_finance_http_error(self, aggregator, yahoo_config):
        """Test Yahoo Finance with HTTP error."""
        await aggregator.initialize()

        mock_cm = AsyncMock()
        mock_cm.__aenter__.return_value.status = 404
        aggregator.session.get = MagicMock(return_value=mock_cm)

        with pytest.raises(Exception) as excinfo:
            await aggregator._fetch_yahoo_finance(yahoo_config, "INVALID", "1D", 10)

        assert "HTTP 404" in str(excinfo.value)

        await aggregator.cleanup()

    @pytest.mark.asyncio
    async def test_fetch_yahoo_finance_no_data(self, aggregator, yahoo_config):
        """Test Yahoo Finance with no data."""
        await aggregator.initialize()

        mock_response = {"chart": {"result": None}}

        mock_cm = AsyncMock()
        mock_cm.__aenter__.return_value.status = 200
        mock_cm.__aenter__.return_value.json = AsyncMock(return_value=mock_response)
        aggregator.session.get = MagicMock(return_value=mock_cm)

        with pytest.raises(Exception) as excinfo:
            await aggregator._fetch_yahoo_finance(yahoo_config, "TEST", "1D", 10)

        assert "No data returned" in str(excinfo.value)

        await aggregator.cleanup()


class TestOHLCAggregatorFetchAlphaVantage:
    """Tests for Alpha Vantage fetching."""

    @pytest.fixture
    def aggregator(self):
        """Create aggregator."""
        return OHLCAggregator()

    @pytest.fixture
    def av_config(self):
        """Create Alpha Vantage config."""
        return DataProviderConfig(
            provider=DataProvider.ALPHA_VANTAGE,
            api_key="test_key",
            base_url="https://www.alphavantage.co/query",
            rate_limit=5,
            priority=2,
            enabled=True,
        )

    @pytest.mark.asyncio
    async def test_fetch_alpha_vantage_success(self, aggregator, av_config):
        """Test successful Alpha Vantage fetch."""
        await aggregator.initialize()

        mock_response = {
            "Time Series (Daily)": {
                "2024-01-01": {
                    "1. open": "150.0",
                    "2. high": "152.0",
                    "3. low": "149.0",
                    "4. close": "151.0",
                    "5. volume": "1000000",
                },
                "2024-01-02": {
                    "1. open": "151.0",
                    "2. high": "153.0",
                    "3. low": "150.0",
                    "4. close": "152.0",
                    "5. volume": "1100000",
                },
            }
        }

        mock_cm = AsyncMock()
        mock_cm.__aenter__.return_value.status = 200
        mock_cm.__aenter__.return_value.json = AsyncMock(return_value=mock_response)
        aggregator.session.get = MagicMock(return_value=mock_cm)

        data = await aggregator._fetch_alpha_vantage(av_config, "AAPL", "1D", 10)

        assert len(data) == 2
        assert data[0].symbol == "AAPL"
        assert data[0].provider == DataProvider.ALPHA_VANTAGE

        await aggregator.cleanup()

    @pytest.mark.asyncio
    async def test_fetch_alpha_vantage_no_time_series(self, aggregator, av_config):
        """Test Alpha Vantage with no time series."""
        await aggregator.initialize()

        mock_response = {"Error Message": "Invalid symbol"}

        mock_cm = AsyncMock()
        mock_cm.__aenter__.return_value.status = 200
        mock_cm.__aenter__.return_value.json = AsyncMock(return_value=mock_response)
        aggregator.session.get = MagicMock(return_value=mock_cm)

        with pytest.raises(Exception) as excinfo:
            await aggregator._fetch_alpha_vantage(av_config, "INVALID", "1D", 10)

        assert "No time series data" in str(excinfo.value)

        await aggregator.cleanup()


class TestOHLCAggregatorFetchFinnhub:
    """Tests for Finnhub fetching."""

    @pytest.fixture
    def aggregator(self):
        """Create aggregator."""
        return OHLCAggregator()

    @pytest.fixture
    def finnhub_config(self):
        """Create Finnhub config."""
        return DataProviderConfig(
            provider=DataProvider.FINNHUB,
            api_key="test_key",
            base_url="https://finnhub.io/api/v1",
            rate_limit=60,
            priority=3,
            enabled=True,
        )

    @pytest.mark.asyncio
    async def test_fetch_finnhub_success(self, aggregator, finnhub_config):
        """Test successful Finnhub fetch."""
        await aggregator.initialize()

        mock_response = {
            "s": "ok",
            "t": [1704067200, 1704153600],
            "o": [150.0, 151.0],
            "h": [152.0, 153.0],
            "l": [149.0, 150.0],
            "c": [151.0, 152.0],
            "v": [1000000, 1100000],
        }

        mock_cm = AsyncMock()
        mock_cm.__aenter__.return_value.status = 200
        mock_cm.__aenter__.return_value.json = AsyncMock(return_value=mock_response)
        aggregator.session.get = MagicMock(return_value=mock_cm)

        data = await aggregator._fetch_finnhub(finnhub_config, "AAPL", "1D", 10)

        assert len(data) == 2
        assert data[0].symbol == "AAPL"
        assert data[0].provider == DataProvider.FINNHUB

        await aggregator.cleanup()

    @pytest.mark.asyncio
    async def test_fetch_finnhub_no_data(self, aggregator, finnhub_config):
        """Test Finnhub with no data."""
        await aggregator.initialize()

        mock_response = {"s": "no_data"}

        mock_cm = AsyncMock()
        mock_cm.__aenter__.return_value.status = 200
        mock_cm.__aenter__.return_value.json = AsyncMock(return_value=mock_response)
        aggregator.session.get = MagicMock(return_value=mock_cm)

        with pytest.raises(Exception) as excinfo:
            await aggregator._fetch_finnhub(finnhub_config, "INVALID", "1D", 10)

        assert "No data available" in str(excinfo.value)

        await aggregator.cleanup()


class TestOHLCAggregatorGetData:
    """Tests for main get_ohlc_data method."""

    @pytest.fixture
    def aggregator(self):
        """Create aggregator."""
        return OHLCAggregator()

    @pytest.mark.asyncio
    async def test_get_ohlc_data_from_cache(self, aggregator):
        """Test get_ohlc_data returns cached data."""
        await aggregator.initialize()

        # Pre-populate cache - use offset-naive datetime to match actual code
        cached_data = [
            OHLCData(
                symbol="AAPL",
                timestamp=datetime.now(),  # offset-naive like the actual code
                open=150.0,
                high=152.0,
                low=149.0,
                close=151.0,
                volume=1000000,
                provider=DataProvider.YAHOO_FINANCE,
                timeframe="1D",
            )
        ]
        aggregator.cache["AAPL_1D_10"] = cached_data

        result = await aggregator.get_ohlc_data("AAPL", timeframe="1D", limit=10)

        assert len(result) == 1
        assert result[0].symbol == "AAPL"

        await aggregator.cleanup()

    @pytest.mark.asyncio
    async def test_get_ohlc_data_provider_failover(self, aggregator):
        """Test get_ohlc_data falls back to mock data on all failures."""
        await aggregator.initialize()

        # Make all providers fail
        aggregator._fetch_from_provider = AsyncMock(
            side_effect=Exception("Provider error")
        )

        result = await aggregator.get_ohlc_data("AAPL", timeframe="1D", limit=10)

        # Should return mock data
        assert len(result) == 10

        await aggregator.cleanup()

    @pytest.mark.asyncio
    async def test_get_ohlc_data_caches_result(self, aggregator):
        """Test get_ohlc_data caches successful results."""
        await aggregator.initialize()

        # Mock successful provider fetch
        mock_data = [
            OHLCData(
                symbol="TEST",
                timestamp=datetime.now(timezone.utc),
                open=100.0,
                high=101.0,
                low=99.0,
                close=100.5,
                volume=500000,
                provider=DataProvider.YAHOO_FINANCE,
                timeframe="1D",
            )
        ]
        aggregator._fetch_from_provider = AsyncMock(return_value=mock_data)

        await aggregator.get_ohlc_data("TEST", timeframe="1D", limit=10)

        assert "TEST_1D_10" in aggregator.cache

        await aggregator.cleanup()


class TestOHLCAggregatorFetchFromProvider:
    """Tests for _fetch_from_provider dispatcher."""

    @pytest.fixture
    def aggregator(self):
        """Create aggregator."""
        return OHLCAggregator()

    @pytest.mark.asyncio
    async def test_fetch_from_provider_yahoo(self, aggregator):
        """Test fetch dispatches to Yahoo Finance."""
        await aggregator.initialize()

        yahoo_config = DataProviderConfig(
            provider=DataProvider.YAHOO_FINANCE,
            api_key="",
            base_url="https://example.com",
            rate_limit=100,
            priority=1,
            enabled=True,
        )

        aggregator._fetch_yahoo_finance = AsyncMock(return_value=[])

        await aggregator._fetch_from_provider(
            yahoo_config, "AAPL", "1D", None, None, 10
        )

        aggregator._fetch_yahoo_finance.assert_called_once()

        await aggregator.cleanup()

    @pytest.mark.asyncio
    async def test_fetch_from_provider_alpha_vantage(self, aggregator):
        """Test fetch dispatches to Alpha Vantage."""
        await aggregator.initialize()

        av_config = DataProviderConfig(
            provider=DataProvider.ALPHA_VANTAGE,
            api_key="key",
            base_url="https://example.com",
            rate_limit=5,
            priority=2,
            enabled=True,
        )

        aggregator._fetch_alpha_vantage = AsyncMock(return_value=[])

        await aggregator._fetch_from_provider(av_config, "AAPL", "1D", None, None, 10)

        aggregator._fetch_alpha_vantage.assert_called_once()

        await aggregator.cleanup()

    @pytest.mark.asyncio
    async def test_fetch_from_provider_finnhub(self, aggregator):
        """Test fetch dispatches to Finnhub."""
        await aggregator.initialize()

        fh_config = DataProviderConfig(
            provider=DataProvider.FINNHUB,
            api_key="key",
            base_url="https://example.com",
            rate_limit=60,
            priority=3,
            enabled=True,
        )

        aggregator._fetch_finnhub = AsyncMock(return_value=[])

        await aggregator._fetch_from_provider(fh_config, "AAPL", "1D", None, None, 10)

        aggregator._fetch_finnhub.assert_called_once()

        await aggregator.cleanup()

    @pytest.mark.asyncio
    async def test_fetch_from_provider_not_implemented(self, aggregator):
        """Test fetch raises for unimplemented provider."""
        await aggregator.initialize()

        polygon_config = DataProviderConfig(
            provider=DataProvider.POLYGON,
            api_key="key",
            base_url="https://example.com",
            rate_limit=100,
            priority=4,
            enabled=True,
        )

        with pytest.raises(NotImplementedError):
            await aggregator._fetch_from_provider(
                polygon_config, "AAPL", "1D", None, None, 10
            )

        await aggregator.cleanup()


class TestOHLCAggregatorCleanup:
    """Tests for cleanup method."""

    @pytest.mark.asyncio
    async def test_cleanup_closes_session(self):
        """Test cleanup closes HTTP session."""
        aggregator = OHLCAggregator()
        await aggregator.initialize()

        assert aggregator.session is not None

        await aggregator.cleanup()

        assert aggregator.session.closed


# ============================================================================
# Global Instance Tests
# ============================================================================


class TestGlobalInstances:
    """Tests for global instances."""

    def test_symbol_directory_exists(self):
        """Test global symbol_directory exists."""
        assert symbol_directory is not None
        assert isinstance(symbol_directory, SymbolDirectory)

    def test_ohlc_aggregator_exists(self):
        """Test global ohlc_aggregator exists."""
        assert ohlc_aggregator is not None
        assert isinstance(ohlc_aggregator, OHLCAggregator)


# ============================================================================
# Startup/Shutdown Tests
# ============================================================================


class TestStartupShutdown:
    """Tests for startup and shutdown functions."""

    @pytest.mark.asyncio
    async def test_startup_data_services(self):
        """Test startup initializes aggregator."""
        # Create fresh aggregator for test
        test_aggregator = OHLCAggregator()

        with patch(
            "app.services.data_service.ohlc_aggregator",
            test_aggregator,
        ):
            await test_aggregator.initialize()
            assert test_aggregator.session is not None
            await test_aggregator.cleanup()

    @pytest.mark.asyncio
    async def test_shutdown_data_services(self):
        """Test shutdown cleans up aggregator."""
        test_aggregator = OHLCAggregator()
        await test_aggregator.initialize()

        with patch(
            "app.services.data_service.ohlc_aggregator",
            test_aggregator,
        ):
            await test_aggregator.cleanup()
            assert test_aggregator.session.closed


# ============================================================================
# Session Not Initialized Error Tests
# ============================================================================


class TestSessionNotInitialized:
    """Tests for session not initialized errors."""

    @pytest.fixture
    def aggregator(self):
        """Create uninitialized aggregator."""
        return OHLCAggregator()

    @pytest.fixture
    def yahoo_config(self):
        """Create Yahoo config."""
        return DataProviderConfig(
            provider=DataProvider.YAHOO_FINANCE,
            api_key="",
            base_url="https://example.com",
            rate_limit=100,
            priority=1,
            enabled=True,
        )

    @pytest.mark.asyncio
    async def test_fetch_yahoo_without_session(self, aggregator, yahoo_config):
        """Test Yahoo fetch without initialized session."""
        with pytest.raises(RuntimeError) as excinfo:
            await aggregator._fetch_yahoo_finance(yahoo_config, "AAPL", "1D", 10)

        assert "not initialized" in str(excinfo.value)

    @pytest.mark.asyncio
    async def test_fetch_alpha_vantage_without_session(self, aggregator):
        """Test Alpha Vantage fetch without initialized session."""
        av_config = DataProviderConfig(
            provider=DataProvider.ALPHA_VANTAGE,
            api_key="key",
            base_url="https://example.com",
            rate_limit=5,
            priority=2,
            enabled=True,
        )

        with pytest.raises(RuntimeError) as excinfo:
            await aggregator._fetch_alpha_vantage(av_config, "AAPL", "1D", 10)

        assert "not initialized" in str(excinfo.value)

    @pytest.mark.asyncio
    async def test_fetch_finnhub_without_session(self, aggregator):
        """Test Finnhub fetch without initialized session."""
        fh_config = DataProviderConfig(
            provider=DataProvider.FINNHUB,
            api_key="key",
            base_url="https://example.com",
            rate_limit=60,
            priority=3,
            enabled=True,
        )

        with pytest.raises(RuntimeError) as excinfo:
            await aggregator._fetch_finnhub(fh_config, "AAPL", "1D", 10)

        assert "not initialized" in str(excinfo.value)
