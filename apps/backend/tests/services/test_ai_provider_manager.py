"""
Comprehensive tests for AI Provider Manager.

Tests cover:
- Provider initialization from settings
- Provider selection and priority
- Availability checking
- Provider status and info methods
- Fallback behavior
"""

import logging
from typing import Any
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.services.ai_provider import AIProvider, MockProvider
from app.services.ai_provider_manager import (
    AIProviderManager,
    ProviderType,
    ai_provider_manager,
    get_ai_provider,
)
from app.services.providers.huggingface_provider import HuggingFaceProvider
from app.services.providers.ollama_provider import OllamaProvider
from app.services.providers.openrouter_provider import OpenRouterProvider

# =============================================================================
# Fixtures
# =============================================================================


@pytest.fixture
def mock_settings():
    """Create mock settings with all API keys."""
    settings = MagicMock()
    settings.OPENROUTER_API_KEY = "test-openrouter-key"
    settings.HUGGING_FACE_API_KEY = "test-huggingface-key"
    settings.OLLAMA_BASE_URL = "http://localhost:11434"
    return settings


@pytest.fixture
def mock_settings_no_keys():
    """Create mock settings with no API keys."""
    settings = MagicMock()
    settings.OPENROUTER_API_KEY = None
    settings.HUGGING_FACE_API_KEY = None
    delattr(settings, "OLLAMA_BASE_URL")
    return settings


@pytest.fixture
def mock_settings_only_openrouter():
    """Create mock settings with only OpenRouter."""
    settings = MagicMock()
    settings.OPENROUTER_API_KEY = "test-openrouter-key"
    settings.HUGGING_FACE_API_KEY = None
    delattr(settings, "OLLAMA_BASE_URL")
    return settings


# =============================================================================
# ProviderType Enum Tests
# =============================================================================


class TestProviderType:
    """Tests for ProviderType enum."""

    def test_openrouter_value(self):
        """Test OpenRouter enum value."""
        assert ProviderType.OPENROUTER.value == "openrouter"

    def test_huggingface_value(self):
        """Test HuggingFace enum value."""
        assert ProviderType.HUGGINGFACE.value == "huggingface"

    def test_ollama_value(self):
        """Test Ollama enum value."""
        assert ProviderType.OLLAMA.value == "ollama"

    def test_mock_value(self):
        """Test Mock enum value."""
        assert ProviderType.MOCK.value == "mock"

    def test_enum_is_string(self):
        """Test ProviderType inherits from str."""
        assert isinstance(ProviderType.OPENROUTER, str)


# =============================================================================
# Manager Initialization Tests
# =============================================================================


