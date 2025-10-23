"""
Ollama local AI provider for Lokifi AI Chatbot (J5).
"""

import json
import logging
import uuid
from collections.abc import AsyncGenerator

import httpx

from app.services.ai_provider import (
    AIMessage,
    AIProvider,
    ProviderError,
    ProviderUnavailableError,
    StreamChunk,
    StreamOptions,
    TokenUsage,
)

logger = logging.getLogger(__name__)


class OllamaProvider(AIProvider):
    """Ollama local AI provider implementation."""
    
    def __init__(self, base_url: str | None = None):
        super().__init__(api_key=None, base_url=base_url or "http://localhost:11434")
        self.name = "ollama"
        self.client = httpx.AsyncClient(
            timeout=httpx.Timeout(300.0),  # Ollama can be slow
            headers={"Content-Type": "application/json"}
        )
    
    async def stream_chat(
        self,
        messages: list[AIMessage],
        options: StreamOptions = StreamOptions()
    ) -> AsyncGenerator[StreamChunk, None]:
        """Stream chat completion from Ollama."""
        
        if not self.validate_messages(messages):
            raise ProviderError("Invalid messages format")
        
        # Convert messages to Ollama format
        ollama_messages = []
        for msg in messages:
            ollama_messages.append({
                "role": msg.role.value,
                "content": msg.content
            })
        
        # Select model
        model = options.model or "llama3.1:8b"
        
        payload = {
            "model": model,
            "messages": ollama_messages,
            "stream": True,
            "options": {
                "num_predict": min(options.max_tokens, 8192),
                "temperature": options.temperature,
                "top_p": options.top_p,
                "stop": options.stop_sequences[:4] if options.stop_sequences else None
            }
        }
        
        try:
            async with self.client.stream(
                "POST",
                f"{self.base_url}/api/chat",
                json=payload
            ) as response:
                
                if response.status_code == 404:
                    # Try to pull the model first
                    try:
                        await self._pull_model(model)
                        # Retry after pulling
                        async with self.client.stream(
                            "POST",
                            f"{self.base_url}/api/chat",
                            json=payload
                        ) as retry_response:
                            async for chunk in self._process_stream(retry_response, model, messages):
                                yield chunk
                        return
                    except (httpx.RequestError, httpx.HTTPStatusError, Exception):
                        raise ProviderError(f"Model {model} not available and could not be pulled")
                
                elif response.status_code != 200:
                    error_text = await response.aread()
                    raise ProviderError(f"Ollama API error: {response.status_code} - {error_text}")
                
                async for chunk in self._process_stream(response, model, messages):
                    yield chunk
        
        except httpx.ConnectError:
            raise ProviderUnavailableError(
                f"Could not connect to Ollama at {self.base_url}. "
                "Make sure Ollama is running locally."
            )
        except httpx.RequestError as e:
            logger.error(f"Ollama request error: {e}")
            raise ProviderError(f"Ollama connection error: {e!s}")
        except Exception as e:
            logger.error(f"Unexpected Ollama error: {e}")
            raise ProviderError(f"Ollama error: {e!s}")
        finally:
            await self.client.aclose()
    
    async def _process_stream(
        self, 
        response: httpx.Response, 
        model: str, 
        messages: list[AIMessage]
    ) -> AsyncGenerator[StreamChunk, None]:
        """Process Ollama streaming response."""
        chunk_id = str(uuid.uuid4())
        total_content = ""
        
        async for line in response.aiter_lines():
            if not line:
                continue
            
            try:
                chunk_data = json.loads(line)
                
                # Check if this is the final chunk
                if chunk_data.get("done", False):
                    # Final chunk with metadata
                    eval_count = chunk_data.get("eval_count", 0)
                    prompt_eval_count = chunk_data.get("prompt_eval_count", 0)
                    
                    yield StreamChunk(
                        id=chunk_id,
                        content="",
                        is_complete=True,
                        token_usage=TokenUsage(
                            prompt_tokens=prompt_eval_count,
                            completion_tokens=eval_count,
                            total_tokens=prompt_eval_count + eval_count
                        ),
                        model=model,
                        metadata={
                            "provider": "ollama",
                            "eval_duration": chunk_data.get("eval_duration"),
                            "load_duration": chunk_data.get("load_duration"),
                            "prompt_eval_duration": chunk_data.get("prompt_eval_duration")
                        }
                    )
                    break
                
                # Get message content
                message = chunk_data.get("message", {})
                content = message.get("content", "")
                
                if content:
                    total_content += content
                    yield StreamChunk(
                        id=chunk_id,
                        content=content,
                        is_complete=False,
                        model=model,
                        metadata={"provider": "ollama"}
                    )
            
            except json.JSONDecodeError:
                logger.warning(f"Failed to parse Ollama chunk: {line}")
                continue
    
    async def _pull_model(self, model: str) -> bool:
        """Pull a model if it's not available locally."""
        try:
            logger.info(f"Pulling Ollama model: {model}")
            
            async with self.client.stream(
                "POST",
                f"{self.base_url}/api/pull",
                json={"name": model}
            ) as response:
                
                if response.status_code == 200:
                    # Just consume the stream, don't need to process it
                    async for _line in response.aiter_lines():
                        pass
                    return True
                
                return False
        
        except Exception as e:
            logger.error(f"Failed to pull Ollama model {model}: {e}")
            return False
    
    async def is_available(self) -> bool:
        """Check if Ollama is available."""
        try:
            response = await self.client.get(f"{self.base_url}/api/tags")
            return response.status_code == 200
        except (httpx.RequestError, httpx.HTTPStatusError, ConnectionError):
            return False
    
    def get_supported_models(self) -> list[str]:
        """Get list of supported Ollama models."""
        return [
            "llama3.1:8b",
            "llama3.1:70b",
            "llama3:8b",
            "llama3:70b",
            "mistral:7b",
            "mixtral:8x7b",
            "codellama:7b",
            "codellama:13b",
            "phi3:mini",
            "phi3:medium",
            "gemma:7b",
            "qwen2:7b"
        ]
    
    async def get_default_model(self) -> str:
        """Get default model for Ollama."""
        return "llama3.1:8b"
    
    async def get_available_models(self) -> list[str]:
        """Get models that are actually available locally."""
        try:
            response = await self.client.get(f"{self.base_url}/api/tags")
            if response.status_code == 200:
                data = response.json()
                models = data.get("models", [])
                return [model.get("name", "") for model in models if model.get("name")]
            return []
        except (httpx.RequestError, httpx.HTTPStatusError, ValueError):
            return []