# Integration Tests - Quick Start Guide

**Date:** October 16, 2025
**Status:** ✅ Re-enabled and Fixed

---

## 🎯 Overview

Integration tests verify that all services (backend, frontend, database, Redis) work together correctly in a Docker environment.

---

## 🚀 Quick Start

### Run Integration Tests Locally

```bash
# 1. Start services
docker compose -f infra/docker/docker-compose.yml up -d

# 2. Wait for services to be ready (see API_REFERENCE.md for endpoint docs)
curl http://localhost:8000/api/health  # Backend
curl http://localhost:3000/            # Frontend

# 3. Run tests
npm ci --legacy-peer-deps

**📖 For complete setup and testing commands:**
- [`../QUICK_START.md`](../QUICK_START.md) - Initial setup and directory navigation
- [`TESTING_GUIDE.md`](TESTING_GUIDE.md) - Comprehensive testing strategies and CI commands

# 4. Stop services
docker compose -f infra/docker/docker-compose.yml down -v
```

---

## 🐳 Docker Setup

### Services Included

1. **PostgreSQL** - Database (port 5432)
2. **Redis** - Cache/Queue (port 6379)
3. **Backend** - FastAPI (port 8000)
4. **Frontend** - Next.js (port 3000)

### Environment Variables

Integration tests use containerized environment variables.

**📖 For complete environment configuration:**
- [`../security/README.md`](../security/README.md) - Environment variables and security setup
- [`REDIS_DOCKER_SETUP.md`](REDIS_DOCKER_SETUP.md) - Redis-specific configuration
- [`POSTGRESQL_SETUP_GUIDE.md`](POSTGRESQL_SETUP_GUIDE.md) - Database configuration

---

## 🧪 Automation Integration

### Workflow File

**Location:** `.github/workflows/integration-ci.yml`

**Triggers:**
- Push to `main`
- Pull requests to `main`

**Steps:**
1. Build Docker images
2. Start services
3. Wait for health checks
4. Run integration tests
5. Show logs on failure
6. Cleanup

**Duration:** ~5-8 minutes

---

## 📋 Health Endpoints

**📖 For complete API endpoint documentation:** See [`../api/API_REFERENCE.md`](../api/API_REFERENCE.md)

### Frontend
- **URL:** `http://localhost:3000/`
- **Expected:** 200 OK (renders page)

---

## 🔧 Troubleshooting

### Services Won't Start

```bash
# Check service status
docker compose -f infra/docker/docker-compose.yml ps

# View logs
docker compose -f infra/docker/docker-compose.yml logs

# Restart services
docker compose -f infra/docker/docker-compose.yml restart
```

### Health Checks Failing

```bash
# Test backend directly (see API_REFERENCE.md for endpoints)
docker exec -it lokifi-backend-dev curl http://localhost:8000/api/health

# Check backend logs
docker compose -f infra/docker/docker-compose.yml logs backend
```

### Port Conflicts

```bash
# Check what's using ports
netstat -ano | findstr "8000"
netstat -ano | findstr "3000"
netstat -ano | findstr "5432"
netstat -ano | findstr "6379"

# Kill processes or change ports in docker-compose.yml
```

### Database Connection Issues

```bash
# Test database
docker exec -it lokifi-postgres-dev psql -U lokifi -d lokifi_db -c "SELECT 1;"

# Check database logs
docker compose -f infra/docker/docker-compose.yml logs postgres
```

---

## 📁 Key Files

```
infra/docker/
├── docker-compose.yml           # Main Docker configuration
├── docker-compose.ci.yml        # CI/CD configuration
apps/
├── backend/
│   ├── Dockerfile              # Production build
│   ├── Dockerfile.dev          # Development build
│   └── .env                    # Environment variables (see Environment Configuration Guide)
└── frontend/
    ├── Dockerfile              # Production build
    └── Dockerfile.dev          # Development build

> **📖 Environment setup:** See [Environment Configuration Guide](../security/ENVIRONMENT_CONFIGURATION.md) for `.env` file configuration

.github/workflows/
└── integration-ci.yml          # Automation workflow
```

---

## ✅ Testing Checklist

Before pushing changes:

- [ ] Services start successfully
- [ ] Health endpoints return 200
- [ ] Backend can connect to database
- [ ] Backend can connect to Redis
- [ ] Frontend can reach backend
- [ ] Integration tests pass
- [ ] Services shut down cleanly

---

## 🔄 Common Commands

```bash
# Start services
docker compose -f infra/docker/docker-compose.yml up -d

# Stop services
docker compose -f infra/docker/docker-compose.yml down

# Stop and remove volumes (clean slate)
docker compose -f infra/docker/docker-compose.yml down -v

# View logs
docker compose -f infra/docker/docker-compose.yml logs -f

# View specific service logs
docker compose -f infra/docker/docker-compose.yml logs backend -f

# Rebuild images
docker compose -f infra/docker/docker-compose.yml build --no-cache

# Restart a service
docker compose -f infra/docker/docker-compose.yml restart backend

# Execute command in container
docker exec -it lokifi-backend-dev bash
```

---

## 📊 Expected Behavior

### Startup Sequence

1. **PostgreSQL starts** (~5 seconds)
2. **Redis starts** (~3 seconds)
3. **Backend starts** (~10 seconds)
   - Connects to database
   - Connects to Redis
   - Runs migrations
   - Health endpoint available
4. **Frontend starts** (~15 seconds)
   - Builds Next.js
   - Starts server
   - Page accessible

**Total startup time:** ~30-40 seconds

### Health Check Response

**Backend (`/api/health`):**
```json
{
  "ok": true
}
```

**Frontend (`/`):**
- Status: 200
- Content: HTML page

---

## 🎯 Success Criteria

Integration tests are passing when:

✅ All services start within timeout (90s)
✅ Health endpoints return 200
✅ No error logs in services
✅ Tests complete successfully
✅ Services shut down cleanly

---

## 📝 Notes

### Environment Differences

| Environment | Purpose | Dockerfile | Port |
|-------------|---------|------------|------|
| Development | Local dev with hot reload | Dockerfile.dev | Default |
| Integration | Automation testing | Dockerfile | Default |
| Production | Deployed application | Dockerfile.prod | Configured |

### Known Issues

1. **First build takes longer** - Docker layer caching helps subsequent builds
2. **Port conflicts** - Stop other local services if needed
3. **Volume permissions** - May need to adjust on some systems

---

## 🔗 Related Documentation

- [Docker Compose Configuration](../../infra/docker/docker-compose.yml)
- [Backend README](../../apps/backend/README.md)
- [Frontend README](../../apps/frontend/README.md)
- [Deployment Pipeline](../.github/workflows/lokifi-unified-pipeline.yml)

---

**Last Updated:** October 16, 2025
**Status:** ✅ Active and Working
**Maintained By:** DevOps Team
