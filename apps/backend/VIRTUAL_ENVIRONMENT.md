# Backend Virtual Environment Setup

## Overview
The Lokifi backend uses a Python virtual environment (`venv`) to isolate dependencies and avoid conflicts with global packages.

## Location
```
apps/backend/venv/
```

## Setup Instructions

### Initial Setup
```bash
cd apps/backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows (PowerShell):
.\venv\Scripts\Activate.ps1

# Windows (Command Prompt):
.\venv\Scripts\activate.bat

# Linux/Mac:
source venv/bin/activate

# Upgrade pip
python -m pip install --upgrade pip setuptools wheel

# Install dependencies
pip install -r requirements.txt
```

### Using the Virtual Environment

**Activate:**
```bash
# Windows PowerShell
cd apps/backend
.\venv\Scripts\Activate.ps1

# You'll see (venv) in your prompt
```

**Install new packages:**
```bash
# Always activate venv first!
pip install package-name

# Add to requirements.txt:
pip freeze | Select-String "package-name" >> requirements.txt
```

**Deactivate:**
```bash
deactivate
```

## Dependencies Structure

### `requirements.txt`
Main dependencies for production and development:
- FastAPI and web server
- Database (SQLAlchemy, PostgreSQL, Redis)
- Authentication & Security
- Email and background tasks
- Testing framework (pytest)
- **API Contract Testing** (schemathesis, openapi-core) - Phase 1.6 Task 2
- Code quality (ruff, black, mypy)
- Error tracking (Sentry)

### `requirements-dev.txt`
Additional development/testing dependencies:
- Duplicates key testing tools for clarity
- Useful for CI/CD environments that only need testing tools

## Installed Dependencies (Phase 1.6 Task 2)

Added for API contract testing:
```
schemathesis==4.3.3
openapi-core==0.19.5
openapi-spec-validator==0.7.2
```

These packages enable:
- Property-based API testing
- OpenAPI 3.0 schema validation
- Automatic endpoint testing from schema

## CI/CD Integration

### GitHub Actions
The unified pipeline installs dependencies using:
```yaml
- name: Setup Python
  uses: actions/setup-python@v5
  with:
    python-version: ${{ env.PYTHON_VERSION }}
    cache: "pip"

- name: Install dependencies
  run: |
    python -m pip install --upgrade pip
    pip install -r requirements.txt
```

### Local Development with Tasks
The VS Code tasks (`tasks.json`) automatically:
1. Check if venv exists
2. Create venv if missing
3. Activate venv
4. Install requirements.txt
5. Start backend server

## Troubleshooting

### "Package not found" errors
```bash
# Ensure you're in the virtual environment
cd apps/backend
.\venv\Scripts\Activate.ps1

# Reinstall requirements
pip install -r requirements.txt
```

### "Python not found" or wrong version
```bash
# Check Python version
python --version  # Should be 3.11+

# Recreate venv with correct Python
cd apps/backend
Remove-Item -Recurse -Force venv
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

### Global package conflicts
```bash
# Always use virtual environment, never install globally
# VSCode warning about global packages? Click "Create" to make venv
```

### Import errors in tests
```bash
# Ensure PYTHONPATH includes app directory
cd apps/backend
$env:PYTHONPATH = (Get-Location).Path
pytest tests/
```

## Best Practices

1. **Always activate venv** before installing packages
2. **Never install packages globally** for this project
3. **Update requirements.txt** when adding dependencies
4. **Use pip freeze carefully** - only add specific packages, not all transitive deps
5. **Recreate venv** if you encounter weird import issues
6. **Use the same Python version** as production (3.11+)

## Version Information

- **Python Version:** 3.11+ (3.12 supported)
- **pip Version:** Latest (auto-upgraded on venv creation)
- **Virtual Environment:** venv (Python standard library)

## Related Documentation

- `requirements.txt` - Main dependency list
- `requirements-dev.txt` - Development/testing dependencies
- `.github/workflows/lokifi-unified-pipeline.yml` - CI/CD setup
- `PHASE_1.6_TASK_2_PLAN.md` - API contract testing implementation

---

**Last Updated:** October 15, 2025  
**Phase:** 1.6 Task 2 (API Contract Testing)
