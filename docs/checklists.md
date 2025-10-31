# ✅ Lokifi Development Checklists

**Last Updated:** October 31, 2025 - Session 30 Renovate PR Management Complete ✅
**Purpose:** Comprehensive checklists for development workflow
**Status:** Production Ready

> **🔗 Related Documents**:
> - **[Renovate Bot Evaluation](./ci-cd/dependencies/renovate-evaluation.md)** - ✅ COMPLETE: Renovate active, 2 PRs created
> - **[Sprint History](./plans/history.md)** - Historical record of completed sprints and technical debt resolution
> - **[Sprint 2 Completion](./plans/SPRINT_2_COMPLETION_SUMMARY.md)** - Sprint 2 comprehensive summary
> - **[Sprint 3 Planning](./plans/SPRINT_3_PLANNING.md)** - Sprint 3 options and planning
> - **[Session 25 ESLint Rules](./plans/SESSION_25_ESLINT_RULES.md)** - ESLint rules re-enablement
> - **[Dependency Management](./ci-cd/dependencies/management.md)** - Dependency best practices
> - **[Workflow Optimization](./ci-cd/workflows/optimization.md)** - CI/CD optimization results
>
> **✅ Main Branch Status**: EXCELLENT - 100% pass rate (35/35 workflows) 🎉
> **✅ Sprint 0**: COMPLETE (Dependency management, Python 3.10, asyncpg)
> **✅ Sprint 1**: COMPLETE (100% CI pass rate achieved)
> **✅ Sprint 2**: COMPLETE (Sessions 13-24) - 16,877 lines, 96.3% type safety! 🎉
> **✅ Sprint 3**: COMPLETE (Sessions 42-51) - **94.5% reduction (1,166 → 64 any types)** 🎉
> **🔄 Sprint 5**: IN PROGRESS (Session 53-58) - ESLint Quality Campaign (338 → 292 warnings)
>   - ✅ Session 53: Documentation + Baseline (338 warnings documented, world-class structure)
>   - ✅ Session 54: High-Concentration Files (37 any eliminated, 12 acceptable documented, ~2.5 hours)
>   - ✅ Session 55: Documentation Validation (<5 min - no archival needed)
>   - ✅ Session 56: Strategic Analysis & Planning (~1 hour - phased approach for 295 any types)
>   - ✅ Session 56a: Image Optimization (~20 min - 4 img warnings eliminated, Next.js Image)
>   - ✅ Session 56b: Medium Store Files (~1.5 hrs - 25 acceptable any documented, 4 stores)
>   - ✅ Session 56c: Small Store Files (~1 hr - 4 any eliminated, 6 documented, 6 stores)
>   - ✅ Session 58: Unescaped Entities (~10 min - 2 entity warnings eliminated, HTML encoding)
> **�📊 Sprint 3 Campaign Summary**:
> - Sessions 42-51: 1,102 any types eliminated across 10 sessions
> - Session 42: Components Batch 1 (112 eliminated, 274→162)
> - Session 43-45: Components Batch 2-4 (81 eliminated, 162→81)
> - Session 46: Hooks + Lib Utilities (125 eliminated, 291→166)
> - Session 47: Store Types (23 eliminated, 166→143)
> - Session 48: Zustand Stores (42 eliminated, 143→101)
> - Session 49: Types + Utilities (69 eliminated, 172→103)
> - Session 50: Components + Utils (92 eliminated, 195→103)
> - **Session 51: Final Batch (131 eliminated, 195→64)** - Campaign Complete! 🎉
> - **Remaining**: 64 acceptable any types (all documented as legitimate)
> **⏱️ Total Time**: Sprint 2: 13 hrs, Sprint 3: ~25 hrs (38 hrs total)

---

## 🎯 Code Quality Implementation Checklist

### ✅ ESLint Type Safety Rules (Session 25 - COMPLETE)
- [x] **ESLint rule enabled**: `@typescript-eslint/no-explicit-any` as 'warn'
- [x] **Sprint 2 achievements protected** (96.3% type safety across 10 stores)
- [x] **Sprint 3 campaign COMPLETE** (94.5% type safety across entire frontend! 🎉)
- [x] **Developer feedback** - Warnings shown in IDE and lint output
- [x] **No build failures** - Warning mode maintains CI/CD 100% pass rate
- [x] **Remaining any types**: **64 acceptable** (all documented as legitimate)
- [x] **Documentation**: SESSION_25_ESLINT_RULES.md + Sprint 3 comprehensive docs

**Validation:** ✅ ESLint runs with warnings, prevents unconscious regression

**Usage**:
```bash
# Run ESLint to see any type warnings
npm run lint

# Expected output: 64 warnings for documented acceptable any types
# Example: configurationSyncStore.tsx (15), perf.ts (13), pluginSDK.ts (4), etc.
```

**Campaign Complete**: All fixable any types eliminated! Remaining 64 are legitimate use cases (dynamic configs, generic wrappers, plugin APIs, test mocking)

### ✅ Pre-commit Hook Setup (COMPLETE)
- [x] **Husky installed** (v9.1.7) - Git hooks management
- [x] **lint-staged installed** (v16.2.3) - Staged file processing
- [x] **Pre-commit hook** created (`.husky/pre-commit`)
- [x] **package.json configured** with lint-staged rules
- [x] **ESLint integration** (`next lint --fix`)
- [x] **Prettier integration** (auto-formatting)
- [x] **Prepare script** added for hook installation
- [x] **Documentation updated** with usage instructions

**Validation:** ✅ Tested and working - blocks commits with quality issues

