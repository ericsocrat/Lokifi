"""
Follow service for managing follow relationships and social graph.
"""

import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional, List, Tuple

from sqlalchemy import select, func, and_, or_, desc, not_, exists, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload, aliased
from fastapi import HTTPException, status

from app.models.user import User
from app.models.profile import Profile
from app.models.follow import Follow
from app.models.notification_models import Notification, NotificationType
from app.schemas.follow import (
    FollowResponse,
    UserFollowStatus,
    FollowersListResponse,
    FollowingListResponse,
    FollowStatsResponse,
    MutualFollowsResponse,
    SuggestedUsersResponse,
    FollowActivityResponse,
    FollowActionResponse
)


class FollowService:
    """Service for managing follow relationships."""
    
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def follow_user(self, follower_id: uuid.UUID, followee_id: uuid.UUID) -> FollowResponse:
        """Idempotently follow a user. Returns existing relationship if already following."""
        if follower_id == followee_id:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot follow yourself")

        # Ensure followee exists
        result = await self.db.execute(select(User.id).where(and_(User.id == followee_id, User.is_active == True)))
        if result.scalar_one_or_none() is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

        # Try fetch existing
        existing = await self.db.execute(
            select(Follow).where(Follow.follower_id == follower_id, Follow.followee_id == followee_id)
        )
        follow = existing.scalar_one_or_none()
        if follow:
            return FollowResponse.model_validate(follow)

        # Create
        follow = Follow(id=uuid.uuid4(), follower_id=follower_id, followee_id=followee_id)
        self.db.add(follow)
        await self.db.flush()

        # Increment counters safely
        await self._update_follow_counts(follower_id, followee_id, increment=True)
        # Create notification for followee (fire-and-forget creation)
        self.db.add(Notification(
            user_id=followee_id,
            related_user_id=follower_id,
            type=NotificationType.FOLLOW,
            title="New follower",
            message="You have a new follower"
        ))

        await self.db.commit()
        return FollowResponse.model_validate(follow)
    
    async def unfollow_user(self, follower_id: uuid.UUID, followee_id: uuid.UUID) -> bool:
        """Idempotent unfollow. Returns True if relationship existed or already absent."""
        result = await self.db.execute(
            select(Follow).where(Follow.follower_id == follower_id, Follow.followee_id == followee_id)
        )
        follow = result.scalar_one_or_none()
        if not follow:
            return True
        await self.db.delete(follow)
        await self._update_follow_counts(follower_id, followee_id, increment=False)
        await self.db.commit()
        return True
    
    async def get_followers(
        self,
        user_id: uuid.UUID,
        page: int = 1,
        page_size: int = 20,
        current_user_id: Optional[uuid.UUID] = None
    ) -> FollowersListResponse:
        """Get followers list with follow status."""
        offset = (page - 1) * page_size
        
        # Query for followers with profile information
        stmt = (
            select(
                Follow.follower_id,
                Follow.created_at,
                Profile.username,
                Profile.display_name,
                Profile.avatar_url
            )
            .join(Profile, Profile.user_id == Follow.follower_id)
            .where(Follow.followee_id == user_id)
            .order_by(desc(Follow.created_at))
            .offset(offset)
            .limit(page_size)
        )
        
        result = await self.db.execute(stmt)
        followers_data = result.all()
        
        # Get total count
        count_stmt = select(func.count()).select_from(Follow).where(
            Follow.followee_id == user_id
        )
        result = await self.db.execute(count_stmt)
        total = result.scalar() or 0
        
        # Build followers list with follow status
        followers = []
        id_list = [row.follower_id for row in followers_data]
        status_map = await self.batch_follow_status(current_user_id, id_list) if current_user_id else {}
        for row in followers_data:
            st = status_map.get(row.follower_id, {"is_following": False, "follows_you": False, "mutual_follow": False})
            followers.append(
                UserFollowStatus(
                    user_id=row.follower_id,
                    username=row.username,
                    display_name=row.display_name or "",
                    avatar_url=row.avatar_url,
                    is_following=st["is_following"],
                    follows_you=st["follows_you"],
                    mutual_follow=st["mutual_follow"],
                    created_at=row.created_at,
                )
            )
        
        return FollowersListResponse(
            followers=followers,
            total=total,
            page=page,
            page_size=page_size,
            has_next=(offset + page_size) < total
        )
    
    async def get_following(
        self,
        user_id: uuid.UUID,
        page: int = 1,
        page_size: int = 20,
        current_user_id: Optional[uuid.UUID] = None
    ) -> FollowingListResponse:
        """Get following list with follow status."""
        offset = (page - 1) * page_size
        
        # Query for following with profile information
        stmt = (
            select(
                Follow.followee_id,
                Follow.created_at,
                Profile.username,
                Profile.display_name,
                Profile.avatar_url
            )
            .join(Profile, Profile.user_id == Follow.followee_id)
            .where(Follow.follower_id == user_id)
            .order_by(desc(Follow.created_at))
            .offset(offset)
            .limit(page_size)
        )
        
        result = await self.db.execute(stmt)
        following_data = result.all()
        
        # Get total count
        count_stmt = select(func.count()).select_from(Follow).where(
            Follow.follower_id == user_id
        )
        result = await self.db.execute(count_stmt)
        total = result.scalar() or 0
        
        # Build following list with follow status
        following = []
        id_list = [row.followee_id for row in following_data]
        status_map = await self.batch_follow_status(current_user_id, id_list) if current_user_id else {}
        for row in following_data:
            st = status_map.get(row.followee_id, {"is_following": False, "follows_you": False, "mutual_follow": False})
            following.append(
                UserFollowStatus(
                    user_id=row.followee_id,
                    username=row.username,
                    display_name=row.display_name or "",
                    avatar_url=row.avatar_url,
                    is_following=st["is_following"],
                    follows_you=st["follows_you"],
                    mutual_follow=st["mutual_follow"],
                    created_at=row.created_at,
                )
            )
        
        return FollowingListResponse(
            following=following,
            total=total,
            page=page,
            page_size=page_size,
            has_next=(offset + page_size) < total
        )
    
    async def get_mutual_follows(
        self,
        user_id: uuid.UUID,
        other_user_id: uuid.UUID,
        page: int = 1,
        page_size: int = 20
    ) -> MutualFollowsResponse:
        """Get mutual follows between two users."""
        offset = (page - 1) * page_size
        
        # Find users that both users follow
        Follow1 = aliased(Follow)
        Follow2 = aliased(Follow)
        
        stmt = (
            select(
                Follow1.followee_id,
                Profile.username,
                Profile.display_name,
                Profile.avatar_url,
                Follow1.created_at
            )
            .join(Profile, Profile.user_id == Follow1.followee_id)
            .join(
                Follow2, 
                and_(
                    Follow2.followee_id == Follow1.followee_id,
                    Follow2.follower_id == other_user_id
                )
            )
            .where(Follow1.follower_id == user_id)
            .order_by(desc(Follow1.created_at))
            .offset(offset)
            .limit(page_size)
        )
        
        result = await self.db.execute(stmt)
        mutual_data = result.all()
        
        # Get total count
        count_stmt = (
            select(func.count())
            .select_from(Follow1)
            .join(
                Follow2,
                and_(
                    Follow2.followee_id == Follow1.followee_id,
                    Follow2.follower_id == other_user_id
                )
            )
            .where(Follow1.follower_id == user_id)
        )
        result = await self.db.execute(count_stmt)
        total = result.scalar() or 0
        
        # Build mutual follows list
        mutual_follows = []
        for mutual in mutual_data:
            mutual_follows.append(UserFollowStatus(
                user_id=mutual.followee_id,
                username=mutual.username,
                display_name=mutual.display_name,
                avatar_url=mutual.avatar_url,
                is_following=True,  # By definition, both users follow these people
                follows_you=False,  # Not relevant in this context
                mutual_follow=True,
                created_at=mutual.created_at
            ))
        
        return MutualFollowsResponse(
            mutual_follows=mutual_follows,
            total=total,
            page=page,
            page_size=page_size,
            has_next=(offset + page_size) < total
        )
    
    async def get_follow_suggestions(
        self,
        user_id: uuid.UUID,
        page: int = 1,
        page_size: int = 10
    ) -> SuggestedUsersResponse:
        """Get suggested users to follow."""
        offset = (page - 1) * page_size
        
        # Strategy: Suggest users followed by people you follow (friends of friends)
        # but exclude users you already follow
        Follow1 = aliased(Follow)  # Current user's follows
        Follow2 = aliased(Follow)  # Their follows' follows
        
        # Base mutual-follows suggestion query (fetch one extra for has_next detection)
        stmt = (
            select(
                Follow2.followee_id,
                Profile.username,
                Profile.display_name,
                Profile.avatar_url,
                func.count(Follow2.followee_id).label('mutual_count')
            )
            .select_from(Follow1)
            .join(Follow2, Follow2.follower_id == Follow1.followee_id)
            .join(Profile, Profile.user_id == Follow2.followee_id)
            .where(
                and_(
                    Follow1.follower_id == user_id,
                    Follow2.followee_id != user_id,  # Don't suggest self
                    not_(  # Don't suggest users already followed
                        exists().where(
                            and_(
                                Follow.follower_id == user_id,
                                Follow.followee_id == Follow2.followee_id
                            )
                        )
                    )
                )
            )
            .group_by(
                Follow2.followee_id,
                Profile.username,
                Profile.display_name,
                Profile.avatar_url,
                Profile.follower_count
            )
            .order_by(desc('mutual_count'), desc(Profile.follower_count))
            .offset(offset)
            .limit(page_size + 1)  # fetch sentinel
        )
        
        result = await self.db.execute(stmt)
        suggestions_data = result.all()
        has_next_mutual = len(suggestions_data) > page_size
        suggestions_data = suggestions_data[:page_size]
        
        reason = "mutual_follows"

        # If first page and we still need to fill, add popular fallback (fetch sentinel too)
        popular_data = []
        has_next_popular = False
        if len(suggestions_data) < page_size and page == 1:
            remaining = page_size - len(suggestions_data)
            popular_stmt = (
                select(
                    Profile.user_id.label("user_id"),
                    Profile.username,
                    Profile.display_name,
                    Profile.avatar_url,
                    Profile.follower_count
                )
                .where(
                    and_(
                        Profile.is_public == True,
                        Profile.user_id != user_id,
                        not_(
                            exists().where(
                                and_(
                                    Follow.follower_id == user_id,
                                    Follow.followee_id == Profile.user_id
                                )
                            )
                        )
                    )
                )
                .order_by(desc(Profile.follower_count))
                .limit(remaining + 1)
            )
            pop_res = await self.db.execute(popular_stmt)
            popular_data = list(pop_res.all())
            has_next_popular = len(popular_data) > remaining
            popular_data = popular_data[:remaining]
            if not suggestions_data:
                reason = "popular"
            suggestions_data = list(suggestions_data) + popular_data
        
        # Build suggestions list
        suggestions = []
        for suggestion in suggestions_data:
            uid = getattr(suggestion, 'followee_id', None) or getattr(suggestion, 'user_id', None)
            if uid is None:
                continue
            suggestions.append(UserFollowStatus(
                user_id=uid,  # type: ignore[arg-type]
                username=suggestion.username,
                display_name=(suggestion.display_name or ""),
                avatar_url=suggestion.avatar_url,
                is_following=False,
                follows_you=False,
                mutual_follow=False,
                created_at=datetime.now(timezone.utc),
            ))
        has_next = False
        if reason == "mutual_follows":
            has_next = has_next_mutual or (len(suggestions) == page_size and has_next_popular)
        else:
            has_next = has_next_popular

        total = len(suggestions)
        return SuggestedUsersResponse(
            suggestions=suggestions,
            reason=reason,
            total=total,
            page=page,
            page_size=page_size,
            has_next=has_next
        )
    
    async def get_follow_stats(
        self,
        user_id: uuid.UUID,
        current_user_id: Optional[uuid.UUID] = None
    ) -> FollowStatsResponse:
        """Get follow statistics for a user."""
        # Get user profile
        stmt = select(Profile).where(Profile.user_id == user_id)
        result = await self.db.execute(stmt)
        profile = result.scalar_one_or_none()
        
        if not profile:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        # Get mutual followers count if current user is provided
        mutual_count = None
        if current_user_id and current_user_id != user_id:
            mutual_count = await self._get_mutual_followers_count(user_id, current_user_id)
        
        return FollowStatsResponse(
            user_id=user_id,
            username=profile.username,
            display_name=profile.display_name or "",
            follower_count=profile.follower_count,
            following_count=profile.following_count,
            mutual_followers_count=mutual_count,
        )
    
    async def get_follow_activity(
        self,
        user_id: uuid.UUID
    ) -> FollowActivityResponse:
        """Get recent follow activity for a user."""
        seven_days_ago = datetime.now(timezone.utc) - timedelta(days=7)
        
        # Recent followers
        recent_followers_stmt = (
            select(
                Follow.follower_id,
                Profile.username,
                Profile.display_name,
                Profile.avatar_url,
                Follow.created_at
            )
            .join(Profile, Profile.user_id == Follow.follower_id)
            .where(
                and_(
                    Follow.followee_id == user_id,
                    Follow.created_at >= seven_days_ago
                )
            )
            .order_by(desc(Follow.created_at))
            .limit(5)
        )
        
        result = await self.db.execute(recent_followers_stmt)
        recent_followers_data = result.all()
        
        # Recent following
        recent_following_stmt = (
            select(
                Follow.followee_id,
                Profile.username,
                Profile.display_name,
                Profile.avatar_url,
                Follow.created_at
            )
            .join(Profile, Profile.user_id == Follow.followee_id)
            .where(
                and_(
                    Follow.follower_id == user_id,
                    Follow.created_at >= seven_days_ago
                )
            )
            .order_by(desc(Follow.created_at))
            .limit(5)
        )
        
        result = await self.db.execute(recent_following_stmt)
        recent_following_data = result.all()
        
        # Growth counts
        follower_growth_stmt = select(func.count()).select_from(Follow).where(
            and_(
                Follow.followee_id == user_id,
                Follow.created_at >= seven_days_ago
            )
        )
        result = await self.db.execute(follower_growth_stmt)
        follower_growth = result.scalar() or 0
        
        following_growth_stmt = select(func.count()).select_from(Follow).where(
            and_(
                Follow.follower_id == user_id,
                Follow.created_at >= seven_days_ago
            )
        )
        result = await self.db.execute(following_growth_stmt)
        following_growth = result.scalar() or 0
        
        # Build response
        recent_followers = [
            UserFollowStatus(
                user_id=f.follower_id,
                username=f.username,
                display_name=f.display_name,
                avatar_url=f.avatar_url,
                is_following=False,  # Not relevant here
                follows_you=True,    # They follow you
                mutual_follow=False, # Not calculated here
                created_at=f.created_at
            )
            for f in recent_followers_data
        ]
        
        recent_following = [
            UserFollowStatus(
                user_id=f.followee_id,
                username=f.username,
                display_name=f.display_name,
                avatar_url=f.avatar_url,
                is_following=True,   # You follow them
                follows_you=False,   # Not relevant here
                mutual_follow=False, # Not calculated here
                created_at=f.created_at
            )
            for f in recent_following_data
        ]
        
        return FollowActivityResponse(
            recent_followers=recent_followers,
            recent_following=recent_following,
            follower_growth=follower_growth,
            following_growth=following_growth
        )
    
    async def is_following(
        self,
        follower_id: uuid.UUID,
        followee_id: uuid.UUID
    ) -> bool:
        """Check if one user follows another."""
        result = await self.db.execute(
            select(Follow.id).where(Follow.follower_id == follower_id, Follow.followee_id == followee_id)
        )
        return result.scalar_one_or_none() is not None

    async def follow_action_response(
        self,
        current_user_id: uuid.UUID,
        target_user_id: uuid.UUID,
        action: str
    ) -> FollowActionResponse:
        """Build a unified FollowActionResponse after a follow/unfollow/noop."""
        # Fetch profiles for counts
        result = await self.db.execute(
            select(Profile).where(Profile.user_id.in_([target_user_id, current_user_id]))
        )
        profiles = {p.user_id: p for p in result.scalars().all()}
        target_profile = profiles.get(target_user_id)
        current_profile = profiles.get(current_user_id)
        if not target_profile or not current_profile:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Profile not found")
        status_map = await self.batch_follow_status(current_user_id, [target_user_id])
        st = status_map.get(target_user_id, {"is_following": False, "follows_you": False, "mutual_follow": False})
        return FollowActionResponse(
            user_id=target_user_id,
            is_following=st["is_following"],
            follows_you=st["follows_you"],
            mutual_follow=st["mutual_follow"],
            follower_count=target_profile.follower_count,
            following_count=target_profile.following_count,
            current_user_following_count=current_profile.following_count,
            action=action
        )
    
    # Private helper methods
    async def _update_follow_counts(
        self,
        follower_id: uuid.UUID,
        followee_id: uuid.UUID,
        increment: bool = True
    ):
        """Update follower/following counts for both users."""
        delta = 1 if increment else -1
        # follower_count
        await self.db.execute(
            update(Profile)
            .where(Profile.user_id == followee_id)
            .values(
                follower_count=func.GREATEST(0, Profile.follower_count + delta)
            )
        )
        # following_count
        await self.db.execute(
            update(Profile)
            .where(Profile.user_id == follower_id)
            .values(
                following_count=func.GREATEST(0, Profile.following_count + delta)
            )
        )

    async def batch_follow_status(self, current_user_id: Optional[uuid.UUID], target_user_ids: List[uuid.UUID]) -> dict:
        """Return mapping of target_user_id -> status dict for current user."""
        if not current_user_id or not target_user_ids:
            return {}
        result = await self.db.execute(
            select(Follow.followee_id).where(
                Follow.follower_id == current_user_id, Follow.followee_id.in_(target_user_ids)
            )
        )
        following_set = {row[0] for row in result.all()}
        result = await self.db.execute(
            select(Follow.follower_id).where(
                Follow.followee_id == current_user_id, Follow.follower_id.in_(target_user_ids)
            )
        )
        followed_by_set = {row[0] for row in result.all()}
        out = {}
        for uid in target_user_ids:
            is_following = uid in following_set
            follows_you = uid in followed_by_set
            out[uid] = {
                "is_following": is_following,
                "follows_you": follows_you,
                "mutual_follow": is_following and follows_you,
            }
        return out
    
    async def _get_user_follow_status(
        self,
        target_user_id: uuid.UUID,
        current_user_id: Optional[uuid.UUID]
    ) -> dict:
        """Get follow status between current user and target user."""
        if not current_user_id:
            return {
                "is_following": False,
                "follows_you": False,
                "mutual_follow": False
            }
        
        # Check if current user follows target
        is_following = await self.is_following(current_user_id, target_user_id)
        
        # Check if target follows current user
        follows_you = await self.is_following(target_user_id, current_user_id)
        
        return {
            "is_following": is_following,
            "follows_you": follows_you,
            "mutual_follow": is_following and follows_you
        }
    
    async def _get_mutual_followers_count(
        self,
        user1_id: uuid.UUID,
        user2_id: uuid.UUID
    ) -> int:
        """Get count of mutual followers between two users."""
        Follow1 = aliased(Follow)
        Follow2 = aliased(Follow)
        
        stmt = (
            select(func.count())
            .select_from(Follow1)
            .join(
                Follow2,
                and_(
                    Follow2.follower_id == Follow1.follower_id,
                    Follow2.followee_id == user2_id
                )
            )
            .where(Follow1.followee_id == user1_id)
        )
        
        result = await self.db.execute(stmt)
        return result.scalar() or 0