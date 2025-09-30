# Advanced WebSocket Manager for Phase K Track 3
"""
Production-ready WebSocket infrastructure with:
- Connection pooling and load balancing
- Real-time analytics and monitoring  
- Advanced notification broadcasting
- Failover and recovery mechanisms
- Performance optimization
"""

import asyncio
import json
import logging
import time
from typing import Dict, List, Set, Optional, Any
from datetime import datetime, timezone
from dataclasses import dataclass
from collections import defaultdict, deque
import uuid

from fastapi import WebSocket, WebSocketDisconnect
from fastapi.websockets import WebSocketState

from app.core.advanced_redis_client import advanced_redis_client
from app.services.notification_service import NotificationService

logger = logging.getLogger(__name__)

@dataclass
class ConnectionMetrics:
    """WebSocket connection metrics tracking"""
    connected_at: datetime
    last_activity: datetime
    messages_sent: int = 0
    messages_received: int = 0
    bytes_sent: int = 0
    bytes_received: int = 0
    connection_drops: int = 0
    reconnections: int = 0
    avg_response_time: float = 0.0
    
    def update_activity(self):
        self.last_activity = datetime.now(timezone.utc)
    
    def record_sent(self, bytes_count: int):
        self.messages_sent += 1
        self.bytes_sent += bytes_count
        self.update_activity()
    
    def record_received(self, bytes_count: int):
        self.messages_received += 1  
        self.bytes_received += bytes_count
        self.update_activity()

@dataclass  
class ConnectionInfo:
    """Enhanced connection information"""
    websocket: WebSocket
    user_id: str
    connection_id: str
    metrics: ConnectionMetrics
    rooms: Set[str]
    subscriptions: Set[str]
    client_info: Dict[str, Any]
    priority: int = 0  # For load balancing
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            'connection_id': self.connection_id,
            'user_id': self.user_id,
            'connected_at': self.metrics.connected_at.isoformat(),
            'last_activity': self.metrics.last_activity.isoformat(),
            'messages_sent': self.metrics.messages_sent,
            'messages_received': self.metrics.messages_received,
            'rooms': list(self.rooms),
            'subscriptions': list(self.subscriptions),
            'client_info': self.client_info
        }

