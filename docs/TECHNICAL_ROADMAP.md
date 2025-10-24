# Technical Debt Roadmap - Post PR #27

> **Created**: October 24, 2025
> **Status**: Active
> **Owner**: Solo Developer
> **Estimated Timeline**: 3-4 months (100-140 hours)

---

## 📊 Executive Summary

This roadmap tracks the gradual improvement of code quality standards that were pragmatically relaxed in PR #27 to unblock CI/CD. All changes were temporary workarounds; this document outlines the systematic path back to excellence.

**Quick Stats:**
- **Frontend TypeScript `any` occurrences**: ~2,000+ (top 50 files identified)
- **ESLint rules relaxed**: 4 major rules
- **Backend Ruff ignores**: ~417 violations
- **Test Coverage**: 35% → Target: 80%+
- **Failing Tests**: 22 → Target: 0

---

## 🎯 Sprint Planning

### **Sprint 1: Critical Fixes** (2-3 weeks)
*Focus: High-risk bugs and foundational improvements*

### **Sprint 2: Medium Priority** (3-4 weeks)
*Focus: Code quality and maintainability*

### **Sprint 3: Cleanup & Polish** (2-3 weeks)
*Focus: Standards enforcement and coverage*

### **Sprint 4: Excellence** (4-6 weeks)
*Focus: Full compliance and documentation*

---

## 🎨 Frontend Issues

### Phase 1: TypeScript Type Safety (~1,800 `any` violations)

#### 1.1 Store Type Safety (Highest Impact)
- [ ] **Audit top 10 stores by `any` count** (1-2 hours)
  - [x] Identify files (completed in analysis)
  - [ ] Document patterns and create typing strategy
  - Files to target:
    - `monitoringStore.tsx` (152 `any`)
    - `configurationSyncStore.tsx` (140 `any`)
    - `performanceStore.tsx` (131 `any`)
    - `observabilityStore.tsx` (127 `any`)
    - `socialStore.tsx` (125 `any`)
    - `environmentManagementStore.tsx` (123 `any`)
    - `integrationTestingStore.tsx` (117 `any`)
    - `paperTradingStore.tsx` (110 `any`)
    - `rollbackStore.tsx` (102 `any`)
    - `mobileA11yStore.tsx` (102 `any`)

- [ ] **Create shared type definitions** (2-3 hours)
  - [ ] Create `src/lib/types/stores.d.ts` for common store patterns
  - [ ] Create `src/lib/types/api-responses.d.ts` for API response types
  - [ ] Create `src/lib/types/zustand.d.ts` for Zustand-specific types
  - [ ] Document type patterns in `docs/CODING_STANDARDS.md`

- [ ] **Fix top 3 stores** (6-8 hours)
  - [ ] Type `monitoringStore.tsx` completely
  - [ ] Type `configurationSyncStore.tsx` completely
  - [ ] Type `performanceStore.tsx` completely
  - [ ] Add unit tests for typed store interfaces
  - [ ] Run TypeScript compiler and fix errors

- [ ] **Fix stores 4-10** (8-12 hours)
  - [ ] Type remaining 7 stores from top-10 list
  - [ ] Ensure consistency with shared types
  - [ ] Add/update tests

- [ ] **Fix remaining stores** (10-15 hours)
  - [ ] `backtesterStore.tsx` (82 `any`)
  - [ ] `templatesStore.tsx` (55 `any`)
  - [ ] `watchlistStore.tsx` (50 `any`)
  - [ ] `alertsStore.tsx` (49 `any`)
  - [ ] `corporateActionsStore.tsx` (31 `any`)
  - [ ] `drawStore.tsx` (24 `any`)
  - [ ] `multiChartStore.tsx` (21 `any`)
  - [ ] `drawingStore.tsx` (12 `any`)

#### 1.2 Component Type Safety
- [ ] **Type major chart components** (8-10 hours)
  - [ ] `ChartPanel.tsx` (113 `any`)
  - [ ] `ChartPanelV2.tsx` (29 `any`)
  - [ ] `DrawingLayer.tsx` (37 `any`)
  - [ ] `PriceChart.tsx` (35 `any`)
  - [ ] `ObjectInspector.tsx` (22 `any`)
  - [ ] `DrawingSettingsPanel.tsx` (20 `any`)

