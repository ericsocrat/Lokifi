# Quick Commands

## Use the automation script:

```powershell
.\dev.ps1 restart    # Restart both servers
.\dev.ps1 fix-ui     # Fix UI + restart
.\dev.ps1 clean      # Clean build artifacts
.\dev.ps1 test       # Run tests
.\dev.ps1 check      # Check what files need cleanup (dry run)
.\dev.ps1 cleanup    # Clean old reports, logs, backups
```

## Automated Cleanup System:

The project now automatically prevents file bloat:

```powershell
# Check what would be cleaned (no changes)
.\dev.ps1 check

# Run cleanup (removes old files)
.\dev.ps1 cleanup

# Manual cleanup with options
.\scripts\auto-cleanup.ps1 -DaysOld 30 -DryRun

# Cleanup runs automatically:
# - Pre-commit hook (asks before cleaning)
# - .gitignore blocks test reports/backups
```

**What gets cleaned:**

- Test reports older than 30 days → `docs/archive/analysis`
- Performance reports → `docs/archive/analysis`
- Old logs → `logs/archive`
- Backup files (.bak, .backup, .old)
- Temp files (.tmp, .temp)
- Empty directories

## Manual commands:

```powershell
# Frontend
cd frontend && npm run dev

# Backend
cd backend && .\start-backend.ps1

# Kill all dev servers
Get-Process node,python | Stop-Process -Force
```

## Auto-file documentation:

```powershell
.\scripts\auto-doc.ps1 -FilePath "MY_DOC.md"
# Automatically moves to correct docs/ subfolder
```
