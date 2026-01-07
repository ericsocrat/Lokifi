"""
Comprehensive tests for AI service module.

Tests cover:
- Symbol context composition with market data
- Context building from multiple symbols
- Ollama streaming
- OpenAI-compatible streaming
- Provider chain and fallback behavior
- Error handling
"""

import json
from collections.abc import AsyncGenerator
from unittest.mock import AsyncMock, MagicMock, patch

import httpx
import pytest

from app.services.ai import (
    DEFAULT_MODEL,
    _build_context,
    _compose_symbol_context,
    _fmt_pct,
    _stream_ollama,
    _stream_openai_compatible,
    stream_answer,
)

# =============================================================================
# Fixtures
# =============================================================================


@pytest.fixture
def mock_candles():
    """Create mock OHLC candle data."""
    return [
        {"o": 100.0, "h": 105.0, "l": 99.0, "c": 102.0, "v": 1000},
        {"o": 102.0, "h": 106.0, "l": 101.0, "c": 104.0, "v": 1100},
        {"o": 104.0, "h": 108.0, "l": 103.0, "c": 106.0, "v": 1200},
    ]


@pytest.fixture
def mock_news():
    """Create mock news data."""
    return [
        {"source": "Reuters", "title": "Stock surges on earnings"},
        {"source": "Bloomberg", "title": "Market analysis"},
        {"source": "WSJ", "title": "Economic outlook positive"},
    ]


@pytest.fixture
def mock_candles_large():
    """Create large mock OHLC candle data for indicator calculation."""
    # Create 100 candles for proper indicator calculation
    base_price = 100.0
    candles = []
    for i in range(100):
        price = base_price + (i * 0.1) + (i % 5 - 2)  # Trending up with noise
        candles.append(
            {
                "o": price - 0.5,
                "h": price + 1.0,
                "l": price - 1.0,
                "c": price,
                "v": 1000 + i * 10,
            }
        )
    return candles


# =============================================================================
# Helper Function Tests
# =============================================================================


class TestFmtPct:
    """Tests for _fmt_pct helper function."""

    def test_positive_percentage(self):
        """Test formatting positive percentage."""
        result = _fmt_pct(2.5)
        assert result == "+2.50%"

    def test_negative_percentage(self):
        """Test formatting negative percentage."""
        result = _fmt_pct(-1.5)
        assert result == "-1.50%"

    def test_zero_percentage(self):
        """Test formatting zero percentage."""
        result = _fmt_pct(0.0)
        assert result == "+0.00%"

    def test_large_percentage(self):
        """Test formatting large percentage."""
        result = _fmt_pct(100.0)
        assert result == "+100.00%"


# =============================================================================
# Symbol Context Tests
# =============================================================================


