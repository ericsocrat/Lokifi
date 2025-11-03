# ✅ Lokifi Development Checklists

**Last Updated:** November 3, 2025
**Purpose:** Repeatable process checklists for development workflow
**Status:** Production Ready

> **🔗 Related Documents**:
> - **[Renovate Bot Evaluation](./ci-cd/dependencies/renovate-evaluation.md)** - Automated dependency management
> - **[Dependency Management](./ci-cd/dependencies/management.md)** - Dependency best practices
> - **[Workflow Optimization](./ci-cd/workflows/optimization.md)** - CI/CD optimization results
> - **[Pattern Library](./architecture/patterns/)** - 22 battle-tested patterns from 66+ sessions
>
> **📊 Quick Stats**:
> - **CI/CD**: 100% pass rate (35/35 workflows) ✅
> - **Type Safety**: 96.3% (64 acceptable any types) ✅
> - **Backend Quality**: 0 Ruff violations ✅
> - **ESLint**: 287 warnings (all documented as acceptable) ✅
> - **Test Coverage**: Frontend 11.61% ✅, Backend 30.75%
> - **Pre-commit Hooks**: Active (quality + security gates) ✅

---

## 🎯 Current Focus (Sprint 7)

**Primary Objectives:**
- [ ] **Backend Test Coverage**: Push from 30.75% → 40-50% (+10-15pp)
  - Profile API, Conversations API, Follow system, AI integration
  - Use AsyncMock pattern from Pattern Library
  - Estimated: 6-8 hours
- [ ] **Frontend Performance**: Optimize bundle size and loading
  - Bundle analysis, lazy loading, code splitting, image optimization
  - Target: <500KB initial bundle, FCP <1.5s
  - Estimated: 4-6 hours

**Secondary Objectives:**
- [ ] Phase 3 tool monitoring (hook performance tracking, ongoing)
- [ ] (Optional) Fix pre-existing test failures (1-2 hours)

**Active Tasks:** See `manage_todo_list` tool (9 tasks)

**Current Blockers:** None

---

## 🔗 Tool Integration & CI/CD Checklist

### Integration Status Overview

**Purpose**: Track which `/tools/` scripts are integrated into CI/CD workflows and pre-commit hooks.

| Tool | Pre-commit Hook | Pre-push Hook | CI Workflows | Status |
|------|----------------|---------------|--------------|--------|
| `test-runner.ps1` | ✅ Active | ✅ Active | ⚠️ Local Only (cross-platform limitations) | Partial |
| `security-scanner.ps1` | ✅ Active (-Quick mode) | ❌ Not integrated | ⚠️ Local Only (same limitations) | Partial |
| `setup-precommit-hooks.ps1` | N/A (installer) | N/A (installer) | N/A (installer) | Complete |
| `codebase-analyzer.ps1` | N/A (manual) | N/A (manual) | N/A (manual) | N/A |
| `bypass-hooks.ps1` | N/A (emergency) | N/A (emergency) | N/A (emergency) | N/A |
| `mcp-coverage-server.js` | N/A (VS Code) | N/A (VS Code) | N/A (VS Code) | Complete |

### ✅ Active Integrations

#### test-runner.ps1 → Pre-commit/Pre-push Hooks
- [x] **Pre-commit hook installed** - `.git/hooks/pre-commit`
  - Runs: `test-runner.ps1 -PreCommit -CoverageThreshold 15`
  - Blocks commits that fail quality gates
  - Execution time: ~30-60 seconds (frontend linting + unit tests)
- [x] **Pre-push hook installed** - `.git/hooks/pre-push`
  - Runs: `test-runner.ps1 -PreCommit -CoverageThreshold 20 -GenerateReport`
  - Blocks pushes that fail comprehensive tests
  - Execution time: ~2-3 minutes (full test suite + coverage)
- [x] **Commit-msg hook installed** - `.git/hooks/commit-msg`
  - Validates conventional commit format
  - Blocks commits with malformed messages

**Installation**: `.\tools\setup-precommit-hooks.ps1`
**Status**: ✅ Installed and tested (November 3, 2025)
**Update**: ✅ Enhanced with security-scanner.ps1 integration (November 3, 2025)

#### test-runner.ps1 → CI Workflows ⚠️ NOT RECOMMENDED
**Status**: ⚠️ Local Only - Cross-platform compatibility limitations (November 3, 2025)

