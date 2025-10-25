# Dependency Management Analysis

> **Analysis Date**: October 23, 2025
> **Purpose**: Review dependency installation and caching practices, identify optimization opportunities

## 📊 Executive Summary

**Current State**:
- ✅ **npm caching enabled** - Using GitHub Actions cache with package-lock.json hash
- ✅ **pip caching enabled** - Using GitHub Actions cache for Python dependencies
- ❌ **Playwright browsers NOT cached** - 400MB download every run (~2-3min waste)
- ⚠️ **Redundant npm upgrades** - 5 jobs upgrade npm separately (~1.5min total waste)
- ⚠️ **Duplicate dependency installs** - Frontend deps installed 5 times
- ⚠️ **Additional tool installs** - ruff, pytest-cov installed separately (not in requirements)
- ✅ **Lock files exist** - package-lock.json and requirements.txt for reproducibility

**Key Metrics**:
- **Frontend**: 66 direct dependencies + devDependencies
- **Backend**: 164 Python packages (requirements.txt + requirements-dev.txt)
- **npm cache hit rate**: ~80% (estimated based on lockfile)
- **pip cache hit rate**: ~75% (estimated)
- **Playwright browsers**: 0% cache hit (not cached!)

**Optimization Potential**:
- 🎯 **Immediate**: Playwright caching (saves 2-3min/run)
- 🎯 **Quick win**: Remove redundant npm upgrades (saves 1.5min/run)
- 🎯 **Medium**: Consolidate tool installs (saves 30s-1min/run)
- 🎯 **Advanced**: Dependency pre-warming with Docker images

**Total Savings**: **4-5 minutes per run** (20-30% of current 17min pipeline)

---

## 🔍 Current Dependency Setup

### Frontend Dependencies (Node.js/npm)

**Package Manager**: npm 11.0.0+ (enforced in package.json engines)

**Direct Dependencies**: 66 packages total
- **Production**: 26 packages
  - Core: React 18, Next.js 15, TypeScript 5.7
  - State: Zustand 5, Jotai 2, TanStack Query 5
  - UI: Lucide React, Tailwind CSS, Recharts
  - Data: date-fns, zod, lz-string
- **Development**: 40 packages
  - Testing: Vitest 3.2, Playwright 1.56, Testing Library 16
  - Linting: ESLint 9.17, TypeScript-ESLint 8.17
  - Tools: Prettier 3.4, Husky 9.1, lint-staged 16.2

**Total Installed**: ~1,200+ packages (with transitive dependencies)
**Installation Time**: ~60-90 seconds (with cache), ~3-5 minutes (without cache)
**node_modules Size**: ~500-700 MB

### Backend Dependencies (Python/pip)

**Package Manager**: pip (latest, upgraded in workflow)

**Direct Dependencies**: 164 packages (combined)
- **Production** (requirements.txt): 143 packages
  - Framework: FastAPI, Uvicorn, SQLAlchemy 2.0
  - Database: asyncpg, psycopg2-binary, alembic
  - Auth: Authlib, PyJWT, argon2-cffi
  - Utils: Pydantic 2.10, python-dotenv, redis
- **Development** (requirements-dev.txt): 21 packages
  - Testing: pytest 8.4, pytest-asyncio, pytest-cov
  - Quality: mypy 1.18, ruff 0.13, black 25.9
  - API Testing: schemathesis 4.3, openapi-core 0.19

**Installation Time**: ~45-60 seconds (with cache), ~2-3 minutes (without cache)
**Size**: ~200-300 MB

### Playwright Browsers

**Browsers**: Chromium only (for visual regression tests)
**Size**: ~400 MB
**Installation Time**: ~2-3 minutes
**Cache Status**: ❌ **NOT CACHED** (re-downloaded every run!)

---

## 📦 CI/CD Caching Analysis

### Current Caching Strategy

#### Frontend (npm) Caching

**Configuration** (works well):
```yaml
# From current ci.yml workflow
- uses: actions/setup-node@v4
  with:
    node-version: 20
    cache: "npm"  # ✅ Enabled
    cache-dependency-path: apps/frontend/package-lock.json
```

