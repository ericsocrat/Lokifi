import logging
import os
from contextlib import asynccontextmanager

from app.api.j6_2_endpoints import j6_2_router
from app.api.routes import security
from app.api.routes.monitoring import router as monitoring_router

# Temporarily disable J53 scheduler due to async issues
# from app.services.j53_scheduler import j53_router, j53_lifespan_manager
from app.core.advanced_redis_client import advanced_redis_client
from app.core.config import settings
from app.core.database import db_manager
from app.middleware.rate_limiting import (
    RateLimitingMiddleware,
    RequestSizeLimitMiddleware,
    SecurityMonitoringMiddleware,
)

# Security middleware imports
from app.middleware.security import RequestLoggingMiddleware, SecurityHeadersMiddleware
from app.routers import (
    admin_messaging,
    ai,
    ai_websocket,
    alerts,
    auth,
    chat,
    conversations,
    crypto,
    fmp,
    follow,
    health,
    market_data,
    mock_ohlc,
    news,
    notifications,
    ohlc,
    portfolio,
    profile,
    social,
    websocket,
)
from app.routers.profile_enhanced import router as profile_enhanced_router
from app.services.advanced_monitoring import monitoring_system
from app.services.data_service import shutdown_data_services, startup_data_services
from app.websockets.advanced_websocket_manager import advanced_websocket_manager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Simplified application lifespan manager"""
    logger.info("🚀 Starting Lokifi Application")

    # Initialize database
    logger.info("🗄️ Initializing database...")
    try:
        await db_manager.initialize()
        logger.info("✅ Database initialized")
    except Exception as db_error:
        logger.warning(f"⚠️ Database unavailable: {db_error}")

    # Initialize Redis
    logger.info("📡 Initializing Redis...")
    try:
        await advanced_redis_client.initialize()
        logger.info("✅ Redis initialized")
    except Exception as e:
        logger.warning(f"⚠️ Redis unavailable: {e}")

    logger.info("✅ Application startup complete - Server ready!")

    # This yield keeps the application running
    yield

    # Cleanup on shutdown
    logger.info("🛑 Shutting down...")
    try:
        await db_manager.close()
        logger.info("✅ Cleanup complete")
    except Exception as e:
        logger.warning(f"Cleanup error: {e}")


app = FastAPI(
    title=f"{settings.PROJECT_NAME} - Phase K Track 3: Infrastructure Enhancement",
    description="Lokifi with Production-Ready Infrastructure: Advanced Redis, WebSocket Manager, Monitoring System",
    version="K3.0.0",
    lifespan=lifespan,
)

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
app.add_middleware(RateLimitingMiddleware)  # Rate limiting
app.add_middleware(RequestSizeLimitMiddleware)  # Request size limits
app.add_middleware(SecurityHeadersMiddleware)  # Security headers
app.add_middleware(RequestLoggingMiddleware)  # Request logging

# Include routers
app.include_router(health.router, prefix=settings.API_PREFIX)
app.include_router(auth.router, prefix=settings.API_PREFIX)  # Phase J Authentication
app.include_router(
    profile.router, prefix=settings.API_PREFIX
)  # Phase J Profiles & Settings
app.include_router(
    profile_enhanced_router, prefix=settings.API_PREFIX
)  # Phase J2 Enhanced Profile Features
app.include_router(follow.router, prefix=settings.API_PREFIX)  # Phase J Follow Graph
app.include_router(
    conversations.router, prefix=settings.API_PREFIX
)  # Phase J4 Direct Messages
app.include_router(websocket.router, prefix=settings.API_PREFIX)  # Phase J4 WebSocket
app.include_router(admin_messaging.router, prefix=settings.API_PREFIX)  # Phase J4 Admin
app.include_router(ai.router, prefix=settings.API_PREFIX)  # Phase J5 AI Chatbot
app.include_router(
    ai_websocket.router, prefix=settings.API_PREFIX
)  # Phase J5 AI WebSocket
app.include_router(
    notifications.router, prefix=settings.API_PREFIX
)  # Phase J6 Enterprise Notifications
app.include_router(
    j6_2_router, prefix=settings.API_PREFIX
)  # Phase J6.2 Advanced Features
app.include_router(ohlc.router, prefix=settings.API_PREFIX)
app.include_router(news.router, prefix=settings.API_PREFIX)
app.include_router(social.router, prefix=settings.API_PREFIX)
app.include_router(portfolio.router, prefix=settings.API_PREFIX)
app.include_router(alerts.router, prefix=settings.API_PREFIX)
app.include_router(chat.router, prefix=settings.API_PREFIX)
app.include_router(mock_ohlc.router, prefix=settings.API_PREFIX)
app.include_router(market_data.router, prefix=settings.API_PREFIX)
app.include_router(crypto.router, prefix=settings.API_PREFIX)  # Cryptocurrency data
app.include_router(fmp.router, prefix=settings.API_PREFIX)  # Financial Modeling Prep

# Include J5.3 scheduler endpoints (temporarily disabled)
# app.include_router(j53_router, prefix=settings.API_PREFIX)

# Include monitoring endpoints (Phase K Track 3)
app.include_router(monitoring_router, prefix=settings.API_PREFIX)

# Include security routes
app.include_router(security.router, prefix=settings.API_PREFIX)


@app.get("/")
async def read_root():
    return {
        "message": "Lokifi Phase K Track 3: Infrastructure Enhancement",
        "version": "K3.0.0",
        "features": [
            "Advanced Redis with connection pooling",
            "WebSocket manager with background tasks",
            "Real-time monitoring system",
            "Production-ready infrastructure",
            "Enhanced security middleware",
            "J5.3 Optimization Scheduler",
            "Enterprise security features",
        ],
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app.main:app", host="127.0.0.1", port=8000, reload=True)