**Evaluation Result**:
After testing CI integration, discovered PowerShell cross-platform issues:
- ❌ `Export-ModuleMember` cmdlet incompatible with non-module execution in CI
- ❌ Windows path formats (`.\venv\Scripts\pip.exe`) don't work on Linux runners
- ❌ PowerShell module system designed for Windows/local development

**Decision**: Keep test-runner.ps1 for **local hooks only**
- ✅ **Local pre-commit/pre-push**: Works perfectly, provides unified orchestration
- ✅ **CI/CD workflows**: Use direct npm/pytest commands for cross-platform reliability

**Benefits of Local-Only Approach**:
- ✅ Developers get consistent quality gates via pre-commit/pre-push hooks
- ✅ CI remains simple, fast, and cross-platform compatible
- ✅ No complex PowerShell Core compatibility layer needed
- ✅ Tool optimized for its primary use case (local development)

**Alternative Considered**: PowerShell Core compatibility refactoring
- **Estimated effort**: 2-4 hours for module system redesign
- **Complexity**: High (module loading, path normalization, cross-platform testing)
- **ROI**: Low (CI already has simple, working npm/pytest commands)

#### security-scanner.ps1 → Pre-commit Hook ✅ COMPLETE
**Status**: ✅ Integrated into pre-commit hook (November 3, 2025)
**Implementation**:
- Runs after test-runner.ps1 quality gates pass
- Uses `-Quick` mode for fast scans (~10-20 seconds)
- Blocks commits with security issues
- Provides actionable guidance for fixes

**Benefits**:
- Security scoring before every commit
- Early detection of code pattern issues (eval, innerHTML, hardcoded secrets)
- Consistent security baseline tracking
- Local-only (Windows PowerShell tool, proven strategy)

### ⚠️ Pending Integrations

#### security-scanner.ps1 → CI Workflows
**Problem**: Custom npm audit → SARIF conversion in `security.yml`, could be replaced
**Impact**: Missing security scoring, baseline tracking, code pattern analysis in CI

**Current approach** (`.github/workflows/security.yml`):
```yaml
- run: npm audit --json > npm-audit.json
- run: node convert-npm-audit.js  # Custom SARIF converter
```

**Recommended approach** (if pursuing CI integration):
```yaml
- name: Run security scanner
  run: |
    pwsh -ExecutionPolicy Bypass -File ./tools/security-scanner.ps1 `
      -Deep -CIMode
```

**Benefits**:
- Security scoring (0-100 scale)
- Baseline tracking (compare against historical scans)
- Code pattern detection (eval, innerHTML, hardcoded secrets)
- Integrated with CodeQL and dependency scanning

**Evaluation Needed**:
- Same PowerShell cross-platform limitations as test-runner.ps1
- Current npm audit → SARIF conversion already works
- ROI analysis: 30-45 minutes integration + potential compatibility issues
- Recommendation: Keep local-only (pre-commit already integrated ✅)

**Estimated time**: 30-45 minutes (workflow update) + compatibility analysis

### 🎯 Integration Plan

**Phase 1: Pre-commit Hooks** ✅ COMPLETE
- [x] Install `setup-precommit-hooks.ps1` (creates 3 hooks)
- [x] Test pre-commit quality gates
- [x] Test pre-push comprehensive checks
- [x] Document emergency bypass procedure

**Phase 2: CI/CD Workflows** ✅ COMPLETE (Local-only strategy)
- [x] Evaluate `test-runner.ps1` CI integration (November 3, 2025)
- [x] Decision: Keep local-only due to cross-platform limitations
- [x] Add `security-scanner.ps1` to pre-commit hook (November 3, 2025)
- [x] Validate hook execution with test commit
- [x] Update documentation (`checklists.md`, `tools/README.md`)

**Future Considerations** (Optional):
- [ ] Evaluate `security-scanner.ps1` CI integration (same limitations as test-runner.ps1)
- [ ] Consider Windows-only CI runner for PowerShell tools (infrastructure overhead)
- [ ] Monitor CI health and pass rates post-revert

**Phase 3: Monitoring & Refinement** ⏳ PENDING
- [ ] Track test execution times (pre/post integration)
- [ ] Monitor CI/CD pass rates
- [ ] Gather developer feedback on hook performance
- [ ] Optimize coverage thresholds based on data
- [ ] Document lessons learned

### 📋 Quick Reference

**Emergency Bypass** (use sparingly!):
```powershell
# Skip pre-commit hook
git commit --no-verify -m "emergency: critical fix"

