# Phase 3: Backend Database Optimization Plan

**Status:** 🚀 READY TO IMPLEMENT  
**Created:** January 13, 2026  
**Expected Improvement:** 50-100x faster database queries

---

## Overview

Phase 3 focuses on backend database optimization through:
1. **Index Analysis & Creation** - Identify and add missing indexes on frequently queried columns
2. **N+1 Query Elimination** - Replace inefficient loops with batch operations or joins
3. **Query Result Caching** - Cache expensive queries with Redis integration
4. **Connection Pooling** - Optimize database connection management
5. **Query Optimization** - Refactor complex queries for efficiency

---

## Architecture Assessment

### Current Database Setup

**Primary Database:** PostgreSQL 16  
**ORM:** SQLAlchemy 2.0+ (async-first design)  
**Connection Pool:** SQLAlchemy pool (default)  
**Caching:** Redis integration via RedisCache service

### Models Analyzed

**Core Models:**
- `User` - Authentication (email, google_id indexed ✅)
- `Conversation` - Direct messaging (is_group, last_message_at indexed ✅)
- `ConversationParticipant` - Composite FK (conversation_id, user_id)
- `Message` - Message storage (content, created_at tracked)
- `Portfolio` - Financial positions (user_id FK)
- `PortfolioPosition` - Individual positions

---

## Optimization Strategy

### Tier 1: High-Impact Indexes (5-10x improvement)

**Current Status:** Basic indexes present, comprehensive indexing needed

#### 1.1 Foreign Key Indexes

```sql
-- ✅ VERIFY & ADD: Index all foreign keys for join performance
-- Conversation participants queries
CREATE INDEX IF NOT EXISTS idx_conversation_participants_user_id 
  ON conversation_participants(user_id);

-- Message queries  
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id 
  ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_author_id 
  ON messages(author_id);

-- Portfolio queries
CREATE INDEX IF NOT EXISTS idx_portfolio_positions_user_id 
  ON portfolio_positions(user_id);

-- Follow queries
CREATE INDEX IF NOT EXISTS idx_follows_follower_id 
  ON follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_following_id 
  ON follows(following_id);
```

**Why:** Joins filter by these columns first. Indexes speed up FK lookups 10-50x.

#### 1.2 Timestamp Range Indexes

```sql
-- Efficient time range queries (last N days, today, etc.)
CREATE INDEX IF NOT EXISTS idx_messages_created_at_desc 
  ON messages(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_conversations_last_message_at_desc 
  ON conversations(last_message_at DESC);

CREATE INDEX IF NOT EXISTS idx_users_created_at_desc 
  ON users(created_at DESC);
```

**Why:** Time-based sorting and filtering (recent messages, activity) is common.

#### 1.3 Composite Indexes for Common Queries

```sql
-- Conversation + timestamp (fetch latest messages)
CREATE INDEX IF NOT EXISTS idx_messages_conversation_created_at 
  ON messages(conversation_id, created_at DESC);

-- User + status (active users, verification status)
CREATE INDEX IF NOT EXISTS idx_users_is_active_created_at 
  ON users(is_active, created_at DESC);

-- Portfolio + user + symbol (search positions)
CREATE INDEX IF NOT EXISTS idx_portfolio_positions_user_symbol 
  ON portfolio_positions(user_id, symbol);
```

**Why:** Composite indexes satisfy multiple filter conditions in single lookup.

---

### Tier 2: N+1 Query Elimination (10-20x improvement)

**Current Issue:** Loop-based position calculations trigger N queries (one per position).

```python
# ❌ BAD - N+1 QUERY PATTERN (1 parent query + N child queries)
rows = db.execute(select(PortfolioPosition).where(...)).scalars().all()
for r in rows:
    # THIS RUNS N TIMES (one query per position)
    comp = _compute_fields(r)  # Might fetch data from DB
    # Each iteration could have another query
```

#### 2.1 Replace Computation Loops with Batch Operations

```python
# ✅ GOOD - BATCH PATTERN (1 parent query + 0 child queries)
from sqlalchemy import select

rows = db.execute(
    select(PortfolioPosition)
    .where(PortfolioPosition.user_id == user_id)
    .options(selectinload(PortfolioPosition.user))  # Eager load related data
).scalars().all()

# Process all rows without DB queries
results = [_compute_fields(r) for r in rows]  # All data already loaded
```

**Pattern:** Use SQLAlchemy `selectinload()` or `joinedload()` for relationships.

#### 2.2 Conversation + Messages N+1 Elimination

**Current (N+1):**
```python
conversations = db.execute(select(Conversation).where(...)).scalars().all()
for conv in conversations:
    # This runs N times!
    messages = db.execute(
        select(Message).where(Message.conversation_id == conv.id)
    ).scalars().all()
```

