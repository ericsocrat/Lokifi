# 🚀 Welcome to Lokifi

> **Lokifi** is a full-stack financial application built with Next.js, FastAPI, and Redis. This guide will help you get started quickly.

---

## 📋 Quick Links

- **[Quick Start Guide](QUICK_START.md)** - Get up and running in 5 minutes
- **[Developer Workflow](guides/DEVELOPER_WORKFLOW.md)** - Daily development commands and practices
- **[Repository Structure](guides/REPOSITORY_STRUCTURE.md)** - Understand the codebase organization
- **[API Documentation](api/API_DOCUMENTATION.md)** - Backend API reference

---

## 🎯 First Time Setup

### Prerequisites

- **Node.js** 18+ and npm
- **Python** 3.11+
- **Docker Desktop** (for Redis)
- **Git**

### Quick Start

```bash
# 1. Clone the repository
git clone https://github.com/ericsocrat/Lokifi.git
cd Lokifi

# 2. Install frontend dependencies
cd apps/frontend
npm install

# 3. Set up Python backend
cd ../backend
python -m venv venv
.\venv\Scripts\Activate.ps1  # Windows
pip install -r requirements.txt

# 4. Start Redis (Docker)
cd ../..
.\tools\start-redis.ps1  # Or use Docker Compose

# 5. Start all servers
# Backend: cd apps/backend && uvicorn app.main:app --reload
# Frontend: cd apps/frontend && npm run dev
```

For detailed instructions, see **[Quick Start Guide](QUICK_START.md)**.

---

## 📚 Documentation Structure

Our documentation is organized into these categories:

### 🔧 Development Guides (`/guides`)

Essential guides for daily development:

- **[Developer Workflow](guides/DEVELOPER_WORKFLOW.md)** - Commands, practices, and tools
- **[Coding Standards](guides/CODING_STANDARDS.md)** - Code style and best practices
- **[Testing Guide](guides/TESTING_GUIDE.md)** - Unit, integration, and E2E testing
- **[VS Code Setup](guides/VSCODE_SETUP.md)** - Recommended extensions and settings
- **[Integration Tests](guides/INTEGRATION_TESTS_GUIDE.md)** - API contract testing
- **[Pull Request Guide](guides/PULL_REQUEST_GUIDE.md)** - PR workflow and checklist

### 🌐 API Documentation (`/api`)

Backend API reference and examples:

- **[API Documentation](api/API_DOCUMENTATION.md)** - Complete endpoint reference
- **[API Reference](api/API_REFERENCE.md)** - Quick lookup guide

### 🔒 Security & Configuration (`/security`)

Security setup and environment configuration:

- **[Enhanced Security Setup](security/ENHANCED_SECURITY_SETUP.md)** - Security best practices
- **[Environment Configuration](security/ENVIRONMENT_CONFIGURATION.md)** - .env setup

### 📐 Design & Architecture (`/design`)

System design and UI/UX documentation:

- **[Theme Documentation](design/THEME_DOCUMENTATION.md)** - UI theme system
- **[Architecture Diagram](design/ARCHITECTURE_DIAGRAM.md)** - System architecture

### 📋 Plans & Roadmap (`/plans`)

Project planning and consolidation reports:

- **[Consolidation Progress Report](plans/CONSOLIDATION_PROGRESS_REPORT.md)** - Documentation cleanup

### ⚙️ CI/CD & Automation (`/ci-cd`)

Continuous integration and deployment:

- **[CI/CD Quick Start](ci-cd/guides/CI_CD_QUICK_START.md)** - GitHub Actions setup
- **[CI/CD Explained Simple](ci-cd/guides/CI_CD_EXPLAINED_SIMPLE.md)** - Understanding our CI/CD

---

## 🛠️ Common Tasks

### Running Tests

```bash
# Frontend tests
cd apps/frontend
npm test

# Backend tests
cd apps/backend
pytest

# Run specific test file
npm test -- path/to/test.test.ts
pytest tests/test_specific.py
```

### Development Workflow

```bash
# Create feature branch
git checkout -b feature/your-feature

# Make changes and commit
git add .
git commit -m "feat: your feature description"

# Push and create PR
git push origin feature/your-feature
```

### Troubleshooting

- **Redis not connecting?** Check if Docker container is running
- **Frontend build errors?** Try `rm -rf node_modules && npm install`
- **Backend import errors?** Activate virtual environment first
- **Port conflicts?** Check if ports 3000 (frontend), 8000 (backend), 6379 (Redis) are free

---

## 📖 Additional Resources

### Checklists & Quick References

- **[Checklists](CHECKLISTS.md)** - Development task checklists
- **[Quick Reference](QUICK_REFERENCE.md)** - Command quick reference
- **[Pre-Merge Checklist](PRE_MERGE_CHECKLIST.md)** - PR readiness checklist
- **[Navigation Guide](NAVIGATION_GUIDE.md)** - Documentation navigation

### Testing Resources

- **[Testing Index](TESTING_INDEX.md)** - Overview of all testing documentation
- **[Test Quick Reference](TEST_QUICK_REFERENCE.md)** - Common test commands

### Migration & History

- **[Migration Guide: Fynix to Lokifi](MIGRATION_GUIDE_FYNIX_TO_LOKIFI.md)** - Rebranding history

---

## 🤝 Contributing

1. Read the **[Coding Standards](guides/CODING_STANDARDS.md)**
2. Follow the **[Developer Workflow](guides/DEVELOPER_WORKFLOW.md)**
3. Write tests for your changes
4. Submit a PR following the **[Pull Request Guide](guides/PULL_REQUEST_GUIDE.md)**

---

## 💡 Need Help?

- **Documentation Issues?** See [Navigation Guide](NAVIGATION_GUIDE.md)
- **Setup Problems?** Check [Quick Start Guide](QUICK_START.md)
- **Testing Questions?** Read [Testing Guide](guides/TESTING_GUIDE.md)
- **CI/CD Issues?** See [CI/CD Guides](ci-cd/guides/)

---

## 🎉 You're Ready!

Start with the **[Quick Start Guide](QUICK_START.md)** to get your development environment running, then dive into the **[Developer Workflow](guides/DEVELOPER_WORKFLOW.md)** for daily development practices.

**Happy coding!** 🚀
