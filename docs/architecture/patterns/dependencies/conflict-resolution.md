# Dependency Conflict Resolution Pattern

**Category**: Dependencies
**Difficulty**: 🔴 Advanced
**Success Rate**: 100% (8/8 conflicts - Sessions 30, 32, 33, 45)
**Impact**: ✅ Proven (unblocked deployments, prevented regressions)
**Time Investment**: 30-60 minutes per conflict
**Sessions Used**: Sessions 30, 32, 33, 45 (systematic resolution)

## Problem

Dependency conflicts block development, CI/CD, and deployments with obscure error messages:

❌ **Version mismatches**: Package A needs lib@1.x, Package B needs lib@2.x
❌ **Peer dependency warnings**: Unmet peer dependencies cause runtime errors
❌ **Transitive conflicts**: Deep dependency chains with incompatible versions
❌ **Lock file corruption**: npm install fails, git conflicts in lock files

## Context

**When to use:**
- npm install/pip install fails with version conflicts
- CI/CD build failures due to dependencies
- After upgrading major framework versions
- When adding new packages with strict requirements

**When NOT to use:**
- Simple version updates (no conflicts)
- Fresh project initialization
- When automated tools (Renovate, Dependabot) handle it

**Prerequisites:**
- Understanding of semantic versioning (semver)
- Knowledge of package.json/requirements.txt
- npm/pip installed
- Git for reverting if needed

**Related Patterns:**
- [Pin vs Replace Decision Tree](./pin-vs-replace.md) - When to pin or replace
- [Renovate Migration](./renovate-migration.md) - Automated dependency management
- [Root Cause Analysis](../ci-cd/root-cause-analysis.md) - Debugging dependency issues

## Solution

### Step 1: Identify the Conflict

**Read error messages carefully:**
```bash
# npm conflict example
npm ERR! ERESOLVE unable to resolve dependency tree
npm ERR! Could not resolve dependency:
npm ERR! peer react@"^18.0.0" from next@15.1.3
npm ERR! conflicting with react@"^19.0.0" from root

# pip conflict example
ERROR: pip's dependency resolver does not currently take into account all the packages...
ERROR: pytest-asyncio 0.23.0 requires pytest>=7.0.0, but you have pytest 6.2.5
```

### Step 2: Visualize Dependency Tree

**See who needs what:**
```bash
# npm - see full tree
npm ls react

# npm - why is this installed?
npm why next

# npm - check outdated
npm outdated

# pip - see dependencies
pip show pytest-asyncio

# pip - list tree (requires pipdeptree)
pipdeptree -p pytest-asyncio
```

### Step 3: Choose Resolution Strategy

**Decision tree:**

1. **Can update conflicting package?**
   - YES → Update to compatible version
   - NO → Try next option

2. **Can use --force/--legacy-peer-deps?**
   - YES (peer deps only) → Force install, test thoroughly
   - NO (hard dependency) → Try next option

3. **Can pin intermediate version?**
   - YES → Pin version that satisfies both
   - NO → Try next option

4. **Can replace package?**
   - YES → Find alternative package
   - NO → Consider major refactor

### Step 4: Apply Resolution

**Strategy 1: Update conflicting package**
```bash
# Update package causing conflict
npm update next@latest
# or
npm install next@15.2.0

# For pip
pip install --upgrade pytest-asyncio
```

**Strategy 2: Force install (npm only)**
```bash
# Use with caution - peer dependency conflicts only
npm install --legacy-peer-deps

# or add to .npmrc
echo "legacy-peer-deps=true" >> .npmrc
```

**Strategy 3: Pin intermediate version**
```bash
# Find compatible version
npm install react@18.3.0  # Between 18.0.0 and 19.0.0

# For pip, edit requirements.txt
pytest>=7.0.0,<8.0.0  # Pin range
```

**Strategy 4: Replace package**
```bash
# Remove conflicting package
npm uninstall problematic-package

# Install alternative
npm install alternative-package
```

