# Performance Benchmarks

Comprehensive performance benchmarking suite for Lokifi backend optimizations.

## Quick Start

```bash
# Run all benchmarks
pytest benchmarks/ -v --benchmark-only

# Run specific benchmark category
pytest benchmarks/test_social_performance.py::TestFeedGenerationPerformance -v --benchmark-only

# Compare with baseline (after running once)
pytest benchmarks/ --benchmark-compare

# Save baseline for future comparisons
pytest benchmarks/ --benchmark-save=phase4c-indexes
```

## Benchmark Categories

### Social Performance (`test_social_performance.py`)

Tests Phase 4C database optimization (Follow table indexes):

**Feed Generation** (`TestFeedGenerationPerformance`):

- `test_get_followees_for_feed`: Followee lookup performance
  - **Index**: `idx_follows_follower_id`
  - **Expected**: 10-50x faster
  - **Query**: `SELECT followee_id WHERE follower_id = X`

- `test_feed_posts_generation`: Full feed generation
  - **Indexes**: `idx_follows_follower_id` + `idx_posts_user_id`
  - **Expected**: < 100ms target
  - **Use case**: User opens feed page

**Follower Listings** (`TestFollowerListingPerformance`):

- `test_get_followers_list`: Follower lookup performance
  - **Index**: `idx_follows_followee_id`
  - **Expected**: 20-100x faster
  - **Query**: `SELECT follower_id WHERE followee_id = X`

- `test_cache_invalidation_follower_lookup`: Cache invalidation query
  - **Index**: `idx_follows_followee_id`
  - **Expected**: < 30ms critical (called on every post create)
  - **Use case**: Author posts → invalidate follower feeds

**Follow Checks** (`TestFollowCheckPerformance`):

- `test_is_following_check`: Single follow relationship check
  - **Index**: `idx_follows_follower_followee` (composite)
  - **Expected**: 5-10x faster
  - **Query**: `WHERE follower_id = X AND followee_id = Y`

- `test_batch_follow_checks`: Bulk follow status checks
  - **Index**: `idx_follows_follower_followee`
  - **Expected**: < 50ms for 10 users
  - **Use case**: User search results with "Following" badges

**Comparison** (`TestComparisonMetrics`):

- `test_index_effectiveness_comparison`: EXPLAIN ANALYZE output
  - Shows actual PostgreSQL query plans
  - Compare "Index Scan" vs "Seq Scan"
  - Run with: `pytest -v -s benchmarks/test_social_performance.py::TestComparisonMetrics`

## Performance Targets

| Operation           | Target  | Index Used                    | Expected Gain |
| ------------------- | ------- | ----------------------------- | ------------- |
| Feed generation     | < 100ms | idx_follows_follower_id       | 10-50x        |
| Follower listing    | < 50ms  | idx_follows_followee_id       | 20-100x       |
| is_following check  | < 10ms  | idx_follows_follower_followee | 5-10x         |
| Cache invalidation  | < 30ms  | idx_follows_followee_id       | 20-100x       |
| Batch follow checks | < 50ms  | idx_follows_follower_followee | 5-10x         |

## Requirements

```bash
# Install pytest-benchmark
pip install pytest-benchmark

# Ensure PostgreSQL is running with test data
# Migration phase_3a_002 must be applied (Follow table indexes)
```

## Test Data Setup

Benchmarks require test data:

- Multiple users
- Follow relationships (at least 10-20 follows)
- Posts from followed users

Generate test data:

```bash
# Option 1: Use existing test fixtures
pytest tests/api/test_social.py -v  # Creates test data

# Option 2: Manual test data (SQL)
# See /docs/testing/test-data-generation.md
```

## Interpreting Results

### Benchmark Output

```
test_get_followees_for_feed
    Mean: 15.2ms  ✅ Under 50ms target
    Min:  12.8ms
    Max:  18.7ms
    StdDev: 1.2ms
```

**Good indicators**:

- Mean < target (see table above)
- Low StdDev (< 20% of mean)
- EXPLAIN shows "Index Scan" not "Seq Scan"

**Bad indicators**:

- Mean > target
- High StdDev (query time unstable)
- EXPLAIN shows "Seq Scan" (index not used)

### Query Plan Analysis

Run comparison test to see actual plans:

```bash
pytest -v -s benchmarks/test_social_performance.py::TestComparisonMetrics::test_index_effectiveness_comparison
```

Look for:

- ✅ `Index Scan using idx_follows_follower_id`
- ❌ `Seq Scan on follows` (index not used!)

## Baseline Comparisons

### Save Baseline (Before Optimization)

```bash
# Before applying phase_3a_002 migration
pytest benchmarks/ --benchmark-save=before-indexes
```

### Measure Improvement (After Optimization)

```bash
# After applying phase_3a_002 migration
pytest benchmarks/ --benchmark-compare=before-indexes
```

Expected output:

```
Comparing before-indexes vs current:
  test_get_followees_for_feed: 45.2x faster (750ms → 16.6ms) ✅
  test_get_followers_list: 82.5x faster (980ms → 11.9ms) ✅
  test_is_following_check: 7.3x faster (52ms → 7.1ms) ✅
```

## CI Integration

Benchmarks run in CI (informational only, not blocking):

```yaml
# .github/workflows/performance.yml
- name: Run Performance Benchmarks
  run: |
    pytest benchmarks/ --benchmark-only --benchmark-json=output.json
    # Upload results for trend analysis
```

## Troubleshooting

**"No test data available"**:

- Run: `pytest tests/api/test_social.py` to create test data
- Or manually insert test users and follows

**Benchmarks slower than expected**:

- Check migration applied: `SELECT * FROM alembic_version;`
- Verify indexes exist: `\d follows` in psql
- Check query plan shows Index Scan (use comparison test)

**pytest-benchmark not found**:

```bash
pip install pytest-benchmark
```

## Related Documentation

- **Migration**: `/apps/backend/alembic/versions/phase_3a_002_follow_table_indexes.py`
- **Optimization Guide**: `/docs/guides/performance-optimization.md`
- **Session 197 Summary**: `/docs/checklists.md` (Phase 4C)

## Future Benchmarks

Areas for future benchmark coverage:

- **API response times**: End-to-end latency tests
- **Cache hit rates**: Redis effectiveness metrics
- **Concurrent load**: Multi-user stress tests
- **Memory usage**: Query memory consumption
- **Rate limiting**: Throttling behavior under load
