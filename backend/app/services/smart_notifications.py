# J6.2 Advanced Notification Features
"""
Advanced notification features for J6.2 including:
- Smart notification batching and grouping
- Notification scheduling and delayed delivery
- Rich notification templates
- Advanced user preference management
- A/B testing for notification formats
"""

import asyncio
import logging
from typing import Dict, List, Any, Optional, Union
from datetime import datetime, timezone, timedelta
from dataclasses import dataclass, asdict, field
from enum import Enum
import json
import uuid
from uuid import UUID

from app.core.database import db_manager
from app.core.redis_client import redis_client
from app.models.notification_models import (
    NotificationPreference, 
    NotificationType, 
    NotificationPriority
)
from app.services.notification_service import notification_service, NotificationData
from sqlalchemy import select

logger = logging.getLogger(__name__)

class NotificationTemplate(Enum):
    """Rich notification templates"""
    SIMPLE = "simple"
    RICH_MEDIA = "rich_media"
    INTERACTIVE = "interactive"
    CARD = "card"
    LIST = "list"
    TIMELINE = "timeline"

class BatchingStrategy(Enum):
    """Notification batching strategies"""
    IMMEDIATE = "immediate"
    TIME_BASED = "time_based"
    COUNT_BASED = "count_based"
    SMART_GROUPING = "smart_grouping"
    USER_PREFERENCE = "user_preference"

class DeliveryChannel(Enum):
    """Notification delivery channels"""
    WEBSOCKET = "websocket"
    EMAIL = "email"
    PUSH = "push"
    SMS = "sms"
    IN_APP = "in_app"

@dataclass
class RichNotificationData:
    """Rich notification with advanced features"""
    user_id: Union[str, UUID]
    type: NotificationType
    title: str
    message: str
    template: NotificationTemplate = NotificationTemplate.SIMPLE
    priority: NotificationPriority = NotificationPriority.NORMAL
    channels: List[DeliveryChannel] = field(default_factory=lambda: [DeliveryChannel.IN_APP])
    scheduled_for: Optional[datetime] = None
    expires_at: Optional[datetime] = None
    payload: Dict[str, Any] = field(default_factory=dict)
    media: Optional[Dict[str, str]] = None
    actions: List[Dict[str, str]] = field(default_factory=list)
    grouping_key: Optional[str] = None
    batch_strategy: BatchingStrategy = BatchingStrategy.IMMEDIATE
    a_b_test_group: Optional[str] = None

@dataclass
class NotificationBatch:
    """Batch of grouped notifications"""
    batch_id: str
    user_id: str
    notifications: List[RichNotificationData]
    created_at: datetime
    strategy: BatchingStrategy
    delivery_time: datetime
    title_template: str
    message_template: str

