# ⚡ Lokifi Manager - Quick Command Reference

> **Phase 2C Enterprise Edition** - 25+ Actions for Complete DevOps Control

---

## 🚀 Server Management

```powershell
# Start all servers (Docker Compose + local fallback)
.\lokifi-manager-enhanced.ps1 servers

# Start individual components
.\lokifi-manager-enhanced.ps1 -Action servers -Component redis
.\lokifi-manager-enhanced.ps1 -Action servers -Component postgres
.\lokifi-manager-enhanced.ps1 -Action servers -Component backend
.\lokifi-manager-enhanced.ps1 -Action servers -Component frontend

# Stop all services
.\lokifi-manager-enhanced.ps1 stop

# Check service status
.\lokifi-manager-enhanced.ps1 status

# System health check
.\lokifi-manager-enhanced.ps1 health
```

---

## 💻 Development

```powershell
# Start backend
.\lokifi-manager-enhanced.ps1 dev -Component be

# Start frontend
.\lokifi-manager-enhanced.ps1 dev -Component fe

# Start both
.\lokifi-manager-enhanced.ps1 dev -Component both

# Interactive launcher
.\lokifi-manager-enhanced.ps1 launch

# Setup environment
.\lokifi-manager-enhanced.ps1 setup

# Install dependencies
.\lokifi-manager-enhanced.ps1 install

# Upgrade dependencies
.\lokifi-manager-enhanced.ps1 upgrade
```

---

## ✅ Testing & Validation

```powershell
# Pre-commit validation
.\lokifi-manager-enhanced.ps1 validate

# Quick validation
.\lokifi-manager-enhanced.ps1 validate -Quick

# Skip type check
.\lokifi-manager-enhanced.ps1 validate -SkipTypeCheck

# API tests
.\lokifi-manager-enhanced.ps1 test

# Load testing
.\lokifi-manager-enhanced.ps1 loadtest -Duration 60

# Load test with report
.\lokifi-manager-enhanced.ps1 loadtest -Duration 120 -Report
```

---

## 🎨 Code Quality

```powershell
# Format all code
.\lokifi-manager-enhanced.ps1 format

# Lint code
.\lokifi-manager-enhanced.ps1 lint

# Quick analysis
.\lokifi-manager-enhanced.ps1 analyze

# Fix TypeScript issues
.\lokifi-manager-enhanced.ps1 fix -Component ts

# Clean cache
.\lokifi-manager-enhanced.ps1 fix -Component cleanup

# Fix all
.\lokifi-manager-enhanced.ps1 fix

# Clean development files
.\lokifi-manager-enhanced.ps1 clean
```

---

## 💾 Backup & Restore

```powershell
# Simple backup
.\lokifi-manager-enhanced.ps1 backup

# Full backup with database
.\lokifi-manager-enhanced.ps1 backup -IncludeDatabase

# Compressed backup
.\lokifi-manager-enhanced.ps1 backup -Compress

# Named backup
.\lokifi-manager-enhanced.ps1 backup -BackupName "pre-deploy"

# Full backup (compressed + database)
.\lokifi-manager-enhanced.ps1 backup -IncludeDatabase -Compress -BackupName "production"

# Restore (interactive)
.\lokifi-manager-enhanced.ps1 restore

# Restore specific backup
.\lokifi-manager-enhanced.ps1 restore -BackupName "pre-deploy"
```

---

## 📊 Monitoring & Logs

```powershell
# Performance monitoring (60 seconds)
.\lokifi-manager-enhanced.ps1 monitor

# Extended monitoring
.\lokifi-manager-enhanced.ps1 monitor -Duration 300

# Watch mode
.\lokifi-manager-enhanced.ps1 watch

# View logs
.\lokifi-manager-enhanced.ps1 logs

# Filter logs by level
.\lokifi-manager-enhanced.ps1 logs -Level ERROR
.\lokifi-manager-enhanced.ps1 logs -Level WARN

# Search logs
.\lokifi-manager-enhanced.ps1 logs -Filter "backend"
```

---

## 🗄️ Database Operations

```powershell
# Migration status
.\lokifi-manager-enhanced.ps1 migrate -Component status

# Run migrations
.\lokifi-manager-enhanced.ps1 migrate -Component up

# Rollback migration
.\lokifi-manager-enhanced.ps1 migrate -Component down

# Create new migration
.\lokifi-manager-enhanced.ps1 migrate -Component create

# View migration history
.\lokifi-manager-enhanced.ps1 migrate -Component history
```

---

## 🔀 Git Operations

```powershell
# Git status
.\lokifi-manager-enhanced.ps1 git -Component status

# Commit with validation
.\lokifi-manager-enhanced.ps1 git -Component commit

# Push changes
.\lokifi-manager-enhanced.ps1 git -Component push

# Pull changes
.\lokifi-manager-enhanced.ps1 git -Component pull

# View branches
.\lokifi-manager-enhanced.ps1 git -Component branch

# View log
.\lokifi-manager-enhanced.ps1 git -Component log

# View diff
.\lokifi-manager-enhanced.ps1 git -Component diff
```

---

## 🌍 Environment Management

```powershell
# List environments
.\lokifi-manager-enhanced.ps1 env -Component list

# Switch to development
.\lokifi-manager-enhanced.ps1 env -Component switch -Environment development

# Switch to staging
.\lokifi-manager-enhanced.ps1 env -Component switch -Environment staging

# Switch to production
.\lokifi-manager-enhanced.ps1 env -Component switch -Environment production

# Create new environment
.\lokifi-manager-enhanced.ps1 env -Component create -Environment custom

# Validate environment
.\lokifi-manager-enhanced.ps1 env -Component validate
```

