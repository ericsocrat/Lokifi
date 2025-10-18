/**
 * @vitest-environment jsdom
 */
import { useDrawingStore } from '@/lib/stores/drawingStore';
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

describe('DrawingStore', () => {
  beforeEach(() => {
    const { result } = renderHook(() => useDrawingStore());
    act(() => {
      result.current.clearAllObjects();
      result.current.setActiveTool('cursor');
    });
  });

  describe('Initial State', () => {
    it('should initialize with cursor tool', () => {
      const { result } = renderHook(() => useDrawingStore());
      expect(result.current.activeTool).toBe('cursor');
    });

    it('should not be drawing initially', () => {
      const { result } = renderHook(() => useDrawingStore());
      expect(result.current.isDrawing).toBe(false);
    });

    it('should have empty objects array', () => {
      const { result } = renderHook(() => useDrawingStore());
      expect(result.current.objects).toEqual([]);
    });

    it('should have no selected object', () => {
      const { result } = renderHook(() => useDrawingStore());
      expect(result.current.selectedObjectId).toBeNull();
    });

    it('should have no dragged object', () => {
      const { result } = renderHook(() => useDrawingStore());
      expect(result.current.draggedObjectId).toBeNull();
    });

    it('should have no current drawing', () => {
      const { result } = renderHook(() => useDrawingStore());
      expect(result.current.currentDrawing).toBeNull();
    });

    it('should have snap to price enabled by default', () => {
      const { result } = renderHook(() => useDrawingStore());
      expect(result.current.snapToPrice).toBe(true);
    });

    it('should have snap to grid disabled by default', () => {
      const { result } = renderHook(() => useDrawingStore());
      expect(result.current.snapToGrid).toBe(false);
    });

    it('should have magnet mode disabled by default', () => {
      const { result } = renderHook(() => useDrawingStore());
      expect(result.current.magnetMode).toBe(false);
    });
  });

  describe('Tool Management', () => {
    it('should set active tool to trendline', () => {
      const { result } = renderHook(() => useDrawingStore());

      act(() => {
        result.current.setActiveTool('trendline');
      });

      expect(result.current.activeTool).toBe('trendline');
    });

    it('should set active tool to rectangle', () => {
      const { result } = renderHook(() => useDrawingStore());

      act(() => {
        result.current.setActiveTool('rectangle');
      });

      expect(result.current.activeTool).toBe('rectangle');
    });

    it('should cancel drawing when switching to cursor', () => {
      const { result } = renderHook(() => useDrawingStore());

      act(() => {
        result.current.setActiveTool('trendline');
        result.current.startDrawing('pane-1', { x: 100, y: 200 });
      });

      expect(result.current.isDrawing).toBe(true);

      act(() => {
        result.current.setActiveTool('cursor');
      });

      expect(result.current.isDrawing).toBe(false);
      expect(result.current.currentDrawing).toBeNull();
    });

    it('should allow switching between drawing tools', () => {
      const { result } = renderHook(() => useDrawingStore());

      act(() => {
        result.current.setActiveTool('hline');
        result.current.setActiveTool('vline');
        result.current.setActiveTool('circle');
      });

      expect(result.current.activeTool).toBe('circle');
    });
  });

  describe('Drawing Session', () => {
    it('should start drawing a trendline', () => {
      const { result } = renderHook(() => useDrawingStore());

      act(() => {
        result.current.setActiveTool('trendline');
        result.current.startDrawing('pane-1', { x: 100, y: 200, time: 1000, price: 50000 });
      });

      expect(result.current.isDrawing).toBe(true);
      expect(result.current.currentDrawing).toBeDefined();
      expect(result.current.currentDrawing?.type).toBe('trendline');
      expect(result.current.currentDrawing?.paneId).toBe('pane-1');
      expect(result.current.currentDrawing?.points).toHaveLength(1);
    });

    it('should not start drawing when cursor tool is active', () => {
      const { result } = renderHook(() => useDrawingStore());

      act(() => {
        result.current.setActiveTool('cursor');
        result.current.startDrawing('pane-1', { x: 100, y: 200 });
      });

      expect(result.current.isDrawing).toBe(false);
      expect(result.current.currentDrawing).toBeNull();
    });

    it('should add points to current drawing', () => {
      const { result } = renderHook(() => useDrawingStore());

      act(() => {
        result.current.setActiveTool('trendline');
        result.current.startDrawing('pane-1', { x: 100, y: 200 });
        result.current.addPoint({ x: 150, y: 250 });
        result.current.addPoint({ x: 200, y: 300 });
      });

      expect(result.current.currentDrawing?.points).toHaveLength(3);
    });

    it('should not add points when not drawing', () => {
      const { result } = renderHook(() => useDrawingStore());

      act(() => {
        result.current.addPoint({ x: 100, y: 200 });
      });

      expect(result.current.currentDrawing).toBeNull();
    });

    it('should finish drawing and create object', async () => {
      const { result } = renderHook(() => useDrawingStore());

      await new Promise((resolve) => setTimeout(resolve, 2));

      act(() => {
        result.current.setActiveTool('hline');
        result.current.startDrawing('pane-1', { x: 100, y: 200 });
        result.current.finishDrawing();
      });

      expect(result.current.isDrawing).toBe(false);
      expect(result.current.currentDrawing).toBeNull();
      expect(result.current.objects).toHaveLength(1);
      expect(result.current.objects[0].type).toBe('hline');
    });

    it('should select object after finishing drawing', async () => {
      const { result } = renderHook(() => useDrawingStore());

      await new Promise((resolve) => setTimeout(resolve, 2));

      act(() => {
        result.current.setActiveTool('vline');
        result.current.startDrawing('pane-1', { x: 100, y: 200 });
        result.current.finishDrawing();
      });

      expect(result.current.selectedObjectId).toBe(result.current.objects[0].id);
    });

    it('should cancel drawing session', () => {
      const { result } = renderHook(() => useDrawingStore());

      act(() => {
        result.current.setActiveTool('rectangle');
        result.current.startDrawing('pane-1', { x: 100, y: 200 });
        result.current.cancelDrawing();
      });

      expect(result.current.isDrawing).toBe(false);
      expect(result.current.currentDrawing).toBeNull();
    });
  });

  describe('Object Management', () => {
    it('should add a drawing object', async () => {
      const { result } = renderHook(() => useDrawingStore());

      await new Promise((resolve) => setTimeout(resolve, 2));

      let objectId: string = '';
      act(() => {
        objectId = result.current.addObject({
          type: 'trendline',
          paneId: 'pane-1',
          points: [
            { x: 100, y: 200 },
            { x: 150, y: 250 },
          ],
          style: { color: '#fff', lineWidth: 2, lineStyle: 'solid' },
        });
      });

      expect(result.current.objects).toHaveLength(1);
      expect(result.current.objects[0].id).toBe(objectId);
      expect(result.current.objects[0].type).toBe('trendline');
      expect(result.current.objects[0].properties.locked).toBe(false);
      expect(result.current.objects[0].properties.visible).toBe(true);
    });

    it('should generate unique object IDs', async () => {
      const { result } = renderHook(() => useDrawingStore());

      const ids: string[] = [];

      for (let i = 0; i < 3; i++) {
        await new Promise((resolve) => setTimeout(resolve, 2));
        act(() => {
          const id = result.current.addObject({
            type: 'hline',
            paneId: 'pane-1',
            points: [{ x: i * 100, y: 200 }],
            style: { color: '#fff', lineWidth: 1, lineStyle: 'solid' },
          });
          ids.push(id);
        });
      }

      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(3);
    });

    it('should update object properties', async () => {
      const { result } = renderHook(() => useDrawingStore());

      await new Promise((resolve) => setTimeout(resolve, 2));

      let objectId: string = '';
      act(() => {
        objectId = result.current.addObject({
          type: 'circle',
          paneId: 'pane-1',
          points: [{ x: 100, y: 100 }],
          style: { color: '#60a5fa', lineWidth: 2, lineStyle: 'solid' },
        });
      });

      // Small delay to ensure timestamp difference
      await new Promise((resolve) => setTimeout(resolve, 10));

      act(() => {
        result.current.updateObject(objectId, {
          points: [{ x: 200, y: 200 }],
        });
      });

      const updated = result.current.objects[0];
      expect(updated.points[0]).toEqual({ x: 200, y: 200 });
      expect(updated.properties.updatedAt).toBeGreaterThan(updated.properties.createdAt);
    });

    it('should delete an object', async () => {
      const { result } = renderHook(() => useDrawingStore());

      await new Promise((resolve) => setTimeout(resolve, 2));

      let objectId: string = '';
      act(() => {
        objectId = result.current.addObject({
          type: 'arrow',
          paneId: 'pane-1',
          points: [{ x: 100, y: 100 }],
          style: { color: '#fff', lineWidth: 2, lineStyle: 'solid' },
        });
      });

      expect(result.current.objects).toHaveLength(1);

      act(() => {
        result.current.deleteObject(objectId);
      });

      expect(result.current.objects).toHaveLength(0);
    });

    it('should duplicate an object with offset', async () => {
      const { result } = renderHook(() => useDrawingStore());

      await new Promise((resolve) => setTimeout(resolve, 2));

      let originalId: string = '';
      act(() => {
        originalId = result.current.addObject({
          type: 'trendline',
          paneId: 'pane-1',
          points: [
            { x: 100, y: 100 },
            { x: 200, y: 200 },
          ],
          style: { color: '#60a5fa', lineWidth: 2, lineStyle: 'solid' },
        });
      });

      await new Promise((resolve) => setTimeout(resolve, 2));

      let duplicateId: string = '';
      act(() => {
        duplicateId = result.current.duplicateObject(originalId);
      });

      expect(result.current.objects).toHaveLength(2);
      expect(duplicateId).not.toBe(originalId);

      const duplicate = result.current.objects.find((obj) => obj.id === duplicateId);
      expect(duplicate?.points[0].x).toBe(110); // Original 100 + 10 offset
      expect(duplicate?.points[0].y).toBe(110); // Original 100 + 10 offset
    });

    it('should not duplicate non-existent object', () => {
      const { result } = renderHook(() => useDrawingStore());

      let duplicateId: string = '';
      act(() => {
        duplicateId = result.current.duplicateObject('non-existent-id');
      });

      expect(duplicateId).toBe('');
    });
  });

  describe('Selection', () => {
    it('should select an object by ID', async () => {
      const { result } = renderHook(() => useDrawingStore());

      await new Promise((resolve) => setTimeout(resolve, 2));

      let objectId: string = '';
      act(() => {
        objectId = result.current.addObject({
          type: 'textNote',
          paneId: 'pane-1',
          points: [{ x: 100, y: 100 }],
          style: { color: '#fff', lineWidth: 1, lineStyle: 'solid' },
        });
      });

      act(() => {
        result.current.selectObject(objectId);
      });

      expect(result.current.selectedObjectId).toBe(objectId);
    });

    it('should clear selection', async () => {
      const { result } = renderHook(() => useDrawingStore());

      await new Promise((resolve) => setTimeout(resolve, 2));

      let objectId: string = '';
      act(() => {
        objectId = result.current.addObject({
          type: 'hline',
          paneId: 'pane-1',
          points: [{ x: 100, y: 100 }],
          style: { color: '#fff', lineWidth: 1, lineStyle: 'solid' },
        });
        result.current.selectObject(objectId);
      });

      expect(result.current.selectedObjectId).toBe(objectId);

      act(() => {
        result.current.clearSelection();
      });

      expect(result.current.selectedObjectId).toBeNull();
    });

    it('should select object in rectangle', async () => {
      const { result } = renderHook(() => useDrawingStore());

      await new Promise((resolve) => setTimeout(resolve, 2));

      act(() => {
        result.current.addObject({
          type: 'circle',
          paneId: 'pane-1',
          points: [{ x: 150, y: 150 }],
          style: { color: '#fff', lineWidth: 1, lineStyle: 'solid' },
        });
      });

      act(() => {
        result.current.selectObjectsInRect({
          x1: 100,
          y1: 100,
          x2: 200,
          y2: 200,
          paneId: 'pane-1',
        });
      });

      expect(result.current.selectedObjectId).not.toBeNull();
    });

    it('should not select object in wrong pane', async () => {
      const { result } = renderHook(() => useDrawingStore());

      await new Promise((resolve) => setTimeout(resolve, 2));

      act(() => {
        result.current.addObject({
          type: 'vline',
          paneId: 'pane-1',
          points: [{ x: 150, y: 150 }],
          style: { color: '#fff', lineWidth: 1, lineStyle: 'solid' },
        });
      });

      act(() => {
        result.current.selectObjectsInRect({
          x1: 100,
          y1: 100,
          x2: 200,
          y2: 200,
          paneId: 'pane-2', // Different pane
        });
      });

      expect(result.current.selectedObjectId).toBeNull();
    });

    it('should get selected objects', async () => {
      const { result } = renderHook(() => useDrawingStore());

      await new Promise((resolve) => setTimeout(resolve, 2));

      let objectId: string = '';
      act(() => {
        objectId = result.current.addObject({
          type: 'rectangle',
          paneId: 'pane-1',
          points: [{ x: 100, y: 100 }],
          style: { color: '#fff', lineWidth: 1, lineStyle: 'solid' },
        });
        result.current.selectObject(objectId);
      });

      const selected = result.current.getSelectedObjects();
      expect(selected).toHaveLength(1);
      expect(selected[0].id).toBe(objectId);
    });
  });

  describe('Object Transformation', () => {
    it('should move object by delta', async () => {
      const { result } = renderHook(() => useDrawingStore());

      await new Promise((resolve) => setTimeout(resolve, 2));

      let objectId: string = '';
      act(() => {
        objectId = result.current.addObject({
          type: 'trendline',
          paneId: 'pane-1',
          points: [
            { x: 100, y: 100 },
            { x: 200, y: 200 },
          ],
          style: { color: '#fff', lineWidth: 1, lineStyle: 'solid' },
        });
      });

      act(() => {
        result.current.moveObject(objectId, 50, -30);
      });

      const moved = result.current.objects[0];
      expect(moved.points[0]).toEqual({ x: 150, y: 70 });
      expect(moved.points[1]).toEqual({ x: 250, y: 170 });
    });

    it('should move object to different pane', async () => {
      const { result } = renderHook(() => useDrawingStore());

      await new Promise((resolve) => setTimeout(resolve, 2));

      let objectId: string = '';
      act(() => {
        objectId = result.current.addObject({
          type: 'hline',
          paneId: 'pane-1',
          points: [{ x: 100, y: 100 }],
          style: { color: '#fff', lineWidth: 1, lineStyle: 'solid' },
        });
      });

      act(() => {
        result.current.moveObjectToPane(objectId, 'pane-2');
      });

      expect(result.current.objects[0].paneId).toBe('pane-2');
    });

    it('should update object style', async () => {
      const { result } = renderHook(() => useDrawingStore());

      await new Promise((resolve) => setTimeout(resolve, 2));

      let objectId: string = '';
      act(() => {
        objectId = result.current.addObject({
          type: 'circle',
          paneId: 'pane-1',
          points: [{ x: 100, y: 100 }],
          style: { color: '#60a5fa', lineWidth: 2, lineStyle: 'solid' },
        });
      });

      act(() => {
        result.current.setObjectStyle(objectId, {
          color: '#ff0000',
          lineWidth: 5,
        });
      });

      const updated = result.current.objects[0];
      expect(updated.style.color).toBe('#ff0000');
      expect(updated.style.lineWidth).toBe(5);
      expect(updated.style.lineStyle).toBe('solid'); // Unchanged
    });

    it('should update object properties', async () => {
      const { result } = renderHook(() => useDrawingStore());

      await new Promise((resolve) => setTimeout(resolve, 2));

      let objectId: string = '';
      act(() => {
        objectId = result.current.addObject({
          type: 'arrow',
          paneId: 'pane-1',
          points: [{ x: 100, y: 100 }],
          style: { color: '#fff', lineWidth: 1, lineStyle: 'solid' },
        });
      });

      act(() => {
        result.current.setObjectProperties(objectId, {
          locked: true,
          visible: false,
          name: 'Custom Arrow',
        });
      });

      const updated = result.current.objects[0];
      expect(updated.properties.locked).toBe(true);
      expect(updated.properties.visible).toBe(false);
      expect(updated.properties.name).toBe('Custom Arrow');
    });
  });

  describe('Bulk Operations', () => {
    it('should delete selected object', async () => {
      const { result } = renderHook(() => useDrawingStore());

      await new Promise((resolve) => setTimeout(resolve, 2));

      let objectId: string = '';
      act(() => {
        objectId = result.current.addObject({
          type: 'vline',
          paneId: 'pane-1',
          points: [{ x: 100, y: 100 }],
          style: { color: '#fff', lineWidth: 1, lineStyle: 'solid' },
        });
        result.current.selectObject(objectId);
      });

      expect(result.current.objects).toHaveLength(1);

      act(() => {
        result.current.deleteSelectedObjects();
      });

      expect(result.current.objects).toHaveLength(0);
    });

    it('should not delete when no selection', () => {
      const { result } = renderHook(() => useDrawingStore());

      act(() => {
        result.current.deleteSelectedObjects();
      });

      // Should not throw, just do nothing
      expect(result.current.objects).toHaveLength(0);
    });

    it('should duplicate selected object', async () => {
      const { result } = renderHook(() => useDrawingStore());

      await new Promise((resolve) => setTimeout(resolve, 2));

      let objectId: string = '';
      act(() => {
        objectId = result.current.addObject({
          type: 'rectangle',
          paneId: 'pane-1',
          points: [{ x: 100, y: 100 }],
          style: { color: '#fff', lineWidth: 1, lineStyle: 'solid' },
        });
        result.current.selectObject(objectId);
      });

      await new Promise((resolve) => setTimeout(resolve, 2));

      let newIds: string[] = [];
      act(() => {
        newIds = result.current.duplicateSelectedObjects();
      });

      expect(result.current.objects).toHaveLength(2);
      expect(newIds).toHaveLength(1);
    });

    it('should lock selected object', async () => {
      const { result } = renderHook(() => useDrawingStore());

      await new Promise((resolve) => setTimeout(resolve, 2));

      let objectId: string = '';
      act(() => {
        objectId = result.current.addObject({
          type: 'trendline',
          paneId: 'pane-1',
          points: [{ x: 100, y: 100 }],
          style: { color: '#fff', lineWidth: 1, lineStyle: 'solid' },
        });
        result.current.selectObject(objectId);
      });

      act(() => {
        result.current.lockSelectedObjects(true);
      });

      expect(result.current.objects[0].properties.locked).toBe(true);
    });

    it('should set visibility of selected object', async () => {
      const { result } = renderHook(() => useDrawingStore());

      await new Promise((resolve) => setTimeout(resolve, 2));

      let objectId: string = '';
      act(() => {
        objectId = result.current.addObject({
          type: 'hline',
          paneId: 'pane-1',
          points: [{ x: 100, y: 100 }],
          style: { color: '#fff', lineWidth: 1, lineStyle: 'solid' },
        });
        result.current.selectObject(objectId);
      });

      act(() => {
        result.current.setSelectedObjectsVisible(false);
      });

      expect(result.current.objects[0].properties.visible).toBe(false);
    });
  });

  describe('Utility Functions', () => {
    it('should get objects by pane', async () => {
      const { result } = renderHook(() => useDrawingStore());

      await new Promise((resolve) => setTimeout(resolve, 2));

      act(() => {
        result.current.addObject({
          type: 'hline',
          paneId: 'pane-1',
          points: [{ x: 100, y: 100 }],
          style: { color: '#fff', lineWidth: 1, lineStyle: 'solid' },
        });
      });

      await new Promise((resolve) => setTimeout(resolve, 2));

      act(() => {
        result.current.addObject({
          type: 'vline',
          paneId: 'pane-2',
          points: [{ x: 200, y: 200 }],
          style: { color: '#fff', lineWidth: 1, lineStyle: 'solid' },
        });
      });

      const pane1Objects = result.current.getObjectsByPane('pane-1');
      const pane2Objects = result.current.getObjectsByPane('pane-2');

      expect(pane1Objects).toHaveLength(1);
      expect(pane2Objects).toHaveLength(1);
      expect(pane1Objects[0].type).toBe('hline');
      expect(pane2Objects[0].type).toBe('vline');
    });

    it('should get object by ID', async () => {
      const { result } = renderHook(() => useDrawingStore());

      await new Promise((resolve) => setTimeout(resolve, 2));

      let objectId: string = '';
      act(() => {
        objectId = result.current.addObject({
          type: 'circle',
          paneId: 'pane-1',
          points: [{ x: 100, y: 100 }],
          style: { color: '#fff', lineWidth: 1, lineStyle: 'solid' },
        });
      });

      const found = result.current.getObjectById(objectId);
      expect(found).toBeDefined();
      expect(found?.id).toBe(objectId);
      expect(found?.type).toBe('circle');
    });

    it('should return undefined for non-existent ID', () => {
      const { result } = renderHook(() => useDrawingStore());

      const found = result.current.getObjectById('non-existent');
      expect(found).toBeUndefined();
    });

    it('should clear all objects', async () => {
      const { result } = renderHook(() => useDrawingStore());

      await new Promise((resolve) => setTimeout(resolve, 2));

      act(() => {
        result.current.addObject({
          type: 'hline',
          paneId: 'pane-1',
          points: [{ x: 100, y: 100 }],
          style: { color: '#fff', lineWidth: 1, lineStyle: 'solid' },
        });
        result.current.addObject({
          type: 'vline',
          paneId: 'pane-1',
          points: [{ x: 200, y: 200 }],
          style: { color: '#fff', lineWidth: 1, lineStyle: 'solid' },
        });
      });

      expect(result.current.objects).toHaveLength(2);

      act(() => {
        result.current.clearAllObjects();
      });

      expect(result.current.objects).toHaveLength(0);
      expect(result.current.selectedObjectId).toBeNull();
    });
  });

  describe('Snap Settings', () => {
    it('should toggle snap to grid', () => {
      const { result } = renderHook(() => useDrawingStore());

      const initial = result.current.snapToGrid;

      act(() => {
        result.current.toggleSnapToGrid();
      });

      expect(result.current.snapToGrid).toBe(!initial);

      act(() => {
        result.current.toggleSnapToGrid();
      });

      expect(result.current.snapToGrid).toBe(initial);
    });

    it('should toggle snap to price', () => {
      const { result } = renderHook(() => useDrawingStore());

      const initial = result.current.snapToPrice;

      act(() => {
        result.current.toggleSnapToPrice();
      });

      expect(result.current.snapToPrice).toBe(!initial);

      act(() => {
        result.current.toggleSnapToPrice();
      });

      expect(result.current.snapToPrice).toBe(initial);
    });

    it('should toggle magnet mode', () => {
      const { result } = renderHook(() => useDrawingStore());

      const initial = result.current.magnetMode;

      act(() => {
        result.current.toggleMagnetMode();
      });

      expect(result.current.magnetMode).toBe(!initial);

      act(() => {
        result.current.toggleMagnetMode();
      });

      expect(result.current.magnetMode).toBe(initial);
    });
  });

  describe('Edge Cases', () => {
    it('should handle deleting object that clears selection', async () => {
      const { result } = renderHook(() => useDrawingStore());

      await new Promise((resolve) => setTimeout(resolve, 2));

      let objectId: string = '';
      act(() => {
        objectId = result.current.addObject({
          type: 'arrow',
          paneId: 'pane-1',
          points: [{ x: 100, y: 100 }],
          style: { color: '#fff', lineWidth: 1, lineStyle: 'solid' },
        });
        result.current.selectObject(objectId);
      });

      expect(result.current.selectedObjectId).toBe(objectId);

      act(() => {
        result.current.deleteObject(objectId);
      });

      expect(result.current.selectedObjectId).toBeNull();
    });

    it('should not crash when updating style of non-existent object', () => {
      const { result } = renderHook(() => useDrawingStore());

      act(() => {
        result.current.setObjectStyle('non-existent', { color: '#ff0000' });
      });

      // Should not throw
      expect(result.current.objects).toHaveLength(0);
    });

    it('should not crash when updating properties of non-existent object', () => {
      const { result } = renderHook(() => useDrawingStore());

      act(() => {
        result.current.setObjectProperties('non-existent', { locked: true });
      });

      // Should not throw
      expect(result.current.objects).toHaveLength(0);
    });

    it('should handle rapid object creation', async () => {
      const { result } = renderHook(() => useDrawingStore());

      const ids: string[] = [];

      for (let i = 0; i < 5; i++) {
        await new Promise((resolve) => setTimeout(resolve, 2));
        act(() => {
          const id = result.current.addObject({
            type: 'hline',
            paneId: 'pane-1',
            points: [{ x: i * 100, y: 100 }],
            style: { color: '#fff', lineWidth: 1, lineStyle: 'solid' },
          });
          ids.push(id);
        });
      }

      expect(result.current.objects).toHaveLength(5);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(5);
    });
  });
});
