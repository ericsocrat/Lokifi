# Guides Directory

**Last Updated:** November 11, 2025
**Status:** 🎉 WORLD-CLASS - Three-tier documentation + comprehensive guides
**Active Files:** 17 (2 core + 10 subfolders + 5 comprehensive guides)
**Structure:** Professional three-tier organization with cross-references

---

## 📚 Core Workflow Guides (Root Level)

### ⭐ Essential Reading (Start Here!)

- **[DEVELOPER_WORKFLOW.md](workflow.md)** ⭐ - Complete development setup and daily workflows
  - **Consolidates**: DEVELOPMENT_SETUP.md, VSCODE_SETUP.md, QUICK_REFERENCE.md, AUTOMATION_GUIDE.md (key parts)
  - Initial setup, VS Code configuration, infrastructure, frontend/backend commands, quick reference
  - **Your one-stop guide for daily development!**

- **[PULL_REQUEST_COMPLETE_GUIDE.md](PULL_REQUEST_COMPLETE_GUIDE.md)** ⭐ - Complete PR workflow
  - **Consolidates**: PULL_REQUEST_GUIDE.md, MANUAL_PR_INSTRUCTIONS.md, CHECK_PRS.md, PRE_MERGE_CHECKLIST.md
  - PR creation, automated checks, code review, troubleshooting, best practices
  - **Everything you need for successful PRs!**

---

## 🌟 Comprehensive Guides (Deep-Dive Tutorials)

**Production-ready guides with battle-tested patterns:**

### Testing Patterns
- **[frontend-testing-patterns.md](frontend-testing-patterns.md)** - Session 79-89 comprehensive guide (3,026 lines, 88.84% coverage achievement)
  - AsyncMock pattern for React, Mathematical Indicator Testing (9 indicators proven), Canvas testing, WebSocket testing
  - 100% success rate across 121 frontend tests, cross-referenced with Pattern Library

- **[external-api-testing-patterns.md](external-api-testing-patterns.md)** - Session 77 backend testing guide (1,136 lines, 94.5% avg coverage)
  - create_mock_response() helper, async context managers, rate limiting, cache validation
  - Proven across 6 services (DataArchival, Crypto, Forex, Stock, Indices, News), 157 tests total

- **[backend-coverage-best-practices.md](backend-coverage-best-practices.md)** - Session 69 coverage patterns (470 lines)
  - Branch coverage configuration, smart exclusions (11 patterns), AsyncMock for pytest
  - 23.02% → 97% coverage achievements, industry-standard practices

### Development Tools
- **[copilot-usage.md](copilot-usage.md)** - GitHub Copilot quick reference (186 lines)
  - Essential shortcuts, quick prompts, project patterns, quality checklist
  - Fast access productivity guide with cross-references to copilot-instructions.md

- **[COVERAGE_DASHBOARD_INTEGRATION.md](COVERAGE_DASHBOARD_INTEGRATION.md)** - Live coverage dashboard guide (238 lines)
  - Auto-starts with dev servers on port 3002, real-time coverage metrics, trend analysis
  - See also: [COVERAGE_DASHBOARD_QUICK_REF.md](COVERAGE_DASHBOARD_QUICK_REF.md) for one-page quick start

- **[mcp-coverage-server.md](mcp-coverage-server.md)** - Model Context Protocol coverage server (256 lines)
  - Real-time coverage data access for AI assistants, 5 tools (summary, low-coverage, trends, file-level, thresholds)
  - Integrated with VS Code Copilot, query coverage without running tests

---

## 📂 Organized by Category

### 🧪 [`testing/`](testing/)
Testing strategies and quality assurance:
- **[TESTING_GUIDE.md](testing/TESTING_GUIDE.md)** - Comprehensive testing strategies and best practices
- **[INTEGRATION_TESTS_GUIDE.md](testing/INTEGRATION_TESTS_GUIDE.md)** - Integration testing guide
- **[COVERAGE_BASELINE.md](testing/COVERAGE_BASELINE.md)** - Test coverage baseline and targets

### 💎 [`quality/`](quality/)
Code quality standards and tools:
- **[CODE_QUALITY.md](quality/overview.md)** - Code quality standards and tools (ESLint, Prettier, Husky)
- **[CODING_STANDARDS.md](quality/standards.md)** - Project coding conventions

### 🏗️ [`infrastructure/`](infrastructure/)
Database and service setup:
- **[postgresql.md](infrastructure/postgresql.md)** - PostgreSQL installation and configuration
- **[redis.md](infrastructure/redis.md)** - Redis setup with Docker

### � [`architecture/`](architecture/)
Project structure and optimization:
- **[REPOSITORY_STRUCTURE.md](architecture/REPOSITORY_STRUCTURE.md)** - Project structure and organization
- **[TECHNICAL_DEBT.md](architecture/TECHNICAL_DEBT.md)** - Technical debt tracking
- **[ADVANCED_OPTIMIZATION_GUIDE.md](architecture/ADVANCED_OPTIMIZATION_GUIDE.md)** - Advanced optimization techniques

---

## 📦 Archive

**Consolidated/obsolete guides moved to `.archive/` (14 files archived):**

