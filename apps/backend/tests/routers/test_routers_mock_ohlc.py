"""
Tests for app.routers.mock_ohlc

Comprehensive tests for Mock OHLC data router.
Tests mock candlestick data generation for testing chart functionality.
"""

import pytest

from app.routers.mock_ohlc import mock_ohlc, router

# ============================================================================
# MOCK OHLC ENDPOINT TESTS
# ============================================================================


class TestMockOHLCEndpoint:
    """Tests for mock_ohlc endpoint"""

    @pytest.mark.asyncio
    async def test_returns_correct_response_structure(self):
        """Test that endpoint returns correct response structure"""
        result = await mock_ohlc()

        assert "symbol" in result
        assert "timeframe" in result
        assert "candles" in result

    @pytest.mark.asyncio
    async def test_returns_default_symbol(self):
        """Test that default symbol is BTCUSD"""
        result = await mock_ohlc()
        assert result["symbol"] == "BTCUSD"

    @pytest.mark.asyncio
    async def test_returns_custom_symbol(self):
        """Test that custom symbol is returned"""
        result = await mock_ohlc(symbol="ETHUSD")
        assert result["symbol"] == "ETHUSD"

    @pytest.mark.asyncio
    async def test_returns_default_timeframe(self):
        """Test that default timeframe is 1h"""
        result = await mock_ohlc()
        assert result["timeframe"] == "1h"

    @pytest.mark.asyncio
    async def test_returns_custom_timeframe(self):
        """Test that custom timeframe is returned"""
        result = await mock_ohlc(timeframe="4h")
        assert result["timeframe"] == "4h"

    @pytest.mark.asyncio
    async def test_returns_default_limit_candles(self):
        """Test that default limit is 100 candles"""
        result = await mock_ohlc()
        assert len(result["candles"]) == 100

    @pytest.mark.asyncio
    async def test_returns_custom_limit_candles(self):
        """Test that custom limit is respected"""
        result = await mock_ohlc(limit=50)
        assert len(result["candles"]) == 50


# ============================================================================
# CANDLE STRUCTURE TESTS
# ============================================================================


class TestCandleStructure:
    """Tests for candle data structure"""

    @pytest.mark.asyncio
    async def test_candle_has_all_required_fields(self):
        """Test that each candle has all required fields"""
        result = await mock_ohlc(limit=1)
        candle = result["candles"][0]

        assert "ts" in candle  # Timestamp
        assert "o" in candle  # Open
        assert "h" in candle  # High
        assert "l" in candle  # Low
        assert "c" in candle  # Close
        assert "v" in candle  # Volume

    @pytest.mark.asyncio
    async def test_timestamp_is_integer(self):
        """Test that timestamp is an integer (milliseconds)"""
        result = await mock_ohlc(limit=1)
        candle = result["candles"][0]
        assert isinstance(candle["ts"], int)

    @pytest.mark.asyncio
    async def test_timestamp_is_in_milliseconds(self):
        """Test that timestamp is in milliseconds format"""
        result = await mock_ohlc(limit=1)
        candle = result["candles"][0]
        # Millisecond timestamps should be 13 digits for current dates
        assert candle["ts"] > 1000000000000

    @pytest.mark.asyncio
    async def test_prices_are_floats(self):
        """Test that price values are floats"""
        result = await mock_ohlc(limit=1)
        candle = result["candles"][0]

        assert isinstance(candle["o"], float)
        assert isinstance(candle["h"], float)
        assert isinstance(candle["l"], float)
        assert isinstance(candle["c"], float)

    @pytest.mark.asyncio
    async def test_prices_are_rounded_to_two_decimals(self):
        """Test that prices are rounded to 2 decimal places"""
        result = await mock_ohlc(limit=10)

        for candle in result["candles"]:
            assert candle["o"] == round(candle["o"], 2)
            assert candle["h"] == round(candle["h"], 2)
            assert candle["l"] == round(candle["l"], 2)
            assert candle["c"] == round(candle["c"], 2)
            assert candle["v"] == round(candle["v"], 2)

    @pytest.mark.asyncio
    async def test_volume_is_positive(self):
        """Test that volume is always positive"""
        result = await mock_ohlc(limit=20)

        for candle in result["candles"]:
            assert candle["v"] > 0


# ============================================================================
# PRICE LOGIC TESTS
# ============================================================================


