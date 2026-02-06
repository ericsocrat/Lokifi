"""API Key management routes for admin panel."""

from __future__ import annotations

import hashlib
import logging
from typing import Any
from uuid import UUID

from app.core.security import get_current_user
from app.db.database import get_db
from app.models.api_key import APIKey, generate_api_key
from app.models.user import User
from app.schemas.api_key import (
    APIKeyCreate,
    APIKeyCreateResponse,
    APIKeyListResponse,
    APIKeyResponse,
    APIKeyUpdate,
    APIKeyValidateRequest,
    APIKeyValidateResponse,
)
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Admin - API Keys"])


def require_admin(current_user: User = Depends(get_current_user)) -> User:
    """Dependency to require admin privileges (inline to avoid circular imports)."""
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin privileges required",
        )
    return current_user


def hash_api_key(plain_key: str) -> str:
    """Hash an API key using SHA-256."""
    return hashlib.sha256(plain_key.encode()).hexdigest()


@router.get("/admin/api-keys", response_model=APIKeyListResponse)
async def list_api_keys(
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
    offset: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=500),
    search: str | None = Query(None),
    is_active: bool | None = Query(None),
    created_by: int | None = Query(None),
) -> APIKeyListResponse:
    """List all API keys with optional filtering.

    Args:
        current_user: Admin user making the request
        db: Database session
        offset: Pagination offset
        limit: Pagination limit
        search: Search in name or description
        is_active: Filter by active status
        created_by: Filter by creator user ID

    Returns:
        Paginated list of API keys
    """
    logger.info(
        "Admin listing API keys",
        extra={
            "admin_id": current_user.id,
            "offset": offset,
            "limit": limit,
            "filters": {
                "search": search,
                "is_active": is_active,
                "created_by": created_by,
            },
        },
    )

    # Build base query
    query = select(APIKey)

    # Apply filters
    if search:
        search_filter = f"%{search}%"
        query = query.where(
            (APIKey.name.ilike(search_filter)) | (APIKey.description.ilike(search_filter))
        )

    if is_active is not None:
        query = query.where(APIKey.is_active == is_active)

    if created_by is not None:
        query = query.where(APIKey.created_by == created_by)

    # Get total count
    count_query = select(func.count()).select_from(query.subquery())
    count_result = await db.execute(count_query)
    total = count_result.scalar() or 0

    # Apply pagination and ordering
    query = query.order_by(APIKey.created_at.desc()).offset(offset).limit(limit)

    # Execute query
    result = await db.execute(query)
    api_keys = result.scalars().all()

    logger.info(
        "API keys list retrieved",
        extra={"admin_id": current_user.id, "total": total, "returned": len(api_keys)},
    )

    return APIKeyListResponse(items=api_keys, total=total, offset=offset, limit=limit)


@router.get("/admin/api-keys/{key_id}", response_model=APIKeyResponse)
async def get_api_key(
    key_id: UUID,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> APIKey:
    """Get a specific API key by ID.

    Args:
        key_id: UUID of the API key
        current_user: Admin user making the request
        db: Database session

    Returns:
        API key details

    Raises:
        HTTPException: 404 if key not found
    """
    logger.info(
        "Admin fetching API key", extra={"admin_id": current_user.id, "key_id": str(key_id)}
    )

    result = await db.execute(select(APIKey).where(APIKey.id == key_id))
    api_key = result.scalar_one_or_none()

    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"API key with ID {key_id} not found",
        )

    return api_key


@router.post(
    "/admin/api-keys", response_model=APIKeyCreateResponse, status_code=status.HTTP_201_CREATED
)
async def create_api_key(
    data: APIKeyCreate,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """Create a new API key.

    IMPORTANT: The plain API key is only returned ONCE during creation.
    Store it securely - it cannot be retrieved again.

    Args:
        data: API key creation data
        current_user: Admin user making the request
        db: Database session

    Returns:
        Created API key with plain key included

    Raises:
        HTTPException: 409 if key with same name exists
    """
    logger.info(
        "Admin creating API key",
        extra={"admin_id": current_user.id, "key_name": data.name, "scopes": data.scopes},
    )

    # Check for duplicate name
    existing = await db.execute(select(APIKey).where(APIKey.name == data.name))
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"API key with name '{data.name}' already exists",
        )

    # Generate plain key and hash it
    plain_key = generate_api_key()
    key_hash = hash_api_key(plain_key)
    key_prefix = plain_key[:12]  # e.g., "lk_abc12345"

    # Create API key
    api_key = APIKey(
        key_hash=key_hash,
        key_prefix=key_prefix,
        name=data.name,
        description=data.description,
        scopes=data.scopes or [],
        rate_limit=data.rate_limit,
        expires_at=data.expires_at,
        is_active=data.is_active,
        created_by=current_user.id,
    )

    db.add(api_key)
    await db.commit()
    await db.refresh(api_key)

    logger.info(
        "API key created",
        extra={
            "admin_id": current_user.id,
            "key_id": str(api_key.id),
            "key_prefix": key_prefix,
        },
    )

    # Return API key with plain key (only time it's shown)
    return {
        **APIKeyResponse.model_validate(api_key).model_dump(),
        "plain_key": plain_key,
    }