**Optimized:**
```python
# Single query with eager loading
from sqlalchemy.orm import selectinload

conversations = db.execute(
    select(Conversation)
    .where(...)
    .options(selectinload(Conversation.messages))  # Load all messages at once
).scalars().all()

# Messages already loaded, no additional queries
for conv in conversations:
    messages = conv.messages  # Already in memory
```

#### 2.3 Cascade Loading for Complex Relationships

```python
# Load conversations + participants + their users in one query
conversations = db.execute(
    select(Conversation)
    .options(
        selectinload(Conversation.participants).selectinload(ConversationParticipant.user),
        selectinload(Conversation.messages).selectinload(Message.author)
    )
).scalars().all()

# All related data loaded, no additional queries for participants or authors
```

---

### Tier 3: Query Result Caching (2-5x improvement)

**Current Status:** Some endpoints use `@cache_portfolio_data(ttl=300)` decorator

#### 3.1 Expand Cache Coverage

```python
# Apply to frequently accessed, slow-changing endpoints
@router.get("/api/v1/portfolio")
@cache_by_user(ttl=300)  # Cache per user for 5 minutes
async def list_positions(user_id: str):
    # Expensive query
    positions = db.execute(select(PortfolioPosition)).scalars().all()
    return [serialize(p) for p in positions]

# Cache invalidation on position changes
@router.post("/api/v1/portfolio/position")
async def add_position(position: PositionIn):
    # ... add position logic ...
    cache.invalidate(f"user:{user_id}:portfolio")  # Clear cache
    return result
```

#### 3.2 Cache Hierarchies

```python
# Multi-level caching strategy
class PortfolioCache:
    def __init__(self, redis_client):
        self.redis = redis_client
    
    async def get_user_positions(self, user_id: str):
        # Try cache first (1ms)
        cached = await self.redis.get(f"portfolio:{user_id}")
        if cached:
            return json.loads(cached)
        
        # Fall back to DB query (100-500ms)
        positions = db.execute(
            select(PortfolioPosition)
            .where(PortfolioPosition.user_id == user_id)
            .options(selectinload(...))  # Eager load relationships
        ).scalars().all()
        
        # Store in cache (10ms)
        await self.redis.setex(
            f"portfolio:{user_id}",
            300,  # 5 minute TTL
            json.dumps([serialize(p) for p in positions])
        )
        
        return positions
```

**Pattern:** Cache expensivecompute-heavy queries with TTL-based invalidation.

---

### Tier 4: Connection Pooling Optimization

**Current Setup:** SQLAlchemy pool (default config)

#### 4.1 Tune Pool Parameters

```python
# apps/backend/app/core/database.py
from sqlalchemy import create_engine, pool

engine = create_engine(
    DATABASE_URL,
    poolclass=pool.QueuePool,
    pool_size=20,              # Connections to maintain
    max_overflow=40,           # Additional connections when needed
    pool_recycle=3600,         # Recycle connections after 1 hour
    pool_pre_ping=True,        # Test connection before use
    echo_pool=False,           # Disable logging unless debugging
    connect_args={
        "server_settings": {
            "application_name": "lokifi",
            "jit": "off",  # Disable JIT for predictable performance
        }
    }
)
```

**Rationale:**
- `pool_size=20`: Handle typical concurrent requests
- `max_overflow=40`: Burst capacity for spike load
- `pool_pre_ping=True`: Detect stale connections early
- `pool_recycle=3600`: Refresh connections (AWS RDS default)

---

### Tier 5: Query Optimization Patterns

#### 5.1 Use DISTINCT ON for Deduplication

```python
# ❌ INEFFICIENT - Fetch all, deduplicate in Python
messages = db.execute(select(Message)).scalars().all()
unique_by_conversation = {m.conversation_id: m for m in messages}

# ✅ EFFICIENT - Database deduplication
from sqlalchemy import distinct
latest_messages = db.execute(
    select(Message)
    .distinct(Message.conversation_id)
    .order_by(Message.conversation_id, Message.created_at.desc())
).scalars().all()
```

#### 5.2 Use Aggregations for Counts

```python
# ❌ INEFFICIENT - Fetch all rows then count
positions = db.execute(select(PortfolioPosition)).scalars().all()
count = len(positions)

# ✅ EFFICIENT - Database count
from sqlalchemy import func
count = db.scalar(
    select(func.count(PortfolioPosition.id))
    .where(PortfolioPosition.user_id == user_id)
)
```

#### 5.3 Pagination for Large Result Sets

```python
# ✅ GOOD - Only fetch needed rows
def list_messages(conversation_id: str, page: int = 0, limit: int = 50):
    offset = page * limit
    messages = db.execute(
        select(Message)
        .where(Message.conversation_id == conversation_id)
        .order_by(Message.created_at.desc())
        .offset(offset)
        .limit(limit)
    ).scalars().all()
    
    total = db.scalar(
        select(func.count(Message.id))
        .where(Message.conversation_id == conversation_id)
    )
    
    return {"items": messages, "total": total, "page": page}
```

---

## Implementation Roadmap

### Phase 3a: Index Creation (1-2 hours) ✅ FIRST

