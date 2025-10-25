# Local Development - Quick Start

> **Requirements**: Docker Desktop v4.48.0+ (or Docker Engine v28.5.1+ with Docker Compose v2.40.0+)

## 🚀 Start Local Development Server

```bash
# From infra/docker directory
cd C:\Users\USER\Desktop\lokifi\infra\docker
docker compose up
```

Or from project root:
```bash
cd C:\Users\USER\Desktop\lokifi
docker compose -f infra/docker/docker-compose.yml up
```

## 🌐 Access Your Local Application

Wait 30-60 seconds for all services to start, then open:

- **Frontend**: http://localhost:3000
- **Backend**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs
- **API Health Check**: http://localhost:8000/api/health

## 🛑 Stop Development Server

Press `Ctrl+C` in the terminal, or run:
```bash
docker compose down
```

## 📊 Running Services

When you run `docker compose up`, these containers start:

| Service | Port | Purpose |
|---------|------|---------|
| PostgreSQL | 5432 | Development database |
| Redis | 6379 | Caching layer |
| Backend (FastAPI) | 8000 | API server with hot-reload |
| Frontend (Next.js) | 3000 | Web app with hot-reload |

## ✨ Development Features

- ✅ **Hot Reload**: Code changes auto-update (no restart needed)
- ✅ **Debug Mode**: Detailed error messages
- ✅ **Simple Passwords**: Redis uses `23233`, PostgreSQL uses `lokifi_dev_password`
- ✅ **Local Database**: Data persists in Docker volumes
- ✅ **No SSL Required**: Plain HTTP for local development

## 🔍 Useful Commands

```bash
# View logs
docker compose logs -f

# View specific service logs
docker compose logs -f backend
docker compose logs -f frontend

# Restart a service
docker compose restart backend

# Stop and remove volumes (fresh start)
docker compose down -v

# Check running containers
docker ps
```

## ⚠️ Important Notes

### This is LOCAL Development Only
- Uses `docker-compose.yml` (NOT production files)
- Uses development passwords (simple and insecure)
- No SSL/domain configuration needed
- All data stays on your local machine

### Production Files
- `docker-compose.production.yml` - **Ready but NOT used locally**
- `.env` file with production secrets - **For deployment later**
- Domain configuration (www.lokifi.com) - **For production server only**

## 🎯 Everything is Ready!

**For Local Development (NOW):**
```bash
cd infra/docker
docker compose up
```

**For Production (LATER when you deploy):**
```bash
# On your production server
docker compose -f docker-compose.production.yml up -d
```

---

**Current Status**: ✅ Ready for both local development AND production deployment!
