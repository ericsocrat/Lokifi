"""
Pydantic schemas for profile and user settings.
"""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field, HttpUrl


# Profile request schemas
class ProfileUpdateRequest(BaseModel):
    """Profile update request schema."""
    username: str | None = Field(None, min_length=3, max_length=30, pattern="^[a-zA-Z0-9_]+$")
    display_name: str | None = Field(None, min_length=1, max_length=100)
    bio: str | None = Field(None, max_length=500)
    avatar_url: HttpUrl | None = None
    is_public: bool | None = None


class UserSettingsUpdateRequest(BaseModel):
    """User settings update request schema."""
    full_name: str | None = Field(None, min_length=1, max_length=100)
    email: str | None = None  # Email changes require verification
    timezone: str | None = Field(None, max_length=50)
    language: str | None = Field(None, max_length=10)


# Notification preferences schemas
class NotificationPreferencesUpdateRequest(BaseModel):
    """Notification preferences update request schema."""
    email_enabled: bool | None = None
    email_follows: bool | None = None
    email_messages: bool | None = None
    email_ai_responses: bool | None = None
    email_system: bool | None = None
    push_enabled: bool | None = None
    push_follows: bool | None = None
    push_messages: bool | None = None
    push_ai_responses: bool | None = None
    push_system: bool | None = None


# Response schemas
class ProfileResponse(BaseModel):
    """Profile response schema."""
    id: UUID
    user_id: UUID
    username: str | None
    display_name: str
    bio: str | None
    avatar_url: str | None
    is_public: bool
    follower_count: int
    following_count: int
    created_at: datetime
    updated_at: datetime
    
    model_config = {"from_attributes": True}


class UserSettingsResponse(BaseModel):
    """User settings response schema."""
    id: UUID
    email: str
    full_name: str
    timezone: str | None
    language: str | None
    is_verified: bool
    is_active: bool
    created_at: datetime
    updated_at: datetime
    last_login: datetime | None
    
    model_config = {"from_attributes": True}


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
    
    model_config = {"from_attributes": True}


class PublicProfileResponse(BaseModel):
    """Public profile response schema (limited info for non-friends)."""
    id: UUID
    username: str | None
    display_name: str
    bio: str | None
    avatar_url: str | None
    is_public: bool
    follower_count: int
    following_count: int
    created_at: datetime
    is_following: bool | None = None  # Whether current user follows this profile
    
    model_config = {"from_attributes": True}


class ProfileSearchResponse(BaseModel):
    """Profile search response schema."""
    profiles: list[PublicProfileResponse]
    total: int
    page: int
    page_size: int
    has_next: bool