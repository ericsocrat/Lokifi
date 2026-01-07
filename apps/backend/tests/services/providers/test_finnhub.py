"""Tests for app.services.providers.finnhub module.

Tests the Finnhub market data provider:
- OHLC data fetching
- Timeframe resolution mapping
- Response parsing
- Error handling

Coverage target: 100%
"""

from unittest.mock import patch

import pytest

from app.services.providers.finnhub import fetch_ohlc


class TestFetchOhlc:
    """Tests for fetch_ohlc function."""

    @pytest.mark.asyncio
    async def test_calls_correct_api_url(self):
        """Test that correct Finnhub API URL is called."""
        mock_response = {"s": "no_data"}

        with patch("app.services.providers.finnhub._get") as mock_get:
            mock_get.return_value = mock_response

            with patch("app.services.providers.finnhub.settings") as mock_settings:
                mock_settings.FINNHUB_KEY = "test_key"

                await fetch_ohlc("AAPL", "1d", 100)

                call_args = mock_get.call_args
                assert "finnhub.io" in call_args[0][0]
                assert "candle" in call_args[0][0]

    @pytest.mark.asyncio
    async def test_includes_symbol_in_request(self):
        """Test that symbol is included in request."""
        mock_response = {"s": "no_data"}

        with patch("app.services.providers.finnhub._get") as mock_get:
            mock_get.return_value = mock_response

            with patch("app.services.providers.finnhub.settings") as mock_settings:
                mock_settings.FINNHUB_KEY = "test_key"

                await fetch_ohlc("MSFT", "1d", 100)

                call_args = mock_get.call_args
                assert call_args[0][1]["symbol"] == "MSFT"

    @pytest.mark.asyncio
    async def test_includes_api_key_in_request(self):
        """Test that API key is included in request."""
        mock_response = {"s": "no_data"}

        with patch("app.services.providers.finnhub._get") as mock_get:
            mock_get.return_value = mock_response

            with patch("app.services.providers.finnhub.settings") as mock_settings:
                mock_settings.FINNHUB_KEY = "my_finnhub_key"

                await fetch_ohlc("AAPL", "1d", 100)

                call_args = mock_get.call_args
                assert call_args[0][1]["token"] == "my_finnhub_key"

    @pytest.mark.asyncio
    async def test_includes_count_in_request(self):
        """Test that count is included in request."""
        mock_response = {"s": "no_data"}

        with patch("app.services.providers.finnhub._get") as mock_get:
            mock_get.return_value = mock_response

            with patch("app.services.providers.finnhub.settings") as mock_settings:
                mock_settings.FINNHUB_KEY = "test_key"

                await fetch_ohlc("AAPL", "1d", 50)

                call_args = mock_get.call_args
                assert call_args[0][1]["count"] == 50

    @pytest.mark.asyncio
    async def test_resolution_1d_maps_to_d(self):
        """Test that 1d timeframe maps to D resolution."""
        mock_response = {"s": "no_data"}

        with patch("app.services.providers.finnhub._get") as mock_get:
            mock_get.return_value = mock_response

            with patch("app.services.providers.finnhub.settings") as mock_settings:
                mock_settings.FINNHUB_KEY = "test_key"

                await fetch_ohlc("AAPL", "1d", 100)

                call_args = mock_get.call_args
                assert call_args[0][1]["resolution"] == "D"

    @pytest.mark.asyncio
    async def test_resolution_1w_maps_to_w(self):
        """Test that 1w timeframe maps to W resolution."""
        mock_response = {"s": "no_data"}

        with patch("app.services.providers.finnhub._get") as mock_get:
            mock_get.return_value = mock_response

            with patch("app.services.providers.finnhub.settings") as mock_settings:
                mock_settings.FINNHUB_KEY = "test_key"

                await fetch_ohlc("AAPL", "1w", 100)

                call_args = mock_get.call_args
                assert call_args[0][1]["resolution"] == "W"

    @pytest.mark.asyncio
    async def test_resolution_4h_maps_to_240(self):
        """Test that 4h timeframe maps to 240 resolution."""
        mock_response = {"s": "no_data"}

        with patch("app.services.providers.finnhub._get") as mock_get:
            mock_get.return_value = mock_response

            with patch("app.services.providers.finnhub.settings") as mock_settings:
                mock_settings.FINNHUB_KEY = "test_key"

                await fetch_ohlc("AAPL", "4h", 100)

                call_args = mock_get.call_args
                assert call_args[0][1]["resolution"] == "240"

    @pytest.mark.asyncio
    async def test_resolution_1h_maps_to_60(self):
        """Test that 1h timeframe maps to 60 resolution."""
        mock_response = {"s": "no_data"}

        with patch("app.services.providers.finnhub._get") as mock_get:
            mock_get.return_value = mock_response

            with patch("app.services.providers.finnhub.settings") as mock_settings:
                mock_settings.FINNHUB_KEY = "test_key"

                await fetch_ohlc("AAPL", "1h", 100)

                call_args = mock_get.call_args
                assert call_args[0][1]["resolution"] == "60"

    @pytest.mark.asyncio
    async def test_resolution_30m_maps_to_30(self):
        """Test that 30m timeframe maps to 30 resolution."""
        mock_response = {"s": "no_data"}

        with patch("app.services.providers.finnhub._get") as mock_get:
            mock_get.return_value = mock_response

            with patch("app.services.providers.finnhub.settings") as mock_settings:
                mock_settings.FINNHUB_KEY = "test_key"

                await fetch_ohlc("AAPL", "30m", 100)

                call_args = mock_get.call_args
                assert call_args[0][1]["resolution"] == "30"

    @pytest.mark.asyncio
    async def test_resolution_15m_maps_to_15(self):
        """Test that 15m timeframe maps to 15 resolution."""
        mock_response = {"s": "no_data"}

        with patch("app.services.providers.finnhub._get") as mock_get:
            mock_get.return_value = mock_response

            with patch("app.services.providers.finnhub.settings") as mock_settings:
                mock_settings.FINNHUB_KEY = "test_key"

                await fetch_ohlc("AAPL", "15m", 100)

                call_args = mock_get.call_args
                assert call_args[0][1]["resolution"] == "15"

    @pytest.mark.asyncio
    async def test_returns_empty_list_when_status_not_ok(self):
        """Test that empty list is returned when status is not ok."""
        mock_response = {"s": "no_data"}

        with patch("app.services.providers.finnhub._get") as mock_get:
            mock_get.return_value = mock_response

            with patch("app.services.providers.finnhub.settings") as mock_settings:
                mock_settings.FINNHUB_KEY = "test_key"

                result = await fetch_ohlc("INVALID", "1d", 100)

                assert result == []

    @pytest.mark.asyncio
    async def test_parses_ohlc_data_correctly(self):
        """Test that OHLC data is parsed correctly."""
        mock_response = {
            "s": "ok",
            "t": [1705363200],  # Unix timestamp in seconds
            "o": [150.0],
            "h": [155.0],
            "l": [149.0],
            "c": [154.0],
            "v": [50000000],
        }

        with patch("app.services.providers.finnhub._get") as mock_get:
            mock_get.return_value = mock_response

            with patch("app.services.providers.finnhub.settings") as mock_settings:
                mock_settings.FINNHUB_KEY = "test_key"

                result = await fetch_ohlc("AAPL", "1d", 100)

                assert len(result) == 1
                # Timestamp converted to milliseconds
                assert result[0]["ts"] == 1705363200000
                assert result[0]["o"] == 150.0
                assert result[0]["h"] == 155.0
                # Note: Finnhub uses "low" key instead of "l" in output
                assert result[0]["low"] == 149.0
                assert result[0]["c"] == 154.0
                assert result[0]["v"] == 50000000

    @pytest.mark.asyncio
    async def test_handles_multiple_candles(self):
        """Test that multiple candles are parsed correctly."""
        mock_response = {
            "s": "ok",
            "t": [1705363200, 1705449600],
            "o": [150.0, 154.0],
            "h": [155.0, 158.0],
            "l": [149.0, 153.0],
            "c": [154.0, 157.0],
            "v": [50000000, 45000000],
        }

        with patch("app.services.providers.finnhub._get") as mock_get:
            mock_get.return_value = mock_response

            with patch("app.services.providers.finnhub.settings") as mock_settings:
                mock_settings.FINNHUB_KEY = "test_key"

                result = await fetch_ohlc("AAPL", "1d", 100)

                assert len(result) == 2
                assert result[0]["o"] == 150.0
                assert result[1]["o"] == 154.0
