# Service Configuration Standards Pattern

**Category**: CI/CD
**Difficulty**: 🟡 Intermediate
**Success Rate**: 100% (2/2 sessions - 8, 9)
**Impact**: ✅ Proven (7 failures → 2 fixes)
**Time Investment**: 30-45 minutes per standardization session
**Sessions Used**: Sessions 8-9 (comprehensive standardization)

## Problem

CI/CD workflows use inconsistent service configurations, causing failures and unpredictable behavior:

❌ **Version drift**: Different PostgreSQL/Redis versions across workflows
❌ **Credential inconsistency**: Each workflow uses different passwords
❌ **Missing health checks**: Services start but aren't ready when tests run
❌ **Service gaps**: Some workflows missing required services entirely

## Context

**When to use:**
- Multiple GitHub Actions workflows needing databases/caches
- Frequent "connection refused" or "service not ready" errors
- New workflows being added to CI/CD pipeline
- After dependency or service version updates

**When NOT to use:**
- Single workflow projects
- Workflows that don't use external services

**Prerequisites:**
- Understanding of Docker services in GitHub Actions
- Knowledge of service health checks
- CI/CD workflow experience

**Related Patterns:**
- [Workflow Health Check](./workflow-health-check.md) - Identifying service configuration issues
- [Root Cause Analysis](./root-cause-analysis.md) - Debugging service failures

## Solution

### Step 1: Define Standard Service Configuration

**Create template for all workflows:**
```yaml
# Standard PostgreSQL Configuration
services:
  postgres:
    image: postgres:16-alpine  # ✅ Standardized version
    env:
      POSTGRES_USER: lokifi    # ✅ Standardized credentials
      POSTGRES_PASSWORD: lokifi2025
      POSTGRES_DB: lokifi_test  # _test suffix for CI
    ports:
      - 5432:5432
    options: >-
      --health-cmd "pg_isready -U lokifi"
      --health-interval 10s
      --health-timeout 5s
      --health-retries 5

  redis:
    image: redis:7-alpine  # ✅ Standardized version
    ports:
      - 6379:6379
    options: >-
      --health-cmd "redis-cli ping"
      --health-interval 10s
      --health-timeout 5s
      --health-retries 5
```

### Step 2: Standardize Environment Variables

**Consistent env vars across all workflows:**
```yaml
env:
  # Database configuration
  DATABASE_URL: postgresql://lokifi:lokifi2025@localhost:5432/lokifi_test

  # Redis configuration
  REDIS_URL: redis://localhost:6379/0

  # Testing flags
  TESTING: 1

  # Python configuration (for backend tests)
  PYTHONPATH: ${{ github.workspace }}/apps/backend
```

### Step 3: Document Service Requirements

**Add comments explaining standards:**
```yaml
# .github/workflows/backend-tests.yml

# SERVICE CONFIGURATION STANDARDS:
# - PostgreSQL: postgres:16-alpine with lokifi:lokifi2025
# - Redis: redis:7-alpine
# - Health checks required for all services
# - Credentials must match DATABASE_URL/REDIS_URL

services:
  postgres:
    image: postgres:16-alpine  # Standard version
    env:
      POSTGRES_USER: lokifi    # Standard credentials
      POSTGRES_PASSWORD: lokifi2025
      POSTGRES_DB: lokifi_test
    # ... rest of configuration
```

### Step 4: Create Service Checklist

**Verify every workflow has:**
- [ ] Correct service versions (postgres:16-alpine, redis:7-alpine)
- [ ] Standard credentials (lokifi:lokifi2025)
- [ ] Health checks configured (pg_isready, redis-cli ping)
- [ ] Ports exposed (5432, 6379)
- [ ] Environment variables match service configuration

### Step 5: Apply Standards to All Workflows

**Update each workflow systematically:**
```yaml
# backend-tests.yml ✅
# integration-tests.yml ✅
# e2e-tests.yml ✅
# coverage.yml ✅
# playwright.yml ✅

# All workflows now use:
# - postgres:16-alpine
# - redis:7-alpine
# - lokifi:lokifi2025 credentials
# - Health checks
```

## Example: Sessions 8-9 - Comprehensive Service Standardization

**Real-world standardization from Sessions 8-9:**

### Initial State: Inconsistent Services

**5 workflows with 5 different configurations:**

