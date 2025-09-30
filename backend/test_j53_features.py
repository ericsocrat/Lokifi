# J5.3 Comprehensive Test Suite
import pytest
from datetime import datetime, timedelta
from unittest.mock import Mock, AsyncMock, patch

from app.core.config import Settings
from app.services.j53_performance_monitor import (
    J53PerformanceMonitor, 
    J53AutoOptimizer,
    AlertSeverity, 
    SystemHealth
)
from app.services.j53_scheduler import J53OptimizationScheduler
from app.services.advanced_storage_analytics import (
    AdvancedStorageAnalytics,
    AdvancedStorageMetrics,
    PerformanceBenchmark
)

@pytest.fixture
def mock_settings():
    """Mock settings for testing"""
    settings = Mock(spec=Settings)
    settings.DATABASE_URL = "sqlite:///test.db"
    settings.SMTP_HOST = "localhost"
    settings.FROM_EMAIL = "test@example.com"
    settings.ADMIN_EMAIL = "admin@example.com"
    settings.SMTP_PORT = 587
    settings.SMTP_TLS = True
    settings.J53_AUTO_START_SCHEDULER = False
    return settings

@pytest.fixture
def mock_db_manager():
    """Mock database manager"""
    manager = Mock()
    session_mock = Mock()
    session_mock.__aenter__ = AsyncMock(return_value=session_mock)
    session_mock.__aexit__ = AsyncMock(return_value=None)
    
    async def mock_execute(query):
        result_mock = Mock()
        result_mock.scalar.return_value = 100  # Default test value
        return result_mock
    
    session_mock.execute = AsyncMock(side_effect=mock_execute)
    session_mock.scalar = AsyncMock(return_value=50)
    session_mock.commit = AsyncMock()
    
    async def mock_get_session(read_only=False):
        yield session_mock
    
    manager.get_session = mock_get_session
    return manager

@pytest.fixture 
async def performance_monitor(mock_settings):
    """Performance monitor fixture"""
    with patch('app.services.j53_performance_monitor.db_manager') as mock_db:
        # Setup mock database responses
        session_mock = AsyncMock()
        session_mock.execute.return_value.scalar.return_value = 1024 * 1024 * 50  # 50MB
        session_mock.scalar.return_value = 10
        
        async def mock_get_session(read_only=False):
            yield session_mock
        
        mock_db.get_session = mock_get_session
        
        monitor = J53PerformanceMonitor(mock_settings)
        yield monitor

@pytest.fixture
async def storage_analytics(mock_settings):
    """Storage analytics fixture"""
    analytics = AdvancedStorageAnalytics(mock_settings)
    # Mock the database operations
    with patch.object(analytics, 'get_comprehensive_metrics') as mock_metrics:
        mock_metrics.return_value = AdvancedStorageMetrics(
            total_messages=1000,
            total_threads=50,
            total_users=25,
            database_size_mb=100.5,
            daily_growth_rate=50.0,
            weekly_growth_rate=350.0,
            monthly_growth_rate=1500.0,
            avg_message_size_bytes=256.0,
            avg_messages_per_thread=20.0,
            avg_threads_per_user=2.0,
            most_active_hours=[9, 14, 19],
            peak_usage_day="Monday",
            storage_efficiency_score=85.0,
            growth_trend_direction="stable",
            projected_size_next_month=120.0,
            retention_compliance_score=95.0,
            provider_distribution={"openai": 60, "claude": 30, "gemini": 10},
            message_type_distribution={"text": 80, "image": 15, "file": 5},
            avg_response_time_ms=150.0,
            cache_hit_rate=75.0,
            index_usage_efficiency=90.0
        )
        yield analytics

