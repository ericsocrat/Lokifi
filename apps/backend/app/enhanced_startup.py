"""
K1 - Enhanced Startup Sequence for Lokifi Phase K
Robust FastAPI startup with proper configuration, health checks, and migrations
"""

import logging
import sys
from contextlib import asynccontextmanager
from typing import Any

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from pydantic import Field

try:
    from pydantic_settings import BaseSettings
except ImportError:
    # Fallback for older pydantic versions  
    from pydantic import BaseSettings
import uvicorn

# Import existing components
from app.core.database import db_manager
from app.core.redis_client import redis_client
from app.services.advanced_monitoring import monitoring_system
from app.websockets.advanced_websocket_manager import advanced_websocket_manager

logger = logging.getLogger(__name__)

class EnhancedSettings(BaseSettings):
    """Enhanced configuration with Phase K requirements"""
    
    # Server Configuration
    HOST: str = Field(default="0.0.0.0", description="Server host")
    PORT: int = Field(default=8000, description="Server port") 
    WORKERS: int = Field(default=1, description="Number of workers")
    
    # Database
    DATABASE_URL: str = Field(..., description="Database connection URL")
    RUN_MIGRATIONS: bool = Field(default=True, description="Run migrations at startup")
    
    # Redis
    REDIS_URL: str = Field(default="redis://localhost:6379", description="Redis connection URL")
    REDIS_PASSWORD: str | None = Field(default=None, description="Redis password")
    
    # Security
    JWT_SECRET_KEY: str = Field(..., description="JWT secret key")
    CORS_ORIGINS: list = Field(default=["http://localhost:3000"], description="CORS origins")
    
    # Features
    ENABLE_WEBSOCKETS: bool = Field(default=True, description="Enable WebSocket features")
    ENABLE_MONITORING: bool = Field(default=True, description="Enable monitoring")
    ENABLE_REDIS: bool = Field(default=True, description="Enable Redis features")
    
    # Environment
    ENVIRONMENT: str = Field(default="development", description="Environment name")
    DEBUG: bool = Field(default=False, description="Debug mode")
    
    class Config:
        env_file = ".env"
        case_sensitive = True
        extra = "ignore"  # Allow extra fields from .env without validation errors

# Global settings instance
enhanced_settings = EnhancedSettings()

class HealthStatus:
    """Health check status tracking"""
    
    def __init__(self):
        self.checks: dict[str, bool] = {}
        self.details: dict[str, Any] = {}
    
    def add_check(self, name: str, status: bool, details: Any = None):
        """Add health check result"""
        self.checks[name] = status
        if details:
            self.details[name] = details
    
    @property
    def is_healthy(self) -> bool:
        """Overall health status"""
        return all(self.checks.values())
    
    def to_dict(self) -> dict[str, Any]:
        """Convert to dictionary for API response"""
        return {
            "status": "healthy" if self.is_healthy else "unhealthy",
            "checks": self.checks,
            "details": self.details
        }

# Global health status
health_status = HealthStatus()

async def run_database_migrations():
    """Run database migrations at startup"""
    if not enhanced_settings.RUN_MIGRATIONS:
        logger.info("Database migrations skipped (RUN_MIGRATIONS=False)")
        return True
    
    try:
        logger.info("🗄️ Running database migrations...")
        
        # Import Alembic components
        from alembic.config import Config

        from alembic import command
        
        # Configure Alembic
        alembic_cfg = Config("alembic.ini")
        alembic_cfg.set_main_option("sqlalchemy.url", enhanced_settings.DATABASE_URL)
        
        # Run migrations
        command.upgrade(alembic_cfg, "head")
        logger.info("✅ Database migrations completed successfully")
        return True
        
    except Exception as e:
        logger.error(f"❌ Database migration failed: {e}")
        return False

async def verify_database_connectivity():
    """Verify database connectivity"""
    try:
        logger.info("🔍 Verifying database connectivity...")
        
        # Test database connection
        await db_manager.initialize()
        
        # Simple connectivity test using proper async iterator
        from sqlalchemy import text
        session_generator = db_manager.get_session()
        session = await session_generator.__anext__()
        
        try:
            result = await session.execute(text("SELECT 1"))
            test_value = result.scalar()
            if test_value != 1:
                raise ValueError("Database test query failed")
        finally:
            await session.close()
        
        logger.info("✅ Database connectivity verified")
        health_status.add_check("database", True, {"url": enhanced_settings.DATABASE_URL.split("@")[-1]})  # Hide credentials
        return True
        
    except Exception as e:
        logger.error(f"❌ Database connectivity failed: {e}")
        health_status.add_check("database", False, {"error": str(e)})
        return False

