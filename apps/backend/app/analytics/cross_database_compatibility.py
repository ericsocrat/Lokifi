"""
K4 - SQLite/Postgres Analytics Compatibility Layer for Lokifi Phase K
Provides cross-database compatibility for analytics queries with fallback strategies
"""

import logging
from datetime import UTC, datetime, timedelta
from typing import Any

from sqlalchemy import String, func, text
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session
from sqlalchemy.sql import ClauseElement
from sqlalchemy.sql.elements import ColumnElement

logger = logging.getLogger(__name__)


class DatabaseDialect:
    """Database dialect detection and configuration"""

    SQLITE = "sqlite"
    POSTGRESQL = "postgresql"

    @staticmethod
    def detect_dialect(engine: Engine) -> str:
        """Detect database dialect from engine"""
        dialect_name = engine.dialect.name.lower()

        if "sqlite" in dialect_name:
            return DatabaseDialect.SQLITE
        elif "postgresql" in dialect_name:
            return DatabaseDialect.POSTGRESQL
        else:
            logger.warning(f"Unknown dialect: {dialect_name}, defaulting to SQLite compatibility")
            return DatabaseDialect.SQLITE


class CrossDatabaseQuery:
    """Cross-database query builder with dialect-specific optimizations"""

    def __init__(self, dialect: str):
        self.dialect = dialect
        self.is_sqlite = dialect == DatabaseDialect.SQLITE
        self.is_postgresql = dialect == DatabaseDialect.POSTGRESQL

    def json_extract(self, column: ColumnElement[Any], path: str) -> ClauseElement:
        """Extract JSON field with cross-database compatibility"""

        if self.is_postgresql:
            # PostgreSQL: Use ->> operator for text extraction
            return text(f"{column.name} ->> '{path}'")

        elif self.is_sqlite:
            # SQLite: Use JSON_EXTRACT function (requires JSON1 extension)
            return text(f"JSON_EXTRACT({column.name}, '$.{path}')")

        else:
            # Fallback: Cast to text and hope for the best
            logger.warning(f"JSON extraction fallback for dialect: {self.dialect}")
            return func.cast(column, String)

    def json_object_keys(self, column: ColumnElement[Any]) -> ClauseElement:
        """Get JSON object keys with cross-database compatibility"""

        if self.is_postgresql:
            # PostgreSQL: Use jsonb_object_keys
            return func.jsonb_object_keys(column)

        elif self.is_sqlite:
            # SQLite: No direct equivalent, return placeholder
            logger.warning("JSON object keys not directly supported in SQLite")
            return text("'[]'")  # Return empty array as fallback

        else:
            return text("'[]'")

    def date_trunc(self, field: str, column: ColumnElement[Any]) -> ClauseElement:
        """Date truncation with cross-database compatibility"""

        if self.is_postgresql:
            # PostgreSQL: DATE_TRUNC function
            return func.date_trunc(field, column)

        elif self.is_sqlite:
            # SQLite: Use strftime for date truncation
            format_map = {
                "hour": "%Y-%m-%d %H:00:00",
                "day": "%Y-%m-%d",
                "week": "%Y-%W",
                "month": "%Y-%m",
                "year": "%Y",
            }

            if field in format_map:
                return func.strftime(format_map[field], column)
            else:
                logger.warning(f"Unsupported date truncation field for SQLite: {field}")
                return column

        else:
            return column

    def window_function_row_number(
        self,
        partition_by: ColumnElement[Any] | None = None,
        order_by: ColumnElement[Any] | None = None,
    ) -> ClauseElement:
        """ROW_NUMBER() window function with compatibility"""

        if self.is_sqlite:
            # SQLite 3.25+ supports window functions
            return func.row_number().over(partition_by=partition_by, order_by=order_by)

        elif self.is_postgresql:
            # PostgreSQL full support
            return func.row_number().over(partition_by=partition_by, order_by=order_by)

        else:
            # Fallback without window function
            logger.warning("Window functions not supported, using fallback")
            return text("1")

    def aggregate_array(self, column: ColumnElement[Any]) -> ClauseElement:
        """Array aggregation with cross-database compatibility"""

        if self.is_postgresql:
            # PostgreSQL: ARRAY_AGG
            return func.array_agg(column)

        elif self.is_sqlite:
            # SQLite: GROUP_CONCAT (different semantics but similar result)
            return func.group_concat(column)

        else:
            return func.group_concat(column)

    def regex_match(self, column: ColumnElement[Any], pattern: str) -> ClauseElement:
        """Regex matching with cross-database compatibility"""

        if self.is_postgresql:
            # PostgreSQL: ~ operator
            return column.op("~")(pattern)

        elif self.is_sqlite:
            # SQLite: REGEXP (requires extension, fallback to LIKE)
            logger.warning("SQLite REGEXP requires extension, using LIKE fallback")
            return column.like(f'%{pattern.replace(".*", "%")}%')

        else:
            return column.like(f"%{pattern}%")


