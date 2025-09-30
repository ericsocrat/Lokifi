"""
Conversation service for direct messaging (J4).
"""

import uuid
from datetime import UTC, datetime

from fastapi import HTTPException, status
from sqlalchemy import desc, func, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.conversation import Conversation, ConversationParticipant, Message, MessageReceipt
from app.models.profile import Profile
from app.models.user import User
from app.schemas.conversation import (
    ConversationListResponse,
    ConversationParticipantResponse,
    ConversationResponse,
    MarkReadRequest,
    MessageCreate,
    MessageResponse,
    MessagesListResponse,
)


class ConversationService:
    """Service for managing conversations and messages."""
    
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def get_or_create_dm_conversation(
        self, 
        user1_id: uuid.UUID, 
        user2_id: uuid.UUID
    ) -> ConversationResponse:
        """Get or create a 1:1 direct message conversation between two users."""
        if user1_id == user2_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot create conversation with yourself"
            )
        
        # Ensure both users exist and are active
        users_stmt = select(User).where(
            User.id.in_([user1_id, user2_id]),
            User.is_active
        )
        result = await self.db.execute(users_stmt)
        users = result.scalars().all()
        
        if len(users) != 2:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="One or both users not found"
            )
        
        # Look for existing conversation between these users
        existing_stmt = (
            select(Conversation)
            .join(ConversationParticipant, ConversationParticipant.conversation_id == Conversation.id)
            .where(
                ~Conversation.is_group,
                ConversationParticipant.user_id.in_([user1_id, user2_id])
            )
            .group_by(Conversation.id)
            .having(func.count(ConversationParticipant.user_id) == 2)
            .options(selectinload(Conversation.participants))
        )
        
        result = await self.db.execute(existing_stmt)
        existing_conversations = result.scalars().all()
        
        # Check if any existing conversation has exactly these two users
        for conv in existing_conversations:
            participant_ids = {p.user_id for p in conv.participants}
            if participant_ids == {user1_id, user2_id}:
                return await self._build_conversation_response(conv, user1_id)
        
        # Create new conversation
        conversation = Conversation(
            is_group=False
        )
        self.db.add(conversation)
        await self.db.flush()
        
        # Add participants
        participant1 = ConversationParticipant(
            conversation_id=conversation.id,
            user_id=user1_id
        )
        participant2 = ConversationParticipant(
            conversation_id=conversation.id,
            user_id=user2_id
        )
        
        self.db.add(participant1)
        self.db.add(participant2)
        await self.db.commit()
        
        # Reload with relationships
        await self.db.refresh(conversation)
        return await self._build_conversation_response(conversation, user1_id)
    
    async def get_user_conversations(
        self,
        user_id: uuid.UUID,
        page: int = 1,
        page_size: int = 20
    ) -> ConversationListResponse:
        """Get conversations for a user with pagination."""
        offset = (page - 1) * page_size
        
        # Get conversations where user is participant
        stmt = (
            select(Conversation)
            .join(ConversationParticipant, ConversationParticipant.conversation_id == Conversation.id)
            .where(
                ConversationParticipant.user_id == user_id,
                ConversationParticipant.is_active
            )
            .order_by(desc(Conversation.last_message_at), desc(Conversation.updated_at))
            .offset(offset)
            .limit(page_size)
            .options(selectinload(Conversation.participants))
        )
        
        result = await self.db.execute(stmt)
        conversations = result.scalars().all()
        
        # Get total count
        count_stmt = (
            select(func.count())
            .select_from(Conversation)
            .join(ConversationParticipant, ConversationParticipant.conversation_id == Conversation.id)
            .where(
                ConversationParticipant.user_id == user_id,
                ConversationParticipant.is_active
            )
        )
        result = await self.db.execute(count_stmt)
        total = result.scalar() or 0
        
        # Build response list
        conversation_responses = []
        for conv in conversations:
            conv_response = await self._build_conversation_response(conv, user_id)
            conversation_responses.append(conv_response)
        
        return ConversationListResponse(
            conversations=conversation_responses,
            total=total,
            page=page,
            page_size=page_size,
            has_next=(offset + page_size) < total
        )
    
    async def send_message(
        self,
        conversation_id: uuid.UUID,
        sender_id: uuid.UUID,
        message_data: MessageCreate
    ) -> MessageResponse:
        """Send a message in a conversation."""
        # Verify user is participant in conversation
        participant_stmt = select(ConversationParticipant).where(
            ConversationParticipant.conversation_id == conversation_id,
            ConversationParticipant.user_id == sender_id,
            ConversationParticipant.is_active
        )
        result = await self.db.execute(participant_stmt)
        participant = result.scalar_one_or_none()
        
        if not participant:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not a participant in this conversation"
            )
        
        # Create message
        message = Message(
            conversation_id=conversation_id,
            sender_id=sender_id,
            content=message_data.content,
            content_type=message_data.content_type
        )
        self.db.add(message)
        await self.db.flush()
        
        # Update conversation's last_message_at
        update_conv_stmt = (
            update(Conversation)
            .where(Conversation.id == conversation_id)
            .values(
                last_message_at=datetime.now(UTC),
                updated_at=datetime.now(UTC)
            )
        )
        await self.db.execute(update_conv_stmt)
        
        # Create read receipt for sender
        receipt = MessageReceipt(
            message_id=message.id,
            user_id=sender_id
        )
        self.db.add(receipt)
        
        await self.db.commit()
        
        # Build response
        return await self._build_message_response(message)
    
    async def get_conversation_messages(
        self,
        conversation_id: uuid.UUID,
        user_id: uuid.UUID,
        page: int = 1,
        page_size: int = 50
    ) -> MessagesListResponse:
        """Get messages in a conversation with pagination."""
        # Verify user is participant
        participant_stmt = select(ConversationParticipant).where(
            ConversationParticipant.conversation_id == conversation_id,
            ConversationParticipant.user_id == user_id,
            ConversationParticipant.is_active
        )
        result = await self.db.execute(participant_stmt)
        participant = result.scalar_one_or_none()
        
        if not participant:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not a participant in this conversation"
            )
        
        offset = (page - 1) * page_size
        
        # Get messages (newest first for pagination, but we'll reverse for chronological order)
        stmt = (
            select(Message)
            .where(
                Message.conversation_id == conversation_id,
                ~Message.is_deleted
            )
            .order_by(desc(Message.created_at))
            .offset(offset)
            .limit(page_size)
            .options(selectinload(Message.receipts))
        )
        
        result = await self.db.execute(stmt)
        messages = list(reversed(result.scalars().all()))  # Reverse for chronological order
        
        # Get total count
        count_stmt = select(func.count()).select_from(Message).where(
            Message.conversation_id == conversation_id,
            ~Message.is_deleted
        )
        result = await self.db.execute(count_stmt)
        total = result.scalar() or 0
        
        # Build response list
        message_responses = []
        for msg in messages:
            msg_response = await self._build_message_response(msg)
            message_responses.append(msg_response)
        
        return MessagesListResponse(
            messages=message_responses,
            total=total,
            page=page,
            page_size=page_size,
            has_next=(offset + page_size) < total,
            conversation_id=conversation_id
        )
    
    async def mark_messages_read(
        self,
        conversation_id: uuid.UUID,
        user_id: uuid.UUID,
        mark_read_data: MarkReadRequest
    ) -> bool:
        """Mark messages as read up to a specific message."""
        # Verify user is participant
        participant_stmt = select(ConversationParticipant).where(
            ConversationParticipant.conversation_id == conversation_id,
            ConversationParticipant.user_id == user_id,
            ConversationParticipant.is_active
        )
        result = await self.db.execute(participant_stmt)
        participant = result.scalar_one_or_none()
        
        if not participant:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not a participant in this conversation"
            )
        
        # Verify message exists in conversation
        message_stmt = select(Message).where(
            Message.id == mark_read_data.message_id,
            Message.conversation_id == conversation_id
        )
        result = await self.db.execute(message_stmt)
        target_message = result.scalar_one_or_none()
        
        if not target_message:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Message not found in this conversation"
            )
        
        # Get all messages up to and including the target message
        messages_stmt = select(Message.id).where(
            Message.conversation_id == conversation_id,
            Message.created_at <= target_message.created_at,
            ~Message.is_deleted
        )
        result = await self.db.execute(messages_stmt)
        message_ids = [row[0] for row in result.all()]
        
        # Create receipts for messages not already read by this user
        existing_receipts_stmt = select(MessageReceipt.message_id).where(
            MessageReceipt.message_id.in_(message_ids),
            MessageReceipt.user_id == user_id
        )
        result = await self.db.execute(existing_receipts_stmt)
        existing_message_ids = {row[0] for row in result.all()}
        
        new_receipts = []
        for message_id in message_ids:
            if message_id not in existing_message_ids:
                new_receipts.append(MessageReceipt(
                    message_id=message_id,
                    user_id=user_id
                ))
        
        if new_receipts:
            self.db.add_all(new_receipts)
        
        # Update participant's last read message
        update_participant_stmt = (
            update(ConversationParticipant)
            .where(
                ConversationParticipant.conversation_id == conversation_id,
                ConversationParticipant.user_id == user_id
            )
            .values(last_read_message_id=mark_read_data.message_id)
        )
        await self.db.execute(update_participant_stmt)
        
        await self.db.commit()
        return True
    
    async def _build_conversation_response(
        self, 
        conversation: Conversation, 
        current_user_id: uuid.UUID
    ) -> ConversationResponse:
        """Build a conversation response with all necessary data."""
        # Get participants with user details
        participants_stmt = (
            select(ConversationParticipant, Profile)
            .join(Profile, Profile.user_id == ConversationParticipant.user_id)
            .where(ConversationParticipant.conversation_id == conversation.id)
        )
        result = await self.db.execute(participants_stmt)
        participant_data = result.all()
        
        participants = []
        for participant, profile in participant_data:
            participants.append(ConversationParticipantResponse(
                user_id=participant.user_id,
                username=profile.username,
                display_name=profile.display_name,
                avatar_url=profile.avatar_url,
                joined_at=participant.joined_at,
                is_active=participant.is_active,
                last_read_message_id=participant.last_read_message_id
            ))
        
        # Get last message
        last_message = None
        last_message_stmt = (
            select(Message)
            .where(
                Message.conversation_id == conversation.id,
                ~Message.is_deleted
            )
            .order_by(desc(Message.created_at))
            .limit(1)
            .options(selectinload(Message.receipts))
        )
        result = await self.db.execute(last_message_stmt)
        last_msg = result.scalar_one_or_none()
        
        if last_msg:
            last_message = await self._build_message_response(last_msg)
        
        # Calculate unread count for current user
        current_participant = next(
            (p for p in participant_data if p[0].user_id == current_user_id), 
            None
        )
        
        unread_count = 0
        if current_participant and current_participant[0].last_read_message_id:
            # Count messages after last read message
            unread_stmt = (
                select(func.count())
                .select_from(Message)
                .where(
                    Message.conversation_id == conversation.id,
                    Message.created_at > select(Message.created_at).where(
                        Message.id == current_participant[0].last_read_message_id
                    ),
                    ~Message.is_deleted
                )
            )
            result = await self.db.execute(unread_stmt)
            unread_count = result.scalar() or 0
        elif current_participant:
            # If no last read message, count all messages
            unread_stmt = (
                select(func.count())
                .select_from(Message)
                .where(
                    Message.conversation_id == conversation.id,
                    Message.sender_id != current_user_id,  # Don't count own messages
                    ~Message.is_deleted
                )
            )
            result = await self.db.execute(unread_stmt)
            unread_count = result.scalar() or 0
        
        return ConversationResponse(
            id=conversation.id,
            is_group=conversation.is_group,
            name=conversation.name,
            description=conversation.description,
            created_at=conversation.created_at,
            updated_at=conversation.updated_at,
            last_message_at=conversation.last_message_at,
            participants=participants,
            last_message=last_message,
            unread_count=unread_count
        )
    
    async def _build_message_response(self, message: Message) -> MessageResponse:
        """Build a message response with read receipts."""
        # Get read receipts
        read_by = [receipt.user_id for receipt in message.receipts]
        
        return MessageResponse(
            id=message.id,
            conversation_id=message.conversation_id,
            sender_id=message.sender_id,
            content=message.content,
            content_type=message.content_type,
            is_edited=message.is_edited,
            is_deleted=message.is_deleted,
            created_at=message.created_at,
            updated_at=message.updated_at,
            read_by=read_by
        )