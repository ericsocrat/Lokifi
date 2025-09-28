"""
WebSocket handler for real-time AI chat streaming in Fynix (J5.1).

Provides WebSocket endpoint for real-time bidirectional AI chat.
"""

import json
import logging
from typing import Dict, Optional
from datetime import datetime

from fastapi import WebSocket, WebSocketDisconnect, Depends, HTTPException, status
from fastapi.routing import APIRouter
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.db.models import User, AIThread, AIMessage
from app.services.ai_service import ai_service, RateLimitError, SafetyFilterError
from app.services.ai_provider import StreamChunk, ProviderError

logger = logging.getLogger(__name__)

router = APIRouter()


class ConnectionManager:
    """Manages WebSocket connections for AI chat."""
    
    def __init__(self):
        # user_id -> websocket connection
        self.active_connections: Dict[int, WebSocket] = {}
    
    async def connect(self, websocket: WebSocket, user_id: int):
        """Accept WebSocket connection and store it."""
        await websocket.accept()
        self.active_connections[user_id] = websocket
        logger.info(f"WebSocket connected for user {user_id}")
    
    def disconnect(self, user_id: int):
        """Remove WebSocket connection."""
        if user_id in self.active_connections:
            del self.active_connections[user_id]
            logger.info(f"WebSocket disconnected for user {user_id}")
    
    async def send_personal_message(self, message: dict, user_id: int):
        """Send message to specific user."""
        if user_id in self.active_connections:
            try:
                await self.active_connections[user_id].send_text(json.dumps(message))
            except Exception as e:
                logger.error(f"Error sending WebSocket message to user {user_id}: {e}")
                self.disconnect(user_id)
    
    def is_connected(self, user_id: int) -> bool:
        """Check if user has active WebSocket connection."""
        return user_id in self.active_connections


manager = ConnectionManager()


def get_user_from_token(token: Optional[str], db: Session) -> Optional[User]:
    """Extract user from WebSocket token parameter."""
    if not token:
        return None
    
    try:
        from app.api.deps import _auth_handle, _user_by_handle
        # Extract handle from "Bearer token" format
        if token.startswith("Bearer "):
            token = token[7:]
        
        # Create a fake authorization header for existing auth function
        fake_auth = f"Bearer {token}"
        handle = _auth_handle(fake_auth)
        
        if not handle:
            return None
        
        return _user_by_handle(db, handle)
        
    except Exception as e:
        logger.error(f"Token validation error: {e}")
        return None


@router.websocket("/ai/ws")
async def websocket_ai_chat(websocket: WebSocket, token: Optional[str] = None, db: Session = Depends(get_db)):
    """
    WebSocket endpoint for real-time AI chat.
    
    Client should connect with: ws://localhost:8000/api/ai/ws?token=your_jwt_token
    
    Message format:
    {
        "type": "chat",
        "thread_id": 123,
        "message": "Hello AI",
        "provider": "openrouter",  // optional
        "model": "gpt-3.5-turbo"   // optional
    }
    
    Response format:
    {
        "type": "chunk|complete|error",
        "thread_id": 123,
        "content": "AI response...",
        "is_complete": false,
        "message_id": 456,  // for complete messages
        "error": "error message"  // for errors
    }
    """
    
    # Authenticate user
    user = get_user_from_token(token, db)
    if not user:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Invalid token")
        return
    
    await manager.connect(websocket, user.id)
    
    try:
        while True:
            # Receive message from client
            data = await websocket.receive_text()
            try:
                message_data = json.loads(data)
            except json.JSONDecodeError:
                await manager.send_personal_message({
                    "type": "error",
                    "error": "Invalid JSON format"
                }, user.id)
                continue
            
            # Validate message format
            if not isinstance(message_data, dict) or "type" not in message_data:
                await manager.send_personal_message({
                    "type": "error", 
                    "error": "Message must be JSON object with 'type' field"
                }, user.id)
                continue
            
            if message_data["type"] == "chat":
                await handle_chat_message(message_data, user, db)
            elif message_data["type"] == "ping":
                await manager.send_personal_message({
                    "type": "pong",
                    "timestamp": datetime.utcnow().isoformat()
                }, user.id)
            else:
                await manager.send_personal_message({
                    "type": "error",
                    "error": f"Unknown message type: {message_data['type']}"
                }, user.id)
                
    except WebSocketDisconnect:
        manager.disconnect(user.id)
    except Exception as e:
        logger.error(f"WebSocket error for user {user.id}: {e}")
        manager.disconnect(user.id)


async def handle_chat_message(message_data: dict, user: User, db: Session):
    """Handle incoming chat message via WebSocket."""
    
    # Validate required fields
    required_fields = ["thread_id", "message"]
    for field in required_fields:
        if field not in message_data:
            await manager.send_personal_message({
                "type": "error",
                "error": f"Missing required field: {field}"
            }, user.id)
            return
    
    thread_id = message_data["thread_id"]
    message = message_data["message"]
    provider = message_data.get("provider")
    model = message_data.get("model")
    
    try:
        # Stream AI response
        async for chunk in ai_service.send_message(
            user_id=user.id,
            thread_id=thread_id,
            message=message,
            provider_name=provider,
            model=model
        ):
            if isinstance(chunk, StreamChunk):
                # Send streaming chunk
                await manager.send_personal_message({
                    "type": "chunk",
                    "thread_id": thread_id,
                    "content": chunk.content,
                    "is_complete": chunk.is_complete,
                    "model": chunk.model,
                    "chunk_id": chunk.id
                }, user.id)
            elif isinstance(chunk, AIMessage):
                # Send complete message
                await manager.send_personal_message({
                    "type": "complete",
                    "thread_id": thread_id,
                    "message_id": chunk.id,
                    "role": chunk.role,
                    "content": chunk.content,
                    "model": chunk.model,
                    "provider": chunk.provider,
                    "token_count": chunk.token_count,
                    "created_at": chunk.created_at.isoformat(),
                    "completed_at": chunk.completed_at.isoformat() if chunk.completed_at else None,
                    "error": chunk.error
                }, user.id)
                
    except RateLimitError as e:
        await manager.send_personal_message({
            "type": "error",
            "thread_id": thread_id,
            "error": "rate_limit",
            "message": str(e)
        }, user.id)
    except SafetyFilterError as e:
        await manager.send_personal_message({
            "type": "error", 
            "thread_id": thread_id,
            "error": "safety_filter",
            "message": str(e)
        }, user.id)
    except ProviderError as e:
        await manager.send_personal_message({
            "type": "error",
            "thread_id": thread_id,
            "error": "provider_error", 
            "message": str(e)
        }, user.id)
    except Exception as e:
        logger.error(f"Chat error for user {user.id}: {e}")
        await manager.send_personal_message({
            "type": "error",
            "thread_id": thread_id,
            "error": "internal_error",
            "message": "An internal error occurred"
        }, user.id)


# Connection status endpoint
@router.get("/ai/ws/status")
async def websocket_status():
    """Get WebSocket connection status."""
    return {
        "active_connections": len(manager.active_connections),
        "connected_users": list(manager.active_connections.keys())
    }