class ConnectionPool:
    """Advanced WebSocket connection pool"""
    
    def __init__(self, max_connections: int = 10000):
        self.max_connections = max_connections
        self.connections: Dict[str, ConnectionInfo] = {}
        self.user_connections: Dict[str, Set[str]] = defaultdict(set)
        self.room_connections: Dict[str, Set[str]] = defaultdict(set)
        self.connection_queue = deque()
        self.stats = {
            'total_connections': 0,
            'peak_connections': 0,
            'connection_errors': 0,
            'messages_broadcasted': 0
        }
    
    async def add_connection(
        self, 
        websocket: WebSocket, 
        user_id: str, 
        client_info: Optional[Dict[str, Any]] = None
    ) -> Optional[str]:
        """Add new WebSocket connection with enhanced tracking"""
        
        if len(self.connections) >= self.max_connections:
            logger.warning(f"Max connections reached: {self.max_connections}")
            return None
        
        connection_id = str(uuid.uuid4())
        
        metrics = ConnectionMetrics(
            connected_at=datetime.now(timezone.utc),
            last_activity=datetime.now(timezone.utc)
        )
        
        connection_info = ConnectionInfo(
            websocket=websocket,
            user_id=user_id,
            connection_id=connection_id,
            metrics=metrics,
            rooms=set(),
            subscriptions=set(),
            client_info=client_info or {}
        )
        
        self.connections[connection_id] = connection_info
        self.user_connections[user_id].add(connection_id)
        
        self.stats['total_connections'] = len(self.connections)
        self.stats['peak_connections'] = max(
            self.stats['peak_connections'], 
            self.stats['total_connections']
        )
        
        # Store connection info in Redis for cluster awareness
        await self._store_connection_info(connection_info)
        
        logger.info(f"New WebSocket connection: {connection_id} for user {user_id}")
        return connection_id
    
    async def remove_connection(self, connection_id: str) -> bool:
        """Remove WebSocket connection and cleanup"""
        
        if connection_id not in self.connections:
            return False
        
        connection_info = self.connections[connection_id]
        user_id = connection_info.user_id
        
        # Remove from user connections
        self.user_connections[user_id].discard(connection_id)
        if not self.user_connections[user_id]:
            del self.user_connections[user_id]
        
        # Remove from rooms
        for room in connection_info.rooms:
            self.room_connections[room].discard(connection_id)
            if not self.room_connections[room]:
                del self.room_connections[room]
        
        # Remove from main connections
        del self.connections[connection_id]
        self.stats['total_connections'] = len(self.connections)
        
        # Remove from Redis
        await self._remove_connection_info(connection_id)
        
        logger.info(f"Removed WebSocket connection: {connection_id}")
        return True
    
    async def join_room(self, connection_id: str, room: str) -> bool:
        """Join connection to a room"""
        if connection_id not in self.connections:
            return False
        
        self.connections[connection_id].rooms.add(room)
        self.room_connections[room].add(connection_id)
        
        # Update Redis
        await self._update_connection_rooms(connection_id, self.connections[connection_id].rooms)
        
        return True
    
    async def leave_room(self, connection_id: str, room: str) -> bool:
        """Remove connection from a room"""
        if connection_id not in self.connections:
            return False
        
        self.connections[connection_id].rooms.discard(room)
        self.room_connections[room].discard(connection_id)
        
        if not self.room_connections[room]:
            del self.room_connections[room]
        
        await self._update_connection_rooms(connection_id, self.connections[connection_id].rooms)
        return True
    
    def get_user_connections(self, user_id: str) -> List[ConnectionInfo]:
        """Get all connections for a user"""
        connection_ids = self.user_connections.get(user_id, set())
        return [self.connections[cid] for cid in connection_ids if cid in self.connections]
    
    def get_room_connections(self, room: str) -> List[ConnectionInfo]:
        """Get all connections in a room"""
        connection_ids = self.room_connections.get(room, set())
        return [self.connections[cid] for cid in connection_ids if cid in self.connections]
    
    async def _store_connection_info(self, connection_info: ConnectionInfo):
        """Store connection info in Redis for cluster awareness"""
        try:
            connection_data = connection_info.to_dict()
            await advanced_redis_client.set_with_layer(
                f"ws_connection:{connection_info.connection_id}",
                json.dumps(connection_data),
                'session',
                3600  # 1 hour TTL
            )
        except Exception as e:
            logger.error(f"Failed to store connection info in Redis: {e}")
    
    async def _remove_connection_info(self, connection_id: str):
        """Remove connection info from Redis"""
        try:
            await advanced_redis_client.invalidate_pattern(f"ws_connection:{connection_id}")
        except Exception as e:
            logger.error(f"Failed to remove connection info from Redis: {e}")
    
    async def _update_connection_rooms(self, connection_id: str, rooms: Set[str]):
        """Update connection room membership in Redis"""
        try:
            await advanced_redis_client.set_with_layer(
                f"ws_rooms:{connection_id}",
                json.dumps(list(rooms)),
                'session',
                3600
            )
        except Exception as e:
            logger.error(f"Failed to update connection rooms in Redis: {e}")
    
    def get_stats(self) -> Dict[str, Any]:
        """Get connection pool statistics"""
        active_users = len(self.user_connections)
        active_rooms = len(self.room_connections)
        
        # Calculate average connections per user
        avg_connections_per_user = (
            self.stats['total_connections'] / active_users 
            if active_users > 0 else 0
        )
        
        return {
            **self.stats,
            'active_connections': len(self.connections),
            'active_users': active_users,
            'active_rooms': active_rooms,
            'avg_connections_per_user': round(avg_connections_per_user, 2),
            'connection_capacity_usage': round(
                len(self.connections) / self.max_connections * 100, 2
            )
        }

