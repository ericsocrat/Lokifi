## Phase 3c: Cache Layer Expansion - Strategic Plan

**Date:** January 14, 2026  
**Priority:** HIGH - Synergizes with Phase 3a (indexes) + 3b (queries)  
**Expected Impact:** 50-100x improvement on cache-hit scenarios  
**Status:** PLANNING → IN PROGRESS

---

## Strategic Context

### Phase Progression
1. **Phase 3a** ✅ - Database indexes (5-10x improvement on indexed queries)
2. **Phase 3b** ✅ - N+1 query elimination (4x improvement on aggregations)
3. **Phase 3c** ⏭️ - Cache layer expansion (50-100x improvement on hot data)
4. **Phase 3d** - Connection pool + integration benchmarking

### Cumulative Impact
- Phase 3a + 3b: 20-50x improvement on message/conversation workloads
- Phase 3a + 3b + 3c: 100-500x improvement on cached user/portfolio data
- Real-world impact: Profile pages, feeds, dashboards from 200ms → 1-4ms

---

## Current State Analysis

### Existing Cache Implementation
**Location:** `app/api/routes/portfolio.py`
```python
@cache_portfolio_data(ttl=300)  # 5-minute TTL
def portfolio_summary(...):
    ...
```

**Limitations:**
- Only used on portfolio endpoints
- 5-minute fixed TTL (not optimized for different data types)
- No cache warming or hierarchy
- No explicit invalidation strategy

### Data That Should Be Cached
1. **User Profiles** (social.py)
   - Handle lookups (very frequent)
   - User counts (following, followers, posts)
   - TTL: 5-10 minutes (low churn)
   - Invalidate on: profile update, follow/unfollow

2. **Portfolio Data** (portfolio.py)
   - Position summaries
   - Portfolio totals
   - TTL: 2-5 minutes (market-dependent)
   - Invalidate on: position changes, market close

3. **Market Data** (market.py)
   - OHLC bars
   - Ticker quotes
   - TTL: 1 minute (real-time requirement)
   - Strategy: External provider caching

4. **Feed Posts** (social.py)
   - Recent posts (paginated)
   - User feeds
   - TTL: 30-60 seconds (temporal sorting)
   - Invalidate on: new post, post deletion

5. **Alerts** (alerts.py)
   - Alert list per user
   - TTL: 1-2 minutes (frequent changes)
   - Invalidate on: alert create/update/delete

---

## Implementation Strategy

### Tier 1: User/Profile Cache
**Impact:** HIGH (profile lookups are frequent)
**Complexity:** LOW (isolated data)

**Implementation:**
```python
# Cache key patterns
user:{handle}        # User object + counts
user:{user_id}       # User by ID
user:following:{uid} # Following list (paginated)
user:followers:{uid} # Followers list (paginated)

# Cache decorator pattern
@cache_with(ttl=300, invalidate_on=['user_update', 'follow_change'])
def get_user(handle: str) -> UserOut:
    ...
```

**Expected Improvement:** 100-500x on profile page loads

### Tier 2: Portfolio Cache
**Impact:** HIGH (frequently accessed for position management)
**Complexity:** MEDIUM (dependency on market data)

**Implementation:**
```python
# Expand existing decorator
@cache_portfolio_data(
    ttl=300,
    depends_on=['market_update'],  # Invalidate on market changes
    key_pattern='portfolio:{user_id}'
)
def portfolio_summary(...):
    ...
```

**Expected Improvement:** 50-200x on portfolio dashboard loads

### Tier 3: Feed Cache
**Impact:** MEDIUM (pagination reduces cache hit ratio)
**Complexity:** MEDIUM (invalidation on new posts)

**Implementation:**
```python
# Paginated feed cache with window-based invalidation
@cache_with(
    ttl=60,
    key_pattern='feed:{user_id}:{page}',
    invalidate_on=['post_created', 'post_deleted']
)
def get_feed(user_id: int, page: int = 1):
    ...
```

