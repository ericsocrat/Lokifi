import {
  type FeatureFlags,
  FLAGS,
  getAllFlags,
  isFeatureEnabled,
  setDevFlag,
  setRemoteFlags,
} from '@/lib/utils/featureFlags';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('featureFlags utilities', () => {
  const originalEnv = process.env;
  const originalNodeEnv = process.env.NODE_ENV;

  beforeEach(() => {
    // Reset environment variables
    vi.resetModules();
    process.env = { ...originalEnv };

    // Clear remote flags before each test
    setRemoteFlags({});
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
    process.env.NODE_ENV = originalNodeEnv;
    setRemoteFlags({});
  });

  describe('FLAGS proxy', () => {
    it('should return false for all flags by default', () => {
      const flagKeys: (keyof FeatureFlags)[] = [
        'multiChart',
        'watchlist',
        'screener',
        'corpActions',
        'templates',
        'imgExport',
        'alertsV2',
        'backtester',
        'providerReliability',
        'social',
        'paperTrading',
        'observability',
        'mobileA11y',
        'performance',
        'monitoring',
        'rollback',
        'progressiveDeployment',
        'environmentManagement',
        'configurationSync',
        'integrationTesting',
        'otel',
        'visualRegression',
        'firstRunTour',
      ];

      flagKeys.forEach((key) => {
        expect(FLAGS[key]).toBe(false);
      });
    });

    it('should allow accessing flags as object properties', () => {
      expect(typeof FLAGS.multiChart).toBe('boolean');
      expect(typeof FLAGS.watchlist).toBe('boolean');
      expect(typeof FLAGS.screener).toBe('boolean');
    });

    it('should prioritize remote flags over defaults', () => {
      setRemoteFlags({ multiChart: true });
      expect(FLAGS.multiChart).toBe(true);
    });

    it('should handle multiple remote flags', () => {
      setRemoteFlags({
        multiChart: true,
        watchlist: true,
        screener: false,
      });

      expect(FLAGS.multiChart).toBe(true);
      expect(FLAGS.watchlist).toBe(true);
      expect(FLAGS.screener).toBe(false);
    });

    it('should fall back to default when remote flag is undefined', () => {
      setRemoteFlags({ multiChart: true });

      expect(FLAGS.multiChart).toBe(true);
      expect(FLAGS.watchlist).toBe(false); // Not set remotely, uses default
    });

    it('should handle clearing remote flags', () => {
      setRemoteFlags({ multiChart: true });
      expect(FLAGS.multiChart).toBe(true);

      setRemoteFlags({});
      expect(FLAGS.multiChart).toBe(false);
    });

    it('should handle partial remote flag updates', () => {
      setRemoteFlags({ multiChart: true, watchlist: true });
      expect(FLAGS.multiChart).toBe(true);
      expect(FLAGS.watchlist).toBe(true);

      setRemoteFlags({ screener: true });
      expect(FLAGS.screener).toBe(true);
      // Previous flags are replaced, not merged
      expect(FLAGS.multiChart).toBe(false);
    });
  });

  describe('setRemoteFlags', () => {
    it('should set single remote flag', () => {
      setRemoteFlags({ multiChart: true });
      expect(FLAGS.multiChart).toBe(true);
    });

    it('should set multiple remote flags', () => {
      setRemoteFlags({
        multiChart: true,
        watchlist: false,
        screener: true,
      });

      expect(FLAGS.multiChart).toBe(true);
      expect(FLAGS.watchlist).toBe(false);
      expect(FLAGS.screener).toBe(true);
    });

    it('should override existing remote flags', () => {
      setRemoteFlags({ multiChart: true });
      expect(FLAGS.multiChart).toBe(true);

      setRemoteFlags({ multiChart: false });
      expect(FLAGS.multiChart).toBe(false);
    });

    it('should handle empty object', () => {
      setRemoteFlags({});
      expect(FLAGS.multiChart).toBe(false);
    });

    it('should handle setting all flags', () => {
      const allFlags: Partial<FeatureFlags> = {
        multiChart: true,
        watchlist: true,
        screener: true,
        corpActions: true,
        templates: true,
        imgExport: true,
        alertsV2: true,
        backtester: true,
        providerReliability: true,
        social: true,
        paperTrading: true,
        observability: true,
        mobileA11y: true,
        performance: true,
        monitoring: true,
        rollback: true,
        progressiveDeployment: true,
        environmentManagement: true,
        configurationSync: true,
        integrationTesting: true,
        otel: true,
        visualRegression: true,
        firstRunTour: true,
      };

      setRemoteFlags(allFlags);

      Object.keys(allFlags).forEach((key) => {
        expect(FLAGS[key as keyof FeatureFlags]).toBe(true);
      });
    });
  });

  describe('isFeatureEnabled', () => {
    it('should return false for disabled flags', () => {
      expect(isFeatureEnabled('multiChart')).toBe(false);
      expect(isFeatureEnabled('watchlist')).toBe(false);
    });

    it('should return true for enabled flags', () => {
      setRemoteFlags({ multiChart: true });
      expect(isFeatureEnabled('multiChart')).toBe(true);
    });

    it('should check multiple flags', () => {
      setRemoteFlags({
        multiChart: true,
        watchlist: false,
        screener: true,
      });

      expect(isFeatureEnabled('multiChart')).toBe(true);
      expect(isFeatureEnabled('watchlist')).toBe(false);
      expect(isFeatureEnabled('screener')).toBe(true);
    });

    it('should work with all flag types', () => {
      const flagKeys: (keyof FeatureFlags)[] = [
        'multiChart',
        'watchlist',
        'screener',
        'corpActions',
        'templates',
        'imgExport',
        'alertsV2',
        'backtester',
      ];

      flagKeys.forEach((key) => {
        expect(typeof isFeatureEnabled(key)).toBe('boolean');
      });
    });

    it('should update when remote flags change', () => {
      expect(isFeatureEnabled('multiChart')).toBe(false);

      setRemoteFlags({ multiChart: true });
      expect(isFeatureEnabled('multiChart')).toBe(true);

      setRemoteFlags({ multiChart: false });
      expect(isFeatureEnabled('multiChart')).toBe(false);
    });
  });

  describe('getAllFlags', () => {
    it('should return all flags with default values', () => {
      const allFlags = getAllFlags();

      expect(allFlags).toBeDefined();
      expect(typeof allFlags).toBe('object');
      expect(allFlags.multiChart).toBe(false);
      expect(allFlags.watchlist).toBe(false);
      expect(allFlags.screener).toBe(false);
    });

    it('should return all flags with mixed values', () => {
      setRemoteFlags({
        multiChart: true,
        watchlist: false,
        screener: true,
      });

      const allFlags = getAllFlags();

      expect(allFlags.multiChart).toBe(true);
      expect(allFlags.watchlist).toBe(false);
      expect(allFlags.screener).toBe(true);
    });

    it('should include all 23 flags', () => {
      const allFlags = getAllFlags();
      const flagKeys = Object.keys(allFlags);

      expect(flagKeys.length).toBeGreaterThanOrEqual(23);
      expect(flagKeys).toContain('multiChart');
      expect(flagKeys).toContain('watchlist');
      expect(flagKeys).toContain('screener');
      expect(flagKeys).toContain('corpActions');
      expect(flagKeys).toContain('templates');
      expect(flagKeys).toContain('imgExport');
      expect(flagKeys).toContain('alertsV2');
      expect(flagKeys).toContain('backtester');
      expect(flagKeys).toContain('providerReliability');
      expect(flagKeys).toContain('social');
      expect(flagKeys).toContain('paperTrading');
      expect(flagKeys).toContain('observability');
      expect(flagKeys).toContain('mobileA11y');
      expect(flagKeys).toContain('performance');
      expect(flagKeys).toContain('monitoring');
      expect(flagKeys).toContain('rollback');
      expect(flagKeys).toContain('progressiveDeployment');
      expect(flagKeys).toContain('environmentManagement');
      expect(flagKeys).toContain('configurationSync');
      expect(flagKeys).toContain('integrationTesting');
      expect(flagKeys).toContain('otel');
      expect(flagKeys).toContain('visualRegression');
      expect(flagKeys).toContain('firstRunTour');
    });

    it('should return a new object each time', () => {
      const flags1 = getAllFlags();
      const flags2 = getAllFlags();

      expect(flags1).not.toBe(flags2);
      expect(flags1).toEqual(flags2);
    });

    it('should reflect current state of remote flags', () => {
      const before = getAllFlags();
      expect(before.multiChart).toBe(false);

      setRemoteFlags({ multiChart: true });

      const after = getAllFlags();
      expect(after.multiChart).toBe(true);
    });
  });

  describe('setDevFlag', () => {
    it('should set flag in development environment', () => {
      process.env.NODE_ENV = 'development';

      setDevFlag('multiChart', true);
      expect(FLAGS.multiChart).toBe(true);
    });

    it('should set flag in test environment', () => {
      process.env.NODE_ENV = 'test';

      setDevFlag('multiChart', true);
      expect(FLAGS.multiChart).toBe(true);
    });

    it('should not set flag in production environment', () => {
      process.env.NODE_ENV = 'production';

      setDevFlag('multiChart', true);
      // Should remain false in production
      expect(FLAGS.multiChart).toBe(false);
    });

    it('should handle multiple dev flags', () => {
      process.env.NODE_ENV = 'development';

      setDevFlag('multiChart', true);
      setDevFlag('watchlist', true);
      setDevFlag('screener', false);

      expect(FLAGS.multiChart).toBe(true);
      expect(FLAGS.watchlist).toBe(true);
      expect(FLAGS.screener).toBe(false);
    });

    it('should override remote flags in dev mode', () => {
      process.env.NODE_ENV = 'development';

      setRemoteFlags({ multiChart: false });
      setDevFlag('multiChart', true);

      expect(FLAGS.multiChart).toBe(true);
    });

    it('should allow toggling flags in dev mode', () => {
      process.env.NODE_ENV = 'development';

      setDevFlag('multiChart', true);
      expect(FLAGS.multiChart).toBe(true);

      setDevFlag('multiChart', false);
      expect(FLAGS.multiChart).toBe(false);
    });
  });

  describe('integration scenarios', () => {
    it('should support conditional feature rendering', () => {
      const renderFeature = (flag: keyof FeatureFlags) => {
        return isFeatureEnabled(flag) ? 'Feature Enabled' : 'Feature Disabled';
      };

      expect(renderFeature('multiChart')).toBe('Feature Disabled');

      setRemoteFlags({ multiChart: true });
      expect(renderFeature('multiChart')).toBe('Feature Enabled');
    });

    it('should support multiple feature checks', () => {
      setRemoteFlags({
        multiChart: true,
        watchlist: true,
        screener: false,
      });

      const enabledFeatures = (Object.keys(getAllFlags()) as (keyof FeatureFlags)[]).filter((key) =>
        isFeatureEnabled(key)
      );

      expect(enabledFeatures).toContain('multiChart');
      expect(enabledFeatures).toContain('watchlist');
      expect(enabledFeatures).not.toContain('screener');
    });

    it('should support dynamic flag updates', () => {
      const checkFlag = () => FLAGS.multiChart;

      expect(checkFlag()).toBe(false);

      setRemoteFlags({ multiChart: true });
      expect(checkFlag()).toBe(true);

      setRemoteFlags({ multiChart: false });
      expect(checkFlag()).toBe(false);
    });

    it('should support gradual rollout simulation', () => {
      // Initial state: all off
      expect(FLAGS.multiChart).toBe(false);
      expect(FLAGS.watchlist).toBe(false);

      // Phase 1: Enable first feature
      setRemoteFlags({ multiChart: true });
      expect(FLAGS.multiChart).toBe(true);
      expect(FLAGS.watchlist).toBe(false);

      // Phase 2: Enable second feature
      setRemoteFlags({ multiChart: true, watchlist: true });
      expect(FLAGS.multiChart).toBe(true);
      expect(FLAGS.watchlist).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('should handle accessing undefined flag keys gracefully', () => {
      // TypeScript prevents this, but runtime should handle it
      const unknownFlag = 'unknownFeature' as keyof FeatureFlags;
      expect(FLAGS[unknownFlag]).toBeUndefined();
    });

    it('should handle null remote flags', () => {
      setRemoteFlags(null as any);
      expect(FLAGS.multiChart).toBe(false);
    });

    it('should handle remote flags with extra properties', () => {
      setRemoteFlags({
        multiChart: true,
        extraProperty: true as any,
      });

      expect(FLAGS.multiChart).toBe(true);
    });

    it('should handle rapid flag changes', () => {
      for (let i = 0; i < 100; i++) {
        setRemoteFlags({ multiChart: i % 2 === 0 });
        expect(FLAGS.multiChart).toBe(i % 2 === 0);
      }
    });

    it('should handle all flags being enabled', () => {
      const allEnabled: Partial<FeatureFlags> = {};
      Object.keys(getAllFlags()).forEach((key) => {
        allEnabled[key as keyof FeatureFlags] = true;
      });

      setRemoteFlags(allEnabled);

      const flags = getAllFlags();
      Object.values(flags).forEach((value) => {
        expect(value).toBe(true);
      });
    });
  });

  describe('type safety', () => {
    it('should enforce FeatureFlags type', () => {
      const flags: FeatureFlags = getAllFlags();

      // TypeScript ensures these properties exist
      const _multiChart: boolean = flags.multiChart;
      const _watchlist: boolean = flags.watchlist;
      const _screener: boolean = flags.screener;

      expect(typeof _multiChart).toBe('boolean');
      expect(typeof _watchlist).toBe('boolean');
      expect(typeof _screener).toBe('boolean');
    });

    it('should allow typed flag checks', () => {
      const flagKey: keyof FeatureFlags = 'multiChart';
      const isEnabled: boolean = isFeatureEnabled(flagKey);

      expect(typeof isEnabled).toBe('boolean');
    });

    it('should support exhaustive flag checks', () => {
      const checkAllFlags = () => {
        const flags = getAllFlags();
        const results: Record<keyof FeatureFlags, boolean> = {} as any;

        (Object.keys(flags) as (keyof FeatureFlags)[]).forEach((key) => {
          results[key] = flags[key];
        });

        return results;
      };

      const results = checkAllFlags();
      expect(typeof results.multiChart).toBe('boolean');
      expect(typeof results.watchlist).toBe('boolean');
    });
  });
});