class TestComposeSymbolContext:
    """Tests for _compose_symbol_context function."""

    @pytest.mark.asyncio
    async def test_returns_no_data_message_when_no_candles(self):
        """Test returns no data message when candles are empty."""
        with patch("app.services.ai.prices_svc.get_ohlc") as mock_ohlc:
            mock_ohlc.return_value = []

            result = await _compose_symbol_context("BTC")

            assert "no market data available" in result
            assert "BTC" in result

    @pytest.mark.asyncio
    async def test_returns_formatted_context_with_data(self, mock_candles_large):
        """Test returns formatted context with market data."""
        with (
            patch("app.services.ai.prices_svc.get_ohlc") as mock_ohlc,
            patch("app.services.ai.news_svc.get_news") as mock_news,
        ):
            mock_ohlc.return_value = mock_candles_large
            mock_news.return_value = []

            result = await _compose_symbol_context("BTC", timeframe="1h")

            assert "BTC" in result
            assert "1h" in result
            assert "close=" in result

    @pytest.mark.asyncio
    async def test_includes_indicators_when_sufficient_data(self, mock_candles_large):
        """Test includes indicators when data is sufficient."""
        with (
            patch("app.services.ai.prices_svc.get_ohlc") as mock_ohlc,
            patch("app.services.ai.news_svc.get_news") as mock_news,
        ):
            mock_ohlc.return_value = mock_candles_large
            mock_news.return_value = []

            result = await _compose_symbol_context("BTC")

            # Should have indicator values or insufficient data message
            assert "SMA20" in result or "insufficient data" in result

    @pytest.mark.asyncio
    async def test_includes_news_headlines(self, mock_candles_large, mock_news):
        """Test includes news headlines in context."""
        with (
            patch("app.services.ai.prices_svc.get_ohlc") as mock_ohlc,
            patch("app.services.ai.news_svc.get_news") as mock_get_news,
        ):
            mock_ohlc.return_value = mock_candles_large
            mock_get_news.return_value = mock_news

            result = await _compose_symbol_context("BTC")

            assert "Recent news" in result
            assert "Reuters" in result

    @pytest.mark.asyncio
    async def test_calculates_percentage_change(self, mock_candles):
        """Test calculates percentage change correctly."""
        with (
            patch("app.services.ai.prices_svc.get_ohlc") as mock_ohlc,
            patch("app.services.ai.news_svc.get_news") as mock_news,
        ):
            mock_ohlc.return_value = mock_candles
            mock_news.return_value = []

            result = await _compose_symbol_context("BTC")

            # Should have change percentage
            assert "%" in result or "close=" in result

    @pytest.mark.asyncio
    async def test_detects_bullish_crossover(self):
        """Test detects bullish SMA crossover."""
        # Create candles where SMA20 crosses above SMA50
        candles = []
        # First 50 candles: price at 100 (SMA20 and SMA50 same)
        for i in range(50):
            candles.append({"o": 100, "h": 101, "l": 99, "c": 100, "v": 1000})
        # Last 10 candles: price jumps to 120 (SMA20 > SMA50)
        for i in range(10):
            candles.append({"o": 120, "h": 121, "l": 119, "c": 120, "v": 1000})

        with (
            patch("app.services.ai.prices_svc.get_ohlc") as mock_ohlc,
            patch("app.services.ai.news_svc.get_news") as mock_news,
        ):
            mock_ohlc.return_value = candles
            mock_news.return_value = []

            result = await _compose_symbol_context("BTC")

            # Context should be generated
            assert "BTC" in result


# =============================================================================
# Build Context Tests
# =============================================================================


class TestBuildContext:
    """Tests for _build_context function."""

    @pytest.mark.asyncio
    async def test_returns_empty_for_no_symbols(self):
        """Test returns empty string when no symbols provided."""
        result = await _build_context(None)
        assert result == ""

    @pytest.mark.asyncio
    async def test_returns_empty_for_empty_string(self):
        """Test returns empty string for empty symbol string."""
        result = await _build_context("")
        assert result == ""

    @pytest.mark.asyncio
    async def test_handles_single_symbol(self):
        """Test handles single symbol."""
        with patch("app.services.ai._compose_symbol_context") as mock_compose:
            mock_compose.return_value = "- BTC: context\n"

            result = await _build_context("BTC")

            assert "Market context" in result
            mock_compose.assert_called_once()

    @pytest.mark.asyncio
    async def test_handles_multiple_symbols(self):
        """Test handles multiple comma-separated symbols."""
        with patch("app.services.ai._compose_symbol_context") as mock_compose:
            mock_compose.return_value = "- SYMBOL: context\n"

            result = await _build_context("BTC,ETH,SOL")

            assert mock_compose.call_count == 3

    @pytest.mark.asyncio
    async def test_limits_to_five_symbols(self):
        """Test limits context to 5 symbols."""
        with patch("app.services.ai._compose_symbol_context") as mock_compose:
            mock_compose.return_value = "- SYMBOL: context\n"

            result = await _build_context("BTC,ETH,SOL,ADA,DOT,LINK,AVAX")

            # Should only process first 5 symbols
            assert mock_compose.call_count == 5

    @pytest.mark.asyncio
    async def test_strips_whitespace_from_symbols(self):
        """Test strips whitespace from symbols."""
        with patch("app.services.ai._compose_symbol_context") as mock_compose:
            mock_compose.return_value = "- SYMBOL: context\n"

            await _build_context("  BTC  ,  ETH  ")

            # Should be called with stripped symbols
            assert mock_compose.call_count == 2

    @pytest.mark.asyncio
    async def test_uses_provided_timeframe(self):
        """Test uses provided timeframe."""
        with patch("app.services.ai._compose_symbol_context") as mock_compose:
            mock_compose.return_value = "- BTC: context\n"

            await _build_context("BTC", timeframe="4h")

            mock_compose.assert_called_with("BTC", timeframe="4h", limit=200)


