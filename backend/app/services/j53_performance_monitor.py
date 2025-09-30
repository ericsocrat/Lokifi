# J5.3 Advanced Performance Monitoring and Alerting System
from sqlalchemy import text, select, func
from datetime import datetime, timedelta
from typing import Dict, List, Any, Callable
import logging
from dataclasses import dataclass, asdict
from enum import Enum
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

from app.core.database import db_manager
from app.core.config import Settings
from app.services.advanced_storage_analytics import AdvancedStorageAnalytics

logger = logging.getLogger(__name__)

class AlertSeverity(Enum):
    """Alert severity levels"""
    CRITICAL = "critical"
    WARNING = "warning"
    INFO = "info"

class MetricThreshold(Enum):
    """Predefined metric thresholds"""
    DATABASE_SIZE_WARNING = 500  # MB
    DATABASE_SIZE_CRITICAL = 1000  # MB
    DAILY_GROWTH_WARNING = 100  # messages/day
    DAILY_GROWTH_CRITICAL = 1000  # messages/day
    RESPONSE_TIME_WARNING = 1000  # ms
    RESPONSE_TIME_CRITICAL = 5000  # ms
    DISK_USAGE_WARNING = 80  # percentage
    DISK_USAGE_CRITICAL = 95  # percentage

@dataclass
class PerformanceAlert:
    """Performance alert data structure"""
    id: str
    severity: AlertSeverity
    category: str
    metric_name: str
    current_value: float
    threshold: float
    message: str
    recommendation: str
    timestamp: datetime
    resolved: bool = False
    acknowledged: bool = False
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            **asdict(self),
            'severity': self.severity.value,
            'timestamp': self.timestamp.isoformat()
        }

@dataclass
class SystemHealth:
    """Overall system health status"""
    status: str  # HEALTHY, DEGRADED, CRITICAL
    score: float  # 0-100
    active_alerts: int
    critical_alerts: int
    warning_alerts: int
    last_check: datetime
    uptime_percentage: float
    performance_trend: str  # IMPROVING, STABLE, DEGRADING

