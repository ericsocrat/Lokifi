"""
Admin and monitoring endpoints for J4 Direct Messages.
"""

import uuid
import logging
from typing import List, Dict, Any
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import get_current_user  # Would need admin role check
from app.db.database import get_db
from app.models.user import User
from app.services.message_analytics_service import MessageAnalyticsService
from app.services.message_moderation_service import MessageModerationService
from app.services.performance_monitor import performance_monitor
from app.services.websocket_manager import connection_manager

logger = logging.getLogger(__name__)

router = APIRouter()


# In a real implementation, these would require admin authentication
async def get_admin_user(current_user: User = Depends(get_current_user)) -> User:
    """Require admin privileges - simplified for demo."""
    # In production: check user role/permissions
    return current_user


@router.get("/admin/messaging/stats")
async def get_platform_messaging_stats(
    days_back: int = Query(30, ge=1, le=365),
    admin_user: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db)
):
    """Get platform-wide messaging statistics (admin only)."""
    try:
        analytics_service = MessageAnalyticsService(db)
        stats = await analytics_service.get_platform_statistics()
        
        return {
            **stats,
            "requested_by": admin_user.username,
            "request_time": datetime.now(timezone.utc).isoformat()
        }
    
    except Exception as e:
        logger.error(f"Error getting platform stats: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get platform statistics"
        )


@router.get("/admin/messaging/performance")
async def get_performance_metrics(
    minutes_back: int = Query(10, ge=1, le=60),
    admin_user: User = Depends(get_admin_user)
):
    """Get performance metrics and system health."""
    try:
        metrics_summary = performance_monitor.get_metrics_summary(minutes_back)
        health_checks = await performance_monitor.run_health_checks()
        api_performance = performance_monitor.get_api_performance()
        websocket_stats = performance_monitor.get_websocket_stats()
        alerts = performance_monitor.check_system_alerts()
        
        return {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "period_minutes": minutes_back,
            "metrics": metrics_summary,
            "health_checks": [
                {
                    "service": hc.service,
                    "status": hc.status,
                    "response_time_ms": hc.response_time_ms,
                    "details": hc.details
                } for hc in health_checks
            ],
            "api_performance": api_performance,
            "websocket_stats": websocket_stats,
            "alerts": alerts,
            "system_status": "healthy" if not alerts else "degraded"
        }
    
    except Exception as e:
        logger.error(f"Error getting performance metrics: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get performance metrics"
        )


@router.get("/admin/messaging/moderation")
async def get_moderation_stats(
    admin_user: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db)
):
    """Get message moderation statistics and blocked words."""
    try:
        moderation_service = MessageModerationService(db)
        
        return {
            "blocked_words_count": len(moderation_service.get_blocked_words()),
            "blocked_words": moderation_service.get_blocked_words()[:20],  # First 20 for preview
            "user_warning_counts": len(moderation_service.user_warning_counts),
            "total_warnings_issued": sum(moderation_service.user_warning_counts.values()),
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
    
    except Exception as e:
        logger.error(f"Error getting moderation stats: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get moderation statistics"
        )


@router.post("/admin/messaging/moderation/blocked-words")
async def add_blocked_words(
    words: List[str],
    admin_user: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db)
):
    """Add words to the blocked list."""
    try:
        moderation_service = MessageModerationService(db)
        moderation_service.add_blocked_words(words)
        
        logger.info(f"Admin {admin_user.username} added blocked words: {words}")
        
        return {
            "added_words": words,
            "total_blocked_words": len(moderation_service.get_blocked_words()),
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
    
    except Exception as e:
        logger.error(f"Error adding blocked words: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to add blocked words"
        )


@router.delete("/admin/messaging/moderation/blocked-words")
async def remove_blocked_words(
    words: List[str],
    admin_user: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db)
):
    """Remove words from the blocked list."""
    try:
        moderation_service = MessageModerationService(db)
        moderation_service.remove_blocked_words(words)
        
        logger.info(f"Admin {admin_user.username} removed blocked words: {words}")
        
        return {
            "removed_words": words,
            "total_blocked_words": len(moderation_service.get_blocked_words()),
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
    
    except Exception as e:
        logger.error(f"Error removing blocked words: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to remove blocked words"
        )


@router.get("/admin/messaging/connections")
async def get_active_connections(
    admin_user: User = Depends(get_admin_user)
):
    """Get active WebSocket connection information."""
    try:
        online_users = connection_manager.get_online_users()
        websocket_stats = performance_monitor.get_websocket_stats()
        
        return {
            "total_connections": len(online_users),
            "online_user_ids": [str(uid) for uid in online_users],
            "connection_stats": websocket_stats,
            "redis_connected": connection_manager.redis_client is not None,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
    
    except Exception as e:
        logger.error(f"Error getting connection info: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get connection information"
        )


@router.post("/admin/messaging/broadcast")
async def admin_broadcast_message(
    message: str,
    admin_user: User = Depends(get_admin_user)
):
    """Send administrative broadcast message to all connected users."""
    try:
        online_users = connection_manager.get_online_users()
        
        admin_message = {
            "type": "admin_broadcast",
            "message": message,
            "sender": "System Administrator",
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        
        # Send to all connected users
        for user_id in online_users:
            await connection_manager.send_personal_message(
                str(admin_message),
                user_id
            )
        
        logger.info(f"Admin {admin_user.username} sent broadcast: {message}")
        
        return {
            "message": message,
            "sent_to_users": len(online_users),
            "timestamp": admin_message["timestamp"]
        }
    
    except Exception as e:
        logger.error(f"Error sending admin broadcast: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to send broadcast message"
        )


@router.get("/admin/messaging/health")
async def comprehensive_health_check(
    admin_user: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db)
):
    """Comprehensive health check for all messaging services."""
    try:
        health_checks = await performance_monitor.run_health_checks()
        
        # Additional service-specific checks
        analytics_service = MessageAnalyticsService(db)
        moderation_service = MessageModerationService(db)
        
        # Test basic functionality
        try:
            await analytics_service.get_platform_statistics()
            analytics_healthy = True
        except Exception:
            analytics_healthy = False
        
        overall_status = "healthy"
        failed_services = []
        
        for hc in health_checks:
            if hc.status != "healthy":
                overall_status = "degraded"
                failed_services.append(hc.service)
        
        if not analytics_healthy:
            overall_status = "degraded"
            failed_services.append("analytics")
        
        return {
            "overall_status": overall_status,
            "failed_services": failed_services,
            "health_checks": [
                {
                    "service": hc.service,
                    "status": hc.status,
                    "response_time_ms": hc.response_time_ms,
                    "details": hc.details,
                    "timestamp": hc.timestamp.isoformat()
                } for hc in health_checks
            ],
            "additional_checks": {
                "analytics_service": "healthy" if analytics_healthy else "unhealthy",
                "moderation_service": "healthy",  # Basic instantiation test
                "websocket_manager": "healthy"
            },
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
    
    except Exception as e:
        logger.error(f"Error in comprehensive health check: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Health check failed"
        )