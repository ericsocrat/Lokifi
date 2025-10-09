# 🛠️ Tools

This directory contains all DevOps automation tools, CLI utilities, and scripts for managing the Lokifi platform.

---

## 📁 Structure

```
tools/
├── lokifi.ps1           # Master DevOps CLI tool
├── scripts/             # Utility scripts
│   ├── deploy/          # Deployment automation
│   ├── database/        # Database management
│   ├── backup/          # Backup utilities
│   └── monitoring/      # Monitoring helpers
└── README.md            # This file
```

---

## ⚡ lokifi.ps1 - Master CLI Tool

The main command-line interface for managing all aspects of the Lokifi platform.

### Features (6,750+ lines):
- **AI/ML Integration**: Auto-fix, predictive maintenance, smart recommendations
- **Security**: Secret scanning, CVE detection, audit trails
- **Monitoring**: Real-time metrics, alerts, performance tracking
- **Docker**: Compose orchestration, container management
- **Database**: Migrations, backups, health checks
- **Development**: Hot reload, log tailing, debugging

### Usage:
```powershell
# From project root
.\tools\lokifi.ps1 <command> [options]

# View help
.\tools\lokifi.ps1 help

# View status of all services
.\tools\lokifi.ps1 status

# Start all servers
.\tools\lokifi.ps1 servers

# Docker Compose management
.\tools\lokifi.ps1 compose start
.\tools\lokifi.ps1 compose stop
.\tools\lokifi.ps1 compose status

# AI/ML features
.\tools\lokifi.ps1 ai -Component learn
.\tools\lokifi.ps1 ai -Component predict
.\tools\lokifi.ps1 ai -Component recommend

# Security scanning
.\tools\lokifi.ps1 security scan
.\tools\lokifi.ps1 security audit

# Database operations
.\tools\lokifi.ps1 db migrate
.\tools\lokifi.ps1 db backup
.\tools\lokifi.ps1 db restore

# Performance analysis
.\tools\lokifi.ps1 analyze
.\tools\lokifi.ps1 benchmark
```

### Quick Reference:
| Command | Description | Example |
|---------|-------------|---------|
| `status` | Service health check | `.\tools\lokifi.ps1 status` |
| `servers` | Start all services | `.\tools\lokifi.ps1 servers` |
| `stop` | Stop all services | `.\tools\lokifi.ps1 stop` |
| `logs` | View logs | `.\tools\lokifi.ps1 logs -Service backend` |
| `compose` | Docker Compose | `.\tools\lokifi.ps1 compose up` |
| `ai` | AI/ML features | `.\tools\lokifi.ps1 ai -Component learn` |
| `security` | Security scan | `.\tools\lokifi.ps1 security scan` |
| `db` | Database ops | `.\tools\lokifi.ps1 db migrate` |
| `test` | Run tests | `.\tools\lokifi.ps1 test` |
| `deploy` | Deploy services | `.\tools\lokifi.ps1 deploy -Environment prod` |

### Configuration:
Location: `.lokifi-data/config.json`

```json
{
  "version": "3.1.0-alpha",
  "appRoot": "apps",
  "backendDir": "apps/backend",
  "frontendDir": "apps/frontend",
  "infraDir": "infra",
  "redis": {
    "host": "localhost",
    "port": 6379,
    "password": "23233"
  },
  "database": {
    "type": "sqlite",
    "path": "apps/backend/lokifi.db"
  }
}
```

---

## 📜 Scripts (`scripts/`)

Utility scripts organized by function.

### Deploy Scripts (`scripts/deploy/`)
- **deploy-production.ps1**: Production deployment automation
- **deploy-staging.ps1**: Staging environment deployment
- **rollback.ps1**: Rollback to previous version
- **health-check.ps1**: Post-deployment verification

### Database Scripts (`scripts/database/`)
- **migrate.ps1**: Run database migrations
- **seed.ps1**: Seed test/demo data
- **backup.ps1**: Create database backup
- **restore.ps1**: Restore from backup
- **optimize.ps1**: Database optimization

### Backup Scripts (`scripts/backup/`)
- **backup-all.ps1**: Full system backup
- **backup-database.ps1**: Database only
- **backup-uploads.ps1**: User files backup
- **verify-backup.ps1**: Backup integrity check
- **restore-from-backup.ps1**: System restore

### Monitoring Scripts (`scripts/monitoring/`)
- **check-health.ps1**: System health monitoring
- **collect-metrics.ps1**: Metrics collection
- **alert-check.ps1**: Alert evaluation
- **log-analyzer.ps1**: Log parsing and analysis

---

## 🔧 Development Tools

### Hot Reload
```powershell
# Backend with auto-reload
cd apps/backend
.\tools\lokifi.ps1 dev backend

# Frontend with hot module replacement
cd apps/frontend
.\tools\lokifi.ps1 dev frontend
```

### Debugging
```powershell
# Enable debug mode
$env:LOKIFI_DEBUG = "true"
.\tools\lokifi.ps1 status

# View detailed logs
.\tools\lokifi.ps1 logs -Verbose -Follow
```

### Testing
```powershell
# Run all tests
.\tools\lokifi.ps1 test

# Backend tests only
.\tools\lokifi.ps1 test backend

# Frontend tests only
.\tools\lokifi.ps1 test frontend

# Integration tests
.\tools\lokifi.ps1 test integration

# Performance tests
.\tools\lokifi.ps1 test performance
```

