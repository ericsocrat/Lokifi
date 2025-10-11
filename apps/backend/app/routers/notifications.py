# J6 Enterprise Notifications - REST API Router
import logging
from datetime import UTC, datetime
from typing import Any

from app.core.auth_deps import get_current_user
from app.core.redis_cache import cache_notifications
from app.models.notification_models import NotificationPriority
from app.models.user import User
from app.services.notification_emitter import notification_emitter
from app.services.notification_service import notification_service
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)


# Pydantic models for API requests/responses
class NotificationResponse(BaseModel):
    """Response model for notification data"""

    id: str
    user_id: str
    type: str
    priority: str
    category: str | None
    title: str
    message: str | None
    payload: dict[str, Any] | None
    created_at: str
    read_at: str | None
    delivered_at: str | None
    clicked_at: str | None
    dismissed_at: str | None
    is_read: bool
    is_delivered: bool
    is_dismissed: bool
    is_archived: bool
    expires_at: str | None
    related_entity_type: str | None
    related_entity_id: str | None
    age_seconds: int
    is_expired: bool


class NotificationListResponse(BaseModel):
    """Response model for notification lists"""

    notifications: list[NotificationResponse]
    total_count: int
    unread_count: int
    has_more: bool
    next_offset: int | None


class NotificationStatsResponse(BaseModel):
    """Response model for notification statistics"""

    total_notifications: int
    unread_count: int
    read_count: int
    dismissed_count: int
    delivered_count: int
    clicked_count: int
    by_type: dict[str, int]
    by_priority: dict[str, int]
    avg_read_time_seconds: float
    most_recent: str | None
    oldest_unread: str | None


class NotificationPreferencesRequest(BaseModel):
    """Request model for updating notification preferences"""

    email_enabled: bool | None = None
    push_enabled: bool | None = None
    in_app_enabled: bool | None = None
    quiet_hours_start: str | None = Field(None, pattern=r"^([0-1][0-9]|2[0-3]):[0-5][0-9]$")
    quiet_hours_end: str | None = Field(None, pattern=r"^([0-1][0-9]|2[0-3]):[0-5][0-9]$")
    timezone: str | None = None
    daily_digest_enabled: bool | None = None
    weekly_digest_enabled: bool | None = None
    digest_time: str | None = Field(None, pattern=r"^([0-1][0-9]|2[0-3]):[0-5][0-9]$")
    type_preferences: dict[str, bool] | None = None


class NotificationPreferencesResponse(BaseModel):
    """Response model for notification preferences"""

    id: str
    user_id: str
    email_enabled: bool
    push_enabled: bool
    in_app_enabled: bool
    type_preferences: dict[str, Any]
    quiet_hours_start: str | None
    quiet_hours_end: str | None
    timezone: str
    daily_digest_enabled: bool
    weekly_digest_enabled: bool
    digest_time: str
    created_at: str
    updated_at: str


class MarkAsReadRequest(BaseModel):
    """Request model for marking notifications as read"""

    notification_ids: list[str] | None = None  # If None, marks all as read


class TestNotificationRequest(BaseModel):
    """Request model for creating test notifications"""

    type: str = "system_alert"
    title: str = "Test Notification"
    message: str | None = "This is a test notification from the system."
    priority: str = "normal"


# Create router
router = APIRouter(prefix="/notifications", tags=["J6 Notifications"])


@router.get("/", response_model=NotificationListResponse)
@cache_notifications(ttl=120)  # Cache for 2 minutes
async def get_notifications(
    request: Request,
    limit: int = Query(50, ge=1, le=100, description="Number of notifications to retrieve"),
    offset: int = Query(0, ge=0, description="Pagination offset"),
    unread_only: bool = Query(False, description="Only return unread notifications"),
    type_filter: str | None = Query(None, description="Filter by notification type"),
    category_filter: str | None = Query(None, description="Filter by category"),
    include_dismissed: bool = Query(False, description="Include dismissed notifications"),
    current_user: User = Depends(get_current_user),
):
    """
    Get notifications for the current user

    Supports filtering, pagination, and various query options for flexibility.
    """
    try:
        notifications = await notification_service.get_user_notifications(
            user_id=current_user.id,
            limit=limit,
            offset=offset,
            unread_only=unread_only,
            notification_type=type_filter,
            category=category_filter,
            include_dismissed=include_dismissed,
        )

        # Get unread count
        unread_count = await notification_service.get_unread_count(current_user.id)

        # Convert to response format
        notification_responses = []
        for notification in notifications:
            notification_dict = notification.to_dict()
            notification_responses.append(NotificationResponse(**notification_dict))

        # Determine if there are more notifications
        has_more = len(notifications) == limit
        next_offset = offset + limit if has_more else None

        return NotificationListResponse(
            notifications=notification_responses,
            total_count=len(notifications),
            unread_count=unread_count,
            has_more=has_more,
            next_offset=next_offset,
        )

    except Exception as e:
        logger.error(f"Failed to get notifications for user {current_user.id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve notifications")


