# Phase 1.5 TODOs - Use with TODO Tree Extension

> **IMPORTANT:** This file contains structured TODOs for VS Code's TODO Tree extension.
> Mark items with `[x]` or change `TODO:` to `DONE:` as you complete them.

---

## 📋 Prerequisites

- TODO: Install madge: `npm install -g madge`
- TODO: Install depcheck: `npm install -g depcheck`
- TODO: Install typedoc: `npm install -g typedoc`
- TODO: Verify lokifi.ps1 works: `.\tools\lokifi.ps1 help`

---

## ✅ Phase 1.5.1: Core Fixes (1.5h) - COMPLETE!

### Step 1: Analyze Dependencies (15 min) ✅

- DONE: Run dependency analysis: `cd apps/frontend && madge --circular --extensions ts,tsx src/`
- DONE: Generate dependency graph: `madge --image dependency-graph.svg src/` (Graphviz not needed)
- DONE: Check unused dependencies: `npx depcheck`
- DONE: Compare lib folders: Found 2 duplicate filenames (indicators.ts, indicatorStore.ts)
- DONE: Create LIBRARY_DUPLICATE_ANALYSIS.md with findings

### Step 2: Fix multiChart Tests (45 min) ✅

- DONE: Run failing tests: `npm run test tests/unit/multiChart.test.tsx`
- DONE: Debug multiChartStore - Fixed setDevFlag to allow 'test' environment
- DONE: Fix test file - added proper beforeEach store reset and afterEach cleanup
- DONE: Verify all 187 tests passing (0 failed) ✅

### Step 3: Add Store Utilities (15 min) ✅

- DONE: Create tests/utils/storeTestHelpers.ts with mock store creators (261 lines)
- DONE: Create tests/utils/perfMonitor.ts for performance testing (370 lines)
- DONE: Add Redux DevTools to multiChartStore (devtools middleware)
- NOTE: Other stores can be updated later (pattern documented)

**CHECKPOINT:** Run `npm run test` - ✅ Shows 187 passed, 0 failed!

**Summary:** See PHASE_1.5.1_COMPLETE.md for full report

---

## 🏗️ Phase 1.5.2: Library Consolidation (1h)

### Step 4: Create Structure (15 min)

- TODO: Create src/lib/stores/ directory
- TODO: Create src/lib/utils/ directory
- TODO: Create src/lib/api/ directory
- TODO: Create src/lib/charts/ directory
- TODO: Create src/lib/hooks/ directory
- TODO: Create src/lib/types/ directory
- TODO: Create src/lib/constants/ directory

### Step 5: Move Files (15 min)

- TODO: Move multiChartStore, indicatorStore, drawingStore, paneStore to stores/
- TODO: Move measure, portfolio, persist, notify to utils/
- TODO: Move apiFetch to api/
- TODO: Move lw-mapping, pdf to charts/
- TODO: Delete duplicate files from /lib/ (keep only /src/lib/)

### Step 6: Barrel Exports (15 min)

- TODO: Create src/lib/stores/index.ts with all store exports
- TODO: Create src/lib/utils/index.ts with all utility exports
- TODO: Create src/lib/api/index.ts with API client exports
- TODO: Create src/lib/charts/index.ts with chart utility exports

### Step 7: Update Imports (15 min)

- TODO: Find/replace imports in VS Code OR create codemod script
- TODO: Update all imports to use new paths (e.g., '@/lib/stores' instead of '@/lib/multiChart')
- TODO: Run `npm run type-check` to verify no TypeScript errors
- TODO: Add path aliases to tsconfig.json if needed

**CHECKPOINT:** TypeScript compiles with 0 errors

---

## ✅ Phase 1.5.3: Test Organization (55 min) - COMPLETE!

### Step 8: Reorganize Tests (15 min) ✅

- DONE: Create tests/unit/stores/ directory
- DONE: Create tests/unit/utils/ directory
- DONE: Create tests/unit/api/ directory
- DONE: Create tests/unit/charts/ directory
- DONE: Move tests from tests/lib/ to appropriate unit/ subdirectories
- DONE: Rename multiChart.test.tsx → tests/unit/stores/multiChartStore.test.tsx
- DONE: Delete empty tests/lib/ folder
- DONE: Update vitest.config.ts test patterns if needed

### Step 9: Create Fixtures (20 min) ✅

- DONE: Create tests/fixtures/data/chartData.ts with sample chart data
- DONE: Create tests/fixtures/data/userData.ts with user/auth data
- DONE: Create tests/fixtures/data/marketData.ts with market data
- DONE: Create tests/fixtures/data/portfolioData.ts with portfolio data
- DONE: Create tests/fixtures/factories/candleFactory.ts with data generators
- DONE: Create tests/fixtures/mocks/storageMocks.ts for localStorage/sessionStorage
- DONE: Create tests/fixtures/index.ts with barrel exports

### Step 10: Test Utilities (15 min) ✅

- DONE: Existing tests/utils/storeTestHelpers.ts for hook testing (already present)
- DONE: Storage mocks created in fixtures/mocks/storageMocks.ts
- DONE: Fixed import paths in moved tests

### Step 11: Test Templates (10 min) ✅

- DONE: Create tests/templates/store.test.template.ts
- DONE: Create tests/templates/component.test.template.tsx
- DONE: Create tests/templates/utility.test.template.ts
- DONE: Add README.md in templates/ explaining usage

**CHECKPOINT:** ✅ All 224 tests passing after reorganization! (+37 tests unlocked)

---

## 🤖 Phase 1.5.4: Bot Enhancement (1.5h)

### Step 12: Quality Gates (15 min)

