from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.routers import health, ohlc, news, social, portfolio, alerts, chat, mock_ohlc, market_data, auth, profile, follow, conversations, websocket, admin_messaging, ai, ai_websocket, notifications
from app.api.j6_2_endpoints import j6_2_router
from app.api.routes.monitoring import router as monitoring_router
from app.services.data_service import startup_data_services, shutdown_data_services
from app.services.j53_scheduler import j53_router, j53_lifespan_manager
from app.core.advanced_redis_client import advanced_redis_client
from app.websockets.advanced_websocket_manager import advanced_websocket_manager
from app.services.advanced_monitoring import monitoring_system
import logging

logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Enhanced application lifespan manager for Phase K Track 3 Infrastructure"""
    logger.info("🚀 Starting Fynix Phase K Track 3 Infrastructure Enhancement")
    
    # Startup sequence
    logger.info("📡 Initializing advanced Redis client...")
    await advanced_redis_client.initialize()
    
    logger.info("🔌 Starting WebSocket manager...")
    advanced_websocket_manager.start_background_tasks()
    
    logger.info("📊 Starting monitoring system...")
    await monitoring_system.start_monitoring()
    
    logger.info("🗄️ Starting data services...")
    await startup_data_services()
    
    logger.info("⏰ Initializing J5.3 scheduler...")
    # J5.3 lifespan manager handles scheduler startup/shutdown
    async with j53_lifespan_manager(app):
        logger.info("✅ All Phase K Track 3 systems initialized successfully")
        yield
        
        logger.info("🛑 Shutting down Phase K Track 3 systems...")
    
    # Shutdown sequence
    logger.info("📊 Stopping monitoring system...")
    await monitoring_system.stop_monitoring()
    
    logger.info("🔌 Stopping WebSocket manager...")
    await advanced_websocket_manager.stop_background_tasks()
    
    logger.info("🗄️ Shutting down data services...")
    await shutdown_data_services()
    
    logger.info("✅ Phase K Track 3 shutdown complete")

app = FastAPI(
    title=f"{settings.PROJECT_NAME} - Phase K Track 3: Infrastructure Enhancement",
    description="Fynix with Production-Ready Infrastructure: Advanced Redis, WebSocket Manager, Monitoring System",
    version="K3.0.0",
    lifespan=lifespan
)

import os
_frontend_origin = os.getenv("FRONTEND_ORIGIN", "http://localhost:3000")

# Configure CORS with combined origins
all_origins = settings.CORS_ORIGINS + [_frontend_origin]
app.add_middleware(
    CORSMiddleware,
    allow_origins=all_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(health.router, prefix=settings.API_PREFIX)
app.include_router(auth.router, prefix=settings.API_PREFIX)  # Phase J Authentication
app.include_router(profile.router, prefix=settings.API_PREFIX)  # Phase J Profiles & Settings
app.include_router(follow.router, prefix=settings.API_PREFIX)  # Phase J Follow Graph
app.include_router(conversations.router, prefix=settings.API_PREFIX)  # Phase J4 Direct Messages
app.include_router(websocket.router, prefix=settings.API_PREFIX)  # Phase J4 WebSocket
app.include_router(admin_messaging.router, prefix=settings.API_PREFIX)  # Phase J4 Admin
app.include_router(ai.router, prefix=settings.API_PREFIX)  # Phase J5 AI Chatbot
app.include_router(ai_websocket.router, prefix=settings.API_PREFIX)  # Phase J5 AI WebSocket
app.include_router(notifications.router, prefix=settings.API_PREFIX)  # Phase J6 Enterprise Notifications
app.include_router(j6_2_router)  # Phase J6.2 Advanced Notification Features
app.include_router(monitoring_router)  # Phase K Track 3: Advanced Monitoring
app.include_router(j53_router)  # Phase J5.3 Performance Monitoring
app.include_router(market_data.router)  # New market data API
app.include_router(mock_ohlc.router, prefix=settings.API_PREFIX)  # Mock data for testing
app.include_router(ohlc.router, prefix=settings.API_PREFIX)
app.include_router(news.router, prefix=settings.API_PREFIX)
app.include_router(social.router, prefix=settings.API_PREFIX)
app.include_router(portfolio.router, prefix=settings.API_PREFIX)
app.include_router(alerts.router, prefix=settings.API_PREFIX)
app.include_router(chat.router, prefix=settings.API_PREFIX)


@app.get('/api/health')
def health_status():
    return {'ok': True}

# Quick mock endpoint for testing
@app.get('/api/mock/ohlc')
def mock_ohlc_endpoint(symbol: str = "BTCUSD", timeframe: str = "1h", limit: int = 100):
    import random
    import time
    
    candles = []
    base_price = 50000 if "BTC" in symbol else 100
    current_time = int(time.time()) - (limit * 3600)
    current_price = base_price
    
    for i in range(limit):
        change = random.uniform(-0.02, 0.02)
        open_price = current_price
        close_price = open_price * (1 + change)
        high_price = max(open_price, close_price) * random.uniform(1.001, 1.01)
        low_price = min(open_price, close_price) * random.uniform(0.99, 0.999)
        volume = random.uniform(100, 1000)
        
        candles.append({
            "ts": (current_time + i * 3600) * 1000,
            "o": round(open_price, 2),
            "h": round(high_price, 2),
            "l": round(low_price, 2),
            "c": round(close_price, 2),
            "v": round(volume, 2)
        })
        
        current_price = close_price
    
    return {
        "symbol": symbol,
        "timeframe": timeframe,
        "candles": candles
    }
