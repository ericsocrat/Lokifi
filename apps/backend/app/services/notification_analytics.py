# J6.2 Notification Analytics Dashboard
"""
Advanced analytics and performance monitoring for J6.2 notification system.
Provides insights into notification delivery, user engagement, and system performance.
"""

import asyncio
import logging
from collections import defaultdict, deque
from dataclasses import asdict, dataclass
from datetime import UTC, datetime, timedelta
from typing import Any

from sqlalchemy import and_, desc, func, select

from app.core.database import db_manager
from app.core.redis_client import redis_client
from app.models.notification_models import Notification, NotificationPreference
from app.models.user import User

logger = logging.getLogger(__name__)


@dataclass
class NotificationMetrics:
    """Comprehensive notification metrics"""

    total_sent: int = 0
    total_delivered: int = 0
    total_read: int = 0
    total_dismissed: int = 0
    total_clicked: int = 0
    delivery_rate: float = 0.0
    read_rate: float = 0.0
    engagement_rate: float = 0.0
    average_time_to_read: float = 0.0
    peak_hour: int = 0
    top_notification_types: list[dict[str, Any]] = None

    # Performance attributes for monitoring
    average_response_time: float = 0.0
    system_uptime: float = 100.0
    error_count: int = 0
    successful_deliveries: int = 0


@dataclass
class UserEngagementMetrics:
    """User engagement metrics"""

    active_users: int = 0
    highly_engaged_users: int = 0
    unresponsive_users: int = 0
    average_notifications_per_user: float = 0.0
    user_preference_adoption: float = 0.0


@dataclass
class SystemPerformanceMetrics:
    """System performance metrics"""

    websocket_connections: int = 0
    average_delivery_time_ms: float = 0.0
    database_query_time_ms: float = 0.0
    cache_hit_rate: float = 0.0
    error_rate: float = 0.0
    memory_usage_mb: float = 0.0


