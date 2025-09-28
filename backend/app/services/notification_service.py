# J6 Enterprise Notification Service - Core Implementation
from typing import Dict, List, Optional, Any, Union, Callable
from datetime import datetime, timedelta, timezone
import asyncio
import logging
import uuid
from uuid import UUID
import json
from dataclasses import dataclass, asdict
from enum import Enum

from sqlalchemy import select, func, and_, or_, desc
from sqlalchemy.orm import selectinload

from app.core.database import db_manager
from app.core.redis_client import redis_client
from app.models.notification_models import (
    Notification, 
    NotificationPreference, 
    NotificationType, 
    NotificationPriority
)
from app.models.user import User

logger = logging.getLogger(__name__)

@dataclass
class NotificationData:
    """Data structure for creating notifications"""
    user_id: Union[str, UUID]
    type: NotificationType
    title: str
    message: Optional[str] = None
    payload: Optional[Dict[str, Any]] = None
    priority: NotificationPriority = NotificationPriority.NORMAL
    category: Optional[str] = None
    related_entity_type: Optional[str] = None
    related_entity_id: Optional[str] = None
    expires_at: Optional[datetime] = None
    email_enabled: bool = False
    push_enabled: bool = False

@dataclass
class NotificationStats:
    """Notification statistics for analytics"""
    total_notifications: int
    unread_count: int
    read_count: int
    dismissed_count: int
    delivered_count: int
    clicked_count: int
    by_type: Dict[str, int]
    by_priority: Dict[str, int]
    avg_read_time_seconds: float
    most_recent: Optional[datetime]
    oldest_unread: Optional[datetime]

class NotificationEvent:
    """Event types for notification system"""
    CREATED = "notification.created"
    READ = "notification.read"
    DISMISSED = "notification.dismissed"
    CLICKED = "notification.clicked"
    DELIVERED = "notification.delivered"
    EXPIRED = "notification.expired"
    BATCH_PROCESSED = "notification.batch_processed"

