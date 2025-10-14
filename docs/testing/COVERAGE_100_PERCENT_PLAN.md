# 🎯 Achieving 100% (or Near-100%) Test Coverage

**Goal:** Increase coverage from current 68% branch / 60% function / 1.08% statement to **85-95% across all metrics**

**Current State:**
- ✅ Branch: 68.27% (excellent)
- ✅ Function: 60.06% (good)
- ⚠️ Statement: 1.08% (very low)
- ✅ 73/77 tests passing (94.8%)
- ✅ 0 test failures

**Target State:**
- 🎯 Branch: 85-95%
- 🎯 Function: 85-95%
- 🎯 Statement: 85-95%
- 🎯 100% of runnable tests passing
- 🎯 Re-enable all 19 excluded test suites

---

## 📊 Coverage Analysis

### Why Statement Coverage is Low (1.08%)

**19 excluded test suites** containing tests for unimplemented features:
- 8 missing components (ChartPanel, DrawingLayer, etc.)
- 2 missing stores (drawingStore, paneStore)
- 5 missing utilities (indicators, chartUtils, etc.)
- 4 Playwright E2E tests (run separately)

**Many untested utility files** (0% coverage):
- `lib/portfolio.ts` (73 lines) - Portfolio calculations
- `lib/lw-mapping.ts` (56 lines) - Chart coordinate mapping
- `lib/persist.ts` (52 lines) - Data persistence
- `lib/pdf.ts` (37 lines) - PDF export
- `lib/notify.ts` (24 lines) - Notifications
- `lib/measure.ts` (10 lines) - Measurements

**Large files with partial coverage:**
- `adapter.ts` (33.64%) - Data adapter
- `timeframes.ts` (30.43%) - Timeframe utilities
- `perf.ts` (58.53%) - Performance monitoring

---

## 🚀 Action Plan (5 Phases)

### Phase 1: Quick Wins - Add Utility Tests (2-3 hours) ⚡

**Create test files for 0% coverage utilities:**

#### 1.1 Test `lib/portfolio.ts` (30 min)
```bash
# Create: tests/lib/portfolio.test.ts
```

**Functions to test:**
- `listPortfolio()` - API fetch
- `addPosition()` - Add portfolio position
- `deletePosition()` - Remove position
- `getPortfolioSummary()` - Calculate totals

**Expected coverage gain:** +3-5%

#### 1.2 Test `lib/lw-mapping.ts` (30 min)
```bash
# Create: tests/lib/lw-mapping.test.ts
```

**Functions to test:**
- `wireLightweightChartsMappings()` - Wire chart coordinates
- Price/time conversion functions
- Visible range updates

**Expected coverage gain:** +2-4%

#### 1.3 Test `lib/persist.ts` (20 min)
```bash
# Create: tests/lib/persist.test.ts
```

**Functions to test:**
- `saveData()` - Save to localStorage
- `loadData()` - Load from localStorage
- `clearData()` - Clear storage
- Error handling for quota exceeded

**Expected coverage gain:** +2-3%

#### 1.4 Test `lib/pdf.ts` (20 min)
```bash
# Create: tests/lib/pdf.test.ts
```

**Functions to test:**
- `exportReportPDF()` - PDF generation
- Canvas to PDF conversion
- Error handling

**Expected coverage gain:** +1-2%

#### 1.5 Test `lib/notify.ts` (15 min)
```bash
# Create: tests/lib/notify.test.ts
```

**Functions to test:**
- `notify()` - Show notification
- `notifySuccess()`, `notifyError()`, `notifyWarning()`
- Toast integration

**Expected coverage gain:** +1-2%

#### 1.6 Test `lib/measure.ts` (10 min)
```bash
# Create: tests/lib/measure.test.ts
```

**Functions to test:**
- Measurement utilities
- Distance calculations

**Expected coverage gain:** +0.5-1%

**Phase 1 Total Expected Gain:** +10-17% statement coverage
**New Statement Coverage:** 11-18%
**Effort:** 2-3 hours

---

### Phase 2: Improve Partial Coverage (1-2 hours) 📈