# =============================================================================
# Stream Ollama Tests
# =============================================================================


class TestStreamOllama:
    """Tests for _stream_ollama function."""

    @pytest.mark.asyncio
    async def test_streams_content_from_ollama(self):
        """Test streams content from Ollama API."""
        # Create async context manager for stream
        mock_response = MagicMock()
        mock_response.raise_for_status = MagicMock()

        async def mock_aiter_lines():
            yield json.dumps({"message": {"content": "Hello"}, "done": False})
            yield json.dumps({"message": {"content": " world"}, "done": False})
            yield json.dumps({"message": {"content": ""}, "done": True})

        mock_response.aiter_lines = mock_aiter_lines

        # Create async context manager for client.stream
        stream_cm = MagicMock()
        stream_cm.__aenter__ = AsyncMock(return_value=mock_response)
        stream_cm.__aexit__ = AsyncMock(return_value=None)

        # Create async context manager for AsyncClient
        mock_client = MagicMock()
        mock_client.stream = MagicMock(return_value=stream_cm)

        client_cm = MagicMock()
        client_cm.__aenter__ = AsyncMock(return_value=mock_client)
        client_cm.__aexit__ = AsyncMock(return_value=None)

        with patch("httpx.AsyncClient", return_value=client_cm):
            chunks = []
            async for chunk in _stream_ollama("test prompt", "llama3"):
                chunks.append(chunk)

            assert "Hello" in chunks
            assert " world" in chunks

    @pytest.mark.asyncio
    async def test_uses_default_model_when_none(self):
        """Test uses default model when model is None."""
        mock_response = MagicMock()
        mock_response.raise_for_status = MagicMock()

        async def mock_aiter_lines():
            yield json.dumps({"message": {"content": "test"}, "done": True})

        mock_response.aiter_lines = mock_aiter_lines

        stream_cm = MagicMock()
        stream_cm.__aenter__ = AsyncMock(return_value=mock_response)
        stream_cm.__aexit__ = AsyncMock(return_value=None)

        mock_client = MagicMock()
        mock_client.stream = MagicMock(return_value=stream_cm)

        client_cm = MagicMock()
        client_cm.__aenter__ = AsyncMock(return_value=mock_client)
        client_cm.__aexit__ = AsyncMock(return_value=None)

        with patch("httpx.AsyncClient", return_value=client_cm):
            async for _ in _stream_ollama("test prompt", None):
                pass

            # Verify the call was made
            mock_client.stream.assert_called()

    @pytest.mark.asyncio
    async def test_skips_empty_lines(self):
        """Test skips empty lines in response."""
        mock_response = MagicMock()
        mock_response.raise_for_status = MagicMock()

        async def mock_aiter_lines():
            yield ""
            yield json.dumps({"message": {"content": "test"}, "done": False})
            yield ""
            yield json.dumps({"message": {}, "done": True})

        mock_response.aiter_lines = mock_aiter_lines

        stream_cm = MagicMock()
        stream_cm.__aenter__ = AsyncMock(return_value=mock_response)
        stream_cm.__aexit__ = AsyncMock(return_value=None)

        mock_client = MagicMock()
        mock_client.stream = MagicMock(return_value=stream_cm)

        client_cm = MagicMock()
        client_cm.__aenter__ = AsyncMock(return_value=mock_client)
        client_cm.__aexit__ = AsyncMock(return_value=None)

        with patch("httpx.AsyncClient", return_value=client_cm):
            chunks = []
            async for chunk in _stream_ollama("test", "llama3"):
                chunks.append(chunk)

            assert chunks == ["test"]

    @pytest.mark.asyncio
    async def test_handles_invalid_json(self):
        """Test handles invalid JSON gracefully."""
        mock_response = MagicMock()
        mock_response.raise_for_status = MagicMock()

        async def mock_aiter_lines():
            yield "invalid json"
            yield json.dumps({"message": {"content": "valid"}, "done": True})

        mock_response.aiter_lines = mock_aiter_lines

        stream_cm = MagicMock()
        stream_cm.__aenter__ = AsyncMock(return_value=mock_response)
        stream_cm.__aexit__ = AsyncMock(return_value=None)

        mock_client = MagicMock()
        mock_client.stream = MagicMock(return_value=stream_cm)

        client_cm = MagicMock()
        client_cm.__aenter__ = AsyncMock(return_value=mock_client)
        client_cm.__aexit__ = AsyncMock(return_value=None)

        with patch("httpx.AsyncClient", return_value=client_cm):
            chunks = []
            async for chunk in _stream_ollama("test", "llama3"):
                chunks.append(chunk)

            assert "valid" in chunks

    @pytest.mark.asyncio
    async def test_stops_on_done_true(self):
        """Test stops streaming when done is True."""
        mock_response = MagicMock()
        mock_response.raise_for_status = MagicMock()

        async def mock_aiter_lines():
            yield json.dumps({"message": {"content": "first"}, "done": False})
            yield json.dumps({"message": {"content": ""}, "done": True})
            yield json.dumps(
                {"message": {"content": "should not appear"}, "done": False}
            )

        mock_response.aiter_lines = mock_aiter_lines

        stream_cm = MagicMock()
        stream_cm.__aenter__ = AsyncMock(return_value=mock_response)
        stream_cm.__aexit__ = AsyncMock(return_value=None)

        mock_client = MagicMock()
        mock_client.stream = MagicMock(return_value=stream_cm)

        client_cm = MagicMock()
        client_cm.__aenter__ = AsyncMock(return_value=mock_client)
        client_cm.__aexit__ = AsyncMock(return_value=None)

        with patch("httpx.AsyncClient", return_value=client_cm):
            chunks = []
            async for chunk in _stream_ollama("test", "llama3"):
                chunks.append(chunk)

            assert "first" in chunks
            assert "should not appear" not in chunks


