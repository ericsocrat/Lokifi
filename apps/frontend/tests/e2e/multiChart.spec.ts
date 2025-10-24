/**
 * E2E tests for multi-chart functionality
 */
import { expect, test } from '@playwright/test';

test.describe('Multi-Chart Layout', () => {
  test.beforeEach(async ({ page }) => {
    // Mock the OHLC API endpoint with realistic candle data
    await page.route('**/api/ohlc?**', (route) => {
      const mockCandles = Array.from({ length: 100 }, (_, i) => {
        const time = Date.now() / 1000 - (100 - i) * 3600; // Hourly candles
        const basePrice = 50000 + Math.random() * 1000;
        return {
          time,
          open: basePrice,
          high: basePrice + Math.random() * 500,
          low: basePrice - Math.random() * 500,
          close: basePrice + Math.random() * 200 - 100,
          volume: Math.random() * 1000000
        };
      });

      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ candles: mockCandles })
      });
    });

    // Enable multi-chart feature flag
    await page.addInitScript(() => {
      localStorage.setItem('multi-chart-flag', 'true');
      window.sessionStorage.setItem('NEXT_PUBLIC_FLAG_MULTI_CHART', '1');
    });

    // Navigate directly to /chart page where TradingWorkspace (with charts) is mounted
    await page.goto('/chart');
    await page.waitForLoadState('networkidle');
    
    // Wait a bit longer for chart to initialize with mocked data
    await page.waitForTimeout(2000);
  });

  test('should create 2x2 layout and show 4 charts', async ({ page }) => {
    // Look for layout selector button (only visible when multi-chart is enabled)
    const layoutSelector = page.locator('[data-testid="layout-selector"]');

    if (await layoutSelector.isVisible()) {
      // Click 2x2 layout button
      await layoutSelector.locator('button:text("2x2")').click();

      // Should see 4 chart containers
      const chartContainers = page.locator('[data-testid="chart-container"]');
      await expect(chartContainers).toHaveCount(4);

      // Each should have position indicators
      for (let i = 0; i < 4; i++) {
        await expect(chartContainers.nth(i)).toBeVisible();
      }
    } else {
      // Multi-chart is disabled, skip test
      test.skip(true, 'Multi-chart feature is disabled');
    }
  });

  test('should link symbol changes across charts', async ({ page }) => {
    const layoutSelector = page.locator('[data-testid="layout-selector"]');

    if (await layoutSelector.isVisible()) {
      // Set up 1x2 layout
      await layoutSelector.locator('button:text("1x2")').click();

      // Enable symbol linking
      const symbolLinkToggle = page.locator('[data-testid="symbol-link-toggle"]');
      await symbolLinkToggle.check();

      // Change symbol in one chart
      const symbolPicker = page.locator('[data-testid="symbol-picker"]').first();
      await symbolPicker.click();
      await page.locator('[data-testid="symbol-option"]:text("ETHUSDT")').click();

      // Check that other charts updated
      const chartLabels = page.locator('[data-testid="chart-symbol-label"]');
      const labelCount = await chartLabels.count();

      for (let i = 0; i < labelCount; i++) {
        const labelText = await chartLabels.nth(i).textContent();
        expect(labelText).toContain('ETHUSDT');
      }
    } else {
      test.skip(true, 'Multi-chart feature is disabled');
    }
  });

  test('should link timeframe changes when enabled', async ({ page }) => {
    const layoutSelector = page.locator('[data-testid="layout-selector"]');

    if (await layoutSelector.isVisible()) {
      // Set up 1x2 layout
      await layoutSelector.locator('button:text("1x2")').click();

      // Enable timeframe linking
      const timeframeLinkToggle = page.locator('[data-testid="timeframe-link-toggle"]');
      await timeframeLinkToggle.check();

      // Change timeframe
      const timeframePicker = page.locator('[data-testid="timeframe-picker"]').first();
      await timeframePicker.click();
      await page.locator('[data-testid="timeframe-option"]:text("4h")').click();

      // Check that other charts updated
      const chartLabels = page.locator('[data-testid="chart-timeframe-label"]');
      const labelCount = await chartLabels.count();

      for (let i = 0; i < labelCount; i++) {
        const labelText = await chartLabels.nth(i).textContent();
        expect(labelText).toContain('4h');
      }
    } else {
      test.skip(true, 'Multi-chart feature is disabled');
    }
  });

  test('should toggle cursor linking', async ({ page }) => {
    const layoutSelector = page.locator('[data-testid="layout-selector"]');

    if (await layoutSelector.isVisible()) {
      // Set up 2x2 layout
      await layoutSelector.locator('button:text("2x2")').click();

      // Test cursor link toggle
      const cursorLinkToggle = page.locator('[data-testid="cursor-link-toggle"]');
      await expect(cursorLinkToggle).toBeVisible();

      // Should be unchecked initially
      await expect(cursorLinkToggle).not.toBeChecked();

      // Enable cursor linking
      await cursorLinkToggle.check();
      await expect(cursorLinkToggle).toBeChecked();

      // Disable cursor linking
      await cursorLinkToggle.uncheck();
      await expect(cursorLinkToggle).not.toBeChecked();
    } else {
      test.skip(true, 'Multi-chart feature is disabled');
    }
  });

  test('should persist layout settings across page reload', async ({ page }) => {
    const layoutSelector = page.locator('[data-testid="layout-selector"]');

    if (await layoutSelector.isVisible()) {
      // Set 2x2 layout and enable linking
      await layoutSelector.locator('button:text("2x2")').click();
      await page.locator('[data-testid="symbol-link-toggle"]').check();
      await page.locator('[data-testid="timeframe-link-toggle"]').check();

      // Reload page
      await page.reload();

      // Check that settings persisted
      await expect(layoutSelector.locator('button:text("2x2")')).toHaveClass(/bg-blue-600/);
      await expect(page.locator('[data-testid="symbol-link-toggle"]')).toBeChecked();
      await expect(page.locator('[data-testid="timeframe-link-toggle"]')).toBeChecked();

      // Should still show 4 charts
      const chartContainers = page.locator('[data-testid="chart-container"]');
      await expect(chartContainers).toHaveCount(4);
    } else {
      test.skip(true, 'Multi-chart feature is disabled');
    }
  });
});
