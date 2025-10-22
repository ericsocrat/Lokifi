# 📁 Repository Structure Guide

**Last Updated:** October 8, 2025
**Health Score:** 98% ⭐⭐⭐⭐⭐

---

## 🎯 Overview

This document provides a comprehensive guide to the Lokifi repository structure, explaining where to find files and where to place new content.

---

## 📂 Top-Level Directories

### Essential Directories

```
lokifi/
├── backend/              # FastAPI Python backend
├── frontend/             # Next.js React application
├── docs/                 # All documentation
├── scripts/              # All automation scripts
├── infrastructure/       # Deployment and infrastructure
├── monitoring/           # Observability and monitoring
├── security/             # Security configurations
├── redis/                # Redis data and configuration
├── performance-tests/    # Performance testing suite
└── logs/                 # Application logs
```

---

## 📚 Documentation Structure (`docs/`)

### `docs/guides/`
**Purpose:** Setup, reference, and how-to guides

**Files:**
- `QUICK_START_GUIDE.md` - Fast setup for new developers
- `QUICK_REFERENCE_GUIDE.md` - Command reference
- `DEPLOYMENT_GUIDE.md` - Production deployment
- `DEVELOPMENT_ENVIRONMENT.md` - Development configuration
- `CODE_QUALITY_GUIDE.md` - Code standards and best practices
- `CODE_QUALITY.md` - Code quality standards
- `REDIS_DOCKER_SETUP.md` - Redis setup guide
- `POSTGRESQL_SETUP_GUIDE.md` - Database setup

**When to add files here:**
- Creating a new configuration guide
- Writing a how-to document
- Adding configuration instructions
- Documenting best practices

---

### `docs/optimization-reports/`
**Purpose:** Session reports and optimization tracking

**Files:**
- `OPTIMIZATION_SESSION_3_COMPLETE.md` - Session 3 report
- `OPTIMIZATION_COMPLETE.md` - Comprehensive optimization report
- `OPTIMIZATION_PROGRESS.md` - Progress tracking
- `CONTINUOUS_OPTIMIZATION_STATUS.md` - Live status
- `FINAL_OPTIMIZATION_REPORT.md` - Session completion
- `CLEANUP_SUMMARY.md` - Repository cleanup details

**When to add files here:**
- Completing an optimization session
- Documenting performance improvements
- Tracking quality metrics
- Recording cleanup activities

---

### `docs/development/`
**Purpose:** Development processes and workflows

**Contents:**
- API documentation
- Component documentation
- Development workflows
- Testing strategies

---

### `docs/project-management/`
**Purpose:** Project planning and tracking

**Contents:**
- Feature specifications
- Implementation plans
- Project status reports
- Roadmaps and milestones

---

### `docs/security/`
**Purpose:** Security documentation and policies

**Contents:**
- Security policies
- Audit reports
- Compliance documentation
- Incident response plans

---

## 🔧 Scripts Structure (`scripts/`)

### `scripts/analysis/`
**Purpose:** Code quality and health analysis tools

**Files:**
- `analyze-and-optimize.ps1` - Comprehensive health check (6 phases)
- `analyze-console-logging.ps1` - Console.log audit
- `analyze-typescript-types.ps1` - TypeScript any type analysis

**When to add scripts here:**
- Creating code analysis tools
- Building quality metrics tools
- Writing health check scripts
- Adding reporting utilities

**Usage:**
```powershell
# Run comprehensive analysis
.\scripts\analysis\analyze-and-optimize.ps1

# Check console logging
.\scripts\analysis\analyze-console-logging.ps1

# Audit TypeScript types
.\scripts\analysis\analyze-typescript-types.ps1
```

---

### `scripts/cleanup/`
**Purpose:** Repository maintenance and cleanup automation

**Files:**
- `cleanup-repo.ps1` - Initial repository cleanup
- `cleanup-scripts.ps1` - Script consolidation
- `cleanup-final.ps1` - Final cleanup phase

**When to add scripts here:**
- Creating maintenance scripts
- Building file organization tools
- Writing cleanup automation
- Adding archive utilities

