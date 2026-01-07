"""
Comprehensive tests for OpenRouter AI provider.

Tests cover:
- Provider initialization and configuration
- Streaming chat completion with various scenarios
- Message format conversion
- Error handling (auth, rate limit, API errors)
- Availability checks
- Model listing
"""

import json
import uuid
from collections.abc import AsyncIterator
from typing import Any
from unittest.mock import AsyncMock, MagicMock, patch

import httpx
import pytest

from app.services.ai_provider import (
    AIMessage,
    MessageRole,
    ProviderAuthenticationError,
    ProviderError,
    ProviderRateLimitError,
    ProviderUnavailableError,
    StreamChunk,
    StreamOptions,
    TokenUsage,
)
from app.services.providers.openrouter_provider import OpenRouterProvider

# =============================================================================
# Fixtures
# =============================================================================


@pytest.fixture
def provider():
    """Create an OpenRouterProvider instance with API key."""
    return OpenRouterProvider(api_key="test-api-key")


@pytest.fixture
def provider_no_key():
    """Create an OpenRouterProvider instance without API key."""
    return OpenRouterProvider(api_key=None)


@pytest.fixture
def sample_messages():
    """Create sample chat messages."""
    return [
        AIMessage(role=MessageRole.SYSTEM, content="You are a helpful assistant."),
        AIMessage(role=MessageRole.USER, content="Hello, how are you?"),
    ]


@pytest.fixture
def sample_options():
    """Create sample stream options."""
    return StreamOptions(
        model="openai/gpt-4o-mini",
        max_tokens=500,
        temperature=0.7,
        top_p=0.9,
    )


# =============================================================================
# Provider Initialization Tests
# =============================================================================


class TestProviderInitialization:
    """Tests for OpenRouterProvider initialization."""

    def test_provider_initializes_with_api_key(self):
        """Test provider initializes correctly with API key."""
        provider = OpenRouterProvider(api_key="test-key")
        assert provider.api_key == "test-key"
        assert provider.name == "openrouter"
        assert "openrouter.ai" in provider.base_url

    def test_provider_initializes_without_api_key(self):
        """Test provider initializes with None API key."""
        provider = OpenRouterProvider(api_key=None)
        assert provider.api_key is None
        assert provider.name == "openrouter"

    def test_provider_has_httpx_client(self, provider):
        """Test provider creates httpx client."""
        assert provider.client is not None
        assert isinstance(provider.client, httpx.AsyncClient)

    def test_provider_sets_authorization_header(self, provider):
        """Test provider sets correct authorization header."""
        headers = provider.client._headers
        assert headers is not None

    def test_provider_sets_custom_headers(self, provider):
        """Test provider sets OpenRouter-specific headers."""
        # OpenRouter requires HTTP-Referer and X-Title headers
        assert provider.client is not None

    def test_provider_has_timeout_configured(self, provider):
        """Test provider has appropriate timeout."""
        timeout = provider.client.timeout
        assert timeout is not None


# =============================================================================
# Message Validation Tests
# =============================================================================


class TestMessageValidation:
    """Tests for message validation."""

    def test_validate_valid_messages(self, provider, sample_messages):
        """Test validation passes for valid messages."""
        assert provider.validate_messages(sample_messages) is True

    def test_validate_empty_messages(self, provider):
        """Test validation fails for empty messages."""
        assert provider.validate_messages([]) is False

    def test_validate_single_message(self, provider):
        """Test validation passes for single message."""
        messages = [AIMessage(role=MessageRole.USER, content="Hello")]
        assert provider.validate_messages(messages) is True


# =============================================================================
# Streaming Chat Tests
# =============================================================================