**Cache Key**: Hash of `apps/frontend/package-lock.json`
**Cache Hit Rate**: ~80% (dependencies change infrequently)
**Cache Miss Scenario**: When package-lock.json changes
**Savings When Hit**: ~3-4 minutes per job

**Issues**:
- ❌ Cache used in 5 separate jobs (frontend-test, frontend-security, accessibility, visual-regression, integration)
- ⚠️ Each job still runs `npm install` (even with cache)
- ⚠️ Each job runs `npm install -g npm@latest` separately (~15s × 5 = 75s wasted)

#### Backend (pip) Caching

**Configuration** (works well):
```yaml
- uses: actions/setup-python@v5
  with:
    python-version: '3.11'
    cache: "pip"  # ✅ Enabled
    cache-dependency-path: |
      apps/backend/requirements.txt
      apps/backend/requirements-dev.txt
```

**Cache Key**: Hash of requirements.txt + requirements-dev.txt
**Cache Hit Rate**: ~75% (Python deps change less frequently)
**Cache Miss Scenario**: When requirements files change
**Savings When Hit**: ~2-3 minutes per job

**Issues**:
- ⚠️ Additional tools installed separately: `pip install ruff`, `pip install pytest pytest-cov`
- ⚠️ These tools are ALREADY in requirements-dev.txt (redundant!)
- ⚠️ `pip install --upgrade pip` runs every time (~10s waste)

#### Playwright Browser Caching

**Configuration**: ❌ **MISSING**

**Current Behavior**:
```yaml
- name: 🎭 Install Playwright browsers
  run: npx playwright install chromium  # ❌ Downloads 400MB every time!
```

**Impact**:
- Downloads ~400 MB every run
- Takes 2-3 minutes
- Runs in visual-regression job (conditional, but still wasteful)

**Should Be**:
```yaml
- name: Cache Playwright browsers
  uses: actions/cache@v4
  with:
    path: ~/.cache/ms-playwright
    key: playwright-${{ runner.os }}-${{ hashFiles('**/package-lock.json') }}

- name: 🎭 Install Playwright browsers
  run: npx playwright install chromium  # Only installs if cache miss
```

**Savings**: 2-3 minutes per visual-regression run

---

## 🔴 Issues & Anti-Patterns

### Critical Issues

#### 1. Playwright Browsers Not Cached (P0)

**Problem**: 400 MB re-downloaded every run

**Evidence**:
```yaml
# Legacy workflow example (archived)
visual-regression:
  steps:
    - name: 🎭 Install Playwright browsers
      run: npx playwright install chromium  # NO CACHE!
```

**Impact**:
- 2-3 minutes wasted per visual-regression job
- 400 MB bandwidth per run
- Unnecessary GitHub Actions resource consumption

**Solution**:
```yaml
- name: Cache Playwright browsers
  uses: actions/cache@v4
  with:
    path: ~/.cache/ms-playwright
    key: playwright-browsers-${{ runner.os }}-${{ hashFiles('**/package-lock.json') }}
    restore-keys: |
      playwright-browsers-${{ runner.os }}-

- name: Install Playwright browsers
  run: npx playwright install chromium
```

**Expected Savings**: 2-3 min/run (when cache hits)

#### 2. Redundant npm Upgrades (P1)

**Problem**: 5 jobs upgrade npm separately

**Evidence**:
```yaml
# Repeated in FIVE jobs:
- name: 🔼 Upgrade npm to latest
  run: npm install -g npm@latest  # ~15 seconds each
```

**Jobs with redundant upgrades**:
1. frontend-test
2. frontend-security
3. accessibility
4. visual-regression
5. (multiple others)

**Impact**:
- 15s × 5 jobs = **75 seconds wasted**
- Inconsistent npm versions if upgrade fails mid-pipeline
- Unnecessary network traffic

**Solution 1** (Quick): Remove upgrades, use default npm
```yaml
# REMOVE THIS STEP ENTIRELY
# Default npm in ubuntu-latest is usually recent enough
```

