"""Tests for app.services.providers.cmc module.

Tests the CoinMarketCap market data provider:
- OHLC data fetching
- API key handling
- Response parsing
- Symbol transformation

Coverage target: 100%
"""

from unittest.mock import AsyncMock, patch

import pytest

from app.services.providers.cmc import fetch_ohlc


class TestFetchOhlc:
    """Tests for fetch_ohlc function."""

    @pytest.mark.asyncio
    async def test_returns_empty_list_when_no_api_key(self):
        """Test that empty list is returned when CMC_KEY is not set."""
        with patch("app.services.providers.cmc.settings") as mock_settings:
            mock_settings.CMC_KEY = None

            result = await fetch_ohlc("BTCUSD", "1d", 100)

            assert result == []

    @pytest.mark.asyncio
    async def test_returns_empty_list_when_api_key_empty(self):
        """Test that empty list is returned when CMC_KEY is empty string."""
        with patch("app.services.providers.cmc.settings") as mock_settings:
            mock_settings.CMC_KEY = ""

            result = await fetch_ohlc("BTCUSD", "1d", 100)

            assert result == []

    @pytest.mark.asyncio
    async def test_calls_correct_api_url(self):
        """Test that correct CMC API URL is called."""
        mock_response = {"data": {"quotes": []}}

        with patch("app.services.providers.cmc._get") as mock_get:
            mock_get.return_value = mock_response

            with patch("app.services.providers.cmc.settings") as mock_settings:
                mock_settings.CMC_KEY = "test_key"

                await fetch_ohlc("BTCUSD", "1d", 100)

                mock_get.assert_called_once()
                call_args = mock_get.call_args
                assert (
                    call_args[0][0]
                    == "https://pro-api.coinmarketcap.com/v2/cryptocurrency/ohlcv/historical"
                )

    @pytest.mark.asyncio
    async def test_includes_api_key_in_params(self):
        """Test that API key is included in request parameters."""
        mock_response = {"data": {"quotes": []}}

        with patch("app.services.providers.cmc._get") as mock_get:
            mock_get.return_value = mock_response

            with patch("app.services.providers.cmc.settings") as mock_settings:
                mock_settings.CMC_KEY = "my_cmc_api_key"

                await fetch_ohlc("BTCUSD", "1d", 100)

                call_args = mock_get.call_args
                assert call_args[0][1]["CMC_PRO_API_KEY"] == "my_cmc_api_key"

    @pytest.mark.asyncio
    async def test_strips_usd_from_symbol(self):
        """Test that USD suffix is stripped from symbol."""
        mock_response = {"data": {"quotes": []}}

        with patch("app.services.providers.cmc._get") as mock_get:
            mock_get.return_value = mock_response

            with patch("app.services.providers.cmc.settings") as mock_settings:
                mock_settings.CMC_KEY = "test_key"

                await fetch_ohlc("BTCUSD", "1d", 100)

                call_args = mock_get.call_args
                assert call_args[0][1]["symbol"] == "BTC"

    @pytest.mark.asyncio
    async def test_symbol_without_usd_unchanged(self):
        """Test that symbol without USD suffix is used as-is."""
        mock_response = {"data": {"quotes": []}}

        with patch("app.services.providers.cmc._get") as mock_get:
            mock_get.return_value = mock_response

            with patch("app.services.providers.cmc.settings") as mock_settings:
                mock_settings.CMC_KEY = "test_key"

                await fetch_ohlc("ETH", "1d", 100)

                call_args = mock_get.call_args
                assert call_args[0][1]["symbol"] == "ETH"

    @pytest.mark.asyncio
    async def test_includes_limit_in_request(self):
        """Test that limit is included in request."""
        mock_response = {"data": {"quotes": []}}

        with patch("app.services.providers.cmc._get") as mock_get:
            mock_get.return_value = mock_response

            with patch("app.services.providers.cmc.settings") as mock_settings:
                mock_settings.CMC_KEY = "test_key"

                await fetch_ohlc("BTCUSD", "1d", 50)

                call_args = mock_get.call_args
                assert call_args[0][1]["count"] == 50

    @pytest.mark.asyncio
    async def test_parses_ohlc_data_correctly(self):
        """Test that OHLC data is parsed correctly."""
        mock_response = {
            "data": {
                "quotes": [
                    {
                        "time_open": "2024-01-15T00:00:00.000Z",
                        "quote": {
                            "USD": {
                                "open": 42000.00,
                                "high": 43000.00,
                                "low": 41000.00,
                                "close": 42500.00,
                                "volume": 1000000000.00,
                            }
                        },
                    }
                ]
            }
        }

        with patch("app.services.providers.cmc._get") as mock_get:
            mock_get.return_value = mock_response

            with patch("app.services.providers.cmc.settings") as mock_settings:
                mock_settings.CMC_KEY = "test_key"

                result = await fetch_ohlc("BTCUSD", "1d", 100)

                assert len(result) == 1
                assert result[0]["o"] == 42000.00
                assert result[0]["h"] == 43000.00
                assert result[0]["l"] == 41000.00
                assert result[0]["c"] == 42500.00
                assert result[0]["v"] == 1000000000.00

    @pytest.mark.asyncio
    async def test_timestamp_is_always_zero(self):
        """Test that timestamp is always set to 0 (implementation specific)."""
        mock_response = {
            "data": {
                "quotes": [
                    {
                        "time_open": "2024-01-15T00:00:00.000Z",
                        "quote": {
                            "USD": {
                                "open": 42000.00,
                                "high": 43000.00,
                                "low": 41000.00,
                                "close": 42500.00,
                                "volume": 1000000000.00,
                            }
                        },
                    }
                ]
            }
        }

        with patch("app.services.providers.cmc._get") as mock_get:
            mock_get.return_value = mock_response

            with patch("app.services.providers.cmc.settings") as mock_settings:
                mock_settings.CMC_KEY = "test_key"

                result = await fetch_ohlc("BTCUSD", "1d", 100)

                # Timestamp is always 0 in current implementation
                assert result[0]["ts"] == 0

    @pytest.mark.asyncio
    async def test_returns_empty_list_when_no_quotes(self):
        """Test that empty list is returned when no quotes in response."""
        mock_response = {"data": {"quotes": []}}

        with patch("app.services.providers.cmc._get") as mock_get:
            mock_get.return_value = mock_response

            with patch("app.services.providers.cmc.settings") as mock_settings:
                mock_settings.CMC_KEY = "test_key"

                result = await fetch_ohlc("BTCUSD", "1d", 100)

                assert result == []

    @pytest.mark.asyncio
    async def test_handles_multiple_quotes(self):
        """Test that multiple quotes are parsed correctly."""
        mock_response = {
            "data": {
                "quotes": [
                    {
                        "time_open": "2024-01-15T00:00:00.000Z",
                        "quote": {
                            "USD": {
                                "open": 42000.00,
                                "high": 43000.00,
                                "low": 41000.00,
                                "close": 42500.00,
                                "volume": 1000000000.00,
                            }
                        },
                    },
                    {
                        "time_open": "2024-01-16T00:00:00.000Z",
                        "quote": {
                            "USD": {
                                "open": 42500.00,
                                "high": 44000.00,
                                "low": 42000.00,
                                "close": 43500.00,
                                "volume": 1200000000.00,
                            }
                        },
                    },
                ]
            }
        }

        with patch("app.services.providers.cmc._get") as mock_get:
            mock_get.return_value = mock_response

            with patch("app.services.providers.cmc.settings") as mock_settings:
                mock_settings.CMC_KEY = "test_key"

                result = await fetch_ohlc("BTCUSD", "1d", 100)

                assert len(result) == 2
                assert result[0]["c"] == 42500.00
                assert result[1]["c"] == 43500.00

    @pytest.mark.asyncio
    async def test_returns_empty_list_when_no_data_key(self):
        """Test that empty list is returned when no data key in response."""
        mock_response = {"status": {"error_code": 400}}

        with patch("app.services.providers.cmc._get") as mock_get:
            mock_get.return_value = mock_response

            with patch("app.services.providers.cmc.settings") as mock_settings:
                mock_settings.CMC_KEY = "test_key"

                result = await fetch_ohlc("INVALID", "1d", 100)

                assert result == []

    @pytest.mark.asyncio
    async def test_returns_empty_list_when_data_is_empty(self):
        """Test that empty list is returned when data dict is empty."""
        mock_response = {"data": {}}

        with patch("app.services.providers.cmc._get") as mock_get:
            mock_get.return_value = mock_response

            with patch("app.services.providers.cmc.settings") as mock_settings:
                mock_settings.CMC_KEY = "test_key"

                result = await fetch_ohlc("BTCUSD", "1d", 100)

                assert result == []