- [ ] **Type utility components** (4-6 hours)
  - [ ] `WatchlistPanel.tsx` (12 `any`)
  - [ ] `AddAssetModal.tsx` (13 `any`)
  - [ ] `AlertModal.tsx` (13 `any`)

- [ ] **Type page components** (3-4 hours)
  - [ ] `app/portfolio/page.tsx` (15 `any`)
  - [ ] `app/notifications/preferences/page.tsx` (17 `any`)

#### 1.3 Core Library Type Safety
- [ ] **Type data layer** (6-8 hours)
  - [ ] `lib/data/adapter.ts` (14 `any`)
  - [ ] `lib/data/dashboardData.ts` (16 `any`)
  - [ ] `lib/charts/chartBus.test.ts` (49 `any` - mostly test mocks)

- [ ] **Type utility modules** (4-6 hours)
  - [ ] `lib/utils/perf.ts` (20 `any`)
  - [ ] `lib/utils/alignment.ts` (15 `any`)
  - [ ] `lib/plugins/pluginSDK.ts` (14 `any`)

- [ ] **Type services** (3-4 hours)
  - [ ] `services/marketData.ts` (13 `any`)
  - [ ] `services/backendPriceService.ts` (11 `any`)

#### 1.4 ESLint Rule Re-enablement
- [ ] **Re-enable `@typescript-eslint/no-explicit-any` as "warn"** (1 hour)
  - [ ] Update `.eslintrc.json`
  - [ ] Run linter and capture baseline violations
  - [ ] Create tracking issue with violation count

- [ ] **Fix violations iteratively** (ongoing)
  - [ ] Target: Reduce by 10% per week
  - [ ] Weekly check-in on progress
  - [ ] Block PRs with new `any` additions

- [ ] **Promote to "error" level** (final step)
  - [ ] Only after <50 violations remain
  - [ ] Update CI/CD to enforce
  - [ ] Document exceptions (if any)

### Phase 2: Accessibility Compliance (~200 violations)

- [ ] **Re-add `plugin:jsx-a11y/recommended`** (1 hour)
  - [ ] Add to `.eslintrc.json` extends array
  - [ ] Add `jsx-a11y` to plugins array
  - [ ] Run linter and capture baseline violations

- [ ] **Fix critical a11y issues** (8-12 hours)
  - [ ] Add missing `alt` attributes to images
  - [ ] Add proper ARIA labels to interactive elements
  - [ ] Fix form label associations
  - [ ] Fix button accessibility (name, role, keyboard support)

- [ ] **Fix keyboard navigation** (4-6 hours)
  - [ ] Ensure all interactive elements are keyboard accessible
  - [ ] Fix focus management in modals/dialogs
  - [ ] Add visible focus indicators
  - [ ] Test tab order

- [ ] **Fix semantic HTML issues** (3-4 hours)
  - [ ] Fix heading hierarchy (h1, h2, h3 proper nesting)
  - [ ] Use semantic elements (nav, main, article, etc.)
  - [ ] Add landmark regions

- [ ] **Automated accessibility testing** (2-3 hours)
  - [ ] Verify existing `tests/a11y/` tests pass
  - [ ] Add tests for newly fixed components
  - [ ] Add a11y checks to CI/CD pipeline
  - [ ] Document a11y standards in `docs/CODING_STANDARDS.md`

### Phase 3: Unused Code Cleanup (~600 violations)

- [ ] **Re-enable `@typescript-eslint/no-unused-vars` as "warn"** (1 hour)
  - [ ] Update `.eslintrc.json`
  - [ ] Run linter and capture baseline violations

- [ ] **Auto-fix simple cases** (2-3 hours)
  - [ ] Run `eslint --fix` on frontend
  - [ ] Review auto-fixes before committing
  - [ ] Test that nothing broke

- [ ] **Manually fix complex cases** (3-4 hours)
  - [ ] Review remaining violations
  - [ ] Remove truly unused code
  - [ ] Add `_` prefix for intentionally unused params
  - [ ] Document patterns