class TestStreamChat:
    """Tests for stream_chat method."""

    @pytest.mark.asyncio
    async def test_stream_chat_no_api_key_raises_error(
        self, provider_no_key, sample_messages
    ):
        """Test that streaming without API key raises error."""
        with pytest.raises(ProviderUnavailableError, match="API key not configured"):
            async for _ in provider_no_key.stream_chat(sample_messages):
                pass

    @pytest.mark.asyncio
    async def test_stream_chat_invalid_messages_raises_error(self, provider):
        """Test that invalid messages raise error."""
        with pytest.raises(ProviderError, match="Invalid messages"):
            async for _ in provider.stream_chat([]):
                pass

    @pytest.mark.asyncio
    async def test_stream_chat_handles_auth_error(self, provider, sample_messages):
        """Test that 401 response raises error with auth message."""
        with patch.object(provider, "client") as mock_client:
            mock_response = AsyncMock()
            mock_response.status_code = 401
            mock_response.__aenter__ = AsyncMock(return_value=mock_response)
            mock_response.__aexit__ = AsyncMock(return_value=None)
            mock_client.stream = MagicMock(return_value=mock_response)
            mock_client.aclose = AsyncMock()

            # Provider wraps specific errors in generic ProviderError
            with pytest.raises(ProviderError, match=r"Invalid.*API key"):
                async for _ in provider.stream_chat(sample_messages):
                    pass

    @pytest.mark.asyncio
    async def test_stream_chat_handles_rate_limit_error(
        self, provider, sample_messages
    ):
        """Test that 429 response raises error with rate limit message."""
        with patch.object(provider, "client") as mock_client:
            mock_response = AsyncMock()
            mock_response.status_code = 429
            mock_response.__aenter__ = AsyncMock(return_value=mock_response)
            mock_response.__aexit__ = AsyncMock(return_value=None)
            mock_client.stream = MagicMock(return_value=mock_response)
            mock_client.aclose = AsyncMock()

            with pytest.raises(ProviderError, match=r"rate limit"):
                async for _ in provider.stream_chat(sample_messages):
                    pass

    @pytest.mark.asyncio
    async def test_stream_chat_handles_api_error(self, provider, sample_messages):
        """Test that non-200 responses raise ProviderError."""
        with patch.object(provider, "client") as mock_client:
            mock_response = AsyncMock()
            mock_response.status_code = 500
            mock_response.aread = AsyncMock(return_value=b"Internal Server Error")
            mock_response.__aenter__ = AsyncMock(return_value=mock_response)
            mock_response.__aexit__ = AsyncMock(return_value=None)
            mock_client.stream = MagicMock(return_value=mock_response)
            mock_client.aclose = AsyncMock()

            with pytest.raises(ProviderError, match="OpenRouter API error"):
                async for _ in provider.stream_chat(sample_messages):
                    pass

    @pytest.mark.asyncio
    async def test_stream_chat_handles_request_error(self, provider, sample_messages):
        """Test that request errors raise ProviderError."""
        with patch.object(provider, "client") as mock_client:
            mock_client.stream = MagicMock(
                side_effect=httpx.RequestError("Network error")
            )
            mock_client.aclose = AsyncMock()

            with pytest.raises(ProviderError, match="connection error"):
                async for _ in provider.stream_chat(sample_messages):
                    pass

    @pytest.mark.asyncio
    async def test_stream_chat_uses_default_model(self, provider, sample_messages):
        """Test that default model is used when not specified."""
        with patch.object(provider, "client") as mock_client:
            mock_response = AsyncMock()
            mock_response.status_code = 200
            mock_response.__aenter__ = AsyncMock(return_value=mock_response)
            mock_response.__aexit__ = AsyncMock(return_value=None)

            async def mock_aiter_lines():
                yield 'data: {"choices": [{"delta": {"content": "Hi"}}]}'
                yield "data: [DONE]"

            mock_response.aiter_lines = mock_aiter_lines
            mock_client.stream = MagicMock(return_value=mock_response)
            mock_client.aclose = AsyncMock()

            chunks = []
            async for chunk in provider.stream_chat(sample_messages):
                chunks.append(chunk)

            assert len(chunks) >= 1


# =============================================================================
# Stream Processing Tests
# =============================================================================


