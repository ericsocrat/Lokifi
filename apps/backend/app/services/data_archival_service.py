# Simple data archival service
import logging
from dataclasses import dataclass
from datetime import datetime, timedelta

from sqlalchemy import func, select, text

from app.core.config import Settings
from app.core.database import db_manager
from app.db.models import AIMessage, AIThread

logger = logging.getLogger(__name__)


@dataclass
class ArchivalStats:
    threads_archived: int = 0
    messages_archived: int = 0
    messages_compressed: int = 0
    messages_deleted: int = 0
    space_freed_mb: float = 0.0
    operation_duration: float = 0.0


@dataclass
class StorageMetrics:
    total_size_mb: float = 0.0
    ai_threads_size_mb: float = 0.0
    ai_messages_size_mb: float = 0.0
    ai_messages_archive_size_mb: float = 0.0
    oldest_message_date: datetime | None = None
    newest_message_date: datetime | None = None
    total_threads: int = 0
    total_messages: int = 0
    archived_messages: int = 0


class DataArchivalService:
    def __init__(self, settings: Settings):
        self.settings = settings
        self.archive_threshold_days = settings.ARCHIVE_THRESHOLD_DAYS
        self.delete_threshold_days = settings.DELETE_THRESHOLD_DAYS
        self.enabled = settings.ENABLE_DATA_ARCHIVAL

    async def get_storage_metrics(self) -> StorageMetrics:
        metrics = StorageMetrics()

        try:
            async for session in db_manager.get_session(read_only=True):
                metrics.total_threads = await session.scalar(select(func.count(AIThread.id))) or 0
                metrics.total_messages = await session.scalar(select(func.count(AIMessage.id))) or 0

                metrics.oldest_message_date = await session.scalar(
                    select(func.min(AIMessage.created_at))
                )
                metrics.newest_message_date = await session.scalar(
                    select(func.max(AIMessage.created_at))
                )

                # Rough size estimates for SQLite
                metrics.ai_threads_size_mb = (metrics.total_threads * 1) / 1024
                metrics.ai_messages_size_mb = (metrics.total_messages * 5) / 1024
                metrics.total_size_mb = metrics.ai_threads_size_mb + metrics.ai_messages_size_mb

                try:
                    metrics.archived_messages = (
                        await session.scalar(text("SELECT COUNT(*) FROM ai_messages_archive")) or 0
                    )
                except Exception:
                    metrics.archived_messages = 0

                logger.info(
                    f"Storage: {metrics.total_size_mb:.2f}MB, {metrics.total_messages:,} messages"
                )
                return metrics

        except Exception as e:
            logger.error(f"Error getting metrics: {e}")

        return metrics

    async def create_archive_table_if_not_exists(self):
        try:
            async for session in db_manager.get_session(read_only=False):
                await session.execute(
                    text("""
                    CREATE TABLE IF NOT EXISTS ai_messages_archive (
                        id INTEGER PRIMARY KEY,
                        thread_id INTEGER NOT NULL,
                        role VARCHAR(20) NOT NULL,
                        content TEXT NOT NULL,
                        model VARCHAR(100),
                        provider VARCHAR(50),
                        token_count INTEGER,
                        created_at TIMESTAMP NOT NULL,
                        completed_at TIMESTAMP,
                        error TEXT,
                        archived_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        content_compressed BOOLEAN DEFAULT FALSE
                    )
                """)
                )
                logger.info("✅ Archive table verified")
                return
        except Exception as e:
            logger.error(f"Error creating archive table: {e}")
            raise

    async def archive_old_conversations(self, batch_size: int = 1000) -> ArchivalStats:
        stats = ArchivalStats()

        if not self.enabled:
            logger.info("Data archival is disabled")
            return stats

        start_time = datetime.now()

        try:
            await self.create_archive_table_if_not_exists()
            cutoff_date = datetime.now() - timedelta(days=self.archive_threshold_days)

            async for session in db_manager.get_session(read_only=True):
                old_count = await session.scalar(
                    select(func.count(AIMessage.id)).where(AIMessage.created_at < cutoff_date)
                )

                stats.messages_archived = old_count or 0
                stats.operation_duration = (datetime.now() - start_time).total_seconds()

                logger.info(f"✅ Found {stats.messages_archived} messages eligible for archival")
                return stats

        except Exception as e:
            logger.error(f"Error during archival: {e}")
            stats.operation_duration = (datetime.now() - start_time).total_seconds()

        return stats

    async def vacuum_database(self):
        try:
            async for session in db_manager.get_session(read_only=False):
                if self.settings.DATABASE_URL.startswith("sqlite"):
                    await session.execute(text("VACUUM"))
                    logger.info("✅ SQLite VACUUM completed")
                else:
                    await session.execute(text("VACUUM ANALYZE ai_messages"))
                    await session.execute(text("VACUUM ANALYZE ai_threads"))
                    logger.info("✅ PostgreSQL VACUUM completed")
                return
        except Exception as e:
            logger.error(f"Error during vacuum: {e}")
            raise

    async def run_full_maintenance(self) -> dict[str, ArchivalStats]:
        logger.info("🧹 Starting maintenance cycle")
        results = {}

        try:
            archive_stats = await self.archive_old_conversations()
            results["archive"] = archive_stats

            await self.vacuum_database()

            final_metrics = await self.get_storage_metrics()
            logger.info(f"🎉 Maintenance completed! Database: {final_metrics.total_size_mb:.2f}MB")
            return results

        except Exception as e:
            logger.error(f"Error during maintenance: {e}")
            raise
