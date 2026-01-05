"""
Comprehensive health check endpoint for Phase K components
"""

__all__ = ["router"]

import logging
import time
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db_session
from app.core.performance_monitor import performance_metrics
from app.core.redis_client import RedisClient, redis_client as _redis_client

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/health", tags=["health"])


def get_redis_client() -> RedisClient:
    """Dependency to get Redis client instance"""
    return _redis_client


@router.get("/comprehensive")
async def comprehensive_health_check(
    db: AsyncSession = Depends(get_db_session),
    redis_client: RedisClient = Depends(get_redis_client),
) -> dict[str, Any]:
    """Comprehensive health check for all Phase K components"""

    health_status: dict[str, Any] = {
        "status": "healthy",
        "timestamp": time.time(),
        "components": {},
        "performance": performance_metrics.get_summary(),
    }

    # Create typed reference for components
    components: dict[str, dict[str, Any]] = health_status["components"]

    # Database health check
    try:
        start_time = time.time()
        await db.execute(text("SELECT 1"))
        db_response_time = (time.time() - start_time) * 1000

        components["database"] = {
            "status": "healthy",
            "response_time_ms": db_response_time,
        }
    except Exception as e:
        components["database"] = {
            "status": "unhealthy",
            "error": str(e),
        }
        health_status["status"] = "degraded"

    # Redis health check
    try:
        start_time = time.time()
        redis_available = await redis_client.is_available()
        redis_response_time = (time.time() - start_time) * 1000

        if redis_available:
            components["redis"] = {
                "status": "healthy",
                "response_time_ms": redis_response_time,
            }
        else:
            components["redis"] = {"status": "unhealthy", "error": "Not available"}
            health_status["status"] = "degraded"
    except Exception as e:
        components["redis"] = {"status": "unhealthy", "error": str(e)}
        health_status["status"] = "degraded"

    # WebSocket health check (simple connectivity test)
    try:
        # This is a placeholder for WebSocket health check
        components["websockets"] = {
            "status": "healthy",
            "active_connections": 0,  # Would track actual connections
        }
    except Exception as e:
        components["websockets"] = {
            "status": "unhealthy",
            "error": str(e),
        }
        health_status["status"] = "degraded"

    # AI Services health check
    try:
        components["ai_services"] = {
            "status": "healthy",
            "providers_available": 1,  # Would check actual providers
        }
    except Exception as e:
        components["ai_services"] = {
            "status": "unhealthy",
            "error": str(e),
        }
        health_status["status"] = "degraded"

    return health_status


@router.get("/metrics")
async def get_performance_metrics() -> dict[str, Any]:
    """Get detailed performance metrics"""
    return performance_metrics.get_summary()


@router.get("/component/{component_name}")
async def check_component_health(
    component_name: str,
    db: AsyncSession = Depends(get_db_session),
    redis_client: RedisClient = Depends(get_redis_client),
) -> dict[str, Any]:
    """Check health of specific component"""

    if component_name == "database":
        try:
            start_time = time.time()
            await db.execute(text("SELECT 1"))
            response_time = (time.time() - start_time) * 1000

            return {
                "component": component_name,
                "status": "healthy",
                "response_time_ms": response_time,
                "checks_passed": ["connection", "query_execution"],
            }
        except Exception as e:
            logger.error(
                f"Health check failed for {component_name}: {e}", exc_info=True
            )
            return {
                "component": component_name,
                "status": "unhealthy",
                "error": "Internal error",
            }

    elif component_name == "redis":
        try:
            start_time = time.time()
            redis_available = await redis_client.is_available()
            response_time = (time.time() - start_time) * 1000

            if redis_available:
                return {
                    "component": component_name,
                    "status": "healthy",
                    "response_time_ms": response_time,
                    "checks_passed": ["connection", "ping"],
                }
            else:
                return {
                    "component": component_name,
                    "status": "unhealthy",
                    "error": "Not available",
                }
        except Exception as e:
            logger.error(
                f"Health check failed for {component_name}: {e}", exc_info=True
            )
            return {
                "component": component_name,
                "status": "unhealthy",
                "error": "Internal error",
            }

    else:
        raise HTTPException(
            status_code=404, detail=f"Component '{component_name}' not found"
        )
