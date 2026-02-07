"""Pydantic schemas for API Key management."""

from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class APIKeyCreate(BaseModel):
    """Schema for creating a new API key."""

    name: str = Field(
        ..., min_length=1, max_length=255, description="Human-readable key name"
    )
    description: str | None = Field(
        None, description="Optional description of key purpose"
    )
    scopes: list[str] | None = Field(
        default=None,
        description="Permission scopes (e.g., ['read:users', 'write:content'])",
    )
    rate_limit: int = Field(
        60, ge=0, le=10000, description="Requests per minute (0=unlimited)"
    )
    expires_at: datetime | None = Field(
        None, description="Optional expiration datetime"
    )
    is_active: bool = Field(True, description="Whether key is enabled")


class APIKeyUpdate(BaseModel):
    """Schema for updating an existing API key."""

    name: str | None = Field(None, min_length=1, max_length=255)
    description: str | None = None
    scopes: list[str] | None = None
    rate_limit: int | None = Field(None, ge=0, le=10000)
    expires_at: datetime | None = None
    is_active: bool | None = None


class APIKeyBase(BaseModel):
    """Base schema with common API key fields."""

    id: UUID
    key_prefix: str
    name: str
    description: str | None
    scopes: list[str] | None
    rate_limit: int
    expires_at: datetime | None
    last_used_at: datetime | None
    is_active: bool
    created_by: UUID | None
    created_at: datetime
    updated_at: datetime


class APIKeyResponse(APIKeyBase):
    """Complete API key response (without full key)."""

    model_config = ConfigDict(from_attributes=True)


class APIKeyCreateResponse(APIKeyBase):
    """Response when creating a new API key - includes full key ONCE."""

    plain_key: str = Field(..., description="Full API key (only shown once)")

    model_config = ConfigDict(from_attributes=True)


class APIKeyListResponse(BaseModel):
    """Paginated list of API keys."""

    items: list[APIKeyResponse]
    total: int
    offset: int
    limit: int


class APIKeyValidateRequest(BaseModel):
    """Request to validate an API key."""

    api_key: str = Field(..., description="Full API key to validate")


class APIKeyValidateResponse(BaseModel):
    """Response from API key validation."""

    valid: bool
    key_id: UUID | None = None
    scopes: list[str] | None = None
    rate_limit: int | None = None
    expires_at: datetime | None = None
    error: str | None = None
