"""WebSocket Router for Real-Time Price Updates"""
import asyncio
import json
import logging
import uuid
from datetime import datetime

from fastapi import APIRouter, Query, WebSocket, WebSocketDisconnect

from app.core.advanced_redis_client import advanced_redis_client
from app.services.smart_price_service import SmartPriceService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/ws", tags=["websocket"])

class ConnectionMetrics:
    """Track WebSocket connection metrics"""
    
    def __init__(self):
        self.total_connections = 0
        self.total_messages_sent = 0
        self.total_messages_received = 0
        self.total_errors = 0
        self.active_connections = 0
        
    def get_stats(self) -> dict:
        return {
            "total_connections": self.total_connections,
            "active_connections": self.active_connections,
            "messages_sent": self.total_messages_sent,
            "messages_received": self.total_messages_received,
            "errors": self.total_errors
        }

connection_metrics = ConnectionMetrics()

class PriceWebSocketManager:
    """Manage WebSocket connections for price updates"""
    
    def __init__(self):
        self.active_connections: dict[str, WebSocket] = {}
        self.subscriptions: dict[str, set[str]] = {}
        self.update_task: asyncio.Task | None = None
        self.update_interval = 30  # 30 seconds
        
    async def connect(self, websocket: WebSocket, client_id: str):
        """Accept new WebSocket connection"""
        await websocket.accept()
        self.active_connections[client_id] = websocket
        self.subscriptions[client_id] = set()
        
        # Update metrics
        connection_metrics.total_connections += 1
        connection_metrics.active_connections = len(self.active_connections)
        
        logger.info(f"✅ WebSocket connected: {client_id} (total: {len(self.active_connections)})")
        
        # Start update task if not running
        if self.update_task is None or self.update_task.done():
            self.update_task = asyncio.create_task(self._price_update_loop())
            logger.info("🔄 Started price update loop")
    
    def disconnect(self, client_id: str):
        """Remove WebSocket connection"""
        if client_id in self.active_connections:
            del self.active_connections[client_id]
        if client_id in self.subscriptions:
            del self.subscriptions[client_id]
        
        # Update metrics
        connection_metrics.active_connections = len(self.active_connections)
        
        logger.info(f"🔌 WebSocket disconnected: {client_id} (remaining: {len(self.active_connections)})")
        
        # Stop update task if no connections
        if not self.active_connections and self.update_task and not self.update_task.done():
            self.update_task.cancel()
            logger.info("⏹️ Stopped price update loop (no active connections)")
    
    async def subscribe(self, client_id: str, symbols: list[str]):
        """Subscribe to price updates for symbols"""
        if client_id in self.subscriptions:
            symbols_upper = [s.upper() for s in symbols]
            self.subscriptions[client_id].update(symbols_upper)
            logger.info(f"{client_id} subscribed to {len(symbols)} symbols: {symbols_upper[:10]}...")
            return True
        return False
    
    async def unsubscribe(self, client_id: str, symbols: list[str]):
        """Unsubscribe from symbols"""
        if client_id in self.subscriptions:
            self.subscriptions[client_id].difference_update([s.upper() for s in symbols])
            logger.info(f"{client_id} unsubscribed from: {symbols}")
            return True
        return False
    
    async def send_message(self, client_id: str, message: dict):
        """Send message to specific client"""
        if client_id in self.active_connections:
            try:
                await self.active_connections[client_id].send_json(message)
                connection_metrics.total_messages_sent += 1
            except Exception as e:
                logger.error(f"❌ Error sending to {client_id}: {e}")
                connection_metrics.total_errors += 1
                self.disconnect(client_id)
    
    async def _price_update_loop(self):
        """Background task to fetch and push price updates every 30 seconds"""
        logger.info("🔄 Price update loop started")
        
        while self.active_connections:
            try:
                # Collect all subscribed symbols
                all_symbols = set()
                for symbols in self.subscriptions.values():
                    all_symbols.update(symbols)
                
                if not all_symbols:
                    logger.debug("No symbols subscribed, waiting...")
                    await asyncio.sleep(self.update_interval)
                    continue
                
                logger.info(f"📊 Fetching prices for {len(all_symbols)} symbols...")
                
                # Fetch prices using SmartPriceService
                async with SmartPriceService() as price_service:
                    prices = await price_service.get_batch_prices(list(all_symbols))
                
                if not prices:
                    logger.warning("No prices fetched")
                    await asyncio.sleep(self.update_interval)
                    continue
                
                # Publish to Redis for horizontal scaling
                if advanced_redis_client.client:
                    try:
                        price_payload = {
                            symbol: {
                                "price": data.price,
                                "change": data.change,
                                "change_percent": data.change_percent,
                                "volume": data.volume,
                                "high": data.high,
                                "low": data.low,
                                "timestamp": datetime.now().isoformat(),
                                "source": data.source
                            }
                            for symbol, data in prices.items()
                        }
                        await advanced_redis_client.client.publish(
                            "lokifi:price_updates",
                            json.dumps(price_payload)
                        )
                        logger.debug(f"📤 Published {len(price_payload)} prices to Redis")
                    except Exception as e:
                        logger.debug(f"Redis publish failed: {e}")
                
                # Send targeted updates to each client
                for client_id, subscribed_symbols in self.subscriptions.items():
                    # Filter for this client's subscriptions
                    client_prices = {}
                    for symbol in subscribed_symbols:
                        if symbol in prices:
                            data = prices[symbol]
                            client_prices[symbol] = {
                                "symbol": symbol,
                                "price": data.price,
                                "change": data.change,
                                "change_percent": data.change_percent,
                                "high": data.high,
                                "low": data.low,
                                "volume": data.volume,
                                "market_cap": data.market_cap,
                                "last_updated": data.last_updated.isoformat() if data.last_updated else None,
                                "source": data.source,
                                "cached": data.cached
                            }
                    
                    if client_prices:
                        await self.send_message(client_id, {
                            "type": "price_update",
                            "timestamp": datetime.now().isoformat(),
                            "count": len(client_prices),
                            "data": client_prices
                        })
                
                logger.info(f"✅ Sent price updates to {len(self.subscriptions)} clients")
                
            except Exception as e:
                logger.error(f"❌ Error in price update loop: {e}", exc_info=True)
            
            # Wait 30 seconds before next update
            await asyncio.sleep(self.update_interval)
        
        logger.info("Price update loop stopped (no active connections)")

