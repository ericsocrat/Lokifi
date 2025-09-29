"""
Authentication service for user management.
"""

import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status

from app.models.user import User
from app.models.profile import Profile
from app.models.notification import NotificationPreference
from app.core.security import hash_password, verify_password, create_access_token, create_refresh_token, validate_email, validate_password_strength
from app.schemas.auth import UserRegisterRequest, UserLoginRequest, UserResponse, ProfileResponse, TokenResponse


class AuthService:
    """Authentication service."""
    
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def register_user(self, user_data: UserRegisterRequest) -> Dict[str, Any]:
        """Register a new user."""
        # Validate input
        if not validate_email(user_data.email):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid email format"
            )
        
        if not validate_password_strength(user_data.password):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Password must be at least 8 characters long"
            )
        
        # Check if user already exists
        stmt = select(User).where(User.email == user_data.email)
        result = await self.db.execute(stmt)
        existing_user = result.scalar_one_or_none()
        
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="User with this email already exists"
            )
        
        # Check if username is taken (if provided)
        if user_data.username:
            stmt = select(Profile).where(Profile.username == user_data.username)
            result = await self.db.execute(stmt)
            existing_profile = result.scalar_one_or_none()
            
            if existing_profile:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="Username already taken"
                )
        
        # Create user
        hashed_password = hash_password(user_data.password)
        user = User(
            id=uuid.uuid4(),
            email=user_data.email,
            password_hash=hashed_password,
            full_name=user_data.full_name,
            is_active=True,
            is_verified=False  # Email verification would be implemented here
        )
        
        self.db.add(user)
        await self.db.flush()  # Get the user ID
        
        # Create profile
        profile = Profile(
            id=uuid.uuid4(),
            user_id=user.id,
            username=user_data.username,
            display_name=user_data.full_name,
            is_public=True
        )
        
        self.db.add(profile)
        
        # Create notification preferences
        notification_prefs = NotificationPreference(
            id=uuid.uuid4(),
            user_id=user.id
        )
        
        self.db.add(notification_prefs)
        
        await self.db.commit()
        
        # Generate tokens
        access_token = create_access_token(str(user.id), user.email)
        refresh_token = create_refresh_token(str(user.id))
        
        return {
            "user": UserResponse.model_validate(user),
            "profile": ProfileResponse.model_validate(profile),
            "tokens": TokenResponse(
                access_token=access_token,
                refresh_token=refresh_token,
                expires_in=1800  # 30 minutes
            )
        }
    
    async def login_user(self, login_data: UserLoginRequest) -> Dict[str, Any]:
        """Login a user."""
        # Find user by email
        stmt = select(User).where(User.email == login_data.email)
        result = await self.db.execute(stmt)
        user = result.scalar_one_or_none()
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password"
            )
        
        # Verify password
        if not user.password_hash or not verify_password(login_data.password, user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password"
            )
        
        # Check if user is active
        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Account is deactivated"
            )
        
        # Update last login
        user.last_login = datetime.now(timezone.utc)
        await self.db.commit()
        
        # Get user profile
        stmt = select(Profile).where(Profile.user_id == user.id)
        result = await self.db.execute(stmt)
        profile = result.scalar_one_or_none()
        
        # Generate tokens
        access_token = create_access_token(str(user.id), user.email)
        refresh_token = create_refresh_token(str(user.id))
        
        return {
            "user": UserResponse.model_validate(user),
            "profile": ProfileResponse.model_validate(profile) if profile else None,
            "tokens": TokenResponse(
                access_token=access_token,
                refresh_token=refresh_token,
                expires_in=1800  # 30 minutes
            )
        }
    
    async def get_user_by_id(self, user_id: uuid.UUID) -> Optional[User]:
        """Get user by ID."""
        stmt = select(User).where(User.id == user_id)
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()
    
    async def get_user_by_email(self, email: str) -> Optional[User]:
        """Get user by email."""
        stmt = select(User).where(User.email == email)
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()
    
    async def create_user_from_oauth(self, email: str, full_name: str, google_id: str) -> Dict[str, Any]:
        """Create user from OAuth provider."""
        # Check if user already exists with this email
        existing_user = await self.get_user_by_email(email)
        if existing_user:
            # Update Google ID if not set
            if not existing_user.google_id:
                existing_user.google_id = google_id
                await self.db.commit()
            
            # Get profile
            stmt = select(Profile).where(Profile.user_id == existing_user.id)
            result = await self.db.execute(stmt)
            profile = result.scalar_one_or_none()
            
            # Generate tokens
            access_token = create_access_token(str(existing_user.id), existing_user.email)
            refresh_token = create_refresh_token(str(existing_user.id))
            
            return {
                "user": UserResponse.model_validate(existing_user),
                "profile": ProfileResponse.model_validate(profile) if profile else None,
                "tokens": TokenResponse(
                    access_token=access_token,
                    refresh_token=refresh_token,
                    expires_in=1800
                )
            }
        
        # Create new user
        user = User(
            id=uuid.uuid4(),
            email=email,
            full_name=full_name,
            google_id=google_id,
            is_active=True,
            is_verified=True  # OAuth users are pre-verified
        )
        
        self.db.add(user)
        await self.db.flush()
        
        # Create profile
        profile = Profile(
            id=uuid.uuid4(),
            user_id=user.id,
            display_name=full_name,
            is_public=True
        )
        
        self.db.add(profile)
        
        # Create notification preferences
        notification_prefs = NotificationPreference(
            id=uuid.uuid4(),
            user_id=user.id
        )
        
        self.db.add(notification_prefs)
        
        await self.db.commit()
        
        # Generate tokens
        access_token = create_access_token(str(user.id), user.email)
        refresh_token = create_refresh_token(str(user.id))
        
        return {
            "user": UserResponse.model_validate(user),
            "profile": ProfileResponse.model_validate(profile),
            "tokens": TokenResponse(
                access_token=access_token,
                refresh_token=refresh_token,
                expires_in=1800
            )
        }