async def verify_redis_connectivity():
    """Verify Redis connectivity"""
    if not enhanced_settings.ENABLE_REDIS:
        logger.info("Redis connectivity check skipped (ENABLE_REDIS=False)")
        health_status.add_check("redis", True, {"status": "disabled"})
        return True
    
    try:
        logger.info("🔍 Verifying Redis connectivity...")
        
        # Initialize Redis client
        await redis_client.initialize()
        
        # Test Redis connection
        await redis_client.set("health_check", "ok", ttl=10)  # Use 'ttl' parameter for expiry
        value = await redis_client.get("health_check")
        
        if value == "ok":
            logger.info("✅ Redis connectivity verified")
            health_status.add_check("redis", True, {"url": enhanced_settings.REDIS_URL.split("@")[-1]})
            return True
        else:
            raise Exception("Redis health check failed")
            
    except Exception as e:
        logger.error(f"❌ Redis connectivity failed: {e}")
        health_status.add_check("redis", False, {"error": str(e)})
        return False

async def startup_dependency_checks():
    """Run all startup dependency checks"""
    logger.info("🚀 Starting Lokifi Phase K - Enhanced Startup Sequence")
    
    # Log configuration (without secrets)
    config_summary = {
        "environment": enhanced_settings.ENVIRONMENT,
        "host": enhanced_settings.HOST,
        "port": enhanced_settings.PORT,
        "database_configured": bool(enhanced_settings.DATABASE_URL),
        "redis_enabled": enhanced_settings.ENABLE_REDIS,
        "websockets_enabled": enhanced_settings.ENABLE_WEBSOCKETS,
        "monitoring_enabled": enhanced_settings.ENABLE_MONITORING,
        "debug": enhanced_settings.DEBUG
    }
    logger.info(f"📋 Configuration: {config_summary}")
    
    checks_passed = []
    
    # Run database migrations
    if await run_database_migrations():
        checks_passed.append("migrations")
    
    # Verify database connectivity
    if await verify_database_connectivity():
        checks_passed.append("database")
    
    # Verify Redis connectivity
    if await verify_redis_connectivity():
        checks_passed.append("redis")
    
    # Initialize WebSocket manager
    if enhanced_settings.ENABLE_WEBSOCKETS:
        try:
            logger.info("🔌 Initializing WebSocket manager...")
            advanced_websocket_manager.start_background_tasks()
            health_status.add_check("websockets", True)
            checks_passed.append("websockets")
            logger.info("✅ WebSocket manager initialized")
        except Exception as e:
            logger.error(f"❌ WebSocket initialization failed: {e}")
            health_status.add_check("websockets", False, {"error": str(e)})
    
    # Initialize monitoring
    if enhanced_settings.ENABLE_MONITORING:
        try:
            logger.info("📊 Starting monitoring system...")
            await monitoring_system.start_monitoring()
            health_status.add_check("monitoring", True)
            checks_passed.append("monitoring")
            logger.info("✅ Monitoring system started")
        except Exception as e:
            logger.error(f"❌ Monitoring initialization failed: {e}")
            health_status.add_check("monitoring", False, {"error": str(e)})
    
    logger.info(f"✅ Startup checks completed: {len(checks_passed)} successful")
    
    # Fail fast if critical dependencies are not available
    if not health_status.checks.get("database", False):
        logger.error("🚨 CRITICAL: Database connectivity failed - cannot start application")
        sys.exit(1)
    
    return True