# Global manager instance
price_ws_manager = PriceWebSocketManager()

@router.websocket("/prices")
async def websocket_price_endpoint(
    websocket: WebSocket,
    client_id: str = Query(default=None, description="Optional client ID")
):
    """
    WebSocket endpoint for real-time price updates
    
    **Connection:**
    ```javascript
    const ws = new WebSocket('ws://localhost:8000/api/ws/prices?client_id=my-client');
    ```
    
    **Message Format (Client → Server):**
    ```json
    {
      "action": "subscribe",
      "symbols": ["BTC", "ETH", "AAPL"]
    }
    ```
    
    ```json
    {
      "action": "unsubscribe",
      "symbols": ["BTC"]
    }
    ```
    
    **Message Format (Server → Client):**
    ```json
    {
      "type": "price_update",
      "timestamp": "2025-10-06T12:00:00",
      "count": 3,
      "data": {
        "BTC": {
          "symbol": "BTC",
          "price": 67234.50,
          "change": 1234.50,
          "change_percent": 1.87,
          "high": 68000.00,
          "low": 66000.00,
          "volume": 1234567890,
          "market_cap": 1320000000000,
          "last_updated": "2025-10-06T12:00:00",
          "source": "coingecko",
          "cached": false
        }
      }
    }
    ```
    
    **Features:**
    - Real-time updates every 30 seconds
    - Subscribe to specific symbols
    - Automatic reconnection support
    - Redis pub/sub for horizontal scaling
    """
    
    # Generate client ID if not provided
    if not client_id:
        client_id = str(uuid.uuid4())
    
    await price_ws_manager.connect(websocket, client_id)
    
    # Send welcome message
    await price_ws_manager.send_message(client_id, {
        "type": "connected",
        "client_id": client_id,
        "message": "Connected to Lokifi Price WebSocket",
        "update_interval": price_ws_manager.update_interval
    })
    
    try:
        while True:
            # Receive messages from client
            data = await websocket.receive_text()
            
            try:
                message = json.loads(data)
                action = message.get("action")
                
                if action == "subscribe":
                    symbols = message.get("symbols", [])
                    if symbols:
                        await price_ws_manager.subscribe(client_id, symbols)
                        await price_ws_manager.send_message(client_id, {
                            "type": "subscribed",
                            "symbols": symbols,
                            "count": len(symbols)
                        })
                
                elif action == "unsubscribe":
                    symbols = message.get("symbols", [])
                    if symbols:
                        await price_ws_manager.unsubscribe(client_id, symbols)
                        await price_ws_manager.send_message(client_id, {
                            "type": "unsubscribed",
                            "symbols": symbols
                        })
                
                elif action == "ping":
                    await price_ws_manager.send_message(client_id, {
                        "type": "pong",
                        "timestamp": datetime.now().isoformat()
                    })
                
                elif action == "get_subscriptions":
                    subs = list(price_ws_manager.subscriptions.get(client_id, set()))
                    await price_ws_manager.send_message(client_id, {
                        "type": "subscriptions",
                        "symbols": subs,
                        "count": len(subs)
                    })
                
                else:
                    await price_ws_manager.send_message(client_id, {
                        "type": "error",
                        "message": f"Unknown action: {action}"
                    })
                    
            except json.JSONDecodeError:
                await price_ws_manager.send_message(client_id, {
                    "type": "error",
                    "message": "Invalid JSON"
                })
            except Exception as e:
                logger.error(f"Error processing message from {client_id}: {e}")
                await price_ws_manager.send_message(client_id, {
                    "type": "error",
                    "message": str(e)
                })
    
    except WebSocketDisconnect:
        price_ws_manager.disconnect(client_id)
        logger.info(f"Client {client_id} disconnected normally")
    except Exception as e:
        logger.error(f"WebSocket error for {client_id}: {e}", exc_info=True)
        price_ws_manager.disconnect(client_id)