@router.get("/unread-count")
@cache_notifications(ttl=60)  # Cache for 1 minute (frequently updated)
async def get_unread_count(request: Request, current_user: User = Depends(get_current_user)):
    """Get the count of unread notifications for the current user"""
    try:
        unread_count = await notification_service.get_unread_count(current_user.id)

        return JSONResponse(
            content={
                "unread_count": unread_count,
                "user_id": current_user.id,
                "timestamp": datetime.now(UTC).isoformat(),
            }
        )

    except Exception as e:
        logger.error(f"Failed to get unread count for user {current_user.id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to get unread count")


@router.get("/stats", response_model=NotificationStatsResponse)
async def get_notification_stats(current_user: User = Depends(get_current_user)):
    """Get comprehensive notification statistics for the current user"""
    try:
        stats = await notification_service.get_notification_stats(current_user.id)

        return NotificationStatsResponse(
            total_notifications=stats.total_notifications,
            unread_count=stats.unread_count,
            read_count=stats.read_count,
            dismissed_count=stats.dismissed_count,
            delivered_count=stats.delivered_count,
            clicked_count=stats.clicked_count,
            by_type=stats.by_type,
            by_priority=stats.by_priority,
            avg_read_time_seconds=stats.avg_read_time_seconds,
            most_recent=stats.most_recent.isoformat() if stats.most_recent else None,
            oldest_unread=stats.oldest_unread.isoformat() if stats.oldest_unread else None,
        )

    except Exception as e:
        logger.error(f"Failed to get notification stats for user {current_user.id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to get notification statistics")


@router.post("/mark-read")
async def mark_notifications_as_read(
    request: MarkAsReadRequest, current_user: User = Depends(get_current_user)
):
    """Mark specific notifications or all notifications as read"""
    try:
        if request.notification_ids:
            # Mark specific notifications as read
            success_count = 0
            failed_count = 0

            for notification_id in request.notification_ids:
                success = await notification_service.mark_as_read(notification_id, current_user.id)
                if success:
                    success_count += 1
                else:
                    failed_count += 1

            return JSONResponse(
                content={
                    "message": f"Marked {success_count} notifications as read",
                    "success_count": success_count,
                    "failed_count": failed_count,
                    "user_id": current_user.id,
                }
            )
        else:
            # Mark all notifications as read
            marked_count = await notification_service.mark_all_as_read(current_user.id)

            return JSONResponse(
                content={
                    "message": f"Marked {marked_count} notifications as read",
                    "marked_count": marked_count,
                    "user_id": current_user.id,
                }
            )

    except Exception as e:
        logger.error(f"Failed to mark notifications as read for user {current_user.id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to mark notifications as read")


@router.post("/{notification_id}/read")
async def mark_notification_as_read(
    notification_id: str, current_user: User = Depends(get_current_user)
):
    """Mark a specific notification as read"""
    try:
        success = await notification_service.mark_as_read(notification_id, current_user.id)

        if success:
            return JSONResponse(
                content={
                    "message": "Notification marked as read",
                    "notification_id": notification_id,
                    "user_id": current_user.id,
                }
            )
        else:
            raise HTTPException(status_code=404, detail="Notification not found")

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to mark notification {notification_id} as read: {e}")
        raise HTTPException(status_code=500, detail="Failed to mark notification as read")


