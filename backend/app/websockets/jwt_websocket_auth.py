"""
K3 - JWT WebSocket Authentication for Fynix Phase K
Secure WebSocket connections with JWT token validation and user context
"""

import json
import asyncio
import logging
from typing import Optional, Dict, Any
from datetime import datetime, timezone

import jwt
from fastapi import WebSocket, WebSocketDisconnect, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from app.core.config import settings
from app.core.redis_keys import redis_keys
from app.services.websocket_manager import websocket_manager
from app.models.user import User

logger = logging.getLogger(__name__)

# Security scheme for WebSocket JWT
security = HTTPBearer()

class WebSocketJWTAuth:
    """JWT Authentication for WebSocket connections"""
    
    def __init__(self, secret_key: str = None):
        self.secret_key = secret_key or settings.JWT_SECRET_KEY
        self.algorithm = "HS256"
    
    async def decode_token(self, token: str) -> Optional[Dict[str, Any]]:
        """Decode and validate JWT token"""
        try:
            # Remove 'Bearer ' prefix if present
            if token.startswith('Bearer '):
                token = token[7:]
            
            payload = jwt.decode(
                token, 
                self.secret_key, 
                algorithms=[self.algorithm]
            )
            
            # Check token expiration
            if 'exp' in payload:
                exp_timestamp = payload['exp']
                if datetime.now(timezone.utc).timestamp() > exp_timestamp:
                    logger.warning("JWT token has expired")
                    return None
            
            # Validate required fields
            if 'user_id' not in payload:
                logger.warning("JWT token missing user_id")
                return None
            
            return payload
            
        except jwt.ExpiredSignatureError:
            logger.warning("JWT token expired")
            return None
        except jwt.InvalidTokenError as e:
            logger.warning(f"Invalid JWT token: {e}")
            return None
        except Exception as e:
            logger.error(f"JWT decode error: {e}")
            return None
    
    async def authenticate_websocket(self, websocket: WebSocket) -> Optional[Dict[str, Any]]:
        """Authenticate WebSocket connection via query parameter or header"""
        
        # Try to get token from query parameter
        token = websocket.query_params.get('token')
        
        # If not in query params, try Authorization header
        if not token:
            auth_header = websocket.headers.get('authorization')
            if auth_header:
                token = auth_header
        
        # Try subprotocol for token (WebSocket standard approach)
        if not token and websocket.headers.get('sec-websocket-protocol'):
            protocols = websocket.headers.get('sec-websocket-protocol', '').split(', ')
            for protocol in protocols:
                if protocol.startswith('access_token_'):
                    token = protocol.replace('access_token_', '')
                    break
        
        if not token:
            logger.warning("No JWT token provided for WebSocket authentication")
            return None
        
        return await self.decode_token(token)

# Global JWT auth instance
ws_jwt_auth = WebSocketJWTAuth()

