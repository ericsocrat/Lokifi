"""
Pydantic schemas for authentication endpoints.
"""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field


# Request schemas
class UserRegisterRequest(BaseModel):
    """User registration request schema."""
    email: EmailStr
    password: str = Field(min_length=8, max_length=100)
    full_name: str = Field(min_length=1, max_length=100)
    username: str | None = Field(None, min_length=3, max_length=30)


class UserLoginRequest(BaseModel):
    """User login request schema."""
    email: EmailStr
    password: str


class GoogleOAuthRequest(BaseModel):
    """Google OAuth request schema."""
    access_token: str


class RefreshTokenRequest(BaseModel):
    """Refresh token request schema."""
    refresh_token: str


# Response schemas
class TokenResponse(BaseModel):
    """Token response schema."""
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int


class UserResponse(BaseModel):
    """User response schema."""
    id: UUID
    email: str
    full_name: str
    is_active: bool
    is_verified: bool
    created_at: datetime
    
    class Config:
        from_attributes = True


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
    
    class Config:
        from_attributes = True


class AuthUserResponse(BaseModel):
    """Authenticated user response schema."""
    user: UserResponse
    profile: ProfileResponse | None


class MessageResponse(BaseModel):
    """Generic message response schema."""
    message: str
    success: bool = True