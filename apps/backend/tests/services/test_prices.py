"""Tests for app.services.prices module.

Tests the price fetching service including:
- Symbol detection (equity vs crypto)
- Provider chain fallback
- Redis caching integration
- OHLC data fetching

Coverage target: 100%
"""

from unittest.mock import AsyncMock, patch

import pytest

# Import the module under test
from app.services.prices import _is_equity, _try_chain, get_ohlc


class TestIsEquity:
    """Tests for _is_equity function."""

    def test_short_alpha_symbols_are_equity(self):
        """Test that 2-5 letter symbols are classified as equity."""
        assert _is_equity("AAPL") is True
        assert _is_equity("MSFT") is True
        assert _is_equity("AA") is True
        assert _is_equity("GOOGL") is True

    def test_single_letter_not_equity(self):
        """Test that single letter symbols are not equity."""
        assert _is_equity("A") is False

    def test_long_symbols_not_equity(self):
        """Test that 6+ letter symbols are not equity."""
        assert _is_equity("ABCDEF") is False
        assert _is_equity("BITCOIN") is False

    def test_numeric_symbols_not_equity(self):
        """Test that symbols with numbers are not equity."""
        assert _is_equity("BTC123") is False
        assert _is_equity("123") is False

    def test_dashes_are_stripped(self):
        """Test that dashes are stripped before checking."""
        assert _is_equity("BRK-B") is True  # BRK + B = 4 letters

    def test_dots_are_stripped(self):
        """Test that dots are stripped before checking."""
        assert _is_equity("BRK.A") is True  # BRK + A = 4 letters

    def test_colons_are_stripped(self):
        """Test that colons are stripped before checking."""
        assert _is_equity("NYSE:AAPL") is False  # NYSEAAPL = 8 letters

    def test_crypto_symbols_not_equity(self):
        """Test that crypto symbols are not equity."""
        assert _is_equity("BTCUSD") is False
        assert _is_equity("ETH-USD") is False  # ETH + USD = 6 letters

    def test_empty_string_not_equity(self):
        """Test that empty string is not equity."""
        assert _is_equity("") is False


class TestTryChain:
    """Tests for _try_chain function."""

    @pytest.mark.asyncio
    async def test_returns_first_successful_result(self):
        """Test that _try_chain returns first successful result."""

        async def success():
            return {"data": "value"}

        result = await _try_chain([success])
        assert result == {"data": "value"}

    @pytest.mark.asyncio
    async def test_skips_failed_providers(self):
        """Test that _try_chain skips providers that raise exceptions."""

        async def failure():
            raise Exception("Provider failed")

        async def success():
            return {"data": "from_second"}

        result = await _try_chain([failure, success])
        assert result == {"data": "from_second"}

    @pytest.mark.asyncio
    async def test_skips_empty_results(self):
        """Test that _try_chain skips providers returning empty results."""

        async def empty_result():
            return []

        async def success():
            return [{"data": "value"}]

        result = await _try_chain([empty_result, success])
        assert result == [{"data": "value"}]

    @pytest.mark.asyncio
    async def test_skips_none_results(self):
        """Test that _try_chain skips providers returning None."""

        async def none_result():
            return None

        async def success():
            return {"data": "value"}

        result = await _try_chain([none_result, success])
        assert result == {"data": "value"}

    @pytest.mark.asyncio
    async def test_returns_empty_list_when_all_fail(self):
        """Test that _try_chain returns empty list when all providers fail."""

        async def failure1():
            raise Exception("Provider 1 failed")

        async def failure2():
            raise ValueError("Provider 2 failed")

        result = await _try_chain([failure1, failure2])
        assert result == []

    @pytest.mark.asyncio
    async def test_returns_empty_list_when_all_return_empty(self):
        """Test that _try_chain returns empty list when all return empty."""

        async def empty1():
            return []

        async def empty2():
            return None

        result = await _try_chain([empty1, empty2])
        assert result == []

    @pytest.mark.asyncio
    async def test_handles_empty_task_list(self):
        """Test that _try_chain handles empty task list."""
        result = await _try_chain([])
        assert result == []

    @pytest.mark.asyncio
    async def test_returns_truthy_value_immediately(self):
        """Test that _try_chain returns truthy result without checking remaining."""
        call_count = 0

        async def first():
            nonlocal call_count
            call_count += 1
            return {"result": "first"}

        async def second():
            nonlocal call_count
            call_count += 1
            return {"result": "second"}

        result = await _try_chain([first, second])
        assert result == {"result": "first"}
        assert call_count == 1  # Second was never called


