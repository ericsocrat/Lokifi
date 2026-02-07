"""Pydantic schemas for email template API endpoints."""

from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class EmailTemplateCreate(BaseModel):
    """Schema for creating a new email template."""

    name: str = Field(
        ..., min_length=1, max_length=255, description="Unique template name"
    )
    category: str = Field(
        ..., min_length=1, max_length=50, description="Template category"
    )
    subject: str = Field(
        ..., min_length=1, max_length=500, description="Email subject line"
    )
    body: str = Field(..., min_length=1, description="Plain text email body")
    html_body: str | None = Field(None, description="Rich HTML email body")
    variables: list[str] | None = Field(
        None, description="List of variable placeholders"
    )
    enabled: bool = Field(True, description="Whether template is enabled for use")


class EmailTemplateUpdate(BaseModel):
    """Schema for updating an existing email template."""

    name: str | None = Field(None, min_length=1, max_length=255)
    category: str | None = Field(None, min_length=1, max_length=50)
    subject: str | None = Field(None, min_length=1, max_length=500)
    body: str | None = Field(None, min_length=1)
    html_body: str | None = None
    variables: list[str] | None = None
    enabled: bool | None = None


class EmailTemplateBase(BaseModel):
    """Base schema with common email template fields."""

    id: int
    name: str
    category: str
    subject: str
    body: str
    html_body: str | None
    variables: list[str] | None
    enabled: bool
    version: int
    created_at: datetime
    updated_at: datetime


class EmailTemplateResponse(EmailTemplateBase):
    """Complete email template response."""

    created_by: UUID | None = None

    class Config:
        from_attributes = True


class EmailTemplateListResponse(BaseModel):
    """List response with pagination metadata."""

    templates: list[EmailTemplateResponse] = Field(default_factory=list)
    total: int = Field(default=0)
    offset: int = Field(default=0)
    limit: int = Field(default=50)


class EmailTemplateSendTest(BaseModel):
    """Schema for sending a test email."""

    recipient_email: str = Field(..., description="Email address to send test to")
    variables: dict[str, str] | None = Field(None, description="Test variable values")


class EmailTemplateSendTestResponse(BaseModel):
    """Response for test email send."""

    success: bool
    message: str
    recipient_email: str
