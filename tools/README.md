# 🛠️ Tools

Utility scripts and automation tools for the Lokifi platform.

---

## 📂 Structure

```
tools/
├── hooks/              # Git Hook Management
│   └── setup-precommit-hooks.ps1     # Pre-commit hook setup & bypass
├── scripts/            # Utility Scripts
│   ├── analysis/       # Code analysis (codebase-analyzer.ps1)
│   ├── cleanup/        # Cleanup utilities (cleanup-master.ps1)
│   ├── data/           # Data fetching (universal-fetcher.js)
│   ├── fixes/          # Automated fixes (universal-fixer.ps1)
│   └── security/       # Security tools (security-scanner.ps1, generate_secrets.py)
├── templates/          # HTML/Dashboard Templates
│   └── dashboard.html  # Coverage dashboard template
├── test-runner.ps1     # Comprehensive test runner with coverage & protection
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

### Root Level
- **cleanup-docs.ps1**: Documentation cleanup utility
### Root Tools
- **test-runner.ps1**: Comprehensive test execution with coverage, protection dashboards, and trend analysis

### Analysis Tools (`scripts/analysis/`)
- **codebase-analyzer.ps1**: Comprehensive codebase statistics, metrics, and project estimates (1570 lines, 82 KB)
  - Project metrics and technical debt analysis
  - Cost estimates with region-based pricing (US, EU, Asia, Remote)
  - Git history insights (commits, contributors, churn)
  - Multiple export formats (Markdown, JSON, CSV, HTML)
  - CI/CD integration support
  - **Use for**: Project reports, stakeholder documentation, estimation
  - **Note**: For ad-hoc analysis, use Copilot with `@workspace` context

### Cleanup Tools (`scripts/cleanup/`)
- **cleanup-master.ps1**: Master cleanup utility (docs, branches, scripts, cache, optimization)

### Data Tools (`scripts/data/`)
- **universal-fetcher.js**: Universal asset fetching (consolidated 19 scripts into one!)

### Fix Tools (`scripts/fixes/`)
- **universal-fixer.ps1**: Automated TypeScript fixes (any types, Zustand, alerts, performance)

### Security Tools (`scripts/security/`)
- **generate_secrets.py**: Secure secret generation for production environments
- **security-scanner.ps1**: Comprehensive security scanning (dependencies, code patterns, scoring)

### Git Hooks (`hooks/`)
- **setup-precommit-hooks.ps1**: Pre-commit hook setup with bypass functionality

---

## 📝 **Documentation Generation**

**Note**: For documentation generation, use **GitHub Copilot** with `@workspace` context:
- Test documentation: Ask Copilot to generate based on test files
- API documentation: Ask Copilot to extract from FastAPI routes
- Component docs: Ask Copilot to analyze React components

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

**Status**: Active • **Last Updated**: October 22, 2025 • **Total Scripts**: 7 focused automation tools