# Skip pre-push hook
git push --no-verify

# Use bypass utility
.\tools\bypass-hooks.ps1 -Commit "emergency: production hotfix"
```

**Manual Tool Execution**:
```powershell
# Test runner (comprehensive)
.\tools\test-runner.ps1 -PreCommit -Verbose

# Security scanner (deep scan)
.\tools\security-scanner.ps1 -Deep

# Codebase analysis (project metrics)
.\tools\codebase-analyzer.ps1 -OutputFormat markdown
```

**Hook Management**:
```powershell
# Reinstall hooks
.\tools\setup-precommit-hooks.ps1

# Uninstall hooks
.\tools\setup-precommit-hooks.ps1 -UninstallHooks

# Test hook setup
.\tools\setup-precommit-hooks.ps1 -DryRun
```

---

## 🎯 Code Quality Implementation Checklist

### ✅ Pre-commit Hook Setup
- [x] **Husky installed** (v9.1.7) - Git hooks management
- [x] **lint-staged installed** (v16.2.3) - Staged file processing
- [x] **Pre-commit hook** created (`.husky/pre-commit`)
- [x] **package.json configured** with lint-staged rules
- [x] **ESLint integration** (`next lint --fix`)
- [x] **Prettier integration** (auto-formatting)
- [x] **Prepare script** added for hook installation
- [x] **Documentation updated** with usage instructions

**Validation:** ✅ Tested and working - blocks commits with quality issues

### ✅ Code Formatting Standards
- [x] **Prettier installed** (v3.4.2) with configuration
- [x] **`.prettierrc.json` created** with project standards:
  - Semi-colons: Required
  - Quotes: Single quotes preferred
  - Line width: 100 characters max
  - Tab width: 2 spaces (no tabs)
  - Trailing commas: ES5 style
- [x] **`.prettierignore` configured** (excludes build dirs)
- [x] **Pre-commit integration** active
- [x] **VS Code integration** (format on save)

**Validation:** ✅ All files format consistently across team

### ✅ Dependency Management (Renovate)
- [x] **Renovate bot active** (v41.159.4, Community/Free plan)
- [x] **Configuration deployed** (`renovate.json` in project root)
- [x] **Smart grouping configured**:
  - Frontend/Backend separation
  - React ecosystem updates
  - Testing tools (vitest, playwright, pytest)
  - Security patches (auto-merge enabled)
- [x] **Auto-merge rules**:
  - Security patches: Immediate (0-day wait)
  - React ecosystem: 3-day stability window
  - Major updates: Manual review required
- [x] **PR limits set** (5 concurrent, 2/hour)
- [x] **Lock file maintenance** (monthly, first Monday)
- [x] **Multi-ecosystem support** (npm, pip, Docker, Actions)

**Validation:** ✅ Active monitoring, lock files sync atomically
**ROI:** 10-15 hours/year saved vs manual lock file fixes

### ✅ Dependency Conflict Resolution

> **📚 Pattern Library**: [Conflict Resolution Pattern](../architecture/patterns/dependencies/conflict-resolution.md)
>
> **Quick Summary**: Systematic 6-step approach to resolve dependency conflicts in Renovate PRs. Includes decision tree for 4 solution options (Upgrade 1-2h, Pin 5min, Replace 3-4h, Wait ∞) with time estimates and real Session 30 Werkzeug/openapi-core example.

**When to use**: Renovate PRs failing CI due to dependency incompatibility

**Quick Checklist**:
- [ ] **Identify conflict pattern** (~5 min): `gh pr checks` → Analyze failure patterns
- [ ] **Analyze error logs** (~10 min): `gh run view --log-failed` → Find "ResolutionImpossible" errors
- [ ] **Root cause analysis** (~15 min): Check versions, verify latest available, grep codebase usage
- [ ] **Choose solution** (~15 min): Upgrade (1-2h), Pin (5min) ✅, Replace (3-4h), Wait (∞)
- [ ] **Implement fix** (~5-10 min): Update requirements.txt + renovate.json, close PR, commit
- [ ] **Monitor follow-up**: Weekly version checks, CVE monitoring, 30-day review

**Most Common Solution**: **Pin temporarily** (5 minutes) when conflicting package is LATEST

### ✅ VS Code Workspace
- [x] **Settings optimized** (`.vscode/settings.json`):
  - Format on save enabled
  - ESLint auto-fix on save
  - Organize imports automatically
  - Trim whitespace on save
  - TypeScript strict configuration
- [x] **Extensions recommended** (`.vscode/extensions.json`):
  - Prettier, ESLint, Python, GitLens, Docker
- [x] **Workspace configuration** ready for team collaboration

**Validation:** ✅ Consistent development environment across team

---

## 🚀 Pre-Merge Checklist

### Code Quality Requirements
- [ ] **No ESLint errors** (enforced by pre-commit)
- [ ] **No TypeScript compilation errors**
- [ ] **All tests passing** (unit, integration, E2E)
- [ ] **Code coverage maintained** (80%+ for critical paths)
- [ ] **No `console.log` statements** in production code
- [ ] **Proper error handling** implemented
- [ ] **Type safety maintained** (minimal `any` usage)

### Testing Requirements
- [ ] **Unit tests added/updated** for new functionality
- [ ] **Integration tests cover** key workflows
- [ ] **API contract tests pass** (if API changes)
- [ ] **Security tests pass** (auth, validation, XSS protection)
- [ ] **Performance tests meet benchmarks**
- [ ] **Accessibility tests pass** (WCAG compliance)
- [ ] **Visual regression tests** (if UI changes)

### Documentation Requirements
- [ ] **README updated** (if setup changes)
- [ ] **API documentation updated** (if endpoints changed)
- [ ] **Inline code comments** for complex logic
- [ ] **Type definitions documented** (interfaces, types)
- [ ] **Breaking changes documented**
- [ ] **Migration guide provided** (if needed)

### Security & Performance
- [ ] **Input validation implemented**
- [ ] **Authentication/authorization correct**
- [ ] **No sensitive data in logs**
- [ ] **Environment variables used** (no hardcoded secrets)
- [ ] **Performance impact assessed**
- [ ] **Bundle size impact measured** (frontend)
- [ ] **Database queries optimized** (backend)

### Deployment Pipeline
- [ ] **All automated checks passing**
- [ ] **Build completes successfully**
- [ ] **Deployment ready** (if production branch)
- [ ] **No merge conflicts** with target branch
- [ ] **Branch up to date** with latest main/develop

---

## 📊 Feature Implementation Checklist

### API Development
- [ ] **Endpoint specification** designed (OpenAPI/Swagger)
- [ ] **Input validation** implemented (Pydantic models)
- [ ] **Authentication required** (if protected endpoint)
- [ ] **Error handling** with proper HTTP status codes
- [ ] **Rate limiting** considered
- [ ] **Logging implemented** (structured logging)
- [ ] **Unit tests** for business logic
- [ ] **Integration tests** for full workflow
- [ ] **API documentation** generated/updated

### Frontend Component Development
- [ ] **TypeScript interfaces** defined for props/state
- [ ] **Accessibility attributes** included (ARIA, roles)
- [ ] **Error boundaries** implemented for fault tolerance
- [ ] **Loading states** handled gracefully
- [ ] **Empty states** designed and implemented
- [ ] **Responsive design** works on all screen sizes
- [ ] **Performance optimized** (memoization, lazy loading)
- [ ] **Unit tests** for component logic
- [ ] **Visual regression tests** for UI consistency
- [ ] **Storybook stories** created (if using)

### Database Changes
- [ ] **Migration scripts** created and tested
- [ ] **Rollback plan** prepared
- [ ] **Index optimization** considered
- [ ] **Data integrity** constraints added
- [ ] **Performance impact** assessed
- [ ] **Backup verification** before deployment
- [ ] **Test data** migration validated

---

## 🔐 Security Implementation Checklist

### Cryptographic Standards
- [x] **Hash algorithms**: Use SHA-256 (never MD5 or SHA-1)
  - ✅ redis_cache.py: SHA-256 for cache keys
  - ✅ performance_optimizer.py: SHA-256 for query hashing
  - Pattern: `hashlib.sha256(data.encode()).hexdigest()`
- [ ] **Encryption**: AES-256-GCM for sensitive data at rest
- [ ] **TLS**: TLS 1.3 minimum for data in transit
- [ ] **Key rotation**: Implement regular key rotation schedule

### Error Handling & Logging

**Secure Logging Pattern** (CRITICAL - prevents CWE-117 log injection):
```python
# ✅ GOOD - Structured logging
logger.error(
    "Generic descriptive message",  # NO user data in message
    exc_info=True,                  # Stack trace for debugging
    extra={"field": user_value},    # User data in 'extra' only
)

