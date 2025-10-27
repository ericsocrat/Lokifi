# Visual Regression Baselines Guide

**Last Updated**: October 26, 2025
**Related Task**: H6 - Generate Linux Visual Regression Baselines

---

## 📋 Overview

Visual regression testing at Lokifi uses Playwright to capture screenshots and compare them against baseline images. This ensures UI consistency and catches unintended visual changes.

### Platform-Specific Baselines

**Important**: Visual baselines are **platform-specific** due to differences in:
- Font rendering (ClearType on Windows, FreeType on Linux)
- Anti-aliasing and subpixel rendering
- Browser rendering engine differences by platform
- Image compression algorithms

**Current Status**:
- ✅ Windows baselines: 10 snapshot files (local development)
- 🔄 Linux baselines: Generated via CI workflow (production)

---

## 🎯 When to Update Baselines

Update visual regression baselines when:

1. **Intentional UI Changes**: You've made deliberate changes to component styling, layout, or appearance
2. **New Visual Tests**: You've added new visual regression test cases
3. **Platform Changes**: Updating browser versions or rendering engines
4. **False Positives**: Tests fail due to expected/acceptable visual differences

**Don't update** when:
- Tests fail due to actual bugs (fix the bug instead)
- Changes are temporary or experimental
- You haven't verified the visual changes are correct

---

## 🚀 Generating Linux Baselines (CI)

### Method 1: GitHub Actions Workflow Dispatch (Recommended)

**Best for**: Production baselines, team collaboration, automated process

1. **Navigate to Actions tab** in GitHub repository
2. **Select "🎭 E2E Tests" workflow** from the left sidebar
3. **Click "Run workflow"** button (top right)
4. **Configure inputs**:
   - Branch: Select your working branch (usually `main` or feature branch)
   - Test suite: Select `visual`
   - Update snapshots: Check ✅ `true`
5. **Click "Run workflow"** to start

**What happens**:
- Workflow runs visual tests on `ubuntu-latest` (Linux)
- Generates new snapshot images with `--update-snapshots`
- Commits snapshots to `apps/frontend/tests/visual-baselines/`
- Auto-pushes to your branch with `[skip ci]` tag
- New baselines are now available for all CI runs

**Estimated Time**: 10-12 minutes

---

### Method 2: GitHub Codespaces (Manual)

**Best for**: Quick testing, exploring visual changes, learning

1. **Open Codespace** from GitHub repository
   - Click "Code" → "Codespaces" → "Create codespace on main"
2. **Install dependencies**:
   ```bash
   cd apps/frontend
   npm install
   npx playwright install chromium
   ```
3. **Start development server** (in one terminal):
   ```bash
   npm run dev
   ```
4. **Run visual tests with update flag** (in another terminal):
   ```bash
   npm run test:visual -- --project=chromium --update-snapshots
   ```
5. **Review generated snapshots**:
   ```bash
   git status
   git diff tests/visual-baselines/
   ```
6. **Commit and push**:
   ```bash
   git add tests/visual-baselines/
   git commit -m "test: Update Linux visual regression baselines"
   git push
   ```

**Estimated Time**: 15-20 minutes (including setup)

---

## 🖥️ Updating Windows Baselines (Local Development)

**Best for**: Local development, Windows-specific testing

1. **Ensure dev server is running**:
   ```bash
   cd apps/frontend
   npm run dev
   ```

2. **Update snapshots**:
   ```bash
   npm run test:visual:update
   ```

3. **Review changes**:
   ```bash
   git status
   git diff tests/visual-baselines/
   ```

4. **Commit updated baselines**:
   ```bash
   git add tests/visual-baselines/
   git commit -m "test: Update Windows visual regression baselines"
   git push
   ```

---

## 📁 Baseline Directory Structure

```
apps/frontend/tests/visual-baselines/
└── visual/
    ├── chart-appearance.spec.ts-snapshots/
    │   ├── chart-default-chromium-linux.png
    │   ├── chart-default-chromium-win32.png
    │   ├── chart-dark-mode-chromium-linux.png
    │   └── ...
    └── components.visual.spec.ts-snapshots/
        ├── button-primary-chromium-linux.png
        ├── button-primary-chromium-win32.png
        └── ...
```

**Naming Convention**: `{test-name}-{browser}-{platform}.png`

