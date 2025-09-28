"""
User model for authentication and basic user data.
"""

from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import Boolean, DateTime, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

import uuid


class User(Base):
    """User model for authentication."""
    
    __tablename__ = "users"
    
    # Primary key
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), 
        primary_key=True, 
        default=uuid.uuid4
    )
    
    # Authentication fields
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    password_hash: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)  # Nullable for OAuth-only users
    full_name: Mapped[str] = mapped_column(String(100))
    
    # OAuth fields
    google_id: Mapped[Optional[str]] = mapped_column(String(255), unique=True, nullable=True, index=True)
    
    # User preferences
    timezone: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    language: Mapped[Optional[str]] = mapped_column(String(10), nullable=True, default="en")
    
    # Account status
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False)
    
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
    last_login: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), 
        nullable=True
    )
    
    # Verification
    verification_token: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    verification_expires: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), 
        nullable=True
    )
    
    # Password reset
    reset_token: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    reset_expires: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), 
        nullable=True
    )
    
    # Relationships - commented out non-essential ones to avoid initialization issues
    # profile = relationship("Profile", back_populates="user", uselist=False)
    # following = relationship(
    #     "Follow", 
    #     foreign_keys="Follow.follower_id", 
    #     back_populates="follower"
    # )
    # followers = relationship(
    #     "Follow", 
    #     foreign_keys="Follow.followee_id", 
    #     back_populates="followee"
    # )
    # conversations = relationship("ConversationParticipant", back_populates="user")
    # sent_messages = relationship("Message", foreign_keys="Message.sender_id", back_populates="sender")
    # ai_threads = relationship("AIThread", back_populates="user")
    notifications = relationship(
        "Notification",
        foreign_keys="Notification.user_id",
        back_populates="user"
    )
    # notification_preferences = relationship("NotificationPreference", back_populates="user", uselist=False)
    # Optional: notifications where this user is the related_user (no back_populates to avoid cycles)
    # related_notifications = relationship(
    #     "Notification",
    #     foreign_keys="Notification.related_user_id",
    #     viewonly=True
    # )
    
    def __repr__(self) -> str:
        return f"<User(id={self.id}, email='{self.email}')>"