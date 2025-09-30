"""
K3 - JWT WebSocket Authentication for Fynix Phase K (Fixed)
Provides JWT authentication for WebSocket connections with Redis coordination
"""

import json
import logging
from datetime import UTC, datetime, timedelta
from typing import Any

from fastapi import WebSocket, WebSocketDisconnect
from jose import JWTError, jwt

# Import core components
from app.core.config import settings
from app.core.redis_client import redis_client
from app.core.redis_keys import RedisKeyManager, RedisKeyspace
from app.websockets.advanced_websocket_manager import advanced_websocket_manager

logger = logging.getLogger(__name__)

class WebSocketJWTAuth:
    """JWT authentication handler for WebSocket connections"""
    
    def __init__(self, secret_key: str | None = None):
        self.secret_key = secret_key or settings.JWT_SECRET_KEY
        self.algorithm = "HS256"
        self.redis_key_manager = RedisKeyManager()
    
    def create_access_token(self, data: dict[str, Any], expires_delta: timedelta | None = None) -> str:
        """Create JWT access token"""
        to_encode = data.copy()
        
        if expires_delta:
            expire = datetime.now(UTC) + expires_delta
        else:
            expire = datetime.now(UTC) + timedelta(minutes=settings.JWT_EXPIRE_MINUTES)
        
        to_encode.update({"exp": expire})
        encoded_jwt = jwt.encode(to_encode, self.secret_key, algorithm=self.algorithm)
        return encoded_jwt
    
    def verify_token(self, token: str) -> dict[str, Any] | None:
        """Verify JWT token and return payload"""
        try:
            payload = jwt.decode(token, self.secret_key, algorithms=[self.algorithm])
            return payload
        except JWTError as e:
            logger.warning(f"JWT verification failed: {e}")
            return None
    
    async def authenticate_websocket(self, websocket: WebSocket, token: str | None = None) -> dict[str, Any] | None:
        """Authenticate WebSocket connection using JWT token"""
        try:
            if not token:
                # Try to get token from query params
                token = websocket.query_params.get("token")
            
            if not token:
                # Try to get from headers (Authorization: Bearer <token>)
                auth_header = websocket.headers.get("authorization")
                if auth_header and auth_header.startswith("Bearer "):
                    token = auth_header[7:]
            
            if not token:
                logger.warning("No JWT token provided for WebSocket authentication")
                return None
            
            # Verify the token
            payload = self.verify_token(token)
            if not payload:
                logger.warning("Invalid JWT token for WebSocket authentication")
                return None
            
            # Extract user info
            user_id = payload.get("user_id")
            username = payload.get("username")
            
            if not user_id:
                logger.warning("JWT token missing user_id")
                return None
            
            return {
                "user_id": str(user_id),
                "username": username,
                "token": token,
                "payload": payload
            }
        
        except Exception as e:
            logger.error(f"WebSocket authentication error: {e}")
            return None