**Usage:**
```powershell
# Run cleanup (careful - moves files!)
.\scripts\cleanup\cleanup-repo.ps1
```

---

### `scripts/fixes/`
**Purpose:** Automated code fixes and corrections

**Files:**
- `fix-zustand-proper.ps1` - Zustand v5 type fixes
- `fix-zustand-types.ps1` - Alternative Zustand fixes
- `fix-implicit-any-alerts.ps1` - Basic implicit any fixes
- `fix-all-implicit-any.ps1` - Comprehensive type fixes

**When to add scripts here:**
- Creating automated fix tools
- Building type correction scripts
- Writing code transformation tools
- Adding refactoring automation

**Usage:**
```powershell
# Fix Zustand types
.\scripts\fixes\fix-zustand-proper.ps1

# Fix all implicit any types
.\scripts\fixes\fix-all-implicit-any.ps1
```

---

### `scripts/development/`
**Purpose:** Development workflow automation

**Contents:**
- Development server launchers
- Build automation
- Hot reload tools
- Environment setup

---

### `scripts/deployment/`
**Purpose:** Deployment and infrastructure automation

**Contents:**
- Deployment scripts
- Database migration tools
- Infrastructure provisioning
- Configuration management

---

### `scripts/testing/`
**Purpose:** Testing automation and test runners

**Contents:**
- API testing tools
- Integration test runners
- Performance test automation
- Test data generators

---

### `scripts/security/`
**Purpose:** Security scanning and audit tools

**Contents:**
- Dependency scanning
- Vulnerability checks
- Security audit automation
- Certificate management

---

## 🚀 Application Directories

### `frontend/`
**Structure:**
```
frontend/
├── app/                 # Next.js App Router pages
├── components/          # React components
├── lib/                 # Zustand stores and utilities
├── src/
│   ├── components/      # Shared components
│   ├── services/        # API services
│   ├── utils/           # Utility functions
│   └── lib/             # Libraries and helpers
├── public/              # Static assets
└── styles/              # Global styles
```

---

### `backend/`
**Structure:**
```
backend/
├── app/
│   ├── api/            # API route handlers
│   ├── routers/        # FastAPI routers
│   ├── services/       # Business logic
│   ├── models/         # Database models
│   └── utils/          # Utility functions
├── alembic/            # Database migrations
├── tests/              # Backend tests
└── scripts/            # Backend-specific scripts
```

---

## 📍 Root Level Files

### Essential Files (Keep at Root)
- `README.md` - Main project documentation
- `START_HERE.md` - Getting started guide
- `PROJECT_STATUS_CONSOLIDATED.md` - Current project status
- `ARCHITECTURE_DIAGRAM.md` - System architecture
- `docker-compose.yml` - Docker Compose configuration
- `docker-compose.dev.yml` - Development Docker setup
- `docker-compose.redis.yml` - Redis Docker setup

### Utility Scripts (Keep at Root)
- `start-servers.ps1` - Main server launcher
- `manage-redis.ps1` - Redis management
- `setup-postgres.ps1` - PostgreSQL setup
- `test-api.ps1` - API testing
- `organize-repository.ps1` - File organization tool

### Configuration Files
- `.gitignore` - Git ignore rules
- `.gitattributes` - Git attributes
- `.nvmrc` - Node version specification
- `.vscode/` - VS Code workspace settings

---

## 🎯 File Placement Guidelines

### When creating new documentation:

**Setup/How-to Guides** → `docs/guides/`
```
Example: MYSQL_SETUP.md → docs/guides/MYSQL_SETUP.md
```

**Optimization Reports** → `docs/optimization-reports/`
```
Example: OPTIMIZATION_SESSION_4.md → docs/optimization-reports/OPTIMIZATION_SESSION_4.md
```

**Development Docs** → `docs/development/`
```
Example: API_REFERENCE.md → docs/development/API_REFERENCE.md
```

**Project Planning** → `docs/project-management/`
```
Example: SPRINT_PLAN.md → docs/project-management/SPRINT_PLAN.md
```

