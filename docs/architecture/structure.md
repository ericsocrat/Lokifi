# 📁 Repository Structure Guide

**Last Updated:** October 27, 2025
**Health Score:** 98% ⭐⭐⭐⭐⭐

---

## 🎯 Overview

This document provides a comprehensive guide to the Lokifi repository structure, explaining where to find files and where to place new content. Lokifi uses a **monorepo structure** with all applications under `apps/` and shared tooling at the root level.

---

## 📂 Top-Level Directories

### Essential Directories

```
lokifi/
├── apps/                 # All applications (monorepo)
│   ├── backend/          # FastAPI Python backend
│   ├── frontend/         # Next.js React application
│   ├── admin/            # Admin dashboard (future)
│   └── mobile/           # Mobile app (future)
├── docs/                 # All documentation (organized by category)
├── tools/                # Automation scripts and utilities (flat structure)
├── infra/
└── logs/
```

---

## 📚 Documentation Structure (`docs/`)

### Overview
Documentation is organized by **category** for better scalability and navigation:

```
docs/
├── README.md                    # Main documentation index
├── quick-start.md               # Fast project setup
├── CHECKLISTS.md                # Process checklists
├── plans/                       # Sprint planning and history
│   ├── history.md        # Historical record of sprints
│   └── .archive/                # Completed session plans
├── guides/                      # Development guides (RESTRUCTURED)
│   ├── workflow.md ⭐      # Core workflow guide
│   ├── PULL_REQUEST_COMPLETE_GUIDE.md ⭐  # PR guide
│   ├── testing/                 # Testing guides (3 files)
│   ├── quality/                 # Code quality guides (2 files)
│   ├── infrastructure/          # Setup guides (2 files)
│   ├── architecture/            # Architecture docs (3 files)
│   ├── README.md                # Guides index
│   └── .archive/                # Archived guides (14 files)
├── ci-cd/                       # CI/CD documentation
│   ├── workflows/               # Workflow-specific docs
│   ├── optimization/            # Optimization reports
│   └── README.md                # CI/CD index
├── deployment/                  # Production deployment
├── security/                    # Security documentation
├── api/                         # API documentation
├── design/                      # Design assets and mockups
├── plans/                       # Project planning
└── archive/                     # Archived documentation
```

---

### `docs/guides/` - Development Guides
**Purpose:** Developer setup, workflows, and reference documentation

**Core Guides (Root Level):**
- `workflow.md` ⭐ - Complete development workflow
- `PULL_REQUEST_COMPLETE_GUIDE.md` ⭐ - Pull request guide

**Organized by Category:**

**`testing/`** - Testing documentation (3 files)
- `TESTING_GUIDE.md` - Comprehensive testing guide
- `INTEGRATION_TESTS_GUIDE.md` - Integration testing
- `COVERAGE_BASELINE.md` - Coverage tracking and baselines

**`quality/`** - Code quality and standards (2 files)
- `CODE_QUALITY.md` - Quality tools and automation
- `CODING_STANDARDS.md` - Code style conventions

**`infrastructure/`** - Infrastructure setup (2 files)
- `postgresql.md` - Database setup guide
- `redis.md` - Redis configuration guide

**`architecture/`** - Architecture and structure (3 files)
- `REPOSITORY_STRUCTURE.md` - This document
- `TECHNICAL_DEBT.md` - Technical debt tracking
- `ADVANCED_OPTIMIZATION_GUIDE.md` - Performance optimization

**When to add files here:**
- Creating developer setup guides → `infrastructure/`
- Writing testing documentation → `testing/`
- Documenting code standards → `quality/`
- Explaining architecture decisions → `architecture/`

---

### `docs/ci-cd/` - CI/CD Documentation
**Purpose:** Continuous integration, deployment, and workflow optimization