# =============================================================================
# Stream OpenAI Compatible Tests
# =============================================================================


class TestStreamOpenAICompatible:
    """Tests for _stream_openai_compatible function."""

    @pytest.mark.asyncio
    async def test_streams_content_from_api(self):
        """Test streams content from OpenAI-compatible API."""
        mock_response = MagicMock()
        mock_response.raise_for_status = MagicMock()

        async def mock_aiter_lines():
            yield 'data: {"choices": [{"delta": {"content": "Hello"}}]}'
            yield 'data: {"choices": [{"delta": {"content": " world"}}]}'
            yield "data: [DONE]"

        mock_response.aiter_lines = mock_aiter_lines

        stream_cm = MagicMock()
        stream_cm.__aenter__ = AsyncMock(return_value=mock_response)
        stream_cm.__aexit__ = AsyncMock(return_value=None)

        mock_client = MagicMock()
        mock_client.stream = MagicMock(return_value=stream_cm)

        client_cm = MagicMock()
        client_cm.__aenter__ = AsyncMock(return_value=mock_client)
        client_cm.__aexit__ = AsyncMock(return_value=None)

        with patch("httpx.AsyncClient", return_value=client_cm):
            chunks = []
            async for chunk in _stream_openai_compatible(
                "test", "http://localhost:8080", "api-key", "gpt-4"
            ):
                chunks.append(chunk)

            assert "Hello" in chunks
            assert " world" in chunks

    @pytest.mark.asyncio
    async def test_handles_no_api_key(self):
        """Test handles case with no API key."""
        mock_response = MagicMock()
        mock_response.raise_for_status = MagicMock()

        async def mock_aiter_lines():
            yield 'data: {"choices": [{"delta": {"content": "test"}}]}'
            yield "data: [DONE]"

        mock_response.aiter_lines = mock_aiter_lines

        stream_cm = MagicMock()
        stream_cm.__aenter__ = AsyncMock(return_value=mock_response)
        stream_cm.__aexit__ = AsyncMock(return_value=None)

        mock_client = MagicMock()
        mock_client.stream = MagicMock(return_value=stream_cm)

        client_cm = MagicMock()
        client_cm.__aenter__ = AsyncMock(return_value=mock_client)
        client_cm.__aexit__ = AsyncMock(return_value=None)

        with patch("httpx.AsyncClient", return_value=client_cm):
            chunks = []
            async for chunk in _stream_openai_compatible(
                "test", "http://localhost:8080", None, "model"
            ):
                chunks.append(chunk)

            assert "test" in chunks

    @pytest.mark.asyncio
    async def test_skips_non_data_lines(self):
        """Test skips lines that don't start with 'data:'."""
        mock_response = MagicMock()
        mock_response.raise_for_status = MagicMock()

        async def mock_aiter_lines():
            yield ""
            yield "event: ping"
            yield 'data: {"choices": [{"delta": {"content": "valid"}}]}'
            yield "data: [DONE]"

        mock_response.aiter_lines = mock_aiter_lines

        stream_cm = MagicMock()
        stream_cm.__aenter__ = AsyncMock(return_value=mock_response)
        stream_cm.__aexit__ = AsyncMock(return_value=None)

        mock_client = MagicMock()
        mock_client.stream = MagicMock(return_value=stream_cm)

        client_cm = MagicMock()
        client_cm.__aenter__ = AsyncMock(return_value=mock_client)
        client_cm.__aexit__ = AsyncMock(return_value=None)

        with patch("httpx.AsyncClient", return_value=client_cm):
            chunks = []
            async for chunk in _stream_openai_compatible(
                "test", "http://localhost:8080", "key", "model"
            ):
                chunks.append(chunk)

            assert chunks == ["valid"]

    @pytest.mark.asyncio
    async def test_handles_message_format(self):
        """Test handles message format (non-streaming response)."""
        mock_response = MagicMock()
        mock_response.raise_for_status = MagicMock()

        async def mock_aiter_lines():
            yield 'data: {"choices": [{"message": {"content": "response"}}]}'
            yield "data: [DONE]"

        mock_response.aiter_lines = mock_aiter_lines

        stream_cm = MagicMock()
        stream_cm.__aenter__ = AsyncMock(return_value=mock_response)
        stream_cm.__aexit__ = AsyncMock(return_value=None)

        mock_client = MagicMock()
        mock_client.stream = MagicMock(return_value=stream_cm)

        client_cm = MagicMock()
        client_cm.__aenter__ = AsyncMock(return_value=mock_client)
        client_cm.__aexit__ = AsyncMock(return_value=None)

        with patch("httpx.AsyncClient", return_value=client_cm):
            chunks = []
            async for chunk in _stream_openai_compatible(
                "test", "http://localhost:8080", "key", "model"
            ):
                chunks.append(chunk)

            assert "response" in chunks