# ❌ BAD - String interpolation with user data
logger.error(f"Error for user {username}")  # LOG INJECTION RISK!
```

**Security Checklist**:
- [x] **Secure logging patterns**: Structured logging applied
  - ✅ auth.py: login_route(), register_route(), google_auth_route()
  - ✅ CWE-117 (Log Injection) eliminated
  - ✅ OWASP A09:2021 (Security Logging) compliant
  - Pattern: `extra` parameter for user-provided data
- [x] **No stack trace exposure**: Full traces logged internally only
  - Pattern: `logger.error("Context", exc_info=True, extra={...})`
  - Client: `HTTPException(500, "Generic error message")`
- [ ] **Log sanitization**: Remove sensitive data before logging
- [ ] **Monitoring**: Alert on security-relevant errors
- [ ] **Retention**: Define log retention policies

### Python Module Export Validation

**Export Validation Pattern**:
```python
# ✅ GOOD - __all__ matches actual definitions
__all__ = ["function1", "Class1", "CONSTANT1"]

def function1(): ...
class Class1: ...
CONSTANT1 = "value"

# ❌ BAD - Exports non-existent symbols
__all__ = ["function2"]  # function2 doesn't exist in module!
```

**Benefits**:
- Prevents ImportError on `from module import *`
- Improves IDE autocomplete accuracy
- Catches dead code and outdated exports

### Authentication & Authorization
- [ ] **JWT tokens** properly implemented and validated
- [ ] **Password hashing** using secure algorithms (bcrypt)
- [ ] **Session management** secure (httpOnly cookies)
- [ ] **Role-based access control** implemented
- [ ] **API key management** secure
- [ ] **Token expiration** handled properly
- [ ] **Refresh token** rotation implemented

### Input Validation & Sanitization
- [ ] **Server-side validation** for all inputs
- [ ] **SQL injection prevention** (parameterized queries)
- [ ] **XSS prevention** (input sanitization, CSP headers)
- [ ] **CSRF protection** implemented
- [ ] **File upload validation** (type, size, content)
- [ ] **Rate limiting** on sensitive endpoints
- [ ] **Input length limits** enforced

### Security Headers & Configuration
- [ ] **HTTPS enforced** in production
- [ ] **Security headers** configured (CSP, HSTS, X-Frame-Options)
- [ ] **CORS configuration** restrictive and appropriate
- [ ] **Environment variables** for all secrets
- [ ] **Database credentials** secured
- [ ] **Third-party API keys** protected
- [ ] **Error messages** don't leak sensitive information

---

## 🤖 Renovate PR Review Checklist

> **Status**: ✅ Active - Renovate bot managing dependencies (Session 29)
> **Dashboard**: https://developer.mend.io/github/ericsocrat/Lokifi
> **ROI**: 10-15 hours/year saved vs manual lock file fixes

### Initial Assessment (Every PR)
- [ ] **CI status checked** - All workflows must pass (90%+ pass rate minimum)
- [ ] **Version change identified** - Patch/Minor/Major?
- [ ] **Changelog reviewed** - Read release notes for breaking changes
- [ ] **Impact scope assessed** - Frontend/Backend/Both/Infrastructure?
- [ ] **Security classification** - Is this a security patch?

### Risk Categorization

**Patch Updates (e.g., 1.2.3 → 1.2.4):**
- [ ] **Auto-merge eligible** - If CI passes and no breaking changes
- [ ] **Review changelog** - Quick scan for unexpected changes
- [ ] **Merge command**: `gh pr review <pr-number> --approve && gh pr merge <pr-number> --auto --squash`

**Minor Updates (e.g., 1.2.0 → 1.3.0):**
- [ ] **Breaking changes check** - Review changelog thoroughly
- [ ] **Deprecation warnings** - Check for deprecated API usage
- [ ] **Local testing** - Run affected test suites locally
- [ ] **Bundle size impact** (frontend) - Check for significant increases
- [ ] **Merge command**: `gh pr review <pr-number> --approve && gh pr merge <pr-number> --squash`

**Major Updates (e.g., 1.0.0 → 2.0.0):**
- [ ] **Breaking changes documented** - List all breaking changes
- [ ] **Migration guide reviewed** - Follow official upgrade documentation
- [ ] **Local full testing** - Run ALL tests, not just affected ones
- [ ] **Production testing plan** - Prepare rollback strategy
- [ ] **Code search** - Find all usages of affected APIs
- [ ] **Team review** (if applicable) - Get second pair of eyes
- [ ] **Merge command**: `gh pr review <pr-number> --approve && gh pr merge <pr-number> --squash`

### Local Testing Procedures

**Frontend Dependency Testing:**
```powershell
# 1. Checkout PR branch
gh pr checkout <pr-number>