class TestGetOhlc:
    """Tests for get_ohlc function."""

    @pytest.mark.asyncio
    async def test_returns_cached_data_if_exists(self):
        """Test that get_ohlc returns cached data without calling providers."""
        cached_data = [{"time": 1, "open": 100}]

        with patch(
            "app.services.prices.redis_json_get", new_callable=AsyncMock
        ) as mock_get:
            mock_get.return_value = cached_data

            result = await get_ohlc("AAPL", "1h", 100)

            assert result == cached_data
            mock_get.assert_called_once_with("ohlc:AAPL:1h:100")

    @pytest.mark.asyncio
    async def test_fetches_equity_data_from_providers(self):
        """Test that get_ohlc fetches equity data from provider chain."""
        provider_data = [{"time": 1, "open": 150}]

        with patch(
            "app.services.prices.redis_json_get", new_callable=AsyncMock
        ) as mock_get:
            mock_get.return_value = None  # No cache

            with patch(
                "app.services.prices.polygon.fetch_ohlc", new_callable=AsyncMock
            ) as mock_polygon:
                mock_polygon.return_value = provider_data

                with patch(
                    "app.services.prices.redis_json_set", new_callable=AsyncMock
                ) as mock_set:
                    result = await get_ohlc("AAPL", "1h", 100)

                    assert result == provider_data
                    mock_polygon.assert_called_once()
                    mock_set.assert_called_once_with(
                        "ohlc:AAPL:1h:100", provider_data, ttl=60
                    )

    @pytest.mark.asyncio
    async def test_fetches_crypto_data_from_coingecko_first(self):
        """Test that get_ohlc fetches crypto data from CoinGecko first."""
        provider_data = [{"time": 1, "open": 50000}]

        with patch(
            "app.services.prices.redis_json_get", new_callable=AsyncMock
        ) as mock_get:
            mock_get.return_value = None

            with patch(
                "app.services.prices.coingecko.fetch_ohlc", new_callable=AsyncMock
            ) as mock_cg:
                mock_cg.return_value = provider_data

                with patch(
                    "app.services.prices.redis_json_set", new_callable=AsyncMock
                ):
                    result = await get_ohlc("BTCUSD", "1d", 30)

                    assert result == provider_data
                    mock_cg.assert_called_once()

    @pytest.mark.asyncio
    async def test_equity_fallback_to_finnhub(self):
        """Test that equity falls back to Finnhub when Polygon fails."""
        finnhub_data = [{"time": 1, "open": 200}]

        with patch(
            "app.services.prices.redis_json_get", new_callable=AsyncMock
        ) as mock_get:
            mock_get.return_value = None

            with patch(
                "app.services.prices.polygon.fetch_ohlc", new_callable=AsyncMock
            ) as mock_polygon:
                mock_polygon.side_effect = Exception("Polygon error")

                with patch(
                    "app.services.prices.finnhub.fetch_ohlc", new_callable=AsyncMock
                ) as mock_finnhub:
                    mock_finnhub.return_value = finnhub_data

                    with patch(
                        "app.services.prices.redis_json_set", new_callable=AsyncMock
                    ):
                        result = await get_ohlc("MSFT", "1h", 50)

                        assert result == finnhub_data
                        mock_polygon.assert_called_once()
                        mock_finnhub.assert_called_once()

    @pytest.mark.asyncio
    async def test_equity_fallback_to_alphavantage(self):
        """Test that equity falls back to AlphaVantage when others fail."""
        av_data = [{"time": 1, "open": 250}]

        with patch(
            "app.services.prices.redis_json_get", new_callable=AsyncMock
        ) as mock_get:
            mock_get.return_value = None

            with patch(
                "app.services.prices.polygon.fetch_ohlc", new_callable=AsyncMock
            ) as mock_polygon:
                mock_polygon.return_value = []  # Empty result

                with patch(
                    "app.services.prices.finnhub.fetch_ohlc", new_callable=AsyncMock
                ) as mock_finnhub:
                    mock_finnhub.side_effect = Exception("Finnhub error")

                    with patch(
                        "app.services.prices.alphavantage.fetch_ohlc",
                        new_callable=AsyncMock,
                    ) as mock_av:
                        mock_av.return_value = av_data

                        with patch(
                            "app.services.prices.redis_json_set", new_callable=AsyncMock
                        ):
                            result = await get_ohlc("GOOGL", "1d", 20)

                            assert result == av_data

    @pytest.mark.asyncio
    async def test_crypto_fallback_to_cmc(self):
        """Test that crypto falls back to CMC when CoinGecko fails."""
        cmc_data = [{"time": 1, "open": 3000}]

        with patch(
            "app.services.prices.redis_json_get", new_callable=AsyncMock
        ) as mock_get:
            mock_get.return_value = None

            with patch(
                "app.services.prices.coingecko.fetch_ohlc", new_callable=AsyncMock
            ) as mock_cg:
                mock_cg.side_effect = Exception("CoinGecko error")

                with patch(
                    "app.services.prices.cmc.fetch_ohlc", new_callable=AsyncMock
                ) as mock_cmc:
                    mock_cmc.return_value = cmc_data

                    with patch(
                        "app.services.prices.redis_json_set", new_callable=AsyncMock
                    ):
                        result = await get_ohlc("ETHUSD", "1h", 100)

                        assert result == cmc_data

    @pytest.mark.asyncio
    async def test_caches_result_with_correct_key(self):
        """Test that result is cached with correct key format."""
        with patch(
            "app.services.prices.redis_json_get", new_callable=AsyncMock
        ) as mock_get:
            mock_get.return_value = None

            with patch(
                "app.services.prices.polygon.fetch_ohlc", new_callable=AsyncMock
            ) as mock_polygon:
                mock_polygon.return_value = [{"data": 1}]

                with patch(
                    "app.services.prices.redis_json_set", new_callable=AsyncMock
                ) as mock_set:
                    await get_ohlc("TSLA", "15m", 200)

                    mock_set.assert_called_once()
                    call_args = mock_set.call_args
                    assert call_args[0][0] == "ohlc:TSLA:15m:200"
                    assert call_args[1]["ttl"] == 60

    @pytest.mark.asyncio
    async def test_returns_empty_list_when_all_providers_fail(self):
        """Test that get_ohlc returns empty list when all providers fail."""
        with patch(
            "app.services.prices.redis_json_get", new_callable=AsyncMock
        ) as mock_get:
            mock_get.return_value = None

            with patch(
                "app.services.prices.polygon.fetch_ohlc", new_callable=AsyncMock
            ) as mock_polygon:
                mock_polygon.side_effect = Exception("Polygon error")

                with patch(
                    "app.services.prices.finnhub.fetch_ohlc", new_callable=AsyncMock
                ) as mock_finnhub:
                    mock_finnhub.side_effect = Exception("Finnhub error")

                    with patch(
                        "app.services.prices.alphavantage.fetch_ohlc",
                        new_callable=AsyncMock,
                    ) as mock_av:
                        mock_av.side_effect = Exception("AlphaVantage error")

                        with patch(
                            "app.services.prices.redis_json_set", new_callable=AsyncMock
                        ):
                            result = await get_ohlc("AAPL", "1h", 100)

                            assert result == []


