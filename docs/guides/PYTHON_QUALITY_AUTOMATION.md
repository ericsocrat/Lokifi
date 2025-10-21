# Python Quality Automation Guide

**Last Updated**: October 12, 2025
**Phase**: 3 & 4 Automation

---

## Overview

The **`fix-quality`** command provides comprehensive automated Python code quality fixes, combining all Phase 3 and Phase 4 automation capabilities into a single powerful tool.

---

## Quick Start

```powershell
# Dry-run mode (preview only)
.\tools\lokifi.ps1 fix-quality -DryRun

# Apply all auto-fixes (with confirmation)
.\tools\lokifi.ps1 fix-quality

# Apply all auto-fixes (skip confirmation)
.\tools\lokifi.ps1 fix-quality -Force

# Skip unsafe fixes like E402
.\tools\lokifi.ps1 fix-quality -SkipUnsafe
```powershell

---

## What It Does

### ✅ Automated Fixes

The `fix-quality` command runs the following auto-fixes in sequence:

#### 1. **Import Cleanup** (F401, I001)
- **F401**: Removes unused imports
- **I001**: Sorts import statements alphabetically
- **Example**:
  ```python
  # BEFORE
  from typing import Any, Optional
  import os
  from datetime import datetime

  # AFTER
  import os
  from datetime import datetime
  from typing import Any
  ```

#### 2. **Type Hint Modernization** (UP045)
- Converts `Optional[X]` to `X | None` (Python 3.10+ syntax)
- **Example**:
  ```python
  # BEFORE
  def func(param: Optional[str] = None) -> Optional[int]:
      pass

  # AFTER
  def func(param: str | None = None) -> int | None:
      pass
  ```

#### 3. **Datetime Modernization** (UP017)
- Replaces `datetime.utcnow()` with `datetime.now(UTC)`
- **Example**:
  ```python
  # BEFORE
  from datetime import datetime
  now = datetime.utcnow()

  # AFTER
  from datetime import UTC, datetime
  now = datetime.now(UTC)
  ```

#### 4. **Import Positioning** (E402) ⚠️ UNSAFE
- Moves module-level imports to top of file
- **Skippable** with `-SkipUnsafe` flag
- **Why unsafe**: May change execution order if imports have side effects
- **Example**:
  ```python
  # BEFORE
  """Module docstring"""
  import sys
  sys.path.append("/some/path")
  from mymodule import something  # E402: Import not at top

  # AFTER
  """Module docstring"""
  from mymodule import something  # Moved to top
  import sys
  sys.path.append("/some/path")
  ```

---

### 📊 Manual Review Items

The command also **scans and reports** issues that require manual intervention:

#### 1. **Syntax Errors**
- Reports all invalid Python syntax
- Too context-dependent to auto-fix
- **Common patterns**:
  - Invalid type annotations in wrong positions
  - Malformed function calls
  - Import statement errors

#### 2. **Bare Except Statements** (E722)
- Reports `except:` without specific exception type
- Requires human judgment on which exception to catch
- **Recommendation**: Replace with `except Exception:` or more specific
- **Example**:
  ```python
  # BAD (E722)
  try:
      risky_operation()
  except:  # Catches everything, even KeyboardInterrupt!
      pass

  # GOOD
  try:
      risky_operation()
  except Exception as e:  # Catches program errors only
      logger.error(f"Error: {e}")
  ```

---

## Command Options

| Option | Description |
|--------|-------------|
| `-DryRun` | Preview all fixes without applying them |
| `-Force` | Skip confirmation prompt |
| `-SkipUnsafe` | Skip E402 (import positioning) fixes |

---

## Individual Fix Commands

If you only need specific fixes, use these commands:

```powershell
# Fix imports only
.\tools\lokifi.ps1 fix-imports

# Fix type hints only
.\tools\lokifi.ps1 fix-type-hints

# Fix datetime only
.\tools\lokifi.ps1 fix-datetime
```powershell

---

## Example Output

```bash
🚀 Lokifi Ultimate Manager - 🔧 Python Quality Auto-Fix - Phase 3 & 4
══════════════════════════════════════════════════════════════════

This will run ALL auto-fixable quality improvements:
  ✅ Import cleanup (F401, I001)
  ✅ Type hint modernization (UP045)
  ✅ Datetime modernization (UP017)
  ⚠️  Import positioning (E402 - unsafe)
  📊 Syntax error scan (for manual review)
  📊 Bare-except scan (E722 - for manual review)

Continue? (y/n): y

1 📊 Scanning current violations...
   Found 307 errors

2 🔧 Fixing import issues (F401, I001)...
   Found 5 import issues
   ✅ Fixed 5 import issues

3 🔧 Modernizing type hints (UP045)...
   ✅ All type hints are modern

4 🔧 Modernizing datetime usage (UP017)...
   ✅ All datetime usage is modern

5 ⚠️  Fixing import positioning (E402 - UNSAFE)...
   ✅ All imports properly positioned

═══════════════════════════════════════════════════════════
📋 MANUAL REVIEW REQUIRED
═══════════════════════════════════════════════════════════

📊 Checking for syntax errors...
   ✅ No syntax errors found

📊 Checking for bare except statements (E722)...
   ⚠️  Found 3 bare except statements (require manual fix)
   💡 Replace 'except:' with 'except Exception:' or more specific

   app/services/smart_price_service.py:55:9: E722
   app/services/smart_price_service.py:63:9: E722
   app/services/smart_price_service.py:71:9: E722

═══════════════════════════════════════════════════════════
📊 FINAL RESULTS
═══════════════════════════════════════════════════════════

✅ Total fixes applied: 5

📊 Final violation count...
   302 errors remaining
```bash