async def shutdown_sequence():
    """Clean shutdown sequence"""
    logger.info("🛑 Starting Lokifi Phase K shutdown sequence...")
    
    # Stop monitoring
    if enhanced_settings.ENABLE_MONITORING:
        try:
            await monitoring_system.stop_monitoring()
            logger.info("✅ Monitoring system stopped")
        except Exception as e:
            logger.error(f"Error stopping monitoring: {e}")
    
    # Stop WebSocket manager  
    if enhanced_settings.ENABLE_WEBSOCKETS:
        try:
            await advanced_websocket_manager.stop_background_tasks()
            logger.info("✅ WebSocket manager stopped")
        except Exception as e:
            logger.error(f"Error stopping WebSocket manager: {e}")
    
    # Close database connections
    try:
        await db_manager.close()
        logger.info("✅ Database connections closed")
    except Exception as e:
        logger.error(f"Error closing database: {e}")
    
    # Close Redis connections
    if enhanced_settings.ENABLE_REDIS:
        try:
            await redis_client.close()
            logger.info("✅ Redis connections closed")
        except Exception as e:
            logger.error(f"Error closing Redis: {e}")
    
    logger.info("✅ Lokifi Phase K shutdown completed")

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Enhanced application lifespan manager for Phase K"""
    # Startup
    await startup_dependency_checks()
    yield
    # Shutdown
    await shutdown_sequence()

def create_app() -> FastAPI:
    """Create FastAPI application with Phase K enhancements"""
    
    app = FastAPI(
        title="Lokifi Phase K - Enhanced Startup",
        description="Production-ready Lokifi with robust startup, health checks, and monitoring",
        version="K.1.0",
        lifespan=lifespan,
        debug=enhanced_settings.DEBUG
    )
    
    # Security middleware
    app.add_middleware(
        TrustedHostMiddleware, 
        allowed_hosts=["*"] if enhanced_settings.DEBUG else ["localhost", "127.0.0.1"]
    )
    
    # CORS middleware
    app.add_middleware(
        CORSMiddleware,
        allow_origins=enhanced_settings.CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    
    # Health endpoints
    @app.get("/api/health", tags=["health"])
    async def health_check():
        """Liveness probe - basic application health"""
        return {"status": "ok", "service": "lokifi-phase-k"}
    
    @app.get("/api/health/ready", tags=["health"]) 
    async def readiness_check():
        """Readiness probe - dependencies health"""
        if not health_status.is_healthy:
            raise HTTPException(status_code=503, detail=health_status.to_dict())
        
        return {
            "status": "ready",
            "service": "lokifi-phase-k",
            "checks": health_status.to_dict()
        }
    
    @app.get("/api/health/live", tags=["health"])
    async def liveness_check():
        """Liveness probe - application is running"""
        return {
            "status": "live",
            "service": "lokifi-phase-k",
            "uptime": "running"  # Could add actual uptime tracking
        }
    
    # Include existing routers
    from app.api.j6_2_endpoints import j6_2_router
    from app.api.routes.monitoring import router as monitoring_router
    from app.routers import (
        admin_messaging,
        ai,
        ai_websocket,
        alerts,
        auth,
        chat,
        conversations,
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
    from app.services.j53_scheduler import j53_router
    
    # Register routes
    api_prefix = "/api"
    app.include_router(health.router, prefix=api_prefix)
    app.include_router(auth.router, prefix=api_prefix)
    app.include_router(profile.router, prefix=api_prefix)
    app.include_router(follow.router, prefix=api_prefix)
    app.include_router(conversations.router, prefix=api_prefix)
    app.include_router(websocket.router, prefix=api_prefix)
    app.include_router(admin_messaging.router, prefix=api_prefix)
    app.include_router(ai.router, prefix=api_prefix)
    app.include_router(ai_websocket.router, prefix=api_prefix)
    app.include_router(notifications.router, prefix=api_prefix)
    app.include_router(j6_2_router)
    app.include_router(monitoring_router)
    app.include_router(j53_router)
    app.include_router(market_data.router)
    app.include_router(mock_ohlc.router, prefix=api_prefix)
    app.include_router(ohlc.router, prefix=api_prefix)
    app.include_router(news.router, prefix=api_prefix)
    app.include_router(social.router, prefix=api_prefix)
    app.include_router(portfolio.router, prefix=api_prefix)
    app.include_router(alerts.router, prefix=api_prefix)
    app.include_router(chat.router, prefix=api_prefix)
    
    return app

# Create the app
app = create_app()

if __name__ == "__main__":
    # Run with uvicorn for development
    uvicorn.run(
        "app.enhanced_startup:app",
        host=enhanced_settings.HOST,
        port=enhanced_settings.PORT,
        reload=enhanced_settings.DEBUG,
        workers=1 if enhanced_settings.DEBUG else enhanced_settings.WORKERS,
        proxy_headers=True,
        server_header=False,
        access_log=enhanced_settings.DEBUG
    )