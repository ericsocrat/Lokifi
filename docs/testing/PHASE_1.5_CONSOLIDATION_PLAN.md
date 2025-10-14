# 🧹 Phase 1.5: Test Consolidation & Cleanup Plan

**Date:** October 13, 2025
**Priority:** CRITICAL (Before Phase 2)
**Estimated Time:** 2-3 hours
**Status:** READY TO START

---

## 🎯 Executive Summary

Before proceeding with Phase 2-5, we need to:
1. ✅ **Fix 4 failing tests** in `multiChart.test.tsx`
2. 🧹 **Consolidate duplicate implementations** (2 lib folders!)
3. 📝 **Organize test structure** (prevent future duplication)
4. 🤖 **Enhance lokifi.ps1 bot** with test quality gates
5. 📊 **Establish clean baseline** for accurate progress tracking

**Why This Matters:**
- Found 2 separate `lib/` directories with overlapping files
- 4 failing tests indicate store implementation issues
- No test quality automation in bot
- Need clean slate before adding 100+ more tests

---

## 🚨 Critical Issues Found

### Issue 1: Duplicate Library Structures 🔴

**Discovery:**
```
apps/frontend/lib/              ← 35 files (feature stores)
apps/frontend/src/lib/          ← 52 files (utilities + stores)
```

**Overlapping Files:**
- `indicators.ts` - EXISTS IN BOTH
- `indicatorStore.ts` - EXISTS IN BOTH
- `social.ts` - EXISTS IN BOTH
- Plus potential others

**Impact:**
- Confusing for developers (which file to import?)
- Risk of divergent implementations
- Test coverage confusion
- Import path inconsistencies

**Root Cause:**
- `/lib/` likely created for new feature work
- `/src/lib/` is original structure
- No clear separation policy
- Migration incomplete

### Issue 2: 4 Failing Tests in multiChart 🔴

**Location:** `apps/frontend/tests/unit/multiChart.test.tsx`

**Failed Tests:**

1. **`should change layout and create appropriate number of charts`**
   ```typescript
   // Test expects: layout = '2x2', charts.length = 4
   // Actual: layout = '1x1', charts.length = 1
   // Root Cause: setLayout() not triggering state update
   ```

2. **`should enable symbol linking and sync symbols`**
   ```typescript
   // Test expects: linking.symbol = true
   // Actual: linking.symbol = false
   // Root Cause: updateLinking('symbol', true) not working
   ```

3. **`should enable timeframe linking and sync timeframes`**
   ```typescript
   // Test expects: linking.timeframe = true
   // Actual: linking.timeframe = false
   // Root Cause: updateLinking('timeframe', true) not working
   ```

4. **`should handle cursor linking with events`**
   ```typescript
   // Test expects: window.dispatchEvent called
   // Actual: dispatchEvent never called (0 calls)
   // Root Cause: updateCursorLinked() not dispatching events
   ```

**Store Location:** `apps/frontend/src/lib/multiChart.tsx` (NOT in `/lib/multiChart.tsx`!)

**Analysis:**
All failures are in the **same pattern**: Store actions not updating state. This indicates:
- Zustand persist middleware may be blocking updates
- Feature flag guards preventing execution
- Store implementation incomplete
- Test mocking incorrect

### Issue 3: No Test Quality Gates in Bot 🟡

**Current Bot Integration:**
```powershell
.\lokifi.ps1 test              # Runs tests
.\lokifi.ps1 test -TestCoverage  # Collects coverage
```

**Missing Features:**
- ❌ No automatic failure detection on commit
- ❌ No coverage regression detection
- ❌ No test quality metrics tracking
- ❌ No duplicate test detection
- ❌ No test naming convention enforcement

**Impact:**
- Failing tests can be committed
- Coverage can regress silently
- Duplicate tests accumulate
- Quality degrades over time

### Issue 4: Test Organization Gaps 🟡

**Current Structure Issues:**
```
tests/
├── lib/              ← Phase 1 tests (6 files)
├── unit/             ← 1 file (multiChart) but also has stores/
│   └── stores/       ← 2 excluded tests (drawingStore, paneStore)
├── components/       ← 1 active, 4 excluded
├── integration/      ← 0 active, 1 excluded
└── types/            ← 0 active, 2 excluded
```

