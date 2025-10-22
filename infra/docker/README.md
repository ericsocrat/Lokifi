# 🐳 Docker Compose Configurations

**Streamlined Setup** - We've simplified from 7 to 4 essential compose files for clarity and maintainability.

---

## 📋 **File Inventory**

| File | Size | Purpose | When to Use |
|------|------|---------|-------------|
| `docker-compose.yml` | 2.27 KB | **Base development stack** | Daily local development |
| `docker-compose.override.yml` | 0.66 KB | **Dev hot-reload** | Auto-loaded for dev (hot-reload) |
| `docker-compose.prod-minimal.yml` | 1.89 KB | **Lean production** | Cloud deployment with managed DB |
| `docker-compose.production.yml` | 7.18 KB | **Full production** | Self-hosted with complete monitoring |

**Total**: 4 files, ~12 KB

### 🗑️ **Removed Files** (Cleanup: Oct 2025)
- ❌ `docker-compose.redis.yml` - Base Redis sufficient for most use cases
- ❌ `docker-compose.monitoring.yml` - Redundant (included in production.yml)
- ❌ `docker-compose.swarm.yml` - Docker Swarm rarely used (Kubernetes preferred)

---

## 🎯 **Which Compose File Should I Use?**

### 🟢 **Development**

#### 1. `docker-compose.yml` - **REQUIRED FOR DEV**
```bash
docker compose up
```
**What it does**: Base development stack with all core services
**Includes**: backend, frontend, postgres, redis, mailhog
**Why essential**: Foundation for all development work

#### 2. `docker-compose.override.yml` - **AUTO-LOADED**
```bash
# Auto-loaded with docker compose up
```
**What it does**: Adds hot-reload and volume mounts for development
**Includes**: Development overrides for frontend/backend
**Why essential**: Enables live code updates without restarts

---

### 🟡 **Production Deployment**

#### 3. `docker-compose.prod-minimal.yml` - **CLOUD OPTION**
```bash
docker compose -f docker-compose.prod-minimal.yml up -d
```
**What it does**: Lightweight production without database
**Includes**: backend, frontend, redis (no postgres, no monitoring)
**Best for**: AWS RDS, Azure Database, Google Cloud SQL deployments
**Use when**: Using managed cloud databases and external monitoring

#### 4. `docker-compose.production.yml` - **SELF-HOSTED**
```bash
docker compose -f docker-compose.production.yml up -d
```
**What it does**: Complete production stack with everything
**Includes**: backend, frontend, postgres, redis, traefik, prometheus, grafana, loki, promtail
**Best for**: Self-hosted VPS, dedicated servers, full control
**Features**: SSL/TLS auto-renewal, full observability stack, log aggregation---

## 📖 **Usage Examples**

### Development
```bash
# Standard development (auto-loads override.yml)
docker compose up

# Build and start fresh
docker compose up --build

# Run in background
docker compose up -d
```

### Production Deployment

#### Cloud Deployment (Managed Database)
```bash
# For AWS RDS, Azure Database, Google Cloud SQL, etc.
docker compose -f docker-compose.prod-minimal.yml up -d
```

#### Self-Hosted (Complete Stack)
```bash
# Everything: database, monitoring, logging, SSL
docker compose -f docker-compose.production.yml up -d
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