@router.patch("/admin/api-keys/{key_id}", response_model=APIKeyResponse)
async def update_api_key(
    key_id: UUID,
    data: APIKeyUpdate,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> APIKey:
    """Update an existing API key.

    Args:
        key_id: UUID of the API key
        data: Update data
        current_user: Admin user making the request
        db: Database session

    Returns:
        Updated API key

    Raises:
        HTTPException: 404 if key not found, 409 if name conflict
    """
    logger.info(
        "Admin updating API key",
        extra={
            "admin_id": current_user.id,
            "key_id": str(key_id),
            "updates": data.model_dump(exclude_unset=True),
        },
    )

    result = await db.execute(select(APIKey).where(APIKey.id == key_id))
    api_key = result.scalar_one_or_none()

    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"API key with ID {key_id} not found",
        )

    # Check for name conflict if name is being updated
    if data.name and data.name != api_key.name:
        existing = await db.execute(select(APIKey).where(APIKey.name == data.name))
        if existing.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"API key with name '{data.name}' already exists",
            )

    # Update fields
    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(api_key, field, value)

    await db.commit()
    await db.refresh(api_key)

    logger.info("API key updated", extra={"admin_id": current_user.id, "key_id": str(key_id)})

    return api_key


@router.delete("/admin/api-keys/{key_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_api_key(
    key_id: UUID,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> None:
    """Delete an API key (soft delete by setting is_active=False).

    Args:
        key_id: UUID of the API key
        current_user: Admin user making the request
        db: Database session

    Raises:
        HTTPException: 404 if key not found
    """
    logger.info(
        "Admin deleting API key", extra={"admin_id": current_user.id, "key_id": str(key_id)}
    )

    result = await db.execute(select(APIKey).where(APIKey.id == key_id))
    api_key = result.scalar_one_or_none()

    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"API key with ID {key_id} not found",
        )

    # Soft delete
    api_key.is_active = False
    await db.commit()

    logger.info(
        "API key deleted (soft)", extra={"admin_id": current_user.id, "key_id": str(key_id)}
    )


@router.post("/admin/api-keys/validate", response_model=APIKeyValidateResponse)
async def validate_api_key(
    data: APIKeyValidateRequest,
    db: AsyncSession = Depends(get_db),
) -> APIKeyValidateResponse:
    """Validate an API key (for middleware/auth purposes).

    This endpoint does NOT require admin auth - it's used by API key authentication middleware.

    Args:
        data: API key to validate
        db: Database session

    Returns:
        Validation result with key details if valid
    """
    from datetime import datetime, timezone

    logger.debug("Validating API key", extra={"key_prefix": data.api_key[:12]})

    # Hash the provided key
    key_hash = hash_api_key(data.api_key)

    # Look up key
    result = await db.execute(select(APIKey).where(APIKey.key_hash == key_hash))
    api_key = result.scalar_one_or_none()

    # Key not found
    if not api_key:
        return APIKeyValidateResponse(valid=False, error="Invalid API key")

    # Check if active
    if not api_key.is_active:
        return APIKeyValidateResponse(valid=False, error="API key is inactive")

    # Check if expired
    if api_key.expires_at and api_key.expires_at < datetime.now(timezone.utc):
        return APIKeyValidateResponse(valid=False, error="API key has expired")

    # Update last_used_at
    api_key.last_used_at = datetime.now(timezone.utc)
    await db.commit()

    # Valid key
    return APIKeyValidateResponse(
        valid=True,
        key_id=api_key.id,
        scopes=api_key.scopes,
        rate_limit=api_key.rate_limit,
        expires_at=api_key.expires_at,
    )