# 2. Install dependencies
cd apps/frontend
npm install

# 3. Run type checking
npm run type-check

# 4. Run tests
npm run test

# 5. Build production bundle
npm run build

# 6. Start dev server and smoke test
npm run dev
# Test critical user flows manually
```

**Backend Dependency Testing:**
```powershell
# 1. Checkout PR branch
gh pr checkout <pr-number>

# 2. Activate virtual environment
cd apps/backend
.\venv\Scripts\Activate.ps1

# 3. Install dependencies
pip install -r requirements.txt

# 4. Run tests
pytest

# 5. Run with coverage
pytest --cov

# 6. Start dev server and smoke test
uvicorn app.main:app --reload
# Test critical API endpoints manually
```

### CI Failure Investigation

**🔴 CRITICAL - Always Fix CI Infrastructure Issues First:**
Before merging ANY Renovate PR, ensure CI is healthy:
- [ ] **Verify pass rate** ≥ 90% on main branch
- [ ] **Check failing workflows** - Are multiple PRs failing identically?
- [ ] **Compare with main** - Does same test pass on main branch?

**If ANY Renovate PR fails CI:**
- [ ] **Get failure logs**: `gh run view <run-id> --log-failed`
- [ ] **Identify failure pattern**: Real tests vs summary jobs vs infrastructure
- [ ] **Check other PRs**: Is this pattern consistent across multiple PRs?

### Failure Pattern Recognition

**Pattern 1: Summary Job Failures** ✅ SAFE TO MERGE (with validation)
- **Symptoms**: Individual matrix jobs pass, summary jobs fail
- **Validation**: Check individual test results, NOT summaries
- **Decision**: Merge if individual tests pass (≥75% pass rate)

**Pattern 2: Real Test Failures** 🚨 INVESTIGATE REQUIRED
- **Symptoms**: Actual backend/frontend tests failing across multiple Python/Node versions
- **Validation**: Get test logs, review changelogs for breaking changes
- **Decision**: HOLD until code fixes applied

**Pattern 3: Infrastructure Failures** 🔧 FIX CI FIRST
- **Symptoms**: All PRs failing identically, same workflow failures
- **Validation**: Check if main branch also failing
- **Decision**: Fix CI before merging ANY PRs

### Post-Merge Verification
- [ ] **CI on main branch** - Verify merge didn't break main
- [ ] **Deployment successful** - Check production deployment logs
- [ ] **Health checks pass** - All services responding normally
- [ ] **Error monitoring** - Watch for new errors in Sentry/logs
- [ ] **Performance metrics** - Verify no performance degradation
- [ ] **Rollback ready** - Be prepared to revert if issues arise

---

## 📈 Performance Implementation Checklist

### Frontend Optimization
- [ ] **Code splitting** implemented for routes
- [ ] **Lazy loading** for non-critical components
- [ ] **Image optimization** (next/image or similar)
- [ ] **Bundle analysis** performed (Next.js Bundle Analyzer)
- [ ] **Caching strategies** implemented (SWR, React Query)
- [ ] **Memoization** used appropriately (useMemo, useCallback)
- [ ] **Tree shaking** optimized (ES modules)
- [ ] **Critical CSS** identified and inlined
- [ ] **Web Vitals** measured and optimized

### Backend Optimization
- [ ] **Database query optimization** (indexes, query analysis)
- [ ] **Caching implemented** (Redis for session/API data)
- [ ] **Async operations** used for I/O bound tasks
- [ ] **Connection pooling** configured
- [ ] **Response compression** enabled (gzip)
- [ ] **Pagination** implemented for large datasets
- [ ] **Background tasks** for heavy operations
- [ ] **Resource limits** configured (memory, CPU)

### CI Performance Testing Best Practices

**Key Principle**: Performance tests measure load metrics, NOT content validity
- Performance tests: Measure page load times, resource loading, rendering speed
- Functional tests: Verify content exists, interactions work, user flows complete
- ❌ Anti-pattern: Mixing concerns (checking h1 exists in performance test)

**CI Environment Characteristics**:
- **150-200% slower** than local development
- Shared CPU resources (GitHub-hosted runners)
- Higher network latency (external API calls)
- Cold start overhead (no warm cache)
- Slower I/O (disk, network operations)

**Performance Budget Guidelines**:

```typescript
// Local Development Budgets (ideal conditions)
const localBudgets = {
  load: 3000,                 // 3 seconds
  domContentLoaded: 2000,     // 2 seconds
  firstContentfulPaint: 2000, // 2 seconds
};

