# Archived Workflows

This folder contains deprecated GitHub Actions workflows that have been replaced by better implementations.

**DO NOT USE THESE WORKFLOWS** - They are kept for historical reference and emergency rollback only.

---

## Archived Workflows

### 1. integration-ci.yml
**Archived**: October 23, 2025  
**Reason**: Replaced by `.github/workflows/integration.yml`  
**Why it was replaced**:
- Better separation of concerns
- Path-based conditional execution (30-50% faster)
- Docker layer caching
- Accessibility testing integration
- More comprehensive test coverage

**Replacement**: Use `integration.yml` instead

---

### 2. integration-ci.yml.disabled
**Archived**: October 23, 2025  
**Reason**: Old disabled version, replaced by `integration.yml`  
**Why it was replaced**: Same as integration-ci.yml above

**Replacement**: Use `integration.yml` instead

---

### 3. lokifi-unified-pipeline.yml
**Archived**: October 23, 2025  
**Reason**: Monolithic workflow separated into 4 specialized workflows  
**Why it was replaced**:
- **Performance**: Monolithic workflow took 17 minutes for simple changes
- **Maintainability**: 1034 lines, hard to understand and modify
- **Efficiency**: Ran all tests even when only frontend/backend changed
- **Feedback**: Slow feedback loop (17 min vs 3 min for simple changes)

**Replacements**:
- `ci.yml` - ⚡ Fast Feedback (CI) - 3 minutes
- `coverage.yml` - 📈 Coverage Tracking - 4-6 minutes
- `integration.yml` - 🔗 Integration Tests - 8 minutes
- `e2e.yml` - 🎭 E2E Tests - 6-15 minutes

**Performance Improvement**:
- Simple changes: 17 min → 3 min (82% faster)
- Full test suite: 17 min → 10 min (41% faster)

---

## Emergency Rollback Procedure

If the new separated workflows cause critical issues, you can temporarily revert to the unified pipeline.

**See**: `docs/ci-cd/ROLLBACK_PROCEDURES.md` for complete instructions

**Quick rollback**:
```bash
# 1. Move lokifi-unified-pipeline.yml back to workflows folder
mv .github/workflows/.archive/lokifi-unified-pipeline.yml .github/workflows/

# 2. Disable new workflows (rename with .disabled extension)
mv .github/workflows/ci.yml .github/workflows/ci.yml.disabled
mv .github/workflows/coverage.yml .github/workflows/coverage.yml.disabled
mv .github/workflows/integration.yml .github/workflows/integration.yml.disabled
mv .github/workflows/e2e.yml .github/workflows/e2e.yml.disabled

# 3. Commit and push
git add .github/workflows/
git commit -m "chore: Rollback to unified pipeline (emergency)"
git push origin main
```

**Important**: After rollback, create an issue documenting the problems encountered so they can be fixed.

---

## Why We Keep Archived Workflows

1. **Historical Reference**: Shows evolution of CI/CD pipeline
2. **Emergency Rollback**: Quick recovery if new workflows fail
3. **Documentation**: Explains why changes were made
4. **Learning**: Future developers can understand decision rationale

---

## Maintenance

- These workflows should remain untouched
- Do not attempt to fix or update them
- If rollback is needed, use ROLLBACK_PROCEDURES.md
- If rollback is successful, create issue to fix new workflows

---

**Last Updated**: October 23, 2025  
**Archived By**: CI/CD Optimization Initiative (PR #27)
