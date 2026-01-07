"""Tests for app.services.providers.polygon module.

Tests the Polygon market data provider:
- OHLC data fetching
- Timeframe mapping
- Response parsing

Coverage target: 100%
"""

from unittest.mock import patch

import pytest

from app.services.providers.polygon import _tf, fetch_ohlc


class TestTimeframeMapping:
    """Tests for _tf timeframe mapping function."""

    def test_15m_maps_correctly(self):
        """Test that 15m timeframe maps correctly."""
        mult, unit = _tf("15m")
        assert mult == 15
        assert unit == "minute"

    def test_30m_maps_correctly(self):
        """Test that 30m timeframe maps correctly."""
        mult, unit = _tf("30m")
        assert mult == 30
        assert unit == "minute"

    def test_1h_maps_correctly(self):
        """Test that 1h timeframe maps correctly."""
        mult, unit = _tf("1h")
        assert mult == 1
        assert unit == "hour"

    def test_4h_maps_correctly(self):
        """Test that 4h timeframe maps correctly."""
        mult, unit = _tf("4h")
        assert mult == 4
        assert unit == "hour"

    def test_1d_maps_correctly(self):
        """Test that 1d timeframe maps correctly."""
        mult, unit = _tf("1d")
        assert mult == 1
        assert unit == "day"

    def test_1w_maps_correctly(self):
        """Test that 1w timeframe maps correctly."""
        mult, unit = _tf("1w")
        assert mult == 1
        assert unit == "week"

    def test_unknown_timeframe_raises_keyerror(self):
        """Test that unknown timeframe raises KeyError."""
        with pytest.raises(KeyError):
            _tf("2h")


