# 🐳 Docker Compose Configurations

**Quick Reference Guide** for choosing the right compose file for your deployment scenario.

---

## 📋 **File Inventory**

| File | Size | Purpose | When to Use |
|------|------|---------|-------------|
| `docker-compose.yml` | 1.92 KB | **Base development stack** | Daily local development |
| `docker-compose.override.yml` | 0.44 KB | **Dev hot-reload** | Auto-loaded for dev (hot-reload) |
| `docker-compose.prod-minimal.yml` | 1.55 KB | **Lean production** | Cloud deployment with managed DB |
| `docker-compose.production.yml` | 6.62 KB | **Full production** | Self-hosted with monitoring |
| `docker-compose.redis.yml` | 2.41 KB | **Redis HA cluster** | Production Redis with failover |
| `docker-compose.monitoring.yml` | 0.77 KB | **Standalone monitoring** | Add Prometheus/Grafana to any setup |
| `docker-compose.swarm.yml` | 1.11 KB | **Docker Swarm** | Multi-server orchestration |

**Total**: 7 files, ~14.8 KB

---

## 🎯 **Which Compose File Should I Use?**

### 🟢 **Essential (Keep These)**

#### 1. `docker-compose.yml` - **REQUIRED**
```bash
docker compose up
```
**What it does**: Base development stack with all core services  
**Includes**: backend, frontend, postgres, redis, mailhog  
**Used by**: All developers, referenced in docs, CI/CD  
**Status**: ✅ **MUST KEEP**

#### 2. `docker-compose.override.yml` - **REQUIRED**
```bash
# Auto-loaded with docker compose up
```
**What it does**: Adds hot-reload and volume mounts for development  
**Includes**: Development overrides for frontend/backend  
**Used by**: Automatically loaded by Docker Compose  
**Status**: ✅ **MUST KEEP**

---

### 🟡 **Production Options (Choose Based on Needs)**

#### 3. `docker-compose.prod-minimal.yml` - **OPTIONAL**
```bash
docker compose -f docker-compose.prod-minimal.yml up -d
```
**What it does**: Lightweight production without database  
**Includes**: backend, frontend, redis (no postgres, no monitoring)  
**Use case**: AWS/Azure with RDS/managed databases  
**Referenced**: `infra/README.md`, main `README.md`  
**Decision**: 
- ✅ **KEEP** if using managed cloud databases
- ❌ **REMOVE** if only using full production stack

#### 4. `docker-compose.production.yml` - **RECOMMENDED**
```bash
docker compose -f docker-compose.production.yml up -d
```
**What it does**: Complete production stack with everything  
**Includes**: All services + traefik, prometheus, grafana, loki, promtail  
**Use case**: Self-hosted production, full observability  
**Referenced**: `infra/README.md`, `backend/README.md`, SSL docs  
**Status**: ✅ **KEEP** - Most complete production setup

---

### 🔴 **Specialized (Evaluate Need)**

#### 5. `docker-compose.redis.yml` - **OPTIONAL**
```bash
docker compose -f docker-compose.redis.yml up -d
```
**What it does**: Redis HA with primary, replica, sentinel  
**Includes**: redis-primary, redis-replica, redis-sentinel, redis-commander  
**Use case**: Production requiring Redis high availability  
**Referenced**: `backend/scripts`, `backend/Makefile`, Redis guide  
**Decision**:
- ✅ **KEEP** if Redis HA is planned/required
- ⚠️ **CONSIDER REMOVING** if basic Redis (from base compose) is sufficient
- Note: Basic redis in `docker-compose.yml` may be enough for most use cases

#### 6. `docker-compose.monitoring.yml` - **OPTIONAL**
```bash
docker compose -f docker-compose.yml -f docker-compose.monitoring.yml up
```
**What it does**: Add-on monitoring stack  
**Includes**: Prometheus, Grafana  
**Use case**: Add monitoring to base development stack  
**Referenced**: `backend/Makefile`, `monitoring/README.md`, `infra/README.md`  
**Decision**:
- ⚠️ **CONSIDER REMOVING** - Redundant since `docker-compose.production.yml` has full monitoring
- Alternative: Just use `docker-compose.production.yml` for monitoring needs

