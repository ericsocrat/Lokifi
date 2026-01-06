"""
Comprehensive tests for app/models/api.py

Tests all Pydantic models for API request/response contracts.
"""

import time
from datetime import datetime, timezone

import pytest


class TestUtcNow:
    """Tests for _utc_now helper function"""

    def test_returns_utc_datetime(self):
        """Should return a UTC datetime"""
        from app.models.api import _utc_now

        result = _utc_now()
        assert isinstance(result, datetime)
        assert result.tzinfo == timezone.utc

    def test_returns_current_time(self):
        """Should return approximately current time"""
        from app.models.api import _utc_now

        before = datetime.now(timezone.utc)
        result = _utc_now()
        after = datetime.now(timezone.utc)

        assert before <= result <= after


class TestAPIResponse:
    """Tests for base APIResponse model"""

    def test_default_values(self):
        """Should have sensible defaults"""
        from app.models.api import APIResponse

        response = APIResponse()
        assert response.success is True
        assert response.version == "1.0.0"
        assert isinstance(response.timestamp, datetime)

    def test_custom_values(self):
        """Should accept custom values"""
        from app.models.api import APIResponse

        custom_time = datetime(2024, 1, 1, tzinfo=timezone.utc)
        response = APIResponse(success=False, version="2.0.0", timestamp=custom_time)
        assert response.success is False
        assert response.version == "2.0.0"
        assert response.timestamp == custom_time

    def test_serialization(self):
        """Should serialize to dict correctly"""
        from app.models.api import APIResponse

        response = APIResponse()
        data = response.model_dump()
        assert "success" in data
        assert "timestamp" in data
        assert "version" in data


class TestErrorResponse:
    """Tests for ErrorResponse model"""

    def test_error_response_creation(self):
        """Should create error response with required fields"""
        from app.models.api import ErrorResponse

        response = ErrorResponse(error="Something went wrong", code="ERR_001")
        assert response.success is False
        assert response.error == "Something went wrong"
        assert response.code == "ERR_001"
        assert response.details is None

    def test_error_response_with_details(self):
        """Should accept optional details"""
        from app.models.api import ErrorResponse

        details = {"field": "username", "reason": "too short"}
        response = ErrorResponse(
            error="Validation error", code="VALIDATION", details=details
        )
        assert response.details == details

    def test_error_inherits_from_api_response(self):
        """Should inherit APIResponse attributes"""
        from app.models.api import ErrorResponse

        response = ErrorResponse(error="Test", code="TEST")
        assert hasattr(response, "timestamp")
        assert hasattr(response, "version")


class TestSymbol:
    """Tests for Symbol model"""

    def test_symbol_creation(self):
        """Should create symbol with required fields"""
        from app.models.api import Symbol

        symbol = Symbol(
            symbol="BTCUSDT",
            name="Bitcoin/USDT",
            base_asset="BTC",
            quote_asset="USDT",
            exchange="binance",
            type="spot",
        )
        assert symbol.symbol == "BTCUSDT"
        assert symbol.name == "Bitcoin/USDT"
        assert symbol.active is True  # default

    def test_symbol_optional_fields(self):
        """Should handle optional fields"""
        from app.models.api import Symbol

        symbol = Symbol(
            symbol="ETHUSDT",
            name="Ethereum/USDT",
            base_asset="ETH",
            quote_asset="USDT",
            exchange="binance",
            type="spot",
            active=False,
            logo_url="https://example.com/eth.png",
        )
        assert symbol.active is False
        assert symbol.logo_url == "https://example.com/eth.png"