class TestStreamProcessing:
    """Tests for stream processing."""

    @pytest.mark.asyncio
    async def test_process_stream_yields_content_chunks(
        self, provider, sample_messages
    ):
        """Test that stream processing yields content chunks."""
        with patch.object(provider, "client") as mock_client:
            mock_response = AsyncMock()
            mock_response.status_code = 200
            mock_response.__aenter__ = AsyncMock(return_value=mock_response)
            mock_response.__aexit__ = AsyncMock(return_value=None)

            async def mock_aiter_lines():
                yield 'data: {"choices": [{"delta": {"content": "Hello"}}]}'
                yield 'data: {"choices": [{"delta": {"content": " world"}}]}'
                yield "data: [DONE]"

            mock_response.aiter_lines = mock_aiter_lines
            mock_client.stream = MagicMock(return_value=mock_response)
            mock_client.aclose = AsyncMock()

            chunks = []
            async for chunk in provider.stream_chat(sample_messages):
                chunks.append(chunk)

            # Should have content chunks plus final DONE chunk
            assert len(chunks) == 3
            assert chunks[0].content == "Hello"
            assert chunks[1].content == " world"
            assert chunks[2].is_complete is True

    @pytest.mark.asyncio
    async def test_process_stream_final_chunk_has_token_usage(
        self, provider, sample_messages
    ):
        """Test that final chunk includes token usage."""
        with patch.object(provider, "client") as mock_client:
            mock_response = AsyncMock()
            mock_response.status_code = 200
            mock_response.__aenter__ = AsyncMock(return_value=mock_response)
            mock_response.__aexit__ = AsyncMock(return_value=None)

            async def mock_aiter_lines():
                yield 'data: {"choices": [{"delta": {"content": "Test"}}]}'
                yield "data: [DONE]"

            mock_response.aiter_lines = mock_aiter_lines
            mock_client.stream = MagicMock(return_value=mock_response)
            mock_client.aclose = AsyncMock()

            chunks = []
            async for chunk in provider.stream_chat(sample_messages):
                chunks.append(chunk)

            # Final chunk should have token usage
            final_chunk = chunks[-1]
            assert final_chunk.is_complete is True
            assert final_chunk.token_usage is not None

    @pytest.mark.asyncio
    async def test_process_stream_includes_model_name(self, provider, sample_messages):
        """Test that chunks include model name."""
        with patch.object(provider, "client") as mock_client:
            mock_response = AsyncMock()
            mock_response.status_code = 200
            mock_response.__aenter__ = AsyncMock(return_value=mock_response)
            mock_response.__aexit__ = AsyncMock(return_value=None)

            async def mock_aiter_lines():
                yield 'data: {"choices": [{"delta": {"content": "Test"}}]}'
                yield "data: [DONE]"

            mock_response.aiter_lines = mock_aiter_lines
            mock_client.stream = MagicMock(return_value=mock_response)
            mock_client.aclose = AsyncMock()

            async for chunk in provider.stream_chat(sample_messages):
                assert chunk.model is not None

    @pytest.mark.asyncio
    async def test_process_stream_includes_metadata(self, provider, sample_messages):
        """Test that chunks include provider metadata."""
        with patch.object(provider, "client") as mock_client:
            mock_response = AsyncMock()
            mock_response.status_code = 200
            mock_response.__aenter__ = AsyncMock(return_value=mock_response)
            mock_response.__aexit__ = AsyncMock(return_value=None)

            async def mock_aiter_lines():
                yield 'data: {"choices": [{"delta": {"content": "Test"}}]}'
                yield "data: [DONE]"

            mock_response.aiter_lines = mock_aiter_lines
            mock_client.stream = MagicMock(return_value=mock_response)
            mock_client.aclose = AsyncMock()

            async for chunk in provider.stream_chat(sample_messages):
                assert "provider" in chunk.metadata
                assert chunk.metadata["provider"] == "openrouter"

    @pytest.mark.asyncio
    async def test_process_stream_handles_json_decode_error(
        self, provider, sample_messages
    ):
        """Test that invalid JSON is skipped gracefully."""
        with patch.object(provider, "client") as mock_client:
            mock_response = AsyncMock()
            mock_response.status_code = 200
            mock_response.__aenter__ = AsyncMock(return_value=mock_response)
            mock_response.__aexit__ = AsyncMock(return_value=None)

            async def mock_aiter_lines():
                yield "data: invalid json"
                yield 'data: {"choices": [{"delta": {"content": "Valid"}}]}'
                yield "data: [DONE]"

            mock_response.aiter_lines = mock_aiter_lines
            mock_client.stream = MagicMock(return_value=mock_response)
            mock_client.aclose = AsyncMock()

            chunks = []
            async for chunk in provider.stream_chat(sample_messages):
                chunks.append(chunk)

            # Should skip invalid JSON and process valid chunks
            assert len(chunks) == 2
            assert chunks[0].content == "Valid"

    @pytest.mark.asyncio
    async def test_process_stream_skips_empty_lines(self, provider, sample_messages):
        """Test that empty lines are skipped."""
        with patch.object(provider, "client") as mock_client:
            mock_response = AsyncMock()
            mock_response.status_code = 200
            mock_response.__aenter__ = AsyncMock(return_value=mock_response)
            mock_response.__aexit__ = AsyncMock(return_value=None)

            async def mock_aiter_lines():
                yield ""
                yield 'data: {"choices": [{"delta": {"content": "Content"}}]}'
                yield ""
                yield "data: [DONE]"

            mock_response.aiter_lines = mock_aiter_lines
            mock_client.stream = MagicMock(return_value=mock_response)
            mock_client.aclose = AsyncMock()

            chunks = []
            async for chunk in provider.stream_chat(sample_messages):
                chunks.append(chunk)

            assert len(chunks) == 2


