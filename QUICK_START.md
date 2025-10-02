# Quick Commands

## Use the automation script:

```powershell
.\dev.ps1 restart    # Restart both servers
.\dev.ps1 fix-ui     # Fix UI + restart
.\dev.ps1 clean      # Clean build artifacts
.\dev.ps1 test       # Run tests
```

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
