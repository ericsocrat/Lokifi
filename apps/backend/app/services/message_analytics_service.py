"""
Message analytics service for J4 Direct Messages.
"""

import uuid
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from typing import Any

from sqlalchemy import and_, desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.conversation import Conversation, ConversationParticipant, Message
from app.models.user import User


@dataclass
class UserMessageStats:
    """User messaging statistics."""

    user_id: uuid.UUID
    username: str
    total_messages: int
    total_conversations: int
    avg_messages_per_conversation: float
    most_active_day: str | None = None
    most_active_hour: int | None = None
    response_time_avg_minutes: float | None = None


@dataclass
class ConversationAnalytics:
    """Analytics for a specific conversation."""

    conversation_id: uuid.UUID
    total_messages: int
    total_participants: int
    messages_by_day: dict[str, int]
    messages_by_user: dict[str, int]
    avg_response_time_minutes: float
    most_active_period: str


class MessageAnalyticsService:
    """Service for generating message analytics and insights."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_user_message_stats(
        self, user_id: uuid.UUID, days_back: int = 30
    ) -> UserMessageStats:
        """Get comprehensive messaging statistics for a user."""

        cutoff_date = datetime.now(UTC) - timedelta(days=days_back)

        # Total messages sent
        messages_count_stmt = select(func.count(Message.id)).where(
            and_(
                Message.sender_id == user_id, Message.created_at >= cutoff_date, ~Message.is_deleted
            )
        )
        result = await self.db.execute(messages_count_stmt)
        total_messages = result.scalar() or 0

        # Total active conversations
        conversations_count_stmt = select(func.count(func.distinct(Message.conversation_id))).where(
            and_(
                Message.sender_id == user_id, Message.created_at >= cutoff_date, ~Message.is_deleted
            )
        )
        result = await self.db.execute(conversations_count_stmt)
        total_conversations = result.scalar() or 0

        # Average messages per conversation
        avg_messages = total_messages / max(total_conversations, 1)

        # Most active day of week
        most_active_day_stmt = (
            select(
                func.to_char(Message.created_at, "Day").label("day_name"),
                func.count(Message.id).label("message_count"),
            )
            .where(
                and_(
                    Message.sender_id == user_id,
                    Message.created_at >= cutoff_date,
                    ~Message.is_deleted,
                )
            )
            .group_by(func.to_char(Message.created_at, "Day"))
            .order_by(desc("message_count"))
            .limit(1)
        )
        result = await self.db.execute(most_active_day_stmt)
        most_active_day_row = result.first()
        most_active_day = most_active_day_row[0].strip() if most_active_day_row else None

        # Most active hour
        most_active_hour_stmt = (
            select(
                func.extract("hour", Message.created_at).label("hour"),
                func.count(Message.id).label("message_count"),
            )
            .where(
                and_(
                    Message.sender_id == user_id,
                    Message.created_at >= cutoff_date,
                    ~Message.is_deleted,
                )
            )
            .group_by(func.extract("hour", Message.created_at))
            .order_by(desc("message_count"))
            .limit(1)
        )
        result = await self.db.execute(most_active_hour_stmt)
        most_active_hour_row = result.first()
        most_active_hour = int(most_active_hour_row[0]) if most_active_hour_row else None

        # Get username
        user_stmt = select(User.username).where(User.id == user_id)
        result = await self.db.execute(user_stmt)
        username = result.scalar() or "Unknown"

        return UserMessageStats(
            user_id=user_id,
            username=username,
            total_messages=total_messages,
            total_conversations=total_conversations,
            avg_messages_per_conversation=avg_messages,
            most_active_day=most_active_day,
            most_active_hour=most_active_hour,
        )

    async def get_conversation_analytics(
        self, conversation_id: uuid.UUID, user_id: uuid.UUID, days_back: int = 30
    ) -> ConversationAnalytics | None:
        """Get analytics for a specific conversation."""

        # Verify user is participant
        participant_stmt = select(ConversationParticipant).where(
            and_(
                ConversationParticipant.conversation_id == conversation_id,
                ConversationParticipant.user_id == user_id,
                ConversationParticipant.is_active,
            )
        )
        result = await self.db.execute(participant_stmt)
        if not result.scalar_one_or_none():
            return None

        cutoff_date = datetime.now(UTC) - timedelta(days=days_back)

        # Total messages in conversation
        total_messages_stmt = select(func.count(Message.id)).where(
            and_(
                Message.conversation_id == conversation_id,
                Message.created_at >= cutoff_date,
                ~Message.is_deleted,
            )
        )
        result = await self.db.execute(total_messages_stmt)
        total_messages = result.scalar() or 0

        # Total participants
        participants_stmt = select(func.count(ConversationParticipant.user_id)).where(
            and_(
                ConversationParticipant.conversation_id == conversation_id,
                ConversationParticipant.is_active,
            )
        )
        result = await self.db.execute(participants_stmt)
        total_participants = result.scalar() or 0

        # Messages by day (last 7 days)
        messages_by_day_stmt = (
            select(
                func.date(Message.created_at).label("message_date"),
                func.count(Message.id).label("message_count"),
            )
            .where(
                and_(
                    Message.conversation_id == conversation_id,
                    Message.created_at >= cutoff_date,
                    ~Message.is_deleted,
                )
            )
            .group_by(func.date(Message.created_at))
            .order_by("message_date")
        )
        result = await self.db.execute(messages_by_day_stmt)
        messages_by_day = {str(row[0]): row[1] for row in result.all()}

        # Messages by user
        messages_by_user_stmt = (
            select(User.username, func.count(Message.id).label("message_count"))
            .join(User, Message.sender_id == User.id)
            .where(
                and_(
                    Message.conversation_id == conversation_id,
                    Message.created_at >= cutoff_date,
                    ~Message.is_deleted,
                )
            )
            .group_by(User.username)
            .order_by(desc("message_count"))
        )
        result = await self.db.execute(messages_by_user_stmt)
        messages_by_user = {row[0]: row[1] for row in result.all()}

        return ConversationAnalytics(
            conversation_id=conversation_id,
            total_messages=total_messages,
            total_participants=total_participants,
            messages_by_day=messages_by_day,
            messages_by_user=messages_by_user,
            avg_response_time_minutes=0.0,  # Would need more complex calculation
            most_active_period="unknown",  # Would need more analysis
        )

    async def get_platform_statistics(self) -> dict[str, Any]:
        """Get overall platform messaging statistics."""

        # Total messages (last 30 days)
        cutoff_date = datetime.now(UTC) - timedelta(days=30)

        total_messages_stmt = select(func.count(Message.id)).where(
            and_(Message.created_at >= cutoff_date, ~Message.is_deleted)
        )
        result = await self.db.execute(total_messages_stmt)
        total_messages = result.scalar() or 0

        # Active users (sent at least one message)
        active_users_stmt = select(func.count(func.distinct(Message.sender_id))).where(
            and_(Message.created_at >= cutoff_date, ~Message.is_deleted)
        )
        result = await self.db.execute(active_users_stmt)
        active_users = result.scalar() or 0

        # Total conversations
        total_conversations_stmt = select(func.count(Conversation.id))
        result = await self.db.execute(total_conversations_stmt)
        total_conversations = result.scalar() or 0

        # Messages by content type
        messages_by_type_stmt = (
            select(Message.content_type, func.count(Message.id).label("count"))
            .where(and_(Message.created_at >= cutoff_date, ~Message.is_deleted))
            .group_by(Message.content_type)
        )
        result = await self.db.execute(messages_by_type_stmt)
        messages_by_type = {row[0]: row[1] for row in result.all()}

        return {
            "period_days": 30,
            "total_messages": total_messages,
            "active_users": active_users,
            "total_conversations": total_conversations,
            "avg_messages_per_user": total_messages / max(active_users, 1),
            "avg_messages_per_conversation": total_messages / max(total_conversations, 1),
            "messages_by_type": messages_by_type,
            "generated_at": datetime.now(UTC).isoformat(),
        }

    async def get_trending_conversations(
        self, user_id: uuid.UUID, limit: int = 10
    ) -> list[dict[str, Any]]:
        """Get trending conversations based on recent activity."""

        # Get conversations with recent high activity
        trending_stmt = (
            select(
                Message.conversation_id,
                func.count(Message.id).label("recent_messages"),
                func.max(Message.created_at).label("last_activity"),
            )
            .join(
                ConversationParticipant,
                and_(
                    ConversationParticipant.conversation_id == Message.conversation_id,
                    ConversationParticipant.user_id == user_id,
                    ConversationParticipant.is_active,
                ),
            )
            .where(
                and_(
                    Message.created_at >= datetime.now(UTC) - timedelta(hours=24),
                    ~Message.is_deleted,
                )
            )
            .group_by(Message.conversation_id)
            .order_by(desc("recent_messages"), desc("last_activity"))
            .limit(limit)
        )

        result = await self.db.execute(trending_stmt)
        trending_data = result.all()

        trending_conversations = []
        for conv_id, message_count, last_activity in trending_data:
            trending_conversations.append(
                {
                    "conversation_id": str(conv_id),
                    "recent_message_count": message_count,
                    "last_activity": last_activity.isoformat(),
                    "trend_score": message_count,  # Simple scoring, could be more sophisticated
                }
            )

        return trending_conversations
