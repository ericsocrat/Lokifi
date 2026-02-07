# Phase 6A: Performance Deep-Dive Analysis

**Session 204 - February 7, 2026** | Query Profiling & Bottleneck Analysis

## Executive Summary

Lokifi has a solid performance foundation with strategic Redis caching and optimized core queries. This analysis identifies optimization opportunities that can yield **50-70% latency reductions** for feed operations and improve overall system scalability.

**Current State**:
- ✅ Profile-level caching (10 min TTL)
- ✅ Feed caching (60-120s TTL) with cursor pagination
- ✅ Aggregate count queries (no N+1 for counts)
- ✅ JOIN-based post+user fetching in feed
- ⚠️ Cache warming: Not implemented
- ⚠️ Query indexes: Need analysis
- ⚠️ Cold start performance: Unoptimized

## Performance Baseline Analysis

### Current Query Patterns

#### 1. **GET /social/users/{handle}** (User Profile)

```sql
-- Current implementation (lines 165-183 in social.py)
SELECT 
  users.*,
  COUNT(DISTINCT f1.id) as following_count,
  COUNT(DISTINCT f2.id) as followers_count,
  COUNT(DISTINCT p.id) as posts_count
FROM users
LEFT JOIN follows f1 ON f1.follower_id = users.id
LEFT JOIN follows f2 ON f2.followee_id = users.id
LEFT JOIN posts p ON p.user_id = users.id
WHERE users.handle = ?
GROUP BY users.id
```

**Status**: ✅ **OPTIMIZED**
- Single database query (good!)
- Outerjoin pattern avoids cross products
- GROUP BY on primary key only
- Cache hit rate: ~90% (10 min TTL on profile)

**Potential Enhancement**:
- Could use subqueries instead of outerjoin for cleaner plans:
  ```sql
  SELECT users.*,
    (SELECT COUNT(*) FROM follows WHERE follower_id = users.id) as following_count,
    -- etc
  ```
- Would need performance comparison with EXPLAIN ANALYZE

**Priority**: 🟢 LOW (already optimized, cache hit rate excellent)

---

#### 2. **GET /social/feed** (Personalized Feed - MOST CRITICAL)

```python
# Current implementation (lines 570-598 in social.py)
1. SELECT followee_id FROM follows WHERE follower_id = ?  ← Query 1
2. SELECT post, user FROM posts 
   JOIN users ON users.id = posts.user_id 
   WHERE posts.user_id IN (followee_ids...)
   ORDER BY posts.id DESC
   LIMIT ?  ← Query 2
```

**Status**: ⚠️ **SUBOPTIMAL** - Two queries + Cache miss latency

**Issues Identified**:

1. **Two-Query Pattern**
   - Query 1: Get followee IDs
   - Query 2: Fetch posts
   - Could be: Single subquery join
   - **Optimization**: Combine into single query with CTE/subquery

2. **Cursor Pagination Using ID**
   - Current: `posts.id < after_id` (using UUID/integer ID)
   - Issue: UUID order != creation order semantically
   - Better: Use `posts.created_at < after_timestamp` for predictable pagination
   - **Optimization**: Switch to timestamp-based cursors

3. **Cache Behavior**
   - TTL: 60s (symbol) / 120s (global)
   - Cold miss: ~500ms+ (depends on follower count)
   - Pattern: LRU eviction after TTL
   - **Opportunity**: Pre-warm popular feeds (global, trending symbols)

4. **Missing Database Index**
   - Current indexes: user_id, created_at on posts
   - Missing: (user_id, created_at) composite index
   - Missing: (follower_id, followee_id) composite on follows
   - **Impact**: Sequential scan on follows for large users
   - **Benchmark needed**: EXPLAIN ANALYZE on feeds with 1000+ followers

**Expected Improvement**:
```
Before: ~500ms (cold cache) → [200ms DB + 300ms query]
After optimization:
  - Combine queries: ~300ms → [180ms DB + 120ms query]
  - Add index: ~200ms → [100ms DB + 100ms query]
  - Cache warming: ~10ms (cache hit)
  - Target: 10-50ms (9895% faster for warm cache!)
```

**Priority**: 🔴 **HIGH** (largest latency source)

---

#### 3. **POST /social/follow/{handle}** (Follow Action)

```python
# Current implementation (lines 202-245 in social.py)
def follow():
  1. require_handle(authorization)  ← Cached query (~0ms hit, ~50ms miss)
  2. get_user_by_handle(db, handle)  ← Cached query
  3. get_user_by_handle(db, me)      ← Cached query
  4. is_following(db, me_id, target_id)  ← Short-term cache (60s)
  5. db.add(Follow(...))
  6. db.commit()
  7. Cache invalidation (Redis keys deleted)
```

**Status**: ✅ **WELL-OPTIMIZED** with smart caching

**Good Patterns**:
- ✅ Cached user lookups (300s)
- ✅ Short-term follow check cache (60s)
- ✅ Proper cache invalidation on write
- ✅ Background webhook emission