**Structure:**
```
ci-cd/
├── CI_CD_GUIDE.md                           # Main CI/CD guide
├── DEPENDABOT_ACTION_PLAN.md                # Dependency management
├── WORKFLOW_OPTIMIZATION_COMPLETE.md        # Optimization guide
├── SESSION_10_EXTENDED_SUMMARY.md           # Latest session report
├── FOLLOW_UP_ACTIONS.md                     # Post-merge tasks
├── workflows/                               # Workflow-specific docs
└── optimization/                            # Optimization reports
```

**When to add files here:**
- Documenting new workflows
- Recording optimization sessions
- Creating CI/CD guides
- Tracking workflow improvements

---

### `docs/deployment/` - Production Deployment
**Purpose:** Production deployment guides and configurations

**Contents:**
- Deployment procedures
- Infrastructure setup
- DNS configuration
- SSL/TLS setup
- Production troubleshooting

**When to add files here:**
- Creating deployment guides
- Documenting infrastructure changes
- Recording production configurations
- Writing operational runbooks

---

### `docs/security/` - Security Documentation
**Purpose:** Security policies, audit reports, and compliance

**Contents:**
- Security policies
- Audit reports
- Compliance documentation
- Incident response plans
- Security best practices

**When to add files here:**
- Documenting security policies
- Recording security audits
- Creating incident response procedures
- Compliance documentation

---

### `docs/api/` - API Documentation
**Purpose:** API specifications and reference documentation

**Contents:**
- API endpoints documentation
- Request/response examples
- Authentication guides
- API versioning documentation

**When to add files here:**
- Documenting new API endpoints
- Creating API integration guides
- Recording API changes and versions

---

### `docs/plans/` - Project Planning
**Purpose:** Feature specifications and project planning

**Contents:**
- Feature specifications
- Implementation plans
- Project status reports
- Roadmaps and milestones

**When to add files here:**
- Planning new features
- Creating implementation specifications
- Tracking project milestones

---

### `docs/archive/` - Archived Documentation
**Purpose:** Historical documentation no longer actively referenced

**When to move files here:**
- Documentation superseded by newer versions
- Historical reports for reference only
- Outdated guides (keep for historical context)

---

## 🔧 Tools & Scripts Structure (`tools/`)

### Overview
**Tools uses a FLAT STRUCTURE** with scripts at the root level and only one subfolder (`scripts/`) for specialized utilities.

```
tools/
├── README.md                      # Tools documentation
├── test-runner.ps1                # Comprehensive test execution
├── codebase-analyzer.ps1          # Project metrics & analysis
├── security-scanner.ps1           # Security scanning
└── setup-precommit-hooks.ps1      # Git pre-commit hook setup
```

---

### Root-Level Tools (Primary Scripts)

**`test-runner.ps1`** - Comprehensive Test Execution
- Smart test selection (changed files only)
- Pre-commit validation
- Full test suite with coverage
- Frontend + Backend test orchestration

**Usage:**
```powershell
# Run only changed files' tests (fast feedback)
.\tools\test-runner.ps1 -Smart

# Run full test suite before commit
.\tools\test-runner.ps1 -PreCommit

# Run all tests with coverage
.\tools\test-runner.ps1 -All
```

**`codebase-analyzer.ps1`** - Project Metrics & Cost Analysis
- Project metrics and technical debt analysis
- Cost estimates with region-based pricing
- Git history insights (commits, contributors, churn)
- Multiple export formats (Markdown, JSON, CSV, HTML)
- Maintenance cost projections (1/3/5 years)

**Usage:**
```powershell
# Full analysis with project estimates
.\tools\codebase-analyzer.ps1

# Export to JSON for CI/CD integration
.\tools\codebase-analyzer.ps1 -OutputFormat json

# Region-specific cost estimates
.\tools\codebase-analyzer.ps1 -Region eu -Detailed
```

**`security-scanner.ps1`** - Security Scanning
- Dependency vulnerability scanning
- Security audit automation
- Configuration validation

**`setup-precommit-hooks.ps1`** - Git Hooks Setup
- Pre-commit hook installation
- Linting automation
- Test validation before commits

---

### `tools/scripts/` - Specialized Scripts