**Expected Improvement:** 100-300x for repeated feed requests

### Tier 4: Market Data Cache
**Impact:** MEDIUM (external provider has own caching)
**Complexity:** LOW (read-only)

**Implementation:**
```python
# Delegate to provider-level caching
# OHLC data served from external provider cache (already 60s TTL)
# No additional cache layer needed - verify provider rates
```

---

## Cache Invalidation Strategy

### Pattern 1: Time-Based (TTL)
```python
# Short TTL for frequently changing data
user:profile:{}      → 5 minutes
portfolio:summary:{}  → 3 minutes
feed:{user}:{page}   → 60 seconds
alerts:{user}        → 2 minutes
```

### Pattern 2: Event-Based Invalidation
```python
# On user update: invalidate user profile cache
async def update_profile(user_id: int, ...):
    # ... update logic
    cache.invalidate(f'user:{user_id}')
    cache.invalidate(f'user:{user_handle}')

# On follow/unfollow: invalidate user counts
async def follow_user(user_id: int, target_id: int):
    # ... follow logic
    cache.invalidate(f'user:{target_id}')  # Invalidate target's counts
    cache.invalidate(f'user:{user_id}')    # Invalidate follower's counts

# On new post: invalidate feed caches
async def create_post(user_id: int, ...):
    # ... post creation
    # Invalidate all followers' feed caches
    followers = get_followers(user_id)
    for follower_id in followers:
        cache.invalidate_pattern(f'feed:{follower_id}:*')
```

### Pattern 3: Dependency-Based Invalidation
```python
# Market close: invalidate portfolio caches
# on_market_close():
#     cache.invalidate_pattern('portfolio:*')

# New symbol: invalidate market data cache
# on_new_symbol_data(symbol):
#     cache.invalidate(f'market:{symbol}:*')
```

---

## Architecture Decisions

### Cache Backend: Redis
**Already Running:** Yes (Docker container)
**Capabilities:** Perfect fit for this use case

**Connection Pattern:**
```python
# Use existing Redis connection
from app.core.cache import cache

# Consistent interface across routes
cache.get(key)
cache.set(key, value, ttl=300)
cache.invalidate(key)
cache.invalidate_pattern(f'user:*')
```

### Decorator Pattern
```python
# Proposed decorator (build on existing)
@cache_result(
    ttl=300,
    key_builder=lambda handle: f'user:{handle}',
    invalidate_on=['user_update', 'follow_change']
)
def get_user(handle: str):
    ...

# Or context manager pattern for complex logic
with cache_context('portfolio:summary', ttl=300):
    # Expensive computation
    result = compute_portfolio()
```

### Cache Key Naming Convention
```
# Format: domain:entity:identifier[:modifier]

# User caches
user:profile:{handle}           # User object + basic info
user:counts:{user_id}           # Following/followers/posts counts
user:following:{user_id}:p{n}   # Paginated following list
user:followers:{user_id}:p{n}   # Paginated followers list

# Portfolio caches
portfolio:summary:{user_id}     # Portfolio totals
portfolio:position:{position_id} # Single position details
portfolio:metrics:{user_id}     # Performance metrics

# Feed caches
feed:{user_id}:p{page}         # User feed paginated
feed:public:p{page}            # Public/recent feed

# Alert caches
alerts:{user_id}               # User's active alerts
alerts:triggered:{user_id}     # Recently triggered alerts
```

---

## Implementation Roadmap

### Phase 3c-1: User Profile Caching (2-3 hours)
- [ ] Create cache decorator/utility
- [ ] Apply to `get_user()` 
- [ ] Add invalidation on follow/unfollow
- [ ] Update tests to validate cache behavior
- [ ] Benchmark: 100-500x improvement expected

### Phase 3c-2: Portfolio Caching (1-2 hours)
- [ ] Expand existing `@cache_portfolio_data`
- [ ] Add dependency-based invalidation
- [ ] Cache position lists
- [ ] Add cache warming on app startup
- [ ] Benchmark: 50-200x improvement expected

