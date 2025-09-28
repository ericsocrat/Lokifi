"""
AI Provider manager and factory for Fynix AI Chatbot (J5).
"""

import logging
from typing import List, Optional, Dict, Any
from enum import Enum

from app.core.config import settings
from app.services.ai_provider import AIProvider, MockProvider
from app.services.providers.openrouter_provider import OpenRouterProvider
from app.services.providers.huggingface_provider import HuggingFaceProvider
from app.services.providers.ollama_provider import OllamaProvider

logger = logging.getLogger(__name__)


class ProviderType(str, Enum):
    """Available AI provider types."""
    OPENROUTER = "openrouter"
    HUGGINGFACE = "huggingface"
    OLLAMA = "ollama"
    MOCK = "mock"


class AIProviderManager:
    """Manages AI providers and selects the best available one."""
    
    def __init__(self):
        self.providers: Dict[str, AIProvider] = {}
        self._initialize_providers()
    
    def _initialize_providers(self):
        """Initialize all configured providers."""
        
        # OpenRouter provider
        if hasattr(settings, 'OPENROUTER_API_KEY') and settings.OPENROUTER_API_KEY:
            try:
                self.providers["openrouter"] = OpenRouterProvider(settings.OPENROUTER_API_KEY)
                logger.info("OpenRouter provider initialized")
            except Exception as e:
                logger.error(f"Failed to initialize OpenRouter provider: {e}")
        
        # Hugging Face provider
        if hasattr(settings, 'HUGGING_FACE_API_KEY') and settings.HUGGING_FACE_API_KEY:
            try:
                self.providers["huggingface"] = HuggingFaceProvider(settings.HUGGING_FACE_API_KEY)
                logger.info("Hugging Face provider initialized")
            except Exception as e:
                logger.error(f"Failed to initialize Hugging Face provider: {e}")
        
        # Ollama provider
        if hasattr(settings, 'OLLAMA_BASE_URL'):
            try:
                self.providers["ollama"] = OllamaProvider(settings.OLLAMA_BASE_URL)
                logger.info(f"Ollama provider initialized at {settings.OLLAMA_BASE_URL}")
            except Exception as e:
                logger.error(f"Failed to initialize Ollama provider: {e}")
        else:
            # Try default Ollama URL
            try:
                self.providers["ollama"] = OllamaProvider()
                logger.info("Ollama provider initialized with default URL")
            except Exception as e:
                logger.warning(f"Ollama not available: {e}")
        
        # Always add mock provider as fallback
        self.providers["mock"] = MockProvider()
        logger.info("Mock provider initialized as fallback")
    
    async def get_available_providers(self) -> List[str]:
        """Get list of available and working providers."""
        available = []
        
        for name, provider in self.providers.items():
            try:
                if await provider.is_available():
                    available.append(name)
            except Exception as e:
                logger.warning(f"Provider {name} availability check failed: {e}")
        
        return available
    
    async def get_best_provider(self, preferred_provider: Optional[str] = None) -> AIProvider:
        """Get the best available provider, optionally preferring a specific one."""
        
        # If a specific provider is requested and available, use it
        if preferred_provider and preferred_provider in self.providers:
            provider = self.providers[preferred_provider]
            try:
                if await provider.is_available():
                    return provider
                else:
                    logger.warning(f"Preferred provider {preferred_provider} is not available")
            except Exception as e:
                logger.error(f"Error checking provider {preferred_provider}: {e}")
        
        # Provider priority order (fastest and most reliable first)
        priority_order = ["openrouter", "ollama", "huggingface", "mock"]
        
        for provider_name in priority_order:
            if provider_name in self.providers:
                provider = self.providers[provider_name]
                try:
                    if await provider.is_available():
                        logger.info(f"Selected provider: {provider_name}")
                        return provider
                except Exception as e:
                    logger.error(f"Error with provider {provider_name}: {e}")
        
        # Fallback to mock if nothing else works
        logger.warning("All providers failed, falling back to mock provider")
        return self.providers["mock"]
    
    def get_provider_by_name(self, name: str) -> Optional[AIProvider]:
        """Get a specific provider by name."""
        return self.providers.get(name)
    
    async def get_provider_status(self) -> Dict[str, Dict[str, Any]]:
        """Get status of all providers."""
        status = {}
        
        for name, provider in self.providers.items():
            try:
                is_available = await provider.is_available()
                models = provider.get_supported_models()
                default_model = await provider.get_default_model()
                
                status[name] = {
                    "available": is_available,
                    "models": models,
                    "default_model": default_model,
                    "name": provider.name,
                    "type": "local" if name == "ollama" else "api"
                }
            except Exception as e:
                status[name] = {
                    "available": False,
                    "error": str(e),
                    "models": [],
                    "default_model": None
                }
        
        return status
    
    def has_real_providers(self) -> bool:
        """Check if any real (non-mock) providers are configured."""
        return any(name != "mock" for name in self.providers.keys())
    
    def get_provider_info(self) -> Dict[str, str]:
        """Get information about configured providers for the UI."""
        info = {}
        
        if "openrouter" in self.providers:
            info["openrouter"] = "OpenRouter - Access to GPT-4, Claude, and more"
        if "huggingface" in self.providers:
            info["huggingface"] = "Hugging Face - Open source models"
        if "ollama" in self.providers:
            info["ollama"] = "Ollama - Local AI models"
        if not self.has_real_providers():
            info["mock"] = "Demo mode - Configure API keys for real AI"
        
        return info


# Global provider manager instance
ai_provider_manager = AIProviderManager()


async def get_ai_provider(preferred_provider: Optional[str] = None) -> AIProvider:
    """Get the best available AI provider."""
    return await ai_provider_manager.get_best_provider(preferred_provider)