**Phase 2 (Core Consolidations):**
- ✅ PULL_REQUEST_GUIDE.md → PULL_REQUEST_COMPLETE_GUIDE.md
- ✅ MANUAL_PR_INSTRUCTIONS.md → PULL_REQUEST_COMPLETE_GUIDE.md
- ✅ CHECK_PRS.md → PULL_REQUEST_COMPLETE_GUIDE.md
- ✅ PRE_MERGE_CHECKLIST.md → PULL_REQUEST_COMPLETE_GUIDE.md
- ✅ DEVELOPMENT_SETUP.md → DEVELOPER_WORKFLOW.md
- ✅ VSCODE_SETUP.md → DEVELOPER_WORKFLOW.md
- ✅ DEPLOYMENT_GUIDE.md → See `../deployment/` folder

**Phase 2.5 (Additional Optimizations):**
- ✅ PR_20_CHECKS_EXPLAINED.md → Archived (PR-specific)
- ✅ PR_20_EXPLANATION.md → Archived (PR-specific)
- ✅ PR_DESCRIPTION.md → Archived (PR-specific)
- ✅ GITIGNORE_AUDIT_REPORT.md → Archived (one-off report)
- ✅ VISUAL_REGRESSION_BASELINES.md → TESTING_GUIDE.md
- ✅ QUICK_REFERENCE.md → DEVELOPER_WORKFLOW.md
- ✅ AUTOMATION_GUIDE.md → DEVELOPER_WORKFLOW.md

**Phase 3 (Session 89 - Guide Optimization - November 11, 2025):**
- ✅ FRONTEND_BUNDLE_ANALYSIS.md → `/docs/plans/.archive/analysis/frontend-bundle-analysis-2025-11-03.md` (historical performance baseline)

---

## 🔍 Quick Navigation

**By Task:**
- **First-time setup**: Start with [DEVELOPER_WORKFLOW.md](workflow.md) ⭐
- **Daily development**: Use [DEVELOPER_WORKFLOW.md](workflow.md) Quick Reference section
- **Creating PRs**: Read [PULL_REQUEST_COMPLETE_GUIDE.md](PULL_REQUEST_COMPLETE_GUIDE.md) ⭐
- **Writing tests**: See [testing/TESTING_GUIDE.md](testing/TESTING_GUIDE.md)
- **Code quality**: Review [quality/overview.md](quality/overview.md) + [quality/standards.md](quality/standards.md)
- **Setup database**: Check [infrastructure/postgresql.md](infrastructure/postgresql.md)
- **Setup Redis**: Check [infrastructure/redis.md](infrastructure/redis.md)

**By Role:**
- **New developers**: DEVELOPER_WORKFLOW.md → quality/standards.md → testing/TESTING_GUIDE.md
- **Contributors**: PULL_REQUEST_COMPLETE_GUIDE.md → quality/overview.md
- **Maintainers**: architecture/REPOSITORY_STRUCTURE.md → architecture/TECHNICAL_DEBT.md
- **DevOps**: infrastructure/ folder → [../ci-cd/](../ci-cd/)

---

## 📦 Archive

**Consolidated/obsolete guides moved to `.archive/` (14 files archived):**

**Phase 2 (Core Consolidations):**
- ✅ PULL_REQUEST_GUIDE.md → PULL_REQUEST_COMPLETE_GUIDE.md
- ✅ MANUAL_PR_INSTRUCTIONS.md → PULL_REQUEST_COMPLETE_GUIDE.md
- ✅ CHECK_PRS.md → PULL_REQUEST_COMPLETE_GUIDE.md
- ✅ PRE_MERGE_CHECKLIST.md → PULL_REQUEST_COMPLETE_GUIDE.md
- ✅ DEVELOPMENT_SETUP.md → DEVELOPER_WORKFLOW.md
- ✅ VSCODE_SETUP.md → DEVELOPER_WORKFLOW.md
- ✅ DEPLOYMENT_GUIDE.md → See `../deployment/` folder

**Phase 2.5 (Additional Optimizations):**
- ✅ PR_20_CHECKS_EXPLAINED.md → Archived (PR-specific)
- ✅ PR_20_EXPLANATION.md → Archived (PR-specific)
- ✅ PR_DESCRIPTION.md → Archived (PR-specific)
- ✅ GITIGNORE_AUDIT_REPORT.md → Archived (one-off report)
- ✅ VISUAL_REGRESSION_BASELINES.md → testing/TESTING_GUIDE.md
- ✅ QUICK_REFERENCE.md → DEVELOPER_WORKFLOW.md
- ✅ AUTOMATION_GUIDE.md → DEVELOPER_WORKFLOW.md

---

## 🎯 Consolidation & Restructure Achievement

**October 27, 2025 - Major Restructure Complete!**

**Results:**
- 📉 **Files reduced**: 25 → 12 active (52% reduction!)
- � **Better organization**: 4 category subfolders created
- �📦 **Files archived**: 14 guides consolidated or archived
- 📝 **Major consolidations**: 2 comprehensive guides created
- ✏️ **Files renamed**: 2 (REDIS_DOCKER_SETUP → REDIS_SETUP, POSTGRESQL_SETUP_GUIDE → POSTGRESQL_SETUP)
- ✅ **Professional structure**: Clear categorization by function

**Impact:**
- ✨ **Clearer navigation** - Organized by category (testing, quality, infrastructure, architecture)
- 📚 **Comprehensive guides** - More context in fewer places
- 🔍 **Better discoverability** - Related content grouped together
- 🎯 **Reduced maintenance** - Fewer files to keep in sync
- 🏗️ **Scalable structure** - Easy to add new guides to appropriate categories

---

**📖 For complete documentation:** See [../README.md](../README.md) for project-wide documentation index
