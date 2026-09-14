# 🚀 Quick Production Deployment Guide

> **Requirements**: Docker Desktop v4.48.0+ (or Docker Engine v28.5.1+ with Docker Compose v2.40.0+)

## ✅ What's Already Done

- ✅ Strong cryptographic passwords generated
- ✅ `.env` file created with all secrets
- ✅ Docker compose files validated
- ✅ Resource limits configured
- ✅ Security hardening applied

## 🎯 3 Simple Steps to Deploy

### Step 1: Update Domain Names (2 minutes)
```powershell
cd C:\Users\USER\Desktop\lokifi\infra\docker
.\setup-production-domains.ps1 -Domain "yourdomain.com"
```

### Step 2: Configure DNS (5-10 minutes)
In your domain registrar's DNS panel, add these A records:

| Type | Name | Value | TTL |
|------|------|-------|-----|
| A | @ | YOUR_SERVER_IP | 3600 |
| A | api | YOUR_SERVER_IP | 3600 |
| A | traefik | YOUR_SERVER_IP | 3600 |

### Step 3: Deploy (1 minute)
```bash
# Copy files to your server
scp -r infra/docker user@server:/path/to/lokifi/

# SSH into server
ssh user@server

# Deploy
cd /path/to/lokifi/infra/docker
docker compose -f docker-compose.production.yml up -d
```

## 🔍 Verify Deployment

Wait 2-3 minutes for containers to start, then check:

```bash
# Check all containers are running
docker ps

# Verify health
curl https://api.yourdomain.com/api/health

# View logs
docker compose logs -f
```

## 📱 Access Your Application

- **Frontend**: https://yourdomain.com
- **API Docs**: https://api.yourdomain.com/docs
- **Grafana**: https://yourdomain.com:3001
- **Traefik Dashboard**: https://traefik.yourdomain.com

## 🆘 Quick Troubleshooting

### Containers won't start
```bash
docker compose logs backend
docker compose logs frontend
```

### DNS not resolving
```bash
nslookup yourdomain.com
# Wait up to 48 hours for DNS propagation (usually 5-10 mins)
```

### SSL certificate issues
```bash
# Check Traefik logs
docker compose logs traefik
# Certificates auto-generate after DNS resolves
```

## 📞 Need Help?

1. Check the detailed checklist: `PRODUCTION_DEPLOYMENT_CHECKLIST.md`
2. Review Docker logs: `docker compose logs -f [service]`
3. Verify DNS: Make sure domains point to your server
4. Check firewall: Ports 80 and 443 must be open

---

**That's it!** 🎉 Your production deployment is ready!
