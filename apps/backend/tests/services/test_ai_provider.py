import asyncio
from collections.abc import AsyncIterator
from unittest.mock import patch

import pytest

from app.services.ai_provider import (
    AIMessage,
    AIProvider,
    MessageRole,
    MockProvider,
    StreamChunk,
    StreamOptions,
)


class DummyProvider(AIProvider):
    async def stream_chat(
        self, messages: list[AIMessage], options: StreamOptions = StreamOptions()
    ) -> AsyncIterator[StreamChunk]:
        yield StreamChunk(id="1", content="ok", is_complete=True)

    async def is_available(self) -> bool:
        return True

    def get_supported_models(self) -> list[str]:
        return ["m1", "m2"]


@pytest.mark.asyncio
async def test_validate_messages_cases():
    p = DummyProvider()

    # Empty list invalid
    assert p.validate_messages([]) is False

    # No user role invalid
    msgs = [AIMessage(role=MessageRole.SYSTEM, content="ctx")]
    assert p.validate_messages(msgs) is False

    # Too-long content invalid
    long_msg = AIMessage(role=MessageRole.USER, content="x" * 50001)
    assert p.validate_messages([long_msg]) is False

    # Valid case
    ok = [AIMessage(role=MessageRole.USER, content="hello")]
    assert p.validate_messages(ok) is True


def test_estimate_tokens_minimum_and_scaling():
    p = DummyProvider()
    assert p.estimate_tokens("") == 1
    assert p.estimate_tokens("hey") == 1  # 3/4 → 0, min 1
    assert p.estimate_tokens("abcdefgh") == 2  # 8/4 → 2


@pytest.mark.asyncio
async def test_default_model_uses_first_supported():
    p = DummyProvider()
    m = await p.get_default_model()
    assert m == "m1"


class EmptyModelsProvider(DummyProvider):
    def get_supported_models(self) -> list[str]:
        return []


@pytest.mark.asyncio
async def test_default_model_unknown_when_no_models():
    p = EmptyModelsProvider()
    m = await p.get_default_model()
    assert m == "unknown"


@pytest.mark.asyncio
async def test_mock_provider_streaming_chunks_and_token_usage():
    provider = MockProvider()
    messages = [
        AIMessage(role=MessageRole.USER, content="hello there"),
        AIMessage(role=MessageRole.SYSTEM, content="be helpful"),
    ]

    # Speed up tests by removing the sleep inside stream_chat
    async def fast_sleep(_):
        return None

    with patch.object(asyncio, "sleep", side_effect=fast_sleep):
        chunks = []
        async for c in provider.stream_chat(messages):
            chunks.append(c)

    assert len(chunks) > 1
    # Last chunk should be complete and contain token usage
    last = chunks[-1]
    assert last.is_complete is True
    assert last.model == "mock-model"
    assert last.metadata.get("provider") == "mock"
    assert last.metadata.get("demo") is True
    assert last.token_usage is not None


@pytest.mark.asyncio
async def test_mock_provider_is_available_and_models():
    provider = MockProvider()
    assert await provider.is_available() is True
    models = provider.get_supported_models()
    assert "mock-model" in models
