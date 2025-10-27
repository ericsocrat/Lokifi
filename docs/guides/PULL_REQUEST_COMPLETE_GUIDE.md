# 🔄 Lokifi Pull Request Complete Guide

**Last Updated:** October 27, 2025
**Purpose:** Comprehensive PR workflow, creation, review, and troubleshooting
**Status:** Production Ready
**Consolidates:** PULL_REQUEST_GUIDE.md, MANUAL_PR_INSTRUCTIONS.md, CHECK_PRS.md, PRE_MERGE_CHECKLIST.md

---

## 📚 Quick Navigation

- [PR Workflow Overview](#-pr-workflow-overview)
- [Creating Pull Requests](#-creating-pull-requests)
- [PR Standards & Templates](#-pr-standards--templates)
- [Automated Checks](#-automated-pr-checks)
- [Code Review Process](#-code-review-process)
- [PR Status Management](#-pr-status-management)
- [Pre-Merge Checklist](#-pre-merge-checklist)
- [Troubleshooting](#-troubleshooting-pr-issues)
- [Best Practices](#-pr-best-practices)
- [Post-Merge Process](#-post-merge-process)

---

## 🎯 PR Workflow Overview

### Standard PR Process
1. **Create feature branch** from main/develop
2. **Implement changes** following coding standards
3. **Run quality checks** (tests, linting, formatting)
4. **Create pull request** with proper description
5. **Automated validation** (continuous integration checks)
6. **Code review process** (team validation)
7. **Merge after approval** (automated or manual)
8. **Cleanup branches** post-merge

---

## 🚀 Creating Pull Requests

### Method 1: GitHub Web Interface (Recommended)

#### Quick Steps
1. Navigate to https://github.com/ericsocrat/Lokifi
2. Look for yellow banner: "*branch-name* had recent pushes"
3. Click **"Compare & pull request"** button
4. **Alternative**: Pull requests tab → "New pull request"

#### Configure PR Details
- **Base branch**: `main` (or `develop` for feature branches)
- **Compare branch**: Your feature branch
- **Title**: Follow [PR title standards](#pr-title-standards)
- **Description**: Use [comprehensive template](#pr-description-template)

#### Direct PR Creation URLs
If the yellow banner doesn't appear, use direct links:
```
https://github.com/ericsocrat/Lokifi/pull/new/BRANCH_NAME
```

### Method 2: GitHub CLI (Advanced)

**Install GitHub CLI**:
```powershell
winget install GitHub.cli
```

**Create PR with template**:
```powershell
# Full control
gh pr create --base main --head feature/branch-name \
  --title "feat: Description" \
  --body-file .github/pull_request_template.md

# Quick creation (auto-fills from commits)
gh pr create --fill

# Create draft PR for early feedback
gh pr create --draft --title "WIP: Feature in progress"

# Convert draft to ready
gh pr ready PR_NUMBER
```

**Useful PR commands**:
```powershell
# List all PRs
gh pr list

# Check specific PR
gh pr view 23

# Check PR status
gh pr status

# Check automated checks
gh pr checks 23

# View PR in browser
gh pr view 23 --web
```

### Method 3: VS Code Extension
1. Install "GitHub Pull Requests" extension
2. Use Command Palette: `GitHub Pull Requests: Create Pull Request`
3. Follow guided workflow

---

## 📋 PR Standards & Templates

### PR Title Standards

#### Format Convention
```
<type>(<scope>): <description>
```

#### Type Categories
- **feat**: New features
- **fix**: Bug fixes
- **docs**: Documentation updates
- **test**: Testing improvements
- **refactor**: Code refactoring
- **perf**: Performance improvements
- **style**: Code style/formatting
- **ci**: Continuous integration configuration
- **chore**: Maintenance tasks

#### Examples
```
feat(api): add real-time WebSocket price updates
fix(auth): resolve JWT token expiration handling
test(frontend): expand component test coverage
docs(setup): update development environment guide
ci(backend): optimize test pipeline performance
```

### PR Description Template

Use this comprehensive template for all PRs:

````markdown
## 🎯 What This PR Does

Brief summary of the changes and their purpose.

## ✨ Changes Made

### New Features
- [ ] Feature 1 description
- [ ] Feature 2 description

### Bug Fixes
- [ ] Fix 1 description
- [ ] Fix 2 description

### Improvements
- [ ] Improvement 1
- [ ] Improvement 2

## 🧪 Testing

### Test Coverage
- [ ] Unit tests added/updated
- [ ] Integration tests passing
- [ ] E2E tests validated
- [ ] Manual testing completed

### Test Commands
```powershell
# Frontend tests
npm run test                # Unit tests
npm run test:coverage       # With coverage
npm run test:e2e           # E2E tests

# Backend tests
pytest                      # All tests
pytest --cov               # With coverage
```

**📖 For complete testing strategies:**
- [`TESTING_GUIDE.md`](TESTING_GUIDE.md) - Comprehensive testing workflows
- [`INTEGRATION_TESTS_GUIDE.md`](INTEGRATION_TESTS_GUIDE.md) - Integration testing guide

## 📊 Performance Impact

- **Bundle size**: +/-X KB
- **API response time**: No change / Improved by Xms
- **Memory usage**: No impact / Optimized
- **Database queries**: No change / Reduced by X

## 🔐 Security Considerations

- [ ] Input validation implemented
- [ ] Authentication/authorization reviewed
- [ ] No sensitive data exposed
- [ ] Security tests passing

## 📚 Documentation

- [ ] README updated (if needed)
- [ ] API documentation updated
- [ ] Inline code comments added
- [ ] Migration guide provided (if breaking)

## 🎯 Pre-merge Checklist

- [ ] All automated checks passing
- [ ] Code review completed
- [ ] No merge conflicts
- [ ] Branch up to date with base
- [ ] Breaking changes documented
````

---

## 🤖 Automated PR Checks

### Pipeline Validation

#### Frontend Checks
```yaml
✅ ESLint (code quality)
✅ TypeScript compilation
✅ Unit tests (Vitest)
✅ Integration tests
✅ Build validation
✅ Bundle size analysis
✅ Security scan (dependencies)
```

#### Backend Checks
```yaml
✅ Python linting (ruff, black)
✅ Type checking (mypy)
✅ Integration tests
✅ API contract tests
✅ Security scan (bandit)
✅ Coverage reporting (≥80%)
```

**📖 For unit testing details:** See [`TESTING_GUIDE.md`](TESTING_GUIDE.md) for comprehensive testing strategies

### Quality Gates
- **Test Coverage**: Minimum 80% for new code
- **Build Status**: Must pass without errors
- **Security**: No high/critical vulnerabilities
- **Performance**: No significant regressions
- **Code Style**: Pre-commit hooks must pass

### Automated PR Comments

You'll receive automated comments from `github-actions[bot]`:

**Test Results Comment**:
```markdown
## 🧪 Test Results

**Status:** ✅ Tests completed

### Coverage Report
| Metric | Percentage | Covered/Total |
|--------|-----------|---------------|
| Statements | 85.2% | 1234/1448 |
| Branches | 78.3% | 567/724 |
| Functions | 82.5% | 234/284 |
| Lines | 85.7% | 1198/1398 |

📈 [View detailed coverage report in artifacts]
```

**Security Results Comment**:
```markdown
## 🔒 Security Scan Results

**Status:** ✅ No critical issues

### Vulnerability Summary
| Severity | Count |
|----------|-------|
| Critical | 0 |
| High | 2 |
| Moderate | 5 |
| Low | 12 |
| **Total** | **19** |

📊 [View detailed security report in artifacts]
```

### Expected Timeline
- **0-30 seconds**: PR created, workflows trigger
- **2-3 minutes**: Test job completes, first comment appears
- **2-3 minutes**: Security job completes, second comment appears
- **3-5 minutes**: All checks complete, PR ready for review

---

## 👥 Code Review Process

### Review Guidelines

#### For Reviewers
- [ ] **Functionality**: Does the code work as intended?
- [ ] **Code Quality**: Is it readable and maintainable?
- [ ] **Performance**: Any performance implications?
- [ ] **Security**: Are there security concerns?
- [ ] **Tests**: Adequate test coverage?
- [ ] **Documentation**: Is documentation updated?

#### Review Checklist
```markdown
## Code Review Checklist

### Functionality ✅
- [ ] Changes match requirements
- [ ] Edge cases handled
- [ ] Error handling appropriate

### Code Quality ✅
- [ ] Code is readable and clear
- [ ] Follows project conventions
- [ ] No code duplication
- [ ] Proper abstractions used

### Testing ✅
- [ ] Adequate test coverage
- [ ] Tests are meaningful
- [ ] Mock usage appropriate

### Security & Performance ✅
- [ ] No security vulnerabilities
- [ ] Performance considerations addressed
- [ ] Resource usage optimized
```

### Review Outcomes
- **✅ Approved**: Ready to merge
- **🔄 Request Changes**: Issues must be addressed
- **💬 Comment**: Suggestions/questions (non-blocking)

---

## 📊 PR Status Management

### Common Status Indicators
- 🟢 **All checks passed** - Ready for review/merge
- 🟡 **Checks pending** - Automation in progress
- 🔴 **Checks failed** - Issues need resolution
- ⏳ **Awaiting review** - Needs reviewer attention
- 🔄 **Changes requested** - Author action required

### Checking PR Status

**Via GitHub CLI**:
```powershell
# List all PRs
gh pr list

# Check specific PR
gh pr view 23

# Check PR status
gh pr status

# Watch checks in real-time
gh pr checks 23 --watch

# View status in JSON
gh pr view 23 --json statusCheckRollup
```

**Via GitHub Web Interface**:
1. Navigate to repository PR tab
2. Filter by author, label, or status
3. Check automated status indicators
4. Review automated comments

**Via VS Code**:
1. Open GitHub Pull Requests extension
2. View PR list in sidebar
3. Check status indicators
4. Review directly in editor

---

## 🎯 Pre-Merge Checklist

Use this comprehensive checklist before merging any PR:

### Code Quality
- [ ] All syntax errors fixed
- [ ] Import errors resolved
- [ ] No TypeScript/linting errors
- [ ] All commits have descriptive messages
- [ ] Code follows project conventions

### Testing
- [ ] All tests passing (100% success rate)
- [ ] Backend coverage ≥80%
- [ ] Frontend tests updated
- [ ] No test hangs or timeouts
- [ ] Manual testing completed

### Documentation
- [ ] CHANGELOG updated
- [ ] README updated (if needed)
- [ ] API docs updated (if changed)
- [ ] Inline comments added
- [ ] Migration guide (if breaking changes)

### CI/CD
- [ ] Pipeline passes
- [ ] No hangs or infinite loops
- [ ] All jobs completing successfully
- [ ] Proper timeouts configured
- [ ] Artifacts generated correctly

### Dependencies
- [ ] All required packages installed
- [ ] No conflicting versions
- [ ] Security vulnerabilities addressed
- [ ] Dependencies up to date

### Configuration
- [ ] Environment variables documented
- [ ] Configuration files updated
- [ ] Secrets properly managed
- [ ] Feature flags configured (if applicable)

### General
- [ ] No merge conflicts with main
- [ ] Branch up to date with base
- [ ] No uncommitted changes
- [ ] No sensitive data in commits

### Performance
- [ ] CI/CD time acceptable (<5 min)
- [ ] No performance regressions
- [ ] Resource usage optimized
- [ ] Database queries efficient

---

## 🛠️ Troubleshooting PR Issues

### Common Automation Failures

#### Test Failures
```powershell
# Check test logs in CI
gh pr checks PR_NUMBER --watch

# View failed run logs
gh run view RUN_ID --log-failed
```

**📖 For running tests locally and debugging:**
- [`TESTING_GUIDE.md`](TESTING_GUIDE.md) - Complete testing workflows and debugging options

#### Build Failures
```powershell
# Check build logs
gh pr view PR_NUMBER --json statusCheckRollup

# Test build locally
npm run build            # Frontend
python -m build          # Backend
```

#### Linting/Formatting Issues
```powershell
# Auto-fix common issues
npm run lint:fix         # Frontend ESLint
black .                  # Backend formatting

# Pre-commit hook fixes
npx lint-staged         # From frontend directory
```

**📖 For complete code quality setup:**
- [`CODE_QUALITY.md`](CODE_QUALITY.md) - Complete linting and formatting guide

### Merge Conflicts Resolution

#### Step 1: Update Local Branch
```powershell
git checkout feature-branch
git fetch origin
git merge origin/main
```

#### Step 2: Resolve Conflicts
1. Open conflicted files in VS Code
2. Use merge conflict editor
3. Choose appropriate changes
4. Remove conflict markers

#### Step 3: Complete Merge
```powershell
git add .
git commit -m "resolve: merge conflicts with main"
git push origin feature-branch
```

### Branch Protection Issues

#### Common Issues
- **Required checks not passing**: Wait for automated completion
- **Stale branch**: Update with latest main/develop
- **Missing reviews**: Request reviewer approval
- **Admin bypass**: Contact repository administrators

#### Solutions
```powershell
# Update branch with latest
git fetch origin
git merge origin/main
git push origin feature-branch

# Force push (use cautiously)
git push --force-with-lease origin feature-branch
```

### Service Connection Issues

If CI tests fail with database/Redis connection errors:

```yaml
# Check workflow service configuration
services:
  postgres:
    image: postgres:16-alpine
    env:
      POSTGRES_USER: lokifi
      POSTGRES_PASSWORD: lokifi2025
      POSTGRES_DB: lokifi_test
    options: >-
      --health-cmd "pg_isready -U lokifi"
      --health-interval 10s
      --health-timeout 5s
      --health-retries 5

  redis:
    image: redis:7-alpine
    options: >-
      --health-cmd "redis-cli ping"
      --health-interval 10s
      --health-timeout 5s
      --health-retries 5
```

**Environment variables to verify**:
```yaml
env:
  DATABASE_URL: postgresql://lokifi:lokifi2025@localhost:5432/lokifi_test
  REDIS_URL: redis://localhost:6379/0
  TESTING: 1
```

---

## 📈 PR Best Practices

### Size Management
- **Keep PRs focused**: One feature/fix per PR
- **Limit changes**: <500 lines of code changes ideal
- **Break up large features**: Use feature flags or multiple PRs
- **Reviewable chunks**: Logical, reviewable segments

### Communication
- **Clear descriptions**: Explain what and why
- **Link issues**: Reference related GitHub issues
- **Update regularly**: Keep PR description current
- **Respond promptly**: Address review comments quickly

### Quality Standards
- **Self-review first**: Review your own changes
- **Test thoroughly**: Local testing before PR
- **Document changes**: Update relevant documentation
- **Consider impact**: Assess breaking changes

### Feature Flags Integration
```typescript
// Use feature flags for gradual rollouts
if (featureFlags.isEnabled('new-chart-component')) {
  return <NewPriceChart />;
}
return <LegacyPriceChart />;
```

### Stacked PRs for Large Features
1. **Base PR**: Core infrastructure changes
2. **Feature PR 1**: First feature component (depends on base)
3. **Feature PR 2**: Second component (depends on PR 1)
4. **Integration PR**: Brings everything together

---

## 🔄 Post-Merge Process

### Cleanup Tasks
```powershell
# Delete local feature branch
git checkout main
git branch -d feature-branch

# Delete remote feature branch (if not auto-deleted)
git push origin --delete feature-branch

# Update local main
git pull origin main
```

### Deployment Validation
- **Monitor deployment**: Check production deployment
- **Validate functionality**: Smoke test deployed features
- **Monitor metrics**: Watch for performance/error impacts
- **Rollback plan**: Be ready to revert if issues arise

### Documentation Updates
- **Release notes**: Add to changelog
- **API documentation**: Update if APIs changed
- **User guides**: Update for user-facing changes
- **Team notification**: Inform team of significant changes

### Post-Merge Actions

**Immediate**:
1. ✅ Delete merged branches (local & remote)
2. ✅ Update project documentation
3. ✅ Close related issues
4. ✅ Update project board

**Next Steps**:
1. Plan next feature/task
2. Monitor production for issues
3. Gather user feedback
4. Update metrics and analytics

---

## 📊 PR Metrics & Analytics

### Key Metrics to Track
- **Time to merge**: Average time from PR creation to merge
- **Review cycles**: Number of review rounds per PR
- **Pipeline success rate**: Percentage of passing automation runs
- **Defect escape rate**: Issues found post-merge
- **Code coverage trend**: Coverage changes over time

### Quality Indicators
- **PR size distribution**: Most PRs should be small-medium
- **Review participation**: Team engagement in reviews
- **Automated check failures**: Trends in pipeline failures
- **Time to first review**: Reviewer responsiveness

### Typical Lokifi PR Metrics
- **Pipeline Duration**: 2-5 minutes
- **Success Rate**: 90%+ on main branch
- **Coverage**: Backend 80%+, Frontend improving
- **Review Time**: <24 hours typical

---

## 🎯 Advanced Workflows

### Manual PR Creation (No GitHub CLI)

If `gh` CLI is not installed, use direct links:

**Direct PR Creation URL Format**:
```
https://github.com/ericsocrat/Lokifi/pull/new/BRANCH_NAME
```

**Example**:
```
https://github.com/ericsocrat/Lokifi/pull/new/feature/api-contract-testing
```

**Steps**:
1. Replace `BRANCH_NAME` with your branch name
2. Open URL in browser
3. Fill in PR title and description
4. Click "Create pull request"

### Checking Existing PRs

**Find PR by branch name**:
```powershell
# List all open PRs
gh pr list --state open

# Search for specific branch
gh pr list --search "feature/api-contract-testing"

# View specific PR
gh pr view 23
```

**Via web interface**:
1. Go to https://github.com/ericsocrat/Lokifi/pulls
2. Use search bar: `is:pr is:open feature/branch-name`
3. Click on PR to view details

### Merge Strategy

**Recommended merge order for dependent PRs**:
1. Merge simpler, lower-risk PRs first
2. Merge infrastructure changes before features
3. Merge features before integration PRs
4. Monitor each merge before proceeding

**After each merge**:
```powershell
git checkout main
git pull origin main
# Verify CI passes on main
gh run list --branch main --limit 1
```

---

## 🆘 Quick Help

### I can't create a PR
- **Check**: Is your branch pushed to GitHub?
- **Check**: Do you have write access to the repository?
- **Try**: Direct URL `https://github.com/ericsocrat/Lokifi/pull/new/BRANCH_NAME`

### Checks aren't running
- **Wait**: Give it 30 seconds, refresh page
- **Check**: GitHub Actions tab for workflow runs
- **Verify**: Workflow files exist in `.github/workflows/`

### Automated comments not appearing
- **Check**: Are all jobs completing?
- **Check**: PR has `pull_request` trigger in workflow
- **Wait**: Comments appear after jobs complete (2-5 min)

### Merge button is disabled
- **Check**: Are all required checks passing?
- **Check**: Are there merge conflicts?
- **Check**: Is branch protection enabled?
- **Check**: Do you have required approvals?

---

## 📚 Related Documentation

- **Testing**: [`TESTING_GUIDE.md`](TESTING_GUIDE.md) - Comprehensive testing workflows
- **Integration Tests**: [`INTEGRATION_TESTS_GUIDE.md`](INTEGRATION_TESTS_GUIDE.md) - Integration testing
- **Code Quality**: [`CODE_QUALITY.md`](CODE_QUALITY.md) - Linting and formatting
- **CI/CD**: [`../ci-cd/CI_CD_GUIDE.md`](../ci-cd/CI_CD_GUIDE.md) - Pipeline documentation
- **Deployment**: [`../deployment/DEPLOYMENT_GUIDE.md`](../deployment/DEPLOYMENT_GUIDE.md) - Deployment workflows

---

**Remember**: Good PR practices lead to better code quality, faster development cycles, and happier teams! 🚀

**Quality Metrics Improvement** (Sessions 8-10):
- Pass Rate: 46% → 91.3% → 100% (target)
- Pipeline Duration: 5+ min → 2 min
- Success Rate: ~30% → 90%+
- Reliability: Significantly improved
