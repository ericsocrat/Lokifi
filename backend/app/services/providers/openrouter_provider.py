"""
OpenRouter AI provider for Fynix AI Chatbot (J5).
"""

import json
import logging
import uuid
from collections.abc import AsyncGenerator

import httpx

from app.services.ai_provider import (
    AIMessage,
    AIProvider,
    ProviderAuthenticationError,
    ProviderError,
    ProviderRateLimitError,
    ProviderUnavailableError,
    StreamChunk,
    StreamOptions,
    TokenUsage,
)

logger = logging.getLogger(__name__)


class OpenRouterProvider(AIProvider):
    """OpenRouter AI provider implementation."""
    
    def __init__(self, api_key: str | None = None):
        super().__init__(api_key)
        self.name = "openrouter"
        self.base_url = "https://openrouter.ai/api/v1"
        self.client = httpx.AsyncClient(
            timeout=httpx.Timeout(60.0),
            headers={
                "Authorization": f"Bearer {self.api_key}" if self.api_key else "",
                "HTTP-Referer": "https://fynix.com",
                "X-Title": "Fynix AI Chatbot",
                "Content-Type": "application/json"
            }
        )
    
    async def stream_chat(
        self,
        messages: list[AIMessage],
        options: StreamOptions = StreamOptions()
    ) -> AsyncGenerator[StreamChunk, None]:
        """Stream chat completion from OpenRouter."""
        
        if not self.api_key:
            raise ProviderUnavailableError("OpenRouter API key not configured")
        
        if not self.validate_messages(messages):
            raise ProviderError("Invalid messages format")
        
        # Convert messages to OpenRouter format
        openrouter_messages = []
        for msg in messages:
            openrouter_messages.append({
                "role": msg.role.value,
                "content": msg.content
            })
        
        # Select model - use provided model or default
        model = options.model or "openai/gpt-3.5-turbo"
        
        payload = {
            "model": model,
            "messages": openrouter_messages,
            "stream": True,
            "max_tokens": min(options.max_tokens, 4096),  # OpenRouter limits
            "temperature": options.temperature,
            "top_p": options.top_p,
            "stop": options.stop_sequences[:4] if options.stop_sequences else None
        }
        
        try:
            async with self.client.stream(
                "POST",
                f"{self.base_url}/chat/completions",
                json=payload
            ) as response:
                
                if response.status_code == 401:
                    raise ProviderAuthenticationError("Invalid OpenRouter API key")
                elif response.status_code == 429:
                    raise ProviderRateLimitError("OpenRouter rate limit exceeded")
                elif response.status_code != 200:
                    error_text = await response.aread()
                    raise ProviderError(f"OpenRouter API error: {response.status_code} - {error_text}")
                
                chunk_id = str(uuid.uuid4())
                total_content = ""
                
                async for line in response.aiter_lines():
                    if not line:
                        continue
                    
                    if line.startswith("data: "):
                        data_str = line[6:]  # Remove "data: " prefix
                        
                        if data_str.strip() == "[DONE]":
                            # Final chunk with token usage
                            yield StreamChunk(
                                id=chunk_id,
                                content="",
                                is_complete=True,
                                token_usage=TokenUsage(
                                    prompt_tokens=sum(self.estimate_tokens(msg.content) for msg in messages),
                                    completion_tokens=self.estimate_tokens(total_content),
                                    total_tokens=sum(self.estimate_tokens(msg.content) for msg in messages) + self.estimate_tokens(total_content)
                                ),
                                model=model,
                                metadata={"provider": "openrouter"}
                            )
                            break
                        
                        try:
                            chunk_data = json.loads(data_str)
                            
                            if "choices" in chunk_data and len(chunk_data["choices"]) > 0:
                                choice = chunk_data["choices"][0]
                                delta = choice.get("delta", {})
                                content = delta.get("content", "")
                                
                                if content:
                                    total_content += content
                                    yield StreamChunk(
                                        id=chunk_id,
                                        content=content,
                                        is_complete=False,
                                        model=model,
                                        metadata={"provider": "openrouter"}
                                    )
                        
                        except json.JSONDecodeError:
                            logger.warning(f"Failed to parse OpenRouter chunk: {data_str}")
                            continue
        
        except httpx.RequestError as e:
            logger.error(f"OpenRouter request error: {e}")
            raise ProviderError(f"OpenRouter connection error: {str(e)}")
        except Exception as e:
            logger.error(f"Unexpected OpenRouter error: {e}")
            raise ProviderError(f"OpenRouter error: {str(e)}")
        finally:
            await self.client.aclose()
    
    async def is_available(self) -> bool:
        """Check if OpenRouter is available and API key is valid."""
        if not self.api_key:
            return False
        
        try:
            response = await self.client.get(f"{self.base_url}/models")
            return response.status_code == 200
        except (httpx.RequestError, httpx.HTTPStatusError):
            return False
    
    def get_supported_models(self) -> list[str]:
        """Get list of supported OpenRouter models."""
        return [
            "openai/gpt-4o-mini",
            "openai/gpt-3.5-turbo", 
            "anthropic/claude-3-haiku",
            "anthropic/claude-3-sonnet",
            "google/gemini-pro",
            "meta-llama/llama-3-8b-instruct",
            "mistralai/mistral-7b-instruct",
            "microsoft/wizardlm-2-8x22b"
        ]
    
    async def get_default_model(self) -> str:
        """Get default model for OpenRouter."""
        return "openai/gpt-4o-mini"  # Fast and cost-effective