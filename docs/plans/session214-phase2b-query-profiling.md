# 🎯 Session 214: Phase 2B - Query Profiling & Performance Optimization Targets

**Session:** 214
**Date:** February 8, 2026
**Status:** 🚀 In Progress
**Focus:** Identify slow queries and determine Phase 3 caching targets

---

## 📊 Phase 2B Objectives

**Goal**: Collect real query execution patterns, identify bottlenecks, and plan targeted optimizations for Phase 3.

**Expected Outcome**:

- Detailed list of slow queries (>100ms)
- Root cause analysis for each slow query
- Caching strategy recommendations for Phase 3
- Data-driven prioritization for optimization work

---

## 🔍 Phase 2B Strategy

### Phase 2B Structure:

1. **Query Collection** (1-2 hours)
   - Enable PostgreSQL slow query logging
   - Run synthetic dashboard load tests
   - Capture 50-100 slow queries (>100ms)
   - Parse query logs and aggregate

2. **Query Analysis** (2-3 hours)
   - Run `EXPLAIN (ANALYZE, BUFFERS)` on slowest 20 queries
   - Analyze execution plans for table scans, index usage
   - Calculate query improvement potential
   - Document findings per endpoint

3. **Optimization Planning** (1 hour)
   - Categorize queries: Index-able vs Cache-able vs Refactor-able
   - Propose specific optimizations for Phase 3
   - Estimate improvement potential per optimization
   - Create implementation roadmap

### Timeline:

- Query Collection: 1-2 hours
- Query Analysis: 2-3 hours
- Optimization Planning: 1 hour
- **Total Phase 2B**: 4-6 hours (can span 2-3 sessions if needed)

---

## 🚀 Phase 2B Tasks

### Task 1: PostgreSQL Slow Query Logging Setup

**Objective**: Enable query logging to capture execution time and pattern data

**Steps**:

1. Connect to PostgreSQL
2. Enable `log_min_duration_statement = 100` (log queries >100ms)
3. Enable query plan logging
4. Configure log rotation

**Implementation**:

```sql
-- Connect to PostgreSQL
-- Execute these commands to enable slow query logging:

ALTER SYSTEM SET log_min_duration_statement = 100;  -- Log queries >100ms
ALTER SYSTEM SET log_statement = 'all';              -- Log all statements
ALTER SYSTEM SET log_duration = on;                  -- Log query duration
ALTER SYSTEM SET log_connections = on;               -- Log connections
ALTER SYSTEM SET log_disconnections = on;            -- Log disconnections
ALTER SYSTEM SET log_line_prefix = '%t [%p]: [%l-1] user=%u,db=%d,app=%a,client=%h ';

-- Reload configuration
SELECT pg_reload_conf();

-- Verify settings
SELECT name, setting FROM pg_settings WHERE name LIKE 'log%';
```

**Status**: ⏳ Pending (First task in Phase 2B)

---

### Task 2: Synthetic Dashboard Load Testing

**Objective**: Generate realistic query patterns for analysis

**Load Test Script** (`phase2b_load_test.py`):