// CI Environment Budgets (realistic thresholds)
const ciBudgets = {
  load: 8000,                 // 8 seconds (2.67x local)
  domContentLoaded: 4000,     // 4 seconds (2x local)
  firstContentfulPaint: 4000, // 4 seconds (2x local)
};

// Formula: CI_BUDGET = LOCAL_BUDGET × 2.5 (conservative estimate)
```

---

## 🧪 Testing Implementation Checklist

### Unit Testing
- [ ] **Test coverage** ≥80% for new code
- [ ] **Edge cases** covered (empty inputs, errors)
- [ ] **Mocking** used appropriately (external dependencies)
- [ ] **Test isolation** ensured (no shared state)
- [ ] **Descriptive test names** (behavior-focused)
- [ ] **AAA pattern** followed (Arrange, Act, Assert)
- [ ] **Parameterized tests** for multiple scenarios

### Integration Testing
- [ ] **API endpoints** tested end-to-end
- [ ] **Database operations** tested with test DB
- [ ] **Authentication flows** validated
- [ ] **Error scenarios** tested (network failures, timeouts)
- [ ] **Data validation** tested (malformed inputs)
- [ ] **Cross-service communication** validated

### Backend Integration Testing

**Purpose**: Test database-dependent features that cannot be mocked

**Infrastructure**:
- [x] **integration_db_session fixture** created (conftest.py)
  - Real PostgreSQL database with transaction rollback
  - Automatic table creation/deletion per test
  - Configurable via TEST_DATABASE_URL environment variable

**Test Patterns**:
```python
@pytest.mark.asyncio
@pytest.mark.integration  # Mark tests for selective execution
class TestServiceIntegration:
    async def test_database_feature(integration_db_session):
        # Real database operations