**Problems:**
- `unit/stores/` tests are excluded because stores in `/lib/` not `/src/lib/`
- No clear policy: utility tests in `lib/` vs `unit/`
- Integration tests excluded due to missing components
- Type tests excluded (no type files)

---

## 🛠️ Consolidation Plan (Step-by-Step)

### Step 1: Investigate & Document Duplicate Libraries (30 min)

**Actions:**
1. Compare files in `/lib/` vs `/src/lib/`
2. Identify exact duplicates
3. Check import statements across codebase
4. Document intended separation

**Commands:**
```powershell
# Find all imports from /lib/
grep -r "from '../lib/" apps/frontend/src --include="*.ts" --include="*.tsx"
grep -r "from '@/lib/" apps/frontend/src --include="*.ts" --include="*.tsx"

# Find all imports from /src/lib/
grep -r "from '../lib/" apps/frontend/lib --include="*.ts" --include="*.tsx"
grep -r "from '@/lib/" apps/frontend/lib --include="*.ts" --include="*.tsx"

# Compare specific files
diff apps/frontend/lib/indicators.ts apps/frontend/src/lib/indicators.ts
diff apps/frontend/lib/indicatorStore.ts apps/frontend/src/lib/indicatorStore.ts
diff apps/frontend/lib/social.ts apps/frontend/src/lib/social.ts
```

**Deliverable:** `LIBRARY_STRUCTURE_ANALYSIS.md`

### Step 2: Fix multiChart Store (45 min)

**Approach A: Fix Store Implementation (RECOMMENDED)**

Read the store file and identify why actions don't update state:

```typescript
// apps/frontend/src/lib/multiChart.tsx
export const useMultiChartStore = create<MultiChartStore>()(
  persist(
    (set, get) => ({
      // Initial state
      layout: '1x1',
      charts: [{ ... }],
      linking: { symbol: false, timeframe: false, cursor: false },

      // Actions - CHECK THESE
      setLayout: (layout) => {
        if (!FLAGS.multiChart) return; // ← ISSUE: Feature flag guard
        set({ layout, charts: createChartsForLayout(layout) });
      },

      updateLinking: (type, enabled) => {
        if (!FLAGS.multiChart) return; // ← ISSUE: Feature flag guard
        set((state) => ({
          linking: { ...state.linking, [type]: enabled }
        }));
      },
    }),
    { name: 'multi-chart-storage' }
  )
);
```

**Likely Issues:**
1. **Feature flag guard** - `FLAGS.multiChart` may be false in tests
2. **Persist middleware** - May need to mock localStorage properly
3. **State updates** - Zustand set() may not be called

**Fix Strategy:**
```typescript
// In test file
beforeEach(() => {
  // Enable multi-chart feature for testing
  setDevFlag('multiChart', true); // ← Already doing this!

  // Reset zustand store completely
  useMultiChartStore.setState({
    layout: '1x1',
    charts: [{ /* default */ }],
    linking: { symbol: false, timeframe: false, cursor: false },
    activeChart: 0,
  });

  vi.clearAllMocks();
});
```

**Test Fix:**
- Add store reset in beforeEach
- Verify FLAGS.multiChart is true
- Check if set() is being called
- Debug with console.log if needed

**Approach B: Adjust Tests to Match Implementation**

If store is correct but tests are wrong:
- Update test expectations
- Document actual behavior
- File bug report for future fix

**Deliverable:**
- All 4 tests passing
- Root cause documented
- Fix committed

### Step 3: Consolidate Library Structure (45 min)

**Recommended Structure:**

```
apps/frontend/
├── src/
│   └── lib/                    ← ALL utilities, stores, helpers
│       ├── stores/             ← Zustand stores (new subfolder)
│       │   ├── multiChartStore.ts
│       │   ├── indicatorStore.ts
│       │   ├── drawingStore.ts
│       │   ├── paneStore.ts
│       │   └── ...
│       ├── utils/              ← Pure utilities
│       │   ├── measure.ts
│       │   ├── portfolio.ts
│       │   ├── persist.ts
│       │   └── ...
│       ├── api/                ← API clients
│       │   ├── apiFetch.ts
│       │   └── ...
│       └── charts/             ← Chart-specific
│           ├── lw-mapping.ts
│           └── ...
└── lib/                        ← DEPRECATED or MOVE TO SRC/LIB
    └── [to be migrated or removed]
```

