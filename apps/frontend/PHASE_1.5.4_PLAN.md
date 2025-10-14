# Phase 1.5.4: Bot Enhancement - AI-Powered Test Automation

**Status:** 🚀 IN PROGRESS
**Estimated Time:** 30 minutes
**Started:** October 14, 2025, 02:35 AM

---

## Objectives

Enhance the lokifi.ps1 bot with AI-powered test intelligence:

1. **AI Test Suggestions** - Analyze code changes and suggest relevant tests
2. **Smart Test Selection** - Run only tests affected by code changes
3. **Coverage Tracking** - Track and report coverage trends over time
4. **Test Impact Analysis** - Show which tests cover which code

---

## Implementation Plan

### Step 1: AI Test Suggestion Engine (10 min)

**Goal:** Analyze changed files and suggest which tests to run

**Tasks:**

1. Create `Get-TestSuggestions` function in lokifi.ps1
2. Analyze git diff to identify changed files
3. Map files to related test files using patterns
4. Suggest tests based on:
   - Direct test files (e.g., `utils.ts` → `utils.test.ts`)
   - Component tests for changed components
   - Store tests for changed stores
   - Integration tests for API changes
5. Return prioritized test list

**Example Output:**

```
🧠 AI Test Suggestions for your changes:

High Priority (Direct Changes):
  ✓ tests/unit/utils/portfolio.test.ts (portfolio.ts modified)
  ✓ tests/components/PriceChart.test.tsx (PriceChart.tsx modified)

Medium Priority (Dependencies):
  ⚠ tests/unit/stores/multiChartStore.test.tsx (uses modified utils)
  ⚠ tests/integration/features-g2-g4.test.tsx (integration tests)

Recommended Command:
  npx vitest tests/unit/utils/portfolio.test.ts tests/components/PriceChart.test.tsx
```

### Step 2: Smart Test Selection (10 min)

**Goal:** Run only affected tests based on file changes

**Tasks:**

1. Create `Invoke-SmartTests` function in lokifi.ps1
2. Build dependency graph:
   - Source files → Test files
   - Components → Component tests
   - Stores → Store tests
   - Utils → Utility tests
3. Cache test results for unchanged files
4. Run only tests for modified files
5. Show time saved vs full test run

**Example Output:**

```
⚡ Smart Test Selection Active

Analyzing changes...
  📝 3 files modified
  🔍 Found 5 affected tests (vs 17 total)
  ⏱️ Estimated time saved: 4.2s (60%)

Running affected tests:
  ✓ portfolio.test.ts (18 tests) - 1.2s
  ✓ PriceChart.test.tsx (25 tests) - 2.1s
  ✓ multiChartStore.test.tsx (6 tests) - 0.8s

Results: 49/49 tests passed ✅
Time: 4.1s (vs 7.1s full run)
```

### Step 3: Coverage Trend Tracking (5 min)

**Goal:** Track coverage over time and show trends

**Tasks:**

1. Create `Track-CoverageTrend` function in lokifi.ps1
2. Store coverage snapshots in `.coverage-history/`
3. Calculate trends (increasing/decreasing)
4. Generate coverage reports
5. Alert on coverage drops

**Data Structure:**

```json
{
  "timestamp": "2025-10-14T02:35:00Z",
  "commit": "73e010eb",
  "coverage": {
    "statements": 12.3,
    "branches": 75.11,
    "functions": 63.31,
    "lines": 12.3
  },
  "tests": {
    "total": 224,
    "passing": 224,
    "failing": 0,
    "skipped": 4
  }
}
```

**Example Output:**

```
📊 Coverage Trends (Last 7 days)

Statements: 12.3% ↗ +0.77% (from 11.53%)
Branches:   75.11% → (no change)
Functions:  63.31% ↗ +2.15% (from 61.16%)

Tests:      224 ↗ +37 (from 187)
Pass Rate:  100% ✅

Trend: 📈 IMPROVING
```

### Step 4: Test Impact Analysis (5 min)

**Goal:** Show which tests cover which code

**Tasks:**

1. Create `Get-TestImpact` function in lokifi.ps1
2. Map source files to their test coverage
3. Show coverage gaps (files without tests)
4. Highlight high-risk files (complex + low coverage)
5. Suggest test priorities

**Example Output:**

```
🎯 Test Impact Analysis

High Coverage (Well Tested):
  ✅ portfolio.ts (100% - 1 test file)
  ✅ notify.ts (100% - 1 test file)
  ✅ pdf.ts (100% - 1 test file)

Medium Coverage (Needs More Tests):
  ⚠️ timeframes.ts (30% - 0 test files)
  ⚠️ chartUtils.ts (45% - 1 test file)

Low Coverage (Critical Risk):
  ❌ adapter.ts (33% - 0 test files)
  ❌ lw-mapping.ts (28% - 1 test file)

Suggested Next Tests:
  1. Create tests/unit/utils/adapter.test.ts
  2. Expand tests/unit/utils/timeframes.test.ts
  3. Add tests/unit/charts/lw-mapping.test.ts coverage
```

---

## Implementation Details

### File Structure