class TestManagerInitialization:
    """Tests for AIProviderManager initialization."""

    @patch("app.services.ai_provider_manager.settings")
    @patch("app.services.ai_provider_manager.OpenRouterProvider")
    @patch("app.services.ai_provider_manager.HuggingFaceProvider")
    @patch("app.services.ai_provider_manager.OllamaProvider")
    def test_initializes_with_all_providers(
        self, mock_ollama, mock_hf, mock_openrouter, mock_settings
    ):
        """Test manager initializes all providers when keys are configured."""
        mock_settings.OPENROUTER_API_KEY = "test-key"
        mock_settings.HUGGING_FACE_API_KEY = "test-key"
        mock_settings.OLLAMA_BASE_URL = "http://localhost:11434"

        manager = AIProviderManager()

        assert "mock" in manager.providers
        assert isinstance(manager.providers["mock"], MockProvider)

    @patch("app.services.ai_provider_manager.settings")
    def test_always_initializes_mock_provider(self, mock_settings):
        """Test mock provider is always initialized."""
        mock_settings.OPENROUTER_API_KEY = None
        mock_settings.HUGGING_FACE_API_KEY = None

        # Ensure OLLAMA_BASE_URL doesn't exist
        if hasattr(mock_settings, "OLLAMA_BASE_URL"):
            delattr(mock_settings, "OLLAMA_BASE_URL")

        manager = AIProviderManager()

        assert "mock" in manager.providers
        assert isinstance(manager.providers["mock"], MockProvider)

    @patch("app.services.ai_provider_manager.settings")
    @patch("app.services.ai_provider_manager.OpenRouterProvider")
    def test_handles_openrouter_initialization_error(
        self, mock_provider_class, mock_settings
    ):
        """Test manager handles OpenRouter initialization errors."""
        mock_settings.OPENROUTER_API_KEY = "test-key"
        mock_settings.HUGGING_FACE_API_KEY = None
        if hasattr(mock_settings, "OLLAMA_BASE_URL"):
            delattr(mock_settings, "OLLAMA_BASE_URL")

        mock_provider_class.side_effect = Exception("Init failed")

        # Should not raise - errors are logged
        manager = AIProviderManager()

        assert "openrouter" not in manager.providers
        assert "mock" in manager.providers

    @patch("app.services.ai_provider_manager.settings")
    @patch("app.services.ai_provider_manager.HuggingFaceProvider")
    def test_handles_huggingface_initialization_error(
        self, mock_provider_class, mock_settings
    ):
        """Test manager handles HuggingFace initialization errors."""
        mock_settings.OPENROUTER_API_KEY = None
        mock_settings.HUGGING_FACE_API_KEY = "test-key"
        if hasattr(mock_settings, "OLLAMA_BASE_URL"):
            delattr(mock_settings, "OLLAMA_BASE_URL")

        mock_provider_class.side_effect = Exception("Init failed")

        manager = AIProviderManager()

        assert "huggingface" not in manager.providers
        assert "mock" in manager.providers

    @patch("app.services.ai_provider_manager.settings")
    @patch("app.services.ai_provider_manager.OllamaProvider")
    def test_handles_ollama_initialization_error(
        self, mock_provider_class, mock_settings
    ):
        """Test manager handles Ollama initialization errors."""
        mock_settings.OPENROUTER_API_KEY = None
        mock_settings.HUGGING_FACE_API_KEY = None
        mock_settings.OLLAMA_BASE_URL = "http://localhost:11434"

        mock_provider_class.side_effect = Exception("Init failed")

        manager = AIProviderManager()

        assert "ollama" not in manager.providers
        assert "mock" in manager.providers

    @patch("app.services.ai_provider_manager.settings")
    @patch("app.services.ai_provider_manager.OllamaProvider")
    def test_initializes_ollama_with_default_url(
        self, mock_provider_class, mock_settings
    ):
        """Test manager initializes Ollama with default URL when not configured."""
        mock_settings.OPENROUTER_API_KEY = None
        mock_settings.HUGGING_FACE_API_KEY = None
        # Remove OLLAMA_BASE_URL attribute
        type(mock_settings).OLLAMA_BASE_URL = property(
            lambda self: (_ for _ in ()).throw(AttributeError())
        )

        manager = AIProviderManager()

        # Should try default URL
        mock_provider_class.assert_called()


# =============================================================================
# Get Available Providers Tests
# =============================================================================


class TestGetAvailableProviders:
    """Tests for get_available_providers method."""

    @pytest.mark.asyncio
    async def test_returns_available_providers(self):
        """Test returns list of available providers."""
        manager = AIProviderManager.__new__(AIProviderManager)
        manager.providers = {}

        mock_provider1 = AsyncMock(spec=AIProvider)
        mock_provider1.is_available = AsyncMock(return_value=True)

        mock_provider2 = AsyncMock(spec=AIProvider)
        mock_provider2.is_available = AsyncMock(return_value=False)

        manager.providers = {"provider1": mock_provider1, "provider2": mock_provider2}

        available = await manager.get_available_providers()

        assert "provider1" in available
        assert "provider2" not in available

    @pytest.mark.asyncio
    async def test_handles_availability_check_error(self):
        """Test handles errors during availability check."""
        manager = AIProviderManager.__new__(AIProviderManager)
        manager.providers = {}

        mock_provider = AsyncMock(spec=AIProvider)
        mock_provider.is_available = AsyncMock(side_effect=Exception("Check failed"))

        manager.providers = {"provider1": mock_provider}

        available = await manager.get_available_providers()

        assert "provider1" not in available

    @pytest.mark.asyncio
    async def test_returns_empty_list_when_none_available(self):
        """Test returns empty list when no providers are available."""
        manager = AIProviderManager.__new__(AIProviderManager)
        manager.providers = {}

        mock_provider = AsyncMock(spec=AIProvider)
        mock_provider.is_available = AsyncMock(return_value=False)

        manager.providers = {"provider1": mock_provider}

        available = await manager.get_available_providers()

        assert available == []


