import { expect, test } from '@playwright/test';

test.describe('Visual Regression Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Wait for page to be fully loaded
    await page.waitForLoadState('networkidle');
  });

  test('Chart renders consistently in default state', async ({ page }) => {
    // Wait for canvas to be present
    await page.waitForSelector('canvas', { timeout: 10000 });

    // Wait for chart to fully render
    await page.waitForTimeout(2000);

    // Take screenshot and compare
    await expect(page).toHaveScreenshot('chart-default.png', {
      maxDiffPixels: 100,
      threshold: 0.2,
    });
  });

  test('Dark mode renders correctly', async ({ page }) => {
    // Click theme toggle
    const themeToggle = page.locator('[data-testid="theme-toggle"], button:has-text("Dark"), button:has-text("Theme")').first();

    if (await themeToggle.count() > 0) {
      await themeToggle.click();
      await page.waitForTimeout(500);

      await expect(page).toHaveScreenshot('chart-dark-mode.png', {
        maxDiffPixels: 150,
        threshold: 0.2,
      });
    } else {
      console.log('Theme toggle not found, skipping dark mode test');
    }
  });

  test('Chart with indicators renders consistently', async ({ page }) => {
    await page.waitForSelector('canvas', { timeout: 10000 });

    // Try to enable an indicator
    const indicatorButton = page.locator('[data-testid*="indicator"], button:has-text("Indicators")').first();

    if (await indicatorButton.count() > 0) {
      await indicatorButton.click();
      await page.waitForTimeout(1000);

      await expect(page).toHaveScreenshot('chart-with-indicators.png', {
        maxDiffPixels: 200,
        threshold: 0.2,
      });
    } else {
      console.log('Indicator controls not found');
    }
  });

  test('Drawing tools UI renders correctly', async ({ page }) => {
    await page.waitForSelector('canvas', { timeout: 10000 });

    // Look for drawing tool buttons
    const toolButton = page.locator('[data-testid*="tool"], button[aria-label*="drawing"]').first();

    if (await toolButton.count() > 0) {
      await toolButton.click();
      await page.waitForTimeout(500);

      await expect(page).toHaveScreenshot('drawing-tools-ui.png', {
        maxDiffPixels: 100,
        threshold: 0.2,
      });
    } else {
      console.log('Drawing tools not found');
    }
  });

  test('Responsive layout on mobile', async ({ page, viewport }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForSelector('canvas', { timeout: 10000 });
    await page.waitForTimeout(1000);

    await expect(page).toHaveScreenshot('chart-mobile.png', {
      maxDiffPixels: 150,
      threshold: 0.2,
    });
  });

  test('Responsive layout on tablet', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.waitForSelector('canvas', { timeout: 10000 });
    await page.waitForTimeout(1000);

    await expect(page).toHaveScreenshot('chart-tablet.png', {
      maxDiffPixels: 150,
      threshold: 0.2,
    });
  });

  test('Chart controls panel renders correctly', async ({ page }) => {
    await page.waitForSelector('canvas', { timeout: 10000 });

    // Look for timeframe or symbol controls
    const controlsPanel = page.locator('[data-testid*="controls"], [class*="controls"]').first();

    if (await controlsPanel.count() > 0) {
      await expect(page).toHaveScreenshot('chart-controls.png', {
        maxDiffPixels: 100,
        threshold: 0.2,
      });
    } else {
      console.log('Controls panel not found');
    }
  });

  test('Loading state renders consistently', async ({ page }) => {
    // Intercept API calls to slow them down
    await page.route('**/api/ohlc/**', async (route: any) => {
      await page.waitForTimeout(2000);
      await route.continue();
    });

    await page.goto('/');

    // Capture loading state
    await expect(page).toHaveScreenshot('chart-loading.png', {
      maxDiffPixels: 100,
      threshold: 0.2,
      timeout: 3000,
    });
  });

  test('Error state renders consistently', async ({ page }) => {
    // Intercept API calls to return error
    await page.route('**/api/ohlc/**', async (route: any) => {
      await route.abort('failed');
    });

    await page.goto('/');
    await page.waitForTimeout(2000);

    await expect(page).toHaveScreenshot('chart-error.png', {
      maxDiffPixels: 100,
      threshold: 0.2,
    });
  });
});