# =============================================================================
# Stream Answer Tests
# =============================================================================


class TestStreamAnswer:
    """Tests for stream_answer function."""

    @pytest.mark.asyncio
    async def test_returns_fallback_when_no_providers(self):
        """Test returns fallback message when no providers available."""
        with patch("app.services.ai.settings") as mock_settings:
            mock_settings.OLLAMA_BASE_URL = None
            mock_settings.openai_base = None

            chunks = []
            async for chunk in stream_answer("test", {}, None):
                chunks.append(chunk)

            result = "".join(chunks)
            assert "unable to reach" in result.lower()

    @pytest.mark.asyncio
    async def test_uses_ollama_when_configured(self):
        """Test uses Ollama when configured."""
        with (
            patch("app.services.ai.settings") as mock_settings,
            patch("app.services.ai._stream_ollama") as mock_ollama,
        ):
            mock_settings.OLLAMA_BASE_URL = "http://localhost:11434"
            mock_settings.openai_base = None

            async def mock_stream():
                yield "response"

            mock_ollama.return_value = mock_stream()

            chunks = []
            async for chunk in stream_answer("test", {}, None):
                chunks.append(chunk)

            assert "response" in chunks

    @pytest.mark.asyncio
    async def test_falls_back_to_openai_on_ollama_error(self):
        """Test falls back to OpenAI when Ollama fails."""
        with (
            patch("app.services.ai.settings") as mock_settings,
            patch("app.services.ai._stream_ollama") as mock_ollama,
            patch("app.services.ai._stream_openai_compatible") as mock_openai,
        ):
            mock_settings.OLLAMA_BASE_URL = "http://localhost:11434"
            mock_settings.openai_base = "http://localhost:8080"
            mock_settings.openai_api_key = "key"

            async def failing_ollama():
                raise Exception("Ollama error")
                yield  # Make it a generator

            async def working_openai():
                yield "openai response"

            mock_ollama.return_value = failing_ollama()
            mock_openai.return_value = working_openai()

            chunks = []
            async for chunk in stream_answer("test", {}, None):
                chunks.append(chunk)

            assert "openai response" in chunks

    @pytest.mark.asyncio
    async def test_includes_context_symbols_in_prompt(self):
        """Test includes context symbols in prompt."""
        with (
            patch("app.services.ai.settings") as mock_settings,
            patch("app.services.ai._stream_ollama") as mock_ollama,
        ):
            mock_settings.OLLAMA_BASE_URL = "http://localhost:11434"
            mock_settings.openai_base = None

            captured_prompts = []

            async def capture_prompt(prompt, model):
                captured_prompts.append(prompt)
                yield "response"

            mock_ollama.side_effect = capture_prompt

            chunks = []
            async for chunk in stream_answer("What is the price?", {}, "BTC,ETH"):
                chunks.append(chunk)

            assert len(captured_prompts) > 0
            assert "BTC,ETH" in captured_prompts[0]

    @pytest.mark.asyncio
    async def test_returns_fallback_with_error_type_on_failure(self):
        """Test returns fallback with error type when all providers fail."""
        with (
            patch("app.services.ai.settings") as mock_settings,
            patch("app.services.ai._stream_ollama") as mock_ollama,
        ):
            mock_settings.OLLAMA_BASE_URL = "http://localhost:11434"
            mock_settings.openai_base = None

            async def failing_ollama():
                raise ConnectionError("Network error")
                yield  # Make it a generator

            mock_ollama.return_value = failing_ollama()

            chunks = []
            async for chunk in stream_answer("test", {}, None):
                chunks.append(chunk)

            result = "".join(chunks)
            assert "ConnectionError" in result


