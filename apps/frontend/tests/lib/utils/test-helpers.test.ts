import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  enableFeatureFlags,
  enableAllFeatureFlags,
  resetFeatureFlags,
  generateTestId,
  waitForStoreUpdate,
} from '@/lib/utils/test-helpers';

describe('test-helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetModules();
  });

  describe('generateTestId', () => {
    it('generates unique IDs with default prefix', () => {
      const id1 = generateTestId();
      const id2 = generateTestId();

      expect(id1).toMatch(/^test_\d+_[a-z0-9]+$/);
      expect(id2).toMatch(/^test_\d+_[a-z0-9]+$/);
      expect(id1).not.toBe(id2);
    });

    it('generates IDs with custom prefix', () => {
      const id = generateTestId('user');

      expect(id).toMatch(/^user_\d+_[a-z0-9]+$/);
    });

    it('generates IDs with timestamp component', () => {
      const before = Date.now();
      const id = generateTestId();
      const after = Date.now();

      const parts = id.split('_');
      const timestamp = parseInt(parts[1], 10);

      expect(timestamp).toBeGreaterThanOrEqual(before);
      expect(timestamp).toBeLessThanOrEqual(after);
    });

    it('generates IDs with random suffix', () => {
      // Generate multiple IDs at roughly the same time
      const ids = Array.from({ length: 10 }, () => generateTestId());
      const suffixes = ids.map((id) => id.split('_')[2]);

      // All suffixes should be unique
      const uniqueSuffixes = new Set(suffixes);
      expect(uniqueSuffixes.size).toBe(10);
    });

    it('handles empty prefix', () => {
      const id = generateTestId('');

      expect(id).toMatch(/^_\d+_[a-z0-9]+$/);
    });

    it('handles special characters in prefix', () => {
      const id = generateTestId('my-component');

      expect(id).toMatch(/^my-component_\d+_[a-z0-9]+$/);
    });
  });

  describe('waitForStoreUpdate', () => {
    it('resolves after specified delay', async () => {
      const start = Date.now();
      await waitForStoreUpdate(100);
      const elapsed = Date.now() - start;

      expect(elapsed).toBeGreaterThanOrEqual(90); // Allow some tolerance
      expect(elapsed).toBeLessThan(200);
    });

    it('resolves immediately with default (0ms) delay', async () => {
      const start = Date.now();
      await waitForStoreUpdate();
      const elapsed = Date.now() - start;

      expect(elapsed).toBeLessThan(50);
    });

    it('resolves immediately with explicit 0ms delay', async () => {
      const start = Date.now();
      await waitForStoreUpdate(0);
      const elapsed = Date.now() - start;

      expect(elapsed).toBeLessThan(50);
    });

    it('returns a Promise', () => {
      const result = waitForStoreUpdate(10);

      expect(result).toBeInstanceOf(Promise);
    });

    it('can be used with async/await', async () => {
      let executed = false;

      await waitForStoreUpdate(10);
      executed = true;

      expect(executed).toBe(true);
    });

    it('can be chained with .then()', async () => {
      let executed = false;

      await waitForStoreUpdate(10).then(() => {
        executed = true;
      });

      expect(executed).toBe(true);
    });
  });

  describe('feature flag helpers', () => {
    // Note: These functions use vi.mock which has module-level effects
    // Testing them fully requires careful module isolation

    describe('enableFeatureFlags', () => {
      it('is a function', () => {
        expect(typeof enableFeatureFlags).toBe('function');
      });

      it('accepts partial flag objects', () => {
        // Should not throw
        expect(() => {
          enableFeatureFlags({ monitoring: true });
        }).not.toThrow();
      });

      it('accepts empty object', () => {
        // Should not throw
        expect(() => {
          enableFeatureFlags({});
        }).not.toThrow();
      });

      it('accepts multiple flags', () => {
        // Should not throw
        expect(() => {
          enableFeatureFlags({
            monitoring: true,
            social: true,
            watchlist: false,
          });
        }).not.toThrow();
      });
    });

    describe('enableAllFeatureFlags', () => {
      it('is a function', () => {
        expect(typeof enableAllFeatureFlags).toBe('function');
      });

      it('can be called without arguments', () => {
        // Should not throw
        expect(() => {
          enableAllFeatureFlags();
        }).not.toThrow();
      });
    });

    describe('resetFeatureFlags', () => {
      it('is a function', () => {
        expect(typeof resetFeatureFlags).toBe('function');
      });

      it('can be called without arguments', () => {
        // Should not throw
        expect(() => {
          resetFeatureFlags();
        }).not.toThrow();
      });

      it('calls vi.resetModules', () => {
        const resetModulesSpy = vi.spyOn(vi, 'resetModules');

        resetFeatureFlags();

        expect(resetModulesSpy).toHaveBeenCalled();

        resetModulesSpy.mockRestore();
      });
    });
  });

  describe('integration patterns', () => {
    it('generateTestId can be used in test setup', () => {
      const testUserId = generateTestId('user');
      const testConfigId = generateTestId('config');

      expect(testUserId).not.toBe(testConfigId);
      expect(testUserId.startsWith('user_')).toBe(true);
      expect(testConfigId.startsWith('config_')).toBe(true);
    });

    it('waitForStoreUpdate can be used after state changes', async () => {
      // Simulate a state change
      let stateValue = 'initial';
      setTimeout(() => {
        stateValue = 'updated';
      }, 10);

      expect(stateValue).toBe('initial');

      await waitForStoreUpdate(20);

      expect(stateValue).toBe('updated');
    });
  });
});