class TestSymbolsResponse:
    """Tests for SymbolsResponse model"""

    def test_symbols_response_creation(self):
        """Should create symbols response"""
        from app.models.api import Symbol, SymbolsResponse

        symbols = [
            Symbol(
                symbol="BTCUSDT",
                name="Bitcoin",
                base_asset="BTC",
                quote_asset="USDT",
                exchange="binance",
                type="spot",
            )
        ]
        response = SymbolsResponse(data=symbols, total=1)
        assert response.success is True
        assert len(response.data) == 1
        assert response.total == 1

    def test_empty_symbols_response(self):
        """Should handle empty symbol list"""
        from app.models.api import SymbolsResponse

        response = SymbolsResponse(data=[], total=0)
        assert response.data == []
        assert response.total == 0


class TestOHLCBar:
    """Tests for OHLCBar model"""

    def test_ohlc_bar_creation(self):
        """Should create OHLC bar with all fields"""
        from app.models.api import OHLCBar

        bar = OHLCBar(
            timestamp=1704067200000,
            open=42000.0,
            high=43000.0,
            low=41500.0,
            close=42500.0,
            volume=1000.0,
        )
        assert bar.timestamp == 1704067200000
        assert bar.open == 42000.0
        assert bar.high == 43000.0
        assert bar.low == 41500.0
        assert bar.close == 42500.0
        assert bar.volume == 1000.0

    def test_ohlc_bar_serialization(self):
        """Should serialize OHLC bar correctly"""
        from app.models.api import OHLCBar

        bar = OHLCBar(
            timestamp=1704067200000,
            open=100.0,
            high=110.0,
            low=90.0,
            close=105.0,
            volume=500.0,
        )
        data = bar.model_dump()
        assert all(
            k in data for k in ["timestamp", "open", "high", "low", "close", "volume"]
        )


class TestOHLCResponse:
    """Tests for OHLCResponse model"""

    def test_ohlc_response_creation(self):
        """Should create OHLC response"""
        from app.models.api import OHLCBar, OHLCResponse

        bars = [
            OHLCBar(
                timestamp=1704067200000,
                open=100.0,
                high=110.0,
                low=90.0,
                close=105.0,
                volume=500.0,
            )
        ]
        response = OHLCResponse(data=bars, symbol="BTCUSDT", timeframe="1h")
        assert response.symbol == "BTCUSDT"
        assert response.timeframe == "1h"
        assert len(response.data) == 1

    def test_ohlc_response_with_range(self):
        """Should accept optional timestamp range"""
        from app.models.api import OHLCResponse

        response = OHLCResponse(
            data=[],
            symbol="ETHUSDT",
            timeframe="1d",
            from_timestamp=1704067200000,
            to_timestamp=1704153600000,
        )
        assert response.from_timestamp == 1704067200000
        assert response.to_timestamp == 1704153600000


class TestTickerData:
    """Tests for TickerData model"""

    def test_ticker_data_creation(self):
        """Should create ticker data"""
        from app.models.api import TickerData

        ticker = TickerData(
            symbol="BTCUSDT",
            price=42000.0,
            change_24h=2.5,
            volume_24h=1000000.0,
            high_24h=43000.0,
            low_24h=41000.0,
            timestamp=1704067200000,
        )
        assert ticker.symbol == "BTCUSDT"
        assert ticker.price == 42000.0
        assert ticker.change_24h == 2.5


class TestTickerResponse:
    """Tests for TickerResponse model"""

    def test_ticker_response_creation(self):
        """Should create ticker response"""
        from app.models.api import TickerData, TickerResponse

        ticker = TickerData(
            symbol="BTCUSDT",
            price=42000.0,
            change_24h=2.5,
            volume_24h=1000000.0,
            high_24h=43000.0,
            low_24h=41000.0,
            timestamp=1704067200000,
        )
        response = TickerResponse(data=ticker)
        assert response.success is True
        assert response.data.symbol == "BTCUSDT"


