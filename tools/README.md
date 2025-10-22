# 🛠️ Tools

Utility scripts and automation tools for the Lokifi platform.

---

## 📂 Structure

```
tools/
├── test-runner.ps1              # Comprehensive test runner with coverage & protection
├── codebase-analyzer.ps1        # Project metrics, cost estimates & technical debt analysis
├── cleanup-master.ps1           # Automated cleanup utilities (logs, cache, temp files)
├── security-scanner.ps1         # Security vulnerability scanning & secret detection
├── setup-precommit-hooks.ps1    # Git pre-commit hook setup & bypass management
├── universal-fetcher.js         # Universal data fetching utility (APIs, files, etc.)
├── templates/                   # HTML/Dashboard Templates
│   └── dashboard.html           # Coverage dashboard template
└── README.md                    # This file
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
.\tools\setup-precommit-hooks.ps1
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

### **test-runner.ps1**
Comprehensive test execution with coverage, protection dashboards, and trend analysis
- Smart test selection (changed files only)
- Pre-commit validation
- Full suite with coverage
- Self-test and dry-run modes
- Environment validation (Python, Node.js, npm, git)
- File logging with timestamps

### **codebase-analyzer.ps1**
Comprehensive codebase statistics, metrics, and project estimates (1570 lines, 82 KB)
- Project metrics and technical debt analysis
- Cost estimates with region-based pricing (US, EU, Asia, Remote)
- Git history insights (commits, contributors, churn)
- Multiple export formats (Markdown, JSON, CSV, HTML)
- CI/CD integration support
- **Use for**: Project reports, stakeholder documentation, estimation
- **Note**: For ad-hoc analysis, use Copilot with `@workspace` context

### **cleanup-master.ps1**
Master cleanup utility for maintaining codebase hygiene
- Documentation cleanup (duplicates, orphans, broken links)
- Git branch cleanup (merged, stale branches)
- Script consolidation and organization
- Cache and temporary file cleanup
- Build artifact optimization

### **security-scanner.ps1**
Comprehensive security scanning and vulnerability detection
- Dependency vulnerability scanning (npm, pip)
- Code pattern analysis (secrets, dangerous functions)
- Security scoring and recommendations
- Detailed remediation guidance

### **setup-precommit-hooks.ps1**
Git pre-commit hook setup with bypass functionality
- ESLint and Prettier integration
- Automated code quality checks
- Bypass mode for emergency commits
- Integrated with Husky (frontend)

### **universal-fetcher.js**
Universal asset fetching utility (consolidated 19 scripts into one!)
- API data fetching with retry logic
- File downloads with progress tracking
- Multiple source support (HTTP, FTP, S3)
- Configurable caching and validation

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

**Status**: Active • **Last Updated**: October 22, 2025 • **Total Scripts**: 7 ultra-lean automation tools