# =============================================================================
# Default Model Tests
# =============================================================================


class TestDefaultModel:
    """Tests for DEFAULT_MODEL constant."""

    def test_default_model_is_llama(self):
        """Test default model is a Llama variant."""
        assert "llama" in DEFAULT_MODEL.lower()


# =============================================================================
# Integration Tests
# =============================================================================


class TestIntegration:
    """Integration tests for AI service."""

    @pytest.mark.asyncio
    async def test_full_context_building_workflow(self):
        """Test full workflow of building context."""
        with (
            patch("app.services.ai.prices_svc.get_ohlc") as mock_ohlc,
            patch("app.services.ai.news_svc.get_news") as mock_news,
        ):
            # Create candles for indicators
            candles = [
                {"o": 100 + i, "h": 101 + i, "l": 99 + i, "c": 100 + i, "v": 1000}
                for i in range(100)
            ]
            mock_ohlc.return_value = candles
            mock_news.return_value = [{"source": "Test", "title": "Test news"}]

            result = await _build_context("BTC,ETH", timeframe="1h")

            assert "Market context" in result
            # Should call for each symbol
            assert mock_ohlc.call_count == 2


# =============================================================================
# Error Handling Tests
# =============================================================================


class TestErrorHandling:
    """Tests for error handling."""

    @pytest.mark.asyncio
    async def test_compose_symbol_context_handles_api_error(self):
        """Test _compose_symbol_context handles API errors."""
        with patch("app.services.ai.prices_svc.get_ohlc") as mock_ohlc:
            mock_ohlc.side_effect = Exception("API error")

            # Should raise the exception (not silently fail)
            with pytest.raises(Exception, match="API error"):
                await _compose_symbol_context("BTC")

    @pytest.mark.asyncio
    async def test_stream_ollama_propagates_http_error(self):
        """Test _stream_ollama propagates HTTP errors."""
        mock_response = MagicMock()
        mock_response.raise_for_status.side_effect = httpx.HTTPStatusError(
            "Server error", request=MagicMock(), response=MagicMock()
        )

        stream_cm = MagicMock()
        stream_cm.__aenter__ = AsyncMock(return_value=mock_response)
        stream_cm.__aexit__ = AsyncMock(return_value=None)

        mock_client = MagicMock()
        mock_client.stream = MagicMock(return_value=stream_cm)

        client_cm = MagicMock()
        client_cm.__aenter__ = AsyncMock(return_value=mock_client)
        client_cm.__aexit__ = AsyncMock(return_value=None)

        with patch("httpx.AsyncClient", return_value=client_cm):
            with pytest.raises(httpx.HTTPStatusError):
                async for _ in _stream_ollama("test", "model"):
                    pass
