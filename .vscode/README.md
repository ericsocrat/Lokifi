# VS Code Workspace Configuration

> **Last Updated:** October 19, 2025
> **Status:** ✅ Optimized & Clean

This folder contains essential VS Code workspace settings, tasks, and configurations for the Lokifi project.

## 🚀 Quick Start

1. **Open workspace** → VS Code will auto-install recommended extensions
2. **Using Copilot?** → Check [`COPILOT_QUICK_REFERENCE.md`](COPILOT_QUICK_REFERENCE.md) 📌
3. **Run tasks** → Use Ctrl+Shift+P → "Tasks: Run Task"

## 📁 Essential Files

### Core Configuration
- **`settings.json`** - Workspace settings (performance optimized)
- **`tasks.json`** - Build and run tasks for frontend/backend
- **`launch.json`** - Debug configurations
- **`extensions.json`** - Recommended VS Code extensions
- **`keybindings.json`** - Custom keyboard shortcuts
- **`copilot-settings.json`** - GitHub Copilot configuration

### Documentation & Scripts
- **`COPILOT_QUICK_REFERENCE.md`** - 📌 **Pin this!** Quick shortcuts & tips
- **`cleanup-extensions.ps1`** - Extension cleanup utility
- **`monitor-vscode.ps1`** - Performance monitoring utility
- **`snippets/`** - Code snippets for TypeScript, Python, etc.

## 🎯 Key Features

### Performance Optimized ⚡
- ✅ Fast file watching with smart exclusions
- ✅ Optimized TypeScript server (4GB memory)
- ✅ Efficient search with excluded directories
- ✅ Minimal extension overhead

### Testing Integrated 🧪
- ✅ Vitest for frontend testing
- ✅ Playwright for E2E tests
- ✅ Coverage gutters for visual feedback
- ✅ Console Ninja for runtime debugging

### 3. AI-Enhanced Development 🤖
- ✅ GitHub Copilot optimized for project patterns
- ✅ Enhanced code suggestions (500 tokens)
- ✅ Smart stop sequences for clean code
- ✅ Context-aware completions
- ✅ Security-focused exclusions

### Code Quality Tools 📐
- ✅ ESLint with auto-fix on save
- ✅ Prettier for consistent formatting
- ✅ Error Lens for inline errors
- ✅ Import Cost for bundle awareness
- ✅ Todo Tree for task tracking

## ⚙️ Settings Overview

### Editor
- Auto-save on focus change
- Format on save (Prettier)
- Auto-fix ESLint issues
- Organize imports automatically

### TypeScript
- Strict type checking
- Auto-import suggestions
- Function call completions
- 4GB memory for TS server

### Python
- Black formatter (100 char line length)
- isort for imports
- Pylance language server
- pytest integration

### Git
- Auto-fetch every 3 minutes
- Smart commit enabled
- Auto-push after commit
- GitLens for enhanced features

## 🔧 Tasks Available

Run tasks with `Ctrl/Cmd + Shift + P` → "Run Task"

### Redis
- 🔴 **Start Redis Server (Docker)** - Start/create Redis container

### Backend
- 🔧 **Start Backend Server** - FastAPI with hot reload

### Frontend
- 🎨 **Start Frontend Server** - Next.js development server

### All Servers
- 🚀 **Start All Servers** - Redis → Backend → Frontend (sequential)

## 📊 Extensions Installed

### Essential
- GitHub Copilot & Chat
- ESLint
- Prettier
- GitLens

### Testing
- Vitest Explorer
- Playwright
- Coverage Gutters
- Console Ninja

### Developer Experience
- Import Cost
- Error Lens
- TODO Tree
- Path Intellisense

### Language Support
- TypeScript/JavaScript
- Python (Pylance, Black, isort)
- Tailwind CSS IntelliSense
- Docker

## 🎓 Best Practices

### Using Copilot
1. Keep relevant files open for context
2. Write clear comments before code
3. Use descriptive function names
4. Review suggestions before accepting
5. Use inline chat (`Ctrl/Cmd + I`) for refactoring

### Testing Workflow
1. Write tests alongside code
2. Run tests frequently (`npm test`)
3. Check coverage with Coverage Gutters
4. Aim for 80%+ coverage

### Code Quality
1. Fix ESLint errors immediately
2. Organize imports before committing
3. Keep functions small and focused
4. Add types for better IntelliSense

## 🔒 Security

### Protected Files (not in Copilot context)
- Environment variables (`.env*`)
- Secrets and credentials
- User data (`.lokifi-*`)
- Build artifacts
- Lock files

See [`.copilotignore`](../.copilotignore) for complete list.

## 📚 Learn More

### Copilot
- [Quick Reference](COPILOT_QUICK_REFERENCE.md) - Start here!
- [Full Guide](COPILOT_GUIDE.md) - Comprehensive documentation
- [Optimization Summary](COPILOT_OPTIMIZATION_SUMMARY.md) - Enhancement details

### Testing
- [Testing Guide](TESTING_GUIDE.md) - Complete testing workflow
- [Vitest Docs](https://vitest.dev) - Frontend testing framework
- [Playwright Docs](https://playwright.dev) - E2E testing

### Project
- [Main README](../README.md) - Project overview
- [Documentation](../docs/START_HERE.md) - Full documentation index
- [Coding Standards](../docs/CODING_STANDARDS.md) - Code style guide

## 🚀 Pro Tips

1. **Pin frequently used files** for quick access
2. **Use workspace search** (`Ctrl/Cmd + Shift + F`) for project-wide searches
3. **Enable auto-save** to never lose changes
4. **Use tasks** instead of manual commands
5. **Keep Coverage Gutters running** while developing

---

**Need help?** Check the guides above or ask in Copilot Chat!