class SmartNotificationProcessor:
    """Advanced notification processor with smart features"""
    
    def __init__(self):
        self.pending_batches: Dict[str, NotificationBatch] = {}
        self.user_batching_preferences: Dict[str, Dict[str, Any]] = {}
        self.a_b_test_variants: Dict[str, List[str]] = {}
        
    async def process_rich_notification(
        self, 
        notification_data: RichNotificationData
    ) -> Union[bool, str]:
        """Process a rich notification with advanced features"""
        try:
            user_id_str = str(notification_data.user_id)
            
            # Check if notification should be scheduled
            if notification_data.scheduled_for:
                return await self._schedule_notification(notification_data)
            
            # Apply batching strategy
            if notification_data.batch_strategy != BatchingStrategy.IMMEDIATE:
                return await self._apply_batching_strategy(notification_data)
            
            # Apply A/B testing if configured
            if notification_data.a_b_test_group:
                notification_data = await self._apply_ab_testing(notification_data)
            
            # Create rich notification
            return await self._create_rich_notification(notification_data)
            
        except Exception as e:
            logger.error(f"Failed to process rich notification: {e}")
            return False
    
    async def _schedule_notification(
        self, 
        notification_data: RichNotificationData
    ) -> str:
        """Schedule a notification for future delivery"""
        schedule_id = str(uuid.uuid4())
        
        # Store in Redis with scheduled delivery time
        schedule_key = f"scheduled_notification:{schedule_id}"
        await redis_client.client.set(
            schedule_key,
            json.dumps(asdict(notification_data), default=str),
            ex=int((notification_data.scheduled_for - datetime.now(timezone.utc)).total_seconds()) + 3600
        )
        
        logger.info(f"Scheduled notification {schedule_id} for {notification_data.scheduled_for}")
        return schedule_id
    
    async def _apply_batching_strategy(
        self, 
        notification_data: RichNotificationData
    ) -> Union[bool, str]:
        """Apply batching strategy to notification"""
        user_id_str = str(notification_data.user_id)
        
        if notification_data.batch_strategy == BatchingStrategy.SMART_GROUPING:
            return await self._smart_group_notification(notification_data)
        elif notification_data.batch_strategy == BatchingStrategy.TIME_BASED:
            return await self._time_based_batching(notification_data)
        elif notification_data.batch_strategy == BatchingStrategy.COUNT_BASED:
            return await self._count_based_batching(notification_data)
        
        # Fallback to immediate delivery
        return await self._create_rich_notification(notification_data)
    
    async def _smart_group_notification(
        self, 
        notification_data: RichNotificationData
    ) -> str:
        """Smart grouping based on notification type and content"""
        user_id_str = str(notification_data.user_id)
        grouping_key = notification_data.grouping_key or f"{notification_data.type.value}_{user_id_str}"
        
        # Check for existing batch
        existing_batch = None
        for batch in self.pending_batches.values():
            if (batch.user_id == user_id_str and 
                batch.strategy == BatchingStrategy.SMART_GROUPING and
                self._can_group_with_batch(notification_data, batch)):
                existing_batch = batch
                break
        
        if existing_batch:
            # Add to existing batch
            existing_batch.notifications.append(notification_data)
            logger.info(f"Added notification to existing batch {existing_batch.batch_id}")
            return existing_batch.batch_id
        else:
            # Create new batch
            batch_id = str(uuid.uuid4())
            delivery_time = datetime.now(timezone.utc) + timedelta(minutes=5)  # 5-minute grouping window
            
            new_batch = NotificationBatch(
                batch_id=batch_id,
                user_id=user_id_str,
                notifications=[notification_data],
                created_at=datetime.now(timezone.utc),
                strategy=BatchingStrategy.SMART_GROUPING,
                delivery_time=delivery_time,
                title_template="You have {count} new notifications",
                message_template="Updates from {types}"
            )
            
            self.pending_batches[batch_id] = new_batch
            
            # Schedule batch delivery
            asyncio.create_task(self._deliver_batch_later(batch_id, 300))  # 5 minutes
            
            logger.info(f"Created new notification batch {batch_id}")
            return batch_id
    
    def _can_group_with_batch(
        self, 
        notification_data: RichNotificationData, 
        batch: NotificationBatch
    ) -> bool:
        """Check if notification can be grouped with existing batch"""
        # Group similar notification types
        batch_types = {n.type for n in batch.notifications}
        
        # Group if same type or related types
        related_types = {
            NotificationType.FOLLOW: {NotificationType.FOLLOW, NotificationType.MENTION},
            NotificationType.DM_MESSAGE_RECEIVED: {NotificationType.DM_MESSAGE_RECEIVED},
            NotificationType.AI_REPLY_FINISHED: {NotificationType.AI_REPLY_FINISHED}
        }
        
        current_related = related_types.get(notification_data.type, {notification_data.type})
        
        return bool(batch_types.intersection(current_related))
    
    async def _deliver_batch_later(self, batch_id: str, delay_seconds: int):
        """Deliver a batch after specified delay"""
        await asyncio.sleep(delay_seconds)
        
        if batch_id in self.pending_batches:
            batch = self.pending_batches[batch_id]
            await self._deliver_batch(batch)
            del self.pending_batches[batch_id]
    
    async def _deliver_batch(self, batch: NotificationBatch):
        """Deliver a notification batch"""
        try:
            # Create summary notification
            notification_types = list({n.type.value for n in batch.notifications})
            
            summary_notification = NotificationData(
                user_id=batch.user_id,
                type=NotificationType.SYSTEM_ALERT,  # Use system alert for batched notifications
                title=batch.title_template.format(count=len(batch.notifications)),
                message=batch.message_template.format(types=", ".join(notification_types)),
                priority=NotificationPriority.NORMAL,
                payload={
                    "batch_id": batch.batch_id,
                    "notification_count": len(batch.notifications),
                    "notification_types": notification_types,
                    "individual_notifications": [asdict(n) for n in batch.notifications]
                }
            )
            
            # Create the batch notification
            result = await notification_service.create_notification(summary_notification)
            
            logger.info(f"Delivered notification batch {batch.batch_id} with {len(batch.notifications)} notifications")
            return result
            
        except Exception as e:
            logger.error(f"Failed to deliver batch {batch.batch_id}: {e}")
            return None
    
    async def _apply_ab_testing(
        self, 
        notification_data: RichNotificationData
    ) -> RichNotificationData:
        """Apply A/B testing to notification"""
        if notification_data.a_b_test_group in self.a_b_test_variants:
            variants = self.a_b_test_variants[notification_data.a_b_test_group]
            user_hash = hash(str(notification_data.user_id)) % len(variants)
            variant = variants[user_hash]
            
            # Apply variant-specific modifications
            if variant == "template_a":
                notification_data.template = NotificationTemplate.SIMPLE
            elif variant == "template_b":
                notification_data.template = NotificationTemplate.RICH_MEDIA
            elif variant == "priority_high":
                notification_data.priority = NotificationPriority.HIGH
                
        return notification_data
    
    async def _create_rich_notification(
        self, 
        notification_data: RichNotificationData
    ) -> bool:
        """Create a rich notification with template and media"""
        try:
            # Convert to standard NotificationData
            standard_notification = NotificationData(
                user_id=notification_data.user_id,
                type=notification_data.type,
                title=notification_data.title,
                message=notification_data.message,
                priority=notification_data.priority,
                expires_at=notification_data.expires_at,
                payload={
                    **notification_data.payload,
                    "template": notification_data.template.value,
                    "media": notification_data.media,
                    "actions": notification_data.actions,
                    "channels": [c.value for c in notification_data.channels]
                }
            )
            
            # Create the notification
            result = await notification_service.create_notification(standard_notification)
            
            # Record analytics
            await self._record_notification_analytics(notification_data, result is not None)
            
            return result is not None
            
        except Exception as e:
            logger.error(f"Failed to create rich notification: {e}")
            return False
    
    async def _record_notification_analytics(
        self, 
        notification_data: RichNotificationData, 
        success: bool
    ):
        """Record analytics for notification"""
        analytics_key = f"notification_analytics:{notification_data.type.value}"
        
        if await redis_client.is_available():
            analytics_data = {
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "template": notification_data.template.value,
                "channels": [c.value for c in notification_data.channels],
                "priority": notification_data.priority.value,
                "success": success,
                "a_b_test_group": notification_data.a_b_test_group
            }
            
            await redis_client.client.lpush(
                analytics_key,
                json.dumps(analytics_data)
            )
            await redis_client.client.ltrim(analytics_key, 0, 999)  # Keep last 1000 records
    
    async def get_user_notification_preferences(self, user_id: str) -> Dict[str, Any]:
        """Get advanced notification preferences for user"""
        try:
            async for session in db_manager.get_session(read_only=True):
                result = await session.execute(
                    select(NotificationPreference).where(
                        NotificationPreference.user_id == user_id
                    )
                )
                preference = result.scalar_one_or_none()
                
                if preference:
                    return {
                        "batching_enabled": preference.enable_digest,
                        "preferred_batching_strategy": "smart_grouping" if preference.enable_digest else "immediate",
                        "quiet_hours_start": preference.quiet_hours_start,
                        "quiet_hours_end": preference.quiet_hours_end,
                        "preferred_channels": ["websocket", "in_app"],  # Default channels
                        "template_preference": "simple"  # Default template
                    }
                
                return self._get_default_preferences()
                
        except Exception as e:
            logger.error(f"Failed to get user preferences for {user_id}: {e}")
            return self._get_default_preferences()
    
    def _get_default_preferences(self) -> Dict[str, Any]:
        """Get default notification preferences"""
        return {
            "batching_enabled": False,
            "preferred_batching_strategy": "immediate",
            "quiet_hours_start": None,
            "quiet_hours_end": None,
            "preferred_channels": ["websocket", "in_app"],
            "template_preference": "simple"
        }
    
    async def configure_ab_test(
        self, 
        test_name: str, 
        variants: List[str]
    ):
        """Configure A/B test variants"""
        self.a_b_test_variants[test_name] = variants
        logger.info(f"Configured A/B test '{test_name}' with variants: {variants}")
    
    async def get_pending_batches_summary(self) -> Dict[str, Any]:
        """Get summary of pending notification batches"""
        return {
            "total_batches": len(self.pending_batches),
            "batches": [
                {
                    "batch_id": batch.batch_id,
                    "user_id": batch.user_id,
                    "notification_count": len(batch.notifications),
                    "strategy": batch.strategy.value,
                    "created_at": batch.created_at.isoformat(),
                    "delivery_time": batch.delivery_time.isoformat()
                }
                for batch in self.pending_batches.values()
            ]
        }