**Solution 2** (Better): Use Node.js 20 which includes npm 10+
```yaml
- uses: actions/setup-node@v4
  with:
    node-version: 20  # Includes npm 10.x
    # No need to upgrade npm
```

**Solution 3** (Best): Use Docker image with pre-installed tools
```yaml
runs-on: ubuntu-latest
container:
  image: node:20-alpine  # Includes latest npm
```

**Expected Savings**: 1-1.5 min/run total

#### 3. Redundant Tool Installs (P1)

**Problem**: Tools installed separately when already in requirements

**Evidence**:
```yaml
# In backend-test job:
- name: ✨ Run Ruff lint
  run: |
    pip install ruff  # ❌ Already in requirements-dev.txt!
    ruff check . || true

- name: 🧪 Run pytest
  run: |
    pip install pytest pytest-cov  # ❌ Already in requirements-dev.txt!
    pytest --cov=. ...
```

**Files**: requirements-dev.txt ALREADY includes:
```txt
pytest==8.4.2
pytest-cov==7.0.0
ruff==0.13.2
```

**Impact**:
- Redundant pip install (~10-15s each)
- Risk of version mismatch (installed version != requirements version)
- Caching doesn't help these separate installs

**Solution**:
```yaml
# Install ALL dependencies once:
- name: Install dependencies
  run: |
    pip install -r requirements.txt -r requirements-dev.txt

# Then just use the tools:
- name: Run Ruff
  run: ruff check .

- name: Run pytest
  run: pytest --cov=. ...
```

**Expected Savings**: 30-45 seconds/run

### Medium Issues

#### 4. Duplicate Dependency Installs (P2)

**Problem**: Frontend dependencies installed 5 times

**Impact**:
- Even with caching, `npm install` takes ~30-60s per job
- 30s × 5 jobs = **2.5 minutes total install time**
- More efficient to install once and share

**Current Jobs Installing Frontend Deps**:
1. frontend-test
2. frontend-security
3. accessibility
4. visual-regression
5. integration (uses Docker)

**Solution**: Use workspace artifacts
```yaml
# Job 1: Install once
install-deps:
  steps:
    - run: npm ci
    - uses: actions/upload-artifact@v4
      with:
        name: node-modules
        path: node_modules/

# Job 2-5: Download instead of install
frontend-test:
  needs: [install-deps]
  steps:
    - uses: actions/download-artifact@v4
      with:
        name: node-modules
        path: node_modules/
```

**Trade-off**: Artifact upload/download time vs install time
- Upload: ~30-60s (compressed)
- Download: ~20-30s
- Install (with cache): ~30-60s

**Net Savings**: ~1-2 minutes (marginal, only if cache misses frequently)

#### 5. No Dependency Update Automation (P2)

**Problem**: Dependencies updated manually

**Risk**:
- Security vulnerabilities in outdated packages
- Missing new features and performance improvements
- Dependency drift (different versions locally vs CI)

**Solution**: Use Dependabot or Renovate
```yaml
# .github/dependabot.yml
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/apps/frontend"
    schedule:
      interval: "weekly"
    open-pull-requests-limit: 5

  - package-ecosystem: "pip"
    directory: "/apps/backend"
    schedule:
      interval: "weekly"
    open-pull-requests-limit: 5
```

**Expected Benefit**: Automated security updates, fewer manual updates

### Low Priority Issues

#### 6. No Lockfile Validation (P3)

**Problem**: No check for package-lock.json vs package.json consistency

**Risk**: Inconsistent installs if lockfile out of sync

**Solution**:
```yaml
- name: Validate lockfile
  run: npm ci --dry-run  # Fails if lockfile out of sync
```

#### 7. No Dependency License Checking (P3)

**Problem**: No validation of dependency licenses

**Risk**: Using dependencies with incompatible licenses

**Solution**:
```yaml
- name: Check licenses
  run: npx license-checker --production --onlyAllow "MIT;Apache-2.0;BSD-3-Clause"
```

