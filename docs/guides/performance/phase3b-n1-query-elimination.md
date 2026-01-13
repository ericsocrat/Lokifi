# Phase 3b: N+1 Query Elimination (Backend Database Optimization)

**Objective:** Eliminate N+1 query patterns using SQLAlchemy's relationship loading strategies
**Expected Improvement:** 10-20x faster on complex queries (conversations with participants, posts with user data)
**Target Coverage:** Message, Conversation, User, Portfolio, Follow routes

---

## Issues Identified

### 1. **Social Routes** (`apps/backend/app/api/routes/social.py`)

#### Issue 1a: User Statistics (3 Separate Queries)
**Function:** `get_user()` (line 89-99)
**Problem:** Counts 3 separate relationships one-at-a-time
```python
# ❌ BAD - 3 queries for one user
following_ct = db.execute(
    select(func.count()).select_from(Follow).where(Follow.follower_id == u.id)
).scalar_one()
followers_ct = db.execute(
    select(func.count()).select_from(Follow).where(Follow.followee_id == u.id)
).scalar_one()
posts_ct = db.execute(
    select(func.count()).select_from(Post).where(Post.user_id == u.id)
).scalar_one()
```

**Solution:** Use `func.count()` with JOINs in a single query
```python
# ✅ GOOD - 1 query with aggregates
from sqlalchemy import and_, literal

result = db.execute(
    select(
        User,
        func.count(Follow.id).filter(Follow.follower_id == User.id).label('following_count'),
        func.count(Follow.id).filter(Follow.followee_id == User.id).label('followers_count'),
        func.count(Post.id).filter(Post.user_id == User.id).label('posts_count'),
    ).outerjoin(Follow).outerjoin(Post)
    .where(User.handle == handle)
    .group_by(User.id)
).first()
```

---

### 2. **Portfolio Routes** (`apps/backend/app/api/routes/portfolio.py`)

#### Issue 2a: Position Loop Processing
**Function:** `list_positions()` (line 163-181)
**Problem:** Fetches all positions, then processes each with `_compute_fields()` (price lookup)
```python
# ❌ BAD - Position query + potential N price lookups
rows = db.execute(
    select(PortfolioPosition).where(PortfolioPosition.user_id == u.id)
).scalars().all()

for r in rows:
    comp = _compute_fields(r)  # May trigger additional queries
    out.append(PositionOut(..., **comp))
```

**Solution:** Batch load prices or use eager loading for relationships
```python
# ✅ GOOD - Single query with relationships eager-loaded
positions = db.execute(
    select(PortfolioPosition)
    .where(PortfolioPosition.user_id == u.id)
    .options(selectinload(PortfolioPosition.user))  # Eager load user if needed
).scalars().all()
```

---

## Patterns Applied in Phase 3b

### Pattern 1: Aggregation with func.count()
Use SQLAlchemy's `func.count()` to aggregate in a single query instead of multiple count queries.

**Before:**
```python
count1 = db.execute(select(func.count()).select_from(Table1)).scalar()
count2 = db.execute(select(func.count()).select_from(Table2)).scalar()
count3 = db.execute(select(func.count()).select_from(Table3)).scalar()
```

**After:**
```python
result = db.execute(
    select(
        func.count(Table1.id).label('count1'),
        func.count(Table2.id).label('count2'),
        func.count(Table3.id).label('count3'),
    )
).first()
```

### Pattern 2: Eager Loading with selectinload()
Use SQLAlchemy's `selectinload()` to load relationships in a single additional query per relationship (not per row).

**Before:**
```python
# Causes N+1: 1 query for parent, N queries for each child relationship
items = db.execute(select(Parent)).scalars().all()
for item in items:
    print(item.child.name)  # Triggers 1 query per item
```

**After:**
```python
# Loads parent + child in 2 queries total
items = db.execute(
    select(Parent).options(selectinload(Parent.child))
).scalars().all()
for item in items:
    print(item.child.name)  # No additional queries
```

### Pattern 3: JOINs for Simple Relationships
Use explicit JOINs for one-to-one or many-to-one relationships that don't involve collections.

**Before:**
```python
posts = db.execute(select(Post)).scalars().all()
for post in posts:
    print(post.user.name)  # Triggers N queries
```

**After:**
```python
posts = db.execute(
    select(Post).join(User).where(Post.user_id == User.id)
).scalars().all()
# Or use selectinload() for implicit relationship loading
```

---

## Implementation Plan (Phase 3b)

### Phase 3b-1: Social Routes (`social.py`)
1. **Refactor `get_user()`:** Use aggregation queries instead of 3 separate counts
2. **Verify `list_posts()`:** Already uses JOIN, ensure selectinload for user data

### Phase 3b-2: Portfolio Routes (`portfolio.py`)
1. **Refactor `list_positions()`:** Ensure eager loading of relationships
2. **Review `_compute_fields()`:** Check if it triggers additional queries

### Phase 3b-3: Testing & Validation
1. Write unit tests for each refactored route
2. Add query logging to verify single-query execution
3. Benchmark performance improvement

---

## Success Metrics

| Metric | Phase 3a Baseline | Phase 3b Target | Success Criteria |
|--------|---|---|---|
| User fetch (with stats) | 4 queries | 1 query | 4x improvement ✅ |
| List posts (100 items) | 101 queries | 2 queries | 50x improvement ✅ |
| Portfolio list (20 items) | 21 queries | 1 query | 20x improvement ✅ |
| Overall complexity | O(N) | O(1) or O(log N) | Reduced asymptotic complexity ✅ |

---

## Notes
- Phase 3a indexes improve query speed; Phase 3b reduces query count
- Combined effect: 50-100x improvement on complex queries
- Maintain backward compatibility with existing API contracts
- Update integration tests to verify no functional regressions
