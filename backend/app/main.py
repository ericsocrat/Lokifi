from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.routers import health, ohlc, news, social, portfolio, alerts, chat, mock_ohlc, market_data, auth, profile, follow, conversations, websocket, admin_messaging, ai, ai_websocket, notifications
from app.api.routes import security
from app.api.j6_2_endpoints import j6_2_router
from app.api.routes.monitoring import router as monitoring_router
from app.services.data_service import startup_data_services, shutdown_data_services
# Temporarily disable J53 scheduler due to async issues
# from app.services.j53_scheduler import j53_router, j53_lifespan_manager
from app.core.advanced_redis_client import advanced_redis_client
from app.websockets.advanced_websocket_manager import advanced_websocket_manager
from app.services.advanced_monitoring import monitoring_system
from app.core.database import db_manager
# Security middleware imports
from app.middleware.security import SecurityHeadersMiddleware, RequestLoggingMiddleware
from app.middleware.rate_limiting import (
    RateLimitingMiddleware, 
    RequestSizeLimitMiddleware, 
    SecurityMonitoringMiddleware
)
import logging

logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Enhanced application lifespan manager for Phase K Track 3 Infrastructure"""
    logger.info("🚀 Starting Fynix Phase K Track 3 Infrastructure Enhancement")
    
    try:
        # Startup sequence
        logger.info("🗄️ Initializing database...")
        await db_manager.initialize()
        
        logger.info("📡 Initializing advanced Redis client...")
        try:
            await advanced_redis_client.initialize()
        except Exception as e:
            logger.warning(f"Redis initialization failed (development mode): {e}")
        
        logger.info("🔌 Starting WebSocket manager...")
        advanced_websocket_manager.start_background_tasks()
        
        logger.info("🗄️ Starting data services...")
        await startup_data_services()
        
        logger.info("📊 Starting monitoring system...")
        await monitoring_system.start_monitoring()
        
        # Temporarily disable J53 scheduler
        # logger.info("⏰ Initializing J5.3 scheduler...")
        # async with j53_lifespan_manager(app):
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
        
        logger.info("🗄️ Shutting down database...")
        await db_manager.close()
        
        logger.info("✅ Phase K Track 3 shutdown complete")
        
    except Exception as e:
        logger.error(f"Error during application lifecycle: {e}")
        # Continue with graceful shutdown even if there are errors
        try:
            await monitoring_system.stop_monitoring()
        except:
            pass
        try:
            await advanced_websocket_manager.stop_background_tasks()
        except:
            pass
        try:
            await shutdown_data_services()
        except:
            pass
        try:
            await db_manager.close()
        except:
            pass

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
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],  # More restrictive
    allow_headers=["*"],
)

# Add security middleware (order matters - most restrictive first)
app.add_middleware(SecurityMonitoringMiddleware)  # Monitor for threats
app.add_middleware(RateLimitingMiddleware)        # Rate limiting
app.add_middleware(RequestSizeLimitMiddleware)    # Request size limits
app.add_middleware(SecurityHeadersMiddleware)     # Security headers
app.add_middleware(RequestLoggingMiddleware)      # Request logging

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
app.include_router(j6_2_router, prefix=settings.API_PREFIX)  # Phase J6.2 Advanced Features
app.include_router(ohlc.router, prefix=settings.API_PREFIX)
app.include_router(news.router, prefix=settings.API_PREFIX)
app.include_router(social.router, prefix=settings.API_PREFIX)
app.include_router(portfolio.router, prefix=settings.API_PREFIX)
app.include_router(alerts.router, prefix=settings.API_PREFIX)
app.include_router(chat.router, prefix=settings.API_PREFIX)
app.include_router(mock_ohlc.router, prefix=settings.API_PREFIX)
app.include_router(market_data.router, prefix=settings.API_PREFIX)

# Include J5.3 scheduler endpoints (temporarily disabled)
# app.include_router(j53_router, prefix=settings.API_PREFIX)

# Include monitoring endpoints (Phase K Track 3)
app.include_router(monitoring_router, prefix=settings.API_PREFIX)

# Include security routes
app.include_router(security.router, prefix=settings.API_PREFIX)

@app.get("/")
async def read_root():
    return {
        "message": "Fynix Phase K Track 3: Infrastructure Enhancement", 
        "version": "K3.0.0",
        "features": [
            "Advanced Redis with connection pooling",
            "WebSocket manager with background tasks", 
            "Real-time monitoring system",
            "Production-ready infrastructure",
            "Enhanced security middleware",
            "J5.3 Optimization Scheduler",
            "Enterprise security features"
        ]
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="127.0.0.1", port=8000, reload=True)