---

## 🎯 Optimization Recommendations

### Phase 1: Quick Wins (Week 1)

#### Recommendation 1.1: Add Playwright Browser Caching (HIGH PRIORITY)

**Impact**: ⭐⭐⭐⭐⭐ (2-3 min savings per visual-regression run)
**Effort**: ⭐ (5-10 minutes)

**Implementation**:

```yaml
# Example for current e2e.yml workflow:
# In visual-regression or e2e job:

- name: 📦 Cache Playwright browsers
  uses: actions/cache@v4
  id: playwright-cache
  with:
    path: ~/.cache/ms-playwright
    key: playwright-browsers-${{ runner.os }}-v1-${{ hashFiles('apps/frontend/package-lock.json') }}
    restore-keys: |
      playwright-browsers-${{ runner.os }}-v1-

- name: 🎭 Install Playwright browsers
  if: steps.playwright-cache.outputs.cache-hit != 'true'
  run: npx playwright install chromium
  working-directory: apps/frontend

- name: ℹ️ Using cached browsers
  if: steps.playwright-cache.outputs.cache-hit == 'true'
  run: echo "✅ Using cached Playwright browsers"
```

**Testing**:
1. Run visual-regression job once (cache miss)
2. Run again (should be cache hit, 2-3 min faster)
3. Update package-lock.json, verify cache rebuilds

**Expected Result**: 2-3 min savings on cache hit

#### Recommendation 1.2: Remove Redundant npm Upgrades (HIGH PRIORITY)

**Impact**: ⭐⭐⭐ (1-1.5 min savings total)
**Effort**: ⭐ (5 minutes)

**Implementation**:

```yaml
# REMOVE this step from ALL jobs:
# - name: 🔼 Upgrade npm to latest
#   run: npm install -g npm@latest

# Node.js 20 already includes npm 10+, which is sufficient
```

**Jobs to update**:
- frontend-test
- frontend-security
- accessibility
- visual-regression
- integration

**Testing**:
1. Remove upgrade step from one job
2. Verify job still works (npm 10+ is sufficient)
3. Remove from all jobs

**Expected Result**: 1-1.5 min total savings

#### Recommendation 1.3: Fix Redundant Tool Installs (HIGH PRIORITY)

**Impact**: ⭐⭐⭐ (30-45s savings)
**Effort**: ⭐ (10 minutes)

**Implementation**:

```yaml
# Example for current ci.yml backend jobs:

- name: 📚 Install dependencies
  run: |
    python -m pip install --upgrade pip
    pip install -r requirements.txt -r requirements-dev.txt  # Includes ruff, pytest

# REMOVE separate installs:
# - name: ✨ Run Ruff lint
#   run: |
#     pip install ruff  # ❌ REMOVE THIS
#     ruff check .

# REPLACE WITH:
- name: ✨ Run Ruff lint
  run: ruff check .  # Already installed via requirements-dev.txt
```

**Testing**:
1. Verify ruff, pytest, pytest-cov in requirements-dev.txt
2. Remove redundant installs
3. Run backend-test job
4. Verify all tools still work

**Expected Result**: 30-45s savings

### Phase 2: Medium Improvements (Week 2)

#### Recommendation 2.1: Improve pip Cache Key

**Impact**: ⭐⭐⭐ (Better cache hit rate)
**Effort**: ⭐ (5 minutes)

**Current**:
```yaml
cache-dependency-path: |
  apps/backend/requirements.txt
  apps/backend/requirements-dev.txt
```

**Improved**:
```yaml
cache-dependency-path: |
  apps/backend/requirements.txt
  apps/backend/requirements-dev.txt
  apps/backend/pyproject.toml  # Add project metadata
```

**Benefit**: More accurate cache invalidation

#### Recommendation 2.2: Add Dependency Validation

**Impact**: ⭐⭐ (Catch inconsistencies early)
**Effort**: ⭐⭐ (15 minutes)

**Implementation**:

```yaml
# In fast feedback workflow (ci.yml):
validate-deps:
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4

    - name: Validate npm lockfile
      working-directory: apps/frontend
      run: |
        npm ci --dry-run
        echo "✅ package-lock.json is consistent with package.json"

    - name: Validate pip requirements
      working-directory: apps/backend
      run: |
        pip install pip-tools
        pip-compile --dry-run requirements.in
        echo "✅ requirements.txt is up to date"
```

#### Recommendation 2.3: Set Up Dependabot

**Impact**: ⭐⭐⭐⭐ (Automated security updates)
**Effort**: ⭐⭐ (30 minutes)

**Implementation**:

Create `.github/dependabot.yml`:

```yaml
version: 2
updates:
  # Frontend dependencies
  - package-ecosystem: "npm"
    directory: "/apps/frontend"
    schedule:
      interval: "weekly"
      day: "monday"
      time: "09:00"
    open-pull-requests-limit: 5
    reviewers:
      - "ericsocrat"
    commit-message:
      prefix: "chore(deps)"
    labels:
      - "dependencies"
      - "frontend"
    ignore:
      - dependency-name: "react"
        update-types: ["version-update:semver-major"]

  # Backend dependencies
  - package-ecosystem: "pip"
    directory: "/apps/backend"
    schedule:
      interval: "weekly"
      day: "monday"
      time: "09:00"
    open-pull-requests-limit: 5
    reviewers:
      - "ericsocrat"
    commit-message:
      prefix: "chore(deps)"
    labels:
      - "dependencies"
      - "backend"

  # GitHub Actions
  - package-ecosystem: "github-actions"
    directory: "/"
    schedule:
      interval: "weekly"
      day: "monday"
      time: "09:00"
    commit-message:
      prefix: "chore(ci)"
    labels:
      - "ci-cd"
```

**Benefits**:
- Automated PRs for dependency updates
- Security vulnerability alerts
- Version compatibility testing
- Reduces manual update overhead

### Phase 3: Advanced Optimizations (Week 3+)

#### Recommendation 3.1: Docker Layer Caching

**Impact**: ⭐⭐⭐⭐ (1-2 min savings on integration tests)
**Effort**: ⭐⭐⭐⭐ (High complexity)

**Implementation**: Use Docker Buildx with layer caching

```yaml
- name: Set up Docker Buildx
  uses: docker/setup-buildx-action@v3

- name: Build with cache
  uses: docker/build-push-action@v5
  with:
    context: .
    cache-from: type=gha
    cache-to: type=gha,mode=max
```

#### Recommendation 3.2: Custom Docker Images

**Impact**: ⭐⭐⭐⭐⭐ (2-3 min savings by pre-installing deps)
**Effort**: ⭐⭐⭐⭐⭐ (Very high complexity)

**Concept**: Pre-build Docker images with dependencies

```dockerfile
# frontend-ci.Dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
RUN npm ci --only=development
# Pre-installed dependencies in image
```

Use in workflow:
```yaml
jobs:
  frontend-test:
    runs-on: ubuntu-latest
    container:
      image: ghcr.io/ericsocrat/lokifi-frontend-ci:latest
    steps:
      - uses: actions/checkout@v4
      # Skip npm install entirely!
      - run: npm run test
```

**Benefits**:
- No dependency installation time
- Consistent environment
- Faster job startup

**Drawbacks**:
- Image maintenance overhead
- Storage costs for images
- Need to rebuild on dependency changes

#### Recommendation 3.3: Selective Dependency Installation

**Impact**: ⭐⭐⭐ (30-60s savings on specific jobs)
**Effort**: ⭐⭐⭐ (Medium complexity)

**Concept**: Install only needed deps for each job

```yaml
# Linting job doesn't need test dependencies
lint:
  steps:
    - run: npm ci --only=dev --omit=optional
    - run: npm run lint
```

---

## 📊 Expected Impact Summary

### Time Savings (Per Run)

