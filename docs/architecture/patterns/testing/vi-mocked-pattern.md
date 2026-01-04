# vi.mocked() Pattern for Type-Safe Mock Access

> **Category**: 🟢 Beginner | **Success Rate**: 100% | **Impact**: 🎯 200+ fixes in Sessions 117-119

## Problem

When accessing mock methods in Vitest, TypeScript doesn't know the mock is a `vi.fn()`. Direct casting to `any` loses type safety:

```typescript
// ❌ BAD - Type information lost, no autocomplete
(useChartStore as any).mockReturnValue({ data: [] });
(createChart as any).mockImplementation(() => mockChart);

// ESLint warning: @typescript-eslint/no-explicit-any
```

## Solution

Use Vitest's built-in `vi.mocked()` helper which preserves types:

```typescript
// ✅ GOOD - Type-safe with autocomplete
vi.mocked(useChartStore).mockReturnValue({ data: [] });
vi.mocked(createChart).mockImplementation(() => mockChart);

// No ESLint warnings, full TypeScript support
```

## When to Use

- ✅ Accessing `.mockReturnValue()`, `.mockImplementation()`, `.mockResolvedValue()`
- ✅ Accessing `.mock.calls`, `.mock.results`
- ✅ Any mocked function from `vi.mock()` or `vi.fn()`

## Implementation

### Basic Usage

```typescript
import { vi } from 'vitest';
import { useStore } from '@/lib/stores/store';

// Mock the module
vi.mock('@/lib/stores/store');

// Access mock methods with type safety
vi.mocked(useStore).mockReturnValue({
  data: [],
  isLoading: false,
  error: null,
});

// Access mock call history
const calls = vi.mocked(useStore).mock.calls;
expect(calls[0][0]).toBe(expectedSelector);
```

### With Module Namespace

```typescript
import * as chartModule from 'lightweight-charts';

vi.mock('lightweight-charts');

vi.mocked(chartModule.createChart).mockImplementation(() => ({
  addSeries: vi.fn(),
  remove: vi.fn(),
}));
```

### Deep Mocking

```typescript
// vi.mocked with deep option for nested mocks
vi.mocked(complexModule, true).nested.method.mockReturnValue(value);
```

## Anti-Patterns

```typescript
// ❌ AVOID: Direct any casting
(mockFunction as any).mockReturnValue(value);

// ❌ AVOID: ReturnType with vi.fn
const mock = mockFunction as ReturnType<typeof vi.fn>;

// ❌ AVOID: Double casting through unknown
(mockFunction as unknown as Mock).mockReturnValue(value);
```

## Related Patterns

- [AsyncMock Pattern](./asyncmock-pattern.md) - For async function mocking in Python
- [Test Fixture Design](./fixture-design.md) - Organizing mock setup
- [Pydantic Model Mocking](./pydantic-model-mocking.md) - Type-safe model mocks

## Success Metrics

| Metric | Value |
|--------|-------|
| Sessions Used | 117, 118, 119 |
| Warnings Fixed | 200+ |
| Implementation Time | ~30 seconds per fix |
| False Positives | 0 |

## References

- [Vitest Mock Functions](https://vitest.dev/api/mock.html#vi-mocked)
- [ESLint no-explicit-any](https://typescript-eslint.io/rules/no-explicit-any/)
- Session 117-119 commits (ESLint any elimination campaign)