```
tools/
├── lokifi.ps1                    # Main bot (ADD new functions)
└── test-automation/              # NEW test automation utilities
    ├── dependency-graph.json     # Source → Test mapping
    ├── test-patterns.json        # Test file patterns
    └── coverage-history/         # Coverage snapshots
        ├── 2025-10-14-0235.json
        └── latest.json
```

### New Functions to Add

**1. Get-TestSuggestions**

```powershell
function Get-TestSuggestions {
    param([string[]]$ChangedFiles)
    # Analyze changed files
    # Map to test files
    # Prioritize suggestions
    # Return test list
}
```

**2. Invoke-SmartTests**

```powershell
function Invoke-SmartTests {
    param([switch]$DryRun)
    # Get changed files from git
    # Build dependency graph
    # Find affected tests
    # Run only affected tests
    # Cache results
}
```

**3. Track-CoverageTrend**

```powershell
function Track-CoverageTrend {
    param([int]$Days = 7)
    # Get current coverage
    # Compare with history
    # Calculate trends
    # Generate report
}
```

**4. Get-TestImpact**

```powershell
function Get-TestImpact {
    param([string]$File)
    # Map file to tests
    # Show coverage %
    # Identify gaps
    # Suggest priorities
}
```

### Integration with Existing Bot

Add new commands to lokifi.ps1:

```powershell
# New test intelligence commands
.\lokifi.ps1 test-suggest          # AI test suggestions
.\lokifi.ps1 test-smart            # Smart test selection
.\lokifi.ps1 test-trends           # Coverage trends
.\lokifi.ps1 test-impact [file]    # Test impact analysis
```

---

## Expected Outcomes

### Developer Experience Improvements

**Before Phase 1.5.4:**

```bash
# Manual test selection
npm test                          # Run ALL 224 tests (7.1s)
npx vitest tests/unit/utils/      # Manual path selection
```

**After Phase 1.5.4:**

```bash
# AI-powered automation
.\lokifi.ps1 test-suggest         # Get intelligent suggestions
.\lokifi.ps1 test-smart           # Run only affected tests (60% faster)
.\lokifi.ps1 test-trends          # Track progress over time
.\lokifi.ps1 test-impact utils.ts # See test coverage for specific file
```

### Time Savings

- **Smart Test Selection:** 60% faster (4s vs 7s)
- **Test Suggestions:** Save 2-3 min per commit (no manual test selection)
- **Trend Tracking:** Save 5 min per day (automated reports)
- **Impact Analysis:** Save 10 min per feature (quick coverage insights)

**Total Time Saved:** ~20 min per day per developer

### Quality Improvements

- ✅ Run relevant tests automatically
- ✅ Catch regressions faster (affected tests run first)
- ✅ Track coverage trends over time
- ✅ Identify test gaps proactively
- ✅ Prioritize test writing efforts

---

## Success Metrics

### Functionality

- [ ] `Get-TestSuggestions` analyzes changes and suggests tests
- [ ] `Invoke-SmartTests` runs only affected tests
- [ ] `Track-CoverageTrend` stores and reports coverage history
- [ ] `Get-TestImpact` shows file-to-test mapping

### Performance

- [ ] Smart test selection reduces run time by 50%+
- [ ] Test suggestions generated in <2s
- [ ] Coverage trend calculation in <1s
- [ ] Impact analysis for any file in <1s

### Usability

- [ ] Clear, actionable output
- [ ] Color-coded priorities (high/medium/low)
- [ ] Helpful examples and suggestions
- [ ] Works with existing lokifi.ps1 commands

---

## Testing Plan

### Manual Testing

1. **Test Suggestions:**

   ```bash
   # Modify a file
   echo "// test" >> src/lib/utils/portfolio.ts

   # Get suggestions
   .\lokifi.ps1 test-suggest

   # Verify: Should suggest portfolio.test.ts
   ```

2. **Smart Test Selection:**

   ```bash
   # Modify multiple files
   # Run smart tests
   .\lokifi.ps1 test-smart

   # Verify: Runs only affected tests, shows time saved
   ```

3. **Coverage Trends:**

   ```bash
   # Run multiple times
   .\lokifi.ps1 test-trends

   # Verify: Shows historical trends, arrows indicate direction
   ```

4. **Test Impact:**

   ```bash
   # Check specific file
   .\lokifi.ps1 test-impact portfolio.ts

   # Verify: Shows test files, coverage %, gaps
   ```

### Automated Testing

- Add unit tests for new functions (optional, for future)
- Verify JSON schema for coverage history
- Test edge cases (no changes, new files, deleted files)

---

## Next Steps After Completion

1. ✅ Complete Phase 1.5.4 (this phase)
2. 🔜 Phase 1.5.5: Coverage Dashboard (visual HTML reports)
3. 🔜 Phase 1.5.6: Security Automation (auto-generate security tests)
4. 🔜 Phase 1.5.7: Auto-Documentation (generate docs from tests)
5. 🔜 Phase 1.5.8: CI/CD Integration (GitHub Actions)

---

## Notes

- Keep functions modular and testable
- Use existing PowerShell best practices
- Integrate with current lokifi.ps1 style
- Add helpful comments and documentation
- Consider future extensibility

---

**Let's build it!** 🚀
