# 🚀 Phase 1.5 Quick Start Guide

**Ready to Execute?** Follow this step-by-step guide!

---

## ⚡ Prerequisites (5 minutes)

```powershell
# 1. Install global tools
npm install -g madge depcheck typedoc

# 2. Install new dependencies
cd apps/frontend
npm install --save-dev @faker-js/faker jscodeshift eslint-plugin-security eslint-plugin-sonarjs chart.js express chokidar

# 3. Verify lokifi.ps1 bot works
cd ../..
.\tools\lokifi.ps1 help
```

---

## 📋 Execution Checklist

### Phase 1.5.1: Core Fixes (1.5h) ✓

**Step 1: Analyze Dependencies (15 min)**
```powershell
# Generate dependency graph
cd apps/frontend
madge --circular --extensions ts,tsx src/
madge --image dependency-graph.svg src/

# Find unused dependencies
npx depcheck

# Analyze duplicates
git diff --no-index lib/ src/lib/ | more
```

**Documents to Create:**
- [ ] `docs/testing/LIBRARY_DUPLICATE_ANALYSIS.md`

---

**Step 2: Fix multiChart Tests (45 min)**

```powershell
# Run tests to see failures
npm run test tests/unit/multiChart.test.tsx

# Debug the store
# Open: apps/frontend/src/lib/multiChart.tsx
# Check: Feature flags, zustand persist, state updates

# Fix tests
# Open: apps/frontend/tests/unit/multiChart.test.tsx
# Add proper beforeEach reset
```

**Files to Edit:**
- [ ] `apps/frontend/tests/unit/multiChart.test.tsx` - Fix tests
- [ ] `apps/frontend/src/lib/multiChart.tsx` - Add DevTools if needed

**Verify:** All tests passing
```powershell
npm run test
# Should show: 187 passed, 0 failed
```

---

**Step 3: Create Store Utilities (15 min)**

```powershell
# Create test utilities directory
mkdir apps/frontend/tests/utils
```

**Files to Create:**
- [ ] `apps/frontend/tests/utils/storeTestHelpers.ts`
- [ ] `apps/frontend/tests/utils/perfMonitor.ts`

---

### Phase 1.5.2: Library Consolidation (1h) ✓

**Step 4: Create New Structure (15 min)**

```powershell
cd apps/frontend/src/lib

# Create subdirectories
mkdir stores utils api charts hooks types constants

# Create index.ts files
New-Item stores/index.ts
New-Item utils/index.ts
New-Item api/index.ts
New-Item charts/index.ts
```

**Directories to Create:**
- [ ] `src/lib/stores/`
- [ ] `src/lib/utils/`
- [ ] `src/lib/api/`
- [ ] `src/lib/charts/`
- [ ] `src/lib/hooks/`
- [ ] `src/lib/types/`
- [ ] `src/lib/constants/`

---

**Step 5: Move Files (15 min)**

```powershell
# Move store files
mv indicatorStore.ts stores/
mv drawingStore.ts stores/
mv paneStore.ts stores/

# Move utilities
mv measure.ts utils/
mv portfolio.ts utils/
mv persist.ts utils/
mv notify.ts utils/

# Move chart utilities
mv lw-mapping.ts charts/
mv pdf.ts charts/
```

**Document Changes:**
- [ ] Update `docs/testing/LIBRARY_CONSOLIDATION_SUMMARY.md`

---

**Step 6: Create Barrel Exports (15 min)**

Edit each `index.ts`:

```typescript
// src/lib/stores/index.ts
export { useMultiChartStore } from './multiChartStore';
export { useIndicatorStore } from './indicatorStore';
// ... add all stores

// src/lib/utils/index.ts
export * from './measure';
export * from './portfolio';
// ... add all utils
```

**Files to Edit:**
- [ ] `src/lib/stores/index.ts`
- [ ] `src/lib/utils/index.ts`
- [ ] `src/lib/api/index.ts`
- [ ] `src/lib/charts/index.ts`

