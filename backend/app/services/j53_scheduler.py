# J5.3 Automated Optimization Scheduler and API Endpoints
import asyncio
import time
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
import logging
from contextlib import asynccontextmanager
from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from fastapi.responses import JSONResponse
import schedule
import threading

from app.core.config import Settings
from app.core.database import db_manager
from app.services.j53_performance_monitor import J53PerformanceMonitor, J53AutoOptimizer
from app.services.data_archival_service import DataArchivalService
from app.services.advanced_storage_analytics import AdvancedStorageAnalytics

logger = logging.getLogger(__name__)

class J53OptimizationScheduler:
    """J5.3 Automated optimization scheduler"""
    
    def __init__(self, settings: Settings):
        self.settings = settings
        self.monitor = J53PerformanceMonitor(settings)
        self.optimizer = J53AutoOptimizer(settings, self.monitor)
        self.archival_service = DataArchivalService(settings)
        self.analytics = AdvancedStorageAnalytics(settings)
        
        self.scheduler_active = False
        self.scheduler_thread: Optional[threading.Thread] = None
        
        # Configure automatic optimizations
        self._setup_scheduled_tasks()
    
    def _setup_scheduled_tasks(self):
        """Setup scheduled optimization tasks"""
        # Daily monitoring and optimization
        schedule.every().day.at("02:00").do(self._daily_optimization)
        
        # Hourly health checks
        schedule.every().hour.do(self._hourly_health_check)
        
        # Weekly deep analysis
        schedule.every().sunday.at("03:00").do(self._weekly_deep_analysis)
        
        # Real-time alert monitoring (every 5 minutes)
        schedule.every(5).minutes.do(self._realtime_monitoring)
    
    async def _daily_optimization(self):
        """Run daily optimization tasks"""
        logger.info("🔄 Running daily J5.3 optimization cycle...")
        
        try:
            # Run database optimization
            optimization_result = await self.optimizer.auto_optimize_database()
            
            # Check if archival is needed
            metrics = await self.analytics.get_comprehensive_metrics()
            
            if metrics.database_size_mb > 200:  # Archive if over 200MB
                logger.info("📦 Running automated archival...")
                archive_result = await self.archival_service.archive_old_data()
                logger.info(f"Archived {archive_result['archived_count']} records")
            
            # Generate daily report
            report = await self.monitor.run_monitoring_cycle()
            
            # Auto-resolve resolved issues
            await self._auto_resolve_alerts()
            
            logger.info("✅ Daily optimization cycle completed")
            
        except Exception as e:
            logger.error(f"Daily optimization failed: {e}")
    
    async def _hourly_health_check(self):
        """Run hourly health checks"""
        try:
            report = await self.monitor.run_monitoring_cycle()
            
            # Send critical alerts immediately
            for alert_data in report["new_alerts"]:
                if alert_data["severity"] == "critical":
                    alert = self.monitor.active_alerts.get(alert_data["id"])
                    if alert:
                        await self.monitor.send_email_alert(alert)
            
        except Exception as e:
            logger.error(f"Hourly health check failed: {e}")
    
    async def _weekly_deep_analysis(self):
        """Run weekly deep system analysis"""
        logger.info("🔍 Running weekly J5.3 deep analysis...")
        
        try:
            # Comprehensive analytics
            analytics_report = await self.analytics.analyze_usage_patterns()
            
            # Generate scaling recommendations
            scaling_recommendations = await self.optimizer.recommend_scaling_actions()
            
            # Storage optimization analysis
            optimization_recommendations = await self.analytics.get_optimization_recommendations()
            
            # Log weekly summary
            logger.info(f"📊 Weekly analysis complete: {len(scaling_recommendations)} recommendations")
            
        except Exception as e:
            logger.error(f"Weekly analysis failed: {e}")
    
    async def _realtime_monitoring(self):
        """Run real-time monitoring checks"""
        try:
            # Quick health check
            db_health = await self.monitor.check_database_health()
            
            # Check for immediate issues
            if not db_health.get("connection_healthy", True):
                logger.error("🚨 Database connection issues detected!")
                
            if db_health.get("database_size_mb", 0) > 1000:  # Critical size threshold
                logger.error("🚨 Database size critically high!")
                
        except Exception as e:
            logger.debug(f"Real-time monitoring check failed: {e}")
    
    async def _auto_resolve_alerts(self):
        """Automatically resolve alerts that are no longer relevant"""
        resolved_count = 0
        
        for alert_id, alert in list(self.monitor.active_alerts.items()):
            if alert.resolved:
                continue
                
            # Check if storage alerts can be auto-resolved
            if alert.category == "Storage":
                current_health = await self.monitor.check_database_health()
                current_size = current_health.get("database_size_mb", float('inf'))
                
                if current_size < alert.threshold:
                    await self.monitor.resolve_alert(alert_id, "auto-resolution")
                    resolved_count += 1
            
            # Check if performance alerts can be auto-resolved
            elif alert.category == "Performance":
                current_health = await self.monitor.check_database_health()
                current_time = current_health.get("connection_time_ms", float('inf'))
                
                if current_time < alert.threshold:
                    await self.monitor.resolve_alert(alert_id, "auto-resolution")
                    resolved_count += 1
        
        if resolved_count > 0:
            logger.info(f"✅ Auto-resolved {resolved_count} alerts")
    
    def start_scheduler(self):
        """Start the optimization scheduler"""
        if self.scheduler_active:
            logger.warning("Scheduler is already running")
            return
        
        self.scheduler_active = True
        
        def run_scheduler():
            logger.info("🚀 J5.3 Optimization Scheduler started")
            while self.scheduler_active:
                schedule.run_pending()
                time.sleep(1)  # Use time.sleep instead of asyncio.sleep
        
        self.scheduler_thread = threading.Thread(target=run_scheduler, daemon=True)
        self.scheduler_thread.start()
        
        logger.info("✅ J5.3 Optimization Scheduler is now active")
    
    def stop_scheduler(self):
        """Stop the optimization scheduler"""
        if not self.scheduler_active:
            return
        
        self.scheduler_active = False
        if self.scheduler_thread:
            self.scheduler_thread.join(timeout=5)
        
        schedule.clear()
        logger.info("🛑 J5.3 Optimization Scheduler stopped")
    
    async def manual_optimization(self) -> Dict[str, Any]:
        """Run manual optimization cycle"""
        logger.info("🔧 Running manual J5.3 optimization...")
        
        try:
            # Run all optimization tasks
            db_optimization = await self.optimizer.auto_optimize_database()
            monitoring_report = await self.monitor.run_monitoring_cycle()
            
            # Check if archival is recommended
            recommendations = await self.optimizer.recommend_scaling_actions()
            archival_recommended = any(r["action"] == "immediate_archival" for r in recommendations)
            
            archival_result = None
            if archival_recommended:
                archival_result = await self.archival_service.archive_old_data()
            
            return {
                "status": "completed",
                "timestamp": datetime.now().isoformat(),
                "database_optimization": db_optimization,
                "monitoring_report": monitoring_report,
                "archival_result": archival_result,
                "recommendations": recommendations
            }
            
        except Exception as e:
            logger.error(f"Manual optimization failed: {e}")
            return {
                "status": "error",
                "message": str(e),
                "timestamp": datetime.now().isoformat()
            }

