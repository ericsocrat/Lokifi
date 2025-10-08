# Health Command - Quick Reference Guide

**Last Updated:** October 9, 2025  
**Status:** ✅ Production Ready

---

## 🚀 Quick Start

```powershell
# Full comprehensive health check (recommended)
.\tools\lokifi.ps1 health

# Fast health check (infrastructure + codebase only)
.\tools\lokifi.ps1 health -Quick

# With detailed file information
.\tools\lokifi.ps1 health -ShowDetails
```

---

## 📊 What It Checks

### 1️⃣ Infrastructure Health ⚡ ~5s
- Docker availability
- Redis container status
- PostgreSQL container status
- Backend container status
- Frontend container status
- Docker Compose availability

### 2️⃣ API Health ⚡ ~10s
- Backend API endpoint testing
- Health check validation
- Response time measurement

### 3️⃣ Codebase Health ⚡ ~70s (cached: ~5s)
- **Maintainability Score** (0-100)
- **Security Score** (0-100)
- **Technical Debt** (days)
- **Test Coverage** (%)
- **Overall Health Assessment** (0-100)

### 4️⃣ Detailed Quality Analysis ⚡ ~15s (skip with -Quick)
- **TypeScript Errors** - Type safety validation
- **Security Vulnerabilities** - npm audit results
- **Console Logging** - console.log detection
- **Technical Debt Comments** - TODO/FIXME tracking
- **Git Hygiene** - Working directory cleanliness
- **Large Files** - Files >1MB detection

---

## 🎯 Modes

| Mode | Duration | Use Case |
|------|----------|----------|
| **Default (Full)** | ~90s | Before commits, comprehensive check |
| **-Quick** | ~70s | Daily workflow, skip detailed analysis |
| **-ShowDetails** | ~90s | Debugging, detailed file information |

---

## 📈 Output Examples

### Quick Mode Output
```
🔧 Infrastructure Health:
✅ Docker: Available
✅ Redis: Running
✅ PostgreSQL: Running
✅ Backend: Running
✅ Frontend: Running

🌐 API Health:
✅ Health Check: 200 OK (234ms)

📊 Codebase Health:
  ✅ Maintainability: 75/100
  ✅ Security Score: 85/100
  ❌ Technical Debt: 88.5 days
  ❌ Test Coverage: ~3.6%

📊 Overall Code Health: 50/100 ⚠️ Needs Attention
```

### Full Mode Output (includes above + detailed checks)
```
🔍 Detailed Quality Analysis:
🎯 TypeScript Type Safety...
  ✅ No TypeScript errors
📦 Dependency Security...
  ✅ No critical/high vulnerabilities (Frontend)
🔍 Console Logging Quality...
  ✅ Using proper logger utility
📝 Technical Debt Comments...
  ❌ 34 TODO/FIXME comments (consider creating issues)
🔄 Git Repository Hygiene...
  ⚠️  5 uncommitted changes
📦 Large Files...
  ✅ No large files (>1MB) detected
```

---

## 🎨 Status Indicators

### Colors & Icons
- ✅ **Green** = Excellent/Pass
- ⚠️ **Yellow** = Warning/Acceptable
- ❌ **Red** = Critical/Needs Attention

### Score Thresholds

| Metric | ✅ Good | ⚠️ Warning | ❌ Critical |
|--------|---------|------------|-------------|
| **Maintainability** | ≥70 | 50-69 | <50 |
| **Security Score** | ≥80 | 60-79 | <60 |
| **Technical Debt** | ≤30 days | 31-60 days | >60 days |
| **Test Coverage** | ≥70% | 50-69% | <50% |
| **TypeScript Errors** | 0 | 1-9 | ≥10 |
| **Security Vulns** | 0 critical/high | - | ≥1 critical/high |
| **Console Logs** | 0 | 1-19 | ≥20 |
| **TODOs** | 0 | 1-19 | ≥20 |

---

## 💡 Best Practices

### Daily Workflow
```powershell
# Morning: Quick health check
.\tools\lokifi.ps1 health -Quick

# Before committing: Full health check
.\tools\lokifi.ps1 health
```

### CI/CD Pipeline
```yaml
# .github/workflows/health-check.yml
jobs:
  health:
    steps:
      - name: Run Health Check
        run: |
          cd tools
          .\lokifi.ps1 health
```

### Pre-Commit Hook
```powershell
# .git/hooks/pre-commit
cd tools
.\lokifi.ps1 health
if ($LASTEXITCODE -ne 0) {
    Write-Error "Health check failed!"
    exit 1
}
```

---

## 🔍 Troubleshooting

### "Unable to check TypeScript"
- **Cause:** Frontend directory not found or npm not installed
- **Solution:** Ensure frontend exists and `npm install` is run

### "Unable to check npm security"
- **Cause:** npm audit unavailable or failed
- **Solution:** Run `cd frontend && npm audit` manually to diagnose

### "Slow status check detected"
- **Cause:** Docker containers taking long to respond
- **Solution:** Normal for first run, subsequent runs use cache

### Health Score Low
- **50-60:** Focus on test coverage and technical debt
- **30-50:** Critical issues, prioritize security and maintainability
- **<30:** Major refactoring needed

---

## 📊 Current Lokifi Health (Oct 9, 2025)