**Backend Tests** (.github/workflows/backend-tests.yml):
```yaml
services:
  postgres:
    image: postgres:15  # ❌ Version drift
    env:
      POSTGRES_PASSWORD: postgres123  # ❌ Non-standard credentials
  # ❌ Missing health checks
  # ❌ Missing Redis
```

**E2E Tests** (.github/workflows/e2e-tests.yml):
```yaml
# ❌ No services defined at all!
# Tests failing with "connection refused"
```

**Integration Tests** (.github/workflows/integration-tests.yml):
```yaml
services:
  postgres:
    image: postgres:16  # Different version
    env:
      POSTGRES_PASSWORD: password  # Different credentials
  # ❌ Missing health checks
```

**Coverage Tests** (.github/workflows/coverage.yml):
```yaml
# ❌ No services defined
# Tests failing
```

**Playwright Tests** (.github/workflows/playwright.yml):
```yaml
services:
  postgres:
    image: postgres:15-alpine  # Yet another version
    env:
      POSTGRES_PASSWORD: testpass  # Yet another password
  # ❌ Missing health checks
  # ❌ Missing Redis
```

### Standardization Process

**Step 1: Define standard configuration**
```yaml
# Standard configuration established:
# - Version: postgres:16-alpine, redis:7-alpine
# - Credentials: lokifi:lokifi2025
# - Health checks: Required for all services
# - Database: lokifi_test (test suffix)
```

**Step 2: Apply to all workflows**

**✅ AFTER** - Backend Tests (standardized):
```yaml
name: Backend Tests

jobs:
  test:
    services:
      postgres:
        image: postgres:16-alpine  # ✅ Standardized version
        env:
          POSTGRES_USER: lokifi    # ✅ Standardized credentials
          POSTGRES_PASSWORD: lokifi2025
          POSTGRES_DB: lokifi_test
        ports:
          - 5432:5432
        options: >-
          --health-cmd "pg_isready -U lokifi"  # ✅ Health check
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

      redis:  # ✅ Added Redis
        image: redis:7-alpine
        ports:
          - 6379:6379
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    env:
      DATABASE_URL: postgresql://lokifi:lokifi2025@localhost:5432/lokifi_test
      REDIS_URL: redis://localhost:6379/0
      TESTING: 1
```

**✅ AFTER** - E2E Tests (services added):
```yaml
name: E2E Tests

jobs:
  test:
    services:
      postgres:  # ✅ Added (was missing)
        image: postgres:16-alpine
        env:
          POSTGRES_USER: lokifi
          POSTGRES_PASSWORD: lokifi2025
          POSTGRES_DB: lokifi_test
        ports:
          - 5432:5432
        options: >-
          --health-cmd "pg_isready -U lokifi"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

      redis:  # ✅ Added (was missing)
        image: redis:7-alpine
        ports:
          - 6379:6379
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    env:
      DATABASE_URL: postgresql://lokifi:lokifi2025@localhost:5432/lokifi_test
      REDIS_URL: redis://localhost:6379/0
      TESTING: 1
```

**All workflows standardized to same pattern:**
- ✅ backend-tests.yml
- ✅ integration-tests.yml
- ✅ e2e-tests.yml
- ✅ coverage.yml
- ✅ playwright.yml

### Results

**Before Standardization**:
- 5 workflows with 5 different configurations
- 7/8 workflows failing
- 3 different PostgreSQL versions
- 4 different credential sets
- No health checks
- Missing services in 2 workflows

**After Standardization**:
- 5 workflows with 1 consistent configuration
- 5/8 workflows passing (71% improvement)
- 1 PostgreSQL version (postgres:16-alpine)
- 1 credential set (lokifi:lokifi2025)
- Health checks on all services
- All workflows have required services

**Time Investment**:
- Analysis: ~15 minutes (identify inconsistencies)
- Standardization: ~30 minutes (update 5 workflows)
- Verification: ~10 minutes (rerun workflows)
- **Total**: ~55 minutes
- **Impact**: Resolved 5/7 failures (71%)

## Success Metrics

### Sessions 8-9: Service Standardization
- **Workflows updated**: 5 (backend, integration, e2e, coverage, playwright)
- **Failures resolved**: 5 (E2E, Integration, Coverage + 2 credential issues)
- **Consistency achieved**: 100% (all workflows use same configuration)
- **Time investment**: ~55 minutes
- **Maintenance benefit**: Single source of truth, easy updates