# FastAPI Router for J5.3 Performance Management
j53_router = APIRouter(prefix="/api/v1/j53", tags=["J5.3 Performance"])

# Global scheduler instance (will be initialized in startup)
scheduler_instance: Optional[J53OptimizationScheduler] = None

async def get_scheduler() -> J53OptimizationScheduler:
    """Dependency to get scheduler instance"""
    global scheduler_instance
    if not scheduler_instance:
        from app.core.config import get_settings
        settings = get_settings()
        scheduler_instance = J53OptimizationScheduler(settings)
    return scheduler_instance

@j53_router.get("/health")
async def get_system_health(scheduler: J53OptimizationScheduler = Depends(get_scheduler)):
    """Get comprehensive system health status"""
    try:
        health = scheduler.monitor.calculate_system_health()
        db_health = await scheduler.monitor.check_database_health()
        
        return JSONResponse(content={
            "system_health": {
                "status": health.status,
                "score": health.score,
                "active_alerts": health.active_alerts,
                "critical_alerts": health.critical_alerts,
                "warning_alerts": health.warning_alerts,
                "uptime_percentage": health.uptime_percentage,
                "performance_trend": health.performance_trend,
                "last_check": health.last_check.isoformat()
            },
            "database_health": db_health
        })
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@j53_router.get("/alerts")
async def get_active_alerts(scheduler: J53OptimizationScheduler = Depends(get_scheduler)):
    """Get all active performance alerts"""
    try:
        active_alerts = [
            alert.to_dict() 
            for alert in scheduler.monitor.active_alerts.values() 
            if not alert.resolved
        ]
        
        return JSONResponse(content={
            "active_alerts": active_alerts,
            "total_count": len(active_alerts),
            "critical_count": len([a for a in active_alerts if a["severity"] == "critical"]),
            "warning_count": len([a for a in active_alerts if a["severity"] == "warning"])
        })
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@j53_router.post("/alerts/{alert_id}/resolve")
async def resolve_alert(
    alert_id: str, 
    resolved_by: str = "api",
    scheduler: J53OptimizationScheduler = Depends(get_scheduler)
):
    """Manually resolve an alert"""
    try:
        success = await scheduler.monitor.resolve_alert(alert_id, resolved_by)
        if success:
            return {"status": "resolved", "alert_id": alert_id, "resolved_by": resolved_by}
        else:
            raise HTTPException(status_code=404, detail="Alert not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@j53_router.post("/alerts/{alert_id}/acknowledge")
async def acknowledge_alert(
    alert_id: str,
    acknowledged_by: str = "api",
    scheduler: J53OptimizationScheduler = Depends(get_scheduler)
):
    """Acknowledge an alert"""
    try:
        success = await scheduler.monitor.acknowledge_alert(alert_id, acknowledged_by)
        if success:
            return {"status": "acknowledged", "alert_id": alert_id, "acknowledged_by": acknowledged_by}
        else:
            raise HTTPException(status_code=404, detail="Alert not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@j53_router.get("/metrics")
async def get_performance_metrics(scheduler: J53OptimizationScheduler = Depends(get_scheduler)):
    """Get comprehensive performance metrics"""
    try:
        metrics = await scheduler.monitor.check_performance_metrics()
        storage_metrics = await scheduler.analytics.get_comprehensive_metrics()
        
        return JSONResponse(content={
            "performance_metrics": metrics,
            "storage_metrics": {
                "total_messages": storage_metrics.total_messages,
                "total_threads": storage_metrics.total_threads,
                "database_size_mb": storage_metrics.database_size_mb,
                "daily_growth_rate": storage_metrics.daily_growth_rate,
                "weekly_growth_rate": storage_metrics.weekly_growth_rate,
                "avg_message_size_bytes": storage_metrics.avg_message_size_bytes
            }
        })
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@j53_router.post("/optimize")
async def run_manual_optimization(
    background_tasks: BackgroundTasks,
    scheduler: J53OptimizationScheduler = Depends(get_scheduler)
):
    """Run manual optimization cycle"""
    try:
        # Run optimization in background
        background_tasks.add_task(scheduler.manual_optimization)
        
        return JSONResponse(content={
            "status": "optimization_started",
            "message": "Manual optimization cycle started in background",
            "timestamp": datetime.now().isoformat()
        })
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@j53_router.get("/recommendations")
async def get_scaling_recommendations(scheduler: J53OptimizationScheduler = Depends(get_scheduler)):
    """Get scaling and optimization recommendations"""
    try:
        recommendations = await scheduler.optimizer.recommend_scaling_actions()
        
        return JSONResponse(content={
            "recommendations": recommendations,
            "total_count": len(recommendations),
            "critical_count": len([r for r in recommendations if r["priority"] == "critical"]),
            "high_count": len([r for r in recommendations if r["priority"] == "high"])
        })
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@j53_router.post("/scheduler/start")
async def start_scheduler(scheduler: J53OptimizationScheduler = Depends(get_scheduler)):
    """Start the automated optimization scheduler"""
    try:
        scheduler.start_scheduler()
        return {"status": "started", "message": "J5.3 Optimization Scheduler started"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@j53_router.post("/scheduler/stop") 
async def stop_scheduler(scheduler: J53OptimizationScheduler = Depends(get_scheduler)):
    """Stop the automated optimization scheduler"""
    try:
        scheduler.stop_scheduler()
        return {"status": "stopped", "message": "J5.3 Optimization Scheduler stopped"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@j53_router.get("/scheduler/status")
async def get_scheduler_status(scheduler: J53OptimizationScheduler = Depends(get_scheduler)):
    """Get scheduler status"""
    return {
        "active": scheduler.scheduler_active,
        "next_tasks": [
            {"name": job.job_func.__name__, "next_run": str(job.next_run)}
            for job in schedule.jobs
        ] if schedule.jobs else []
    }

# Application lifecycle management
@asynccontextmanager
async def j53_lifespan_manager(app):
    """Manage J5.3 scheduler lifecycle"""
    global scheduler_instance
    
    # Startup
    try:
        from app.core.config import get_settings
        settings = get_settings()
        scheduler_instance = J53OptimizationScheduler(settings)
        
        # Auto-start scheduler if enabled in settings
        if getattr(settings, 'J53_AUTO_START_SCHEDULER', True):
            scheduler_instance.start_scheduler()
            logger.info("🚀 J5.3 Auto-started optimization scheduler")
        
        yield
        
    finally:
        # Shutdown
        if scheduler_instance and scheduler_instance.scheduler_active:
            scheduler_instance.stop_scheduler()
            logger.info("🛑 J5.3 Scheduler stopped during shutdown")