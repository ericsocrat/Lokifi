import { makeSharePayload, makeShareUrl, tryLoadSharedState } from '@/lib/utils/share2';
import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from 'lz-string';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mockWindowLocation } from '../../helpers/mockWindow';

describe('share2 utilities', () => {
  let mockLocation: ReturnType<typeof mockWindowLocation>;

  beforeEach(() => {
    mockLocation = mockWindowLocation('https://app.lokifi.ai/chart');
  });

  afterEach(() => {
    mockLocation.restore();
  });

  describe('makeSharePayload', () => {
    it('should create compressed payload with state data', () => {
      const state = {
        drawings: [],
        indicators: [],
        indicatorSettings: {},
        theme: 'dark',
        timeframe: '1h',
        layers: [],
        activeLayerId: 'main',
      };

      const payload = makeSharePayload(state, 'view');

      expect(payload).toBeTruthy();
      expect(typeof payload).toBe('string');
      expect(payload.length).toBeGreaterThan(0);
    });

    it('should include mode in payload', () => {
      const state = {
        drawings: [],
        indicators: [],
        indicatorSettings: {},
        theme: 'light',
        timeframe: '1d',
        layers: [],
        activeLayerId: 'main',
      };

      const payload = makeSharePayload(state, 'edit');
      const decompressed = decompressFromEncodedURIComponent(payload);
      const parsed = JSON.parse(decompressed!);

      expect(parsed.mode).toBe('edit');
    });

    it('should include password when provided', () => {
      const state = {
        drawings: [],
        indicators: [],
        indicatorSettings: {},
        theme: 'dark',
        timeframe: '4h',
        layers: [],
        activeLayerId: 'main',
      };

      const payload = makeSharePayload(state, 'view', 'secret123');
      const decompressed = decompressFromEncodedURIComponent(payload);
      const parsed = JSON.parse(decompressed!);

      expect(parsed.password).toBe('secret123');
    });

    it('should set password to null when not provided', () => {
      const state = {
        drawings: [],
        indicators: [],
        indicatorSettings: {},
        theme: 'dark',
        timeframe: '1h',
        layers: [],
        activeLayerId: 'main',
      };

      const payload = makeSharePayload(state, 'view');
      const decompressed = decompressFromEncodedURIComponent(payload);
      const parsed = JSON.parse(decompressed!);

      expect(parsed.password).toBeNull();
    });

    it('should include all scene properties', () => {
      const state = {
        drawings: [{ id: '1', kind: 'line' }],
        indicators: ['SMA', 'EMA'],
        indicatorSettings: { sma: { period: 20 } },
        theme: 'dark',
        timeframe: '15m',
        layers: ['layer1', 'layer2'],
        activeLayerId: 'layer1',
      };

      const payload = makeSharePayload(state, 'view');
      const decompressed = decompressFromEncodedURIComponent(payload);
      const parsed = JSON.parse(decompressed!);

      expect(parsed.scene.drawings).toEqual(state.drawings);
      expect(parsed.scene.indicators).toEqual(state.indicators);
      expect(parsed.scene.indicatorSettings).toEqual(state.indicatorSettings);
      expect(parsed.scene.theme).toBe(state.theme);
      expect(parsed.scene.timeframe).toBe(state.timeframe);
      expect(parsed.scene.layers).toEqual(state.layers);
      expect(parsed.scene.activeLayerId).toBe(state.activeLayerId);
    });

    it('should handle empty state arrays', () => {
      const state = {
        drawings: [],
        indicators: [],
        indicatorSettings: {},
        theme: 'light',
        timeframe: '1w',
        layers: [],
        activeLayerId: null,
      };

      const payload = makeSharePayload(state, 'view');
      const decompressed = decompressFromEncodedURIComponent(payload);
      const parsed = JSON.parse(decompressed!);

      expect(parsed.scene.drawings).toEqual([]);
      expect(parsed.scene.indicators).toEqual([]);
      expect(parsed.scene.layers).toEqual([]);
    });

    it('should handle complex state data', () => {
      const state = {
        drawings: [
          {
            id: '1',
            kind: 'trendline',
            points: [
              { x: 0, y: 0 },
              { x: 100, y: 100 },
            ],
          },
          {
            id: '2',
            kind: 'rect',
            points: [
              { x: 10, y: 10 },
              { x: 50, y: 50 },
            ],
          },
        ],
        indicators: ['SMA', 'EMA', 'RSI', 'MACD'],
        indicatorSettings: {
          sma: { period: 20, color: '#3b82f6' },
          ema: { period: 50, color: '#10b981' },
        },
        theme: 'dark',
        timeframe: '1h',
        layers: ['main', 'overlay', 'drawing'],
        activeLayerId: 'drawing',
      };

      const payload = makeSharePayload(state, 'edit');

      expect(payload).toBeTruthy();
      expect(payload.length).toBeGreaterThan(50);
    });

    it('should create different payloads for different modes', () => {
      const state = {
        drawings: [],
        indicators: [],
        indicatorSettings: {},
        theme: 'dark',
        timeframe: '1h',
        layers: [],
        activeLayerId: 'main',
      };

      const viewPayload = makeSharePayload(state, 'view');
      const editPayload = makeSharePayload(state, 'edit');

      expect(viewPayload).not.toBe(editPayload);
    });

    it('should handle empty string password as null', () => {
      const state = {
        drawings: [],
        indicators: [],
        indicatorSettings: {},
        theme: 'dark',
        timeframe: '1h',
        layers: [],
        activeLayerId: 'main',
      };

      const payload = makeSharePayload(state, 'view', '');
      const decompressed = decompressFromEncodedURIComponent(payload);
      const parsed = JSON.parse(decompressed!);

      expect(parsed.password).toBeNull();
    });

    it('should handle undefined state properties gracefully', () => {
      const state = {
        drawings: undefined,
        indicators: undefined,
        indicatorSettings: undefined,
        theme: 'dark',
        timeframe: '1h',
        layers: undefined,
        activeLayerId: undefined,
      };

      const payload = makeSharePayload(state, 'view');

      expect(payload).toBeTruthy();
    });
  });

  describe('makeShareUrl', () => {
    it('should create URL with hash parameter', () => {
      const hash = 'compressed_data_here';

      const url = makeShareUrl(hash);

      expect(url).toContain('#s=');
      expect(url).toContain(hash);
    });

    it('should use window location when available', () => {
      const hash = 'test123';

      const url = makeShareUrl(hash);

      expect(url).toContain('https://app.lokifi.ai/chart');
      expect(url).toBe('https://app.lokifi.ai/chart#s=test123');
    });

    it('should fallback to default URL when window is undefined', () => {
      // Can't actually test window undefined in browser environment,
      // but we can test the normal case
      const hash = 'abc123';

      const url = makeShareUrl(hash);

      expect(url).toMatch(/#s=abc123$/);
    });

    it('should preserve origin and pathname', () => {
      mockLocation.setHref('https://localhost:3000/dashboard');
      const hash = 'xyz789';

      const url = makeShareUrl(hash);

      expect(url).toContain('localhost:3000/dashboard');
      expect(url).toContain('#s=xyz789');
    });

    it('should handle empty hash', () => {
      const url = makeShareUrl('');

      expect(url).toContain('#s=');
    });

    it('should handle hash with special characters', () => {
      const hash = 'abc-123_XYZ+456=';

      const url = makeShareUrl(hash);

      expect(url).toContain(hash);
    });

    it('should handle very long hash', () => {
      const hash = 'a'.repeat(1000);

      const url = makeShareUrl(hash);

      expect(url).toContain('#s=');
      expect(url.length).toBeGreaterThan(1000);
    });

    it('should create consistent URLs for same hash', () => {
      const hash = 'consistent';

      const url1 = makeShareUrl(hash);
      const url2 = makeShareUrl(hash);

      expect(url1).toBe(url2);
    });
  });

  describe('tryLoadSharedState', () => {
    it('should return null when no hash present', () => {
      mockLocation.setHash('');

      const result = tryLoadSharedState();

      expect(result).toBeNull();
    });

    it('should return null for wrong hash format', () => {
      mockLocation.setHash('#share=other_format');

      const result = tryLoadSharedState();

      expect(result).toBeNull();
    });

    it('should load state from valid hash', () => {
      const state = {
        drawings: [],
        indicators: [],
        indicatorSettings: {},
        theme: 'dark',
        timeframe: '1h',
        layers: [],
        activeLayerId: 'main',
      };

      const payload = makeSharePayload(state, 'view');
      mockLocation.setHash(`#s=${payload}`);

      const loaded = tryLoadSharedState();

      expect(loaded).not.toBeNull();
      expect(loaded.mode).toBe('view');
      expect(loaded.scene).toBeDefined();
    });

    it('should load state with password', () => {
      const state = {
        drawings: [],
        indicators: [],
        indicatorSettings: {},
        theme: 'dark',
        timeframe: '1h',
        layers: [],
        activeLayerId: 'main',
      };

      const payload = makeSharePayload(state, 'edit', 'secret');
      mockLocation.setHash(`#s=${payload}`);

      const loaded = tryLoadSharedState();

      expect(loaded).not.toBeNull();
      expect(loaded.password).toBe('secret');
      expect(loaded.mode).toBe('edit');
    });

    it('should return null for invalid compressed data', () => {
      mockLocation.setHash('#s=invalid_data_123');

      const result = tryLoadSharedState();

      expect(result).toBeNull();
    });

    it('should return null for invalid JSON', () => {
      const compressed = compressToEncodedURIComponent('not valid json');
      mockLocation.setHash(`#s=${compressed}`);

      const result = tryLoadSharedState();

      expect(result).toBeNull();
    });

    it('should handle hash with multiple parameters', () => {
      const state = {
        drawings: [],
        indicators: [],
        indicatorSettings: {},
        theme: 'dark',
        timeframe: '1h',
        layers: [],
        activeLayerId: 'main',
      };

      const payload = makeSharePayload(state, 'view');
      mockLocation.setHash(`#s=${payload}&other=value`);

      const loaded = tryLoadSharedState();

      expect(loaded).not.toBeNull();
      expect(loaded.mode).toBe('view');
    });

    it('should load complex state correctly', () => {
      const state = {
        drawings: [
          { id: '1', kind: 'line' },
          { id: '2', kind: 'rect' },
        ],
        indicators: ['SMA', 'EMA'],
        indicatorSettings: { sma: { period: 20 } },
        theme: 'light',
        timeframe: '4h',
        layers: ['layer1'],
        activeLayerId: 'layer1',
      };

      const payload = makeSharePayload(state, 'edit', 'pwd123');
      mockLocation.setHash(`#s=${payload}`);

      const loaded = tryLoadSharedState();

      expect(loaded).not.toBeNull();
      expect(loaded.scene.drawings).toHaveLength(2);
      expect(loaded.scene.indicators).toEqual(['SMA', 'EMA']);
      expect(loaded.scene.theme).toBe('light');
      expect(loaded.scene.timeframe).toBe('4h');
      expect(loaded.password).toBe('pwd123');
    });

    it('should handle empty hash', () => {
      mockLocation.setHash('');

      const result = tryLoadSharedState();

      expect(result).toBeNull();
    });

    it('should handle hash without value', () => {
      mockLocation.setHash('#s=');

      const result = tryLoadSharedState();

      expect(result).toBeNull();
    });
  });

  describe('Integration: Round-trip state sharing', () => {
    it('should successfully round-trip state', () => {
      const originalState = {
        drawings: [{ id: 'test', kind: 'trendline' }],
        indicators: ['RSI'],
        indicatorSettings: { rsi: { period: 14 } },
        theme: 'dark',
        timeframe: '1h',
        layers: ['main'],
        activeLayerId: 'main',
      };

      // Encode
      const payload = makeSharePayload(originalState, 'view', 'password123');
      const url = makeShareUrl(payload);
      const hash = url.split('#s=')[1];
      mockLocation.setHash(`#s=${hash}`);

      // Decode
      const loaded = tryLoadSharedState();

      expect(loaded).not.toBeNull();
      expect(loaded.mode).toBe('view');
      expect(loaded.password).toBe('password123');
      expect(loaded.scene.drawings).toEqual(originalState.drawings);
      expect(loaded.scene.indicators).toEqual(originalState.indicators);
      expect(loaded.scene.theme).toBe(originalState.theme);
      expect(loaded.scene.timeframe).toBe(originalState.timeframe);
    });

    it('should handle large state with many items', () => {
      const largeState = {
        drawings: Array.from({ length: 100 }, (_, i) => ({
          id: `drawing-${i}`,
          kind: 'hline',
          y: i * 10,
        })),
        indicators: ['SMA', 'EMA', 'RSI', 'MACD', 'Bollinger'],
        indicatorSettings: {
          sma: { period: 20 },
          ema: { period: 50 },
          rsi: { period: 14 },
        },
        theme: 'dark',
        timeframe: '15m',
        layers: ['main', 'overlay', 'drawing'],
        activeLayerId: 'drawing',
      };

      const payload = makeSharePayload(largeState, 'edit');
      const url = makeShareUrl(payload);
      const hash = url.split('#s=')[1];
      mockLocation.setHash(`#s=${hash}`);

      const loaded = tryLoadSharedState();

      expect(loaded).not.toBeNull();
      expect(loaded.scene.drawings).toHaveLength(100);
      expect(loaded.scene.indicators).toHaveLength(5);
    });

    it('should preserve null password when not provided', () => {
      const state = {
        drawings: [],
        indicators: [],
        indicatorSettings: {},
        theme: 'light',
        timeframe: '1d',
        layers: [],
        activeLayerId: null,
      };

      const payload = makeSharePayload(state, 'view');
      mockLocation.setHash(`#s=${payload}`);

      const loaded = tryLoadSharedState();

      expect(loaded).not.toBeNull();
      expect(loaded.password).toBeNull();
    });

    it('should handle minimal state', () => {
      const minimalState = {
        drawings: [],
        indicators: [],
        indicatorSettings: {},
        theme: 'dark',
        timeframe: '1h',
        layers: [],
        activeLayerId: 'main',
      };

      const payload = makeSharePayload(minimalState, 'view');
      mockLocation.setHash(`#s=${payload}`);

      const loaded = tryLoadSharedState();

      expect(loaded).not.toBeNull();
      expect(loaded.mode).toBe('view');
      expect(loaded.scene.drawings).toEqual([]);
    });
  });
});
