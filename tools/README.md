# 🛠️ Tools

Utility scripts and automation tools for the Lokifi platform.

> **Note**: Previously contained `lokifi.ps1` (10,499 lines). Removed on October 19, 2025 in favor of standard tools. See `docs/DEVELOPER_WORKFLOW.md` for complete guide using docker-compose, npm, git, and other industry-standard tools.

---

## � Structure

```
tools/
├── ci-cd/              # CI/CD Utilities
│   ├── protection-dashboard.ps1      # Coverage/protection reporting
│   └── boost-test-coverage.ps1       # Test coverage utilities
├── hooks/              # Git Hook Management
│   └── setup-precommit-hooks.ps1     # Pre-commit hook setup
├── scripts/            # Utility Scripts
│   ├── analysis/       # Code analysis tools
│   ├── archive/        # Archived/obsolete scripts
│   └── test-intelligence.ps1
├── templates/          # HTML/Dashboard Templates
│   └── dashboard.html  # Coverage dashboard template
└── README.md           # This file
```

---

## 🚀 Quick Start (Standard Tools)

### Infrastructure
```bash
# Start all services
docker-compose up

# Stop all services
docker-compose down

# View logs
docker-compose logs -f

# Check status
docker-compose ps
```

### Frontend Development
```bash
cd apps/frontend

# Development server
npm run dev

# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Lint code
npm run lint

# Type check
npm run typecheck
```

### Backend Development
```bash
cd apps/backend

# Development server
uvicorn app.main:app --reload

# Run tests
pytest

# Run tests with coverage
pytest --cov

# Format code
black .

# Lint code
ruff check .
```

### Git Workflow
```bash
# Standard git workflow (Husky handles pre-commit hooks)
git add .
git commit -m "feat: your message"
git push
```

See `docs/DEVELOPER_WORKFLOW.md` for complete workflows and troubleshooting.

---

## �️ CI/CD Tools

### Protection Dashboard
Monitor test coverage and protection metrics:

```powershell
.\tools\ci-cd\protection-dashboard.ps1
```

**Features**:
- Real-time coverage statistics
- Quality gate monitoring
- Test execution metrics

### Coverage Booster
Automated test coverage utilities:

```powershell
.\tools\ci-cd\boost-test-coverage.ps1 -Target 25
```

---

## 🔧 Git Hooks

### Pre-commit Hook Setup
```powershell
.\tools\hooks\setup-precommit-hooks.ps1
```

**What it does**:
- Runs ESLint and Prettier on staged files
- Validates code quality before commit
- Integrated with Husky (frontend)


---

## � Coverage Dashboard

Open the interactive coverage dashboard:

```powershell
# View in browser
Start-Process .\tools\templates\dashboard.html
```

**Features**:
- Test coverage visualization
- File-by-file coverage breakdown
- Coverage trends
- Export to PDF/PNG

---

## 📚 Available Scripts

### Analysis Tools (`scripts/analysis/`)
- **codebase-analyzer.ps1**: Codebase statistics and metrics
- **test-intelligence.ps1**: Test impact analysis

### Archive (`scripts/archive/`)
Historical scripts for reference (no longer actively used):
- Obsolete CI/CD scripts (archived 2025-10-19)
- Legacy test utilities

---

## 🎯 Migration from lokifi.ps1

**Previous command** → **Standard tool**:
- `.\lokifi.ps1 servers` → `docker-compose up`
- `.\lokifi.ps1 test` → `npm test` (frontend) or `pytest` (backend)
- `.\lokifi.ps1 validate` → `npm run lint` or `npm run typecheck`
- `.\lokifi.ps1 dev` → `npm run dev` or `uvicorn app.main:app --reload`
- `.\lokifi.ps1 git -Component commit` → `git commit`

**Why removed?**: 99% redundancy with standard tools. See `docs/LOKIFI_PS1_DELETION_COMPLETE.md` for full analysis.

---

## 🤝 Contributing

When adding tools or scripts:
1. Follow PowerShell best practices
2. Include help documentation (`Get-Help` compatible)
3. Add error handling
4. Test thoroughly
5. Update this README

---

## 📞 Support

**Primary Resource**: `docs/DEVELOPER_WORKFLOW.md`

For specific tools:
- **Coverage issues**: Check `.\tools\ci-cd\protection-dashboard.ps1`
- **Git hooks**: See `.\tools\hooks\setup-precommit-hooks.ps1 -Help`
- **General workflow**: Read `docs/DEVELOPER_WORKFLOW.md`

---

**Status**: Active
**Last Updated**: October 19, 2025
**Note**: lokifi.ps1 removed (10,499 lines) - use standard tools instead