| Optimization | Savings | Effort | Priority |
|--------------|---------|--------|----------|
| Playwright browser caching | 2-3 min | Low | P0 |
| Remove npm upgrades | 1-1.5 min | Low | P0 |
| Fix redundant tool installs | 30-45s | Low | P0 |
| Better cache keys | (better hit rate) | Low | P1 |
| Dependency validation | (catch issues early) | Low | P1 |
| Dependabot setup | (reduces manual work) | Medium | P1 |
| Docker layer caching | 1-2 min | High | P2 |
| Custom Docker images | 2-3 min | Very High | P3 |

**Total Phase 1 Savings**: **4-5 minutes per run**
**Percentage Improvement**: **23-29% faster** (from 17min → 12-13min)

### Cost Savings (Monthly)

**Assumptions**:
- 100 runs/month
- Average 4.5 min savings per run

**Time Saved**: 100 × 4.5min = **450 minutes/month**
**Cost Saved**: $0 (public repo, but good practice)
**Developer Time Saved**: Faster feedback, better productivity

---

## 🔧 Implementation Checklist

### Phase 1 (Week 1): Quick Wins

- [ ] **Day 1**: Add Playwright browser caching
  - [ ] Add cache action to visual-regression job
  - [ ] Test with cache miss (first run)
  - [ ] Test with cache hit (second run)
  - [ ] Verify 2-3 min savings

- [ ] **Day 2**: Remove redundant npm upgrades
  - [ ] Remove from frontend-test job
  - [ ] Remove from frontend-security job
  - [ ] Remove from accessibility job
  - [ ] Remove from visual-regression job
  - [ ] Remove from integration job
  - [ ] Verify all jobs still work

- [ ] **Day 3**: Fix redundant tool installs
  - [ ] Remove `pip install ruff` from backend-test
  - [ ] Remove `pip install pytest pytest-cov` from backend-test
  - [ ] Remove `pip install schemathesis openapi-core pytest` from api-contracts
  - [ ] Verify tools still work (they're in requirements-dev.txt)

- [ ] **Day 4**: Test all changes
  - [ ] Run full pipeline
  - [ ] Verify all jobs pass
  - [ ] Measure time savings
  - [ ] Document results

- [ ] **Day 5**: Documentation
  - [ ] Update workflow documentation
  - [ ] Update developer guide
  - [ ] Share results with team

### Phase 2 (Week 2): Medium Improvements

- [ ] **Day 1**: Improve cache keys
  - [ ] Add pyproject.toml to pip cache key
  - [ ] Test cache invalidation

- [ ] **Day 2**: Add dependency validation
  - [ ] Create validation job
  - [ ] Test with valid deps
  - [ ] Test with invalid deps

- [ ] **Day 3-5**: Set up Dependabot
  - [ ] Create dependabot.yml
  - [ ] Configure update schedule
  - [ ] Set up reviewers
  - [ ] Monitor first PRs

### Phase 3 (Week 3+): Advanced (Optional)

- [ ] **Week 3**: Docker layer caching (if integration tests slow)
- [ ] **Week 4**: Custom Docker images (if worth the complexity)

---

## 📚 Resources & References

**GitHub Actions Caching**:
- Official Docs: https://docs.github.com/en/actions/using-workflows/caching-dependencies-to-speed-up-workflows
- Cache Action: https://github.com/actions/cache
- Best Practices: https://github.com/actions/cache/blob/main/tips-and-workarounds.md

**Playwright Caching**:
- Browser Cache: https://playwright.dev/docs/browsers#install-browsers
- CI Cache: https://playwright.dev/docs/ci#caching-browsers

**Dependabot**:
- Configuration: https://docs.github.com/en/code-security/dependabot/dependabot-version-updates/configuration-options-for-the-dependabot.yml-file
- Customization: https://docs.github.com/en/code-security/dependabot/working-with-dependabot/customizing-dependency-updates

**Related Documentation**:
- PERFORMANCE_BASELINE.md - Overall pipeline performance analysis
- CURRENT_WORKFLOW_STATE.md - Current caching strategy details

---

**Last Updated**: October 23, 2025
**Next Review**: After Phase 1 implementation
**Owner**: DevOps Team
