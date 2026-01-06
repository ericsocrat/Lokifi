import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  registerContextAction,
  listContextActions,
  runAction,
} from '@/lib/plugins/pluginAPI';

// Mock the useChartStore
vi.mock('@/state/store', () => ({
  useChartStore: {
    getState: vi.fn(() => ({
      selection: new Set(['drawing1', 'drawing2']),
      drawings: [{ id: 'drawing1' }, { id: 'drawing2' }],
    })),
  },
}));

describe('pluginAPI', () => {
  beforeEach(() => {
    // Clear the registry between tests by re-registering the same actions
    // Note: The registry is module-level state, so we can't clear it directly
    // We'll test behavior rather than state
    vi.clearAllMocks();
  });

  describe('registerContextAction', () => {
    it('should register an action with id and label', () => {
      const runFn = vi.fn();
      registerContextAction('test-action', 'Test Action', runFn);

      const actions = listContextActions();
      const testAction = actions.find((a) => a.id === 'test-action');

      expect(testAction).toBeDefined();
      expect(testAction?.label).toBe('Test Action');
    });

    it('should register multiple actions', () => {
      registerContextAction('action1', 'Action 1', vi.fn());
      registerContextAction('action2', 'Action 2', vi.fn());

      const actions = listContextActions();
      const ids = actions.map((a) => a.id);

      expect(ids).toContain('action1');
      expect(ids).toContain('action2');
    });

    it('should overwrite action with same id', () => {
      const runFn1 = vi.fn();
      const runFn2 = vi.fn();

      registerContextAction('same-id', 'First Label', runFn1);
      registerContextAction('same-id', 'Second Label', runFn2);

      const actions = listContextActions();
      const action = actions.find((a) => a.id === 'same-id');

      expect(action?.label).toBe('Second Label');
    });
  });

  describe('listContextActions', () => {
    it('should return all registered actions', () => {
      registerContextAction('list-test-1', 'List Test 1', vi.fn());
      registerContextAction('list-test-2', 'List Test 2', vi.fn());

      const actions = listContextActions();

      expect(Array.isArray(actions)).toBe(true);
      expect(actions.length).toBeGreaterThanOrEqual(2);
    });

    it('should return actions with correct structure', () => {
      const runFn = vi.fn();
      registerContextAction('struct-test', 'Structure Test', runFn);

      const actions = listContextActions();
      const action = actions.find((a) => a.id === 'struct-test');

      expect(action).toHaveProperty('id');
      expect(action).toHaveProperty('label');
      expect(action).toHaveProperty('run');
      expect(typeof action?.run).toBe('function');
    });
  });

  describe('runAction', () => {
    it('should call the action run function with selection', () => {
      const runFn = vi.fn();
      registerContextAction('run-test', 'Run Test', runFn);

      runAction('run-test');

      expect(runFn).toHaveBeenCalledWith(['drawing1', 'drawing2']);
    });

    it('should not throw for non-existent action', () => {
      expect(() => runAction('non-existent')).not.toThrow();
    });

    it('should pass selection as array', () => {
      const runFn = vi.fn();
      registerContextAction('array-test', 'Array Test', runFn);

      runAction('array-test');

      const call = runFn.mock.calls[0];
      expect(Array.isArray(call[0])).toBe(true);
    });
  });

  describe('global Lokifi object', () => {
    it('should expose plugins on globalThis.Lokifi', () => {
      // Cast globalThis to avoid type errors
      const globalAny = globalThis as unknown as { Lokifi?: { plugins?: unknown } };

      expect(globalAny.Lokifi).toBeDefined();
      expect(globalAny.Lokifi?.plugins).toBeDefined();
    });

    it('should expose required methods on Lokifi.plugins', () => {
      const globalAny = globalThis as unknown as {
        Lokifi?: {
          plugins?: {
            registerContextAction: unknown;
            listContextActions: unknown;
            runAction: unknown;
            getDrawings: unknown;
            getSelection: unknown;
          };
        };
      };

      expect(typeof globalAny.Lokifi?.plugins?.registerContextAction).toBe('function');
      expect(typeof globalAny.Lokifi?.plugins?.listContextActions).toBe('function');
      expect(typeof globalAny.Lokifi?.plugins?.runAction).toBe('function');
      expect(typeof globalAny.Lokifi?.plugins?.getDrawings).toBe('function');
      expect(typeof globalAny.Lokifi?.plugins?.getSelection).toBe('function');
    });

    it('should return drawings from getDrawings', () => {
      const globalAny = globalThis as unknown as {
        Lokifi?: { plugins?: { getDrawings: () => unknown[] } };
      };

      const drawings = globalAny.Lokifi?.plugins?.getDrawings();

      expect(Array.isArray(drawings)).toBe(true);
    });

    it('should return selection from getSelection', () => {
      const globalAny = globalThis as unknown as {
        Lokifi?: { plugins?: { getSelection: () => string[] } };
      };

      const selection = globalAny.Lokifi?.plugins?.getSelection();

      expect(Array.isArray(selection)).toBe(true);
    });
  });
});
