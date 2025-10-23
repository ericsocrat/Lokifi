"""
AI Service Layer for Lokifi AI Chatbot (J5).

Handles AI interactions with safety features, rate limiting, and provider management.
"""

import logging
import re
import time
from collections import defaultdict, deque
from collections.abc import AsyncGenerator
from datetime import UTC, datetime
from typing import Any

from sqlalchemy.exc import IntegrityError

from app.db.db import get_session
from app.db.models import AIMessage, AIThread
from app.services.ai_provider import ProviderError, StreamChunk
from app.services.ai_provider_manager import ai_provider_manager, get_ai_provider
from app.services.content_moderation import (
    ModerationLevel,
    moderate_ai_input,
    moderate_ai_output,
)

logger = logging.getLogger(__name__)


class RateLimitError(Exception):
    """Raised when rate limit is exceeded."""

    pass


class SafetyFilterError(Exception):
    """Raised when content fails safety filters."""

    pass


class RateLimiter:
    """Rate limiter for AI requests per user."""

    def __init__(self):
        # User ID -> deque of request timestamps
        self.user_requests: dict[int, deque] = defaultdict(lambda: deque(maxlen=100))
        self.cleanup_interval = 3600  # Clean up old entries every hour
        self.last_cleanup = time.time()

    def check_rate_limit(
        self, user_id: int, max_requests: int = 30, window_seconds: int = 3600
    ) -> bool:
        """
        Check if user is within rate limits.
        Default: 30 requests per hour.
        """
        now = time.time()

        # Clean up old entries periodically
        if now - self.last_cleanup > self.cleanup_interval:
            self._cleanup_old_entries()
            self.last_cleanup = now

        user_requests = self.user_requests[user_id]

        # Remove requests outside the time window
        cutoff_time = now - window_seconds
        while user_requests and user_requests[0] < cutoff_time:
            user_requests.popleft()

        # Check if user is within limits
        if len(user_requests) >= max_requests:
            return False

        # Add current request
        user_requests.append(now)
        return True

    def _cleanup_old_entries(self):
        """Remove old entries to prevent memory bloat."""
        cutoff_time = time.time() - 7200  # Keep last 2 hours

        for user_id in list(self.user_requests.keys()):
            requests = self.user_requests[user_id]
            while requests and requests[0] < cutoff_time:
                requests.popleft()

            # Remove empty deques
            if not requests:
                del self.user_requests[user_id]

    def get_user_usage(self, user_id: int, window_seconds: int = 3600) -> dict[str, Any]:
        """Get current usage stats for a user."""
        now = time.time()
        cutoff_time = now - window_seconds

        user_requests = self.user_requests[user_id]
        recent_requests = [req for req in user_requests if req > cutoff_time]

        next_reset = None
        if recent_requests:
            next_reset = datetime.fromtimestamp(recent_requests[0] + window_seconds)

        return {
            "requests_made": len(recent_requests),
            "requests_remaining": max(0, 30 - len(recent_requests)),  # Default limit of 30
            "reset_time": next_reset,
            "window_seconds": window_seconds,
        }


class SafetyFilter:
    """Content safety filter for AI inputs and outputs."""

    # Patterns for potentially harmful content
    HARMFUL_PATTERNS = [
        r"\b(?:hack|exploit|vulnerability|bypass)\b.*\b(?:system|security|admin)\b",
        r"\b(?:generate|create|make)\b.*\b(?:virus|malware|trojan)\b",
        r"\b(?:illegal|ilegal)\b.*\b(?:download|stream|torrent)\b",
        r"\b(?:suicide|self.harm|kill.myself)\b",
        r"\b(?:bomb|weapon|explosive)\b.*\b(?:make|create|build)\b",
    ]

    # Patterns for inappropriate requests
    INAPPROPRIATE_PATTERNS = [
        r"\b(?:nude|naked|sexual)\b.*\b(?:image|photo|picture)\b",
        r"\b(?:drug|cocaine|heroin|meth)\b.*\b(?:make|create|synthesize)\b",
    ]

    def __init__(self):
        self.harmful_regex = re.compile("|".join(self.HARMFUL_PATTERNS), re.IGNORECASE)
        self.inappropriate_regex = re.compile("|".join(self.INAPPROPRIATE_PATTERNS), re.IGNORECASE)

    def check_input(self, text: str) -> bool:
        """Check if input text passes safety filters."""
        if not text or not text.strip():
            return False

        # Check for harmful patterns
        if self.harmful_regex.search(text):
            logger.warning(f"Safety filter blocked harmful input: {text[:100]}...")
            return False

        # Check for inappropriate patterns
        if self.inappropriate_regex.search(text):
            logger.warning(f"Safety filter blocked inappropriate input: {text[:100]}...")
            return False

        # Check length limits
        if len(text) > 10000:  # 10k character limit
            logger.warning("Input exceeds maximum length")
            return False

        return True

    def check_output(self, text: str) -> bool:
        """Check if AI output passes safety filters."""
        if not text:
            return True

        # Basic checks for harmful content in outputs
        # In production, you might use more sophisticated filters
        harmful_outputs = [
            "i can't help",
            "i cannot assist",
            "harmful content",
            "inappropriate request",
        ]

        lower_text = text.lower()
        for pattern in harmful_outputs:
            if pattern in lower_text and len(text) < 200:
                # Short responses containing refusal patterns
                return False

        return True


