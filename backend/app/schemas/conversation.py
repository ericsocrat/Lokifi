"""
Pydantic schemas for direct messaging (J4).
"""

from datetime import datetime
from typing import Optional, List
import uuid

from pydantic import BaseModel, Field

from app.models.conversation import ContentType


class MessageCreate(BaseModel):
    """Schema for creating a new message."""
    content: str = Field(..., min_length=1, max_length=5000, description="Message content")
    content_type: ContentType = Field(default=ContentType.TEXT, description="Message content type")


class MessageResponse(BaseModel):
    """Schema for message response."""
    id: uuid.UUID
    conversation_id: uuid.UUID
    sender_id: uuid.UUID
    content: str
    content_type: ContentType
    is_edited: bool
    is_deleted: bool
    created_at: datetime
    updated_at: datetime
    
    # Read receipt info
    read_by: List[uuid.UUID] = Field(default_factory=list, description="User IDs who read this message")
    
    model_config = {"from_attributes": True}


class ConversationParticipantResponse(BaseModel):
    """Schema for conversation participant."""
    user_id: uuid.UUID
    username: str
    display_name: Optional[str]
    avatar_url: Optional[str]
    joined_at: datetime
    is_active: bool
    last_read_message_id: Optional[uuid.UUID]
    
    model_config = {"from_attributes": True}


class ConversationResponse(BaseModel):
    """Schema for conversation response."""
    id: uuid.UUID
    is_group: bool
    name: Optional[str]
    description: Optional[str]
    created_at: datetime
    updated_at: datetime
    last_message_at: Optional[datetime]
    
    # Participants info
    participants: List[ConversationParticipantResponse]
    
    # Latest message preview
    last_message: Optional[MessageResponse]
    
    # Unread count for current user
    unread_count: int = 0
    
    model_config = {"from_attributes": True}


class ConversationListResponse(BaseModel):
    """Schema for conversation list."""
    conversations: List[ConversationResponse]
    total: int
    page: int
    page_size: int
    has_next: bool


class MessagesListResponse(BaseModel):
    """Schema for messages list."""
    messages: List[MessageResponse]
    total: int
    page: int
    page_size: int
    has_next: bool
    conversation_id: uuid.UUID


class ConversationCreateRequest(BaseModel):
    """Schema for creating a 1:1 conversation."""
    other_user_id: uuid.UUID = Field(..., description="ID of the other user in the conversation")


class MarkReadRequest(BaseModel):
    """Schema for marking messages as read."""
    message_id: uuid.UUID = Field(..., description="Latest message ID to mark as read")


class TypingIndicatorMessage(BaseModel):
    """Schema for typing indicator WebSocket message."""
    type: str = "typing"
    conversation_id: uuid.UUID
    user_id: uuid.UUID
    is_typing: bool


class NewMessageNotification(BaseModel):
    """Schema for new message WebSocket notification."""
    type: str = "new_message"
    message: MessageResponse


class MessageReadNotification(BaseModel):
    """Schema for message read WebSocket notification."""
    type: str = "message_read"
    conversation_id: uuid.UUID
    user_id: uuid.UUID
    message_id: uuid.UUID
    read_at: datetime


class WebSocketMessage(BaseModel):
    """Base schema for WebSocket messages."""
    type: str
    data: dict


class RateLimitError(BaseModel):
    """Schema for rate limit error response."""
    detail: str = "Rate limit exceeded"
    retry_after: int = Field(..., description="Seconds until next attempt allowed")
    limit: int = Field(..., description="Messages per window")
    window: int = Field(..., description="Window size in seconds")


class UserStatus(BaseModel):
    """Schema for user online status."""
    user_id: uuid.UUID
    is_online: bool
    last_seen: Optional[datetime]
    
    model_config = {"from_attributes": True}