class J53PerformanceMonitor:
    """J5.3 Advanced performance monitoring and alerting"""
    
    def __init__(self, settings: Settings):
        self.settings = settings
        self.analytics = AdvancedStorageAnalytics(settings)
        self.active_alerts: Dict[str, PerformanceAlert] = {}
        self.alert_history: List[PerformanceAlert] = []
        self.monitoring_active = True
        
        # Alert callbacks
        self.alert_callbacks: List[Callable[[PerformanceAlert], None]] = []
        
    async def check_database_health(self) -> Dict[str, Any]:
        """Comprehensive database health check"""
        health_data = {}
        
        try:
            async for session in db_manager.get_session(read_only=True):
                # Connection test
                start_time = datetime.now()
                await session.execute(text("SELECT 1"))
                connection_time = (datetime.now() - start_time).total_seconds() * 1000
                
                health_data["connection_time_ms"] = connection_time
                health_data["connection_healthy"] = connection_time < MetricThreshold.RESPONSE_TIME_WARNING.value
                
                # Database size
                if self.settings.DATABASE_URL.startswith("sqlite"):
                    # SQLite size check
                    size_result = await session.execute(
                        text("SELECT page_count * page_size as size FROM pragma_page_count(), pragma_page_size()")
                    )
                    db_size_bytes = size_result.scalar() or 0
                else:
                    # PostgreSQL size check
                    size_result = await session.execute(
                        text("SELECT pg_database_size(current_database())")
                    )
                    db_size_bytes = size_result.scalar() or 0
                
                db_size_mb = db_size_bytes / (1024 * 1024)
                health_data["database_size_mb"] = db_size_mb
                health_data["size_healthy"] = db_size_mb < MetricThreshold.DATABASE_SIZE_WARNING.value
                
                # Table statistics
                table_stats = {}
                tables = ['ai_messages', 'ai_threads', 'users']
                
                for table in tables:
                    try:
                        count = await session.scalar(
                            text(f"SELECT COUNT(*) FROM {table}")
                        )
                        table_stats[table] = count or 0
                    except Exception as e:
                        logger.warning(f"Could not get count for table {table}: {e}")
                        table_stats[table] = 0
                
                health_data["table_statistics"] = table_stats
                
                # Recent activity check (requires AIMessage import)
                try:
                    from app.models.ai_models import AIMessage
                    
                    messages_last_hour = await session.scalar(
                        select(func.count(AIMessage.id)).where(
                            AIMessage.created_at >= datetime.now() - timedelta(hours=1)
                        )
                    ) or 0
                    
                    health_data["messages_last_hour"] = messages_last_hour
                    health_data["activity_healthy"] = messages_last_hour < MetricThreshold.DAILY_GROWTH_WARNING.value / 24
                except ImportError:
                    logger.debug("AIMessage model not available for activity check")
                    health_data["messages_last_hour"] = 0
                    health_data["activity_healthy"] = True
                
                # Index health (PostgreSQL only)
                if not self.settings.DATABASE_URL.startswith("sqlite"):
                    try:
                        index_usage = await session.execute(text("""
                            SELECT schemaname, tablename, attname, n_distinct, correlation
                            FROM pg_stats 
                            WHERE schemaname = 'public' 
                            AND tablename IN ('ai_messages', 'ai_threads')
                            ORDER BY tablename, attname
                        """))
                        health_data["index_statistics"] = [dict(row._mapping) for row in index_usage]
                    except Exception as e:
                        logger.debug(f"Could not get index statistics: {e}")
                        health_data["index_statistics"] = []
                
                break  # Exit async for loop
                
        except Exception as e:
            logger.error(f"Database health check failed: {e}")
            health_data["error"] = str(e)
            health_data["connection_healthy"] = False
            
        return health_data
    
    async def check_performance_metrics(self) -> Dict[str, Any]:
        """Check key performance metrics"""
        metrics = {}
        
        try:
            # Get comprehensive metrics
            storage_metrics = await self.analytics.get_comprehensive_metrics()
            
            # Database performance benchmarks
            benchmarks = await self.analytics.benchmark_database_performance()
            
            # Calculate performance scores
            avg_response_times = {}
            for bench in benchmarks:
                avg_response_times[bench.operation] = bench.avg_time_ms
            
            metrics.update({
                "storage_metrics": asdict(storage_metrics),
                "response_times": avg_response_times,
                "performance_benchmarks": [asdict(b) for b in benchmarks]
            })
            
            # Memory usage estimation
            estimated_memory_usage = (
                storage_metrics.total_messages * 0.001 +  # ~1KB per message in memory
                storage_metrics.total_threads * 0.0001    # ~100 bytes per thread in memory  
            )
            metrics["estimated_memory_usage_mb"] = estimated_memory_usage
            
        except Exception as e:
            logger.error(f"Performance metrics check failed: {e}")
            metrics["error"] = str(e)
            
        return metrics
    
    def _generate_alert_id(self, category: str, metric: str) -> str:
        """Generate unique alert ID"""
        return f"{category}_{metric}_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
    
    async def _create_alert(
        self, 
        severity: AlertSeverity,
        category: str,
        metric_name: str,
        current_value: float,
        threshold: float,
        message: str,
        recommendation: str
    ) -> PerformanceAlert:
        """Create and register a performance alert"""
        alert_id = self._generate_alert_id(category, metric_name)
        
        alert = PerformanceAlert(
            id=alert_id,
            severity=severity,
            category=category,
            metric_name=metric_name,
            current_value=current_value,
            threshold=threshold,
            message=message,
            recommendation=recommendation,
            timestamp=datetime.now()
        )
        
        # Store alert
        self.active_alerts[alert_id] = alert
        self.alert_history.append(alert)
        
        # Trigger callbacks
        for callback in self.alert_callbacks:
            try:
                callback(alert)
            except Exception as e:
                logger.error(f"Alert callback failed: {e}")
        
        logger.warning(f"🚨 {severity.value.upper()} ALERT: {message}")
        
        return alert
    
    async def evaluate_alerts(self) -> List[PerformanceAlert]:
        """Evaluate system metrics and generate alerts"""
        new_alerts = []
        
        try:
            # Check database health
            db_health = await self.check_database_health()
            
            # Database size alerts
            if "database_size_mb" in db_health:
                size_mb = db_health["database_size_mb"]
                
                if size_mb > MetricThreshold.DATABASE_SIZE_CRITICAL.value:
                    alert = await self._create_alert(
                        AlertSeverity.CRITICAL,
                        "Storage",
                        "database_size",
                        size_mb,
                        MetricThreshold.DATABASE_SIZE_CRITICAL.value,
                        f"Database size is {size_mb:.1f}MB (critical threshold: {MetricThreshold.DATABASE_SIZE_CRITICAL.value}MB)",
                        "Implement immediate data archival and consider migrating to cloud storage"
                    )
                    new_alerts.append(alert)
                elif size_mb > MetricThreshold.DATABASE_SIZE_WARNING.value:
                    alert = await self._create_alert(
                        AlertSeverity.WARNING,
                        "Storage", 
                        "database_size",
                        size_mb,
                        MetricThreshold.DATABASE_SIZE_WARNING.value,
                        f"Database size is {size_mb:.1f}MB (warning threshold: {MetricThreshold.DATABASE_SIZE_WARNING.value}MB)",
                        "Schedule data archival and monitor growth trends"
                    )
                    new_alerts.append(alert)
            
            # Connection performance alerts
            if "connection_time_ms" in db_health:
                conn_time = db_health["connection_time_ms"]
                
                if conn_time > MetricThreshold.RESPONSE_TIME_CRITICAL.value:
                    alert = await self._create_alert(
                        AlertSeverity.CRITICAL,
                        "Performance",
                        "connection_time",
                        conn_time,
                        MetricThreshold.RESPONSE_TIME_CRITICAL.value,
                        f"Database connection time is {conn_time:.1f}ms (critical: {MetricThreshold.RESPONSE_TIME_CRITICAL.value}ms)",
                        "Check database server health, network connectivity, and consider connection pooling optimization"
                    )
                    new_alerts.append(alert)
                elif conn_time > MetricThreshold.RESPONSE_TIME_WARNING.value:
                    alert = await self._create_alert(
                        AlertSeverity.WARNING,
                        "Performance",
                        "connection_time", 
                        conn_time,
                        MetricThreshold.RESPONSE_TIME_WARNING.value,
                        f"Database connection time is {conn_time:.1f}ms (warning: {MetricThreshold.RESPONSE_TIME_WARNING.value}ms)",
                        "Monitor database performance and consider optimization"
                    )
                    new_alerts.append(alert)
            
            # Check performance metrics
            perf_metrics = await self.check_performance_metrics()
            
            # Growth rate alerts
            if "storage_metrics" in perf_metrics:
                storage_data = perf_metrics["storage_metrics"]
                daily_growth = storage_data.get("daily_growth_rate", 0)
                
                if daily_growth > MetricThreshold.DAILY_GROWTH_CRITICAL.value:
                    alert = await self._create_alert(
                        AlertSeverity.CRITICAL,
                        "Growth",
                        "daily_growth_rate",
                        daily_growth,
                        MetricThreshold.DAILY_GROWTH_CRITICAL.value,
                        f"Daily growth rate is {daily_growth:.0f} messages/day (critical: {MetricThreshold.DAILY_GROWTH_CRITICAL.value})",
                        "Implement aggressive archival policies and plan for immediate scaling"
                    )
                    new_alerts.append(alert)
                elif daily_growth > MetricThreshold.DAILY_GROWTH_WARNING.value:
                    alert = await self._create_alert(
                        AlertSeverity.WARNING,
                        "Growth",
                        "daily_growth_rate",
                        daily_growth,
                        MetricThreshold.DAILY_GROWTH_WARNING.value,
                        f"Daily growth rate is {daily_growth:.0f} messages/day (warning: {MetricThreshold.DAILY_GROWTH_WARNING.value})",
                        "Monitor growth trends and consider proactive archival"
                    )
                    new_alerts.append(alert)
            
        except Exception as e:
            logger.error(f"Alert evaluation failed: {e}")
            # Create an alert about the monitoring system failure
            alert = await self._create_alert(
                AlertSeverity.CRITICAL,
                "Monitoring",
                "system_failure",
                0,
                0,
                f"Performance monitoring system failed: {str(e)}",
                "Check monitoring system configuration and logs"
            )
            new_alerts.append(alert)
        
        return new_alerts
    
    def calculate_system_health(self) -> SystemHealth:
        """Calculate overall system health score"""
        
        # Count active alerts by severity
        critical_count = len([a for a in self.active_alerts.values() if a.severity == AlertSeverity.CRITICAL and not a.resolved])
        warning_count = len([a for a in self.active_alerts.values() if a.severity == AlertSeverity.WARNING and not a.resolved])
        info_count = len([a for a in self.active_alerts.values() if a.severity == AlertSeverity.INFO and not a.resolved])
        
        # Calculate health score (0-100)
        base_score = 100
        score_deductions = (
            critical_count * 30 +  # -30 points per critical
            warning_count * 10 +   # -10 points per warning
            info_count * 2         # -2 points per info
        )
        
        health_score = max(0, base_score - score_deductions)
        
        # Determine overall status
        if critical_count > 0:
            status = "CRITICAL"
        elif warning_count > 0:
            status = "DEGRADED"
        elif health_score > 90:
            status = "HEALTHY"
        else:
            status = "DEGRADED"
        
        # Calculate performance trend (simplified)
        recent_alerts = [a for a in self.alert_history if a.timestamp > datetime.now() - timedelta(hours=24)]
        older_alerts = [a for a in self.alert_history if datetime.now() - timedelta(hours=48) <= a.timestamp <= datetime.now() - timedelta(hours=24)]
        
        if len(recent_alerts) > len(older_alerts):
            trend = "DEGRADING"
        elif len(recent_alerts) < len(older_alerts):
            trend = "IMPROVING"
        else:
            trend = "STABLE"
        
        return SystemHealth(
            status=status,
            score=health_score,
            active_alerts=len(self.active_alerts),
            critical_alerts=critical_count,
            warning_alerts=warning_count,
            last_check=datetime.now(),
            uptime_percentage=max(0, 100 - (critical_count * 5)),  # Simplified uptime calculation
            performance_trend=trend
        )
    
    async def resolve_alert(self, alert_id: str, resolved_by: str = "system") -> bool:
        """Mark an alert as resolved"""
        if alert_id in self.active_alerts:
            self.active_alerts[alert_id].resolved = True
            logger.info(f"✅ Alert {alert_id} resolved by {resolved_by}")
            return True
        return False
    
    async def acknowledge_alert(self, alert_id: str, acknowledged_by: str = "system") -> bool:
        """Mark an alert as acknowledged"""
        if alert_id in self.active_alerts:
            self.active_alerts[alert_id].acknowledged = True
            logger.info(f"👍 Alert {alert_id} acknowledged by {acknowledged_by}")
            return True
        return False
    
    async def send_email_alert(self, alert: PerformanceAlert) -> bool:
        """Send email notification for alert"""
        try:
            # Check if email settings are configured
            if not hasattr(self.settings, 'SMTP_HOST') or not self.settings.SMTP_HOST:
                logger.debug("Email settings not configured, skipping email alert")
                return False
            
            msg = MIMEMultipart()
            msg['From'] = getattr(self.settings, 'FROM_EMAIL', 'noreply@fynix.app')
            msg['To'] = getattr(self.settings, 'ADMIN_EMAIL', msg['From'])
            msg['Subject'] = f"🚨 Fynix {alert.severity.value.upper()} Alert: {alert.category}"
            
            body = f"""
            Alert Details:
            =============
            Severity: {alert.severity.value.upper()}
            Category: {alert.category}
            Metric: {alert.metric_name}
            Current Value: {alert.current_value}
            Threshold: {alert.threshold}
            
            Message: {alert.message}
            
            Recommendation: {alert.recommendation}
            
            Timestamp: {alert.timestamp}
            
            ---
            Fynix J5.3 Performance Monitoring System
            """
            
            msg.attach(MIMEText(body, 'plain'))
            
            server = smtplib.SMTP(
                self.settings.SMTP_HOST, 
                getattr(self.settings, 'SMTP_PORT', 587)
            )
            if getattr(self.settings, 'SMTP_TLS', True):
                server.starttls()
            if hasattr(self.settings, 'SMTP_USERNAME') and self.settings.SMTP_USERNAME:
                server.login(
                    self.settings.SMTP_USERNAME, 
                    getattr(self.settings, 'SMTP_PASSWORD', '')
                )
            
            text = msg.as_string()
            server.sendmail(msg['From'], msg['To'], text)
            server.quit()
            
            logger.info(f"📧 Email alert sent for {alert.id}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to send email alert: {e}")
            return False
    
    def register_alert_callback(self, callback: Callable[[PerformanceAlert], None]):
        """Register callback function for alert notifications"""
        self.alert_callbacks.append(callback)
    
    async def run_monitoring_cycle(self) -> Dict[str, Any]:
        """Run complete monitoring cycle and return status report"""
        logger.info("🔍 Running J5.3 performance monitoring cycle...")
        
        start_time = datetime.now()
        
        # Evaluate alerts
        new_alerts = await self.evaluate_alerts()
        
        # Calculate system health
        health = self.calculate_system_health()
        
        # Generate monitoring report
        report = {
            "monitoring_cycle": {
                "timestamp": start_time.isoformat(),
                "duration_ms": (datetime.now() - start_time).total_seconds() * 1000,
                "new_alerts": len(new_alerts)
            },
            "system_health": asdict(health),
            "active_alerts": [alert.to_dict() for alert in self.active_alerts.values() if not alert.resolved],
            "new_alerts": [alert.to_dict() for alert in new_alerts],
            "alert_summary": {
                "total_active": len([a for a in self.active_alerts.values() if not a.resolved]),
                "critical": len([a for a in self.active_alerts.values() if a.severity == AlertSeverity.CRITICAL and not a.resolved]),
                "warning": len([a for a in self.active_alerts.values() if a.severity == AlertSeverity.WARNING and not a.resolved]),
                "info": len([a for a in self.active_alerts.values() if a.severity == AlertSeverity.INFO and not a.resolved])
            }
        }
        
        logger.info(f"📊 Monitoring complete: {health.status} status, score: {health.score:.1f}/100, "
                   f"{len(new_alerts)} new alerts")
        
        return report


