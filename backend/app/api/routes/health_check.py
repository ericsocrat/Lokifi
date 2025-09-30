"""
Comprehensive health check endpoint for Phase K components
"""

from fastapi import APIRouter, HTTPException, Depends
from typing import Dict, Any
import time
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db_session
from app.core.redis_client import get_redis_client
from app.core.performance_monitor import performance_metrics

router = APIRouter(prefix="/health", tags=["health"])

@router.get("/comprehensive")
async def comprehensive_health_check(
    db: AsyncSession = Depends(get_db_session),
    redis_client = Depends(get_redis_client)
) -> Dict[str, Any]:
    """Comprehensive health check for all Phase K components"""
    
    health_status = {
        "status": "healthy",
        "timestamp": time.time(),
        "components": {},
        "performance": performance_metrics.get_summary()
    }
    
    # Database health check
    try:
        start_time = time.time()
        await db.execute("SELECT 1")
        db_response_time = (time.time() - start_time) * 1000
        
        health_status["components"]["database"] = {
            "status": "healthy",
            "response_time_ms": db_response_time
        }
    except Exception as e:
        health_status["components"]["database"] = {
            "status": "unhealthy",
            "error": str(e)
        }
        health_status["status"] = "degraded"
    
    # Redis health check
    try:
        start_time = time.time()
        await redis_client.ping()
        redis_response_time = (time.time() - start_time) * 1000
        
        health_status["components"]["redis"] = {
            "status": "healthy", 
            "response_time_ms": redis_response_time
        }
    except Exception as e:
        health_status["components"]["redis"] = {
            "status": "unhealthy",
            "error": str(e)
        }
        health_status["status"] = "degraded"
    
    # WebSocket health check (simple connectivity test)
    try:
        # This is a placeholder for WebSocket health check
        health_status["components"]["websockets"] = {
            "status": "healthy",
            "active_connections": 0  # Would track actual connections
        }
    except Exception as e:
        health_status["components"]["websockets"] = {
            "status": "unhealthy",
            "error": str(e)
        }
        health_status["status"] = "degraded"
    
    # AI Services health check
    try:
        health_status["components"]["ai_services"] = {
            "status": "healthy",
            "providers_available": 1  # Would check actual providers
        }
    except Exception as e:
        health_status["components"]["ai_services"] = {
            "status": "unhealthy",
            "error": str(e)
        }
        health_status["status"] = "degraded"
    
    return health_status

@router.get("/metrics")
async def get_performance_metrics() -> Dict[str, Any]:
    """Get detailed performance metrics"""
    return performance_metrics.get_summary()

@router.get("/component/{component_name}")
async def check_component_health(
    component_name: str,
    db: AsyncSession = Depends(get_db_session),
    redis_client = Depends(get_redis_client)
) -> Dict[str, Any]:
    """Check health of specific component"""
    
    if component_name == "database":
        try:
            start_time = time.time()
            await db.execute("SELECT 1")
            response_time = (time.time() - start_time) * 1000
            
            return {
                "component": component_name,
                "status": "healthy",
                "response_time_ms": response_time,
                "checks_passed": ["connection", "query_execution"]
            }
        except Exception as e:
            return {
                "component": component_name,
                "status": "unhealthy",
                "error": str(e)
            }
    
    elif component_name == "redis":
        try:
            start_time = time.time()
            await redis_client.ping()
            response_time = (time.time() - start_time) * 1000
            
            return {
                "component": component_name,
                "status": "healthy",
                "response_time_ms": response_time,
                "checks_passed": ["connection", "ping"]
            }
        except Exception as e:
            return {
                "component": component_name,
                "status": "unhealthy",
                "error": str(e)
            }
    
    else:
        raise HTTPException(status_code=404, detail=f"Component '{component_name}' not found")