---

### When creating new scripts:

**Analysis/Auditing** → `scripts/analysis/`
```
Example: analyze-dependencies.ps1 → scripts/analysis/analyze-dependencies.ps1
```

**Cleanup/Maintenance** → `scripts/cleanup/`
```
Example: cleanup-logs.ps1 → scripts/cleanup/cleanup-logs.ps1
```

**Automated Fixes** → `scripts/fixes/`
```
Example: fix-imports.ps1 → scripts/fixes/fix-imports.ps1
```

**Development Tools** → `scripts/development/`
```
Example: hot-reload.ps1 → scripts/development/hot-reload.ps1
```

**Deployment** → `scripts/deployment/`
```
Example: deploy-production.ps1 → scripts/deployment/deploy-production.ps1
```

---

## 🔍 Finding Files

### Quick Reference

| I need to... | Look in... |
|--------------|-----------|
| Set up the project | `docs/guides/QUICK_START_GUIDE.md` |
| Find all commands | `docs/guides/QUICK_REFERENCE_GUIDE.md` |
| Deploy to production | `docs/guides/DEPLOYMENT_GUIDE.md` |
| Check code quality | Run `scripts/analysis/analyze-and-optimize.ps1` |
| View optimization history | `docs/optimization-reports/` |
| Fix TypeScript errors | Run `scripts/fixes/fix-all-implicit-any.ps1` |
| Test APIs | Run `test-api.ps1` (root) |
| Start all services | Run `start-servers.ps1` (root) |
| Manage Redis | Run `manage-redis.ps1` (root) |

---

## 📊 Directory Statistics

### Current Organization (Post Session 4)

```
Root directory:          27 files (clean!)
docs/guides:              8 essential guides
docs/optimization-reports: 6 session reports
scripts/analysis:         3 analysis tools
scripts/cleanup:          3 cleanup tools
scripts/fixes:            4 fix automation scripts

Total reduction:         89% from original 240+ files
Health score:            98% (world-class!)
Organization:            Professional structure ✅
```

---

## 🛠️ Organization Tools

### Automatic Organization
Use the `organize-repository.ps1` script to automatically organize files:

```powershell
# Run organization script
.\organize-repository.ps1

# This will:
# - Move optimization reports to docs/optimization-reports/
# - Move guides to docs/guides/
# - Move analysis scripts to scripts/analysis/
# - Move cleanup scripts to scripts/cleanup/
# - Move fix scripts to scripts/fixes/
```

---

## ✅ Best Practices

### DO ✅
- Keep root directory minimal (< 30 files)
- Place documentation in appropriate `docs/` subdirectories
- Organize scripts by function in `scripts/` subdirectories
- Use descriptive file names
- Include README.md in each major directory
- Update this guide when adding new directories

### DON'T ❌
- Create files in root unless essential
- Mix documentation types in same directory
- Create one-off scripts without organizing
- Use unclear or abbreviated names
- Leave TODO/WIP files in main directories
- Forget to update documentation

---

## 🚀 Maintaining Structure

### Weekly
- Review root directory for new files to organize
- Check for documentation that should be archived
- Ensure new scripts are properly categorized

### Monthly
- Run `organize-repository.ps1` to catch any misplaced files
- Archive old optimization reports
- Review and update this structure guide
- Clean up old logs and temporary files

### Quarterly
- Comprehensive structure audit
- Update documentation organization
- Refactor script directories if needed
- Review and consolidate similar files

---

## 📞 Questions?

If you're unsure where to place a file:

1. **Check this guide first**
2. **Look at similar existing files**
3. **When in doubt, ask or place in appropriate `docs/` or `scripts/` subdirectory**
4. **Update this guide if you create a new category**

---

**Remember:** A well-organized repository is a maintained repository! 🎯

**Structure Health:** 100% ✅
**Organization Level:** Professional
**Maintenance Status:** Excellent

---

**Created:** October 8, 2025
**Part of:** Session 4 Optimization
**Moved:** 24 files to proper locations
**Impact:** Clean, professional structure