class TestFetchOhlc:
    """Tests for fetch_ohlc function."""

    @pytest.mark.asyncio
    async def test_calls_correct_api_url(self):
        """Test that correct Polygon API URL is called."""
        mock_response = {"results": []}

        with patch("app.services.providers.polygon._get") as mock_get:
            mock_get.return_value = mock_response

            with patch("app.services.providers.polygon.settings") as mock_settings:
                mock_settings.POLYGON_KEY = "test_key"

                await fetch_ohlc("AAPL", "1d", 100)

                call_args = mock_get.call_args
                assert "api.polygon.io" in call_args[0][0]
                assert "/aggs/ticker/AAPL" in call_args[0][0]

    @pytest.mark.asyncio
    async def test_includes_api_key_in_request(self):
        """Test that API key is included in request."""
        mock_response = {"results": []}

        with patch("app.services.providers.polygon._get") as mock_get:
            mock_get.return_value = mock_response

            with patch("app.services.providers.polygon.settings") as mock_settings:
                mock_settings.POLYGON_KEY = "my_polygon_key"

                await fetch_ohlc("AAPL", "1d", 100)

                call_args = mock_get.call_args
                assert call_args[0][1]["apiKey"] == "my_polygon_key"

    @pytest.mark.asyncio
    async def test_includes_limit_in_request(self):
        """Test that limit is included in request."""
        mock_response = {"results": []}

        with patch("app.services.providers.polygon._get") as mock_get:
            mock_get.return_value = mock_response

            with patch("app.services.providers.polygon.settings") as mock_settings:
                mock_settings.POLYGON_KEY = "test_key"

                await fetch_ohlc("AAPL", "1d", 50)

                call_args = mock_get.call_args
                assert call_args[0][1]["limit"] == 50

    @pytest.mark.asyncio
    async def test_url_includes_timeframe_info(self):
        """Test that URL includes timeframe info."""
        mock_response = {"results": []}

        with patch("app.services.providers.polygon._get") as mock_get:
            mock_get.return_value = mock_response

            with patch("app.services.providers.polygon.settings") as mock_settings:
                mock_settings.POLYGON_KEY = "test_key"

                await fetch_ohlc("AAPL", "1d", 100)

                call_args = mock_get.call_args
                # URL should contain /1/day/ for 1d timeframe
                assert "/1/day/" in call_args[0][0]

    @pytest.mark.asyncio
    async def test_url_includes_15m_timeframe(self):
        """Test that URL includes 15 minute timeframe."""
        mock_response = {"results": []}

        with patch("app.services.providers.polygon._get") as mock_get:
            mock_get.return_value = mock_response

            with patch("app.services.providers.polygon.settings") as mock_settings:
                mock_settings.POLYGON_KEY = "test_key"

                await fetch_ohlc("AAPL", "15m", 100)

                call_args = mock_get.call_args
                assert "/15/minute/" in call_args[0][0]

    @pytest.mark.asyncio
    async def test_parses_ohlc_data_correctly(self):
        """Test that OHLC data is parsed correctly."""
        mock_response = {
            "results": [
                {
                    "t": 1705363200000,
                    "o": 150.0,
                    "h": 155.0,
                    "l": 149.0,
                    "c": 154.0,
                    "v": 50000000,
                }
            ]
        }

        with patch("app.services.providers.polygon._get") as mock_get:
            mock_get.return_value = mock_response

            with patch("app.services.providers.polygon.settings") as mock_settings:
                mock_settings.POLYGON_KEY = "test_key"

                result = await fetch_ohlc("AAPL", "1d", 100)

                assert len(result) == 1
                assert result[0]["ts"] == 1705363200000
                assert result[0]["o"] == 150.0
                assert result[0]["h"] == 155.0
                assert result[0]["l"] == 149.0
                assert result[0]["c"] == 154.0
                assert result[0]["v"] == 50000000

    @pytest.mark.asyncio
    async def test_handles_missing_volume(self):
        """Test that missing volume defaults to 0."""
        mock_response = {
            "results": [
                {
                    "t": 1705363200000,
                    "o": 150.0,
                    "h": 155.0,
                    "l": 149.0,
                    "c": 154.0,
                    # No volume field
                }
            ]
        }

        with patch("app.services.providers.polygon._get") as mock_get:
            mock_get.return_value = mock_response

            with patch("app.services.providers.polygon.settings") as mock_settings:
                mock_settings.POLYGON_KEY = "test_key"

                result = await fetch_ohlc("AAPL", "1d", 100)

                assert result[0]["v"] == 0

    @pytest.mark.asyncio
    async def test_returns_empty_list_when_no_results(self):
        """Test that empty list is returned when no results."""
        mock_response = {"results": []}

        with patch("app.services.providers.polygon._get") as mock_get:
            mock_get.return_value = mock_response

            with patch("app.services.providers.polygon.settings") as mock_settings:
                mock_settings.POLYGON_KEY = "test_key"

                result = await fetch_ohlc("AAPL", "1d", 100)

                assert result == []

    @pytest.mark.asyncio
    async def test_returns_empty_list_when_no_results_key(self):
        """Test that empty list is returned when no results key."""
        mock_response = {"status": "error"}

        with patch("app.services.providers.polygon._get") as mock_get:
            mock_get.return_value = mock_response

            with patch("app.services.providers.polygon.settings") as mock_settings:
                mock_settings.POLYGON_KEY = "test_key"

                result = await fetch_ohlc("AAPL", "1d", 100)

                assert result == []

    @pytest.mark.asyncio
    async def test_handles_multiple_results(self):
        """Test that multiple results are parsed correctly."""
        mock_response = {
            "results": [
                {
                    "t": 1705363200000,
                    "o": 150.0,
                    "h": 155.0,
                    "l": 149.0,
                    "c": 154.0,
                    "v": 50000000,
                },
                {
                    "t": 1705449600000,
                    "o": 154.0,
                    "h": 158.0,
                    "l": 153.0,
                    "c": 157.0,
                    "v": 45000000,
                },
            ]
        }

        with patch("app.services.providers.polygon._get") as mock_get:
            mock_get.return_value = mock_response

            with patch("app.services.providers.polygon.settings") as mock_settings:
                mock_settings.POLYGON_KEY = "test_key"

                result = await fetch_ohlc("AAPL", "1d", 100)

                assert len(result) == 2
                assert result[0]["o"] == 150.0
                assert result[1]["o"] == 154.0