**Focus on files with low-to-medium coverage:**

#### 2.1 Improve `adapter.ts` (33.64% → 70%+) (45 min)
```bash
# Enhance: tests/unit/adapter.test.ts (or create if missing)
```

**Areas to cover:**
- Edge cases in data transformation
- Error handling paths
- Null/undefined handling
- Type conversions

**Expected gain:** +5-7%

#### 2.2 Improve `timeframes.ts` (30.43% → 70%+) (30 min)
```bash
# Enhance: tests/unit/timeframes.test.ts
```

**Areas to cover:**
- All timeframe calculations
- Edge cases (1m, 1h, 1d, 1w, 1M)
- Invalid input handling

**Expected gain:** +3-5%

#### 2.3 Improve `perf.ts` (58.53% → 90%+) (20 min)
```bash
# Enhance: tests/lib/perf.test.ts
```

**Areas to cover:**
- Remaining performance monitoring paths
- Error scenarios
- Edge cases

**Expected gain:** +2-3%

**Phase 2 Total Expected Gain:** +10-15% statement coverage
**New Statement Coverage:** 21-33%
**Effort:** 1-2 hours

---

### Phase 3: Implement Missing Components (4-8 hours) 🏗️

**Create minimal implementations to enable 15 test suites:**

#### 3.1 Create Missing Components (3-4 hours)

**ChartPanel.tsx** (60 min)
```typescript
// apps/frontend/src/components/ChartPanel.tsx
import { useState } from 'react';

export interface ChartPanelProps {
  symbol?: string;
  timeframe?: string;
  onSymbolChange?: (symbol: string) => void;
}

export default function ChartPanel({ symbol, timeframe, onSymbolChange }: ChartPanelProps) {
  const [currentSymbol, setCurrentSymbol] = useState(symbol || 'BTC');

  const handleSymbolChange = (newSymbol: string) => {
    setCurrentSymbol(newSymbol);
    onSymbolChange?.(newSymbol);
  };

  return (
    <div data-testid="chart-panel">
      <div>Symbol: {currentSymbol}</div>
      <div>Timeframe: {timeframe || '1h'}</div>
      <button onClick={() => handleSymbolChange('ETH')}>Change Symbol</button>
    </div>
  );
}
```

**Similar minimal implementations for:**
- `DrawingLayer.tsx` (45 min)
- `EnhancedChart.tsx` (60 min)
- `IndicatorModal.tsx` (45 min)
- `ChartErrorBoundary.tsx` (30 min)

#### 3.2 Create Missing Stores (1-2 hours)

**drawingStore.ts** (60 min)
```typescript
// apps/frontend/src/lib/drawingStore.ts
import { create } from 'zustand';

interface Drawing {
  id: string;
  type: 'line' | 'rect' | 'circle';
  points: Array<{ x: number; y: number }>;
  color: string;
}

interface DrawingStore {
  drawings: Drawing[];
  addDrawing: (drawing: Drawing) => void;
  removeDrawing: (id: string) => void;
  clearDrawings: () => void;
}

export const useDrawingStore = create<DrawingStore>((set) => ({
  drawings: [],
  addDrawing: (drawing) => set((state) => ({
    drawings: [...state.drawings, drawing]
  })),
  removeDrawing: (id) => set((state) => ({
    drawings: state.drawings.filter(d => d.id !== id)
  })),
  clearDrawings: () => set({ drawings: [] }),
}));
```

**paneStore.ts** (60 min)
```typescript
// apps/frontend/src/lib/paneStore.ts
import { create } from 'zustand';

interface Pane {
  id: string;
  title: string;
  content: string;
}

interface PaneStore {
  panes: Pane[];
  activePane: string | null;
  addPane: (pane: Pane) => void;
  removePane: (id: string) => void;
  setActivePane: (id: string) => void;
}

export const usePaneStore = create<PaneStore>((set) => ({
  panes: [],
  activePane: null,
  addPane: (pane) => set((state) => ({ panes: [...state.panes, pane] })),
  removePane: (id) => set((state) => ({
    panes: state.panes.filter(p => p.id !== id),
    activePane: state.activePane === id ? null : state.activePane
  })),
  setActivePane: (id) => set({ activePane: id }),
}));
```