**Platforms**:
- `linux`: Ubuntu (CI/CD environment)
- `win32`: Windows (local development)
- `darwin`: macOS (if supported)

---

## 🔍 Troubleshooting

### Visual Tests Failing in CI

**Symptom**: Visual tests pass locally (Windows) but fail in CI (Linux)

**Cause**: Missing Linux baselines or outdated baselines

**Solution**:
1. Generate Linux baselines using Method 1 (GitHub Actions)
2. Ensure baselines are committed to `main` branch
3. Re-run CI pipeline

---

### Large Visual Differences Detected

**Symptom**: Tests fail with messages like "Screenshot comparison failed: 2547 pixels different"

**Possible Causes**:
1. **Intentional UI change**: Update baselines (expected)
2. **Font rendering differences**: Adjust `maxDiffPixels` threshold in test
3. **Race condition**: Add `waitForTimeout()` or better selector waits
4. **Browser version change**: Regenerate all baselines

**Investigation**:
```bash
# Download artifacts from failed CI run
gh run download <run-id> --name visual-regression-diffs

# Review visual diff images locally
```

---

### Baseline Missing for Platform

**Symptom**: Error message like "baseline not found: chart-default-chromium-linux.png"

**Solution**:
Generate baselines for that platform:
- Linux: Use GitHub Actions workflow dispatch
- Windows: Run `npm run test:visual:update` locally

---

## 🎨 Visual Test Configuration

### Snapshot Settings (playwright.config.ts)

```typescript
// Baseline screenshots directory
snapshotDir: './tests/visual-baselines'

// Visual comparison thresholds
expect.toHaveScreenshot({
  maxDiffPixels: 100,      // Max pixels allowed to differ
  threshold: 0.2,          // Pixel difference threshold (0-1)
})
```

### Adjusting Thresholds

**When to increase thresholds**:
- Font rendering causes consistent minor differences
- Animation timing causes occasional pixel shifts
- Chart rendering has acceptable variance

**When to decrease thresholds**:
- Critical UI components (login, navigation)
- Exact pixel-perfect layouts required
- Brand-critical visual elements

**Example**:
```typescript
// Strict comparison for critical UI
await expect(page).toHaveScreenshot('login-form.png', {
  maxDiffPixels: 10,
  threshold: 0.05,
});

// Relaxed comparison for dynamic charts
await expect(page).toHaveScreenshot('chart-with-data.png', {
  maxDiffPixels: 200,
  threshold: 0.3,
});
```

---

## 📝 Best Practices

### ✅ Do

- **Generate baselines on CI platform** (Linux) for production tests
- **Review visual diffs** before updating baselines
- **Document intentional UI changes** in commit messages
- **Use descriptive snapshot names** (e.g., `button-hover-state.png`)
- **Test critical user flows** with visual regression
- **Update baselines atomically** (one UI change at a time)

### ❌ Don't

- **Blindly update baselines** without reviewing changes
- **Mix platform baselines** (don't commit Windows baselines to Linux test)
- **Commit large binaries** without compression (Playwright handles this)
- **Test dynamic content** (timestamps, random data) without mocking
- **Over-threshold** (don't set `maxDiffPixels: 10000` to "make it pass")
- **Forget [skip ci]** when updating baselines (prevents infinite loops)

---

## 🔗 Related Documentation

- **Playwright Visual Comparison**: https://playwright.dev/docs/test-snapshots
- **Visual Regression Testing Guide**: `/docs/guides/VISUAL_TESTING.md`
- **E2E Workflow Configuration**: `/.github/workflows/e2e.yml`
- **Visual Test Files**: `/apps/frontend/tests/visual/`

---

## 🆘 Need Help?

**Common Questions**:
- How often should baselines be updated? → After every intentional UI change
- Should I commit baselines to git? → Yes, they're part of the test suite
- Can I have both Windows and Linux baselines? → Yes, Playwright auto-selects based on platform
- What if tests pass locally but fail in CI? → Generate Linux baselines using GitHub Actions

**Support**:
- Check existing visual test README: `/apps/frontend/tests/visual/README.md`
- Review Playwright documentation: https://playwright.dev/docs/intro
- Open GitHub issue with `visual-regression` label

---

**Last Generated**: October 26, 2025
**Platform**: Linux (ubuntu-latest)
**Playwright Version**: Check `apps/frontend/package.json`