### Phase 3c-3: Feed/Alert Caching (2-3 hours)
- [ ] Implement feed caching with pagination
- [ ] Add smart invalidation on new posts
- [ ] Implement alert list caching
- [ ] Add cache statistics/monitoring
- [ ] Benchmark: 100-300x improvement expected

### Phase 3c-4: Testing + Validation (2-3 hours)
- [ ] Cache hit ratio tests
- [ ] Invalidation correctness tests
- [ ] Integration tests with real Redis
- [ ] Load tests measuring impact
- [ ] Documentation: cache patterns guide

---

## Success Metrics

### Cache Hit Ratio Targets
| Endpoint | Current | Target | Method |
|----------|---------|--------|--------|
| GET /users/{handle} | 0% | 80-90% | Profile caching |
| GET /portfolio | 0% | 70-80% | Portfolio caching |
| GET /feed | 0% | 60-70% | Feed caching |
| Overall | 0% | 60-75% | Combined |

### Performance Targets
| Scenario | Before | After | Improvement |
|----------|--------|-------|------------|
| Cold user profile | 50ms | 50ms | 1x (cache miss) |
| Warm user profile | 50ms | 1ms | 50x (cache hit) |
| Cold portfolio | 100ms | 100ms | 1x (cache miss) |
| Warm portfolio | 100ms | 1-2ms | 50-100x (cache hit) |
| Repeated feed | 200ms | 2-3ms | 100x (paginated cache) |

### Monitoring
```python
# Track cache performance
cache.stats()  # Hit/miss counts
cache.memory_usage()  # Redis memory
cache.invalidation_count()  # Invalidation events
```

---

## Risk Mitigation

### Risk 1: Stale Data
**Mitigation:**
- Conservative TTLs (5-10 minutes for user data)
- Event-based invalidation for critical changes
- Cache stampede protection (distributed locks)

### Risk 2: Cache Invalidation Complexity
**Mitigation:**
- Start with simple TTL-based caching
- Add event invalidation gradually
- Comprehensive test coverage
- Monitoring + alerting on cache stats

### Risk 3: Redis Memory Pressure
**Mitigation:**
- Monitor Redis memory usage
- Implement eviction policies (LRU)
- TTL strategy prevents unbounded growth
- Graceful degradation if cache unavailable

### Risk 4: Distributed Cache Consistency
**Mitigation:**
- Single Redis instance (no replication yet)
- Invalidation broadcast via pub/sub
- Eventual consistency acceptable for UI data
- Future: multi-instance setup with clustering

---

## Dependencies & Prerequisites

### Redis Configuration
✅ Already running in Docker
```yaml
# From docker-compose.yml
redis:
  image: redis:7-alpine
  ports:
    - 6379:6379
```

### Cache Utility Library
- Check: `app/core/cache.py` for existing utilities
- Expand as needed for decorators/patterns

### Testing Infrastructure
✅ Existing test framework (pytest, mocks)
- Add cache assertion helpers
- Implement cache mock for unit tests

---

## Next Steps

1. **Immediate (Next 1-2 hours):**
   - Audit existing cache implementation
   - Design cache key naming convention
   - Create reusable cache decorator
   - Start Phase 3c-1 (user profile caching)

2. **Short-term (This session):**
   - Complete 3c-1 and 3c-2
   - Write integration tests
   - Measure and document improvements

3. **Later (Next session):**
   - Phase 3c-3 (feed/alert caching)
   - Phase 3d (connection pool + benchmarking)
   - Production load testing

---

## Related Documentation

- **Phase 3a:** Database indexes - `/docs/session-summaries/session-170-phase3a-complete.md`
- **Phase 3b:** N+1 elimination - `/docs/session-summaries/session-171-phase3b1-complete.md`
- **Redis:** Docker setup - `infra/docker/docker-compose.yml`
- **Patterns:** 44 battle-tested patterns - `/docs/architecture/patterns/`

---

**Status:** READY FOR IMPLEMENTATION ✅