class TestJ53PerformanceMonitor:
    """Test cases for J5.3 Performance Monitor"""
    
    @pytest.mark.asyncio
    async def test_database_health_check(self, performance_monitor):
        """Test database health checking"""
        health = await performance_monitor.check_database_health()
        
        assert "connection_time_ms" in health
        assert "database_size_mb" in health
        assert "connection_healthy" in health
        assert isinstance(health["connection_healthy"], bool)
    
    @pytest.mark.asyncio
    async def test_performance_metrics_collection(self, performance_monitor):
        """Test performance metrics collection"""
        with patch.object(performance_monitor, 'analytics') as mock_analytics:
            mock_metrics = AdvancedStorageMetrics(
                total_messages=100,
                total_threads=10,
                total_users=5,
                database_size_mb=50.0,
                daily_growth_rate=10.0,
                weekly_growth_rate=70.0,
                monthly_growth_rate=300.0,
                avg_message_size_bytes=128.0,
                avg_messages_per_thread=10.0,
                avg_threads_per_user=2.0,
                most_active_hours=[14],
                peak_usage_day="Monday",
                storage_efficiency_score=90.0,
                growth_trend_direction="stable",
                projected_size_next_month=55.0,
                retention_compliance_score=100.0,
                provider_distribution={"openai": 100},
                message_type_distribution={"text": 100},
                avg_response_time_ms=100.0,
                cache_hit_rate=80.0,
                index_usage_efficiency=95.0
            )
            
            mock_benchmark = PerformanceBenchmark(
                operation="SELECT",
                avg_time_ms=50.0,
                min_time_ms=20.0,
                max_time_ms=100.0,
                total_operations=100,
                timestamp=datetime.now()
            )
            
            mock_analytics.get_comprehensive_metrics.return_value = mock_metrics
            mock_analytics.benchmark_database_performance.return_value = [mock_benchmark]
            
            metrics = await performance_monitor.check_performance_metrics()
            
            assert "storage_metrics" in metrics
            assert "response_times" in metrics
            assert "estimated_memory_usage_mb" in metrics
    
    @pytest.mark.asyncio
    async def test_alert_creation_and_management(self, performance_monitor):
        """Test alert creation, acknowledgment, and resolution"""
        # Create an alert
        alert = await performance_monitor._create_alert(
            AlertSeverity.WARNING,
            "Storage",
            "database_size", 
            600.0,
            500.0,
            "Database size warning",
            "Consider archival"
        )
        
        assert alert.severity == AlertSeverity.WARNING
        assert alert.category == "Storage"
        assert alert.current_value == 600.0
        assert alert.threshold == 500.0
        assert not alert.resolved
        assert not alert.acknowledged
        
        # Test acknowledgment
        success = await performance_monitor.acknowledge_alert(alert.id, "test_user")
        assert success
        assert performance_monitor.active_alerts[alert.id].acknowledged
        
        # Test resolution
        success = await performance_monitor.resolve_alert(alert.id, "test_user")
        assert success
        assert performance_monitor.active_alerts[alert.id].resolved
    
    @pytest.mark.asyncio
    async def test_alert_evaluation_database_size(self, performance_monitor):
        """Test alert evaluation for database size thresholds"""
        # Mock database health to return large size
        with patch.object(performance_monitor, 'check_database_health') as mock_health:
            mock_health.return_value = {
                "database_size_mb": 1200.0,  # Above critical threshold
                "connection_time_ms": 100.0
            }
            
            with patch.object(performance_monitor, 'check_performance_metrics') as mock_metrics:
                mock_metrics.return_value = {
                    "storage_metrics": {"daily_growth_rate": 50.0}
                }
                
                alerts = await performance_monitor.evaluate_alerts()
                
                # Should create critical alert for database size
                assert len(alerts) > 0
                
                size_alerts = [a for a in alerts if a.metric_name == "database_size"]
                assert len(size_alerts) > 0
                assert size_alerts[0].severity == AlertSeverity.CRITICAL
    
    @pytest.mark.asyncio
    async def test_alert_evaluation_performance(self, performance_monitor):
        """Test alert evaluation for performance thresholds"""
        with patch.object(performance_monitor, 'check_database_health') as mock_health:
            mock_health.return_value = {
                "database_size_mb": 100.0,
                "connection_time_ms": 6000.0  # Above critical threshold
            }
            
            with patch.object(performance_monitor, 'check_performance_metrics') as mock_metrics:
                mock_metrics.return_value = {
                    "storage_metrics": {"daily_growth_rate": 50.0}
                }
                
                alerts = await performance_monitor.evaluate_alerts()
                
                # Should create critical alert for connection time
                perf_alerts = [a for a in alerts if a.metric_name == "connection_time"]
                assert len(perf_alerts) > 0
                assert perf_alerts[0].severity == AlertSeverity.CRITICAL
    
    def test_system_health_calculation(self, performance_monitor):
        """Test system health score calculation"""
        # Add some mock alerts
        performance_monitor.active_alerts = {
            "critical_1": Mock(severity=AlertSeverity.CRITICAL, resolved=False),
            "warning_1": Mock(severity=AlertSeverity.WARNING, resolved=False),
            "warning_2": Mock(severity=AlertSeverity.WARNING, resolved=False),
            "resolved_1": Mock(severity=AlertSeverity.CRITICAL, resolved=True)
        }
        
        # Add some alert history for trend calculation
        performance_monitor.alert_history = [
            Mock(timestamp=datetime.now() - timedelta(hours=12)),
            Mock(timestamp=datetime.now() - timedelta(hours=36))
        ]
        
        health = performance_monitor.calculate_system_health()
        
        assert isinstance(health, SystemHealth)
        assert health.status == "CRITICAL"  # Has critical alerts
        assert health.critical_alerts == 1
        assert health.warning_alerts == 2
        assert health.score <= 70  # Should be reduced due to alerts
        assert health.performance_trend in ["IMPROVING", "STABLE", "DEGRADING"]
    
    @pytest.mark.asyncio
    async def test_monitoring_cycle_complete(self, performance_monitor):
        """Test complete monitoring cycle"""
        with patch.object(performance_monitor, 'check_database_health') as mock_health:
            mock_health.return_value = {
                "database_size_mb": 100.0,
                "connection_time_ms": 200.0,
                "connection_healthy": True
            }
            
            with patch.object(performance_monitor, 'check_performance_metrics') as mock_metrics:
                mock_metrics.return_value = {
                    "storage_metrics": {"daily_growth_rate": 25.0},
                    "response_times": {"SELECT": 100.0}
                }
                
                report = await performance_monitor.run_monitoring_cycle()
                
                assert "monitoring_cycle" in report
                assert "system_health" in report
                assert "active_alerts" in report
                assert "new_alerts" in report
                assert "alert_summary" in report
                
                # Check monitoring cycle metadata
                assert "timestamp" in report["monitoring_cycle"]
                assert "duration_ms" in report["monitoring_cycle"]
                assert isinstance(report["monitoring_cycle"]["duration_ms"], float)