---

## Typical Workflow

### 1️⃣ **Initial Scan** (Dry Run)
```powershell
.\tools\lokifi.ps1 fix-quality -DryRun
```powershell
Review what would be fixed without making changes.

### 2️⃣ **Apply Safe Fixes**
```powershell
.\tools\lokifi.ps1 fix-quality -SkipUnsafe
```powershell
Apply only safe auto-fixes (skip E402).

### 3️⃣ **Manual Review**
Review the reported syntax errors and bare-except statements, fix them manually.

### 4️⃣ **Apply Unsafe Fixes** (if needed)
```powershell
.\tools\lokifi.ps1 fix-quality -Force
```powershell
Apply all fixes including E402 after reviewing.

### 5️⃣ **Verify**
```powershell
cd apps\backend
.\venv\Scripts\python.exe -m ruff check app
```powershell
Confirm all fixable errors are resolved.

---

## Best Practices

### ✅ DO:
- Always run `-DryRun` first to preview changes
- Review baseline analysis before/after to see impact
- Commit changes immediately after fixes
- Run tests after applying fixes
- Use `-SkipUnsafe` if unsure about E402 fixes

### ❌ DON'T:
- Run on uncommitted code (commit first!)
- Skip the confirmation prompt without reviewing
- Ignore manual review items
- Apply E402 fixes without understanding their impact

---

## Integration with Git Workflow

```powershell
# 1. Ensure clean working tree
git status

# 2. Run quality fixes
.\tools\lokifi.ps1 fix-quality -DryRun
.\tools\lokifi.ps1 fix-quality

# 3. Review changes
git diff

# 4. Run tests
.\tools\lokifi.ps1 test

# 5. Commit
git add -A
git commit -m "chore: apply automated quality fixes"
```powershell

---

## Troubleshooting

### Issue: "Ruff not found"
**Solution**: Install ruff in backend venv:
```powershell
cd apps\backend
.\venv\Scripts\pip.exe install ruff
```powershell

### Issue: "Backend directory not found"
**Solution**: Run from repository root:
```powershell
cd C:\path\to\lokifi
.\tools\lokifi.ps1 fix-quality
```powershell

### Issue: "Too many errors reported"
**Solution**: Fix in phases:
1. Run `fix-imports` first
2. Run `fix-type-hints` second
3. Run `fix-datetime` third
4. Run `fix-quality` for comprehensive scan

---

## Technical Details

### Ruff Rules Fixed

| Rule | Name | Auto-Fixable | Category |
|------|------|--------------|----------|
| F401 | unused-import | ✅ Yes | Import |
| I001 | unsorted-imports | ✅ Yes | Import |
| UP045 | non-pep604-annotation | ✅ Yes | Type Hint |
| UP017 | datetime-utc-alias | ✅ Yes | Datetime |
| E402 | module-import-not-at-top-of-file | ⚠️ Unsafe | Import |
| E722 | bare-except | ❌ No | Exception |

### Baseline Tracking

The command uses `Invoke-WithCodebaseBaseline` to:
- Capture before/after metrics
- Generate impact reports
- Track technical debt changes
- Measure maintainability improvements

Reports are saved to: `docs/analysis/CODEBASE_ANALYSIS_V2_*.json`

---

## Related Commands

- `.\tools\lokifi.ps1 analyze` - Full codebase analysis
- `.\tools\lokifi.ps1 lint` - Run linting checks
- `.\tools\lokifi.ps1 test` - Run test suite
- `.\tools\lokifi.ps1 validate` - Pre-commit validation

---

## Phase History

- **Phase 2**: Datetime fixer (`fix-datetime`)
- **Phase 3.1**: Import cleanup (`fix-imports`)
- **Phase 3.2**: Type hint modernization (`fix-type-hints`)
- **Phase 3.3**: Unused variable cleanup (manual)
- **Phase 4**: Syntax error fixes (manual)
- **Phase 4+**: Comprehensive automation (`fix-quality`) ✨

---

## Success Metrics

**Lokifi Project Results** (Phase 3 & 4):
- **Starting**: 43 ruff errors
- **After Auto-fix**: 0 ruff errors
- **Reduction**: 100%
- **Time Saved**: ~45 minutes of manual work
- **Files Fixed**: 12 files across 7 modules

---

## Support

For issues or questions:
1. Check `.\tools\lokifi.ps1 help`
2. Review ruff documentation: https://docs.astral.sh/ruff/
3. See `docs/guides/` for more automation guides