- [ ] **Promote to "error" level** (final step)
  - [ ] Update configuration
  - [ ] Ensure CI/CD enforces

### Phase 4: React Hooks Dependencies (~300 violations)

- [ ] **Re-enable `react-hooks/exhaustive-deps` as "warn"** (1 hour)
  - [ ] Update `.eslintrc.json` (currently already "warn")
  - [ ] Run linter and capture baseline violations

- [ ] **Fix critical hooks** (4-6 hours)
  - [ ] Review `useEffect` dependencies
  - [ ] Review `useCallback` dependencies
  - [ ] Review `useMemo` dependencies
  - [ ] Fix stale closure bugs

- [ ] **Fix custom hooks** (2-3 hours)
  - [ ] Review hooks in `src/lib/hooks/`
  - [ ] Ensure proper dependency arrays
  - [ ] Add tests for hook behavior

- [ ] **Document intentional exceptions** (1 hour)
  - [ ] Add `// eslint-disable-next-line` with explanation
  - [ ] Document pattern in coding standards
  - [ ] Review in code review process

### Phase 5: TypeScript Strictness Re-enablement

- [ ] **Phase 5.1: Re-enable `noUncheckedIndexedAccess`** (6-8 hours)
  - [ ] Currently enabled - verify no violations
  - [ ] If violations exist, add proper undefined checks
  - [ ] Test array/object access patterns
  - [ ] Document pattern in coding standards

- [ ] **Phase 5.2: Re-enable `exactOptionalPropertyTypes`** (4-6 hours)
  - [ ] Currently enabled - verify no violations
  - [ ] Fix optional property type mismatches
  - [ ] Update type definitions
  - [ ] Test edge cases

- [ ] **Phase 5.3: Re-enable `noPropertyAccessFromIndexSignature`** (3-4 hours)
  - [ ] Currently enabled - verify no violations
  - [ ] Update dynamic property access to bracket notation
  - [ ] Review and update patterns
  - [ ] Document best practices

---

## 🔧 Backend Issues

### Phase 1: Critical Bug Risks

#### 1.1 Mutable Class Defaults (RUF012) - 15 violations
- [ ] **Audit backend for mutable defaults** (1-2 hours)
  - [ ] Search for `@dataclass` with list/dict defaults
  - [ ] Search for class attributes with mutable defaults
  - [ ] Document all instances

- [ ] **Fix dataclass mutable defaults** (2-3 hours)
  - [ ] Replace `field: list = []` with `field: list = field(default_factory=list)`
  - [ ] Replace `field: dict = {}` with `field: dict = field(default_factory=dict)`
  - [ ] Test affected classes

- [ ] **Add tests for mutability issues** (2 hours)
  - [ ] Create test that would catch shared state bugs
  - [ ] Verify fixes prevent state pollution
  - [ ] Document pattern in coding standards

- [ ] **Remove RUF012 from ignores** (30 min)
  - [ ] Update `ruff.toml`
  - [ ] Run linter to verify 0 violations
  - [ ] Update CI/CD

### Phase 2: Import Star Refactoring (174 violations)

- [ ] **Audit import star usage** (2-3 hours)
  - [ ] Find all `from X import *` statements
  - [ ] Document which modules are imported
  - [ ] Identify common patterns

- [ ] **Create explicit import strategy** (1 hour)
  - [ ] Document which symbols to import from each module
  - [ ] Create helper script to generate explicit imports
  - [ ] Document pattern in coding standards

- [ ] **Replace import stars module-by-module** (8-12 hours)
  - [ ] Start with most frequently used modules
  - [ ] Update imports to explicit list
  - [ ] Test after each module
  - [ ] Review with linter

- [ ] **Remove F403/F405 from ignores** (30 min)
  - [ ] Update `ruff.toml`
  - [ ] Run linter to verify 0 violations
  - [ ] Update CI/CD

### Phase 3: Exception Chaining (131 violations)

- [ ] **Audit exception re-raising** (2-3 hours)
  - [ ] Find all `raise` statements in `except` blocks
  - [ ] Categorize where chaining adds value
  - [ ] Document patterns

