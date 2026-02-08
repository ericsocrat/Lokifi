"""
Admin User Management API endpoints.

Provides CRUD operations for user administration including:
- List users with search and filtering
- Get user details with profile and statistics
- Update user information
- Delete users
- Suspend/activate user accounts
- Verify user accounts
"""

import logging
import uuid
from datetime import datetime, timezone

from app.core.security import get_current_user
from app.db.database import get_db
from app.models.profile import Profile
from app.models.user import User
from app.services.webhook_event_emitter import webhook_event_emitter
from argon2 import PasswordHasher
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, ConfigDict, EmailStr, Field
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

logger = logging.getLogger(__name__)
ph = PasswordHasher()

router = APIRouter(prefix="/admin/users", tags=["Admin - Users"])


# Pydantic schemas for request/response models
class UserResponse(BaseModel):
    """User response schema for admin API"""

    id: str
    email: str
    handle: str | None
    name: str | None
    bio: str | None
    role: str
    is_verified: bool
    is_active: bool
    created_at: str
    last_login: str | None
    follower_count: int
    following_count: int
    avatar_url: str | None

    model_config = ConfigDict(from_attributes=True)


class UserListResponse(BaseModel):
    """Paginated user list response"""

    users: list[UserResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


class UserUpdate(BaseModel):
    """User update schema"""

    name: str | None = Field(None, max_length=100)
    bio: str | None = None
    role: str | None = Field(None, pattern="^(user|moderator|admin)$")
    is_verified: bool | None = None
    is_active: bool | None = None


class UserCreate(BaseModel):
    """User creation schema for admin"""

    email: EmailStr
    handle: str = Field(..., min_length=3, max_length=30, pattern="^[a-zA-Z0-9_]+$")
    name: str = Field(..., min_length=1, max_length=100)
    password: str = Field(..., min_length=8)
    bio: str | None = Field(None, max_length=500)
    role: str = Field("user", pattern="^(user|moderator|admin)$")
    is_verified: bool = False
    is_active: bool = True


# Admin authentication dependency
async def require_admin(current_user: User = Depends(get_current_user)) -> User:
    """
    Require admin role for accessing admin endpoints.

    In production, this would check user.role == "admin".
    For now, simplified for demo purposes.
    """
    # TODO: Add proper role checking when role field added to User model
    # if not hasattr(current_user, 'role') or current_user.role != 'admin':
    #     raise HTTPException(
    #         status_code=status.HTTP_403_FORBIDDEN,
    #         detail="Admin access required"
    #     )
    return current_user


def user_to_response(user: User) -> UserResponse:
    """Convert User model to UserResponse schema"""
    profile = user.profile
    return UserResponse(
        id=str(user.id),
        email=user.email,
        handle=profile.username if profile else None,
        name=user.full_name,
        bio=profile.bio if profile else None,
        role="user",  # TODO: Get from user.role when field added
        is_verified=user.is_verified,
        is_active=user.is_active,
        created_at=user.created_at.isoformat(),
        last_login=user.last_login.isoformat() if user.last_login else None,
        follower_count=profile.follower_count if profile else 0,
        following_count=profile.following_count if profile else 0,
        avatar_url=profile.avatar_url if profile else None,
    )


@router.get("", response_model=UserListResponse)
async def list_users(
    search: str | None = Query(None, description="Search by name, email, or handle"),
    role: str | None = Query(None, description="Filter by role"),
    is_verified: bool | None = Query(None, description="Filter by verification status"),
    is_active: bool | None = Query(None, description="Filter by active status"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    current_admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> UserListResponse:
    """
    List users with filtering and pagination.

    Supports:
    - Text search across name, email, and handle
    - Filter by role, verification status, active status
    - Pagination with configurable page size
    """
    try:
        # Build base query with profile eager loading
        query = select(User).options(selectinload(User.profile))

        # Apply search filter
        if search:
            search_term = f"%{search}%"
            query = query.join(User.profile, isouter=True).where(
                or_(
                    User.email.ilike(search_term),
                    User.full_name.ilike(search_term),
                    Profile.username.ilike(search_term),
                )
            )

        # Apply role filter
        # TODO: Add role filtering when role field added to User model
        # if role:
        #     query = query.where(User.role == role)

        # Apply verification filter
        if is_verified is not None:
            query = query.where(User.is_verified == is_verified)

        # Apply active status filter
        if is_active is not None:
            query = query.where(User.is_active == is_active)

        # Get total count
        count_query = select(func.count()).select_from(query.subquery())
        result = await db.execute(count_query)
        total = result.scalar_one()

        # Calculate pagination
        total_pages = (total + page_size - 1) // page_size
        offset = (page - 1) * page_size

        # Apply pagination
        query = query.offset(offset).limit(page_size)

        # Execute query
        result = await db.execute(query)
        users = result.scalars().all()

        # Convert to response models
        user_responses = [user_to_response(user) for user in users]

        return UserListResponse(
            users=user_responses,
            total=total,
            page=page,
            page_size=page_size,
            total_pages=total_pages,
        )

    except Exception as e:
        logger.error(f"Error listing users: {e!s}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to list users",
        )


@router.post("", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_user(
    data: UserCreate,
    current_admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> UserResponse:
    """
    Create a new user account.

    Admin endpoint for creating user accounts with:
    - Email and handle validation
    - Password hashing
    - Profile creation with initial data
    - Role assignment
    - Verification and activation status
    """
    try:
        # Check if email already exists
        email_check = await db.execute(select(User).where(User.email == data.email))
        if email_check.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Email already registered",
            )

        # Check if handle already exists
        handle_check = await db.execute(select(Profile).where(Profile.username == data.handle))
        if handle_check.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Handle already taken",
            )

        # Hash password
        password_hash = ph.hash(data.password)

        # Create user
        new_user = User(
            email=data.email,
            password_hash=password_hash,
            full_name=data.name,
            is_verified=data.is_verified,
            is_active=data.is_active,
        )
        db.add(new_user)
        await db.flush()  # Get user.id for profile

        # Create profile
        new_profile = Profile(
            user_id=new_user.id,
            username=data.handle,
            display_name=data.name,
            bio=data.bio,
        )
        db.add(new_profile)
        await db.commit()

        # Reload user with profile
        await db.refresh(new_user, ["profile"])

        logger.info(
            "Admin created user",
            extra={
                "admin_id": str(current_admin.id),
                "new_user_id": str(new_user.id),
                "email": str(data.email),
                "handle": str(data.handle),
            },
        )

        # Emit webhook event (fire-and-forget, don't block response)
        try:
            await webhook_event_emitter.emit_user_created(
                user_id=new_user.id,
                email=str(data.email),
                username=str(data.handle),
                verified=data.is_verified,
            )
        except Exception:
            logger.debug("Webhook emission failed for user.created", exc_info=True)

        return user_to_response(new_user)

    except HTTPException:
        await db.rollback()
        raise
    except Exception as e:
        await db.rollback()
        logger.error("Error creating user", extra={"error": str(e)})
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create user",
        )


@router.get("/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: str,
    current_admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> UserResponse:
    """
    Get detailed information about a specific user.

    Returns user profile, statistics, and account status.
    """
    try:
        # Parse UUID
        try:
            user_uuid = uuid.UUID(user_id)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid user ID format"
            )

        # Query user with profile
        query = select(User).options(selectinload(User.profile)).where(User.id == user_uuid)
        result = await db.execute(query)
        user = result.scalar_one_or_none()

        if not user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

        return user_to_response(user)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            "Error getting user",
            extra={"user_id": str(user_id), "error": str(e)},
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get user",
        )


@router.put("/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: str,
    data: UserUpdate,
    current_admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> UserResponse:
    """
    Update user information.

    Allows updating:
    - Name and bio
    - Role (user/moderator/admin)
    - Verification status
    - Active status (for suspension)
    """
    try:
        # Parse UUID
        try:
            user_uuid = uuid.UUID(user_id)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid user ID format"
            )

        # Query user with profile
        query = select(User).options(selectinload(User.profile)).where(User.id == user_uuid)
        result = await db.execute(query)
        user = result.scalar_one_or_none()

        if not user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

        # Update user fields
        if data.name is not None:
            user.full_name = data.name

        if data.is_verified is not None:
            user.is_verified = data.is_verified

        if data.is_active is not None:
            user.is_active = data.is_active

        # TODO: Add role update when role field added to User model
        # if data.role is not None:
        #     user.role = data.role

        # Update profile fields
        if data.bio is not None and user.profile:
            user.profile.bio = data.bio

        # Update timestamp
        user.updated_at = datetime.now(timezone.utc)

        # Commit changes
        await db.commit()
        await db.refresh(user)

        # Emit webhook event
        try:
            changes = {}
            if data.name is not None:
                changes["name"] = data.name
            if data.bio is not None:
                changes["bio"] = data.bio
            if data.is_verified is not None:
                changes["is_verified"] = data.is_verified
            if data.is_active is not None:
                changes["is_active"] = data.is_active
            if data.role is not None:
                changes["role"] = data.role
            await webhook_event_emitter.emit_user_updated(
                user_id=user_uuid,
                changes=changes,
            )
        except Exception:
            logger.debug("Webhook emission failed for user.updated", exc_info=True)

        return user_to_response(user)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            "Error updating user",
            extra={"user_id": str(user_id), "error": str(e)},
        )
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update user",
        )