```python
import asyncio
import aiohttp
import time
from datetime import datetime

class DashboardLoadTest:
    def __init__(self, base_url="http://localhost:8000", duration_seconds=300):
        self.base_url = base_url
        self.duration = duration_seconds
        self.queries = []
        self.start_time = None

    async def run_dashboard_endpoints(self, session):
        """Simulate typical dashboard user interactions"""

        endpoints = [
            # Portfolio endpoints
            ("/api/portfolio/overview", "GET", "Portfolio overview"),
            ("/api/portfolio/holdings?limit=50", "GET", "Holdings list"),
            ("/api/portfolio/performance?period=1Y", "GET", "Performance metrics"),

            # Social endpoints
            ("/api/social/feed?limit=20", "GET", "Social feed"),
            ("/api/social/trending", "GET", "Trending posts"),

            # AI endpoints
            ("/api/ai/conversations?limit=10", "GET", "Conversation list"),

            # Analytics endpoints (if available)
            ("/api/admin/analytics/dashboard", "GET", "Admin dashboard"),
            ("/api/admin/analytics/users/growth?period=30d", "GET", "User growth"),
        ]

        try:
            for endpoint, method, description in endpoints:
                try:
                    start = time.time()
                    async with session.get(f"{self.base_url}{endpoint}", timeout=10) as resp:
                        duration = time.time() - start
                        self.queries.append({
                            'endpoint': endpoint,
                            'method': method,
                            'description': description,
                            'status': resp.status,
                            'duration_ms': duration * 1000,
                            'timestamp': datetime.now()
                        })
                        print(f"  ✓ {description}: {duration*1000:.0f}ms")
                except asyncio.TimeoutError:
                    self.queries.append({
                        'endpoint': endpoint,
                        'method': method,
                        'description': description,
                        'status': 'TIMEOUT',
                        'duration_ms': 10000,
                        'timestamp': datetime.now()
                    })
                    print(f"  ⚠ {description}: TIMEOUT")
                except Exception as e:
                    print(f"  ✗ {description}: {str(e)}")
        except Exception as e:
            print(f"Error in load test: {e}")

    async def run_test(self):
        """Run the load test for specified duration"""
        print(f"\n🚀 Starting Dashboard Load Test ({self.duration}s)")
        print("="*60)

        self.start_time = time.time()
        async with aiohttp.ClientSession() as session:
            iteration = 0
            while time.time() - self.start_time < self.duration:
                iteration += 1
                elapsed = time.time() - self.start_time
                print(f"\n📊 Iteration {iteration} (Elapsed: {elapsed:.0f}s)")

                await self.run_dashboard_endpoints(session)

                # Wait between iterations
                await asyncio.sleep(5)

        self.print_summary()
        self.generate_report()

    def print_summary(self):
        """Print test summary statistics"""
        if not self.queries:
            print("\n❌ No queries collected")
            return

        print("\n" + "="*60)
        print("📈 LOAD TEST SUMMARY")
        print("="*60)

        total_queries = len(self.queries)
        total_time = sum(q['duration_ms'] for q in self.queries if q['status'] != 'TIMEOUT')
        avg_time = total_time / total_queries if total_queries > 0 else 0

        slow_queries = [q for q in self.queries if q['duration_ms'] > 100]

        print(f"\n📊 Overall Metrics:")
        print(f"  • Total Queries: {total_queries}")
        print(f"  • Avg Duration: {avg_time:.0f}ms")
        print(f"  • Total Time: {total_time:.0f}ms")
        print(f"  • Slow Queries (>100ms): {len(slow_queries)} ({len(slow_queries)/total_queries*100:.0f}%)")

        if slow_queries:
            print(f"\n🐢 Slowest Queries:")
            slowest = sorted(slow_queries, key=lambda x: x['duration_ms'], reverse=True)[:5]
            for i, q in enumerate(slowest, 1):
                print(f"  {i}. {q['description']}: {q['duration_ms']:.0f}ms")

    def generate_report(self):
        """Generate JSON report for analysis"""
        import json
        report = {
            'timestamp': datetime.now().isoformat(),
            'total_queries': len(self.queries),
            'queries': self.queries,
            'slowest': sorted(self.queries, key=lambda x: x.get('duration_ms', 0), reverse=True)[:10]
        }

        with open('/tmp/phase2b_load_test_report.json', 'w') as f:
            json.dump(report, f, indent=2, default=str)
        print(f"\n✅ Report saved to /tmp/phase2b_load_test_report.json")

# Run the load test
if __name__ == "__main__":
    test = DashboardLoadTest(duration_seconds=60)  # 1 minute test
    asyncio.run(test.run_test())
```

**Status**: ⏳ Pending (Will run after Task 1)

---

### Task 3: Query Analysis & Execution Plans

**Objective**: Understand why certain queries are slow

**Analysis Process**:

1. Export slow queries from PostgreSQL logs
2. For each slow query (top 20):
   - Run `EXPLAIN (ANALYZE, BUFFERS)` to see execution plan
   - Identify table scans, missing indexes, sequential scans
   - Calculate potential improvement with indexes/caching
   - Document findings

**Example EXPLAIN Analysis**:

