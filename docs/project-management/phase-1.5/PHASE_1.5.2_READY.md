# Phase 1.5.2 READY TO START - Frontend Library Consolidation

**Estimated Time:** 1 hour
**Current Status:** Phase 1.5.1 Complete ✅
**All Prerequisites:** Met ✅
**Tests Passing:** 187/187 ✅

---

## 🎯 Quick Summary

**What We're Doing:**
- Consolidating duplicate `lib/` and `src/lib/` folders into single organized structure
- Moving 35 files from `lib/` → `src/lib/` with proper subdirectories
- Resolving 2 duplicate files (indicators.ts, indicatorStore.ts)
- Creating barrel exports for clean imports
- Updating all import paths across codebase

**Why:**
- Current structure has confusing dual lib/ folders
- TypeScript path alias `@/lib/*` points to both locations
- Stores and utilities mixed together without organization
- 2 files duplicated with different implementations

**Result:**
- Single source of truth: `src/lib/` only
- Organized subdirectories: stores/, utils/, api/, charts/
- Zero duplicate files
- Cleaner imports with barrel exports
- All 187 tests still passing

---

## 📋 Pre-Flight Checklist

### ✅ Prerequisites (All Met!)
- [x] Phase 1.5.1 complete (187/187 tests passing)
- [x] Git repository clean (all changes committed)
- [x] Node modules installed
- [x] TypeScript compiler working
- [x] VS Code open in apps/frontend/ directory

### ✅ Documentation Available
- [x] FULL_CODEBASE_ANALYSIS.md - Complete analysis
- [x] PHASE_1.5_REVISED_PLAN.md - Detailed execution plan
- [x] LIBRARY_DUPLICATE_ANALYSIS.md - Duplicate file analysis
- [x] PHASE_1.5.1_COMPLETE.md - Previous phase results

---

## 🚀 Step-by-Step Execution (60 minutes)

### STEP 1: Resolve Duplicates (10 min)

**Goal:** Decide which version of duplicate files to keep

#### indicators.ts Comparison

```powershell
# Compare the two implementations
code --diff lib/indicators.ts src/lib/indicators.ts
```

**Decision Criteria:**
- ✅ Which has better TypeScript types?
- ✅ Which has better documentation?
- ✅ Which is more feature-complete?
- ✅ Which is actively used by components?

**Action:**
```powershell
# After comparing, delete the worse version
# Recommendation: Keep src/lib/indicators.ts (per analysis)
Remove-Item lib/indicators.ts -Force
```

#### indicatorStore.ts Comparison

```powershell
# Compare the two implementations
code --diff lib/indicatorStore.ts src/lib/indicatorStore.ts
```

**Action:**
```powershell
# Keep better version, delete worse one
# Winner will be moved to src/lib/stores/indicatorStore.ts in Step 3
Remove-Item [worse-version-path] -Force
```

**Checkpoint:** ✅ Only 1 version of each file remains

---

### STEP 2: Create Directory Structure (5 min)

```powershell
cd c:\Users\USER\Desktop\lokifi\apps\frontend

# Create organized subdirectories
New-Item -ItemType Directory -Path "src/lib/stores" -Force
New-Item -ItemType Directory -Path "src/lib/charts" -Force
New-Item -ItemType Directory -Path "src/lib/api" -Force
New-Item -ItemType Directory -Path "src/lib/hooks" -Force
New-Item -ItemType Directory -Path "src/lib/types" -Force
New-Item -ItemType Directory -Path "src/lib/constants" -Force

# Verify structure
Get-ChildItem src/lib -Directory
```

**Expected Output:**
```
Mode                 LastWriteTime         Length Name
----                 -------------         ------ ----
d----          10/14/2025   [time]                api
d----          10/14/2025   [time]                charts
d----          10/14/2025   [time]                constants
d----          10/14/2025   [time]                hooks
d----          10/14/2025   [time]                stores
d----          10/14/2025   [time]                types
d----          [existing]   [time]                utils
```

**Checkpoint:** ✅ All subdirectories created

---

### STEP 3: Move Store Files (15 min)

**Goal:** Move ~20 store files from lib/ to src/lib/stores/ with consistent naming

