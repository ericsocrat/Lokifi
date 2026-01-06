import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('Feature Flags', () => {
  // Store original env values
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset modules to re-evaluate flags with new env values
    vi.resetModules();
    // Create a fresh copy of process.env
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    // Restore original env
    process.env = originalEnv;
  });

  describe('FEATURE_FLAGS object', () => {
    it('should export FEATURE_FLAGS object', async () => {
      const { FEATURE_FLAGS } = await import('./flags');
      expect(FEATURE_FLAGS).toBeDefined();
      expect(typeof FEATURE_FLAGS).toBe('object');
    });

    it('should have all expected feature flag keys', async () => {
      const { FEATURE_FLAGS } = await import('./flags');
      const expectedKeys = [
        'EXPERIMENTAL_PLUGINS',
        'MULTI_CHART_LAYOUT',
        'WATCHLIST_SCREENER',
        'SOCIAL_FEATURES',
        'PAPER_TRADING',
        'ADVANCED_ALERTS',
        'STRATEGY_BACKTESTER',
      ];

      expectedKeys.forEach((key) => {
        expect(FEATURE_FLAGS).toHaveProperty(key);
      });
    });

    it('should have boolean values for all flags', async () => {
      const { FEATURE_FLAGS } = await import('./flags');

      Object.values(FEATURE_FLAGS).forEach((value) => {
        expect(typeof value).toBe('boolean');
      });
    });
  });

  describe('EXPERIMENTAL_PLUGINS flag behavior', () => {
    it('should be enabled when env is not "false"', async () => {
      process.env.NEXT_PUBLIC_EXPERIMENTAL_PLUGINS = 'true';
      const { EXPERIMENTAL_PLUGINS } = await import('./flags');
      expect(EXPERIMENTAL_PLUGINS).toBe(true);
    });

    it('should be disabled when env is "false"', async () => {
      process.env.NEXT_PUBLIC_EXPERIMENTAL_PLUGINS = 'false';
      const { EXPERIMENTAL_PLUGINS } = await import('./flags');
      expect(EXPERIMENTAL_PLUGINS).toBe(false);
    });

    it('should default to true when env is not set', async () => {
      delete process.env.NEXT_PUBLIC_EXPERIMENTAL_PLUGINS;
      const { EXPERIMENTAL_PLUGINS } = await import('./flags');
      expect(EXPERIMENTAL_PLUGINS).toBe(true);
    });
  });

  describe('FEATURE_FLAGS.EXPERIMENTAL_PLUGINS behavior', () => {
    it('should be true when env is "true"', async () => {
      process.env.NEXT_PUBLIC_FEATURE_EXPERIMENTAL_PLUGINS = 'true';
      const { FEATURE_FLAGS } = await import('./flags');
      expect(FEATURE_FLAGS.EXPERIMENTAL_PLUGINS).toBe(true);
    });

    it('should be false when env is not "true"', async () => {
      process.env.NEXT_PUBLIC_FEATURE_EXPERIMENTAL_PLUGINS = 'false';
      const { FEATURE_FLAGS } = await import('./flags');
      expect(FEATURE_FLAGS.EXPERIMENTAL_PLUGINS).toBe(false);
    });

    it('should be false when env is undefined', async () => {
      delete process.env.NEXT_PUBLIC_FEATURE_EXPERIMENTAL_PLUGINS;
      const { FEATURE_FLAGS } = await import('./flags');
      expect(FEATURE_FLAGS.EXPERIMENTAL_PLUGINS).toBe(false);
    });
  });

  describe('FEATURE_FLAGS.MULTI_CHART_LAYOUT behavior', () => {
    it('should be true when env is "true"', async () => {
      process.env.NEXT_PUBLIC_FEATURE_MULTI_CHART = 'true';
      const { FEATURE_FLAGS } = await import('./flags');
      expect(FEATURE_FLAGS.MULTI_CHART_LAYOUT).toBe(true);
    });

    it('should be false when env is not "true"', async () => {
      delete process.env.NEXT_PUBLIC_FEATURE_MULTI_CHART;
      const { FEATURE_FLAGS } = await import('./flags');
      expect(FEATURE_FLAGS.MULTI_CHART_LAYOUT).toBe(false);
    });
  });

  describe('FEATURE_FLAGS.WATCHLIST_SCREENER behavior', () => {
    it('should be true when env is "true"', async () => {
      process.env.NEXT_PUBLIC_FEATURE_WATCHLIST = 'true';
      const { FEATURE_FLAGS } = await import('./flags');
      expect(FEATURE_FLAGS.WATCHLIST_SCREENER).toBe(true);
    });

    it('should be false when env is not "true"', async () => {
      delete process.env.NEXT_PUBLIC_FEATURE_WATCHLIST;
      const { FEATURE_FLAGS } = await import('./flags');
      expect(FEATURE_FLAGS.WATCHLIST_SCREENER).toBe(false);
    });
  });

  describe('FEATURE_FLAGS.SOCIAL_FEATURES behavior', () => {
    it('should be true when env is "true"', async () => {
      process.env.NEXT_PUBLIC_FEATURE_SOCIAL = 'true';
      const { FEATURE_FLAGS } = await import('./flags');
      expect(FEATURE_FLAGS.SOCIAL_FEATURES).toBe(true);
    });

    it('should be false when env is not "true"', async () => {
      delete process.env.NEXT_PUBLIC_FEATURE_SOCIAL;
      const { FEATURE_FLAGS } = await import('./flags');
      expect(FEATURE_FLAGS.SOCIAL_FEATURES).toBe(false);
    });
  });

  describe('FEATURE_FLAGS.PAPER_TRADING behavior', () => {
    it('should be true when env is "true"', async () => {
      process.env.NEXT_PUBLIC_FEATURE_PAPER_TRADING = 'true';
      const { FEATURE_FLAGS } = await import('./flags');
      expect(FEATURE_FLAGS.PAPER_TRADING).toBe(true);
    });

    it('should be false when env is not "true"', async () => {
      delete process.env.NEXT_PUBLIC_FEATURE_PAPER_TRADING;
      const { FEATURE_FLAGS } = await import('./flags');
      expect(FEATURE_FLAGS.PAPER_TRADING).toBe(false);
    });
  });

  describe('FEATURE_FLAGS.ADVANCED_ALERTS behavior', () => {
    it('should be true when env is "true"', async () => {
      process.env.NEXT_PUBLIC_FEATURE_ADVANCED_ALERTS = 'true';
      const { FEATURE_FLAGS } = await import('./flags');
      expect(FEATURE_FLAGS.ADVANCED_ALERTS).toBe(true);
    });

    it('should be false when env is not "true"', async () => {
      delete process.env.NEXT_PUBLIC_FEATURE_ADVANCED_ALERTS;
      const { FEATURE_FLAGS } = await import('./flags');
      expect(FEATURE_FLAGS.ADVANCED_ALERTS).toBe(false);
    });
  });

  describe('FEATURE_FLAGS.STRATEGY_BACKTESTER behavior', () => {
    it('should be true when env is "true"', async () => {
      process.env.NEXT_PUBLIC_FEATURE_BACKTESTER = 'true';
      const { FEATURE_FLAGS } = await import('./flags');
      expect(FEATURE_FLAGS.STRATEGY_BACKTESTER).toBe(true);
    });

    it('should be false when env is not "true"', async () => {
      delete process.env.NEXT_PUBLIC_FEATURE_BACKTESTER;
      const { FEATURE_FLAGS } = await import('./flags');
      expect(FEATURE_FLAGS.STRATEGY_BACKTESTER).toBe(false);
    });
  });

  describe('type safety', () => {
    it('FEATURE_FLAGS should have expected structure', async () => {
      const { FEATURE_FLAGS } = await import('./flags');
      // Verify FEATURE_FLAGS has the expected readonly structure (as const)
      // at compile time - runtime check just verifies it's an object with boolean values
      expect(typeof FEATURE_FLAGS).toBe('object');
      expect(FEATURE_FLAGS).not.toBeNull();

      // Verify all values are booleans (consistent with as const type)
      const values = Object.values(FEATURE_FLAGS);
      expect(values.length).toBeGreaterThan(0);
      values.forEach((v) => expect(typeof v).toBe('boolean'));
    });
  });
});
