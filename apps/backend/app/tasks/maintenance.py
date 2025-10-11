# Background tasks for data archival and maintenance
import logging
from datetime import datetime
from typing import Any

from app.core.config import Settings
from app.services.data_archival_service import DataArchivalService
from celery import Celery
from celery.schedules import crontab

logger = logging.getLogger(__name__)

# Initialize Celery app
settings = Settings()
celery_app = Celery("lokifi_maintenance", broker=settings.redis_url, backend=settings.redis_url)

# Configure Celery
celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    result_expires=3600,  # 1 hour
    task_track_started=True,
    task_time_limit=30 * 60,  # 30 minutes
    task_soft_time_limit=25 * 60,  # 25 minutes
    worker_prefetch_multiplier=1,
    worker_max_tasks_per_child=1000,
)

# Schedule periodic tasks
celery_app.conf.beat_schedule = {
    # Daily archival at 2 AM
    "daily-archival": {
        "task": "app.tasks.maintenance.daily_archival_task",
        "schedule": crontab(hour=2, minute=0),
    },
    # Weekly compression on Sunday at 3 AM
    "weekly-compression": {
        "task": "app.tasks.maintenance.weekly_compression_task",
        "schedule": crontab(hour=3, minute=0, day_of_week=0),
    },
    # Monthly full maintenance on 1st at 4 AM
    "monthly-maintenance": {
        "task": "app.tasks.maintenance.monthly_maintenance_task",
        "schedule": crontab(hour=4, minute=0, day_of_month=1),
    },
    # Weekly database metrics collection
    "weekly-metrics": {
        "task": "app.tasks.maintenance.collect_storage_metrics_task",
        "schedule": crontab(hour=1, minute=30, day_of_week=1),  # Monday 1:30 AM
    },
}


@celery_app.task(name="app.tasks.maintenance.daily_archival_task")
def daily_archival_task() -> dict[str, Any]:
    """Daily task to archive old conversations"""
    try:
        import asyncio

        from app.core.database import db_manager

        async def run_archival():
            # Initialize database if needed
            await db_manager.initialize()

            # Create archival service
            archival_service = DataArchivalService(settings)

            # Archive old conversations
            stats = await archival_service.archive_old_conversations(batch_size=5000)

            return {
                "task": "daily_archival",
                "timestamp": datetime.now().isoformat(),
                "success": True,
                "stats": {
                    "threads_archived": stats.threads_archived,
                    "messages_archived": stats.messages_archived,
                    "operation_duration": stats.operation_duration,
                },
            }

        # Run the async task
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            result = loop.run_until_complete(run_archival())
            logger.info(f"Daily archival completed: {result['stats']}")
            return result
        finally:
            loop.close()

    except Exception as e:
        logger.error(f"Daily archival task failed: {e}")
        return {
            "task": "daily_archival",
            "timestamp": datetime.now().isoformat(),
            "success": False,
            "error": str(e),
        }


@celery_app.task(name="app.tasks.maintenance.weekly_compression_task")
def weekly_compression_task() -> dict[str, Any]:
    """Weekly task to compress old archived messages"""
    try:
        import asyncio

        from app.core.database import db_manager

        async def run_compression():
            await db_manager.initialize()
            archival_service = DataArchivalService(settings)

            # Compress old messages
            stats = await archival_service.compress_old_messages(batch_size=1000)

            return {
                "task": "weekly_compression",
                "timestamp": datetime.now().isoformat(),
                "success": True,
                "stats": {
                    "messages_compressed": stats.messages_compressed,
                    "space_freed_mb": stats.space_freed_mb,
                    "operation_duration": stats.operation_duration,
                },
            }

        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            result = loop.run_until_complete(run_compression())
            logger.info(f"Weekly compression completed: {result['stats']}")
            return result
        finally:
            loop.close()

    except Exception as e:
        logger.error(f"Weekly compression task failed: {e}")
        return {
            "task": "weekly_compression",
            "timestamp": datetime.now().isoformat(),
            "success": False,
            "error": str(e),
        }


@celery_app.task(name="app.tasks.maintenance.monthly_maintenance_task")
def monthly_maintenance_task() -> dict[str, Any]:
    """Monthly comprehensive maintenance task"""
    try:
        import asyncio

        from app.core.database import db_manager

        async def run_full_maintenance():
            await db_manager.initialize()
            archival_service = DataArchivalService(settings)

            # Run full maintenance cycle
            maintenance_results = await archival_service.run_full_maintenance()

            return {
                "task": "monthly_maintenance",
                "timestamp": datetime.now().isoformat(),
                "success": True,
                "maintenance_results": {
                    key: {
                        "threads_archived": stats.threads_archived,
                        "messages_archived": stats.messages_archived,
                        "messages_compressed": stats.messages_compressed,
                        "messages_deleted": stats.messages_deleted,
                        "space_freed_mb": stats.space_freed_mb,
                        "operation_duration": stats.operation_duration,
                    }
                    for key, stats in maintenance_results.items()
                },
            }

        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            result = loop.run_until_complete(run_full_maintenance())
            logger.info(f"Monthly maintenance completed: {result['maintenance_results']}")
            return result
        finally:
            loop.close()

    except Exception as e:
        logger.error(f"Monthly maintenance task failed: {e}")
        return {
            "task": "monthly_maintenance",
            "timestamp": datetime.now().isoformat(),
            "success": False,
            "error": str(e),
        }