```powershell
cd c:\Users\USER\Desktop\lokifi\apps\frontend

# Move and rename stores (multiChart.tsx → multiChartStore.ts)
Move-Item lib/multiChart.tsx src/lib/stores/multiChartStore.ts
Move-Item lib/indicatorStore.ts src/lib/stores/indicatorStore.ts
Move-Item lib/drawingStore.ts src/lib/stores/drawingStore.ts
Move-Item lib/paneStore.ts src/lib/stores/paneStore.ts
Move-Item lib/symbolStore.ts src/lib/stores/symbolStore.ts
Move-Item lib/timeframeStore.ts src/lib/stores/timeframeStore.ts
Move-Item lib/marketDataStore.ts src/lib/stores/marketDataStore.ts

# Rename .tsx stores to .ts format
Move-Item lib/alertsV2.tsx src/lib/stores/alertsStore.ts
Move-Item lib/watchlist.tsx src/lib/stores/watchlistStore.ts
Move-Item lib/backtester.tsx src/lib/stores/backtesterStore.ts
Move-Item lib/social.tsx src/lib/stores/socialStore.ts
Move-Item lib/templates.tsx src/lib/stores/templatesStore.ts
Move-Item lib/paperTrading.tsx src/lib/stores/paperTradingStore.ts

# Continue for all remaining store files in lib/
# Use: Get-ChildItem lib/*.tsx, lib/*Store.ts to find remaining stores
```

**Verification:**
```powershell
# List all moved stores
Get-ChildItem src/lib/stores/*.ts

# Check lib/ for remaining stores
Get-ChildItem lib/ -Include "*Store.ts","*.tsx" -Recurse
```

**Checkpoint:** ✅ All stores moved to src/lib/stores/ with consistent naming

---

### STEP 4: Move Utility Files (5 min)

**Goal:** Move remaining utility files to appropriate subdirectories

```powershell
cd c:\Users\USER\Desktop\lokifi\apps\frontend

# Move utilities to src/lib/utils/
Move-Item lib/featureFlags.ts src/lib/utils/featureFlags.ts
Move-Item lib/migrations.ts src/lib/utils/migrations.ts
Move-Item lib/theme.ts src/lib/utils/theme.ts

# Move API files to src/lib/api/
Move-Item lib/apiClient.ts src/lib/api/apiClient.ts
Move-Item lib/api.ts src/lib/api/api.ts

# Move types to src/lib/types/
Move-Item lib/types.ts src/lib/types/index.ts

# Move constants to src/lib/constants/
Move-Item lib/flags.ts src/lib/constants/flags.ts

# Move chart utilities to src/lib/charts/
Move-Item lib/chartUtils.ts src/lib/charts/chartUtils.ts -ErrorAction SilentlyContinue
Move-Item lib/pluginSDK.ts src/lib/plugins/pluginSDK.ts -ErrorAction SilentlyContinue

# Check if lib/ is now empty (or nearly empty)
Get-ChildItem lib/
```

**Checkpoint:** ✅ All files categorized and moved

---

### STEP 5: Create Barrel Exports (10 min)

**Goal:** Create index.ts files for clean imports

#### src/lib/stores/index.ts

```typescript
// Auto-generate with PowerShell
cd c:\Users\USER\Desktop\lokifi\apps\frontend\src\lib\stores

# List all stores
Get-ChildItem *.ts -Name | ForEach-Object {
  $name = $_ -replace '\.ts$',''
  "export * from './$name';"
}

# Or manually create:
code index.ts
```

**Manual content:**
```typescript
export * from './multiChartStore';
export * from './indicatorStore';
export * from './drawingStore';
export * from './paneStore';
export * from './symbolStore';
export * from './timeframeStore';
export * from './marketDataStore';
export * from './alertsStore';
export * from './watchlistStore';
export * from './backtesterStore';
export * from './socialStore';
export * from './templatesStore';
export * from './paperTradingStore';
// ... add all stores
```

#### src/lib/utils/index.ts

```typescript
export * from './portfolio';
export * from './lw-mapping';
export * from './persist';
export * from './notify';
export * from './measure';
export * from './pdf';
export * from './featureFlags';
export * from './migrations';
export * from './theme';
// ... all utils
```

#### src/lib/api/index.ts

```typescript
export * from './apiFetch';
export * from './apiClient';
export * from './api';
```

#### src/lib/charts/index.ts

```typescript
export * from './indicators';
export * from './chartUtils';
```

**Checkpoint:** ✅ Barrel exports created for all subdirectories

---

### STEP 6: Update Imports (15 min)

**Goal:** Update all import paths to use new structure

#### Option A: VS Code Find & Replace (Recommended)

Press `Ctrl+Shift+H` to open global Find & Replace:

**Replace 1: multiChart**
```
Find: from ['"]@/lib/multiChart['"]
Replace: from '@/lib/stores/multiChartStore'
Replace All (in workspace)
```