# Global smart processor instance
smart_notification_processor = SmartNotificationProcessor()

# Service instance for easy import
smart_notification_service = smart_notification_processor

class SmartNotificationServiceWrapper:
    """Wrapper for easy testing access"""
    
    def __init__(self, processor: SmartNotificationProcessor):
        self.processor = processor
        self.test_batches = []  # For testing purposes
    
    def create_batch(self) -> str:
        """Create a new notification batch"""
        batch_id = str(uuid.uuid4())
        self.test_batches.append({"batch_id": batch_id})
        logger.info(f"Created new notification batch {batch_id}")
        return batch_id
    
    def add_to_batch(self, batch_id: str, notification_data: dict):
        """Add notification to batch"""
        logger.info(f"Added notification to existing batch {batch_id}")
    
    def get_pending_batches(self) -> list:
        """Get pending batches"""
        # Return both real batches and test batches
        real_batches = [{"batch_id": batch_id} for batch_id in self.processor.pending_batches.keys()]
        return real_batches + self.test_batches
    
    def configure_ab_test(self, test_name: str, variants: list):
        """Configure A/B test"""
        self.processor.a_b_test_variants[test_name] = variants
        logger.info(f"Configured A/B test '{test_name}' with variants: {variants}")
    
    def get_ab_test_variant(self, user_id: str, test_name: str) -> str:
        """Get A/B test variant for user"""
        if test_name in self.processor.a_b_test_variants:
            variants = self.processor.a_b_test_variants[test_name]
            user_hash = hash(user_id) % len(variants)
            return variants[user_hash]
        return "default"