**`scripts/coverage/`** - Coverage Automation
- Automatic coverage tracking
- Coverage report generation
- Documentation synchronization
- CI/CD integration

**See:** `/tools/scripts/coverage/README.md` for coverage automation details

---

### When to Add New Tools

**Root Level (`tools/`)** - Main utility scripts:
- Analysis tools (code quality, metrics, reporting)
- Test runners and automation
- Security scanners
- Cleanup and maintenance utilities
- Development workflow helpers

**Subdirectory (`tools/scripts/`)** - Specialized utilities:
- Category-specific automation (e.g., coverage/)
- Multi-script workflows
- Complex automation pipelines

**Example Placements:**
```powershell
# General purpose tool → Root level
tools/dependency-checker.ps1

# Specialized automation → Subdirectory
tools/scripts/deployment/deploy-production.ps1
```

---

## 🚀 Applications (`apps/`)

### Overview - Monorepo Structure
All applications are organized under `apps/` for better separation and scalability.

```
apps/
├── README.md           # Apps overview
├── backend/            # FastAPI Python backend (primary)
├── frontend/           # Next.js React application (primary)
├── admin/              # Admin dashboard (future)
└── mobile/             # Mobile app (future)
```

---

### `apps/frontend/` - Next.js Application
**Structure:**
```
apps/frontend/
├── app/                    # Next.js App Router pages
│   ├── (auth)/             # Auth pages group
│   ├── (dashboard)/        # Dashboard pages group
│   ├── layout.tsx          # Root layout
│   └── page.tsx            # Home page
├── components/             # React components
│   ├── ui/                 # shadcn/ui components
│   ├── charts/             # Chart components
│   ├── dashboard/          # Dashboard components
│   └── layout/             # Layout components
├── lib/                    # Libraries and utilities
│   ├── stores/             # Zustand state management
│   ├── api/                # API client
│   ├── utils/              # Utility functions
│   └── hooks/              # Custom React hooks
├── public/                 # Static assets
├── tests/                  # Vitest tests
│   ├── components/         # Component tests
│   ├── integration/        # Integration tests
│   └── e2e/                # Playwright E2E tests
├── styles/                 # Global styles
├── types/                  # TypeScript type definitions
├── package.json            # Dependencies
├── tsconfig.json           # TypeScript config
├── next.config.js          # Next.js configuration
├── tailwind.config.ts      # TailwindCSS config
└── vitest.config.ts        # Vitest configuration
```

**Key Technologies:**
- Next.js 15.1.3 (App Router)
- React 19
- TypeScript
- TailwindCSS 3.4.17
- Zustand (state management)
- Recharts (data visualization)
- Vitest + Testing Library + Playwright

---

### `apps/backend/` - FastAPI Application
**Structure:**
```
apps/backend/
├── app/                    # Main application code
│   ├── main.py             # FastAPI application entry
│   ├── api/                # API route handlers
│   │   ├── routes/         # Route definitions
│   │   ├── dependencies.py # Dependency injection
│   │   └── __init__.py
│   ├── core/               # Core functionality
│   │   ├── config.py       # Configuration
│   │   ├── security.py     # Security utilities
│   │   └── database.py     # Database connection
│   ├── models/             # SQLAlchemy models
│   │   ├── base.py         # Base model
│   │   ├── user.py         # User model
│   │   └── schemas/        # Pydantic schemas
│   ├── services/           # Business logic
│   │   ├── auth.py         # Authentication service
│   │   ├── user.py         # User service
│   │   └── cache.py        # Redis cache service
│   └── utils/              # Utility functions
├── tests/                  # Pytest tests
│   ├── unit/               # Unit tests
│   ├── integration/        # Integration tests
│   └── conftest.py         # Pytest fixtures
├── alembic/                # Database migrations
│   ├── versions/           # Migration files
│   └── env.py              # Alembic environment
├── requirements.txt        # Production dependencies
├── requirements-dev.txt    # Development dependencies
├── pytest.ini              # Pytest configuration
└── pyproject.toml          # Python project config
```