**Replace 2: indicatorStore**
```
Find: from ['"]@/lib/indicatorStore['"]
Replace: from '@/lib/stores/indicatorStore'
Replace All
```

**Replace 3: drawingStore**
```
Find: from ['"]@/lib/drawingStore['"]
Replace: from '@/lib/stores/drawingStore'
Replace All
```

**Replace 4: featureFlags**
```
Find: from ['"]@/lib/featureFlags['"]
Replace: from '@/lib/utils/featureFlags'
Replace All
```

**Replace 5: api files**
```
Find: from ['"]@/lib/api['"]
Replace: from '@/lib/api/api'
Replace All

Find: from ['"]@/lib/apiClient['"]
Replace: from '@/lib/api/apiClient'
Replace All
```

**Continue for all moved files...**

#### Option B: Automated Script

```powershell
# Create update script
cd c:\Users\USER\Desktop\lokifi\tools\scripts
code update-imports.ps1
```

**update-imports.ps1:**
```powershell
$files = Get-ChildItem -Path "..\..\apps\frontend" -Include "*.ts","*.tsx" -Recurse

foreach ($file in $files) {
  $content = Get-Content $file.FullName -Raw

  # Update store imports
  $content = $content -replace "from ['`"]@/lib/multiChart['`"]", "from '@/lib/stores/multiChartStore'"
  $content = $content -replace "from ['`"]@/lib/indicatorStore['`"]", "from '@/lib/stores/indicatorStore'"
  # ... add all replacements

  Set-Content $file.FullName -Value $content
}

Write-Host "✅ Imports updated!" -ForegroundColor Green
```

**Run:**
```powershell
.\update-imports.ps1
```

**Checkpoint:** ✅ All imports updated to new paths

---

### STEP 7: Update tsconfig.json (5 min)

**Goal:** Add convenient path aliases

```powershell
cd c:\Users\USER\Desktop\lokifi\apps\frontend
code tsconfig.json
```

**Add to paths:**
```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"],
      "@/stores/*": ["src/lib/stores/*"],
      "@/utils/*": ["src/lib/utils/*"],
      "@/api/*": ["src/lib/api/*"],
      "@/charts/*": ["src/lib/charts/*"],
      "@/hooks/*": ["src/lib/hooks/*"],
      "@/types/*": ["src/lib/types/*"],
      "@/constants/*": ["src/lib/constants/*"]
    }
  }
}
```

**Optional:** Update imports to use new aliases
```typescript
// Before
import { useMultiChart } from '@/lib/stores/multiChartStore';

// After (with new alias)
import { useMultiChart } from '@/stores/multiChartStore';
```

**Checkpoint:** ✅ Path aliases configured

---

### STEP 8: Delete Old lib/ Directory (2 min)

**Goal:** Remove the old duplicate lib/ folder

```powershell
cd c:\Users\USER\Desktop\lokifi\apps\frontend

# Verify lib/ is empty or only has files you want to delete
Get-ChildItem lib/

# If everything looks good, delete it
Remove-Item lib/ -Recurse -Force

Write-Host "✅ Old lib/ directory deleted!" -ForegroundColor Green
```

**Checkpoint:** ✅ Only src/lib/ remains

---

### STEP 9: Verification (8 min)

**Goal:** Ensure everything still works

#### 1. TypeScript Compilation

```powershell
cd c:\Users\USER\Desktop\lokifi\apps\frontend

# Check for type errors
npm run type-check
# Or: npx tsc --noEmit
```

**Expected:** `✅ 0 errors`

#### 2. Run All Tests

```powershell
npm run test
```

**Expected:**
```
Test Files: 13 passed (13)
Tests: 183 passed | 4 skipped (187)
Duration: ~7s
✅ All tests passing!
```

#### 3. Build Project

```powershell
npm run build
```

**Expected:** `✅ Build successful`

#### 4. Check Coverage Baseline

```powershell
npm run test -- --coverage
```

**Expected:**
```
Coverage: 1.46% statements / 75.11% branches / 63.31% functions
✅ Baseline maintained
```

**Checkpoint:** ✅ All verifications passed

---

## 🎉 Success Criteria

### Must Pass All:
- [x] Zero duplicate files (indicators.ts, indicatorStore.ts resolved)
- [x] Single lib/ structure (only src/lib/, no lib/)
- [x] All stores in src/lib/stores/ with *Store.ts naming
- [x] All utilities in src/lib/utils/
- [x] All API clients in src/lib/api/
- [x] Barrel exports created (index.ts in each subdirectory)
- [x] All imports updated (no broken imports)
- [x] TypeScript compiles with 0 errors
- [x] 187 tests passing (same as before)
- [x] Coverage baseline maintained (1.46% / 75.11% / 63.31%)

---

## 🔍 Troubleshooting

### "Cannot find module '@/lib/...'"

**Cause:** Import not updated or file not moved correctly

**Fix:**
```powershell
# Search for old imports
code . -r -g "@/lib/"

