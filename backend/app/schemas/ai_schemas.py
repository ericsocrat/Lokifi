"""
Pydantic schemas for Fynix AI Chatbot (J5).

Request/response models for AI API endpoints.
"""

from datetime import datetime
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field, validator


class AIThreadCreate(BaseModel):
    """Schema for creating a new AI thread."""
    title: Optional[str] = Field(None, max_length=255, description="Thread title")


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
    model: Optional[str] = None
    provider: Optional[str] = None
    token_count: Optional[int] = None
    created_at: datetime
    completed_at: Optional[datetime] = None
    error: Optional[str] = None
    
    class Config:
        from_attributes = True
    
    @property
    def is_complete(self) -> bool:
        """Check if the message generation is complete."""
        return self.completed_at is not None or self.error is not None


class AIChatRequest(BaseModel):
    """Schema for sending a chat message."""
    message: str = Field(..., min_length=1, max_length=10000, description="User message")
    provider: Optional[str] = Field(None, description="Preferred AI provider")
    model: Optional[str] = Field(None, description="Specific model to use")


class AIProviderInfo(BaseModel):
    """Schema for AI provider information."""
    available: bool
    models: List[str]
    default_model: Optional[str]
    name: str
    type: str
    error: Optional[str] = None


class AIProviderStatusResponse(BaseModel):
    """Schema for AI provider status response."""
    providers: Dict[str, AIProviderInfo]


class RateLimitResponse(BaseModel):
    """Schema for rate limit status response."""
    requests_made: int
    requests_remaining: int
    reset_time: Optional[datetime] = None
    window_seconds: int


class StreamChunkResponse(BaseModel):
    """Schema for streaming response chunks."""
    type: str = "chunk"
    content: str
    finish_reason: Optional[str] = None


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
    thread_ids: Optional[List[int]] = None
    date_range: Optional[List[str]] = None  # [start_date, end_date] in ISO format
    
    @validator('format')
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
    errors: List[str]
    message: str


class ModerationStatusResponse(BaseModel):
    """Schema for user moderation status."""
    warning_count: int
    recent_violations: int
    violation_categories: List[str]
    risk_level: str