```sql
-- Get top slow queries from logs
SELECT query, calls, mean_exec_time, max_exec_time, total_exec_time
FROM pg_stat_statements
WHERE mean_exec_time > 100
ORDER BY mean_exec_time DESC
LIMIT 20;

-- For each slow query, analyze:
EXPLAIN (ANALYZE, BUFFERS) <SLOW_QUERY>;

-- Look for:
-- • Seq Scan (sequential scan) - should use indexes instead
-- • Sort / Group By on large datasets - consider caching
-- • Multiple joins - could benefit from denormalization or caching
```

**Status**: ⏳ Pending (Will run after Task 2)

---

### Task 4: Optimization Planning & Recommendations

**Objective**: Create data-driven optimization strategy for Phase 3

**Analysis Categories**:

| Category          | Solution                                              | Effort              | Gain    | Phase |
| ----------------- | ----------------------------------------------------- | ------------------- | ------- | ----- |
| **Index-able**    | Add missing indexes on WHERE/JOIN columns             | Low (30min-1hr)     | 5-20x   | 2B+   |
| **Cache-able**    | Move high-frequency queries to Redis                  | Medium (2-4hr)      | 10-100x | 3     |
| **Refactor-able** | Optimize query logic (n+1 queries, unnecessary joins) | Medium-High (4-8hr) | 5-20x   | 3+    |
| **Denormalize**   | Add summary tables or materialized views              | High (8+hr)         | 20-100x | Later |

---

## 📈 Expected Discoveries

Based on Phase 1 analysis, Phase 2B will likely identify:

1. **Admin Dashboard**: 40 queries with many date range scans
   - Potential: Further indexes on date columns
   - OR: Redis result caching (5-10x gain)

2. **Conversation Lookups**: 3-5 queries with sequential scans
   - Phase 2A indexes should help significantly
   - May need participant denormalization

3. **Portfolio Queries**: 15 queries, data aggregation heavy
   - Great candidate for Redis caching
   - Materialized view opportunity for historical data

4. **Social Feed**: 8 queries with sorting/pagination
   - Perfect for query result caching
   - Potential index on user_id + created_at

---

## 🎯 Success Criteria

✅ Phase 2B is complete when:

1. **Query Collection**: 50+ distinct slow queries captured
2. **Query Analysis**: Top 20 queries analyzed with EXPLAIN plans
3. **Optimization Plan**: Specific recommendations for Phase 3 with:
   - Query identification
   - Root cause
   - Proposed solution
   - Estimated improvement
   - Implementation effort
4. **Documentation**: Complete Phase 2B report with findings
5. **Commits**: All work committed with clear messages

---

## 📝 Implementation Checklist

- [ ] Enable PostgreSQL slow query logging
- [ ] Run synthetic load test (60-120 seconds)
- [ ] Collect and parse slow query logs
- [ ] Run EXPLAIN on top 20 slowest queries
- [ ] Analyze index usage and table scans
- [ ] Document findings per endpoint
- [ ] Categorize optimizations by type
- [ ] Estimate improvement potential
- [ ] Create Phase 3 implementation roadmap
- [ ] Write Phase 2B completion report
- [ ] Commit all analysis scripts and reports
- [ ] Update performance optimization roadmap

---

## 🔗 Related Documents

- **Phase 1 Analysis**: Session 213 analysis document
- **Phase 2A Completion**: Session 213 Phase 2A report
- **Performance Roadmap**: Multi-phase optimization strategy
- **Backend Code**: `/apps/backend/app/` (query implementations)

---

## ⏱️ Estimated Timeline

| Task                  | Effort        | Status             |
| --------------------- | ------------- | ------------------ |
| Query Logging Setup   | 30 min        | ⏳ Next            |
| Load Test Execution   | 30-60 min     | ⏳ After Task 1    |
| Query Analysis        | 2-3 hours     | ⏳ After Task 2    |
| Optimization Planning | 1 hour        | ⏳ After Task 3    |
| **Total Phase 2B**    | **4-6 hours** | 🚀 **In Progress** |

**Next Steps**: Begin Task 1 (PostgreSQL logging setup)
