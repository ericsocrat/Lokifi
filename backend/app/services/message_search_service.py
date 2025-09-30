"""
Message search service for J4 Direct Messages.
"""

import uuid
from typing import List, Optional, Dict, Any
from datetime import datetime
from dataclasses import dataclass

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_, func
from sqlalchemy.orm import selectinload

from app.models.conversation import Message, Conversation, ConversationParticipant
from app.models.user import User
from app.schemas.conversation import MessageResponse


@dataclass
class SearchFilter:
    """Search filter parameters."""
    query: Optional[str] = None
    content_type: Optional[str] = None
    sender_username: Optional[str] = None
    date_from: Optional[datetime] = None
    date_to: Optional[datetime] = None
    conversation_id: Optional[uuid.UUID] = None


@dataclass
class SearchResult:
    """Search result with metadata."""
    messages: List[MessageResponse]
    total_count: int
    search_time_ms: int
    page: int
    page_size: int
    has_next: bool


class MessageSearchService:
    """Service for searching messages across conversations."""
    
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def search_messages(
        self,
        user_id: uuid.UUID,
        search_filter: SearchFilter,
        page: int = 1,
        page_size: int = 20
    ) -> SearchResult:
        """Search messages with various filters."""
        start_time = datetime.now()
        
        # Base query - only conversations user participates in
        query = (
            select(Message)
            .join(Conversation, Message.conversation_id == Conversation.id)
            .join(ConversationParticipant, 
                  and_(
                      ConversationParticipant.conversation_id == Conversation.id,
                      ConversationParticipant.user_id == user_id,
                      ConversationParticipant.is_active == True
                  ))
            .where(Message.is_deleted == False)
            .options(selectinload(Message.sender))
        )
        
        # Apply filters
        if search_filter.query:
            # Full-text search (PostgreSQL specific)
            query = query.where(
                Message.content.ilike(f"%{search_filter.query}%")
            )
        
        if search_filter.content_type:
            query = query.where(Message.content_type == search_filter.content_type)
        
        if search_filter.sender_username:
            query = query.join(User, Message.sender_id == User.id).where(
                User.username.ilike(f"%{search_filter.sender_username}%")
            )
        
        if search_filter.date_from:
            query = query.where(Message.created_at >= search_filter.date_from)
        
        if search_filter.date_to:
            query = query.where(Message.created_at <= search_filter.date_to)
        
        if search_filter.conversation_id:
            query = query.where(Message.conversation_id == search_filter.conversation_id)
        
        # Get total count
        count_query = select(func.count()).select_from(query.subquery())
        count_result = await self.db.execute(count_query)
        total_count = count_result.scalar() or 0
        
        # Apply pagination and ordering
        offset = (page - 1) * page_size
        query = query.order_by(Message.created_at.desc()).offset(offset).limit(page_size)
        
        # Execute search
        result = await self.db.execute(query)
        messages = result.scalars().all()
        
        # Build response
        message_responses = []
        for msg in messages:
            # This would normally use the _build_message_response method
            # from ConversationService - simplified here
            message_responses.append(MessageResponse(
                id=msg.id,
                conversation_id=msg.conversation_id,
                sender_id=msg.sender_id,
                content=msg.content,
                content_type=msg.content_type,
                created_at=msg.created_at,
                updated_at=msg.updated_at,
                is_edited=False,  # Would need to track edits
                is_deleted=msg.is_deleted,
                read_by=[]  # Would need to calculate
            ))
        
        # Calculate search time
        end_time = datetime.now()
        search_time_ms = int((end_time - start_time).total_seconds() * 1000)
        
        return SearchResult(
            messages=message_responses,
            total_count=total_count,
            search_time_ms=search_time_ms,
            page=page,
            page_size=page_size,
            has_next=(offset + page_size) < total_count
        )
    
    async def get_popular_search_terms(self, user_id: uuid.UUID) -> List[str]:
        """Get popular search terms for this user (would need search history tracking)."""
        # Placeholder - would implement search history tracking
        return [
            "document", "meeting", "project", "deadline", "update",
            "review", "feedback", "schedule", "call", "email"
        ]
    
    async def search_conversations(
        self,
        user_id: uuid.UUID,
        query: str,
        page: int = 1,
        page_size: int = 10
    ) -> List[Dict[str, Any]]:
        """Search conversations by participant names or group names."""
        # Search for conversations containing the query in participant usernames
        stmt = (
            select(Conversation)
            .join(ConversationParticipant, ConversationParticipant.conversation_id == Conversation.id)
            .join(User, ConversationParticipant.user_id == User.id)
            .where(
                ConversationParticipant.user_id != user_id,  # Exclude self
                or_(
                    User.username.ilike(f"%{query}%"),
                    User.display_name.ilike(f"%{query}%"),
                    Conversation.name.ilike(f"%{query}%")  # For group chats
                )
            )
            .distinct()
            .limit(page_size)
            .offset((page - 1) * page_size)
        )
        
        result = await self.db.execute(stmt)
        conversations = result.scalars().all()
        
        # Build simplified response
        conversation_results = []
        for conv in conversations:
            conversation_results.append({
                "id": str(conv.id),
                "is_group": conv.is_group,
                "name": conv.name,
                "last_message_at": conv.last_message_at.isoformat() if conv.last_message_at else None
            })
        
        return conversation_results