/**
 * @fileoverview Comprehensive tests for pluginSettingsStore
 * Session 106: Small store tests for quick coverage wins
 *
 * Store: Plugin settings with localStorage persistence
 * Pattern: Module-level state with get/set/subscribe + localStorage
 * Features: Global settings + per-symbol overrides
 */

import { pluginSettingsStore, pluginSymbolSettings } from '@/lib/stores/pluginSettingsStore';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
    get length() {
      return Object.keys(store).length;
    },
    key: vi.fn((index: number) => Object.keys(store)[index] || null),
  };
})();

// Apply mock before imports would load
Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock });

describe('pluginSettingsStore', () => {
  beforeEach(() => {
    // Clear all mocks and localStorage
    vi.clearAllMocks();
    localStorageMock.clear();
    // Reset store to defaults
    pluginSettingsStore.reset();
  });

  describe('Initial State / Default Values', () => {
    it('should have default channelDefaultWidthPct of 1.0', () => {
      const settings = pluginSettingsStore.get();
      expect(settings.channelDefaultWidthPct).toBe(1.0);
    });

    it('should have default channelWidthMode of "percent"', () => {
      const settings = pluginSettingsStore.get();
      expect(settings.channelWidthMode).toBe('percent');
    });

    it('should have default fibPreset of "Extended"', () => {
      const settings = pluginSettingsStore.get();
      expect(settings.fibPreset).toBe('Extended');
    });

    it('should have default fibCustomLevels array', () => {
      const settings = pluginSettingsStore.get();
      expect(settings.fibCustomLevels).toEqual([
        0, 0.236, 0.382, 0.5, 0.618, 0.786, 1, 1.272, 1.414, 1.618, 2, 2.618,
      ]);
    });

    it('should have all required fields', () => {
      const settings = pluginSettingsStore.get();
      expect(settings).toHaveProperty('channelDefaultWidthPct');
      expect(settings).toHaveProperty('channelWidthMode');
      expect(settings).toHaveProperty('fibPreset');
      expect(settings).toHaveProperty('fibCustomLevels');
    });
  });

  describe('get()', () => {
    it('should return current settings object', () => {
      const settings = pluginSettingsStore.get();
      expect(typeof settings).toBe('object');
      expect(settings).not.toBeNull();
    });

    it('should reflect changes made via set()', () => {
      pluginSettingsStore.set('channelDefaultWidthPct', 2.5);
      expect(pluginSettingsStore.get().channelDefaultWidthPct).toBe(2.5);
    });
  });

  describe('set()', () => {
    it('should update channelDefaultWidthPct', () => {
      pluginSettingsStore.set('channelDefaultWidthPct', 3.0);
      expect(pluginSettingsStore.get().channelDefaultWidthPct).toBe(3.0);
    });

    it('should update channelWidthMode', () => {
      pluginSettingsStore.set('channelWidthMode', 'pixels');
      expect(pluginSettingsStore.get().channelWidthMode).toBe('pixels');
    });

    it('should update fibPreset', () => {
      pluginSettingsStore.set('fibPreset', 'Aggressive');
      expect(pluginSettingsStore.get().fibPreset).toBe('Aggressive');
    });

    it('should update fibCustomLevels', () => {
      const customLevels = [0, 0.25, 0.5, 0.75, 1];
      pluginSettingsStore.set('fibCustomLevels', customLevels);
      expect(pluginSettingsStore.get().fibCustomLevels).toEqual(customLevels);
    });

    it('should notify subscribers on change', () => {
      const listener = vi.fn();
      pluginSettingsStore.subscribe(listener);

      // First call happens immediately on subscribe
      expect(listener).toHaveBeenCalledTimes(1);

      pluginSettingsStore.set('channelDefaultWidthPct', 5.0);

      expect(listener).toHaveBeenCalledTimes(2);
    });

    it('should persist to localStorage', () => {
      pluginSettingsStore.set('fibPreset', 'Classic');

      expect(localStorageMock.setItem).toHaveBeenCalled();
    });

    it('should preserve other settings when setting one value', () => {
      pluginSettingsStore.set('channelDefaultWidthPct', 2.0);
      pluginSettingsStore.set('fibPreset', 'Classic');

      const settings = pluginSettingsStore.get();
      expect(settings.channelDefaultWidthPct).toBe(2.0);
      expect(settings.fibPreset).toBe('Classic');
    });
  });

  describe('subscribe()', () => {
    it('should call listener immediately with current state', () => {
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

    it('should stop calling listener after unsubscribe', () => {
      const listener = vi.fn();
      const unsubscribe = pluginSettingsStore.subscribe(listener);

      expect(listener).toHaveBeenCalledTimes(1);

      unsubscribe();

      pluginSettingsStore.set('channelDefaultWidthPct', 10.0);

      expect(listener).toHaveBeenCalledTimes(1); // Still 1
    });

    it('should support multiple subscribers', () => {
      const listener1 = vi.fn();
      const listener2 = vi.fn();

      pluginSettingsStore.subscribe(listener1);
      pluginSettingsStore.subscribe(listener2);

      pluginSettingsStore.set('fibPreset', 'Custom');

      // 1 immediate call + 1 from set
      expect(listener1).toHaveBeenCalledTimes(2);
      expect(listener2).toHaveBeenCalledTimes(2);
    });
  });

  describe('reset()', () => {
    it('should reset all settings to defaults', () => {
      // Modify settings first
      pluginSettingsStore.set('channelDefaultWidthPct', 5.0);
      pluginSettingsStore.set('channelWidthMode', 'pixels');
      pluginSettingsStore.set('fibPreset', 'Aggressive');

      // Reset
      pluginSettingsStore.reset();

      const settings = pluginSettingsStore.get();
      expect(settings.channelDefaultWidthPct).toBe(1.0);
      expect(settings.channelWidthMode).toBe('percent');
      expect(settings.fibPreset).toBe('Extended');
    });

    it('should notify subscribers after reset', () => {
      const listener = vi.fn();
      pluginSettingsStore.subscribe(listener);

      pluginSettingsStore.reset();

      // 1 immediate + 1 from reset
      expect(listener).toHaveBeenCalledTimes(2);
    });

    it('should persist reset state to localStorage', () => {
      pluginSettingsStore.set('fibPreset', 'Classic');
      vi.clearAllMocks();

      pluginSettingsStore.reset();

      expect(localStorageMock.setItem).toHaveBeenCalled();
    });
  });

  describe('fibPreset values', () => {
    it.each([['Classic'], ['Extended'], ['Aggressive'], ['Custom']] as const)(
      'should accept fibPreset value: %s',
      (preset) => {
        pluginSettingsStore.set('fibPreset', preset);
        expect(pluginSettingsStore.get().fibPreset).toBe(preset);
      }
    );
  });

  describe('channelWidthMode values', () => {
    it.each([['percent'], ['pixels']] as const)(
      'should accept channelWidthMode value: %s',
      (mode) => {
        pluginSettingsStore.set('channelWidthMode', mode);
        expect(pluginSettingsStore.get().channelWidthMode).toBe(mode);
      }
    );
  });
});

describe('pluginSymbolSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
  });

  describe('get()', () => {
    it('should return empty object for non-existent symbol/timeframe', () => {
      const settings = pluginSymbolSettings.get('BTCUSD', '1h');
      expect(settings).toEqual({});
    });

    it('should return stored settings for symbol/timeframe', () => {
      pluginSymbolSettings.set('BTCUSD', '1h', { channelDefaultWidthPct: 2.0 });

      const settings = pluginSymbolSettings.get('BTCUSD', '1h');
      expect(settings.channelDefaultWidthPct).toBe(2.0);
    });

    it('should return different settings for different timeframes', () => {
      pluginSymbolSettings.set('BTCUSD', '1h', { channelDefaultWidthPct: 2.0 });
      pluginSymbolSettings.set('BTCUSD', '1d', { channelDefaultWidthPct: 3.0 });

      expect(pluginSymbolSettings.get('BTCUSD', '1h').channelDefaultWidthPct).toBe(2.0);
      expect(pluginSymbolSettings.get('BTCUSD', '1d').channelDefaultWidthPct).toBe(3.0);
    });

    it('should return different settings for different symbols', () => {
      pluginSymbolSettings.set('BTCUSD', '1h', { fibPreset: 'Classic' });
      pluginSymbolSettings.set('ETHUSD', '1h', { fibPreset: 'Aggressive' });

      expect(pluginSymbolSettings.get('BTCUSD', '1h').fibPreset).toBe('Classic');
      expect(pluginSymbolSettings.get('ETHUSD', '1h').fibPreset).toBe('Aggressive');
    });
  });

  describe('set()', () => {
    it('should store settings for symbol/timeframe', () => {
      pluginSymbolSettings.set('SOLUSD', '4h', { channelWidthMode: 'pixels' });

      const settings = pluginSymbolSettings.get('SOLUSD', '4h');
      expect(settings.channelWidthMode).toBe('pixels');
    });

    it('should merge with existing settings', () => {
      pluginSymbolSettings.set('BTCUSD', '1h', { channelDefaultWidthPct: 2.0 });
      pluginSymbolSettings.set('BTCUSD', '1h', { fibPreset: 'Custom' });

      const settings = pluginSymbolSettings.get('BTCUSD', '1h');
      expect(settings.channelDefaultWidthPct).toBe(2.0);
      expect(settings.fibPreset).toBe('Custom');
    });

    it('should persist to localStorage', () => {
      pluginSymbolSettings.set('ADAUSD', '1d', { channelDefaultWidthPct: 1.5 });

      expect(localStorageMock.setItem).toHaveBeenCalled();
    });

    it('should notify global settings subscribers', () => {
      const listener = vi.fn();
      pluginSettingsStore.subscribe(listener);

      vi.clearAllMocks();

      pluginSymbolSettings.set('BTCUSD', '1h', { fibPreset: 'Classic' });

      expect(listener).toHaveBeenCalled();
    });
  });

  describe('clear()', () => {
    it('should remove settings for symbol/timeframe', () => {
      pluginSymbolSettings.set('BTCUSD', '1h', { channelDefaultWidthPct: 2.0 });
      expect(pluginSymbolSettings.get('BTCUSD', '1h').channelDefaultWidthPct).toBe(2.0);

      pluginSymbolSettings.clear('BTCUSD', '1h');
      expect(pluginSymbolSettings.get('BTCUSD', '1h')).toEqual({});
    });

    it('should not affect other symbol/timeframe settings', () => {
      pluginSymbolSettings.set('BTCUSD', '1h', { channelDefaultWidthPct: 2.0 });
      pluginSymbolSettings.set('BTCUSD', '1d', { channelDefaultWidthPct: 3.0 });

      pluginSymbolSettings.clear('BTCUSD', '1h');

      expect(pluginSymbolSettings.get('BTCUSD', '1h')).toEqual({});
      expect(pluginSymbolSettings.get('BTCUSD', '1d').channelDefaultWidthPct).toBe(3.0);
    });

    it('should persist changes to localStorage', () => {
      pluginSymbolSettings.set('BTCUSD', '1h', { channelDefaultWidthPct: 2.0 });
      vi.clearAllMocks();

      pluginSymbolSettings.clear('BTCUSD', '1h');

      expect(localStorageMock.setItem).toHaveBeenCalled();
    });

    it('should notify global settings subscribers', () => {
      const listener = vi.fn();
      pluginSettingsStore.subscribe(listener);

      vi.clearAllMocks();

      pluginSymbolSettings.clear('BTCUSD', '1h');

      expect(listener).toHaveBeenCalled();
    });
  });

  describe('listKeys()', () => {
    it('should return empty array when no overrides', () => {
      expect(pluginSymbolSettings.listKeys()).toEqual([]);
    });

    it('should return keys for all stored overrides', () => {
      pluginSymbolSettings.set('BTCUSD', '1h', { channelDefaultWidthPct: 2.0 });
      pluginSymbolSettings.set('ETHUSD', '1d', { fibPreset: 'Classic' });

      const keys = pluginSymbolSettings.listKeys();
      expect(keys).toContain('BTCUSD.1h');
      expect(keys).toContain('ETHUSD.1d');
      expect(keys).toHaveLength(2);
    });

    it('should update after clear()', () => {
      pluginSymbolSettings.set('BTCUSD', '1h', { channelDefaultWidthPct: 2.0 });
      pluginSymbolSettings.set('ETHUSD', '1d', { fibPreset: 'Classic' });

      pluginSymbolSettings.clear('BTCUSD', '1h');

      const keys = pluginSymbolSettings.listKeys();
      expect(keys).not.toContain('BTCUSD.1h');
      expect(keys).toContain('ETHUSD.1d');
      expect(keys).toHaveLength(1);
    });
  });

  describe('Edge Cases', () => {
    it('should handle clearing non-existent key', () => {
      // Should not throw
      expect(() => pluginSymbolSettings.clear('NONEXISTENT', 'FAKE')).not.toThrow();
    });

    it('should handle symbols with special characters', () => {
      pluginSymbolSettings.set('BTC/USD', '1h', { channelDefaultWidthPct: 2.0 });
      expect(pluginSymbolSettings.get('BTC/USD', '1h').channelDefaultWidthPct).toBe(2.0);
    });

    it('should handle empty timeframe', () => {
      pluginSymbolSettings.set('BTCUSD', '', { fibPreset: 'Classic' });
      expect(pluginSymbolSettings.get('BTCUSD', '').fibPreset).toBe('Classic');
    });
  });
});

describe('localStorage error handling', () => {
  it('should handle localStorage.getItem errors gracefully', () => {
    localStorageMock.getItem.mockImplementationOnce(() => {
      throw new Error('Storage error');
    });

    // Should not throw, returns defaults
    expect(() => pluginSettingsStore.get()).not.toThrow();
  });

  it('should handle localStorage.setItem errors gracefully', () => {
    localStorageMock.setItem.mockImplementationOnce(() => {
      throw new Error('Quota exceeded');
    });

    // Should not throw
    expect(() => pluginSettingsStore.set('channelDefaultWidthPct', 5.0)).not.toThrow();
  });

  it('should handle corrupted JSON in localStorage', () => {
    localStorageMock.getItem.mockReturnValueOnce('invalid json {{{');

    // Should handle gracefully and use defaults
    expect(() => pluginSymbolSettings.get('BTCUSD', '1h')).not.toThrow();
  });
});
