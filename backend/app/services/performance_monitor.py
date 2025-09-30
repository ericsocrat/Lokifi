"""
Performance monitoring service for J4 Direct Messages.
"""

import asyncio
import logging
import time
import uuid
from collections import defaultdict, deque
from dataclasses import dataclass, field
from datetime import UTC, datetime, timedelta
from typing import Any

logger = logging.getLogger(__name__)


@dataclass
class PerformanceMetric:
    """Performance metric data point."""
    name: str
    value: float
    unit: str
    timestamp: datetime
    tags: dict[str, str] = field(default_factory=dict)


@dataclass
class HealthCheck:
    """Health check result."""
    service: str
    status: str  # "healthy", "degraded", "unhealthy"
    response_time_ms: float
    details: dict[str, Any] = field(default_factory=dict)
    timestamp: datetime = field(default_factory=lambda: datetime.now(UTC))


class PerformanceMonitor:
    """Monitor performance metrics for the messaging system."""
    
    def __init__(self):
        self.metrics: dict[str, deque] = defaultdict(lambda: deque(maxlen=1000))
        self.websocket_connections: dict[uuid.UUID, datetime] = {}
        self.message_latencies: deque = deque(maxlen=100)
        self.api_response_times: dict[str, deque] = defaultdict(lambda: deque(maxlen=100))
        
    def record_metric(self, name: str, value: float, unit: str = "", tags: dict[str, str] | None = None):
        """Record a performance metric."""
        metric = PerformanceMetric(
            name=name,
            value=value,
            unit=unit,
            timestamp=datetime.now(UTC),
            tags=tags or {}
        )
        self.metrics[name].append(metric)
    
    def record_api_response_time(self, endpoint: str, response_time_ms: float):
        """Record API endpoint response time."""
        self.api_response_times[endpoint].append(response_time_ms)
        self.record_metric(
            f"api_response_time_{endpoint.replace('/', '_')}",
            response_time_ms,
            "ms",
            {"endpoint": endpoint}
        )
    
    def record_websocket_connection(self, user_id: uuid.UUID):
        """Record WebSocket connection."""
        self.websocket_connections[user_id] = datetime.now(UTC)
        self.record_metric("websocket_connections", len(self.websocket_connections), "count")
    
    def record_websocket_disconnection(self, user_id: uuid.UUID):
        """Record WebSocket disconnection."""
        if user_id in self.websocket_connections:
            connection_time = datetime.now(UTC) - self.websocket_connections[user_id]
            self.record_metric("websocket_session_duration", connection_time.total_seconds(), "seconds")
            del self.websocket_connections[user_id]
        self.record_metric("websocket_connections", len(self.websocket_connections), "count")
    
    def record_message_latency(self, latency_ms: float):
        """Record message delivery latency."""
        self.message_latencies.append(latency_ms)
        self.record_metric("message_latency", latency_ms, "ms")
    
    def get_metrics_summary(self, minutes_back: int = 10) -> dict[str, Any]:
        """Get performance metrics summary for the last N minutes."""
        cutoff_time = datetime.now(UTC) - timedelta(minutes=minutes_back)
        
        summary = {
            "period_minutes": minutes_back,
            "websocket_connections": len(self.websocket_connections),
            "metrics": {}
        }
        
        for name, metric_deque in self.metrics.items():
            recent_metrics = [m for m in metric_deque if m.timestamp >= cutoff_time]
            if recent_metrics:
                values = [m.value for m in recent_metrics]
                summary["metrics"][name] = {
                    "count": len(values),
                    "avg": sum(values) / len(values),
                    "min": min(values),
                    "max": max(values),
                    "latest": values[-1] if values else 0,
                    "unit": recent_metrics[-1].unit if recent_metrics else ""
                }
        
        # Add derived metrics
        if self.message_latencies:
            latencies = list(self.message_latencies)
            summary["message_delivery"] = {
                "avg_latency_ms": sum(latencies) / len(latencies),
                "p95_latency_ms": sorted(latencies)[int(len(latencies) * 0.95)] if latencies else 0,
                "p99_latency_ms": sorted(latencies)[int(len(latencies) * 0.99)] if latencies else 0
            }
        
        return summary
    
    async def run_health_checks(self) -> list[HealthCheck]:
        """Run health checks for all services."""
        health_checks = []
        
        # Database health check
        db_start = time.time()
        try:
            # In a real implementation, this would test database connectivity
            await asyncio.sleep(0.01)  # Simulate DB query
            db_healthy = True
        except Exception as e:
            logger.error(f"Database health check failed: {e}")
            db_healthy = False
        
        db_time = (time.time() - db_start) * 1000
        health_checks.append(HealthCheck(
            service="database",
            status="healthy" if db_healthy else "unhealthy",
            response_time_ms=db_time,
            details={"connection_pool": "active" if db_healthy else "failed"}
        ))
        
        # Redis health check
        redis_start = time.time()
        try:
            # In a real implementation, this would test Redis connectivity
            await asyncio.sleep(0.005)  # Simulate Redis ping
            redis_healthy = True
        except Exception:
            redis_healthy = False
        
        redis_time = (time.time() - redis_start) * 1000
        health_checks.append(HealthCheck(
            service="redis",
            status="healthy" if redis_healthy else "unhealthy",
            response_time_ms=redis_time,
            details={"pub_sub": "active" if redis_healthy else "failed"}
        ))
        
        # WebSocket service health
        ws_connections = len(self.websocket_connections)
        health_checks.append(HealthCheck(
            service="websocket",
            status="healthy",
            response_time_ms=0,
            details={
                "active_connections": ws_connections,
                "status": "degraded" if ws_connections > 1000 else "healthy"
            }
        ))
        
        return health_checks
    
    def get_api_performance(self) -> dict[str, dict[str, float]]:
        """Get API endpoint performance statistics."""
        performance = {}
        
        for endpoint, response_times in self.api_response_times.items():
            if response_times:
                times = list(response_times)
                performance[endpoint] = {
                    "avg_response_time_ms": sum(times) / len(times),
                    "min_response_time_ms": min(times),
                    "max_response_time_ms": max(times),
                    "p95_response_time_ms": sorted(times)[int(len(times) * 0.95)] if times else 0,
                    "request_count": len(times)
                }
        
        return performance
    
    def get_websocket_stats(self) -> dict[str, Any]:
        """Get WebSocket connection statistics."""
        now = datetime.now(UTC)
        connection_ages = [(now - conn_time).total_seconds() 
                          for conn_time in self.websocket_connections.values()]
        
        return {
            "total_connections": len(self.websocket_connections),
            "avg_connection_age_seconds": sum(connection_ages) / len(connection_ages) if connection_ages else 0,
            "oldest_connection_seconds": max(connection_ages) if connection_ages else 0,
            "newest_connection_seconds": min(connection_ages) if connection_ages else 0
        }
    
    def check_system_alerts(self) -> list[dict[str, Any]]:
        """Check for system performance alerts."""
        alerts = []
        
        # High WebSocket connection count
        if len(self.websocket_connections) > 1000:
            alerts.append({
                "type": "high_websocket_connections",
                "severity": "warning",
                "message": f"High WebSocket connection count: {len(self.websocket_connections)}",
                "threshold": 1000,
                "current": len(self.websocket_connections)
            })
        
        # High message latency
        if self.message_latencies:
            avg_latency = sum(self.message_latencies) / len(self.message_latencies)
            if avg_latency > 1000:  # 1 second
                alerts.append({
                    "type": "high_message_latency",
                    "severity": "critical",
                    "message": f"High average message latency: {avg_latency:.2f}ms",
                    "threshold": 1000,
                    "current": avg_latency
                })
        
        # Slow API endpoints
        for endpoint, times in self.api_response_times.items():
            if times:
                avg_time = sum(times) / len(times)
                if avg_time > 2000:  # 2 seconds
                    alerts.append({
                        "type": "slow_api_endpoint",
                        "severity": "warning",
                        "message": f"Slow API endpoint {endpoint}: {avg_time:.2f}ms",
                        "endpoint": endpoint,
                        "threshold": 2000,
                        "current": avg_time
                    })
        
        return alerts


# Global performance monitor instance
performance_monitor = PerformanceMonitor()


class PerformanceMiddleware:
    """FastAPI middleware for performance monitoring."""
    
    def __init__(self, app):
        self.app = app
    
    async def __call__(self, scope, receive, send):
        if scope["type"] == "http":
            start_time = time.time()
            
            async def send_wrapper(message):
                if message["type"] == "http.response.start":
                    response_time = (time.time() - start_time) * 1000
                    endpoint = f"{scope['method']} {scope['path']}"
                    performance_monitor.record_api_response_time(endpoint, response_time)
                await send(message)
            
            await self.app(scope, receive, send_wrapper)
        else:
            await self.app(scope, receive, send)