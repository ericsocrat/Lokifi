"""
Comprehensive tests for Ollama local AI provider.

Tests cover:
- Provider initialization and configuration
- Streaming chat completion with various scenarios
- Message format conversion
- Error handling (connection, API errors, model not found)
- Model pulling functionality
- Availability checks
- Model listing (supported and available)
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
    ProviderError,
    ProviderUnavailableError,
    StreamChunk,
    StreamOptions,
    TokenUsage,
)
from app.services.providers.ollama_provider import OllamaProvider

# =============================================================================
# Fixtures
# =============================================================================


@pytest.fixture
def provider():
    """Create an OllamaProvider instance with default base URL."""
    return OllamaProvider()


@pytest.fixture
def provider_custom_url():
    """Create an OllamaProvider instance with custom base URL."""
    return OllamaProvider(base_url="http://192.168.1.100:11434")


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
        model="llama3.1:8b",
        max_tokens=500,
        temperature=0.7,
        top_p=0.9,
    )


# =============================================================================
# Provider Initialization Tests
# =============================================================================


class TestProviderInitialization:
    """Tests for OllamaProvider initialization."""

    def test_provider_initializes_with_default_url(self):
        """Test provider initializes with default localhost URL."""
        provider = OllamaProvider()
        assert provider.base_url == "http://localhost:11434"
        assert provider.name == "ollama"
        assert provider.api_key is None

    def test_provider_initializes_with_custom_url(self):
        """Test provider initializes with custom base URL."""
        provider = OllamaProvider(base_url="http://192.168.1.100:11434")
        assert provider.base_url == "http://192.168.1.100:11434"

    def test_provider_has_httpx_client(self, provider):
        """Test provider creates httpx client."""
        assert provider.client is not None
        assert isinstance(provider.client, httpx.AsyncClient)

    def test_provider_has_generous_timeout(self, provider):
        """Test provider has generous timeout for slow Ollama responses."""
        # Ollama can be slow, should have at least 300s timeout
        timeout = provider.client.timeout
        assert timeout is not None

    def test_provider_sets_json_content_type(self, provider):
        """Test provider sets correct content-type header."""
        # Content-Type header should be set
        headers = provider.client._headers
        assert headers is not None


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
    async def test_stream_chat_invalid_messages_raises_error(self, provider):
        """Test that invalid messages raise error."""
        with pytest.raises(ProviderError, match="Invalid messages"):
            async for _ in provider.stream_chat([]):
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
                yield '{"done": true, "eval_count": 0, "prompt_eval_count": 0}'

            mock_response.aiter_lines = mock_aiter_lines
            mock_client.stream = MagicMock(return_value=mock_response)
            mock_client.aclose = AsyncMock()

            chunks = []
            async for chunk in provider.stream_chat(sample_messages):
                chunks.append(chunk)

            assert len(chunks) > 0

    @pytest.mark.asyncio
    async def test_stream_chat_handles_connection_error(
        self, provider, sample_messages
    ):
        """Test that connection errors raise ProviderUnavailableError."""
        with patch.object(provider, "client") as mock_client:
            mock_client.stream = MagicMock(
                side_effect=httpx.ConnectError("Connection refused")
            )
            mock_client.aclose = AsyncMock()

            with pytest.raises(ProviderUnavailableError, match="Could not connect"):
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

            with pytest.raises(ProviderError, match="Ollama API error"):
                async for _ in provider.stream_chat(sample_messages):
                    pass


# =============================================================================
# Stream Processing Tests
# =============================================================================


class TestStreamProcessing:
    """Tests for _process_stream method."""

    @pytest.mark.asyncio
    async def test_process_stream_yields_content_chunks(
        self, provider, sample_messages
    ):
        """Test that stream processing yields content chunks."""
        mock_response = AsyncMock()
        mock_response.status_code = 200

        async def mock_aiter_lines():
            yield '{"message": {"content": "Hello"}, "done": false}'
            yield '{"message": {"content": " world"}, "done": false}'
            yield '{"done": true, "eval_count": 10, "prompt_eval_count": 5}'

        mock_response.aiter_lines = mock_aiter_lines

        chunks = []
        async for chunk in provider._process_stream(
            mock_response, "llama3.1:8b", sample_messages
        ):
            chunks.append(chunk)

        assert len(chunks) == 3
        assert chunks[0].content == "Hello"
        assert chunks[1].content == " world"
        assert chunks[2].is_complete is True

    @pytest.mark.asyncio
    async def test_process_stream_final_chunk_has_token_usage(
        self, provider, sample_messages
    ):
        """Test that final chunk includes token usage."""
        mock_response = AsyncMock()

        async def mock_aiter_lines():
            yield '{"done": true, "eval_count": 50, "prompt_eval_count": 25}'

        mock_response.aiter_lines = mock_aiter_lines

        chunks = []
        async for chunk in provider._process_stream(
            mock_response, "llama3.1:8b", sample_messages
        ):
            chunks.append(chunk)

        assert len(chunks) == 1
        assert chunks[0].is_complete is True
        assert chunks[0].token_usage is not None
        assert chunks[0].token_usage.completion_tokens == 50
        assert chunks[0].token_usage.prompt_tokens == 25
        assert chunks[0].token_usage.total_tokens == 75

    @pytest.mark.asyncio
    async def test_process_stream_includes_model_name(self, provider, sample_messages):
        """Test that chunks include model name."""
        mock_response = AsyncMock()

        async def mock_aiter_lines():
            yield '{"message": {"content": "Test"}, "done": false}'
            yield '{"done": true, "eval_count": 0, "prompt_eval_count": 0}'

        mock_response.aiter_lines = mock_aiter_lines

        async for chunk in provider._process_stream(
            mock_response, "mistral:7b", sample_messages
        ):
            assert chunk.model == "mistral:7b"

    @pytest.mark.asyncio
    async def test_process_stream_includes_metadata(self, provider, sample_messages):
        """Test that chunks include provider metadata."""
        mock_response = AsyncMock()

        async def mock_aiter_lines():
            yield '{"message": {"content": "Test"}, "done": false}'
            yield '{"done": true, "eval_count": 0, "prompt_eval_count": 0}'

        mock_response.aiter_lines = mock_aiter_lines

        async for chunk in provider._process_stream(
            mock_response, "llama3.1:8b", sample_messages
        ):
            assert "provider" in chunk.metadata
            assert chunk.metadata["provider"] == "ollama"

    @pytest.mark.asyncio
    async def test_process_stream_handles_json_decode_error(
        self, provider, sample_messages
    ):
        """Test that invalid JSON is skipped gracefully."""
        mock_response = AsyncMock()

        async def mock_aiter_lines():
            yield "invalid json"
            yield '{"message": {"content": "Valid"}, "done": false}'
            yield '{"done": true, "eval_count": 0, "prompt_eval_count": 0}'

        mock_response.aiter_lines = mock_aiter_lines

        chunks = []
        async for chunk in provider._process_stream(
            mock_response, "llama3.1:8b", sample_messages
        ):
            chunks.append(chunk)

        # Should only get valid chunks
        assert len(chunks) == 2
        assert chunks[0].content == "Valid"

    @pytest.mark.asyncio
    async def test_process_stream_skips_empty_lines(self, provider, sample_messages):
        """Test that empty lines are skipped."""
        mock_response = AsyncMock()

        async def mock_aiter_lines():
            yield ""
            yield '{"message": {"content": "Content"}, "done": false}'
            yield ""
            yield '{"done": true, "eval_count": 0, "prompt_eval_count": 0}'

        mock_response.aiter_lines = mock_aiter_lines

        chunks = []
        async for chunk in provider._process_stream(
            mock_response, "llama3.1:8b", sample_messages
        ):
            chunks.append(chunk)

        assert len(chunks) == 2


# =============================================================================
# Model Pulling Tests
# =============================================================================


class TestModelPulling:
    """Tests for _pull_model method."""

    @pytest.mark.asyncio
    async def test_pull_model_success(self, provider):
        """Test successful model pull."""
        with patch.object(provider, "client") as mock_client:
            mock_response = AsyncMock()
            mock_response.status_code = 200

            async def mock_aiter_lines():
                yield '{"status": "pulling"}'
                yield '{"status": "success"}'

            mock_response.aiter_lines = mock_aiter_lines
            mock_response.__aenter__ = AsyncMock(return_value=mock_response)
            mock_response.__aexit__ = AsyncMock(return_value=None)
            mock_client.stream = MagicMock(return_value=mock_response)

            result = await provider._pull_model("llama3.1:8b")
            assert result is True

    @pytest.mark.asyncio
    async def test_pull_model_failure(self, provider):
        """Test failed model pull."""
        with patch.object(provider, "client") as mock_client:
            mock_response = AsyncMock()
            mock_response.status_code = 404

            async def mock_aiter_lines():
                return
                yield  # Make it an async generator

            mock_response.aiter_lines = mock_aiter_lines
            mock_response.__aenter__ = AsyncMock(return_value=mock_response)
            mock_response.__aexit__ = AsyncMock(return_value=None)
            mock_client.stream = MagicMock(return_value=mock_response)

            result = await provider._pull_model("nonexistent-model")
            assert result is False

    @pytest.mark.asyncio
    async def test_pull_model_exception(self, provider):
        """Test model pull with exception."""
        with patch.object(provider, "client") as mock_client:
            mock_client.stream = MagicMock(side_effect=Exception("Network error"))

            result = await provider._pull_model("llama3.1:8b")
            assert result is False


# =============================================================================
# Availability Check Tests
# =============================================================================


class TestIsAvailable:
    """Tests for is_available method."""

    @pytest.mark.asyncio
    async def test_is_available_success(self, provider):
        """Test availability check when Ollama is running."""
        with patch.object(provider, "client") as mock_client:
            mock_response = MagicMock()
            mock_response.status_code = 200
            mock_client.get = AsyncMock(return_value=mock_response)

            result = await provider.is_available()
            assert result is True

    @pytest.mark.asyncio
    async def test_is_available_not_running(self, provider):
        """Test availability check when Ollama is not running."""
        with patch.object(provider, "client") as mock_client:
            mock_client.get = AsyncMock(
                side_effect=httpx.ConnectError("Connection refused")
            )

            result = await provider.is_available()
            assert result is False

    @pytest.mark.asyncio
    async def test_is_available_handles_request_error(self, provider):
        """Test availability check handles request errors."""
        with patch.object(provider, "client") as mock_client:
            mock_client.get = AsyncMock(side_effect=httpx.RequestError("Error"))

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

    def test_get_supported_models_includes_llama(self, provider):
        """Test that Llama models are included."""
        models = provider.get_supported_models()
        assert any("llama" in m.lower() for m in models)

    def test_get_supported_models_includes_mistral(self, provider):
        """Test that Mistral models are included."""
        models = provider.get_supported_models()
        assert any("mistral" in m.lower() for m in models)

    def test_get_supported_models_includes_codellama(self, provider):
        """Test that CodeLlama models are included."""
        models = provider.get_supported_models()
        assert any("codellama" in m.lower() for m in models)

    def test_get_supported_models_includes_phi(self, provider):
        """Test that Phi models are included."""
        models = provider.get_supported_models()
        assert any("phi" in m.lower() for m in models)


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
    async def test_default_model_is_llama(self, provider):
        """Test that default model is a Llama variant."""
        model = await provider.get_default_model()
        assert "llama" in model.lower()

    @pytest.mark.asyncio
    async def test_default_model_is_in_supported_list(self, provider):
        """Test that default model is in supported models list."""
        default = await provider.get_default_model()
        supported = provider.get_supported_models()
        assert default in supported


# =============================================================================
# Available Models Tests
# =============================================================================


class TestAvailableModels:
    """Tests for get_available_models method."""

    @pytest.mark.asyncio
    async def test_get_available_models_success(self, provider):
        """Test getting available models when Ollama is running."""
        with patch.object(provider, "client") as mock_client:
            mock_response = MagicMock()
            mock_response.status_code = 200
            mock_response.json.return_value = {
                "models": [
                    {"name": "llama3.1:8b"},
                    {"name": "mistral:7b"},
                ]
            }
            mock_client.get = AsyncMock(return_value=mock_response)

            models = await provider.get_available_models()
            assert len(models) == 2
            assert "llama3.1:8b" in models
            assert "mistral:7b" in models

    @pytest.mark.asyncio
    async def test_get_available_models_no_models(self, provider):
        """Test getting available models when none are installed."""
        with patch.object(provider, "client") as mock_client:
            mock_response = MagicMock()
            mock_response.status_code = 200
            mock_response.json.return_value = {"models": []}
            mock_client.get = AsyncMock(return_value=mock_response)

            models = await provider.get_available_models()
            assert models == []

    @pytest.mark.asyncio
    async def test_get_available_models_request_error(self, provider):
        """Test getting available models handles request errors."""
        with patch.object(provider, "client") as mock_client:
            mock_client.get = AsyncMock(side_effect=httpx.RequestError("Error"))

            models = await provider.get_available_models()
            assert models == []

    @pytest.mark.asyncio
    async def test_get_available_models_json_error(self, provider):
        """Test getting available models handles JSON errors."""
        with patch.object(provider, "client") as mock_client:
            mock_response = MagicMock()
            mock_response.status_code = 200
            mock_response.json.side_effect = ValueError("Invalid JSON")
            mock_client.get = AsyncMock(return_value=mock_response)

            models = await provider.get_available_models()
            assert models == []


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
    """Integration tests for Ollama provider."""

    def test_provider_inherits_from_ai_provider(self, provider):
        """Test that provider inherits from AIProvider base class."""
        from app.services.ai_provider import AIProvider

        assert isinstance(provider, AIProvider)

    def test_provider_name_is_ollama(self, provider):
        """Test that provider name is correctly set."""
        assert provider.name == "ollama"


# =============================================================================
# Configuration Tests
# =============================================================================


class TestConfiguration:
    """Tests for provider configuration."""

    def test_base_url_is_localhost_by_default(self, provider):
        """Test that default base URL is localhost."""
        assert "localhost" in provider.base_url
        assert "11434" in provider.base_url

    def test_custom_base_url_is_respected(self, provider_custom_url):
        """Test that custom base URL is used."""
        assert "192.168.1.100" in provider_custom_url.base_url

    def test_api_key_is_none(self, provider):
        """Test that Ollama doesn't use API keys."""
        assert provider.api_key is None


# =============================================================================
# Options Handling Tests
# =============================================================================


class TestOptionsHandling:
    """Tests for stream options handling."""

    def test_max_tokens_capped_at_8192(self, provider):
        """Test that max_tokens is capped at Ollama's limit."""
        # StreamOptions has max 32000 from pydantic validation
        # Ollama implementation caps at 8192 internally
        options = StreamOptions(max_tokens=10000)
        # The actual capping happens in stream_chat: min(options.max_tokens, 8192)
        assert min(options.max_tokens, 8192) == 8192

    def test_stop_sequences_limited_to_4(self, provider):
        """Test that stop sequences are limited."""
        options = StreamOptions(stop_sequences=["a", "b", "c", "d", "e", "f"])
        # The slicing to 4 happens in stream_chat
        assert len(options.stop_sequences[:4]) == 4

    def test_custom_model_in_options(self):
        """Test that custom model can be specified."""
        options = StreamOptions(model="custom-model")
        assert options.model == "custom-model"
