"""
WebSocket manager for real-time direct messaging (J4) with J6.2 Redis integration.
"""

import uuid
import json
import logging
from typing import Dict, Set, Optional, Any
from datetime import datetime, timezone

from fastapi import WebSocket, WebSocketDisconnect
from pydantic import ValidationError

from app.core.config import settings
from app.core.security import verify_jwt_token
from app.core.redis_client import redis_client  # Use enhanced Redis client
from app.schemas.conversation import (
    TypingIndicatorMessage, NewMessageNotification, 
    MessageReadNotification, WebSocketMessage, MessageResponse
)
from app.services.performance_monitor import performance_monitor

logger = logging.getLogger(__name__)


class ConnectionManager:
    """Manages WebSocket connections for real-time messaging with J6.2 Redis integration."""
    
    def __init__(self):
        # Active connections: user_id -> set of WebSocket connections
        self.active_connections: Dict[uuid.UUID, Set[WebSocket]] = {}
        # Redis pub/sub connection
        self.pubsub = None
        # Reference to global Redis client
        self.redis_client = redis_client
        
    async def initialize_redis(self):
        """Initialize Redis connection for pub/sub using enhanced Redis client."""
        try:
            # Use the enhanced Redis client
            await self.redis_client.initialize()
            if await self.redis_client.is_available():
                logger.info("✅ Redis WebSocket integration ready")
                # Advanced pub/sub features will be implemented in Phase K Track 3
            else:
                logger.warning("⚠️ Redis not available - WebSocket running in standalone mode")
        except Exception as e:
            logger.error(f"❌ Redis initialization failed: {e}")
            # Continue without Redis - standalone mode
    
    async def _handle_redis_message(self, channel: str, message: str):
        """Handle Redis pub/sub message"""
        try:
            data = json.loads(message)
            user_id = uuid.UUID(data.get("user_id"))
            await self.send_personal_message(message, user_id)
        except Exception as e:
            logger.error(f"Failed to handle Redis message: {e}")
    
    async def _handle_redis_typing(self, channel: str, message: str):
        """Handle Redis typing indicator"""
        try:
            data = json.loads(message)
            user_id = uuid.UUID(data.get("user_id"))
            await self.send_personal_message(message, user_id)
        except Exception as e:
            logger.error(f"Failed to handle Redis typing: {e}")
    
    async def _handle_redis_read_receipt(self, channel: str, message: str):
        """Handle Redis read receipt"""
        try:
            data = json.loads(message)
            user_id = uuid.UUID(data.get("user_id"))
            await self.send_personal_message(message, user_id)
        except Exception as e:
            logger.error(f"Failed to handle Redis read receipt: {e}")
    
    async def connect(self, websocket: WebSocket, user_id: uuid.UUID):
        """Accept WebSocket connection and register user."""
        await websocket.accept()
        
        if user_id not in self.active_connections:
            self.active_connections[user_id] = set()
        
        self.active_connections[user_id].add(websocket)
        logger.info(f"User {user_id} connected via WebSocket")
        
        # Add to Redis session tracking
        await redis_client.add_websocket_session(str(user_id), str(websocket))
        
        # Record performance metrics
        performance_monitor.record_websocket_connection(user_id)
        
        # Send backfill of recent messages if needed
        await self._send_backfill(websocket, user_id)
    
    async def disconnect(self, websocket: WebSocket, user_id: uuid.UUID):
        """Remove WebSocket connection and cleanup."""
        if user_id in self.active_connections:
            self.active_connections[user_id].discard(websocket)
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]
        
        logger.info(f"User {user_id} disconnected from WebSocket")
        
        # Remove from Redis session tracking
        await redis_client.remove_websocket_session(str(user_id), str(websocket))
        
        # Record performance metrics
        performance_monitor.record_websocket_disconnection(user_id)
    
    async def send_personal_message(self, message: str, user_id: uuid.UUID):
        """Send message to specific user's connections."""
        if user_id in self.active_connections:
            connections_to_remove = set()
            
            for connection in self.active_connections[user_id]:
                try:
                    await connection.send_text(message)
                except Exception as e:
                    logger.warning(f"Failed to send message to user {user_id}: {e}")
                    connections_to_remove.add(connection)
            
            # Remove failed connections
            for conn in connections_to_remove:
                self.active_connections[user_id].discard(conn)
            
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]
    
    async def send_to_conversation_participants(
        self, 
        message: str, 
        participant_ids: Set[uuid.UUID],
        exclude_user_id: Optional[uuid.UUID] = None
    ):
        """Send message to all participants in a conversation."""
        for user_id in participant_ids:
            if exclude_user_id and user_id == exclude_user_id:
                continue
            await self.send_personal_message(message, user_id)
    
    async def broadcast_new_message(
        self, 
        message_response: MessageResponse, 
        participant_ids: Set[uuid.UUID]
    ):
        """Broadcast new message to conversation participants."""
        try:
            notification = NewMessageNotification(
                type="new_message",
                message=message_response
            )
            message_json = notification.model_dump_json()
            
            await self.send_to_conversation_participants(
                message_json, 
                participant_ids,
                exclude_user_id=message_response.sender_id
            )
            
            # Also publish to Redis for other instances
            if self.redis_client:
                message_data = message_response.model_dump()
                await self.redis_client.publish(
                    "dm_messages", 
                    json.dumps({
                        "type": "new_message",
                        "data": message_data,
                        "participant_ids": [str(uid) for uid in participant_ids]
                    })
                )
        
        except Exception as e:
            logger.error(f"Failed to broadcast new message: {e}")
    
    async def broadcast_typing_indicator(
        self,
        conversation_id: uuid.UUID,
        user_id: uuid.UUID,
        is_typing: bool,
        participant_ids: Set[uuid.UUID]
    ):
        """Broadcast typing indicator to conversation participants."""
        try:
            typing_msg = TypingIndicatorMessage(
                type="typing",
                conversation_id=conversation_id,
                user_id=user_id,
                is_typing=is_typing
            )
            message_json = typing_msg.model_dump_json()
            
            await self.send_to_conversation_participants(
                message_json, 
                participant_ids,
                exclude_user_id=user_id
            )
            
            # Publish to Redis
            if self.redis_client:
                await self.redis_client.publish(
                    "dm_typing",
                    json.dumps({
                        "type": "typing",
                        "conversation_id": str(conversation_id),
                        "user_id": str(user_id),
                        "is_typing": is_typing,
                        "participant_ids": [str(uid) for uid in participant_ids]
                    })
                )
        
        except Exception as e:
            logger.error(f"Failed to broadcast typing indicator: {e}")
    
    async def broadcast_read_receipt(
        self,
        conversation_id: uuid.UUID,
        user_id: uuid.UUID,
        message_id: uuid.UUID,
        participant_ids: Set[uuid.UUID]
    ):
        """Broadcast read receipt to conversation participants."""
        try:
            read_msg = MessageReadNotification(
                type="message_read",
                conversation_id=conversation_id,
                user_id=user_id,
                message_id=message_id,
                read_at=datetime.now(timezone.utc)
            )
            message_json = read_msg.model_dump_json()
            
            await self.send_to_conversation_participants(
                message_json,
                participant_ids,
                exclude_user_id=user_id
            )
            
            # Publish to Redis
            if self.redis_client:
                await self.redis_client.publish(
                    "dm_read_receipts",
                    json.dumps({
                        "type": "message_read",
                        "conversation_id": str(conversation_id),
                        "user_id": str(user_id),
                        "message_id": str(message_id),
                        "read_at": datetime.now(timezone.utc).isoformat(),
                        "participant_ids": [str(uid) for uid in participant_ids]
                    })
                )
        
        except Exception as e:
            logger.error(f"Failed to broadcast read receipt: {e}")
    
    async def _send_backfill(self, websocket: WebSocket, user_id: uuid.UUID):
        """Send recent messages/notifications to newly connected user."""
        try:
            # This would typically fetch recent unread messages
            # For now, just send a connection confirmation
            welcome_msg = {
                "type": "connection_established",
                "user_id": str(user_id),
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
            await websocket.send_text(json.dumps(welcome_msg))
        
        except Exception as e:
            logger.error(f"Failed to send backfill to user {user_id}: {e}")
    
    async def handle_redis_messages(self):
        """Handle incoming Redis pub/sub messages."""
        if not self.pubsub:
            return
        
        try:
            async for message in self.pubsub.listen():
                if message["type"] == "message":
                    await self._process_redis_message(message)
        except Exception as e:
            logger.error(f"Error handling Redis messages: {e}")
    
    async def _process_redis_message(self, redis_message: dict):
        """Process incoming Redis pub/sub message."""
        try:
            channel = redis_message["channel"]
            data = json.loads(redis_message["data"])
            
            if channel == "dm_messages" and data["type"] == "new_message":
                participant_ids = {uuid.UUID(uid) for uid in data["participant_ids"]}
                message_data = data["data"]
                
                # Reconstruct MessageResponse from dict
                message_response = MessageResponse(**message_data)
                
                notification = NewMessageNotification(
                    type="new_message",
                    message=message_response
                )
                message_json = notification.model_dump_json()
                
                await self.send_to_conversation_participants(
                    message_json,
                    participant_ids,
                    exclude_user_id=message_response.sender_id
                )
            
            elif channel == "dm_typing" and data["type"] == "typing":
                participant_ids = {uuid.UUID(uid) for uid in data["participant_ids"]}
                
                typing_msg = TypingIndicatorMessage(
                    type="typing",
                    conversation_id=uuid.UUID(data["conversation_id"]),
                    user_id=uuid.UUID(data["user_id"]),
                    is_typing=data["is_typing"]
                )
                message_json = typing_msg.model_dump_json()
                
                await self.send_to_conversation_participants(
                    message_json,
                    participant_ids,
                    exclude_user_id=uuid.UUID(data["user_id"])
                )
            
            elif channel == "dm_read_receipts" and data["type"] == "message_read":
                participant_ids = {uuid.UUID(uid) for uid in data["participant_ids"]}
                
                read_msg = MessageReadNotification(
                    type="message_read",
                    conversation_id=uuid.UUID(data["conversation_id"]),
                    user_id=uuid.UUID(data["user_id"]),
                    message_id=uuid.UUID(data["message_id"]),
                    read_at=datetime.fromisoformat(data["read_at"].replace('Z', '+00:00'))
                )
                message_json = read_msg.model_dump_json()
                
                await self.send_to_conversation_participants(
                    message_json,
                    participant_ids,
                    exclude_user_id=uuid.UUID(data["user_id"])
                )
        
        except Exception as e:
            logger.error(f"Error processing Redis message: {e}")
    
    def get_online_users(self) -> Set[uuid.UUID]:
        """Get set of currently connected user IDs."""
        return set(self.active_connections.keys())
    
    async def close(self):
        """Close Redis connections."""
        try:
            if hasattr(self, 'redis_client') and self.redis_client and hasattr(self.redis_client, 'close'):
                await self.redis_client.close()
            logger.info("WebSocket manager connections closed successfully")
        except Exception as e:
            logger.warning(f"Error closing WebSocket manager connections: {e}")


# Global connection manager
connection_manager = ConnectionManager()


async def authenticate_websocket(websocket: WebSocket) -> Optional[uuid.UUID]:
    """Authenticate WebSocket connection using JWT token."""
    try:
        # Try to get token from query params or headers
        token = None
        
        # Check query parameters first
        if "token" in websocket.query_params:
            token = websocket.query_params["token"]
        
        # Check Authorization header
        if not token and "authorization" in websocket.headers:
            auth_header = websocket.headers["authorization"]
            if auth_header.startswith("Bearer "):
                token = auth_header[7:]
        
        if not token:
            await websocket.close(code=4001, reason="No authentication token provided")
            return None
        
        # Verify token
        payload = verify_jwt_token(token)
        user_id_str = payload.get("sub")
        
        if not user_id_str:
            await websocket.close(code=4001, reason="Invalid token payload")
            return None
        
        return uuid.UUID(user_id_str)
    
    except Exception as e:
        logger.error(f"WebSocket authentication failed: {e}")
        await websocket.close(code=4001, reason="Authentication failed")
        return None