**Migration Steps:**

1. **Create subdirectories:**
   ```powershell
   cd apps/frontend/src/lib
   mkdir stores utils api charts
   ```

2. **Move files to appropriate folders:**
   ```powershell
   # Move stores
   mv indicatorStore.ts stores/
   mv drawingStore.ts stores/
   mv paneStore.ts stores/

   # Move utilities
   mv measure.ts utils/
   mv portfolio.ts utils/
   mv persist.ts utils/
   ```

3. **Update imports across codebase:**
   ```powershell
   # Use VS Code find/replace
   # From: from '@/lib/indicatorStore'
   # To: from '@/lib/stores/indicatorStore'
   ```

4. **Handle `/lib/` duplicates:**
   - If identical: Delete from `/lib/`, keep in `/src/lib/`
   - If different: Merge changes, then delete from `/lib/`
   - If needed separately: Document reason clearly

5. **Update test imports:**
   ```typescript
   // Old
   import { useMultiChartStore } from '../../lib/multiChart';

   // New
   import { useMultiChartStore } from '@/lib/stores/multiChartStore';
   ```

**Deliverable:**
- Single source of truth for all utilities
- Clear folder structure
- Updated imports (no errors)
- Documentation of structure

### Step 4: Reorganize Test Structure (30 min)

**Proposed Test Organization:**

```
apps/frontend/tests/
├── unit/                       ← Pure unit tests
│   ├── stores/                 ← Store tests
│   │   ├── multiChartStore.test.ts  ← Rename from multiChart
│   │   ├── indicatorStore.test.ts
│   │   ├── drawingStore.test.ts
│   │   └── paneStore.test.ts
│   ├── utils/                  ← Utility tests (from lib/)
│   │   ├── measure.test.ts     ← Move from tests/lib/
│   │   ├── portfolio.test.ts   ← Move from tests/lib/
│   │   ├── persist.test.ts
│   │   ├── notify.test.ts
│   │   ├── pdf.test.ts
│   │   └── lw-mapping.test.ts
│   ├── api/                    ← API client tests
│   └── charts/                 ← Chart utility tests
├── components/                 ← Component tests
├── integration/                ← Integration tests
├── e2e/                        ← Playwright E2E
├── a11y/                       ← Accessibility (Playwright)
├── visual/                     ← Visual regression (Playwright)
├── security/                   ← Security tests
└── contracts/                  ← API contract tests
    └── api/                    ← Move from tests/api/contracts/
```

**Migration:**
```powershell
cd apps/frontend/tests

# Create new structure
mkdir -p unit/stores unit/utils unit/api unit/charts
mkdir contracts

# Move Phase 1 tests
mv lib/measure.test.ts unit/utils/
mv lib/portfolio.test.ts unit/utils/
mv lib/persist.test.ts unit/utils/
mv lib/notify.test.ts unit/utils/
mv lib/pdf.test.ts unit/utils/
mv lib/lw-mapping.test.ts unit/charts/

# Move multiChart
mv unit/multiChart.test.tsx unit/stores/multiChartStore.test.ts

# Move API contracts
mv api/contracts/* contracts/api/
rmdir api/contracts api

# Remove empty lib/
rmdir lib
```

**Update vitest.config.ts:**
```typescript
export default defineConfig({
  test: {
    exclude: [
      // E2E tests
      '**/tests/e2e/**',
      '**/tests/a11y/**',
      '**/tests/visual/**',
      '**/*.spec.ts',

      // Missing implementations (Phase 3)
      '**/tests/unit/stores/drawingStore.test.ts',
      '**/tests/unit/stores/paneStore.test.ts',
      // ... rest
    ],
  },
});
```

