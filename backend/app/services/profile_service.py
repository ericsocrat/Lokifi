"""
Profile service for user profile and settings management.
"""

import uuid
from typing import Optional, List, Tuple
from datetime import datetime

from sqlalchemy import select, update, func, or_, and_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from fastapi import HTTPException, status

from app.models.user import User
from app.models.profile import Profile
from app.models.follow import Follow
from app.models.notification import NotificationPreference
from app.schemas.profile import (
    ProfileUpdateRequest,
    UserSettingsUpdateRequest,
    NotificationPreferencesUpdateRequest,
    ProfileResponse,
    UserSettingsResponse,
    NotificationPreferencesResponse,
    PublicProfileResponse,
    ProfileSearchResponse
)


class ProfileService:
    """Profile service for managing user profiles and settings."""
    
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def get_profile_by_user_id(self, user_id: uuid.UUID) -> Optional[Profile]:
        """Get profile by user ID."""
        stmt = select(Profile).where(Profile.user_id == user_id)
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()
    
    async def get_profile_by_username(self, username: str) -> Optional[Profile]:
        """Get profile by username."""
        stmt = select(Profile).where(Profile.username == username)
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()
    
    async def update_profile(
        self, 
        user_id: uuid.UUID, 
        profile_data: ProfileUpdateRequest
    ) -> ProfileResponse:
        """Update user profile."""
        # Get existing profile
        profile = await self.get_profile_by_user_id(user_id)
        if not profile:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Profile not found"
            )
        
        # Check username availability if changing
        if profile_data.username and profile_data.username != profile.username:
            existing_profile = await self.get_profile_by_username(profile_data.username)
            if existing_profile:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="Username already taken"
                )
        
        # Update fields
        update_data = {}
        if profile_data.username is not None:
            update_data["username"] = profile_data.username
        if profile_data.display_name is not None:
            update_data["display_name"] = profile_data.display_name
        if profile_data.bio is not None:
            update_data["bio"] = profile_data.bio
        if profile_data.avatar_url is not None:
            update_data["avatar_url"] = str(profile_data.avatar_url) if profile_data.avatar_url else None
        if profile_data.is_public is not None:
            update_data["is_public"] = profile_data.is_public
        
        if update_data:
            update_data["updated_at"] = datetime.utcnow()
            
            stmt = (
                update(Profile)
                .where(Profile.id == profile.id)
                .values(**update_data)
            )
            await self.db.execute(stmt)
            await self.db.commit()
            
            # Refresh profile
            await self.db.refresh(profile)
        
        return ProfileResponse.model_validate(profile)
    
    async def update_user_settings(
        self,
        user_id: uuid.UUID,
        settings_data: UserSettingsUpdateRequest
    ) -> UserSettingsResponse:
        """Update user settings."""
        # Get user
        stmt = select(User).where(User.id == user_id)
        result = await self.db.execute(stmt)
        user = result.scalar_one_or_none()
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        # Update fields
        update_data = {}
        if settings_data.full_name is not None:
            update_data["full_name"] = settings_data.full_name
        if settings_data.timezone is not None:
            update_data["timezone"] = settings_data.timezone
        if settings_data.language is not None:
            update_data["language"] = settings_data.language
        
        # Email changes require special handling (verification process)
        if settings_data.email is not None and settings_data.email != user.email:
            # For now, just validate format - in production would send verification email
            from app.core.security import validate_email
            if not validate_email(settings_data.email):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid email format"
                )
            
            # Check if email already exists
            stmt = select(User).where(User.email == settings_data.email)
            result = await self.db.execute(stmt)
            existing_user = result.scalar_one_or_none()
            
            if existing_user:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="Email already in use"
                )
            
            update_data["email"] = settings_data.email
            update_data["is_verified"] = False  # Require re-verification
        
        if update_data:
            update_data["updated_at"] = datetime.utcnow()
            
            stmt = (
                update(User)
                .where(User.id == user_id)
                .values(**update_data)
            )
            await self.db.execute(stmt)
            await self.db.commit()
            
            # Refresh user
            await self.db.refresh(user)
        
        return UserSettingsResponse.model_validate(user)
    
    async def update_notification_preferences(
        self,
        user_id: uuid.UUID,
        prefs_data: NotificationPreferencesUpdateRequest
    ) -> NotificationPreferencesResponse:
        """Update notification preferences."""
        # Get existing preferences
        stmt = select(NotificationPreference).where(NotificationPreference.user_id == user_id)
        result = await self.db.execute(stmt)
        prefs = result.scalar_one_or_none()
        
        if not prefs:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Notification preferences not found"
            )
        
        # Update fields
        update_data = {}
        for field, value in prefs_data.model_dump(exclude_unset=True).items():
            if value is not None:
                update_data[field] = value
        
        if update_data:
            update_data["updated_at"] = datetime.utcnow()
            
            stmt = (
                update(NotificationPreference)
                .where(NotificationPreference.id == prefs.id)
                .values(**update_data)
            )
            await self.db.execute(stmt)
            await self.db.commit()
            
            # Refresh preferences
            await self.db.refresh(prefs)
        
        return NotificationPreferencesResponse.model_validate(prefs)
    
    async def get_public_profile(
        self, 
        profile_id: uuid.UUID, 
        current_user_id: Optional[uuid.UUID] = None
    ) -> PublicProfileResponse:
        """Get public profile information."""
        # Get profile
        stmt = select(Profile).where(Profile.id == profile_id)
        result = await self.db.execute(stmt)
        profile = result.scalar_one_or_none()
        
        if not profile:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Profile not found"
            )
        
        # Check if current user follows this profile
        is_following = None
        if current_user_id:
            stmt = select(Follow).where(
                and_(
                    Follow.follower_id == current_user_id,
                    Follow.followee_id == profile.user_id
                )
            )
            result = await self.db.execute(stmt)
            follow_relationship = result.scalar_one_or_none()
            is_following = follow_relationship is not None
        
        # Create response
        response_data = profile.__dict__.copy()
        response_data["is_following"] = is_following
        
        return PublicProfileResponse.model_validate(response_data)
    
    async def search_profiles(
        self,
        query: str,
        page: int = 1,
        page_size: int = 20,
        current_user_id: Optional[uuid.UUID] = None
    ) -> ProfileSearchResponse:
        """Search profiles by username or display name."""
        offset = (page - 1) * page_size
        
        # Search query
        search_filter = or_(
            Profile.username.ilike(f"%{query}%"),
            Profile.display_name.ilike(f"%{query}%")
        )
        
        # Get profiles with pagination
        stmt = (
            select(Profile)
            .where(and_(Profile.is_public == True, search_filter))
            .offset(offset)
            .limit(page_size)
            .order_by(Profile.follower_count.desc(), Profile.username)
        )
        
        result = await self.db.execute(stmt)
        profiles = result.scalars().all()
        
        # Get total count
        count_stmt = select(func.count()).select_from(Profile).where(
            and_(Profile.is_public == True, search_filter)
        )
        result = await self.db.execute(count_stmt)
        total = result.scalar()
        
        # Check follow status for each profile if user is logged in
        public_profiles = []
        for profile in profiles:
            is_following = None
            if current_user_id:
                stmt = select(Follow).where(
                    and_(
                        Follow.follower_id == current_user_id,
                        Follow.followee_id == profile.user_id
                    )
                )
                result = await self.db.execute(stmt)
                follow_relationship = result.scalar_one_or_none()
                is_following = follow_relationship is not None
            
            response_data = profile.__dict__.copy()
            response_data["is_following"] = is_following
            public_profiles.append(PublicProfileResponse.model_validate(response_data))
        
        return ProfileSearchResponse(
            profiles=public_profiles,
            total=total or 0,
            page=page,
            page_size=page_size,
            has_next=(offset + page_size) < (total or 0)
        )
    
    async def get_notification_preferences(
        self, 
        user_id: uuid.UUID
    ) -> NotificationPreferencesResponse:
        """Get notification preferences for a user."""
        stmt = select(NotificationPreference).where(NotificationPreference.user_id == user_id)
        result = await self.db.execute(stmt)
        prefs = result.scalar_one_or_none()
        
        if not prefs:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Notification preferences not found"
            )
        
        return NotificationPreferencesResponse.model_validate(prefs)