class AdvancedWebSocketManager:
    """
    Production-ready WebSocket manager with advanced features:
    - Connection pooling and load balancing
    - Real-time analytics and monitoring
    - Room-based broadcasting
    - Failover and recovery
    - Performance optimization
    """
    
    def __init__(self):
        self.connection_pool = ConnectionPool()
        self.notification_service = None  # Will be injected
        self.broadcast_queue = asyncio.Queue()
        self.analytics = {
            'messages_per_second': deque(maxlen=60),  # 1 minute window
            'connection_events': deque(maxlen=1000),
            'broadcast_performance': deque(maxlen=100)
        }
        
        # Performance monitoring
        self.performance_counters = defaultdict(int)
        self.response_times = defaultdict(list)
        
        # Background tasks management
        self._background_tasks = set()
        self._background_tasks_started = False
    
    def set_notification_service(self, service: NotificationService):
        """Inject notification service dependency"""
        self.notification_service = service
    
    def start_background_tasks(self):
        """Start background monitoring tasks"""
        if self._background_tasks_started:
            return
        
        self._background_tasks_started = True
        
        # Metrics aggregation
        task1 = asyncio.create_task(self._metrics_aggregator())
        self._background_tasks.add(task1)
        task1.add_done_callback(self._background_tasks.discard)
        
        # Connection health checker
        task2 = asyncio.create_task(self._connection_health_checker())
        self._background_tasks.add(task2)
        task2.add_done_callback(self._background_tasks.discard)
        
        # Performance monitor
        task3 = asyncio.create_task(self._performance_monitor())
        self._background_tasks.add(task3)
        task3.add_done_callback(self._background_tasks.discard)
        
        logger.info(f"✅ Started {len(self._background_tasks)} background tasks for advanced WebSocket management")
    
    async def stop_background_tasks(self):
        """Stop all background monitoring tasks"""
        if not self._background_tasks_started:
            return
        
        logger.info("🛑 Stopping advanced WebSocket background tasks...")
        
        # Cancel all background tasks
        for task in list(self._background_tasks):
            try:
                task.cancel()
                try:
                    await task
                except asyncio.CancelledError:
                    pass
            except Exception as e:
                logger.error(f"Error canceling background task: {e}")
        
        self._background_tasks.clear()
        self._background_tasks_started = False
        
        logger.info("✅ All advanced WebSocket background tasks stopped")
    
    async def connect(
        self, 
        websocket: WebSocket, 
        user_id: str, 
        client_info: Optional[Dict[str, Any]] = None
    ) -> Optional[str]:
        """Connect a new WebSocket with enhanced tracking"""
        
        try:
            await websocket.accept()
            
            connection_id = await self.connection_pool.add_connection(
                websocket, user_id, client_info
            )
            
            if not connection_id:
                await websocket.close(code=1013, reason="Server overloaded")
                return None
            
            # Join user-specific room
            await self.connection_pool.join_room(connection_id, f"user:{user_id}")
            
            # Send welcome message
            welcome_message = {
                "type": "connection_established",
                "data": {
                    "connection_id": connection_id,
                    "user_id": user_id,
                    "server_time": datetime.now(timezone.utc).isoformat(),
                    "features": ["notifications", "real_time_updates", "analytics"]
                }
            }
            
            await self._send_to_connection(connection_id, welcome_message)
            
            # Record analytics
            self.analytics['connection_events'].append({
                'type': 'connect',
                'user_id': user_id,
                'connection_id': connection_id,
                'timestamp': datetime.now(timezone.utc).isoformat()
            })
            
            return connection_id
            
        except Exception as e:
            logger.error(f"Failed to establish WebSocket connection: {e}")
            return None
    
    async def disconnect(self, connection_id: str):
        """Disconnect WebSocket with cleanup"""
        
        try:
            connection_info = self.connection_pool.connections.get(connection_id)
            if connection_info:
                # Send goodbye message if connection is still active
                if connection_info.websocket.client_state == WebSocketState.CONNECTED:
                    goodbye_message = {
                        "type": "connection_closing",
                        "data": {
                            "connection_id": connection_id,
                            "reason": "Client disconnect",
                            "session_summary": connection_info.metrics.__dict__
                        }
                    }
                    await self._send_to_connection(connection_id, goodbye_message)
                    await connection_info.websocket.close()
                
                # Record analytics
                self.analytics['connection_events'].append({
                    'type': 'disconnect',
                    'user_id': connection_info.user_id,
                    'connection_id': connection_id,
                    'session_duration': (
                        datetime.now(timezone.utc) - connection_info.metrics.connected_at
                    ).total_seconds(),
                    'timestamp': datetime.now(timezone.utc).isoformat()
                })
            
            await self.connection_pool.remove_connection(connection_id)
            
        except Exception as e:
            logger.error(f"Error during WebSocket disconnect: {e}")
    
    async def send_to_user(
        self, 
        user_id: str, 
        message: Dict[str, Any], 
        priority: int = 0
    ) -> int:
        """Send message to all connections of a user with priority support"""
        
        connections = self.connection_pool.get_user_connections(user_id)
        sent_count = 0
        
        # Sort connections by priority for load balancing
        connections.sort(key=lambda c: c.priority, reverse=True)
        
        for connection_info in connections:
            try:
                await self._send_to_connection(connection_info.connection_id, message)
                sent_count += 1
            except Exception as e:
                logger.error(f"Failed to send message to connection {connection_info.connection_id}: {e}")
        
        return sent_count
    
    async def broadcast_to_room(
        self, 
        room: str, 
        message: Dict[str, Any], 
        exclude_user_id: Optional[str] = None
    ) -> int:
        """Broadcast message to all connections in a room"""
        
        start_time = time.time()
        connections = self.connection_pool.get_room_connections(room)
        sent_count = 0
        
        # Filter out excluded user
        if exclude_user_id:
            connections = [c for c in connections if c.user_id != exclude_user_id]
        
        # Batch send for performance
        tasks = []
        for connection_info in connections:
            task = self._send_to_connection(connection_info.connection_id, message)
            tasks.append(task)
        
        # Execute all sends concurrently
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        for result in results:
            if not isinstance(result, Exception):
                sent_count += 1
        
        # Record performance
        duration = time.time() - start_time
        self.analytics['broadcast_performance'].append({
            'room': room,
            'connections': len(connections),
            'sent': sent_count,
            'duration': duration,
            'timestamp': datetime.now(timezone.utc).isoformat()
        })
        
        return sent_count
    
    async def _send_to_connection(self, connection_id: str, message: Dict[str, Any]):
        """Send message to specific connection"""
        
        connection_info = self.connection_pool.connections.get(connection_id)
        if not connection_info:
            return False
        
        try:
            message_json = json.dumps(message)
            await connection_info.websocket.send_text(message_json)
            
            # Update metrics
            connection_info.metrics.record_sent(len(message_json))
            self.performance_counters['messages_sent'] += 1
            
            return True
            
        except WebSocketDisconnect:
            logger.info(f"WebSocket disconnected during send: {connection_id}")
            await self.disconnect(connection_id)
            return False
        except Exception as e:
            logger.error(f"Failed to send message to connection {connection_id}: {e}")
            return False
    
    async def handle_message(self, connection_id: str, message: str):
        """Handle incoming WebSocket message"""
        
        connection_info = self.connection_pool.connections.get(connection_id)
        if not connection_info:
            return
        
        try:
            data = json.loads(message)
            connection_info.metrics.record_received(len(message))
            self.performance_counters['messages_received'] += 1
            
            # Handle different message types
            message_type = data.get('type')
            
            if message_type == 'ping':
                await self._handle_ping(connection_id)
            elif message_type == 'subscribe':
                await self._handle_subscribe(connection_id, data.get('data', {}))
            elif message_type == 'unsubscribe':
                await self._handle_unsubscribe(connection_id, data.get('data', {}))
            elif message_type == 'join_room':
                await self._handle_join_room(connection_id, data.get('data', {}))
            elif message_type == 'leave_room':
                await self._handle_leave_room(connection_id, data.get('data', {}))
            else:
                logger.warning(f"Unknown message type: {message_type}")
                
        except json.JSONDecodeError:
            logger.error(f"Invalid JSON message from connection {connection_id}")
        except Exception as e:
            logger.error(f"Error handling message from connection {connection_id}: {e}")
    
    async def _handle_ping(self, connection_id: str):
        """Handle ping message"""
        pong_message = {
            "type": "pong",
            "data": {
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
        }
        await self._send_to_connection(connection_id, pong_message)
    
    async def _handle_subscribe(self, connection_id: str, data: Dict[str, Any]):
        """Handle subscription request"""
        subscription = data.get('subscription')
        if subscription:
            connection_info = self.connection_pool.connections.get(connection_id)
            if connection_info:
                connection_info.subscriptions.add(subscription)
                
                response = {
                    "type": "subscription_confirmed",
                    "data": {"subscription": subscription}
                }
                await self._send_to_connection(connection_id, response)
    
    async def _handle_unsubscribe(self, connection_id: str, data: Dict[str, Any]):
        """Handle unsubscription request"""
        subscription = data.get('subscription')
        if subscription:
            connection_info = self.connection_pool.connections.get(connection_id)
            if connection_info:
                connection_info.subscriptions.discard(subscription)
                
                response = {
                    "type": "unsubscription_confirmed",
                    "data": {"subscription": subscription}
                }
                await self._send_to_connection(connection_id, response)
    
    async def _handle_join_room(self, connection_id: str, data: Dict[str, Any]):
        """Handle room join request"""
        room = data.get('room')
        if room:
            success = await self.connection_pool.join_room(connection_id, room)
            
            response = {
                "type": "room_joined" if success else "room_join_failed",
                "data": {"room": room}
            }
            await self._send_to_connection(connection_id, response)
    
    async def _handle_leave_room(self, connection_id: str, data: Dict[str, Any]):
        """Handle room leave request"""
        room = data.get('room')
        if room:
            success = await self.connection_pool.leave_room(connection_id, room)
            
            response = {
                "type": "room_left" if success else "room_leave_failed",
                "data": {"room": room}
            }
            await self._send_to_connection(connection_id, response)
    
    async def _handle_subscribe(self, connection_id: str, data: Dict[str, Any]):
        """Handle subscription request"""
        subscription = data.get('subscription')
        if subscription:
            connection_info = self.connection_pool.connections.get(connection_id)
            if connection_info:
                connection_info.subscriptions.add(subscription)
                
                response = {
                    "type": "subscription_confirmed",
                    "data": {"subscription": subscription}
                }
                await self._send_to_connection(connection_id, response)
    
    async def _handle_join_room(self, connection_id: str, data: Dict[str, Any]):
        """Handle room join request"""
        room = data.get('room')
        if room:
            success = await self.connection_pool.join_room(connection_id, room)
            
            response = {
                "type": "room_joined" if success else "room_join_failed",
                "data": {"room": room}
            }
            await self._send_to_connection(connection_id, response)
    
    def _start_background_tasks(self):
        """Start background monitoring tasks - deprecated, use start_background_tasks()"""
        pass  # Removed automatic task starting
    
    async def _metrics_aggregator(self):
        """Aggregate WebSocket metrics"""
        while True:
            try:
                await asyncio.sleep(10)  # Every 10 seconds
                
                current_time = time.time()
                messages_count = (
                    self.performance_counters['messages_sent'] + 
                    self.performance_counters['messages_received']
                )
                
                self.analytics['messages_per_second'].append({
                    'timestamp': current_time,
                    'count': messages_count
                })
                
                # Reset counters
                self.performance_counters['messages_sent'] = 0
                self.performance_counters['messages_received'] = 0
                
            except Exception as e:
                logger.error(f"Metrics aggregation error: {e}")
    
    async def _connection_health_checker(self):
        """Monitor connection health"""
        while True:
            try:
                await asyncio.sleep(60)  # Every minute
                
                stale_connections = []
                current_time = datetime.now(timezone.utc)
                
                for connection_id, connection_info in self.connection_pool.connections.items():
                    # Check for stale connections (no activity for 10 minutes)
                    if (current_time - connection_info.metrics.last_activity).seconds > 600:
                        stale_connections.append(connection_id)
                
                # Clean up stale connections
                for connection_id in stale_connections:
                    logger.info(f"Removing stale connection: {connection_id}")
                    await self.disconnect(connection_id)
                    
            except Exception as e:
                logger.error(f"Connection health check error: {e}")
    
    async def _performance_monitor(self):
        """Monitor and log performance metrics"""
        while True:
            try:
                await asyncio.sleep(300)  # Every 5 minutes
                
                stats = self.connection_pool.get_stats()
                
                logger.info(
                    f"WebSocket Performance - "
                    f"Active: {stats['active_connections']}, "
                    f"Users: {stats['active_users']}, "
                    f"Rooms: {stats['active_rooms']}, "
                    f"Capacity: {stats['connection_capacity_usage']}%"
                )
                
            except Exception as e:
                logger.error(f"Performance monitoring error: {e}")
    
    def get_analytics(self) -> Dict[str, Any]:
        """Get comprehensive WebSocket analytics"""
        
        stats = self.connection_pool.get_stats()
        
        # Calculate messages per second
        recent_messages = list(self.analytics['messages_per_second'])[-6:]  # Last minute
        avg_messages_per_sec = (
            sum(m['count'] for m in recent_messages) / len(recent_messages) 
            if recent_messages else 0
        )
        
        # Recent connection events
        recent_connections = list(self.analytics['connection_events'])[-10:]
        
        # Broadcast performance
        recent_broadcasts = list(self.analytics['broadcast_performance'])[-10:]
        avg_broadcast_time = (
            sum(b['duration'] for b in recent_broadcasts) / len(recent_broadcasts)
            if recent_broadcasts else 0
        )
        
        return {
            'connection_stats': stats,
            'performance': {
                'avg_messages_per_second': round(avg_messages_per_sec, 2),
                'avg_broadcast_time': round(avg_broadcast_time, 4),
                'active_subscriptions': sum(
                    len(conn.subscriptions) 
                    for conn in self.connection_pool.connections.values()
                )
            },
            'recent_events': {
                'connections': recent_connections,
                'broadcasts': recent_broadcasts
            }
        }

# Global advanced WebSocket manager instance
_advanced_websocket_manager = None

def get_websocket_manager():
    """Get the global WebSocket manager instance with lazy initialization"""
    global _advanced_websocket_manager
    if _advanced_websocket_manager is None:
        _advanced_websocket_manager = AdvancedWebSocketManager()
    return _advanced_websocket_manager

# For backward compatibility
advanced_websocket_manager = get_websocket_manager()