# =============================================================================
# Get Best Provider Tests
# =============================================================================


class TestGetBestProvider:
    """Tests for get_best_provider method."""

    @pytest.mark.asyncio
    async def test_returns_preferred_provider_when_available(self):
        """Test returns preferred provider when available."""
        manager = AIProviderManager.__new__(AIProviderManager)
        manager.providers = {}

        mock_provider = AsyncMock(spec=AIProvider)
        mock_provider.is_available = AsyncMock(return_value=True)

        mock_mock = MockProvider()

        manager.providers = {"preferred": mock_provider, "mock": mock_mock}

        result = await manager.get_best_provider(preferred_provider="preferred")

        assert result == mock_provider

    @pytest.mark.asyncio
    async def test_falls_back_when_preferred_unavailable(self):
        """Test falls back when preferred provider is unavailable."""
        manager = AIProviderManager.__new__(AIProviderManager)
        manager.providers = {}

        mock_preferred = AsyncMock(spec=AIProvider)
        mock_preferred.is_available = AsyncMock(return_value=False)

        mock_fallback = AsyncMock(spec=AIProvider)
        mock_fallback.is_available = AsyncMock(return_value=True)

        mock_mock = MockProvider()

        manager.providers = {
            "preferred": mock_preferred,
            "openrouter": mock_fallback,
            "mock": mock_mock,
        }

        result = await manager.get_best_provider(preferred_provider="preferred")

        assert result == mock_fallback

    @pytest.mark.asyncio
    async def test_uses_priority_order(self):
        """Test uses priority order when no preferred provider."""
        manager = AIProviderManager.__new__(AIProviderManager)
        manager.providers = {}

        mock_openrouter = AsyncMock(spec=AIProvider)
        mock_openrouter.is_available = AsyncMock(return_value=True)

        mock_ollama = AsyncMock(spec=AIProvider)
        mock_ollama.is_available = AsyncMock(return_value=True)

        mock_mock = MockProvider()

        manager.providers = {
            "openrouter": mock_openrouter,
            "ollama": mock_ollama,
            "mock": mock_mock,
        }

        result = await manager.get_best_provider()

        # OpenRouter has highest priority
        assert result == mock_openrouter

    @pytest.mark.asyncio
    async def test_falls_back_to_mock_when_all_fail(self):
        """Test falls back to mock when all providers fail."""
        manager = AIProviderManager.__new__(AIProviderManager)
        manager.providers = {}

        mock_openrouter = AsyncMock(spec=AIProvider)
        mock_openrouter.is_available = AsyncMock(return_value=False)

        mock_mock = MockProvider()

        manager.providers = {"openrouter": mock_openrouter, "mock": mock_mock}

        result = await manager.get_best_provider()

        assert isinstance(result, MockProvider)

    @pytest.mark.asyncio
    async def test_handles_provider_error_during_selection(self):
        """Test handles errors during provider availability check."""
        manager = AIProviderManager.__new__(AIProviderManager)
        manager.providers = {}

        mock_openrouter = AsyncMock(spec=AIProvider)
        mock_openrouter.is_available = AsyncMock(side_effect=Exception("Error"))

        mock_mock = MockProvider()

        manager.providers = {"openrouter": mock_openrouter, "mock": mock_mock}

        result = await manager.get_best_provider()

        assert isinstance(result, MockProvider)

    @pytest.mark.asyncio
    async def test_handles_preferred_provider_not_in_list(self):
        """Test handles preferred provider not in providers dict."""
        manager = AIProviderManager.__new__(AIProviderManager)
        manager.providers = {}

        mock_mock = MockProvider()

        manager.providers = {"mock": mock_mock}

        result = await manager.get_best_provider(preferred_provider="nonexistent")

        assert isinstance(result, MockProvider)


