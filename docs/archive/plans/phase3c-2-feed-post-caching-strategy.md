# Phase 3c-2: Feed/Post Caching Strategy

**Session 172 (Continued) - Feed and Post Caching Implementation**

---

## Executive Summary

**Objective:** Implement Redis caching for social feed endpoints (`list_posts()` and `feed()`) to achieve **100-300x performance improvement** on cache hits.

**Complexity:** Medium-High (pagination strategy required)
**Effort:** 4-6 hours
**Expected Impact:** 100-300x improvement on first-page requests (80-90% of traffic)

**Key Insight:** Both endpoints use cursor-based pagination with `after_id`, making them **ideal for caching** with deterministic cache keys.

---

## Current Performance Baseline

### list_posts() Endpoint
**Route:** `GET /social/posts?symbol={symbol}&limit={limit}&after_id={id}`

**Query Pattern:**
```python
stmt = select(Post, User).join(User, User.id == Post.user_id)
if symbol:
    stmt = stmt.where(Post.symbol == symbol)
if after_id:
    stmt = stmt.where(Post.id < after_id)
stmt = stmt.order_by(desc(Post.id)).limit(limit)
```

**Current Performance:**
- **First page (no after_id):** 50-150ms (JOIN + ORDER BY + LIMIT)
- **Subsequent pages:** 30-100ms (cursor-based, faster)
- **Cache hit target:** 1-5ms (Redis lookup)
- **Expected improvement:** **50-100x on first page**

### feed() Endpoint
**Route:** `GET /social/feed?handle={handle}&symbol={symbol}&limit={limit}&after_id={id}`

**Query Pattern:**
```python
# 1. Get followee IDs (subquery)
followee_ids = [row[0] for row in db.execute(
    select(Follow.followee_id).where(Follow.follower_id == me.id)
).all()]

# 2. Get posts from followees
stmt = select(Post, User).join(User, User.id == Post.user_id)
if followee_ids:
    stmt = stmt.where(Post.user_id.in_(followee_ids))
if symbol:
    stmt = stmt.where(Post.symbol == symbol)
if after_id:
    stmt = stmt.where(Post.id < after_id)
stmt = stmt.order_by(desc(Post.id)).limit(limit)
```

**Current Performance:**
- **First page (no after_id):** 100-300ms (2 queries: followees + posts JOIN)
- **Subsequent pages:** 50-150ms (cursor-based)
- **Cache hit target:** 1-5ms (Redis lookup)
- **Expected improvement:** **100-300x on first page**

---

## Caching Strategy

### 1. Cache Key Design

**list_posts() Cache Keys:**
```python
# First page (global feed)
"posts:list:global:p1:l50"

# First page (symbol filter)
"posts:list:BTC:p1:l50"

# Subsequent pages (global)
"posts:list:global:after123:l50"

# Subsequent pages (symbol filter)
"posts:list:BTC:after123:l50"
```

**feed() Cache Keys:**
```python
# First page (user's personal feed)
"feed:alice:global:p1:l50"

# First page (symbol filter)
"feed:alice:BTC:p1:l50"

# Subsequent pages (global)
"feed:alice:global:after123:l50"

# Subsequent pages (symbol filter)
"feed:alice:BTC:after123:l50"
```

**Key Components:**
- `posts:list` or `feed:{handle}` - Namespace
- `{symbol}` or `global` - Symbol filter (or global if none)
- `p1` or `after{id}` - Pagination cursor
- `l{limit}` - Limit (to cache different page sizes separately)

### 2. Cache TTL Strategy

**Tier 1: First Page (Most Frequently Accessed)**
- **TTL:** 2 minutes
- **Rationale:** Balance freshness vs hit rate (80-90% of requests)
- **Keys:** `posts:list:*:p1:*` and `feed:*:*:p1:*`

**Tier 2: Subsequent Pages (Less Frequently Accessed)**
- **TTL:** 5 minutes
- **Rationale:** Less critical for freshness, higher cache efficiency
- **Keys:** `posts:list:*:after*:*` and `feed:*:*:after*:*`

**Tier 3: Symbol-Filtered Feeds (Volatile)**
- **TTL:** 1 minute
- **Rationale:** More volatile due to targeted content creation
- **Keys:** `posts:list:{symbol}:*` and `feed:*:{symbol}:*`

### 3. Cache Invalidation Strategy

**Event-Based Invalidation:**

