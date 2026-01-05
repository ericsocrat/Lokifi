# Vitest Timeout Migration Pattern

**Status**: ✅ Production Ready
**Category**: Testing
**Difficulty**: Easy
**Success Rate**: 100%
**Sessions**: 120

## Problem

Vitest 4.0 deprecates using a number as the third argument for test timeouts. CI logs show deprecation warnings:

```
Passing the timeout as the third argument is deprecated.
```

**Impact**: Tests work now but will break in Vitest 4.0.

## Context

This pattern applies when:
- Tests have long-running async operations (network, timers, I/O)
- You see deprecation warnings in CI logs about third argument
- Preparing codebase for Vitest 4.0 upgrade

## Solution

Migrate from deprecated 3rd argument syntax to new object syntax:

### Old Syntax (Deprecated)

```typescript
// ❌ Deprecated in Vitest 4.0
it('test name', async () => {
  // test logic
}, 10000);

it.skip('skipped test', async () => {
  // test logic  
}, 30000);
```

### New Syntax (Correct)

```typescript
// ✅ Vitest 4.0+ compatible
it(
  'test name',
  { timeout: 10000 },
  async () => {
    // test logic
  }
);

it.skip(
  'skipped test',
  { timeout: 30000 },
  async () => {
    // test logic
  }
);
```

## Detection Pattern

Use grep to find deprecated usages:

```powershell
# Find all deprecated timeout patterns
grep -rn "}, \d+);" apps/frontend/tests/ --include="*.test.ts"
```

Or in PowerShell:
```powershell
Select-String -Path "apps/frontend/tests/**/*.test.ts" -Pattern "\}, \d+\);" -Recurse
```

**Note**: Filter out false positives like `setTimeout()` calls inside tests.

## Implementation Steps

1. **Find occurrences**: Search for `}, [number]);` at end of test blocks
2. **Identify test type**: Regular `it()` vs `it.skip()` vs `describe()`
3. **Restructure**: Move function body inside parentheses, add options object
4. **Preserve comments**: Keep timeout explanation comments nearby
5. **Test**: Run affected tests to verify no syntax errors

## Examples

### Real Example from Session 120

**Before** (environmentManagementStore.test.ts):
```typescript
it('should start environment', async () => {
  const { startEnvironment } = useEnvironmentManagementStore.getState();
  await startEnvironment(environmentId);
  const environment = useEnvironmentManagementStore
    .getState()
    .environments.find((e) => e.id === environmentId);
  expect(environment?.status).toBe('active');
}, 10000);
```

**After**:
```typescript
it('should start environment', { timeout: 10000 }, async () => {
  const { startEnvironment } = useEnvironmentManagementStore.getState();
  await startEnvironment(environmentId);
  const environment = useEnvironmentManagementStore
    .getState()
    .environments.find((e) => e.id === environmentId);
  expect(environment?.status).toBe('active');
});
```

### Test with Retry Option

The object syntax also supports retry:

```typescript
it(
  'flaky network test',
  { timeout: 10000, retry: 2 },
  async () => {
    // test logic
  }
);
```

## Anti-Patterns

### ❌ Don't Convert Internal setTimeout

```typescript
// These are NOT test timeouts - leave them alone
it('test', async () => {
  await new Promise(resolve => setTimeout(resolve, 1000));
  // ...
});
```

### ❌ Don't Mix Styles

```typescript
// ❌ BAD - Mixed old and new in same file
it('test1', { timeout: 10000 }, async () => {...});
it('test2', async () => {...}, 5000);  // Inconsistent!
```

### ❌ Don't Forget Skipped Tests

```typescript
// ⚠️ Also update it.skip, it.todo, etc.
it.skip('skipped test', { timeout: 30000 }, async () => {...});
```

## Validation

After migration:

1. **Run affected tests**: `npm test -- --run <file>`
2. **Check for warnings**: Look for deprecation warnings
3. **TypeScript check**: `npm run typecheck`
4. **Full suite**: Run full test suite before commit

## Files Migrated (Session 120)

| File | Occurrences |
|------|-------------|
| environmentManagementStore.test.ts | 4 |
| configurationSyncStore.test.ts | 3 |
| auth-security.test.ts | 2 |
| input-validation.test.ts | 2 |
| websocket.contract.test.ts | 8 |
| **Total** | **19** |

## References

- [Vitest Test API Documentation](https://vitest.dev/api/#test)
- [Vitest TestOptions Interface](https://vitest.dev/api/#testoptions)
- Session 120: Migration commit 12c60a9c

## Related Patterns

- [Flaky Timeout Pattern](./flaky-timeout-pattern.md) - Calculate appropriate timeouts
- [Testing Patterns README](./README.md) - All testing patterns

---

**Documented**: Session 120
**Author**: GitHub Copilot
**Last Updated**: January 2026
