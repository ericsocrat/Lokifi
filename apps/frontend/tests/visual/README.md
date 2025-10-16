# 📸 Visual Regression Testing

Phase 1.6 Task 3 - Automated visual regression testing for Lokifi frontend.

---

## 🎯 Purpose

Visual regression testing automatically detects unintended UI changes by:

- Capturing screenshots of UI components and pages
- Comparing them against baseline images
- Highlighting visual differences in pull requests
- Preventing visual bugs from reaching production

---

## 🚀 Quick Start

### Run Visual Tests Locally

```bash
# Run all visual tests
npm run test:visual

# Run with interactive UI
npm run test:visual:ui

# Update baselines after intentional UI changes
npm run test:visual:update
```

### First Time Setup

```bash
# Install Playwright browsers (if not already done)
npx playwright install chromium
```

---

## 📋 What's Being Tested

### Component Tests

- **Navigation** - Header and menu components
- **Buttons** - All button variants and states
- **Links** - Link styling and hover states
- **Forms** - Input fields, textareas, select dropdowns
- **Layout** - Page structure and containers

### Page Tests

- **Home page** - Full page and hero section
- **Responsive layouts** - Desktop, tablet, and mobile views

### Responsive Tests

- **Desktop** - 1280x720 viewport
- **Tablet** - iPad Pro dimensions
- **Mobile** - iPhone 13 dimensions

---

## 🔧 How It Works

### 1. Baseline Capture

```bash
# Initial run creates baseline screenshots
npm run test:visual:update
```

Baselines are stored in `tests/visual-baselines/` and committed to git.

### 2. Comparison

```bash
# Subsequent runs compare against baselines
npm run test:visual
```

If visual differences are detected:

- Test fails with diff image
- Diff shows pixel-by-pixel comparison
- Results saved to `test-results/`

### 3. Review & Update

```bash
# If changes are intentional, update baselines
npm run test:visual:update

# Commit the new baselines
git add tests/visual-baselines/
git commit -m "chore: Update visual regression baselines"
```

---

## 🎮 CI/CD Integration

### Automatic Execution

Visual tests run automatically in CI/CD when:

1. A pull request is created or updated
2. The PR has the **`visual-test`** label

### Workflow

1. **Create PR** - Normal PR workflow
2. **Add Label** - Add `visual-test` label to PR
3. **CI Runs** - Visual tests execute automatically
4. **Review Results** - Check PR comments for visual diffs
5. **Update if Needed** - Run `npm run test:visual:update` locally if changes are intentional

### PR Comments

The CI/CD pipeline automatically comments on PRs with:

- ✅ **Pass** - No visual changes detected
- ⚠️ **Fail** - Visual differences found (with artifact links)
- Instructions for updating baselines if needed

---

## 📸 Adding New Visual Tests

### 1. Create Test File

```typescript
// tests/visual/my-component.visual.spec.ts
import { test, expect } from '@playwright/test';

test.describe('My Component Visual Tests', () => {
  test('Component default state', async ({ page }) => {
    await page.goto('/my-component');

    // Wait for component to be visible
    const component = page.locator('#my-component');
    await component.waitFor({ state: 'visible' });

    // Take screenshot
    await expect(component).toHaveScreenshot('my-component-default.png');
  });

  test('Component hover state', async ({ page }) => {
    await page.goto('/my-component');
    const component = page.locator('#my-component');

    // Hover over element
    await component.hover();

    // Take screenshot of hover state
    await expect(component).toHaveScreenshot('my-component-hover.png');
  });
});
```

### 2. Capture Baseline

```bash
npm run test:visual:update
```

### 3. Verify

```bash
# Run test to verify baseline works
npm run test:visual

# Should pass on first run after baseline capture
```

### 4. Commit

```bash
git add tests/visual/my-component.visual.spec.ts
git add tests/visual-baselines/
git commit -m "test: Add visual regression tests for MyComponent"
```

---

## 🎛️ Configuration

Visual testing is configured in `playwright.config.ts`:

```typescript
expect: {
  toHaveScreenshot: {
    maxDiffPixelRatio: 0.05,    // 5% tolerance
    threshold: 0.2,              // Color difference threshold
    animations: 'disabled',      // Disable animations
    caret: 'hide',               // Hide text cursors
    scale: 'css',                // Use CSS pixels
  },
}
```

### Tolerance Settings

- **maxDiffPixelRatio**: 0.05 (5%) - Allows minor anti-aliasing differences
- **threshold**: 0.2 - Color difference threshold (0-1 scale)

### Why Tolerance?

- Different OS/browsers may render fonts slightly differently
- Anti-aliasing varies across environments
- Small differences shouldn't fail tests

---

## 🐛 Troubleshooting

### False Positives (Tests fail but look the same)

**Cause:** Minor rendering differences between environments

**Solution:**

```bash
# Increase tolerance in playwright.config.ts
maxDiffPixelRatio: 0.10  // Increase from 0.05 to 0.10
```

### Tests Timeout

**Cause:** Page takes too long to load

**Solution:**

```typescript
// Increase timeout for specific test
test('Slow page', async ({ page }) => {
  test.setTimeout(60000); // 60 seconds
  await page.goto('/slow-page');
  // ... rest of test
});
```

### Dynamic Content Causes Failures

**Cause:** Timestamps, random data, or user-specific content changes

**Solution:**

```typescript
// Mask dynamic content
await expect(page).toHaveScreenshot('page.png', {
  mask: [page.locator('.timestamp'), page.locator('.random-content')],
});
```

### Animations Cause Inconsistency

**Cause:** Screenshots captured mid-animation

**Solution:**

```typescript
// Wait for animations to complete
await page.waitForLoadState('networkidle');
await page.waitForTimeout(500); // Small delay for animations

// Or disable animations in config (already done)
animations: 'disabled';
```

---

## 📚 Best Practices

### ✅ DO

- **Test critical UI components** - Focus on important user-facing elements
- **Test responsive layouts** - Verify mobile, tablet, desktop views
- **Update baselines intentionally** - Only when UI changes are deliberate
- **Use meaningful names** - `button-primary.png` not `screenshot-1.png`
- **Wait for content** - Ensure page is fully loaded before screenshot
- **Test states** - Default, hover, active, disabled, error states

### ❌ DON'T

- **Test everything** - Focus on critical paths, not every pixel
- **Include timestamps** - Mask dynamic content that always changes
- **Test animations mid-frame** - Disable animations or wait for completion
- **Ignore failures** - Investigate why tests fail before updating baselines
- **Commit test-results/** - Only commit baselines, not test artifacts

---

## 📊 Metrics & Coverage

### Current Coverage

- **Component tests**: 8 test scenarios
- **Page tests**: 3 pages (home, desktop, responsive)
- **Responsive tests**: 3 viewports (desktop, tablet, mobile)
- **Total screenshots**: ~15 baseline images

### Success Criteria

- ✅ All critical UI components tested
- ✅ Responsive layouts validated
- ✅ CI/CD integration working
- ✅ Zero false positives
- ✅ Fast execution (< 2 minutes)

---

## 🔗 Related Documentation

- [Playwright Visual Comparisons](https://playwright.dev/docs/test-snapshots)
- [Phase 1.6 Task 3 Plan](../../PHASE_1.6_TASK_3_PLAN.md)
- [Lokifi CI/CD Pipeline](.github/workflows/lokifi-unified-pipeline.yml)

---

## 🆘 Need Help?

**Local Issues:**

```bash
# Clear cache and regenerate baselines
rm -rf tests/visual-baselines/
npm run test:visual:update
```

**CI/CD Issues:**

- Check if `visual-test` label is added to PR
- Review workflow logs in GitHub Actions
- Download visual-diff artifacts from failed runs

**Questions:**

- Check existing test files in `tests/visual/` for examples
- Review Playwright documentation
- Ask the team in #engineering channel

---

**Status:** ✅ Implemented
**Last Updated:** October 15, 2025
**Owner:** Engineering Team
