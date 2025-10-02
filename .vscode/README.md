# VS Code Workspace Configuration

This directory contains VS Code workspace settings, configurations, and tools to enhance your development experience for the Lokifi project.

## 📁 Files Overview

### `settings.json`
Workspace-specific settings that configure:
- **Python**: Interpreter paths, formatting (Black), import sorting (isort), linting (Ruff), testing (pytest)
- **TypeScript/JavaScript**: ESLint, Prettier formatting, import management
- **Editor**: Auto-format on save, code actions, rulers, bracket pair colorization
- **Extensions**: Tailwind CSS, spell checker, error lens, and more
- **File Exclusions**: Hides cache directories and build artifacts from search

### `extensions.json`
Recommended VS Code extensions for the project:
- **Python Development**: Python, Pylance, Black, isort, Ruff
- **Frontend Development**: ESLint, Prettier, Tailwind CSS, React snippets
- **Database**: SQLTools, Database Client, SQLite Viewer
- **Git**: GitLens, Git Graph, GitHub Pull Requests
- **API Testing**: REST Client, Thunder Client
- **Productivity**: Error Lens, Todo Tree, Path Intellisense, Bookmarks
- **AI**: GitHub Copilot

### `launch.json`
Debug configurations for:
- **🚀 Backend: FastAPI (Debug)** - Run FastAPI with debugging and auto-reload
- **🚀 Backend: FastAPI (Production Mode)** - Run FastAPI without reload
- **🐍 Python: Current File** - Debug currently open Python file
- **🧪 Python: Pytest (Current File)** - Run tests in current file
- **🧪 Python: Pytest (All Tests)** - Run all tests with coverage
- **🗄️ Database: Alembic Migrate** - Run database migrations
- **🔍 Debug: Attach to Python Process** - Attach debugger to running process

### `tasks.json`
Quick tasks accessible via `Ctrl+Shift+P` > "Tasks: Run Task":

#### Backend Tasks
- **🚀 Start Backend Server** - Run uvicorn with auto-reload
- **🧪 Run Backend Tests** - Execute pytest tests
- **🧪 Run Backend Tests with Coverage** - Tests with HTML coverage report
- **🔍 Lint Backend (Ruff)** - Check and fix code issues
- **✨ Format Backend (Black)** - Format Python code
- **🗄️ Database: Create Migration** - Create Alembic migration
- **🗄️ Database: Run Migrations** - Apply pending migrations
- **🗄️ Database: Rollback Migration** - Revert last migration

#### Frontend Tasks
- **⚛️ Start Frontend Dev Server** - Run Next.js dev server
- **⚛️ Build Frontend** - Production build
- **🔍 Lint Frontend (ESLint)** - Check JavaScript/TypeScript
- **✨ Format Frontend (Prettier)** - Format frontend code
- **🧪 Run Frontend Tests** - Execute Jest/Vitest tests

#### Full Stack Tasks
- **🚀 Start Full Stack** - Start both backend and frontend
- **🧹 Clean All** - Remove cache and build directories
- **📦 Install All Dependencies** - Install backend + frontend deps

#### Docker Tasks
- **🐳 Docker: Build All** - Build Docker containers
- **🐳 Docker: Start All Services** - Start docker-compose services
- **🐳 Docker: Stop All Services** - Stop all containers
- **🐳 Docker: View Logs** - Tail container logs

### `copilot-settings.json`
GitHub Copilot configuration:
- Code generation instructions
- Execute code enabled
- Terminal execution enabled

## 🚀 Quick Start

### Starting Development

1. **Open integrated terminal** (`Ctrl+`` ` or View > Terminal)

2. **Run a task** (`Ctrl+Shift+P` > "Tasks: Run Task"):
   - Select "🚀 Start Full Stack" to run both servers
   - Or run "🚀 Start Backend Server" and "⚛️ Start Frontend Dev Server" separately

3. **Start debugging** (`F5`):
   - Select "🚀 Backend: FastAPI (Debug)" from the debug dropdown
   - Set breakpoints in Python files
   - Debug requests in real-time

### Running Tests

**Via Tasks Menu** (`Ctrl+Shift+P` > "Tasks: Run Task"):
- "🧪 Run Backend Tests"
- "🧪 Run Backend Tests with Coverage"
- "🧪 Run Frontend Tests"

**Via Debug Panel** (`F5`):
- Select "🧪 Python: Pytest (Current File)" to debug a test file
- Select "🧪 Python: Pytest (All Tests)" to run full test suite