class NotificationAnalytics:
    """Advanced analytics for notification system"""

    def __init__(self):
        self.metrics_history = deque(maxlen=1000)  # Store last 1000 data points
        self.performance_counters = defaultdict(int)
        self.timing_data = defaultdict(list)

    async def get_comprehensive_metrics(
        self, start_date: datetime | None = None, end_date: datetime | None = None
    ) -> dict[str, Any]:
        """Get comprehensive notification metrics"""
        if not start_date:
            start_date = datetime.now(UTC) - timedelta(days=7)
        if not end_date:
            end_date = datetime.now(UTC)

        try:
            async for session in db_manager.get_session(read_only=True):
                # Query notifications within date range - count only
                # notifications = await session.execute(
                #     select(Notification).where(
                #         and_(
                #             Notification.created_at >= start_date,
                #             Notification.created_at <= end_date
                #         )
                #     )
                # )

                # Get basic counts
                total_result = await session.execute(
                    select(func.count(Notification.id)).where(
                        and_(
                            Notification.created_at >= start_date,
                            Notification.created_at <= end_date,
                        )
                    )
                )
                total_sent = total_result.scalar() or 0

                # Delivery metrics (SQLite compatible)
                delivered_result = await session.execute(
                    select(func.count(Notification.id)).where(
                        and_(
                            Notification.created_at >= start_date,
                            Notification.created_at <= end_date,
                            Notification.is_delivered.is_(True),
                        )
                    )
                )
                total_delivered = delivered_result.scalar() or 0

                # Engagement metrics (SQLite compatible)
                read_result = await session.execute(
                    select(func.count(Notification.id)).where(
                        and_(
                            Notification.created_at >= start_date,
                            Notification.created_at <= end_date,
                            Notification.is_read.is_(True),
                        )
                    )
                )
                total_read = read_result.scalar() or 0

                clicked_result = await session.execute(
                    select(func.count(Notification.id)).where(
                        and_(
                            Notification.created_at >= start_date,
                            Notification.created_at <= end_date,
                            Notification.clicked_at.is_not(None),
                        )
                    )
                )
                total_clicked = clicked_result.scalar() or 0

                # Calculate rates
                delivery_rate = (total_delivered / total_sent * 100) if total_sent > 0 else 0
                read_rate = (total_read / total_delivered * 100) if total_delivered > 0 else 0
                engagement_rate = (total_clicked / total_read * 100) if total_read > 0 else 0

                # Top notification types
                type_stats = await session.execute(
                    select(
                        Notification.type,
                        func.count(Notification.id).label("count"),
                        func.avg(
                            func.extract("epoch", Notification.read_at - Notification.created_at)
                        ).label("avg_time_to_read"),
                    )
                    .where(
                        and_(
                            Notification.created_at >= start_date,
                            Notification.created_at <= end_date,
                        )
                    )
                    .group_by(Notification.type)
                    .order_by(desc("count"))
                )

                top_types = []
                for row in type_stats:
                    top_types.append(
                        {
                            "type": row.type,
                            "count": row.count,
                            "avg_time_to_read": row.avg_time_to_read or 0,
                        }
                    )

                # Peak hour analysis
                hourly_stats = await session.execute(
                    select(
                        func.extract("hour", Notification.created_at).label("hour"),
                        func.count(Notification.id).label("count"),
                    )
                    .where(
                        and_(
                            Notification.created_at >= start_date,
                            Notification.created_at <= end_date,
                        )
                    )
                    .group_by("hour")
                    .order_by(desc("count"))
                )

                peak_hour = 0
                max_count = 0
                for row in hourly_stats:
                    if row.count > max_count:
                        max_count = row.count
                        peak_hour = int(row.hour)

                metrics = NotificationMetrics(
                    total_sent=total_sent,
                    total_delivered=total_delivered,
                    total_read=total_read,
                    total_clicked=total_clicked,
                    delivery_rate=round(delivery_rate, 2),
                    read_rate=round(read_rate, 2),
                    engagement_rate=round(engagement_rate, 2),
                    peak_hour=peak_hour,
                    top_notification_types=top_types[:10],  # Top 10
                )

                return asdict(metrics)

        except Exception as e:
            logger.error(f"Failed to get comprehensive metrics: {e}")
            return {}

    async def get_user_engagement_metrics(
        self,
        user_id: str | None = None,
        days: int = 30,
        start_date: datetime | None = None,
        end_date: datetime | None = None,
    ) -> UserEngagementMetrics:
        """Get user engagement metrics"""
        if not start_date:
            start_date = datetime.now(UTC) - timedelta(days=days)
        if not end_date:
            end_date = datetime.now(UTC)

        try:
            async for session in db_manager.get_session(read_only=True):
                # If specific user_id provided, get their metrics
                if user_id and user_id != "system":
                    total_notifications = await session.scalar(
                        select(func.count(Notification.id)).where(
                            and_(
                                Notification.user_id == user_id,
                                Notification.created_at >= start_date,
                                Notification.created_at <= end_date,
                            )
                        )
                    )

                    read_notifications = await session.scalar(
                        select(func.count(Notification.id)).where(
                            and_(
                                Notification.user_id == user_id,
                                Notification.created_at >= start_date,
                                Notification.created_at <= end_date,
                                Notification.is_read.is_(True),
                            )
                        )
                    )

                    return UserEngagementMetrics(
                        active_users=1 if total_notifications > 0 else 0,
                        avg_notifications_per_user=total_notifications or 0,
                        engagement_rate=(read_notifications / total_notifications * 100)
                        if total_notifications > 0
                        else 0,
                        most_active_times=[],
                        user_retention_7d=100.0,
                    )

                # System-wide metrics
                active_users_result = await session.execute(
                    select(func.count(func.distinct(Notification.user_id))).where(
                        and_(
                            Notification.created_at >= start_date,
                            Notification.created_at <= end_date,
                        )
                    )
                )
                active_users = active_users_result.scalar() or 0

                # Highly engaged users (read > 70% of notifications)
                user_engagement = await session.execute(
                    select(
                        Notification.user_id,
                        func.count(Notification.id).label("total"),
                        func.sum(
                            func.cast(Notification.is_read, db_manager.get_engine().dialect.BOOLEAN)
                        ).label("read_count"),
                    )
                    .where(
                        and_(
                            Notification.created_at >= start_date,
                            Notification.created_at <= end_date,
                        )
                    )
                    .group_by(Notification.user_id)
                )

                highly_engaged = 0
                unresponsive = 0
                total_notifications = 0

                for row in user_engagement:
                    total_notifications += row.total
                    read_percentage = (row.read_count / row.total) * 100 if row.total > 0 else 0

                    if read_percentage > 70:
                        highly_engaged += 1
                    elif read_percentage < 10:
                        unresponsive += 1

                # User preference adoption
                total_users_result = await session.execute(
                    select(func.count(func.distinct(User.id)))
                )
                total_users = total_users_result.scalar() or 1

                preferences_result = await session.execute(
                    select(func.count(func.distinct(NotificationPreference.user_id)))
                )
                users_with_preferences = preferences_result.scalar() or 0

                preference_adoption = (users_with_preferences / total_users) * 100

                avg_notifications_per_user = (
                    total_notifications / active_users if active_users > 0 else 0
                )

                return UserEngagementMetrics(
                    active_users=active_users,
                    highly_engaged_users=highly_engaged,
                    unresponsive_users=unresponsive,
                    average_notifications_per_user=round(avg_notifications_per_user, 2),
                    user_preference_adoption=round(preference_adoption, 2),
                )

        except Exception as e:
            logger.error(f"Failed to get user engagement metrics: {e}")
            return UserEngagementMetrics()

    async def get_system_performance_metrics(self) -> SystemPerformanceMetrics:
        """Get system performance metrics"""
        try:
            # Redis metrics
            cache_hit_rate = 0.0
            if await redis_client.is_available():
                # Simplified cache hit rate calculation
                cache_hit_rate = 85.0  # Placeholder - would implement proper tracking

            # WebSocket connections from performance monitor
            websocket_connections = len(self.performance_counters.get("websocket_connections", {}))

            # Database timing
            db_times = self.timing_data.get("db_queries", [])
            avg_db_time = sum(db_times) / len(db_times) if db_times else 0

            # Delivery timing
            delivery_times = self.timing_data.get("notification_delivery", [])
            avg_delivery_time = sum(delivery_times) / len(delivery_times) if delivery_times else 0

            return SystemPerformanceMetrics(
                websocket_connections=websocket_connections,
                average_delivery_time_ms=round(avg_delivery_time, 2),
                database_query_time_ms=round(avg_db_time, 2),
                cache_hit_rate=cache_hit_rate,
                error_rate=self.performance_counters.get("errors", 0)
                / max(self.performance_counters.get("total_requests", 1), 1)
                * 100,
            )

        except Exception as e:
            logger.error(f"Failed to get system performance metrics: {e}")
            return SystemPerformanceMetrics()

    async def get_dashboard_data(self, days: int = 7) -> dict[str, Any]:
        """Get complete dashboard data"""
        try:
            # Run all metrics collection concurrently with date range
            start_date = datetime.now(UTC) - timedelta(days=days)
            end_date = datetime.now(UTC)

            notification_metrics, user_metrics, system_metrics = await asyncio.gather(
                self.get_comprehensive_metrics(start_date, end_date),
                self.get_user_engagement_metrics("system", days),  # System-wide metrics
                self.get_system_performance_metrics(),
            )

            return {
                "timestamp": datetime.now(UTC).isoformat(),
                "notification_metrics": asdict(notification_metrics),
                "user_engagement": asdict(user_metrics),
                "system_performance": asdict(system_metrics),
                "redis_status": await redis_client.is_available(),
                "health_score": await self.calculate_system_health_score(),
                "period_days": days,
            }

        except Exception as e:
            logger.error(f"Failed to get dashboard data: {e}")
            return {"error": str(e), "timestamp": datetime.now(UTC).isoformat()}

    def _calculate_health_score(
        self,
        notification_metrics: NotificationMetrics,
        user_metrics: UserEngagementMetrics,
        system_metrics: SystemPerformanceMetrics,
    ) -> dict[str, Any]:
        """Calculate overall system health score"""
        scores = []

        # Delivery score (0-100)
        delivery_score = min(notification_metrics.delivery_rate, 100)
        scores.append(delivery_score)

        # Engagement score (0-100)
        engagement_score = min(notification_metrics.read_rate, 100)
        scores.append(engagement_score)

        # Performance score (0-100)
        performance_score = 100 - min(system_metrics.error_rate, 100)
        scores.append(performance_score)

        # Cache score (0-100)
        cache_score = system_metrics.cache_hit_rate
        scores.append(cache_score)

        overall_score = sum(scores) / len(scores)

        status = (
            "excellent"
            if overall_score >= 90
            else "good"
            if overall_score >= 75
            else "fair"
            if overall_score >= 50
            else "poor"
        )

        return {
            "overall_score": round(overall_score, 1),
            "status": status,
            "breakdown": {
                "delivery": round(delivery_score, 1),
                "engagement": round(engagement_score, 1),
                "performance": round(performance_score, 1),
                "caching": round(cache_score, 1),
            },
        }

    def record_performance_metric(self, metric_name: str, value: float):
        """Record a performance metric"""
        self.timing_data[metric_name].append(value)
        # Keep only last 100 measurements
        if len(self.timing_data[metric_name]) > 100:
            self.timing_data[metric_name] = self.timing_data[metric_name][-100:]

    def increment_counter(self, counter_name: str):
        """Increment a performance counter"""
        self.performance_counters[counter_name] += 1

    async def calculate_system_health_score(self) -> float:
        """Calculate overall system health score"""
        try:
            # Get metrics
            notification_metrics = await self.get_comprehensive_metrics()
            # user_metrics = await self.get_user_engagement_metrics("system", 7)  # Reserved for future use
            system_metrics = await self.get_system_performance_metrics()

            scores = []

            # Delivery success rate (0-100)
            delivery_score = min(notification_metrics.delivery_rate, 100)
            scores.append(delivery_score)

            # Engagement score (0-100)
            engagement_score = min(notification_metrics.read_rate, 100)
            scores.append(engagement_score)

            # System performance (0-100)
            performance_score = 100 - min(system_metrics.error_rate, 100)
            scores.append(performance_score)

            # Redis availability (0-100)
            redis_available = await redis_client.is_available()
            redis_score = 100 if redis_available else 50  # 50 for graceful degradation
            scores.append(redis_score)

            # Calculate weighted average
            health_score = sum(scores) / len(scores) if scores else 0
            return round(health_score, 1)

        except Exception as e:
            logger.error(f"Failed to calculate health score: {e}")
            return 0.0


# Global analytics instance
notification_analytics = NotificationAnalytics()
