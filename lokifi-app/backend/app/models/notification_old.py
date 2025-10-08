"""
Notification models for user notifications.
"""

import uuid
from datetime import datetime
from enum import Enum

from sqlalchemy import Boolean, DateTime, ForeignKey, String, Text, func
from sqlalchemy import Enum as SqlEnum
from sqlalchemy.dialects.postgresql import JSON, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.database import Base


class NotificationType(str, Enum):
    """Notification types."""
    FOLLOW = "follow"
    MESSAGE = "message"
    AI_RESPONSE = "ai_response"
    SYSTEM = "system"


class NotificationPriority(str, Enum):
    """Notification priority levels."""
    LOW = "low"
    NORMAL = "normal"
    HIGH = "high"
    URGENT = "urgent"


class Notification(Base):
    """Notification model."""
    
    __tablename__ = "notifications"
    
    # Primary key
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), 
        primary_key=True, 
        default=uuid.uuid4
    )
    
    # Foreign keys
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), 
        ForeignKey("users.id", ondelete="CASCADE")
    )
    
    # Optional related user (e.g., who followed you)
    related_user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), 
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True
    )
    
    # Notification content
    type: Mapped[NotificationType] = mapped_column(SqlEnum(NotificationType))
    priority: Mapped[NotificationPriority] = mapped_column(
        SqlEnum(NotificationPriority), 
        default=NotificationPriority.NORMAL
    )
    title: Mapped[str] = mapped_column(String(200))
    message: Mapped[str] = mapped_column(Text)
    
    # Optional metadata
    extra_data: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    
    # Status
    is_read: Mapped[bool] = mapped_column(Boolean, default=False)
    is_delivered: Mapped[bool] = mapped_column(Boolean, default=False)
    
    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), 
        server_default=func.now()
    )
    read_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), 
        nullable=True
    )
    delivered_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), 
        nullable=True
    )
    
    # Expiration
    expires_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), 
        nullable=True
    )
    
    # Relationships
    user = relationship("User", foreign_keys=[user_id], back_populates="notifications")
    related_user = relationship("User", foreign_keys=[related_user_id])
    
    def __repr__(self) -> str:
        return f"<Notification(id={self.id}, type={self.type}, title='{self.title}', is_read={self.is_read})>"


class NotificationPreference(Base):
    """User notification preferences."""
    
    __tablename__ = "notification_preferences"
    
    # Primary key
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), 
        primary_key=True, 
        default=uuid.uuid4
    )
    
    # Foreign keys
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), 
        ForeignKey("users.id", ondelete="CASCADE"),
        unique=True
    )
    
    # Email notification preferences
    email_enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    email_follows: Mapped[bool] = mapped_column(Boolean, default=True)
    email_messages: Mapped[bool] = mapped_column(Boolean, default=True)
    email_ai_responses: Mapped[bool] = mapped_column(Boolean, default=False)
    email_system: Mapped[bool] = mapped_column(Boolean, default=True)
    
    # Push notification preferences (future implementation)
    push_enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    push_follows: Mapped[bool] = mapped_column(Boolean, default=True)
    push_messages: Mapped[bool] = mapped_column(Boolean, default=True)
    push_ai_responses: Mapped[bool] = mapped_column(Boolean, default=False)
    push_system: Mapped[bool] = mapped_column(Boolean, default=True)
    
    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), 
        server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), 
        server_default=func.now(), 
        onupdate=func.now()
    )
    
    # Relationships
    user = relationship("User", back_populates="notification_preferences")
    
    def __repr__(self) -> str:
        return f"<NotificationPreference(id={self.id}, user_id={self.user_id}, email_enabled={self.email_enabled})>"