class TestJ53AutoOptimizer:
    """Test cases for J5.3 Auto Optimizer"""
    
    @pytest.fixture
    async def auto_optimizer(self, mock_settings):
        """Auto optimizer fixture"""
        monitor = Mock(spec=J53PerformanceMonitor)
        optimizer = J53AutoOptimizer(mock_settings, monitor)
        yield optimizer
    
    @pytest.mark.asyncio
    async def test_database_optimization_sqlite(self, auto_optimizer, mock_settings):
        """Test database optimization for SQLite"""
        mock_settings.DATABASE_URL = "sqlite:///test.db"
        
        with patch('app.services.j53_scheduler.db_manager') as mock_db:
            session_mock = AsyncMock()
            session_mock.execute = AsyncMock()
            session_mock.commit = AsyncMock()
            
            async def mock_get_session():
                yield session_mock
            
            mock_db.get_session = mock_get_session
            
            result = await auto_optimizer.auto_optimize_database()
            
            assert result["status"] == "completed"
            assert "optimizations" in result
            assert "timestamp" in result
    
    @pytest.mark.asyncio
    async def test_database_optimization_postgresql(self, auto_optimizer, mock_settings):
        """Test database optimization for PostgreSQL"""
        mock_settings.DATABASE_URL = "postgresql://user:pass@localhost/db"
        
        with patch('app.services.j53_scheduler.db_manager') as mock_db:
            session_mock = AsyncMock()
            
            # Mock PostgreSQL-specific queries
            async def mock_execute(query):
                if "ANALYZE" in str(query):
                    return Mock()
                elif "pg_stat_user_tables" in str(query):
                    # Mock table stats
                    mock_rows = [
                        Mock(schemaname='public', tablename='ai_messages', 
                             seq_scan=1500, seq_tup_read=10000, 
                             idx_scan=500, idx_tup_fetch=2000)
                    ]
                    return mock_rows
                return Mock()
            
            session_mock.execute = AsyncMock(side_effect=mock_execute)
            session_mock.commit = AsyncMock()
            
            async def mock_get_session():
                yield session_mock
            
            mock_db.get_session = mock_get_session
            
            result = await auto_optimizer.auto_optimize_database()
            
            assert result["status"] == "completed"
            assert "optimizations" in result
            # Should include PostgreSQL-specific optimizations
            optimizations = result["optimizations"]
            assert any("statistics" in opt.lower() for opt in optimizations)
    
    @pytest.mark.asyncio
    async def test_scaling_recommendations_critical_storage(self, auto_optimizer):
        """Test scaling recommendations for critical storage alerts"""
        # Mock monitor with critical storage alert
        mock_report = {
            "system_health": {"score": 60},
            "active_alerts": [
                {
                    "id": "storage_critical_1",
                    "category": "Storage",
                    "severity": "critical",
                    "metric_name": "database_size"
                }
            ]
        }
        
        auto_optimizer.monitor.run_monitoring_cycle = AsyncMock(return_value=mock_report)
        
        recommendations = await auto_optimizer.recommend_scaling_actions()
        
        assert len(recommendations) > 0
        
        # Should recommend immediate archival
        archival_recs = [r for r in recommendations if r["action"] == "immediate_archival"]
        assert len(archival_recs) > 0
        assert archival_recs[0]["priority"] == "critical"
        
        # Should recommend cloud migration
        cloud_recs = [r for r in recommendations if r["action"] == "migrate_to_cloud"]
        assert len(cloud_recs) > 0
    
    @pytest.mark.asyncio
    async def test_scaling_recommendations_performance_issues(self, auto_optimizer):
        """Test scaling recommendations for performance issues"""
        mock_report = {
            "system_health": {"score": 75},
            "active_alerts": [
                {
                    "id": "perf_warning_1", 
                    "category": "Performance",
                    "severity": "warning",
                    "metric_name": "connection_time"
                }
            ]
        }
        
        auto_optimizer.monitor.run_monitoring_cycle = AsyncMock(return_value=mock_report)
        
        recommendations = await auto_optimizer.recommend_scaling_actions()
        
        # Should recommend query optimization
        opt_recs = [r for r in recommendations if r["action"] == "optimize_queries"]
        assert len(opt_recs) > 0
        assert opt_recs[0]["priority"] == "high"

