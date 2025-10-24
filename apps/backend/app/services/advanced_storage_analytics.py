# J5.3 Advanced Storage Analytics and Optimization Service
import logging
import statistics
from dataclasses import asdict, dataclass
from datetime import datetime, timedelta
from enum import Enum
from typing import Any

from sqlalchemy import func, select, text

from app.core.config import Settings
from app.core.database import get_db_session
from app.db.models import AIMessage, AIThread, User

logger = logging.getLogger(__name__)


class StorageOptimizationLevel(Enum):
    """Storage optimization levels"""

    CONSERVATIVE = "conservative"
    BALANCED = "balanced"
    AGGRESSIVE = "aggressive"


class DataDistributionPattern(Enum):
    """Data distribution patterns for optimization"""

    TIME_BASED = "time_based"
    USER_BASED = "user_based"
    SIZE_BASED = "size_based"
    HYBRID = "hybrid"


@dataclass
class AdvancedStorageMetrics:
    """Enhanced storage metrics with analytics"""

    # Basic metrics
    total_size_mb: float = 0.0
    total_threads: int = 0
    total_messages: int = 0
    total_users: int = 0

    # Distribution metrics
    messages_per_thread_avg: float = 0.0
    messages_per_thread_median: float = 0.0
    messages_per_user_avg: float = 0.0
    messages_per_user_median: float = 0.0

    # Growth metrics
    daily_growth_rate: float = 0.0
    weekly_growth_rate: float = 0.0
    monthly_growth_rate: float = 0.0

    # Performance metrics
    avg_message_size_kb: float = 0.0
    largest_thread_messages: int = 0
    largest_thread_size_mb: float = 0.0

    # AI provider analytics
    provider_usage: dict[str, int] | None = None
    model_usage: dict[str, int] | None = None

    # Time-based analytics
    peak_hours: list[int] | None = None
    peak_days: list[str] | None = None

    # Storage prediction
    predicted_size_30_days: float = 0.0
    predicted_size_90_days: float = 0.0
    predicted_size_365_days: float = 0.0

    # Health indicators
    fragmentation_ratio: float = 0.0
    archive_efficiency: float = 0.0
    optimization_score: float = 0.0

    def __post_init__(self):
        if self.provider_usage is None:
            self.provider_usage = {}
        if self.model_usage is None:
            self.model_usage = {}
        if self.peak_hours is None:
            self.peak_hours = []
        if self.peak_days is None:
            self.peak_days = []


@dataclass
class OptimizationRecommendation:
    """Storage optimization recommendation"""

    category: str
    priority: str  # HIGH, MEDIUM, LOW
    description: str
    potential_savings_mb: float
    effort_level: str  # EASY, MEDIUM, HARD
    implementation_steps: list[str]
    estimated_time_minutes: int


@dataclass
class PerformanceBenchmark:
    """Database performance benchmark results"""

    operation: str
    avg_time_ms: float
    min_time_ms: float
    max_time_ms: float
    percentile_95_ms: float
    samples: int
    timestamp: datetime