class AIService:
    """Main AI service for handling chat interactions."""

    def __init__(self):
        self.rate_limiter = RateLimiter()
        self.safety_filter = SafetyFilter()
        self.max_tokens_per_request = 2000
        self.max_messages_per_thread = 100

    async def create_thread(self, user_id: int, title: str | None = None) -> AIThread:
        """Create a new AI chat thread."""
        with get_session() as db:
            # Generate title if not provided
            if not title:
                title = f"Chat {datetime.now(UTC).strftime('%Y-%m-%d %H:%M')}"

            thread = AIThread(
                user_id=user_id,
                title=title[:255],  # Limit title length
                created_at=datetime.now(UTC),
                updated_at=datetime.now(UTC),
            )

            try:
                db.add(thread)
                db.commit()
                db.refresh(thread)
                logger.info(f"Created AI thread {thread.id} for user {user_id}")
                return thread
            except IntegrityError as e:
                db.rollback()
                logger.error(f"Failed to create AI thread: {e}")
                logger.error("AI service error", exc_info=True)
                raise

    async def get_user_threads(
        self, user_id: int, limit: int = 50, offset: int = 0
    ) -> list[AIThread]:
        """Get AI threads for a user."""
        with get_session() as db:
            threads = (
                db.query(AIThread)
                .filter(AIThread.user_id == user_id)
                .order_by(AIThread.updated_at.desc())
                .limit(limit)
                .offset(offset)
                .all()
            )

            return threads

    async def get_thread_messages(
        self, thread_id: int, user_id: int, limit: int = 50
    ) -> list[AIMessage]:
        """Get messages for a thread."""
        with get_session() as db:
            # Verify user owns the thread
            thread = (
                db.query(AIThread)
                .filter(AIThread.id == thread_id, AIThread.user_id == user_id)
                .first()
            )

            if not thread:
                raise ValueError("Thread not found or access denied")

            messages = (
                db.query(AIMessage)
                .filter(AIMessage.thread_id == thread_id)
                .order_by(AIMessage.created_at)
                .limit(limit)
                .all()
            )

            return messages

    async def send_message(
        self,
        user_id: int,
        thread_id: int,
        message: str,
        provider_name: str | None = None,
        model: str | None = None,
    ) -> AsyncGenerator[StreamChunk | AIMessage, None]:
        """
        Send a message and stream the AI response.

        Yields StreamChunk objects during generation, then final AIMessage.
        """
        with get_session() as db:
            # Rate limiting
            if not self.rate_limiter.check_rate_limit(user_id):
                raise RateLimitError(
                    "Rate limit exceeded. Please wait before sending another message."
                )

            # Enhanced safety filtering
            moderation_result = moderate_ai_input(message, user_id)
            if moderation_result.level == ModerationLevel.BLOCKED:
                raise SafetyFilterError(f"Message blocked: {moderation_result.reason}")
            elif moderation_result.level == ModerationLevel.FLAGGED:
                logger.warning(f"Flagged content from user {user_id}: {moderation_result.reason}")
                # Continue but log for review

            # Verify thread ownership
            thread = (
                db.query(AIThread)
                .filter(AIThread.id == thread_id, AIThread.user_id == user_id)
                .first()
            )

            if not thread:
                raise ValueError("Thread not found or access denied")

            # Check message limit per thread
            message_count = db.query(AIMessage).filter(AIMessage.thread_id == thread_id).count()
            if message_count >= self.max_messages_per_thread:
                raise ValueError(
                    f"Thread has reached maximum message limit of {self.max_messages_per_thread}"
                )

            # Save user message
            user_message = AIMessage(
                thread_id=thread_id,
                role="user",
                content=message,
                created_at=datetime.now(UTC),
            )

            db.add(user_message)
            db.commit()
            db.refresh(user_message)

            # Get AI provider
            try:
                provider = await get_ai_provider(provider_name)
            except Exception as e:
                logger.error(f"Failed to get AI provider: {e}")
                logger.error("AI service error", exc_info=True)
                raise ProviderError("AI service temporarily unavailable")

            # Prepare conversation history
            recent_messages = (
                db.query(AIMessage)
                .filter(AIMessage.thread_id == thread_id)
                .order_by(AIMessage.created_at.desc())
                .limit(20)
                .all()
            )

            # Convert to AI provider format
            from app.services.ai_provider import AIMessage as AIProviderMessage
            from app.services.ai_provider import MessageRole, StreamOptions

            conversation_history = []
            for msg in reversed(recent_messages):
                conversation_history.append(
                    AIProviderMessage(
                        role=MessageRole.USER if msg.role == "user" else MessageRole.ASSISTANT,
                        content=msg.content,
                    )
                )

            # Generate AI response
            ai_message = AIMessage(
                thread_id=thread_id,
                role="assistant",
                content="",
                model=model or await provider.get_default_model(),
                provider=provider.name,
                created_at=datetime.now(UTC),
            )

            db.add(ai_message)
            db.commit()
            db.refresh(ai_message)

            response_content = ""
            token_count = 0

            try:
                # Stream the response
                stream_options = StreamOptions(max_tokens=self.max_tokens_per_request, model=model)

                stream_generator = await provider.stream_chat(
                    messages=conversation_history, options=stream_options
                )

                async for chunk in stream_generator:
                    # Check token limits
                    if token_count > self.max_tokens_per_request:
                        chunk.content = "\n\n[Response truncated - token limit reached]"
                        chunk.is_complete = True

                    response_content += chunk.content
                    token_count += 1

                    # Yield the chunk to the client
                    yield chunk

                    # Stop if we've reached the end
                    if chunk.is_complete:
                        break

                # Enhanced safety check the final response
                output_moderation = moderate_ai_output(response_content)
                if output_moderation.level == ModerationLevel.BLOCKED:
                    response_content = (
                        "I apologize, but I can't provide a response to that request."
                    )
                    logger.warning(f"AI output blocked: {output_moderation.reason}")

                # Update the message with final content
                ai_message.content = response_content
                ai_message.token_count = token_count
                ai_message.completed_at = datetime.now(UTC)

                # Update thread timestamp
                thread.updated_at = datetime.now(UTC)

                db.commit()
                db.refresh(ai_message)

                # Yield the final message
                yield ai_message

            except Exception as e:
                logger.error(f"AI generation error: {e}")

                # Log exception with context
                sentry_sdk.capture_exception(
                    e,
                    extras={
                        "user_id": user_id,
                        "thread_id": thread_id,
                        "provider": provider.name if provider else "unknown",
                        "model": model,
                        "message_length": len(message),
                    },
                )

                # Update message with error
                ai_message.content = (
                    "I apologize, but I encountered an error while generating a response."
                )
                ai_message.error = str(e)
                ai_message.completed_at = datetime.now(UTC)

                db.commit()
                db.refresh(ai_message)

                yield ai_message

    async def delete_thread(self, user_id: int, thread_id: int) -> bool:
        """Delete a thread and all its messages."""
        with get_session() as db:
            # Verify ownership
            thread = (
                db.query(AIThread)
                .filter(AIThread.id == thread_id, AIThread.user_id == user_id)
                .first()
            )

            if not thread:
                return False

            # Delete messages first (foreign key constraint)
            db.query(AIMessage).filter(AIMessage.thread_id == thread_id).delete()

            # Delete thread
            db.delete(thread)
            db.commit()

            logger.info(f"Deleted AI thread {thread_id} for user {user_id}")
            return True

    async def update_thread_title(
        self, user_id: int, thread_id: int, title: str
    ) -> AIThread | None:
        """Update thread title."""
        with get_session() as db:
            thread = (
                db.query(AIThread)
                .filter(AIThread.id == thread_id, AIThread.user_id == user_id)
                .first()
            )

            if not thread:
                return None

            thread.title = title[:255]
            thread.updated_at = datetime.now(UTC)

            db.commit()
            db.refresh(thread)

            return thread

    def get_rate_limit_status(self, user_id: int) -> dict[str, Any]:
        """Get rate limit status for a user."""
        return self.rate_limiter.get_user_usage(user_id)

    async def get_provider_status(self) -> dict[str, Any]:
        """Get status of all AI providers."""
        return await ai_provider_manager.get_provider_status()


# Global service instance
ai_service = AIService()