class AnalyticsQueryBuilder:
    """Analytics query builder with cross-database compatibility"""

    def __init__(self, engine: Engine):
        self.engine = engine
        self.dialect = DatabaseDialect.detect_dialect(engine)
        self.query_builder = CrossDatabaseQuery(self.dialect)
        logger.info(f"Analytics initialized for dialect: {self.dialect}")

    def user_activity_by_hour(self, session: Session, days_back: int = 7) -> list[dict[str, Any]]:
        """Get user activity grouped by hour with cross-database compatibility"""

        try:
            # Get cutoff date
            cutoff_date = datetime.now(UTC) - timedelta(days=days_back)

            # Build query with dialect-specific date truncation
            if self.dialect == DatabaseDialect.POSTGRESQL:
                query = text(
                    """
                    SELECT
                        DATE_TRUNC('hour', created_at) as hour,
                        COUNT(*) as activity_count,
                        COUNT(DISTINCT user_id) as unique_users
                    FROM notifications
                    WHERE created_at >= :cutoff_date
                    GROUP BY DATE_TRUNC('hour', created_at)
                    ORDER BY hour DESC
                    LIMIT 168
                """
                )

            elif self.dialect == DatabaseDialect.SQLITE:
                query = text(
                    """
                    SELECT
                        strftime('%Y-%m-%d %H:00:00', created_at) as hour,
                        COUNT(*) as activity_count,
                        COUNT(DISTINCT user_id) as unique_users
                    FROM notifications
                    WHERE created_at >= :cutoff_date
                    GROUP BY strftime('%Y-%m-%d %H:00:00', created_at)
                    ORDER BY hour DESC
                    LIMIT 168
                """
                )

            result = session.execute(query, {"cutoff_date": cutoff_date})

            return [
                {
                    "hour": row.hour,
                    "activity_count": row.activity_count,
                    "unique_users": row.unique_users,
                }
                for row in result
            ]

        except Exception as e:
            logger.error(f"Error in user_activity_by_hour: {e}")
            return self._fallback_user_activity(session, days_back)

    def notification_analytics(self, session: Session, days_back: int = 30) -> dict[str, Any]:
        """Get notification analytics with cross-database compatibility"""

        try:
            cutoff_date = datetime.now(UTC) - timedelta(days=days_back)

            # Base query that works on both databases
            base_query = text(
                """
                SELECT
                    type,
                    priority,
                    COUNT(*) as count,
                    AVG(CASE WHEN is_read = 1 THEN 1.0 ELSE 0.0 END) as read_rate,
                    AVG(CASE WHEN is_delivered = 1 THEN 1.0 ELSE 0.0 END) as delivery_rate
                FROM notifications
                WHERE created_at >= :cutoff_date
                GROUP BY type, priority
                ORDER BY count DESC
            """
            )

            result = session.execute(base_query, {"cutoff_date": cutoff_date})

            analytics = {
                "by_type": {},
                "by_priority": {},
                "overall_metrics": {
                    "total_notifications": 0,
                    "avg_read_rate": 0.0,
                    "avg_delivery_rate": 0.0,
                },
            }

            total_count = 0
            total_read_rate = 0.0
            total_delivery_rate = 0.0

            for row in result:
                count_val = int(row[2]) if row[2] else 0  # count column
                read_rate_val = float(row[3]) if row[3] else 0.0  # read_rate column
                delivery_rate_val = float(row[4]) if row[4] else 0.0  # delivery_rate column

                # By type
                if row[0] not in analytics["by_type"]:  # type column
                    analytics["by_type"][row[0]] = {
                        "count": 0,
                        "read_rate": 0.0,
                        "delivery_rate": 0.0,
                    }

                analytics["by_type"][row[0]]["count"] += count_val
                analytics["by_type"][row[0]]["read_rate"] = read_rate_val
                analytics["by_type"][row[0]]["delivery_rate"] = delivery_rate_val

                # By priority
                if row[1] not in analytics["by_priority"]:  # priority column
                    analytics["by_priority"][row[1]] = {
                        "count": 0,
                        "read_rate": 0.0,
                        "delivery_rate": 0.0,
                    }

                analytics["by_priority"][row[1]]["count"] += count_val
                analytics["by_priority"][row[1]]["read_rate"] = read_rate_val
                analytics["by_priority"][row[1]]["delivery_rate"] = delivery_rate_val

                # Overall metrics
                total_count += count_val
                total_read_rate += read_rate_val * count_val
                total_delivery_rate += delivery_rate_val * count_val

            # Calculate overall averages
            if total_count > 0:
                analytics["overall_metrics"]["total_notifications"] = total_count
                analytics["overall_metrics"]["avg_read_rate"] = total_read_rate / total_count
                analytics["overall_metrics"]["avg_delivery_rate"] = (
                    total_delivery_rate / total_count
                )

            return analytics

        except Exception as e:
            logger.error(f"Error in notification_analytics: {e}")
            return self._fallback_notification_analytics(session, days_back)

    def user_engagement_metrics(self, session: Session, days_back: int = 30) -> dict[str, Any]:
        """Get user engagement metrics with cross-database compatibility"""

        try:
            cutoff_date = datetime.now(UTC) - timedelta(days=days_back)

            # Simplified query that works on both databases
            engagement_query = text(
                """
                SELECT
                    user_id,
                    COUNT(*) as total_notifications,
                    COUNT(CASE WHEN is_read = 1 THEN 1 END) as read_notifications,
                    COUNT(CASE WHEN clicked_at IS NOT NULL THEN 1 END) as clicked_notifications,
                    MAX(created_at) as last_notification
                FROM notifications
                WHERE created_at >= :cutoff_date
                GROUP BY user_id
                ORDER BY total_notifications DESC
                LIMIT 100
            """
            )

            result = session.execute(engagement_query, {"cutoff_date": cutoff_date})

            users = []
            total_users = 0
            total_engagement = 0

            for row in result:
                engagement_rate = (
                    (row.read_notifications + row.clicked_notifications)
                    / (row.total_notifications * 2)
                    if row.total_notifications > 0
                    else 0
                )

                users.append(
                    {
                        "user_id": row.user_id,
                        "total_notifications": row.total_notifications,
                        "read_notifications": row.read_notifications,
                        "clicked_notifications": row.clicked_notifications,
                        "engagement_rate": engagement_rate,
                        "last_notification": row.last_notification,
                    }
                )

                total_users += 1
                total_engagement += engagement_rate

            return {
                "users": users[:20],  # Top 20 users
                "summary": {
                    "total_users": total_users,
                    "avg_engagement_rate": total_engagement / total_users if total_users > 0 else 0,
                    "active_users": len([u for u in users if u["total_notifications"] > 0]),
                },
            }

        except Exception as e:
            logger.error(f"Error in user_engagement_metrics: {e}")
            return self._fallback_user_engagement(session, days_back)

    def message_analytics(self, session: Session, days_back: int = 7) -> dict[str, Any]:
        """Get message analytics with cross-database compatibility"""

        try:
            cutoff_date = datetime.now(UTC) - timedelta(days=days_back)

            # Check if messages table exists
            if self.dialect == DatabaseDialect.POSTGRESQL:
                table_check = text(
                    """
                    SELECT EXISTS (
                        SELECT FROM information_schema.tables
                        WHERE table_name = 'messages'
                    )
                """
                )
            else:
                table_check = text(
                    """
                    SELECT COUNT(*) > 0 FROM sqlite_master
                    WHERE type='table' AND name='messages'
                """
                )

            table_exists = session.execute(table_check).scalar()

            if not table_exists:
                logger.warning("Messages table not found, returning empty analytics")
                return {"error": "Messages table not available", "fallback": True}

            # Simple message analytics query
            message_query = text(
                """
                SELECT
                    COUNT(*) as total_messages,
                    COUNT(DISTINCT sender_id) as unique_senders,
                    AVG(LENGTH(content)) as avg_message_length
                FROM messages
                WHERE created_at >= :cutoff_date
            """
            )

            result = session.execute(message_query, {"cutoff_date": cutoff_date}).first()

            if not result:
                return {
                    "total_messages": 0,
                    "unique_senders": 0,
                    "avg_message_length": 0.0,
                    "period_days": days_back,
                }

            return {
                "total_messages": int(result[0]) if result[0] else 0,
                "unique_senders": int(result[1]) if result[1] else 0,
                "avg_message_length": float(result[2]) if result[2] else 0.0,
                "period_days": days_back,
            }

        except Exception as e:
            logger.error(f"Error in message_analytics: {e}")
            return self._fallback_message_analytics(session, days_back)

    # Fallback methods for when complex queries fail

    def _fallback_user_activity(self, session: Session, days_back: int) -> list[dict[str, Any]]:
        """Simplified fallback for user activity"""
        logger.info("Using fallback user activity query")

        try:
            cutoff_date = datetime.now(UTC) - timedelta(days=days_back)

            simple_query = text(
                """
                SELECT
                    DATE(created_at) as day,
                    COUNT(*) as activity_count
                FROM notifications
                WHERE created_at >= :cutoff_date
                GROUP BY DATE(created_at)
                ORDER BY day DESC
            """
            )

            result = session.execute(simple_query, {"cutoff_date": cutoff_date})

            return [
                {
                    "hour": f"{row.day} 12:00:00",  # Fake hour data
                    "activity_count": row.activity_count,
                    "unique_users": row.activity_count,  # Approximate
                }
                for row in result
            ]

        except Exception as e:
            logger.error(f"Fallback user activity failed: {e}")
            return []

    def _fallback_notification_analytics(self, session: Session, days_back: int) -> dict[str, Any]:
        """Simplified fallback for notification analytics"""
        logger.info("Using fallback notification analytics")

        try:
            cutoff_date = datetime.now(UTC) - timedelta(days=days_back)

            simple_query = text(
                """
                SELECT COUNT(*) as total_count
                FROM notifications
                WHERE created_at >= :cutoff_date
            """
            )

            result = session.execute(simple_query, {"cutoff_date": cutoff_date}).scalar()

            return {
                "by_type": {"unknown": {"count": result, "read_rate": 0.5, "delivery_rate": 0.8}},
                "by_priority": {
                    "normal": {"count": result, "read_rate": 0.5, "delivery_rate": 0.8}
                },
                "overall_metrics": {
                    "total_notifications": result,
                    "avg_read_rate": 0.5,
                    "avg_delivery_rate": 0.8,
                },
                "fallback": True,
            }

        except Exception as e:
            logger.error(f"Fallback notification analytics failed: {e}")
            return {"error": "All analytics queries failed", "fallback": True}

    def _fallback_user_engagement(self, session: Session, days_back: int) -> dict[str, Any]:
        """Simplified fallback for user engagement"""
        logger.info("Using fallback user engagement query")

        return {
            "users": [],
            "summary": {"total_users": 0, "avg_engagement_rate": 0.0, "active_users": 0},
            "fallback": True,
        }

    def _fallback_message_analytics(self, session: Session, days_back: int) -> dict[str, Any]:
        """Simplified fallback for message analytics"""
        logger.info("Using fallback message analytics")

        return {
            "total_messages": 0,
            "unique_senders": 0,
            "avg_message_length": 0.0,
            "period_days": days_back,
            "fallback": True,
        }


