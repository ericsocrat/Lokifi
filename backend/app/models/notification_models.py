# J6 Enterprise Notifications - Database Models
from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean, ForeignKey, JSON, Index
from sqlalchemy.orm import relationship
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime, timezone
from typing import Dict, Any, Optional
from enum import Enum
import uuid

from app.core.database import Base
from app.models.user import User

class NotificationType(str, Enum):
    """Notification types for different system events"""
    FOLLOW = "follow"
    DM_MESSAGE_RECEIVED = "dm_message_received"
    AI_REPLY_FINISHED = "ai_reply_finished"
    MENTION = "mention"
    SYSTEM_ALERT = "system_alert"
    ANNOUNCEMENT = "announcement"

class NotificationPriority(str, Enum):
    """Notification priority levels"""
    LOW = "low"
    NORMAL = "normal"
    HIGH = "high"
    URGENT = "urgent"

class Notification(Base):
    """
    Enterprise-grade notification model with comprehensive tracking
    
    Stores all system notifications with rich metadata and delivery tracking.
    Supports multiple notification types, priorities, and delivery channels.
    """
    __tablename__ = "notifications"

    # Primary identification
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    
    # Notification classification
    type = Column(String(50), nullable=False, index=True)
    priority = Column(String(20), nullable=False, default=NotificationPriority.NORMAL.value)
    category = Column(String(50), nullable=True, index=True)  # For grouping notifications
    
    # Content and metadata
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=True)
    payload = Column(JSON, nullable=True)  # Rich structured data
    
    # Delivery and interaction tracking
    created_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))
    read_at = Column(DateTime(timezone=True), nullable=True)
    delivered_at = Column(DateTime(timezone=True), nullable=True)
    clicked_at = Column(DateTime(timezone=True), nullable=True)
    dismissed_at = Column(DateTime(timezone=True), nullable=True)
    
    # Status flags
    is_read = Column(Boolean, nullable=False, default=False, index=True)
    is_delivered = Column(Boolean, nullable=False, default=False)
    is_dismissed = Column(Boolean, nullable=False, default=False)
    is_archived = Column(Boolean, nullable=False, default=False)
    
    # Delivery channels
    email_sent = Column(Boolean, nullable=False, default=False)
    push_sent = Column(Boolean, nullable=False, default=False)
    in_app_sent = Column(Boolean, nullable=False, default=True)
    
    # Expiration and cleanup
    expires_at = Column(DateTime(timezone=True), nullable=True)
    
    # Reference to related entities
    related_entity_type = Column(String(50), nullable=True)  # e.g., "message", "thread", "user"
    related_entity_id = Column(String(36), nullable=True)
    related_user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=True)  # For user-specific notifications
    
    # Batching and grouping
    batch_id = Column(String(36), nullable=True, index=True)  # For batch operations
    parent_notification_id = Column(String(36), ForeignKey("notifications.id"), nullable=True)
    
    # Relationships
    user = relationship(User, back_populates="notifications", foreign_keys=[user_id])
    children = relationship("Notification", backref="parent", remote_side=[id])
    
    # Indexes for performance
    __table_args__ = (
        Index('idx_notifications_user_unread', 'user_id', 'is_read'),
        Index('idx_notifications_user_type', 'user_id', 'type'),
        Index('idx_notifications_created_at', 'created_at'),
        Index('idx_notifications_expires_at', 'expires_at'),
        Index('idx_notifications_batch_id', 'batch_id'),
        Index('idx_notifications_related_entity', 'related_entity_type', 'related_entity_id'),
    )
    
    def __repr__(self):
        return f"<Notification(id={self.id}, user_id={self.user_id}, type={self.type}, title='{self.title}')>"
    
    @property
    def is_expired(self) -> bool:
        """Check if notification has expired"""
        if not self.expires_at:
            return False
        return datetime.now(timezone.utc) > self.expires_at
    
    @property
    def age_seconds(self) -> int:
        """Get notification age in seconds"""
        return int((datetime.now(timezone.utc) - self.created_at).total_seconds())
    
    def mark_as_read(self) -> None:
        """Mark notification as read with timestamp"""
        if not self.is_read:
            self.is_read = True
            self.read_at = datetime.now(timezone.utc)
    
    def mark_as_delivered(self) -> None:
        """Mark notification as delivered with timestamp"""
        if not self.is_delivered:
            self.is_delivered = True
            self.delivered_at = datetime.now(timezone.utc)
    
    def mark_as_clicked(self) -> None:
        """Mark notification as clicked with timestamp"""
        self.clicked_at = datetime.now(timezone.utc)
        if not self.is_read:
            self.mark_as_read()
    
    def dismiss(self) -> None:
        """Dismiss notification with timestamp"""
        self.is_dismissed = True
        self.dismissed_at = datetime.now(timezone.utc)
        if not self.is_read:
            self.mark_as_read()
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert notification to dictionary for API responses"""
        return {
            "id": self.id,
            "user_id": self.user_id,
            "type": self.type,
            "priority": self.priority,
            "category": self.category,
            "title": self.title,
            "message": self.message,
            "payload": self.payload,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "read_at": self.read_at.isoformat() if self.read_at else None,
            "delivered_at": self.delivered_at.isoformat() if self.delivered_at else None,
            "clicked_at": self.clicked_at.isoformat() if self.clicked_at else None,
            "dismissed_at": self.dismissed_at.isoformat() if self.dismissed_at else None,
            "is_read": self.is_read,
            "is_delivered": self.is_delivered,
            "is_dismissed": self.is_dismissed,
            "is_archived": self.is_archived,
            "email_sent": self.email_sent,
            "push_sent": self.push_sent,
            "in_app_sent": self.in_app_sent,
            "expires_at": self.expires_at.isoformat() if self.expires_at else None,
            "related_entity_type": self.related_entity_type,
            "related_entity_id": self.related_entity_id,
            "batch_id": self.batch_id,
            "parent_notification_id": self.parent_notification_id,
            "age_seconds": self.age_seconds,
            "is_expired": self.is_expired
        }

class NotificationPreference(Base):
    """
    User notification preferences and settings
    
    Controls how users receive different types of notifications
    across various delivery channels.
    """
    __tablename__ = "notification_preferences"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True)
    
    # Channel preferences
    email_enabled = Column(Boolean, nullable=False, default=True)
    push_enabled = Column(Boolean, nullable=False, default=True)
    in_app_enabled = Column(Boolean, nullable=False, default=True)
    
    # Type-specific preferences (JSON for flexibility)
    type_preferences = Column(JSON, nullable=False, default=dict)
    
    # Timing preferences
    quiet_hours_start = Column(String(5), nullable=True)  # "22:00"
    quiet_hours_end = Column(String(5), nullable=True)    # "08:00"
    timezone = Column(String(50), nullable=False, default="UTC")
    
    # Digest settings
    daily_digest_enabled = Column(Boolean, nullable=False, default=False)
    weekly_digest_enabled = Column(Boolean, nullable=False, default=False)
    digest_time = Column(String(5), nullable=False, default="09:00")
    
    # Metadata
    created_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))
    
    # Relationships
    user = relationship("User", back_populates="notification_preferences")
    
    def __repr__(self):
        return f"<NotificationPreference(user_id={self.user_id}, email={self.email_enabled}, push={self.push_enabled})>"
    
    def get_type_preference(self, notification_type: str, channel: str = "in_app") -> bool:
        """Get preference for specific notification type and channel"""
        type_prefs = self.type_preferences or {}
        return type_prefs.get(f"{notification_type}_{channel}", True)
    
    def set_type_preference(self, notification_type: str, channel: str, enabled: bool) -> None:
        """Set preference for specific notification type and channel"""
        if not self.type_preferences:
            self.type_preferences = {}
        self.type_preferences[f"{notification_type}_{channel}"] = enabled
    
    def is_in_quiet_hours(self, check_time: Optional[datetime] = None) -> bool:
        """Check if current time (or given time) is in quiet hours"""
        if not self.quiet_hours_start or not self.quiet_hours_end:
            return False
        
        if not check_time:
            check_time = datetime.now(timezone.utc)
        
        # Convert to user's timezone if specified
        # For now, assume UTC (can be enhanced with timezone conversion)
        time_str = check_time.strftime("%H:%M")
        
        # Handle quiet hours that span midnight
        if self.quiet_hours_start > self.quiet_hours_end:
            return time_str >= self.quiet_hours_start or time_str <= self.quiet_hours_end
        else:
            return self.quiet_hours_start <= time_str <= self.quiet_hours_end
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert preferences to dictionary"""
        return {
            "id": self.id,
            "user_id": self.user_id,
            "email_enabled": self.email_enabled,
            "push_enabled": self.push_enabled,
            "in_app_enabled": self.in_app_enabled,
            "type_preferences": self.type_preferences,
            "quiet_hours_start": self.quiet_hours_start,
            "quiet_hours_end": self.quiet_hours_end,
            "timezone": self.timezone,
            "daily_digest_enabled": self.daily_digest_enabled,
            "weekly_digest_enabled": self.weekly_digest_enabled,
            "digest_time": self.digest_time,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None
        }

# Update User model to include notification relationships
def add_notification_relationships():
    """Add notification relationships to User model"""
    # This would be called during model initialization
    if not hasattr(User, 'notifications'):
        User.notifications = relationship("Notification", back_populates="user", cascade="all, delete-orphan")
    
    if not hasattr(User, 'notification_preferences'):
        User.notification_preferences = relationship("NotificationPreference", back_populates="user", uselist=False, cascade="all, delete-orphan")

# Call this during app initialization
add_notification_relationships()