class J53AutoOptimizer:
    """J5.3 Automated performance optimization system"""
    
    def __init__(self, settings: Settings, monitor: J53PerformanceMonitor):
        self.settings = settings
        self.monitor = monitor
        self.optimization_history: List[Dict[str, Any]] = []
    
    async def auto_optimize_database(self) -> Dict[str, Any]:
        """Automatically optimize database performance"""
        optimizations = []
        
        try:
            async for session in db_manager.get_session():
                # Analyze query performance and suggest optimizations
                if not self.settings.DATABASE_URL.startswith("sqlite"):
                    # PostgreSQL optimizations
                    try:
                        # Update statistics
                        await session.execute(text("ANALYZE;"))
                        optimizations.append("Updated database statistics")
                        
                        # Check for missing indexes on frequently queried columns
                        index_analysis = await session.execute(text("""
                            SELECT schemaname, tablename, seq_scan, seq_tup_read, idx_scan, idx_tup_fetch
                            FROM pg_stat_user_tables 
                            WHERE schemaname = 'public'
                        """))
                        
                        for row in index_analysis:
                            if row.seq_scan > 1000 and (row.idx_scan or 0) < row.seq_scan:
                                optimizations.append(f"Table {row.tablename} may benefit from additional indexes")
                        
                    except Exception as e:
                        logger.warning(f"PostgreSQL optimization check failed: {e}")
                
                await session.commit()
                break
                
        except Exception as e:
            logger.error(f"Database optimization failed: {e}")
            return {"status": "error", "message": str(e)}
        
        optimization_record = {
            "timestamp": datetime.now().isoformat(),
            "type": "database_optimization",
            "optimizations": optimizations,
            "status": "completed"
        }
        
        self.optimization_history.append(optimization_record)
        logger.info(f"🚀 Auto-optimization completed: {len(optimizations)} optimizations applied")
        
        return optimization_record
    
    async def recommend_scaling_actions(self) -> List[Dict[str, Any]]:
        """Recommend scaling actions based on current metrics"""
        recommendations = []
        
        try:
            # Get current metrics
            metrics_report = await self.monitor.run_monitoring_cycle()
            health = metrics_report["system_health"]
            
            # Analyze alerts for scaling recommendations
            for alert in metrics_report["active_alerts"]:
                if alert["category"] == "Storage" and alert["severity"] == "critical":
                    recommendations.append({
                        "action": "immediate_archival",
                        "priority": "critical",
                        "description": "Implement immediate data archival to free up storage space",
                        "estimated_impact": "60-80% storage reduction",
                        "automation_possible": True
                    })
                    
                    recommendations.append({
                        "action": "migrate_to_cloud",
                        "priority": "high", 
                        "description": "Migrate to cloud database for better scalability",
                        "estimated_impact": "Unlimited scaling capacity",
                        "automation_possible": False
                    })
                
                elif alert["category"] == "Performance" and alert["severity"] in ["critical", "warning"]:
                    recommendations.append({
                        "action": "optimize_queries",
                        "priority": "high",
                        "description": "Optimize slow database queries and add indexes",
                        "estimated_impact": "50-70% performance improvement",
                        "automation_possible": True
                    })
                
                elif alert["category"] == "Growth" and alert["severity"] == "critical":
                    recommendations.append({
                        "action": "implement_sharding",
                        "priority": "medium",
                        "description": "Implement database sharding for horizontal scaling",
                        "estimated_impact": "10x capacity increase",
                        "automation_possible": False
                    })
            
            # Health-based recommendations
            if health["score"] < 70:
                recommendations.append({
                    "action": "comprehensive_health_check",
                    "priority": "high",
                    "description": "Conduct comprehensive system health assessment",
                    "estimated_impact": "Identify all performance bottlenecks",
                    "automation_possible": True
                })
        
        except Exception as e:
            logger.error(f"Scaling recommendation analysis failed: {e}")
            
        return recommendations