"""
WebSocket endpoints for real-time direct messaging (J4).
"""

import uuid
import json
import logging
import asyncio
from typing import Dict, Any

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, HTTPException
from pydantic import ValidationError
from sqlalchemy.ext.asyncio import AsyncSession

from app.services.websocket_manager import connection_manager, authenticate_websocket
from app.services.conversation_service import ConversationService
from app.services.rate_limit_service import RateLimitService
from app.schemas.conversation import WebSocketMessage, TypingIndicatorMessage, MarkReadRequest
from app.db.database import AsyncSessionLocal
from app.models.conversation import ConversationParticipant

logger = logging.getLogger(__name__)

router = APIRouter()


@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """Main WebSocket endpoint for direct messaging."""
    user_id = await authenticate_websocket(websocket)
    if not user_id:
        return
    
    # Connect user to manager
    await connection_manager.connect(websocket, user_id)
    
    try:
        while True:
            # Receive message from client
            data = await websocket.receive_text()
            await handle_websocket_message(websocket, user_id, data)
    
    except WebSocketDisconnect:
        logger.info(f"User {user_id} disconnected from WebSocket")
    except Exception as e:
        logger.error(f"WebSocket error for user {user_id}: {e}")
    finally:
        await connection_manager.disconnect(websocket, user_id)


async def handle_websocket_message(websocket: WebSocket, user_id: uuid.UUID, message: str):
    """Handle incoming WebSocket message from client."""
    try:
        # Parse message
        data = json.loads(message)
        message_type = data.get("type")
        
        if message_type == "typing":
            await handle_typing_indicator(user_id, data)
        
        elif message_type == "ping":
            # Respond to ping with pong
            await websocket.send_text(json.dumps({"type": "pong"}))
        
        elif message_type == "mark_read":
            await handle_mark_read(user_id, data)
        
        else:
            logger.warning(f"Unknown WebSocket message type: {message_type}")
    
    except json.JSONDecodeError:
        logger.warning(f"Invalid JSON in WebSocket message from user {user_id}")
    except Exception as e:
        logger.error(f"Error handling WebSocket message from user {user_id}: {e}")


async def handle_typing_indicator(user_id: uuid.UUID, data: Dict[str, Any]):
    """Handle typing indicator message."""
    try:
        conversation_id = uuid.UUID(data["conversation_id"])
        is_typing = data.get("is_typing", False)
        
        # Get database session
        async with AsyncSessionLocal() as db:
            conv_service = ConversationService(db)
            
            # Get conversation participants to verify user access
            from sqlalchemy import select
            participant_stmt = select(ConversationParticipant).where(
                ConversationParticipant.conversation_id == conversation_id,
                ConversationParticipant.is_active == True
            )
            result = await db.execute(participant_stmt)
            participants = result.scalars().all()
            participant_ids = {p.user_id for p in participants}
            
            if user_id not in participant_ids:
                logger.warning(f"User {user_id} not authorized for conversation {conversation_id}")
                return
            
            # Broadcast typing indicator
            await connection_manager.broadcast_typing_indicator(
                conversation_id=conversation_id,
                user_id=user_id,
                is_typing=is_typing,
                participant_ids=participant_ids
            )
    
    except Exception as e:
        logger.error(f"Error handling typing indicator: {e}")


async def handle_mark_read(user_id: uuid.UUID, data: Dict[str, Any]):
    """Handle mark message as read."""
    try:
        conversation_id = uuid.UUID(data["conversation_id"])
        message_id = uuid.UUID(data["message_id"])
        
        async with AsyncSessionLocal() as db:
            conv_service = ConversationService(db)
            
            # Create mark read request
            mark_read_data = MarkReadRequest(message_id=message_id)
            
            # Mark message as read
            success = await conv_service.mark_messages_read(
                conversation_id=conversation_id,
                user_id=user_id,
                mark_read_data=mark_read_data
            )
            
            if success:
                # Get participants for broadcast
                from sqlalchemy import select
                participant_stmt = select(ConversationParticipant).where(
                    ConversationParticipant.conversation_id == conversation_id,
                    ConversationParticipant.is_active == True
                )
                result = await db.execute(participant_stmt)
                participants = result.scalars().all()
                participant_ids = {p.user_id for p in participants}
                
                # Broadcast read receipt
                await connection_manager.broadcast_read_receipt(
                    conversation_id=conversation_id,
                    user_id=user_id,
                    message_id=message_id,
                    participant_ids=participant_ids
                )
    
    except Exception as e:
        logger.error(f"Error handling mark read: {e}")


@router.on_event("startup")
async def startup_event():
    """Initialize WebSocket manager on startup."""
    await connection_manager.initialize_redis()
    
    # Start Redis message handler in background
    asyncio.create_task(connection_manager.handle_redis_messages())


@router.on_event("shutdown")
async def shutdown_event():
    """Clean up WebSocket manager on shutdown."""
    await connection_manager.close()


# Health check for WebSocket service
@router.get("/ws/health")
async def websocket_health():
    """Health check for WebSocket service."""
    online_users = len(connection_manager.get_online_users())
    return {
        "status": "healthy",
        "online_users": online_users,
        "redis_connected": connection_manager.redis_client is not None
    }