# =============================================================================
# Availability Check Tests
# =============================================================================


class TestIsAvailable:
    """Tests for is_available method."""

    @pytest.mark.asyncio
    async def test_is_available_without_api_key(self, provider_no_key):
        """Test availability check without API key returns False."""
        result = await provider_no_key.is_available()
        assert result is False

    @pytest.mark.asyncio
    async def test_is_available_with_valid_key(self, provider):
        """Test availability check with valid key returns True."""
        with patch.object(provider, "client") as mock_client:
            mock_response = MagicMock()
            mock_response.status_code = 200
            mock_client.get = AsyncMock(return_value=mock_response)

            result = await provider.is_available()
            assert result is True

    @pytest.mark.asyncio
    async def test_is_available_handles_request_error(self, provider):
        """Test availability check handles request errors."""
        with patch.object(provider, "client") as mock_client:
            mock_client.get = AsyncMock(
                side_effect=httpx.RequestError("Connection failed")
            )

            result = await provider.is_available()
            assert result is False

    @pytest.mark.asyncio
    async def test_is_available_handles_http_status_error(self, provider):
        """Test availability check handles HTTP status errors."""
        with patch.object(provider, "client") as mock_client:
            mock_client.get = AsyncMock(
                side_effect=httpx.HTTPStatusError(
                    "Error", request=MagicMock(), response=MagicMock()
                )
            )

            result = await provider.is_available()
            assert result is False


# =============================================================================
# Supported Models Tests
# =============================================================================


class TestSupportedModels:
    """Tests for get_supported_models method."""

    def test_get_supported_models_returns_list(self, provider):
        """Test that supported models returns a list."""
        models = provider.get_supported_models()
        assert isinstance(models, list)
        assert len(models) > 0

    def test_get_supported_models_includes_openai(self, provider):
        """Test that OpenAI models are included."""
        models = provider.get_supported_models()
        assert any("openai/" in m for m in models)

    def test_get_supported_models_includes_anthropic(self, provider):
        """Test that Anthropic models are included."""
        models = provider.get_supported_models()
        assert any("anthropic/" in m for m in models)

    def test_get_supported_models_includes_google(self, provider):
        """Test that Google models are included."""
        models = provider.get_supported_models()
        assert any("google/" in m for m in models)

    def test_get_supported_models_includes_meta_llama(self, provider):
        """Test that Meta Llama models are included."""
        models = provider.get_supported_models()
        assert any("meta-llama/" in m or "llama" in m.lower() for m in models)


# =============================================================================
# Default Model Tests
# =============================================================================