---

**Step 7: Update Imports (15 min)**

Option A - Manual (VS Code):
```
Find: from '@/lib/measure'
Replace: from '@/lib/utils/measure'

Find: from '../lib/indicatorStore'
Replace: from '@/lib/stores/indicatorStore'
```

Option B - Automated (if codemod script ready):
```powershell
npx jscodeshift -t tools/scripts/update-imports.js src/
```

**Verify:** No TypeScript errors
```powershell
npm run type-check
```

---

### Phase 1.5.3: Test Organization (1h) ✓

**Step 8: Reorganize Test Folders (15 min)**

```powershell
cd apps/frontend/tests

# Create new structure
mkdir -p unit/stores unit/utils unit/api unit/charts
mkdir -p fixtures/mocks fixtures/data
mkdir templates

# Move tests
mv lib/measure.test.ts unit/utils/
mv lib/portfolio.test.ts unit/utils/
mv lib/persist.test.ts unit/utils/
mv lib/notify.test.ts unit/utils/
mv lib/pdf.test.ts unit/charts/
mv lib/lw-mapping.test.ts unit/charts/

# Rename multiChart test
mv unit/multiChart.test.tsx unit/stores/multiChartStore.test.ts

# Remove empty lib folder
rmdir lib
```

---

**Step 9: Create Fixtures (20 min)**

**Files to Create:**
- [ ] `tests/fixtures/data/chartData.ts`
- [ ] `tests/fixtures/factories/chartFactory.ts`
- [ ] `tests/fixtures/mocks/handlers.ts`

---

**Step 10: Create Test Utilities (15 min)**

Already created in Step 3, now add more:
- [ ] `tests/utils/renderHookWithProviders.ts`
- [ ] `tests/utils/mockLocalStorage.ts`

---

**Step 11: Create Templates (10 min)**

**Files to Create:**
- [ ] `tests/templates/store.test.template.ts`
- [ ] `tests/templates/component.test.template.tsx`
- [ ] `tests/templates/utility.test.template.ts`

---

### Phase 1.5.4: Bot Enhancement (1.5h) ✓

**Step 12: Add Quality Gates (15 min)**

Edit `tools/lokifi.ps1`, add:
- [ ] `Test-CodeQuality` function
- [ ] `Get-CoverageSummary` function
- [ ] `Find-DuplicateTests` function

---

**Step 13: Add AI Features (30 min)**

Add to `tools/lokifi.ps1`:
- [ ] `Invoke-AITestSuggestions` function
- [ ] `Invoke-SmartTestSelection` function

---

**Step 14: Add Auto-Fix (20 min)**

Add to `tools/lokifi.ps1`:
- [ ] `Invoke-AutoFix` function
- [ ] `Test-CodeComplexity` function
- [ ] `Find-TestSmells` function

---

**Step 15: Add Reporting (15 min)**

Add to `tools/lokifi.ps1`:
- [ ] `New-TestReport` function

**Files to Create:**
- [ ] `tools/scripts/generate-html-report.ps1`

---

### Phase 1.5.5: Visualization (30 min) ✓

**Step 16: Create Dashboard (15 min)**

**Files to Create:**
- [ ] `apps/frontend/coverage-dashboard.html`

---

**Step 17: Set Up Server (15 min)**

**Files to Create:**
- [ ] `tools/scripts/coverage-server.js`

**Test:**
```powershell
node tools/scripts/coverage-server.js
# Open: http://localhost:3001/coverage-dashboard.html
```

---

### Phase 1.5.6: Security (30 min) ✓

**Step 18: Add Security Scripts (15 min)**

Add to `tools/lokifi.ps1`:
- [ ] `Invoke-SecurityScan` function

---

**Step 19: Configure ESLint (15 min)**

**Files to Edit:**
- [ ] `.eslintrc.js` - Add security plugins

---

### Phase 1.5.7: Documentation (30 min) ✓