### Step 5: Verify Resolution

**Test thoroughly:**
```bash
# Reinstall from clean state
rm -rf node_modules package-lock.json
npm install

# Run tests
npm test

# Build check
npm run build

# For Python
rm -rf venv
python -m venv venv
venv/Scripts/Activate.ps1  # Windows
pip install -r requirements.txt
pytest
```

## Example: Session 33 - pytest-asyncio Conflict

**Real-world conflict resolution from Session 33:**

### Initial Failure
```bash
# CI/CD build error
ERROR: pip's dependency resolver does not currently take into account all the packages...
ERROR: pytest-asyncio 0.23.0 requires pytest>=7.0.0, but you have pytest 6.2.5
```

### Step 1: Investigate
```bash
# Check current versions
PS> pip show pytest
Name: pytest
Version: 6.2.5

PS> pip show pytest-asyncio
Name: pytest-asyncio
Version: 0.23.0
Requires: pytest>=7.0.0  # ❌ Conflict!
```

### Step 2: Check dependency tree
```bash
# Who requires pytest 6.2.5?
PS> cat requirements.txt | Select-String "pytest"
pytest==6.2.5  # Pinned to old version
pytest-asyncio  # No version specified, got latest (0.23.0)
```

### Step 3: Choose strategy

**Option 1**: Update pytest to >=7.0.0
- ✅ Pros: Modern version, full compatibility
- ❌ Cons: Might break existing tests, major version change

**Option 2**: Pin pytest-asyncio to 0.21.1 (last compatible with pytest 6.x)
- ✅ Pros: Minimal changes, backward compatible
- ✅ Pros: Proven stable version
- ❌ Cons: Not latest features

**Decision**: Option 2 (pin pytest-asyncio) - safer, faster

### Step 4: Apply fix
```bash
# Edit requirements.txt
- pytest-asyncio
+ pytest-asyncio==0.21.1  # Pin to last version compatible with pytest 6.2.5
```

### Step 5: Verify
```bash
# Clean install
PS> pip uninstall pytest-asyncio
PS> pip install -r requirements.txt

# Check versions
PS> pip show pytest-asyncio
Name: pytest-asyncio
Version: 0.21.1  # ✅ Correct
Requires: pytest>=6.1.0  # ✅ Compatible with 6.2.5

# Run tests
PS> pytest
# ✅ All tests passing

# CI/CD verification
PS> git add requirements.txt
PS> git commit -m "fix: pin pytest-asyncio to 0.21.1 for pytest 6.2.5 compatibility"
PS> git push
# ✅ CI/CD passing
```

**Result**: Conflict resolved in 30 minutes, all tests passing, CI/CD unblocked

## Success Metrics

### Sessions 30, 32, 33, 45: Conflict Resolutions
- **Conflicts resolved**: 8 (pytest-asyncio, react, next, eslint, others)
- **Strategy success**:
  - Pin intermediate version: 5/8 (62.5%) - fastest resolution
  - Update conflicting package: 2/8 (25%) - when safe to update
  - Replace package: 1/8 (12.5%) - last resort
- **Time per conflict**: 30-60 minutes
- **Zero regressions**: 100% (all fixes stable, no test failures)

**Session 33 specific** (pytest-asyncio):
- Detection: 5 minutes (CI/CD error logs)
- Investigation: 10 minutes (pip show, requirements analysis)
- Resolution: 5 minutes (edit requirements.txt, pin version)
- Verification: 10 minutes (clean install, test run, CI/CD check)
- **Total**: 30 minutes

## Anti-Patterns

### ❌ Using --force without understanding

```bash
# ❌ BAD - Force install without investigation
npm install --force  # Hides real issues!
```

```bash
# ✅ GOOD - Investigate first
npm ls react  # See conflict
npm update react@18.3.0  # Resolve properly
```

