/**
 * Visual Regression Tests - Components
 *
 * Phase 1.6 Task 3: Visual Regression Testing
 *
 * Tests the visual appearance of UI components to detect unintended changes.
 * These tests capture screenshots and compare them against baseline images.
 *
 * Usage:
 * - Run locally: npm run test:visual
 * - Update baselines: npm run test:visual:update
 * - Interactive UI: npm run test:visual:ui
 * - In CI/CD: Add 'visual-test' label to PR
 */

import { expect, test } from '@playwright/test';

test.describe('Component Visual Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Wait for page to be fully loaded
    await page.waitForLoadState('networkidle');
  });

  test('Home page - Desktop', async ({ page }) => {
    await page.goto('/');

    // Wait for key elements to be visible
    await page.waitForSelector('body', { state: 'visible' });

    // Take full page screenshot
    await expect(page).toHaveScreenshot('home-page-desktop.png', {
      fullPage: true,
    });
  });

  test('Home page - Above the fold', async ({ page }) => {
    await page.goto('/');

    // Wait for key elements
    await page.waitForSelector('body', { state: 'visible' });

    // Take viewport screenshot (above the fold)
    await expect(page).toHaveScreenshot('home-page-hero.png');
  });

  test('Navigation - Header', async ({ page }) => {
    await page.goto('/');

    // Wait for navigation to be visible
    const nav = await page.locator('nav, header').first();
    await nav.waitFor({ state: 'visible' });

    // Screenshot just the navigation
    await expect(nav).toHaveScreenshot('navigation-header.png');
  });

  test('Buttons - Primary button', async ({ page }) => {
    await page.goto('/');

    // Find the first visible button
    const button = page.locator('button').first();

    if (await button.isVisible()) {
      await expect(button).toHaveScreenshot('button-primary.png');
    }
  });

  test('Links - Navigation link', async ({ page }) => {
    await page.goto('/');

    // Find the first visible link
    const link = page.locator('a').first();

    if (await link.isVisible()) {
      await expect(link).toHaveScreenshot('link-style.png');
    }
  });
});

test.describe('Form Components', () => {
  test('Input field - First visible', async ({ page }) => {
    await page.goto('/');

    // Find first input field
    const input = page.locator('input').first();

    if (await input.isVisible()) {
      await expect(input).toHaveScreenshot('input-field.png');
    }
  });

  test('Text area - First visible', async ({ page }) => {
    await page.goto('/');

    // Find first textarea
    const textarea = page.locator('textarea').first();

    if (await textarea.isVisible()) {
      await expect(textarea).toHaveScreenshot('textarea.png');
    }
  });
});

test.describe('Layout Components', () => {
  test('Page layout structure', async ({ page }) => {
    await page.goto('/');

    // Wait for body
    await page.waitForSelector('body', { state: 'visible' });

    // Take screenshot of main layout containers
    const main = await page.locator('main, #root, [role="main"]').first();

    if (await main.isVisible()) {
      await expect(main).toHaveScreenshot('main-layout.png');
    }
  });

  test('Responsive - Mobile viewport', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    await page.goto('/');
    await page.waitForSelector('body', { state: 'visible' });

    // Full page screenshot in mobile
    await expect(page).toHaveScreenshot('mobile-viewport.png', {
      fullPage: true,
    });
  });

  test('Responsive - Tablet viewport', async ({ page }) => {
    // Set tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });

    await page.goto('/');
    await page.waitForSelector('body', { state: 'visible' });

    // Full page screenshot in tablet
    await expect(page).toHaveScreenshot('tablet-viewport.png', {
      fullPage: true,
    });
  });
});