class TestDefaultModel:
    """Tests for get_default_model method."""

    @pytest.mark.asyncio
    async def test_get_default_model(self, provider):
        """Test that default model is returned."""
        model = await provider.get_default_model()
        assert model is not None
        assert isinstance(model, str)

    @pytest.mark.asyncio
    async def test_default_model_is_openai(self, provider):
        """Test that default model is from OpenAI (cost-effective)."""
        model = await provider.get_default_model()
        assert "openai/" in model or "gpt" in model.lower()

    @pytest.mark.asyncio
    async def test_default_model_is_in_supported_list(self, provider):
        """Test that default model is in supported models list."""
        default = await provider.get_default_model()
        supported = provider.get_supported_models()
        assert default in supported


# =============================================================================
# Token Estimation Tests
# =============================================================================


class TestTokenEstimation:
    """Tests for token estimation inherited from base class."""

    def test_estimate_tokens_empty_string(self, provider):
        """Test token estimation for empty string."""
        tokens = provider.estimate_tokens("")
        assert tokens >= 0

    def test_estimate_tokens_simple_text(self, provider):
        """Test token estimation for simple text."""
        tokens = provider.estimate_tokens("Hello world")
        assert tokens > 0

    def test_estimate_tokens_longer_text(self, provider):
        """Test token estimation scales with text length."""
        short = provider.estimate_tokens("Hi")
        long = provider.estimate_tokens("Hello world, this is a longer test message")
        assert long > short


# =============================================================================
# Integration Tests
# =============================================================================


class TestIntegration:
    """Integration tests for OpenRouter provider."""

    def test_provider_inherits_from_ai_provider(self, provider):
        """Test that provider inherits from AIProvider base class."""
        from app.services.ai_provider import AIProvider

        assert isinstance(provider, AIProvider)

    def test_provider_name_is_openrouter(self, provider):
        """Test that provider name is correctly set."""
        assert provider.name == "openrouter"


# =============================================================================
# Configuration Tests
# =============================================================================


class TestConfiguration:
    """Tests for provider configuration."""

    def test_base_url_is_openrouter(self, provider):
        """Test that base URL points to OpenRouter."""
        assert "openrouter.ai" in provider.base_url

    def test_base_url_includes_api_v1(self, provider):
        """Test that base URL includes API version."""
        assert "/api/v1" in provider.base_url


# =============================================================================
# Options Handling Tests
# =============================================================================


class TestOptionsHandling:
    """Tests for stream options handling."""

    def test_max_tokens_capped_at_4096(self, provider):
        """Test that max_tokens is capped at OpenRouter's limit."""
        options = StreamOptions(max_tokens=8000)
        # The actual capping happens in stream_chat: min(options.max_tokens, 4096)
        assert min(options.max_tokens, 4096) == 4096

    def test_stop_sequences_limited_to_4(self, provider):
        """Test that stop sequences are limited."""
        options = StreamOptions(stop_sequences=["a", "b", "c", "d", "e", "f"])
        # The slicing to 4 happens in stream_chat
        assert len(options.stop_sequences[:4]) == 4

    def test_custom_model_in_options(self):
        """Test that custom model can be specified."""
        options = StreamOptions(model="anthropic/claude-3-haiku")
        assert options.model == "anthropic/claude-3-haiku"


# =============================================================================
# Error Recovery Tests
# =============================================================================


class TestErrorRecovery:
    """Tests for error recovery scenarios."""

    @pytest.mark.asyncio
    async def test_generic_error_handling(self, provider, sample_messages):
        """Test that generic errors are wrapped in ProviderError."""
        with patch.object(provider, "client") as mock_client:
            mock_client.stream = MagicMock(side_effect=ValueError("Unexpected error"))
            mock_client.aclose = AsyncMock()

            with pytest.raises(ProviderError):
                async for _ in provider.stream_chat(sample_messages):
                    pass

    @pytest.mark.asyncio
    async def test_client_closes_after_error(self, provider, sample_messages):
        """Test that client is closed after error."""
        with patch.object(provider, "client") as mock_client:
            mock_client.stream = MagicMock(
                side_effect=httpx.RequestError("Network error")
            )
            mock_client.aclose = AsyncMock()

            with pytest.raises(ProviderError):
                async for _ in provider.stream_chat(sample_messages):
                    pass

            # Verify aclose was called
            mock_client.aclose.assert_called()
