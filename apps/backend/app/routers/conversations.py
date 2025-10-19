"""
API endpoints for direct messaging conversations (J4).
J6.1 Enhanced with notification integration.
"""

import logging
import uuid
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import get_current_user
from app.db.database import get_db
from app.models.user import User
from app.schemas.conversation import (
    ConversationListResponse,
    ConversationResponse,
    MarkReadRequest,
    MessageCreate,
    MessageResponse,
    MessagesListResponse,
)
from app.services.conversation_service import ConversationService
from app.services.message_analytics_service import MessageAnalyticsService
from app.services.message_moderation_service import (
    MessageModerationService,
    ModerationAction,
)
from app.services.message_search_service import (
    MessageSearchService,
    SearchFilter,
    SearchResult,
)
from app.services.rate_limit_service import RateLimitService
from app.services.websocket_manager import connection_manager

# Notification Integration
from scripts.notification_integration_helpers import process_mentions_in_content, trigger_dm_notification

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/conversations/dm/{other_user_id}", response_model=ConversationResponse)
async def create_or_get_dm_conversation(
    other_user_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create or get existing direct message conversation with another user."""
    try:
        conv_service = ConversationService(db)
        return await conv_service.get_or_create_dm_conversation(
            current_user.id, other_user_id
        )
    except Exception as e:
        logger.error(f"Error creating DM conversation: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create conversation",
        )


@router.get("/conversations", response_model=ConversationListResponse)
async def get_user_conversations(
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get user's conversations with pagination."""
    try:
        conv_service = ConversationService(db)
        return await conv_service.get_user_conversations(
            current_user.id, page, page_size
        )
    except Exception as e:
        logger.error(f"Error getting conversations: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve conversations",
        )


@router.get("/conversations/{conversation_id}", response_model=ConversationResponse)
async def get_conversation(
    conversation_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get specific conversation details."""
    try:
        conv_service = ConversationService(db)

        # This method doesn't exist yet, let's use get_user_conversations and filter
        conversations = await conv_service.get_user_conversations(
            current_user.id, 1, 100
        )

        for conv in conversations.conversations:
            if conv.id == conversation_id:
                return conv

        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found"
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting conversation: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve conversation",
        )


@router.get(
    "/conversations/{conversation_id}/messages", response_model=MessagesListResponse
)
async def get_conversation_messages(
    conversation_id: uuid.UUID,
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(50, ge=1, le=100, description="Items per page"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get messages in a conversation with pagination."""
    try:
        conv_service = ConversationService(db)
        return await conv_service.get_conversation_messages(
            conversation_id, current_user.id, page, page_size
        )
    except Exception as e:
        logger.error(f"Error getting messages: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve messages",
        )


@router.post(
    "/conversations/{conversation_id}/messages", response_model=MessageResponse
)
async def send_message(
    conversation_id: uuid.UUID,
    message_data: MessageCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Send a message in a conversation."""
    try:
        # Check rate limiting
        rate_limiter = RateLimitService()
        allowed, retry_after = await rate_limiter.check_rate_limit(current_user.id)

        if not allowed:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=(
                    f"Rate limit exceeded. Try again in {retry_after} seconds"
                    if retry_after
                    else "Rate limit exceeded"
                ),
            )

        # Content moderation check
        moderation_service = MessageModerationService(db)
        moderation_result = await moderation_service.moderate_message(
            message_data.content, current_user.id, conversation_id
        )

        if moderation_result.action == ModerationAction.BLOCK:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Message blocked by content filter",
            )
        elif moderation_result.action == ModerationAction.DELETE:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Message contains inappropriate content",
            )

        # Use sanitized content if available
        if (
            moderation_result.sanitized_content
            and moderation_result.action == ModerationAction.WARN
        ):
            message_data.content = moderation_result.sanitized_content

        # Send message
        conv_service = ConversationService(db)
        message_response = await conv_service.send_message(
            conversation_id, current_user.id, message_data
        )

        # Get conversation participants for real-time broadcast
        from sqlalchemy import select

        from app.models.conversation import ConversationParticipant

        participant_stmt = select(ConversationParticipant).where(
            ConversationParticipant.conversation_id == conversation_id,
            ConversationParticipant.is_active,
        )
        result = await db.execute(participant_stmt)
        participants = result.scalars().all()
        participant_ids = {p.user_id for p in participants}

        # Broadcast new message via WebSocket
        await connection_manager.broadcast_new_message(
            message_response, participant_ids
        )

        # J6.1 Notification Integration: Trigger DM notifications
        try:
            # Get recipient users (participants except sender)
            from sqlalchemy import select

            recipient_ids = participant_ids - {current_user.id}

            for recipient_id in recipient_ids:
                # Get recipient user details
                recipient_stmt = select(User).where(User.id == recipient_id)
                recipient_result = await db.execute(recipient_stmt)
                recipient_user = recipient_result.scalar_one_or_none()

                if recipient_user:
                    await trigger_dm_notification(
                        sender_user_data={
                            "id": str(current_user.id),
                            "username": current_user.handle,
                            "display_name": current_user.handle,
                            "avatar_url": current_user.avatar_url,
                        },
                        recipient_user_data={
                            "id": str(recipient_user.id),
                            "username": recipient_user.handle,
                            "display_name": recipient_user.handle,
                            "avatar_url": recipient_user.avatar_url,
                        },
                        message_data={
                            "id": str(message_response.id),
                            "content": message_data.content,
                            "thread_id": str(conversation_id),
                        },
                    )

            # Process mentions in the message content
            await process_mentions_in_content(
                message_data.content,
                mentioning_user_data={
                    "id": str(current_user.id),
                    "username": current_user.handle,
                    "display_name": current_user.handle,
                    "avatar_url": current_user.avatar_url,
                },
                context_type="dm_message",
                context_id=str(message_response.id),
            )

        except Exception as e:
            # Don't fail the message send if notification fails
            logger.warning(f"DM notification failed: {e}")

        return message_response

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error sending message: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to send message",
        )


@router.patch("/conversations/{conversation_id}/read", status_code=204)
async def mark_messages_read(
    conversation_id: uuid.UUID,
    mark_read_data: MarkReadRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Mark messages as read up to a specific message."""
    try:
        conv_service = ConversationService(db)
        success = await conv_service.mark_messages_read(
            conversation_id, current_user.id, mark_read_data
        )

        if not success:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to mark messages as read",
            )

        # Get conversation participants for real-time broadcast
        from sqlalchemy import select

        from app.models.conversation import ConversationParticipant

        participant_stmt = select(ConversationParticipant).where(
            ConversationParticipant.conversation_id == conversation_id,
            ConversationParticipant.is_active,
        )
        result = await db.execute(participant_stmt)
        participants = result.scalars().all()
        participant_ids = {p.user_id for p in participants}

        # Broadcast read receipt via WebSocket
        await connection_manager.broadcast_read_receipt(
            conversation_id=conversation_id,
            user_id=current_user.id,
            message_id=mark_read_data.message_id,
            participant_ids=participant_ids,
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error marking messages read: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to mark messages as read",
        )


@router.delete(
    "/conversations/{conversation_id}/messages/{message_id}", status_code=204
)
async def delete_message(
    conversation_id: uuid.UUID,
    message_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Soft delete a message (mark as deleted)."""
    try:
        # Verify user owns the message
        from sqlalchemy import select, update

        from app.models.conversation import Message

        message_stmt = select(Message).where(
            Message.id == message_id,
            Message.conversation_id == conversation_id,
            Message.sender_id == current_user.id,
            ~Message.is_deleted,
        )
        result = await db.execute(message_stmt)
        message = result.scalar_one_or_none()

        if not message:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Message not found or not authorized to delete",
            )

        # Soft delete the message
        update_stmt = (
            update(Message)
            .where(Message.id == message_id)
            .values(is_deleted=True, content="[deleted]")
        )
        await db.execute(update_stmt)
        await db.commit()

        # TODO: Broadcast message deletion via WebSocket

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting message: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete message",
        )


# Health check for conversation service
@router.get("/conversations/health")
async def conversation_health():
    """Health check for conversation service."""
    return {"status": "healthy", "service": "conversations"}


# New enhanced endpoints for J4 improvements


@router.get("/conversations/search", response_model=SearchResult)
async def search_messages(
    q: str = Query(..., min_length=2, description="Search query"),
    content_type: str | None = Query(None, description="Filter by content type"),
    conversation_id: uuid.UUID | None = Query(
        None, description="Search within specific conversation"
    ),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Search messages across conversations."""
    try:
        search_service = MessageSearchService(db)
        search_filter = SearchFilter(
            query=q, content_type=content_type, conversation_id=conversation_id
        )

        return await search_service.search_messages(
            current_user.id, search_filter, page, page_size
        )

    except Exception as e:
        logger.error(f"Error searching messages: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Search failed"
        )


@router.post(
    "/conversations/{conversation_id}/messages/{message_id}/report", status_code=204
)
async def report_message(
    conversation_id: uuid.UUID,
    message_id: uuid.UUID,
    reason: str = Query(..., min_length=5, max_length=500, description="Report reason"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Report a message for moderation review."""
    try:
        moderation_service = MessageModerationService(db)
        success = await moderation_service.report_message(
            message_id, current_user.id, reason
        )

        if not success:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to report message",
            )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error reporting message: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to report message",
        )


@router.get("/conversations/analytics/user")
async def get_user_analytics(
    days_back: int = Query(30, ge=1, le=365, description="Days to analyze"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get user's messaging analytics and statistics."""
    try:
        analytics_service = MessageAnalyticsService(db)
        stats = await analytics_service.get_user_message_stats(
            current_user.id, days_back
        )

        return {
            "user_id": str(stats.user_id),
            "username": stats.username,
            "period_days": days_back,
            "total_messages": stats.total_messages,
            "total_conversations": stats.total_conversations,
            "avg_messages_per_conversation": round(
                stats.avg_messages_per_conversation, 2
            ),
            "most_active_day": stats.most_active_day,
            "most_active_hour": stats.most_active_hour,
        }

    except Exception as e:
        logger.error(f"Error getting user analytics: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get analytics",
        )


@router.get("/conversations/{conversation_id}/analytics")
async def get_conversation_analytics(
    conversation_id: uuid.UUID,
    days_back: int = Query(30, ge=1, le=365, description="Days to analyze"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get analytics for a specific conversation."""
    try:
        analytics_service = MessageAnalyticsService(db)
        analytics = await analytics_service.get_conversation_analytics(
            conversation_id, current_user.id, days_back
        )

        if not analytics:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Conversation not found or access denied",
            )

        return {
            "conversation_id": str(analytics.conversation_id),
            "period_days": days_back,
            "total_messages": analytics.total_messages,
            "total_participants": analytics.total_participants,
            "messages_by_day": analytics.messages_by_day,
            "messages_by_user": analytics.messages_by_user,
            "avg_response_time_minutes": analytics.avg_response_time_minutes,
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting conversation analytics: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get conversation analytics",
        )


@router.get("/conversations/trending")
async def get_trending_conversations(
    limit: int = Query(10, ge=1, le=50, description="Number of trending conversations"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get trending conversations based on recent activity."""
    try:
        analytics_service = MessageAnalyticsService(db)
        trending = await analytics_service.get_trending_conversations(
            current_user.id, limit
        )

        return {
            "trending_conversations": trending,
            "generated_at": datetime.now(UTC).isoformat(),
        }

    except Exception as e:
        logger.error(f"Error getting trending conversations: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get trending conversations",
        )