```

**Running Integration Tests**:
```bash
# Run only integration tests (requires PostgreSQL)
pytest -m integration

# Skip integration tests (for local dev without database)
pytest -m "not integration"

# CI/CD execution (automatic on push)
# Workflow: .github/workflows/integration.yml
```

**When to Use**:
- ✅ Testing SQLAlchemy `server_default` values
- ✅ Testing database-level pagination
- ✅ Testing constraints and triggers
- ✅ Testing complex transactions
- ❌ Simple CRUD operations (use mocks)
- ❌ Business logic without database features

### E2E Testing
- [ ] **Critical user paths** automated
- [ ] **Cross-browser compatibility** tested
- [ ] **Mobile responsiveness** validated
- [ ] **Accessibility** tested with screen readers
- [ ] **Performance** measured under load
- [ ] **Error handling** tested (server errors, network issues)

---

## 🚀 Deployment Checklist

### Pre-Deployment
- [ ] **All tests passing** in CI/CD
- [ ] **Security scan** completed (dependencies, code)
- [ ] **Performance benchmarks** met
- [ ] **Database migrations** ready
- [ ] **Environment configuration** validated
- [ ] **Rollback plan** prepared
- [ ] **Monitoring alerts** configured

### Deployment Process
- [ ] **Blue-green deployment** or similar zero-downtime strategy
- [ ] **Health checks** passing post-deployment
- [ ] **Database migrations** executed successfully
- [ ] **Cache invalidation** performed if needed
- [ ] **CDN cache** cleared if static assets updated
- [ ] **Smoke tests** executed on production

### Post-Deployment
- [ ] **Application monitoring** confirms stability
- [ ] **Error rates** within normal parameters
- [ ] **Performance metrics** stable
- [ ] **User acceptance** testing completed
- [ ] **Documentation updated** (if public-facing changes)
- [ ] **Team notification** sent with changelog

---

## 📝 Documentation Checklist

### Code Documentation
- [ ] **README files** updated with changes
- [ ] **API documentation** generated and current
- [ ] **Inline comments** for complex algorithms
- [ ] **Function documentation** (JSDoc, docstrings)
- [ ] **Type definitions** properly documented
- [ ] **Configuration examples** provided

### User Documentation
- [ ] **Setup instructions** validated and current
- [ ] **User guides** updated for new features
- [ ] **Troubleshooting guides** include common issues
- [ ] **FAQ updated** with recent questions
- [ ] **Video tutorials** created (if complex features)
- [ ] **Migration guides** for breaking changes

---

## 🔄 Maintenance Checklist (Weekly)

### Code Quality
- [ ] **Dependency updates** reviewed and applied
- [ ] **Security advisories** checked and addressed
- [ ] **Code coverage** metrics reviewed
- [ ] **Performance metrics** analyzed
- [ ] **Error logs** reviewed for patterns
- [ ] **Technical debt** items prioritized

### Documentation & Process
- [ ] **Documentation accuracy** verified
- [ ] **Process improvements** identified
- [ ] **Team feedback** collected and addressed
- [ ] **Tool effectiveness** evaluated
- [ ] **Checklist updates** based on learnings

---

## 🐛 CI/CD Test Failure Debugging

### Systematic Investigation Process

**Step 1: Get PR Status** (~2 minutes):
```powershell
gh pr checks <pr-number> --repo ericsocrat/Lokifi
```

**Identify failure patterns**:
- Summary jobs failing? → Could be aggregation OR real failures
- Python version-specific? → Environment or compatibility issue
- Infrastructure failures? → Database/service configuration

**Step 2: Retrieve Detailed Logs** (~5 minutes):
```powershell
# Get run ID from failing job
gh run list --repo ericsocrat/Lokifi --branch <branch> --limit 5