**Via Test Explorer**:
- Click the beaker icon in the sidebar
- Run/debug individual tests or test suites

### Code Quality

**Auto-formatting**:
- Python files format on save (Black + isort)
- TypeScript/JavaScript files format on save (Prettier)
- ESLint fixes apply on save

**Manual formatting via Tasks**:
- "✨ Format Backend (Black)"
- "✨ Format Frontend (Prettier)"
- "🔍 Lint Backend (Ruff)"
- "🔍 Lint Frontend (ESLint)"

### Database Management

**Via Tasks**:
- "🗄️ Database: Create Migration" - Generate migration from model changes
- "🗄️ Database: Run Migrations" - Apply migrations to database
- "🗄️ Database: Rollback Migration" - Undo last migration

**Via Debug Launcher**:
- Select "🗄️ Database: Alembic Migrate" to debug migration issues

## 🔧 Extension Installation

When you open this workspace for the first time, VS Code will prompt you to install recommended extensions. Click "Install All" to get the full development environment.

**Manually install**:
1. `Ctrl+Shift+X` to open Extensions
2. Search for extensions from `extensions.json`
3. Click Install

## 🎯 Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `F5` | Start Debugging |
| `Ctrl+Shift+B` | Run Build Task |
| `Ctrl+Shift+P` | Command Palette |
| `Ctrl+`` ` | Toggle Terminal |
| `Ctrl+Shift+E` | Explorer |
| `Ctrl+Shift+F` | Search |
| `Ctrl+Shift+G` | Source Control |
| `Ctrl+Shift+D` | Debug Panel |
| `Ctrl+Shift+X` | Extensions |
| `Ctrl+K Ctrl+T` | Change Theme |
| `Alt+Shift+F` | Format Document |
| `Ctrl+.` | Quick Fix |

## 📝 Python Environment Setup

The workspace is configured to use a virtual environment at `backend/.venv/`.

**Create virtual environment** (if not exists):
```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

VS Code will automatically:
- Detect the virtual environment
- Activate it in new terminals
- Use it for debugging and testing
- Show it in the status bar (bottom-left)

## 🎨 Customization

### Changing Python Interpreter

1. `Ctrl+Shift+P` > "Python: Select Interpreter"
2. Choose from detected environments
3. Or "Enter interpreter path..." for custom location

### Adding Custom Tasks

Edit `.vscode/tasks.json`:
```json
{
  "label": "My Custom Task",
  "type": "shell",
  "command": "your-command-here",
  "problemMatcher": []
}
```

### Adding Debug Configurations

Edit `.vscode/launch.json`:
```json
{
  "name": "My Debug Config",
  "type": "debugpy",
  "request": "launch",
  "program": "${file}",
  "console": "integratedTerminal"
}
```

## 🐛 Troubleshooting

### Python Interpreter Not Found
- Ensure virtual environment exists: `backend/.venv/`
- Reload window: `Ctrl+Shift+P` > "Developer: Reload Window"
- Select interpreter manually: `Ctrl+Shift+P` > "Python: Select Interpreter"

### ESLint Not Working
- Ensure you're in the `frontend` directory when running
- Run `npm install` in frontend directory
- Check "eslint.workingDirectories" in settings.json

### Prettier Not Formatting
- Check default formatter: Right-click > "Format Document With..." > "Prettier"
- Verify Prettier extension is installed
- Check for `.prettierrc.json` in frontend directory

### Tests Not Discovered
- Ensure pytest is installed: `pip install pytest`
- Check test file patterns in settings.json
- Reload tests: Click refresh icon in Test Explorer

### Debugger Not Stopping at Breakpoints
- Ensure "justMyCode" is set to `false` in launch.json
- Check that the debugger is attached (green status bar)
- Verify code is being executed (not skipped by conditions)

## 📚 Additional Resources

- [VS Code Python](https://code.visualstudio.com/docs/python/python-tutorial)
- [VS Code Debugging](https://code.visualstudio.com/docs/editor/debugging)
- [VS Code Tasks](https://code.visualstudio.com/docs/editor/tasks)
- [GitHub Copilot](https://docs.github.com/en/copilot)
- [FastAPI Debugging](https://fastapi.tiangolo.com/tutorial/debugging/)

## 🤝 Contributing

When modifying VS Code configurations:
1. Test changes locally first
2. Document any new settings or tasks
3. Update this README if adding major features
4. Commit changes to `.vscode/` directory

---

**Happy Coding! 🚀**
