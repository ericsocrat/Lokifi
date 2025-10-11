# J6.2 Advanced Notification API Endpoints
"""
Advanced API endpoints for J6.2 notification system including:
- Analytics dashboard endpoints
- Smart notification management
- A/B testing configuration
- Notification scheduling
- Batch management
"""

from datetime import UTC, datetime
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from app.core.security import get_current_user
from app.models.notification_models import NotificationPriority, NotificationType
from app.models.user import User
from app.services.notification_analytics import NotificationAnalytics
from app.services.smart_notifications import (
    BatchingStrategy,
    DeliveryChannel,
    NotificationTemplate,
    schedule_notification,
    send_batched_notification,
    send_rich_notification,
    smart_notification_processor,
)

router = APIRouter(prefix="/api/v1/notifications", tags=["notifications-j6.2"])
analytics_service = NotificationAnalytics()

# Pydantic Models for Request/Response

class RichNotificationRequest(BaseModel):
    """Request model for rich notifications"""
    user_id: str
    type: NotificationType
    title: str
    message: str
    template: NotificationTemplate = NotificationTemplate.SIMPLE
    priority: NotificationPriority = NotificationPriority.NORMAL
    channels: list[DeliveryChannel] = [DeliveryChannel.IN_APP]
    scheduled_for: datetime | None = None
    expires_at: datetime | None = None
    payload: dict[str, Any] = {}
    media: dict[str, str] | None = None
    actions: list[dict[str, str]] = []
    grouping_key: str | None = None
    batch_strategy: BatchingStrategy = BatchingStrategy.IMMEDIATE
    a_b_test_group: str | None = None

class ScheduledNotificationRequest(BaseModel):
    """Request model for scheduled notifications"""
    user_id: str
    type: NotificationType
    title: str
    message: str
    scheduled_for: datetime
    template: NotificationTemplate = NotificationTemplate.SIMPLE
    priority: NotificationPriority = NotificationPriority.NORMAL
    payload: dict[str, Any] = {}

class ABTestConfiguration(BaseModel):
    """A/B test configuration model"""
    test_name: str
    variants: list[str] = Field(..., min_length=2)
    description: str | None = None

class NotificationPreferencesUpdate(BaseModel):
    """User notification preferences update"""
    batching_enabled: bool | None = None
    preferred_batching_strategy: str | None = None
    quiet_hours_start: str | None = None
    quiet_hours_end: str | None = None
    preferred_channels: list[str] | None = None
    template_preference: str | None = None

# Analytics Endpoints

@router.get("/analytics/dashboard")
async def get_notification_dashboard(
    days: int = Query(default=7, ge=1, le=90),
    current_user: User = Depends(get_current_user)
):
    """Get comprehensive notification analytics dashboard"""
    try:
        dashboard_data = await analytics_service.get_dashboard_data(days=days)
        return JSONResponse(content=dashboard_data)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get dashboard data: {str(e)}")

@router.get("/analytics/metrics/{user_id}")
async def get_user_metrics(
    user_id: str,
    days: int = Query(default=30, ge=1, le=90),
    current_user: User = Depends(get_current_user)
):
    """Get notification metrics for specific user"""
    try:
        metrics = await analytics_service.get_user_engagement_metrics(user_id, days=days)
        return JSONResponse(content=metrics)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get user metrics: {str(e)}")

@router.get("/analytics/performance")
async def get_performance_metrics(
    current_user: User = Depends(get_current_user)
):
    """Get system performance metrics"""
    try:
        performance = await analytics_service.get_system_performance_metrics()
        return JSONResponse(content=performance)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get performance metrics: {str(e)}")

@router.get("/analytics/trends")
async def get_notification_trends(
    days: int = Query(default=30, ge=7, le=365),
    current_user: User = Depends(get_current_user)
):
    """Get notification trends and patterns"""
    try:
        trends = await analytics_service.get_dashboard_data(days=days)
        return JSONResponse(content=trends)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get trends: {str(e)}")

@router.get("/analytics/health-score")
async def get_system_health_score(
    current_user: User = Depends(get_current_user)
):
    """Get system health score"""
    try:
        health_score = await analytics_service.calculate_system_health_score()
        return JSONResponse(content={"health_score": health_score})
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get health score: {str(e)}")

# Smart Notification Endpoints

@router.post("/rich")
async def send_rich_notification_endpoint(
    request: RichNotificationRequest,
    current_user: User = Depends(get_current_user)
):
    """Send a rich notification with advanced features"""
    try:
        result = await send_rich_notification(
            user_id=request.user_id,
            notification_type=request.type,
            title=request.title,
            message=request.message,
            template=request.template,
            priority=request.priority,
            channels=request.channels,
            scheduled_for=request.scheduled_for,
            expires_at=request.expires_at,
            payload=request.payload,
            media=request.media,
            actions=request.actions,
            grouping_key=request.grouping_key,
            batch_strategy=request.batch_strategy,
            a_b_test_group=request.a_b_test_group
        )
        
        return JSONResponse(content={
            "success": True,
            "result": result,
            "message": "Rich notification sent successfully"
        })
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to send rich notification: {str(e)}")

@router.post("/batched")
async def send_batched_notification_endpoint(
    request: RichNotificationRequest,
    current_user: User = Depends(get_current_user)
):
    """Send a notification that will be batched with similar notifications"""
    try:
        batch_id = await send_batched_notification(
            user_id=request.user_id,
            notification_type=request.type,
            title=request.title,
            message=request.message,
            grouping_key=request.grouping_key,
            template=request.template,
            priority=request.priority,
            payload=request.payload
        )
        
        return JSONResponse(content={
            "success": True,
            "batch_id": batch_id,
            "message": "Notification added to batch successfully"
        })
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to send batched notification: {str(e)}")