class TestJ53OptimizationScheduler:
    """Test cases for J5.3 Optimization Scheduler"""
    
    @pytest.fixture
    async def scheduler(self, mock_settings):
        """Scheduler fixture"""
        with patch('app.services.j53_scheduler.J53PerformanceMonitor'), \
             patch('app.services.j53_scheduler.J53AutoOptimizer'), \
             patch('app.services.j53_scheduler.DataArchivalService'), \
             patch('app.services.j53_scheduler.AdvancedStorageAnalytics'):
            
            scheduler = J53OptimizationScheduler(mock_settings)
            yield scheduler
    
    def test_scheduler_lifecycle(self, scheduler):
        """Test scheduler start and stop"""
        # Test starting
        scheduler.start_scheduler()
        assert scheduler.scheduler_active is True
        assert scheduler.scheduler_thread is not None
        
        # Test stopping
        scheduler.stop_scheduler()
        assert scheduler.scheduler_active is False
    
    @pytest.mark.asyncio
    async def test_manual_optimization(self, scheduler):
        """Test manual optimization execution"""
        # Mock all the optimization services
        scheduler.optimizer.auto_optimize_database = AsyncMock(
            return_value={"status": "completed", "optimizations": ["test_opt"]}
        )
        scheduler.monitor.run_monitoring_cycle = AsyncMock(
            return_value={"system_health": {"status": "HEALTHY"}}
        )
        scheduler.optimizer.recommend_scaling_actions = AsyncMock(
            return_value=[]
        )
        
        result = await scheduler.manual_optimization()
        
        assert result["status"] == "completed"
        assert "database_optimization" in result
        assert "monitoring_report" in result
        assert "recommendations" in result
        assert "timestamp" in result
    
    @pytest.mark.asyncio
    async def test_auto_resolve_alerts(self, scheduler):
        """Test automatic alert resolution"""
        # Create mock alerts
        resolved_alert = Mock()
        resolved_alert.resolved = False
        resolved_alert.category = "Storage"
        resolved_alert.threshold = 500.0
        
        scheduler.monitor.active_alerts = {"alert_1": resolved_alert}
        
        # Mock health check showing improvement
        scheduler.monitor.check_database_health = AsyncMock(
            return_value={"database_size_mb": 400.0}  # Below threshold
        )
        scheduler.monitor.resolve_alert = AsyncMock(return_value=True)
        
        await scheduler._auto_resolve_alerts()
        
        # Should have attempted to resolve the alert
        scheduler.monitor.resolve_alert.assert_called_once()

