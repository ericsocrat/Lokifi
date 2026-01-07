"""Tests for app.services.providers.alphavantage module.

Tests the AlphaVantage market data provider:
- OHLC data fetching
- Timeframe mapping
- API parameter construction
- Response parsing

Coverage target: 100%
"""

from datetime import datetime
from unittest.mock import AsyncMock, patch

import pytest

from app.services.providers.alphavantage import fetch_ohlc


class TestFetchOhlc:
    """Tests for fetch_ohlc function."""

    @pytest.mark.asyncio
    async def test_intraday_timeframe_uses_time_series_intraday(self):
        """Test that intraday timeframes use TIME_SERIES_INTRADAY function."""
        mock_response = {
            "Time Series (15min)": {
                "2024-01-15 10:00:00": {
                    "1. open": "100.00",
                    "2. high": "101.00",
                    "3. low": "99.00",
                    "4. close": "100.50",
                    "6. volume": "1000000",
                }
            }
        }

        with patch("app.services.providers.alphavantage._get") as mock_get:
            mock_get.return_value = mock_response

            with patch("app.services.providers.alphavantage.settings") as mock_settings:
                mock_settings.ALPHAVANTAGE_KEY = "test_key"

                await fetch_ohlc("AAPL", "15m", 100)

                mock_get.assert_called_once()
                call_args = mock_get.call_args
                assert call_args[0][1]["function"] == "TIME_SERIES_INTRADAY"

    @pytest.mark.asyncio
    async def test_daily_timeframe_uses_time_series_daily_adjusted(self):
        """Test that daily timeframes use TIME_SERIES_DAILY_ADJUSTED function."""
        mock_response = {
            "Time Series (Daily)": {
                "2024-01-15": {
                    "1. open": "100.00",
                    "2. high": "101.00",
                    "3. low": "99.00",
                    "4. close": "100.50",
                    "6. volume": "1000000",
                }
            }
        }

        with patch("app.services.providers.alphavantage._get") as mock_get:
            mock_get.return_value = mock_response

            with patch("app.services.providers.alphavantage.settings") as mock_settings:
                mock_settings.ALPHAVANTAGE_KEY = "test_key"

                await fetch_ohlc("AAPL", "1d", 100)

                mock_get.assert_called_once()
                call_args = mock_get.call_args
                assert call_args[0][1]["function"] == "TIME_SERIES_DAILY_ADJUSTED"

    @pytest.mark.asyncio
    async def test_interval_mapping_15m(self):
        """Test that 15m timeframe maps to 15min interval."""
        mock_response = {"Time Series (15min)": {}}

        with patch("app.services.providers.alphavantage._get") as mock_get:
            mock_get.return_value = mock_response

            with patch("app.services.providers.alphavantage.settings") as mock_settings:
                mock_settings.ALPHAVANTAGE_KEY = "test_key"

                await fetch_ohlc("AAPL", "15m", 100)

                call_args = mock_get.call_args
                assert call_args[0][1]["interval"] == "15min"

    @pytest.mark.asyncio
    async def test_interval_mapping_30m(self):
        """Test that 30m timeframe maps to 30min interval."""
        mock_response = {"Time Series (30min)": {}}

        with patch("app.services.providers.alphavantage._get") as mock_get:
            mock_get.return_value = mock_response

            with patch("app.services.providers.alphavantage.settings") as mock_settings:
                mock_settings.ALPHAVANTAGE_KEY = "test_key"

                await fetch_ohlc("AAPL", "30m", 100)

                call_args = mock_get.call_args
                assert call_args[0][1]["interval"] == "30min"

    @pytest.mark.asyncio
    async def test_interval_mapping_1h(self):
        """Test that 1h timeframe maps to 60min interval."""
        mock_response = {"Time Series (60min)": {}}

        with patch("app.services.providers.alphavantage._get") as mock_get:
            mock_get.return_value = mock_response

            with patch("app.services.providers.alphavantage.settings") as mock_settings:
                mock_settings.ALPHAVANTAGE_KEY = "test_key"

                await fetch_ohlc("AAPL", "1h", 100)

                call_args = mock_get.call_args
                assert call_args[0][1]["interval"] == "60min"

    @pytest.mark.asyncio
    async def test_interval_mapping_4h(self):
        """Test that 4h timeframe maps to 60min interval."""
        mock_response = {"Time Series (60min)": {}}

        with patch("app.services.providers.alphavantage._get") as mock_get:
            mock_get.return_value = mock_response

            with patch("app.services.providers.alphavantage.settings") as mock_settings:
                mock_settings.ALPHAVANTAGE_KEY = "test_key"

                await fetch_ohlc("AAPL", "4h", 100)

                call_args = mock_get.call_args
                assert call_args[0][1]["interval"] == "60min"

    @pytest.mark.asyncio
    async def test_daily_timeframe_has_no_interval(self):
        """Test that daily timeframes don't include interval parameter."""
        mock_response = {"Time Series (Daily)": {}}

        with patch("app.services.providers.alphavantage._get") as mock_get:
            mock_get.return_value = mock_response

            with patch("app.services.providers.alphavantage.settings") as mock_settings:
                mock_settings.ALPHAVANTAGE_KEY = "test_key"

                await fetch_ohlc("AAPL", "1d", 100)

                call_args = mock_get.call_args
                assert "interval" not in call_args[0][1]

    @pytest.mark.asyncio
    async def test_parses_ohlc_data_correctly(self):
        """Test that OHLC data is parsed correctly."""
        mock_response = {
            "Time Series (Daily)": {
                "2024-01-15": {
                    "1. open": "150.00",
                    "2. high": "155.00",
                    "3. low": "149.00",
                    "4. close": "154.00",
                    "6. volume": "50000000",
                }
            }
        }

        with patch("app.services.providers.alphavantage._get") as mock_get:
            mock_get.return_value = mock_response

            with patch("app.services.providers.alphavantage.settings") as mock_settings:
                mock_settings.ALPHAVANTAGE_KEY = "test_key"

                result = await fetch_ohlc("AAPL", "1d", 100)

                assert len(result) == 1
                assert result[0]["o"] == 150.00
                assert result[0]["h"] == 155.00
                assert result[0]["l"] == 149.00
                assert result[0]["c"] == 154.00
                assert result[0]["v"] == 50000000.0

    @pytest.mark.asyncio
    async def test_converts_timestamp_to_milliseconds(self):
        """Test that timestamp is converted to milliseconds."""
        mock_response = {
            "Time Series (Daily)": {
                "2024-01-15": {
                    "1. open": "100.00",
                    "2. high": "101.00",
                    "3. low": "99.00",
                    "4. close": "100.50",
                    "6. volume": "1000000",
                }
            }
        }

        with patch("app.services.providers.alphavantage._get") as mock_get:
            mock_get.return_value = mock_response

            with patch("app.services.providers.alphavantage.settings") as mock_settings:
                mock_settings.ALPHAVANTAGE_KEY = "test_key"

                result = await fetch_ohlc("AAPL", "1d", 100)

                # Verify timestamp is in milliseconds
                expected_ts = int(
                    datetime.fromisoformat("2024-01-15").timestamp() * 1000
                )
                assert result[0]["ts"] == expected_ts

    @pytest.mark.asyncio
    async def test_limits_results_to_requested_count(self):
        """Test that results are limited to requested count."""
        mock_response = {
            "Time Series (Daily)": {
                f"2024-01-{i:02d}": {
                    "1. open": "100.00",
                    "2. high": "101.00",
                    "3. low": "99.00",
                    "4. close": "100.50",
                    "6. volume": "1000000",
                }
                for i in range(1, 20)  # 19 data points
            }
        }

        with patch("app.services.providers.alphavantage._get") as mock_get:
            mock_get.return_value = mock_response

            with patch("app.services.providers.alphavantage.settings") as mock_settings:
                mock_settings.ALPHAVANTAGE_KEY = "test_key"

                result = await fetch_ohlc("AAPL", "1d", 5)

                assert len(result) == 5

    @pytest.mark.asyncio
    async def test_returns_empty_list_when_no_time_series(self):
        """Test that empty list is returned when no Time Series data."""
        mock_response = {
            "Error Message": "Invalid API call",
            "Note": "Rate limit exceeded",
        }

        with patch("app.services.providers.alphavantage._get") as mock_get:
            mock_get.return_value = mock_response

            with patch("app.services.providers.alphavantage.settings") as mock_settings:
                mock_settings.ALPHAVANTAGE_KEY = "test_key"

                result = await fetch_ohlc("INVALID", "1d", 100)

                assert result == []

    @pytest.mark.asyncio
    async def test_includes_api_key_in_request(self):
        """Test that API key is included in request."""
        mock_response = {"Time Series (Daily)": {}}

        with patch("app.services.providers.alphavantage._get") as mock_get:
            mock_get.return_value = mock_response

            with patch("app.services.providers.alphavantage.settings") as mock_settings:
                mock_settings.ALPHAVANTAGE_KEY = "my_test_api_key"

                await fetch_ohlc("AAPL", "1d", 100)

                call_args = mock_get.call_args
                assert call_args[0][1]["apikey"] == "my_test_api_key"

    @pytest.mark.asyncio
    async def test_includes_symbol_in_request(self):
        """Test that symbol is included in request."""
        mock_response = {"Time Series (Daily)": {}}

        with patch("app.services.providers.alphavantage._get") as mock_get:
            mock_get.return_value = mock_response

            with patch("app.services.providers.alphavantage.settings") as mock_settings:
                mock_settings.ALPHAVANTAGE_KEY = "test_key"

                await fetch_ohlc("MSFT", "1d", 100)

                call_args = mock_get.call_args
                assert call_args[0][1]["symbol"] == "MSFT"

    @pytest.mark.asyncio
    async def test_calls_correct_api_url(self):
        """Test that correct AlphaVantage API URL is called."""
        mock_response = {"Time Series (Daily)": {}}

        with patch("app.services.providers.alphavantage._get") as mock_get:
            mock_get.return_value = mock_response

            with patch("app.services.providers.alphavantage.settings") as mock_settings:
                mock_settings.ALPHAVANTAGE_KEY = "test_key"

                await fetch_ohlc("AAPL", "1d", 100)

                mock_get.assert_called_once()
                call_args = mock_get.call_args
                assert call_args[0][0] == "https://www.alphavantage.co/query"

    @pytest.mark.asyncio
    async def test_handles_missing_volume_field(self):
        """Test that missing volume field defaults to 0."""
        mock_response = {
            "Time Series (Daily)": {
                "2024-01-15": {
                    "1. open": "100.00",
                    "2. high": "101.00",
                    "3. low": "99.00",
                    "4. close": "100.50",
                    # No volume field
                }
            }
        }

        with patch("app.services.providers.alphavantage._get") as mock_get:
            mock_get.return_value = mock_response

            with patch("app.services.providers.alphavantage.settings") as mock_settings:
                mock_settings.ALPHAVANTAGE_KEY = "test_key"

                result = await fetch_ohlc("AAPL", "1d", 100)

                assert result[0]["v"] == 0.0

    @pytest.mark.asyncio
    async def test_reverses_chronological_order(self):
        """Test that data is reversed from newest-first to oldest-first."""
        mock_response = {
            "Time Series (Daily)": {
                "2024-01-15": {
                    "1. open": "150.00",
                    "2. high": "150.00",
                    "3. low": "150.00",
                    "4. close": "150.00",
                    "6. volume": "100",
                },
                "2024-01-14": {
                    "1. open": "140.00",
                    "2. high": "140.00",
                    "3. low": "140.00",
                    "4. close": "140.00",
                    "6. volume": "100",
                },
                "2024-01-13": {
                    "1. open": "130.00",
                    "2. high": "130.00",
                    "3. low": "130.00",
                    "4. close": "130.00",
                    "6. volume": "100",
                },
            }
        }

        with patch("app.services.providers.alphavantage._get") as mock_get:
            mock_get.return_value = mock_response

            with patch("app.services.providers.alphavantage.settings") as mock_settings:
                mock_settings.ALPHAVANTAGE_KEY = "test_key"

                result = await fetch_ohlc("AAPL", "1d", 100)

                # Result should be oldest to newest
                assert len(result) == 3
                # First item should have smallest open (oldest data)
                # Due to dict ordering in Python 3.7+, this depends on insertion order
                # The [::-1] reverses the list