**Key Technologies:**
- FastAPI (Python 3.11+)
- SQLAlchemy (ORM)
- PostgreSQL (database)
- Redis (caching)
- Alembic (migrations)
- Pytest (testing)

---

### `apps/admin/` - Admin Dashboard (Future)
**Purpose:** Administrative interface for system management
**Status:** Planned for future development

---

### `apps/mobile/` - Mobile Application (Future)
**Purpose:** iOS/Android mobile application
**Status:** Planned for future development

---

## 🏗️ Infrastructure (`infra/`)

### Overview
Infrastructure, deployment, and DevOps configurations.

```
infra/
├── README.md               # Infrastructure overview
├── docker/                 # Docker configurations
│   ├── docker-compose.yml                    # Local development
│   ├── docker-compose.production.yml         # Full production stack
│   ├── docker-compose.prod-minimal.yml       # Production (cloud DB)
│   ├── .env.example                          # Environment template
│   ├── .env                                  # Production secrets (gitignored)
│   └── LOCAL_DEVELOPMENT.md                  # Local setup guide
├── monitoring/             # Monitoring and observability
│   ├── prometheus.yml      # Prometheus scrape config
│   ├── grafana-datasources.yml  # Grafana data sources
│   ├── lighthouserc.json   # Lighthouse CI config
│   └── README.md           # Monitoring documentation
├── security/               # Security configurations
│   ├── dependency_protection/  # Version guard system
│   └── README.md           # Security documentation
├── logs/                   # Infrastructure logs (gitignored)
│   ├── docker/             # Docker container logs
│   ├── traefik/            # Reverse proxy logs
│   ├── monitoring/         # Prometheus/Grafana logs
│   ├── security/           # Security audit logs
│   └── deployment/         # Deployment logs
└── Makefile                # Infrastructure automation commands
```

---

### Key Infrastructure Components

**Docker Compose Configurations:**
- `docker-compose.yml` - Local development (localhost, simple passwords)
- `docker-compose.production.yml` - Full production stack with Traefik
- `docker-compose.prod-minimal.yml` - Production with cloud database

**Important Files:**
- `.env` - Production secrets (NEVER commit - gitignored)
- `.env.example` - Environment variable template (safe to commit)
- `LOCAL_DEVELOPMENT.md` - Local Docker setup guide

**Production Infrastructure:**
- **Reverse Proxy:** Traefik with automatic SSL
- **Domain:** lokifi.com (Cloudflare DNS)
- **Production URL:** www.lokifi.com
- **API URL:** api.www.lokifi.com
- **Email:** hello@lokifi.com, admin@lokifi.com, support@lokifi.com

**When to add files here:**
- Creating Docker configurations
- Adding infrastructure automation
- Configuring monitoring/observability
- Setting up security policies
- Managing deployment scripts

---

## 📍 Root Level Files

### Essential Files
- `README.md` - Main project documentation
- `LICENSE` - Project license (MIT)
- `package.json` - Root workspace dependencies
- `package-lock.json` - Dependency lock file

### Configuration Files
- `.gitignore` - Git ignore rules
- `.gitattributes` - Git attributes
- `.editorconfig` - Editor configuration
- `.nvmrc` - Node version specification (for nvm)
- `.env.example` - Root environment template
- `.copilotignore` - GitHub Copilot ignore patterns

### Configuration Directory
- `config/` - Centralized configuration files
  - `coverage.config.json` - Coverage thresholds and config (single source of truth)

### Tool Configuration
- `tools/` - Development tools and utilities
  - `tools.config.json` - Tool configuration (test-runner, codebase-analyzer, security-scanner)
  - `tools.config.schema.json` - JSON schema for tool configuration

### Development Tools (tools/)
- `tools/actionlint` - GitHub Actions linter binary (gitignored, used for local workflow validation)
- `tools/bypass-hooks.ps1` - Emergency Git hook bypass utility (use carefully!)
- Other automation tools: test-runner, codebase-analyzer, security-scanner

