# CI/CD Workflow Rollback Procedures

> **Document Version**: 1.0
> **Last Updated**: October 23, 2025
> **Status**: Active Safety Documentation
> **Purpose**: Emergency procedures to revert CI/CD workflow changes

## 📋 Overview

This document provides step-by-step procedures to rollback the separated CI/CD workflows to the original unified pipeline if issues arise.

**When to use these procedures:**
- ❌ New workflows causing build failures
- ❌ Workflows not executing as expected
- ❌ Performance worse than baseline (17min)
- ❌ Critical bugs in workflow logic
- ❌ Need to quickly restore stability

**Recovery Time Objective (RTO)**: 5-10 minutes

---

## 🚨 Quick Rollback (Emergency)

### Option 1: Disable New Workflows (Fastest - 2 minutes)

**Purpose**: Immediately stop new workflows from running

```bash
# 1. Navigate to repository workflows
cd .github/workflows

# 2. Rename new workflows to disable them
mv ci.yml ci.yml.disabled
mv coverage.yml coverage.yml.disabled
mv integration.yml integration.yml.disabled
mv e2e.yml e2e.yml.disabled
mv label-pr.yml label-pr.yml.disabled

# 3. Commit and push
git add .github/workflows/*.disabled
git commit -m "emergency: Disable separated workflows"
git push origin main
```

**Result**: New workflows stop running immediately. Original `lokifi-unified-pipeline.yml` continues working.

---

### Option 2: Git Revert (Clean - 5 minutes)

**Purpose**: Cleanly revert all workflow separation commits

**Step 1: Identify commits to revert**

```bash
# Find the commits that introduced the new workflows
git log --oneline --grep="workflow" --grep="ci.yml" --grep="coverage.yml" --since="2025-10-20"

# Expected output (example):
# 9cce7736 chore(deps): Update Dependabot configuration
# 92325307 feat(ci): Set up automatic PR labeling
# b0744ee8 feat(ci): Create E2E testing workflow (e2e.yml)
# 20688501 feat(ci): Create integration testing workflow (integration.yml)
# 8a120b97 feat(ci): Create coverage tracking workflow (coverage.yml)
# 165bb17b feat(ci): Create fast feedback workflow (ci.yml)
# 5f7d625e feat(ci): Enforce linting and type checking in CI/CD
# 26a14dd8 feat(security): Install security linting plugins
```

**Step 2: Revert commits in reverse order**

```bash
# Revert from newest to oldest
git revert 9cce7736  # Dependabot
git revert 92325307  # PR labeling
git revert b0744ee8  # E2E workflow
git revert 20688501  # Integration workflow
git revert 8a120b97  # Coverage workflow
git revert 165bb17b  # CI workflow
git revert 5f7d625e  # Quality gates
git revert 26a14dd8  # Security plugins

# OR use a range (adjust commit hashes)
git revert 9cce7736..26a14dd8
```

**Step 3: Push reverts**

```bash
git push origin main
```

**Result**: All workflow changes reverted cleanly with full git history preserved.

---

## 🔄 Partial Rollback (Selective)

### Scenario 1: Keep Phase 1, Rollback Phase 2

**Keep**: Caching optimizations (Phase 1)
**Rollback**: Separated workflows (Phase 2)

```bash
# Revert only Phase 2 commits
git revert 9cce7736  # Dependabot
git revert 92325307  # PR labeling
git revert b0744ee8  # E2E workflow
git revert 20688501  # Integration workflow
git revert 8a120b97  # Coverage workflow
git revert 165bb17b  # CI workflow

# Keep Phase 1 commits:
# 6c16f36a (Playwright caching, artifact compression, npm cleanup)

git push origin main
```

**Result**: Fast workflows removed, Phase 1 optimizations remain (20-25% improvement preserved).

---

### Scenario 2: Keep CI Only, Rollback Others

**Keep**: Fast feedback workflow (ci.yml)
**Rollback**: Coverage, integration, E2E workflows

```bash
# Disable specific workflows
mv coverage.yml coverage.yml.disabled
mv integration.yml integration.yml.disabled
mv e2e.yml e2e.yml.disabled

git add .github/workflows/*.disabled
git commit -m "rollback: Disable coverage, integration, e2e workflows"
git push origin main
```

**Result**: ci.yml continues providing 3-minute feedback. Other workflows disabled.

---

## ⚙️ Update Branch Protection Rules

### Remove New Workflow Requirements

**Step 1: Navigate to branch protection settings**

1. Go to: `https://github.com/ericsocrat/Lokifi/settings/branches`
2. Edit `main` branch protection rule

**Step 2: Update required status checks**

**Before (with separated workflows)**:
```
✅ CI Fast Feedback Success
✅ Coverage Checks Complete
✅ Integration Tests Complete
✅ E2E Tests Complete
```