| Metric | Value | Status |
|--------|-------|--------|
| Maintainability | 75/100 | ✅ Good |
| Security Score | 85/100 | ✅ Excellent |
| Technical Debt | 88.5 days | ⚠️ Moderate |
| Test Coverage | 3.6% | ❌ Critical |
| TypeScript Errors | 0 | ✅ Perfect |
| Security Vulnerabilities | 0 | ✅ Secure |
| Console Logs | 0 | ✅ Clean |
| TODOs | 34 | ⚠️ Acceptable |
| **Overall Health** | **50/100** | **⚠️ Needs Attention** |

### Priority Actions
1. 🚨 **Critical:** Increase test coverage (3.6% → 70%)
2. ⚡ **High:** Reduce technical debt (88.5 → <30 days)
3. 📝 **Medium:** Address TODO comments (create issues)
4. ✅ **Maintain:** Keep TypeScript errors at 0

---

## 🎯 Related Commands

### Complementary Health Tools
```powershell
# Detailed codebase analysis with full report
.\lokifi.ps1 analyze

# Quick analysis snapshot
.\lokifi.ps1 analyze -Quick

# Pre-commit validation (includes health check)
.\lokifi.ps1 validate

# Security-focused scan
.\lokifi.ps1 security

# API testing only
.\lokifi.ps1 test api

# Infrastructure status only
.\lokifi.ps1 status
```

---

## 🔄 Migration from master-health-check.ps1

### Old Way ❌
```powershell
# Separate scripts (DEPRECATED)
.\tools\lokifi.ps1 health
.\tools\scripts\analysis\master-health-check.ps1 -Mode Quick
```

### New Way ✅
```powershell
# Single unified command
.\tools\lokifi.ps1 health
```

---

## 📚 Advanced Usage

### Combining with Other Commands
```powershell
# Health check + fix issues
.\lokifi.ps1 health
.\lokifi.ps1 format        # Fix code formatting
.\lokifi.ps1 lint          # Fix linting issues
.\lokifi.ps1 health        # Verify improvements

# Health check in development workflow
.\lokifi.ps1 dev both      # Start dev servers
.\lokifi.ps1 health -Quick # Quick health while developing
.\lokifi.ps1 test          # Run tests
.\lokifi.ps1 health        # Final comprehensive check
```

### Monitoring Health Over Time
```powershell
# Track health improvements
$today = Get-Date -Format "yyyy-MM-dd"

# Save baseline
.\lokifi.ps1 health > "health-baseline-$today.txt"

# After improvements
.\lokifi.ps1 health > "health-after-$today.txt"

# Compare
Compare-Object (Get-Content health-baseline-*.txt) (Get-Content health-after-*.txt)
```

---

## ⚡ Performance Tips

1. **Use -Quick for frequent checks** - Saves ~20 seconds
2. **Cache is your friend** - Codebase analyzer caches for 5 minutes
3. **Run in background** - Use `Start-Job` for non-blocking checks
4. **Schedule regular checks** - Windows Task Scheduler for automated monitoring

### Example: Background Health Check
```powershell
# Start health check in background
$job = Start-Job { 
    Set-Location C:\Users\USER\Desktop\lokifi\tools
    .\lokifi.ps1 health -Quick 
}

# Continue working...

# Check results later
Receive-Job $job
```

---

## 🎓 Understanding Health Scores

### Overall Health Calculation
```
Overall Health = (Maintainability + Security + Debt + Coverage) / 4

Where:
- Maintainability: Pass (25pts) | Warning (15pts) | Fail (0pts)
- Security: Pass (25pts) | Warning (15pts) | Fail (0pts)
- Tech Debt: Pass (25pts) | Warning (15pts) | Fail (0pts) [Inverted]
- Coverage: Pass (25pts) | Warning (15pts) | Fail (0pts)

Result:
- 80-100: 🎉 Excellent
- 60-79: ⚡ Good
- 0-59: ⚠️ Needs Attention
```

### Example Calculation (Current Lokifi)
```
Maintainability: 75/100 (≥70) → ✅ Pass → 25 points
Security Score: 85/100 (≥80) → ✅ Pass → 25 points
Technical Debt: 88.5 days (>60) → ❌ Fail → 0 points
Test Coverage: 3.6% (<50) → ❌ Fail → 0 points

Overall Health: 50/100 ⚠️ Needs Attention
```

---

## 🚀 What's New (Oct 9, 2025)

### Integrated from master-health-check.ps1
- ✅ TypeScript type safety validation
- ✅ NPM dependency security scanning
- ✅ Console.log detection
- ✅ TODO/FIXME comment tracking
- ✅ Git repository hygiene
- ✅ Large files detection

### Enhanced User Experience
- ✅ Single unified command
- ✅ Consistent `-Quick` and `-ShowDetails` flags
- ✅ Better progress indicators
- ✅ Comprehensive status icons
- ✅ Smart caching (5-minute TTL)

---

## 📞 Need Help?

```powershell
# View all available commands
.\tools\lokifi.ps1 help

# Get detailed help for health command
Get-Help .\tools\lokifi.ps1 -Parameter health

# View online documentation
# docs/implementation/HEALTH_COMMAND_ENHANCEMENT.md
```

---

**Quick Reference Guide** | Version 3.1.0-alpha | Phase 2E Complete