**Note**: Coverage reports (`coverage.json`, `.coverage`, `htmlcov/`) now generate in app-specific directories:
- Backend: `apps/backend/coverage.json`, `apps/backend/htmlcov/`
- Frontend: `apps/frontend/coverage/`

### Generated Directories
- `.next/` - Next.js build cache (gitignored)
- `node_modules/` - Node dependencies (gitignored)
- `logs/` - Application logs (gitignored)

### VS Code Configuration
- `.vscode/` - VS Code workspace settings
  - `settings.json` - Editor settings
  - `tasks.json` - Custom tasks (server launchers)
  - `extensions.json` - Recommended extensions

---

## 🎯 File Placement Guidelines

### When creating new documentation:

**Core Development Guides** → `docs/guides/` (root or subfolders)
```
Developer workflow guides → docs/guides/ (root level)
Testing guides → docs/guides/testing/
Code quality guides → docs/guides/quality/
Infrastructure setup → docs/guides/infrastructure/
Architecture docs → docs/guides/architecture/
```

**CI/CD & Workflow** → `docs/ci-cd/`
```
Workflow documentation → docs/ci-cd/workflows/
Optimization reports → docs/ci-cd/optimization/
CI/CD guides → docs/ci-cd/
```

**Deployment & Operations** → `docs/deployment/`
```
Production deployment → docs/deployment/
Infrastructure setup → docs/deployment/
Operational runbooks → docs/deployment/
```

**API Documentation** → `docs/api/`
```
API specifications → docs/api/
Integration guides → docs/api/
```

**Project Planning** → `docs/plans/`
```
Feature specifications → docs/plans/
Implementation plans → docs/plans/
Roadmaps → docs/plans/
```

---

### When creating new scripts:

**General Purpose Tools** → `tools/` (root level)
```
Test runners → tools/test-runner.ps1
Analysis tools → tools/codebase-analyzer.ps1
Security scanners → tools/security-scanner.ps1
Git hooks → tools/setup-precommit-hooks.ps1
```

---

### When creating new application code:

**Frontend Code** → `apps/frontend/`
```
Pages → apps/frontend/app/
Components → apps/frontend/components/
Stores → apps/frontend/lib/stores/
API client → apps/frontend/lib/api/
Tests → apps/frontend/tests/
```

**Backend Code** → `apps/backend/`
```
API routes → apps/backend/app/api/routes/
Business logic → apps/backend/app/services/
Models → apps/backend/app/models/
Tests → apps/backend/tests/
```

---

### When creating infrastructure configs:

**Docker & Deployment** → `infra/`
```
Docker configs → infra/docker/
Traefik (reverse proxy) → infra/docker/docker-compose.production.yml
Monitoring → infra/monitoring/
Security tools → infra/security/
Infrastructure logs → infra/logs/
```

---

## 🔍 Finding Files - Quick Reference

### For New Developers

| I need to... | Look in... |
|--------------|-----------|
| Get started quickly | `docs/quick-start.md` |
| Understand development workflow | `docs/guides/workflow.md` ⭐ |
| Learn PR process | `docs/guides/PULL_REQUEST_COMPLETE_GUIDE.md` ⭐ |
| Set up PostgreSQL | `docs/guides/infrastructure/postgresql.md` |
| Set up Redis | `docs/guides/infrastructure/redis.md` |
| Run tests | `tools/test-runner.ps1` or `docs/guides/testing/TESTING_GUIDE.md` |
| Check code quality | `tools/codebase-analyzer.ps1` |
| View coding standards | `docs/guides/quality/CODING_STANDARDS.md` |

### For DevOps & Infrastructure

| I need to... | Look in... |
|--------------|-----------|
| Deploy to production | `docs/deployment/` |
| Docker setup (local) | `infra/docker/LOCAL_DEVELOPMENT.md` |
| Docker configs | `infra/docker/docker-compose*.yml` |
| CI/CD documentation | `docs/ci-cd/CI_CD_GUIDE.md` |
| Workflow optimization | `docs/ci-cd/WORKFLOW_OPTIMIZATION_COMPLETE.md` |
| Infrastructure configs | `infra/` |
| Security configs | `infra/security/` or `docs/security/` |

