# AsyncGenerator Mocking Pattern

**Category**: Testing
**Difficulty**: 🟡 Intermediate
**Success Rate**: 100% (2/2 sessions - AIService Gap 1, NotificationService test fixes)
**Impact**: 🚀 Critical (enables streaming API testing)
**Time Investment**: 30-45 minutes
**Sessions Used**: AIService Gap 1, NotificationService

---

## Problem

Streaming APIs (AI chat, SSE, WebSocket) use **async generators** to yield data chunks. Testing requires mocking async generators to control streaming behavior without real network calls.

**Streaming Service Pattern**:
```python
async def send_message(self, message: str) -> AsyncGenerator[StreamChunk, None]:
    """Stream AI response chunks."""
    async for chunk in ai_provider.stream_chat(message):
        yield chunk  # AsyncGenerator
    yield final_message
```

## Solution

**Pattern**: Define mock async generator function, attach to mock method.

```python
# Define mock async generator
async def mock_stream():
    yield StreamChunk(id="1", content="Hello", is_complete=False)
    yield StreamChunk(id="2", content=" world", is_complete=True)

# Attach to mock
mock_provider = AsyncMock()
mock_provider.stream_chat = AsyncMock(return_value=mock_stream())

# Execute and collect chunks
chunks = []
async for item in ai_service.send_message(user_id, thread_id, message):
    if hasattr(item, 'is_complete'):
        chunks.append(item)

assert len(chunks) == 2
assert chunks[0].content == "Hello"
```

## Complete Example

```python
from app.services.ai_provider import StreamChunk
from uuid import uuid4

class TestAIServiceStreaming:
    @pytest.fixture
    def mock_stream_response(self):
        """Mock streaming AI response."""
        async def mock_stream():
            # Yield multiple chunks
            yield StreamChunk(
                id=str(uuid4()),
                content="I can help",
                is_complete=False
            )
            yield StreamChunk(
                id=str(uuid4()),
                content=" with that!",
                is_complete=False
            )
            yield StreamChunk(
                id=str(uuid4()),
                content="",
                is_complete=True  # Final chunk
            )
        return mock_stream

    @pytest.mark.asyncio
    async def test_send_message_streaming(
        self, mock_stream_response
    ):
        """Should stream AI response chunks."""
        # Arrange
        mock_db = AsyncMock()
        mock_provider = AsyncMock()
        mock_provider.stream_chat = AsyncMock(
            return_value=mock_stream_response()
        )

        ai_service = AIService(
            db=mock_db,
            ai_provider=mock_provider
        )

        user_id = uuid4()
        thread_id = uuid4()
        message = "Hello AI!"

        # Act - Collect streamed chunks
        chunks = []
        final_message = None

        async for item in ai_service.send_message(
            user_id, thread_id, message
        ):
            if hasattr(item, 'is_complete'):
                chunks.append(item)
            else:
                final_message = item

        # Assert
        assert len(chunks) == 3
        assert chunks[0].content == "I can help"
        assert chunks[0].is_complete is False
        assert chunks[1].content == " with that!"
        assert chunks[2].is_complete is True

        # Final message should be AIMessage
        assert final_message is not None
        assert final_message.content == "I can help with that!"

    @pytest.mark.asyncio
    async def test_stream_error_handling(self):
        """Should handle streaming errors gracefully."""
        # Arrange - Mock stream that raises exception
        async def faulty_stream():
            yield StreamChunk(id="1", content="Start", is_complete=False)
            raise Exception("Stream error!")

        mock_provider = AsyncMock()
        mock_provider.stream_chat = AsyncMock(
            return_value=faulty_stream()
        )

        ai_service = AIService(db=mock_db, ai_provider=mock_provider)

        # Act & Assert
        with pytest.raises(Exception, match="Stream error"):
            async for _ in ai_service.send_message(user_id, thread_id, "test"):
                pass
```

## Database Session AsyncGenerator

**Pattern**: Mock `db_manager.get_session()` returning async generator.

```python
# Service code
async for session in db_manager.get_session():
    result = await session.execute(query)
    # ...

# Test code
async def mock_get_session(*args, **kwargs):
    yield mock_db_session  # Yield session once

mock_db_manager.get_session.return_value = mock_get_session()

# Service can now use `async for session in db_manager.get_session():`
```

## Anti-Patterns

### ❌ Don't: Return list instead of generator

```python
# ❌ BAD: Returning list (not async generator)
mock_provider.stream_chat = AsyncMock(
    return_value=[chunk1, chunk2]  # List, not generator!
)

# Can't use: async for chunk in stream
# TypeError: 'list' object is not an async iterator

# ✅ GOOD: Return async generator
async def mock_stream():
    for chunk in [chunk1, chunk2]:
        yield chunk

mock_provider.stream_chat = AsyncMock(return_value=mock_stream())
```

### ❌ Don't: Forget to call generator function

```python
# ❌ BAD: Assigned generator function (not called)
mock_provider.stream_chat = mock_stream  # Missing ()

# ✅ GOOD: Call generator function to get generator object
mock_provider.stream_chat = AsyncMock(return_value=mock_stream())
```

## When to Use

- ✅ AI/LLM streaming APIs (chat, completion)
- ✅ Server-Sent Events (SSE)
- ✅ WebSocket streaming
- ✅ File upload/download progress
- ✅ Database session managers (async context managers)
- ❌ Simple async methods returning single value (use AsyncMock)

## References

- **Session**: AIService Gap 1 (+28pp!)
- **Commit**: c15c7490
- **Breakthrough**: Enabled streaming API testing
