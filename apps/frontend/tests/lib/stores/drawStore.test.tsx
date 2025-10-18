import { drawStore, type Shape } from '@/lib/stores/drawStore';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Mock the symbol and timeframe stores
vi.mock('@/lib/stores/symbolStore', () => ({
  symbolStore: {
    get: () => 'BTCUSD',
  },
}));

vi.mock('@/lib/stores/timeframeStore', () => ({
  timeframeStore: {
    get: () => '1h',
  },
}));

describe('DrawStore', () => {
  let unsubscribe: (() => void) | null = null;

  beforeEach(() => {
    // Clear shapes and reset state
    drawStore.replaceShapes([]);
    drawStore.setTool('cursor');
    drawStore.setSnap(true);
    drawStore.clearSelection();
    localStorageMock.clear();
  });

  afterEach(() => {
    if (unsubscribe) {
      unsubscribe();
      unsubscribe = null;
    }
  });

  describe('Initial State', () => {
    it('should initialize with cursor tool', () => {
      const state = drawStore.get();
      expect(state.tool).toBe('cursor');
    });

    it('should initialize with snap enabled', () => {
      const state = drawStore.get();
      expect(state.snap).toBe(true);
    });

    it('should initialize with empty shapes array', () => {
      const state = drawStore.get();
      expect(state.shapes).toEqual([]);
    });

    it('should initialize with no selection', () => {
      const state = drawStore.get();
      expect(state.selectedIds).toEqual([]);
    });
  });

  describe('Tool Management', () => {
    it('should set tool to trendline', () => {
      drawStore.setTool('trendline');
      const state = drawStore.get();
      expect(state.tool).toBe('trendline');
    });

    it('should set tool to ray', () => {
      drawStore.setTool('ray');
      expect(drawStore.get().tool).toBe('ray');
    });

    it('should set tool to hline', () => {
      drawStore.setTool('hline');
      expect(drawStore.get().tool).toBe('hline');
    });

    it('should set tool to rect', () => {
      drawStore.setTool('rect');
      expect(drawStore.get().tool).toBe('rect');
    });

    it('should set tool to fib', () => {
      drawStore.setTool('fib');
      expect(drawStore.get().tool).toBe('fib');
    });

    it('should set tool back to cursor', () => {
      drawStore.setTool('trendline');
      drawStore.setTool('cursor');
      expect(drawStore.get().tool).toBe('cursor');
    });
  });

  describe('Snap Mode', () => {
    it('should toggle snap from true to false', () => {
      drawStore.setSnap(false);
      expect(drawStore.get().snap).toBe(false);
    });

    it('should toggle snap from false to true', () => {
      drawStore.setSnap(false);
      drawStore.setSnap(true);
      expect(drawStore.get().snap).toBe(true);
    });
  });

  describe('Shape Creation', () => {
    it('should add a trendline shape', () => {
      const shape: Shape = {
        id: 'tl-1',
        type: 'trendline',
        a: { t: 1000, p: 100 },
        b: { t: 2000, p: 200 },
      };

      drawStore.addShape(shape);

      const state = drawStore.get();
      expect(state.shapes).toHaveLength(1);
      expect(state.shapes[0]).toEqual(shape);
    });

    it('should add a horizontal line shape', () => {
      const shape: Shape = {
        id: 'hl-1',
        type: 'hline',
        y: 150,
      };

      drawStore.addShape(shape);

      expect(drawStore.get().shapes).toHaveLength(1);
      expect(drawStore.get().shapes[0]).toEqual(shape);
    });

    it('should add a rectangle shape', () => {
      const shape: Shape = {
        id: 'rect-1',
        type: 'rect',
        a: { t: 1000, p: 100 },
        b: { t: 2000, p: 200 },
      };

      drawStore.addShape(shape);

      expect(drawStore.get().shapes[0]).toEqual(shape);
    });

    it('should add a fibonacci retracement', () => {
      const shape: Shape = {
        id: 'fib-1',
        type: 'fib',
        a: { t: 1000, p: 100 },
        b: { t: 2000, p: 200 },
        levels: [0, 0.236, 0.382, 0.5, 0.618, 1],
      };

      drawStore.addShape(shape);

      expect(drawStore.get().shapes[0]).toEqual(shape);
    });

    it('should add multiple shapes', () => {
      drawStore.addShape({
        id: 'tl-1',
        type: 'trendline',
        a: { t: 1000, p: 100 },
        b: { t: 2000, p: 200 },
      });

      drawStore.addShape({
        id: 'hl-1',
        type: 'hline',
        y: 150,
      });

      expect(drawStore.get().shapes).toHaveLength(2);
    });

    it('should persist shape to localStorage on add', () => {
      const shape: Shape = {
        id: 'tl-1',
        type: 'trendline',
        a: { t: 1000, p: 100 },
        b: { t: 2000, p: 200 },
      };

      drawStore.addShape(shape);

      const key = 'lokifi.drawings.BTCUSD.1h';
      const stored = localStorage.getItem(key);
      expect(stored).toBeTruthy();
      expect(JSON.parse(stored!)).toEqual([shape]);
    });
  });

  describe('Shape Update', () => {
    it('should update a shape', () => {
      drawStore.addShape({
        id: 'tl-1',
        type: 'trendline',
        a: { t: 1000, p: 100 },
        b: { t: 2000, p: 200 },
      });

      drawStore.updateShape('tl-1', (shape) => ({
        ...shape,
        a: { t: 1500, p: 150 },
      }));

      const updated = drawStore.get().shapes[0] as Extract<Shape, { type: 'trendline' }>;
      expect(updated?.a).toEqual({ t: 1500, p: 150 });
      expect(updated?.b).toEqual({ t: 2000, p: 200 }); // Unchanged
    });

    it('should not error when updating non-existent shape', () => {
      expect(() => {
        drawStore.updateShape('non-existent', (s) => s);
      }).not.toThrow();
    });

    it('should persist updated shape to localStorage', () => {
      drawStore.addShape({
        id: 'tl-1',
        type: 'trendline',
        a: { t: 1000, p: 100 },
        b: { t: 2000, p: 200 },
      });

      drawStore.updateShape('tl-1', (shape) => ({
        ...shape,
        a: { t: 1500, p: 150 },
      }));

      const key = 'lokifi.drawings.BTCUSD.1h';
      const stored = JSON.parse(localStorage.getItem(key)!);
      expect(stored[0].a).toEqual({ t: 1500, p: 150 });
    });
  });

  describe('Selection Management', () => {
    beforeEach(() => {
      drawStore.addShape({ id: 'shape-1', type: 'hline', y: 100 });
      drawStore.addShape({ id: 'shape-2', type: 'hline', y: 200 });
      drawStore.addShape({ id: 'shape-3', type: 'hline', y: 300 });
    });

    it('should set multiple selected IDs', () => {
      drawStore.setSelection(['shape-1', 'shape-2']);

      expect(drawStore.get().selectedIds).toEqual(['shape-1', 'shape-2']);
    });

    it('should remove duplicates when setting selection', () => {
      drawStore.setSelection(['shape-1', 'shape-1', 'shape-2']);

      expect(drawStore.get().selectedIds).toEqual(['shape-1', 'shape-2']);
    });

    it('should select one shape', () => {
      drawStore.selectOne('shape-2');

      expect(drawStore.get().selectedIds).toEqual(['shape-2']);
    });

    it('should clear selection when selecting null', () => {
      drawStore.setSelection(['shape-1', 'shape-2']);
      drawStore.selectOne(null);

      expect(drawStore.get().selectedIds).toEqual([]);
    });

    it('should toggle selection on', () => {
      drawStore.toggle('shape-1');

      expect(drawStore.get().selectedIds).toEqual(['shape-1']);
    });

    it('should toggle selection off', () => {
      drawStore.setSelection(['shape-1']);
      drawStore.toggle('shape-1');

      expect(drawStore.get().selectedIds).toEqual([]);
    });

    it('should toggle multiple shapes independently', () => {
      drawStore.toggle('shape-1');
      drawStore.toggle('shape-2');

      expect(drawStore.get().selectedIds).toContain('shape-1');
      expect(drawStore.get().selectedIds).toContain('shape-2');
    });

    it('should clear all selection', () => {
      drawStore.setSelection(['shape-1', 'shape-2', 'shape-3']);
      drawStore.clearSelection();

      expect(drawStore.get().selectedIds).toEqual([]);
    });
  });

  describe('Shape Movement', () => {
    it('should move selected trendline by time and price delta', () => {
      drawStore.addShape({
        id: 'tl-1',
        type: 'trendline',
        a: { t: 1000, p: 100 },
        b: { t: 2000, p: 200 },
      });

      drawStore.setSelection(['tl-1']);
      drawStore.moveSelectedBy(500, 50);

      const moved = drawStore.get().shapes[0] as Extract<Shape, { type: 'trendline' }>;
      expect(moved?.a).toEqual({ t: 1500, p: 150 });
      expect(moved?.b).toEqual({ t: 2500, p: 250 });
    });

    it('should move horizontal line by price delta only', () => {
      drawStore.addShape({
        id: 'hl-1',
        type: 'hline',
        y: 100,
      });

      drawStore.setSelection(['hl-1']);
      drawStore.moveSelectedBy(500, 50);

      const moved = drawStore.get().shapes[0] as Extract<Shape, { type: 'hline' }>;
      expect(moved?.y).toBe(150);
    });

    it('should move multiple selected shapes', () => {
      drawStore.addShape({
        id: 'tl-1',
        type: 'trendline',
        a: { t: 1000, p: 100 },
        b: { t: 2000, p: 200 },
      });
      drawStore.addShape({ id: 'hl-1', type: 'hline', y: 150 });

      drawStore.setSelection(['tl-1', 'hl-1']);
      drawStore.moveSelectedBy(100, 25);

      const shapes = drawStore.get().shapes;
      const trendline = shapes[0] as Extract<Shape, { type: 'trendline' }>;
      const hline = shapes[1] as Extract<Shape, { type: 'hline' }>;
      expect(trendline?.a).toEqual({ t: 1100, p: 125 });
      expect(hline?.y).toBe(175);
    });

    it('should not move when no selection', () => {
      drawStore.addShape({
        id: 'tl-1',
        type: 'trendline',
        a: { t: 1000, p: 100 },
        b: { t: 2000, p: 200 },
      });

      const originalShape = drawStore.get().shapes[0] as Extract<Shape, { type: 'trendline' }>;
      const originalA = { ...originalShape?.a! };
      drawStore.moveSelectedBy(100, 50);

      const currentShape = drawStore.get().shapes[0] as Extract<Shape, { type: 'trendline' }>;
      expect(currentShape?.a).toEqual(originalA);
    });
  });

  describe('Clear Shapes', () => {
    it('should clear all shapes', () => {
      drawStore.addShape({ id: 'shape-1', type: 'hline', y: 100 });
      drawStore.addShape({ id: 'shape-2', type: 'hline', y: 200 });

      drawStore.clear();

      expect(drawStore.get().shapes).toEqual([]);
    });

    it('should clear selection when clearing shapes', () => {
      drawStore.addShape({ id: 'shape-1', type: 'hline', y: 100 });
      drawStore.setSelection(['shape-1']);

      drawStore.clear();

      expect(drawStore.get().selectedIds).toEqual([]);
    });

    it('should persist empty array to localStorage', () => {
      drawStore.addShape({ id: 'shape-1', type: 'hline', y: 100 });
      drawStore.clear();

      const key = 'lokifi.drawings.BTCUSD.1h';
      const stored = localStorage.getItem(key);
      expect(JSON.parse(stored!)).toEqual([]);
    });
  });

  describe('Undo/Redo', () => {
    it('should undo shape addition', () => {
      drawStore.addShape({ id: 'shape-1', type: 'hline', y: 100 });

      expect(drawStore.get().shapes).toHaveLength(1);

      drawStore.undo();

      expect(drawStore.get().shapes).toHaveLength(0);
    });

    it('should redo shape addition', () => {
      drawStore.addShape({ id: 'shape-1', type: 'hline', y: 100 });
      drawStore.undo();
      drawStore.redo();

      expect(drawStore.get().shapes).toHaveLength(1);
      expect(drawStore.get().shapes[0]?.id).toBe('shape-1');
    });

    it('should undo shape update', () => {
      drawStore.addShape({ id: 'hl-1', type: 'hline', y: 100 });
      drawStore.updateShape('hl-1', (s) => ({ ...s, y: 200 }));

      const updated = drawStore.get().shapes[0] as Extract<Shape, { type: 'hline' }>;
      expect(updated?.y).toBe(200);

      drawStore.undo();

      const undone = drawStore.get().shapes[0] as Extract<Shape, { type: 'hline' }>;
      expect(undone?.y).toBe(100);
    });

    it('should handle multiple undo operations', () => {
      drawStore.addShape({ id: 'shape-1', type: 'hline', y: 100 });
      drawStore.addShape({ id: 'shape-2', type: 'hline', y: 200 });
      drawStore.addShape({ id: 'shape-3', type: 'hline', y: 300 });

      drawStore.undo(); // Remove shape-3
      drawStore.undo(); // Remove shape-2

      expect(drawStore.get().shapes).toHaveLength(1);
      expect(drawStore.get().shapes[0]?.id).toBe('shape-1');
    });

    it('should not error when undoing with empty stack', () => {
      expect(() => {
        drawStore.undo();
        drawStore.undo();
      }).not.toThrow();
    });

    it('should not error when redoing with empty stack', () => {
      expect(() => {
        drawStore.redo();
      }).not.toThrow();
    });

    it('should clear redo stack on new action', () => {
      drawStore.addShape({ id: 'shape-1', type: 'hline', y: 100 });
      drawStore.addShape({ id: 'shape-2', type: 'hline', y: 200 });

      drawStore.undo(); // Can redo now

      // Add new shape - should clear redo stack
      drawStore.addShape({ id: 'shape-3', type: 'hline', y: 300 });

      drawStore.redo(); // Should do nothing

      expect(drawStore.get().shapes).toHaveLength(2);
      expect(drawStore.get().shapes.map((s) => s.id)).toEqual(['shape-1', 'shape-3']);
    });
  });

  describe('Remove Selected', () => {
    beforeEach(() => {
      drawStore.addShape({ id: 'shape-1', type: 'hline', y: 100 });
      drawStore.addShape({ id: 'shape-2', type: 'hline', y: 200 });
      drawStore.addShape({ id: 'shape-3', type: 'hline', y: 300 });
    });

    it('should remove selected shapes', () => {
      drawStore.setSelection(['shape-1', 'shape-3']);
      drawStore.removeSelected();

      const shapes = drawStore.get().shapes;
      expect(shapes).toHaveLength(1);
      expect(shapes[0]?.id).toBe('shape-2');
    });

    it('should clear selection after removing', () => {
      drawStore.setSelection(['shape-1']);
      drawStore.removeSelected();

      expect(drawStore.get().selectedIds).toEqual([]);
    });

    it('should not error when removing with no selection', () => {
      expect(() => {
        drawStore.removeSelected();
      }).not.toThrow();

      expect(drawStore.get().shapes).toHaveLength(3);
    });

    it('should be undoable', () => {
      drawStore.setSelection(['shape-2']);
      drawStore.removeSelected();

      expect(drawStore.get().shapes).toHaveLength(2);

      drawStore.undo();

      expect(drawStore.get().shapes).toHaveLength(3);
    });
  });

  describe('Replace Shapes', () => {
    it('should replace all shapes', () => {
      drawStore.addShape({ id: 'shape-1', type: 'hline', y: 100 });

      const newShapes: Shape[] = [
        { id: 'new-1', type: 'hline', y: 200 },
        { id: 'new-2', type: 'hline', y: 300 },
      ];

      drawStore.replaceShapes(newShapes);

      expect(drawStore.get().shapes).toEqual(newShapes);
    });

    it('should be undoable', () => {
      const original: Shape[] = [{ id: 'orig', type: 'hline', y: 100 }];
      drawStore.replaceShapes(original);

      const newShapes: Shape[] = [{ id: 'new', type: 'hline', y: 200 }];
      drawStore.replaceShapes(newShapes);

      drawStore.undo();

      expect(drawStore.get().shapes).toEqual(original);
    });

    it('should persist to localStorage', () => {
      const shapes: Shape[] = [{ id: 'shape-1', type: 'hline', y: 100 }];
      drawStore.replaceShapes(shapes);

      const key = 'lokifi.drawings.BTCUSD.1h';
      const stored = JSON.parse(localStorage.getItem(key)!);
      expect(stored).toEqual(shapes);
    });
  });

  describe('Load from Storage', () => {
    it('should load shapes from localStorage', () => {
      const shapes: Shape[] = [
        { id: 'shape-1', type: 'hline', y: 100 },
        { id: 'shape-2', type: 'hline', y: 200 },
      ];

      const key = 'lokifi.drawings.BTCUSD.1h';
      localStorage.setItem(key, JSON.stringify(shapes));

      drawStore.loadCurrent();

      expect(drawStore.get().shapes).toEqual(shapes);
    });

    it('should load empty array when no stored data', () => {
      drawStore.loadCurrent();

      expect(drawStore.get().shapes).toEqual([]);
    });

    it('should handle corrupted localStorage data', () => {
      const key = 'lokifi.drawings.BTCUSD.1h';
      localStorage.setItem(key, 'invalid json');

      expect(() => {
        drawStore.loadCurrent();
      }).not.toThrow();

      expect(drawStore.get().shapes).toEqual([]);
    });
  });

  describe('Subscription', () => {
    it('should notify subscribers of state changes', () => {
      const callback = vi.fn();
      unsubscribe = drawStore.subscribe(callback);

      expect(callback).toHaveBeenCalledTimes(1); // Initial call

      drawStore.setTool('trendline');

      expect(callback).toHaveBeenCalledTimes(2);
      expect(callback).toHaveBeenLastCalledWith(expect.objectContaining({ tool: 'trendline' }));
    });

    it('should unsubscribe correctly', () => {
      const callback = vi.fn();
      const unsub = drawStore.subscribe(callback);

      callback.mockClear(); // Clear initial call

      unsub();

      drawStore.setTool('ray');

      expect(callback).not.toHaveBeenCalled();
    });

    it('should handle multiple subscribers', () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();

      const unsub1 = drawStore.subscribe(callback1);
      const unsub2 = drawStore.subscribe(callback2);

      callback1.mockClear();
      callback2.mockClear();

      drawStore.setSnap(false);

      expect(callback1).toHaveBeenCalledTimes(1);
      expect(callback2).toHaveBeenCalledTimes(1);

      unsub1();
      unsub2();
    });
  });

  describe('Complex Scenarios', () => {
    it('should handle drawing workflow', () => {
      // Select trendline tool
      drawStore.setTool('trendline');

      // Add trendline
      drawStore.addShape({
        id: 'tl-1',
        type: 'trendline',
        a: { t: 1000, p: 100 },
        b: { t: 2000, p: 200 },
      });

      // Select it
      drawStore.selectOne('tl-1');

      // Move it
      drawStore.moveSelectedBy(100, 10);

      // Verify
      const shape = drawStore.get().shapes[0] as Extract<Shape, { type: 'trendline' }>;
      expect(shape?.a).toEqual({ t: 1100, p: 110 });
      expect(shape?.b).toEqual({ t: 2100, p: 210 });

      // Go back to cursor
      drawStore.setTool('cursor');
      expect(drawStore.get().tool).toBe('cursor');
    });

    it('should maintain data consistency across operations', () => {
      // Add multiple shapes
      drawStore.addShape({ id: 's1', type: 'hline', y: 100 });
      drawStore.addShape({ id: 's2', type: 'hline', y: 200 });
      drawStore.addShape({ id: 's3', type: 'hline', y: 300 });

      // Select and remove one
      drawStore.setSelection(['s2']);
      drawStore.removeSelected();

      // Verify consistency
      expect(drawStore.get().shapes).toHaveLength(2);
      expect(drawStore.get().selectedIds).toEqual([]);

      // Undo should restore both shapes and selection
      drawStore.undo();
      expect(drawStore.get().shapes).toHaveLength(3);
    });
  });
});
