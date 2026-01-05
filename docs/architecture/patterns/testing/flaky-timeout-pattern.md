# Flaky Test Timeout Pattern

**Category**: Testing  
**Difficulty**: Easy  
**Success Rate**: 100%  
**Impact**: High (prevents CI flakiness)

## Problem

Tests with random delays (simulating real-world async operations) can exceed their timeout limits, causing intermittent CI failures.

## Context

When store implementations use random delays to simulate realistic async operations:
```typescript
// Store implementation with random delays
await new Promise((resolve) => setTimeout(resolve, 3000 + Math.random() * 5000));
```

Tests may fail intermittently when the random delays combine to exceed the configured timeout.

## Solution

1. **Calculate worst-case timing**: Add up maximum delays for all async operations
2. **Set timeout with buffer**: Use 110-120% of worst-case timing
3. **Document timing breakdown**: Add comments explaining the calculation

### Before (Flaky)

```typescript
it('should restart environment', async () => {
  await startEnvironment(environmentId);  // 3-8s
  await restartEnvironment(environmentId); // stop (2-5s) + pause (1s) + start (3-8s)
  expect(environment?.status).toBe('active');
}, 20000); // ❌ Worst case: 8+5+1+8 = 22s (exceeds 20s!)
```

### After (Stable)

```typescript
it('should restart environment', async () => {
  await startEnvironment(environmentId);

  // Note: restartEnvironment = stop (2-5s) + pause (1s) + start (3-8s)
  // Plus initial start (3-8s), worst case = 8+5+1+8 = 22s
  await restartEnvironment(environmentId);

  expect(environment?.status).toBe('active');
}, 25000); // ✅ 25s provides buffer for worst-case 22s
```

## Timing Analysis Template

For tests involving async operations with random delays:

```
Operation 1: MIN_MS + Math.random() * RANGE_MS = X-Y seconds
Operation 2: MIN_MS + Math.random() * RANGE_MS = X-Y seconds
...
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Worst case total: Sum of all maximum values
Recommended timeout: Worst case × 1.15 (15% buffer)
```

## Common Patterns to Watch

| Pattern | Typical Delay | Worst Case |
|---------|---------------|------------|
| `startEnvironment` | 3000 + random * 5000 | 8 seconds |
| `stopEnvironment` | 2000 + random * 3000 | 5 seconds |
| Health checks | 1000 + random * 2000 | 3 seconds |
| API simulations | 500 + random * 1000 | 1.5 seconds |

## Anti-Patterns

❌ **Don't**: Set arbitrary round-number timeouts without calculation
```typescript
}, 10000); // "10 seconds should be enough"
```

❌ **Don't**: Use very long timeouts as a blanket fix
```typescript
}, 120000); // "2 minutes will definitely work"
```

❌ **Don't**: Remove the random delays (they exist to simulate real conditions)
```typescript
// Don't remove delays just to make tests faster
await new Promise((resolve) => setTimeout(resolve, 0));
```

## Success Metrics

- **CI flakiness reduction**: Eliminates timeout-based false failures
- **Test reliability**: 100% pass rate for properly timed tests
- **Debugging time saved**: Clear timeout comments prevent investigation cycles

## References

- Session 120: Fixed `environmentManagementStore.test.ts` flaky timeout
- Issue #128: CI failure caused by insufficient timeout
- Commit: `653788bc` - Increased timeout from 20s to 25s

## Related Patterns

- [AsyncMock Pattern](asyncmock-pattern.md) - Async testing fundamentals
- [Fixture Design](fixture-design.md) - Test setup best practices