### For Testers & QA

| I need to... | Look in... |
|--------------|-----------|
| Run all tests | `tools/test-runner.ps1 -All` |
| Run smart tests (changed files) | `tools/test-runner.ps1 -Smart` |
| Testing guide | `docs/guides/testing/TESTING_GUIDE.md` |
| Integration tests | `docs/guides/testing/INTEGRATION_TESTS_GUIDE.md` |
| Coverage baseline | `docs/guides/testing/COVERAGE_BASELINE.md` |
| E2E tests | `apps/frontend/tests/e2e/` |

### For Frontend Developers

| I need to... | Look in... |
|--------------|-----------|
| Pages (routing) | `apps/frontend/app/` |
| React components | `apps/frontend/components/` |
| Zustand stores | `apps/frontend/lib/stores/` |
| API client | `apps/frontend/lib/api/` |
| Utility functions | `apps/frontend/lib/utils/` |
| Component tests | `apps/frontend/tests/components/` |
| E2E tests | `apps/frontend/tests/e2e/` |

### For Backend Developers

| I need to... | Look in... |
|--------------|-----------|
| API routes | `apps/backend/app/api/routes/` |
| Business logic | `apps/backend/app/services/` |
| Database models | `apps/backend/app/models/` |
| Pydantic schemas | `apps/backend/app/models/schemas/` |
| Core config | `apps/backend/app/core/` |
| Unit tests | `apps/backend/tests/unit/` |
| Integration tests | `apps/backend/tests/integration/` |

---

## 📊 Repository Statistics

### Current Organization (October 2025)

```
Root directory:           25 files (clean, essential only)
apps/                     4 applications (backend, frontend + 2 future)
docs/                     7 main categories + 51 organized files
docs/guides/              2 core + 10 in 4 subfolders + 14 archived
docs/ci-cd/               10 files + 2 subfolders (workflows, optimization)
tools/                    8 root scripts + 1 subfolder (coverage automation)
infra/                    8 categories (docker, nginx, monitoring, etc.)

Health Score:             98% (world-class structure!)
Organization:             Professional monorepo structure ✅
Documentation:            Comprehensive and well-organized ✅
Test Coverage:            6,368 tests (11.61% frontend, 51.09% backend)
```

---

## ✅ Best Practices

### DO ✅
- **Monorepo structure:** All apps under `apps/`
- **Category-based docs:** Use subfolders in `docs/guides/`
- **Flat tools structure:** Keep scripts at `tools/` root level
- **Infrastructure separation:** All DevOps in `infra/`
- **Clear naming:** Use descriptive, consistent file names
- **Documentation:** Include README.md in each major directory
- **Testing:** Tests live with the code they test
- **Update guides:** Keep this document current when structure changes

### DON'T ❌
- Mix application code at root level (use `apps/`)
- Create deep nested documentation structures
- Put infrastructure configs in app directories
- Hardcode secrets (use `.env` files, never commit them)
- Skip documentation for new major directories
- Create one-off scripts without organizing them
- Commit generated files (coverage reports, build artifacts)
- Use unclear or abbreviated directory names

---

## 🚀 Maintaining Structure

### Before Each Commit
- Run `tools/test-runner.ps1 -PreCommit` for validation
- Ensure new files are in appropriate directories
- Update documentation if you created new categories
- Check that `.gitignore` covers generated files

### Weekly
- Review for new files that need organizing
- Archive outdated documentation
- Check test coverage with `tools/test-runner.ps1 -All`
- Update this guide if structure evolved

### Monthly
- Comprehensive structure audit
- Review and consolidate similar documentation
- Update infrastructure configurations
- Clean up old logs and temporary files
- Run `tools/codebase-analyzer.ps1` for health metrics