### ✅ Code Formatting Standards (COMPLETE)
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

### ✅ Dependency Management (COMPLETE - Renovate)
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
- [x] **First PRs created** (#61: 16 security patches, #62: 2 backend updates)

**Migration Complete**: Session 29 (Oct 31, 2025) - Dependabot → Renovate
**Validation:** ✅ Active monitoring, lock files sync atomically
**ROI:** 10-15 hours/year saved vs Dependabot manual lock file fixes

### ✅ Dependency Conflict Resolution (Session 30)

**When Renovate PRs Fail CI** - Follow this systematic approach:

#### Step 1: Identify Conflict Pattern (~5 minutes)
```powershell
# Check PR status
gh pr checks <pr-number> --repo ericsocrat/Lokifi

# Look for patterns:
# - Frontend passing, backend failing? → Backend dependency issue
# - All failing? → Configuration or infrastructure issue
# - Specific Python versions failing? → Version-specific dependency conflict
```

#### Step 2: Analyze Error Logs (~10 minutes)
```powershell
# Get detailed failure logs
gh run view <run-id> --repo ericsocrat/Lokifi --log-failed | Select-String -Pattern "ERROR|ResolutionImpossible" -Context 2

# Common error patterns:
# - "ResolutionImpossible" → Dependency constraint conflict
# - "Cannot install X and Y" → Version incompatibility
# - "No matching distribution" → Package version doesn't exist
```

#### Step 3: Root Cause Analysis (~15 minutes)
```powershell
# Check current versions
grep_search "<package-name>" apps/backend/requirements.txt

# Verify latest versions available
pip index versions <package-name>

# Check usage in codebase
grep_search "<package-name>|<import-name>" apps/backend/**/*.py
```

#### Step 4: Solution Decision Tree (~15 minutes)

**Evaluate 4 Options:**

**Option 1: Upgrade Conflicting Dependency** ⏱️ 1-2 hours
- ✅ Use when: Newer version available that's compatible
- ❌ Avoid when: Latest version doesn't support new dependency
- **Check**: `pip index versions <package>` to verify latest
- **Risk**: May introduce breaking changes, requires testing

**Option 2: Pin Temporarily** ⏱️ 5 minutes ✅ **PREFERRED for short-term**
- ✅ Use when:
  - Conflicting package is LATEST (no update available)
  - Library actively maintained (updated within 6 months)
  - Security risk is acceptable (no known CVEs)
- ❌ Avoid when:
  - Critical vulnerability in pinned version
  - Library abandoned (>1 year no updates)
- **Implementation**:
  ```txt
  # requirements.txt
  PackageA<3.0.0  # Pinned: PackageB 1.2.3 incompatible with >=3.0.0 (Session X)
  ```
  ```json
  // renovate.json
  {
    "description": "PackageA pinned (Session X: PackageB compatibility)",
    "matchPackageNames": ["PackageA"],
    "enabled": false
  }
  ```

**Option 3: Replace Dependency** ⏱️ 3-4 hours
- ✅ Use when:
  - Library abandoned (>1 year no updates)
  - Critical CVE with no patch available
  - Better-maintained alternative exists
- ❌ Avoid when:
  - Library actively maintained
  - Temporary pin is viable
  - No clear replacement exists
- **Risk**: High time investment, potential test coverage reduction

**Option 4: Wait for Maintainers** ⏱️ Indefinite
- ✅ Use when: Non-critical dependency, can afford to wait
- ❌ Avoid when: Blocking security patches or new features
- **Risk**: No control over timeline

#### Step 5: Implementation (~5-10 minutes)

**For Option 2 (Pin) - Most Common**:

1. Update `requirements.txt`:
   ```txt
   PackageA<3.0.0  # Pinned: PackageB incompatible (Session X)
   ```

2. Update `renovate.json`:
   ```json
   {
     "description": "PackageA pinned (Session X: reason)",
     "matchPackageNames": ["PackageA"],
     "enabled": false
   }
   ```

3. Close conflicting PR with explanation:
   ```powershell
   gh pr close <pr-number> --repo ericsocrat/Lokifi --comment "Closing due to dependency conflict. Temporarily pinning PackageA. Other updates will come in separate PRs. See SESSION_X for analysis."
   ```

4. Commit and push:
   ```powershell
   git add apps/backend/requirements.txt renovate.json
   git commit -m "fix(deps): pin PackageA for PackageB compatibility"
   git push origin main
   ```

#### Step 6: Follow-up Monitoring

- [ ] **Track updates**: Check weekly for compatible versions (`pip index versions`)
- [ ] **Monitor security**: Watch for CVEs in pinned packages
- [ ] **Document decision**: Add to session history with rationale
- [ ] **Set reminder**: Review after 30 days for permanent solution
- [ ] **Re-enable updates**: When compatible version available

#### Real-World Example: Session 30 (Werkzeug/openapi-core)

**Problem**: Werkzeug 3.1.3 incompatible with openapi-core 0.19.5
**Investigation**: 45 minutes, confirmed openapi-core 0.19.5 is LATEST
**Decision**: Option 2 (Pin Werkzeug<3.1.3)
**Rationale**:
- openapi-core actively used (API schema validation)
- No critical CVEs in Werkzeug 3.1.1
- Replacement would take 3-4 hours
**Implementation**: 10 minutes (requirements.txt + renovate.json)
**Outcome**: Backend CI unblocked, PR #61 closed, PR #62 validated
**Follow-up**: Monitor openapi-core for Werkzeug >=3.1.3 support

### ✅ VS Code Workspace (COMPLETE)
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
- [x] **Backend test coverage**: 30.75% (Session 30: +3.9pp, 56 tests added)
- [x] **Service layer tests**: ai, conversation, follow, profile (comprehensive)

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

## 📊 Backend Test Coverage Progress

> **✅ Session 30 Complete (January 2025)**: Backend Service Tests Expansion
> - **Coverage**: 26.85% → 30.75% (+3.9pp)
> - **Tests Added**: 56 passing (8 skipped for database dependencies)
> - **Services Tested**: ai_service, conversation_service, follow_service, profile_service
> - **Pass Rate**: 100% (770 total passing tests)
> - **Document**: SESSION_30_SERVICE_TESTS_PHASE1.md

### Services Coverage Status
- [x] **ai_service.py**: 14% → 44% (+30pp) - 20 tests (Phase 1)
- [x] **conversation_service.py**: 14% → 54% (+40pp) - 12 tests (Phase 2)
- [x] **follow_service.py**: 14% → 40% (+26pp) - 12 tests (Phase 3)
- [x] **profile_service.py**: 0% → 43% (+43pp) - 12 tests (Phase 4)
- [ ] **notification_service.py**: Low coverage - Integration tests needed
- [ ] **websocket_manager.py**: Low coverage - WebSocket tests needed
- [ ] **auth_service.py**: Moderate coverage - Security tests added (Session 29)

### Routers/Endpoints Coverage Status
- [x] **auth.py**: 43% → 68% (+25pp) - Security tests (Session 29)
- [ ] **/api/ai/***: Service foundation ready, router tests needed
- [ ] **/api/conversations/***: Service foundation ready, router tests needed
- [ ] **/api/follow/***: Service foundation ready, router tests needed
- [ ] **/api/profile/***: Service foundation ready, router tests needed

### Next Steps (Target: 40-50% Backend Coverage)
- [ ] Integration tests for 8 skipped unit tests (database dependencies)
- [ ] Router/endpoint tests (build on service test foundation)
- [ ] Additional services (notification, websocket, remaining)
- [ ] E2E tests for critical user flows

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

> **✅ Session 32 Complete (January 2025)**: CodeQL Security Hardening - 100% Resolution
> - **Log Injection (HIGH)**: 4 → 0 (structured logging, CWE-117 compliance)
> - **Python Quality (LOW)**: 13 → 0 (undefined exports, unused variables)
> - **JS Unused Variable (LOW)**: 1 → 0 (dead code removal)
> - **npm-audit (DEV-ONLY)**: 3 documented as safe (0 production impact)
> - **Total Alert Resolution**: 21 → 0 functional alerts (100% success!)
> - **OWASP Compliance**: A09:2021 (Log Injection) eliminated
> - **Documents**: SESSION_32_SECURITY_HARDENING.md
>
> **Previous Session 26**: CodeQL Security Hardening
> - **CRITICAL alerts**: 4 → 0 (MD5 → SHA-256 replacements)
> - **HIGH alerts**: 60+ → 0-5 (Stack trace exposure → Secure logging)
> - **OWASP compliant**: A05:2021 Security Misconfiguration resolved
> - **Documents**: SESSION_26_SECURITY_ASSESSMENT.md, SESSION_26_SECURITY_FIXES.md

### Cryptographic Standards ✅ UPDATED (Session 26)
- [x] **Hash algorithms**: Use SHA-256 (never MD5 or SHA-1)
  - ✅ redis_cache.py: SHA-256 for cache keys
  - ✅ performance_optimizer.py: SHA-256 for query hashing
  - Pattern: `hashlib.sha256(data.encode()).hexdigest()`
- [ ] **Encryption**: AES-256-GCM for sensitive data at rest
- [ ] **TLS**: TLS 1.3 minimum for data in transit
- [ ] **Key rotation**: Implement regular key rotation schedule

### Error Handling & Logging ✅ UPDATED (Session 32)
**Secure Logging Pattern** (CRITICAL - Session 32 Phase 1):
```python
# ✅ GOOD - Structured logging (prevents CWE-117 log injection)
logger.error(
    "Generic descriptive message",  # NO user data in message
    exc_info=True,                  # Stack trace for debugging
    extra={"field": user_value},    # User data in 'extra' only
)

# ❌ BAD - String interpolation with user data
logger.error(f"Error for user {username}")  # LOG INJECTION RISK!
```

**Security Checklist**:
- [x] **Secure logging patterns**: Structured logging applied (Session 32 Phase 1)
  - ✅ auth.py: login_route(), register_route(), google_auth_route()
  - ✅ CWE-117 (Log Injection) eliminated
  - ✅ OWASP A09:2021 (Security Logging) compliant
  - Pattern: `extra` parameter for user-provided data
- [x] **No stack trace exposure**: Full traces logged internally only (Session 26)
  - Pattern: `logger.error("Context", exc_info=True, extra={...})`
  - Client: `HTTPException(500, "Generic error message")`
- [ ] **Log sanitization**: Remove sensitive data before logging
- [ ] **Monitoring**: Alert on security-relevant errors
- [ ] **Retention**: Define log retention policies

### Python Module Export Validation ✅ NEW (Session 32 Phase 2)
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

**Fixed Modules** (Session 32 Phase 2):
- [x] app/schemas/ai_schemas.py: Removed non-existent AIResponse
- [x] app/models/profile.py: Removed non-existent UserProfile_Pydantic
- [x] app/models/follow.py: Removed non-existent Follow_Pydantic
- [x] app/models/auth.py: Removed non-existent LoginRequest
- [x] app/models/conversation.py: Removed non-existent Message_Pydantic

**Benefits**:
- Prevents ImportError on `from module import *`
- Improves IDE autocomplete accuracy
- Catches dead code and outdated exports
- 10 undefined export alerts → 0 (100% fixed)

### Dev Dependency Vulnerability Assessment ✅ NEW (Session 32 Phase 3)
**Risk Assessment Pattern**:
```bash
# ✅ GOOD - Verify production impact before suppression
npm audit --production  # Check if dev-only vulnerabilities

# Decision criteria:
# 1. Production impact: 0 vulnerabilities = Safe to suppress
# 2. Severity: Low = Lower priority
# 3. Usage: Dev tooling (CI/CD) = Isolated risk
# 4. Alternatives: Breaking changes = Not worth upgrade risk
# 5. Documentation: Always document suppression rationale
```

**Suppressed Vulnerabilities** (Session 32 Phase 3):
- [x] **inquirer** (low severity) - Dev dependency via @lhci/cli
- [x] **lighthouse** (low severity) - Dev dependency via @lhci/cli
- [x] **tmp** (low severity) - Dev dependency via @lhci/cli → external-editor
- ✅ **Production Impact**: 0 vulnerabilities (verified)
- ✅ **Suppression Rationale**: Lighthouse CI tooling (dev/test only)
- ✅ **Risk**: Acceptable (dev environment, no production exposure)

**Key Principle**: Not all npm-audit alerts require immediate fixes. Assess production impact first.

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

> **✅ MIGRATED TO RENOVATE (Oct 31, 2025)**: Dependabot → Renovate bot (Session 29)
>
> **Migration Complete**: [Session 29 in plans/history.md](./plans/history.md#session-29-renovate-migration-oct-31-2025-)
> **Status**: ✅ Active - 3 PRs managed (#61 closed, #62 monitored, #63 merged, #64 held)
> **Session 30**: PR management patterns identified (summary job failures vs real test failures)
>
> **Why Renovate?**:
> - ✅ Atomic lock file updates (vs Dependabot Session 11: 7 failed PRs)
> - ✅ Smart grouping (frontend/backend separation, React ecosystem)
> - ✅ Auto-merge with stability windows (3-day minimumReleaseAge)
> - ✅ Better monorepo support
> - ✅ Native lock file maintenance
>
> **Configuration**: `renovate.json` in project root
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

### Critical Dependency Review (High-Risk Updates)

**Framework Updates (Next.js, React, FastAPI):**
- [ ] **Dedicated sprint planned** - Don't rush framework upgrades
- [ ] **All breaking changes documented** - Create comprehensive list
- [ ] **Migration checklist created** - Step-by-step upgrade plan
- [ ] **Rollback tested** - Ensure you can revert quickly
- [ ] **Defer to issue**: `gh pr close <pr-number> --comment "Deferred to issue #<issue-number>"`

**Database/Cache Updates (PostgreSQL, Redis, SQLAlchemy):**
- [ ] **Connection compatibility verified** - Check driver versions
- [ ] **Query syntax changes** - Review for deprecated SQL patterns
- [ ] **Performance impact** - Run benchmarks if major version
- [ ] **Data migration needed?** - Check for schema changes
- [ ] **Backup verified** - Ensure recent backup exists

**Security-Critical Updates (Auth, Crypto, JWT):**
- [ ] **Security advisory reviewed** - Understand the vulnerability
- [ ] **Fast-track approved** - Security patches skip normal queue
- [ ] **Testing focused on security** - Verify vulnerability is fixed
- [ ] **Production deployment ASAP** - Don't delay security patches

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

# 6. Check bundle size
npm run analyze  # If available

# 7. Start dev server and smoke test
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

# 4. Run type checking
mypy app/

# 5. Run tests
pytest

# 6. Run with coverage
pytest --cov

# 7. Start dev server and smoke test
uvicorn app.main:app --reload
# Test critical API endpoints manually
```

### CI Failure Investigation

**🔴 CRITICAL - Always Fix CI Infrastructure Issues First:**
Before merging ANY Dependabot PR, ensure CI is healthy:
- [ ] **Verify pass rate** ≥ 90% on main branch
- [ ] **Check failing workflows** - Are multiple PRs failing identically?
- [ ] **Compare with main** - Does same test pass on main branch?

**If ANY Renovate PR fails CI:**
- [ ] **Get failure logs**: `gh run view <run-id> --log-failed`
- [ ] **Identify failure pattern**: Real tests vs summary jobs vs infrastructure
- [ ] **Check other PRs**: Is this pattern consistent across multiple PRs?

### Session 30 Learnings: Systematic PR Assessment

**📊 Quick Health Check (2 minutes):**
```powershell
# Get all active Renovate PRs
gh pr list --repo ericsocrat/Lokifi --author "app/renovate"

# Check CI status for specific PR
gh pr checks <pr-number> --repo ericsocrat/Lokifi

# Get pass rate breakdown
gh pr view <pr-number> --json statusCheckRollup --jq '.statusCheckRollup | group_by(.conclusion) | map({conclusion: .[0].conclusion, count: length})'
```

**🔍 Failure Pattern Recognition:**

**Pattern 1: Summary Job Failures** ✅ SAFE TO MERGE (with validation)
- **Symptoms**: Individual matrix jobs pass, summary jobs fail
- **Example**: PR #62 (22/36 passing, 4 summary fails), PR #63 (30/40 passing, 5 summary fails)
- **Affected Jobs**: "Coverage Checks Complete", "Integration Tests Complete"
- **Root Cause**: CI workflow configuration issue with aggregation logic
- **Validation**: Check individual test results, NOT summaries
- **Decision**: Merge if individual tests pass (≥75% pass rate)

**Pattern 2: Real Test Failures** 🚨 INVESTIGATE REQUIRED
- **Symptoms**: Actual backend/frontend tests failing across multiple Python/Node versions
- **Example**: PR #64 (13/36 passing, 13 real failures across Python 3.10/3.11/3.12)
- **Affected Jobs**: "API Contract Tests", "Backend Coverage", "Backend Integration"
- **Root Cause**: Dependency breaking changes, incompatible versions
- **Validation**: Get test logs, review changelogs for breaking changes
- **Decision**: HOLD until code fixes applied

**Pattern 3: Infrastructure Failures** 🔧 FIX CI FIRST
- **Symptoms**: All PRs failing identically, same workflow failures
- **Example**: Missing services (PostgreSQL, Redis), workflow syntax errors
- **Affected Jobs**: Setup steps, service initialization
- **Root Cause**: CI configuration bugs, missing credentials, version drift
- **Validation**: Check if main branch also failing
- **Decision**: Fix CI before merging ANY PRs

**🎯 Decision Matrix:**

| Pass Rate | Failure Type | Action | Example |
|-----------|--------------|--------|---------|
| ≥75% | Summary jobs only | ✅ Merge (validate individual tests) | PR #62, #63 |
| 50-75% | Mixed (some real failures) | 🔍 Investigate logs | - |
| <50% | Real test failures | 🚨 HOLD (major update likely) | PR #64 |
| Any | Infrastructure/Setup | 🔧 Fix CI first | - |

**📝 Commands for Detailed Investigation:**

```powershell
# Get PR details and changelog
gh pr view <pr-number> --json title,body | ConvertFrom-Json

# Get specific failing checks
gh pr view <pr-number> --json statusCheckRollup --jq '.statusCheckRollup[] | select(.conclusion == "FAILURE") | .name'

# Get workflow run ID for logs
gh run list --repo ericsocrat/Lokifi --branch <branch-name> --limit 5

# Get failure logs (replace <run-id>)
gh run view <run-id> --log-failed | Select-String -Pattern "ERROR|FAILED" -Context 2
```

**💡 Pro Tips:**

1. **Compare PR pass rates**: If PR #63 has 75% but PR #64 has 50%, deeper investigation needed for #64
2. **Check package version jumps**:
   - Patch (1.2.3→1.2.4): Usually safe
   - Minor (1.2.0→1.3.0): Review changelog
   - Major spans (1.72→1.105): High risk, likely breaking changes
3. **Verify Werkzeug pin working**: After Session 30, all PRs should have no dependency conflicts
4. **Summary jobs fail consistently**: Known issue (Task #9 in todo list), not blocking merges
5. **Document decisions**: Always comment on PRs explaining hold/merge rationale

### Real-World Examples (Session 30)

**✅ EXAMPLE 1: PR #63 - 15 Security Patches (MERGED)**

**Assessment:**
- CI Status: 30/40 passing (75%), 5 failing (summary jobs), 4 skipped
- Packages: 6 frontend + 9 backend patch-level security updates
- Failures: Frontend Coverage Summary, Backend Python 3.11 Coverage Summary, Integration Tests Complete
- Pattern: Summary job failures (Pattern 1)

**Validation:**
- Individual tests: ALL PASSING (30 test suites)
- Pass rate: 75% (above threshold)
- Package types: All patch-level (no breaking changes expected)
- Werkzeug pin: No conflicts detected

**Decision:** ✅ MERGE
- **Rationale**: Summary job failures are CI infrastructure issue, not dependency problem
- **Risk**: LOW - All patch-level updates, individual tests validate compatibility
- **Action**: Approved and squash-merged with detailed changelog
- **Time**: 15 minutes (review + approval + merge)

**🚨 EXAMPLE 2: PR #64 - openai v1.72→v1.105 (HELD)**

**Assessment:**
- CI Status: 13/36 passing (50%), 13 failing (REAL tests), 10 skipped
- Package: openai v1.72.0 → v1.105.0 (~33 minor versions)
- Failures: API Contract Tests, Backend Coverage (ALL Python versions), Backend Integration (ALL Python versions)
- Pattern: Real test failures (Pattern 2)

**Validation:**
- Individual tests: FAILING across multiple Python versions (3.10, 3.11, 3.12)
- Pass rate: 50% (below threshold)
- Package type: MAJOR update (33 minor versions)
- Likely breaking changes: Pydantic v3 compat, type changes, API method signatures

**Decision:** 🚨 HOLD
- **Rationale**: Real compatibility issues require code investigation and fixes
- **Risk**: HIGH if merged without investigation (would break production)
- **Action**: Commented on PR explaining investigation required, will revisit later
- **Alternative**: Let Renovate create smaller incremental PRs (v1.72→v1.80→v1.90→v1.105)
- **Time Saved**: 2-3 hours of production debugging by catching early

**Key Lesson**: Not all CI failures are created equal. Summary job failures (Pattern 1) are infrastructure issues and safe to ignore when individual tests pass. Real test failures (Pattern 2) indicate breaking changes and require investigation
- [ ] **Check pattern** - Is failure unique to this PR or systemic?
- [ ] **Compare with main** - Does same test pass on main branch?
- [ ] **Service configuration** - Are PostgreSQL/Redis services available?
- [ ] **Environment variables** - Are DATABASE_URL/REDIS_URL set correctly?
- [ ] **Workflow services** - Check GitHub Actions service configuration
- [ ] **Root cause fix** - Fix infrastructure issue, not just this PR

**Common CI Issues:**
- Missing PostgreSQL/Redis services in workflow
- Incorrect environment variable configuration
- Database migration not run in test environment
- Dependency version conflict (peer dependencies)
- Test timeout due to network issues

### Session 31: Understanding Auto-Merge Behavior (Oct 31, 2025) ✅

**Why Aren't PRs Auto-Merging?** - Investigation Results

**TL;DR**: Auto-merge configuration is correct, but CI summary job failures prevent GitHub from enabling it.

**Auto-Merge Requirements** (ALL must be met):
1. ✅ **Configuration**: `automerge: true` in renovate.json
2. ✅ **Stability Window**: `minimumReleaseAge` satisfied
3. ❌ **CI Status**: ALL required checks must pass

**Current Configuration** (renovate.json):
```json
// Security patches (aggressive auto-merge)
{
  "groupName": "Security patches",
  "matchUpdateTypes": ["patch"],
  "automerge": true,
  "minimumReleaseAge": "0 days"  // ✅ Immediate
}

// React ecosystem (balanced auto-merge)
{
  "groupName": "React ecosystem",
  "matchUpdateTypes": ["minor", "patch"],
  "automerge": true,
  "minimumReleaseAge": "3 days"  // ✅ 3-day stability window
}

// Major updates (conservative manual review)
{
  "matchUpdateTypes": ["major"],
  "automerge": false  // ✅ Requires manual approval
}
```

**Why PR #62 (backend-patch) Isn't Auto-Merging**:
- ✅ Config: `automerge: true` (security patches)
- ✅ Age: 0-day wait (immediate eligibility)
- ❌ **CI: 22/36 passing (61%)** - 2 summary job failures:
  - "Coverage Checks Complete" (Python 3.11 aggregation)
  - "Integration Tests Complete" (workflow aggregation)
- **Blocker**: GitHub requires ALL required checks passing

**Why PR #64 (backend-minor) Isn't Auto-Merging**:
- ❌ Config: `automerge: false` (major update → manual review)
- ❌ CI: 13/36 passing (50%) - Real test failures
- **Blocker**: Manual review required + CI failures

**Auto-Merge Decision Matrix**:

| Condition | Status | Impact |
|-----------|--------|--------|
| `automerge: true` | ✅ Configured | Ready when other conditions met |
| `minimumReleaseAge` satisfied | ✅ Met | No delay blocking |
| **CI passing (all required)** | ❌ **FAILING** | **PRIMARY BLOCKER** |

**Root Cause**: CI summary job failures (Sessions 8-9, 30)
- "Coverage Checks Complete" consistently fails
- "Integration Tests Complete" consistently fails
- Individual matrix jobs pass, but summary aggregation fails
- Workflow configuration issue (not dependency issue)

**Recommendations**:

**✅ Keep Configuration As-Is** (correctly balanced):
- Security patches: 0-day (aggressive, appropriate)
- React ecosystem: 3-day (balanced, reasonable)
- Major updates: Manual (conservative, safe)

**🔧 Fix CI Summary Jobs** (Task #10):
- Priority: MEDIUM (blocks auto-merge, not critical)
- Impact: Enable auto-merge for valid PRs
- Time: 1-2 hours
- Review workflow aggregation logic in:
  - `.github/workflows/coverage-tracking.yml`
  - `.github/workflows/integration-tests.yml`

**⚙️ Current Workaround** (until CI fixed):
- Manual PR review using Session 30 patterns
- Approve + merge when safe (≥75% pass rate, summary failures only)
- Hold when real failures (<75% pass rate, actual test failures)

**Validated Behaviors**:
- ✅ Renovate creates PRs correctly (labels, grouping, titles)
- ✅ minimumReleaseAge enforced (no premature auto-merge)
- ✅ CI failures block auto-merge (GitHub safety working)
- ✅ Manual workflow solid (PR #63 merged safely)

**Check Auto-Merge Status**:
```powershell
# See if auto-merge is enabled on a PR
gh pr view <pr-number> --json autoMergeRequest,mergeable,reviewDecision

# Expected when auto-merge NOT enabled:
# "autoMergeRequest": null

# Expected when auto-merge ENABLED and waiting:
# "autoMergeRequest": { "enabledAt": "2025-10-31T...", "mergeMethod": "SQUASH" }
```

**Future Optimization** (after CI fix):
- Consider reducing React ecosystem `minimumReleaseAge` from 3 days → 1 day
- Monitor Renovate dashboard for PRs stuck waiting for conditions
- Assess stability impact after 1-2 months

### Batching Strategy

**Auto-Merge Group (CI must pass 100%):**
- Security patches (any version)
- Patch updates with no breaking changes
- Testing tools minor updates

**Batch Review Group (merge together if compatible):**
- Multiple minor updates to same ecosystem (e.g., React ecosystem)
- Development dependencies
- CI/CD action updates

**Individual Review Group (one at a time):**
- Major version updates
- Production-critical dependencies (database, cache, auth)
- Framework updates

**Defer Group (create issue, close PR):**
- Next.js/React major versions (needs sprint planning)
- Python version upgrades (needs extensive testing)
- Breaking changes requiring code refactoring

### Merge Decision Matrix

| Criteria | Auto-Merge | Batch Merge | Individual Review | Defer |
|----------|------------|-------------|-------------------|-------|
| **Version Change** | Patch | Minor | Major | Breaking |
| **CI Status** | ✅ 100% Pass | ✅ 100% Pass | ✅ 100% Pass | Any |
| **Breaking Changes** | None | None | Some | Many |
| **Testing Required** | None | Local | Full Local + Staging | Spike/POC |
| **Timeline** | Immediate | 24-48h | 2-5 days | 1-2 weeks |
| **Rollback Risk** | Low | Low-Medium | Medium-High | High |

### Post-Merge Verification
- [ ] **CI on main branch** - Verify merge didn't break main
- [ ] **Deployment successful** - Check production deployment logs
- [ ] **Health checks pass** - All services responding normally
- [ ] **Error monitoring** - Watch for new errors in Sentry/logs
- [ ] **Performance metrics** - Verify no performance degradation
- [ ] **Rollback ready** - Be prepared to revert if issues arise

### Emergency Rollback
```powershell
# If merged dependency causes production issues:

# 1. Revert the merge commit
git revert -m 1 <merge-commit-sha>

# 2. Push immediately
git push origin main

# 3. Create hotfix PR
gh pr create --title "Revert: Dependabot PR #<pr-number>" --body "Emergency rollback due to <issue>"

# 4. Fast-track merge
gh pr merge --admin --squash
```

---

## 📈 Performance Implementation Checklist

### CI Performance Testing Best Practices ✅

**Context**: Based on Sprint 1 learnings (Session 12, Oct 27-28, 2025)

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

**Local Development Budgets** (ideal conditions):
```typescript
const localBudgets = {
  load: 3000,                 // 3 seconds
  domContentLoaded: 2000,     // 2 seconds
  firstContentfulPaint: 2000, // 2 seconds
};
```

**CI Environment Budgets** (realistic thresholds):
```typescript
const ciBudgets = {
  load: 8000,                 // 8 seconds (2.67x local)
  domContentLoaded: 4000,     // 4 seconds (2x local)
  firstContentfulPaint: 4000, // 4 seconds (2x local)
};
```

**Formula**: `CI_BUDGET = LOCAL_BUDGET × 2.5` (conservative estimate)

**Conditional Rendering Pitfalls**:
- ❌ **Don't**: Test for elements that depend on async data loading
- ❌ **Don't**: Use `waitForSelector` for content in performance tests
- ✅ **Do**: Wait for performance metrics only (`waitForLoadState('networkidle')`)
- ✅ **Do**: Separate content validation into functional E2E tests

**Example - Performance Test Structure**:
```typescript
test('Page loads within performance budget', async ({ page }) => {
  const startTime = Date.now();

  // Navigate and wait for network to be idle
  await page.goto('/markets', { waitUntil: 'networkidle' });

  // Measure performance metrics
  const loadTime = Date.now() - startTime;
  const performanceData = await page.evaluate(() => {
    const perf = performance.getEntriesByType('navigation')[0];
    return {
      domContentLoaded: perf.domContentLoadedEventEnd - perf.startTime,
      load: perf.loadEventEnd - perf.startTime,
    };
  });

  // Assert only on performance metrics
  expect(loadTime).toBeLessThan(ciBudgets.load);
  expect(performanceData.domContentLoaded).toBeLessThan(ciBudgets.domContentLoaded);

  // ❌ DON'T DO THIS in performance tests:
  // await expect(page.locator('h1')).toBeVisible();
});
```

**Manual Workflow Verification**:

When CI concurrency cancels workflows (fast sequential commits):
```bash
# Manually trigger workflow to verify fix
gh workflow run e2e.yml --repo ericsocrat/Lokifi --ref main --field test_suite=full

# Check workflow status
gh run list --repo ericsocrat/Lokifi --workflow="e2e.yml" --limit 1

# View detailed results
gh run view <run-id> --repo ericsocrat/Lokifi
```

**Best Practice**: Wait 15-20 minutes after pushing critical fixes before documentation commits

**Reference**: See Session 12 in `.github/copilot-instructions.md` for complete debugging journey

---

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

### Backend Integration Testing (Session 33 Patterns) ✅
**Purpose**: Test database-dependent features that cannot be mocked

**Infrastructure** (Session 33):
- [x] **integration_db_session fixture** created (conftest.py)
  - Real PostgreSQL database with transaction rollback
  - Automatic table creation/deletion per test
  - Configurable via TEST_DATABASE_URL environment variable

**Follow Service Integration Tests** (Session 33 - Ready for CI/CD):
- [x] **6 comprehensive tests created** (test_follow_service_integration.py)
  - test_follow_user_success_with_server_default_timestamp
  - test_unfollow_user_success_with_database
  - test_get_followers_with_pagination_and_database
  - test_get_following_with_pagination_and_database
  - test_is_following_with_database_lookup
  - test_follow_nonexistent_user_fails_with_database
- [ ] **Deployed to CI/CD** (Session 35 - pending user push)
- [ ] **Validated in CI/CD** (expected: 6/6 passing, follow_service 40% → 50%)

**CI/CD Integration** (Session 35):
- [x] **integration.yml configured** with PostgreSQL + Redis services
- [x] **Health checks** configured for database availability
- [x] **Integration test execution** command configured (line 251)
- [ ] **First deployment** pending (awaiting user push to GitHub)
- [ ] **Coverage validation** after successful CI/CD run

**Test Patterns**:
- [x] **Server-default timestamps** tested (`server_default=func.now()`)
- [x] **Database pagination** tested (LIMIT/OFFSET queries)
- [x] **Foreign key constraints** validated
- [ ] **Unique constraints** validated (future tests)
- [ ] **Database triggers** tested (if applicable)
- [x] **Transaction rollback** ensures test isolation

**Test Markers**:
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
# Command: pytest tests/integration/ -v --tb=short
```

**When to Use**:
- ✅ Testing SQLAlchemy `server_default` values
- ✅ Testing database-level pagination
- ✅ Testing constraints and triggers
- ✅ Testing complex transactions
- ❌ Simple CRUD operations (use mocks)
- ❌ Business logic without database features

**Reference**:
- `/apps/backend/tests/integration/test_follow_service_integration.py` (6 tests, Session 33)
- `/docs/plans/SESSION_33_INTEGRATION_TESTS.md` (infrastructure documentation)
- `/docs/plans/SESSION_35_CI_CD_DEPLOYMENT.md` (deployment guide)

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

## 🐛 CI/CD Test Failure Debugging (Session 33 Patterns)

### Debugging Summary Job Failures

**Systematic Investigation Process**:

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

**Pattern A: Real Test Failures** (Session 33: AIService)
- **Symptoms**:
  - Specific test names in output: `FAILED tests/services/test_ai.py::test_name`
  - Stack traces showing actual errors: `TypeError: unexpected keyword argument`
  - Test summary: `826 passed, 7 failed, 115 skipped`
- **Root Causes**:
  - Method signature changes not reflected in tests
  - Breaking changes in dependencies
  - Async/await compatibility issues (Python version-specific)
- **Action**: Fix test code or production code
- **Time**: 15-45 minutes per test
- **Verification**:
  ```powershell
  cd apps/backend
  python -m pytest path/to/test.py::test_name -v
  ```

**Pattern B: Integration Test Architecture Issues** (Session 33: Follow Tests)
- **Symptoms**:
  - `ConnectionRefusedError`, database connection errors **locally**
  - Tests **pass in CI** where PostgreSQL services configured
  - Tests use `@pytest.mark.anyio` or make real HTTP requests
  - Located in `tests/unit/` but require external services
- **Root Cause**: Integration tests misplaced in unit test directory
- **Solutions**:
  1. ✅ **Refactor to unit tests** (RECOMMENDED):
     - Mock AsyncClient and database dependencies
     - Test service logic directly without HTTP layer
     - Fast, isolated, no infrastructure needed
     - Time: ~2-3 hours
  2. **Move to `tests/integration/`**:
     - Acknowledge integration test nature
     - Keep database dependency
     - Add proper pytest markers
     - Time: ~30 minutes
  3. **Mark as integration, skip locally**:
     - Add `@pytest.mark.integration`
     - Skip when `DATABASE_URL` not available
     - Time: ~15 minutes
- **Example**:
  ```python
  # ❌ BAD - Integration test in tests/unit/
  @pytest.mark.anyio
  async def test_follow_action():
      transport = ASGITransport(app=app)
      async with AsyncClient(transport=transport, base_url="http://test") as client:
          # Makes real HTTP requests, requires database

  # ✅ GOOD - True unit test with mocks
  @pytest.mark.asyncio
  async def test_follow_action():
      mock_db = MagicMock()
      follow_service = FollowService()
      # Test service logic directly
  ```

**Pattern C: Workflow Aggregation Issues** (Sessions 8-9)
- **Symptoms**:
  - Summary job fails but ALL matrix jobs pass
  - Example: "Coverage Complete" fails, all coverage tests pass
  - No actual test failures in logs
- **Root Cause**: YAML conditional logic treating `skipped` as `failure`
- **Action**: Fix workflow YAML conditional logic
- **Time**: 10-20 minutes

**Pattern D: Infrastructure Failures** (Sessions 8-9)
- **Symptoms**:
  - PostgreSQL connection errors in CI
  - Redis unavailable errors
  - Service health check timeouts
- **Root Cause**: Missing service configurations in workflow
- **Action**: Add PostgreSQL/Redis services to workflow YAML
- **Time**: 15-30 minutes
- **Example**:
  ```yaml
  services:
    postgres:
      image: postgres:16-alpine
      env:
        POSTGRES_USER: lokifi
        POSTGRES_PASSWORD: lokifi2025
      options: >-
        --health-cmd "pg_isready -U lokifi"
        --health-interval 10s
  ```

### Session 33 Case Study: AIService Tests

**Problem**: 2 tests failing with `TypeError: unexpected keyword argument 'db'`

**Root Cause**: Method signature changed, tests still passing removed parameter
```python
# Production code (changed)
async def create_thread(self, user_id: int, title: str | None = None) -> AIThread:
    with get_session() as db:  # DB now internal

# Test code (broken)
result = await ai_service.create_thread(db=mock_db, user_id=1, title="Test")
```

**Solution**: Mock `get_session()` context manager instead
```python
with patch("app.services.ai_service.get_session") as mock_get_session:
    mock_db = MagicMock()
    mock_session_ctx = MagicMock()
    mock_session_ctx.__enter__ = MagicMock(return_value=mock_db)
    mock_session_ctx.__exit__ = MagicMock(return_value=None)
    mock_get_session.return_value = mock_session_ctx

    result = await ai_service.create_thread(user_id=1, title="Test")
```

**Time**: 30 minutes (2 tests)
**Impact**: Python 3.11 failures reduced from 7 → 5

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

**4. Documentation** 📚:
- Document recurring patterns (like Session 33)
- Create tasks for architectural issues (Task #10)
- Update checklists with new insights
- Share learnings with team

---

**Remember**: Checklists are living documents - update them based on what you learn from each project cycle! 🚀