---

## 🔒 Security

```powershell
# Quick security scan
.\lokifi-manager-enhanced.ps1 security

# Full security audit
.\lokifi-manager-enhanced.ps1 security -Force
```

---

## 📁 Documentation

```powershell
# Check document organization
.\lokifi-manager-enhanced.ps1 docs

# Organize documents
.\lokifi-manager-enhanced.ps1 docs -Component organize

# Organize repository files
.\lokifi-manager-enhanced.ps1 organize
```

---

## 🎯 Common Workflows

### 🌅 **Morning Startup**
```powershell
.\lokifi-manager-enhanced.ps1 status              # Check what's running
.\lokifi-manager-enhanced.ps1 servers             # Start all servers
.\lokifi-manager-enhanced.ps1 monitor -Duration 30  # Quick health check
```

### 💼 **Development Workflow**
```powershell
.\lokifi-manager-enhanced.ps1 dev -Component both  # Start dev servers
.\lokifi-manager-enhanced.ps1 validate -Quick      # Quick validation
.\lokifi-manager-enhanced.ps1 test                 # Run tests
```

### 🚀 **Pre-Deployment**
```powershell
.\lokifi-manager-enhanced.ps1 backup -IncludeDatabase -Compress  # Backup everything
.\lokifi-manager-enhanced.ps1 security -Force                    # Security audit
.\lokifi-manager-enhanced.ps1 loadtest -Duration 120             # Load test
.\lokifi-manager-enhanced.ps1 migrate -Component status          # Check migrations
```

### 🔧 **Database Work**
```powershell
.\lokifi-manager-enhanced.ps1 backup -IncludeDatabase  # Backup database
.\lokifi-manager-enhanced.ps1 migrate -Component create # Create migration
.\lokifi-manager-enhanced.ps1 migrate -Component up     # Apply migration
```

### 📊 **Troubleshooting**
```powershell
.\lokifi-manager-enhanced.ps1 status               # Service status
.\lokifi-manager-enhanced.ps1 logs -Level ERROR    # View errors
.\lokifi-manager-enhanced.ps1 monitor              # Monitor performance
.\lokifi-manager-enhanced.ps1 health               # Full health check
```

### 🎨 **Code Quality**
```powershell
.\lokifi-manager-enhanced.ps1 analyze              # Quick analysis
.\lokifi-manager-enhanced.ps1 format               # Format code
.\lokifi-manager-enhanced.ps1 validate             # Pre-commit checks
.\lokifi-manager-enhanced.ps1 fix                  # Fix issues
```

### 🌙 **End of Day**
```powershell
.\lokifi-manager-enhanced.ps1 git -Component commit  # Commit with validation
.\lokifi-manager-enhanced.ps1 git -Component push    # Push changes
.\lokifi-manager-enhanced.ps1 backup                 # Create backup
.\lokifi-manager-enhanced.ps1 stop                   # Stop all services
```

---

## 🎛️ Modes

```powershell
# Interactive (default) - prompts for confirmations
.\lokifi-manager-enhanced.ps1 servers

# Auto mode - minimal prompts
.\lokifi-manager-enhanced.ps1 servers -Mode auto

# Force mode - skip confirmations
.\lokifi-manager-enhanced.ps1 backup -Mode force

# Verbose mode - detailed output
.\lokifi-manager-enhanced.ps1 test -Mode verbose

# Quiet mode - minimal output
.\lokifi-manager-enhanced.ps1 clean -Mode quiet
```

---

## 🆘 Help

```powershell
# Show help
.\lokifi-manager-enhanced.ps1 help

# Show detailed help
Get-Help .\lokifi-manager-enhanced.ps1 -Detailed

# Show examples
Get-Help .\lokifi-manager-enhanced.ps1 -Examples
```

---

## 💡 Pro Tips

1. **Alias for Quick Access:**
   ```powershell
   Set-Alias lm .\lokifi-manager-enhanced.ps1
   lm servers
   ```

2. **Auto-start on Login:**
   Add to PowerShell profile:
   ```powershell
   cd C:\Users\USER\Desktop\lokifi
   .\lokifi-manager-enhanced.ps1 servers -Mode auto
   ```

3. **Scheduled Backups:**
   Use Windows Task Scheduler to run:
   ```powershell
   .\lokifi-manager-enhanced.ps1 backup -IncludeDatabase -Compress
   ```

4. **Custom Monitoring Dashboard:**
   ```powershell
   while ($true) {
     .\lokifi-manager-enhanced.ps1 status
     Start-Sleep 30
   }
   ```

5. **Pre-commit Hook:**
   Add to `.git/hooks/pre-commit`:
   ```bash
   pwsh -Command ".\lokifi-manager-enhanced.ps1 validate -Quick"
   ```

---

## 📌 Keyboard Shortcuts (in Interactive Mode)

- **Ctrl+C** - Cancel/Exit current operation
- **Enter** - Confirm/Continue
- **q** - Quit interactive selection
- **y/n** - Yes/No confirmations

---

## 🎉 That's It!

**One script. 25+ actions. Complete control.**

For detailed documentation, see:
- `PHASE_2C_ENHANCEMENTS.md` - Complete feature list
- `README.md` - Project overview
- `START_HERE.md` - Getting started guide

---

**🚀 Happy coding with Lokifi Ultimate Manager!**
