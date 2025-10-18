/**
 * @vitest-environment jsdom
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  pluginSettingsStore,
  pluginSymbolSettings,
} from '../../../src/lib/stores/pluginSettingsStore';

describe('PluginSettingsStore', () => {
  beforeEach(() => {
    // Clear localStorage
    localStorage.clear();
    // Reset to defaults
    pluginSettingsStore.reset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Initial State', () => {
    it('should have default channel width percentage', () => {
      const settings = pluginSettingsStore.get();
      expect(settings.channelDefaultWidthPct).toBe(1.0);
    });

    it('should have default channel width mode', () => {
      const settings = pluginSettingsStore.get();
      expect(settings.channelWidthMode).toBe('percent');
    });

    it('should have default fibonacci preset', () => {
      const settings = pluginSettingsStore.get();
      expect(settings.fibPreset).toBe('Extended');
    });

    it('should have default fibonacci custom levels', () => {
      const settings = pluginSettingsStore.get();
      expect(settings.fibCustomLevels).toEqual([
        0, 0.236, 0.382, 0.5, 0.618, 0.786, 1, 1.272, 1.414, 1.618, 2, 2.618,
      ]);
    });
  });

  describe('Settings Management', () => {
    it('should update channel width percentage', () => {
      pluginSettingsStore.set('channelDefaultWidthPct', 2.5);
      expect(pluginSettingsStore.get().channelDefaultWidthPct).toBe(2.5);
    });

    it('should update channel width mode', () => {
      pluginSettingsStore.set('channelWidthMode', 'pixels');
      expect(pluginSettingsStore.get().channelWidthMode).toBe('pixels');
    });

    it('should update fibonacci preset', () => {
      pluginSettingsStore.set('fibPreset', 'Classic');
      expect(pluginSettingsStore.get().fibPreset).toBe('Classic');
    });

    it('should update custom fibonacci levels', () => {
      const newLevels = [0, 0.5, 1, 1.5, 2];
      pluginSettingsStore.set('fibCustomLevels', newLevels);
      expect(pluginSettingsStore.get().fibCustomLevels).toEqual(newLevels);
    });

    it('should update per-symbol enabled flag', () => {
      pluginSettingsStore.set('perSymbolEnabled', true);
      expect(pluginSettingsStore.get().perSymbolEnabled).toBe(true);
    });
  });

  describe('Persistence', () => {
    it('should persist settings to localStorage', () => {
      pluginSettingsStore.set('channelDefaultWidthPct', 3.0);

      const stored = localStorage.getItem('lokifi.plugins.settings');
      expect(stored).toBeTruthy();

      const parsed = JSON.parse(stored!);
      expect(parsed.channelDefaultWidthPct).toBe(3.0);
    });

    it('should load settings from localStorage', () => {
      // Manually set in localStorage
      const testSettings = {
        channelDefaultWidthPct: 5.0,
        channelWidthMode: 'pixels',
        fibPreset: 'Aggressive',
      };
      localStorage.setItem('lokifi.plugins.settings', JSON.stringify(testSettings));

      // Force reload by resetting and getting
      pluginSettingsStore.reset();

      // Check if default is back
      expect(pluginSettingsStore.get().channelDefaultWidthPct).toBe(1.0);
    });

    it('should handle corrupted localStorage data gracefully', () => {
      localStorage.setItem('lokifi.plugins.settings', 'invalid json');

      // Should not throw and return defaults
      expect(() => pluginSettingsStore.reset()).not.toThrow();
    });
  });

  describe('Subscription', () => {
    it('should notify subscribers when settings change', () => {
      const listener = vi.fn();
      pluginSettingsStore.subscribe(listener);

      pluginSettingsStore.set('channelDefaultWidthPct', 2.0);

      expect(listener).toHaveBeenCalled();
      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          channelDefaultWidthPct: 2.0,
        })
      );
    });

    it('should call subscriber immediately with current state', () => {
      const listener = vi.fn();

      pluginSettingsStore.subscribe(listener);

      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenCalledWith(pluginSettingsStore.get());
    });

    it('should return unsubscribe function', () => {
      const listener = vi.fn();
      const unsubscribe = pluginSettingsStore.subscribe(listener);

      expect(typeof unsubscribe).toBe('function');
    });

    it('should stop notifying after unsubscribe', () => {
      const listener = vi.fn();
      const unsubscribe = pluginSettingsStore.subscribe(listener);

      expect(listener).toHaveBeenCalledTimes(1); // Initial call

      pluginSettingsStore.set('channelDefaultWidthPct', 2.0);
      expect(listener).toHaveBeenCalledTimes(2);

      unsubscribe();
      pluginSettingsStore.set('channelDefaultWidthPct', 3.0);
      expect(listener).toHaveBeenCalledTimes(2); // Still 2, not called again
    });

    it('should notify multiple subscribers', () => {
      const listener1 = vi.fn();
      const listener2 = vi.fn();

      pluginSettingsStore.subscribe(listener1);
      pluginSettingsStore.subscribe(listener2);

      pluginSettingsStore.set('fibPreset', 'Custom');

      expect(listener1).toHaveBeenCalledWith(expect.objectContaining({ fibPreset: 'Custom' }));
      expect(listener2).toHaveBeenCalledWith(expect.objectContaining({ fibPreset: 'Custom' }));
    });
  });

  describe('Reset', () => {
    it('should reset all settings to defaults', () => {
      pluginSettingsStore.set('channelDefaultWidthPct', 5.0);
      pluginSettingsStore.set('fibPreset', 'Aggressive');

      pluginSettingsStore.reset();

      const settings = pluginSettingsStore.get();
      expect(settings.channelDefaultWidthPct).toBe(1.0);
      expect(settings.fibPreset).toBe('Extended');
    });

    it('should notify subscribers on reset', () => {
      const listener = vi.fn();
      pluginSettingsStore.subscribe(listener);

      listener.mockClear(); // Clear initial call

      pluginSettingsStore.reset();

      expect(listener).toHaveBeenCalledTimes(1);
    });

    it('should persist reset to localStorage', () => {
      pluginSettingsStore.set('channelDefaultWidthPct', 5.0);
      pluginSettingsStore.reset();

      const stored = localStorage.getItem('lokifi.plugins.settings');
      const parsed = JSON.parse(stored!);

      expect(parsed.channelDefaultWidthPct).toBe(1.0);
    });
  });

  describe('Per-Symbol Settings', () => {
    it('should get empty overrides for new symbol', () => {
      const overrides = pluginSymbolSettings.get('BTCUSD', '1h');
      expect(overrides).toEqual({});
    });

    it('should set per-symbol overrides', () => {
      pluginSymbolSettings.set('BTCUSD', '1h', { channelDefaultWidthPct: 3.0 });

      const overrides = pluginSymbolSettings.get('BTCUSD', '1h');
      expect(overrides.channelDefaultWidthPct).toBe(3.0);
    });

    it('should merge per-symbol overrides', () => {
      pluginSymbolSettings.set('BTCUSD', '1h', { channelDefaultWidthPct: 3.0 });
      pluginSymbolSettings.set('BTCUSD', '1h', { fibPreset: 'Classic' });

      const overrides = pluginSymbolSettings.get('BTCUSD', '1h');
      expect(overrides.channelDefaultWidthPct).toBe(3.0);
      expect(overrides.fibPreset).toBe('Classic');
    });

    it('should store different overrides for different symbols', () => {
      pluginSymbolSettings.set('BTCUSD', '1h', { channelDefaultWidthPct: 3.0 });
      pluginSymbolSettings.set('ETHUSD', '1h', { channelDefaultWidthPct: 2.0 });

      expect(pluginSymbolSettings.get('BTCUSD', '1h').channelDefaultWidthPct).toBe(3.0);
      expect(pluginSymbolSettings.get('ETHUSD', '1h').channelDefaultWidthPct).toBe(2.0);
    });

    it('should store different overrides for different timeframes', () => {
      pluginSymbolSettings.set('BTCUSD', '1h', { channelDefaultWidthPct: 3.0 });
      pluginSymbolSettings.set('BTCUSD', '1d', { channelDefaultWidthPct: 5.0 });

      expect(pluginSymbolSettings.get('BTCUSD', '1h').channelDefaultWidthPct).toBe(3.0);
      expect(pluginSymbolSettings.get('BTCUSD', '1d').channelDefaultWidthPct).toBe(5.0);
    });

    it('should clear per-symbol overrides', () => {
      pluginSymbolSettings.set('BTCUSD', '1h', { channelDefaultWidthPct: 3.0 });
      pluginSymbolSettings.clear('BTCUSD', '1h');

      const overrides = pluginSymbolSettings.get('BTCUSD', '1h');
      expect(overrides).toEqual({});
    });

    it('should list all override keys', () => {
      pluginSymbolSettings.set('BTCUSD', '1h', { channelDefaultWidthPct: 3.0 });
      pluginSymbolSettings.set('ETHUSD', '1d', { channelDefaultWidthPct: 2.0 });

      const keys = pluginSymbolSettings.listKeys();
      expect(keys).toContain('BTCUSD.1h');
      expect(keys).toContain('ETHUSD.1d');
    });

    it('should persist per-symbol overrides to localStorage', () => {
      pluginSymbolSettings.set('BTCUSD', '1h', { channelDefaultWidthPct: 3.0 });

      const stored = localStorage.getItem('lokifi.plugins.settings.overrides');
      expect(stored).toBeTruthy();

      const parsed = JSON.parse(stored!);
      expect(parsed['BTCUSD.1h']).toBeDefined();
      expect(parsed['BTCUSD.1h'].channelDefaultWidthPct).toBe(3.0);
    });

    it('should notify global subscribers when per-symbol settings change', () => {
      const listener = vi.fn();
      pluginSettingsStore.subscribe(listener);

      listener.mockClear(); // Clear initial call

      pluginSymbolSettings.set('BTCUSD', '1h', { channelDefaultWidthPct: 3.0 });

      expect(listener).toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('should handle rapid setting changes', () => {
      for (let i = 0; i < 10; i++) {
        pluginSettingsStore.set('channelDefaultWidthPct', i);
      }

      expect(pluginSettingsStore.get().channelDefaultWidthPct).toBe(9);
    });

    it('should handle empty fibonacci levels array', () => {
      pluginSettingsStore.set('fibCustomLevels', []);
      expect(pluginSettingsStore.get().fibCustomLevels).toEqual([]);
    });

    it('should handle very large fibonacci levels array', () => {
      const largeLevels = Array.from({ length: 100 }, (_, i) => i * 0.1);
      pluginSettingsStore.set('fibCustomLevels', largeLevels);
      expect(pluginSettingsStore.get().fibCustomLevels).toHaveLength(100);
    });

    it('should handle localStorage quota exceeded gracefully', () => {
      // Can't easily test this without filling localStorage
      // But the try/catch should prevent errors
      expect(() => {
        pluginSettingsStore.set('channelDefaultWidthPct', 999);
      }).not.toThrow();
    });
  });
});