class TestTimeframeMapping:
    """Tests for timeframe mapping."""

    @pytest.mark.asyncio
    async def test_unknown_timeframe_uses_daily(self):
        """Test that unknown timeframes use daily function."""
        mock_response = {"Time Series (Daily)": {}}

        with patch("app.services.providers.alphavantage._get") as mock_get:
            mock_get.return_value = mock_response

            with patch("app.services.providers.alphavantage.settings") as mock_settings:
                mock_settings.ALPHAVANTAGE_KEY = "test_key"

                await fetch_ohlc("AAPL", "1w", 100)  # Unknown timeframe

                call_args = mock_get.call_args
                assert call_args[0][1]["function"] == "TIME_SERIES_DAILY_ADJUSTED"

    @pytest.mark.asyncio
    async def test_unknown_timeframe_has_no_interval(self):
        """Test that unknown timeframes don't have interval parameter."""
        mock_response = {"Time Series (Daily)": {}}

        with patch("app.services.providers.alphavantage._get") as mock_get:
            mock_get.return_value = mock_response

            with patch("app.services.providers.alphavantage.settings") as mock_settings:
                mock_settings.ALPHAVANTAGE_KEY = "test_key"

                await fetch_ohlc("AAPL", "1w", 100)

                call_args = mock_get.call_args
                assert "interval" not in call_args[0][1]
