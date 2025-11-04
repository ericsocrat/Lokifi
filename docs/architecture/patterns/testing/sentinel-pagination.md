# Sentinel Pagination Pattern

**Category**: Testing
**Difficulty**: 🟡 Intermediate
**Success Rate**: 100% (1/1 sessions - FollowService Gap 3)
**Impact**: 🎯 Medium (pagination edge cases)
**Time Investment**: 20-30 minutes
**Sessions Used**: FollowService Gap 3

---

## Problem

Efficient pagination requires detecting if more results exist **without** running expensive COUNT queries. Sentinel pattern fetches `page_size + 1` records to determine `has_next`.

**Traditional Approach** (slow):
```python
# Two queries
total = await db.execute(select(func.count())).scalar()  # COUNT query
results = await db.execute(select(...).limit(page_size)).all()  # SELECT
has_next = (offset + page_size) < total  # Calculate has_next
```

**Sentinel Approach** (fast):
```python
# One query
results = await db.execute(select(...).limit(page_size + 1)).all()  # +1 sentinel
has_next = len(results) > page_size  # True if sentinel present
results = results[:page_size]  # Return only requested items
```

## Solution

**Pattern**: Mock `page_size + 1` rows, verify service returns `page_size` items + `has_next=True`.

```python
# Service code
stmt = select(User).limit(page_size + 1)  # Fetch 21 for page_size=20
results = await db.execute(stmt)
suggestions = results.all()
has_next = len(suggestions) > page_size  # True if 21 results
suggestions = suggestions[:page_size]  # Return only 20

# Test code
mock_rows = [MagicMock(...) for _ in range(21)]  # +1 sentinel
mock_result.all.return_value = mock_rows

result = await follow_service.get_follow_suggestions(page_size=20)

assert len(result.suggestions) == 20  # Trimmed
assert result.has_next is True  # Sentinel detected
```

## Complete Example

```python
class TestSentinelPagination:
    @pytest.mark.asyncio
    async def test_has_next_page_detected(self):
        """Should detect next page when sentinel row present."""
        # Arrange
        page_size = 20
        mock_db = AsyncMock()

        # Mock 21 rows (20 + 1 sentinel)
        mock_rows = [
            MagicMock(
                user_id=uuid4(),
                username=f"user{i}",
                follower_count=100 - i,
            )
            for i in range(21)  # +1 sentinel
        ]

        mock_result = MagicMock()
        mock_result.all.return_value = mock_rows
        mock_db.execute.return_value = mock_result

        follow_service = FollowService(db=mock_db)

        # Act
        result = await follow_service.get_follow_suggestions(
            user_id=uuid4(),
            page=1,
            page_size=page_size,
        )

        # Assert
        assert len(result.suggestions) == 20  # Trimmed to page_size
        assert result.has_next is True  # Sentinel detected
        assert result.page == 1

    @pytest.mark.asyncio
    async def test_last_page_no_sentinel(self):
        """Should detect last page when no sentinel row."""
        # Arrange
        page_size = 20
        mock_rows = [MagicMock(...) for _ in range(15)]  # <20, no sentinel
        mock_result.all.return_value = mock_rows

        # Act
        result = await follow_service.get_follow_suggestions(
            user_id=uuid4(),
            page=3,
            page_size=page_size,
        )

        # Assert
        assert len(result.suggestions) == 15
        assert result.has_next is False  # No sentinel

    @pytest.mark.asyncio
    async def test_exactly_page_size_has_next_unknown(self):
        """Should handle edge case: exactly page_size results."""
        # Arrange
        page_size = 20
        mock_rows = [MagicMock(...) for _ in range(20)]  # Exactly 20

        # Act
        result = await follow_service.get_follow_suggestions(
            user_id=uuid4(),
            page=1,
            page_size=page_size,
        )

        # Assert
        assert len(result.suggestions) == 20
        # has_next is False (no sentinel)
        # Note: Ambiguous case - could be last page or exactly full page
        assert result.has_next is False
```

## Anti-Patterns

### ❌ Don't: Mock exact page_size

```python
# ❌ BAD: Mocking exactly page_size (can't detect has_next)
mock_rows = [MagicMock(...) for _ in range(20)]  # Exactly page_size
# has_next will always be False (can't detect if more exist)

# ✅ GOOD: Mock page_size + 1 for has_next=True test
mock_rows = [MagicMock(...) for _ in range(21)]  # +1 sentinel
```

### ❌ Don't: Use COUNT query

```python
# ❌ WRONG: Service uses COUNT instead of sentinel
total = await db.execute(select(func.count())).scalar()
has_next = (offset + page_size) < total
# Two queries instead of one!
```

## Variations

### Popular Fallback + Sentinel

**Pattern**: If first query returns <page_size, fill with fallback + sentinel.

```python
# Service: Mutual follows + popular fallback
mutual_stmt = select(User).limit(page_size + 1)
mutual_data = (await db.execute(mutual_stmt)).all()

if len(mutual_data) < page_size:
    remaining = page_size - len(mutual_data)
    popular_stmt = select(User).limit(remaining + 1)  # +1 for fallback sentinel
    popular_data = (await db.execute(popular_stmt)).all()
    has_next_popular = len(popular_data) > remaining
    combined = list(mutual_data) + popular_data[:remaining]
    has_next = len(mutual_data) > page_size or has_next_popular
else:
    combined = mutual_data[:page_size]
    has_next = len(mutual_data) > page_size

# Test: Mock BOTH queries
mock_db.execute.side_effect = [
    make_result(mutual_rows),   # 10 mutual (< page_size)
    make_result(popular_rows),  # 11 popular (10 + 1 sentinel)
]
```

## When to Use

- ✅ Paginated endpoints with large datasets
- ✅ Performance-critical pagination (avoid COUNT)
- ✅ Infinite scroll UIs (only need has_next, not total)
- ❌ Small datasets (<100 items, COUNT is fine)
- ❌ UIs requiring total count (use COUNT + LIMIT)

## References

- **Session**: FollowService Gap 3
- **Commit**: f39a43aa
- **Coverage**: +33pp
