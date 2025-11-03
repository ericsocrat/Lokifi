# 🛠️ Tools

Utility scripts and automation tools for the Lokifi platform.

---

## 📂 Structure

```
tools/
├── test-runner.ps1              # Comprehensive test runner with coverage & protection
├── codebase-analyzer.ps1        # Project metrics, cost estimates & technical debt analysis
├── security-scanner.ps1         # Security vulnerability scanning & secret detection
├── setup-precommit-hooks.ps1    # Git pre-commit hook setup & bypass management
├── mcp-coverage-server.js       # MCP server for real-time coverage data access
├── package.json                 # MCP server dependencies (Node.js)
├── lib/                         # Shared library modules
│   ├── Common-Functions.ps1     # Shared utilities (logging, CI/CD output, config)
│   ├── Baseline-Tracker.ps1     # Metrics history tracking & comparison
│   └── Cache-Manager.ps1        # Result caching for faster repeated runs
├── tests/                       # Tool test suites
│   ├── Test-Baseline-Tracker.ps1
│   └── Test-Cache-Manager.ps1
├── .baselines/                  # Tool metrics history (gitignored)
├── .cache/                      # Tool result cache (gitignored)
├── node_modules/                # MCP server dependencies (gitignored)
└── README.md                    # This file
```

---

## � MCP Coverage Server

Real-time test coverage queries **without running tests** via Model Context Protocol (MCP).

**Installation**:
```bash
cd tools
npm install
```

**Activation**: Restart VS Code → MCP server auto-starts with Copilot

**Usage**: Ask Copilot coverage questions like "What's my test coverage?" or "Which files need more tests?"

**Available Tools**:
- `get_coverage_summary` - Overall metrics & test counts
- `get_low_coverage_files` - Files needing tests (default: <80%)
- `get_coverage_trends` - Coverage changes over time
- `get_file_coverage` - Line-by-line file analysis
- `check_coverage_thresholds` - Pass/fail validation

**Documentation**: [MCP Coverage Server Guide](/docs/guides/mcp-coverage-server.md)

---

## � Tool Integration Status

### ✅ Fully Integrated

**test-runner.ps1** - Comprehensive test orchestration:
- ✅ **Pre-commit hooks** - Runs with `-PreCommit` flag (15% coverage threshold)
- ✅ **Pre-push hooks** - Runs with `-PreCommit -GenerateReport` (20% coverage threshold)
- ⚠️ **CI/CD workflows** - Local only (PowerShell cross-platform limitations)
- **Features**: Environment validation, logging, parallel execution, smart test selection, CI mode with JSON output
- **Note**: Designed for Windows/local development. CI uses direct npm/pytest commands for cross-platform compatibility.

**security-scanner.ps1** - Security vulnerability scanning:
- ⚠️ **Pre-commit hooks** - NOT YET INTEGRATED
- ⚠️ **CI/CD workflows** - NOT YET INTEGRATED (uses custom npm audit conversion)
- **Features**: Security scoring, baseline tracking, code pattern analysis, `-CIMode` flag ready

**setup-precommit-hooks.ps1** - Git hook management:
- ✅ **Installed** - 3/3 hooks active (pre-commit, pre-push, commit-msg)
- ✅ **Tested** - All hooks verified and working
- **Features**: Conventional commit enforcement, quality gates, bypass utility

### 📦 Standalone Tools

**codebase-analyzer.ps1** - Project metrics & reporting:
- Manual analysis tool for stakeholder reports
- Not intended for CI/CD automation
- **Features**: Cost estimates, git insights, technical debt tracking, `-CIMode` flag for JSON output

**bypass-hooks.ps1** - Emergency hook bypass:
- Local developer utility for emergencies only
- Bypasses all quality gates (use with caution!)
- Created automatically by `setup-precommit-hooks.ps1`

**mcp-coverage-server.js** - VS Code + Copilot integration:
- Developer assistance tool (not CI/CD)
- Real-time coverage queries via Model Context Protocol
- Activated via VS Code settings (`.vscode/settings.json`)

### 🎯 Next Integration Steps

**Priority 1**: Add security-scanner.ps1 to pre-commit hook (~15-20 min)
- Local-only integration (Windows PowerShell tool)
- Add `-Quick` mode to pre-commit hook for fast scans
- Benefits: Security scoring, baseline tracking before commits

**Priority 2**: Evaluate security-scanner.ps1 CI integration (~30-45 min)
- Note: Same PowerShell cross-platform limitations as test-runner.ps1
- Options: Windows-only CI runner, PowerShell Core compatibility fixes, or keep local-only
- Consider ROI: Current custom npm audit → SARIF conversion works in CI

**Lessons Learned**: PowerShell Tools in CI
- ✅ Excellent for local development (pre-commit/pre-push hooks)
- ⚠️ Cross-platform challenges in Linux CI runners
- 💡 Pragmatic approach: Keep tools local, use simple commands in CI

**Documentation**: See `/docs/checklists.md` → "Tool Integration & CI/CD" section

---

## �🚀 Quick Start (Standard Tools)

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

See `docs/workflow.md` for complete workflows and troubleshooting.


### Pre-commit Hook Setup
```powershell
.\tools\setup-precommit-hooks.ps1
```

**What it does**:
- Runs ESLint and Prettier on staged files
- Validates code quality before commit
- Integrated with Husky (frontend)


---

## 📊 Coverage Dashboards

View live coverage dashboards generated by test runners:

```powershell
# Backend coverage (pytest-generated)
cd apps/backend/htmlcov && python -m http.server 8080
# Open http://localhost:8080

# Frontend coverage (vitest-generated)
cd apps/frontend
npx serve coverage-dashboard
# Open http://localhost:3000
```

**Features**:
- Auto-generated after running tests with coverage
- File-by-file coverage breakdown
- Interactive HTML reports
- Historical trends tracking

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

---

## 🔧 Tool Enhancements (Phase 2 Complete)

### **Baseline Tracking** (`lib/Baseline-Tracker.ps1`)
Tracks tool metrics over time for performance monitoring:
- Save/retrieve baseline metrics (test counts, execution time, coverage)
- Compare current vs. historical baselines
- Detect improvements and regressions
- Storage: `tools/.baselines/<tool-name>/`

### **Result Caching** (`lib/Cache-Manager.ps1`)
Speeds up repeated tool runs with intelligent caching:
- MD5-based dependency tracking
- Configurable cache expiration (MaxAge)
- Automatic cache invalidation on file changes
- Storage: `tools/.cache/<tool-name>/`

### **CI/CD Integration** (All Tools)
All tools support CI/CD mode with JSON output:
- `--CIMode` or `-CIMode` parameter
- Structured JSON output with exit codes (0=success, 1=failure, 2=warning)
- Parseable results for GitHub Actions integration

### **Dry Run Mode** (All Tools)
Preview what actions would be taken without execution:
- `--DryRun` or `-DryRun` parameter
- Shows planned operations without making changes
- Useful for validation and debugging

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

**Primary Resource**: `docs/workflow.md`

For specific tools:
- **Test runner**: Run `.\tools\test-runner.ps1 -Help` for options
- **Codebase analysis**: Run `.\tools\codebase-analyzer.ps1` for project metrics
- **Security scanning**: Run `.\tools\security-scanner.ps1` for vulnerability checks
- **Git hooks**: Run `.\tools\setup-precommit-hooks.ps1` to configure
- **General workflow**: Read `docs/workflow.md`

---

**Status**: Active • **Last Updated**: October 30, 2025 • **Total Scripts**: 4 essential automation tools