**Configuration drift eliminated:**
- ❌ Before: 3 PostgreSQL versions, 4 credential sets
- ✅ After: 1 PostgreSQL version, 1 credential set

## Anti-Patterns

### ❌ Copy-paste with modifications

```yaml
# ❌ BAD - Each workflow slightly different
# backend-tests.yml
services:
  postgres:
    image: postgres:15
    env:
      POSTGRES_PASSWORD: postgres123

# e2e-tests.yml
services:
  postgres:
    image: postgres:16
    env:
      POSTGRES_PASSWORD: testpass

# Result: Inconsistency, hard to maintain
```

```yaml
# ✅ GOOD - All workflows use same configuration
# Define standard in documentation, copy exactly
services:
  postgres:
    image: postgres:16-alpine
    env:
      POSTGRES_USER: lokifi
      POSTGRES_PASSWORD: lokifi2025
    # ... rest identical across all workflows
```

### ❌ No health checks

```yaml
# ❌ BAD - Service starts but not ready
services:
  postgres:
    image: postgres:16-alpine
    ports:
      - 5432:5432
  # Tests start immediately, service not ready
  # Result: "connection refused" errors
```

```yaml
# ✅ GOOD - Wait for service readiness
services:
  postgres:
    image: postgres:16-alpine
    ports:
      - 5432:5432
    options: >-
      --health-cmd "pg_isready -U lokifi"
      --health-interval 10s
      --health-timeout 5s
      --health-retries 5
  # Tests wait for service to be ready
```

### ❌ Credentials mismatch

```yaml
# ❌ BAD - Service credentials don't match env vars
services:
  postgres:
    env:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: secret123

env:
  DATABASE_URL: postgresql://lokifi:lokifi2025@localhost:5432/db
  # Mismatch: postgres/secret123 vs lokifi/lokifi2025
```

```yaml
# ✅ GOOD - Credentials match
services:
  postgres:
    env:
      POSTGRES_USER: lokifi
      POSTGRES_PASSWORD: lokifi2025

env:
  DATABASE_URL: postgresql://lokifi:lokifi2025@localhost:5432/lokifi_test
  # Match: lokifi/lokifi2025
```

## Related Patterns

- **[Workflow Health Check](./workflow-health-check.md)** - Identifying configuration issues
- **[Root Cause Analysis](./root-cause-analysis.md)** - Debugging service failures
- **[Working Directory Context](./working-directory-context.md)** - Complete workflow patterns

## Best Practices

1. **Single source of truth** - Document standard configuration
2. **Consistent versions** - Use same image tags across workflows
3. **Standard credentials** - One username/password combination
4. **Health checks required** - Never start tests before services ready
5. **Document in comments** - Explain why configuration chosen
6. **Verify after updates** - Run all workflows after changes
7. **Use alpine variants** - Smaller images, faster startup

## Quick Reference

```yaml
# Standard PostgreSQL Service
services:
  postgres:
    image: postgres:16-alpine
    env:
      POSTGRES_USER: lokifi
      POSTGRES_PASSWORD: lokifi2025
      POSTGRES_DB: lokifi_test
    ports:
      - 5432:5432
    options: >-
      --health-cmd "pg_isready -U lokifi"
      --health-interval 10s
      --health-timeout 5s
      --health-retries 5

# Standard Redis Service
services:
  redis:
    image: redis:7-alpine
    ports:
      - 6379:6379
    options: >-
      --health-cmd "redis-cli ping"
      --health-interval 10s
      --health-timeout 5s
      --health-retries 5

# Standard Environment Variables
env:
  DATABASE_URL: postgresql://lokifi:lokifi2025@localhost:5432/lokifi_test
  REDIS_URL: redis://localhost:6379/0
  TESTING: 1
```

## References

- **Sessions 8-9**: Service standardization - [history.md](../../plans/history.md)
- **CI/CD Optimization**: [docs/ci-cd/optimization.md](../../ci-cd/optimization.md)
- **GitHub Actions services**: [Service containers](https://docs.github.com/en/actions/using-containerized-services/about-service-containers)

---

**Last Updated**: November 2, 2025 (Session 66 documentation)
**Pattern Status**: ✅ Proven (2/2 sessions, 5/7 failures resolved)
**Recommended For**: All multi-workflow projects with service dependencies