# Get detailed failure logs
gh run view <run-id> --repo ericsocrat/Lokifi --log-failed | Select-String -Pattern "FAILED|ERROR" -Context 3
```

**Step 3: Decision Tree** (~5-10 minutes):

**Pattern A: Real Test Failures**
- **Symptoms**: Specific test names in output: `FAILED tests/services/test_ai.py::test_name`
- **Root Causes**: Method signature changes, breaking changes in dependencies, async/await compatibility
- **Action**: Fix test code or production code
- **Time**: 15-45 minutes per test

**Pattern B: Integration Test Architecture Issues**
- **Symptoms**: `ConnectionRefusedError`, database connection errors **locally**, tests **pass in CI**
- **Root Cause**: Integration tests misplaced in unit test directory
- **Solutions**: Refactor to unit tests (mock dependencies), move to `tests/integration/`, or mark as integration
- **Time**: 15 minutes - 3 hours depending on solution

**Pattern C: Workflow Aggregation Issues**
- **Symptoms**: Summary job fails but ALL matrix jobs pass
- **Root Cause**: YAML conditional logic treating `skipped` as `failure`
- **Action**: Fix workflow YAML conditional logic
- **Time**: 10-20 minutes

**Pattern D: Infrastructure Failures**
- **Symptoms**: PostgreSQL connection errors, Redis unavailable errors, service health check timeouts
- **Root Cause**: Missing service configurations in workflow
- **Action**: Add PostgreSQL/Redis services to workflow YAML
- **Time**: 15-30 minutes

### Key Principles

**1. Evidence-Based Debugging** 📊:
- ✅ Always check logs BEFORE modifying code
- ✅ Retrieve full test output with `gh run view --log-failed`
- ❌ Don't assume root cause without evidence
- ❌ Don't modify workflows without understanding failures

**2. Pattern Recognition** 🔍:
- Summary job failures ≠ Always workflow bugs
- Real test failures have specific test names in output
- Integration tests may pass in CI, fail locally
- Version-specific failures suggest compatibility issues

**3. Systematic Approach** 📝:
1. Get PR status (2 min)
2. Retrieve logs (5 min)
3. Categorize failure pattern (5 min)
4. Apply appropriate solution (15 min - 3 hours)
5. Verify fix locally if possible
6. Document findings for future reference

---

**Remember**: Checklists are living documents - update them based on what you learn from each project cycle! 🚀