@router.post("/{notification_id}/dismiss")
async def dismiss_notification(
    notification_id: str, current_user: User = Depends(get_current_user)
):
    """Dismiss a specific notification"""
    try:
        success = await notification_service.dismiss_notification(notification_id, current_user.id)

        if success:
            return JSONResponse(
                content={
                    "message": "Notification dismissed",
                    "notification_id": notification_id,
                    "user_id": current_user.id,
                }
            )
        else:
            raise HTTPException(status_code=404, detail="Notification not found")

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to dismiss notification {notification_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to dismiss notification")


@router.post("/{notification_id}/click")
async def click_notification(notification_id: str, current_user: User = Depends(get_current_user)):
    """Record a click on a notification"""
    try:
        success = await notification_service.click_notification(notification_id, current_user.id)

        if success:
            return JSONResponse(
                content={
                    "message": "Notification click recorded",
                    "notification_id": notification_id,
                    "user_id": current_user.id,
                }
            )
        else:
            raise HTTPException(status_code=404, detail="Notification not found")

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to record click for notification {notification_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to record notification click")


@router.get("/preferences", response_model=NotificationPreferencesResponse)
async def get_notification_preferences(current_user: User = Depends(get_current_user)):
    """Get notification preferences for the current user"""
    try:
        # This would need to be implemented in the notification service
        # For now, return default preferences
        default_preferences = {
            "id": f"pref_{current_user.id}",
            "user_id": current_user.id,
            "email_enabled": True,
            "push_enabled": True,
            "in_app_enabled": True,
            "type_preferences": {},
            "quiet_hours_start": None,
            "quiet_hours_end": None,
            "timezone": "UTC",
            "daily_digest_enabled": False,
            "weekly_digest_enabled": False,
            "digest_time": "09:00",
            "created_at": datetime.now(UTC).isoformat(),
            "updated_at": datetime.now(UTC).isoformat(),
        }

        return NotificationPreferencesResponse(**default_preferences)

    except Exception as e:
        logger.error(f"Failed to get notification preferences for user {current_user.id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to get notification preferences")


@router.put("/preferences")
async def update_notification_preferences(
    request: NotificationPreferencesRequest, current_user: User = Depends(get_current_user)
):
    """Update notification preferences for the current user"""
    try:
        # TODO: Implement preferences update in notification service

        return JSONResponse(
            content={
                "message": "Notification preferences updated",
                "user_id": current_user.id,
                "updated_fields": [k for k, v in request.model_dump().items() if v is not None],
            }
        )

    except Exception as e:
        logger.error(f"Failed to update notification preferences for user {current_user.id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to update notification preferences")


@router.post("/test")
async def create_test_notification(
    request: TestNotificationRequest,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
):
    """Create a test notification for the current user"""
    try:
        # Create test notification in background
        async def create_test():
            await notification_emitter.emit_system_alert_notification(
                user_id=str(current_user.id),
                alert_type="test_notification",
                title=request.title,
                message=request.message or "This is a test notification.",
                alert_data={"test": True, "created_by": current_user.username},
                priority=NotificationPriority.NORMAL,
            )

        background_tasks.add_task(create_test)

        return JSONResponse(
            content={
                "message": "Test notification created",
                "type": request.type,
                "title": request.title,
                "user_id": current_user.id,
            }
        )

    except Exception as e:
        logger.error(f"Failed to create test notification for user {current_user.id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to create test notification")


@router.delete("/cleanup")
async def cleanup_expired_notifications(
    background_tasks: BackgroundTasks, current_user: User = Depends(get_current_user)
):
    """Clean up expired notifications (admin-only in production)"""
    try:
        # Add cleanup task to background
        background_tasks.add_task(notification_service.cleanup_expired_notifications)

        return JSONResponse(
            content={"message": "Notification cleanup started", "initiated_by": current_user.id}
        )

    except Exception as e:
        logger.error(f"Failed to start notification cleanup: {e}")
        raise HTTPException(status_code=500, detail="Failed to start cleanup")


@router.get("/types")
async def get_notification_types():
    """Get available notification types and their descriptions"""
    return JSONResponse(
        content={
            "notification_types": {
                "follow": {
                    "name": "Follow",
                    "description": "When someone follows you",
                    "category": "social",
                    "default_enabled": True,
                },
                "dm_message_received": {
                    "name": "Direct Message",
                    "description": "When you receive a direct message",
                    "category": "messages",
                    "default_enabled": True,
                },
                "ai_reply_finished": {
                    "name": "AI Response",
                    "description": "When AI finishes responding to your message",
                    "category": "ai",
                    "default_enabled": True,
                },
                "mention": {
                    "name": "Mention",
                    "description": "When someone mentions you",
                    "category": "social",
                    "default_enabled": True,
                },
                "system_alert": {
                    "name": "System Alert",
                    "description": "Important system notifications",
                    "category": "system",
                    "default_enabled": True,
                },
                "announcement": {
                    "name": "Announcement",
                    "description": "Platform announcements and updates",
                    "category": "system",
                    "default_enabled": True,
                },
            },
            "categories": {
                "social": "Social interactions and connections",
                "messages": "Direct messages and conversations",
                "ai": "AI-related notifications",
                "system": "System alerts and announcements",
            },
            "priorities": {
                "low": "Low priority notifications",
                "normal": "Standard notifications",
                "high": "Important notifications",
                "urgent": "Critical notifications that bypass quiet hours",
            },
        }
    )


# Export router
notifications_router = router
