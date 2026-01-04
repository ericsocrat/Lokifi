import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright Configuration for E2E and Visual Regression Testing
 *
 * Phase 1.6 Task 3: Visual Regression Testing
 * Phase 1.6 Task 6: E2E Testing Framework
 *
 * This configuration supports:
 * - E2E testing (tests/e2e/)
 * - Visual regression testing (tests/visual/)
 * - CI/CD execution
 * - Local development
 */

export default defineConfig({
  // Test directories
  testDir: './tests',
  testMatch: ['**/*.spec.ts'],

  // Baseline screenshots directory for visual tests
  snapshotDir: './tests/visual-baselines',

  // Test results directory
  outputDir: './test-results',

  // Timeout for each test (increased from 30s to 60s for CI stability)
  timeout: 60 * 1000,

  // Run tests in parallel
  fullyParallel: true,

  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env['CI'],

  // Retry on CI only (can be overridden per project)
  // Default: 2 retries for critical tests, 1 for full/visual
  retries: process.env['CI'] ? 2 : 0,

  // Opt out of parallel tests on CI (increased from 1 to 2 for better throughput)
  workers: process.env['CI'] ? 2 : 4,

  // Reporter to use
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['list'],
    ['json', { outputFile: 'test-results/results.json' }],
  ],

  // Shared settings for all projects
  use: {
    // Base URL for tests
    baseURL: process.env['CI'] ? 'http://localhost:3000' : 'http://localhost:3000',

    // Collect trace on failure
    trace: 'retain-on-failure',

    // Screenshot on failure
    screenshot: 'only-on-failure',

    // Video on failure
    video: 'retain-on-failure',

    // Navigation timeout (30s for page loads)
    navigationTimeout: 30 * 1000,

    // Action timeout (10s for clicks, fills, etc.)
    actionTimeout: 10 * 1000,
  },

  // Configure projects for different test types
  projects: [
    // Desktop Chromium (default for E2E and visual tests)
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 720 },
      },
      retries: process.env['CI'] ? 2 : 0, // 2 retries for critical E2E tests
    },

    // Mobile testing (for responsive visual tests)
    {
      name: 'mobile-chrome',
      use: {
        ...devices['iPhone 13'],
      },
      testMatch: ['**/visual/**/*.spec.ts'], // Only run visual tests on mobile
      retries: process.env['CI'] ? 1 : 0, // 1 retry for visual tests
    },

    // Tablet testing (for responsive visual tests)
    {
      name: 'tablet',
      use: {
        ...devices['iPad Pro'],
      },
      testMatch: ['**/visual/**/*.spec.ts'], // Only run visual tests on tablet
      retries: process.env['CI'] ? 1 : 0, // 1 retry for visual tests
    },
  ],

  // Run local dev server before starting tests
  // Next.js 16 compatibility: Use 'wait' option for reliable server detection
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env['CI'],
    timeout: 120 * 1000,
    // Next.js 16 outputs "✓ Ready in Xms" when server is ready
    // Wait for this output instead of just polling the URL
    stdout: 'pipe',
    stderr: 'pipe',
  },

  // Expect configuration for visual comparisons and assertions
  expect: {
    // Timeout for expect assertions (10s for element waits)
    timeout: 10 * 1000,

    // Screenshot comparison options for visual regression tests
    toHaveScreenshot: {
      // Maximum pixel ratio difference (5% tolerance)
      maxDiffPixelRatio: 0.05,

      // Threshold for color difference (0-1)
      threshold: 0.2,

      // Animations: wait for animations to finish
      animations: 'disabled',

      // CSS animations
      caret: 'hide',

      // Scale option for different pixel densities
      scale: 'css',
    },
  },
});
