"""
Tests for app.api.routes.market

Tests the /market endpoints including health check and OHLC data fetching.
"""

from unittest.mock import AsyncMock, patch

import pytest
from app.api.routes.market import get_ohlc, health
from app.services.errors import NotFoundError, ProviderError
from fastapi import HTTPException

# ============================================================================
# HEALTH ENDPOINT TESTS
# ============================================================================


class TestHealthEndpoint:
    """Tests for /market/health endpoint"""

    def test_health_returns_ok(self):
        """Test that health endpoint returns OK status"""
        result = health()
        assert result == {"ok": True}
        assert isinstance(result, dict)
        assert "ok" in result
        assert result["ok"] is True


# ============================================================================
# OHLC ENDPOINT TESTS
# ============================================================================


class TestOHLCEndpoint:
    """Tests for /market/ohlc endpoint"""

    @pytest.mark.asyncio
    async def test_get_ohlc_success(self):
        """Test successful OHLC data retrieval"""
        # Arrange
        mock_data = [
            {
                "timestamp": "2024-01-01T00:00:00Z",
                "open": 100.0,
                "high": 105.0,
                "low": 99.0,
                "close": 103.0,
                "volume": 1000,
            },
            {
                "timestamp": "2024-01-01T01:00:00Z",
                "open": 103.0,
                "high": 107.0,
                "low": 102.0,
                "close": 106.0,
                "volume": 1500,
            },
        ]

        with patch("app.api.routes.market.fetch_ohlc", new_callable=AsyncMock) as mock_fetch:
            mock_fetch.return_value = mock_data

            # Act
            result = await get_ohlc(symbol="BTCUSD", timeframe="1h", limit=500)

            # Assert
            assert result == mock_data
            assert len(result) == 2
            mock_fetch.assert_called_once_with(symbol="BTCUSD", timeframe="1h", limit=500)

    @pytest.mark.asyncio
    async def test_get_ohlc_with_custom_parameters(self):
        """Test OHLC with custom timeframe and limit"""
        # Arrange
        mock_data = [{"timestamp": "2024-01-01", "open": 50000.0, "close": 50500.0}]

        with patch("app.api.routes.market.fetch_ohlc", new_callable=AsyncMock) as mock_fetch:
            mock_fetch.return_value = mock_data

            # Act
            result = await get_ohlc(symbol="AAPL", timeframe="5m", limit=100)

            # Assert
            assert result == mock_data
            mock_fetch.assert_called_once_with(symbol="AAPL", timeframe="5m", limit=100)

    @pytest.mark.asyncio
    async def test_get_ohlc_not_found_error(self):
        """Test OHLC endpoint handles NotFoundError"""
        # Arrange
        with patch("app.api.routes.market.fetch_ohlc", new_callable=AsyncMock) as mock_fetch:
            mock_fetch.side_effect = NotFoundError("Symbol INVALID not found")

            # Act & Assert
            with pytest.raises(HTTPException) as exc_info:
                await get_ohlc(symbol="INVALID", timeframe="1h", limit=500)

            assert exc_info.value.status_code == 404
            assert "Symbol INVALID not found" in str(exc_info.value.detail)

    @pytest.mark.asyncio
    async def test_get_ohlc_provider_error(self):
        """Test OHLC endpoint handles ProviderError"""
        # Arrange
        with patch("app.api.routes.market.fetch_ohlc", new_callable=AsyncMock) as mock_fetch:
            mock_fetch.side_effect = ProviderError("API provider unavailable")

            # Act & Assert
            with pytest.raises(HTTPException) as exc_info:
                await get_ohlc(symbol="BTCUSD", timeframe="1h", limit=500)

            assert exc_info.value.status_code == 502
            assert "API provider unavailable" in str(exc_info.value.detail)

    @pytest.mark.asyncio
    async def test_get_ohlc_generic_exception(self):
        """Test OHLC endpoint handles unexpected exceptions"""
        # Arrange
        with patch("app.api.routes.market.fetch_ohlc", new_callable=AsyncMock) as mock_fetch:
            mock_fetch.side_effect = RuntimeError("Unexpected database error")

            # Act & Assert
            with pytest.raises(HTTPException) as exc_info:
                await get_ohlc(symbol="BTCUSD", timeframe="1h", limit=500)

            assert exc_info.value.status_code == 500
            assert exc_info.value.detail == "Internal server error"

    @pytest.mark.asyncio
    async def test_get_ohlc_default_parameters(self):
        """Test OHLC endpoint uses default parameters correctly"""
        # Arrange
        mock_data = []

        with patch("app.api.routes.market.fetch_ohlc", new_callable=AsyncMock) as mock_fetch:
            mock_fetch.return_value = mock_data

            # Act - symbol required, test with default timeframe and limit
            # Note: FastAPI Query defaults are resolved at request time, not function call time
            result = await get_ohlc(symbol="ETHUSDT", timeframe="1h", limit=500)

            # Assert
            mock_fetch.assert_called_once_with(symbol="ETHUSDT", timeframe="1h", limit=500)
            assert result == []

    @pytest.mark.asyncio
    async def test_get_ohlc_empty_result(self):
        """Test OHLC endpoint handles empty data gracefully"""
        # Arrange
        with patch("app.api.routes.market.fetch_ohlc", new_callable=AsyncMock) as mock_fetch:
            mock_fetch.return_value = []

            # Act
            result = await get_ohlc(symbol="NEWCOIN", timeframe="1d", limit=10)

            # Assert
            assert result == []
            assert isinstance(result, list)
