# Advanced Monitoring API Endpoints
"""
RESTful API endpoints for monitoring and observability:
- System health and status
- Performance metrics and analytics
- Real-time WebSocket statistics
- Cache and database metrics
- Alert management
"""

__all__ = ["router"]

from fastapi import APIRouter, Depends, HTTPException, Query

from app.core.advanced_redis_client import advanced_redis_client
from app.core.query_cache import get_cache_stats, invalidate_cache_pattern  # Phase 4a-4
from app.core.security import get_current_user
from app.services.advanced_monitoring import monitoring_system
from app.websockets.advanced_websocket_manager import advanced_websocket_manager

router = APIRouter(prefix="/api/v1/monitoring", tags=["monitoring"])


@router.get("/health")
async def get_system_health():
    """Get comprehensive system health status"""
    try:
        dashboard_data = await monitoring_system.get_dashboard_data()

        return {
            "status": "success",
            "data": {
                "system_status": dashboard_data["system_status"],
                "health_checks": dashboard_data["health_checks"],
                "timestamp": dashboard_data["timestamp"],
            },
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get health status: {e}")


@router.get("/health/{service}")
async def get_service_health(service: str):
    """Get health status for specific service"""
    try:
        all_health = await monitoring_system._run_all_health_checks()

        if service not in all_health:
            raise HTTPException(
                status_code=404, detail=f"Service '{service}' not found"
            )

        return {"status": "success", "data": all_health[service].to_dict()}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to get service health: {e}"
        )


@router.get("/metrics")
async def get_system_metrics(
    minutes: int = Query(60, description="Minutes of historical data", ge=1, le=1440),
):
    """Get system performance metrics"""
    try:
        dashboard_data = await monitoring_system.get_dashboard_data()

        return {
            "status": "success",
            "data": {
                "current_metrics": dashboard_data["current_metrics"],
                "performance_insights": dashboard_data["performance_insights"],
                "timestamp": dashboard_data["timestamp"],
            },
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get metrics: {e}")


@router.get("/websocket/analytics")
async def get_websocket_analytics():
    """Get WebSocket connection analytics"""
    try:
        analytics = advanced_websocket_manager.get_analytics()

        return {"status": "success", "data": analytics}
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to get WebSocket analytics: {e}"
        )