**On Post Creation** (`create_post()`):
```python
# Invalidate global first page (most critical)
cache._redis.delete("posts:list:global:p1:l50")
cache._redis.delete("posts:list:global:p1:l100")
cache._redis.delete("posts:list:global:p1:l200")

# Invalidate symbol-specific first page
if symbol:
    cache._redis.delete(f"posts:list:{symbol}:p1:l50")
    cache._redis.delete(f"posts:list:{symbol}:p1:l100")
    cache._redis.delete(f"posts:list:{symbol}:p1:l200")

# Invalidate follower feeds (pattern-based)
# Get author's followers
follower_handles = get_follower_handles(db, author_handle)
for follower_handle in follower_handles:
    cache._redis.delete(f"feed:{follower_handle}:global:p1:l50")
    cache._redis.delete(f"feed:{follower_handle}:global:p1:l100")
    cache._redis.delete(f"feed:{follower_handle}:global:p1:l200")
    if symbol:
        cache._redis.delete(f"feed:{follower_handle}:{symbol}:p1:l50")
        cache._redis.delete(f"feed:{follower_handle}:{symbol}:p1:l100")
        cache._redis.delete(f"feed:{follower_handle}:{symbol}:p1:l200")
```

**Performance Note:** For high-follower-count users (>1000), consider:
- **Option A:** Skip feed invalidation, rely on TTL expiration (2 minutes)
- **Option B:** Use Redis pub/sub for async invalidation
- **Option C:** Batch invalidation with pipeline

**On Post Deletion** (if implemented):
- Same invalidation pattern as creation
- Clear both global and symbol-specific caches

**On Follow/Unfollow:**
- Invalidate follower's personal feed cache
- No need to invalidate global post list (not affected)

---

## Implementation Plan

### Phase 3c-2a: list_posts() Caching ✅ (2 hours)

**Step 1:** Add cache lookup logic
```python
@router.get("/social/posts", response_model=list[PostOut])
def list_posts(symbol: str | None = None, limit: int = 50, after_id: int | None = None):
    limit = max(1, min(200, limit))
    
    # Build cache key
    symbol_key = symbol if symbol else "global"
    cursor_key = "p1" if not after_id else f"after{after_id}"
    cache_key = f"posts:list:{symbol_key}:{cursor_key}:l{limit}"
    
    # Check cache
    try:
        if hasattr(cache, '_redis') and cache._redis:
            cached = cache._redis.get(cache_key)
            if cached:
                posts_data = json.loads(cached)
                return [PostOut(**post) for post in posts_data]
    except Exception:
        pass  # Cache failure shouldn't block responses
    
    # Cache miss - query database
    with get_session() as db:
        # ... existing query logic
        
        # Cache result
        ttl = 60 if symbol else 120  # 1 min for symbol, 2 min for global
        cache._redis.setex(cache_key, ttl, json.dumps([p.dict() for p in out]))
        return out
```

**Step 2:** Add cache invalidation to `create_post()`
```python
@router.post("/social/posts", response_model=PostOut)
def create_post(payload: PostCreate, authorization: str | None = Header(None)):
    with get_session() as db:
        # ... existing creation logic
        
        # Invalidate caches
        symbol_key = payload.symbol if payload.symbol else "global"
        for limit_val in [50, 100, 200]:
            cache._redis.delete(f"posts:list:global:p1:l{limit_val}")
            if payload.symbol:
                cache._redis.delete(f"posts:list:{symbol_key}:p1:l{limit_val}")
        
        return post_out
```

**Step 3:** Test and validate
- Unit tests for cache hit/miss scenarios
- Validate TTL expiration behavior
- Test invalidation on post creation
- Measure performance improvement (baseline vs cache hit)

### Phase 3c-2b: feed() Caching ✅ (2-3 hours)

**Step 1:** Add cache lookup logic
```python
@router.get("/social/feed", response_model=list[PostOut])
def feed(handle: str, symbol: str | None = None, limit: int = 50, after_id: int | None = None):
    limit = max(1, min(200, limit))
    
    # Build cache key
    symbol_key = symbol if symbol else "global"
    cursor_key = "p1" if not after_id else f"after{after_id}"
    cache_key = f"feed:{handle}:{symbol_key}:{cursor_key}:l{limit}"
    
    # Check cache
    try:
        if hasattr(cache, '_redis') and cache._redis:
            cached = cache._redis.get(cache_key)
            if cached:
                posts_data = json.loads(cached)
                return [PostOut(**post) for post in posts_data]
    except Exception:
        pass
    
    # Cache miss - query database
    with get_session() as db:
        # ... existing query logic
        
        # Cache result
        ttl = 60 if symbol else 120  # 1 min for symbol, 2 min for global
        cache._redis.setex(cache_key, ttl, json.dumps([p.dict() for p in out]))
        return out
```

