# Phase 1.6 - Task 4: Re-enable Integration Tests

**Date:** October 15, 2025  
**Estimated Time:** 4-6 hours  
**Priority:** High  
**Status:** 🚀 In Progress

---

## 📋 Task Overview

### Objective
Re-enable the disabled integration testing pipeline to ensure end-to-end functionality of the Lokifi application with Docker-based E2E tests.

### Current State
- Integration CI pipeline is disabled (`.github/workflows/integration-ci.yml.disabled`)
- Tests were disabled due to various issues (likely Node version, Docker config, or path changes)
- Project has evolved since tests were disabled (monorepo structure in `apps/`)

### Goals
1. ✅ Fix integration-ci.yml configuration
2. ✅ Update to Node 20 LTS
3. ✅ Fix path references (frontend → apps/frontend, backend → apps/backend)
4. ✅ Ensure Docker Compose works with new structure
5. ✅ Fix any failing tests
6. ✅ Re-enable integration job in unified pipeline

---

## 🔍 Analysis

### Current Integration CI Configuration Issues

#### 1. Path References ❌
```yaml
# Current (WRONG):
cache-dependency-path: frontend/package-lock.json
context: frontend
context: backend

# Should be:
cache-dependency-path: apps/frontend/package-lock.json
context: apps/frontend
context: apps/backend
```

#### 2. Docker Compose Location ❌
The workflow runs `docker compose up -d` from root, but:
- Docker Compose file is at `apps/docker-compose.yml`
- Need to specify `-f apps/docker-compose.yml`

#### 3. .env File Location ❌
```yaml
# Current:
cat > backend/.env << 'EOL'

# Should be:
cat > apps/backend/.env << 'EOL'
```

#### 4. Node Version ✅
- Already using Node 20.19.0 (correct!)

#### 5. Image Names 📝
- Currently uses `fynix-frontend` and `fynix-backend`
- Should use `lokifi-frontend` and `lokifi-backend` (or keep for backward compatibility)

### Docker Compose Analysis

**Main Compose File:** `apps/docker-compose.yml`
- ✅ Defines services: redis, postgres, backend, frontend
- ✅ Has healthchecks configured
- ✅ Uses correct Node 20 and Python 3.11
- ✅ Has development mode with hot reload

**Build Contexts:**
- Backend: `apps/backend/Dockerfile.dev`
- Frontend: `apps/frontend/Dockerfile` or `apps/frontend/Dockerfile.dev`

---

## 🛠️ Implementation Plan

### Phase 1: Update Integration CI Configuration (1-2 hours)

#### Step 1.1: Fix Path References
- Update all `frontend/` → `apps/frontend/`
- Update all `backend/` → `apps/backend/`
- Update docker-compose command to use `-f apps/docker-compose.yml`

#### Step 1.2: Fix Docker Build Contexts
```yaml
# Frontend build
context: apps/frontend
file: apps/frontend/Dockerfile.dev
target: development  # or prod

# Backend build
context: apps/backend
file: apps/backend/Dockerfile.dev
```

#### Step 1.3: Fix Environment File Creation
- Create `.env` file in `apps/backend/`
- Ensure all required environment variables are set
- Match variables from current `docker-compose.yml`

#### Step 1.4: Update Test Commands
```yaml
# Frontend tests
cd apps/frontend
npm ci --legacy-peer-deps
npm run typecheck
npm run test:ci
```

### Phase 2: Test Docker Compose Locally (1 hour)

#### Step 2.1: Local Docker Compose Test
```powershell
# Clean up existing containers
docker-compose -f apps/docker-compose.yml down -v

# Build images
docker-compose -f apps/docker-compose.yml build

# Start services
docker-compose -f apps/docker-compose.yml up -d

# Check health
docker-compose -f apps/docker-compose.yml ps

# Test endpoints
curl http://localhost:8000/api/health
curl http://localhost:3000/api/health

# Clean up
docker-compose -f apps/docker-compose.yml down
```

#### Step 2.2: Verify Services
- ✅ Backend responds on port 8000
- ✅ Frontend responds on port 3000
- ✅ Redis is accessible
- ✅ Health endpoints return 200

### Phase 3: Fix Failing Tests (1-2 hours)

#### Step 3.1: Identify Test Failures
- Run tests locally in Docker environment
- Check for:
  * Missing dependencies
  * Environment variable issues
  * API endpoint changes
  * Database connection issues

#### Step 3.2: Fix Tests
- Update test configurations
- Fix broken assertions
- Add missing test data
- Update snapshots if needed

### Phase 4: Enable in Unified Pipeline (30 min - 1 hour)

#### Step 4.1: Update Unified Pipeline
Currently the integration job is a placeholder:
```yaml
integration:
  name: 🔗 Integration Tests
  if: github.event_name == 'pull_request'
  needs: [frontend-test, backend-test]
  steps:
    - name: 📥 Checkout code
    - name: 🐳 Setup Docker Buildx
    - name: 🔗 Run integration tests
      run: echo "⚠️ Placeholder"
```

Replace with real integration test job that:
1. Builds Docker images
2. Starts services with docker-compose
3. Waits for health checks
4. Runs integration tests
5. Reports results

