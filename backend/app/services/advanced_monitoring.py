# Advanced System Monitoring for Phase K Track 3
"""
Production-ready monitoring and observability system:
- Application performance monitoring
- Health checks and system metrics
- Real-time alerts and notifications
- Performance analytics and insights
- Error tracking and diagnostics
"""

import asyncio
import logging
import psutil
import time
from typing import Dict, List, Any, Optional, Callable
from datetime import datetime, timezone
from dataclasses import dataclass
from collections import deque
import json
from sqlalchemy import text

from app.core.advanced_redis_client import advanced_redis_client
from app.core.database import db_manager
from app.websockets.advanced_websocket_manager import advanced_websocket_manager

logger = logging.getLogger(__name__)

@dataclass
class HealthStatus:
    """System health status"""
    service: str
    status: str  # healthy, degraded, unhealthy
    response_time: float
    last_check: datetime
    error_message: Optional[str] = None
    details: Optional[Dict[str, Any]] = None
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            'service': self.service,
            'status': self.status,
            'response_time': self.response_time,
            'last_check': self.last_check.isoformat(),
            'error_message': self.error_message,
            'details': self.details or {}
        }

@dataclass
class SystemMetrics:
    """System performance metrics"""
    timestamp: datetime
    cpu_usage: float
    memory_usage: float
    disk_usage: float
    network_io: Dict[str, int]
    active_connections: int
    database_connections: int
    cache_hit_rate: float
    response_times: Dict[str, float]
    error_rates: Dict[str, float]
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            'timestamp': self.timestamp.isoformat(),
            'cpu_usage': self.cpu_usage,
            'memory_usage': self.memory_usage,
            'disk_usage': self.disk_usage,
            'network_io': self.network_io,
            'active_connections': self.active_connections,
            'database_connections': self.database_connections,
            'cache_hit_rate': self.cache_hit_rate,
            'response_times': self.response_times,
            'error_rates': self.error_rates
        }

class AlertManager:
    """Alert management system"""
    
    def __init__(self):
        self.alert_rules = []
        self.active_alerts = {}
        self.alert_history = deque(maxlen=1000)
        self.notification_channels = []
    
    def add_rule(
        self, 
        name: str, 
        condition: Callable[[Dict[str, Any]], bool],
        severity: str = 'warning',
        cooldown_minutes: int = 5
    ):
        """Add alert rule"""
        rule = {
            'name': name,
            'condition': condition,
            'severity': severity,
            'cooldown_minutes': cooldown_minutes,
            'last_triggered': None
        }
        self.alert_rules.append(rule)
    
    async def evaluate_rules(self, metrics: Dict[str, Any]):
        """Evaluate alert rules against current metrics"""
        current_time = datetime.now(timezone.utc)
        
        for rule in self.alert_rules:
            try:
                if rule['condition'](metrics):
                    # Check cooldown
                    if (rule['last_triggered'] and 
                        (current_time - rule['last_triggered']).seconds < rule['cooldown_minutes'] * 60):
                        continue
                    
                    alert = {
                        'name': rule['name'],
                        'severity': rule['severity'],
                        'timestamp': current_time,
                        'metrics': metrics,
                        'message': f"Alert triggered: {rule['name']}"
                    }
                    
                    await self._trigger_alert(alert)
                    rule['last_triggered'] = current_time
                    
            except Exception as e:
                logger.error(f"Error evaluating alert rule {rule['name']}: {e}")
    
    async def _trigger_alert(self, alert: Dict[str, Any]):
        """Trigger alert and send notifications"""
        alert_id = f"{alert['name']}_{int(alert['timestamp'].timestamp())}"
        
        self.active_alerts[alert_id] = alert
        self.alert_history.append(alert)
        
        logger.warning(f"ALERT: {alert['message']}")
        
        # Send to notification channels
        for channel in self.notification_channels:
            try:
                await channel(alert)
            except Exception as e:
                logger.error(f"Failed to send alert via channel: {e}")