- [ ] **Add exception chaining** (4-6 hours)
  - [ ] Change `raise NewException()` to `raise NewException() from e`
  - [ ] Ensure original traceback preserved
  - [ ] Test error reporting
  - [ ] Update logging to use chained exceptions

- [ ] **Remove B904 from ignores** (30 min)
  - [ ] Update `ruff.toml`
  - [ ] Run linter to verify 0 violations
  - [ ] Update CI/CD

### Phase 4: Performance Optimizations (17 violations)

- [ ] **Apply comprehensions** (2-3 hours)
  - [ ] Replace manual list building with comprehensions
  - [ ] Replace manual dict building with dict comprehensions
  - [ ] Verify readability maintained

- [ ] **Benchmark performance** (1-2 hours)
  - [ ] Create simple benchmarks for hot paths
  - [ ] Measure before/after
  - [ ] Document improvements

- [ ] **Remove PERF401/PERF403 from ignores** (30 min)
  - [ ] Update `ruff.toml`
  - [ ] Run linter to verify 0 violations
  - [ ] Update CI/CD

### Phase 5: Other Backend Ignores

- [ ] **Request timeout handling (S113)** - 39 violations (2-3 hours)
  - [ ] Add timeout parameters to HTTP requests
  - [ ] Document appropriate timeout values
  - [ ] Test timeout behavior

- [ ] **Try-except-pass (S110)** (1-2 hours)
  - [ ] Review all try-except-pass blocks
  - [ ] Add logging or proper error handling
  - [ ] Document intentional suppressions

- [ ] **Asyncio dangling tasks (RUF006)** (2-3 hours)
  - [ ] Review async task creation
  - [ ] Ensure tasks are awaited or tracked
  - [ ] Fix potential resource leaks

---

## 🧪 Test Quality Improvements

### Phase 1: Fix Failing Tests (22 failures)

- [ ] **Triage failing tests** (2-3 hours)
  - [ ] Categorize by failure type
  - [ ] Identify root causes
  - [ ] Create fix plan

- [ ] **Fix database connection issues** (2-3 hours)
  - [ ] Review test database setup
  - [ ] Fix connection pooling in tests
  - [ ] Ensure proper cleanup

- [ ] **Fix Redis configuration issues** (1-2 hours)
  - [ ] Review Redis mock/connection in tests
  - [ ] Ensure test isolation
  - [ ] Fix async/connection issues

- [ ] **Fix secret management in tests** (1-2 hours)
  - [ ] Use test-specific secrets
  - [ ] Mock external secret providers
  - [ ] Document test secrets pattern

- [ ] **Verify all tests pass** (1 hour)
  - [ ] Run full test suite
  - [ ] Fix any new issues
  - [ ] Update CI/CD

### Phase 2: Increase Coverage to 60%

- [ ] **Identify critical uncovered code** (2-3 hours)
  - [ ] Generate coverage report
  - [ ] Identify business logic with <50% coverage
  - [ ] Prioritize by risk/complexity

- [ ] **Add tests for critical paths** (20-30 hours)
  - [ ] Test authentication/authorization
  - [ ] Test data persistence
  - [ ] Test API endpoints
  - [ ] Test business logic calculations
  - [ ] Test error handling

- [ ] **Add integration tests** (10-15 hours)
  - [ ] Test API contracts (existing tests at `tests/api/contracts/`)
  - [ ] Test feature workflows (existing at `tests/integration/`)
  - [ ] Test database interactions
  - [ ] Test external service integrations

### Phase 3: Increase Coverage to 80%+

- [ ] **Add edge case tests** (15-20 hours)
  - [ ] Test boundary conditions
  - [ ] Test error paths
  - [ ] Test concurrent access
  - [ ] Test resource exhaustion

- [ ] **Add property-based tests** (10-15 hours)
  - [ ] Install hypothesis (Python) or fast-check (JS)
  - [ ] Test invariants
  - [ ] Test round-trip properties
  - [ ] Document patterns

