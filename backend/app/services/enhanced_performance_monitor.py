"""
Enhanced Performance Monitoring System for J6.4 Quality Improvements
"""

import time
import psutil
import asyncio
import logging
from typing import Dict
from datetime import datetime, timezone
from collections import defaultdict, deque
from dataclasses import dataclass, field

logger = logging.getLogger(__name__)

@dataclass
class PerformanceMetrics:
    """Enhanced performance metrics with all required attributes"""
    # Response time metrics
    average_response_time: float = 0.0
    min_response_time: float = 0.0
    max_response_time: float = 0.0
    p95_response_time: float = 0.0
    
    # System metrics
    system_uptime: float = 100.0
    memory_usage_mb: float = 0.0
    cpu_usage_percent: float = 0.0
    
    # Error tracking
    error_count: int = 0
    total_requests: int = 0
    error_rate: float = 0.0
    
    # Throughput metrics
    requests_per_second: float = 0.0
    successful_deliveries: int = 0
    failed_deliveries: int = 0
    
    # Database metrics
    database_query_time_ms: float = 0.0
    database_connections: int = 0
    
    # WebSocket metrics
    websocket_connections: int = 0
    websocket_messages_sent: int = 0
    websocket_messages_received: int = 0
    
    # Cache metrics
    cache_hit_rate: float = 0.0
    cache_miss_rate: float = 0.0
    
    # Additional quality metrics
    availability_percent: float = 100.0
    last_updated: datetime = field(default_factory=lambda: datetime.now(timezone.utc))

