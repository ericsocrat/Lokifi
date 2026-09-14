# Session 168 - RAF Discovery & Test Infrastructure Challenge

**Date:** January 13, 2026
**Focus:** Implement RAF mock to enable DrawingLayer draw loop coverage
**Outcome:** Discovered critical RAF testing issue, reverted broken mock

## Critical Discovery: RAF Not Mocked in Tests

**Problem:** Session 167 added 11 rendering tests for DrawingLayer draw loop, all tests passed, but coverage stayed at 40.73% (0% improvement).

**Root Cause Analysis:**
1. DrawingLayer uses `requestAnimationFrame` for draw loop (L281)
2. RAF callbacks are **queued but never executed** in synchronous tests
3. Tests render component successfully but draw loop never runs
4. **Result:** All 16 tests pass ✓ but 0 code coverage gained ✗

**Proof:**
- Before RAF mock: DrawingLayer 40.73% (11 rendering tests added, 0 improvement)
- After RAF mock: DrawingLayer 75.74% (+35.01pp!)
- But RAF mock broke 35 other tests (global side effects)

## RAF Mock Implementation & Failure

**What Was Attempted:**
```typescript
// Global RAF mock that queues callbacks
global.requestAnimationFrame = vi.fn((callback: () => void) => {
  rafCallbacks.push(callback);
  return ++rafId;
});

// Helper to flush callbacks after render
export function flushRafCallbacks() {
  const callbacks = [...rafCallbacks];
  rafCallbacks = [];
  callbacks.forEach((cb) => cb());
}
```

**Why It Failed:**
- Global mock interfered with tests expecting normal RAF behavior
- PriceChart tests (34 failures) + others (1 failure) broke
- Total: 35 test failures introduced
- Issue: Tests rely on RAF being truly asynchronous, not queued

**Decision:** Reverted commit 433b238f to restore test suite stability

## Technical Insights

**Pattern Discovery: Async RAF Loops Require Test Infrastructure**

DrawingLayer architecture:
```typescript
// Component setup
const drawFrame = () => {
  if (!needsDraw.current) {
    rafId.current = requestAnimationFrame(drawFrame);  // Queue next frame
    return;
  }
  // Execute draw logic here
};

// Start RAF loop
needsDraw.current = true;
rafId.current = requestAnimationFrame(drawFrame);  // Initial queue
```

**Why Simple Render Tests Fail:**
1. Test renders component synchronously
2. RAF callback queued: `requestAnimationFrame(drawFrame)`
3. Component returns from render before RAF executes
4. Test ends before draw loop runs
5. Coverage = 0% (code never executed)

## Solution Options for Future Sessions

### Option 1: vi.useFakeTimers() (Recommended)
```typescript
beforeEach(() => {
  vi.useFakeTimers();
});

it('executes draw loop', () => {
  render(<DrawingLayer />);
  vi.runAllTimers(); // Execute all RAF callbacks
  expect(/*assertions*/).toBeTruthy();
});

afterEach(() => {
  vi.useRealTimers();
});
```

**Pros:** Standard Vitest pattern, used in official docs
**Cons:** Fake timers affect entire test, must verify no side effects

### Option 2: waitFor() Pattern
```typescript
it('executes draw loop', async () => {
  const { container } = render(<DrawingLayer />);
  await waitFor(() => {
    expect(container.querySelector('canvas')).toBeTruthy();
  });
});
```

**Pros:** Less intrusive than global RAF mock
**Cons:** Requires async/await, longer test duration

### Option 3: Test-Only RAF Utility
```typescript
// Custom hook specifically for RAF testing
export function useRafMock() {
  let callbacks: Array<() => void> = [];

  beforeEach(() => {
    // Mock RAF to queue callbacks
    global.requestAnimationFrame = vi.fn((cb) => {
      callbacks.push(cb);
    });
  });

  return {
    flushCallbacks: () => {
      callbacks.forEach(cb => cb());
      callbacks = [];
    }
  };
}
```

**Pros:** Isolated, explicit, reusable
**Cons:** More setup code

## Recommended Path Forward

**Session 169 Action Items:**
1. ✅ Keep DrawingLayer 11 rendering tests (Session 167)
2. Implement vi.useFakeTimers() in DrawingLayer.test.tsx setup
3. Call vi.runAllTimers() in "drawing kind rendering" tests
4. Re-measure DrawingLayer coverage (expect 75%+ again)
5. Verify PriceChart and other tests still pass
6. Document RAF testing pattern in architecture/patterns/

**Coverage Target:**
- DrawingLayer: 75.74% → 80%+ with hit detection tests
- Remaining uncovered (L314-376, L436-447): 22% gap

## Key Learnings

**Testing Async RAF Components:**
- Simple render + assertion insufficient for RAF-based code
- RAF callbacks execute after component returns
- Need explicit control: fake timers, waitFor, or custom flush
- Global RAF mocks have unintended side effects

**Architecture Impact:**
- RAF-heavy components (DrawingLayer, DrawingChart, etc.) need special test infrastructure
- Session 166 canvas polyfill fixed canvas context
- Session 167 added tests but didn't trigger them
- Session 168 discovered the trigger mechanism is missing

**Future Component Design:**
- Consider making RAF loop testable (e.g., optional callback injection)
- Or ensure RAF-based code also tested via integration/E2E
- Document RAF testing patterns in new component guidelines

## Commits

- 433b238f: feat(test-infra): RAF mock enables DrawingLayer draw loop coverage (REVERTED)
- 841a8562: Revert "feat(test-infra): RAF mock enables DrawingLayer draw loop coverage"
- 9c6d920c: test(DrawingLayer): add draw loop branch coverage for 11 drawing kinds (KEPT)

## Status

**Session 168 Complete** ✅
- Identified critical RAF testing gap
- Attempted global RAF mock (broke 35 tests)
- Reverted to stable state
- Documented clear path forward for Session 169
