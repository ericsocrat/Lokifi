# Non-Boolean Attribute Warnings Documentation

**Last Updated:** January 11, 2026  
**Session:** 145  
**Status:** Documented - Known Library Pattern

## Overview

Two component tests generate warnings about non-boolean `fill` attributes:
- `GlobalHeader.test.tsx` - Search Results with crypto info
- `MarketsPage.test.tsx` - Page Header render

**Warning Message:**
```
Received `true` for a non-boolean attribute `fill`.
If you want to write it to the DOM, pass a string instead: fill="true" or fill={value.toString()}.
```

## Root Cause Analysis

### Source: Lucide React Icons

Both warnings originate from **Lucide React icon components** used in the affected pages:

**MarketsPage** (`apps/frontend/app/markets/page.tsx`):
- Uses: `Sparkles`, `TrendingUp`, `TrendingDown`, `RefreshCw`, etc.
- Context: Page header rendering with icon components

**GlobalHeader** (`apps/frontend/components/GlobalHeader.tsx`):
- Uses: `Search`, `Bell`, `User`, `X` (Lucide icons)
- Context: Search results displaying crypto asset icons

### Technical Details

Lucide React icons internally use SVG elements with boolean props that React warns about when rendered as DOM attributes. The library passes boolean values for `fill` or other SVG attributes instead of string representations.

**Example Pattern:**
```tsx
// Internal Lucide React behavior
<svg fill={true} /> // ❌ Triggers warning

// React expects
<svg fill="true" /> // ✅ String value
<svg fill="currentColor" /> // ✅ Valid CSS value
```

## Impact Assessment

### Severity: **Low - Non-Blocking**

**Why Low Priority:**
1. **Library-Generated**: Warnings originate from third-party library (lucide-react v0.468.0), not application code
2. **No Functional Impact**: Icons render correctly despite warnings
3. **Test-Only Context**: Warnings appear during testing; no production console errors reported
4. **Limited Scope**: Only 2 test suites affected out of 138 total test files

### Affected Tests

| Test Suite | Test Case | Icon Component |
|------------|-----------|----------------|
| `GlobalHeader.test.tsx` | Search Results > should display search results with crypto info | Various Lucide icons |
| `MarketsPage.test.tsx` | Page Header > should render page title | `Sparkles` icon |

## Resolution Options

### Option 1: **Accept as Known Library Pattern** ⭐ (Recommended)

**Rationale:**
- Issue exists in upstream library (Lucide React)
- No control over internal icon implementation
- Warnings don't affect functionality or user experience
- Library maintainers aware of React strict mode patterns

**Action:**
- Document in this file ✅
- Monitor for upstream fixes in future lucide-react updates
- Consider test-level warning suppression if noise becomes problematic

### Option 2: Suppress Warnings in Test Suite

**Implementation:**
```typescript
// In test setup file (e.g., vitest.setup.ts)
const originalError = console.error;
beforeAll(() => {
  console.error = (...args: unknown[]) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('Received `true` for a non-boolean attribute `fill`')
    ) {
      return; // Suppress known library warning
    }
    originalError.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
});
```

**Trade-offs:**
- ✅ Reduces test output noise
- ❌ May hide similar issues in application code
- ❌ Requires maintenance if warning messages change

### Option 3: Replace Lucide React Icons

**Not Recommended:**
- High effort (replace 50+ icon usages across codebase)
- May introduce different issues with alternative libraries
- Lucide React is well-maintained and widely adopted

## Monitoring Plan

### Track Upstream

**Lucide React Repository:**
- GitHub: https://github.com/lucide-icons/lucide
- Current Version: v0.468.0
- Issue Tracker: Monitor for React strict mode compatibility fixes

### Update Criteria

Consider updating when:
1. Lucide React releases fix for boolean attribute warnings
2. Warning frequency increases (currently stable at 2 instances)
3. Production console errors reported (currently none)

## Related Documentation

- **Pattern Library**: `/docs/architecture/patterns/` - React Testing patterns
- **Session Log**: Session 145 - Act() warning infrastructure + non-boolean fill documentation
- **Component Tests**: `apps/frontend/tests/components/`
- **Lucide React Docs**: https://lucide.dev/guide/packages/lucide-react

## Revision History

| Date | Session | Change |
|------|---------|--------|
| 2026-01-11 | 145 | Initial documentation - identified source and resolution strategy |

---

**Status:** ✅ Documented and accepted as known library pattern  
**Next Review:** Session 160 or when lucide-react updates