class TestSymbolTransformation:
    """Tests for symbol transformation."""

    @pytest.mark.asyncio
    async def test_ethusd_becomes_eth(self):
        """Test that ETHUSD becomes ETH."""
        mock_response = {"data": {"quotes": []}}

        with patch("app.services.providers.cmc._get") as mock_get:
            mock_get.return_value = mock_response

            with patch("app.services.providers.cmc.settings") as mock_settings:
                mock_settings.CMC_KEY = "test_key"

                await fetch_ohlc("ETHUSD", "1d", 100)

                call_args = mock_get.call_args
                assert call_args[0][1]["symbol"] == "ETH"

    @pytest.mark.asyncio
    async def test_solusd_becomes_sol(self):
        """Test that SOLUSD becomes SOL."""
        mock_response = {"data": {"quotes": []}}

        with patch("app.services.providers.cmc._get") as mock_get:
            mock_get.return_value = mock_response

            with patch("app.services.providers.cmc.settings") as mock_settings:
                mock_settings.CMC_KEY = "test_key"

                await fetch_ohlc("SOLUSD", "1d", 100)

                call_args = mock_get.call_args
                assert call_args[0][1]["symbol"] == "SOL"

    @pytest.mark.asyncio
    async def test_lowercase_symbol_preserved(self):
        """Test that lowercase symbol is preserved."""
        mock_response = {"data": {"quotes": []}}

        with patch("app.services.providers.cmc._get") as mock_get:
            mock_get.return_value = mock_response

            with patch("app.services.providers.cmc.settings") as mock_settings:
                mock_settings.CMC_KEY = "test_key"

                await fetch_ohlc("btc", "1d", 100)

                call_args = mock_get.call_args
                assert call_args[0][1]["symbol"] == "btc"
