"""
AI Context Management Service for Lokifi AI Chatbot (J5.2).

Handles conversation context, memory, and intelligent summarization.
"""

import json
import logging
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from typing import Any

from sqlalchemy import desc
from sqlalchemy.orm import Session

from app.db.db import get_session
from app.db.models import AIMessage, AIThread
from app.services.ai_provider import AIMessage as AIProviderMessage
from app.services.ai_provider import MessageRole
from app.services.ai_provider_manager import ai_provider_manager

logger = logging.getLogger(__name__)


@dataclass
class ContextSummary:
    """Summarized conversation context."""

    summary: str
    key_points: list[str]
    user_preferences: dict[str, Any]
    conversation_tone: str
    topic_tags: list[str]
    created_at: datetime


@dataclass
class ConversationMemory:
    """Long-term memory for a conversation."""

    thread_id: int
    user_id: int
    context_summary: ContextSummary
    important_facts: list[str]
    user_style_notes: list[str]
    preferred_response_style: str
    last_updated: datetime


class AIContextManager:
    """Manages AI conversation context and memory."""

    def __init__(self):
        self.session_factory = get_session
        self.context_cache: dict[int, ConversationMemory] = {}
        self.max_context_length = 4000  # Max tokens for context
        self.summary_threshold = 20  # Summarize after 20 messages

    async def get_conversation_context(
        self, thread_id: int, user_id: int, max_messages: int = 50
    ) -> tuple[list[AIProviderMessage], ContextSummary | None]:
        """
        Get conversation context with intelligent summarization.
        Returns recent messages and optional summary of older context.
        """

        with self.session_factory() as db:
            # Get recent messages
            recent_messages = (
                db.query(AIMessage)
                .filter(AIMessage.thread_id == thread_id)
                .order_by(desc(AIMessage.created_at))
                .limit(max_messages)
                .all()
            )

            recent_messages = list(reversed(recent_messages))

            # Convert to provider format
            provider_messages = []
            for msg in recent_messages:
                role = MessageRole.USER if msg.role == "user" else MessageRole.ASSISTANT
                provider_messages.append(AIProviderMessage(role=role, content=msg.content))

            # Check if we need to summarize older context
            total_message_count = (
                db.query(AIMessage).filter(AIMessage.thread_id == thread_id).count()
            )

            context_summary = None
            if total_message_count > self.summary_threshold:
                context_summary = await self._get_or_create_context_summary(
                    db, thread_id, user_id, max_messages
                )

            return provider_messages, context_summary

    async def update_user_preferences(self, user_id: int, preferences: dict[str, Any]) -> None:
        """Update user preferences for AI interactions."""

        # Store in cache (in production, store in database)
        # TODO: Implement actual caching with key f"user_prefs_{user_id}"
        # In a real implementation, store in database or Redis
        logger.info(f"Updated preferences for user {user_id}: {preferences}")

    async def analyze_conversation_style(self, thread_id: int) -> dict[str, Any]:
        """Analyze conversation style and user preferences."""

        with self.session_factory() as db:
            user_messages = (
                db.query(AIMessage.content)
                .filter(AIMessage.thread_id == thread_id, AIMessage.role == "user")
                .all()
            )

            if not user_messages:
                return {"style": "neutral", "preferences": {}}

            # Simple style analysis (in production, use NLP)
            all_text = " ".join([msg[0] for msg in user_messages])

            style_indicators = {
                "formal": ["please", "thank you", "appreciate", "kindly", "would you"],
                "casual": ["hey", "cool", "awesome", "yeah", "ok", "thanks"],
                "technical": ["algorithm", "function", "implementation", "optimize", "debug"],
                "creative": ["imagine", "creative", "brainstorm", "innovative", "design"],
            }

            style_scores = {}
            text_lower = all_text.lower()

            for style, indicators in style_indicators.items():
                score = sum(1 for indicator in indicators if indicator in text_lower)
                style_scores[style] = score

            # Determine dominant style
            dominant_style = (
                max(style_scores.keys(), key=lambda k: style_scores.get(k, 0))
                if style_scores
                else "neutral"
            )

            # Extract preferences
            preferences = {
                "prefers_detailed_responses": len(all_text) > 500,
                "uses_technical_language": style_scores.get("technical", 0) > 2,
                "communication_style": dominant_style,
                "avg_message_length": len(all_text) / len(user_messages),
            }

            return {
                "style": dominant_style,
                "preferences": preferences,
                "style_scores": style_scores,
            }

    async def create_context_summary(
        self, thread_id: int, messages: list[AIMessage]
    ) -> ContextSummary:
        """Create an intelligent summary of conversation context."""

        if not messages:
            return ContextSummary(
                summary="Empty conversation",
                key_points=[],
                user_preferences={},
                conversation_tone="neutral",
                topic_tags=[],
                created_at=datetime.now(UTC),
            )

        # Prepare conversation text
        conversation_text = "\\n".join(
            [f"{msg.role}: {msg.content}" for msg in messages[-30:]]  # Last 30 messages
        )

        try:
            # Use AI to create summary
            provider = await ai_provider_manager.get_primary_provider()  # Use available method
            if provider:
                summary_prompt = f"""
                Please create a concise summary of this AI conversation. Focus on:
                1. Main topics discussed
                2. User's key questions or requests
                3. Important information established
                4. User's communication style

                Conversation:
                {conversation_text}

                Provide a JSON response with: summary, key_points (array), conversation_tone, topic_tags (array)
                """

                summary_messages = [
                    AIProviderMessage(role=MessageRole.USER, content=summary_prompt)
                ]

                summary_response = ""
                async for chunk in provider.stream_chat(summary_messages):
                    if chunk.content:
                        summary_response += chunk.content

                # Parse AI response
                try:
                    parsed_summary = json.loads(summary_response)
                    return ContextSummary(
                        summary=parsed_summary.get("summary", "Conversation summary"),
                        key_points=parsed_summary.get("key_points", []),
                        user_preferences={},
                        conversation_tone=parsed_summary.get("conversation_tone", "neutral"),
                        topic_tags=parsed_summary.get("topic_tags", []),
                        created_at=datetime.now(UTC),
                    )
                except json.JSONDecodeError:
                    # Fallback to simple text summary
                    return ContextSummary(
                        summary=summary_response[:500],
                        key_points=[],
                        user_preferences={},
                        conversation_tone="neutral",
                        topic_tags=[],
                        created_at=datetime.now(UTC),
                    )
        except Exception as e:
            logger.error(f"Failed to create AI summary: {e}")

        # Fallback: simple rule-based summary
        return self._create_fallback_summary(messages)

    def _create_fallback_summary(self, messages: list[AIMessage]) -> ContextSummary:
        """Create a simple rule-based summary as fallback."""

        user_messages = [msg for msg in messages if msg.role == "user"]

        # Extract key topics (simple keyword analysis)
        all_text = " ".join([msg.content for msg in user_messages])
        words = all_text.lower().split()

        # Simple topic detection
        topic_keywords = {
            "programming": ["code", "function", "algorithm", "bug", "programming"],
            "data": ["data", "analysis", "chart", "statistics", "database"],
            "business": ["business", "strategy", "market", "revenue", "profit"],
            "general": ["help", "question", "information", "explain", "how"],
        }

        detected_topics = []
        for topic, keywords in topic_keywords.items():
            if any(keyword in words for keyword in keywords):
                detected_topics.append(topic)

        summary = f"Conversation about {', '.join(detected_topics) if detected_topics else 'general topics'}"

        return ContextSummary(
            summary=summary,
            key_points=[f"Discussion involving {len(user_messages)} user messages"],
            user_preferences={},
            conversation_tone="neutral",
            topic_tags=detected_topics,
            created_at=datetime.now(UTC),
        )

    async def _get_or_create_context_summary(
        self, db: Session, thread_id: int, user_id: int, recent_message_limit: int
    ) -> ContextSummary | None:
        """Get existing context summary or create a new one."""

        # Check cache first
        if thread_id in self.context_cache:
            memory = self.context_cache[thread_id]
            if memory.last_updated > datetime.now(UTC) - timedelta(hours=1):
                return memory.context_summary

        # Get older messages (excluding recent ones)
        older_messages = (
            db.query(AIMessage)
            .filter(AIMessage.thread_id == thread_id)
            .order_by(AIMessage.created_at)
            .offset(recent_message_limit)
            .all()
        )

        if older_messages:
            summary = await self.create_context_summary(thread_id, older_messages)

            # Cache the memory
            memory = ConversationMemory(
                thread_id=thread_id,
                user_id=user_id,
                context_summary=summary,
                important_facts=[],
                user_style_notes=[],
                preferred_response_style="adaptive",
                last_updated=datetime.now(UTC),
            )
            self.context_cache[thread_id] = memory

            return summary

        return None

    async def get_user_context_across_threads(self, user_id: int, limit: int = 5) -> dict[str, Any]:
        """Get context about user across all their conversations."""

        with self.session_factory() as db:
            # Get user's recent threads
            recent_threads = (
                db.query(AIThread)
                .filter(AIThread.user_id == user_id)
                .order_by(desc(AIThread.updated_at))
                .limit(limit)
                .all()
            )

            # Aggregate insights
            all_topics = []
            communication_styles = []

            for thread in recent_threads:
                style_analysis = await self.analyze_conversation_style(thread.id)
                all_topics.extend(style_analysis.get("topic_tags", []))
                communication_styles.append(style_analysis.get("style", "neutral"))

            # Determine dominant patterns
            from collections import Counter

            topic_counter = Counter(all_topics)
            style_counter = Counter(communication_styles)

            return {
                "user_id": user_id,
                "favorite_topics": [topic for topic, _ in topic_counter.most_common(5)],
                "dominant_communication_style": (
                    style_counter.most_common(1)[0][0] if style_counter else "neutral"
                ),
                "total_conversations": len(recent_threads),
                "context_insights": {
                    "prefers_detailed": any("technical" in style for style in communication_styles),
                    "casual_communication": "casual" in communication_styles,
                    "active_user": len(recent_threads) > 2,
                },
            }


# Global service instance
ai_context_manager = AIContextManager()