class TestCacheKeyFormat:
    """Tests for cache key formatting."""

    @pytest.mark.asyncio
    async def test_cache_key_includes_all_parameters(self):
        """Test that cache key includes symbol, timeframe, and limit."""
        with patch(
            "app.services.prices.redis_json_get", new_callable=AsyncMock
        ) as mock_get:
            mock_get.return_value = [{"cached": True}]

            await get_ohlc("BTC", "4h", 500)

            mock_get.assert_called_once_with("ohlc:BTC:4h:500")

    @pytest.mark.asyncio
    async def test_different_timeframes_use_different_keys(self):
        """Test that different timeframes result in different cache keys."""
        with patch(
            "app.services.prices.redis_json_get", new_callable=AsyncMock
        ) as mock_get:
            mock_get.return_value = [{"cached": True}]

            await get_ohlc("AAPL", "1h", 100)
            await get_ohlc("AAPL", "1d", 100)

            calls = mock_get.call_args_list
            assert calls[0][0][0] == "ohlc:AAPL:1h:100"
            assert calls[1][0][0] == "ohlc:AAPL:1d:100"


class TestSymbolRouting:
    """Tests for correct provider routing based on symbol type."""

    @pytest.mark.asyncio
    async def test_equity_symbols_use_equity_providers(self):
        """Test that equity symbols route to Polygon/Finnhub/AlphaVantage."""
        with patch(
            "app.services.prices.redis_json_get", new_callable=AsyncMock
        ) as mock_get:
            mock_get.return_value = None

            with patch(
                "app.services.prices.polygon.fetch_ohlc", new_callable=AsyncMock
            ) as mock_polygon:
                mock_polygon.return_value = [{"data": 1}]

                with patch(
                    "app.services.prices.redis_json_set", new_callable=AsyncMock
                ):
                    # These should all be classified as equity
                    for symbol in ["AAPL", "MSFT", "AA", "GOOGL", "BRK-B"]:
                        mock_polygon.reset_mock()
                        await get_ohlc(symbol, "1h", 100)
                        mock_polygon.assert_called_once()

    @pytest.mark.asyncio
    async def test_crypto_symbols_use_crypto_providers(self):
        """Test that crypto symbols route to CoinGecko/CMC."""
        with patch(
            "app.services.prices.redis_json_get", new_callable=AsyncMock
        ) as mock_get:
            mock_get.return_value = None

            with patch(
                "app.services.prices.coingecko.fetch_ohlc", new_callable=AsyncMock
            ) as mock_cg:
                mock_cg.return_value = [{"data": 1}]

                with patch(
                    "app.services.prices.redis_json_set", new_callable=AsyncMock
                ):
                    # These should be classified as crypto (not equity)
                    for symbol in ["BTCUSD", "ETH123", "BITCOIN", "ABCDEF"]:
                        mock_cg.reset_mock()
                        await get_ohlc(symbol, "1h", 100)
                        mock_cg.assert_called_once()