class TestIndicatorValue:
    """Tests for IndicatorValue model"""

    def test_indicator_value_creation(self):
        """Should create indicator value"""
        from app.models.api import IndicatorValue

        value = IndicatorValue(timestamp=1704067200000, value=50.5)
        assert value.timestamp == 1704067200000
        assert value.value == 50.5
        assert value.metadata is None

    def test_indicator_value_with_metadata(self):
        """Should accept optional metadata"""
        from app.models.api import IndicatorValue

        metadata = {"signal": "buy", "strength": "strong"}
        value = IndicatorValue(timestamp=1704067200000, value=70.0, metadata=metadata)
        assert value.metadata == metadata


class TestIndicatorResponse:
    """Tests for IndicatorResponse model"""

    def test_indicator_response_creation(self):
        """Should create indicator response"""
        from app.models.api import IndicatorResponse, IndicatorValue

        values = [IndicatorValue(timestamp=1704067200000, value=50.0)]
        response = IndicatorResponse(
            data=values, indicator="RSI", parameters={"period": 14}
        )
        assert response.indicator == "RSI"
        assert response.parameters == {"period": 14}
        assert len(response.data) == 1


class TestWSMessage:
    """Tests for WebSocket message models"""

    def test_ws_message_creation(self):
        """Should create WS message with auto timestamp"""
        from app.models.api import WSMessage

        before = int(datetime.now(timezone.utc).timestamp() * 1000)
        msg = WSMessage(type="test")
        after = int(datetime.now(timezone.utc).timestamp() * 1000)

        assert msg.type == "test"
        assert before <= msg.timestamp <= after

    def test_ws_ticker_message(self):
        """Should create WS ticker message"""
        from app.models.api import TickerData, WSTickerMessage

        ticker = TickerData(
            symbol="BTCUSDT",
            price=42000.0,
            change_24h=2.5,
            volume_24h=1000000.0,
            high_24h=43000.0,
            low_24h=41000.0,
            timestamp=1704067200000,
        )
        msg = WSTickerMessage(data=ticker)
        assert msg.type == "ticker"
        assert msg.data.symbol == "BTCUSDT"

    def test_ws_ohlc_message(self):
        """Should create WS OHLC message"""
        from app.models.api import OHLCBar, WSOHLCMessage

        bar = OHLCBar(
            timestamp=1704067200000,
            open=100.0,
            high=110.0,
            low=90.0,
            close=105.0,
            volume=500.0,
        )
        msg = WSOHLCMessage(symbol="BTCUSDT", timeframe="1h", data=bar)
        assert msg.type == "ohlc"
        assert msg.symbol == "BTCUSDT"
        assert msg.timeframe == "1h"

    def test_ws_error_message(self):
        """Should create WS error message"""
        from app.models.api import WSErrorMessage

        msg = WSErrorMessage(error="Connection failed", code="WS_001")
        assert msg.type == "error"
        assert msg.error == "Connection failed"
        assert msg.code == "WS_001"


class TestOHLCRequest:
    """Tests for OHLCRequest model"""

    def test_ohlc_request_minimal(self):
        """Should create request with minimal fields"""
        from app.models.api import OHLCRequest

        req = OHLCRequest(symbol="BTCUSDT", timeframe="1h")
        assert req.symbol == "BTCUSDT"
        assert req.timeframe == "1h"
        assert req.limit == 500  # default

    def test_ohlc_request_full(self):
        """Should create request with all fields"""
        from app.models.api import OHLCRequest

        req = OHLCRequest(
            symbol="ETHUSDT",
            timeframe="1d",
            from_timestamp=1704067200000,
            to_timestamp=1704153600000,
            limit=100,
        )
        assert req.from_timestamp == 1704067200000
        assert req.to_timestamp == 1704153600000
        assert req.limit == 100

    def test_ohlc_request_limit_validation(self):
        """Should enforce limit <= 1000"""
        from pydantic import ValidationError

        from app.models.api import OHLCRequest

        with pytest.raises(ValidationError):
            OHLCRequest(symbol="BTC", timeframe="1h", limit=1001)