- TODO: Add Test-CodeQuality function to lokifi.ps1
- TODO: Add Get-CoverageSummary function to lokifi.ps1
- TODO: Add Find-DuplicateTests function to lokifi.ps1
- TODO: Test quality command: `.\tools\lokifi.ps1 quality`

### Step 13: AI Features (30 min)

- TODO: Add Invoke-AITestSuggestions function to lokifi.ps1
- TODO: Add Invoke-SmartTestSelection function to lokifi.ps1
- TODO: Integrate with OpenAI API or local LLM for test suggestions
- TODO: Test AI features: `.\tools\lokifi.ps1 test -TestAI`

### Step 14: Auto-Fix (20 min)

- TODO: Add Invoke-AutoFix function to lokifi.ps1 (fix imports, formatting, etc.)
- TODO: Add Test-CodeComplexity function to lokifi.ps1
- TODO: Add Find-TestSmells function to lokifi.ps1
- TODO: Test auto-fix: `.\tools\lokifi.ps1 quality -AutoFix`

### Step 15: Reporting (15 min)

- TODO: Add New-TestReport function to lokifi.ps1
- TODO: Create tools/scripts/generate-html-report.ps1
- TODO: Test report generation: `.\tools\lokifi.ps1 report -Format html`

**CHECKPOINT:** All new bot commands working

---

## 📊 Phase 1.5.5: Visualization (30min)

### Step 16: Dashboard HTML (15 min)

- TODO: Create apps/frontend/coverage-dashboard.html
- TODO: Add Chart.js CDN and initialize coverage charts
- TODO: Add metrics display for statements/branches/functions
- TODO: Add coverage trend visualization

### Step 17: Dashboard Server (15 min)

- TODO: Create tools/scripts/coverage-server.js with Express
- TODO: Add file watching with chokidar for live reload
- TODO: Start server: `node tools/scripts/coverage-server.js`
- TODO: Visit http://localhost:3001/coverage-dashboard.html to verify

**CHECKPOINT:** Dashboard loads and displays data

---

## 🛡️ Phase 1.5.6: Security (30min)

### Step 18: Security Scripts (15 min)

- TODO: Add Invoke-SecurityScan function to lokifi.ps1
- TODO: Add npm audit integration
- TODO: Add secret detection (check for leaked API keys/passwords)
- TODO: Test security scan: `.\tools\lokifi.ps1 quality -Component security`

### Step 19: ESLint Security (15 min)

- TODO: Install eslint-plugin-security: `npm install --save-dev eslint-plugin-security`
- TODO: Install eslint-plugin-sonarjs: `npm install --save-dev eslint-plugin-sonarjs`
- TODO: Update .eslintrc.js to include security plugins
- TODO: Run linting: `npm run lint`

**CHECKPOINT:** Security scans pass

---

## 📝 Phase 1.5.7: Documentation (30min)

### Step 20: TypeDoc Setup (15 min)

- TODO: Create typedoc.json configuration file
- TODO: Generate API docs: `npx typedoc --out docs/api apps/frontend/src/lib`
- TODO: Verify docs/api/index.html exists and opens correctly

### Step 21: Architecture Diagrams (15 min)

- TODO: Install arkit: `npm install -g arkit`
- TODO: Generate architecture diagram: `npx arkit -o docs/architecture.svg`
- TODO: Create docs/README.md with links to all documentation
- TODO: Update main README.md with badges (coverage, tests passing, etc.)

**CHECKPOINT:** Documentation generated

---

## ⚙️ Phase 1.5.8: CI/CD (15min)

### Step 22: GitHub Actions (15 min)

- TODO: Create .github/workflows/test-quality.yml
- TODO: Add test job (run vitest with coverage)
- TODO: Add quality job (run ESLint, TypeScript, security scans)
- TODO: Add coverage upload to Codecov or similar
- TODO: Add PR comment with test results
- TODO: Push to GitHub and verify workflow runs

**CHECKPOINT:** CI/CD pipeline working

---

## 🎯 Final Verification

- TODO: Run all tests: `npm run test` (expect 187 passed, 0 failed)
- TODO: Run coverage: `npm run test:coverage` (expect 1.46% / 75.11% / 63.31%)
- TODO: Verify bot quality command: `.\tools\lokifi.ps1 quality`
- TODO: Verify bot AI features: `.\tools\lokifi.ps1 test -TestAI`
- TODO: Verify dashboard: Visit http://localhost:3001
- TODO: Verify security: `.\tools\lokifi.ps1 quality -Component security`
- TODO: Verify docs generated: Check docs/api/index.html
- TODO: Verify CI/CD: Check GitHub Actions tab

---

## ✅ Completion Criteria

Phase 1.5 is COMPLETE when:

- [ ] All 187 tests passing (0 failed)
- [ ] 0 duplicate library files (lib/ removed, only src/lib/ remains)
- [ ] Tests organized in logical folders (unit/stores/, unit/utils/, etc.)
- [ ] Coverage baseline verified: 1.46% / 75.11% / 63.31%
- [ ] AI test suggestions working: `.\tools\lokifi.ps1 test -TestAI`
- [ ] Smart test selection working: `.\tools\lokifi.ps1 test -TestSmart`
- [ ] Dashboard accessible: http://localhost:3001
- [ ] Security scans passing
- [ ] API docs generated: docs/api/
- [ ] CI/CD pipeline working: GitHub Actions
- [ ] Redux DevTools integrated with all stores
- [ ] Test fixtures library available

**ROI:** 4-6 hour investment → 8.5 hours saved per week → 442 hours saved annually

---

## 🚀 Start Here

```powershell
# First command to run:
npm install -g madge depcheck typedoc
cd apps/frontend
madge --circular --extensions ts,tsx src/
```

Then work through the TODOs above! Use TODO Tree extension to track progress.
