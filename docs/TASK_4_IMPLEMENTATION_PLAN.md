# Task 4: Re-enable Integration Tests - Implementation Plan

**Date:** October 16, 2025  
**Branch:** feature/re-enable-integration-tests  
**Estimated Time:** 4-7 hours

---

## 📋 Analysis of Disabled Integration Tests

### Current State
**File:** `.github/workflows/integration-ci.yml.disabled`

### Issues Identified

#### 1. **Path Issues** ❌
```yaml
# Current (WRONG):
cache-dependency-path: frontend/package-lock.json
context: frontend
context: backend
cd frontend

# Should be (CORRECT):
cache-dependency-path: apps/frontend/package-lock.json
context: apps/frontend
context: apps/backend
cd apps/frontend
```

#### 2. **Docker Compose Location** ❌
```yaml
# Current (WRONG):
docker compose up -d

# Should be (CORRECT):
docker compose -f apps/docker-compose.yml up -d
```

#### 3. **Node Version** ⚠️ (Needs Update)
```yaml
# Current:
node-version: "20.19.0"

# Should be:
node-version: "20"  # Or specific LTS version
```

#### 4. **Health Check Endpoints** ❌
```yaml
# Current checks (may be wrong):
curl -f http://localhost:8000/api/health
curl -f http://localhost:8000/health  # Duplicate?

# Need to verify:
- Backend health endpoint: /api/health (confirmed)
- Frontend health endpoint: Need to check
```

#### 5. **Environment Variables** ⚠️
```yaml
# Uses old variable names:
FYNIX_JWT_SECRET=test-secret-for-ci

# Should be:
LOKIFI_JWT_SECRET=test-secret-for-ci
```

#### 6. **Docker Image Tags** ⚠️
```yaml
# Uses old project name:
tags: fynix-frontend:latest
tags: fynix-backend:latest

# Should be:
tags: lokifi-frontend:latest
tags: lokifi-backend:latest
```

---

## 🔧 Implementation Steps

### Step 1: Fix Path References (30 min)

**File:** `.github/workflows/integration-ci.yml`

**Changes needed:**
1. Update all `frontend/` → `apps/frontend/`
2. Update all `backend/` → `apps/backend/`
3. Update docker-compose command to use `apps/docker-compose.yml`
4. Fix cache paths for npm

### Step 2: Fix Docker Configuration (1 hour)

**Changes needed:**
1. Update Docker contexts to `apps/frontend` and `apps/backend`
2. Update image tags from `fynix-*` to `lokifi-*`
3. Fix environment variable names (FYNIX → LOKIFI)
4. Update docker-compose file path

### Step 3: Fix Health Check Endpoints (30 min)

**Need to verify:**
- Backend: `/api/health` ✅ (confirmed working)
- Frontend: Check if health endpoint exists

**Action:** Remove duplicate health check or fix URL

### Step 4: Update Environment Variables (30 min)

**Create proper `.env` file with:**
- LOKIFI_JWT_SECRET
- API_PREFIX=/api
- Database URLs
- Redis URLs
- API keys (demo values for CI)

### Step 5: Test Locally (1-2 hours)

```bash
# 1. Build images
docker compose -f apps/docker-compose.yml build

# 2. Start services
docker compose -f apps/docker-compose.yml up -d

# 3. Check health
curl http://localhost:8000/api/health
curl http://localhost:3000/

# 4. Run tests
cd apps/frontend && npm run test:ci
cd apps/backend && pytest tests/integration/
```

### Step 6: Re-enable in CI/CD (1 hour)

1. Rename file: `integration-ci.yml.disabled` → `integration-ci.yml`
2. Add integration job to unified pipeline (optional)
3. Test in CI/CD
4. Fix any remaining issues

### Step 7: Documentation (30 min)

Update:
- Integration test README
- Docker setup guide
- CI/CD documentation

---

## 📝 Fixed Configuration Preview

### Key Changes:

```yaml
name: Integration CI

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

env:
  NEXT_TELEMETRY_DISABLED: 1
  NODE_ENV: production

jobs:
  integration-test:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: npm
          cache-dependency-path: apps/frontend/package-lock.json

      - name: Build Frontend Image
        uses: docker/build-push-action@v5
        with:
          context: apps/frontend
          file: apps/frontend/Dockerfile
          target: prod
          load: true
          tags: lokifi-frontend:latest

      - name: Build Backend Image
        uses: docker/build-push-action@v5
        with:
          context: apps/backend
          file: apps/backend/Dockerfile
          load: true
          tags: lokifi-backend:latest

      - name: Create env file
        run: |
          cat > apps/backend/.env << 'EOL'
          LOKIFI_JWT_SECRET=test-secret-for-ci
          API_PREFIX=/api
          FRONTEND_ORIGIN=http://localhost:3000
          REDIS_URL=redis://:23233@redis:6379/0
          DATABASE_URL=postgresql+asyncpg://lokifi:lokifi_dev_password@postgres:5432/lokifi_db
          EOL

      - name: Start Services
        run: docker compose -f apps/docker-compose.yml up -d

      - name: Wait for Services
        run: |
          echo "Waiting for backend..."
          timeout 60 bash -c 'until curl -f http://localhost:8000/api/health > /dev/null 2>&1; do sleep 2; done'
          echo "Backend ready!"
          
          echo "Waiting for frontend..."
          timeout 60 bash -c 'until curl -f http://localhost:3000/ > /dev/null 2>&1; do sleep 2; done'
          echo "Frontend ready!"

      - name: Test Endpoints
        run: |
          curl -f http://localhost:8000/api/health
          curl -f http://localhost:3000/

      - name: Run Tests
        run: |
          cd apps/frontend
          npm ci --legacy-peer-deps
          npm run test:ci
```

---

## ✅ Acceptance Criteria

- [ ] All paths updated to use `apps/` prefix
- [ ] Docker compose uses correct file path
- [ ] Environment variables use LOKIFI prefix
- [ ] Image tags use lokifi naming
- [ ] Health checks work correctly
- [ ] Services start successfully
- [ ] Integration tests pass locally
- [ ] Integration tests pass in CI/CD
- [ ] Documentation updated

---

## 🚀 Execution Order

1. **Analysis Complete** ✅ (this document)
2. **Create fixed workflow file** (next step)
3. **Test locally with Docker**
4. **Fix any issues found**
5. **Commit and push**
6. **Create PR**
7. **Verify CI/CD**
8. **Merge to main**

---

## 📊 Risk Assessment

**Risk Level:** MEDIUM

**Potential Issues:**
- Docker build failures
- Missing environment variables
- Health endpoint mismatches
- Port conflicts
- Network configuration

**Mitigation:**
- Test locally first
- Incremental changes
- Good error logging
- Proper timeout values

---

**Status:** Ready to implement  
**Next Action:** Create fixed integration-ci.yml file  
**Estimated Time Remaining:** 3.5-6.5 hours