@celery_app.task(name="app.tasks.maintenance.collect_storage_metrics_task")
def collect_storage_metrics_task() -> dict[str, Any]:
    """Task to collect and log storage metrics"""
    try:
        import asyncio

        from app.core.database import db_manager

        async def collect_metrics():
            await db_manager.initialize()
            archival_service = DataArchivalService(settings)

            # Get storage metrics
            metrics = await archival_service.get_storage_metrics()

            return {
                "task": "collect_storage_metrics",
                "timestamp": datetime.now().isoformat(),
                "success": True,
                "metrics": {
                    "total_size_mb": metrics.total_size_mb,
                    "ai_threads_size_mb": metrics.ai_threads_size_mb,
                    "ai_messages_size_mb": metrics.ai_messages_size_mb,
                    "ai_messages_archive_size_mb": metrics.ai_messages_archive_size_mb,
                    "total_threads": metrics.total_threads,
                    "total_messages": metrics.total_messages,
                    "archived_messages": metrics.archived_messages,
                    "oldest_message_date": (
                        metrics.oldest_message_date.isoformat()
                        if metrics.oldest_message_date
                        else None
                    ),
                    "newest_message_date": (
                        metrics.newest_message_date.isoformat()
                        if metrics.newest_message_date
                        else None
                    ),
                },
            }

        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            result = loop.run_until_complete(collect_metrics())
            logger.info(f"Storage metrics collected: {result['metrics']}")

            # Log warnings if storage is getting large
            total_size_gb = result["metrics"]["total_size_mb"] / 1024
            if total_size_gb > 10:  # 10 GB
                logger.warning(
                    f"⚠️ Database size is {total_size_gb:.2f}GB - consider upgrading storage"
                )

            if result["metrics"]["total_messages"] > 10_000_000:  # 10M messages
                logger.warning(
                    f"⚠️ {result['metrics']['total_messages']:,} messages in database - consider partitioning"
                )

            return result
        finally:
            loop.close()

    except Exception as e:
        logger.error(f"Storage metrics collection failed: {e}")
        return {
            "task": "collect_storage_metrics",
            "timestamp": datetime.now().isoformat(),
            "success": False,
            "error": str(e),
        }


@celery_app.task(name="app.tasks.maintenance.emergency_cleanup_task")
def emergency_cleanup_task(force_delete_days: int = None) -> dict[str, Any]:
    """Emergency cleanup task for critical storage situations"""
    try:
        import asyncio

        from app.core.database import db_manager

        async def emergency_cleanup():
            await db_manager.initialize()
            archival_service = DataArchivalService(settings)

            # Override delete threshold if provided
            if force_delete_days:
                archival_service.delete_threshold_days = force_delete_days
                logger.warning(
                    f"⚠️ Emergency cleanup: deleting data older than {force_delete_days} days"
                )

            # Get current metrics
            before_metrics = await archival_service.get_storage_metrics()

            # Run aggressive cleanup
            archive_stats = await archival_service.archive_old_conversations(batch_size=10000)
            compress_stats = await archival_service.compress_old_messages(batch_size=5000)
            delete_stats = await archival_service.delete_expired_conversations()

            # Vacuum database
            await archival_service.vacuum_database()

            # Get final metrics
            after_metrics = await archival_service.get_storage_metrics()

            space_freed = before_metrics.total_size_mb - after_metrics.total_size_mb

            return {
                "task": "emergency_cleanup",
                "timestamp": datetime.now().isoformat(),
                "success": True,
                "before_size_mb": before_metrics.total_size_mb,
                "after_size_mb": after_metrics.total_size_mb,
                "space_freed_mb": space_freed,
                "archive_stats": {
                    "messages_archived": archive_stats.messages_archived,
                    "threads_archived": archive_stats.threads_archived,
                },
                "compress_stats": {
                    "messages_compressed": compress_stats.messages_compressed,
                    "space_freed_mb": compress_stats.space_freed_mb,
                },
                "delete_stats": {
                    "messages_deleted": delete_stats.messages_deleted,
                },
            }

        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            result = loop.run_until_complete(emergency_cleanup())
            logger.info(f"Emergency cleanup completed: freed {result['space_freed_mb']:.2f}MB")
            return result
        finally:
            loop.close()

    except Exception as e:
        logger.error(f"Emergency cleanup task failed: {e}")
        return {
            "task": "emergency_cleanup",
            "timestamp": datetime.now().isoformat(),
            "success": False,
            "error": str(e),
        }


# Utility function to run tasks manually
def run_task_now(task_name: str, **kwargs: Any):
    """Run a maintenance task immediately (for testing/manual execution)"""
    task_map = {
        "daily_archival": daily_archival_task,
        "weekly_compression": weekly_compression_task,
        "monthly_maintenance": monthly_maintenance_task,
        "collect_metrics": collect_storage_metrics_task,
        "emergency_cleanup": emergency_cleanup_task,
    }

    if task_name not in task_map:
        raise ValueError(f"Unknown task: {task_name}")

    task = task_map[task_name]
    return task.delay(**kwargs)
