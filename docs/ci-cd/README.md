# 🔄 CI/CD Documentation Index

> **Purpose**: Centralized index for all CI/CD documentation, guides, and procedures.
> **Last Updated**: October 25, 2025
> **Status**: ✅ OPTIMIZED - All 7 workflow optimizations complete (100%)

---

## 🚀 Quick Start

**Choose your path**:

- 🆕 **First time here?** → [CI_CD_GUIDE.md](./CI_CD_GUIDE.md) - Beginner-friendly explanation
- 🐛 **Workflow failed?** → [Troubleshooting](#troubleshooting) - Common issues and fixes
- ⚡ **Performance question?** → [PERFORMANCE_GUIDE.md](./PERFORMANCE_GUIDE.md) - Metrics and optimizations
- 🔍 **Need workflow details?** → [WORKFLOW_AUDIT_REPORT.md](./WORKFLOW_AUDIT_REPORT.md) - Complete inventory
- 🔄 **Adding new workflow?** → [CI_CD_GUIDE.md](./CI_CD_GUIDE.md) - How-to section
- 🔐 **Security concerns?** → [PERFORMANCE_GUIDE.md](./PERFORMANCE_GUIDE.md) - Security improvements section

---

## 📋 Common Tasks

| Task | Documentation | Quick Link |
|------|---------------|------------|
| **View workflow logs** | CI_CD_GUIDE.md | [Where to See CI/CD](./CI_CD_GUIDE.md#where-to-see-cicd-in-action) |
| **Trigger workflow manually** | CI_CD_GUIDE.md | [Common Tasks](./CI_CD_GUIDE.md#common-tasks) |
| **Fix failed workflow** | CI_CD_GUIDE.md | [Troubleshooting](./CI_CD_GUIDE.md#troubleshooting) |
| **Emergency rollback** | ROLLBACK_PROCEDURES.md | [2-minute rollback](./ROLLBACK_PROCEDURES.md) |
| **Update dependencies** | DEPENDENCY_MANAGEMENT.md | [Dependabot config](./DEPENDENCY_MANAGEMENT.md) |
| **Check performance** | PERFORMANCE_GUIDE.md | [Metrics dashboard](./PERFORMANCE_GUIDE.md) |

---

## 📚 Documentation Categories

### 🎓 Getting Started

| Document | Purpose | Audience |
|----------|---------|----------|
| [**CI_CD_GUIDE.md**](./CI_CD_GUIDE.md) | Complete CI/CD guide - what it is, how it works, common tasks | Everyone (start here!) |
| [**PERFORMANCE_GUIDE.md**](./PERFORMANCE_GUIDE.md) | Performance metrics, optimizations, cost savings, future plans | Developers, DevOps |

### 📊 Current State & Analysis

| Document | Purpose | When to Use |
|----------|---------|-------------|
| [**WORKFLOW_AUDIT_REPORT.md**](./WORKFLOW_AUDIT_REPORT.md) | Current workflow state, quality metrics, protection score | Understand current CI/CD setup |
| [**SESSION_10_EXTENDED_SUMMARY.md**](./SESSION_10_EXTENDED_SUMMARY.md) | Recent CI fixes journey (46% → 91.3% pass rate) | Learn from recent optimizations |
| [**FOLLOW_UP_ACTIONS.md**](./FOLLOW_UP_ACTIONS.md) | Pending improvements (CodeQL, shellcheck, visual regression) | See planned work |

### � Reference Documentation

| Document | Purpose | When to Use |
|----------|---------|-------------|
| [**LINTING_AUDIT.md**](./LINTING_AUDIT.md) | Linting setup and configuration | Fix linting issues or add new rules |
| [**DEPENDENCY_MANAGEMENT.md**](./DEPENDENCY_MANAGEMENT.md) | Automated dependency updates with Dependabot | Configure dependency automation |

### 🛠️ Operational Procedures

| Document | Purpose | When to Use |
|----------|---------|-------------|
| [**ROLLBACK_PROCEDURES.md**](./ROLLBACK_PROCEDURES.md) | Emergency rollback to previous workflows | When optimizations cause critical issues |

---

## � Documentation Structure

```
docs/ci-cd/
├── 📖 Guides
│   ├── CI_CD_GUIDE.md (beginner-friendly, comprehensive)
│   └── PERFORMANCE_GUIDE.md (metrics, optimizations, cost analysis)
│
├── 📊 Current State
│   ├── WORKFLOW_AUDIT_REPORT.md (workflow inventory & health)
│   ├── SESSION_10_EXTENDED_SUMMARY.md (recent journey 46%→91.3%)
│   └── FOLLOW_UP_ACTIONS.md (pending improvements)
│
├── 📋 Reference
│   ├── LINTING_AUDIT.md (linting configuration reference)
│   └── DEPENDENCY_MANAGEMENT.md (Dependabot setup)
│
├── 🛠️ Operational
│   └── ROLLBACK_PROCEDURES.md (emergency recovery)
│
└── 📦 Archive (.archive/)
    ├── Historical documentation
    ├── Superseded analysis docs
    └── Pre-optimization reference
```

---

## 🔍 Troubleshooting

### 🗂️ Historical/Archive

> **Note**: The following documents have been archived to `docs/ci-cd/.archive/` as they are deprecated or obsolete. See [.archive/README.md](./.archive/README.md) for details.

**Archived**: 11 documents (3,318 total lines removed from active docs)

| Category | Count | Reason |
|----------|-------|--------|
| Consolidated explanation docs | 3 | Merged into CI_CD_GUIDE.md |
| Outdated guides | 3 | Migration complete, issues resolved |
| Obsolete analysis docs | 4 | Reference archived workflows |
| Archive index | 1 | Explains what's archived and why |

**See archived files**: [docs/ci-cd/.archive/](./.archive/)

**Key Archived Documents**:
- CI_CD_EXPLAINED_SIMPLE.md, CI_CD_WHERE_TO_LOOK.md, CICD_VS_UNIT_TESTS_EXPLAINED.md → Consolidated into CI_CD_GUIDE.md
- CURRENT_WORKFLOW_STATE.md, PERFORMANCE_BASELINE.md, TEST_WORKFLOW_ANALYSIS.md, CI_CD_OPTIMIZATION_STRATEGY.md → Reference archived workflows
- WORKFLOW_MIGRATION_GUIDE.md, GITHUB_ACTIONS_BILLING_ISSUE.md, HOW_TO_VIEW_GITHUB_ACTIONS_LOGS.md → Obsolete/resolved

---

## 🛠️ Tools & Commands

### Test Execution Tools
```bash
# Comprehensive test runner (recommended)
.\tools\test-runner.ps1 -All           # Run all tests
.\tools\test-runner.ps1 -Smart         # Run only changed files (fast feedback)
.\tools\test-runner.ps1 -PreCommit     # Pre-commit quality gates
.\tools\test-runner.ps1 -Coverage      # With coverage reports

# Manual testing
cd apps/frontend && npm test           # Frontend tests
cd apps/backend && pytest              # Backend tests
```

### Analysis & Monitoring Tools
```bash
# Project analysis and metrics
.\tools\codebase-analyzer.ps1                    # Full analysis
.\tools\codebase-analyzer.ps1 -Region eu -Detailed  # Regional cost estimates

# Security scanning
.\tools\security-scanner.ps1                     # Run security scans

# Git hooks setup
.\tools\setup-precommit-hooks.ps1                # Install pre-commit hooks
.\tools\setup-precommit-hooks.ps1 -UninstallHooks # Remove hooks
```

### Viewing Workflows
```bash
# GitHub CLI
gh run list                            # List recent workflow runs
gh run view <run-id>                   # View specific run
gh run view <run-id> --log             # View logs

# Web UI
# https://github.com/ericsocrat/Lokifi/actions
```

---

## 📊 Current Metrics

| Metric | Value | Status |
|--------|-------|--------|
| **Active Workflows** | 11 | ✅ Optimized |
| **Protection Score** | 75/100 | 🟡 Good (target: 90+) |
| **Performance** | 82% faster | ✅ 17 min → 3 min for simple changes |
| **Cache Hit Rate** | 80-90% | ✅ Excellent |
| **Coverage** | 19.31% overall | 🔴 Needs improvement (target: 80%) |
| **Security Tools** | 7 integrated | ✅ Comprehensive |
| **Cost** | $0/month | ✅ Within GitHub free tier |

**Last Optimization**: PR #27 (October 23, 2025) - Major workflow consolidation and performance improvements

---

## 🚨 Troubleshooting

### Common Issues

| Problem | Solution | Details |
|---------|----------|---------|
| **Workflow failing** | Check [CI_CD_GUIDE.md](./CI_CD_GUIDE.md#troubleshooting) | Step-by-step debugging guide |
| **ESLint errors** | `cd apps/frontend && npm run lint -- --fix` | Auto-fix linting issues |
| **TypeScript errors** | `cd apps/frontend && npm run type-check` | Check type errors |
| **Backend tests failing** | `cd apps/backend && pytest -v` | Run tests with verbose output |
| **Coverage dropped** | See [COVERAGE_BASELINE.md](../guides/COVERAGE_BASELINE.md) | Coverage improvement guide |
| **Workflows too slow** | Check [OPTIMIZATION_SUMMARY.md](./OPTIMIZATION_SUMMARY.md) | Already optimized to 3 min |

### Debug Workflow Locally
```bash
# Reproduce CI/CD environment
.\tools\test-runner.ps1 -PreCommit     # Runs all quality gates

# Step-by-step debugging
cd apps/frontend
npm run lint                           # Check ESLint
npm run type-check                     # Check TypeScript
npm test                               # Run Vitest
npx playwright test                    # Run E2E tests

cd apps/backend
ruff check .                           # Check Python linting
mypy app/                              # Check type hints
pytest -v                              # Run tests
```

---

## 🎯 Quick Start Guides

### For New Developers
1. **Read**: [CI_CD_GUIDE.md](./CI_CD_GUIDE.md) - Complete overview
2. **Setup**: `.\tools\setup-precommit-hooks.ps1` - Install quality gates
3. **Test**: `.\tools\test-runner.ps1 -Smart` - Run tests on your changes
4. **Monitor**: https://github.com/ericsocrat/Lokifi/actions - Watch workflows

### For Code Reviews
1. **Check PR status**: View status checks on PR page
2. **Review coverage**: Automated comment shows coverage impact
3. **Check security**: Security scan results posted automatically
4. **Verify size**: PR size check warns about large PRs

### For Workflow Modifications
1. **Review current state**: [WORKFLOW_AUDIT_REPORT.md](./WORKFLOW_AUDIT_REPORT.md)
2. **Test locally**: `.\tools\test-runner.ps1 -PreCommit`
3. **Submit PR**: CI/CD validates automatically
4. **Monitor**: GitHub Actions shows real-time results

---

## �️ CI/CD Architecture

### Active Workflows (11 Total)

**Core Workflows**:
- `ci.yml` - ⚡ Fast Feedback (~3 min)
- `coverage.yml` - 📈 Coverage Tracking (~5-6 min)
- `integration.yml` - 🔗 Integration Tests (~8 min)
- `e2e.yml` - 🎭 E2E Tests (6-15 min progressive)
- `security-scan.yml` - 🔐 Security Scanning (~5-10 min)

**Automation Workflows**:
- `label-pr.yml` - 🏷️ Auto-label PRs
- `auto-merge.yml` - 🤖 Auto-merge Dependabot
- `failure-notifications.yml` - 🚨 Failure alerts
- `pr-size-check.yml` - 📏 PR size warnings
- `stale.yml` - 🧹 Stale issue management
- `workflow-summary.yml` - 📊 Execution summaries

See [CI_CD_GUIDE.md](./CI_CD_GUIDE.md#how-our-workflows-work) for detailed workflow descriptions.

---

## � Roadmap

### Phase 1: Foundation ✅ Complete
- Consolidated duplicate workflows
- Implemented smart path detection
- Added comprehensive caching strategy
- Integrated 7 security tools

### Phase 2: Optimization ✅ Complete
- Reduced execution time by 82% (17 min → 3 min)
- Achieved 80-90% cache hit rates
- Implemented progressive E2E testing
- Created pre-commit quality gates
- **Completed**: PR #27 (October 23, 2025)

### Phase 3: Quality Enhancement 🔄 In Progress
- Increase test coverage to 80%+ (currently 19.31%)
- Add visual regression testing
- Implement performance budgets
- Improve protection score to 90+

### Phase 4: Excellence 📅 Planned
- Achieve 95%+ cache hit rates
- Full cross-browser E2E testing
- AI-powered test generation
- Predictive failure analysis

---

## 🔗 Related Documentation

- **[Main Documentation](../README.md)** - Project-wide documentation index
- **[Deployment Guide](../deployment/README.md)** - Production deployment procedures
- **[Test Quick Reference](../TEST_QUICK_REFERENCE.md)** - Testing best practices
- **[Coding Standards](../guides/CODING_STANDARDS.md)** - Code quality standards
- **[Coverage Baseline](../guides/COVERAGE_BASELINE.md)** - Coverage improvement guide

---

## ❓ Need Help?

1. **Check [CI_CD_GUIDE.md](./CI_CD_GUIDE.md)** - Comprehensive troubleshooting section
2. **Review workflow logs** - https://github.com/ericsocrat/Lokifi/actions
3. **Search existing issues** - GitHub issue tracker
4. **Create new issue** - Provide workflow run URL and error logs

---

**Last Updated**: October 23, 2025 | **Maintainer**: CI/CD Team | **Status**: ✅ Current
