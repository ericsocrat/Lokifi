# Task 5: Frontend Coverage Expansion Plan

**Goal:** Increase frontend test coverage from **2.02% → 60%+**

**Current Status:** 2.02% overall coverage

## 📊 Current Coverage Analysis

### Critical Gaps (0% Coverage):

1. **App Pages** (0% coverage, ~40 files)
   - Dashboard pages (dashboard/, dashboard/assets/, dashboard/add-assets/)
   - Portfolio pages (portfolio/, portfolio/assets/)
   - Market pages (markets/*, markets/crypto/, markets/stocks/)
   - Profile pages (profile/, profile/settings/, profile/edit/)
   - Alert page, chat page, notification pages

2. **Core Components** (0-7% coverage, ~80 files)
   - Chart components (ChartPanel, EnhancedChart, DrawingChart, etc.)
   - Dashboard components (ProfileDropdown, PreferencesContext, ToastProvider)
   - Market components (MarketStats, QuickStats, ExportButton)
   - Portfolio components (AddAssetModal)

3. **Hooks** (0% coverage, ~10 files)
   - useAuth, useMarketData, useNotifications, useUnifiedAssets, useBackendPrices, useKeyboardShortcuts

4. **Stores** (1% coverage, ~25 store files)
   - alertsStore, backtesterStore, configurationSyncStore, drawingStore, marketDataStore, etc.

5. **API Utilities** (0-36% coverage)
   - auth.ts, chat.ts, collab.ts, price-feed.ts, apiFetch.ts

6. **Utils** (27% coverage, room for improvement)
   - alerts.ts, drawings.ts, hotkeys.ts, labels.ts, migrations.ts, etc.

### Already Well-Tested Areas:

✅ **Unit Utils** (100% coverage):
- persist.ts, portfolio.ts, webVitals.ts, measure.ts, notify.ts, pdf.ts, perf.ts

✅ **Chart Utilities** (56-100% coverage):
- lw-mapping.ts (100%), chartUtils.ts (100%), indicators.ts (72%)

✅ **Security Tests** (passing):
- input-validation, auth-security, xss, csrf, validation tests

✅ **API Contract Tests** (passing):
- auth, ohlc, websocket contract tests

## 🎯 Priority Testing Strategy

### Phase 1: Critical Business Logic (Target: +20% coverage)
**Estimated Time:** 4-5 hours

**Priority 1A: Core Hooks** (~8% coverage gain)
1. `src/hooks/useAuth.tsx` - Authentication state management
2. `src/hooks/useMarketData.ts` - Market data fetching
3. `src/hooks/useUnifiedAssets.ts` - Asset unification
4. `src/hooks/useNotifications.ts` - Notification system

**Priority 1B: API Utilities** (~6% coverage gain)
1. `src/lib/api/auth.ts` - Auth API client
2. `src/lib/api/chat.ts` - Chat API client
3. `src/lib/api/apiClient.ts` - Base API client
4. `src/lib/api/apiFetch.ts` - Fetch wrapper

**Priority 1C: Data Layer** (~6% coverage gain)
1. `src/lib/data/portfolioStorage.ts` - Portfolio persistence
2. `src/lib/data/dashboardData.ts` - Dashboard data
3. `src/lib/data/adapter.ts` - Data transformation

### Phase 2: Core Components (Target: +20% coverage)
**Estimated Time:** 5-6 hours

**Priority 2A: Dashboard Components** (~10% coverage gain)
1. `src/components/dashboard/ProfileDropdown.tsx`
2. `src/components/dashboard/ToastProvider.tsx`
3. `src/components/dashboard/PreferencesContext.tsx`
4. `src/components/dashboard/useCurrencyFormatter.tsx`

**Priority 2B: Essential UI Components** (~10% coverage gain)
1. `src/components/AuthProvider.tsx` - Auth context
2. `src/components/ProtectedRoute.tsx` - Route protection
3. `src/components/Navbar.tsx` - Navigation
4. `src/components/PriceChart.tsx` - Already at 46%, complete remaining

### Phase 3: Critical Stores (Target: +10% coverage)
**Estimated Time:** 4-5 hours

**Priority 3: State Management**
1. `src/lib/stores/drawingStore.tsx` - Drawing state
2. `src/lib/stores/indicatorStore.tsx` - Indicator state
3. `src/lib/stores/marketDataStore.tsx` - Market data state
4. `src/lib/stores/symbolStore.tsx` - Symbol state
5. `src/lib/stores/timeframeStore.tsx` - Timeframe state

### Phase 4: Utility Functions (Target: +10% coverage)
**Estimated Time:** 3-4 hours

**Priority 4: Utils Completion**
1. `src/lib/utils/alerts.ts` - Alert utilities
2. `src/lib/utils/featureFlags.ts` - Already at 89%, complete remaining
3. `src/lib/utils/hotkeys.ts` - Already at 48%, complete remaining
4. `src/lib/utils/lod.ts` - Already at 8%, improve significantly
5. `src/lib/utils/timeframes.ts` - Already at 30%, complete remaining

## 📝 Implementation Plan

### Batch 1: Hooks Testing (4-5 hours) → +8% coverage

**Files to create:**
```
tests/hooks/useAuth.test.tsx
tests/hooks/useMarketData.test.ts
tests/hooks/useUnifiedAssets.test.ts
tests/hooks/useNotifications.test.ts
```

**Testing approach:**
- Mock API calls with MSW
- Test loading states
- Test error handling
- Test data transformation
- Test cache invalidation

### Batch 2: API Utilities Testing (3-4 hours) → +6% coverage

**Files to create:**
```
tests/api/auth.test.ts
tests/api/chat.test.ts
tests/api/apiClient.test.ts
tests/api/apiFetch.test.ts
```

**Testing approach:**
- Mock fetch with MSW
- Test request/response handling
- Test error scenarios
- Test authentication headers
- Test retry logic

### Batch 3: Data Layer Testing (3-4 hours) → +6% coverage

**Files to create:**
```
tests/data/portfolioStorage.test.ts
tests/data/dashboardData.test.ts
tests/data/adapter.test.ts
```

**Testing approach:**
- Mock localStorage
- Test data persistence
- Test data retrieval
- Test data transformation
- Test error recovery

### Batch 4: Core Components Testing (5-6 hours) → +20% coverage

**Files to create:**
```
tests/components/AuthProvider.test.tsx
tests/components/ProtectedRoute.test.tsx
tests/components/Navbar.test.tsx
tests/components/dashboard/ProfileDropdown.test.tsx
tests/components/dashboard/ToastProvider.test.tsx
```

**Testing approach:**
- Use @testing-library/react
- Test rendering
- Test user interactions
- Test conditional rendering
- Test accessibility

### Batch 5: Stores Testing (4-5 hours) → +10% coverage

**Files to create:**
```
tests/stores/drawingStore.test.tsx
tests/stores/indicatorStore.test.tsx
tests/stores/marketDataStore.test.tsx
tests/stores/symbolStore.test.tsx
tests/stores/timeframeStore.test.tsx
```

**Testing approach:**
- Test Zustand store actions
- Test state updates
- Test selectors
- Test persistence
- Test side effects

### Batch 6: Utils Completion (3-4 hours) → +10% coverage

**Files to create/enhance:**
```
tests/utils/alerts.test.ts
tests/utils/featureFlags.test.ts (enhance existing)
tests/utils/hotkeys.test.ts (enhance existing)
tests/utils/lod.test.ts (enhance existing)
tests/utils/timeframes.test.ts (enhance existing)
```

## 🎯 Coverage Targets by Phase

| Phase | Focus Area | Files | Est. Time | Coverage Gain | Cumulative |
|-------|-----------|-------|-----------|---------------|------------|
| **Start** | - | - | - | - | **2.02%** |
| **1** | Hooks | 4 | 4-5h | +8% | **10%** |
| **2** | API Utils | 4 | 3-4h | +6% | **16%** |
| **3** | Data Layer | 3 | 3-4h | +6% | **22%** |
| **4** | Components | 5+ | 5-6h | +20% | **42%** |
| **5** | Stores | 5 | 4-5h | +10% | **52%** |
| **6** | Utils | 5 | 3-4h | +10% | **62%** |
| **Goal** | - | **26+ files** | **22-28h** | **+60%** | **✅ 62%+** |

## 🛠️ Testing Tools & Patterns

### Tools Already Available:
- ✅ Vitest (unit test framework)
- ✅ @testing-library/react (component testing)
- ✅ MSW (Mock Service Worker - API mocking)
- ✅ jest-axe (accessibility testing)
- ✅ @testing-library/user-event (user interaction simulation)

### Standard Test Template:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { server } from '@/tests/mocks/server'
import { http, HttpResponse } from 'msw'

describe('ComponentName', () => {
  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks()
  })

  it('renders correctly', () => {
    render(<ComponentName />)
    expect(screen.getByText('Expected Text')).toBeInTheDocument()
  })

  it('handles loading state', () => {
    render(<ComponentName />)
    expect(screen.getByText(/loading/i)).toBeInTheDocument()
  })

  it('handles error state', async () => {
    server.use(
      http.get('/api/endpoint', () => {
        return HttpResponse.error()
      })
    )
    render(<ComponentName />)
    await waitFor(() => {
      expect(screen.getByText(/error/i)).toBeInTheDocument()
    })
  })

  it('handles user interaction', async () => {
    const user = userEvent.setup()
    render(<ComponentName />)
    const button = screen.getByRole('button', { name: /submit/i })
    await user.click(button)
    expect(screen.getByText(/success/i)).toBeInTheDocument()
  })
})
```

## 📈 Success Criteria

✅ **Primary Goal:** Frontend test coverage ≥ 60%
✅ **All new tests pass**
✅ **No breaking changes to existing functionality**
✅ **Tests follow best practices (AAA pattern, clear assertions)**
✅ **Edge cases covered (loading, error, empty states)**
✅ **Accessibility preserved in tested components**

## 🚀 Execution Order

1. ✅ Create branch: `feature/frontend-coverage-expansion` (DONE)
2. ✅ Run initial coverage report (DONE - 2.02%)
3. ✅ Document plan (THIS FILE)
4. 🔄 Implement Batch 1: Hooks (NEXT)
5. ⏳ Implement Batch 2: API Utils
6. ⏳ Implement Batch 3: Data Layer
7. ⏳ Implement Batch 4: Components
8. ⏳ Implement Batch 5: Stores
9. ⏳ Implement Batch 6: Utils
10. ⏳ Final coverage verification
11. ⏳ Create PR and merge

## 📊 Progress Tracking

- [x] Plan created
- [ ] Batch 1: Hooks (0/4 files)
- [ ] Batch 2: API Utils (0/4 files)
- [ ] Batch 3: Data Layer (0/3 files)
- [ ] Batch 4: Components (0/5+ files)
- [ ] Batch 5: Stores (0/5 files)
- [ ] Batch 6: Utils (0/5 files)
- [ ] Coverage ≥ 60% achieved
- [ ] PR created
- [ ] CI passing
- [ ] Merged to main

---

**Ready to begin implementation!**
