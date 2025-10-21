# 🔄 Lokifi Pull Request Management Guide

**Last Updated:** October 20, 2025
**Purpose:** Comprehensive PR workflow and best practices
**Status:** Production Ready

---

## 🎯 Pull Request Workflow Overview

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

#### Step 1: Navigate to Repository
```bash
https://github.com/ericsocrat/Lokifi
```bash

#### Step 2: Create PR
1. Look for yellow banner: "*branch-name* had recent pushes"
2. Click **"Compare & pull request"** button
3. **Alternative**: Pull requests tab → "New pull request"

#### Step 3: Configure PR Details
- **Base branch**: `main` (or `develop` for feature branches)
- **Compare branch**: Your feature branch
- **Title**: Follow format below
- **Description**: Use comprehensive template

### Method 2: GitHub CLI (Advanced)
```powershell
# Install GitHub CLI first
winget install GitHub.cli

# Create PR with template
gh pr create --base main --head feature/branch-name --title "feat: Description" --body-file .github/pull_request_template.md

# Quick PR creation
gh pr create --fill
```powershell

### Method 3: VS Code Extension
1. Install "GitHub Pull Requests" extension
2. Use Command Palette: "GitHub Pull Requests: Create Pull Request"
3. Follow guided workflow

---

## 📋 PR Title Standards

### Format Convention
```typescript
<type>(<scope>): <description>
```typescript

### Type Categories
- **feat**: New features
- **fix**: Bug fixes
- **docs**: Documentation updates
- **test**: Testing improvements
- **refactor**: Code refactoring
- **perf**: Performance improvements
- **style**: Code style/formatting
- **ci**: Continuous integration configuration
- **chore**: Maintenance tasks

### Examples
```bash
feat(api): add real-time WebSocket price updates
fix(auth): resolve JWT token expiration handling
test(frontend): expand component test coverage
docs(setup): update development environment guide
ci(backend): optimize test pipeline performance
```bash

---

## 📝 PR Description Template

### Comprehensive Description Format
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
```yaml

#### Backend Checks
```yaml
✅ Python linting (ruff, black)
✅ Type checking (mypy)
✅ Integration tests
✅ API contract tests
✅ Security scan (bandit)
✅ Coverage reporting (≥80%)
```yaml

**📖 For unit testing details:** See [`TESTING_GUIDE.md`](TESTING_GUIDE.md) for comprehensive testing strategies

#### Quality Gates
- **Test Coverage**: Minimum 80% for new code
- **Build Status**: Must pass without errors
- **Security**: No high/critical vulnerabilities
- **Performance**: No significant regressions
- **Code Style**: Pre-commit hooks must pass

### Automated PR Comments
```markdown
## 🤖 Automated Results

✅ **All checks passed!**

### Test Coverage
- Frontend: 85.2% (+2.1%)
- Backend: 89.7% (+1.5%)

### Performance
- Bundle size: 485KB (-3KB)
- API tests: 234ms average

### Security
- No vulnerabilities detected
- Dependencies up to date

**Ready for review! 🚀**
```markdown

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
```markdown

### Review Outcomes
- **✅ Approved**: Ready to merge
- **🔄 Request Changes**: Issues must be addressed
- **💬 Comment**: Suggestions/questions (non-blocking)

---

## 📊 PR Status Management

### Checking PR Status

#### Via GitHub Web Interface
1. Navigate to repository PR tab
2. Filter by author, label, or status
3. Check automated status indicators
4. Review automated comments

#### Via GitHub CLI
```powershell
# List all PRs
gh pr list

# Check specific PR
gh pr view 23

# Check PR status
gh pr status

# Check automated status
gh pr checks 23
```powershell

#### Via VS Code
1. Open GitHub Pull Requests extension
2. View PR list in sidebar
3. Check status indicators
4. Review directly in editor

### Common Status Indicators
- 🟢 **All checks passed** - Ready for review/merge
- 🟡 **Checks pending** - Automation in progress
- 🔴 **Checks failed** - Issues need resolution
- ⏳ **Awaiting review** - Needs reviewer attention
- 🔄 **Changes requested** - Author action required

---

## 🛠️ Troubleshooting PR Issues

### Common Automation Failures

#### Test Failures
```powershell
# Check test logs in CI
gh pr checks PR_NUMBER --watch
```powershell

**📖 For running tests locally and debugging:**
- [`TESTING_GUIDE.md`](TESTING_GUIDE.md) - Complete testing workflows and debugging options

#### Build Failures
```powershell
# Check build logs
gh pr view PR_NUMBER --json statusCheckRollup

# Test build locally
npm run build            # Frontend
python -m build          # Backend
```powershell

#### Linting/Formatting Issues
```powershell
# Auto-fix common issues
npm run lint:fix         # Frontend ESLint
black .                  # Backend formatting

# Pre-commit hook fixes
npx lint-staged         # From frontend directory
```powershell

**📖 For complete code quality setup:**
- [`CODE_QUALITY.md`](CODE_QUALITY.md) - Complete linting and formatting guide

### Merge Conflicts Resolution

#### Step 1: Update Local Branch
```powershell
git checkout feature-branch
git fetch origin
git merge origin/main
```powershell

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
```powershell

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
```powershell

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
```powershell

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

---

## 🎯 Advanced PR Workflows

### Feature Flags Integration
```typescript
// Use feature flags for gradual rollouts
if (featureFlags.isEnabled('new-chart-component')) {
  return <NewPriceChart />;
}
return <LegacyPriceChart />;
```typescript

### Draft PRs for Early Feedback
```powershell
# Create draft PR
gh pr create --draft --title "WIP: New feature implementation"

# Convert to ready for review
gh pr ready PR_NUMBER
```powershell

### Stacked PRs for Large Features
1. **Base PR**: Core infrastructure changes
2. **Feature PR 1**: First feature component (depends on base)
3. **Feature PR 2**: Second component (depends on PR 1)
4. **Integration PR**: Brings everything together

---

**Remember**: Good PR practices lead to better code quality, faster development cycles, and happier teams! 🚀