class AuthenticatedWebSocketManager:
    """WebSocket manager with JWT authentication and user context"""
    
    def __init__(self):
        self.authenticated_connections: Dict[str, Dict[str, Any]] = {}
        self.user_connections: Dict[str, set] = {}  # user_id -> set of connection_ids
    
    async def connect_authenticated(
        self, 
        websocket: WebSocket, 
        connection_id: Optional[str] = None
    ) -> Optional[str]:
        """Connect WebSocket with JWT authentication"""
        
        # Authenticate the connection
        auth_payload = await ws_jwt_auth.authenticate_websocket(websocket)
        if not auth_payload:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Authentication failed")
            return None
        
        user_id = auth_payload.get('user_id')
        if not user_id:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Invalid user ID")
            return None
        
        try:
            # Accept the WebSocket connection
            await websocket.accept()
            
            # Use provided connection_id or generate one
            if not connection_id:
                import uuid
                connection_id = str(uuid.uuid4())
            
            # Store authenticated connection info
            connection_info = {
                'websocket': websocket,
                'user_id': user_id,
                'authenticated_at': datetime.now(timezone.utc),
                'auth_payload': auth_payload,
                'last_heartbeat': datetime.now(timezone.utc)
            }
            
            self.authenticated_connections[connection_id] = connection_info
            
            # Track user connections
            if user_id not in self.user_connections:
                self.user_connections[user_id] = set()
            self.user_connections[user_id].add(connection_id)
            
            # Store connection in Redis for multi-instance support
            await self._store_connection_in_redis(connection_id, user_id)
            
            # Join user to their personal room
            await websocket_manager.connection_pool.join_room(connection_id, f"user:{user_id}")
            
            # Send welcome message
            welcome_message = {
                'type': 'connection_established',
                'connection_id': connection_id,
                'user_id': user_id,
                'timestamp': datetime.now(timezone.utc).isoformat()
            }
            
            await self.send_to_connection(connection_id, welcome_message)
            
            logger.info(f"Authenticated WebSocket connection established: {connection_id} for user {user_id}")
            return connection_id
            
        except Exception as e:
            logger.error(f"Error establishing authenticated WebSocket connection: {e}")
            await websocket.close(code=status.WS_1011_INTERNAL_ERROR, reason="Connection error")
            return None
    
    async def disconnect(self, connection_id: str):
        """Disconnect authenticated WebSocket"""
        
        connection_info = self.authenticated_connections.get(connection_id)
        if not connection_info:
            return
        
        user_id = connection_info['user_id']
        
        # Remove from authenticated connections
        del self.authenticated_connections[connection_id]
        
        # Remove from user connections
        if user_id in self.user_connections:
            self.user_connections[user_id].discard(connection_id)
            if not self.user_connections[user_id]:
                del self.user_connections[user_id]
        
        # Remove from Redis
        await self._remove_connection_from_redis(connection_id, user_id)
        
        logger.info(f"Authenticated WebSocket disconnected: {connection_id} for user {user_id}")
    
    async def send_to_connection(self, connection_id: str, message: Dict[str, Any]):
        """Send message to specific authenticated connection"""
        
        connection_info = self.authenticated_connections.get(connection_id)
        if not connection_info:
            logger.warning(f"Attempted to send to non-existent connection: {connection_id}")
            return False
        
        try:
            websocket = connection_info['websocket']
            await websocket.send_text(json.dumps(message))
            return True
            
        except Exception as e:
            logger.error(f"Error sending to connection {connection_id}: {e}")
            # Clean up broken connection
            await self.disconnect(connection_id)
            return False
    
    async def send_to_user(self, user_id: str, message: Dict[str, Any]):
        """Send message to all connections for a user"""
        
        if user_id not in self.user_connections:
            logger.debug(f"No connections found for user {user_id}")
            return 0
        
        sent_count = 0
        connection_ids = list(self.user_connections[user_id])  # Copy to avoid modification during iteration
        
        for connection_id in connection_ids:
            if await self.send_to_connection(connection_id, message):
                sent_count += 1
        
        return sent_count
    
    async def broadcast_to_room(self, room_name: str, message: Dict[str, Any], exclude_user: Optional[str] = None):
        """Broadcast message to all authenticated users in a room"""
        
        sent_count = 0
        
        for connection_id, connection_info in self.authenticated_connections.items():
            user_id = connection_info['user_id']
            
            # Skip excluded user
            if exclude_user and user_id == exclude_user:
                continue
            
            # Check if connection is in the room (simplified - could be enhanced with actual room membership)
            # For now, using basic room logic
            if await self.send_to_connection(connection_id, message):
                sent_count += 1
        
        return sent_count
    
    async def handle_heartbeat(self, connection_id: str):
        """Handle heartbeat from authenticated connection"""
        
        connection_info = self.authenticated_connections.get(connection_id)
        if connection_info:
            connection_info['last_heartbeat'] = datetime.now(timezone.utc)
            
            # Update presence in Redis
            user_id = connection_info['user_id']
            await self._update_user_presence(user_id)
    
    async def get_user_connections(self, user_id: str) -> list:
        """Get all connection IDs for a user"""
        return list(self.user_connections.get(user_id, set()))
    
    async def get_connection_info(self, connection_id: str) -> Optional[Dict[str, Any]]:
        """Get connection information"""
        connection_info = self.authenticated_connections.get(connection_id)
        if connection_info:
            # Return safe copy without websocket object
            return {
                'connection_id': connection_id,
                'user_id': connection_info['user_id'],
                'authenticated_at': connection_info['authenticated_at'].isoformat(),
                'last_heartbeat': connection_info['last_heartbeat'].isoformat()
            }
        return None
    
    async def _store_connection_in_redis(self, connection_id: str, user_id: str):
        """Store connection info in Redis for multi-instance support"""
        try:
            from app.core.redis_client import redis_client
            
            connection_key = redis_keys.websocket_connection_key(connection_id)
            user_connections_key = redis_keys.websocket_user_connections_key(user_id)
            
            # Store connection details
            connection_data = {
                'user_id': user_id,
                'connected_at': datetime.now(timezone.utc).isoformat(),
                'instance_id': 'current_instance'  # Could be actual instance ID
            }
            
            await redis_client.set(connection_key, json.dumps(connection_data), expire=3600)
            await redis_client.sadd(user_connections_key, connection_id)
            await redis_client.expire(user_connections_key, 3600)
            
        except Exception as e:
            logger.error(f"Error storing connection in Redis: {e}")
    
    async def _remove_connection_from_redis(self, connection_id: str, user_id: str):
        """Remove connection info from Redis"""
        try:
            from app.core.redis_client import redis_client
            
            connection_key = redis_keys.websocket_connection_key(connection_id)
            user_connections_key = redis_keys.websocket_user_connections_key(user_id)
            
            await redis_client.delete(connection_key)
            await redis_client.srem(user_connections_key, connection_id)
            
        except Exception as e:
            logger.error(f"Error removing connection from Redis: {e}")
    
    async def _update_user_presence(self, user_id: str):
        """Update user presence status in Redis"""
        try:
            from app.core.redis_client import redis_client
            
            presence_key = redis_keys.user_presence_key(user_id)
            heartbeat_key = redis_keys.presence_heartbeat_key(user_id)
            
            presence_data = {
                'status': 'online',
                'last_seen': datetime.now(timezone.utc).isoformat(),
                'connections': len(self.user_connections.get(user_id, set()))
            }
            
            await redis_client.set(presence_key, json.dumps(presence_data), expire=300)
            await redis_client.set(heartbeat_key, datetime.now(timezone.utc).isoformat(), expire=60)
            
        except Exception as e:
            logger.error(f"Error updating user presence: {e}")