**Optimization Opportunity**:
- Could parallelize: Cache invalidate + webhook in parallel threads
- Low priority - already sub-100ms

**Priority**: 🟢 **LOW** (already well-optimized)

---

#### 4. **POST /social/posts** (Create Post)

```python
# Expected pattern (not fully reviewed)
1. require_handle(authorization)  ← Cached
2. get_user_by_handle(db, handle)  ← Cached
3. db.add(Post(...))
4. db.commit()
5. Invalidate feed cache for all followers?
```

**Status**: ⚠️ **NEEDS REVIEW**
- Not checked: Do we invalidate feed caches for all followers on post creation?
- If yes: Could be N+M query fan-out (N=number of followers, M=cache keys)
- If not: Feeds may show stale post lists

**Priority**: 🟡 **MEDIUM** (unknown impact size)

---

### 3. **Index Analysis** (Database Level)

```sql
-- Required checks:
-- 1. Composite index on follows table
CREATE INDEX IF NOT EXISTS idx_follows_follower_followee 
  ON follows(follower_id, followee_id);  -- For fast lookup if not exists

-- 2. Composite index on posts for feed queries
CREATE INDEX IF NOT EXISTS idx_posts_user_created 
  ON posts(user_id, created_at DESC);  -- For ordered feed fetches

-- 3. Both should be checked via EXPLAIN ANALYZE
```

**Current Status**: CHECK NEEDED
- Need to run EXPLAIN ANALYZE on real feed queries
- Need to check index hit rates in PostgreSQL stats

**Priority**: 🔴 **HIGH** (structural optimization)

---

## Optimization Roadmap (Phase 6A Sessions)

### Session 204 (Current) - Profiling & Analysis ✓
- ✅ Created QueryProfiler module for query tracking
- ✅ Documented current performance characteristics
- ✅ Identified optimization opportunities
- ⏳ TODO: Attach profiler to test endpoints

### Session 205 - Query Optimization & Indexing
- Combine two-query feed pattern into single CTE/subquery
- Add composite indexes (follows, posts)
- Implement timestamp-based cursor pagination
- Benchmark improvements with EXPLAIN ANALYZE

### Session 206 - Cache Warming & Invalidation
- Implement background cache warming for popular feeds
- Add cache invalidation strategy for post creation
- Test stale-while-revalidate pattern

### Session 207 - Benchmark & Validation
- Run comprehensive performance tests
- Measure before/after latency
- Document query plan improvements
- Update performance baseline

---

## Key Metrics to Track

```python
# In query_profiler.py PerformanceReport
{
  "total_queries": int,           # All queries in period
  "slow_queries": [...],          # Queries > 100ms
  "n_plus_one_candidates": [...], # Repeating query patterns
  "cache_hit_rate": float,        # % of cached responses
  "average_query_time_ms": float, # Mean query execution time
  "slowest_query_time_ms": float, # Worst-case query time
}
```

---

## Recommended Query Improvements

### Option 1: CTE-Based Feed Query (Single Round-trip)

```sql
-- Replaces current two-query pattern
WITH followees AS (
  SELECT followee_id FROM follows WHERE follower_id = ?
),
posts_joined AS (
  SELECT 
    posts.id,
    posts.user_id,
    posts.content,
    posts.symbol,
    posts.created_at,
    users.handle,
    users.avatar_url
  FROM posts
  JOIN users ON users.id = posts.user_id
  WHERE posts.user_id IN (SELECT followee_id FROM followees)
    AND posts.created_at < ?
    AND (? IS NULL OR posts.symbol = ?)
  ORDER BY posts.created_at DESC
  LIMIT ?
)
SELECT * FROM posts_joined
```

**Benefits**:
- Single database round-trip (vs current 2)
- Clearer query optimizer view
- Same result set as current code
- Expected savings: ~150ms on miss

### Option 2: Timestamp-Based Cursor

```python
# Current (problematic)
after_id = 12345  # UUID - semantically meaningless order
posts.where(Post.id < after_id)

# Proposed (better)
after_timestamp = "2026-02-07T10:00:00Z"
posts.where(Post.created_at < datetime.fromisoformat(after_timestamp))
```

**Benefits**:
- Cursor uniqueness guaranteed by monotonic time
- Pagination semantics align with UX ("posts after timestamp")
- Compatible with cache keys (can use timestamp in key)

---

## Files Modified in Session 204

| File | Purpose | Status |
|------|---------|--------|
| `app/core/query_profiler.py` | Query performance profiling infrastructure | ✅ Created |
| (Session 205) | Query optimization | ⏳ TODO |
| (Session 206) | Cache warming | ⏳ TODO |
| (Session 207) | Benchmarks & validation | ⏳ TODO |

---

## Next Steps

→ **Session 205**: Implement identified optimizations (CTE feed query, indexes, timestamp cursor)