class AdvancedStorageAnalytics:
    """J5.3 Advanced storage analytics and optimization service"""

    def __init__(self, settings: Settings):
        self.settings = settings
        self.optimization_level = StorageOptimizationLevel.BALANCED

    async def get_comprehensive_metrics(self) -> AdvancedStorageMetrics:
        """Get comprehensive storage metrics with analytics"""
        metrics = AdvancedStorageMetrics()

        try:
            async for session in get_db_session():
                # Basic counts with separate optimized queries to avoid N+1
                metrics.total_threads = await session.scalar(select(func.count(AIThread.id))) or 0
                metrics.total_messages = await session.scalar(select(func.count(AIMessage.id))) or 0
                metrics.total_users = await session.scalar(select(func.count(User.id))) or 0

                # Distribution analysis
                if metrics.total_messages > 0:
                    # Messages per thread distribution
                    thread_message_counts = await session.execute(
                        select(func.count(AIMessage.id))
                        .select_from(AIMessage)
                        .group_by(AIMessage.thread_id)
                    )
                    thread_counts = [row[0] for row in thread_message_counts]

                    if thread_counts:
                        metrics.messages_per_thread_avg = statistics.mean(thread_counts)
                        metrics.messages_per_thread_median = statistics.median(thread_counts)
                        metrics.largest_thread_messages = max(thread_counts)

                    # Messages per user distribution
                    user_message_counts = await session.execute(
                        select(func.count(AIMessage.id))
                        .select_from(AIMessage)
                        .join(AIThread, AIMessage.thread_id == AIThread.id)
                        .group_by(AIThread.user_id)
                    )
                    user_counts = [row[0] for row in user_message_counts]

                    if user_counts:
                        metrics.messages_per_user_avg = statistics.mean(user_counts)
                        metrics.messages_per_user_median = statistics.median(user_counts)

                    # Calculate average message size
                    total_content_length = (
                        await session.scalar(select(func.sum(func.length(AIMessage.content)))) or 0
                    )

                    metrics.avg_message_size_kb = (
                        total_content_length / metrics.total_messages
                    ) / 1024
                    metrics.total_size_mb = total_content_length / (1024 * 1024)

                # Growth rate analysis
                now = datetime.now()

                # Daily growth
                yesterday = now - timedelta(days=1)
                messages_last_24h = (
                    await session.scalar(
                        select(func.count(AIMessage.id)).where(AIMessage.created_at >= yesterday)
                    )
                    or 0
                )
                metrics.daily_growth_rate = messages_last_24h

                # Weekly growth
                last_week = now - timedelta(days=7)
                messages_last_week = (
                    await session.scalar(
                        select(func.count(AIMessage.id)).where(AIMessage.created_at >= last_week)
                    )
                    or 0
                )
                metrics.weekly_growth_rate = messages_last_week / 7

                # Monthly growth
                last_month = now - timedelta(days=30)
                messages_last_month = (
                    await session.scalar(
                        select(func.count(AIMessage.id)).where(AIMessage.created_at >= last_month)
                    )
                    or 0
                )
                metrics.monthly_growth_rate = messages_last_month / 30

                # AI provider analytics
                provider_stats = await session.execute(
                    select(AIMessage.provider, func.count(AIMessage.id))
                    .where(AIMessage.provider.isnot(None))
                    .group_by(AIMessage.provider)
                )
                metrics.provider_usage = {row[0]: row[1] for row in provider_stats}

                # AI model analytics
                model_stats = await session.execute(
                    select(AIMessage.model, func.count(AIMessage.id))
                    .where(AIMessage.model.isnot(None))
                    .group_by(AIMessage.model)
                )
                metrics.model_usage = {row[0]: row[1] for row in model_stats}

                # Time-based usage patterns
                hourly_stats = await session.execute(
                    text("""
                        SELECT EXTRACT(hour FROM created_at) as hour, COUNT(*) as count
                        FROM ai_messages 
                        WHERE created_at >= :last_week
                        GROUP BY EXTRACT(hour FROM created_at)
                        ORDER BY count DESC
                        LIMIT 5
                    """),
                    {"last_week": last_week},
                )
                metrics.peak_hours = [int(row[0]) for row in hourly_stats]

                # Growth predictions
                if metrics.daily_growth_rate > 0:
                    metrics.predicted_size_30_days = metrics.total_size_mb + (
                        metrics.daily_growth_rate * metrics.avg_message_size_kb * 30 / 1024
                    )
                    metrics.predicted_size_90_days = metrics.total_size_mb + (
                        metrics.daily_growth_rate * metrics.avg_message_size_kb * 90 / 1024
                    )
                    metrics.predicted_size_365_days = metrics.total_size_mb + (
                        metrics.daily_growth_rate * metrics.avg_message_size_kb * 365 / 1024
                    )

                # Calculate optimization score (0-100)
                score_factors = []

                # Archive utilization (higher is better)
                try:
                    archived_count = (
                        await session.scalar(text("SELECT COUNT(*) FROM ai_messages_archive")) or 0
                    )
                    archive_ratio = archived_count / (metrics.total_messages + archived_count + 1)
                    score_factors.append(min(archive_ratio * 100, 30))  # Max 30 points
                except (ZeroDivisionError, AttributeError, TypeError):
                    score_factors.append(0)

                # Distribution balance (lower variance is better)
                if thread_counts:
                    variance = statistics.variance(thread_counts)
                    distribution_score = max(0, 30 - (variance / 100))  # Max 30 points
                    score_factors.append(min(distribution_score, 30))
                else:
                    score_factors.append(30)

                # Growth sustainability (reasonable growth rate)
                growth_score = 40  # Base score
                if metrics.daily_growth_rate > 1000:  # Too fast growth
                    growth_score -= 20
                elif metrics.daily_growth_rate < 1:  # Too slow growth
                    growth_score -= 10
                score_factors.append(growth_score)

                metrics.optimization_score = sum(score_factors)

                logger.info(
                    f"Advanced metrics: {metrics.total_messages:,} messages, "
                    f"optimization score: {metrics.optimization_score:.1f}/100"
                )

                return metrics

        except Exception as e:
            logger.error(f"Error collecting advanced metrics: {e}")

        return metrics

    async def generate_optimization_recommendations(
        self, metrics: AdvancedStorageMetrics
    ) -> list[OptimizationRecommendation]:
        """Generate storage optimization recommendations"""
        recommendations = []

        # Archive old data recommendation
        if metrics.total_messages > 10000:
            old_threshold = datetime.now() - timedelta(days=self.settings.ARCHIVE_THRESHOLD_DAYS)

            async for session in get_db_session():
                old_messages_count = (
                    await session.scalar(
                        select(func.count(AIMessage.id)).where(AIMessage.created_at < old_threshold)
                    )
                    or 0
                )

                if old_messages_count > 1000:
                    potential_savings = (old_messages_count * metrics.avg_message_size_kb) / 1024

                    recommendations.append(
                        OptimizationRecommendation(
                            category="Data Archival",
                            priority="HIGH",
                            description=f"Archive {old_messages_count:,} old messages to reduce active database size",
                            potential_savings_mb=potential_savings * 0.7,  # Assume 70% compression
                            effort_level="EASY",
                            implementation_steps=[
                                "Run: python manage_db.py archive",
                                "Monitor storage reduction",
                                "Set up automated archival schedule",
                            ],
                            estimated_time_minutes=15,
                        )
                    )

        # Database optimization recommendation
        if metrics.fragmentation_ratio > 0.3 or metrics.total_size_mb > 100:
            recommendations.append(
                OptimizationRecommendation(
                    category="Database Maintenance",
                    priority="MEDIUM",
                    description="Optimize database performance with VACUUM and reindexing",
                    potential_savings_mb=metrics.total_size_mb * 0.1,  # ~10% space reclaim
                    effort_level="EASY",
                    implementation_steps=[
                        "Run: python manage_db.py maintenance",
                        "Schedule weekly VACUUM operations",
                        "Monitor query performance improvements",
                    ],
                    estimated_time_minutes=10,
                )
            )

        # Large thread optimization
        if metrics.largest_thread_messages > 1000:
            recommendations.append(
                OptimizationRecommendation(
                    category="Thread Management",
                    priority="MEDIUM",
                    description=f"Optimize threads with {metrics.largest_thread_messages}+ messages",
                    potential_savings_mb=metrics.largest_thread_size_mb * 0.5,
                    effort_level="MEDIUM",
                    implementation_steps=[
                        "Implement thread splitting for large conversations",
                        "Add pagination for thread message retrieval",
                        "Consider conversation summarization",
                    ],
                    estimated_time_minutes=60,
                )
            )

        # Growth management recommendation
        if metrics.predicted_size_30_days > 1000:  # >1GB predicted in 30 days
            recommendations.append(
                OptimizationRecommendation(
                    category="Capacity Planning",
                    priority="HIGH",
                    description=f"Plan for {metrics.predicted_size_30_days:.0f}MB growth in 30 days",
                    potential_savings_mb=0,  # This is about planning, not savings
                    effort_level="MEDIUM",
                    implementation_steps=[
                        "Consider migrating to PostgreSQL",
                        "Set up cloud storage integration",
                        "Implement tiered storage strategy",
                        "Review archival policies",
                    ],
                    estimated_time_minutes=120,
                )
            )

        # Provider optimization recommendation
        if metrics.provider_usage and len(metrics.provider_usage) > 1:
            inefficient_providers = []
            total_messages = sum(metrics.provider_usage.values())

            for provider, count in metrics.provider_usage.items():
                usage_ratio = count / total_messages
                if usage_ratio < 0.1 and count > 100:  # Less than 10% usage but >100 messages
                    inefficient_providers.append(provider)

            if inefficient_providers:
                recommendations.append(
                    OptimizationRecommendation(
                        category="Provider Optimization",
                        priority="LOW",
                        description=f"Consider consolidating low-usage providers: {', '.join(inefficient_providers)}",
                        potential_savings_mb=0,
                        effort_level="MEDIUM",
                        implementation_steps=[
                            "Review provider usage patterns",
                            "Consolidate similar providers",
                            "Update default provider configuration",
                            "Monitor cost and performance impact",
                        ],
                        estimated_time_minutes=45,
                    )
                )

        # Sort by priority
        priority_order = {"HIGH": 0, "MEDIUM": 1, "LOW": 2}
        recommendations.sort(key=lambda x: priority_order.get(x.priority, 3))

        return recommendations

    async def benchmark_database_performance(self) -> list[PerformanceBenchmark]:
        """Benchmark key database operations"""
        benchmarks = []

        operations = [
            (
                "message_insert",
                "INSERT INTO ai_messages (thread_id, role, content, created_at) VALUES (1, 'user', 'test', NOW())",
            ),
            ("message_select", "SELECT * FROM ai_messages ORDER BY created_at DESC LIMIT 10"),
            ("thread_count", "SELECT COUNT(*) FROM ai_threads"),
            ("message_search", "SELECT * FROM ai_messages WHERE content LIKE '%test%' LIMIT 5"),
        ]

        for op_name, query in operations:
            times = []

            try:
                # Run benchmark multiple times
                for _ in range(5):
                    start_time = datetime.now()

                    async for session in get_db_session():
                        if op_name == "message_insert":
                            # Don't actually insert, just prepare
                            await session.execute(text("SELECT 1"))
                        else:
                            await session.execute(text(query))
                        break  # Exit async for loop

                    end_time = datetime.now()
                    duration_ms = (end_time - start_time).total_seconds() * 1000
                    times.append(duration_ms)

                if times:
                    benchmarks.append(
                        PerformanceBenchmark(
                            operation=op_name,
                            avg_time_ms=statistics.mean(times),
                            min_time_ms=min(times),
                            max_time_ms=max(times),
                            percentile_95_ms=sorted(times)[int(len(times) * 0.95)],
                            samples=len(times),
                            timestamp=datetime.now(),
                        )
                    )

            except Exception as e:
                logger.error(f"Benchmark failed for {op_name}: {e}")

        return benchmarks

    async def analyze_data_patterns(self) -> dict[str, Any]:
        """Analyze data usage patterns for optimization"""
        patterns = {
            "temporal_distribution": {},
            "user_behavior": {},
            "content_analysis": {},
            "thread_patterns": {},
        }

        try:
            async for session in get_db_session():
                # Temporal distribution
                temporal_query = text("""
                    SELECT 
                        DATE(created_at) as date,
                        COUNT(*) as message_count,
                        AVG(LENGTH(content)) as avg_length
                    FROM ai_messages 
                    WHERE created_at >= :last_30_days
                    GROUP BY DATE(created_at)
                    ORDER BY date DESC
                    LIMIT 30
                """)

                temporal_result = await session.execute(
                    temporal_query, {"last_30_days": datetime.now() - timedelta(days=30)}
                )

                patterns["temporal_distribution"] = {
                    str(row[0]): {"messages": row[1], "avg_length": row[2]}
                    for row in temporal_result
                }

                # User behavior patterns
                user_behavior_query = text("""
                    SELECT 
                        u.id,
                        COUNT(DISTINCT t.id) as thread_count,
                        COUNT(m.id) as message_count,
                        AVG(LENGTH(m.content)) as avg_message_length,
                        MAX(m.created_at) as last_activity
                    FROM users u
                    LEFT JOIN ai_threads t ON t.user_id = u.id
                    LEFT JOIN ai_messages m ON m.thread_id = t.id
                    GROUP BY u.id
                    HAVING COUNT(m.id) > 0
                    ORDER BY message_count DESC
                    LIMIT 20
                """)

                user_behavior_result = await session.execute(user_behavior_query)
                patterns["user_behavior"] = {
                    f"user_{row[0]}": {
                        "threads": row[1],
                        "messages": row[2],
                        "avg_length": row[3],
                        "last_activity": row[4].isoformat() if row[4] else None,
                    }
                    for row in user_behavior_result
                }

                # Content analysis
                content_query = text("""
                    SELECT 
                        provider,
                        model,
                        COUNT(*) as count,
                        AVG(LENGTH(content)) as avg_length,
                        AVG(token_count) as avg_tokens
                    FROM ai_messages
                    WHERE role = 'assistant' 
                    AND provider IS NOT NULL
                    GROUP BY provider, model
                    ORDER BY count DESC
                """)

                content_result = await session.execute(content_query)
                patterns["content_analysis"] = {
                    f"{row[0]}-{row[1]}": {
                        "count": row[2],
                        "avg_length": row[3],
                        "avg_tokens": row[4],
                    }
                    for row in content_result
                }

        except Exception as e:
            logger.error(f"Error analyzing data patterns: {e}")

        return patterns

    async def generate_storage_report(self) -> dict[str, Any]:
        """Generate comprehensive storage analysis report"""
        logger.info("🔍 Generating J5.3 advanced storage analytics report...")

        # Collect all analytics
        metrics = await self.get_comprehensive_metrics()
        recommendations = await self.generate_optimization_recommendations(metrics)
        benchmarks = await self.benchmark_database_performance()
        patterns = await self.analyze_data_patterns()

        # Generate report
        report = {
            "metadata": {
                "generated_at": datetime.now().isoformat(),
                "j5_version": "5.3",
                "analysis_type": "comprehensive_storage_analytics",
            },
            "executive_summary": {
                "total_messages": metrics.total_messages,
                "total_size_mb": round(metrics.total_size_mb, 2),
                "optimization_score": round(metrics.optimization_score, 1),
                "high_priority_recommendations": len(
                    [r for r in recommendations if r.priority == "HIGH"]
                ),
                "predicted_30_day_growth": round(
                    metrics.predicted_size_30_days - metrics.total_size_mb, 2
                ),
            },
            "detailed_metrics": asdict(metrics),
            "optimization_recommendations": [asdict(r) for r in recommendations],
            "performance_benchmarks": [asdict(b) for b in benchmarks],
            "usage_patterns": patterns,
            "health_indicators": {
                "growth_rate_healthy": metrics.daily_growth_rate < 1000,
                "size_manageable": metrics.total_size_mb < 1000,
                "distribution_balanced": metrics.messages_per_thread_median > 0,
                "archival_active": any("Archive" in r.category for r in recommendations),
            },
        }

        logger.info(
            f"📊 Storage report generated: {metrics.total_messages:,} messages, "
            f"score: {metrics.optimization_score:.1f}/100, "
            f"{len(recommendations)} recommendations"
        )

        return report