---

## 🚀 CI/CD Integration

### GitHub Actions
Use lokifi.ps1 in CI/CD pipelines:

```yaml
# .github/workflows/deploy.yml
- name: Deploy to Staging
  run: |
    .\tools\lokifi.ps1 deploy -Environment staging
    
- name: Run Health Check
  run: |
    .\tools\lokifi.ps1 status
    
- name: Run Tests
  run: |
    .\tools\lokifi.ps1 test
```

### Jenkins
```groovy
stage('Deploy') {
    steps {
        powershell './tools/lokifi.ps1 deploy -Environment production'
    }
}

stage('Verify') {
    steps {
        powershell './tools/lokifi.ps1 status'
    }
}
```

---

## 📊 Monitoring Integration

### Prometheus Metrics
lokifi.ps1 exposes metrics via custom exporter:
- Service health (up/down)
- Response times (p50, p95, p99)
- Error rates
- Cache hit rates
- Database connection pool

### Log Aggregation
All logs are structured JSON for easy parsing:
```json
{
  "timestamp": "2025-10-08T21:53:00Z",
  "level": "INFO",
  "service": "backend",
  "message": "Request completed",
  "duration_ms": 45,
  "status_code": 200
}
```

---

## 🔒 Security Features

### Secret Scanning
```powershell
# Scan for exposed secrets
.\tools\lokifi.ps1 security scan -Type secrets

# Scan specific file
.\tools\lokifi.ps1 security scan -File .env
```

### CVE Detection
```powershell
# Scan dependencies for vulnerabilities
.\tools\lokifi.ps1 security cve

# Scan with severity filter
.\tools\lokifi.ps1 security cve -MinSeverity high
```

### Audit Trail
All operations are logged to `.lokifi-data/audit.log`:
```
2025-10-08 21:53:00 [INFO] User: admin | Action: deploy | Target: production | Result: success
2025-10-08 21:54:15 [WARN] User: admin | Action: db-restore | Target: staging | Result: partial
```

---

## 🎯 Best Practices

### 1. Always Use Tools From Root
```powershell
# ✅ Correct
cd C:\Users\USER\Desktop\lokifi
.\tools\lokifi.ps1 status

# ❌ Wrong
cd C:\Users\USER\Desktop\lokifi\tools
.\lokifi.ps1 status
```

### 2. Check Status Before Operations
```powershell
# Always verify system health first
.\tools\lokifi.ps1 status

# Then proceed with operations
.\tools\lokifi.ps1 deploy -Environment staging
```

### 3. Use AI Features for Troubleshooting
```powershell
# Let AI analyze errors
.\tools\lokifi.ps1 ai -Component learn

# Get smart recommendations
.\tools\lokifi.ps1 ai -Component recommend
```

### 4. Regular Security Scans
```powershell
# Weekly security audit
.\tools\lokifi.ps1 security scan

# Check for CVEs after dependency updates
.\tools\lokifi.ps1 security cve
```

---

## 📚 Script Development Guide

### Creating New Scripts

1. **Choose appropriate directory**:
   - Deploy scripts → `scripts/deploy/`
   - Database scripts → `scripts/database/`
   - Monitoring scripts → `scripts/monitoring/`
   - General utilities → `scripts/utils/`

2. **Follow naming convention**:
   - Use kebab-case: `backup-database.ps1`
   - Be descriptive: `deploy-to-production.ps1`
   - Add verb prefix: `check-health.ps1`

3. **Include header comment**:
```powershell
<#
.SYNOPSIS
    Brief description

.DESCRIPTION
    Detailed description of what the script does

.PARAMETER Environment
    Target environment (dev, staging, production)

.EXAMPLE
    .\backup-database.ps1 -Environment production

.NOTES
    Author: Your Name
    Last Modified: 2025-10-08
#>
```

4. **Add error handling**:
```powershell
try {
    # Your code
} catch {
    Write-Error "Operation failed: $_"
    exit 1
}
```

5. **Log all operations**:
```powershell
Write-Host "[INFO] Starting operation..." -ForegroundColor Cyan
# Do work
Write-Host "[SUCCESS] Operation completed" -ForegroundColor Green
```

---

## 🤝 Contributing

When adding tools or scripts:
1. Follow PowerShell best practices
2. Include help documentation
3. Add error handling
4. Write unit tests if applicable
5. Update this README
6. Test thoroughly before committing

---

## 📞 Support

For tool-related issues:
1. Check `.\tools\lokifi.ps1 help`
2. View logs: `.\tools\lokifi.ps1 logs`
3. Enable verbose output: `.\tools\lokifi.ps1 -Verbose`
4. Check `.lokifi-data/` for state files

---

## 🎯 Roadmap

### Q4 2025:
- ✅ Core lokifi.ps1 (6,750+ lines)
- ✅ AI/ML integration
- ✅ Security scanning
- ✅ Monitoring integration
- 📋 Plugin system for extensions
- 📋 Configuration wizard

### Q1 2026:
- 📋 Cross-platform support (Bash version)
- 📋 Web UI for lokifi.ps1
- 📋 Remote management capabilities
- 📋 Advanced automation workflows
- 📋 Custom plugin marketplace

---

**Status**: Production Ready, Actively Maintained  
**Lines of Code**: 6,750+  
**Last Updated**: October 8, 2025
# Test pre-commit hooks
