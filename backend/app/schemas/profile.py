"""
Pydantic schemas for profile and user settings.
"""

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field, HttpUrl


# Profile request schemas
class ProfileUpdateRequest(BaseModel):
    """Profile update request schema."""
    username: Optional[str] = Field(None, min_length=3, max_length=30, pattern="^[a-zA-Z0-9_]+$")
    display_name: Optional[str] = Field(None, min_length=1, max_length=100)
    bio: Optional[str] = Field(None, max_length=500)
    avatar_url: Optional[HttpUrl] = None
    is_public: Optional[bool] = None


class UserSettingsUpdateRequest(BaseModel):
    """User settings update request schema."""
    full_name: Optional[str] = Field(None, min_length=1, max_length=100)
    email: Optional[str] = None  # Email changes require verification
    timezone: Optional[str] = Field(None, max_length=50)
    language: Optional[str] = Field(None, max_length=10)


# Notification preferences schemas
class NotificationPreferencesUpdateRequest(BaseModel):
    """Notification preferences update request schema."""
    email_enabled: Optional[bool] = None
    email_follows: Optional[bool] = None
    email_messages: Optional[bool] = None
    email_ai_responses: Optional[bool] = None
    email_system: Optional[bool] = None
    push_enabled: Optional[bool] = None
    push_follows: Optional[bool] = None
    push_messages: Optional[bool] = None
    push_ai_responses: Optional[bool] = None
    push_system: Optional[bool] = None


# Response schemas
class ProfileResponse(BaseModel):
    """Profile response schema."""
    id: UUID
    user_id: UUID
    username: Optional[str]
    display_name: str
    bio: Optional[str]
    avatar_url: Optional[str]
    is_public: bool
    follower_count: int
    following_count: int
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class UserSettingsResponse(BaseModel):
    """User settings response schema."""
    id: UUID
    email: str
    full_name: str
    timezone: Optional[str]
    language: Optional[str]
    is_verified: bool
    is_active: bool
    created_at: datetime
    updated_at: datetime
    last_login: Optional[datetime]
    
    class Config:
        from_attributes = True


class NotificationPreferencesResponse(BaseModel):
    """Notification preferences response schema."""
    id: UUID
    user_id: UUID
    email_enabled: bool
    email_follows: bool
    email_messages: bool
    email_ai_responses: bool
    email_system: bool
    push_enabled: bool
    push_follows: bool
    push_messages: bool
    push_ai_responses: bool
    push_system: bool
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class PublicProfileResponse(BaseModel):
    """Public profile response schema (limited info for non-friends)."""
    id: UUID
    username: Optional[str]
    display_name: str
    bio: Optional[str]
    avatar_url: Optional[str]
    is_public: bool
    follower_count: int
    following_count: int
    created_at: datetime
    is_following: Optional[bool] = None  # Whether current user follows this profile
    
    class Config:
        from_attributes = True


class ProfileSearchResponse(BaseModel):
    """Profile search response schema."""
    profiles: list[PublicProfileResponse]
    total: int
    page: int
    page_size: int
    has_next: bool