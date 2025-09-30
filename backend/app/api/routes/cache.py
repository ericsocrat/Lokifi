"""
Cache Management API Endpoints
Provides cache statistics, management, and debugging tools
"""

import logging
from typing import Any

from fastapi import APIRouter, HTTPException, Request

from app.core.redis_cache import (
    cache,
    cache_public_data,
    clear_all_cache,
    get_cache_stats,
    warm_cache,
)

router = APIRouter(prefix="/cache", tags=["cache"])
logger = logging.getLogger(__name__)

@router.get("/stats")
@cache_public_data(ttl=60)  # Cache stats for 1 minute
async def cache_statistics(request: Request) -> dict[str, Any]:
    """Get Redis cache statistics"""
    
    try:
        stats = await get_cache_stats()
        return {
            "status": "success",
            "cache_stats": stats,
            "cache_enabled": True
        }
    except Exception as e:
        logger.error(f"Failed to get cache stats: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve cache statistics")

@router.post("/clear")
async def clear_cache() -> dict[str, Any]:
    """Clear all cached data"""
    
    try:
        success = await clear_all_cache()
        if success:
            return {
                "status": "success",
                "message": "All cache data cleared successfully"
            }
        else:
            raise HTTPException(status_code=500, detail="Failed to clear cache")
    except Exception as e:
        logger.error(f"Failed to clear cache: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/warm")
async def warm_cache_endpoint() -> dict[str, Any]:
    """Warm up the cache with frequently accessed data"""
    
    try:
        await warm_cache()
        return {
            "status": "success",
            "message": "Cache warming completed successfully"
        }
    except Exception as e:
        logger.error(f"Failed to warm cache: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/pattern/{pattern}")
async def clear_cache_pattern(pattern: str) -> dict[str, Any]:
    """Clear cache keys matching a specific pattern"""
    
    try:
        deleted_count = await cache.clear_pattern(f"cache:{pattern}:*")
        return {
            "status": "success",
            "deleted_keys": deleted_count,
            "pattern": f"cache:{pattern}:*"
        }
    except Exception as e:
        logger.error(f"Failed to clear cache pattern: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/health")
async def cache_health_check() -> dict[str, Any]:
    """Check cache system health"""
    
    try:
        client = await cache.get_client()
        await client.ping()
        
        return {
            "status": "healthy",
            "redis_connection": "active",
            "cache_system": "operational"
        }
    except Exception as e:
        logger.error(f"Cache health check failed: {e}")
        return {
            "status": "unhealthy", 
            "error": str(e),
            "redis_connection": "failed"
        }