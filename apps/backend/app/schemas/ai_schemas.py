"""
Pydantic schemas for Lokifi AI Chatbot (J5).

Request/response models for AI API endpoints.
"""

from datetime import datetime

from pydantic import BaseModel, Field, field_validator


class AIThreadCreate(BaseModel):
    """Schema for creating a new AI thread."""
    title: str | None = Field(None, max_length=255, description="Thread title")


class AIThreadUpdate(BaseModel):
    """Schema for updating an AI thread."""
    title: str = Field(..., min_length=1, max_length=255, description="New thread title")


class AIThreadResponse(BaseModel):
    """Schema for AI thread response."""
    id: int
    user_id: int
    title: str
    created_at: datetime
    updated_at: datetime
    is_archived: bool = False
    
    class Config:
        from_attributes = True


class AIMessageResponse(BaseModel):
    """Schema for AI message response."""
    id: int
    thread_id: int
    role: str
    content: str
    model: str | None = None
    provider: str | None = None
    token_count: int | None = None
    created_at: datetime
    completed_at: datetime | None = None
    error: str | None = None
    
    class Config:
        from_attributes = True
    
    @property
    def is_complete(self) -> bool:
        """Check if the message generation is complete."""
        return self.completed_at is not None or self.error is not None


class AIChatRequest(BaseModel):
    """Schema for sending a chat message."""
    message: str = Field(..., min_length=1, max_length=10000, description="User message")
    provider: str | None = Field(None, description="Preferred AI provider")
    model: str | None = Field(None, description="Specific model to use")


class AIProviderInfo(BaseModel):
    """Schema for AI provider information."""
    available: bool
    models: list[str]
    default_model: str | None
    name: str
    type: str
    error: str | None = None


class AIProviderStatusResponse(BaseModel):
    """Schema for AI provider status response."""
    providers: dict[str, AIProviderInfo]


class RateLimitResponse(BaseModel):
    """Schema for rate limit status response."""
    requests_made: int
    requests_remaining: int
    reset_time: datetime | None = None
    window_seconds: int


class StreamChunkResponse(BaseModel):
    """Schema for streaming response chunks."""
    type: str = "chunk"
    content: str
    finish_reason: str | None = None


class CompleteResponse(BaseModel):
    """Schema for complete message response."""
    type: str = "complete"
    message: AIMessageResponse


class ErrorResponse(BaseModel):
    """Schema for error responses in streaming."""
    type: str = "error"
    error: str
    message: str


class ExportRequest(BaseModel):
    """Schema for conversation export request."""
    format: str = Field("json", description="Export format")
    include_metadata: bool = True
    compress: bool = False
    thread_ids: list[int] | None = None
    date_range: list[str] | None = None  # [start_date, end_date] in ISO format
    
    @field_validator('format')
    @classmethod
    def validate_format(cls, v):
        allowed_formats = ['json', 'csv', 'markdown', 'html', 'xml', 'txt']
        if v not in allowed_formats:
            raise ValueError(f'Format must be one of: {allowed_formats}')
        return v


class ImportResponse(BaseModel):
    """Schema for conversation import response."""
    success: bool
    imported_conversations: int
    imported_messages: int
    errors: list[str]
    message: str


class ModerationStatusResponse(BaseModel):
    """Schema for user moderation status."""
    warning_count: int
    recent_violations: int
    violation_categories: list[str]
    risk_level: str