class TestPriceLogic:
    """Tests for price generation logic"""

    @pytest.mark.asyncio
    async def test_high_is_highest_in_candle(self):
        """Test that high is >= open and close"""
        result = await mock_ohlc(limit=50)

        for candle in result["candles"]:
            assert candle["h"] >= candle["o"]
            assert candle["h"] >= candle["c"]

    @pytest.mark.asyncio
    async def test_low_is_lowest_in_candle(self):
        """Test that low is <= open and close"""
        result = await mock_ohlc(limit=50)

        for candle in result["candles"]:
            assert candle["l"] <= candle["o"]
            assert candle["l"] <= candle["c"]

    @pytest.mark.asyncio
    async def test_btc_symbol_uses_higher_base_price(self):
        """Test that BTC symbols use higher base price (~50000)"""
        result = await mock_ohlc(symbol="BTCUSD", limit=10)

        avg_price = sum(c["o"] for c in result["candles"]) / 10
        # BTC base is 50000, should be in that range
        assert avg_price > 10000

    @pytest.mark.asyncio
    async def test_non_btc_symbol_uses_lower_base_price(self):
        """Test that non-BTC symbols use lower base price (~100)"""
        result = await mock_ohlc(symbol="AAPL", limit=10)

        avg_price = sum(c["o"] for c in result["candles"]) / 10
        # Non-BTC base is 100, should be in that range
        assert avg_price < 1000

    @pytest.mark.asyncio
    async def test_eth_symbol_uses_lower_base_price(self):
        """Test that ETH (non-BTC) uses lower base price"""
        result = await mock_ohlc(symbol="ETHUSD", limit=10)

        avg_price = sum(c["o"] for c in result["candles"]) / 10
        # ETH doesn't contain "BTC", so uses 100 base
        assert avg_price < 1000


# ============================================================================
# TIMESTAMP TESTS
# ============================================================================


class TestTimestamps:
    """Tests for timestamp generation"""

    @pytest.mark.asyncio
    async def test_timestamps_are_sequential(self):
        """Test that timestamps are in sequential order"""
        result = await mock_ohlc(limit=20)

        for i in range(1, len(result["candles"])):
            assert result["candles"][i]["ts"] > result["candles"][i - 1]["ts"]

    @pytest.mark.asyncio
    async def test_timestamps_are_hourly_spaced(self):
        """Test that timestamps are spaced hourly (3600 seconds)"""
        result = await mock_ohlc(limit=5)

        for i in range(1, len(result["candles"])):
            diff = result["candles"][i]["ts"] - result["candles"][i - 1]["ts"]
            # 3600 seconds * 1000 = 3600000 milliseconds
            assert diff == 3600000


# ============================================================================
# ROUTER TESTS
# ============================================================================


class TestMockOHLCRouter:
    """Tests for router configuration"""

    def test_router_exists(self):
        """Test that router is defined"""
        assert router is not None

    def test_router_has_mock_prefix(self):
        """Test that router has /mock prefix"""
        assert router.prefix == "/mock"

    def test_router_has_mock_tag(self):
        """Test that router has mock tag"""
        assert "mock" in router.tags


# ============================================================================
# EDGE CASES
# ============================================================================


class TestEdgeCases:
    """Edge case tests"""

    @pytest.mark.asyncio
    async def test_limit_zero_returns_empty_candles(self):
        """Test that limit=0 returns empty candles list"""
        result = await mock_ohlc(limit=0)
        assert result["candles"] == []

    @pytest.mark.asyncio
    async def test_limit_one_returns_single_candle(self):
        """Test that limit=1 returns exactly one candle"""
        result = await mock_ohlc(limit=1)
        assert len(result["candles"]) == 1

    @pytest.mark.asyncio
    async def test_large_limit_works(self):
        """Test that large limit values work"""
        result = await mock_ohlc(limit=1000)
        assert len(result["candles"]) == 1000

    @pytest.mark.asyncio
    async def test_empty_symbol_works(self):
        """Test that empty symbol works"""
        result = await mock_ohlc(symbol="")
        assert result["symbol"] == ""

    @pytest.mark.asyncio
    async def test_special_characters_in_symbol(self):
        """Test that special characters in symbol work"""
        result = await mock_ohlc(symbol="BRK.B")
        assert result["symbol"] == "BRK.B"

    @pytest.mark.asyncio
    async def test_numeric_timeframe(self):
        """Test that numeric timeframe string works"""
        result = await mock_ohlc(timeframe="15")
        assert result["timeframe"] == "15"
