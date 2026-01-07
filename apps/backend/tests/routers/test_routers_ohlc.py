"""
Tests for app.routers.ohlc

Comprehensive tests for OHLC (Open, High, Low, Close) data router.
Tests symbol conversion, mock data generation, and the main OHLC endpoint.
"""

from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.routers.ohlc import (
    convert_to_yahoo_symbol,
    generate_mock_data,
    ohlc,
    router,
)

# ============================================================================
# FIXTURES
# ============================================================================


@pytest.fixture
def mock_ohlc_data():
    """Create mock OHLC data objects"""
    data = []
    for i in range(5):
        mock_item = MagicMock()
        mock_item.timestamp = datetime(2024, 1, 1, i, 0, 0, tzinfo=timezone.utc)
        mock_item.open = 100.0 + i
        mock_item.high = 105.0 + i
        mock_item.low = 95.0 + i
        mock_item.close = 102.0 + i
        mock_item.volume = 1000.0 + i * 100
        data.append(mock_item)
    return data


@pytest.fixture
def mock_ohlc_aggregator():
    """Mock the ohlc_aggregator service"""
    aggregator = MagicMock()
    aggregator.session = MagicMock()  # Already initialized
    aggregator.initialize = AsyncMock()
    aggregator.get_ohlc_data = AsyncMock()
    return aggregator


# ============================================================================
# GENERATE MOCK DATA TESTS
# ============================================================================


class TestGenerateMockData:
    """Tests for generate_mock_data function"""

    def test_generates_correct_number_of_candles(self):
        """Test that correct number of candles is generated"""
        result = generate_mock_data("BTCUSD", "1h", 10)
        assert len(result) == 10

    def test_btc_symbol_uses_higher_base_price(self):
        """Test that BTC symbols use higher base price"""
        result = generate_mock_data("BTCUSD", "1h", 5)
        # BTC base price is 50000, so prices should be around that
        avg_price = sum(c["o"] for c in result) / len(result)
        assert avg_price > 10000  # Much higher than non-BTC

    def test_non_btc_symbol_uses_lower_base_price(self):
        """Test that non-BTC symbols use lower base price"""
        result = generate_mock_data("AAPL", "1h", 5)
        # Non-BTC base price is 100
        avg_price = sum(c["o"] for c in result) / len(result)
        assert avg_price < 1000  # Much lower than BTC

    def test_candle_structure_is_correct(self):
        """Test that each candle has correct structure"""
        result = generate_mock_data("AAPL", "1h", 1)
        candle = result[0]

        assert "ts" in candle  # Timestamp
        assert "o" in candle  # Open
        assert "h" in candle  # High
        assert "l" in candle  # Low
        assert "c" in candle  # Close
        assert "v" in candle  # Volume

    def test_high_is_highest_price(self):
        """Test that high is always >= open and close"""
        result = generate_mock_data("AAPL", "1h", 20)
        for candle in result:
            assert candle["h"] >= candle["o"]
            assert candle["h"] >= candle["c"]

    def test_low_is_lowest_price(self):
        """Test that low is always <= open and close"""
        result = generate_mock_data("AAPL", "1h", 20)
        for candle in result:
            assert candle["l"] <= candle["o"]
            assert candle["l"] <= candle["c"]

    def test_timestamps_are_sequential(self):
        """Test that timestamps are in sequential order"""
        result = generate_mock_data("AAPL", "1h", 10)
        for i in range(1, len(result)):
            assert result[i]["ts"] > result[i - 1]["ts"]

    def test_timestamps_are_hourly_spaced(self):
        """Test that timestamps are roughly hourly"""
        result = generate_mock_data("AAPL", "1h", 3)
        # Each hour is 3600 * 1000 milliseconds
        diff = result[1]["ts"] - result[0]["ts"]
        assert diff == 3600 * 1000

    def test_prices_are_rounded(self):
        """Test that prices are rounded to 2 decimal places"""
        result = generate_mock_data("AAPL", "1h", 5)
        for candle in result:
            assert candle["o"] == round(candle["o"], 2)
            assert candle["h"] == round(candle["h"], 2)
            assert candle["l"] == round(candle["l"], 2)
            assert candle["c"] == round(candle["c"], 2)
            assert candle["v"] == round(candle["v"], 2)

    def test_volume_is_positive(self):
        """Test that volume is always positive"""
        result = generate_mock_data("AAPL", "1h", 20)
        for candle in result:
            assert candle["v"] > 0

    def test_limit_zero_returns_empty_list(self):
        """Test that limit=0 returns empty list"""
        result = generate_mock_data("AAPL", "1h", 0)
        assert result == []


# ============================================================================
# CONVERT TO YAHOO SYMBOL TESTS
# ============================================================================