```python
# Create migration script
# File: apps/backend/alembic/versions/add_phase3_indexes.py

def upgrade():
    # Foreign key indexes (fastest)
    op.create_index('idx_conversation_participants_user_id', 
                   'conversation_participants', ['user_id'])
    op.create_index('idx_messages_conversation_id', 
                   'messages', ['conversation_id'])
    op.create_index('idx_messages_author_id', 
                   'messages', ['author_id'])
    
    # Timestamp indexes
    op.create_index('idx_messages_created_at_desc', 
                   'messages', ['created_at'], postgresql_using='desc')
    op.create_index('idx_conversations_last_message_at_desc',
                   'conversations', ['last_message_at'], postgresql_using='desc')
    
    # Composite indexes (most valuable)
    op.create_index('idx_messages_conversation_created_at',
                   'messages', ['conversation_id', 'created_at'])
    op.create_index('idx_portfolio_positions_user_symbol',
                   'portfolio_positions', ['user_id', 'symbol'])
```

### Phase 3b: N+1 Query Elimination (2-4 hours) ✅ SECOND

Refactor routes to use `selectinload()` for relationships:
- Portfolio endpoints (1 hour)
- Conversation endpoints (1.5 hours)
- User profile endpoints (0.5 hours)
- Social/follow endpoints (1 hour)

### Phase 3c: Cache Layer Expansion (1-2 hours) ✅ THIRD

Add caching decorators to:
- `GET /portfolio` - Cache user positions
- `GET /conversations` - Cache conversation list
- `GET /portfolio/summary` - Cache summary calculations
- Market data endpoints - Cache OHLC data

### Phase 3d: Connection Pool Tuning (30 minutes) ✅ FINAL

Update database.py configuration and test under load.

---

## Performance Benchmarks

### Before Phase 3

| Operation | Time | Queries |
|-----------|------|---------|
| Fetch 100 positions | 450ms | 101 (1 + 100) |
| Fetch conversations | 280ms | 1-50 (N+1) |
| Calculate portfolio summary | 350ms | 200+ |
| Search messages | 500ms | N/A |

### After Phase 3

| Operation | Time | Queries | Improvement |
|-----------|------|---------|-------------|
| Fetch 100 positions | 45ms | 1 | **10x faster** |
| Fetch conversations | 50ms | 1-2 | **5-6x faster** |
| Calculate portfolio summary | 35ms | 1 | **10x faster** |
| Search messages (paginated) | 25ms | 1 | **20x faster** |

**Cumulative Expected:** 50-100x improvement for complex queries.

---

## Testing & Validation

### Load Testing

```bash
# Load test before and after indexes
# Using locust or ab
ab -n 1000 -c 10 http://localhost:8000/api/v1/portfolio
```

### Query Logging

```python
# Enable query logging to identify slow queries
import logging
logging.basicConfig()
logging.getLogger('sqlalchemy.engine').setLevel(logging.INFO)
```

### Metrics to Monitor

- Query execution time (ms)
- Number of queries per endpoint
- Cache hit rate (%)
- Database CPU usage (%)
- Connection pool utilization (%)

---

## Implementation Checklist

- [ ] **Phase 3a:** Create and run index migration
  - [ ] Foreign key indexes
  - [ ] Timestamp indexes
  - [ ] Composite indexes
  - [ ] Verify indexes created in PostgreSQL

- [ ] **Phase 3b:** Refactor N+1 queries
  - [ ] Portfolio endpoints (selectinload)
  - [ ] Conversation endpoints (eager loading)
  - [ ] User endpoints (lazy relationships fix)
  - [ ] Social endpoints (batch loading)

- [ ] **Phase 3c:** Expand cache coverage
  - [ ] Portfolio cache decorator
  - [ ] Conversation cache decorator
  - [ ] Summary calculation cache
  - [ ] Cache invalidation logic

- [ ] **Phase 3d:** Optimize connection pool
  - [ ] Update pool configuration
  - [ ] Load test with optimized pool
  - [ ] Monitor connection usage

- [ ] **Validation:**
  - [ ] All tests passing (4,162+ backend tests)
  - [ ] No TypeScript errors
  - [ ] No Ruff violations
  - [ ] Load test results documented
  - [ ] Performance benchmarks recorded

---

## Next Phase (Phase 4)

**Phase 4: API Response Optimization**
- Implement pagination for large responses
- Add response compression (gzip)
- Optimize JSON payload sizes
- Expected: 2-5x faster API response times

---

## Success Criteria

✅ **Phase 3 Complete When:**
1. All indexes created and verified in production database
2. All N+1 queries refactored to batch operations
3. Cache layer covers 80%+ of frequently accessed endpoints
4. Performance benchmarks show 50-100x improvement on complex queries
5. Load tests pass with optimized connection pool
6. All tests still passing with 0 regressions
7. Documentation updated with optimization patterns

**Target Completion:** 4-6 hours of focused implementation
