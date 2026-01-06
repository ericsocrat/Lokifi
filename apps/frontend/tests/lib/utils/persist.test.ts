/**
 * Tests for persist utility
 */
import type { Drawing } from '@/lib/utils/drawings';
import {
  listVersions,
  loadCurrent,
  saveCurrent,
  saveVersion,
  type PersistSnapshot,
} from '@/lib/utils/persist';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('persist', () => {
  const mockDrawings: Drawing[] = [
    {
      id: 'draw-1',
      type: 'trendline' as const,
      points: [{ x: 0, y: 0, price: 100, time: 1000 }],
      style: { color: '#ff0000', lineWidth: 2 },
    },
    {
      id: 'draw-2',
      type: 'hline' as const,
      points: [{ x: 0, y: 50, price: 150, time: 2000 }],
      style: { color: '#00ff00', lineWidth: 1 },
    },
  ];

  let mockStorage: Record<string, string>;

  beforeEach(() => {
    mockStorage = {};

    vi.spyOn(Storage.prototype, 'getItem').mockImplementation((key) => {
      return mockStorage[key] || null;
    });

    vi.spyOn(Storage.prototype, 'setItem').mockImplementation((key, value) => {
      mockStorage[key] = value;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('saveCurrent', () => {
    it('should save drawings and selection to localStorage', () => {
      const selection = new Set(['draw-1']);

      saveCurrent(mockDrawings, selection);

      const saved = JSON.parse(mockStorage['lokifi-drawings@current']);
      expect(saved.drawings).toEqual(mockDrawings);
      expect(saved.selection).toEqual(['draw-1']);
      expect(saved.ts).toBeDefined();
    });

    it('should save empty arrays', () => {
      saveCurrent([], new Set());

      const saved = JSON.parse(mockStorage['lokifi-drawings@current']);
      expect(saved.drawings).toEqual([]);
      expect(saved.selection).toEqual([]);
    });
  });

  describe('loadCurrent', () => {
    it('should load saved drawings from localStorage', () => {
      const snapshot: PersistSnapshot = {
        ts: Date.now(),
        drawings: mockDrawings,
        selection: ['draw-1', 'draw-2'],
      };
      mockStorage['lokifi-drawings@current'] = JSON.stringify(snapshot);

      const result = loadCurrent();

      expect(result).toEqual(snapshot);
    });

    it('should return null if nothing saved', () => {
      const result = loadCurrent();

      expect(result).toBeNull();
    });

    it('should return null if JSON is invalid', () => {
      mockStorage['lokifi-drawings@current'] = 'not valid json';

      const result = loadCurrent();

      expect(result).toBeNull();
    });
  });

  describe('saveVersion', () => {
    it('should add version to versions list', () => {
      const selection = new Set(['draw-1']);

      saveVersion(mockDrawings, selection);

      const versions = JSON.parse(mockStorage['lokifi-drawings@versions']);
      expect(versions).toHaveLength(1);
      expect(versions[0].drawings).toEqual(mockDrawings);
    });

    it('should also update current snapshot', () => {
      const selection = new Set(['draw-2']);

      saveVersion(mockDrawings, selection);

      const current = JSON.parse(mockStorage['lokifi-drawings@current']);
      expect(current.drawings).toEqual(mockDrawings);
    });

    it('should maintain maximum 20 versions', () => {
      // Pre-fill with 20 versions
      const existingVersions: PersistSnapshot[] = Array.from({ length: 20 }, (_, i) => ({
        ts: i,
        drawings: [],
        selection: [],
      }));
      mockStorage['lokifi-drawings@versions'] = JSON.stringify(existingVersions);

      // Add one more
      saveVersion(mockDrawings, new Set());

      const versions = JSON.parse(mockStorage['lokifi-drawings@versions']);
      expect(versions).toHaveLength(20);
      expect(versions[versions.length - 1].drawings).toEqual(mockDrawings);
      // First version should be removed
      expect(versions[0].ts).toBe(1); // Not 0, because oldest was shifted
    });

    it('should fallback to saveCurrent if versions storage fails', () => {
      // Make getItem throw for versions key
      vi.mocked(Storage.prototype.getItem).mockImplementation((key) => {
        if (key === 'lokifi-drawings@versions') {
          throw new Error('Storage error');
        }
        return mockStorage[key] || null;
      });

      saveVersion(mockDrawings, new Set(['draw-1']));

      // Should still save current
      expect(mockStorage['lokifi-drawings@current']).toBeDefined();
    });
  });

  describe('listVersions', () => {
    it('should return all saved versions', () => {
      const versions: PersistSnapshot[] = [
        { ts: 1000, drawings: [], selection: [] },
        { ts: 2000, drawings: mockDrawings, selection: ['draw-1'] },
      ];
      mockStorage['lokifi-drawings@versions'] = JSON.stringify(versions);

      const result = listVersions();

      expect(result).toEqual(versions);
    });

    it('should return empty array if no versions', () => {
      const result = listVersions();

      expect(result).toEqual([]);
    });

    it('should return empty array if JSON is invalid', () => {
      mockStorage['lokifi-drawings@versions'] = 'invalid json';

      const result = listVersions();

      expect(result).toEqual([]);
    });
  });
});