class TestEdgeCases:
    """Tests for edge cases and error conditions."""

    @pytest.mark.asyncio
    async def test_handles_special_characters_in_symbol(self):
        """Test that symbols with special characters are handled."""
        with patch(
            "app.services.prices.redis_json_get", new_callable=AsyncMock
        ) as mock_get:
            mock_get.return_value = [{"data": 1}]

            # Should not raise any errors
            result = await get_ohlc("BRK.A", "1h", 100)
            assert result == [{"data": 1}]

    @pytest.mark.asyncio
    async def test_handles_lowercase_symbols(self):
        """Test that lowercase symbols are handled."""
        with patch(
            "app.services.prices.redis_json_get", new_callable=AsyncMock
        ) as mock_get:
            mock_get.return_value = None

            with patch(
                "app.services.prices.polygon.fetch_ohlc", new_callable=AsyncMock
            ) as mock_polygon:
                mock_polygon.return_value = [{"data": 1}]

                with patch(
                    "app.services.prices.redis_json_set", new_callable=AsyncMock
                ):
                    # aapl is lowercase, 4 letters, alpha-only = equity
                    await get_ohlc("aapl", "1h", 100)
                    mock_polygon.assert_called_once()

    @pytest.mark.asyncio
    async def test_caches_empty_results(self):
        """Test that empty results are still cached to prevent repeated calls."""
        with patch(
            "app.services.prices.redis_json_get", new_callable=AsyncMock
        ) as mock_get:
            mock_get.return_value = None

            with patch(
                "app.services.prices.polygon.fetch_ohlc", new_callable=AsyncMock
            ) as mock_polygon:
                mock_polygon.return_value = []

                with patch(
                    "app.services.prices.finnhub.fetch_ohlc", new_callable=AsyncMock
                ) as mock_finnhub:
                    mock_finnhub.return_value = []

                    with patch(
                        "app.services.prices.alphavantage.fetch_ohlc",
                        new_callable=AsyncMock,
                    ) as mock_av:
                        mock_av.return_value = []

                        with patch(
                            "app.services.prices.redis_json_set", new_callable=AsyncMock
                        ) as mock_set:
                            result = await get_ohlc("AAPL", "1h", 100)

                            # Empty result should still be cached
                            mock_set.assert_called_once_with(
                                "ohlc:AAPL:1h:100", [], ttl=60
                            )
                            assert result == []
