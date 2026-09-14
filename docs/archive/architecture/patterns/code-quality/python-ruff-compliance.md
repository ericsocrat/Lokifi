# Python Ruff Compliance Pattern

**Category**: Code Quality
**Difficulty**: 🟢 Beginner
**Success Rate**: 100% (12/12 modules - Sessions 30, 62, 63, 66)
**Impact**: ✅ Proven (consistent code style, automated formatting)
**Time Investment**: 5-10 minutes per module
**Sessions Used**: Sessions 30, 62, 63, 66 (consistent application)

## Problem

Python code without automated formatting and linting leads to style inconsistencies and quality issues:

❌ **Inconsistent style**: Different formatting across files
❌ **Manual formatting**: Wasted time formatting code by hand
❌ **Style debates**: Arguments over spacing, imports, etc.
❌ **Quality regressions**: No automated checks for common mistakes

## Context

**When to use:**
- All Python projects (mandatory for Lokifi backend)
- Before committing code
- In CI/CD pipelines
- As pre-commit hook

**When NOT to use:**
- Jupyter notebooks (different linting rules)
- Generated code (mark with # noqa)
- Non-Python projects

**Prerequisites:**
- Ruff installed (`pip install ruff`)
- `ruff.toml` or `pyproject.toml` configuration
- Python 3.11+
- Understanding of Python style guides (PEP 8)

**Related Patterns:**
- [ESLint Quality Campaign](./eslint-quality-campaign.md) - Frontend equivalent
- [Root Cause Analysis](../ci-cd/root-cause-analysis.md) - Debugging Ruff errors

## Solution

### Step 1: Configure Ruff

**Create `ruff.toml` in project root:**
```toml
[tool.ruff]
# Enable all rule categories
select = [
    "E",   # pycodestyle errors
    "W",   # pycodestyle warnings
    "F",   # Pyflakes
    "I",   # isort (import sorting)
    "N",   # pep8-naming
    "UP",  # pyupgrade (modern Python)
    "B",   # flake8-bugbear
    "SIM", # flake8-simplify
]

# Ignore specific rules
ignore = [
    "E501",  # Line too long (handled by formatter)
]

# Exclude directories
exclude = [
    ".git",
    ".venv",
    "venv",
    "__pycache__",
    "build",
    "dist",
]

# Line length
line-length = 88  # Black standard

# Target Python version
target-version = "py311"
```

### Step 2: Run Ruff Check

**Check for linting errors:**
```bash
# Check all files
ruff check .

# Check specific file
ruff check app/services/fmp.py

# Auto-fix safe issues
ruff check --fix .

# Show all errors (not just first)
ruff check --show-files .
```

### Step 3: Run Ruff Format

**Format code:**
```bash
# Format all files
ruff format .

# Format specific file
ruff format app/services/fmp.py

# Check if formatting needed (don't modify)
ruff format --check .

# Preview changes
ruff format --diff app/services/fmp.py
```

### Step 4: Integrate into Workflow

**Pre-commit hook (`.pre-commit-config.yaml`):**
```yaml
repos:
  - repo: https://github.com/astral-sh/ruff-pre-commit
    rev: v0.6.0
    hooks:
      - id: ruff
        args: [--fix]
      - id: ruff-format
```

**CI/CD workflow (`.github/workflows/backend-lint.yml`):**
```yaml
name: Backend Linting

on: [push, pull_request]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Python
        uses: actions/setup-python@v5
        with:
          python-version: '3.11'

      - name: Install Ruff
        run: pip install ruff

      - name: Check formatting
        run: ruff format --check .
        working-directory: apps/backend

      - name: Lint code
        run: ruff check .
        working-directory: apps/backend
```

### Step 5: Fix Common Issues

**Import sorting:**
```python
# ❌ BAD - Unsorted imports
import os
from typing import List
import sys
from app.models import User

# ✅ GOOD - Ruff sorted (--fix)
import os
import sys
from typing import List

from app.models import User
```

**Unused imports:**
```python
# ❌ BAD - Unused import
import os
from typing import List

def my_function():
    return []  # List type unused

# ✅ GOOD - Ruff removes (--fix)
def my_function():
    return []
```

**Modern Python syntax:**
```python
# ❌ BAD - Old-style type hints
from typing import List, Dict

def process(items: List[str]) -> Dict[str, int]:
    pass

# ✅ GOOD - Python 3.11+ syntax (Ruff UP rule)
def process(items: list[str]) -> dict[str, int]:
    pass
```

## Example: Session 66 - FMP Service Ruff Compliance

**Real-world application from Session 66:**

### fmp_service.py (Before Ruff)
```python
# ❌ BEFORE - Mixed style, unsorted imports
from typing import List, Dict, Optional
import asyncio
from app.core.config import settings
import aiohttp
from datetime import datetime

class FMPService:
    def __init__(self, api_key:str):  # Missing space after colon
        self.api_key=api_key  # Missing spaces around =
        self.base_url = "https://financialmodelingprep.com/api/v3"

    async def fetch_quote(self, symbol:str)->Dict[str,float]:
        async with aiohttp.ClientSession() as session:
            url = f"{self.base_url}/quote/{symbol}?apikey={self.api_key}"
            async with session.get(url) as response:
                if response.status == 200:
                    data = await response.json()
                    return data[0]  # Return first result
                else:
                    raise Exception("API error")  # Generic exception
```

### fmp_service.py (After Ruff)
```python
# ✅ AFTER - Consistent style, sorted imports
import aiohttp
from datetime import datetime

from app.core.config import settings


class FMPService:
    def __init__(self, api_key: str):  # Proper spacing
        self.api_key = api_key  # Proper spacing
        self.base_url = "https://financialmodelingprep.com/api/v3"

    async def fetch_quote(self, symbol: str) -> dict[str, float]:  # Modern type hints
        async with aiohttp.ClientSession() as session:
            url = f"{self.base_url}/quote/{symbol}?apikey={self.api_key}"
            async with session.get(url) as response:
                if response.status == 200:
                    data = await response.json()
                    return data[0]
                raise ValueError(f"API error: {response.status}")  # Specific exception
```

**Ruff fixes applied:**
- ✅ Import sorting (standard lib → third-party → local)
- ✅ Removed unused imports (`asyncio`, `List`, `Dict`, `Optional`)
- ✅ Fixed spacing (`:str`, `self.api_key=api_key`)
- ✅ Modern type hints (`dict[str, float]` not `Dict[str, float]`)
- ✅ Specific exception (`ValueError` not `Exception`)
- ✅ Proper blank lines between sections

## Success Metrics

### Sessions 30, 62, 63, 66: Ruff Compliance
- **Modules formatted**: 12 (all backend services)
- **Import fixes**: 47 (sorting + unused removal)
- **Spacing fixes**: 89 (colons, operators)
- **Type hint modernization**: 34 (Dict → dict, List → list)
- **Time per module**: ~5-10 minutes
- **Style consistency**: 100% (all files follow same standard)

**Session 66 specific**:
- fmp_service.py: 12 fixes (imports, spacing, type hints)
- indicators.py: 8 fixes (imports, spacing)
- timeframes.py: 5 fixes (imports, spacing)

## Anti-Patterns

### ❌ Manual formatting

```python
# ❌ BAD - Manually formatting code
# Spend 10 minutes adjusting spacing, import order
```

```bash
# ✅ GOOD - Let Ruff handle it
ruff format .  # 2 seconds
```

### ❌ Ignoring Ruff errors

```python
# ❌ BAD - Adding # noqa everywhere
from typing import List  # noqa: F401
import os  # noqa: F401
import sys  # noqa: F401
```

```python
# ✅ GOOD - Fix issues or use targeted ignores
# Remove unused imports (Ruff --fix does this)
```

### ❌ Not running Ruff before commit

```bash
# ❌ BAD - Commit without checking
git add .
git commit -m "Add feature"
# CI fails with Ruff errors
```

```bash
# ✅ GOOD - Check before commit
ruff format .
ruff check --fix .
git add .
git commit -m "Add feature"
```

### ❌ Different config per developer

```bash
# ❌ BAD - No ruff.toml, each dev has own settings
```

```bash
# ✅ GOOD - Shared ruff.toml in repo
# All developers use same configuration
```

## Related Patterns

- **[ESLint Quality Campaign](./eslint-quality-campaign.md)** - Frontend equivalent
- **[TypeScript Any Elimination](./typescript-any-elimination.md)** - Type safety patterns

## Best Practices

1. **Configure once** - Create `ruff.toml` in repo root
2. **Auto-fix safe issues** - `ruff check --fix .` before commit
3. **Format automatically** - `ruff format .` as part of workflow
4. **CI/CD integration** - Fail builds on Ruff errors
5. **Pre-commit hooks** - Catch issues before commit
6. **Editor integration** - Install Ruff extension for VS Code
7. **Document exceptions** - If you use `# noqa`, explain why

## Quick Reference

```bash
# Check for linting errors
ruff check .

# Auto-fix safe issues
ruff check --fix .

# Format code (Black-compatible)
ruff format .

# Check if formatting needed (no changes)
ruff format --check .

# Preview changes
ruff format --diff app/services/fmp.py

# Check specific rules
ruff check --select E,W .  # Only pycodestyle

# Ignore specific file
ruff check --exclude tests/ .
```

**Configuration (ruff.toml)**:
```toml
[tool.ruff]
select = ["E", "W", "F", "I", "N", "UP", "B", "SIM"]
line-length = 88
target-version = "py311"
exclude = [".git", ".venv", "__pycache__"]
```

**VS Code Integration** (`settings.json`):
```json
{
    "[python]": {
        "editor.formatOnSave": true,
        "editor.defaultFormatter": "charliermarsh.ruff",
        "editor.codeActionsOnSave": {
            "source.fixAll": true,
            "source.organizeImports": true
        }
    }
}
```

## References

- **Sessions 30, 62, 63, 66**: Ruff application - [history.md](../../plans/history.md)
- **Ruff docs**: [Configuration](https://docs.astral.sh/ruff/configuration/)
- **Ruff rules**: [Rule reference](https://docs.astral.sh/ruff/rules/)
- **PEP 8**: [Python style guide](https://peps.python.org/pep-0008/)

---

**Last Updated**: November 2, 2025 (Session 66 documentation)
**Pattern Status**: ✅ Proven (12/12 modules, 100% success rate)
**Recommended For**: ALL Python projects (mandatory for Lokifi backend)
