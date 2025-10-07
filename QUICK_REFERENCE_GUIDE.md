# 🚀 Lokifi Quick Reference

**Last Updated:** October 7, 2025

---

## ⚡ Quick Commands

### Start Development Environment
```bash
# Start ALL services (recommended)
.\start-servers.ps1
```
This will:
- ✅ Start Redis (Docker)
- ✅ Start Backend (FastAPI on port 8000)
- ✅ Start Frontend (Next.js on port 3000)

### Manage Redis
```bash
# Check Redis status
.\manage-redis.ps1 status

# View Redis logs
.\manage-redis.ps1 logs

# Open Redis CLI
.\manage-redis.ps1 shell

# Restart Redis
.\manage-redis.ps1 restart
```

### Test APIs
```bash
# Run API tests
.\test-api.ps1
```

---

## 📁 Essential Scripts

| Script | Purpose |
|--------|---------|
| `start-servers.ps1` | **Main launcher** - starts all services |
| `manage-redis.ps1` | Redis container management |
| `test-api.ps1` | Test backend APIs |
| `cleanup-repo.ps1` | Clean up old documentation |
| `cleanup-scripts.ps1` | Clean up redundant scripts |

---

## 🌐 Access Points

| Service | URL | Description |
|---------|-----|-------------|
| Frontend | http://localhost:3000 | Main application |
| Backend API | http://localhost:8000 | REST API |
| API Docs | http://localhost:8000/docs | Interactive API documentation |
| Health Check | http://localhost:8000/api/health | Service status |

---

## 📚 Essential Documentation

| File | Purpose |
|------|---------|
| `README.md` | Main project documentation |
| `START_HERE.md` | Getting started guide |
| `PROJECT_STATUS_CONSOLIDATED.md` | Current status & architecture |
| `QUICK_START_GUIDE.md` | Quick setup instructions |
| `DEPLOYMENT_GUIDE.md` | Production deployment |
| `DEVELOPMENT_SETUP.md` | Development environment setup |

---

## 🐳 Docker Commands

### Using Docker Compose
```bash
# Start all services
docker-compose up -d

# Stop all services
docker-compose down

# View logs
docker-compose logs -f

# Restart a service
docker-compose restart backend
```

### Redis Container (Manual)
```bash
# Start/create Redis container
docker run -d --name lokifi-redis -p 6379:6379 \
  -e REDIS_PASSWORD=23233 --restart unless-stopped \
  redis:latest redis-server --requirepass 23233

# Start existing container
docker start lokifi-redis

# Stop container
docker stop lokifi-redis

# View logs
docker logs -f lokifi-redis
```

---

## 🔧 Backend Commands

```bash
cd backend

# Activate virtual environment
.\venv\Scripts\Activate.ps1

# Run migrations
alembic upgrade head

# Create new migration
alembic revision --autogenerate -m "Description"

# Run tests
pytest

# Start server manually
python -m uvicorn app.main:app --reload
```

---

## 🎨 Frontend Commands

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run tests
npm test
```

---

## 🐛 Troubleshooting

### Redis Issues
```bash
# Check if Redis is running
docker ps | grep lokifi-redis

# Restart Redis
.\manage-redis.ps1 restart

# Check Redis logs
.\manage-redis.ps1 logs
```

### Backend Issues
```bash
# Check backend logs
cd backend
# Look for error in terminal

# Test health endpoint
curl http://localhost:8000/api/health

# Check Redis connection
curl http://localhost:8000/api/health
# Should show "redis": "connected"
```

### Frontend Issues
```bash
# Clear .next cache
cd frontend
Remove-Item -Recurse -Force .next

# Reinstall dependencies
Remove-Item -Recurse -Force node_modules
npm install

# Restart dev server
npm run dev
```

### Docker Issues
```bash
# Check Docker is running
docker ps

# Restart Docker Desktop (Windows)
# Open Docker Desktop and click Restart

# Clean up Docker resources
docker system prune -a

# Rebuild containers
docker-compose down
docker-compose up -d --build
```

---

## 🔐 Environment Variables

### Backend (.env)
```bash
DATABASE_URL=postgresql://user:password@localhost:5432/lokifi
REDIS_URL=redis://:23233@localhost:6379/0
SECRET_KEY=your-secret-key
GOOGLE_CLIENT_ID=your-client-id
COINGECKO_API_KEY=your-api-key
```

### Frontend (.env.local)
```bash
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-client-id
```

---

## 🚨 Common Errors & Solutions

| Error | Solution |
|-------|----------|
| `Redis connection refused` | Start Redis: `.\manage-redis.ps1 start` |
| `Port 8000 already in use` | Kill process: `Stop-Process -Name python -Force` |
| `Port 3000 already in use` | Kill process: `Stop-Process -Name node -Force` |
| `Docker not running` | Start Docker Desktop |
| `Module not found` | Backend: `pip install -r requirements.txt`<br>Frontend: `npm install` |
| `Database connection error` | Check PostgreSQL is running |

---

## 📊 Performance Tips

### Redis Caching
- Cache hit rate should be ~95%
- Response times: <500ms with cache
- Check cache status: `.\manage-redis.ps1 status`

### API Rate Limits
- CoinGecko: 10-30 requests/min (free tier)
- Yahoo Finance: ~2000 requests/hour
- Use batch endpoints when possible

### Development
- Use hot reload for faster development
- Backend auto-reloads on file changes
- Frontend auto-reloads with Fast Refresh

---

## 🎯 Daily Workflow

1. **Start servers:**
   ```bash
   .\start-servers.ps1
   ```

2. **Make changes:**
   - Edit backend files in `backend/app/`
   - Edit frontend files in `frontend/`

3. **Test changes:**
   - Backend: Check terminal output
   - Frontend: Browser auto-refreshes
   - APIs: Use `.\test-api.ps1`

4. **Commit changes:**
   ```bash
   git add .
   git commit -m "feat: Your change description"
   git push
   ```

5. **Stop servers:**
   - Close terminal windows
   - Or: `docker-compose down` if using Docker Compose

---

## 📞 Support

- **Issues:** https://github.com/ericsocrat/Lokifi/issues
- **Docs:** Check `docs/` directory
- **API Docs:** http://localhost:8000/docs (when running)

---

**Quick Tip:** Bookmark this file for fast reference! 🔖
