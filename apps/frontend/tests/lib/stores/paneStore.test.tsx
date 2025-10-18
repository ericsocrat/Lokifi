import { usePaneStore } from '@/lib/stores/paneStore';
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

describe('PaneStore', () => {
  beforeEach(() => {
    // Reset store to default state before each test
    const { result } = renderHook(() => usePaneStore());
    act(() => {
      result.current.resetPanes();
    });
  });

  describe('Initial State', () => {
    it('should initialize with default price pane', () => {
      const { result } = renderHook(() => usePaneStore());

      expect(result.current.panes).toHaveLength(1);
      expect(result.current.panes[0]).toMatchObject({
        id: 'price-pane',
        type: 'price',
        height: 400,
        visible: true,
        locked: false,
      });
      expect(result.current.panes[0]?.indicators).toContain('sma');
    });

    it('should initialize with no dragged pane', () => {
      const { result } = renderHook(() => usePaneStore());

      expect(result.current.draggedPane).toBeNull();
    });
  });

  describe('Pane Creation', () => {
    it('should add a price pane', async () => {
      const { result } = renderHook(() => usePaneStore());
      let paneId: string;

      act(() => {
        paneId = result.current.addPane('price');
      });

      expect(result.current.panes).toHaveLength(2);
      const newPane = result.current.panes.find((p) => p.id === paneId!);
      expect(newPane).toBeDefined();
      expect(newPane?.type).toBe('price');
      expect(newPane?.height).toBe(400);
      expect(newPane?.visible).toBe(true);
      expect(newPane?.locked).toBe(false);
    });

    it('should add an indicator pane', async () => {
      const { result } = renderHook(() => usePaneStore());
      let paneId: string;

      act(() => {
        paneId = result.current.addPane('indicator', ['rsi', 'macd']);
      });

      expect(result.current.panes).toHaveLength(2);
      const newPane = result.current.panes.find((p) => p.id === paneId!);
      expect(newPane?.type).toBe('indicator');
      expect(newPane?.height).toBe(150);
      expect(newPane?.indicators).toEqual(['rsi', 'macd']);
    });

    it('should generate unique pane IDs', async () => {
      const { result } = renderHook(() => usePaneStore());
      let id1: string, id2: string;

      act(() => {
        id1 = result.current.addPane('indicator');
      });

      // Small delay to ensure unique timestamp
      await new Promise((resolve) => setTimeout(resolve, 2));

      act(() => {
        id2 = result.current.addPane('indicator');
      });

      expect(id1).not.toBe(id2);
      expect(result.current.panes).toHaveLength(3);
    });

    it('should add pane with empty indicators by default', () => {
      const { result } = renderHook(() => usePaneStore());
      let paneId: string;

      act(() => {
        paneId = result.current.addPane('indicator');
      });

      const newPane = result.current.panes.find((p) => p.id === paneId!);
      expect(newPane?.indicators).toEqual([]);
    });
  });

  describe('Pane Removal', () => {
    it('should remove a pane by ID', () => {
      const { result } = renderHook(() => usePaneStore());
      let paneId: string;

      act(() => {
        paneId = result.current.addPane('indicator');
      });

      expect(result.current.panes).toHaveLength(2);

      act(() => {
        result.current.removePane(paneId!);
      });

      expect(result.current.panes).toHaveLength(1);
      expect(result.current.panes.find((p) => p.id === paneId!)).toBeUndefined();
    });

    it('should not error when removing non-existent pane', () => {
      const { result } = renderHook(() => usePaneStore());

      expect(() => {
        act(() => {
          result.current.removePane('non-existent-id');
        });
      }).not.toThrow();

      expect(result.current.panes).toHaveLength(1);
    });

    it('should be able to remove default pane', () => {
      const { result } = renderHook(() => usePaneStore());

      act(() => {
        result.current.removePane('price-pane');
      });

      expect(result.current.panes).toHaveLength(0);
    });
  });

  describe('Pane Height Management', () => {
    it('should update pane height', () => {
      const { result } = renderHook(() => usePaneStore());

      act(() => {
        result.current.updatePaneHeight('price-pane', 600);
      });

      const pricePane = result.current.panes.find((p) => p.id === 'price-pane');
      expect(pricePane?.height).toBe(600);
    });

    it('should only update specified pane height', () => {
      const { result } = renderHook(() => usePaneStore());
      let paneId: string;

      act(() => {
        paneId = result.current.addPane('indicator');
        result.current.updatePaneHeight(paneId!, 200);
      });

      const pricePane = result.current.panes.find((p) => p.id === 'price-pane');
      const indicatorPane = result.current.panes.find((p) => p.id === paneId!);

      expect(pricePane?.height).toBe(400); // Unchanged
      expect(indicatorPane?.height).toBe(200); // Changed
    });

    it('should not error when updating non-existent pane', () => {
      const { result } = renderHook(() => usePaneStore());

      expect(() => {
        act(() => {
          result.current.updatePaneHeight('non-existent', 500);
        });
      }).not.toThrow();
    });
  });

  describe('Indicator Management', () => {
    it('should add indicator to pane', () => {
      const { result } = renderHook(() => usePaneStore());
      let paneId: string;

      act(() => {
        paneId = result.current.addPane('indicator', ['rsi']);
        result.current.addIndicatorToPane(paneId!, 'macd');
      });

      const pane = result.current.panes.find((p) => p.id === paneId!);
      expect(pane?.indicators).toEqual(['rsi', 'macd']);
    });

    it('should remove indicator from pane', () => {
      const { result } = renderHook(() => usePaneStore());

      act(() => {
        result.current.removeIndicatorFromPane('price-pane', 'sma');
      });

      const pricePane = result.current.panes.find((p) => p.id === 'price-pane');
      expect(pricePane?.indicators).not.toContain('sma');
      expect(pricePane?.indicators).toContain('ema'); // Others unchanged
    });

    it('should not error when removing non-existent indicator', () => {
      const { result } = renderHook(() => usePaneStore());

      expect(() => {
        act(() => {
          result.current.removeIndicatorFromPane('price-pane', 'non-existent');
        });
      }).not.toThrow();
    });

    it('should move indicator between panes', async () => {
      const { result } = renderHook(() => usePaneStore());
      let targetPaneId: string;

      act(() => {
        targetPaneId = result.current.addPane('indicator', ['rsi']);
      });

      await new Promise((resolve) => setTimeout(resolve, 2));

      act(() => {
        result.current.moveIndicatorToPane('sma', 'price-pane', targetPaneId!);
      });

      const pricePane = result.current.panes.find((p) => p.id === 'price-pane');
      const targetPane = result.current.panes.find((p) => p.id === targetPaneId!);

      expect(pricePane?.indicators).not.toContain('sma');
      expect(targetPane?.indicators).toContain('sma');
      expect(targetPane?.indicators).toContain('rsi');
    });
  });

  describe('Pane Visibility', () => {
    it('should toggle pane visibility from true to false', () => {
      const { result } = renderHook(() => usePaneStore());

      expect(result.current.panes[0]?.visible).toBe(true);

      act(() => {
        result.current.togglePaneVisibility('price-pane');
      });

      expect(result.current.panes[0]?.visible).toBe(false);
    });

    it('should toggle pane visibility from false to true', () => {
      const { result } = renderHook(() => usePaneStore());

      act(() => {
        result.current.togglePaneVisibility('price-pane');
        result.current.togglePaneVisibility('price-pane');
      });

      expect(result.current.panes[0]?.visible).toBe(true);
    });

    it('should only affect specified pane visibility', async () => {
      const { result } = renderHook(() => usePaneStore());
      let paneId: string;

      act(() => {
        paneId = result.current.addPane('indicator');
      });

      await new Promise((resolve) => setTimeout(resolve, 2));

      act(() => {
        result.current.togglePaneVisibility(paneId!);
      });

      const pricePane = result.current.panes.find((p) => p.id === 'price-pane');
      const indicatorPane = result.current.panes.find((p) => p.id === paneId!);

      expect(pricePane?.visible).toBe(true);
      expect(indicatorPane?.visible).toBe(false);
    });
  });

  describe('Pane Locking', () => {
    it('should toggle pane lock from false to true', () => {
      const { result } = renderHook(() => usePaneStore());

      expect(result.current.panes[0]?.locked).toBe(false);

      act(() => {
        result.current.togglePaneLock('price-pane');
      });

      expect(result.current.panes[0]?.locked).toBe(true);
    });

    it('should toggle pane lock from true to false', () => {
      const { result } = renderHook(() => usePaneStore());

      act(() => {
        result.current.togglePaneLock('price-pane');
        result.current.togglePaneLock('price-pane');
      });

      expect(result.current.panes[0]?.locked).toBe(false);
    });

    it('should only affect specified pane lock', async () => {
      const { result } = renderHook(() => usePaneStore());
      let paneId: string;

      act(() => {
        paneId = result.current.addPane('indicator');
      });

      await new Promise((resolve) => setTimeout(resolve, 2));

      act(() => {
        result.current.togglePaneLock(paneId!);
      });

      const pricePane = result.current.panes.find((p) => p.id === 'price-pane');
      const indicatorPane = result.current.panes.find((p) => p.id === paneId!);

      expect(pricePane?.locked).toBe(false);
      expect(indicatorPane?.locked).toBe(true);
    });
  });

  describe('Pane Reordering', () => {
    it('should reorder panes', async () => {
      const { result } = renderHook(() => usePaneStore());
      let pane1Id: string, pane2Id: string;

      act(() => {
        pane1Id = result.current.addPane('indicator', ['rsi']);
      });

      await new Promise((resolve) => setTimeout(resolve, 2));

      act(() => {
        pane2Id = result.current.addPane('indicator', ['macd']);
      });

      await new Promise((resolve) => setTimeout(resolve, 2));

      // Original order: price-pane, pane1, pane2
      expect(result.current.panes[0]?.id).toBe('price-pane');
      expect(result.current.panes[1]?.id).toBe(pane1Id!);
      expect(result.current.panes[2]?.id).toBe(pane2Id!);

      // Reorder to: pane2, price-pane, pane1
      act(() => {
        result.current.reorderPanes([pane2Id!, 'price-pane', pane1Id!]);
      });

      expect(result.current.panes[0]?.id).toBe(pane2Id!);
      expect(result.current.panes[1]?.id).toBe('price-pane');
      expect(result.current.panes[2]?.id).toBe(pane1Id!);
    });

    it('should handle empty reorder array', () => {
      const { result } = renderHook(() => usePaneStore());

      act(() => {
        result.current.reorderPanes([]);
      });

      expect(result.current.panes).toHaveLength(0);
    });

    it('should filter out non-existent pane IDs', async () => {
      const { result } = renderHook(() => usePaneStore());
      let paneId: string;

      act(() => {
        paneId = result.current.addPane('indicator');
      });

      await new Promise((resolve) => setTimeout(resolve, 2));

      act(() => {
        result.current.reorderPanes(['non-existent', 'price-pane', paneId!, 'another-fake']);
      });

      expect(result.current.panes).toHaveLength(2);
      expect(result.current.panes[0]?.id).toBe('price-pane');
      expect(result.current.panes[1]?.id).toBe(paneId!);
    });
  });

  describe('Drag State', () => {
    it('should set dragged pane ID', () => {
      const { result } = renderHook(() => usePaneStore());

      act(() => {
        result.current.setDraggedPane('price-pane');
      });

      expect(result.current.draggedPane).toBe('price-pane');
    });

    it('should clear dragged pane', () => {
      const { result } = renderHook(() => usePaneStore());

      act(() => {
        result.current.setDraggedPane('price-pane');
        result.current.setDraggedPane(null);
      });

      expect(result.current.draggedPane).toBeNull();
    });

    it('should update dragged pane ID', () => {
      const { result } = renderHook(() => usePaneStore());

      act(() => {
        result.current.setDraggedPane('pane-1');
        result.current.setDraggedPane('pane-2');
      });

      expect(result.current.draggedPane).toBe('pane-2');
    });
  });

  describe('Reset', () => {
    it('should reset panes to default state', async () => {
      const { result } = renderHook(() => usePaneStore());

      // Add some panes and modify state
      act(() => {
        result.current.addPane('indicator');
        result.current.setDraggedPane('some-id');
        result.current.togglePaneVisibility('price-pane');
      });

      await new Promise((resolve) => setTimeout(resolve, 2));

      expect(result.current.panes).toHaveLength(2);
      expect(result.current.draggedPane).toBe('some-id');

      // Reset
      act(() => {
        result.current.resetPanes();
      });

      expect(result.current.panes).toHaveLength(1);
      expect(result.current.panes[0]?.id).toBe('price-pane');
      expect(result.current.panes[0]?.visible).toBe(true);
      expect(result.current.draggedPane).toBeNull();
    });

    it('should restore default indicators on reset', () => {
      const { result } = renderHook(() => usePaneStore());

      act(() => {
        result.current.removeIndicatorFromPane('price-pane', 'sma');
        result.current.resetPanes();
      });

      const pricePane = result.current.panes.find((p) => p.id === 'price-pane');
      expect(pricePane?.indicators).toContain('sma');
      expect(pricePane?.indicators).toContain('ema');
      expect(pricePane?.indicators).toContain('bb');
      expect(pricePane?.indicators).toContain('vwap');
    });
  });

  describe('Edge Cases', () => {
    it('should handle rapid pane creation', async () => {
      const { result } = renderHook(() => usePaneStore());
      const ids: string[] = [];

      for (let i = 0; i < 5; i++) {
        act(() => {
          ids.push(result.current.addPane('indicator'));
        });
        if (i < 4) await new Promise((resolve) => setTimeout(resolve, 2));
      }

      expect(result.current.panes.length).toBeGreaterThanOrEqual(4);
      expect(new Set(ids).size).toBeGreaterThanOrEqual(4); // Most should be unique
    });

    it('should handle complex multi-operation sequence', async () => {
      const { result } = renderHook(() => usePaneStore());
      let pane1Id: string, pane2Id: string;

      // Create panes
      act(() => {
        pane1Id = result.current.addPane('indicator', ['rsi']);
      });

      await new Promise((resolve) => setTimeout(resolve, 2));

      act(() => {
        pane2Id = result.current.addPane('indicator', ['macd']);
      });

      await new Promise((resolve) => setTimeout(resolve, 2));

      // Modify state
      act(() => {
        result.current.updatePaneHeight(pane1Id!, 300);
        result.current.addIndicatorToPane(pane2Id!, 'stoch');
        result.current.togglePaneVisibility(pane1Id!);
        result.current.togglePaneLock(pane2Id!);
        result.current.moveIndicatorToPane('sma', 'price-pane', pane1Id!);
      });

      // Verify final state
      const pane1 = result.current.panes.find((p) => p.id === pane1Id!);
      const pane2 = result.current.panes.find((p) => p.id === pane2Id!);
      const pricePane = result.current.panes.find((p) => p.id === 'price-pane');

      expect(pane1?.height).toBe(300);
      expect(pane1?.visible).toBe(false);
      expect(pane1?.indicators).toContain('sma');

      expect(pane2?.locked).toBe(true);
      expect(pane2?.indicators).toEqual(['macd', 'stoch']);

      expect(pricePane?.indicators).not.toContain('sma');
    });

    it('should maintain pane count consistency', async () => {
      const { result } = renderHook(() => usePaneStore());
      const operations: string[] = [];

      // Perform random operations
      for (let i = 0; i < 10; i++) {
        if (i % 3 === 0) {
          act(() => {
            operations.push(result.current.addPane('indicator'));
          });
        } else if (i % 3 === 1 && operations.length > 0) {
          const id = operations[operations.length - 1]!;
          act(() => {
            result.current.removePane(id);
          });
          operations.pop();
        }
        if (i < 9) await new Promise((resolve) => setTimeout(resolve, 2));
      }

      // Count should match operations
      const expectedCount = 1 + operations.length; // 1 default + added panes
      expect(result.current.panes).toHaveLength(expectedCount);
    });
  });
});