class TestJ53Integration:
    """Integration tests for J5.3 system"""
    
    @pytest.mark.asyncio
    async def test_full_monitoring_cycle_integration(self, mock_settings):
        """Test complete monitoring cycle with real components"""
        with patch('app.services.j53_performance_monitor.db_manager') as mock_db, \
             patch('app.services.advanced_storage_analytics.db_manager') as mock_analytics_db:
            
            # Setup database mocks
            session_mock = AsyncMock()
            session_mock.execute.return_value.scalar.return_value = 1024 * 1024 * 100  # 100MB
            session_mock.scalar.return_value = 25
            
            async def mock_get_session(read_only=False):
                yield session_mock
            
            mock_db.get_session = mock_get_session
            mock_analytics_db.get_session = mock_get_session
            
            # Create monitor and run cycle
            monitor = J53PerformanceMonitor(mock_settings)
            report = await monitor.run_monitoring_cycle()
            
            # Verify complete report structure
            assert "monitoring_cycle" in report
            assert "system_health" in report
            assert "active_alerts" in report
            assert "new_alerts" in report
            assert "alert_summary" in report
            
            # Verify health calculation
            health = monitor.calculate_system_health()
            assert isinstance(health.score, float)
            assert 0 <= health.score <= 100
            assert health.status in ["HEALTHY", "DEGRADED", "CRITICAL"]
    
    @pytest.mark.asyncio
    async def test_alert_workflow_integration(self, mock_settings):
        """Test complete alert workflow from detection to resolution"""
        with patch('app.services.j53_performance_monitor.db_manager') as mock_db:
            # Mock database returning critical size
            session_mock = AsyncMock()
            session_mock.execute.return_value.scalar.return_value = 1024 * 1024 * 1200  # 1.2GB
            
            async def mock_get_session(read_only=False):
                yield session_mock
            
            mock_db.get_session = mock_get_session
            
            monitor = J53PerformanceMonitor(mock_settings)
            
            # Run monitoring to generate alerts
            with patch.object(monitor, 'check_performance_metrics') as mock_metrics:
                mock_metrics.return_value = {
                    "storage_metrics": {"daily_growth_rate": 50.0}
                }
                
                alerts = await monitor.evaluate_alerts()
                
                # Should generate critical alert
                assert len(alerts) > 0
                critical_alerts = [a for a in alerts if a.severity == AlertSeverity.CRITICAL]
                assert len(critical_alerts) > 0
                
                # Test alert acknowledgment
                alert_id = critical_alerts[0].id
                ack_success = await monitor.acknowledge_alert(alert_id, "integration_test")
                assert ack_success
                
                # Test alert resolution
                resolve_success = await monitor.resolve_alert(alert_id, "integration_test")
                assert resolve_success
                
                # Verify alert state
                alert = monitor.active_alerts[alert_id]
                assert alert.acknowledged
                assert alert.resolved

# Performance and load testing
class TestJ53Performance:
    """Performance tests for J5.3 components"""
    
    @pytest.mark.asyncio
    async def test_monitoring_cycle_performance(self, mock_settings):
        """Test monitoring cycle performance under load"""
        with patch('app.services.j53_performance_monitor.db_manager') as mock_db:
            session_mock = AsyncMock()
            session_mock.execute.return_value.scalar.return_value = 1024 * 1024 * 50
            
            async def mock_get_session(read_only=False):
                yield session_mock
            
            mock_db.get_session = mock_get_session
            
            monitor = J53PerformanceMonitor(mock_settings)
            
            # Measure multiple monitoring cycles
            import time
            start_time = time.time()
            
            for _ in range(10):
                await monitor.run_monitoring_cycle()
            
            end_time = time.time()
            avg_cycle_time = (end_time - start_time) / 10
            
            # Should complete within reasonable time (< 1 second per cycle)
            assert avg_cycle_time < 1.0
    
    @pytest.mark.asyncio
    async def test_alert_system_scalability(self, mock_settings):
        """Test alert system with many alerts"""
        monitor = J53PerformanceMonitor(mock_settings)
        
        # Generate many alerts
        for i in range(100):
            await monitor._create_alert(
                AlertSeverity.WARNING,
                "Test",
                f"metric_{i}",
                100.0,
                50.0,
                f"Test alert {i}",
                "Test recommendation"
            )
        
        # Test health calculation with many alerts
        start_time = time.time()
        health = monitor.calculate_system_health()
        calculation_time = time.time() - start_time
        
        assert len(monitor.active_alerts) == 100
        assert calculation_time < 0.1  # Should be fast even with many alerts
        assert health.warning_alerts == 100
        assert health.score <= 100  # Score should be heavily penalized

if __name__ == "__main__":
    # Run tests with pytest
    pytest.main([__file__, "-v", "--tb=short"])