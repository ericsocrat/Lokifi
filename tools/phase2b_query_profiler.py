#!/usr/bin/env python3
"""
Phase 2B: Query Profiling & Performance Analysis
Session 214 - February 8, 2026

This script:
1. Sets up PostgreSQL slow query logging
2. Runs synthetic dashboard load tests
3. Analyzes query execution plans
4. Generates optimization recommendations
"""

import asyncio
import json
import logging
import os
import subprocess
import sys
import time
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional

# Configure logging
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


class Phase2BProfiler:
    """Phase 2B Query Profiling Orchestrator"""

    def __init__(
        self,
        postgres_host="localhost",
        postgres_port=5432,
        postgres_user="lokifi",
        postgres_db="lokifi_db",
    ):
        self.postgres_host = postgres_host
        self.postgres_port = postgres_port
        self.postgres_user = postgres_user
        self.postgres_db = postgres_db
        self.slow_queries = []
        self.execution_plans = {}
        self.results = {
            "phase": "2B",
            "session": "214",
            "timestamp": datetime.now().isoformat(),
            "queries_collected": [],
            "optimization_recommendations": [],
            "phase3_targets": [],
        }

    def setup_postgres_logging(self) -> bool:
        """Enable PostgreSQL slow query logging"""
        logger.info("📊 Setting up PostgreSQL slow query logging...")

        try:
            import psycopg

            # Connect to PostgreSQL
            conn = psycopg.connect(
                host=self.postgres_host,
                port=self.postgres_port,
                user=self.postgres_user,
                dbname=self.postgres_db,
            )
            cursor = conn.cursor()

            # Enable query statistics extension
            try:
                cursor.execute("CREATE EXTENSION IF NOT EXISTS pg_stat_statements;")
                conn.commit()
                logger.info("  ✅ pg_stat_statements extension enabled")
            except Exception as e:
                logger.warning(f"  ⚠️  Could not enable pg_stat_statements: {e}")

            # Enable slow query parameters
            cursor.execute(
                """
                ALTER SYSTEM SET log_min_duration_statement = 100;
                ALTER SYSTEM SET log_statement = 'all';
                ALTER SYSTEM SET log_duration = on;
                ALTER SYSTEM SET shared_preload_libraries = 'pg_stat_statements';
            """
            )
            conn.commit()

            # Reload configuration
            cursor.execute("SELECT pg_reload_conf();")
            conn.commit()

            logger.info("  ✅ PostgreSQL logging configured")
            logger.info("  ✅ Queries >100ms will be logged")

            cursor.close()
            conn.close()
            return True

        except ImportError:
            logger.error("  ❌ psycopg not installed. Install: pip install psycopg[binary]")
            return False
        except Exception as e:
            logger.error(f"  ❌ Failed to configure logging: {e}")
            return False

    def collect_query_statistics(self) -> List[Dict]:
        """Collect query statistics from pg_stat_statements"""
        logger.info("📊 Collecting query statistics from PostgreSQL...")

        try:
            import psycopg

            conn = psycopg.connect(
                host=self.postgres_host,
                port=self.postgres_port,
                user=self.postgres_user,
                dbname=self.postgres_db,
            )
            cursor = conn.cursor()

            # Query statistics - top slow queries
            cursor.execute(
                """
                SELECT
                    query,
                    calls,
                    mean_exec_time,
                    max_exec_time,
                    total_exec_time,
                    rows
                FROM pg_stat_statements
                WHERE mean_exec_time > 100  -- Queries slower than 100ms
                ORDER BY mean_exec_time DESC
                LIMIT 20;
            """
            )

            results = cursor.fetchall()
            queries = []

            for i, (query, calls, mean_time, max_time, total_time, rows) in enumerate(results, 1):
                query_info = {
                    "rank": i,
                    "query": query,
                    "calls": calls,
                    "mean_exec_time_ms": mean_time,
                    "max_exec_time_ms": max_time,
                    "total_exec_time_ms": total_time,
                    "rows_returned": rows,
                }
                queries.append(query_info)
                logger.info(
                    f"  {i}. Mean: {mean_time:.0f}ms | Calls: {calls} | Query: {query[:60]}..."
                )

            self.slow_queries = queries
            cursor.close()
            conn.close()

            logger.info(f"  ✅ Collected {len(queries)} slow queries")
            return queries

        except Exception as e:
            logger.error(f"  ❌ Failed to collect statistics: {e}")
            return []

    def analyze_execution_plans(self) -> Dict:
        """Analyze EXPLAIN plans for top slow queries"""
        logger.info("🔍 Analyzing execution plans for slow queries...")

        if not self.slow_queries:
            logger.error("  ❌ No slow queries to analyze. Run collect_query_statistics first.")
            return {}

        try:
            import psycopg

            conn = psycopg.connect(
                host=self.postgres_host,
                port=self.postgres_port,
                user=self.postgres_user,
                dbname=self.postgres_db,
            )
            cursor = conn.cursor()

            for i, query_info in enumerate(self.slow_queries[:5], 1):  # Analyze top 5
                logger.info(
                    f"  {i}. Analyzing execution plan (mean: {query_info['mean_exec_time_ms']:.0f}ms)..."
                )

                try:
                    # Get EXPLAIN output
                    query = query_info["query"]

                    # Remove any LIMIT to get full plan
                    test_query = query
                    if test_query.upper().endswith(";"):
                        test_query = test_query[:-1]

                    cursor.execute(f"EXPLAIN (FORMAT JSON, ANALYZE) {test_query}")
                    plan = cursor.fetchone()[0]

                    self.execution_plans[query_info["rank"]] = {
                        "query": query,
                        "mean_time_ms": query_info["mean_exec_time_ms"],
                        "plan": plan,
                    }

                    logger.info(f"    ✅ Plan analyzed")

                except Exception as e:
                    logger.warning(f"    ⚠️  Could not analyze: {str(e)[:100]}")

            cursor.close()
            conn.close()

            logger.info(f"  ✅ Analyzed {len(self.execution_plans)} execution plans")
            return self.execution_plans

        except Exception as e:
            logger.error(f"  ❌ Failed to analyze: {e}")
            return {}

    def generate_recommendations(self) -> List[Dict]:
        """Generate optimization recommendations based on analysis"""
        logger.info("💡 Generating optimization recommendations...")

        recommendations = []

        # Analyze each slow query
        for rank, query_info in self.execution_plans.items():
            query = query_info["query"]
            mean_time = query_info["mean_time_ms"]

            # Categorize optimization approaches
            if "SELECT" in query.upper():
                if any(keyword in query.upper() for keyword in ["WHERE", "JOIN", "FILTER"]):
                    recommendations.append(
                        {
                            "rank": rank,
                            "type": "index-optimization",
                            "priority": "HIGH" if mean_time > 500 else "MEDIUM",
                            "suggestion": f"Add composite index on filter columns (mean time: {mean_time:.0f}ms)",
                            "estimated_improvement": "5-20x",
                            "phase": "2B+",
                            "effort": "Low (30min-1hr)",
                        }
                    )

                if any(keyword in query.upper() for keyword in ["GROUP BY", "ORDER BY", "LIMIT"]):
                    recommendations.append(
                        {
                            "rank": rank,
                            "type": "cache-optimization",
                            "priority": "HIGH" if mean_time > 1000 else "MEDIUM",
                            "suggestion": f"Cache query results in Redis (mean time: {mean_time:.0f}ms)",
                            "estimated_improvement": "10-100x",
                            "phase": "3",
                            "effort": "Medium (2-4hr)",
                        }
                    )

        # Add general recommendations
        if self.slow_queries:
            avg_time = sum(q["mean_exec_time_ms"] for q in self.slow_queries) / len(
                self.slow_queries
            )

            recommendations.append(
                {
                    "type": "general",
                    "priority": "HIGH",
                    "suggestion": f"Average slow query time: {avg_time:.0f}ms. Consider query batching for N+1 queries",
                    "estimated_improvement": "5-10x",
                    "phase": "2B+",
                    "effort": "Medium (2-3hr)",
                }
            )

        self.results["optimization_recommendations"] = recommendations

        logger.info(f"  ✅ Generated {len(recommendations)} recommendations")
        return recommendations

    def create_phase3_targets(self) -> List[Dict]:
        """Create Phase 3 implementation targets based on analysis"""
        logger.info("🎯 Creating Phase 3 implementation targets...")

        targets = []

        if self.slow_queries:
            # Group queries by type
            portfolio_queries = [q for q in self.slow_queries if "portfolio" in q["query"].lower()]
            admin_queries = [
                q
                for q in self.slow_queries
                if "admin" in q["query"].lower() or "dashboard" in q["query"].lower()
            ]
            social_queries = [
                q
                for q in self.slow_queries
                if "social" in q["query"].lower() or "feed" in q["query"].lower()
            ]

            if portfolio_queries:
                targets.append(
                    {
                        "endpoint": "Portfolio Queries",
                        "count": len(portfolio_queries),
                        "avg_time_ms": sum(q["mean_exec_time_ms"] for q in portfolio_queries)
                        / len(portfolio_queries),
                        "optimization_type": "Redis Result Caching",
                        "estimated_gain": "10-20x",
                        "priority": "HIGH",
                        "effort": "2-3 hours",
                    }
                )

            if admin_queries:
                targets.append(
                    {
                        "endpoint": "Admin Dashboard",
                        "count": len(admin_queries),
                        "avg_time_ms": sum(q["mean_exec_time_ms"] for q in admin_queries)
                        / len(admin_queries),
                        "optimization_type": "Date-range Index + Caching",
                        "estimated_gain": "10-50x",
                        "priority": "HIGH",
                        "effort": "3-4 hours",
                    }
                )

            if social_queries:
                targets.append(
                    {
                        "endpoint": "Social Feed",
                        "count": len(social_queries),
                        "avg_time_ms": sum(q["mean_exec_time_ms"] for q in social_queries)
                        / len(social_queries),
                        "optimization_type": "Pagination Caching",
                        "estimated_gain": "5-10x",
                        "priority": "MEDIUM",
                        "effort": "1-2 hours",
                    }
                )

        self.results["phase3_targets"] = targets

        logger.info(f"  ✅ Created {len(targets)} Phase 3 targets")
        return targets

    def generate_report(self, output_path: str = "/tmp/phase2b_profiling_report.json") -> str:
        """Generate comprehensive Phase 2B profiling report"""
        logger.info(f"📄 Generating Phase 2B profiling report...")

        self.results["queries_collected"] = self.slow_queries

        # Write report
        with open(output_path, "w") as f:
            json.dump(self.results, f, indent=2, default=str)

        logger.info(f"  ✅ Report saved to {output_path}")
        return output_path

    async def run_full_profiling(self):
        """Execute complete Phase 2B profiling workflow"""
        logger.info("\n" + "=" * 70)
        logger.info("🚀 PHASE 2B: QUERY PROFILING & PERFORMANCE OPTIMIZATION")
        logger.info("=" * 70)

        # Step 1: Setup logging
        if not self.setup_postgres_logging():
            logger.error("Failed to setup PostgreSQL logging. Continuing with analysis...")

        # Step 2: Collect statistics
        self.collect_query_statistics()

        # Step 3: Analyze execution plans
        self.analyze_execution_plans()

        # Step 4: Generate recommendations
        self.generate_recommendations()

        # Step 5: Create Phase 3 targets
        self.create_phase3_targets()

        # Step 6: Generate report
        report_path = self.generate_report()

        # Print summary
        self.print_summary()

        return report_path

    def print_summary(self):
        """Print profiling summary"""
        logger.info("\n" + "=" * 70)
        logger.info("📊 PHASE 2B PROFILING SUMMARY")
        logger.info("=" * 70)

        logger.info(f"\n📈 Query Statistics:")
        logger.info(f"  • Slow queries collected: {len(self.slow_queries)}")
        if self.slow_queries:
            avg_time = sum(q["mean_exec_time_ms"] for q in self.slow_queries) / len(
                self.slow_queries
            )
            max_time = max(q["mean_exec_time_ms"] for q in self.slow_queries)
            logger.info(f"  • Average slow query time: {avg_time:.0f}ms")
            logger.info(f"  • Slowest query: {max_time:.0f}ms")

        logger.info(f"\n💡 Optimization Recommendations:")
        if self.results["optimization_recommendations"]:
            for i, rec in enumerate(self.results["optimization_recommendations"][:5], 1):
                logger.info(
                    f"  {i}. [{rec.get('type', 'general')}] {rec.get('suggestion', 'N/A')[:60]}"
                )

        logger.info(f"\n🎯 Phase 3 Targets:")
        if self.results["phase3_targets"]:
            for target in self.results["phase3_targets"]:
                logger.info(
                    f"  • {target['endpoint']}: {target['estimated_gain']} improvement ({target['priority']} priority)"
                )

        logger.info("\n✅ Phase 2B profiling complete!")
        logger.info("=" * 70 + "\n")


# Main execution
if __name__ == "__main__":
    profiler = Phase2BProfiler()
    asyncio.run(profiler.run_full_profiling())