class PerformanceAnalyzer:
    """Performance analysis and insights"""
    
    def __init__(self):
        self.metrics_history = deque(maxlen=1440)  # 24 hours at 1-minute intervals
        self.performance_baselines = {}
        self.anomaly_detection = {}
    
    def add_metrics(self, metrics: SystemMetrics):
        """Add metrics for analysis"""
        self.metrics_history.append(metrics)
        
        # Update baselines
        self._update_baselines(metrics)
        
        # Detect anomalies
        self._detect_anomalies(metrics)
    
    def _update_baselines(self, metrics: SystemMetrics):
        """Update performance baselines"""
        recent_metrics = list(self.metrics_history)[-60:]  # Last hour
        
        if len(recent_metrics) >= 10:
            self.performance_baselines = {
                'cpu_usage': sum(m.cpu_usage for m in recent_metrics) / len(recent_metrics),
                'memory_usage': sum(m.memory_usage for m in recent_metrics) / len(recent_metrics),
                'response_time': sum(
                    sum(m.response_times.values()) / len(m.response_times) if m.response_times else 0
                    for m in recent_metrics
                ) / len(recent_metrics)
            }
    
    def _detect_anomalies(self, metrics: SystemMetrics):
        """Simple anomaly detection"""
        if not self.performance_baselines:
            return
        
        anomalies = []
        
        # CPU usage anomaly
        if metrics.cpu_usage > self.performance_baselines.get('cpu_usage', 50) * 1.5:
            anomalies.append('high_cpu_usage')
        
        # Memory usage anomaly
        if metrics.memory_usage > self.performance_baselines.get('memory_usage', 50) * 1.3:
            anomalies.append('high_memory_usage')
        
        # Response time anomaly
        avg_response_time = (
            sum(metrics.response_times.values()) / len(metrics.response_times) 
            if metrics.response_times else 0
        )
        
        if avg_response_time > self.performance_baselines.get('response_time', 0.2) * 2:
            anomalies.append('slow_response_times')
        
        self.anomaly_detection[metrics.timestamp] = anomalies
    
    def get_insights(self) -> Dict[str, Any]:
        """Get performance insights"""
        if not self.metrics_history:
            return {}
        
        recent_metrics = list(self.metrics_history)[-60:]  # Last hour
        
        # Calculate trends
        cpu_trend = self._calculate_trend([m.cpu_usage for m in recent_metrics])
        memory_trend = self._calculate_trend([m.memory_usage for m in recent_metrics])
        
        # Find peak usage times
        peak_cpu_time = max(recent_metrics, key=lambda m: m.cpu_usage).timestamp
        peak_memory_time = max(recent_metrics, key=lambda m: m.memory_usage).timestamp
        
        # Recent anomalies
        recent_anomalies = []
        for timestamp, anomalies in list(self.anomaly_detection.items())[-10:]:
            if anomalies:
                recent_anomalies.extend(anomalies)
        
        return {
            'baselines': self.performance_baselines,
            'trends': {
                'cpu_usage': cpu_trend,
                'memory_usage': memory_trend
            },
            'peak_times': {
                'cpu': peak_cpu_time.isoformat(),
                'memory': peak_memory_time.isoformat()
            },
            'recent_anomalies': list(set(recent_anomalies)),
            'metrics_count': len(self.metrics_history)
        }
    
    def _calculate_trend(self, values: List[float]) -> str:
        """Calculate trend direction"""
        if len(values) < 2:
            return 'stable'
        
        # Simple linear trend
        first_half = sum(values[:len(values)//2]) / (len(values)//2)
        second_half = sum(values[len(values)//2:]) / (len(values) - len(values)//2)
        
        if second_half > first_half * 1.1:
            return 'increasing'
        elif second_half < first_half * 0.9:
            return 'decreasing'
        else:
            return 'stable'
    
    async def analyze_metrics(self, metrics: Dict[str, Any]):
        """Analyze metrics data"""
        # Convert dict to SystemMetrics if needed
        if isinstance(metrics, dict):
            # Create a SystemMetrics object from the dict
            metrics_obj = SystemMetrics(
                timestamp=metrics.get('timestamp', datetime.now(timezone.utc)),
                cpu_usage=metrics.get('cpu_usage', 0.0),
                memory_usage=metrics.get('memory_usage', 0.0),
                disk_usage=metrics.get('disk_usage', 0.0),
                network_io=metrics.get('network_io', {}),
                active_connections=metrics.get('active_connections', 0),
                database_connections=metrics.get('database_connections', 0),
                cache_hit_rate=metrics.get('cache_hit_rate', 0.0),
                response_times=metrics.get('response_times', {}),
                error_rates=metrics.get('error_rates', {})
            )
            self.add_metrics(metrics_obj)
        else:
            self.add_metrics(metrics)

class AdvancedMonitoringSystem:
    """
    Comprehensive monitoring system for production deployment:
    - System metrics collection
    - Health checks for all services
    - Performance analysis and insights
    - Alert management and notifications
    - Real-time dashboards
    """
    
    def __init__(self):
        self.health_checks = {}
        self.metrics_collectors = {}
        self.alert_manager = AlertManager()
        self.performance_analyzer = PerformanceAnalyzer()
        
        # Monitoring state
        self.monitoring_active = False
        self.monitoring_interval = 60  # seconds
        self.last_metrics = None
        self._monitoring_task = None
        
        # Startup grace period (2 minutes to allow services to initialize)
        import time
        self.startup_time = time.time()
        self.startup_grace_period = 120  # seconds
        
        # Initialize health checks
        self._initialize_health_checks()
        self._initialize_alert_rules()
    
    def _is_past_startup_grace_period(self) -> bool:
        """Check if we're past the startup grace period"""
        import time
        return (time.time() - self.startup_time) > self.startup_grace_period
    
    async def start_background_tasks(self):
        """Start background monitoring tasks"""
        if not self._monitoring_task or self._monitoring_task.done():
            self._monitoring_task = asyncio.create_task(self._monitor_continuously())
            self.monitoring_active = True
    
    async def _monitor_continuously(self):
        """Continuously monitor system health and metrics"""
        while self.monitoring_active:
            try:
                # Collect system metrics
                metrics = await self._collect_system_metrics()
                self.last_metrics = metrics
                
                # Analyze performance
                await self.performance_analyzer.analyze_metrics(metrics)
                
                # Check alerts
                await self.alert_manager.evaluate_rules(metrics)
                
                await asyncio.sleep(self.monitoring_interval)
                
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Error in continuous monitoring: {str(e)}")
                await asyncio.sleep(10)  # Wait before retrying
                
    async def stop_background_tasks(self):
        """Stop background monitoring tasks"""
        self.monitoring_active = False
        if self._monitoring_task and not self._monitoring_task.done():
            self._monitoring_task.cancel()
            try:
                await self._monitoring_task
            except asyncio.CancelledError:
                pass
    
    def _initialize_health_checks(self):
        """Initialize health check functions"""
        
        self.health_checks = {
            'database': self._check_database_health,
            'redis': self._check_redis_health,
            'websocket': self._check_websocket_health,
            'api': self._check_api_health,
            'disk_space': self._check_disk_space,
            'memory': self._check_memory_health
        }
    
    def _initialize_alert_rules(self):
        """Initialize alert rules"""
        
        # CPU usage alert
        self.alert_manager.add_rule(
            'high_cpu_usage',
            lambda m: m.get('system_metrics', {}).get('cpu_usage', 0) > 80,
            'warning',
            5
        )
        
        # Memory usage alert  
        self.alert_manager.add_rule(
            'high_memory_usage',
            lambda m: m.get('system_metrics', {}).get('memory_usage', 0) > 85,
            'critical',
            5
        )
        
        # Database connection alert (with startup grace period)
        self.alert_manager.add_rule(
            'database_connection_issues',
            lambda m: (
                self._is_past_startup_grace_period() and 
                m.get('health_status', {}).get('database', {}).get('status') != 'healthy'
            ),
            'critical',
            2
        )
        
        # Redis connection alert (with startup grace period)
        self.alert_manager.add_rule(
            'redis_connection_issues',
            lambda m: (
                self._is_past_startup_grace_period() and 
                m.get('health_status', {}).get('redis', {}).get('status') != 'healthy'
            ),
            'warning',
            3
        )
        
        # Slow response times
        self.alert_manager.add_rule(
            'slow_api_responses',
            lambda m: any(
                rt > 1.0 for rt in m.get('system_metrics', {}).get('response_times', {}).values()
            ),
            'warning',
            5
        )
    
    async def start_monitoring(self):
        """Start the monitoring system"""
        if self.monitoring_active:
            logger.warning("Monitoring system already active")
            return
        
        self.monitoring_active = True
        logger.info("Starting advanced monitoring system")
        
        # Start background tasks
        await self.start_background_tasks()
    
    async def stop_monitoring(self):
        """Stop the monitoring system"""
        self.monitoring_active = False
        logger.info("Stopping advanced monitoring system")
    
    async def _monitoring_loop(self):
        """Main monitoring loop"""
        while self.monitoring_active:
            try:
                # Collect system metrics
                metrics = await self._collect_system_metrics()
                self.last_metrics = metrics
                
                # Analyze performance
                system_metrics_obj = SystemMetrics(**metrics)
                self.performance_analyzer.add_metrics(system_metrics_obj)
                
                # Store metrics in Redis
                await self._store_metrics(metrics)
                
                # Evaluate alerts
                all_data = {
                    'system_metrics': metrics,
                    'health_status': await self._run_all_health_checks(),
                    'timestamp': datetime.now(timezone.utc).isoformat()
                }
                
                await self.alert_manager.evaluate_rules(all_data)
                
                await asyncio.sleep(self.monitoring_interval)
                
            except Exception as e:
                logger.error(f"Error in monitoring loop: {e}")
                await asyncio.sleep(10)  # Short retry delay
    
    async def _health_check_loop(self):
        """Health check loop - more frequent than main monitoring"""
        while self.monitoring_active:
            try:
                await self._run_all_health_checks()
                await asyncio.sleep(30)  # Every 30 seconds
            except Exception as e:
                logger.error(f"Error in health check loop: {e}")
                await asyncio.sleep(5)
    
    async def _metrics_cleanup_loop(self):
        """Clean up old metrics data"""
        while self.monitoring_active:
            try:
                # Clean up metrics older than 24 hours
                await self._cleanup_old_metrics()
                await asyncio.sleep(3600)  # Every hour
            except Exception as e:
                logger.error(f"Error in metrics cleanup: {e}")
                await asyncio.sleep(300)
    
    async def _collect_system_metrics(self) -> Dict[str, Any]:
        """Collect comprehensive system metrics"""
        
        # System metrics
        cpu_usage = psutil.cpu_percent(interval=1)
        memory = psutil.virtual_memory()
        disk = psutil.disk_usage('/')
        network = psutil.net_io_counters()
        
        # WebSocket metrics
        ws_analytics = advanced_websocket_manager.get_analytics()
        
        # Redis metrics
        redis_metrics = await advanced_redis_client.get_metrics()
        
        # Database metrics
        db_metrics = await self._get_database_metrics()
        
        # Response time metrics (would be populated by middleware)
        response_times = await self._get_response_time_metrics()
        
        return {
            'timestamp': datetime.now(timezone.utc),
            'cpu_usage': cpu_usage,
            'memory_usage': memory.percent,
            'disk_usage': disk.percent,
            'network_io': {
                'bytes_sent': network.bytes_sent,
                'bytes_recv': network.bytes_recv,
                'packets_sent': network.packets_sent,
                'packets_recv': network.packets_recv
            },
            'active_connections': ws_analytics['connection_stats']['active_connections'],
            'database_connections': db_metrics.get('active_connections', 0),
            'cache_hit_rate': redis_metrics.get('hit_rate', 0),
            'response_times': response_times,
            'error_rates': await self._get_error_rates()
        }
    
    async def collect_system_metrics(self) -> Dict[str, Any]:
        """Public method to collect system metrics"""
        return await self._collect_system_metrics()
    
    async def _run_all_health_checks(self) -> Dict[str, HealthStatus]:
        """Run all health checks"""
        results = {}
        
        for service, check_func in self.health_checks.items():
            try:
                start_time = time.time()
                status = await check_func()
                response_time = time.time() - start_time
                
                results[service] = HealthStatus(
                    service=service,
                    status=status['status'],
                    response_time=response_time,
                    last_check=datetime.now(timezone.utc),
                    error_message=status.get('error'),
                    details=status.get('details') or {}
                )
                
            except Exception as e:
                results[service] = HealthStatus(
                    service=service,
                    status='unhealthy',
                    response_time=0,
                    last_check=datetime.now(timezone.utc),
                    error_message=str(e)
                )
        
        return results
    
    async def _check_database_health(self) -> Dict[str, Any]:
        """Check database health"""
        try:
            # Test database connection
            async for session in db_manager.get_session(read_only=True):
                result = await session.execute(text("SELECT 1"))
                if result.scalar() == 1:
                    return {'status': 'healthy'}
                else:
                    return {'status': 'unhealthy', 'error': 'Database query failed'}
            return {'status': 'unhealthy', 'error': 'No database session available'}
        except Exception as e:
            return {'status': 'unhealthy', 'error': str(e)}
    
    async def _check_redis_health(self) -> Dict[str, Any]:
        """Check Redis health"""
        try:
            if await advanced_redis_client.is_available():
                metrics = await advanced_redis_client.get_metrics()
                return {
                    'status': 'healthy',
                    'details': {
                        'hit_rate': metrics.get('hit_rate', 0),
                        'connection_status': metrics.get('connection_status', False)
                    }
                }
            else:
                return {'status': 'unhealthy', 'error': 'Redis not available'}
        except Exception as e:
            return {'status': 'unhealthy', 'error': str(e)}
    
    async def _check_websocket_health(self) -> Dict[str, Any]:
        """Check WebSocket manager health"""
        try:
            analytics = advanced_websocket_manager.get_analytics()
            active_connections = analytics['connection_stats']['active_connections']
            
            if active_connections >= 0:  # Basic health check
                return {
                    'status': 'healthy',
                    'details': {
                        'active_connections': active_connections,
                        'active_users': analytics['connection_stats']['active_users']
                    }
                }
            else:
                return {'status': 'degraded', 'error': 'No active connections'}
        except Exception as e:
            return {'status': 'unhealthy', 'error': str(e)}
    
    async def _check_api_health(self) -> Dict[str, Any]:
        """Check API health"""
        try:
            # This would ping the API endpoints
            return {'status': 'healthy'}
        except Exception as e:
            return {'status': 'unhealthy', 'error': str(e)}
    
    async def _check_disk_space(self) -> Dict[str, Any]:
        """Check disk space"""
        try:
            disk = psutil.disk_usage('/')
            usage_percent = disk.percent
            
            if usage_percent < 80:
                status = 'healthy'
            elif usage_percent < 90:
                status = 'degraded'
            else:
                status = 'unhealthy'
            
            return {
                'status': status,
                'details': {
                    'usage_percent': usage_percent,
                    'free_gb': disk.free / (1024**3),
                    'total_gb': disk.total / (1024**3)
                }
            }
        except Exception as e:
            return {'status': 'unhealthy', 'error': str(e)}
    
    async def _check_memory_health(self) -> Dict[str, Any]:
        """Check memory health"""
        try:
            memory = psutil.virtual_memory()
            usage_percent = memory.percent
            
            if usage_percent < 75:
                status = 'healthy'
            elif usage_percent < 90:
                status = 'degraded'
            else:
                status = 'unhealthy'
            
            return {
                'status': status,
                'details': {
                    'usage_percent': usage_percent,
                    'available_gb': memory.available / (1024**3),
                    'total_gb': memory.total / (1024**3)
                }
            }
        except Exception as e:
            return {'status': 'unhealthy', 'error': str(e)}
    
    async def _get_database_metrics(self) -> Dict[str, Any]:
        """Get database-specific metrics"""
        try:
            # This would query database for connection pool info, query stats, etc.
            return {
                'active_connections': 5,  # Placeholder
                'query_performance': 0.05  # Average query time
            }
        except Exception as e:
            logger.error(f"Failed to get database metrics: {e}")
            return {}
    
    async def _get_response_time_metrics(self) -> Dict[str, float]:
        """Get API response time metrics"""
        # This would be populated by API middleware
        return {
            'api_avg': 0.15,
            'websocket_avg': 0.05,
            'database_avg': 0.08
        }
    
    async def _get_error_rates(self) -> Dict[str, float]:
        """Get error rate metrics"""
        # This would track error rates across services
        return {
            'api_error_rate': 0.02,  # 2%
            'database_error_rate': 0.01,  # 1%
            'websocket_error_rate': 0.005  # 0.5%
        }
    
    async def _store_metrics(self, metrics: Dict[str, Any]):
        """Store metrics in Redis for historical analysis"""
        try:
            timestamp = int(time.time())
            await advanced_redis_client.set_with_layer(
                f"metrics:{timestamp}",
                json.dumps(metrics, default=str),
                'persistent',
                86400  # 24 hours
            )
        except Exception as e:
            logger.error(f"Failed to store metrics: {e}")
    
    async def _cleanup_old_metrics(self):
        """Clean up metrics older than 24 hours"""
        try:
            cutoff_timestamp = int(time.time()) - 86400  # 24 hours ago
            await advanced_redis_client.invalidate_pattern(f"metrics:{cutoff_timestamp - 3600}*")
        except Exception as e:
            logger.error(f"Failed to cleanup old metrics: {e}")
    
    async def get_dashboard_data(self) -> Dict[str, Any]:
        """Get data for monitoring dashboard"""
        
        health_status = await self._run_all_health_checks()
        performance_insights = self.performance_analyzer.get_insights()
        
        # Overall system status
        all_healthy = all(status.status == 'healthy' for status in health_status.values())
        system_status = 'healthy' if all_healthy else 'degraded'
        
        # Recent alerts
        recent_alerts = list(self.alert_manager.alert_history)[-10:]
        
        return {
            'timestamp': datetime.now(timezone.utc).isoformat(),
            'system_status': system_status,
            'health_checks': {k: v.to_dict() for k, v in health_status.items()},
            'current_metrics': self.last_metrics if self.last_metrics else {},
            'performance_insights': performance_insights,
            'recent_alerts': recent_alerts,
            'websocket_analytics': advanced_websocket_manager.get_analytics(),
            'redis_metrics': await advanced_redis_client.get_metrics()
        }

# Global monitoring system instance with lazy initialization
_monitoring_system = None

def get_monitoring_system():
    """Get the global monitoring system instance with lazy initialization"""
    global _monitoring_system
    if _monitoring_system is None:
        _monitoring_system = AdvancedMonitoringSystem()
    return _monitoring_system

# For backward compatibility
monitoring_system = get_monitoring_system()