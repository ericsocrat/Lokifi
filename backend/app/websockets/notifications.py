# J6 Enterprise Notifications - WebSocket Real-time Delivery
import asyncio
import json
import logging
from typing import Dict, Set, Optional, Any, List
from datetime import datetime, timezone
from dataclasses import asdict
from uuid import UUID

from fastapi import WebSocket, WebSocketDisconnect, Depends, HTTPException
from fastapi.routing import APIRouter

# We'll handle auth differently - remove the problematic import for now
from app.models.user import User
from app.services.notification_service import notification_service, NotificationEvent
from app.models.notification_models import Notification

logger = logging.getLogger(__name__)

class NotificationWebSocketManager:
    """
    Enterprise WebSocket manager for real-time notification delivery
    
    Manages WebSocket connections for users and delivers notifications
    in real-time with connection management, error handling, and scalability.
    """
    
    def __init__(self):
        # Active connections: user_id -> set of websockets
        self.active_connections: Dict[str, Set[WebSocket]] = {}
        
        # Connection metadata
        self.connection_metadata: Dict[WebSocket, Dict[str, Any]] = {}
        
        # Connection statistics
        self.connection_stats = {
            "total_connections": 0,
            "active_users": 0,
            "messages_sent": 0,
            "connection_errors": 0
        }
        
        # Setup event handlers
        self._setup_notification_handlers()
    
    def _setup_notification_handlers(self):
        """Setup handlers for notification events"""
        notification_service.add_event_handler(
            NotificationEvent.CREATED,
            self._handle_notification_created
        )
        
        notification_service.add_event_handler(
            NotificationEvent.READ,
            self._handle_notification_read
        )
        
        notification_service.add_event_handler(
            NotificationEvent.DISMISSED,
            self._handle_notification_dismissed
        )
    
    async def connect(self, websocket: WebSocket, user: User) -> bool:
        """
        Connect a user's WebSocket
        
        Args:
            websocket: WebSocket connection
            user: Authenticated user
            
        Returns:
            True if connection successful
        """
        try:
            await websocket.accept()
            
            # Add to connections (convert UUID to string for dictionary key)
            user_id_str = str(user.id)
            if user_id_str not in self.active_connections:
                self.active_connections[user_id_str] = set()
            
            self.active_connections[user_id_str].add(websocket)
            
            # Store connection metadata
            self.connection_metadata[websocket] = {
                "user_id": user_id_str,
                "username": user.username,
                "connected_at": datetime.now(timezone.utc),
                "last_activity": datetime.now(timezone.utc)
            }
            
            # Update stats
            self.connection_stats["total_connections"] += 1
            self.connection_stats["active_users"] = len(self.active_connections)
            
            # Send connection confirmation
            await self._send_to_websocket(websocket, {
                "type": "connection_established",
                "data": {
                    "user_id": user.id,
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "features": ["real_time_notifications", "unread_count_updates", "notification_actions"]
                }
            })
            
            # Send initial unread count
            unread_count = await notification_service.get_unread_count(user.id)
            await self._send_to_websocket(websocket, {
                "type": "unread_count",
                "data": {
                    "count": unread_count,
                    "user_id": user.id,
                    "timestamp": datetime.now(timezone.utc).isoformat()
                }
            })
            
            logger.info(f"WebSocket connected for user {user.username} ({user.id})")
            return True
            
        except Exception as e:
            logger.error(f"Failed to connect WebSocket for user {user.id}: {e}")
            return False
    
    async def disconnect(self, websocket: WebSocket, user_id: str):
        """
        Disconnect a user's WebSocket
        
        Args:
            websocket: WebSocket connection to disconnect
            user_id: User ID
        """
        try:
            # Remove from connections
            if user_id in self.active_connections:
                self.active_connections[user_id].discard(websocket)
                
                # Remove user entry if no more connections
                if not self.active_connections[user_id]:
                    del self.active_connections[user_id]
            
            # Remove metadata
            if websocket in self.connection_metadata:
                metadata = self.connection_metadata[websocket]
                del self.connection_metadata[websocket]
                
                connection_duration = (
                    datetime.now(timezone.utc) - metadata["connected_at"]
                ).total_seconds()
                
                logger.info(f"WebSocket disconnected for user {metadata['username']} "
                           f"after {connection_duration:.1f}s")
            
            # Update stats
            self.connection_stats["active_users"] = len(self.active_connections)
            
        except Exception as e:
            logger.error(f"Error during WebSocket disconnect: {e}")
    
    async def send_to_user(self, user_id: str, message: Dict[str, Any]) -> int:
        """
        Send message to all of a user's active WebSocket connections
        
        Args:
            user_id: Target user ID
            message: Message to send
            
        Returns:
            Number of connections message was sent to
        """
        if user_id not in self.active_connections:
            return 0
        
        connections = list(self.active_connections[user_id])  # Copy to avoid modification during iteration
        sent_count = 0
        failed_connections = []
        
        for websocket in connections:
            try:
                await self._send_to_websocket(websocket, message)
                sent_count += 1
                
                # Update last activity
                if websocket in self.connection_metadata:
                    self.connection_metadata[websocket]["last_activity"] = datetime.now(timezone.utc)
                    
            except Exception as e:
                logger.warning(f"Failed to send message to WebSocket for user {user_id}: {e}")
                failed_connections.append(websocket)
                self.connection_stats["connection_errors"] += 1
        
        # Clean up failed connections
        for websocket in failed_connections:
            await self.disconnect(websocket, user_id)
        
        if sent_count > 0:
            self.connection_stats["messages_sent"] += 1
        
        return sent_count
    
    async def broadcast_to_all(self, message: Dict[str, Any]) -> int:
        """
        Broadcast message to all active connections
        
        Args:
            message: Message to broadcast
            
        Returns:
            Number of connections message was sent to
        """
        total_sent = 0
        
        for user_id in list(self.active_connections.keys()):
            sent = await self.send_to_user(user_id, message)
            total_sent += sent
        
        return total_sent
    
    async def _send_to_websocket(self, websocket: WebSocket, message: Dict[str, Any]):
        """Send message to a specific WebSocket connection"""
        try:
            message_json = json.dumps(message, default=str)
            await websocket.send_text(message_json)
        except Exception as e:
            logger.error(f"Failed to send WebSocket message: {e}")
            raise
    
    async def _handle_notification_created(self, notification: Notification):
        """Handle notification created event"""
        try:
            # Send real-time notification to user
            message = {
                "type": "notification_created",
                "data": notification.to_dict()
            }
            
            sent_count = await self.send_to_user(str(notification.user_id), message)
            
            # Also send updated unread count
            unread_count = await notification_service.get_unread_count(str(notification.user_id))
            unread_message = {
                "type": "unread_count",
                "data": {
                    "count": unread_count,
                    "user_id": notification.user_id,
                    "timestamp": datetime.now(timezone.utc).isoformat()
                }
            }
            
            await self.send_to_user(str(notification.user_id), unread_message)
            
            if sent_count > 0:
                logger.debug(f"Sent real-time notification to {sent_count} connections for user {notification.user_id}")
            
        except Exception as e:
            logger.error(f"Failed to handle notification created event: {e}")
    
    async def _handle_notification_read(self, data: Any):
        """Handle notification read event"""
        try:
            if isinstance(data, Notification):
                # Single notification read
                user_id = data.user_id
                message = {
                    "type": "notification_read",
                    "data": {
                        "notification_id": data.id,
                        "user_id": user_id,
                        "timestamp": datetime.now(timezone.utc).isoformat()
                    }
                }
            elif isinstance(data, dict) and data.get("batch"):
                # Batch read
                user_id = data["user_id"]
                message = {
                    "type": "notifications_read_batch",
                    "data": {
                        "count": data["count"],
                        "user_id": user_id,
                        "timestamp": datetime.now(timezone.utc).isoformat()
                    }
                }
            else:
                return
            
            await self.send_to_user(user_id, message)
            
            # Send updated unread count
            unread_count = await notification_service.get_unread_count(user_id)
            unread_message = {
                "type": "unread_count",
                "data": {
                    "count": unread_count,
                    "user_id": user_id,
                    "timestamp": datetime.now(timezone.utc).isoformat()
                }
            }
            
            await self.send_to_user(user_id, unread_message)
            
        except Exception as e:
            logger.error(f"Failed to handle notification read event: {e}")
    
    async def _handle_notification_dismissed(self, notification: Notification):
        """Handle notification dismissed event"""
        try:
            message = {
                "type": "notification_dismissed",
                "data": {
                    "notification_id": notification.id,
                    "user_id": notification.user_id,
                    "timestamp": datetime.now(timezone.utc).isoformat()
                }
            }
            
            await self.send_to_user(str(notification.user_id), message)
            
        except Exception as e:
            logger.error(f"Failed to handle notification dismissed event: {e}")
    
    def get_connection_stats(self) -> Dict[str, Any]:
        """Get WebSocket connection statistics"""
        return {
            **self.connection_stats,
            "active_connections": sum(len(connections) for connections in self.active_connections.values()),
            "users_with_connections": list(self.active_connections.keys()),
            "connection_details": [
                {
                    "user_id": metadata["user_id"],
                    "username": metadata["username"],
                    "connected_at": metadata["connected_at"].isoformat(),
                    "last_activity": metadata["last_activity"].isoformat(),
                    "connection_duration_seconds": (
                        datetime.now(timezone.utc) - metadata["connected_at"]
                    ).total_seconds()
                }
                for metadata in self.connection_metadata.values()
            ]
        }
    
    async def cleanup_stale_connections(self, timeout_seconds: int = 300):
        """Clean up stale WebSocket connections"""
        current_time = datetime.now(timezone.utc)
        stale_connections = []
        
        for websocket, metadata in self.connection_metadata.items():
            if (current_time - metadata["last_activity"]).total_seconds() > timeout_seconds:
                stale_connections.append((websocket, metadata["user_id"]))
        
        for websocket, user_id in stale_connections:
            await self.disconnect(websocket, user_id)
            logger.info(f"Cleaned up stale WebSocket connection for user {user_id}")
        
        return len(stale_connections)

# Global WebSocket manager instance
ws_manager = NotificationWebSocketManager()

# WebSocket router
websocket_router = APIRouter()

# Temporarily disabled - auth integration needs to be completed
"""
@websocket_router.websocket("/ws/notifications")
async def notification_websocket_endpoint(
    websocket: WebSocket,
    token: Optional[str] = None
):
    # WebSocket endpoint for real-time notifications
    # Supports authentication via query parameter or will prompt for token.
    # Provides real-time delivery of notifications, unread counts, and status updates.
    pass

@websocket_router.websocket("/ws/notifications/stats")
async def notification_stats_websocket(websocket: WebSocket):
    # WebSocket endpoint for real-time notification statistics (admin-only)
    pass
"""

# Export manager and router
__all__ = ["ws_manager", "websocket_router", "NotificationWebSocketManager"]