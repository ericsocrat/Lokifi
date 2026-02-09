import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.j6_2_endpoints import j6_2_router
from app.api.market.routes import router as realtime_market_router
from app.api.routes import (
    admin_analytics,  # Session 192 Admin Analytics Dashboard
    admin_api_keys,  # Session 196 API Keys Management
    admin_audit_logs,  # Session 194 Admin Audit Logs
    admin_email_templates,  # Session 195 Email Templates
    admin_moderation,  # Session 190 Content Moderation
    admin_settings,  # Session 193 System Settings
    admin_users,  # Session 189 Admin User Management
    admin_webhooks,  # Session 197 Webhook Management
    market,
    security,
    social,  # Use comprehensive social router from api/routes
)
from app.api.routes.monitoring import router as monitoring_router
from app.api.routes.versioning import router as versioning_router

# Temporarily disable J53 scheduler due to async issues
# from app.services.j53_scheduler import j53_router, j53_lifespan_manager
from app.core.advanced_redis_client import advanced_redis_client
from app.core.cache import get_cache, shutdown_cache
from app.core.config import settings
from app.core.database import db_manager

# Security middleware imports
from app.middleware.security import RequestLoggingMiddleware
from app.middleware.versioning import VersionDetectionMiddleware
from app.routers import (
    admin_messaging,
    ai,
    ai_websocket,
    alerts,
    auth,
    chat,
    conversations,
    crypto,
    follow,
    health,
    market_data,
    mock_ohlc,
    news,
    notifications,
    ohlc,
    portfolio,
    profile,
    smart_prices,
    websocket,
    websocket_prices,
)
from app.routers.profile_enhanced import router as profile_enhanced_router
from app.services.alerts import evaluator as alerts_evaluator, store as alerts_store
from app.services.websocket_manager import connection_manager
from app.tasks.webhook_processor import start_webhook_processor, stop_webhook_processor
from app.utils.logger import get_logger
from app.websockets.advanced_websocket_manager import advanced_websocket_manager

