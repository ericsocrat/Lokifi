# Window Interface Extension Pattern

> **Category**: 🟢 Beginner | **Success Rate**: 100% | **Impact**: 🎯 Type-safe browser globals

## Problem

When testing browser extensions or custom window properties, TypeScript doesn't recognize custom properties on `window`:

```typescript
// ❌ BAD - TypeScript error: Property doesn't exist on Window
window.performanceData = [];
window.__lokifi_toast = vi.fn();

// Common workaround loses type safety
(window as any).performanceData = [];  // ESLint warning
```

## Solution

Extend the Window interface with a `declare global` block:

```typescript
// ✅ GOOD - Type-safe window extension
declare global {
  interface Window {
    performanceData?: PerformanceEntry[];
    __lokifi_toast?: ReturnType<typeof vi.fn>;
  }
}

// Now TypeScript knows about these properties
window.performanceData = [];
window.__lokifi_toast?.('Success!');
```

## When to Use

- ✅ Testing browser extensions
- ✅ Mocking browser APIs (performance, toast notifications)
- ✅ Custom debug properties added during development
- ✅ Third-party library globals

## Implementation

### Test File Setup

```typescript
// At top of test file, before imports
declare global {
  interface Window {
    myCustomProperty?: string;
    __debug?: {
      enabled: boolean;
      log: (msg: string) => void;
    };
  }
}

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('Component with window extensions', () => {
  beforeEach(() => {
    window.myCustomProperty = 'test-value';
  });

  afterEach(() => {
    delete window.myCustomProperty;
  });

  it('should access custom property', () => {
    expect(window.myCustomProperty).toBe('test-value');
  });
});
```

### Playwright/E2E Tests

```typescript
// tests/performance/critical-pages.spec.ts
import { expect, test } from '@playwright/test';

declare global {
  interface Window {
    performanceData?: PerformanceEntry[];
  }
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.performanceData = [];
    const observer = new PerformanceObserver((list) => {
      window.performanceData?.push(...list.getEntries());
    });
    observer.observe({ entryTypes: ['navigation', 'paint'] });
  });
});
```

### Shared Type Definitions

For properties used across multiple files, create a shared type file:

```typescript
// tests/types/window.d.ts
declare global {
  interface Window {
    __lokifi_toast?: (message: string, type?: 'success' | 'error') => void;
    __lokifi_debug?: boolean;
  }
}

export {};  // Makes this a module
```

## Anti-Patterns

```typescript
// ❌ AVOID: Casting to any
(window as any).customProp = value;

// ❌ AVOID: Type assertion without declaration
(window as Window & { customProp: string }).customProp = value;

// ❌ AVOID: Ignoring TypeScript error
// @ts-ignore
window.customProp = value;
```

## Related Patterns

- [vi.mocked() Pattern](./vi-mocked-pattern.md) - Type-safe mock access
- [Test Fixture Design](./fixture-design.md) - Organizing test setup

## Success Metrics

| Metric | Value |
|--------|-------|
| Sessions Used | 117, 118, 119 |
| Files Fixed | 10+ |
| Implementation Time | ~2 minutes per file |
| Type Safety | Full autocomplete support |

## References

- [TypeScript Declaration Merging](https://www.typescriptlang.org/docs/handbook/declaration-merging.html)
- [Global Types in TypeScript](https://www.typescriptlang.org/docs/handbook/declaration-files/templates/global-modifying-module-d-ts.html)
- Session 119 commits (ShareBar, ProjectBar, critical-pages.spec.ts)