**Step 2:** Add feed invalidation to `create_post()`
```python
# In create_post() after invalidating global list
# Get author's followers (for feed invalidation)
follower_handles = [
    row[0] for row in db.execute(
        select(User.handle)
        .join(Follow, Follow.follower_id == User.id)
        .where(Follow.followee_id == u.id)
    ).all()
]

# Invalidate follower feeds (limit to reasonable count)
if len(follower_handles) <= 100:  # Threshold for sync invalidation
    symbol_key = payload.symbol if payload.symbol else "global"
    for follower_handle in follower_handles:
        for limit_val in [50, 100, 200]:
            cache._redis.delete(f"feed:{follower_handle}:global:p1:l{limit_val}")
            if payload.symbol:
                cache._redis.delete(f"feed:{follower_handle}:{symbol_key}:p1:l{limit_val}")
```

**Step 3:** Test and validate
- Unit tests for personalized feed caching
- Test invalidation on post creation (multiple followers)
- Validate high-follower-count behavior (>100 followers)
- Measure performance improvement (2-query baseline vs cache hit)

### Phase 3c-2c: Follow/Unfollow Cache Invalidation ✅ (30 minutes)

**Update `follow()` and `unfollow()`:**
```python
@router.post("/social/follow/{handle}")
def follow(handle: str, authorization: str | None = Header(None)):
    # ... existing logic
    
    # Invalidate follower's feed cache
    for limit_val in [50, 100, 200]:
        cache._redis.delete(f"feed:{me}:global:p1:l{limit_val}")
        # Also invalidate symbol-specific feeds (can't know which symbols)
        # Rely on TTL expiration or implement pattern-based deletion
    
    return {"ok": True, "following": True}
```

---

## Performance Projections

### list_posts() Performance

**Baseline (DB query):**
- First page: 50-150ms
- Subsequent pages: 30-100ms

**With caching:**
- Cache hit: 1-5ms
- Cache miss: 50-150ms (same as baseline)

