# Backend Scripts

> **Utility scripts for backend development and management**

## 📁 Scripts Overview

### Development Setup

#### `setup_backend.ps1`
**Complete backend environment setup**

```powershell
# Basic setup
.\setup_backend.ps1

# Force recreate virtual environment
.\setup_backend.ps1 -Force

# Include development dependencies
.\setup_backend.ps1 -DevMode
```

**What it does:**
- Creates Python virtual environment
- Installs all dependencies
- Verifies imports
- Creates .env from template
- Provides next steps guidance

**When to use:** First time setup or after dependency changes

---

#### `start_server.ps1`
**Start the backend server**

```powershell
# Start main server (default port 8002)
.\start_server.ps1

# Start on different port
.\start_server.ps1 -Port 8000
```

**What it does:**
- Starts uvicorn with hot-reload
- Configures host and port
- Sets up Python path

**When to use:** Daily development, starting the backend

---

### Database Management

#### `manage_db.py`
**Database management CLI tool**

```bash
# Show database metrics
python manage_db.py metrics

# Migrate from SQLite to PostgreSQL
python manage_db.py migrate --source sqlite+aiosqlite:///./data/lokifi.sqlite --target postgresql://...

# Archive old conversations
python manage_db.py archive --batch-size 1000 --dry-run
```

**What it does:**
- Database migration (SQLite → PostgreSQL)
- Storage metrics and monitoring
- Data archival for old conversations
- Database maintenance tasks

**When to use:**
- Production database migration
- Monitoring database size
- Archiving old data

---

#### `performance_indexes.sql`
**Database performance optimization**

```bash
# Run against your database
psql -U lokifi -d lokifi -f performance_indexes.sql
```

**What it does:**
- Creates optimized indexes for notifications
- Creates indexes for messages/conversations
- Creates indexes for users table
- Runs ANALYZE for query planner

**When to use:**
- Initial production setup
- After large data imports
- When queries become slow

---

### Integration

#### `notification_integration_helpers.py`
**Notification system integration** ⚠️ **ACTIVELY USED BY ROUTERS**

**Used by:**
- `app/routers/ai.py` - AI response notifications
- `app/routers/conversations.py` - DM notifications
- `app/routers/follow.py` - Follow notifications

**What it does:**
- Integrates J6 notification system
- Provides hooks for follow events
- Handles DM message notifications
- Triggers AI response notifications
- Tracks integration statistics

**When to use:**
- Called automatically by routers
- Don't delete or modify without checking router dependencies

---

## 🗑️ Removed Scripts

The following scripts were removed because Docker Compose now handles all infrastructure:

| Script | Reason | Replacement |
|--------|--------|-------------|
| `setup_redis_docker.py` | Redis setup | `docker compose up` (infra/docker/) |
| `setup_storage.py` | PostgreSQL setup | `docker compose up` (infra/docker/) |
| `setup_database.ps1` | Database setup | `docker compose up` (infra/docker/) |
| `setup_production_infrastructure.ps1` | Production setup | `docker-compose.production.yml` |
| `check_database_schema.py` | SQLite-specific | Not needed (using PostgreSQL) |
| `start_server.py` | Redundant | `start_server.ps1` (PowerShell) |
| `start_backend_dev_testing.ps1` | Redundant | Merged into `setup_backend.ps1` |

---

## 🚀 Quick Start Workflow

### First Time Setup

```powershell
# 1. Setup backend environment
cd apps/backend/scripts
.\setup_backend.ps1 -DevMode

# 2. Start Docker services (PostgreSQL, Redis)
cd ../../../infra/docker
docker compose up

# 3. Run database migrations
cd ../../apps/backend
alembic upgrade head

# 4. Start backend server
.\scripts\start_server.ps1
```

### Daily Development

```powershell
# 1. Ensure Docker services are running
cd infra/docker
docker compose up -d

# 2. Start backend
cd ../../apps/backend
.\scripts\start_server.ps1
```

### Production Deployment

```powershell
# 1. Run performance indexes
psql -U lokifi -d lokifi -f scripts/performance_indexes.sql

# 2. Check database metrics
python scripts/manage_db.py metrics

# 3. Deploy using Docker Compose
cd ../../../infra/docker
docker compose -f docker-compose.production.yml up -d
```

---

## 📚 Related Documentation

- **Docker Setup**: `/infra/docker/LOCAL_DEVELOPMENT.md`
- **Production Deployment**: `/docs/deployment/`
- **Backend README**: `/apps/backend/README.md`
- **Database Migrations**: `/apps/backend/alembic/`

---

**Last Updated**: October 22, 2025
**Cleaned Up**: Removed 7 obsolete scripts (Docker Compose migration)