- [ ] **Add performance tests** (5-8 hours)
  - [ ] Benchmark critical paths
  - [ ] Set performance budgets
  - [ ] Add regression detection
  - [ ] Document baselines

---

## 🔍 Other Issues

### Mypy Module Path Conflicts

- [ ] **Investigate module structure** (2-3 hours)
  - [ ] Review `app/services/` import paths
  - [ ] Identify conflicting module names
  - [ ] Document current structure

- [ ] **Fix import paths** (2-3 hours)
  - [ ] Standardize on one module path pattern
  - [ ] Update all imports consistently
  - [ ] Test that code still works

- [ ] **Update mypy configuration** (1 hour)
  - [ ] Update `mypy.ini` or `pyproject.toml`
  - [ ] Run mypy and verify 0 conflicts
  - [ ] Update CI/CD

---

## 🚀 CI/CD & Automation

### Gradual Rule Enforcement

- [ ] **Create lint baseline tracking** (2-3 hours)
  - [ ] Script to count violations per rule
  - [ ] Store baseline in repo (e.g., `.lint-baseline.json`)
  - [ ] Add to CI to prevent regressions

- [ ] **Configure CI gates** (2-3 hours)
  - [ ] Block PRs that increase violation count
  - [ ] Allow PRs that reduce violations
  - [ ] Report progress in PR comments

- [ ] **Create progress dashboard** (3-4 hours)
  - [ ] Track violations over time
  - [ ] Visualize progress toward goals
  - [ ] Share in team channels/docs

### Pre-commit Hooks

- [ ] **Set up pre-commit framework** (1-2 hours)
  - [ ] Install pre-commit package
  - [ ] Configure `.pre-commit-config.yaml`
  - [ ] Add to developer setup docs

- [ ] **Add linting hooks** (1 hour)
  - [ ] ESLint for frontend
  - [ ] Ruff for backend
  - [ ] TypeScript compiler check
  - [ ] Mypy type checking

- [ ] **Add formatting hooks** (1 hour)
  - [ ] Prettier for frontend
  - [ ] Black for backend
  - [ ] EditorConfig enforcement

### Documentation Automation

- [ ] **Auto-generate API docs** (2-3 hours)
  - [ ] Set up TypeDoc for frontend
  - [ ] Set up Sphinx or pdoc for backend
  - [ ] Add to CI/CD pipeline

- [ ] **Auto-update type coverage** (1-2 hours)
  - [ ] Track `any` usage over time
  - [ ] Generate type coverage reports
  - [ ] Add to CI/CD

---

## 📚 Documentation Updates

### Code Standards Documentation

- [ ] **Update `CODING_STANDARDS.md`** (2-3 hours)
  - [ ] Document TypeScript patterns (no `any`, proper types)
  - [ ] Document import patterns (explicit, not star)
  - [ ] Document exception handling (with chaining)
  - [ ] Document accessibility requirements
  - [ ] Document test requirements

- [ ] **Create migration guide** (2-3 hours)
  - [ ] "From `any` to proper types" guide
  - [ ] "Import star to explicit" guide
  - [ ] "Mutable defaults" pitfalls guide
  - [ ] Link from main docs

- [ ] **Update PR template** (1 hour)
  - [ ] Add type safety checklist
  - [ ] Add accessibility checklist
  - [ ] Add test coverage requirement
  - [ ] Link to standards

### Architecture Documentation

- [ ] **Document store architecture** (2-3 hours)
  - [ ] Zustand store patterns
  - [ ] Type definitions
  - [ ] Testing approach
  - [ ] Best practices

- [ ] **Document API contracts** (2-3 hours)
  - [ ] Request/response types
  - [ ] Error handling patterns
  - [ ] Versioning strategy
  - [ ] Testing approach

- [ ] **Update repository structure docs** (1-2 hours)
  - [ ] Reflect current file organization
  - [ ] Document module boundaries
  - [ ] Update after any refactoring

---

## 📊 Success Metrics & Tracking

### Quantitative Metrics

