"""
Follow router for managing follow relationships and social graph.
J6.1 Enhanced with notification integration.
"""

from uuid import UUID

from app.core.auth_deps import get_current_user, get_current_user_optional
from app.db.database import get_db
from app.models.user import User
from app.schemas.auth import MessageResponse
from app.schemas.follow import (
    FollowActionResponse,
    FollowActivityResponse,
    FollowersListResponse,
    FollowingListResponse,
    FollowRequest,
    FollowResponse,
    FollowStatsResponse,
    MutualFollowsResponse,
    SuggestedUsersResponse,
    UnfollowRequest,
)
from app.services.follow_service import FollowService

# J6.1 Notification Integration
from app.utils.notification_helpers import trigger_follow_notification
from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter(prefix="/follow", tags=["follow"])


@router.post("/follow", response_model=FollowResponse, deprecated=True)
async def legacy_follow_user(
    follow_request: FollowRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Deprecated: use POST /follow/{user_id}. Adds deprecation headers."""
    follow_service = FollowService(db)
    result = await follow_service.follow_user(current_user.id, follow_request.user_id)
    resp = Response(content=result.model_dump_json(), media_type="application/json")
    resp.headers["Deprecation"] = "true"
    resp.headers["Sunset"] = "Wed, 31 Dec 2025 23:59:59 GMT"
    resp.headers["Link"] = "</api/follow/{user_id}>; rel=successor-version"
    return resp


@router.post("/{user_id}", response_model=FollowActionResponse)
async def follow_user(
    user_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Follow a user (idempotent)."""
    service = FollowService(db)
    pre = await service.is_following(current_user.id, user_id)
    if not pre:
        await service.follow_user(current_user.id, user_id)
        action = "follow"

        # J6.1 Notification Integration: Trigger follow notification
        try:
            # Get target user details for notification
            from sqlalchemy import select

            target_user_result = await db.execute(
                select(User).where(User.id == user_id)
            )
            target_user = target_user_result.scalar_one_or_none()

            if target_user:
                await trigger_follow_notification(
                    follower_user_data={
                        "id": str(current_user.id),
                        "username": current_user.handle,
                        "display_name": current_user.handle,
                        "avatar_url": current_user.avatar_url,
                    },
                    followed_user_data={
                        "id": str(target_user.id),
                        "username": target_user.handle,
                        "display_name": target_user.handle,
                        "avatar_url": target_user.avatar_url,
                    },
                )
        except Exception as e:
            # Don't fail the follow action if notification fails
            print(f"Follow notification failed: {e}")

    else:
        action = "noop"
    # Profile counters already updated in service; refresh not required here.
    return await service.follow_action_response(current_user.id, user_id, action)


@router.delete("/unfollow", response_model=MessageResponse, deprecated=True)
async def legacy_unfollow_user(
    unfollow_request: UnfollowRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Deprecated: use DELETE /follow/{user_id}. Adds deprecation headers."""
    service = FollowService(db)
    await service.unfollow_user(current_user.id, unfollow_request.user_id)
    mr = MessageResponse(message="Successfully unfollowed user", success=True)
    resp = Response(content=mr.model_dump_json(), media_type="application/json")
    resp.headers["Deprecation"] = "true"
    resp.headers["Sunset"] = "Wed, 31 Dec 2025 23:59:59 GMT"
    resp.headers["Link"] = "</api/follow/{user_id}>; rel=successor-version"
    return resp


@router.delete("/{user_id}", response_model=FollowActionResponse)
async def unfollow_user(
    user_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Unfollow a user (idempotent)."""
    service = FollowService(db)
    pre = await service.is_following(current_user.id, user_id)
    if pre:
        await service.unfollow_user(current_user.id, user_id)
        action = "unfollow"
    else:
        action = "noop"
    return await service.follow_action_response(current_user.id, user_id, action)


@router.get("/status/{user_id}")
async def get_follow_status(
    user_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Check if current user follows another user."""
    follow_service = FollowService(db)
    is_following = await follow_service.is_following(
        follower_id=current_user.id, followee_id=user_id
    )
    follows_you = await follow_service.is_following(
        follower_id=user_id, followee_id=current_user.id
    )

    return {
        "user_id": user_id,
        "is_following": is_following,
        "follows_you": follows_you,
        "mutual_follow": is_following and follows_you,
    }


@router.get("/{user_id}/followers", response_model=FollowersListResponse)
async def get_user_followers(
    user_id: UUID,
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Number of results per page"),
    current_user: User | None = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db),
):
    """Get a user's followers list."""
    follow_service = FollowService(db)
    current_user_id = current_user.id if current_user else None

    return await follow_service.get_followers(
        user_id=user_id, page=page, page_size=page_size, current_user_id=current_user_id
    )


@router.get("/{user_id}/following", response_model=FollowingListResponse)
async def get_user_following(
    user_id: UUID,
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Number of results per page"),
    current_user: User | None = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db),
):
    """Get a user's following list."""
    follow_service = FollowService(db)
    current_user_id = current_user.id if current_user else None

    return await follow_service.get_following(
        user_id=user_id, page=page, page_size=page_size, current_user_id=current_user_id
    )


@router.get("/me/followers", response_model=FollowersListResponse)
async def get_my_followers(
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Number of results per page"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get current user's followers list."""
    follow_service = FollowService(db)

    return await follow_service.get_followers(
        user_id=current_user.id,
        page=page,
        page_size=page_size,
        current_user_id=current_user.id,
    )


@router.get("/me/following", response_model=FollowingListResponse)
async def get_my_following(
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Number of results per page"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get current user's following list."""
    follow_service = FollowService(db)

    return await follow_service.get_following(
        user_id=current_user.id,
        page=page,
        page_size=page_size,
        current_user_id=current_user.id,
    )


@router.get("/mutual/{user_id}", response_model=MutualFollowsResponse)
async def get_mutual_follows(
    user_id: UUID,
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Number of results per page"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get mutual follows between current user and another user."""
    follow_service = FollowService(db)

    return await follow_service.get_mutual_follows(
        user_id=current_user.id, other_user_id=user_id, page=page, page_size=page_size
    )


@router.get("/suggestions", response_model=SuggestedUsersResponse)
async def get_follow_suggestions(
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(
        10, ge=1, le=50, description="Number of suggestions per page"
    ),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get suggested users to follow."""
    follow_service = FollowService(db)

    return await follow_service.get_follow_suggestions(
        user_id=current_user.id, page=page, page_size=page_size
    )


@router.get("/stats/me", response_model=FollowStatsResponse)
async def get_my_follow_stats(
    current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
):
    """Get current user's follow statistics."""
    follow_service = FollowService(db)

    return await follow_service.get_follow_stats(
        user_id=current_user.id, current_user_id=current_user.id
    )


@router.get("/activity/me", response_model=FollowActivityResponse)
async def get_my_follow_activity(
    current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
):
    """Get current user's recent follow activity."""
    follow_service = FollowService(db)

    return await follow_service.get_follow_activity(user_id=current_user.id)


# Bulk operations
@router.post("/bulk/follow", response_model=MessageResponse)
async def bulk_follow_users(
    user_ids: list[UUID],
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Follow multiple users at once (max 10)."""
    if len(user_ids) > 10:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot follow more than 10 users at once",
        )

    follow_service = FollowService(db)
    success_count = 0
    errors = []

    for user_id in user_ids:
        try:
            await follow_service.follow_user(
                follower_id=current_user.id, followee_id=user_id
            )
            success_count += 1
        except HTTPException as e:
            errors.append(f"User {user_id}: {e.detail}")
        except Exception as e:
            errors.append(f"User {user_id}: {str(e)}")

    message = f"Successfully followed {success_count} users"
    if errors:
        message += f". Errors: {'; '.join(errors)}"

    return MessageResponse(message=message, success=success_count > 0)


@router.delete("/bulk/unfollow", response_model=MessageResponse)
async def bulk_unfollow_users(
    user_ids: list[UUID],
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Unfollow multiple users at once (max 10)."""
    if len(user_ids) > 10:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot unfollow more than 10 users at once",
        )

    follow_service = FollowService(db)
    success_count = 0
    errors = []

    for user_id in user_ids:
        try:
            await follow_service.unfollow_user(
                follower_id=current_user.id, followee_id=user_id
            )
            success_count += 1
        except HTTPException as e:
            errors.append(f"User {user_id}: {e.detail}")
        except Exception as e:
            errors.append(f"User {user_id}: {str(e)}")

    message = f"Successfully unfollowed {success_count} users"
    if errors:
        message += f". Errors: {'; '.join(errors)}"

    return MessageResponse(message=message, success=success_count > 0)


@router.get("/stats/{user_id}", response_model=FollowStatsResponse)
async def get_user_follow_stats(
    user_id: UUID,
    current_user: User | None = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db),
):
    """Get follow statistics for a user."""
    follow_service = FollowService(db)
    current_user_id = current_user.id if current_user else None
    return await follow_service.get_follow_stats(
        user_id=user_id, current_user_id=current_user_id
    )
