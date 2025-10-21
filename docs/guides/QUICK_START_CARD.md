# 🚀 LOKIFI MANAGER - QUICK START CARD

**Phase 2C Enterprise Edition** | Production Ready ✅

---

## ⚡ MOST USED COMMANDS

```powershell
# Start everything
.\lokifi-manager-enhanced.ps1 servers

# Interactive menu
.\lokifi-manager-enhanced.ps1 launch

# Check status
.\lokifi-manager-enhanced.ps1 status

# Get help
.\lokifi-manager-enhanced.ps1 help
```powershell

---

## 🎯 QUICK ACTIONS

| Task | Command |
|------|---------|
| **Start all servers** | `servers` |
| **Stop everything** | `stop` |
| **Check status** | `status` |
| **Run tests** | `test` |
| **Format code** | `format` |
| **Validate before commit** | `validate` |
| **Clean cache** | `clean` |
| **Quick analysis** | `analyze` |
| **Security scan** | `security` |
| **Create backup** | `backup -IncludeDatabase -Compress` |

---

## 🎨 INTERACTIVE LAUNCHER

```powershell
.\lokifi-manager-enhanced.ps1 launch
```powershell

### 6 Main Categories:
1. **🚀 Server Management** - Start/stop services
2. **💻 Development Tools** - Tests, validation, git
3. **🔒 Security & Monitoring** - Scans, logs, backups
4. **🗄️ Database Operations** - Migrations, backups
5. **🎨 Code Quality** - Format, lint, cleanup
6. **❓ Help & Documentation** - Guides, references

---

## 🔥 PHASE 2C FEATURES

| Feature | Command | Description |
|---------|---------|-------------|
| **Backup** | `backup` | Create system backup |
| **Restore** | `restore` | Restore from backup |
| **Monitor** | `monitor -Duration 300` | Performance monitoring |
| **Logs** | `logs` | View system logs |
| **Migrate** | `migrate -Component up` | Database migrations |
| **LoadTest** | `loadtest -Duration 60` | Load testing |
| **Git** | `git -Component commit` | Git with validation |
| **Env** | `env -Component switch` | Environment management |
| **Security** | `security -Force` | Security scanning |
| **Watch** | `watch` | Auto-reload mode |

---

## 💻 DEVELOPMENT WORKFLOW

```powershell
# 1. Start development servers
.\lokifi-manager-enhanced.ps1 dev -Component both

# 2. Make your changes...

# 3. Validate before commit
.\lokifi-manager-enhanced.ps1 validate

# 4. Commit with validation
.\lokifi-manager-enhanced.ps1 git -Component commit

# 5. Run tests
.\lokifi-manager-enhanced.ps1 test
```powershell

---

## 🗄️ DATABASE OPERATIONS

```powershell
# Check migration status
.\lokifi-manager-enhanced.ps1 migrate -Component status

# Run migrations
.\lokifi-manager-enhanced.ps1 migrate -Component up

# Create new migration
.\lokifi-manager-enhanced.ps1 migrate -Component create

# Rollback
.\lokifi-manager-enhanced.ps1 migrate -Component down
```powershell

---

## 🔒 SECURITY & BACKUP

```powershell
# Quick security scan
.\lokifi-manager-enhanced.ps1 security

# Full audit
.\lokifi-manager-enhanced.ps1 security -Force

# Create backup
.\lokifi-manager-enhanced.ps1 backup -IncludeDatabase -Compress

# Restore backup
.\lokifi-manager-enhanced.ps1 restore
```powershell

---

## 📊 MONITORING

```powershell
# Real-time monitoring (5 minutes)
.\lokifi-manager-enhanced.ps1 monitor -Duration 300

# View logs
.\lokifi-manager-enhanced.ps1 logs

# Load test
.\lokifi-manager-enhanced.ps1 loadtest -Duration 60 -Report

# Watch mode
.\lokifi-manager-enhanced.ps1 watch
```powershell

---

## 🌍 ENVIRONMENT MANAGEMENT

```powershell
# List environments
.\lokifi-manager-enhanced.ps1 env -Component list

# Switch environment
.\lokifi-manager-enhanced.ps1 env -Component switch -Environment production

# Validate current
.\lokifi-manager-enhanced.ps1 env -Component validate
```powershell

---

## 🎯 USEFUL FLAGS

| Flag | Purpose |
|------|---------|
| `-Mode auto` | Automated, no prompts |
| `-Mode verbose` | Detailed output |
| `-Quick` | Fast validation |
| `-Force` | Skip confirmations |
| `-SkipTypeCheck` | Skip TypeScript checks |
| `-SkipAnalysis` | Skip code analysis |
| `-Compress` | Compress backups |
| `-IncludeDatabase` | Include DB in backup |
| `-Watch` | Enable watch mode |
| `-Report` | Generate detailed report |

---

## 🔧 TROUBLESHOOTING

```powershell
# Check what's running
.\lokifi-manager-enhanced.ps1 status

# Stop everything
.\lokifi-manager-enhanced.ps1 stop

# Clean and restart
.\lokifi-manager-enhanced.ps1 clean
.\lokifi-manager-enhanced.ps1 servers

# View logs for errors
.\lokifi-manager-enhanced.ps1 logs

# Run health check
.\lokifi-manager-enhanced.ps1 analyze
```powershell

---

## 📋 SERVICE URLs

| Service | URL |
|---------|-----|
| **Backend API** | http://localhost:8000 |
| **Frontend App** | http://localhost:3000 |
| **PostgreSQL** | postgresql://lokifi:lokifi2025@localhost:5432/lokifi |
| **Redis** | redis://:23233@localhost:6379/0 |

---

## 🎉 QUICK TIPS

1. **Use interactive launcher** for discovery: `.\lokifi-manager-enhanced.ps1 launch`
2. **Always validate** before committing: `.\lokifi-manager-enhanced.ps1 validate`
3. **Create backups** before major changes: `.\lokifi-manager-enhanced.ps1 backup`
4. **Monitor performance** during load: `.\lokifi-manager-enhanced.ps1 monitor`
5. **Check status first**: `.\lokifi-manager-enhanced.ps1 status`

---

## 📚 MORE HELP

```powershell
# Full documentation
.\lokifi-manager-enhanced.ps1 help

# Specific action help
Get-Help .\lokifi-manager-enhanced.ps1 -Detailed

# Examples
Get-Help .\lokifi-manager-enhanced.ps1 -Examples
```powershell

---

**Version:** Phase 2C Enterprise Edition  
**Total Actions:** 30+  
**Total Features:** 46 operations  
**Status:** ✅ Production Ready

**Keep this card handy!** 🚀