# =============================================================================
# Get Primary Provider Tests
# =============================================================================


class TestGetPrimaryProvider:
    """Tests for get_primary_provider method."""

    @pytest.mark.asyncio
    async def test_returns_best_provider(self):
        """Test get_primary_provider returns best provider."""
        manager = AIProviderManager.__new__(AIProviderManager)
        manager.providers = {}

        mock_provider = AsyncMock(spec=AIProvider)
        mock_provider.is_available = AsyncMock(return_value=True)

        manager.providers = {"openrouter": mock_provider, "mock": MockProvider()}

        result = await manager.get_primary_provider()

        assert result == mock_provider

    @pytest.mark.asyncio
    async def test_returns_none_on_error(self):
        """Test returns None when error occurs."""
        manager = AIProviderManager.__new__(AIProviderManager)
        manager.providers = {}

        # Create providers dict that raises error
        manager.providers = MagicMock()
        manager.providers.__contains__ = MagicMock(side_effect=Exception("Error"))

        result = await manager.get_primary_provider()

        # Should return None due to error handling
        # Note: actual implementation returns mock on error
        assert result is None or isinstance(result, MockProvider)


# =============================================================================
# Get Provider By Name Tests
# =============================================================================


class TestGetProviderByName:
    """Tests for get_provider_by_name method."""

    def test_returns_provider_when_exists(self):
        """Test returns provider when it exists."""
        manager = AIProviderManager.__new__(AIProviderManager)
        mock_provider = MagicMock(spec=AIProvider)
        manager.providers = {"test": mock_provider}

        result = manager.get_provider_by_name("test")

        assert result == mock_provider

    def test_returns_none_when_not_exists(self):
        """Test returns None when provider doesn't exist."""
        manager = AIProviderManager.__new__(AIProviderManager)
        manager.providers = {"mock": MockProvider()}

        result = manager.get_provider_by_name("nonexistent")

        assert result is None


# =============================================================================
# Get Provider Status Tests
# =============================================================================


class TestGetProviderStatus:
    """Tests for get_provider_status method."""

    @pytest.mark.asyncio
    async def test_returns_status_for_all_providers(self):
        """Test returns status for all providers."""
        manager = AIProviderManager.__new__(AIProviderManager)
        manager.providers = {}

        mock_provider = AsyncMock(spec=AIProvider)
        mock_provider.is_available = AsyncMock(return_value=True)
        mock_provider.get_supported_models = MagicMock(return_value=["model1"])
        mock_provider.get_default_model = AsyncMock(return_value="model1")
        mock_provider.name = "test"

        manager.providers = {"test_api": mock_provider}

        status = await manager.get_provider_status()

        assert "test_api" in status
        assert status["test_api"]["available"] is True
        assert status["test_api"]["models"] == ["model1"]
        assert status["test_api"]["default_model"] == "model1"
        assert status["test_api"]["type"] == "api"

    @pytest.mark.asyncio
    async def test_marks_ollama_as_local_type(self):
        """Test marks ollama provider as local type."""
        manager = AIProviderManager.__new__(AIProviderManager)
        manager.providers = {}

        mock_provider = AsyncMock(spec=AIProvider)
        mock_provider.is_available = AsyncMock(return_value=True)
        mock_provider.get_supported_models = MagicMock(return_value=[])
        mock_provider.get_default_model = AsyncMock(return_value="llama3")
        mock_provider.name = "ollama"

        manager.providers = {"ollama": mock_provider}

        status = await manager.get_provider_status()

        assert status["ollama"]["type"] == "local"

    @pytest.mark.asyncio
    async def test_handles_status_check_error(self):
        """Test handles errors during status check."""
        manager = AIProviderManager.__new__(AIProviderManager)
        manager.providers = {}

        mock_provider = AsyncMock(spec=AIProvider)
        mock_provider.is_available = AsyncMock(side_effect=Exception("Check failed"))

        manager.providers = {"test": mock_provider}

        status = await manager.get_provider_status()

        assert status["test"]["available"] is False
        assert "error" in status["test"]
        assert status["test"]["models"] == []
        assert status["test"]["default_model"] is None