**Step 20: Set Up TypeDoc (15 min)**

```powershell
npx typedoc --out docs/api apps/frontend/src/lib
```

**Files to Create:**
- [ ] `typedoc.json` - Configuration

---

**Step 21: Generate Diagrams (15 min)**

```powershell
npx arkit -o docs/architecture.svg
```

---

### Phase 1.5.8: CI/CD (included in bot)

**Step 22: Create GitHub Actions**

**Files to Create:**
- [ ] `.github/workflows/test-quality.yml`

---

## ✅ Final Verification

Run complete test suite:
```powershell
# 1. All tests pass
npm run test
# Expected: 187 passed, 0 failed

# 2. Coverage verified
npm run test:coverage
# Expected: 1.46% statements, 75.11% branches, 63.31% functions

# 3. Bot commands work
.\tools\lokifi.ps1 quality
.\tools\lokifi.ps1 test -TestSmart
.\tools\lokifi.ps1 analyze -Component dependencies

# 4. Dashboard accessible
node tools/scripts/coverage-server.js
# Visit: http://localhost:3001/coverage-dashboard.html

# 5. Security scan passes
.\tools\lokifi.ps1 quality -Component security

# 6. Documentation generated
# Check: docs/api/index.html exists
```

---

## 📊 Progress Tracking

Use this to track your progress:

```
Phase 1.5.1: Core Fixes                    [___] 0/4 steps
Phase 1.5.2: Library Consolidation         [___] 0/4 steps
Phase 1.5.3: Test Organization             [___] 0/4 steps
Phase 1.5.4: Bot Enhancement               [___] 0/4 steps
Phase 1.5.5: Visualization                 [___] 0/2 steps
Phase 1.5.6: Security                      [___] 0/2 steps
Phase 1.5.7: Documentation                 [___] 0/2 steps
Phase 1.5.8: CI/CD                         [___] 0/1 steps

Total: 0/23 steps complete (0%)
```

---

## 🎯 Success Criteria

**Phase 1.5 is COMPLETE when:**

✅ **Core:**
- [ ] All 187 tests passing
- [ ] 0 duplicate library files
- [ ] Clean test organization
- [ ] Coverage baseline verified

✅ **Enhanced:**
- [ ] AI test suggestions working (`.\lokifi.ps1 test -TestAI`)
- [ ] Smart test selection working (`.\lokifi.ps1 test -TestSmart`)
- [ ] Dashboard accessible (http://localhost:3001)
- [ ] Security scans passing (`.\lokifi.ps1 quality -Component security`)
- [ ] Docs generated (`docs/api/index.html` exists)
- [ ] CI/CD pipeline created (`.github/workflows/test-quality.yml`)
- [ ] Pre-commit hooks working
- [ ] Store DevTools integrated
- [ ] Test fixtures library ready

---

## 🚑 Troubleshooting

**Tests still failing after fixes?**
```powershell
# Clear cache
npm run test -- --clearCache

# Reset stores
# Check beforeEach hooks are running
```

**Import errors after reorganization?**
```powershell
# Clear TypeScript cache
rm -rf apps/frontend/.next
rm -rf apps/frontend/node_modules/.cache

# Restart TypeScript server in VS Code
# Cmd+Shift+P → "TypeScript: Restart TS Server"
```

**Coverage dashboard not loading?**
```powershell
# Generate coverage first
npm run test:coverage

# Check file exists
ls apps/frontend/coverage/coverage-summary.json
```

---

## 📞 Need Help?

Check these documents:
- `PHASE_1.5_ENHANCED_PLAN.md` - Full detailed plan
- `COMPREHENSIVE_TEST_AUDIT.md` - Initial audit findings
- `PHASE_1.5_CONSOLIDATION_PLAN.md` - Original consolidation plan

---

## 🎉 Ready?

Let's start with Phase 1.5.1 Step 1! 🚀

**First Command:**
```powershell
cd apps/frontend
madge --circular --extensions ts,tsx src/
```