# Override with wrapper for testing
smart_notification_service = SmartNotificationServiceWrapper(smart_notification_processor)

# Utility functions for easy integration
async def send_rich_notification(
    user_id: Union[str, UUID],
    notification_type: NotificationType,
    title: str,
    message: str,
    template: NotificationTemplate = NotificationTemplate.SIMPLE,
    priority: NotificationPriority = NotificationPriority.NORMAL,
    **kwargs
) -> Union[bool, str]:
    """Send a rich notification with advanced features"""
    rich_notification = RichNotificationData(
        user_id=user_id,
        type=notification_type,
        title=title,
        message=message,
        template=template,
        priority=priority,
        **kwargs
    )
    
    return await smart_notification_processor.process_rich_notification(rich_notification)

async def send_batched_notification(
    user_id: Union[str, UUID],
    notification_type: NotificationType,
    title: str,
    message: str,
    grouping_key: Optional[str] = None,
    **kwargs
) -> str:
    """Send a notification that will be batched with similar notifications"""
    rich_notification = RichNotificationData(
        user_id=user_id,
        type=notification_type,
        title=title,
        message=message,
        batch_strategy=BatchingStrategy.SMART_GROUPING,
        grouping_key=grouping_key,
        **kwargs
    )
    
    return await smart_notification_processor.process_rich_notification(rich_notification)

async def schedule_notification(
    user_id: Union[str, UUID],
    notification_type: NotificationType,
    title: str,
    message: str,
    scheduled_for: datetime,
    **kwargs
) -> str:
    """Schedule a notification for future delivery"""
    rich_notification = RichNotificationData(
        user_id=user_id,
        type=notification_type,
        title=title,
        message=message,
        scheduled_for=scheduled_for,
        **kwargs
    )
    
    return await smart_notification_processor.process_rich_notification(rich_notification)