class NotificationService:
    """
    Enterprise-grade notification service with advanced features:
    - Event-driven notifications
    - Batch processing
    - User preferences
    - Delivery tracking
    - Analytics and reporting
    """
    
    def __init__(self):
        self.event_handlers: Dict[str, List[Callable]] = {}
        self.batch_processing_enabled = True
        self.max_batch_size = 100
        self.delivery_retry_attempts = 3
        self.cleanup_expired_after_days = 30
        
    async def create_notification(
        self, 
        notification_data: NotificationData,
        batch_id: Optional[str] = None,
        skip_preferences: bool = False
    ) -> Optional[Notification]:
        """
        Create a new notification with preference checking
        
        Args:
            notification_data: Notification data to create
            batch_id: Optional batch ID for grouping
            skip_preferences: Skip user preference checking (for system notifications)
            
        Returns:
            Created notification or None if blocked by preferences
        """
        try:
            async for session in db_manager.get_session():
                # Check user preferences unless skipped
                if not skip_preferences:
                    preferences = await self._get_user_preferences(session, notification_data.user_id)
                    if not await self._should_deliver_notification(preferences, notification_data):
                        logger.debug(f"Notification blocked by user preferences: {notification_data.type}")
                        return None
                
                # Create notification
                notification = Notification(
                    id=str(uuid.uuid4()),
                    user_id=notification_data.user_id,
                    type=notification_data.type.value,
                    priority=notification_data.priority.value,
                    category=notification_data.category,
                    title=notification_data.title,
                    message=notification_data.message,
                    payload=notification_data.payload,
                    related_entity_type=notification_data.related_entity_type,
                    related_entity_id=notification_data.related_entity_id,
                    expires_at=notification_data.expires_at,
                    batch_id=batch_id,
                    email_sent=False,
                    push_sent=False,
                    in_app_sent=True,  # Always deliver in-app by default
                )
                
                session.add(notification)
                await session.commit()
                await session.refresh(notification)
                
                # Emit event
                await self._emit_event(NotificationEvent.CREATED, notification)
                
                # Schedule delivery if needed
                asyncio.create_task(self._deliver_notification(notification, notification_data))
                
                logger.info(f"Created notification {notification.id} for user {notification_data.user_id}")
                return notification
                
        except Exception as e:
            logger.error(f"Failed to create notification: {e}")
            return None
    
    async def create_batch_notifications(
        self,
        notifications_data: List[NotificationData],
        batch_id: Optional[str] = None
    ) -> List[Notification]:
        """Create multiple notifications in a batch"""
        if not batch_id:
            batch_id = str(uuid.uuid4())
        
        created_notifications = []
        
        # Process in chunks to avoid memory issues
        for i in range(0, len(notifications_data), self.max_batch_size):
            chunk = notifications_data[i:i + self.max_batch_size]
            
            # Create notifications in parallel
            tasks = [
                self.create_notification(data, batch_id=batch_id)
                for data in chunk
            ]
            
            results = await asyncio.gather(*tasks, return_exceptions=True)
            
            # Filter successful results
            for result in results:
                if isinstance(result, Notification):
                    created_notifications.append(result)
                elif isinstance(result, Exception):
                    logger.error(f"Batch notification creation failed: {result}")
        
        # Emit batch processed event
        await self._emit_event(NotificationEvent.BATCH_PROCESSED, {
            "batch_id": batch_id,
            "total_created": len(created_notifications),
            "requested": len(notifications_data)
        })
        
        logger.info(f"Batch created {len(created_notifications)}/{len(notifications_data)} notifications")
        return created_notifications
    
    async def get_user_notifications(
        self,
        user_id: Union[str, UUID],
        limit: int = 50,
        offset: int = 0,
        unread_only: bool = False,
        notification_type: Optional[str] = None,
        category: Optional[str] = None,
        include_dismissed: bool = False
    ) -> List[Notification]:
        """Get notifications for a user with filtering"""
        user_id_str = str(user_id)  # Convert UUID to string
        try:
            async for session in db_manager.get_session(read_only=True):
                query = select(Notification).where(
                    Notification.user_id == user_id_str
                )
                
                # Apply filters
                if unread_only:
                    query = query.where(Notification.is_read == False)
                
                if notification_type:
                    query = query.where(Notification.type == notification_type)
                
                if category:
                    query = query.where(Notification.category == category)
                
                if not include_dismissed:
                    query = query.where(Notification.is_dismissed == False)
                
                # Exclude expired notifications
                query = query.where(
                    or_(
                        Notification.expires_at.is_(None),
                        Notification.expires_at > datetime.now(timezone.utc)
                    )
                )
                
                # Order by created_at descending
                query = query.order_by(desc(Notification.created_at))
                
                # Apply pagination
                query = query.offset(offset).limit(limit)
                
                result = await session.execute(query)
                notifications = result.scalars().all()
                
                return list(notifications)
                
        except Exception as e:
            logger.error(f"Failed to get user notifications: {e}")
            return []
    
    async def get_unread_count(self, user_id: Union[str, UUID]) -> int:
        """Get count of unread notifications for a user"""
        user_id_str = str(user_id)  # Convert UUID to string
        
        # Try to get from cache first
        cached_count = await redis_client.get_cached_unread_count(user_id_str)
        if cached_count is not None:
            return cached_count
            
        try:
            async for session in db_manager.get_session(read_only=True):
                result = await session.execute(
                    select(func.count(Notification.id)).where(
                        and_(
                            Notification.user_id == user_id_str,
                            Notification.is_read == False,
                            Notification.is_dismissed == False,
                            or_(
                                Notification.expires_at.is_(None),
                                Notification.expires_at > datetime.now(timezone.utc)
                            )
                        )
                    )
                )
                count = result.scalar() or 0
                
                # Cache the count for 5 minutes
                await redis_client.cache_unread_count(user_id_str, count, ttl=300)
                
                return count
                
        except Exception as e:
            logger.error(f"Failed to get unread count: {e}")
            return 0
    
    async def mark_as_read(
        self, 
        notification_id: str, 
        user_id: Optional[Union[str, UUID]] = None
    ) -> bool:
        """Mark a notification as read"""
        user_id_str = str(user_id) if user_id else None  # Convert UUID to string
        try:
            async for session in db_manager.get_session():
                query = select(Notification).where(Notification.id == notification_id)
                
                if user_id_str:
                    query = query.where(Notification.user_id == user_id_str)
                
                result = await session.execute(query)
                notification = result.scalar_one_or_none()
                
                if not notification:
                    return False
                
                if not notification.is_read:
                    notification.mark_as_read()
                    await session.commit()
                    
                    # Emit event
                    await self._emit_event(NotificationEvent.READ, notification)
                
                return True
                
        except Exception as e:
            logger.error(f"Failed to mark notification as read: {e}")
            return False
    
    async def mark_all_as_read(self, user_id: Union[str, UUID]) -> int:
        """Mark all notifications as read for a user"""
        user_id_str = str(user_id)  # Convert UUID to string
        try:
            async for session in db_manager.get_session():
                # Get unread notifications
                result = await session.execute(
                    select(Notification).where(
                        and_(
                            Notification.user_id == user_id_str,
                            Notification.is_read == False
                        )
                    )
                )
                notifications = result.scalars().all()
                
                # Mark as read
                count = 0
                for notification in notifications:
                    notification.mark_as_read()
                    count += 1
                
                if count > 0:
                    await session.commit()
                    
                    # Emit batch read event
                    await self._emit_event(NotificationEvent.READ, {
                        "user_id": user_id,
                        "count": count,
                        "batch": True
                    })
                
                return count
                
        except Exception as e:
            logger.error(f"Failed to mark all as read: {e}")
            return 0
    
    async def dismiss_notification(
        self, 
        notification_id: str, 
        user_id: Optional[Union[str, UUID]] = None
    ) -> bool:
        """Dismiss a notification"""
        user_id_str = str(user_id) if user_id else None  # Convert UUID to string
        try:
            async for session in db_manager.get_session():
                query = select(Notification).where(Notification.id == notification_id)
                
                if user_id_str:
                    query = query.where(Notification.user_id == user_id_str)
                
                result = await session.execute(query)
                notification = result.scalar_one_or_none()
                
                if not notification:
                    return False
                
                if not notification.is_dismissed:
                    notification.dismiss()
                    await session.commit()
                    
                    # Emit event
                    await self._emit_event(NotificationEvent.DISMISSED, notification)
                
                return True
                
        except Exception as e:
            logger.error(f"Failed to dismiss notification: {e}")
            return False
    
    async def click_notification(
        self, 
        notification_id: str, 
        user_id: Optional[Union[str, UUID]] = None
    ) -> bool:
        """Record a notification click"""
        user_id_str = str(user_id) if user_id else None  # Convert UUID to string
        try:
            async for session in db_manager.get_session():
                query = select(Notification).where(Notification.id == notification_id)
                
                if user_id_str:
                    query = query.where(Notification.user_id == user_id_str)
                
                result = await session.execute(query)
                notification = result.scalar_one_or_none()
                
                if not notification:
                    return False
                
                notification.mark_as_clicked()
                await session.commit()
                
                # Emit event
                await self._emit_event(NotificationEvent.CLICKED, notification)
                
                return True
                
        except Exception as e:
            logger.error(f"Failed to record notification click: {e}")
            return False
    
    async def get_notification_stats(self, user_id: Union[str, UUID]) -> NotificationStats:
        """Get comprehensive notification statistics for a user"""
        user_id_str = str(user_id)  # Convert UUID to string
        try:
            async for session in db_manager.get_session(read_only=True):
                # Base query for user's notifications
                base_query = select(Notification).where(Notification.user_id == user_id_str)
                
                # Total count
                total_result = await session.execute(
                    select(func.count(Notification.id)).where(Notification.user_id == user_id_str)
                )
                total_count = total_result.scalar() or 0
                
                # Status counts
                unread_result = await session.execute(
                    select(func.count(Notification.id)).where(
                        and_(Notification.user_id == user_id_str, Notification.is_read == False)
                    )
                )
                unread_count = unread_result.scalar() or 0
                
                read_count = total_count - unread_count
                
                dismissed_result = await session.execute(
                    select(func.count(Notification.id)).where(
                        and_(Notification.user_id == user_id_str, Notification.is_dismissed == True)
                    )
                )
                dismissed_count = dismissed_result.scalar() or 0
                
                delivered_result = await session.execute(
                    select(func.count(Notification.id)).where(
                        and_(Notification.user_id == user_id_str, Notification.is_delivered == True)
                    )
                )
                delivered_count = delivered_result.scalar() or 0
                
                clicked_result = await session.execute(
                    select(func.count(Notification.id)).where(
                        and_(Notification.user_id == user_id_str, Notification.clicked_at.isnot(None))
                    )
                )
                clicked_count = clicked_result.scalar() or 0
                
                # Get all notifications for detailed analysis
                all_notifications_result = await session.execute(base_query)
                all_notifications = all_notifications_result.scalars().all()
                
                # Analyze by type and priority
                by_type = {}
                by_priority = {}
                read_times = []
                most_recent = None
                oldest_unread = None
                
                for notification in all_notifications:
                    # Count by type
                    by_type[notification.type] = by_type.get(notification.type, 0) + 1
                    
                    # Count by priority
                    by_priority[notification.priority] = by_priority.get(notification.priority, 0) + 1
                    
                    # Track read times
                    if notification.read_at and notification.created_at:
                        read_time = (notification.read_at - notification.created_at).total_seconds()
                        read_times.append(read_time)
                    
                    # Most recent notification
                    if not most_recent or (notification.created_at and notification.created_at > most_recent):
                        most_recent = notification.created_at
                    
                    # Oldest unread notification
                    if not notification.is_read and (not oldest_unread or (notification.created_at and notification.created_at < oldest_unread)):
                        oldest_unread = notification.created_at
                
                # Calculate average read time
                avg_read_time = sum(read_times) / len(read_times) if read_times else 0.0
                
                return NotificationStats(
                    total_notifications=total_count,
                    unread_count=unread_count,
                    read_count=read_count,
                    dismissed_count=dismissed_count,
                    delivered_count=delivered_count,
                    clicked_count=clicked_count,
                    by_type=by_type,
                    by_priority=by_priority,
                    avg_read_time_seconds=avg_read_time,
                    most_recent=most_recent,
                    oldest_unread=oldest_unread
                )
                
        except Exception as e:
            logger.error(f"Failed to get notification stats: {e}")
            return NotificationStats(
                total_notifications=0,
                unread_count=0,
                read_count=0,
                dismissed_count=0,
                delivered_count=0,
                clicked_count=0,
                by_type={},
                by_priority={},
                avg_read_time_seconds=0.0,
                most_recent=None,
                oldest_unread=None
            )
    
    async def cleanup_expired_notifications(self) -> int:
        """Clean up expired notifications"""
        try:
            async for session in db_manager.get_session():
                # Find expired notifications
                result = await session.execute(
                    select(Notification).where(
                        and_(
                            Notification.expires_at.isnot(None),
                            Notification.expires_at <= datetime.now(timezone.utc)
                        )
                    )
                )
                expired_notifications = result.scalars().all()
                
                count = len(expired_notifications)
                
                # Delete expired notifications
                for notification in expired_notifications:
                    await session.delete(notification)
                    await self._emit_event(NotificationEvent.EXPIRED, notification)
                
                if count > 0:
                    await session.commit()
                    logger.info(f"Cleaned up {count} expired notifications")
                
                return count
                
        except Exception as e:
            logger.error(f"Failed to cleanup expired notifications: {e}")
            return 0
    
    async def _get_user_preferences(
        self, 
        session, 
        user_id: str
    ) -> Optional[NotificationPreference]:
        """Get user notification preferences"""
        try:
            result = await session.execute(
                select(NotificationPreference).where(
                    NotificationPreference.user_id == user_id
                )
            )
            return result.scalar_one_or_none()
        except Exception as e:
            logger.error(f"Failed to get user preferences: {e}")
            return None
    
    async def _should_deliver_notification(
        self, 
        preferences: Optional[NotificationPreference], 
        notification_data: NotificationData
    ) -> bool:
        """Check if notification should be delivered based on user preferences"""
        if not preferences:
            return True  # Default to allow if no preferences set
        
        # Check if in-app notifications are enabled
        if not preferences.in_app_enabled:
            return False
        
        # Check type-specific preferences
        if not preferences.get_type_preference(notification_data.type.value, "in_app"):
            return False
        
        # Check quiet hours
        if preferences.is_in_quiet_hours():
            return notification_data.priority == NotificationPriority.URGENT
        
        return True
    
    async def _deliver_notification(
        self, 
        notification: Notification, 
        notification_data: NotificationData
    ) -> None:
        """Handle notification delivery to various channels"""
        try:
            # Mark as delivered for in-app
            notification.mark_as_delivered()
            
            # Update in database
            async for session in db_manager.get_session():
                session.add(notification)
                await session.commit()
                break
            
            # Emit delivered event
            await self._emit_event(NotificationEvent.DELIVERED, notification)
            
            # TODO: Implement email and push notification delivery
            # This would integrate with email service and push notification service
            
        except Exception as e:
            logger.error(f"Failed to deliver notification {notification.id}: {e}")
    
    async def _emit_event(self, event_type: str, data: Any) -> None:
        """Emit notification events to registered handlers"""
        handlers = self.event_handlers.get(event_type, [])
        
        for handler in handlers:
            try:
                if asyncio.iscoroutinefunction(handler):
                    await handler(data)
                else:
                    handler(data)
            except Exception as e:
                logger.error(f"Event handler failed for {event_type}: {e}")
    
    def add_event_handler(self, event_type: str, handler: Callable) -> None:
        """Add an event handler for notification events"""
        if event_type not in self.event_handlers:
            self.event_handlers[event_type] = []
        
        self.event_handlers[event_type].append(handler)
        logger.info(f"Added event handler for {event_type}")
    
    def remove_event_handler(self, event_type: str, handler: Callable) -> None:
        """Remove an event handler"""
        if event_type in self.event_handlers:
            try:
                self.event_handlers[event_type].remove(handler)
                logger.info(f"Removed event handler for {event_type}")
            except ValueError:
                pass

# Global notification service instance
notification_service = NotificationService()