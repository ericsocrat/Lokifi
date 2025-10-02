# 🧪 Lokifi Testing & Deployment Guide

**Last Updated**: October 2, 2025
**Project**: Lokifi (formerly Fynix)
**Status**: Production Ready ✅

---

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Local Development Setup](#local-development-setup)
3. [Environment Configuration](#environment-configuration)
4. [Testing Procedures](#testing-procedures)
5. [Production Deployment](#production-deployment)
6. [Troubleshooting](#troubleshooting)

---

## 1. Prerequisites

### Required Software:

- **Python**: 3.10 or higher
- **Node.js**: 18.x or higher
- **Redis**: 6.x or higher
- **PostgreSQL**: 13.x or higher (optional, SQLite by default)
- **Git**: Latest version

### System Requirements:

- **RAM**: Minimum 4GB (8GB recommended)
- **Storage**: 2GB free space
- **OS**: Windows, macOS, or Linux

---

## 2. Local Development Setup

### Step 1: Clone Repository

```bash
# If not already cloned
git clone https://github.com/ericsocrat/Lokifi.git
cd Lokifi
```

### Step 2: Backend Setup

```bash
# Navigate to backend
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows (PowerShell):
.\venv\Scripts\Activate.ps1
# Windows (CMD):
venv\Scripts\activate.bat
# macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Verify installation
python -m pip list
```

### Step 3: Frontend Setup

```bash
# Navigate to frontend (from project root)
cd frontend

# Install dependencies
npm install

# Verify installation
npm list --depth=0
```

### Step 4: Redis Setup

**Option A: Local Redis Installation**

```bash
# Windows (using Chocolatey):
choco install redis-64

# macOS (using Homebrew):
brew install redis

# Linux (Ubuntu/Debian):
sudo apt-get install redis-server

# Start Redis
redis-server
```

**Option B: Docker Redis**

```bash
docker run -d -p 6379:6379 --name lokifi-redis redis:7-alpine
```

---

## 3. Environment Configuration

### Backend Configuration

Create `.env` file in `backend/` directory:

```env
# === Lokifi Backend Configuration ===

# Application Settings
PROJECT_NAME=Lokifi
PROJECT_VERSION=1.0.0
ENVIRONMENT=development
DEBUG=True

# Server Settings
HOST=0.0.0.0
PORT=8000

# Database Configuration
DATABASE_URL=sqlite:///./lokifi.sqlite
# For PostgreSQL:
# DATABASE_URL=postgresql://user:password@localhost:5432/lokifi

# Redis Configuration
REDIS_URL=redis://:lokifi_secure_redis_2025_v2@localhost:6379/0
REDIS_PASSWORD=lokifi_secure_redis_2025_v2

# JWT & Security
LOKIFI_JWT_SECRET=your-super-secret-jwt-key-here-change-this-in-production
LOKIFI_JWT_TTL_MIN=60
LOKIFI_JWT_ALGORITHM=HS256

# CORS Settings
CORS_ORIGINS=http://localhost:3000,http://localhost:8000
ALLOWED_HOSTS=localhost,127.0.0.1

# Email Configuration (Optional)
PROJECT_EMAIL=noreply@lokifi.com
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password

# File Upload
MAX_UPLOAD_SIZE=10485760
UPLOAD_DIR=./uploads

# Logging
LOG_LEVEL=INFO
LOG_FILE=logs/lokifi.log

# Rate Limiting
RATE_LIMIT_ENABLED=True
RATE_LIMIT_PER_MINUTE=60

# API Keys (if using external services)
# BINANCE_API_KEY=your-key
# BINANCE_API_SECRET=your-secret
```

### Frontend Configuration

Create `.env.local` file in `frontend/` directory:

```env
# === Lokifi Frontend Configuration ===

# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_WS_URL=ws://localhost:8000

# Data Provider
NEXT_PUBLIC_DATA_PROVIDER=api
# Options: 'api', 'mock', 'binance'

# Feature Flags
NEXT_PUBLIC_ENABLE_EXPERIMENTAL=false
NEXT_PUBLIC_ENABLE_COLLAB=true
NEXT_PUBLIC_ENABLE_PLUGINS=true

# Analytics (Optional)
# NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX
# NEXT_PUBLIC_SENTRY_DSN=https://xxx@sentry.io/xxx

# Environment
NEXT_PUBLIC_ENVIRONMENT=development
```

### Redis Configuration

Update `redis/redis.conf`:

```conf
# Lokifi Redis Configuration
requirepass lokifi_secure_redis_2025_v2
maxmemory 256mb
maxmemory-policy allkeys-lru
save 900 1
save 300 10
save 60 10000
```

---

## 4. Testing Procedures

### 4.1 Pre-Flight Checks

```bash
# Check Python version
python --version
# Expected: Python 3.10.x or higher

# Check Node version
node --version
# Expected: v18.x.x or higher

# Check Redis
redis-cli ping
# Expected: PONG
```

### 4.2 Backend Tests

```bash
cd backend

# Activate virtual environment
.\venv\Scripts\Activate.ps1  # Windows
# source venv/bin/activate     # macOS/Linux

# Run all tests
pytest

# Run with coverage
pytest --cov=. --cov-report=html

# Run specific test suite
pytest tests/test_api.py -v

# Run integration tests
pytest tests/integration/ -v
```

### 4.3 Frontend Tests

```bash
cd frontend

# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run E2E tests (if configured)
npm run test:e2e

# Type checking
npm run type-check

# Linting
npm run lint
```

### 4.4 Manual Testing Checklist

#### ✅ Backend Testing

- [ ] **Server Startup**

  ```bash
  cd backend
  python -m uvicorn main:app --reload
  ```

  - Server starts without errors
  - Swagger docs accessible at `http://localhost:8000/docs`

- [ ] **Database Connection**

  - SQLite file created at `backend/lokifi.sqlite`
  - Tables created successfully
  - Can query database

- [ ] **Redis Connection**

  - Redis accepts connections
  - Cache operations work
  - Session storage works

- [ ] **API Endpoints**
  - GET `/health` returns 200 OK
  - Authentication endpoints work
  - CRUD operations function correctly

#### ✅ Frontend Testing

- [ ] **Development Server**

  ```bash
  cd frontend
  npm run dev
  ```

  - App runs at `http://localhost:3000`
  - No console errors
  - Hot reload works

- [ ] **Authentication**

  - User registration works
  - User login works (creates `lokifi_token`)
  - User logout works
  - Token refresh works
  - Protected routes require auth

- [ ] **Chart Functionality**

  - Charts load and display
  - Symbol switching works
  - Timeframe changes work
  - Real-time updates work
  - Chart indicators display

- [ ] **Drawing Tools**

  - All drawing tools render
  - Ghost mode works (`__lokifiGhost`)
  - Anchor points work (`__lokifiAnchor`)
  - Settings save/load correctly

- [ ] **Plugin System**

  - Trendline Plus works
  - Ruler Measure works
  - Parallel Channels work
  - Fibonacci Extensions work
  - Settings apply per-symbol

- [ ] **Project Management**

  - Save project works
  - Load project works
  - Export PNG works
  - Export PDF works
  - Share link generation works

- [ ] **Console & Logs**
  - No errors in browser console
  - No "fynix" references anywhere
  - No TypeScript errors
  - Backend logs clean

---

## 5. Production Deployment

### 5.1 Pre-Deployment Checklist

- [ ] All tests passing
- [ ] Environment variables configured
- [ ] Secrets rotated (JWT, Redis password)
- [ ] Database backup created
- [ ] SSL certificates ready
- [ ] Domain DNS configured
- [ ] CDN configured (if using)

### 5.2 Backend Deployment

#### Option A: Traditional Server (Ubuntu)

```bash
# 1. Update system
sudo apt update && sudo apt upgrade -y

# 2. Install dependencies
sudo apt install python3.10 python3-pip nginx redis-server -y

# 3. Clone repository
cd /var/www
sudo git clone https://github.com/ericsocrat/Lokifi.git
cd Lokifi

# 4. Setup Python environment
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# 5. Configure environment
sudo nano .env
# Paste production .env config

# 6. Run migrations
python -m alembic upgrade head

# 7. Create systemd service
sudo nano /etc/systemd/system/lokifi.service
```

**lokifi.service**:

```ini
[Unit]
Description=Lokifi Backend API
After=network.target redis.service

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/Lokifi/backend
Environment="PATH=/var/www/Lokifi/backend/venv/bin"
ExecStart=/var/www/Lokifi/backend/venv/bin/uvicorn main:app --host 0.0.0.0 --port 8000 --workers 4
Restart=always

[Install]
WantedBy=multi-user.target
```

```bash
# Start service
sudo systemctl start lokifi
sudo systemctl enable lokifi
sudo systemctl status lokifi
```

#### Option B: Docker Deployment

**Dockerfile** (already in `backend/Dockerfile.prod`):

```bash
# Build image
docker build -f Dockerfile.prod -t lokifi-backend:latest .

# Run container
docker run -d \
  --name lokifi-backend \
  -p 8000:8000 \
  --env-file .env.production \
  lokifi-backend:latest
```

### 5.3 Frontend Deployment

#### Option A: Vercel (Recommended for Next.js)

```bash
# Install Vercel CLI
npm i -g vercel

# Navigate to frontend
cd frontend

# Deploy
vercel --prod
```

Configure environment variables in Vercel dashboard:

- `NEXT_PUBLIC_API_URL=https://api.yourdomain.com`
- `NEXT_PUBLIC_WS_URL=wss://api.yourdomain.com`
- All other `NEXT_PUBLIC_*` variables

#### Option B: Traditional Server (Nginx)

```bash
# 1. Build frontend
cd frontend
npm install
npm run build

# 2. Copy build to server
rsync -avz out/ user@server:/var/www/lokifi/

# 3. Configure Nginx
sudo nano /etc/nginx/sites-available/lokifi
```

**Nginx config**:

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    root /var/www/lokifi;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/lokifi /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

#### Option C: Docker Deployment

```bash
# Build
docker build -t lokifi-frontend:latest .

# Run
docker run -d \
  --name lokifi-frontend \
  -p 3000:3000 \
  lokifi-frontend:latest
```

### 5.4 SSL Configuration (Let's Encrypt)

```bash
# Install certbot
sudo apt install certbot python3-certbot-nginx -y

# Obtain certificate
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Auto-renewal is configured automatically
sudo certbot renew --dry-run
```

### 5.5 Database Backup

```bash
# SQLite backup
sqlite3 lokifi.sqlite ".backup '/backups/lokifi_$(date +%Y%m%d_%H%M%S).sqlite'"

# Setup cron job for daily backups
crontab -e
```

Add line:

```cron
0 2 * * * sqlite3 /var/www/Lokifi/backend/lokifi.sqlite ".backup '/backups/lokifi_$(date +\%Y\%m\%d_\%H\%M\%S).sqlite'"
```

---

## 6. Troubleshooting

### Common Issues

#### Issue: "Module not found" errors

**Solution**:

```bash
# Backend
cd backend
pip install -r requirements.txt --force-reinstall

# Frontend
cd frontend
rm -rf node_modules package-lock.json
npm install
```

#### Issue: Redis connection refused

**Solution**:

```bash
# Check Redis is running
redis-cli ping

# If not running:
redis-server redis/redis.conf

# Test authentication:
redis-cli -a lokifi_secure_redis_2025_v2 ping
```

#### Issue: Port already in use

**Solution**:

```bash
# Find process using port 8000
netstat -ano | findstr :8000  # Windows
lsof -i :8000                  # macOS/Linux

# Kill process
taskkill /PID <PID> /F         # Windows
kill -9 <PID>                  # macOS/Linux
```

#### Issue: Database locked

**Solution**:

```bash
# Close all connections to database
# Restart backend server
# If persistent, delete lock file:
rm backend/lokifi.sqlite-wal
rm backend/lokifi.sqlite-shm
```

#### Issue: TypeScript errors in frontend

**Solution**:

```bash
cd frontend
npm run type-check
# Fix reported errors
# Rebuild
npm run build
```

#### Issue: "lokifi_token not found" after login

**Cause**: Token storage key changed from `fynix_token` to `lokifi_token`

**Solution**: Users need to re-login once. This is expected after rebranding.

---

## 📊 Performance Monitoring

### Backend Monitoring

```bash
# Check API response times
curl -w "@curl-format.txt" -o /dev/null -s http://localhost:8000/health

# Monitor Redis
redis-cli --stat

# Check database size
ls -lh backend/lokifi.sqlite
```

### Frontend Monitoring

```bash
# Lighthouse audit
npx lighthouse http://localhost:3000 --view

# Bundle size analysis
cd frontend
npm run analyze
```

---

## 🔐 Security Best Practices

1. **Never commit `.env` files**
2. **Rotate secrets regularly** (JWT, Redis password, API keys)
3. **Enable HTTPS in production** (mandatory)
4. **Use strong passwords** (minimum 16 characters)
5. **Enable rate limiting** (already configured)
6. **Regular security audits** (use `npm audit`, `pip-audit`)
7. **Keep dependencies updated**
8. **Monitor logs** for suspicious activity
9. **Backup database daily**
10. **Use environment-specific configs**

---

## 📞 Support & Resources

- **GitHub Repository**: https://github.com/ericsocrat/Lokifi
- **Documentation**: See `docs/` directory
- **Issues**: https://github.com/ericsocrat/Lokifi/issues

---

## ✅ Quick Start Commands

```bash
# Start everything locally (development)

# Terminal 1: Redis
redis-server redis/redis.conf

# Terminal 2: Backend
cd backend
.\venv\Scripts\Activate.ps1
python -m uvicorn main:app --reload

# Terminal 3: Frontend
cd frontend
npm run dev

# Access:
# Frontend: http://localhost:3000
# Backend API: http://localhost:8000
# API Docs: http://localhost:8000/docs
```

---

**Last Updated**: October 2, 2025
**Document Version**: 1.0.0
**Status**: Production Ready ✅
