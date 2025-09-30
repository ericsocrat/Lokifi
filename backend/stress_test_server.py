#!/usr/bin/env python3
"""
Simple FastAPI Test Server for Stress Testing
"""

import asyncio
import random
import time
from typing import Any

import uvicorn
from fastapi import FastAPI, WebSocket, WebSocketDisconnect

# Simple test application
app = FastAPI(title="Fynix Stress Test Server", version="1.0.0")

# Simulate some data storage
users_data = {}
notifications_data = []
portfolio_data = {}

@app.get("/")
async def root():
    """Root endpoint"""
    return {"message": "Fynix Stress Test Server", "status": "online"}

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": time.time(),
        "uptime": "running"
    }

@app.get("/api/v1/users/me")
async def get_current_user():
    """Get current user - simulated endpoint"""
    # Simulate some processing delay
    await asyncio.sleep(random.uniform(0.01, 0.05))
    
    return {
        "id": "test-user-123",
        "email": "test@example.com",
        "created_at": "2025-09-29T00:00:00Z",
        "is_active": True
    }

@app.get("/api/v1/portfolio")
async def get_portfolio():
    """Get portfolio data - simulated endpoint"""
    # Simulate database query delay
    await asyncio.sleep(random.uniform(0.02, 0.1))
    
    portfolio = [
        {
            "id": i,
            "symbol": f"STOCK{i}",
            "quantity": random.randint(1, 100),
            "price": round(random.uniform(10, 500), 2),
            "value": round(random.uniform(100, 5000), 2)
        }
        for i in range(1, random.randint(5, 20))
    ]
    
    return {"portfolio": portfolio, "total_value": sum(p["value"] for p in portfolio)}

@app.get("/api/v1/notifications")
async def get_notifications():
    """Get notifications - simulated endpoint"""
    # Simulate database query
    await asyncio.sleep(random.uniform(0.01, 0.08))
    
    notifications = [
        {
            "id": f"notif-{i}",
            "title": f"Test Notification {i}",
            "message": f"This is test notification number {i}",
            "type": random.choice(["info", "warning", "success", "error"]),
            "is_read": random.choice([True, False]),
            "created_at": f"2025-09-29T{random.randint(10,23):02d}:{random.randint(0,59):02d}:00Z"
        }
        for i in range(1, random.randint(3, 15))
    ]
    
    return {"notifications": notifications, "unread_count": sum(1 for n in notifications if not n["is_read"])}

@app.post("/api/v1/notifications/{notification_id}/read")
async def mark_notification_read(notification_id: str):
    """Mark notification as read"""
    # Simulate database update
    await asyncio.sleep(random.uniform(0.01, 0.03))
    
    return {"status": "success", "notification_id": notification_id, "marked_read": True}

@app.get("/api/v1/ai/threads")
async def get_ai_threads():
    """Get AI conversation threads"""
    # Simulate database query
    await asyncio.sleep(random.uniform(0.02, 0.08))
    
    threads = [
        {
            "id": f"thread-{i}",
            "title": f"AI Conversation {i}",
            "message_count": random.randint(1, 50),
            "last_message_at": f"2025-09-29T{random.randint(10,23):02d}:{random.randint(0,59):02d}:00Z",
            "is_archived": random.choice([True, False])
        }
        for i in range(1, random.randint(3, 10))
    ]
    
    return {"threads": threads, "total": len(threads)}

@app.post("/api/v1/portfolio/position")
async def add_portfolio_position(position_data: dict[str, Any]):
    """Add portfolio position"""
    # Simulate database insert
    await asyncio.sleep(random.uniform(0.02, 0.06))
    
    position = {
        "id": f"pos-{random.randint(1000, 9999)}",
        "symbol": position_data.get("symbol", "UNKNOWN"),
        "quantity": position_data.get("quantity", 0),
        "price": position_data.get("price", 0.0),
        "created_at": f"2025-09-29T{time.strftime('%H:%M:%S')}Z"
    }
    
    return {"status": "created", "position": position}

@app.get("/api/v1/market/data/{symbol}")
async def get_market_data(symbol: str):
    """Get market data for symbol"""
    # Simulate market data API call
    await asyncio.sleep(random.uniform(0.05, 0.15))
    
    return {
        "symbol": symbol.upper(),
        "price": round(random.uniform(10, 1000), 2),
        "change": round(random.uniform(-50, 50), 2),
        "change_percent": round(random.uniform(-10, 10), 2),
        "volume": random.randint(10000, 1000000),
        "timestamp": time.time()
    }

@app.get("/stress-test/cpu")
async def cpu_intensive_task():
    """CPU intensive task for stress testing"""
    # Simulate CPU-bound work
    start = time.time()
    result = sum(i ** 2 for i in range(10000))
    duration = time.time() - start
    
    return {
        "task": "cpu_intensive",
        "result": result,
        "duration_seconds": duration
    }

@app.get("/stress-test/memory")
async def memory_intensive_task():
    """Memory intensive task for stress testing"""
    # Create some memory load
    data = [random.random() for _ in range(100000)]
    
    return {
        "task": "memory_intensive",
        "data_points": len(data),
        "sample": data[:10]
    }

# WebSocket endpoint for stress testing


@app.websocket("/ws/test")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket endpoint for stress testing"""
    await websocket.accept()
    
    try:
        while True:
            # Send periodic updates
            await websocket.send_json({
                "type": "heartbeat",
                "timestamp": time.time(),
                "data": {"status": "connected", "random": random.randint(1, 1000)}
            })
            
            await asyncio.sleep(1)
            
    except WebSocketDisconnect:
        print("WebSocket client disconnected")

if __name__ == "__main__":
    print("🚀 Starting Fynix Stress Test Server...")
    print("📊 Available endpoints:")
    print("  - GET / (root)")
    print("  - GET /health")
    print("  - GET /api/v1/users/me")
    print("  - GET /api/v1/portfolio")
    print("  - GET /api/v1/notifications")
    print("  - POST /api/v1/portfolio/position")
    print("  - GET /api/v1/market/data/{symbol}")
    print("  - WS /ws/test")
    print()
    
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8001,
        log_level="info"
    )