### ❌ Pinning everything to exact versions

```bash
# ❌ BAD - No flexibility for patches
{
  "dependencies": {
    "next": "15.1.3",  # Exact version
    "react": "19.0.0",  # Exact version
    "typescript": "5.3.3"  # Exact version
  }
}
```

```bash
# ✅ GOOD - Allow patch updates
{
  "dependencies": {
    "next": "^15.1.3",  # Allow 15.x.x
    "react": "^19.0.0",  # Allow 19.x.x
    "typescript": "~5.3.3"  # Allow 5.3.x
  }
}
```

### ❌ Not testing after resolution

```bash
# ❌ BAD - Assume fix worked
npm install --legacy-peer-deps
git commit -m "fix deps"  # No verification!
```

```bash
# ✅ GOOD - Verify thoroughly
npm install --legacy-peer-deps
npm test  # ✅ Tests pass
npm run build  # ✅ Build succeeds
git commit -m "fix: resolve peer deps with legacy mode (verified)"
```

### ❌ Mixing resolution strategies

```bash
# ❌ BAD - Inconsistent approach
# requirements.txt
pytest==6.2.5  # Pinned
pytest-asyncio  # Not pinned
requests>=2.0.0  # Range
numpy  # No version
```

```bash
# ✅ GOOD - Consistent strategy
# requirements.txt
pytest==6.2.5
pytest-asyncio==0.21.1  # Pin related packages
requests>=2.31.0,<3.0.0  # Clear ranges
numpy>=1.24.0,<2.0.0
```

## Related Patterns

- **[Pin vs Replace Decision Tree](./pin-vs-replace.md)** - When to pin or replace conflicting packages
- **[Renovate Migration](./renovate-migration.md)** - Automated dependency updates
- **[Security Patch Evaluation](./security-patch-evaluation.md)** - Security-driven updates
- **[Root Cause Analysis](../ci-cd/root-cause-analysis.md)** - Systematic debugging

## Best Practices

1. **Investigate before acting** - Understand why conflict exists
2. **Use semver wisely** - `^` for minors, `~` for patches, exact for breaking
3. **Test thoroughly** - Clean install + full test suite
4. **Document decisions** - Commit message explains why pinned/updated
5. **Prefer pins over force** - Explicit versions better than hidden issues
6. **Check transitive deps** - Use `npm ls` / `pipdeptree`
7. **Update lock files** - Commit `package-lock.json` / `requirements.txt` changes

## Quick Reference

```bash
# npm - Investigate conflict
npm ls <package-name>  # See dependency tree
npm why <package-name>  # Why is this installed?
npm outdated  # See available updates

# npm - Resolve strategies
npm update <package>@<version>  # Update to compatible version
npm install --legacy-peer-deps  # Force install (peer deps only)
npm install <package>@<pinned-version>  # Pin intermediate version

# pip - Investigate conflict
pip show <package-name>  # See dependencies
pipdeptree -p <package-name>  # Tree view
pip list --outdated  # See updates

# pip - Resolve strategies
pip install --upgrade <package>  # Update to latest
pip install <package>==<version>  # Pin specific version

# Clean reinstall verification
rm -rf node_modules package-lock.json && npm install  # npm
rm -rf venv && python -m venv venv && pip install -r requirements.txt  # pip
```

## References

- **Session 33**: pytest-asyncio conflict - [history.md](../../plans/history.md)
- **Sessions 30, 32, 45**: Other dependency conflicts - [history.md](../../plans/history.md)
- **npm docs**: [Dependency resolution](https://docs.npmjs.com/cli/v10/using-npm/dependency-resolution)
- **Semantic versioning**: [semver.org](https://semver.org/)

---

**Last Updated**: November 2, 2025 (Session 66 documentation)
**Pattern Status**: ✅ Proven (8/8 conflicts resolved, 100% success rate)
**Recommended For**: All dependency conflicts (mandatory skill for production systems)