class AuthenticatedWebSocketManager:
    """WebSocket manager with JWT authentication and Redis coordination"""
    
    def __init__(self):
        self.auth_handler = WebSocketJWTAuth()
        self.active_connections: dict[str, dict[str, Any]] = {}
        self.user_connections: dict[str, set[str]] = {}
        self.redis_key_manager = RedisKeyManager()
    
    async def connect(self, websocket: WebSocket, user_auth: dict[str, Any]) -> str:
        """Accept WebSocket connection with authentication"""
        try:
            await websocket.accept()
            
            connection_id = f"ws_{user_auth['user_id']}_{datetime.now().timestamp()}"
            user_id = user_auth["user_id"]
            
            # Store connection info
            self.active_connections[connection_id] = {
                "websocket": websocket,
                "user_id": user_id,
                "username": user_auth.get("username"),
                "connected_at": datetime.now(UTC).isoformat(),
                "last_seen": datetime.now(UTC).isoformat()
            }
            
            # Track user connections
            if user_id not in self.user_connections:
                self.user_connections[user_id] = set()
            self.user_connections[user_id].add(connection_id)
            
            # Store in Redis for multi-instance coordination
            await self._store_connection_in_redis(connection_id, user_auth)
            
            # Join user to their room for targeted messaging
            try:
                if hasattr(advanced_websocket_manager, 'connection_pool'):
                    await advanced_websocket_manager.connection_pool.join_room(connection_id, f"user:{user_id}")
            except Exception as e:
                logger.warning(f"Could not join WebSocket room: {e}")
            
            logger.info(f"✅ Authenticated WebSocket connection: {connection_id} for user {user_id}")
            return connection_id
        
        except Exception as e:
            logger.error(f"WebSocket connection failed: {e}")
            raise
    
    async def disconnect(self, connection_id: str):
        """Handle WebSocket disconnection"""
        try:
            if connection_id in self.active_connections:
                connection_info = self.active_connections[connection_id]
                user_id = connection_info["user_id"]
                
                # Remove from active connections
                del self.active_connections[connection_id]
                
                # Remove from user connections
                if user_id in self.user_connections:
                    self.user_connections[user_id].discard(connection_id)
                    if not self.user_connections[user_id]:
                        del self.user_connections[user_id]
                
                # Remove from Redis
                await self._remove_connection_from_redis(connection_id, user_id)
                
                logger.info(f"✅ WebSocket disconnected: {connection_id} for user {user_id}")
        
        except Exception as e:
            logger.error(f"WebSocket disconnection error: {e}")
    
    async def send_personal_message(self, user_id: str, message: dict[str, Any]):
        """Send message to all connections of a specific user"""
        sent_count = 0
        
        if user_id in self.user_connections:
            for connection_id in self.user_connections[user_id].copy():
                if connection_id in self.active_connections:
                    try:
                        websocket = self.active_connections[connection_id]["websocket"]
                        await websocket.send_text(json.dumps(message))
                        sent_count += 1
                    except Exception as e:
                        logger.warning(f"Failed to send message to {connection_id}: {e}")
                        await self.disconnect(connection_id)
        
        return sent_count
    
    async def broadcast_to_room(self, room: str, message: dict[str, Any]):
        """Broadcast message to all connections in a room"""
        # For now, broadcast to all connections
        # In a full implementation, this would use room membership
        sent_count = 0
        
        for connection_id, connection_info in self.active_connections.items():
            try:
                websocket = connection_info["websocket"]
                await websocket.send_text(json.dumps(message))
                sent_count += 1
            except Exception as e:
                logger.warning(f"Failed to broadcast to {connection_id}: {e}")
                await self.disconnect(connection_id)
        
        return sent_count
    
    async def _store_connection_in_redis(self, connection_id: str, user_auth: dict[str, Any]):
        """Store connection info in Redis for multi-instance coordination"""
        try:
            connection_key = self.redis_key_manager.build_key(RedisKeyspace.WEBSOCKETS, connection_id)
            user_id = user_auth["user_id"]
            
            connection_data = {
                "user_id": user_id,
                "username": user_auth.get("username"),
                "connected_at": datetime.now(UTC).isoformat(),
                "instance": settings.APP_NAME or "fynix"
            }
            
            # Store connection data with TTL
            await redis_client.set(connection_key, json.dumps(connection_data), ttl=3600)
            
            # Store user connection mapping (simplified without sadd)
            user_connections_key = self.redis_key_manager.build_key(RedisKeyspace.USERS, user_id, "connections", connection_id)
            await redis_client.set(user_connections_key, "1", ttl=3600)
            
        except Exception as e:
            logger.warning(f"Failed to store connection in Redis: {e}")
    
    async def _remove_connection_from_redis(self, connection_id: str, user_id: str):
        """Remove connection info from Redis"""
        try:
            # Since our redis client doesn't have delete method, we'll set with very short TTL
            connection_key = self.redis_key_manager.build_key(RedisKeyspace.WEBSOCKETS, connection_id)
            user_connections_key = self.redis_key_manager.build_key(RedisKeyspace.USERS, user_id, "connections", connection_id)
            
            # Set with 1 second TTL to effectively delete
            await redis_client.set(connection_key, "deleted", ttl=1)
            await redis_client.set(user_connections_key, "deleted", ttl=1)
            
        except Exception as e:
            logger.warning(f"Failed to remove connection from Redis: {e}")
    
    async def get_user_presence(self, user_id: str) -> dict[str, Any]:
        """Get user presence information"""
        presence_key = self.redis_key_manager.build_key(RedisKeyspace.PRESENCE, user_id)
        
        try:
            presence_data = await redis_client.get(presence_key)
            if presence_data:
                return json.loads(presence_data)
        except Exception as e:
            logger.warning(f"Failed to get user presence: {e}")
        
        # Default presence
        return {
            "user_id": user_id,
            "status": "offline",
            "last_seen": None
        }
    
    async def update_user_presence(self, user_id: str, status: str = "online"):
        """Update user presence status"""
        try:
            presence_key = self.redis_key_manager.build_key(RedisKeyspace.PRESENCE, user_id)
            heartbeat_key = self.redis_key_manager.build_key(RedisKeyspace.PRESENCE, user_id, "heartbeat")
            
            presence_data = {
                "user_id": user_id,
                "status": status,
                "last_seen": datetime.now(UTC).isoformat(),
                "instance": settings.APP_NAME or "fynix"
            }
            
            # Store presence with TTL
            await redis_client.set(presence_key, json.dumps(presence_data), ttl=300)  # 5 minutes
            await redis_client.set(heartbeat_key, datetime.now(UTC).isoformat(), ttl=60)  # 1 minute heartbeat
            
        except Exception as e:
            logger.warning(f"Failed to update user presence: {e}")

