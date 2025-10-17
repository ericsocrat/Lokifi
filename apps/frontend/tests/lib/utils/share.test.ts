import { encodeShare, makeShareURL, tryLoadFromURL, type ShareSnapshot } from '@/lib/utils/share';
import { compressToEncodedURIComponent } from 'lz-string';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mockWindowLocation } from '../../helpers/mockWindow';

describe('share utilities', () => {
  let mockLocation: ReturnType<typeof mockWindowLocation>;

  beforeEach(() => {
    mockLocation = mockWindowLocation('https://app.lokifi.ai/chart');
  });

  afterEach(() => {
    mockLocation.restore();
  });

  describe('makeShareURL', () => {
    it('should create share URL with compressed payload', () => {
      const snapshot: ShareSnapshot = {
        v: 1,
        t: 'readOnly',
        drawings: [],
        createdAt: Date.now(),
      };

      const url = makeShareURL(snapshot);

      expect(url).toContain('https://app.lokifi.ai');
      expect(url).toContain('#share=');
      expect(url.length).toBeGreaterThan(50);
    });

    it('should include all snapshot properties in URL', () => {
      const snapshot: ShareSnapshot = {
        v: 1,
        t: 'editable',
        drawings: [
          {
            id: '123',
            kind: 'trendline',
            points: [
              { x: 0, y: 0 },
              { x: 100, y: 100 },
            ],
            style: { stroke: '#3b82f6', strokeWidth: 2, opacity: 1, dash: 'solid' },
          },
        ],
        theme: 'dark',
        timeframe: '1h',
        createdAt: 1234567890,
      };

      const url = makeShareURL(snapshot);

      expect(url).toMatch(/#share=/);
      expect(url).toContain('https://app.lokifi.ai');
    });

    it('should handle empty drawings array', () => {
      const snapshot: ShareSnapshot = {
        v: 1,
        t: 'readOnly',
        drawings: [],
        createdAt: Date.now(),
      };

      const url = makeShareURL(snapshot);

      expect(url).toBeTruthy();
      expect(url).toContain('#share=');
    });

    it('should handle multiple drawings', () => {
      const snapshot: ShareSnapshot = {
        v: 1,
        t: 'readOnly',
        drawings: [
          {
            id: '1',
            kind: 'hline',
            points: [{ x: 0, y: 100 }],
            style: { stroke: '#3b82f6', strokeWidth: 1, opacity: 1, dash: 'solid' },
          },
          {
            id: '2',
            kind: 'rect',
            points: [
              { x: 0, y: 0 },
              { x: 50, y: 50 },
            ],
            style: { stroke: '#ef4444', strokeWidth: 2, opacity: 0.5, dash: 'dash' },
          },
        ],
        createdAt: Date.now(),
      };

      const url = makeShareURL(snapshot);

      expect(url).toBeTruthy();
      expect(url.length).toBeGreaterThan(100);
    });

    it('should preserve current URL path and origin', () => {
      const snapshot: ShareSnapshot = {
        v: 1,
        t: 'readOnly',
        drawings: [],
        createdAt: Date.now(),
      };

      const url = makeShareURL(snapshot);

      expect(url).toContain('https://app.lokifi.ai/chart');
    });

    it('should handle editable type', () => {
      const snapshot: ShareSnapshot = {
        v: 1,
        t: 'editable',
        drawings: [],
        createdAt: Date.now(),
      };

      const url = makeShareURL(snapshot);

      expect(url).toBeTruthy();
      expect(url).toContain('#share=');
    });

    it('should handle different timeframes', () => {
      const timeframes = ['15m', '30m', '1h', '4h', '1d', '1w'];

      timeframes.forEach((tf) => {
        const snapshot: ShareSnapshot = {
          v: 1,
          t: 'readOnly',
          drawings: [],
          timeframe: tf,
          createdAt: Date.now(),
        };

        const url = makeShareURL(snapshot);
        expect(url).toBeTruthy();
      });
    });

    it('should handle both theme options', () => {
      const themes: Array<'light' | 'dark'> = ['light', 'dark'];

      themes.forEach((theme) => {
        const snapshot: ShareSnapshot = {
          v: 1,
          t: 'readOnly',
          drawings: [],
          theme,
          createdAt: Date.now(),
        };

        const url = makeShareURL(snapshot);
        expect(url).toBeTruthy();
      });
    });

    it('should handle snapshot without optional fields', () => {
      const snapshot: ShareSnapshot = {
        v: 1,
        t: 'readOnly',
        drawings: [],
        createdAt: Date.now(),
      };

      const url = makeShareURL(snapshot);

      expect(url).toBeTruthy();
      expect(url).toContain('#share=');
    });

    it('should create different URLs for different snapshots', () => {
      const snapshot1: ShareSnapshot = {
        v: 1,
        t: 'readOnly',
        drawings: [],
        createdAt: 1000,
      };

      const snapshot2: ShareSnapshot = {
        v: 1,
        t: 'readOnly',
        drawings: [],
        createdAt: 2000,
      };

      const url1 = makeShareURL(snapshot1);
      const url2 = makeShareURL(snapshot2);

      expect(url1).not.toBe(url2);
    });
  });

  describe('tryLoadFromURL', () => {
    it('should return null when no share hash present', () => {
      mockLocation.setHash('');

      const result = tryLoadFromURL();

      expect(result).toBeNull();
    });

    it('should return null for wrong hash format', () => {
      mockLocation.setHash('#other=value');

      const result = tryLoadFromURL();

      expect(result).toBeNull();
    });

    it('should load valid snapshot from URL hash', () => {
      const originalSnapshot: ShareSnapshot = {
        v: 1,
        t: 'readOnly',
        drawings: [],
        createdAt: 1234567890,
      };

      const url = makeShareURL(originalSnapshot);
      const hash = url.split('#')[1];
      mockLocation.setHash('#' + hash);

      const loaded = tryLoadFromURL();

      expect(loaded).not.toBeNull();
      expect(loaded?.v).toBe(1);
      expect(loaded?.t).toBe('readOnly');
      expect(loaded?.drawings).toEqual([]);
      expect(loaded?.createdAt).toBe(1234567890);
    });

    it('should load snapshot with drawings', () => {
      const originalSnapshot: ShareSnapshot = {
        v: 1,
        t: 'editable',
        drawings: [
          {
            id: 'test-1',
            kind: 'trendline',
            points: [
              { x: 10, y: 20 },
              { x: 30, y: 40 },
            ],
            style: { stroke: '#3b82f6', strokeWidth: 2, opacity: 1, dash: 'solid' },
          },
        ],
        theme: 'dark',
        timeframe: '1h',
        createdAt: Date.now(),
      };

      const url = makeShareURL(originalSnapshot);
      const hash = url.split('#')[1];
      mockLocation.setHash('#' + hash);

      const loaded = tryLoadFromURL();

      expect(loaded).not.toBeNull();
      expect(loaded?.drawings).toHaveLength(1);
      expect(loaded?.drawings[0]?.kind).toBe('trendline');
      expect(loaded?.theme).toBe('dark');
      expect(loaded?.timeframe).toBe('1h');
    });

    it('should return null for invalid compressed data', () => {
      mockLocation.setHash('#share=invalid_compressed_data');

      const result = tryLoadFromURL();

      expect(result).toBeNull();
    });

    it('should return null for invalid JSON', () => {
      const compressed = compressToEncodedURIComponent('not valid json');
      mockLocation.setHash(`#share=${compressed}`);

      const result = tryLoadFromURL();

      expect(result).toBeNull();
    });

    it('should return null for wrong version', () => {
      const wrongVersion = { v: 2, t: 'readOnly', drawings: [] };
      const compressed = compressToEncodedURIComponent(JSON.stringify(wrongVersion));
      mockLocation.setHash(`#share=${compressed}`);

      const result = tryLoadFromURL();

      expect(result).toBeNull();
    });

    it('should return null for missing version', () => {
      const noVersion = { t: 'readOnly', drawings: [] };
      const compressed = compressToEncodedURIComponent(JSON.stringify(noVersion));
      mockLocation.setHash(`#share=${compressed}`);

      const result = tryLoadFromURL();

      expect(result).toBeNull();
    });

    it('should handle hash with multiple parameters', () => {
      const snapshot: ShareSnapshot = {
        v: 1,
        t: 'readOnly',
        drawings: [],
        createdAt: Date.now(),
      };

      const url = makeShareURL(snapshot);
      const shareParam = url.split('#')[1];
      mockLocation.setHash(`#${shareParam}&other=value`);

      const loaded = tryLoadFromURL();

      expect(loaded).not.toBeNull();
      expect(loaded?.v).toBe(1);
    });

    it('should handle decompression returning null', () => {
      mockLocation.setHash('#share=');

      const result = tryLoadFromURL();

      expect(result).toBeNull();
    });

    it('should handle empty hash', () => {
      mockLocation.setHash('');

      const result = tryLoadFromURL();

      expect(result).toBeNull();
    });

    it('should handle hash without equals sign', () => {
      mockLocation.setHash('#share');

      const result = tryLoadFromURL();

      expect(result).toBeNull();
    });
  });

  describe('encodeShare', () => {
    it('should encode object to base64', () => {
      const obj = { test: 'value', number: 42 };

      const encoded = encodeShare(obj);

      expect(encoded).toBeTruthy();
      expect(typeof encoded).toBe('string');
      expect(encoded.length).toBeGreaterThan(0);
    });

    it('should return empty string on error', () => {
      // Create a circular reference
      const circular: any = { a: 1 };
      circular.self = circular;

      const encoded = encodeShare(circular);

      expect(encoded).toBe('');
    });

    it('should handle primitive values', () => {
      expect(encodeShare(42)).toBeTruthy();
      expect(encodeShare('test')).toBeTruthy();
      expect(encodeShare(true)).toBeTruthy();
      expect(encodeShare(null)).toBeTruthy();
    });

    it('should handle arrays', () => {
      const arr = [1, 2, 3, 'test', { nested: true }];

      const encoded = encodeShare(arr);

      expect(encoded).toBeTruthy();
      expect(typeof encoded).toBe('string');
    });

    it('should handle nested objects', () => {
      const nested = {
        level1: {
          level2: {
            level3: {
              value: 'deep',
            },
          },
        },
      };

      const encoded = encodeShare(nested);

      expect(encoded).toBeTruthy();
    });

    it('should handle empty object', () => {
      const encoded = encodeShare({});

      expect(encoded).toBeTruthy();
      expect(typeof encoded).toBe('string');
    });

    it('should handle special characters', () => {
      const obj = {
        special: 'test with "quotes" and \'apostrophes\'',
        unicode: '测试 🎉',
      };

      const encoded = encodeShare(obj);

      expect(encoded).toBeTruthy();
    });

    it('should produce different encodings for different objects', () => {
      const obj1 = { value: 1 };
      const obj2 = { value: 2 };

      const encoded1 = encodeShare(obj1);
      const encoded2 = encodeShare(obj2);

      expect(encoded1).not.toBe(encoded2);
    });

    it('should produce consistent encoding for same object', () => {
      const obj = { test: 'value', num: 42 };

      const encoded1 = encodeShare(obj);
      const encoded2 = encodeShare(obj);

      expect(encoded1).toBe(encoded2);
    });

    it('should handle empty string', () => {
      const encoded = encodeShare('');

      expect(encoded).toBeTruthy();
    });

    it('should handle large objects', () => {
      const large = {
        data: Array.from({ length: 100 }, (_, i) => ({ id: i, value: `item-${i}` })),
      };

      const encoded = encodeShare(large);

      expect(encoded).toBeTruthy();
      expect(encoded.length).toBeGreaterThan(100);
    });
  });

  describe('Integration: Round-trip encoding', () => {
    it('should successfully round-trip a snapshot', () => {
      const originalSnapshot: ShareSnapshot = {
        v: 1,
        t: 'editable',
        drawings: [
          {
            id: 'line-1',
            kind: 'trendline',
            points: [
              { x: 0, y: 100 },
              { x: 200, y: 300 },
            ],
            style: { stroke: '#10b981', strokeWidth: 3, opacity: 0.8, dash: 'dash' },
          },
          {
            id: 'rect-1',
            kind: 'rect',
            points: [
              { x: 50, y: 50 },
              { x: 150, y: 150 },
            ],
            style: { stroke: '#f59e0b', strokeWidth: 2, opacity: 0.6, dash: 'solid' },
          },
        ],
        theme: 'light',
        timeframe: '4h',
        createdAt: 1234567890,
      };

      // Encode
      const url = makeShareURL(originalSnapshot);
      const hash = url.split('#')[1];
      mockLocation.setHash('#' + hash);

      // Decode
      const loaded = tryLoadFromURL();

      expect(loaded).not.toBeNull();
      expect(loaded?.v).toBe(originalSnapshot.v);
      expect(loaded?.t).toBe(originalSnapshot.t);
      expect(loaded?.theme).toBe(originalSnapshot.theme);
      expect(loaded?.timeframe).toBe(originalSnapshot.timeframe);
      expect(loaded?.createdAt).toBe(originalSnapshot.createdAt);
      expect(loaded?.drawings).toHaveLength(2);
      expect(loaded?.drawings[0]?.id).toBe('line-1');
      expect(loaded?.drawings[1]?.id).toBe('rect-1');
    });

    it('should handle large snapshot with many drawings', () => {
      const drawings = Array.from({ length: 50 }, (_, i) => ({
        id: `drawing-${i}`,
        kind: 'hline' as const,
        points: [{ x: i * 10, y: i * 20 }],
        style: { stroke: '#3b82f6', strokeWidth: 1, opacity: 1, dash: 'solid' as const },
      }));

      const snapshot: ShareSnapshot = {
        v: 1,
        t: 'readOnly',
        drawings,
        createdAt: Date.now(),
      };

      const url = makeShareURL(snapshot);
      const hash = url.split('#')[1];
      mockLocation.setHash('#' + hash);

      const loaded = tryLoadFromURL();

      expect(loaded).not.toBeNull();
      expect(loaded?.drawings).toHaveLength(50);
    });

    it('should preserve all drawing properties', () => {
      const snapshot: ShareSnapshot = {
        v: 1,
        t: 'readOnly',
        drawings: [
          {
            id: 'arrow-1',
            kind: 'arrow',
            points: [
              { x: 100, y: 200 },
              { x: 300, y: 400 },
            ],
            style: { stroke: '#8b5cf6', strokeWidth: 4, opacity: 0.9, dash: 'dot' },
          },
        ],
        createdAt: Date.now(),
      };

      const url = makeShareURL(snapshot);
      const hash = url.split('#')[1];
      mockLocation.setHash('#' + hash);

      const loaded = tryLoadFromURL();

      expect(loaded).not.toBeNull();
      expect(loaded?.drawings[0]?.id).toBe('arrow-1');
      expect(loaded?.drawings[0]?.kind).toBe('arrow');
      expect(loaded?.drawings[0]?.points).toHaveLength(2);
      if (loaded && loaded.drawings[0]) {
        expect(loaded.drawings[0].style.stroke).toBe('#8b5cf6');
        expect(loaded.drawings[0].style.strokeWidth).toBe(4);
      }
    });

    it('should handle minimal snapshot', () => {
      const snapshot: ShareSnapshot = {
        v: 1,
        t: 'readOnly',
        drawings: [],
        createdAt: 0,
      };

      const url = makeShareURL(snapshot);
      const hash = url.split('#')[1];
      mockLocation.setHash('#' + hash);

      const loaded = tryLoadFromURL();

      expect(loaded).not.toBeNull();
      expect(loaded?.drawings).toHaveLength(0);
      expect(loaded?.createdAt).toBe(0);
    });
  });
});
