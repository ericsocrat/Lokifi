# Deployment Documentation

> **Complete guides for deploying Lokifi to production**

## 📚 Documentation Files

### Quick Start
- **[QUICK_DEPLOY.md](QUICK_DEPLOY.md)** - 3-step deployment guide for experienced users

### Detailed Guides
- **[PRODUCTION_DEPLOYMENT_CHECKLIST.md](PRODUCTION_DEPLOYMENT_CHECKLIST.md)** - Complete deployment checklist with prerequisites, security, and verification steps
- **[DNS_CONFIGURATION_GUIDE.md](DNS_CONFIGURATION_GUIDE.md)** - Step-by-step DNS configuration for www.lokifi.com

## 🎯 Deployment Order

### 1. Pre-Deployment Preparation
1. Review `PRODUCTION_DEPLOYMENT_CHECKLIST.md` - Complete all prerequisites
2. Configure DNS records using `DNS_CONFIGURATION_GUIDE.md`
3. Ensure `.env` file is configured in `infra/docker/`

### 2. Deployment
Follow one of these guides:
- **Quick**: Use `QUICK_DEPLOY.md` if you're experienced
- **Detailed**: Use `PRODUCTION_DEPLOYMENT_CHECKLIST.md` for first-time deployment

### 3. Post-Deployment
Verify all services are running:
- Frontend: https://www.lokifi.com
- Backend: https://api.www.lokifi.com
- Traefik Dashboard: https://traefik.www.lokifi.com

## 🔐 Security Notes

**NEVER commit these files:**
- `infra/docker/.env` - Contains production secrets
- Any files with API keys or passwords

**Always use:**
- `infra/docker/.env.example` - Template without secrets

## 📍 File Locations

```
lokifi/
├── infra/docker/
│   ├── .env                          # Production secrets (gitignored)
│   ├── .env.example                  # Template for .env
│   ├── docker-compose.production.yml # Full production with Traefik
│   ├── docker-compose.prod-minimal.yml # Minimal production (cloud DB)
│   └── LOCAL_DEVELOPMENT.md          # Local dev guide
└── docs/deployment/                  # YOU ARE HERE
    ├── README.md                     # This file
    ├── QUICK_DEPLOY.md
    ├── PRODUCTION_DEPLOYMENT_CHECKLIST.md
    └── DNS_CONFIGURATION_GUIDE.md
```

## 🚀 Related Documentation

- **[Local Development](../../infra/docker/LOCAL_DEVELOPMENT.md)** - Running Lokifi locally
- **[CI/CD Guides](../ci-cd/)** - GitHub Actions and automation
- **[Security](../security/)** - Security best practices
- **[Environment Configuration](../security/environment.md)** - Environment variables

---

**Current Configuration:**
- Domain: www.lokifi.com
- API: api.www.lokifi.com
- Traefik: traefik.www.lokifi.com
- Admin Email: admin@lokifi.com