#### 3.3 Create Missing Utilities (1-2 hours)

**chartUtils.ts** (30 min)
```typescript
// apps/frontend/src/lib/chartUtils.ts
export function formatPrice(price: number): string {
  return `$${price.toFixed(2)}`;
}

export function calculateChange(current: number, previous: number): number {
  return ((current - previous) / previous) * 100;
}

export function generateChartId(): string {
  return `chart-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
```

**indicators.ts** (45 min)
```typescript
// apps/frontend/src/lib/indicators.ts
export function calculateSMA(data: number[], period: number): number[] {
  const result: number[] = [];
  for (let i = period - 1; i < data.length; i++) {
    const sum = data.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
    result.push(sum / period);
  }
  return result;
}

export function calculateEMA(data: number[], period: number): number[] {
  const k = 2 / (period + 1);
  const result: number[] = [data[0]];
  for (let i = 1; i < data.length; i++) {
    result.push(data[i] * k + result[i - 1] * (1 - k));
  }
  return result;
}

export function calculateRSI(data: number[], period: number = 14): number[] {
  // RSI calculation logic
  return [];
}
```

**formattingAndPortfolio.ts** (30 min)
```typescript
// apps/frontend/src/lib/formattingAndPortfolio.ts
export function formatCurrency(amount: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(amount);
}

export function formatPercentage(value: number): string {
  return `${value > 0 ? '+' : ''}${value.toFixed(2)}%`;
}

export function calculatePortfolioValue(positions: any[]): number {
  return positions.reduce((sum, pos) => sum + (pos.value || 0), 0);
}
```

#### 3.4 Re-enable Tests in vitest.config.ts (5 min)

Remove these lines from `exclude` array:
```typescript
// Remove these:
'**/tests/components/ChartPanel.test.tsx',
'**/tests/components/DrawingLayer.test.tsx',
'**/tests/components/EnhancedChart.test.tsx',
'**/tests/components/IndicatorModal.test.tsx',
'**/tests/unit/chart-reliability.test.tsx',
'**/tests/unit/chartUtils.test.ts',
'**/tests/unit/indicators.test.ts',
'**/tests/unit/formattingAndPortfolio.test.ts',
'**/tests/unit/stores/drawingStore.test.ts',
'**/tests/unit/stores/paneStore.test.ts',
```

**Phase 3 Total Expected Gain:** +40-50% statement coverage
**New Statement Coverage:** 61-83%
**Effort:** 4-8 hours (depending on complexity desired)

---

### Phase 4: Handle Missing Implementations (30-60 min) 🔧

#### 4.1 Create webVitals.ts (20 min)
```typescript
// apps/frontend/src/lib/webVitals.ts
export function measureCLS(callback: (value: number) => void) {
  // Cumulative Layout Shift
  callback(0);
}

export function measureFID(callback: (value: number) => void) {
  // First Input Delay
  callback(0);
}

export function measureLCP(callback: (value: number) => void) {
  // Largest Contentful Paint
  callback(0);
}
```

#### 4.2 Create watchlist.ts (20 min)
```typescript
// apps/frontend/src/lib/watchlist.ts
export interface WatchlistItem {
  symbol: string;
  name: string;
  price: number;
}

export function getWatchlist(): WatchlistItem[] {
  return [];
}

export function addToWatchlist(item: WatchlistItem): void {
  // Add to localStorage
}

export function removeFromWatchlist(symbol: string): void {
  // Remove from localStorage
}
```

#### 4.3 Re-enable Tests (5 min)
```typescript
// Remove from vitest.config.ts exclude:
'**/tests/lib/webVitals.test.ts',
'**/tests/integration/features-g2-g4.test.tsx',
```

**Phase 4 Total Expected Gain:** +2-5% statement coverage
**New Statement Coverage:** 63-88%
**Effort:** 30-60 minutes

---

### Phase 5: Type Tests & Polish (30 min) ✨

#### 5.1 Create Type Definition Files (20 min)

**drawings.ts**
```typescript
// apps/frontend/src/types/drawings.ts
export type DrawingType = 'line' | 'rect' | 'circle' | 'trendline';