class TestConvertToYahooSymbol:
    """Tests for convert_to_yahoo_symbol function"""

    def test_btcusd_conversion(self):
        """Test BTCUSD converts to BTC-USD"""
        assert convert_to_yahoo_symbol("BTCUSD") == "BTC-USD"

    def test_ethusd_conversion(self):
        """Test ETHUSD converts to ETH-USD"""
        assert convert_to_yahoo_symbol("ETHUSD") == "ETH-USD"

    def test_adausd_conversion(self):
        """Test ADAUSD converts to ADA-USD"""
        assert convert_to_yahoo_symbol("ADAUSD") == "ADA-USD"

    def test_solusd_conversion(self):
        """Test SOLUSD converts to SOL-USD"""
        assert convert_to_yahoo_symbol("SOLUSD") == "SOL-USD"

    def test_dogeusd_conversion(self):
        """Test DOGEUSD converts to DOGE-USD"""
        assert convert_to_yahoo_symbol("DOGEUSD") == "DOGE-USD"

    def test_dogeusdt_conversion(self):
        """Test DOGEUSDT converts to DOGE-USD"""
        assert convert_to_yahoo_symbol("DOGEUSDT") == "DOGE-USD"

    def test_xrpusd_conversion(self):
        """Test XRPUSD converts to XRP-USD"""
        assert convert_to_yahoo_symbol("XRPUSD") == "XRP-USD"

    def test_bnbusd_conversion(self):
        """Test BNBUSD converts to BNB-USD"""
        assert convert_to_yahoo_symbol("BNBUSD") == "BNB-USD"

    def test_avaxusd_conversion(self):
        """Test AVAXUSD converts to AVAX-USD"""
        assert convert_to_yahoo_symbol("AVAXUSD") == "AVAX-USD"

    def test_ltcusd_conversion(self):
        """Test LTCUSD converts to LTC-USD"""
        assert convert_to_yahoo_symbol("LTCUSD") == "LTC-USD"

    def test_lowercase_is_converted_to_uppercase(self):
        """Test that lowercase input is handled"""
        assert convert_to_yahoo_symbol("btcusd") == "BTC-USD"

    def test_mixed_case_is_handled(self):
        """Test that mixed case input is handled"""
        assert convert_to_yahoo_symbol("BtCuSd") == "BTC-USD"

    def test_already_yahoo_format_unchanged(self):
        """Test that symbols already in Yahoo format are unchanged"""
        assert convert_to_yahoo_symbol("BTC-USD") == "BTC-USD"
        assert convert_to_yahoo_symbol("AAPL") == "AAPL"

    def test_unknown_symbol_unchanged(self):
        """Test that unknown symbols are returned unchanged"""
        assert convert_to_yahoo_symbol("AAPL") == "AAPL"
        assert convert_to_yahoo_symbol("MSFT") == "MSFT"
        assert convert_to_yahoo_symbol("GOOGL") == "GOOGL"


# ============================================================================
# OHLC ENDPOINT TESTS
# ============================================================================


