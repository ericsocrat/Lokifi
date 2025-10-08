"""
Authentication service for user management.
"""

import uuid
from datetime import UTC, datetime
from typing import Any

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import (
    create_access_token,
    create_refresh_token,
    hash_password,
    validate_email,
    validate_password_strength,
    verify_password,
)
from app.models.notification_models import NotificationPreference
from app.models.profile import Profile
from app.models.user import User
from app.schemas.auth import (
    ProfileResponse,
    TokenResponse,
    UserLoginRequest,
    UserRegisterRequest,
    UserResponse,
)


class AuthService:
    """Authentication service."""
    
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def register_user(self, user_data: UserRegisterRequest) -> dict[str, Any]:
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
    
    async def login_user(self, login_data: UserLoginRequest) -> dict[str, Any]:
        """Login a user with optimized single query."""
        # Find user with profile in a single query using JOIN (performance optimization)
        stmt = select(User, Profile).join(Profile, User.id == Profile.user_id).where(User.email == login_data.email)
        result = await self.db.execute(stmt)
        row = result.one_or_none()
        
        if not row:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password"
            )
        
        user, profile = row
        
        # Verify password
        if not user.password_hash or not verify_password(login_data.password, user.password_hash):
            # TODO: Track failed login attempts for account lockout
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password"
            )
        
        # Check if user is active
        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Your account has been deactivated. Please contact support for assistance."
            )
        
        # Update last login
        user.last_login = datetime.now(UTC)
        await self.db.commit()
        
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
    
    async def get_user_by_id(self, user_id: uuid.UUID) -> User | None:
        """Get user by ID."""
        stmt = select(User).where(User.id == user_id)
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()
    
    async def get_user_by_email(self, email: str) -> User | None:
        """Get user by email."""
        stmt = select(User).where(User.email == email)
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()
    
    async def create_user_from_oauth(self, email: str, full_name: str, google_id: str) -> dict[str, Any]:
        """
        Create or update user from OAuth provider.
        
        Optimized to use a single query for checking existence and fetching profile.
        """
        # Check if user already exists with this email (optimized with JOIN)
        stmt = select(User, Profile).outerjoin(Profile, User.id == Profile.user_id).where(User.email == email)
        result = await self.db.execute(stmt)
        row = result.one_or_none()
        
        if row and row[0]:  # User exists
            existing_user, profile = row[0], row[1]
            # Update Google ID and last login if not set
            needs_update = False
            if not existing_user.google_id:
                existing_user.google_id = google_id
                needs_update = True
            
            # Update last login timestamp
            existing_user.last_login = datetime.now(UTC)
            needs_update = True
            
            if needs_update:
                await self.db.commit()
            
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