# Find and replace manually or re-run Step 6
```

### "Module has no exported member"

**Cause:** Barrel export missing or incorrect

**Fix:**
```powershell
# Check index.ts files
code src/lib/stores/index.ts
code src/lib/utils/index.ts

# Ensure all exports are listed
```

### Tests Failing After Move

**Cause:** Test imports not updated

**Fix:**
```powershell
# Update test imports
cd tests
# Find old imports
Get-ChildItem -Recurse -Include "*.test.*" | Select-String "@/lib/" | Select-Object -ExpandProperty Path -Unique

# Update each file
```

### TypeScript Errors

**Cause:** Path alias not working or files in wrong location

**Fix:**
```powershell
# Restart TypeScript server
# In VS Code: Ctrl+Shift+P → "TypeScript: Restart TS Server"

# Or restart VS Code
```

---

## 📊 Progress Tracking

Use this checklist during execution:

```
[ ] STEP 1: Resolve duplicates (10 min)
    [ ] Compare indicators.ts versions
    [ ] Delete worse indicators.ts
    [ ] Compare indicatorStore.ts versions
    [ ] Delete worse indicatorStore.ts
    ✅ Checkpoint: Only 1 version of each file

[ ] STEP 2: Create directories (5 min)
    [ ] Create src/lib/stores/
    [ ] Create src/lib/charts/
    [ ] Create src/lib/api/
    [ ] Create src/lib/hooks/
    [ ] Create src/lib/types/
    [ ] Create src/lib/constants/
    ✅ Checkpoint: All directories exist

[ ] STEP 3: Move stores (15 min)
    [ ] Move all *Store.ts files
    [ ] Rename .tsx stores to .ts
    [ ] Verify all stores moved
    ✅ Checkpoint: src/lib/stores/ populated

[ ] STEP 4: Move utilities (5 min)
    [ ] Move utils to src/lib/utils/
    [ ] Move API files to src/lib/api/
    [ ] Move types to src/lib/types/
    [ ] Move constants to src/lib/constants/
    ✅ Checkpoint: All files categorized

[ ] STEP 5: Create exports (10 min)
    [ ] Create src/lib/stores/index.ts
    [ ] Create src/lib/utils/index.ts
    [ ] Create src/lib/api/index.ts
    [ ] Create src/lib/charts/index.ts
    ✅ Checkpoint: Barrel exports ready

[ ] STEP 6: Update imports (15 min)
    [ ] Update store imports
    [ ] Update utility imports
    [ ] Update API imports
    [ ] Verify no broken imports
    ✅ Checkpoint: All imports updated

[ ] STEP 7: Update tsconfig (5 min)
    [ ] Add path aliases
    [ ] Save and reload VS Code
    ✅ Checkpoint: Aliases working

[ ] STEP 8: Delete old lib/ (2 min)
    [ ] Verify lib/ is empty/safe to delete
    [ ] Delete lib/ directory
    ✅ Checkpoint: Only src/lib/ remains

[ ] STEP 9: Verification (8 min)
    [ ] npm run type-check → 0 errors
    [ ] npm run test → 187 passing
    [ ] npm run build → success
    [ ] Coverage maintained
    ✅ Checkpoint: ALL TESTS PASS

✅ PHASE 1.5.2 COMPLETE!
```

---

## 🚀 After Completion

Once Phase 1.5.2 is complete, proceed to:

**Next:** Phase 1.5.3 - Frontend Test Reorganization (1 hour)
- Move tests/lib/ to tests/unit/utils/
- Reorganize tests/unit/ into subdirectories
- Create fixtures/ and templates/

**See:** PHASE_1.5_REVISED_PLAN.md for Phase 1.5.3 details

---

## 📝 Notes

- Take your time with imports - this is the most error-prone step
- Test frequently (after each major step if possible)
- Use VS Code's TypeScript errors panel to catch issues early
- Commit after each major step for easy rollback if needed

**Estimated Total Time:** 60 minutes
**Break Points:** After Step 5 (exports) and Step 6 (imports)

🎯 **Ready to start? Begin with STEP 1!**