class TestOHLCEndpoint:
    """Tests for the main ohlc endpoint"""

    @pytest.mark.asyncio
    async def test_returns_ohlc_response_structure(
        self, mock_ohlc_aggregator, mock_ohlc_data
    ):
        """Test that endpoint returns correct response structure"""
        mock_ohlc_aggregator.get_ohlc_data.return_value = mock_ohlc_data

        with patch("app.routers.ohlc.ohlc_aggregator", mock_ohlc_aggregator):
            result = await ohlc(symbol="AAPL", timeframe="1h", limit=5)

        assert "symbol" in result
        assert "timeframe" in result
        assert "candles" in result

    @pytest.mark.asyncio
    async def test_returns_correct_symbol(self, mock_ohlc_aggregator, mock_ohlc_data):
        """Test that response includes the requested symbol"""
        mock_ohlc_aggregator.get_ohlc_data.return_value = mock_ohlc_data

        with patch("app.routers.ohlc.ohlc_aggregator", mock_ohlc_aggregator):
            result = await ohlc(symbol="AAPL", timeframe="1h", limit=5)

        assert result["symbol"] == "AAPL"

    @pytest.mark.asyncio
    async def test_returns_correct_timeframe(
        self, mock_ohlc_aggregator, mock_ohlc_data
    ):
        """Test that response includes the requested timeframe"""
        mock_ohlc_aggregator.get_ohlc_data.return_value = mock_ohlc_data

        with patch("app.routers.ohlc.ohlc_aggregator", mock_ohlc_aggregator):
            result = await ohlc(symbol="AAPL", timeframe="1d", limit=5)

        assert result["timeframe"] == "1d"

    @pytest.mark.asyncio
    async def test_initializes_aggregator_if_session_is_none(
        self, mock_ohlc_aggregator, mock_ohlc_data
    ):
        """Test that aggregator is initialized if session is None"""
        mock_ohlc_aggregator.session = None
        mock_ohlc_aggregator.get_ohlc_data.return_value = mock_ohlc_data

        with patch("app.routers.ohlc.ohlc_aggregator", mock_ohlc_aggregator):
            await ohlc(symbol="AAPL", timeframe="1h", limit=5)

        mock_ohlc_aggregator.initialize.assert_called_once()

    @pytest.mark.asyncio
    async def test_does_not_reinitialize_if_session_exists(
        self, mock_ohlc_aggregator, mock_ohlc_data
    ):
        """Test that aggregator is not reinitialized if session exists"""
        mock_ohlc_aggregator.session = MagicMock()
        mock_ohlc_aggregator.get_ohlc_data.return_value = mock_ohlc_data

        with patch("app.routers.ohlc.ohlc_aggregator", mock_ohlc_aggregator):
            await ohlc(symbol="AAPL", timeframe="1h", limit=5)

        mock_ohlc_aggregator.initialize.assert_not_called()

    @pytest.mark.asyncio
    async def test_converts_symbol_to_yahoo_format(
        self, mock_ohlc_aggregator, mock_ohlc_data
    ):
        """Test that symbol is converted to Yahoo format"""
        mock_ohlc_aggregator.get_ohlc_data.return_value = mock_ohlc_data

        with patch("app.routers.ohlc.ohlc_aggregator", mock_ohlc_aggregator):
            await ohlc(symbol="BTCUSD", timeframe="1h", limit=5)

        call_kwargs = mock_ohlc_aggregator.get_ohlc_data.call_args[1]
        assert call_kwargs["symbol"] == "BTC-USD"

    @pytest.mark.asyncio
    async def test_passes_limit_to_aggregator(
        self, mock_ohlc_aggregator, mock_ohlc_data
    ):
        """Test that limit is passed to aggregator"""
        mock_ohlc_aggregator.get_ohlc_data.return_value = mock_ohlc_data

        with patch("app.routers.ohlc.ohlc_aggregator", mock_ohlc_aggregator):
            await ohlc(symbol="AAPL", timeframe="1h", limit=100)

        call_kwargs = mock_ohlc_aggregator.get_ohlc_data.call_args[1]
        assert call_kwargs["limit"] == 100

    @pytest.mark.asyncio
    async def test_passes_timeframe_to_aggregator(
        self, mock_ohlc_aggregator, mock_ohlc_data
    ):
        """Test that timeframe is passed to aggregator"""
        mock_ohlc_aggregator.get_ohlc_data.return_value = mock_ohlc_data

        with patch("app.routers.ohlc.ohlc_aggregator", mock_ohlc_aggregator):
            await ohlc(symbol="AAPL", timeframe="4h", limit=5)

        call_kwargs = mock_ohlc_aggregator.get_ohlc_data.call_args[1]
        assert call_kwargs["timeframe"] == "4h"

    @pytest.mark.asyncio
    async def test_converts_ohlc_data_to_response_format(
        self, mock_ohlc_aggregator, mock_ohlc_data
    ):
        """Test that OHLC data is converted to response format"""
        mock_ohlc_aggregator.get_ohlc_data.return_value = mock_ohlc_data

        with patch("app.routers.ohlc.ohlc_aggregator", mock_ohlc_aggregator):
            result = await ohlc(symbol="AAPL", timeframe="1h", limit=5)

        candles = result["candles"]
        assert len(candles) == 5

        # Check first candle structure
        candle = candles[0]
        assert "ts" in candle
        assert "o" in candle
        assert "h" in candle
        assert "l" in candle
        assert "c" in candle
        assert "v" in candle

    @pytest.mark.asyncio
    async def test_timestamps_are_in_milliseconds(
        self, mock_ohlc_aggregator, mock_ohlc_data
    ):
        """Test that timestamps are converted to milliseconds"""
        mock_ohlc_aggregator.get_ohlc_data.return_value = mock_ohlc_data

        with patch("app.routers.ohlc.ohlc_aggregator", mock_ohlc_aggregator):
            result = await ohlc(symbol="AAPL", timeframe="1h", limit=5)

        # Timestamps should be large numbers (milliseconds since epoch)
        candle = result["candles"][0]
        assert candle["ts"] > 1000000000000  # After year 2001 in milliseconds

    @pytest.mark.asyncio
    async def test_prices_are_rounded(self, mock_ohlc_aggregator, mock_ohlc_data):
        """Test that prices are rounded to 2 decimal places"""
        mock_ohlc_aggregator.get_ohlc_data.return_value = mock_ohlc_data

        with patch("app.routers.ohlc.ohlc_aggregator", mock_ohlc_aggregator):
            result = await ohlc(symbol="AAPL", timeframe="1h", limit=5)

        candle = result["candles"][0]
        assert candle["o"] == round(candle["o"], 2)
        assert candle["h"] == round(candle["h"], 2)
        assert candle["l"] == round(candle["l"], 2)
        assert candle["c"] == round(candle["c"], 2)
        assert candle["v"] == round(candle["v"], 2)