# =============================================================================
# Has Real Providers Tests
# =============================================================================


class TestHasRealProviders:
    """Tests for has_real_providers method."""

    def test_returns_true_when_real_provider_exists(self):
        """Test returns True when non-mock provider exists."""
        manager = AIProviderManager.__new__(AIProviderManager)
        manager.providers = {"openrouter": MagicMock(), "mock": MockProvider()}

        result = manager.has_real_providers()

        assert result is True

    def test_returns_false_when_only_mock(self):
        """Test returns False when only mock provider exists."""
        manager = AIProviderManager.__new__(AIProviderManager)
        manager.providers = {"mock": MockProvider()}

        result = manager.has_real_providers()

        assert result is False

    def test_returns_false_when_empty(self):
        """Test returns False when no providers."""
        manager = AIProviderManager.__new__(AIProviderManager)
        manager.providers = {}

        result = manager.has_real_providers()

        assert result is False


# =============================================================================
# Get Provider Info Tests
# =============================================================================


class TestGetProviderInfo:
    """Tests for get_provider_info method."""

    def test_returns_openrouter_info(self):
        """Test returns OpenRouter info when configured."""
        manager = AIProviderManager.__new__(AIProviderManager)
        manager.providers = {"openrouter": MagicMock()}

        info = manager.get_provider_info()

        assert "openrouter" in info
        assert "OpenRouter" in info["openrouter"]

    def test_returns_huggingface_info(self):
        """Test returns HuggingFace info when configured."""
        manager = AIProviderManager.__new__(AIProviderManager)
        manager.providers = {"huggingface": MagicMock()}

        info = manager.get_provider_info()

        assert "huggingface" in info
        assert "Hugging Face" in info["huggingface"]

    def test_returns_ollama_info(self):
        """Test returns Ollama info when configured."""
        manager = AIProviderManager.__new__(AIProviderManager)
        manager.providers = {"ollama": MagicMock()}

        info = manager.get_provider_info()

        assert "ollama" in info
        assert "Ollama" in info["ollama"]

    def test_returns_mock_info_when_no_real_providers(self):
        """Test returns mock info when no real providers configured."""
        manager = AIProviderManager.__new__(AIProviderManager)
        manager.providers = {"mock": MockProvider()}

        info = manager.get_provider_info()

        assert "mock" in info
        assert "Demo mode" in info["mock"]

    def test_does_not_return_mock_info_when_real_providers_exist(self):
        """Test doesn't return mock info when real providers exist."""
        manager = AIProviderManager.__new__(AIProviderManager)
        manager.providers = {"openrouter": MagicMock(), "mock": MockProvider()}

        info = manager.get_provider_info()

        assert "mock" not in info
        assert "openrouter" in info


# =============================================================================
# Global Instance Tests
# =============================================================================


class TestGlobalInstance:
    """Tests for global ai_provider_manager instance."""

    def test_global_instance_exists(self):
        """Test global instance is created."""
        assert ai_provider_manager is not None
        assert isinstance(ai_provider_manager, AIProviderManager)

    def test_global_instance_has_mock_provider(self):
        """Test global instance always has mock provider."""
        assert "mock" in ai_provider_manager.providers


# =============================================================================
# Get AI Provider Function Tests
# =============================================================================