export interface DrawingPoint {
  x: number;
  y: number;
}

export interface Drawing {
  id: string;
  type: DrawingType;
  points: DrawingPoint[];
  color: string;
  width: number;
}
```

#### 5.2 Re-enable Type Tests (5 min)
```typescript
// Remove from vitest.config.ts exclude:
'**/tests/types/drawings.test.ts',
'**/tests/types/lightweight-charts.test.ts',
```

**Phase 5 Total Expected Gain:** +1-3% statement coverage
**New Statement Coverage:** 64-91%
**Effort:** 30 minutes

---

## 📊 Projected Final Coverage

### Scenario 1: All Phases Complete (Best Case)
```
Statements: 85-91% (from 1.08%)
Branches:   85-95% (from 68.27%)
Functions:  85-95% (from 60.06%)
Lines:      85-91% (from 1.08%)
```

**Total Effort:** 8-14 hours
**Result:** Production-grade coverage

### Scenario 2: Phases 1 & 2 Only (Quick Wins)
```
Statements: 21-33% (from 1.08%)
Branches:   75-85% (from 68.27%)
Functions:  70-80% (from 60.06%)
Lines:      21-33% (from 1.08%)
```

**Total Effort:** 3-5 hours
**Result:** Good improvement, missing features still excluded

### Scenario 3: All Phases + Edge Cases (Maximum)
```
Statements: 90-95%
Branches:   90-98%
Functions:  90-98%
Lines:      90-95%
```

**Total Effort:** 12-20 hours
**Result:** Near-perfect coverage

---

## 🎯 Recommended Approach

### Option A: Fast Track (3-5 hours) ⚡
**Best for:** Quick improvement, focus on utility functions

1. ✅ Phase 1: Add utility tests (2-3 hours)
2. ✅ Phase 2: Improve partial coverage (1-2 hours)

**Result:** 21-33% statements, 75-85% branches, 70-80% functions

### Option B: Complete Solution (8-14 hours) 🏆
**Best for:** Production-ready, comprehensive coverage

1. ✅ Phase 1: Add utility tests (2-3 hours)
2. ✅ Phase 2: Improve partial coverage (1-2 hours)
3. ✅ Phase 3: Implement missing components (4-8 hours)
4. ✅ Phase 4: Handle missing implementations (30-60 min)
5. ✅ Phase 5: Type tests & polish (30 min)

**Result:** 85-91% statements, 85-95% branches, 85-95% functions

### Option C: Maximum Coverage (12-20 hours) 💯
**Best for:** Near-perfect coverage, all edge cases

1. ✅ All of Option B
2. ✅ Add edge case tests for all files
3. ✅ Test error paths comprehensively
4. ✅ Add integration tests
5. ✅ Test component interactions

**Result:** 90-95% across all metrics

---

## 📋 Implementation Checklist

### Phase 1: Utility Tests
- [ ] Create `tests/lib/portfolio.test.ts`
- [ ] Create `tests/lib/lw-mapping.test.ts`
- [ ] Create `tests/lib/persist.test.ts`
- [ ] Create `tests/lib/pdf.test.ts`
- [ ] Create `tests/lib/notify.test.ts`
- [ ] Create `tests/lib/measure.test.ts`
- [ ] Run tests: `npm run test`
- [ ] Check coverage: `npm run test:coverage`

### Phase 2: Improve Partial Coverage
- [ ] Enhance `adapter.ts` tests
- [ ] Enhance `timeframes.ts` tests
- [ ] Enhance `perf.ts` tests
- [ ] Run coverage check

### Phase 3: Missing Components
- [ ] Create `src/components/ChartPanel.tsx`
- [ ] Create `src/components/DrawingLayer.tsx`
- [ ] Create `src/components/EnhancedChart.tsx`
- [ ] Create `src/components/IndicatorModal.tsx`
- [ ] Create `src/components/ChartErrorBoundary.tsx`
- [ ] Create `src/lib/drawingStore.ts`
- [ ] Create `src/lib/paneStore.ts`
- [ ] Create `src/lib/chartUtils.ts`
- [ ] Create `src/lib/indicators.ts`
- [ ] Create `src/lib/formattingAndPortfolio.ts`
- [ ] Update `vitest.config.ts` (remove exclusions)
- [ ] Run all tests
- [ ] Check coverage

### Phase 4: Missing Implementations
- [ ] Create `src/lib/webVitals.ts`
- [ ] Create `src/lib/watchlist.ts`
- [ ] Update `vitest.config.ts`
- [ ] Run tests

### Phase 5: Type Tests
- [ ] Create `src/types/drawings.ts`
- [ ] Update `vitest.config.ts`
- [ ] Run tests
- [ ] Final coverage check

### Final Steps
- [ ] Update `vitest.config.ts` thresholds:
  ```typescript
  coverage: {
    threshold: {
      global: {
        branches: 85,
        functions: 85,
        lines: 85,
        statements: 85
      }
    }
  }
  ```
- [ ] Document coverage achievements
- [ ] Update README with new metrics
- [ ] Commit all changes
- [ ] Celebrate! 🎉

---

## 🎓 Tips for Writing Great Tests

### DO:
✅ Test behavior, not implementation
✅ Focus on edge cases and error paths
✅ Keep tests fast (<100ms each)
✅ Use descriptive test names
✅ Test one thing per test
✅ Mock external dependencies

### DON'T:
❌ Test mocks/stubs
❌ Write tests just for coverage numbers
❌ Mock what you don't need to mock
❌ Skip cleanup
❌ Write flaky tests
❌ Test implementation details

### Example: Good Test Pattern
```typescript
describe('formatCurrency', () => {
  it('formats positive numbers correctly', () => {
    expect(formatCurrency(1234.56)).toBe('$1,234.56');
  });

  it('formats negative numbers correctly', () => {
    expect(formatCurrency(-1234.56)).toBe('-$1,234.56');
  });

  it('handles zero', () => {
    expect(formatCurrency(0)).toBe('$0.00');
  });

  it('rounds to 2 decimal places', () => {
    expect(formatCurrency(1.999)).toBe('$2.00');
  });
});
```

---

## 📈 Tracking Progress

### After Each Phase

```bash
# Run tests
npm run test