# ============================================================================
# FALLBACK TO MOCK DATA TESTS
# ============================================================================


class TestOHLCFallback:
    """Tests for fallback to mock data on error"""

    @pytest.mark.asyncio
    async def test_returns_mock_data_on_aggregator_exception(
        self, mock_ohlc_aggregator
    ):
        """Test that mock data is returned when aggregator fails"""
        mock_ohlc_aggregator.get_ohlc_data.side_effect = Exception("API Error")

        with patch("app.routers.ohlc.ohlc_aggregator", mock_ohlc_aggregator):
            result = await ohlc(symbol="AAPL", timeframe="1h", limit=10)

        assert "candles" in result
        assert len(result["candles"]) == 10
        assert result["symbol"] == "AAPL"
        assert result["timeframe"] == "1h"

    @pytest.mark.asyncio
    async def test_mock_data_has_correct_structure_on_fallback(
        self, mock_ohlc_aggregator
    ):
        """Test that mock data has correct structure"""
        mock_ohlc_aggregator.get_ohlc_data.side_effect = Exception("API Error")

        with patch("app.routers.ohlc.ohlc_aggregator", mock_ohlc_aggregator):
            result = await ohlc(symbol="AAPL", timeframe="1h", limit=5)

        candle = result["candles"][0]
        assert "ts" in candle
        assert "o" in candle
        assert "h" in candle
        assert "l" in candle
        assert "c" in candle
        assert "v" in candle

    @pytest.mark.asyncio
    async def test_logs_warning_on_fallback(self, mock_ohlc_aggregator):
        """Test that warning is logged when falling back to mock data"""
        mock_ohlc_aggregator.get_ohlc_data.side_effect = Exception("API Error")

        with patch("app.routers.ohlc.ohlc_aggregator", mock_ohlc_aggregator):
            with patch("app.routers.ohlc.logger") as mock_logger:
                await ohlc(symbol="AAPL", timeframe="1h", limit=5)

                mock_logger.warning.assert_called_once()
                warning_msg = mock_logger.warning.call_args[0][0]
                assert "mock data" in warning_msg.lower()


# ============================================================================
# ROUTER TESTS
# ============================================================================


class TestOHLCRouter:
    """Tests for OHLC router configuration"""

    def test_router_exists(self):
        """Test that router is defined"""
        assert router is not None

    def test_router_has_ohlc_prefix(self):
        """Test that router has /ohlc prefix"""
        assert router.prefix == "/ohlc"

    def test_router_has_market_tag(self):
        """Test that router has market tag"""
        assert "market" in router.tags


# ============================================================================
# EDGE CASES
# ============================================================================


class TestOHLCEdgeCases:
    """Edge case tests for OHLC functionality"""

    def test_generate_mock_data_with_negative_limit(self):
        """Test generate_mock_data with negative limit"""
        # Python range handles negative values gracefully
        result = generate_mock_data("AAPL", "1h", -5)
        assert result == []

    def test_generate_mock_data_with_large_limit(self):
        """Test generate_mock_data with large limit"""
        result = generate_mock_data("AAPL", "1h", 1000)
        assert len(result) == 1000

    def test_convert_empty_string(self):
        """Test convert_to_yahoo_symbol with empty string"""
        result = convert_to_yahoo_symbol("")
        assert result == ""

    def test_convert_special_characters(self):
        """Test convert_to_yahoo_symbol with special characters"""
        result = convert_to_yahoo_symbol("BRK.B")
        assert result == "BRK.B"

    @pytest.mark.asyncio
    async def test_ohlc_with_initialization_error(self, mock_ohlc_aggregator):
        """Test OHLC when initialization fails"""
        mock_ohlc_aggregator.session = None
        mock_ohlc_aggregator.initialize.side_effect = Exception("Init Error")

        with patch("app.routers.ohlc.ohlc_aggregator", mock_ohlc_aggregator):
            result = await ohlc(symbol="AAPL", timeframe="1h", limit=5)

        # Should fall back to mock data
        assert "candles" in result
        assert len(result["candles"]) == 5

    @pytest.mark.asyncio
    async def test_ohlc_empty_data_response(self, mock_ohlc_aggregator):
        """Test OHLC when aggregator returns empty list"""
        mock_ohlc_aggregator.get_ohlc_data.return_value = []

        with patch("app.routers.ohlc.ohlc_aggregator", mock_ohlc_aggregator):
            result = await ohlc(symbol="AAPL", timeframe="1h", limit=5)

        assert result["candles"] == []
