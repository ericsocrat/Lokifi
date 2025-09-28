"""
Hugging Face Inference API provider for Fynix AI Chatbot (J5).
"""

import json
import uuid
import logging
from typing import List, AsyncGenerator, Optional

import httpx
from app.services.ai_provider import (
    AIProvider, AIMessage, StreamOptions, StreamChunk, TokenUsage,
    ProviderError, ProviderUnavailableError, ProviderRateLimitError,
    ProviderAuthenticationError
)

logger = logging.getLogger(__name__)


class HuggingFaceProvider(AIProvider):
    """Hugging Face Inference API provider implementation."""
    
    def __init__(self, api_key: Optional[str] = None):
        super().__init__(api_key)
        self.name = "huggingface"
        self.base_url = "https://api-inference.huggingface.co/models"
        self.client = httpx.AsyncClient(
            timeout=httpx.Timeout(120.0),  # HF can be slower
            headers={
                "Authorization": f"Bearer {self.api_key}" if self.api_key else "",
                "Content-Type": "application/json"
            }
        )
    
    async def stream_chat(
        self,
        messages: List[AIMessage],
        options: StreamOptions = StreamOptions()
    ) -> AsyncGenerator[StreamChunk, None]:
        """Stream chat completion from Hugging Face."""
        
        if not self.api_key:
            raise ProviderUnavailableError("Hugging Face API key not configured")
        
        if not self.validate_messages(messages):
            raise ProviderError("Invalid messages format")
        
        # Convert messages to a single prompt (HF doesn't have native chat API)
        prompt = self._messages_to_prompt(messages)
        
        # Select model
        model = options.model or "microsoft/DialoGPT-medium"
        
        payload = {
            "inputs": prompt,
            "parameters": {
                "max_new_tokens": min(options.max_tokens, 2048),  # HF limits
                "temperature": options.temperature,
                "top_p": options.top_p,
                "do_sample": True,
                "return_full_text": False
            },
            "options": {
                "wait_for_model": True,
                "use_cache": False
            }
        }
        
        try:
            async with self.client.stream(
                "POST",
                f"{self.base_url}/{model}",
                json=payload
            ) as response:
                
                if response.status_code == 401:
                    raise ProviderAuthenticationError("Invalid Hugging Face API key")
                elif response.status_code == 429:
                    raise ProviderRateLimitError("Hugging Face rate limit exceeded")
                elif response.status_code == 503:
                    # Model loading - try non-streaming response
                    async for chunk in self._fallback_non_streaming(model, payload, messages):
                        yield chunk
                    return
                elif response.status_code != 200:
                    error_text = await response.aread()
                    raise ProviderError(f"Hugging Face API error: {response.status_code} - {error_text}")
                
                chunk_id = str(uuid.uuid4())
                full_response = ""
                
                # HF doesn't have true streaming for most models, so we'll simulate it
                async for chunk in response.aiter_bytes():
                    if chunk:
                        try:
                            # Try to parse as complete response
                            chunk_str = chunk.decode('utf-8')
                            if chunk_str:
                                response_data = json.loads(chunk_str)
                                
                                if isinstance(response_data, list) and len(response_data) > 0:
                                    generated_text = response_data[0].get("generated_text", "")
                                elif isinstance(response_data, dict):
                                    generated_text = response_data.get("generated_text", "")
                                else:
                                    generated_text = str(response_data)
                                
                                if generated_text and generated_text != full_response:
                                    # Simulate streaming by chunking the response
                                    async for chunk in self._simulate_streaming(
                                        generated_text, 
                                        chunk_id, 
                                        model, 
                                        messages
                                    ):
                                        yield chunk
                                    full_response = generated_text
                                    return
                        
                        except (json.JSONDecodeError, UnicodeDecodeError):
                            # If not JSON, treat as raw text
                            text_chunk = chunk.decode('utf-8', errors='ignore')
                            if text_chunk:
                                full_response += text_chunk
                
                # If we get here without streaming, send the full response
                if full_response:
                    async for chunk in self._simulate_streaming(full_response, chunk_id, model, messages):
                        yield chunk
        
        except httpx.RequestError as e:
            logger.error(f"Hugging Face request error: {e}")
            raise ProviderError(f"Hugging Face connection error: {str(e)}")
        except Exception as e:
            logger.error(f"Unexpected Hugging Face error: {e}")
            raise ProviderError(f"Hugging Face error: {str(e)}")
        finally:
            await self.client.aclose()
    
    async def _simulate_streaming(
        self, 
        full_text: str, 
        chunk_id: str, 
        model: str, 
        messages: List[AIMessage]
    ) -> AsyncGenerator[StreamChunk, None]:
        """Simulate streaming by chunking the response."""
        words = full_text.split()
        
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
                model=model,
                metadata={"provider": "huggingface", "simulated_streaming": True}
            )
            
            # Small delay to simulate real streaming
            import asyncio
            await asyncio.sleep(0.03)
    
    async def _fallback_non_streaming(
        self, 
        model: str, 
        payload: dict, 
        messages: List[AIMessage]
    ) -> AsyncGenerator[StreamChunk, None]:
        """Fallback to non-streaming request when model is loading."""
        try:
            response = await self.client.post(
                f"{self.base_url}/{model}",
                json=payload
            )
            
            if response.status_code == 200:
                result = response.json()
                if isinstance(result, list) and len(result) > 0:
                    generated_text = result[0].get("generated_text", "")
                    chunk_id = str(uuid.uuid4())
                    
                    async for chunk in self._simulate_streaming(generated_text, chunk_id, model, messages):
                        yield chunk
                    return
            
            # If fallback fails, yield an error message
            chunk_id = str(uuid.uuid4())
            yield StreamChunk(
                id=chunk_id,
                content="Model is currently loading. Please try again in a few moments.",
                is_complete=True,
                model=model,
                metadata={"provider": "huggingface", "error": "model_loading"}
            )
        
        except Exception as e:
            logger.error(f"Hugging Face fallback error: {e}")
            chunk_id = str(uuid.uuid4())
            yield StreamChunk(
                id=chunk_id,
                content="Sorry, I'm currently unavailable. Please try again later.",
                is_complete=True,
                model=model,
                metadata={"provider": "huggingface", "error": str(e)}
            )
    
    def _messages_to_prompt(self, messages: List[AIMessage]) -> str:
        """Convert chat messages to a single prompt for HF models."""
        prompt_parts = []
        
        for msg in messages:
            if msg.role.value == "system":
                prompt_parts.append(f"System: {msg.content}")
            elif msg.role.value == "user":
                prompt_parts.append(f"Human: {msg.content}")
            elif msg.role.value == "assistant":
                prompt_parts.append(f"Assistant: {msg.content}")
        
        prompt_parts.append("Assistant:")
        return "\n\n".join(prompt_parts)
    
    async def is_available(self) -> bool:
        """Check if Hugging Face is available and API key is valid."""
        if not self.api_key:
            return False
        
        try:
            # Test with a simple model status check
            response = await self.client.get(
                "https://huggingface.co/api/models/microsoft/DialoGPT-medium",
                headers={"Authorization": f"Bearer {self.api_key}"}
            )
            return response.status_code in [200, 404]  # 404 is also fine, means auth works
        except:
            return False
    
    def get_supported_models(self) -> List[str]:
        """Get list of supported Hugging Face models."""
        return [
            "microsoft/DialoGPT-medium",
            "microsoft/DialoGPT-large", 
            "facebook/blenderbot-400M-distill",
            "facebook/blenderbot-1B-distill",
            "HuggingFaceH4/zephyr-7b-beta",
            "mistralai/Mistral-7B-Instruct-v0.1",
            "meta-llama/Llama-2-7b-chat-hf",
            "google/flan-t5-large"
        ]
    
    async def get_default_model(self) -> str:
        """Get default model for Hugging Face."""
        return "microsoft/DialoGPT-medium"