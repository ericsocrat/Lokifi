# 🚀 Deployment Guide for Lokifi

This guide covers multiple deployment options for the Lokifi application.

---

## 📋 **Table of Contents**

1. [Local Production Deployment](#local-production-deployment) ⭐ Quickest
2. [Cloud Platform Deployment](#cloud-platform-deployment) 🌐 Scalable
3. [VPS/Server Deployment](#vpsserver-deployment) 🖥️ Full Control
4. [Monitoring & Maintenance](#monitoring--maintenance)

---

## 🏠 Local Production Deployment

**Best for**: Testing production builds locally, small-scale deployments

### Quick Start

```powershell
# Deploy everything
.\deploy-local-prod.ps1

# Deploy backend only
.\deploy-local-prod.ps1 -BackendOnly

# Deploy frontend only
.\deploy-local-prod.ps1 -FrontendOnly

# Skip build (if already built)
.\deploy-local-prod.ps1 -SkipBuild
```

### What It Does

1. ✅ Checks WSL and Redis status
2. ✅ Installs/updates dependencies
3. ✅ Runs database migrations
4. ✅ Builds frontend for production
5. ✅ Starts services in production mode
6. ✅ Opens monitoring terminals

### Access Points

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs
- **Redis**: localhost:6379

### Stopping Services

```powershell
# Stop backend
wsl bash -c 'pkill -f uvicorn'

# Stop frontend
Get-Process node | Where-Object CommandLine -like '*next*' | Stop-Process

# Stop Redis
wsl sudo systemctl stop redis-server
```

---

## 🌐 Cloud Platform Deployment

### Option A: Vercel (Frontend) + Railway (Backend) ⭐ Recommended

#### 1. Deploy Frontend to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy from frontend directory
cd frontend
vercel --prod
```

**Environment Variables in Vercel Dashboard:**
```
NEXT_PUBLIC_API_URL=https://your-backend.railway.app
NEXT_PUBLIC_WS_URL=wss://your-backend.railway.app
```

#### 2. Deploy Backend to Railway

1. Visit https://railway.app
2. Click "New Project" → "Deploy from GitHub repo"
3. Select your repository
4. Configure:
   - **Root Directory**: `backend`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`

**Environment Variables in Railway:**
```
ENVIRONMENT=production
SECRET_KEY=your-secret-key-here
DATABASE_URL=postgresql://user:pass@host:5432/db
REDIS_URL=redis://red-xxx.railway.app:6379
```

5. Add PostgreSQL and Redis services from Railway marketplace

**Cost**:
- Vercel: Free tier available
- Railway: ~$5-20/month

---

### Option B: Render (Full Stack)

1. Visit https://render.com
2. Create **Web Service** for backend:
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`

3. Create **Static Site** for frontend:
   - **Build Command**: `npm install && npm run build`
   - **Publish Directory**: `out`

4. Add PostgreSQL and Redis from Render

**Cost**: Free tier available, paid plans start at $7/month

---

### Option C: AWS (Production-Grade)

#### Backend (EC2 + RDS + ElastiCache)

```bash
# 1. Launch EC2 instance (Ubuntu 22.04)
# 2. SSH into instance
ssh -i your-key.pem ubuntu@your-instance-ip

# 3. Install dependencies
sudo apt update
sudo apt install python3.12 python3-pip nginx -y

# 4. Clone repository
git clone https://github.com/yourusername/lokifi.git
cd lokifi/backend

# 5. Install Python packages
pip3 install -r requirements.txt

# 6. Create systemd service
sudo nano /etc/systemd/system/lokifi-backend.service
```

**Service file** (`/etc/systemd/system/lokifi-backend.service`):
```ini
[Unit]
Description=Lokifi Backend API
After=network.target

[Service]
User=ubuntu
WorkingDirectory=/home/ubuntu/lokifi/backend
Environment="PATH=/home/ubuntu/.local/bin:/usr/local/bin:/usr/bin"
Environment="ENVIRONMENT=production"
EnvironmentFile=/home/ubuntu/lokifi/backend/.env
ExecStart=/home/ubuntu/.local/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
Restart=always

[Install]
WantedBy=multi-user.target
```

```bash
# Enable and start service
sudo systemctl enable lokifi-backend
sudo systemctl start lokifi-backend
sudo systemctl status lokifi-backend
```

#### Frontend (S3 + CloudFront)

```bash
# 1. Build frontend
cd frontend
npm install
npm run build

# 2. Upload to S3
aws s3 sync out/ s3://your-bucket-name/ --delete

# 3. Create CloudFront distribution pointing to S3 bucket
# (Via AWS Console or CLI)
```

**Cost**: ~$20-50/month (depends on usage)

---

## 🖥️ VPS/Server Deployment (Traditional)

**Best for**: Full control, custom requirements

### Prerequisites

- Ubuntu 22.04+ server
- Domain name (optional but recommended)
- SSH access

### 1. Server Setup

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install required packages
sudo apt install -y \
    python3.12 \
    python3-pip \
    nodejs \
    npm \
    nginx \
    postgresql \
    redis-server \
    git \
    certbot \
    python3-certbot-nginx

# Install Node.js 20+
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

### 2. Database Setup

```bash
# Configure PostgreSQL
sudo -u postgres psql

# In PostgreSQL shell:
CREATE DATABASE lokifi;
CREATE USER lokifi WITH PASSWORD 'your-secure-password';
GRANT ALL PRIVILEGES ON DATABASE lokifi TO lokifi;
\q
```

### 3. Deploy Backend

```bash
# Clone repository
cd /var/www
sudo git clone https://github.com/yourusername/lokifi.git
sudo chown -R $USER:$USER lokifi

# Setup backend
cd lokifi/backend
pip3 install -r requirements.txt

# Create .env file
cp .env.example .env
nano .env  # Configure with production values

# Run migrations
alembic upgrade head

# Create systemd service (same as AWS section above)
sudo nano /etc/systemd/system/lokifi-backend.service
sudo systemctl enable lokifi-backend
sudo systemctl start lokifi-backend
```

### 4. Deploy Frontend

```bash
# Build frontend
cd /var/www/lokifi/frontend
npm install
npm run build

# Frontend will be served by Nginx
```

### 5. Nginx Configuration

```bash
sudo nano /etc/nginx/sites-available/lokifi
```

**Nginx config**:
```nginx
# Frontend
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    root /var/www/lokifi/frontend/out;
    index index.html;

    # Gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;

    # Frontend routes
    location / {
        try_files $uri $uri/ /index.html;
    }

    # API proxy
    location /api/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # WebSocket support
    location /ws {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/lokifi /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 6. SSL Certificate (Let's Encrypt)

```bash
# Obtain certificate
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Auto-renewal is configured automatically
# Test renewal
sudo certbot renew --dry-run
```

### 7. Firewall Configuration

```bash
# Configure UFW
sudo ufw allow ssh
sudo ufw allow http
sudo ufw allow https
sudo ufw enable
```

---

## 📊 Monitoring & Maintenance

### Health Check Endpoints

- Backend: `GET http://localhost:8000/api/health`
- Frontend: `GET http://localhost:3000/api/health`

### Monitoring Scripts

```powershell
# Check service status
.\scripts\monitoring\check-health.ps1

# View logs
# Backend logs
wsl bash -c 'journalctl -u lokifi-backend -f'

# Frontend logs (if using systemd)
wsl bash -c 'journalctl -u lokifi-frontend -f'
```

### Backup Script

```bash
# Backup database
pg_dump -U lokifi lokifi > backup-$(date +%Y%m%d).sql

# Backup uploads
tar -czf uploads-$(date +%Y%m%d).tar.gz backend/uploads/

# Keep last 7 backups
find . -name "backup-*.sql" -mtime +7 -delete
```

### Update Procedure

```bash
# 1. Backup
./backup.sh

# 2. Pull latest code
git pull origin main

# 3. Update dependencies
cd backend && pip3 install -r requirements.txt --upgrade
cd ../frontend && npm install

# 4. Run migrations
cd ../backend && alembic upgrade head

# 5. Rebuild frontend
cd ../frontend && npm run build

# 6. Restart services
sudo systemctl restart lokifi-backend
sudo systemctl reload nginx
```

---

## 🔐 Security Checklist

Before deploying to production:

- [ ] Change all default passwords
- [ ] Set strong `SECRET_KEY` in .env
- [ ] Configure CORS properly
- [ ] Enable HTTPS/SSL
- [ ] Set up firewall rules
- [ ] Configure rate limiting
- [ ] Enable database backups
- [ ] Set up monitoring/alerts
- [ ] Review and secure API keys
- [ ] Configure proper logging

---

## 🆘 Troubleshooting

### Backend won't start

```bash
# Check logs
sudo journalctl -u lokifi-backend -n 50

# Check if port is in use
sudo lsof -i :8000

# Test manually
cd backend
uvicorn app.main:app --reload
```

### Database connection issues

```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Test connection
psql -U lokifi -d lokifi -h localhost
```

### Redis connection issues

```bash
# Check Redis status
sudo systemctl status redis-server

# Test connection
redis-cli ping
```

### Nginx issues

```bash
# Check configuration
sudo nginx -t

# Check logs
sudo tail -f /var/log/nginx/error.log
```

---

## 📞 Support

For issues or questions:
- Check logs first
- Review [documentation](../docs/)
- Open an issue on GitHub

---

**Last Updated**: October 2, 2025