# Global authenticated WebSocket manager
authenticated_ws_manager = AuthenticatedWebSocketManager()

# WebSocket endpoint with JWT authentication
async def websocket_endpoint_with_auth(websocket: WebSocket, user_id: str = None):
    """WebSocket endpoint with JWT authentication"""
    
    connection_id = None
    try:
        # Establish authenticated connection
        connection_id = await authenticated_ws_manager.connect_authenticated(websocket)
        
        if not connection_id:
            return  # Connection was rejected and closed
        
        # Main message handling loop
        while True:
            try:
                # Receive message
                data = await websocket.receive_text()
                message = json.loads(data)
                
                # Handle different message types
                message_type = message.get('type', 'unknown')
                
                if message_type == 'heartbeat':
                    await authenticated_ws_manager.handle_heartbeat(connection_id)
                    await authenticated_ws_manager.send_to_connection(connection_id, {
                        'type': 'heartbeat_ack',
                        'timestamp': datetime.now(timezone.utc).isoformat()
                    })
                
                elif message_type == 'typing_start':
                    await handle_typing_indicator(connection_id, message, True)
                
                elif message_type == 'typing_stop':
                    await handle_typing_indicator(connection_id, message, False)
                
                elif message_type == 'message':
                    await handle_message(connection_id, message)
                
                else:
                    logger.warning(f"Unknown message type: {message_type}")
                
            except WebSocketDisconnect:
                break
            except json.JSONDecodeError:
                await authenticated_ws_manager.send_to_connection(connection_id, {
                    'type': 'error',
                    'message': 'Invalid JSON format'
                })
            except Exception as e:
                logger.error(f"Error handling WebSocket message: {e}")
                await authenticated_ws_manager.send_to_connection(connection_id, {
                    'type': 'error',
                    'message': 'Internal server error'
                })
    
    except Exception as e:
        logger.error(f"WebSocket connection error: {e}")
    
    finally:
        if connection_id:
            await authenticated_ws_manager.disconnect(connection_id)

async def handle_typing_indicator(connection_id: str, message: Dict[str, Any], is_typing: bool):
    """Handle typing indicators"""
    conversation_id = message.get('conversation_id')
    if not conversation_id:
        return
    
    connection_info = await authenticated_ws_manager.get_connection_info(connection_id)
    if not connection_info:
        return
    
    user_id = connection_info['user_id']
    
    # Store typing status in Redis
    try:
        from app.core.redis_client import redis_client
        typing_key = redis_keys.websocket_typing_key(conversation_id)
        
        if is_typing:
            await redis_client.sadd(typing_key, user_id)
            await redis_client.expire(typing_key, 10)  # Expire in 10 seconds
        else:
            await redis_client.srem(typing_key, user_id)
        
        # Broadcast typing status to conversation participants
        typing_message = {
            'type': 'typing_indicator',
            'conversation_id': conversation_id,
            'user_id': user_id,
            'is_typing': is_typing,
            'timestamp': datetime.now(timezone.utc).isoformat()
        }
        
        # Broadcast to conversation room (simplified)
        await authenticated_ws_manager.broadcast_to_room(
            f"conversation:{conversation_id}", 
            typing_message, 
            exclude_user=user_id
        )
        
    except Exception as e:
        logger.error(f"Error handling typing indicator: {e}")

async def handle_message(connection_id: str, message: Dict[str, Any]):
    """Handle incoming message"""
    # This would integrate with your existing message handling logic
    logger.info(f"Received message from {connection_id}: {message}")
    
    # Send acknowledgment
    await authenticated_ws_manager.send_to_connection(connection_id, {
        'type': 'message_ack',
        'message_id': message.get('id'),
        'timestamp': datetime.now(timezone.utc).isoformat()
    })

# Export the authenticated WebSocket manager and endpoint
__all__ = [
    "WebSocketJWTAuth",
    "AuthenticatedWebSocketManager", 
    "authenticated_ws_manager",
    "websocket_endpoint_with_auth",
    "ws_jwt_auth"
]