# FastAPI WebSocket endpoint with JWT authentication
async def websocket_endpoint_with_auth(websocket: WebSocket, user_id: str | None = None):
    """WebSocket endpoint with JWT authentication"""
    auth_manager = AuthenticatedWebSocketManager()
    connection_id = None
    user_auth = None
    
    try:
        # Authenticate the connection
        user_auth = await auth_manager.auth_handler.authenticate_websocket(websocket, None)
        
        if not user_auth:
            await websocket.close(code=1008, reason="Authentication failed")
            return
        
        # Connect the authenticated user
        connection_id = await auth_manager.connect(websocket, user_auth)
        
        # Update presence
        await auth_manager.update_user_presence(user_auth["user_id"], "online")
        
        # Listen for messages
        try:
            while True:
                data = await websocket.receive_text()
                message = json.loads(data)
                
                # Handle different message types
                if message.get("type") == "ping":
                    await websocket.send_text(json.dumps({"type": "pong"}))
                    
                elif message.get("type") == "typing":
                    await handle_typing_indicator(user_auth["user_id"], message.get("room"), True)
                    
                elif message.get("type") == "stop_typing":
                    await handle_typing_indicator(user_auth["user_id"], message.get("room"), False)
                    
                else:
                    # Echo message back for now
                    response = {
                        "type": "message",
                        "from": user_auth["username"] or user_auth["user_id"],
                        "data": message
                    }
                    await websocket.send_text(json.dumps(response))
        
        except WebSocketDisconnect:
            logger.info(f"WebSocket disconnected: {connection_id}")
        
        except Exception as e:
            logger.error(f"WebSocket error: {e}")
            await websocket.close(code=1011, reason="Internal server error")
    
    finally:
        if connection_id:
            await auth_manager.disconnect(connection_id)
        
        if user_auth:
            await auth_manager.update_user_presence(user_auth["user_id"], "offline")

# Typing indicator functionality
async def handle_typing_indicator(user_id: str, room: str, is_typing: bool):
    """Handle typing indicator events"""
    try:
        typing_key = f"typing:{room}"
        
        if is_typing:
            # Add user to typing set (simplified - just store with TTL)
            await redis_client.set(f"{typing_key}:{user_id}", "1", ttl=10)  # 10 seconds TTL
        else:
            # Remove user from typing (set very short TTL)
            await redis_client.set(f"{typing_key}:{user_id}", "deleted", ttl=1)
        
        # Broadcast typing status to room
        # typing_message = {
        #     "type": "typing_indicator",
        #     "user_id": user_id,
        #     "room": room,
        #     "is_typing": is_typing
        # }
        
        # Broadcast to room (simplified implementation)
        logger.info(f"Typing indicator: {user_id} {'started' if is_typing else 'stopped'} typing in {room}")
    
    except Exception as e:
        logger.warning(f"Typing indicator error: {e}")

# Global instances
authenticated_websocket_manager = AuthenticatedWebSocketManager()
websocket_jwt_auth = WebSocketJWTAuth()

# Export main classes and functions
__all__ = [
    "WebSocketJWTAuth",
    "AuthenticatedWebSocketManager", 
    "websocket_endpoint_with_auth",
    "handle_typing_indicator",
    "authenticated_websocket_manager",
    "websocket_jwt_auth"
]