@router.delete("/{user_id}")
async def delete_user(
    user_id: str,
    current_admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> dict[str, str]:
    """
    Delete a user account permanently.

    WARNING: This operation is irreversible.
    Consider using suspend instead for temporary deactivation.
    """
    try:
        # Parse UUID
        try:
            user_uuid = uuid.UUID(user_id)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid user ID format"
            )

        # Query user
        query = select(User).where(User.id == user_uuid)
        result = await db.execute(query)
        user = result.scalar_one_or_none()

        if not user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

        # Delete user (cascades to profile and other relationships)
        await db.delete(user)
        await db.commit()

        # Emit webhook event (after commit, user is deleted)
        try:
            await webhook_event_emitter.emit(
                "user.deleted",
                {"user_id": str(user_uuid), "deleted_by": str(current_admin.id)},
            )
        except Exception:
            logger.debug("Webhook emission failed for user.deleted", exc_info=True)

        return {"message": f"User {user_id} deleted successfully"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            "Error deleting user",
            extra={"user_id": str(user_id), "error": str(e)},
        )
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete user",
        )


@router.post("/{user_id}/suspend", response_model=UserResponse)
async def suspend_user(
    user_id: str,
    current_admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> UserResponse:
    """
    Suspend a user account (set is_active to False).

    Suspended users cannot log in or access the platform.
    This is reversible - use the update endpoint to reactivate.
    """
    try:
        # Parse UUID
        try:
            user_uuid = uuid.UUID(user_id)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid user ID format"
            )

        # Query user with profile
        query = select(User).options(selectinload(User.profile)).where(User.id == user_uuid)
        result = await db.execute(query)
        user = result.scalar_one_or_none()

        if not user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

        # Suspend user
        user.is_active = False
        user.updated_at = datetime.now(timezone.utc)

        await db.commit()
        await db.refresh(user)

        # Emit webhook event
        try:
            await webhook_event_emitter.emit_admin_action(
                admin_id=current_admin.id,
                action="user.suspend",
                target_type="user",
                target_id=user_uuid,
            )
        except Exception:
            logger.debug("Webhook emission failed for admin.action", exc_info=True)

        return user_to_response(user)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            "Error suspending user",
            extra={"user_id": str(user_id), "error": str(e)},
        )
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to suspend user",
        )


@router.post("/{user_id}/verify", response_model=UserResponse)
async def verify_user(
    user_id: str,
    current_admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> UserResponse:
    """
    Verify a user account manually (set is_verified to True).

    Useful for administrative verification or bypassing email verification.
    """
    try:
        # Parse UUID
        try:
            user_uuid = uuid.UUID(user_id)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid user ID format"
            )

        # Query user with profile
        query = select(User).options(selectinload(User.profile)).where(User.id == user_uuid)
        result = await db.execute(query)
        user = result.scalar_one_or_none()

        if not user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

        # Verify user
        user.is_verified = True
        user.updated_at = datetime.now(timezone.utc)

        await db.commit()
        await db.refresh(user)

        # Emit webhook event
        try:
            await webhook_event_emitter.emit_user_verified(
                user_id=user_uuid,
                email=user.email or "",
            )
        except Exception:
            logger.debug("Webhook emission failed for user.verified", exc_info=True)

        return user_to_response(user)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            "Error verifying user",
            extra={"user_id": str(user_id), "error": str(e)},
        )
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to verify user",
        )