**Deliverable:**
- Clean test folder structure
- Tests in logical locations
- Updated vitest.config.ts
- All tests still passing

### Step 5: Enhance lokifi.ps1 Bot (30 min)

**Add Test Quality Features:**

```powershell
# In tools/lokifi.ps1, add new functions:

function Test-CodeQuality {
    param([switch]$FailOnError)

    Write-Info "🔍 Running test quality checks..."

    # 1. Check for failing tests
    $testResult = & npm run test:ci 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Error "❌ Tests failing! Fix before committing."
        if ($FailOnError) { exit 1 }
    }

    # 2. Check coverage regression
    $currentCoverage = Get-CoverageSummary
    $baseline = Get-BaselineCoverage

    if ($currentCoverage.statements -lt $baseline.statements) {
        Write-Warning "⚠️ Coverage decreased: $($baseline.statements)% → $($currentCoverage.statements)%"
        if ($FailOnError) { exit 1 }
    }

    # 3. Check for duplicate tests
    $duplicates = Find-DuplicateTests
    if ($duplicates.Count -gt 0) {
        Write-Warning "⚠️ Found $($duplicates.Count) potential duplicate tests"
        $duplicates | ForEach-Object { Write-Host "  - $_" }
    }

    # 4. Check test naming conventions
    $badNames = Find-NonConformingTestNames
    if ($badNames.Count -gt 0) {
        Write-Warning "⚠️ Tests not following naming convention:"
        $badNames | ForEach-Object { Write-Host "  - $_" }
    }

    Write-Success "✅ Quality checks passed"
}

function Get-CoverageSummary {
    $coverageFile = "apps/frontend/coverage/coverage-summary.json"
    if (Test-Path $coverageFile) {
        $coverage = Get-Content $coverageFile | ConvertFrom-Json
        return $coverage.total
    }
    return $null
}

function Find-DuplicateTests {
    # Find tests with same describe/it blocks
    $testFiles = Get-ChildItem -Path "apps/frontend/tests" -Recurse -Filter "*.test.*"
    $duplicates = @()

    # TODO: Implement duplicate detection logic

    return $duplicates
}

function Find-NonConformingTestNames {
    # Check if test files follow convention:
    # - Unit tests: *.test.ts/tsx in tests/unit/
    # - E2E tests: *.spec.ts in tests/e2e/
    # - Component tests: ComponentName.test.tsx

    $badNames = @()

    # TODO: Implement naming check

    return $badNames
}
```

**Add Pre-Commit Hook:**

```powershell
# In tools/hooks/pre-commit.ps1

#!/usr/bin/env pwsh

Write-Host "🔍 Running pre-commit checks..." -ForegroundColor Cyan

# Run test quality checks
& ./tools/lokifi.ps1 validate -TestGate

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Pre-commit checks failed!" -ForegroundColor Red
    Write-Host "Fix issues and try again." -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ Pre-commit checks passed" -ForegroundColor Green
exit 0
```

**Add New Bot Commands:**

```powershell
# Usage:
.\lokifi.ps1 test -TestGate              # Run with quality gate
.\lokifi.ps1 validate -TestPreCommit     # Pre-commit validation
.\lokifi.ps1 test -Component quality     # Run quality checks only
```

**Deliverable:**
- Enhanced lokifi.ps1 with quality features
- Pre-commit hook script
- Documentation of new commands
- Test to verify bot enhancements work

---

## 📊 Expected Outcomes

### After Phase 1.5 Completion:

**Test Health:**
- ✅ 0 failing tests (currently 4)
- ✅ Clean baseline for coverage tracking
- ✅ 183 tests passing
- ✅ Coverage: 1.46% statements, 75.11% branches, 63.31% functions

**Code Organization:**
- ✅ Single library structure (`src/lib/` with subdirectories)
- ✅ No duplicate implementations
- ✅ Clear import paths
- ✅ Organized test folders (unit/utils, unit/stores, etc.)

**Bot Capabilities:**
- ✅ Automatic failure detection
- ✅ Coverage regression prevention
- ✅ Duplicate test detection
- ✅ Pre-commit quality gates
- ✅ Test naming convention enforcement