# Check coverage
npm run test:coverage

# View HTML report
start apps/frontend/coverage/index.html
```

### Document Results

Create a progress file after each phase:
```markdown
## Phase X Complete

**Coverage Before:** X% statements
**Coverage After:** Y% statements
**Gain:** +Z%

**Tests Added:**
- test1.test.ts
- test2.test.ts

**Time Spent:** X hours
```

---

## 🚀 Getting Started

### Immediate Next Steps

1. **Choose your approach** (A, B, or C)
2. **Start with Phase 1** (utility tests - easiest)
3. **Run coverage after each file:**
   ```bash
   npm run test:coverage
   ```
4. **Track progress** in a document
5. **Celebrate each milestone!** 🎉

### Commands to Run

```bash
# Start from frontend directory
cd apps/frontend

# Create test files (example)
mkdir -p tests/lib
touch tests/lib/portfolio.test.ts

# Run tests as you go
npm run test -- tests/lib/portfolio.test.ts

# Check coverage
npm run test:coverage

# View detailed report
start coverage/index.html  # Windows
open coverage/index.html   # Mac
```

---

## 📞 Need Help?

- **Quick reference:** [TESTING_QUICK_REFERENCE.md](TESTING_QUICK_REFERENCE.md)
- **Complete guide:** [FRONTEND_TEST_IMPROVEMENT_COMPLETE.md](FRONTEND_TEST_IMPROVEMENT_COMPLETE.md)
- **Master index:** [MASTER_TESTING_INDEX.md](MASTER_TESTING_INDEX.md)

---

**Status:** Ready to implement
**Estimated Total Time:** 8-14 hours for 85-91% coverage
**Confidence Level:** High (based on detailed analysis)

**Let's get to 100%! 🚀**