| Metric | Baseline | Current | Target | Status |
|--------|----------|---------|--------|--------|
| Frontend `any` count | ~2,000 | ~2,000 | 0 | 🔴 Not started |
| ESLint violations | 2,905 (ignored) | 2,905 | 0 | 🔴 Not started |
| Ruff violations | 417 (ignored) | 417 | 0 | 🔴 Not started |
| TypeScript errors | 1,068 (relaxed) | 0 | 0 | 🟡 Verify strict flags |
| Test pass rate | 84% (709/843) | 84% | 100% | 🔴 22 failures |
| Test coverage | 35% | 35% | 80%+ | 🔴 Far from target |
| A11y violations | ~200 | ~200 | 0 | 🔴 Not started |

### Weekly Check-in Template

```markdown
## Week of YYYY-MM-DD

### Completed
- [ ] Task 1
- [ ] Task 2

### In Progress
- [ ] Task 3 (50% complete)

### Metrics
- Frontend `any` count: X (change: ±Y)
- Test coverage: X% (change: ±Y%)
- Failing tests: X (change: ±Y)

### Blockers
- None / [Describe blocker]

### Next Week Goals
- [ ] Goal 1
- [ ] Goal 2
```

### Monthly Milestones

#### Month 1 (Sprint 1 Complete)
- [ ] All failing tests fixed (0 failures)
- [ ] Top 10 stores fully typed
- [ ] Mutable class defaults fixed
- [ ] 50% reduction in `any` usage in stores
- [ ] Test coverage increased to 45%

#### Month 2 (Sprint 2 Complete)
- [ ] All stores typed (0 `any` in stores)
- [ ] Major components typed
- [ ] Import star refactoring 50% complete
- [ ] A11y critical issues fixed
- [ ] Test coverage increased to 60%

#### Month 3 (Sprint 3 Complete)
- [ ] ESLint `no-explicit-any` promoted to "error"
- [ ] All accessibility issues fixed
- [ ] Import star refactoring 100% complete
- [ ] Exception chaining added
- [ ] Test coverage increased to 70%

#### Month 4 (Sprint 4 Complete)
- [ ] All ESLint rules re-enabled at "error"
- [ ] All Ruff ignores removed
- [ ] TypeScript strict flags verified
- [ ] Test coverage at 80%+
- [ ] All documentation updated

---

## 🎯 Definition of Done

This roadmap is complete when:

### Code Quality
- [ ] Zero `any` types in production code (tests may have limited `any`)
- [ ] All ESLint rules re-enabled at "error" level
- [ ] All Ruff ignores removed from `ruff.toml`
- [ ] All TypeScript strict flags enabled and enforced
- [ ] Zero Mypy module conflicts

### Testing
- [ ] 100% test pass rate (0 failing tests)
- [ ] ≥80% code coverage (frontend and backend)
- [ ] All critical paths have integration tests
- [ ] Performance baselines established

### Accessibility
- [ ] Zero `jsx-a11y` violations
- [ ] WCAG 2.1 AA compliance verified
- [ ] Keyboard navigation fully functional
- [ ] Screen reader compatibility verified

### Documentation
- [ ] All coding standards documented
- [ ] Migration guides published
- [ ] Architecture documentation updated
- [ ] PR templates include quality checklists

### CI/CD
- [ ] Pre-commit hooks configured
- [ ] CI enforces all quality rules
- [ ] Progress dashboard published
- [ ] Automated reporting in place

---

## 🔗 Related Documents

- [PR #27 - Workflow Optimizations Validation](../pull/27)
- [Coding Standards](./CODING_STANDARDS.md)
- [Repository Structure](./REPOSITORY_STRUCTURE.md)
- [Test Quick Reference](./TEST_QUICK_REFERENCE.md)
- [Copilot Instructions](../.github/copilot-instructions.md)

---

## 📝 Notes

### Decision Log

**2025-10-24**: Initial roadmap created based on PR #27 technical debt
- Pragmatic approach: Fix critical issues first, then improve gradually
- Timeline: 3-4 months for solo developer
- Focus on high-impact, low-risk improvements first

### Lessons Learned

*To be filled in as work progresses*

---

**Last Updated**: October 24, 2025
**Next Review**: November 1, 2025 (weekly)