**Documentation:**
- ✅ Library structure documented
- ✅ Test organization policy documented
- ✅ Bot features documented
- ✅ Clean baseline for Phase 2

---

## ⏱️ Time Estimate Breakdown

| Task | Estimated Time | Priority |
|------|---------------|----------|
| **1. Investigate Duplicate Libraries** | 30 min | 🔴 Critical |
| **2. Fix multiChart Tests** | 45 min | 🔴 Critical |
| **3. Consolidate Library Structure** | 45 min | 🟡 High |
| **4. Reorganize Test Structure** | 30 min | 🟡 High |
| **5. Enhance lokifi.ps1 Bot** | 30 min | 🟢 Medium |
| **Buffer for Issues** | 15 min | - |
| **TOTAL** | **2-3 hours** | - |

---

## 🚦 Decision Points

### Option A: Full Consolidation (RECOMMENDED)
- Do all 5 steps
- Clean slate before Phase 2
- Time: 2-3 hours
- **Benefits:** Clean, organized, automated quality
- **Risks:** Larger refactor, potential merge conflicts

### Option B: Minimal Fix
- Only fix 4 failing tests (Step 2)
- Skip consolidation
- Time: 45 minutes
- **Benefits:** Fast, minimal risk
- **Risks:** Technical debt accumulates, duplicate tests continue

### Option C: Incremental Approach
- Fix tests now (Step 2)
- Consolidate libraries later (Step 3)
- Add bot features incrementally (Step 5)
- Time: 45 min + 1 hour + 30 min = 2+ hours spread out
- **Benefits:** Smaller commits, lower risk per change
- **Risks:** Incomplete cleanup, coordination overhead

---

## 📝 Recommendation

**GO WITH OPTION A (Full Consolidation)**

**Reasoning:**
1. **One-time investment** - Better to fix now than deal with technical debt forever
2. **Clean baseline** - Makes Phase 2-5 easier and more accurate
3. **Prevents future problems** - Bot automation prevents regression
4. **Better developer experience** - Clear structure, no confusion
5. **Time is reasonable** - 2-3 hours is acceptable for the benefits

**Execution Order:**
1. Fix multiChart tests FIRST (45 min) ← Quick win, unblocks everything
2. Investigate duplicates (30 min) ← Understand before consolidating
3. Consolidate libraries (45 min) ← Biggest impact
4. Reorganize tests (30 min) ← Clean up test structure
5. Enhance bot (30 min) ← Prevent future issues

---

## 🎯 Success Criteria

Phase 1.5 is complete when:

- ✅ All 183 tests passing (0 failures)
- ✅ Single library structure with clear subdirectories
- ✅ No duplicate files between `/lib/` and `/src/lib/`
- ✅ Tests organized in logical folders
- ✅ lokifi.ps1 bot has quality gates
- ✅ Pre-commit hook working
- ✅ Documentation updated
- ✅ Coverage baseline verified: 1.46% / 75.11% / 63.31%

**Ready to Proceed to Phase 2:**
- Clean baseline established
- No technical debt
- Automated quality checks in place
- Clear structure for adding new tests

---

## 📚 Documentation Deliverables

1. **LIBRARY_STRUCTURE_ANALYSIS.md** - Analysis of duplicates
2. **LIBRARY_CONSOLIDATION_SUMMARY.md** - What was moved where
3. **TEST_ORGANIZATION_POLICY.md** - Where to put new tests
4. **BOT_ENHANCEMENTS.md** - New lokifi.ps1 features
5. **PHASE_1.5_COMPLETE.md** - Completion summary

---

## 🤔 Your Decision

What would you like to do?

**A) Full Consolidation (2-3 hours)**
- Fix all issues, clean slate, automated quality
- **RECOMMENDED**

**B) Minimal Fix (45 min)**
- Just fix 4 failing tests, proceed to Phase 2
- Faster but accumulates technical debt

**C) Incremental (2+ hours spread out)**
- Fix tests now, consolidate later
- Lower risk per change but takes longer overall

**D) Custom Plan**
- Pick specific steps
- Tell me what you want to prioritize

Let me know and I'll start immediately! 🚀