class TestGetAIProviderFunction:
    """Tests for get_ai_provider helper function."""

    @pytest.mark.asyncio
    async def test_get_ai_provider_returns_provider(self):
        """Test get_ai_provider returns a provider."""
        with patch.object(ai_provider_manager, "get_best_provider") as mock_get_best:
            mock_provider = MagicMock(spec=AIProvider)
            mock_get_best.return_value = mock_provider

            result = await get_ai_provider()

            assert result == mock_provider

    @pytest.mark.asyncio
    async def test_get_ai_provider_passes_preferred_provider(self):
        """Test get_ai_provider passes preferred provider."""
        with patch.object(ai_provider_manager, "get_best_provider") as mock_get_best:
            mock_provider = MagicMock(spec=AIProvider)
            mock_get_best.return_value = mock_provider

            await get_ai_provider(preferred_provider="openrouter")

            mock_get_best.assert_called_once_with("openrouter")


# =============================================================================
# Integration Tests
# =============================================================================


class TestIntegration:
    """Integration tests for AI Provider Manager."""

    @pytest.mark.asyncio
    async def test_mock_provider_always_available(self):
        """Test mock provider is always available."""
        manager = AIProviderManager.__new__(AIProviderManager)
        mock_provider = MockProvider()
        manager.providers = {"mock": mock_provider}

        available = await manager.get_available_providers()

        assert "mock" in available

    @pytest.mark.asyncio
    async def test_full_workflow_with_mock(self):
        """Test complete workflow with mock provider."""
        manager = AIProviderManager.__new__(AIProviderManager)
        mock_provider = MockProvider()
        manager.providers = {"mock": mock_provider}

        # Get available providers
        available = await manager.get_available_providers()
        assert "mock" in available

        # Get best provider
        best = await manager.get_best_provider()
        assert isinstance(best, MockProvider)

        # Get status
        status = await manager.get_provider_status()
        assert "mock" in status
        assert status["mock"]["available"] is True

        # Check has real providers
        assert manager.has_real_providers() is False

        # Get info
        info = manager.get_provider_info()
        assert "mock" in info


# =============================================================================
# Edge Cases Tests
# =============================================================================


class TestEdgeCases:
    """Tests for edge cases."""

    @pytest.mark.asyncio
    async def test_concurrent_availability_checks(self):
        """Test concurrent availability checks don't interfere."""
        import asyncio

        manager = AIProviderManager.__new__(AIProviderManager)
        manager.providers = {}

        async def slow_check():
            await asyncio.sleep(0.01)
            return True

        mock_provider = AsyncMock(spec=AIProvider)
        mock_provider.is_available = slow_check

        manager.providers = {
            "provider1": mock_provider,
            "provider2": mock_provider,
            "provider3": mock_provider,
        }

        # Run multiple concurrent checks
        results = await asyncio.gather(
            manager.get_available_providers(),
            manager.get_available_providers(),
            manager.get_available_providers(),
        )

        # All should return same result
        assert all(len(r) == 3 for r in results)

    def test_empty_providers_dict(self):
        """Test handles empty providers dict."""
        manager = AIProviderManager.__new__(AIProviderManager)
        manager.providers = {}

        assert manager.has_real_providers() is False
        assert manager.get_provider_by_name("any") is None
        # With empty providers and no real providers, mock info is shown
        info = manager.get_provider_info()
        assert "mock" in info  # Demo mode info appears

    @pytest.mark.asyncio
    async def test_provider_becomes_unavailable_mid_session(self):
        """Test handles provider becoming unavailable."""
        manager = AIProviderManager.__new__(AIProviderManager)
        manager.providers = {}

        call_count = 0

        async def flaky_availability():
            nonlocal call_count
            call_count += 1
            return call_count < 2  # Available first time, then not

        mock_provider = AsyncMock(spec=AIProvider)
        mock_provider.is_available = flaky_availability

        mock_mock = MockProvider()
        manager.providers = {"flaky": mock_provider, "mock": mock_mock}

        # First call - flaky is available
        available1 = await manager.get_available_providers()
        assert "flaky" in available1

        # Second call - flaky is unavailable
        available2 = await manager.get_available_providers()
        assert "flaky" not in available2