#### 7. `docker-compose.swarm.yml` - **OPTIONAL**
```bash
docker stack deploy -c docker-compose.swarm.yml lokifi
```
**What it does**: Docker Swarm orchestration config  
**Includes**: Swarm-specific deployment configs with replicas  
**Use case**: Multi-node Docker Swarm clusters  
**Referenced**: `infra/README.md` only  
**Decision**:
- ❌ **CONSIDER REMOVING** unless actively using Docker Swarm
- Most teams use Kubernetes or single-server deployments
- Swarm adoption is declining in industry

---

## 🎯 **Recommendation: Simplified Stack**

### Keep (4 files):
```
✅ docker-compose.yml              (base dev - required)
✅ docker-compose.override.yml     (dev hot-reload - required)
✅ docker-compose.prod-minimal.yml (cloud deployment option)
✅ docker-compose.production.yml   (self-hosted production)
```

### Consider Removing (3 files):
```
❌ docker-compose.redis.yml        (unless Redis HA needed - base redis is sufficient)
❌ docker-compose.monitoring.yml   (redundant - production.yml has monitoring)
❌ docker-compose.swarm.yml        (unless using Swarm - K8s more common)
```

**Reasoning**:
1. **Redis HA**: Basic Redis in base compose works for most apps. HA adds complexity.
2. **Monitoring addon**: `production.yml` already has Prometheus/Grafana/Loki/Promtail
3. **Swarm**: Industry moving to Kubernetes; Swarm maintenance burden without active use

---

## 📖 **Usage Examples**

### Development
```bash
# Standard development (uses override automatically)
docker compose up

# Development with monitoring
docker compose -f docker-compose.yml -f docker-compose.production.yml up
```

### Production Deployment

#### Option A: Cloud with Managed Database
```bash
# AWS RDS, Azure Database, etc.
docker compose -f docker-compose.prod-minimal.yml up -d
```

#### Option B: Self-Hosted Complete Stack
```bash
# Everything including database, monitoring, logging
docker compose -f docker-compose.production.yml up -d
```

### Adding Redis HA (if kept)
```bash
# Replace basic Redis with HA cluster
docker compose -f docker-compose.redis.yml up -d
```

---

## 🔧 **Common Commands**

```bash
# View running services
docker compose ps

# View logs
docker compose logs -f [service_name]

# Restart a service
docker compose restart [service_name]

# Stop everything
docker compose down

# Stop and remove volumes
docker compose down -v

# Pull latest images
docker compose pull

# Rebuild and start
docker compose up --build -d
```

---

## 🚀 **Quick Start Decision Tree**

```
Are you developing locally?
├─ YES → Use: docker compose up
└─ NO → Are you deploying to production?
    ├─ YES → Do you use managed cloud database?
    │   ├─ YES → Use: docker-compose.prod-minimal.yml
    │   └─ NO → Use: docker-compose.production.yml
    └─ NO → Contact DevOps team
```

---

## 📚 **Additional Resources**

- **Main Infrastructure Docs**: `../README.md`
- **Backend Setup**: `../../apps/backend/README.md`
- **Redis Guide**: `../../docs/guides/REDIS_DOCKER_SETUP.md`
- **SSL Setup**: `../ssl/SSL_SETUP_INSTRUCTIONS.md`
- **Monitoring**: `../monitoring/README.md`

---

## ⚙️ **Configuration Details**

### Service Versions (Standardized)
- **Redis**: `redis:7.4-alpine`
- **Postgres**: `postgres:17-alpine`
- **Traefik**: `traefik:v3.0`
- **Prometheus**: `prom/prometheus:latest`
- **Grafana**: `grafana/grafana:latest`

### Health Checks
All services include health checks with:
- Interval: 10-30s
- Timeout: 3-10s
- Retries: 3-5
- Start period: 10-40s (varies by service)

### Networks
- **Development**: Bridge network (auto-created)
- **Production**: Custom bridge `lokifi-network` (172.20.0.0/16)

---

## 🐛 **Troubleshooting**

### Services won't start
```bash
# Check logs
docker compose logs [service_name]

# Restart individual service
docker compose restart [service_name]

# Nuclear option - rebuild everything
docker compose down -v
docker compose up --build
```

### Port conflicts
```bash
# Check what's using ports
# Windows
netstat -ano | findstr ":8000"
netstat -ano | findstr ":3000"

# Kill process or change ports in compose file
```

### Database connection issues
```bash
# Ensure database is healthy
docker compose ps

# Check database logs
docker compose logs postgres

# Reset database (WARNING: deletes data)
docker compose down -v
docker compose up -d
```

---

**Last Updated**: October 22, 2025  
**Maintained By**: DevOps Team