### Quarterly
- Major documentation review and consolidation
- Refactor directory structure if needed
- Archive historical reports
- Update architecture diagrams
- Review and update best practices

---

## � Automation & Tools

### Test Runner (`tools/test-runner.ps1`)
**Comprehensive test execution with multiple modes:**

```powershell
# Smart mode - Run only changed files' tests
.\tools\test-runner.ps1 -Smart

# Pre-commit - Full validation before commit
.\tools\test-runner.ps1 -PreCommit

# All tests with coverage
.\tools\test-runner.ps1 -All
```

**Features:**
- Automatic test discovery (frontend + backend)
- Smart change detection (Git diff)
- Coverage reporting
- Frontend (Vitest) + Backend (Pytest) orchestration
- Pre-commit validation hooks

---

### Codebase Analyzer (`tools/codebase-analyzer.ps1`)
**Project metrics and cost analysis:**

```powershell
# Full analysis
.\tools\codebase-analyzer.ps1

# JSON export for CI/CD
.\tools\codebase-analyzer.ps1 -OutputFormat json

# Region-specific costs
.\tools\codebase-analyzer.ps1 -Region eu -Detailed
```

**Provides:**
- Code metrics and technical debt analysis
- Cost estimates (development, maintenance, cloud)
- Git history insights (commits, contributors, churn)
- Export formats: Markdown, JSON, CSV, HTML
- 1/3/5 year maintenance projections

---

### Coverage Automation
**Fully automatic coverage tracking** (zero manual work):

- **Status:** ✅ Fully automated
- **Config:** `config/coverage.config.json` (single source of truth)
- **CI/CD:** Auto-updates after every test run
- **Docs:** Automatically synchronized across all files
- **See:** `/tools/scripts/coverage/README.md` for details

**Current Coverage (January 2026):**
- Frontend: 11.61% (passing 10% threshold ✅)
- Backend: 51.09% (passing 20% threshold ✅)
- Overall: 31.35% (passing 20% threshold ✅)
- **Total: 6,368 tests (4,588 frontend + 1,780 backend)**

---

## 📞 Questions & Support

### If you're unsure where to place a file:

1. **Check this guide first** - Review the placement guidelines above
2. **Look at similar existing files** - Find comparable files for reference
3. **Follow the patterns** - Use established directory conventions:
   - Apps → `apps/[app-name]/`
   - Docs → `docs/[category]/`
   - Tools → `tools/` (root level)
   - Infrastructure → `infra/[category]/`
4. **Update documentation** - If creating a new category, document it here

### Getting Help

- **Development workflow:** `docs/guides/workflow.md`
- **Pull requests:** `docs/guides/PULL_REQUEST_COMPLETE_GUIDE.md`
- **Testing:** `docs/guides/testing/TESTING_GUIDE.md`
- **Quick start:** `docs/quick-start.md`
- **Documentation index:** `docs/README.md`

---

## 📈 Structure Evolution

### Major Milestones

**October 8, 2025** - Initial structure documentation
- Documented pre-monorepo structure
- Established organizational patterns

**October 25, 2025** - Monorepo migration
- Moved `backend/` → `apps/backend/`
- Moved `frontend/` → `apps/frontend/`
- Created `apps/` for future applications

**October 27, 2025** - Documentation restructure
- Reorganized `docs/guides/` with category subfolders
- Created testing/, quality/, infrastructure/, architecture/
- Updated all cross-references
- **Complete rewrite of this document** to reflect monorepo structure

---

**Remember:** A well-organized repository is easier to maintain, understand, and scale! 🎯

**Structure Health:** 98% ✅
**Organization Level:** Professional Monorepo
**Maintenance Status:** Excellent
**Coverage Tracking:** Fully Automated

---

**Last Updated:** October 27, 2025
**Part of:** Documentation Restructure Initiative
**Major Changes:**
- Complete rewrite for monorepo structure
- Updated all paths (apps/, tools/, infra/)
- Added comprehensive reference tables
- Documented automation tools
- Added structure evolution timeline
