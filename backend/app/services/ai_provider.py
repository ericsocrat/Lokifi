"""
AI Provider abstraction layer for Fynix AI Chatbot (J5).
"""

from abc import ABC, abstractmethod
from typing import Dict, List, Optional, AsyncGenerator, Any
from enum import Enum
import uuid

from pydantic import BaseModel, Field


class MessageRole(str, Enum):
    """Message roles in AI conversations."""
    SYSTEM = "system"
    USER = "user"  
    ASSISTANT = "assistant"
    TOOL = "tool"


class AIMessage(BaseModel):
    """AI message model for provider interactions."""
    role: MessageRole
    content: str
    metadata: Dict[str, Any] = Field(default_factory=dict)


class StreamOptions(BaseModel):
    """Options for streaming AI responses."""
    max_tokens: int = Field(default=4096, ge=1, le=32000)
    temperature: float = Field(default=0.7, ge=0.0, le=2.0)
    top_p: float = Field(default=0.9, ge=0.0, le=1.0)
    stop_sequences: List[str] = Field(default_factory=list)
    stream: bool = Field(default=True)
    model: Optional[str] = Field(default=None)


class TokenUsage(BaseModel):
    """Token usage information."""
    prompt_tokens: int = 0
    completion_tokens: int = 0
    total_tokens: int = 0


class StreamChunk(BaseModel):
    """A chunk of streamed response."""
    id: str
    content: str
    is_complete: bool = False
    token_usage: Optional[TokenUsage] = None
    model: Optional[str] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)


class AIProvider(ABC):
    """Abstract base class for AI providers."""
    
    def __init__(self, api_key: Optional[str] = None, base_url: Optional[str] = None):
        self.api_key = api_key
        self.base_url = base_url
        self.name = self.__class__.__name__.lower().replace('provider', '')
    
    @abstractmethod
    async def stream_chat(
        self,
        messages: List[AIMessage],
        options: StreamOptions = StreamOptions()
    ) -> AsyncGenerator[StreamChunk, None]:
        """
        Stream chat completion tokens.
        
        Args:
            messages: List of conversation messages
            options: Streaming and model options
            
        Yields:
            StreamChunk: Individual chunks of the response
        """
        pass
    
    @abstractmethod
    async def is_available(self) -> bool:
        """Check if this provider is available and configured."""
        pass
    
    @abstractmethod
    def get_supported_models(self) -> List[str]:
        """Get list of supported models for this provider."""
        pass
    
    async def get_default_model(self) -> str:
        """Get the default model for this provider."""
        models = self.get_supported_models()
        return models[0] if models else "unknown"
    
    def estimate_tokens(self, text: str) -> int:
        """Rough token estimation (4 chars = 1 token)."""
        return max(1, len(text) // 4)
    
    def validate_messages(self, messages: List[AIMessage]) -> bool:
        """Validate message format and content."""
        if not messages:
            return False
        
        # Check for at least one user message
        has_user_message = any(msg.role == MessageRole.USER for msg in messages)
        if not has_user_message:
            return False
        
        # Check message content lengths
        for msg in messages:
            if len(msg.content) > 50000:  # 50k char limit per message
                return False
        
        return True


class MockProvider(AIProvider):
    """Mock provider for demonstration when no real providers are configured."""
    
    def __init__(self):
        super().__init__()
        self.name = "mock"
    
    async def stream_chat(
        self,
        messages: List[AIMessage], 
        options: StreamOptions = StreamOptions()
    ) -> AsyncGenerator[StreamChunk, None]:
        """Generate mock streaming response."""
        mock_response = (
            "I'm a mock AI assistant. To enable real AI capabilities, "
            "please configure one of the following providers in your .env file:\n\n"
            "• **OpenRouter**: Set OPENROUTER_API_KEY\n"
            "• **Hugging Face**: Set HF_API_KEY\n" 
            "• **Ollama**: Set OLLAMA_BASE_URL (default: http://localhost:11434)\n\n"
            "Once configured, I'll be able to provide real AI assistance!"
        )
        
        words = mock_response.split()
        chunk_id = str(uuid.uuid4())
        
        for i, word in enumerate(words):
            content = word + (" " if i < len(words) - 1 else "")
            
            yield StreamChunk(
                id=chunk_id,
                content=content,
                is_complete=(i == len(words) - 1),
                token_usage=TokenUsage(
                    prompt_tokens=sum(self.estimate_tokens(msg.content) for msg in messages),
                    completion_tokens=len(words),
                    total_tokens=sum(self.estimate_tokens(msg.content) for msg in messages) + len(words)
                ) if i == len(words) - 1 else None,
                model="mock-model",
                metadata={"provider": "mock", "demo": True}
            )
            
            # Simulate streaming delay
            import asyncio
            await asyncio.sleep(0.05)
    
    async def is_available(self) -> bool:
        """Mock provider is always available as fallback."""
        return True
    
    def get_supported_models(self) -> List[str]:
        """Mock provider models."""
        return ["mock-model", "demo-assistant"]


class ProviderError(Exception):
    """Base exception for provider errors."""
    pass


class ProviderUnavailableError(ProviderError):
    """Provider is not available or configured."""
    pass


class ProviderRateLimitError(ProviderError):
    """Provider rate limit exceeded."""
    pass


class ProviderAuthenticationError(ProviderError):
    """Provider authentication failed."""
    pass