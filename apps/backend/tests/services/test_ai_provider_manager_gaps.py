"""
Targeted tests for ai_provider_manager to increase coverage:
- Provider initialization failures
- Availability check failures
- get_best_provider fallback logic
- get_provider_status error handling
- has_real_providers logic
- get_provider_info cases
"""

from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.services.ai_provider import AIProvider, MockProvider
from app.services.ai_provider_manager import AIProviderManager


@pytest.fixture
def manager() -> AIProviderManager:
    return AIProviderManager()


@pytest.mark.asyncio
async def test_get_available_providers_with_failures(manager: AIProviderManager):
    """Test get_available_providers when some providers fail availability check."""
    # Mock providers: one succeeds, one fails, one throws exception
    provider1 = AsyncMock(spec=AIProvider)
    provider1.is_available = AsyncMock(return_value=True)

    provider2 = AsyncMock(spec=AIProvider)
    provider2.is_available = AsyncMock(return_value=False)

    provider3 = AsyncMock(spec=AIProvider)
    provider3.is_available = AsyncMock(side_effect=Exception("Connection error"))

    manager.providers = {
        "good": provider1,
        "unavailable": provider2,
        "broken": provider3,
    }

    available = await manager.get_available_providers()
    assert "good" in available
    assert "unavailable" not in available
    assert "broken" not in available


@pytest.mark.asyncio
async def test_get_best_provider_preferred_unavailable_fallback(
    manager: AIProviderManager,
):
    """Test get_best_provider falls back when preferred provider is unavailable."""
    preferred = AsyncMock(spec=AIProvider)
    preferred.is_available = AsyncMock(return_value=False)

    fallback = AsyncMock(spec=AIProvider)
    fallback.is_available = AsyncMock(return_value=True)

    manager.providers = {
        "preferred": preferred,
        "openrouter": fallback,
    }

    result = await manager.get_best_provider(preferred_provider="preferred")
    assert result == fallback


@pytest.mark.asyncio
async def test_get_best_provider_preferred_exception_fallback(
    manager: AIProviderManager,
):
    """Test get_best_provider falls back when preferred provider throws exception."""
    preferred = AsyncMock(spec=AIProvider)
    preferred.is_available = AsyncMock(side_effect=Exception("Network error"))

    fallback = AsyncMock(spec=AIProvider)
    fallback.is_available = AsyncMock(return_value=True)

    manager.providers = {
        "preferred": preferred,
        "openrouter": fallback,
    }

    result = await manager.get_best_provider(preferred_provider="preferred")
    assert result == fallback


@pytest.mark.asyncio
async def test_get_best_provider_all_fail_returns_mock(manager: AIProviderManager):
    """Test get_best_provider returns mock when all providers fail."""
    failing1 = AsyncMock(spec=AIProvider)
    failing1.is_available = AsyncMock(return_value=False)

    failing2 = AsyncMock(spec=AIProvider)
    failing2.is_available = AsyncMock(side_effect=Exception("Error"))

    mock_provider = MockProvider()

    manager.providers = {
        "openrouter": failing1,
        "ollama": failing2,
        "mock": mock_provider,
    }

    result = await manager.get_best_provider()
    assert result == mock_provider


@pytest.mark.asyncio
async def test_get_primary_provider_returns_none_on_exception(
    manager: AIProviderManager,
):
    """Test get_primary_provider returns None when get_best_provider fails."""
    manager.get_best_provider = AsyncMock(side_effect=Exception("Fatal error"))

    result = await manager.get_primary_provider()
    assert result is None


@pytest.mark.asyncio
async def test_get_provider_status_handles_exceptions(manager: AIProviderManager):
    """Test get_provider_status handles provider errors gracefully."""
    working = AsyncMock(spec=AIProvider)
    working.is_available = AsyncMock(return_value=True)
    working.get_supported_models = MagicMock(return_value=["model1"])
    working.get_default_model = AsyncMock(return_value="model1")
    working.name = "working"

    broken = AsyncMock(spec=AIProvider)
    broken.is_available = AsyncMock(side_effect=Exception("Connection timeout"))

    manager.providers = {"working": working, "broken": broken}

    status = await manager.get_provider_status()

    assert status["working"]["available"] is True
    assert status["working"]["models"] == ["model1"]
    assert status["broken"]["available"] is False
    assert "error" in status["broken"]
    assert status["broken"]["models"] == []


def test_has_real_providers_true_when_non_mock_exists(manager: AIProviderManager):
    """Test has_real_providers returns True when non-mock provider exists."""
    manager.providers = {"openrouter": MagicMock(), "mock": MockProvider()}
    assert manager.has_real_providers() is True


def test_has_real_providers_false_when_only_mock(manager: AIProviderManager):
    """Test has_real_providers returns False when only mock provider exists."""
    manager.providers = {"mock": MockProvider()}
    assert manager.has_real_providers() is False


def test_get_provider_info_includes_configured_providers(
    manager: AIProviderManager,
):
    """Test get_provider_info returns info for configured providers."""
    manager.providers = {
        "openrouter": MagicMock(),
        "ollama": MagicMock(),
        "mock": MockProvider(),
    }

    info = manager.get_provider_info()
    assert "openrouter" in info
    assert "ollama" in info
    assert "OpenRouter" in info["openrouter"]
    assert "Ollama" in info["ollama"]


def test_get_provider_info_shows_demo_mode_when_no_real_providers(
    manager: AIProviderManager,
):
    """Test get_provider_info shows demo mode when only mock provider."""
    manager.providers = {"mock": MockProvider()}

    info = manager.get_provider_info()
    assert "mock" in info
    assert "Demo mode" in info["mock"]


def test_get_provider_by_name_returns_provider(manager: AIProviderManager):
    """Test get_provider_by_name returns the correct provider."""
    test_provider = MagicMock(spec=AIProvider)
    manager.providers = {"test": test_provider}

    result = manager.get_provider_by_name("test")
    assert result == test_provider


def test_get_provider_by_name_returns_none_for_unknown(manager: AIProviderManager):
    """Test get_provider_by_name returns None for unknown provider."""
    manager.providers = {}
    result = manager.get_provider_by_name("nonexistent")
    assert result is None


@pytest.mark.asyncio
async def test_global_get_ai_provider_function():
    """Test global get_ai_provider function."""
    from app.services.ai_provider_manager import ai_provider_manager, get_ai_provider

    mock_provider = MockProvider()
    ai_provider_manager.providers = {"mock": mock_provider}

    result = await get_ai_provider()
    assert result == mock_provider