#### Step 4.2: Make Integration Tests Optional
- Trigger with label: `integration-test`
- Or run on specific branches
- Don't block PRs by default (optional)

### Phase 5: Documentation & Verification (30 min - 1 hour)

#### Step 5.1: Create Documentation
- Document how to run integration tests locally
- Document Docker Compose setup
- Add troubleshooting guide

#### Step 5.2: Create Completion Report
- Document what was fixed
- Include before/after comparisons
- Add screenshots/logs of successful runs

---

## 🎯 Success Criteria

### Must Have
- [ ] Integration CI workflow file is re-enabled and renamed
- [ ] All path references are correct (apps/frontend, apps/backend)
- [ ] Docker Compose builds and starts successfully
- [ ] All services pass health checks
- [ ] Health endpoints return 200 OK
- [ ] Frontend tests run and pass
- [ ] Integration job is enabled in unified pipeline
- [ ] Documentation is created

### Nice to Have
- [ ] Integration tests run in < 5 minutes
- [ ] Cached Docker layers for faster builds
- [ ] Detailed test reports in PR comments
- [ ] Local development guide for Docker testing

---

## 🚨 Potential Issues & Solutions

### Issue 1: Docker Build Failures
**Symptoms:** Image build fails with missing dependencies
**Solutions:**
- Check Dockerfile.dev exists and is correct
- Verify package.json and requirements.txt are accessible
- Ensure build context includes necessary files

### Issue 2: Service Health Check Timeouts
**Symptoms:** Services don't become healthy within timeout
**Solutions:**
- Increase timeout from 60s to 120s
- Check service logs for startup errors
- Verify database migrations run successfully
- Ensure Redis connection string is correct

### Issue 3: Frontend Test Failures
**Symptoms:** Tests fail that pass locally
**Solutions:**
- Check for missing environment variables
- Verify test configuration matches local setup
- Update snapshots if UI has changed
- Check for timing issues in async tests

### Issue 4: Port Conflicts
**Symptoms:** Cannot bind to ports 3000, 8000, 5432, or 6379
**Solutions:**
- Use `docker-compose down` to stop existing containers
- Check for local services using those ports
- Use different ports in CI environment

### Issue 5: Database Connection Issues
**Symptoms:** Backend can't connect to PostgreSQL
**Solutions:**
- Verify DATABASE_URL environment variable
- Check PostgreSQL healthcheck passes
- Ensure backend waits for database to be ready
- Check network configuration

---

## 📝 Implementation Checklist

### Pre-Implementation
- [x] Analyze current integration-ci.yml.disabled
- [x] Analyze docker-compose.yml configuration
- [x] Identify path mismatches
- [x] Create implementation plan

### Implementation
- [ ] Create new branch: `feature/re-enable-integration-tests`
- [ ] Update integration-ci.yml paths
- [ ] Fix Docker build contexts
- [ ] Fix environment file creation
- [ ] Test Docker Compose locally
- [ ] Fix any failing tests
- [ ] Update unified pipeline integration job
- [ ] Create documentation
- [ ] Create completion report
- [ ] Commit and push changes
- [ ] Create pull request

### Post-Implementation
- [ ] Verify CI/CD passes
- [ ] Test integration tests trigger correctly
- [ ] Review and address any issues
- [ ] Merge to main
- [ ] Update Phase 1.6 progress summary

---

## 📚 Files to Modify

### Primary Files
1. `.github/workflows/integration-ci.yml.disabled`
   - Rename to `.github/workflows/integration-ci.yml`
   - Fix all path references
   - Update Docker build contexts
   - Fix environment file creation
   - Update test commands

2. `.github/workflows/lokifi-unified-pipeline.yml`
   - Update integration job with real implementation
   - Make it trigger with label or on specific events

### Supporting Files
3. `apps/docker-compose.yml` (may need minor updates)
4. `apps/backend/Dockerfile.dev` (verify exists and works)
5. `apps/frontend/Dockerfile.dev` (verify exists and works)

### Documentation Files
6. `PHASE_1.6_TASK_4_COMPLETE.md` (to be created)
7. `apps/README.md` (add Docker testing instructions)
8. `docs/testing/INTEGRATION_TESTING.md` (to be created)

---

## ⏱️ Time Breakdown

| Phase | Task | Estimated Time |
|-------|------|----------------|
| 1 | Update Integration CI Config | 1-2 hours |
| 2 | Test Docker Compose Locally | 1 hour |
| 3 | Fix Failing Tests | 1-2 hours |
| 4 | Enable in Unified Pipeline | 0.5-1 hour |
| 5 | Documentation & Verification | 0.5-1 hour |
| **Total** | | **4-7 hours** |

---

## 🔄 Next Steps After Task 4

1. **Task 5:** Expand Frontend Coverage to 60%+
   - Estimated: 10-15 hours
   - Focus: Component tests, integration tests, hooks

2. **Task 6:** E2E Testing Framework
   - Estimated: 8-10 hours
   - Leverage existing Playwright setup
   - Test critical user journeys

3. **Task 7:** Performance Testing
   - Estimated: 6-8 hours
   - Lighthouse CI integration
   - Performance budgets

---

**Created:** October 15, 2025  
**Last Updated:** October 15, 2025  
**Status:** 🚀 Ready to Begin Implementation