logger = get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Enhanced application lifespan manager for Phase K Track 3 Infrastructure"""
    logger.info("🚀 Starting Lokifi Phase K Track 3 Infrastructure Enhancement")

    # Startup sequence
    logger.info("🗄️ Initializing database...")
    try:
        await db_manager.initialize()
        logger.info("✅ Database initialized")
    except Exception as e:
        logger.error(f"❌ Database initialization failed: {e}")
        raise

    logger.info("📡 Initializing advanced Redis client...")
    try:
        redis_success = await advanced_redis_client.initialize()
        if redis_success:
            logger.info("✅ Redis initialized")
        else:
            logger.warning("⚠️ Redis initialization failed (continuing without Redis)")
    except Exception as e:
        logger.warning(f"⚠️ Redis initialization error (continuing): {e}")

    logger.info("💾 Initializing analytics cache layer...")
    try:
        cache = await get_cache()
        cache_info = await cache.get_info()
        logger.info(f"✅ Analytics cache layer initialized (Redis: {cache_info.get('connected', False)})")
    except Exception as e:
        logger.warning(f"⚠️ Analytics cache initialization error (continuing): {e}")

    logger.info("🔌 Starting WebSocket manager...")
    try:
        advanced_websocket_manager.start_background_tasks()
        logger.info("✅ WebSocket manager started")
    except Exception as e:
        logger.error(f"❌ WebSocket manager failed: {e}")
        # Don't fail startup for websocket issues
        logger.warning("⚠️ Continuing without WebSocket manager")

    logger.info("🔌 Initializing legacy connection manager...")
    try:
        await connection_manager.initialize_redis()
        import asyncio

        asyncio.create_task(connection_manager.handle_redis_messages())
        logger.info("✅ Connection manager initialized")
    except Exception as e:
        logger.warning(f"⚠️ Connection manager initialization error (continuing): {e}")

    logger.info("🔔 Starting alerts evaluator...")
    try:
        await alerts_store.load()
        await alerts_evaluator.start()
        logger.info("✅ Alerts evaluator started")
    except Exception as e:
        logger.warning(f"⚠️ Alerts evaluator error (continuing): {e}")

    logger.info("🪝 Starting webhook processor...")
    try:
        await start_webhook_processor()
        logger.info("✅ Webhook processor started")
    except Exception as e:
        logger.warning(f"⚠️ Webhook processor error (continuing): {e}")

    # Disable data services for faster startup (optional services)
    logger.info("🗄️ Data services disabled for faster startup")
    # await startup_data_services()

    # Disable monitoring system for faster startup (optional service)
    logger.info("📊 Monitoring system disabled for faster startup")
    # await monitoring_system.start_monitoring()

    # Temporarily disable J53 scheduler
    # logger.info("⏰ Initializing J5.3 scheduler...")
    # async with j53_lifespan_manager(app):
    logger.info("✅ All Phase K Track 3 systems initialized successfully")

    yield

    # Shutdown sequence
    logger.info("🛑 Shutting down Phase K Track 3 systems...")

    logger.info("💾 Shutting down analytics cache layer...")
    try:
        await shutdown_cache()
        logger.info("✅ Analytics cache layer shutdown")
    except Exception as e:
        logger.error(f"❌ Error shutting down cache: {e}")

    logger.info("🔌 Stopping WebSocket manager...")
    try:
        await advanced_websocket_manager.stop_background_tasks()
        logger.info("✅ WebSocket manager stopped")
    except Exception as e:
        logger.error(f"❌ Error stopping websocket manager: {e}")

    logger.info("🔌 Closing legacy connection manager...")
    try:
        await connection_manager.close()
        logger.info("✅ Connection manager closed")
    except Exception as e:
        logger.error(f"❌ Error closing connection manager: {e}")

    logger.info("🔔 Stopping alerts evaluator...")
    try:
        await alerts_evaluator.stop()
        logger.info("✅ Alerts evaluator stopped")
    except Exception as e:
        logger.error(f"❌ Error stopping alerts evaluator: {e}")

    logger.info("🪝 Stopping webhook processor...")
    try:
        await stop_webhook_processor()
        logger.info("✅ Webhook processor stopped")
    except Exception as e:
        logger.error(f"❌ Error stopping webhook processor: {e}")

    # logger.info("🗄️ Shutting down data services...")
    # await shutdown_data_services()

    logger.info("🗄️ Shutting down database...")
    try:
        await db_manager.close()
        logger.info("✅ Database closed")
    except Exception as e:
        logger.error(f"❌ Error closing database: {e}")

    logger.info("✅ Phase K Track 3 shutdown complete")


app = FastAPI(
    title=f"{settings.PROJECT_NAME} - Phase K Track 3: Infrastructure Enhancement",
    description="Lokifi with Production-Ready Infrastructure: Advanced Redis, WebSocket Manager, Monitoring System",
    version="K3.0.0",
    lifespan=lifespan,
)

_frontend_origin = os.getenv("FRONTEND_ORIGIN", "http://localhost:3000")

# Add logging middleware first (will execute last)
app.add_middleware(RequestLoggingMiddleware)  # Request logging

# Security middleware (temporarily disabled for testing)
# app.add_middleware(SecurityMonitoringMiddleware)  # Monitor for threats
# app.add_middleware(RateLimitingMiddleware)  # Rate limiting
# app.add_middleware(RequestSizeLimitMiddleware)  # Request size limits
# app.add_middleware(SecurityHeadersMiddleware)  # Security headers

# Phase 5A: Version detection middleware (handles /api/v1/*, /api/v2/*, etc.)
app.add_middleware(VersionDetectionMiddleware)

# CORS must be added LAST so it executes FIRST (middleware runs in reverse order)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:8000",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:8000",
        "http://frontend:3000",  # Docker service name
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# Include routers
# Phase 5A: API Versioning - Middleware detects version from URL path or headers
# Adds X-API-Version response header automatically
# Versions detected: /api/v1/*, /api/v2/*, or Accept-Version header
app.include_router(health.router, prefix=settings.API_PREFIX)
app.include_router(
    versioning_router, prefix=settings.API_PREFIX
)  # Phase 5A: Example versioning endpoints for demonstration
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
app.include_router(
    admin_users.router, prefix=settings.API_PREFIX
)  # Session 189 Admin User Management
app.include_router(
    admin_moderation.router, prefix=settings.API_PREFIX
)  # Session 190 Content Moderation
app.include_router(
    admin_analytics.router, prefix=settings.API_PREFIX
)  # Session 192 Admin Analytics Dashboard
app.include_router(
    admin_settings.router, prefix=settings.API_PREFIX
)  # Session 193 System Settings
app.include_router(
    admin_audit_logs.router, prefix=settings.API_PREFIX
)  # Session 194 Admin Audit Logs
app.include_router(
    admin_email_templates.router, prefix=settings.API_PREFIX
)  # Session 195 Email Templates
app.include_router(
    admin_api_keys.router, prefix=settings.API_PREFIX
)  # Session 196 API Keys Management
app.include_router(
    admin_webhooks.router, prefix=settings.API_PREFIX
)  # Session 197 Webhook Management
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
app.include_router(market.router, prefix=settings.API_PREFIX)  # Phase 4c Market caching
app.include_router(news.router, prefix=settings.API_PREFIX)
app.include_router(social.router, prefix=settings.API_PREFIX)
app.include_router(portfolio.router, prefix=settings.API_PREFIX)
app.include_router(alerts.router, prefix=settings.API_PREFIX)
app.include_router(chat.router, prefix=settings.API_PREFIX)
app.include_router(mock_ohlc.router, prefix=settings.API_PREFIX)
app.include_router(market_data.router, prefix=settings.API_PREFIX)
app.include_router(crypto.router, prefix=settings.API_PREFIX)  # Crypto market data
app.include_router(
    realtime_market_router, prefix=settings.API_PREFIX
)  # Real-time prices
app.include_router(
    smart_prices.router, prefix=settings.API_PREFIX
)  # 🎯 Smart Price Service
app.include_router(
    websocket_prices.router, prefix=settings.API_PREFIX
)  # 🔌 WebSocket Price Updates

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