**After (rollback to unified)**:
```
✅ frontend-test
✅ backend-test
✅ frontend-security
✅ backend-security
✅ accessibility
✅ api-contracts
✅ integration
```

**Step 3: Save changes**

Click "Save changes" at the bottom of the page.

**Result**: PRs now require original unified pipeline jobs instead of new workflow jobs.

---

## 🔍 Verification After Rollback

### 1. Verify Workflows Are Running

```bash
# Check latest workflow run
gh run list --limit 5

# Expected: Only lokifi-unified-pipeline.yml runs
```

### 2. Verify Branch Protection

```bash
# Check required status checks
gh api repos/ericsocrat/Lokifi/branches/main/protection

# Should show original job names, not new workflow names
```

### 3. Test a PR

1. Create a test PR
2. Verify `lokifi-unified-pipeline.yml` runs
3. Verify new workflows (ci.yml, etc.) do NOT run
4. Verify PR can merge after checks pass

---

## 📊 Rollback Decision Matrix

| Issue | Recommended Action | Time | Complexity |
|-------|-------------------|------|------------|
| **All workflows failing** | Emergency disable (Option 1) | 2 min | Low |
| **One workflow failing** | Disable specific workflow | 2 min | Low |
| **Performance regression** | Partial rollback | 5 min | Medium |
| **Complex issues** | Full revert (Option 2) | 5-10 min | Medium |
| **Need to investigate** | Emergency disable + debug | 2 min + variable | Low |

---

## 🛠️ Troubleshooting Common Issues

### Issue: New workflows not disabled after rename

**Cause**: GitHub caches workflow files

**Solution**:
```bash
# Delete workflows instead of renaming
rm .github/workflows/ci.yml
rm .github/workflows/coverage.yml
rm .github/workflows/integration.yml
rm .github/workflows/e2e.yml
rm .github/workflows/label-pr.yml

git add -A
git commit -m "emergency: Remove separated workflows"
git push origin main
```

### Issue: Branch protection blocking merges

**Cause**: Required checks reference deleted workflows

**Solution**: Update branch protection (see "Update Branch Protection Rules" section above)

### Issue: Git revert conflicts

**Cause**: Files changed after workflow commits

**Solution**:
```bash
# Abort conflicted revert
git revert --abort

# Use emergency disable instead
mv .github/workflows/ci.yml .github/workflows/ci.yml.disabled
# ... repeat for other workflows
```

### Issue: Dependabot PRs for disabled workflows

**Cause**: Dependabot still scanning disabled files

**Solution**:
```bash
# Update dependabot.yml to reduce GitHub Actions frequency
# OR delete disabled workflow files entirely
```

---

## 📝 Rollback Checklist

**Pre-Rollback**:
- [ ] Document the issue (GitHub issue or incident log)
- [ ] Notify team members
- [ ] Create backup branch: `git checkout -b backup-workflows-$(date +%Y%m%d)`
- [ ] Push backup: `git push origin backup-workflows-$(date +%Y%m%d)`

**During Rollback**:
- [ ] Choose rollback strategy (emergency, clean, or partial)
- [ ] Execute rollback commands
- [ ] Verify workflows disabled/reverted
- [ ] Update branch protection rules
- [ ] Test with sample PR

**Post-Rollback**:
- [ ] Monitor next 2-3 PR builds
- [ ] Verify performance back to baseline
- [ ] Document root cause
- [ ] Plan fix for issues
- [ ] Communicate timeline for re-deployment

---

## 🔐 Emergency Contacts

**If rollback fails or you need help:**

- **Primary**: @ericsocrat (GitHub)
- **Documentation**: `/docs/ci-cd/` (all CI/CD docs)
- **Baseline Metrics**: `/docs/ci-cd/PERFORMANCE_BASELINE.md`
- **Original Workflow**: `.github/workflows/lokifi-unified-pipeline.yml`

---

## 📚 Related Documentation

- **Optimization Strategy**: `/docs/ci-cd/CI_CD_OPTIMIZATION_STRATEGY.md`
- **Current State**: `/docs/ci-cd/CURRENT_WORKFLOW_STATE.md`
- **Performance Baseline**: `/docs/ci-cd/PERFORMANCE_BASELINE.md`
- **Test Analysis**: `/docs/ci-cd/TEST_WORKFLOW_ANALYSIS.md`

---

## ✅ Rollback Success Criteria

After rollback, verify:

- ✅ `lokifi-unified-pipeline.yml` runs successfully
- ✅ All jobs pass (frontend-test, backend-test, etc.)
- ✅ Pipeline time matches baseline (~17 minutes)
- ✅ No workflow errors in GitHub Actions
- ✅ PRs can merge normally
- ✅ Branch protection working correctly
- ✅ No Dependabot errors

---

**Last Tested**: Never (preventive documentation)
**Next Review**: After first rollback or 6 months (whichever comes first)