class TestSymbolSearchRequest:
    """Tests for SymbolSearchRequest model"""

    def test_symbol_search_defaults(self):
        """Should have sensible defaults"""
        from app.models.api import SymbolSearchRequest

        req = SymbolSearchRequest()
        assert req.query is None
        assert req.exchange is None
        assert req.type is None
        assert req.active_only is True
        assert req.limit == 100
        assert req.offset == 0

    def test_symbol_search_with_filters(self):
        """Should accept search filters"""
        from app.models.api import SymbolSearchRequest

        req = SymbolSearchRequest(
            query="BTC",
            exchange="binance",
            type="spot",
            active_only=False,
            limit=50,
            offset=10,
        )
        assert req.query == "BTC"
        assert req.exchange == "binance"
        assert req.active_only is False
        assert req.limit == 50
        assert req.offset == 10

    def test_symbol_search_limit_validation(self):
        """Should enforce limit <= 500"""
        from pydantic import ValidationError

        from app.models.api import SymbolSearchRequest

        with pytest.raises(ValidationError):
            SymbolSearchRequest(limit=501)


class TestHealthResponse:
    """Tests for HealthResponse model"""

    def test_health_response_creation(self):
        """Should create health response"""
        from app.models.api import HealthResponse

        response = HealthResponse(
            uptime=3600.5,
            api_version="1.0.0",
            dependencies={"database": "healthy", "redis": "healthy"},
        )
        assert response.status == "healthy"
        assert response.uptime == 3600.5
        assert response.api_version == "1.0.0"
        assert response.dependencies["database"] == "healthy"

    def test_health_response_custom_status(self):
        """Should accept custom status"""
        from app.models.api import HealthResponse

        response = HealthResponse(
            status="degraded",
            uptime=100.0,
            api_version="1.0.0",
            dependencies={"database": "slow"},
        )
        assert response.status == "degraded"


class TestModelEdgeCases:
    """Edge case tests for models"""

    def test_symbol_with_unicode(self):
        """Should handle unicode in symbol names"""
        from app.models.api import Symbol

        symbol = Symbol(
            symbol="TEST",
            name="Test币/美元",  # Chinese characters
            base_asset="TEST",
            quote_asset="USD",
            exchange="test",
            type="spot",
        )
        assert "币" in symbol.name

    def test_ohlc_with_zero_volume(self):
        """Should handle zero volume"""
        from app.models.api import OHLCBar

        bar = OHLCBar(
            timestamp=1704067200000,
            open=100.0,
            high=100.0,
            low=100.0,
            close=100.0,
            volume=0.0,
        )
        assert bar.volume == 0.0

    def test_ticker_with_negative_change(self):
        """Should handle negative price change"""
        from app.models.api import TickerData

        ticker = TickerData(
            symbol="TEST",
            price=100.0,
            change_24h=-5.5,
            volume_24h=1000.0,
            high_24h=110.0,
            low_24h=95.0,
            timestamp=1704067200000,
        )
        assert ticker.change_24h == -5.5

    def test_indicator_with_nan_like_value(self):
        """Should handle float special values"""
        import math

        from app.models.api import IndicatorValue

        # Note: Actual NaN/Inf handling depends on Pydantic config
        # Testing with very small and large values
        small = IndicatorValue(timestamp=1, value=1e-300)
        large = IndicatorValue(timestamp=1, value=1e300)
        assert small.value < 1e-299
        assert large.value > 1e299

    def test_error_response_with_nested_details(self):
        """Should handle nested error details"""
        from app.models.api import ErrorResponse

        details = {
            "errors": [
                {"field": "email", "message": "Invalid format"},
                {"field": "password", "message": "Too short"},
            ],
            "metadata": {"request_id": "abc123"},
        }
        response = ErrorResponse(
            error="Validation failed", code="VAL_ERR", details=details
        )
        assert len(response.details["errors"]) == 2
        assert response.details["metadata"]["request_id"] == "abc123"
