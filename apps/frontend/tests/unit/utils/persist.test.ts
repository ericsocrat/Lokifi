import type { PersistSnapshot } from '@/lib/utils/persist';
import { listVersions, loadCurrent, saveCurrent, saveVersion } from '@/lib/utils/persist';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('Persist Module', () => {
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
    };
  })();

  beforeEach(() => {
    // Reset the mock store before each test
    localStorageMock.clear();
    vi.clearAllMocks();

    // Set up localStorage mock
    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock,
      writable: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('saveCurrent', () => {
    it('saves drawings and selection to localStorage', () => {
      const drawings = [
        {
          type: 'line',
          points: [
            [0, 0],
            [1, 1],
          ],
        },
        {
          type: 'rectangle',
          points: [
            [2, 2],
            [3, 3],
          ],
        },
      ];
      const selection = new Set(['drawing-1', 'drawing-2']);

      // Mock Date.now() to a fixed timestamp
      const mockTimestamp = 1234567890;
      vi.spyOn(Date, 'now').mockReturnValue(mockTimestamp);

      saveCurrent(drawings, selection);

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'lokifi-drawings@current',
        expect.any(String)
      );

      const savedData = JSON.parse(localStorageMock.setItem.mock.calls[0]?.[1] as string);
      expect(savedData).toEqual({
        ts: mockTimestamp,
        drawings,
        selection: ['drawing-1', 'drawing-2'],
      });
    });

    it('converts Set to Array for selection', () => {
      const drawings: any[] = [];
      const selection = new Set(['id1', 'id2', 'id3']);

      saveCurrent(drawings, selection);

      const savedData = JSON.parse(localStorageMock.setItem.mock.calls[0]?.[1] as string);
      expect(Array.isArray(savedData.selection)).toBe(true);
      expect(savedData.selection).toEqual(['id1', 'id2', 'id3']);
    });

    it('handles empty drawings and selection', () => {
      const drawings: any[] = [];
      const selection = new Set<string>();

      saveCurrent(drawings, selection);

      expect(localStorageMock.setItem).toHaveBeenCalled();
      const savedData = JSON.parse(localStorageMock.setItem.mock.calls[0]?.[1] as string);
      expect(savedData.drawings).toEqual([]);
      expect(savedData.selection).toEqual([]);
    });
  });

  describe('loadCurrent', () => {
    it('loads current snapshot from localStorage', () => {
      const mockSnapshot: PersistSnapshot = {
        ts: 1234567890,
        drawings: [
          {
            type: 'line',
            points: [
              [0, 0],
              [1, 1],
            ],
          },
        ],
        selection: ['drawing-1'],
      };

      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockSnapshot));

      const result = loadCurrent();

      expect(localStorageMock.getItem).toHaveBeenCalledWith('lokifi-drawings@current');
      expect(result).toEqual(mockSnapshot);
    });

    it('returns null when no data exists', () => {
      localStorageMock.getItem.mockReturnValue(null);

      const result = loadCurrent();

      expect(result).toBeNull();
    });

    it('returns null when JSON parsing fails', () => {
      localStorageMock.getItem.mockReturnValue('invalid json {');

      const result = loadCurrent();

      expect(result).toBeNull();
    });

    it('handles localStorage getItem throwing error', () => {
      localStorageMock.getItem.mockImplementation(() => {
        throw new Error('localStorage error');
      });

      const result = loadCurrent();

      expect(result).toBeNull();
    });
  });

  describe('saveVersion', () => {
    it('saves a new version to version history', () => {
      const drawings = [
        {
          type: 'line',
          points: [
            [0, 0],
            [1, 1],
          ],
        },
      ];
      const selection = new Set(['drawing-1']);
      const mockTimestamp = 1234567890;

      vi.spyOn(Date, 'now').mockReturnValue(mockTimestamp);

      saveVersion(drawings, selection);

      // Should save to versions
      const versionsCall = localStorageMock.setItem.mock.calls.find(
        (call) => call[0] === 'lokifi-drawings@versions'
      );
      expect(versionsCall).toBeDefined();

      const savedVersions = JSON.parse(versionsCall?.[1] as string);
      expect(savedVersions).toHaveLength(1);
      expect(savedVersions[0]).toEqual({
        ts: mockTimestamp,
        drawings,
        selection: ['drawing-1'],
      });

      // Should also save current
      const currentCall = localStorageMock.setItem.mock.calls.find(
        (call) => call[0] === 'lokifi-drawings@current'
      );
      expect(currentCall).toBeDefined();
    });

    it('appends to existing versions', () => {
      const existingVersions: PersistSnapshot[] = [
        { ts: 1000, drawings: [{ type: 'circle' }], selection: [] },
      ];
      localStorageMock.getItem.mockReturnValue(JSON.stringify(existingVersions));

      const drawings = [{ type: 'line' }];
      const selection = new Set<string>();

      saveVersion(drawings, selection);

      const versionsCall = localStorageMock.setItem.mock.calls.find(
        (call) => call[0] === 'lokifi-drawings@versions'
      );
      const savedVersions = JSON.parse(versionsCall?.[1] as string);
      expect(savedVersions).toHaveLength(2);
      expect(savedVersions[0]).toEqual(existingVersions[0]);
    });

    it('limits version history to MAX_VERSIONS (20)', () => {
      // Create 20 existing versions
      const existingVersions: PersistSnapshot[] = Array.from({ length: 20 }, (_, i) => ({
        ts: i,
        drawings: [],
        selection: [],
      }));
      localStorageMock.getItem.mockReturnValue(JSON.stringify(existingVersions));

      const drawings: any[] = [];
      const selection = new Set<string>();

      saveVersion(drawings, selection);

      const versionsCall = localStorageMock.setItem.mock.calls.find(
        (call) => call[0] === 'lokifi-drawings@versions'
      );
      const savedVersions = JSON.parse(versionsCall?.[1] as string);

      // Should still be 20 (oldest removed, new one added)
      expect(savedVersions).toHaveLength(20);
      // First version should be the second from original list (oldest removed)
      expect(savedVersions[0]?.ts).toBe(1);
    });

    it('handles localStorage errors by falling back to saveCurrent', () => {
      // Make getItem throw to trigger catch block
      localStorageMock.getItem.mockImplementation(() => {
        throw new Error('localStorage error');
      });

      const drawings = [{ type: 'line' }];
      const selection = new Set(['id1']);

      // Should not throw
      expect(() => {
        saveVersion(drawings, selection);
      }).not.toThrow();

      // Should still save current as fallback
      const currentCall = localStorageMock.setItem.mock.calls.find(
        (call) => call[0] === 'lokifi-drawings@current'
      );
      expect(currentCall).toBeDefined();
    });

    it('handles JSON parsing errors when loading versions', () => {
      localStorageMock.getItem.mockReturnValue('invalid json');

      const drawings: any[] = [];
      const selection = new Set<string>();

      // Should not throw, fallback to saveCurrent
      expect(() => {
        saveVersion(drawings, selection);
      }).not.toThrow();
    });
  });

  describe('listVersions', () => {
    it('returns array of saved versions', () => {
      const versions: PersistSnapshot[] = [
        { ts: 1000, drawings: [{ type: 'line' }], selection: ['id1'] },
        { ts: 2000, drawings: [{ type: 'circle' }], selection: ['id2'] },
      ];
      localStorageMock.getItem.mockReturnValue(JSON.stringify(versions));

      const result = listVersions();

      expect(localStorageMock.getItem).toHaveBeenCalledWith('lokifi-drawings@versions');
      expect(result).toEqual(versions);
      expect(result).toHaveLength(2);
    });

    it('returns empty array when no versions exist', () => {
      localStorageMock.getItem.mockReturnValue(null);

      const result = listVersions();

      expect(result).toEqual([]);
    });

    it('returns empty array when JSON parsing fails', () => {
      localStorageMock.getItem.mockReturnValue('invalid json');

      const result = listVersions();

      expect(result).toEqual([]);
    });

    it('handles localStorage getItem throwing error', () => {
      localStorageMock.getItem.mockImplementation(() => {
        throw new Error('localStorage error');
      });

      const result = listVersions();

      expect(result).toEqual([]);
    });
  });

  describe('integration scenarios', () => {
    it('full workflow: save version, load current, list versions', () => {
      const mockTimestamp = 1234567890;
      vi.spyOn(Date, 'now').mockReturnValue(mockTimestamp);

      // Save a version
      const drawings1 = [{ type: 'line', id: '1' }];
      const selection1 = new Set(['1']);
      saveVersion(drawings1, selection1);

      // Load current (should match what was saved)
      const current = loadCurrent();
      expect(current).toEqual({
        ts: mockTimestamp,
        drawings: drawings1,
        selection: ['1'],
      });

      // List versions (should have 1 version)
      const versions = listVersions();
      expect(versions).toHaveLength(1);
      expect(versions[0]).toEqual({
        ts: mockTimestamp,
        drawings: drawings1,
        selection: ['1'],
      });
    });

    it('maintains version history across multiple saves', () => {
      // Save 3 versions
      for (let i = 0; i < 3; i++) {
        vi.spyOn(Date, 'now').mockReturnValue(1000 + i);
        saveVersion([{ type: 'drawing', id: `${i}` }], new Set([`id-${i}`]));
      }

      const versions = listVersions();
      expect(versions).toHaveLength(3);
      expect(versions[0]?.ts).toBe(1000);
      expect(versions[1]?.ts).toBe(1001);
      expect(versions[2]?.ts).toBe(1002);
    });
  });
});