class EnhancedPerformanceMonitor:
    """Enhanced performance monitoring for system quality tracking"""
    
    def __init__(self):
        self.start_time = time.time()
        self.response_times = deque(maxlen=1000)  # Last 1000 requests
        self.error_count = 0
        self.total_requests = 0
        self.endpoint_metrics = defaultdict(list)
        self.system_metrics_history = deque(maxlen=100)  # Last 100 data points
        
        # WebSocket tracking
        self.websocket_connections = 0
        self.websocket_messages = {"sent": 0, "received": 0}
        
        # Database tracking
        self.database_queries = deque(maxlen=100)
        self.database_connections = 0
        
        # Cache tracking
        self.cache_hits = 0
        self.cache_misses = 0
        
    def track_request_start(self, endpoint: str) -> float:
        """Track the start of a request"""
        return time.time()
    
    def track_request_end(self, endpoint: str, start_time: float, success: bool = True):
        """Track the end of a request"""
        duration = time.time() - start_time
        self.response_times.append(duration)
        self.endpoint_metrics[endpoint].append(duration)
        
        self.total_requests += 1
        if not success:
            self.error_count += 1
    
    def track_database_query(self, duration_ms: float):
        """Track database query performance"""
        self.database_queries.append(duration_ms)
    
    def track_websocket_connection(self, connected: bool):
        """Track WebSocket connection changes"""
        if connected:
            self.websocket_connections += 1
        else:
            self.websocket_connections = max(0, self.websocket_connections - 1)
    
    def track_websocket_message(self, sent: bool = True):
        """Track WebSocket message"""
        if sent:
            self.websocket_messages["sent"] += 1
        else:
            self.websocket_messages["received"] += 1
    
    def track_cache_operation(self, hit: bool):
        """Track cache hit/miss"""
        if hit:
            self.cache_hits += 1
        else:
            self.cache_misses += 1
    
    def get_current_metrics(self) -> PerformanceMetrics:
        """Get current performance metrics"""
        try:
            # Response time calculations
            response_times_list = list(self.response_times)
            avg_response_time = sum(response_times_list) / len(response_times_list) if response_times_list else 0
            min_response_time = min(response_times_list) if response_times_list else 0
            max_response_time = max(response_times_list) if response_times_list else 0
            
            # Calculate 95th percentile
            if response_times_list:
                sorted_times = sorted(response_times_list)
                p95_index = int(0.95 * len(sorted_times))
                p95_response_time = sorted_times[p95_index] if p95_index < len(sorted_times) else max_response_time
            else:
                p95_response_time = 0
            
            # System metrics
            memory_usage = psutil.virtual_memory().used / (1024 * 1024)  # MB
            cpu_usage = psutil.cpu_percent(interval=None)
            uptime = time.time() - self.start_time
            
            # Error rate
            error_rate = (self.error_count / self.total_requests * 100) if self.total_requests > 0 else 0
            
            # Throughput (requests per second over last minute)
            recent_requests = min(self.total_requests, 60)  # Approximate
            requests_per_second = recent_requests / 60 if recent_requests > 0 else 0
            
            # Database metrics
            db_queries_list = list(self.database_queries)
            avg_db_time = sum(db_queries_list) / len(db_queries_list) if db_queries_list else 0
            
            # Cache metrics
            total_cache_ops = self.cache_hits + self.cache_misses
            cache_hit_rate = (self.cache_hits / total_cache_ops * 100) if total_cache_ops > 0 else 0
            cache_miss_rate = (self.cache_misses / total_cache_ops * 100) if total_cache_ops > 0 else 0
            
            # Availability (simplified calculation)
            availability = 100 - error_rate if error_rate < 100 else 0
            
            return PerformanceMetrics(
                average_response_time=round(avg_response_time * 1000, 2),  # Convert to ms
                min_response_time=round(min_response_time * 1000, 2),
                max_response_time=round(max_response_time * 1000, 2),
                p95_response_time=round(p95_response_time * 1000, 2),
                system_uptime=round(uptime, 2),
                memory_usage_mb=round(memory_usage, 2),
                cpu_usage_percent=round(cpu_usage, 2),
                error_count=self.error_count,
                total_requests=self.total_requests,
                error_rate=round(error_rate, 2),
                requests_per_second=round(requests_per_second, 2),
                successful_deliveries=self.total_requests - self.error_count,
                failed_deliveries=self.error_count,
                database_query_time_ms=round(avg_db_time, 2),
                database_connections=self.database_connections,
                websocket_connections=self.websocket_connections,
                websocket_messages_sent=self.websocket_messages["sent"],
                websocket_messages_received=self.websocket_messages["received"],
                cache_hit_rate=round(cache_hit_rate, 2),
                cache_miss_rate=round(cache_miss_rate, 2),
                availability_percent=round(availability, 2)
            )
            
        except Exception as e:
            logger.error(f"Failed to collect performance metrics: {e}")
            return PerformanceMetrics()  # Return default metrics
    
    def get_endpoint_metrics(self, endpoint: str) -> Dict[str, float]:
        """Get metrics for a specific endpoint"""
        endpoint_times = self.endpoint_metrics.get(endpoint, [])
        if not endpoint_times:
            return {"avg": 0, "min": 0, "max": 0, "count": 0}
        
        return {
            "avg": sum(endpoint_times) / len(endpoint_times) * 1000,  # ms
            "min": min(endpoint_times) * 1000,
            "max": max(endpoint_times) * 1000,
            "count": len(endpoint_times)
        }
    
    def get_system_health_score(self) -> float:
        """Calculate overall system health score"""
        try:
            metrics = self.get_current_metrics()
            
            # Health score components (0-100 each)
            scores = []
            
            # Response time score (lower is better)
            if metrics.average_response_time < 50:
                response_score = 100
            elif metrics.average_response_time < 100:
                response_score = 90
            elif metrics.average_response_time < 200:
                response_score = 80
            elif metrics.average_response_time < 500:
                response_score = 60
            else:
                response_score = 40
            scores.append(response_score)
            
            # Error rate score (lower is better)
            error_score = max(0, 100 - metrics.error_rate * 10)
            scores.append(error_score)
            
            # Memory usage score (lower is better, assume 1GB limit)
            memory_score = max(0, 100 - (metrics.memory_usage_mb / 1024 * 100))
            scores.append(memory_score)
            
            # CPU usage score (lower is better)
            cpu_score = max(0, 100 - metrics.cpu_usage_percent)
            scores.append(cpu_score)
            
            # Availability score
            scores.append(metrics.availability_percent)
            
            # Calculate weighted average
            return sum(scores) / len(scores)
            
        except Exception as e:
            logger.error(f"Failed to calculate health score: {e}")
            return 0.0
    
    async def start_monitoring(self):
        """Start background monitoring task"""
        try:
            while True:
                # Collect system metrics every 30 seconds
                metrics = self.get_current_metrics()
                self.system_metrics_history.append(metrics)
                
                # Log system health periodically
                health_score = self.get_system_health_score()
                if len(self.system_metrics_history) % 10 == 0:  # Every 5 minutes
                    logger.info(f"System Health Score: {health_score:.1f}%")
                
                await asyncio.sleep(30)
                
        except Exception as e:
            logger.error(f"Monitoring task failed: {e}")

# Global performance monitor instance
enhanced_performance_monitor = EnhancedPerformanceMonitor()

# Convenience functions
def track_request_start(endpoint: str) -> float:
    """Track request start"""
    return enhanced_performance_monitor.track_request_start(endpoint)

def track_request_end(endpoint: str, start_time: float, success: bool = True):
    """Track request end"""
    enhanced_performance_monitor.track_request_end(endpoint, start_time, success)

def get_current_metrics() -> PerformanceMetrics:
    """Get current performance metrics"""
    return enhanced_performance_monitor.get_current_metrics()

def get_system_health_score() -> float:
    """Get system health score"""
    return enhanced_performance_monitor.get_system_health_score()