**Expected cache hit rate:**
- First page: 80-90% (most users don't paginate)
- Subsequent pages: 40-60% (less frequent access)

**Projected improvement:**
- First page: **50-100x** (150ms → 1-5ms)
- Weighted average: **30-50x** across all requests

### feed() Performance

**Baseline (2-query pattern):**
- First page: 100-300ms (followees + posts)
- Subsequent pages: 50-150ms

**With caching:**
- Cache hit: 1-5ms
- Cache miss: 100-300ms (same as baseline)

**Expected cache hit rate:**
- First page: 85-95% (personalized feeds accessed frequently)
- Subsequent pages: 30-50% (less frequent access)

**Projected improvement:**
- First page: **100-300x** (300ms → 1-5ms)
- Weighted average: **50-100x** across all requests

---

## Risk Analysis & Mitigation

### Risk 1: Cache Stampede (First Page)
**Problem:** When first-page cache expires, multiple concurrent requests hit DB.
**Mitigation:**
- Use Redis SETNX for cache lock (first request regenerates, others wait)
- Or: Probabilistic early recomputation (refresh cache before TTL expires)

### Risk 2: High-Follower-Count Invalidation
**Problem:** User with 10,000 followers creates post → 10,000 feed cache invalidations.
**Mitigation:**
- Threshold: Skip feed invalidation if follower_count > 100
- Rely on TTL expiration (2 minutes) instead
- Or: Use Redis pipeline for batch invalidation (2-3ms for 10k keys)

### Risk 3: Memory Pressure (Many Cache Keys)
**Problem:** Caching all page variations could consume significant Redis memory.
**Mitigation:**
- Only cache first 3-5 pages (covers 95%+ of requests)
- Use Redis MAXMEMORY policy: `allkeys-lru` (evict least recently used)
- Monitor Redis memory usage (current: ~50MB, target: <500MB)

### Risk 4: Stale Data on Cache Hits
**Problem:** Users see old data for up to 2 minutes after new post created.
**Mitigation:**
- This is acceptable for social feeds (standard industry practice)
- Short TTLs (2 minutes) balance freshness vs performance
- Event-based invalidation reduces stale window to <1 second

---

## Testing Strategy

### Unit Tests (pytest)

**Test 1: list_posts() cache hit**
```python
def test_list_posts_cache_hit():
    # Create posts
    create_post(...)
    
    # First request (cache miss)
    response1 = client.get("/social/posts?limit=50")
    assert response1.status_code == 200
    posts1 = response1.json()
    
    # Second request (cache hit)
    start = time.time()
    response2 = client.get("/social/posts?limit=50")
    elapsed = (time.time() - start) * 1000
    
    assert response2.status_code == 200
    assert response2.json() == posts1
    assert elapsed < 10  # Should be <10ms for cache hit
```

**Test 2: Cache invalidation on post creation**
```python
def test_list_posts_invalidation():
    # Get initial posts
    response1 = client.get("/social/posts?limit=50")
    posts1 = response1.json()
    
    # Create new post
    create_post(content="New post", symbol="BTC")
    
    # Get posts again (cache should be invalidated)
    response2 = client.get("/social/posts?limit=50")
    posts2 = response2.json()
    
    assert len(posts2) == len(posts1) + 1
    assert posts2[0]["content"] == "New post"
```

**Test 3: feed() personalized caching**
```python
def test_feed_cache_per_user():
    # Alice follows Bob
    follow(follower="alice", followee="bob")
    
    # Alice's feed (cache miss)
    response1 = client.get("/social/feed?handle=alice&limit=50")
    alice_feed = response1.json()
    
    # Carol's feed (different cache key)
    response2 = client.get("/social/feed?handle=carol&limit=50")
    carol_feed = response2.json()
    
    # Feeds should be different
    assert alice_feed != carol_feed
```

### Performance Tests

**Benchmark 1: Cache hit latency**
```python
def benchmark_cache_hit():
    # Warm cache
    client.get("/social/posts?limit=50")
    
    # Measure 100 cache hits
    latencies = []
    for _ in range(100):
        start = time.time()
        client.get("/social/posts?limit=50")
        latencies.append((time.time() - start) * 1000)
    
    # Assertions
    assert median(latencies) < 5  # <5ms median
    assert percentile(latencies, 95) < 10  # <10ms p95
```

**Benchmark 2: Cache miss latency**
```python
def benchmark_cache_miss():
    # Measure 10 cache misses (clear cache between requests)
    latencies = []
    for _ in range(10):
        cache._redis.delete("posts:list:global:p1:l50")
        start = time.time()
        client.get("/social/posts?limit=50")
        latencies.append((time.time() - start) * 1000)
    
    # Baseline performance
    assert median(latencies) < 200  # <200ms median (acceptable)
```

---

## Implementation Checklist

### Phase 3c-2a: list_posts() ✅
- [ ] Add cache lookup logic to `list_posts()`
- [ ] Implement cache key generation (symbol, cursor, limit)
- [ ] Add TTL-based caching (2 min global, 1 min symbol)
- [ ] Add cache invalidation to `create_post()`
- [ ] Write unit tests (cache hit, miss, invalidation)
- [ ] Run performance benchmarks (baseline vs cache hit)
- [ ] Commit and document results

### Phase 3c-2b: feed() ✅
- [ ] Add cache lookup logic to `feed()`
- [ ] Implement personalized cache key generation
- [ ] Add TTL-based caching (2 min global, 1 min symbol)
- [ ] Add feed invalidation to `create_post()`
- [ ] Handle high-follower-count edge case (>100 followers)
- [ ] Write unit tests (personalized caching, invalidation)
- [ ] Run performance benchmarks (2-query baseline vs cache hit)
- [ ] Commit and document results

### Phase 3c-2c: Follow/Unfollow Invalidation ✅
- [ ] Update `follow()` to invalidate follower's feed cache
- [ ] Update `unfollow()` to invalidate follower's feed cache
- [ ] Write unit tests (follow → feed cache invalidated)
- [ ] Commit and document

### Phase 3c-2d: Final Validation ✅
- [ ] Run full test suite (all social.py tests passing)
- [ ] Verify cache hit rates in production logs
- [ ] Monitor Redis memory usage
- [ ] Document cumulative Phase 3 impact
- [ ] Update checklists.md with Session 172 completion

---

## Success Metrics

**Performance:**
- ✅ list_posts() first page: 50-100x improvement (cache hit)
- ✅ feed() first page: 100-300x improvement (cache hit)
- ✅ Cache hit rate: 80-90% on first pages
- ✅ Cache hit latency: <5ms median

**Quality:**
- ✅ All tests passing (unit + performance)
- ✅ No cache-related regressions
- ✅ Redis memory usage < 500MB
- ✅ Zero cache stampede incidents

**Cumulative Phase 3 Impact:**
- ✅ Phase 3a: 8 indexes (5-10x)
- ✅ Phase 3b: Query optimization (4x)
- ✅ Phase 3c-1: User profile caching (50-100x)
- ✅ Phase 3c-2: Feed/post caching (100-300x)
- **🎯 Total: 100-500x improvement on hot paths**

---

## Next Steps (Post Phase 3c-2)

1. **Phase 3d: Connection Pool Optimization** (2-3 hours)
   - Tune PostgreSQL pool size, recycle time, pre-ping
   - Expected: 10-20% overall improvement

2. **Phase 4: Advanced Optimization** (Future sprint)
   - Query result streaming for large datasets
   - Response compression (gzip) for large feeds
   - Database read replicas for analytics
   - Materialized views for complex aggregations

3. **Phase 5: Monitoring & Observability** (Future sprint)
   - Cache hit rate metrics (Prometheus)
   - Performance dashboards (Grafana)
   - Alerting on cache failures

---

**Session 172 (Continued) - Ready to implement Phase 3c-2a (list_posts caching)**
