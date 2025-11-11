# Deployment Documentation

> **Complete guides for deploying Lokifi to production**

## 📚 Documentation Structure

```
deployment/
├── README.md                     # This file - Overview and navigation
├── quick-start.md               # 3-step deployment guide for experienced users
├── production.md                # Complete deployment checklist with security
└── dns.md                       # Step-by-step DNS configuration
```

## 🎯 Quick Links

- **[quick-start.md](./quick-start.md)** - Fast deployment for experienced users
- **[production.md](./production.md)** - Complete production deployment checklist
- **[dns.md](./dns.md)** - DNS configuration for www.lokifi.com

## 🚀 Deployment Order

### 1. Pre-Deployment Preparation
1. Review [`production.md`](./production.md) - Complete all prerequisites
2. Configure DNS records using [`dns.md`](./dns.md)
3. Ensure `.env` file is configured in `infra/docker/`

### 2. Deployment
Follow one of these guides:
- **Quick**: Use [`quick-start.md`](./quick-start.md) if you're experienced
- **Detailed**: Use [`production.md`](./production.md) for first-time deployment

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
    ├── README.md                     # This file - Overview and navigation
    ├── quick-start.md               # Quick deployment guide
    ├── production.md                # Complete production checklist
    └── dns.md                       # DNS configuration
```

## 🚀 Related Documentation

- **[Local Development](../../infra/docker/LOCAL_DEVELOPMENT.md)** - Running Lokifi locally
- **[CI/CD Workflow Guide](../ci-cd/guides/workflow-guide.md)** - Continuous integration and deployment

**Last Updated**: November 11, 2025
- **[CI/CD Guides](../ci-cd/)** - GitHub Actions and automation
- **[Security](../security/)** - Security best practices
- **[Environment Configuration](../security/environment.md)** - Environment variables

---

**Current Configuration:**
- Domain: www.lokifi.com
- API: api.www.lokifi.com
- Traefik: traefik.www.lokifi.com
- Admin Email: admin@lokifi.com
