"""
Enhanced profile service with additional features.
"""

import uuid
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone

from sqlalchemy import select, update, func, or_, and_, delete
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from fastapi import HTTPException, status

from app.models.user import User
from app.models.profile import Profile
from app.models.follow import Follow
from app.models.notification_models import NotificationPreference
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


class EnhancedProfileService:
    """Enhanced profile service with additional features."""
    
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
        
        # Check username uniqueness if username is being changed
        if profile_data.username and profile_data.username != profile.username:
            existing_profile = await self.get_profile_by_username(profile_data.username)
            if existing_profile:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="Username already taken"
                )
        
        # Update fields
        update_data = {}
        for field, value in profile_data.model_dump(exclude_unset=True).items():
            if value is not None:
                update_data[field] = value
        
        if update_data:
            update_data["updated_at"] = datetime.now(timezone.utc)
            
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
            # For now, we'll skip email verification and update directly
            # In production, this should trigger an email verification flow
            update_data["email"] = settings_data.email
        
        if update_data:
            update_data["updated_at"] = datetime.now(timezone.utc)
            
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
    
    async def get_notification_preferences(
        self, 
        user_id: uuid.UUID
    ) -> NotificationPreferencesResponse:
        """Get notification preferences for a user."""
        stmt = select(NotificationPreference).where(NotificationPreference.user_id == user_id)
        result = await self.db.execute(stmt)
        prefs = result.scalar_one_or_none()
        
        if not prefs:
            # Create default preferences if they don't exist
            prefs = NotificationPreference(
                id=uuid.uuid4(),
                user_id=user_id
            )
            self.db.add(prefs)
            await self.db.commit()
        
        return NotificationPreferencesResponse.model_validate(prefs)
    
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
            # Create new preferences if they don't exist
            prefs = NotificationPreference(
                id=uuid.uuid4(),
                user_id=user_id
            )
            self.db.add(prefs)
            await self.db.flush()
        
        # Update fields
        update_data = {}
        for field, value in prefs_data.model_dump(exclude_unset=True).items():
            if value is not None:
                update_data[field] = value
        
        if update_data:
            update_data["updated_at"] = datetime.now(timezone.utc)
            
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
        stmt = select(Profile).where(Profile.id == profile_id)
        result = await self.db.execute(stmt)
        profile = result.scalar_one_or_none()
        
        if not profile:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Profile not found"
            )
        
        # Check if profile is public or if user is viewing their own profile
        if not profile.is_public and profile.user_id != current_user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Profile is private"
            )
        
        # Check if current user is following this profile
        is_following = None
        if current_user_id and current_user_id != profile.user_id:
            follow_stmt = select(Follow).where(
                and_(
                    Follow.follower_id == current_user_id,
                    Follow.following_id == profile.user_id
                )
            )
            follow_result = await self.db.execute(follow_stmt)
            is_following = follow_result.scalar_one_or_none() is not None
        
        # Convert to public profile response
        return PublicProfileResponse(
            id=profile.id,
            username=profile.username,
            display_name=profile.display_name or "",
            bio=profile.bio,
            avatar_url=profile.avatar_url,
            is_public=profile.is_public,
            follower_count=getattr(profile, 'follower_count', 0),
            following_count=getattr(profile, 'following_count', 0),
            created_at=profile.created_at,
            is_following=is_following
        )
    
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
        
        public_profiles = []
        if profiles:
            follow_map = {}
            if current_user_id:
                from app.services.follow_service import FollowService
                follow_service = FollowService(self.db)
                follow_map = await follow_service.batch_follow_status(
                    current_user_id=current_user_id,
                    target_user_ids=[p.user_id for p in profiles]
                )
            for profile in profiles:
                status_info = follow_map.get(profile.user_id)
                is_following = status_info["is_following"] if status_info else None
                response_data = {
                    "id": profile.id,
                    "username": profile.username,
                    "display_name": profile.display_name or "",
                    "bio": profile.bio,
                    "avatar_url": profile.avatar_url,
                    "is_public": getattr(profile, "is_public", True),
                    "follower_count": getattr(profile, "follower_count", 0),
                    "following_count": getattr(profile, "following_count", 0),
                    "created_at": profile.created_at,
                    "is_following": is_following
                }
                public_profiles.append(PublicProfileResponse.model_validate(response_data))
        
        return ProfileSearchResponse(
            profiles=public_profiles,
            total=total or 0,
            page=page,
            page_size=page_size,
            has_next=(offset + page_size) < (total or 0)
        )
    
    async def delete_user_account(self, user_id: uuid.UUID) -> None:
        """Delete user account and all associated data (GDPR compliance)."""
        try:
            # Delete in order to respect foreign key constraints
            
            # Delete notification preferences
            await self.db.execute(
                delete(NotificationPreference).where(NotificationPreference.user_id == user_id)
            )
            
            # Delete follows (both directions)
            await self.db.execute(
                delete(Follow).where(
                    or_(Follow.follower_id == user_id, Follow.following_id == user_id)
                )
            )
            
            # Delete profile
            await self.db.execute(
                delete(Profile).where(Profile.user_id == user_id)
            )
            
            # Delete user
            await self.db.execute(
                delete(User).where(User.id == user_id)
            )
            
            await self.db.commit()
            
        except Exception as e:
            await self.db.rollback()
            raise e
    
    async def export_user_data(self, user_id: uuid.UUID) -> Dict[str, Any]:
        """Export user data for GDPR compliance."""
        # Get user data
        user_stmt = select(User).where(User.id == user_id)
        user_result = await self.db.execute(user_stmt)
        user = user_result.scalar_one_or_none()
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        # Get profile data
        profile_stmt = select(Profile).where(Profile.user_id == user_id)
        profile_result = await self.db.execute(profile_stmt)
        profile = profile_result.scalar_one_or_none()
        
        # Get notification preferences
        prefs_stmt = select(NotificationPreference).where(NotificationPreference.user_id == user_id)
        prefs_result = await self.db.execute(prefs_stmt)
        prefs = prefs_result.scalar_one_or_none()
        
        # Get follows data
        following_stmt = select(Follow).where(Follow.follower_id == user_id)
        following_result = await self.db.execute(following_stmt)
        following = following_result.scalars().all()
        
        followers_stmt = select(Follow).where(Follow.following_id == user_id)
        followers_result = await self.db.execute(followers_stmt)
        followers = followers_result.scalars().all()
        
        return {
            "user": {
                "id": str(user.id),
                "email": user.email,
                "full_name": user.full_name,
                "timezone": user.timezone,
                "language": user.language,
                "is_active": user.is_active,
                "is_verified": user.is_verified,
                "created_at": user.created_at.isoformat(),
                "updated_at": user.updated_at.isoformat(),
                "last_login": user.last_login.isoformat() if user.last_login else None
            },
            "profile": {
                "id": str(profile.id),
                "username": profile.username,
                "display_name": profile.display_name,
                "bio": profile.bio,
                "avatar_url": profile.avatar_url,
                "is_public": profile.is_public,
                "created_at": profile.created_at.isoformat(),
                "updated_at": profile.updated_at.isoformat()
            } if profile else None,
            "notification_preferences": {
                "email_enabled": prefs.email_enabled,
                "email_follows": prefs.email_follows,
                "email_messages": prefs.email_messages,
                "email_ai_responses": prefs.email_ai_responses,
                "email_system": prefs.email_system,
                "push_enabled": prefs.push_enabled,
                "push_follows": prefs.push_follows,
                "push_messages": prefs.push_messages,
                "push_ai_responses": prefs.push_ai_responses,
                "push_system": prefs.push_system
            } if prefs else None,
            "following": [str(f.following_id) for f in following],
            "followers": [str(f.follower_id) for f in followers],
            "stats": {
                "follower_count": len(followers),
                "following_count": len(following)
            }
        }
    
    async def get_profile_activity_stats(self, user_id: uuid.UUID) -> Dict[str, Any]:
        """Get profile activity statistics."""
        # Get basic profile stats
        profile_stmt = select(Profile).where(Profile.user_id == user_id)
        profile_result = await self.db.execute(profile_stmt)
        profile = profile_result.scalar_one_or_none()
        
        if not profile:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Profile not found"
            )
        
        # Get follower/following counts
        followers_stmt = select(func.count()).select_from(Follow).where(Follow.following_id == user_id)
        followers_result = await self.db.execute(followers_stmt)
        follower_count = followers_result.scalar()
        
        following_stmt = select(func.count()).select_from(Follow).where(Follow.follower_id == user_id)
        following_result = await self.db.execute(following_stmt)
        following_count = following_result.scalar()
        
        return {
            "profile_views": 0,  # Would need to track this separately
            "follower_count": follower_count or 0,
            "following_count": following_count or 0,
            "profile_completeness": self._calculate_profile_completeness(profile),
            "last_updated": profile.updated_at.isoformat(),
            "account_age_days": (datetime.now(timezone.utc) - profile.created_at).days
        }
    
    def _calculate_profile_completeness(self, profile: Profile) -> float:
        """Calculate profile completeness percentage."""
        fields = [
            profile.username,
            profile.display_name,
            profile.bio,
            profile.avatar_url
        ]
        
        completed_fields = sum(1 for field in fields if field)
        return (completed_fields / len(fields)) * 100