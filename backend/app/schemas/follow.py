"""
Pydantic schemas for follow graph functionality.
"""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


# Request schemas
class FollowRequest(BaseModel):
    """Follow user request schema."""
    user_id: UUID


class UnfollowRequest(BaseModel):
    """Unfollow user request schema."""
    user_id: UUID


# Response schemas
class FollowResponse(BaseModel):
    """Follow relationship response schema."""
    id: UUID
    follower_id: UUID
    followee_id: UUID
    created_at: datetime
    
    class Config:
        from_attributes = True


class UserFollowStatus(BaseModel):
    """User follow status response schema."""
    user_id: UUID
    username: str | None
    display_name: str
    avatar_url: str | None
    is_following: bool
    follows_you: bool
    mutual_follow: bool
    created_at: datetime
    
    class Config:
        from_attributes = True


class FollowersListResponse(BaseModel):
    """Followers list response schema."""
    followers: list[UserFollowStatus]
    total: int
    page: int
    page_size: int
    has_next: bool


class FollowingListResponse(BaseModel):
    """Following list response schema."""
    following: list[UserFollowStatus]
    total: int
    page: int
    page_size: int
    has_next: bool


class FollowStatsResponse(BaseModel):
    """Follow statistics response schema."""
    user_id: UUID
    username: str | None
    display_name: str
    follower_count: int
    following_count: int
    mutual_followers_count: int | None = None  # Only shown to authenticated users


class MutualFollowsResponse(BaseModel):
    """Mutual follows response schema."""
    mutual_follows: list[UserFollowStatus]
    total: int
    page: int
    page_size: int
    has_next: bool


class SuggestedUsersResponse(BaseModel):
    """Suggested users response schema."""
    suggestions: list[UserFollowStatus]
    reason: str  # "mutual_follows", "popular", "new_users", etc.
    total: int
    page: int
    page_size: int
    has_next: bool


class FollowActivityResponse(BaseModel):
    """Recent follow activity response schema."""
    recent_followers: list[UserFollowStatus]
    recent_following: list[UserFollowStatus]
    follower_growth: int  # New followers in last 7 days
    following_growth: int  # New following in last 7 days


class FollowActionResponse(BaseModel):
    """Unified response for follow/unfollow actions returning current relationship + counters."""
    user_id: UUID  # target user id
    is_following: bool
    follows_you: bool
    mutual_follow: bool
    follower_count: int  # target's follower_count
    following_count: int  # target's following_count
    current_user_following_count: int  # caller's following_count after action
    action: str  # 'follow' or 'unfollow' or 'noop'