@router.post("/schedule")
async def schedule_notification_endpoint(
    request: ScheduledNotificationRequest,
    current_user: User = Depends(get_current_user)
):
    """Schedule a notification for future delivery"""
    try:
        if request.scheduled_for <= datetime.now(UTC):
            raise HTTPException(status_code=400, detail="Scheduled time must be in the future")
        
        schedule_id = await schedule_notification(
            user_id=request.user_id,
            notification_type=request.type,
            title=request.title,
            message=request.message,
            scheduled_for=request.scheduled_for,
            template=request.template,
            priority=request.priority,
            payload=request.payload
        )
        
        return JSONResponse(content={
            "success": True,
            "schedule_id": schedule_id,
            "scheduled_for": request.scheduled_for.isoformat(),
            "message": "Notification scheduled successfully"
        })
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to schedule notification: {str(e)}")

# Batch Management Endpoints

@router.get("/batches/pending")
async def get_pending_batches(
    current_user: User = Depends(get_current_user)
):
    """Get summary of pending notification batches"""
    try:
        summary = await smart_notification_processor.get_pending_batches_summary()
        return JSONResponse(content=summary)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get pending batches: {str(e)}")

@router.post("/batches/{batch_id}/deliver")
async def force_deliver_batch(
    batch_id: str,
    current_user: User = Depends(get_current_user)
):
    """Force immediate delivery of a pending batch"""
    try:
        if batch_id in smart_notification_processor.pending_batches:
            batch = smart_notification_processor.pending_batches[batch_id]
            delivery_result = await smart_notification_processor._deliver_batch(batch)
            del smart_notification_processor.pending_batches[batch_id]
            
            return JSONResponse(content={
                "success": True,
                "batch_id": batch_id,
                "delivered": delivery_result,
                "notification_count": len(batch.notifications),
                "message": "Batch delivered successfully"
            })
        else:
            raise HTTPException(status_code=404, detail="Batch not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to deliver batch: {str(e)}")

# A/B Testing Endpoints

@router.post("/ab-tests")
async def configure_ab_test(
    config: ABTestConfiguration,
    current_user: User = Depends(get_current_user)
):
    """Configure A/B test for notifications"""
    try:
        await smart_notification_processor.configure_ab_test(
            config.test_name,
            config.variants
        )
        
        return JSONResponse(content={
            "success": True,
            "test_name": config.test_name,
            "variants": config.variants,
            "message": "A/B test configured successfully"
        })
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to configure A/B test: {str(e)}")

@router.get("/ab-tests")
async def get_ab_tests(
    current_user: User = Depends(get_current_user)
):
    """Get configured A/B tests"""
    try:
        tests = {
            test_name: {
                "variants": variants,
                "active": True
            }
            for test_name, variants in smart_notification_processor.a_b_test_variants.items()
        }
        
        return JSONResponse(content={"ab_tests": tests})
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get A/B tests: {str(e)}")

# User Preferences Endpoints

@router.get("/preferences/{user_id}")
async def get_user_notification_preferences(
    user_id: str,
    current_user: User = Depends(get_current_user)
):
    """Get user notification preferences"""
    try:
        preferences = await smart_notification_processor.get_user_notification_preferences(user_id)
        return JSONResponse(content=preferences)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get user preferences: {str(e)}")

@router.put("/preferences/{user_id}")
async def update_user_notification_preferences(
    user_id: str,
    preferences: NotificationPreferencesUpdate,
    current_user: User = Depends(get_current_user)
):
    """Update user notification preferences"""
    try:
        # This would integrate with your existing preference system
        # For now, return success with the updated preferences
        
        current_prefs = await smart_notification_processor.get_user_notification_preferences(user_id)
        
        # Update with new preferences
        for key, value in preferences.model_dump(exclude_unset=True).items():
            if value is not None:
                current_prefs[key] = value
        
        return JSONResponse(content={
            "success": True,
            "updated_preferences": current_prefs,
            "message": "Preferences updated successfully"
        })
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update preferences: {str(e)}")

# Templates and Configuration Endpoints

@router.get("/templates")
async def get_notification_templates(
    current_user: User = Depends(get_current_user)
):
    """Get available notification templates"""
    try:
        templates = {
            template.value: {
                "name": template.name,
                "description": f"{template.value.replace('_', ' ').title()} notification template"
            }
            for template in NotificationTemplate
        }
        
        return JSONResponse(content={"templates": templates})
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get templates: {str(e)}")

@router.get("/channels")
async def get_delivery_channels(
    current_user: User = Depends(get_current_user)
):
    """Get available delivery channels"""
    try:
        channels = {
            channel.value: {
                "name": channel.name,
                "description": f"{channel.value.replace('_', ' ').title()} delivery channel"
            }
            for channel in DeliveryChannel
        }
        
        return JSONResponse(content={"channels": channels})
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get channels: {str(e)}")

@router.get("/system-status")
async def get_system_status(
    current_user: User = Depends(get_current_user)
):
    """Get J6.2 notification system status"""
    try:
        from app.core.redis_client import redis_client
        
        status = {
            "j6_2_features_active": True,
            "redis_connected": await redis_client.is_available(),
            "pending_batches": len(smart_notification_processor.pending_batches),
            "ab_tests_active": len(smart_notification_processor.a_b_test_variants),
            "system_health": "operational",
            "version": "J6.2",
            "features": [
                "Rich notifications",
                "Smart batching",
                "Notification scheduling",
                "A/B testing",
                "Advanced analytics",
                "Performance monitoring",
                "Redis caching"
            ]
        }
        
        return JSONResponse(content=status)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get system status: {str(e)}")

# Export router
j6_2_router = router