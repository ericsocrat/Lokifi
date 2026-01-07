"""Tests for app.services.providers.coingecko module.

Tests the CoinGecko market data provider:
- OHLC data fetching
- Timeframe to days mapping
- Symbol transformation
- Response parsing

Coverage target: 100%
"""

from unittest.mock import patch

import pytest

from app.services.providers.coingecko import fetch_ohlc


class TestFetchOhlc:
    """Tests for fetch_ohlc function."""

    @pytest.mark.asyncio
    async def test_transforms_symbol_correctly(self):
        """Test that symbol is transformed correctly."""
        mock_response = []

        with patch("app.services.providers.coingecko._get") as mock_get:
            mock_get.return_value = mock_response

            with patch("app.services.providers.coingecko.settings") as mock_settings:
                mock_settings.COINGECKO_KEY = "test_key"

                await fetch_ohlc("BTCUSD", "1d", 100)

                call_args = mock_get.call_args
                # Should call with lowercase symbol, USD removed
                assert "btc" in call_args[0][0].lower()

    @pytest.mark.asyncio
    async def test_removes_usd_from_symbol(self):
        """Test that USD is removed from symbol."""
        mock_response = []

        with patch("app.services.providers.coingecko._get") as mock_get:
            mock_get.return_value = mock_response

            with patch("app.services.providers.coingecko.settings") as mock_settings:
                mock_settings.COINGECKO_KEY = "test_key"

                await fetch_ohlc("ETHUSD", "1d", 100)

                call_args = mock_get.call_args
                # ETH should be in the URL, not ETHUSD
                assert "eth" in call_args[0][0].lower()

    @pytest.mark.asyncio
    async def test_removes_hyphen_from_symbol(self):
        """Test that hyphen is removed from symbol."""
        mock_response = []

        with patch("app.services.providers.coingecko._get") as mock_get:
            mock_get.return_value = mock_response

            with patch("app.services.providers.coingecko.settings") as mock_settings:
                mock_settings.COINGECKO_KEY = "test_key"

                await fetch_ohlc("BTC-USD", "1d", 100)

                call_args = mock_get.call_args
                # URL should have btc without hyphen
                assert "btc" in call_args[0][0].lower()
                assert "-" not in call_args[0][0].split("/")[-2]

    @pytest.mark.asyncio
    async def test_timeframe_15m_maps_to_1_day(self):
        """Test that 15m timeframe maps to 1 day."""
        mock_response = []

        with patch("app.services.providers.coingecko._get") as mock_get:
            mock_get.return_value = mock_response

            with patch("app.services.providers.coingecko.settings") as mock_settings:
                mock_settings.COINGECKO_KEY = "test_key"

                await fetch_ohlc("BTCUSD", "15m", 100)

                call_args = mock_get.call_args
                assert call_args[0][1]["days"] == 1

    @pytest.mark.asyncio
    async def test_timeframe_30m_maps_to_1_day(self):
        """Test that 30m timeframe maps to 1 day."""
        mock_response = []

        with patch("app.services.providers.coingecko._get") as mock_get:
            mock_get.return_value = mock_response

            with patch("app.services.providers.coingecko.settings") as mock_settings:
                mock_settings.COINGECKO_KEY = "test_key"

                await fetch_ohlc("BTCUSD", "30m", 100)

                call_args = mock_get.call_args
                assert call_args[0][1]["days"] == 1

    @pytest.mark.asyncio
    async def test_timeframe_1h_maps_to_1_day(self):
        """Test that 1h timeframe maps to 1 day."""
        mock_response = []

        with patch("app.services.providers.coingecko._get") as mock_get:
            mock_get.return_value = mock_response

            with patch("app.services.providers.coingecko.settings") as mock_settings:
                mock_settings.COINGECKO_KEY = "test_key"

                await fetch_ohlc("BTCUSD", "1h", 100)

                call_args = mock_get.call_args
                assert call_args[0][1]["days"] == 1

    @pytest.mark.asyncio
    async def test_timeframe_4h_maps_to_7_days(self):
        """Test that 4h timeframe maps to 7 days."""
        mock_response = []

        with patch("app.services.providers.coingecko._get") as mock_get:
            mock_get.return_value = mock_response

            with patch("app.services.providers.coingecko.settings") as mock_settings:
                mock_settings.COINGECKO_KEY = "test_key"

                await fetch_ohlc("BTCUSD", "4h", 100)

                call_args = mock_get.call_args
                assert call_args[0][1]["days"] == 7

    @pytest.mark.asyncio
    async def test_timeframe_1d_maps_to_30_days(self):
        """Test that 1d timeframe maps to 30 days."""
        mock_response = []

        with patch("app.services.providers.coingecko._get") as mock_get:
            mock_get.return_value = mock_response

            with patch("app.services.providers.coingecko.settings") as mock_settings:
                mock_settings.COINGECKO_KEY = "test_key"

                await fetch_ohlc("BTCUSD", "1d", 100)

                call_args = mock_get.call_args
                assert call_args[0][1]["days"] == 30

    @pytest.mark.asyncio
    async def test_timeframe_1w_maps_to_90_days(self):
        """Test that 1w timeframe maps to 90 days."""
        mock_response = []

        with patch("app.services.providers.coingecko._get") as mock_get:
            mock_get.return_value = mock_response

            with patch("app.services.providers.coingecko.settings") as mock_settings:
                mock_settings.COINGECKO_KEY = "test_key"

                await fetch_ohlc("BTCUSD", "1w", 100)

                call_args = mock_get.call_args
                assert call_args[0][1]["days"] == 90

    @pytest.mark.asyncio
    async def test_parses_ohlc_data_correctly(self):
        """Test that OHLC data is parsed correctly."""
        mock_response = [
            [1705363200000, 42000.0, 43000.0, 41000.0, 42500.0],
        ]

        with patch("app.services.providers.coingecko._get") as mock_get:
            mock_get.return_value = mock_response

            with patch("app.services.providers.coingecko.settings") as mock_settings:
                mock_settings.COINGECKO_KEY = "test_key"

                result = await fetch_ohlc("BTCUSD", "1d", 100)

                assert len(result) == 1
                assert result[0]["ts"] == 1705363200000
                assert result[0]["o"] == 42000.0
                assert result[0]["h"] == 43000.0
                assert result[0]["l"] == 41000.0
                assert result[0]["c"] == 42500.0
                assert result[0]["v"] == 0  # Volume always 0

    @pytest.mark.asyncio
    async def test_limits_results_to_requested_count(self):
        """Test that results are limited to requested count."""
        mock_response = [
            [1705363200000, 42000.0, 43000.0, 41000.0, 42500.0],
            [1705449600000, 42500.0, 44000.0, 42000.0, 43500.0],
            [1705536000000, 43500.0, 45000.0, 43000.0, 44500.0],
            [1705622400000, 44500.0, 46000.0, 44000.0, 45500.0],
            [1705708800000, 45500.0, 47000.0, 45000.0, 46500.0],
        ]

        with patch("app.services.providers.coingecko._get") as mock_get:
            mock_get.return_value = mock_response

            with patch("app.services.providers.coingecko.settings") as mock_settings:
                mock_settings.COINGECKO_KEY = "test_key"

                result = await fetch_ohlc("BTCUSD", "1d", 3)

                # Should return last 3 items
                assert len(result) == 3

    @pytest.mark.asyncio
    async def test_returns_empty_list_when_no_data(self):
        """Test that empty list is returned when no data."""
        mock_response = []

        with patch("app.services.providers.coingecko._get") as mock_get:
            mock_get.return_value = mock_response

            with patch("app.services.providers.coingecko.settings") as mock_settings:
                mock_settings.COINGECKO_KEY = "test_key"

                result = await fetch_ohlc("BTCUSD", "1d", 100)

                assert result == []

    @pytest.mark.asyncio
    async def test_includes_api_key_in_request(self):
        """Test that API key is included in request."""
        mock_response = []

        with patch("app.services.providers.coingecko._get") as mock_get:
            mock_get.return_value = mock_response

            with patch("app.services.providers.coingecko.settings") as mock_settings:
                mock_settings.COINGECKO_KEY = "my_coingecko_key"

                await fetch_ohlc("BTCUSD", "1d", 100)

                call_args = mock_get.call_args
                assert call_args[0][1]["x_cg_demo_api_key"] == "my_coingecko_key"

    @pytest.mark.asyncio
    async def test_calls_correct_api_url(self):
        """Test that correct CoinGecko API URL is called."""
        mock_response = []

        with patch("app.services.providers.coingecko._get") as mock_get:
            mock_get.return_value = mock_response

            with patch("app.services.providers.coingecko.settings") as mock_settings:
                mock_settings.COINGECKO_KEY = "test_key"

                await fetch_ohlc("BTCUSD", "1d", 100)

                call_args = mock_get.call_args
                assert "api.coingecko.com" in call_args[0][0]
                assert "/ohlc" in call_args[0][0]