class CompatibilityTester:
    """Test cross-database compatibility"""

    def __init__(self, engine: Engine):
        self.engine = engine
        self.dialect = DatabaseDialect.detect_dialect(engine)

    def test_basic_queries(self, session: Session) -> dict[str, bool]:
        """Test basic query compatibility"""

        tests = {}

        # Test 1: Basic SELECT
        try:
            result = session.execute(text("SELECT 1 as test")).scalar()
            tests["basic_select"] = result == 1
        except Exception as e:
            logger.error(f"Basic select failed: {e}")
            tests["basic_select"] = False

        # Test 2: Date functions
        try:
            if self.dialect == DatabaseDialect.POSTGRESQL:
                result = session.execute(
                    text("SELECT DATE_TRUNC('day', CURRENT_TIMESTAMP)")
                ).scalar()
            else:
                result = session.execute(text("SELECT DATE('now')")).scalar()
            tests["date_functions"] = result is not None
        except Exception as e:
            logger.error(f"Date functions failed: {e}")
            tests["date_functions"] = False

        # Test 3: JSON functions (if available)
        try:
            if self.dialect == DatabaseDialect.POSTGRESQL:
                result = session.execute(
                    text("SELECT '{\"test\": \"value\"}'::jsonb ->> 'test'")
                ).scalar()
            else:
                result = session.execute(
                    text("SELECT JSON_EXTRACT('{\"test\": \"value\"}', '$.test')")
                ).scalar()
            tests["json_functions"] = result == "value"
        except Exception as e:
            logger.error(f"JSON functions failed: {e}")
            tests["json_functions"] = False

        # Test 4: Window functions (if available)
        try:
            result = session.execute(
                text("SELECT ROW_NUMBER() OVER (ORDER BY 1) FROM (SELECT 1) t")
            ).scalar()
            tests["window_functions"] = result == 1
        except Exception as e:
            logger.error(f"Window functions failed: {e}")
            tests["window_functions"] = False

        return tests

    def get_compatibility_report(self, session: Session) -> dict[str, Any]:
        """Get comprehensive compatibility report"""

        test_results = self.test_basic_queries(session)

        capabilities = {
            "dialect": self.dialect,
            "json_support": test_results.get("json_functions", False),
            "window_functions": test_results.get("window_functions", False),
            "date_functions": test_results.get("date_functions", True),
            "basic_operations": test_results.get("basic_select", True),
        }

        recommendations = []

        if not capabilities["json_support"]:
            recommendations.append(
                "Consider enabling JSON1 extension for SQLite or using JSON columns in PostgreSQL"
            )

        if not capabilities["window_functions"]:
            recommendations.append(
                "Window functions not available - some analytics queries will use fallbacks"
            )

        return {
            "capabilities": capabilities,
            "test_results": test_results,
            "recommendations": recommendations,
            "compatible": all(test_results.values()),
        }


# Global analytics instance (to be initialized with engine)
analytics_query_builder: AnalyticsQueryBuilder | None = None


def initialize_analytics(engine: Engine):
    """Initialize analytics with database engine"""
    global analytics_query_builder
    analytics_query_builder = AnalyticsQueryBuilder(engine)
    logger.info(f"Analytics initialized for {DatabaseDialect.detect_dialect(engine)}")


def get_analytics() -> AnalyticsQueryBuilder:
    """Get analytics query builder instance"""
    if not analytics_query_builder:
        raise RuntimeError("Analytics not initialized - call initialize_analytics(engine) first")
    return analytics_query_builder


# Export main classes and functions
__all__ = [
    "DatabaseDialect",
    "CrossDatabaseQuery",
    "AnalyticsQueryBuilder",
    "CompatibilityTester",
    "initialize_analytics",
    "get_analytics",
]
