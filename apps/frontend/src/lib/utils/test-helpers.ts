import { vi } from 'vitest';
import type { FeatureFlags } from './featureFlags';

/**
 * Test utility to enable specific feature flags for testing
 * All Sprint 2 stores (Sessions 15-24) are gated behind feature flags
 * that are OFF by default. This utility mocks the FLAGS object to
 * enable specific features during tests.
 * 
 * Usage:
 * ```typescript
 * import { enableFeatureFlags } from '@/lib/utils/test-helpers';
 * 
 * beforeEach(() => {
 *   enableFeatureFlags({ monitoring: true, social: true });
 * });
 * ```
 */

const DEFAULT_TEST_FLAGS: FeatureFlags = {
  multiChart: false,
  watchlist: false,
  screener: false,
  corpActions: false,
  templates: false,
  imgExport: false,
  alertsV2: false,
  backtester: false,
  providerReliability: false,
  social: false,
  paperTrading: false,
  observability: false,
  mobileA11y: false,
  performance: false,
  monitoring: false,
  rollback: false,
  progressiveDeployment: false,
  environmentManagement: false,
  configurationSync: false,
  integrationTesting: false,
  otel: false,
  visualRegression: false,
  firstRunTour: false,
};

/**
 * Enable specific feature flags for testing
 * @param flags Partial feature flags object with features to enable
 */
export function enableFeatureFlags(flags: Partial<FeatureFlags>): void {
  // Mock the feature flags module
  vi.mock('@/lib/utils/featureFlags', () => ({
    FLAGS: new Proxy(DEFAULT_TEST_FLAGS, {
      get(_target, prop: keyof FeatureFlags) {
        return flags[prop] ?? false;
      }
    }),
    setRemoteFlags: vi.fn(),
  }));
}

/**
 * Enable all feature flags for comprehensive testing
 * Useful for integration tests that need all features enabled
 */
export function enableAllFeatureFlags(): void {
  const allEnabled: FeatureFlags = Object.keys(DEFAULT_TEST_FLAGS).reduce(
    (acc, key) => ({ ...acc, [key]: true }),
    {} as FeatureFlags
  );
  
  enableFeatureFlags(allEnabled);
}

/**
 * Reset feature flags to default (all OFF)
 * Call this in afterEach() to clean up test state
 */
export function resetFeatureFlags(): void {
  vi.resetModules();
}

/**
 * Generate a unique ID for testing
 * Matches the pattern used in stores: `{prefix}_{timestamp}_{random}`
 */
export function generateTestId(prefix = 'test'): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Wait for async state updates in Zustand stores
 * Useful when testing async actions
 */
export function waitForStoreUpdate(ms = 0): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
