import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  listSlots,
  saveSlot,
  loadSlot,
  deleteSlot,
  projectFromState,
  fnv1a,
  type ProjectV1,
} from '@/lib/data/persistence';
import type { Drawing } from '@/lib/utils/drawings';

describe('persistence', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  describe('fnv1a', () => {
    it('generates consistent hash for same input', () => {
      const input = 'test string';
      const hash1 = fnv1a(input);
      const hash2 = fnv1a(input);

      expect(hash1).toBe(hash2);
    });

    it('generates different hashes for different inputs', () => {
      const hash1 = fnv1a('string one');
      const hash2 = fnv1a('string two');

      expect(hash1).not.toBe(hash2);
    });

    it('returns 8-character hex string', () => {
      const hash = fnv1a('test');

      expect(hash).toMatch(/^[0-9a-f]{8}$/);
      expect(hash.length).toBe(8);
    });

    it('handles empty string', () => {
      const hash = fnv1a('');

      expect(hash).toMatch(/^[0-9a-f]{8}$/);
    });

    it('handles special characters', () => {
      const hash = fnv1a('!@#$%^&*()');

      expect(hash).toMatch(/^[0-9a-f]{8}$/);
    });

    it('handles unicode characters', () => {
      const hash = fnv1a('Hello 世界 🌍');

      expect(hash).toMatch(/^[0-9a-f]{8}$/);
    });

    it('handles long strings', () => {
      const longString = 'a'.repeat(10000);
      const hash = fnv1a(longString);

      expect(hash).toMatch(/^[0-9a-f]{8}$/);
    });

    it('produces different hash for similar strings', () => {
      const hash1 = fnv1a('test');
      const hash2 = fnv1a('test '); // Extra space

      expect(hash1).not.toBe(hash2);
    });
  });

  describe('listSlots', () => {
    it('returns empty array when no slots exist', () => {
      const slots = listSlots();

      expect(slots).toEqual([]);
    });

    it('returns list of slot names', () => {
      localStorage.setItem('lokifi.project.slotIndex', JSON.stringify(['slot1', 'slot2', 'slot3']));

      const slots = listSlots();

      expect(slots).toEqual(['slot1', 'slot2', 'slot3']);
    });

    it('returns empty array when localStorage item is malformed', () => {
      localStorage.setItem('lokifi.project.slotIndex', 'not valid json');

      const slots = listSlots();

      expect(slots).toEqual([]);
    });

    it('returns empty array when stored value is not an array', () => {
      localStorage.setItem('lokifi.project.slotIndex', JSON.stringify({ not: 'an array' }));

      const slots = listSlots();

      expect(slots).toEqual([]);
    });

    it('handles localStorage errors gracefully', () => {
      const spy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
        throw new Error('Storage error');
      });

      const slots = listSlots();

      expect(slots).toEqual([]);
      
      spy.mockRestore();
    });
  });

  describe('saveSlot', () => {
    it('saves project to localStorage', () => {
      const project: ProjectV1 = {
        version: 1,
        name: 'Test Project',
        createdAt: Date.now(),
        drawings: [],
        theme: 'dark',
        timeframe: '1h',
      };

      saveSlot('mySlot', project);

      const saved = localStorage.getItem('lokifi.project.mySlot');
      expect(saved).toBeDefined();
      expect(saved).not.toBeNull();
    });

    it('includes checksum in saved data', () => {
      const project: ProjectV1 = {
        version: 1,
        name: 'Test',
        createdAt: 123456789,
        drawings: [],
      };

      saveSlot('test', project);

      const saved = localStorage.getItem('lokifi.project.test');
      const parsed = JSON.parse(saved!);

      expect(parsed).toHaveProperty('checksum');
      expect(parsed).toHaveProperty('payload');
      expect(parsed.checksum).toMatch(/^[0-9a-f]{8}$/);
    });

    it('adds slot name to index', () => {
      const project: ProjectV1 = {
        version: 1,
        name: 'Test',
        createdAt: Date.now(),
        drawings: [],
      };

      saveSlot('newSlot', project);

      const slots = listSlots();
      expect(slots).toContain('newSlot');
    });

    it('updates existing slot without duplicating in index', () => {
      const project: ProjectV1 = {
        version: 1,
        name: 'Original',
        createdAt: Date.now(),
        drawings: [],
      };

      saveSlot('slot1', project);
      saveSlot('slot1', { ...project, name: 'Updated' });

      const slots = listSlots();
      const slot1Count = slots.filter((s) => s === 'slot1').length;

      expect(slot1Count).toBe(1);
    });

    it('preserves other slots in index', () => {
      const project: ProjectV1 = {
        version: 1,
        name: 'Test',
        createdAt: Date.now(),
        drawings: [],
      };

      saveSlot('slot1', project);
      saveSlot('slot2', project);
      saveSlot('slot3', project);

      const slots = listSlots();

      expect(slots).toContain('slot1');
      expect(slots).toContain('slot2');
      expect(slots).toContain('slot3');
    });

    it('saves project with drawings', () => {
      const drawings: Drawing[] = [
        {
          id: 'draw1',
          type: 'line',
          points: [{ x: 0, y: 0 }, { x: 100, y: 100 }],
          style: { color: '#000', width: 2 },
        } as any,
      ];

      const project: ProjectV1 = {
        version: 1,
        name: 'With Drawings',
        createdAt: Date.now(),
        drawings,
      };

      saveSlot('drawTest', project);

      const loaded = loadSlot('drawTest');
      expect(loaded?.drawings).toEqual(drawings);
    });
  });

  describe('loadSlot', () => {
    it('returns null when slot does not exist', () => {
      const result = loadSlot('nonExistent');

      expect(result).toBeNull();
    });

    it('loads saved project correctly', () => {
      const project: ProjectV1 = {
        version: 1,
        name: 'Load Test',
        createdAt: 123456789,
        drawings: [],
        theme: 'light',
        timeframe: '5m',
      };

      saveSlot('loadTest', project);
      const loaded = loadSlot('loadTest');

      expect(loaded).toEqual(project);
    });

    it('validates checksum', () => {
      const project: ProjectV1 = {
        version: 1,
        name: 'Test',
        createdAt: Date.now(),
        drawings: [],
      };

      saveSlot('checksumTest', project);

      // Corrupt the checksum
      const saved = localStorage.getItem('lokifi.project.checksumTest');
      const parsed = JSON.parse(saved!);
      parsed.checksum = 'invalid00';
      localStorage.setItem('lokifi.project.checksumTest', JSON.stringify(parsed));

      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const loaded = loadSlot('checksumTest');

      expect(consoleWarnSpy).toHaveBeenCalledWith('Checksum mismatch for slot', 'checksumTest');
      expect(loaded).toEqual(project); // Still loads despite warning
    });

    it('returns null for invalid JSON', () => {
      localStorage.setItem('lokifi.project.invalid', 'not valid json');

      const loaded = loadSlot('invalid');

      expect(loaded).toBeNull();
    });

    it('returns null for wrong version', () => {
      const wrongVersion = {
        checksum: 'abcd1234',
        payload: {
          version: 2, // Wrong version
          name: 'Test',
          createdAt: Date.now(),
        },
      };

      localStorage.setItem('lokifi.project.wrongVer', JSON.stringify(wrongVersion));

      const loaded = loadSlot('wrongVer');

      expect(loaded).toBeNull();
    });

    it('returns null for malformed project data', () => {
      const malformed = {
        checksum: 'abcd1234',
        payload: {
          // Missing version field
          name: 'Test',
        },
      };

      localStorage.setItem('lokifi.project.malformed', JSON.stringify(malformed));

      const loaded = loadSlot('malformed');

      expect(loaded).toBeNull();
    });

    it('loads project with optional fields', () => {
      const project: ProjectV1 = {
        version: 1,
        name: 'Optional Fields',
        createdAt: Date.now(),
        drawings: [],
        theme: 'dark',
        timeframe: '1d',
      };

      saveSlot('optionalTest', project);
      const loaded = loadSlot('optionalTest');

      expect(loaded?.theme).toBe('dark');
      expect(loaded?.timeframe).toBe('1d');
    });

    it('loads project without optional fields', () => {
      const project: ProjectV1 = {
        version: 1,
        name: 'Minimal',
        createdAt: Date.now(),
        drawings: [],
      };

      saveSlot('minimalTest', project);
      const loaded = loadSlot('minimalTest');

      expect(loaded?.theme).toBeUndefined();
      expect(loaded?.timeframe).toBeUndefined();
    });
  });

  describe('deleteSlot', () => {
    it('removes slot from localStorage', () => {
      const project: ProjectV1 = {
        version: 1,
        name: 'To Delete',
        createdAt: Date.now(),
        drawings: [],
      };

      saveSlot('deleteMe', project);
      expect(localStorage.getItem('lokifi.project.deleteMe')).not.toBeNull();

      deleteSlot('deleteMe');

      expect(localStorage.getItem('lokifi.project.deleteMe')).toBeNull();
    });

    it('removes slot from index', () => {
      const project: ProjectV1 = {
        version: 1,
        name: 'Test',
        createdAt: Date.now(),
        drawings: [],
      };

      saveSlot('slot1', project);
      saveSlot('slot2', project);

      expect(listSlots()).toContain('slot1');

      deleteSlot('slot1');

      const slots = listSlots();
      expect(slots).not.toContain('slot1');
      expect(slots).toContain('slot2'); // Other slots preserved
    });

    it('handles deleting non-existent slot gracefully', () => {
      expect(() => deleteSlot('nonExistent')).not.toThrow();

      const slots = listSlots();
      expect(slots).toEqual([]);
    });

    it('preserves other slots when deleting one', () => {
      const project: ProjectV1 = {
        version: 1,
        name: 'Test',
        createdAt: Date.now(),
        drawings: [],
      };

      saveSlot('keep1', project);
      saveSlot('keep2', project);
      saveSlot('delete', project);

      deleteSlot('delete');

      const slots = listSlots();
      expect(slots).toContain('keep1');
      expect(slots).toContain('keep2');
      expect(slots).not.toContain('delete');
    });
  });

  describe('projectFromState', () => {
    it('creates project with default name', () => {
      const state = {
        drawings: [],
        theme: 'dark' as const,
        timeframe: '1h',
      };

      const project = projectFromState(state);

      expect(project.name).toBe('Untitled');
      expect(project.version).toBe(1);
      expect(project.drawings).toEqual([]);
      expect(project.theme).toBe('dark');
      expect(project.timeframe).toBe('1h');
      expect(project.createdAt).toBeGreaterThan(0);
    });

    it('creates project with custom name', () => {
      const state = {
        drawings: [],
        theme: 'light' as const,
        timeframe: '5m',
      };

      const project = projectFromState(state, 'My Project');

      expect(project.name).toBe('My Project');
    });

    it('includes current timestamp', () => {
      const before = Date.now();
      const state = {
        drawings: [],
        theme: 'dark' as const,
        timeframe: '1h',
      };

      const project = projectFromState(state);
      const after = Date.now();

      expect(project.createdAt).toBeGreaterThanOrEqual(before);
      expect(project.createdAt).toBeLessThanOrEqual(after);
    });

    it('copies drawings array', () => {
      const drawings: Drawing[] = [
        {
          id: 'draw1',
          type: 'line',
          points: [{ x: 10, y: 20 }],
          style: { color: '#f00', width: 1 },
        } as any,
      ];

      const state = {
        drawings,
        theme: 'light' as const,
        timeframe: '15m',
      };

      const project = projectFromState(state);

      expect(project.drawings).toEqual(drawings);
      expect(project.drawings).toBe(drawings); // Same reference (no deep clone)
    });

    it('preserves theme and timeframe', () => {
      const state = {
        drawings: [],
        theme: 'light' as const,
        timeframe: '1w',
      };

      const project = projectFromState(state);

      expect(project.theme).toBe('light');
      expect(project.timeframe).toBe('1w');
    });
  });

  describe('Integration: Full workflow', () => {
    it('saves, lists, loads, and deletes projects', () => {
      const project1: ProjectV1 = {
        version: 1,
        name: 'Project 1',
        createdAt: Date.now(),
        drawings: [],
        theme: 'dark',
        timeframe: '1h',
      };

      const project2: ProjectV1 = {
        version: 1,
        name: 'Project 2',
        createdAt: Date.now(),
        drawings: [],
        theme: 'light',
        timeframe: '5m',
      };

      // Save two projects
      saveSlot('proj1', project1);
      saveSlot('proj2', project2);

      // List should show both
      let slots = listSlots();
      expect(slots).toHaveLength(2);
      expect(slots).toContain('proj1');
      expect(slots).toContain('proj2');

      // Load should work correctly
      const loaded1 = loadSlot('proj1');
      const loaded2 = loadSlot('proj2');
      expect(loaded1).toEqual(project1);
      expect(loaded2).toEqual(project2);

      // Delete one
      deleteSlot('proj1');

      // List should show only one
      slots = listSlots();
      expect(slots).toHaveLength(1);
      expect(slots).not.toContain('proj1');
      expect(slots).toContain('proj2');

      // Deleted slot should not load
      expect(loadSlot('proj1')).toBeNull();

      // Other slot still loads
      expect(loadSlot('proj2')).toEqual(project2);
    });

    it('handles updates to existing projects', () => {
      const original: ProjectV1 = {
        version: 1,
        name: 'Original Name',
        createdAt: 111111,
        drawings: [],
      };

      saveSlot('update-test', original);

      const updated: ProjectV1 = {
        version: 1,
        name: 'Updated Name',
        createdAt: 222222,
        drawings: [{ id: 'new', type: 'circle' } as any],
        theme: 'dark',
      };

      saveSlot('update-test', updated);

      const loaded = loadSlot('update-test');
      expect(loaded).toEqual(updated);

      // Should still be only one slot in index
      const slots = listSlots();
      const count = slots.filter((s) => s === 'update-test').length;
      expect(count).toBe(1);
    });
  });
});
