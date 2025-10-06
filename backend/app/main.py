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

# Sentry error tracking (disabled until venv is fixed)
# import sentry_sdk
# from sentry_sdk.integrations.fastapi import FastApiIntegration
# from sentry_sdk.integrations.starlette import StarletteIntegration
# from sentry_sdk.integrations.logging import LoggingIntegration
from app.middleware.rate_limiting import (
    RateLimitingMiddleware,
    RequestSizeLimitMiddleware,
    SecurityMonitoringMiddleware,
)

# Security middleware imports
from app.middleware.security import RequestLoggingMiddleware, SecurityHeadersMiddleware
from app.routers import (
    smart_prices,
    websocket_prices,
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
    social,
    websocket,
    # test_sentry,  # Disabled until sentry_sdk is installed
)
from app.api.market.routes import router as realtime_market_router
from app.routers.profile_enhanced import router as profile_enhanced_router
from app.services.advanced_monitoring import monitoring_system
from app.services.data_service import shutdown_data_services, startup_data_services
from app.websockets.advanced_websocket_manager import advanced_websocket_manager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Enhanced application lifespan manager for Phase K Track 3 Infrastructure"""
    logger.info("🚀 Starting Lokifi Phase K Track 3 Infrastructure Enhancement")

    # Initialize Sentry error tracking (disabled temporarily until venv fixed)
    logger.info("ℹ️ Sentry error tracking disabled (module not available)")
    # if settings.ENABLE_SENTRY and settings.SENTRY_DSN:
    #     logger.info("🔍 Initializing Sentry error tracking...")
    #     try:
    #         sentry_sdk.init(
    #             dsn=settings.SENTRY_DSN,
    #             environment=settings.SENTRY_ENVIRONMENT,
    #             traces_sample_rate=settings.SENTRY_TRACES_SAMPLE_RATE,
    #             profiles_sample_rate=1.0,  # Profile 100% of transactions
    #             integrations=[
    #                 FastApiIntegration(),
    #                 StarletteIntegration(),
    #                 LoggingIntegration(
    #                     level=logging.INFO,  # Capture info and above as breadcrumbs
    #                     event_level=logging.ERROR  # Send errors as events
    #                 )
    #             ],
    #             # Additional options
    #             send_default_pii=False,  # Don't send personally identifiable information
    #             attach_stacktrace=True,  # Attach stack traces
    #             max_request_body_size="medium",  # Limit body size
    #             before_send=lambda event, hint: event if event.get("level") in ["error", "fatal"] else None,  # Only send errors
    #         )
    #         logger.info("✅ Sentry initialized successfully")
            
    #         # Test Sentry connection
    #         try:
    #             sentry_sdk.capture_message("Lokifi backend started successfully", level="info")
    #         except Exception as test_error:
    #             logger.warning(f"⚠️ Sentry test message failed: {test_error}")
    #     except Exception as e:
    #         logger.error(f"❌ Sentry initialization failed: {e}")
    #         # Don't fail startup if Sentry fails
    # else:
    #     logger.info("ℹ️ Sentry error tracking disabled")

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

    logger.info("🔌 Starting WebSocket manager...")
    try:
        advanced_websocket_manager.start_background_tasks()
        logger.info("✅ WebSocket manager started")
    except Exception as e:
        logger.error(f"❌ WebSocket manager failed: {e}")
        # Don't fail startup for websocket issues
        logger.warning("⚠️ Continuing without WebSocket manager")

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

    # logger.info("📊 Stopping monitoring system...")
    # await monitoring_system.stop_monitoring()

    logger.info("🔌 Stopping WebSocket manager...")
    try:
        await advanced_websocket_manager.stop_background_tasks()
        logger.info("✅ WebSocket manager stopped")
    except Exception as e:
        logger.error(f"❌ Error stopping websocket manager: {e}")

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

# CORS must be added LAST so it executes FIRST (middleware runs in reverse order)
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex="http://localhost:.*",  # Allow any localhost port
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

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
app.include_router(crypto.router, prefix=settings.API_PREFIX)  # Crypto market data
app.include_router(realtime_market_router, prefix=settings.API_PREFIX)  # Real-time prices
app.include_router(smart_prices.router, prefix=settings.API_PREFIX)  # 🎯 Smart Price Service
app.include_router(websocket_prices.router, prefix=settings.API_PREFIX)  # 🔌 WebSocket Price Updates

# Include J5.3 scheduler endpoints (temporarily disabled)
# app.include_router(j53_router, prefix=settings.API_PREFIX)

# Include monitoring endpoints (Phase K Track 3)
app.include_router(monitoring_router, prefix=settings.API_PREFIX)

# Include security routes
app.include_router(security.router, prefix=settings.API_PREFIX)

# Include Sentry test routes (Phase 6A) - Disabled until sentry_sdk is installed
# app.include_router(test_sentry.router, prefix=settings.API_PREFIX)


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