@router.get("/websocket/connections")
async def get_active_connections(current_user: dict = Depends(get_current_user)):
    """Get active WebSocket connections (admin only)"""
    try:
        # Check if user is admin
        if current_user.get("handle") != "admin":
            raise HTTPException(status_code=403, detail="Admin access required")

        connections_stats = advanced_websocket_manager.connection_pool.get_stats()

        # Get detailed connection info (without websocket objects)
        connections_detail = []
        for (
            conn_id,
            conn_info,
        ) in advanced_websocket_manager.connection_pool.connections.items():
            connections_detail.append(
                {
                    "connection_id": conn_id,
                    "user_id": conn_info.user_id,
                    "connected_at": conn_info.metrics.connected_at.isoformat(),
                    "last_activity": conn_info.metrics.last_activity.isoformat(),
                    "messages_sent": conn_info.metrics.messages_sent,
                    "messages_received": conn_info.metrics.messages_received,
                    "rooms": list(conn_info.rooms),
                    "subscriptions": list(conn_info.subscriptions),
                }
            )

        return {
            "status": "success",
            "data": {
                "statistics": connections_stats,
                "connections": connections_detail,
            },
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get connections: {e}")


@router.get("/cache/metrics")
async def get_cache_metrics():
    """Get comprehensive cache performance metrics (Redis + Query Cache)"""
    try:
        # Get Redis cache metrics
        redis_metrics = await advanced_redis_client.get_metrics()

        # Get dogpile query cache metrics (Phase 4a-4) - ASYNC!
        query_cache_stats = await get_cache_stats()

        # Calculate cache hit rates (using correct keys from get_cache_stats)
        query_total = (
            query_cache_stats["total_hits"] + query_cache_stats["total_misses"]
        )
        query_hit_rate = (
            (query_cache_stats["total_hits"] / query_total * 100)
            if query_total > 0
            else 0.0
        )

        # Per-region hit rates
        region_hit_rates = {}
        for region_name, region_stats in query_cache_stats.get("by_region", {}).items():
            region_total = region_stats["hits"] + region_stats["misses"]
            region_hit_rates[region_name] = (
                (region_stats["hits"] / region_total * 100) if region_total > 0 else 0.0
            )

        # Combine metrics
        combined_metrics = {
            "redis": redis_metrics,
            "query_cache": {
                "stats": query_cache_stats,
                "hit_rate_percentage": round(query_hit_rate, 2),
                "region_hit_rates": {
                    k: round(v, 2) for k, v in region_hit_rates.items()
                },
                "total_queries": query_total,
                "cache_effectiveness": (
                    "excellent"
                    if query_hit_rate >= 80
                    else (
                        "good"
                        if query_hit_rate >= 60
                        else "moderate" if query_hit_rate >= 40 else "needs_improvement"
                    )
                ),
            },
        }

        return {"status": "success", "data": combined_metrics}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get cache metrics: {e}")


@router.post("/cache/invalidate")
async def invalidate_cache(
    pattern: str = Query(..., description="Cache key pattern to invalidate"),
    layer: str | None = Query(None, description="Specific cache layer"),
    current_user: dict = Depends(get_current_user),
):
    """Invalidate cache keys matching pattern (admin only) - Both Redis & Query Cache"""
    try:
        # Check if user is admin
        if current_user.get("handle") != "admin":
            raise HTTPException(status_code=403, detail="Admin access required")

        # Invalidate Redis cache
        redis_count = await advanced_redis_client.invalidate_pattern(pattern, layer)

        # Invalidate dogpile query cache (Phase 4a-4) - ASYNC!
        query_cache_result = await invalidate_cache_pattern(pattern)

        return {
            "status": "success",
            "data": {
                "pattern": pattern,
                "layer": layer,
                "redis_invalidated_count": redis_count,
                "query_cache_result": query_cache_result,
                "message": f"Invalidated {redis_count} Redis keys and query cache pattern '{pattern}'",
            },
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to invalidate cache: {e}")


@router.get("/alerts")
async def get_alerts(
    active_only: bool = False,
    limit: int = 100,
    current_user: dict = Depends(get_current_user),
):
    """Get system alerts

    Args:
        active_only: Show only active alerts (default: False)
        limit: Maximum number of alerts (default: 100, min: 1, max: 1000)
        current_user: Current authenticated user
    """
    try:
        # Check if user is admin
        if current_user.get("handle") != "admin":
            raise HTTPException(status_code=403, detail="Admin access required")

        alert_manager = monitoring_system.alert_manager

        if active_only:
            alerts = list(alert_manager.active_alerts.values())
        else:
            # Return alert history (which includes both active and resolved alerts)
            alerts = list(alert_manager.alert_history)[-limit:]

        return {
            "status": "success",
            "data": {
                "alerts": alerts,
                "active_count": len(alert_manager.active_alerts),
                "total_count": len(alert_manager.alert_history),
            },
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get alerts: {e}")


@router.get("/dashboard")
async def get_monitoring_dashboard():
    """Get comprehensive monitoring dashboard data"""
    try:
        dashboard_data = await monitoring_system.get_dashboard_data()

        return {"status": "success", "data": dashboard_data}
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to get dashboard data: {e}"
        )


@router.get("/performance/insights")
async def get_performance_insights():
    """Get performance analysis and insights"""
    try:
        insights = monitoring_system.performance_analyzer.get_insights()

        return {"status": "success", "data": insights}
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to get performance insights: {e}"
        )


@router.post("/monitoring/start")
async def start_monitoring(current_user: dict = Depends(get_current_user)):
    """Start the monitoring system (admin only)"""
    try:
        # Check if user is admin
        if current_user.get("handle") != "admin":
            raise HTTPException(status_code=403, detail="Admin access required")

        await monitoring_system.start_monitoring()

        return {"status": "success", "message": "Monitoring system started"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to start monitoring: {e}")


@router.post("/monitoring/stop")
async def stop_monitoring(current_user: dict = Depends(get_current_user)):
    """Stop the monitoring system (admin only)"""
    try:
        # Check if user is admin
        if current_user.get("handle") != "admin":
            raise HTTPException(status_code=403, detail="Admin access required")

        await monitoring_system.stop_monitoring()

        return {"status": "success", "message": "Monitoring system stopped"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to stop monitoring: {e}")


@router.get("/status")
async def get_monitoring_status():
    """Get monitoring system status"""
    try:
        return {
            "status": "success",
            "data": {
                "monitoring_active": monitoring_system.monitoring_active,
                "monitoring_interval": monitoring_system.monitoring_interval,
                "health_checks_count": len(monitoring_system.health_checks),
                "alert_rules_count": len(monitoring_system.alert_manager.alert_rules),
                "last_check": (
                    monitoring_system.last_metrics.timestamp.isoformat()
                    if monitoring_system.last_metrics
                    else None
                ),
            },
        }
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to get monitoring status: {e}"
        )


# Load testing endpoint for performance validation
@router.get("/load-test/websocket")
async def websocket_load_test(
    connections: int = Query(
        100, description="Number of test connections", ge=1, le=1000
    ),
    duration: int = Query(60, description="Test duration in seconds", ge=10, le=300),
    current_user: dict = Depends(get_current_user),
):
    """Run WebSocket load test (admin only)"""
    try:
        # Check if user is admin
        if current_user.get("handle") != "admin":
            raise HTTPException(status_code=403, detail="Admin access required")

        # This would implement a load test
        # For now, return simulated results

        return {
            "status": "success",
            "data": {
                "test_type": "websocket_load_test",
                "parameters": {"connections": connections, "duration": duration},
                "results": {
                    "connections_established": connections,
                    "messages_sent": connections * 10,
                    "avg_response_time": 0.05,
                    "success_rate": 99.5,
                    "peak_memory_usage": 512,  # MB
                    "cpu_usage_peak": 45.2,
                },
                "status": "simulated_results",
            },
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to run load test: {e}")


# Real-time metrics WebSocket endpoint would be implemented separately
# in the WebSocket module for streaming live metrics to dashboards
