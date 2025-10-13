import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useDrawingStore } from '@/lib/stores/drawingStore';

describe('DrawingStore', () => {
  beforeEach(() => {
    // Reset store before each test
    const store = useDrawingStore.getState();
    store.clearAllObjects();
    store.setActiveTool('cursor');
    store.cancelDrawing();
  });

  it('should initialize with default state', () => {
    const { 
      activeTool, 
      isDrawing, 
      objects, 
      selectedObjectId 
    } = useDrawingStore.getState();
    
    expect(activeTool).toBe('cursor');
    expect(isDrawing).toBe(false);
    expect(objects).toHaveLength(0);
    expect(selectedObjectId).toBeNull();
  });

  it('should set active tool', () => {
    const { setActiveTool } = useDrawingStore.getState();
    
    setActiveTool('trendline');
    
    const { activeTool } = useDrawingStore.getState();
    expect(activeTool).toBe('trendline');
  });

  it('should start drawing', () => {
    const { setActiveTool, startDrawing } = useDrawingStore.getState();
    
    setActiveTool('trendline');
    startDrawing('price-pane', { x: 10, y: 20 });
    
    const { isDrawing, currentDrawing } = useDrawingStore.getState();
    expect(isDrawing).toBe(true);
    expect(currentDrawing).toBeDefined();
    expect(currentDrawing?.type).toBe('trendline');
    expect(currentDrawing?.paneId).toBe('price-pane');
    expect(currentDrawing?.points).toEqual([{ x: 10, y: 20 }]);
  });

  it('should add points to current drawing', () => {
    const { setActiveTool, startDrawing, addPoint } = useDrawingStore.getState();
    
    setActiveTool('trendline');
    startDrawing('price-pane', { x: 10, y: 20 });
    addPoint({ x: 30, y: 40 });
    
    const { currentDrawing } = useDrawingStore.getState();
    expect(currentDrawing?.points).toEqual([
      { x: 10, y: 20 },
      { x: 30, y: 40 }
    ]);
  });

  it('should finish drawing and create object', () => {
    const { setActiveTool, startDrawing, addPoint, finishDrawing } = useDrawingStore.getState();
    
    setActiveTool('trendline');
    startDrawing('price-pane', { x: 10, y: 20 });
    addPoint({ x: 30, y: 40 });
    finishDrawing();
    
    const { isDrawing, currentDrawing, objects, selectedObjectId } = useDrawingStore.getState();
    expect(isDrawing).toBe(false);
    expect(currentDrawing).toBeNull();
    expect(objects).toHaveLength(1);
    expect(objects[0].type).toBe('trendline');
    expect(objects[0].paneId).toBe('price-pane');
    expect(objects[0].points).toEqual([
      { x: 10, y: 20 },
      { x: 30, y: 40 }
    ]);
    expect(selectedObjectId).toBe(objects[0].id);
  });

  it('should cancel drawing', () => {
    const { setActiveTool, startDrawing, cancelDrawing } = useDrawingStore.getState();
    
    setActiveTool('trendline');
    startDrawing('price-pane', { x: 10, y: 20 });
    cancelDrawing();
    
    const { isDrawing, currentDrawing } = useDrawingStore.getState();
    expect(isDrawing).toBe(false);
    expect(currentDrawing).toBeNull();
  });

  it('should add object directly', () => {
    const { addObject } = useDrawingStore.getState();
    
    const objectId = addObject({
      type: 'rectangle',
      paneId: 'price-pane',
      points: [{ x: 0, y: 0 }, { x: 100, y: 100 }],
      style: {
        color: '#ff0000',
        lineWidth: 2,
        lineStyle: 'solid'
      }
    });
    
    const { objects } = useDrawingStore.getState();
    expect(objects).toHaveLength(1);
    expect(objects[0].id).toBe(objectId);
    expect(objects[0].type).toBe('rectangle');
    expect(objects[0].style.color).toBe('#ff0000');
  });

  it('should select and deselect objects', () => {
    const { addObject, selectObject } = useDrawingStore.getState();
    
    const objectId = addObject({
      type: 'circle',
      paneId: 'price-pane',
      points: [{ x: 50, y: 50 }],
      style: {
        color: '#00ff00',
        lineWidth: 1,
        lineStyle: 'solid'
      }
    });
    
    selectObject(objectId);
    expect(useDrawingStore.getState().selectedObjectId).toBe(objectId);
    
    selectObject(null);
    expect(useDrawingStore.getState().selectedObjectId).toBeNull();
  });

  it('should delete objects', () => {
    const { addObject, deleteObject } = useDrawingStore.getState();
    
    const objectId = addObject({
      type: 'arrow',
      paneId: 'price-pane',
      points: [{ x: 10, y: 10 }, { x: 20, y: 20 }],
      style: {
        color: '#0000ff',
        lineWidth: 3,
        lineStyle: 'dashed'
      }
    });
    
    expect(useDrawingStore.getState().objects).toHaveLength(1);
    
    deleteObject(objectId);
    expect(useDrawingStore.getState().objects).toHaveLength(0);
  });

  it('should duplicate objects', () => {
    const { addObject, duplicateObject } = useDrawingStore.getState();
    
    const originalId = addObject({
      type: 'textNote',
      paneId: 'price-pane',
      points: [{ x: 100, y: 200 }],
      style: {
        color: '#ffff00',
        lineWidth: 1,
        lineStyle: 'solid',
        text: 'Original note'
      }
    });
    
    const duplicateId = duplicateObject(originalId);
    
    const { objects } = useDrawingStore.getState();
    expect(objects).toHaveLength(2);
    expect(duplicateId).not.toBe(originalId);
    
    const original = objects.find((obj: any) => obj.id === originalId);
    const duplicate = objects.find((obj: any) => obj.id === duplicateId);
    
    expect(duplicate?.type).toBe(original?.type);
    expect(duplicate?.style.text).toBe(original?.style.text);
    expect(duplicate?.properties.name).toBe('textNote_copy');
  });

  it('should move objects', () => {
    const { addObject, moveObject } = useDrawingStore.getState();
    
    const objectId = addObject({
      type: 'hline',
      paneId: 'price-pane',
      points: [{ x: 0, y: 100 }, { x: 200, y: 100 }],
      style: {
        color: '#ff00ff',
        lineWidth: 2,
        lineStyle: 'solid'
      }
    });
    
    moveObject(objectId, 50, -20);
    
    const { objects } = useDrawingStore.getState();
    const movedObject = objects.find((obj: any) => obj.id === objectId);
    
    expect(movedObject?.points).toEqual([
      { x: 50, y: 80 },
      { x: 250, y: 80 }
    ]);
  });

  it('should filter objects by pane', () => {
    const { addObject, getObjectsByPane } = useDrawingStore.getState();
    
    addObject({
      type: 'trendline',
      paneId: 'price-pane',
      points: [{ x: 0, y: 0 }, { x: 100, y: 100 }],
      style: { color: '#ffffff', lineWidth: 1, lineStyle: 'solid' }
    });
    
    addObject({
      type: 'rectangle',
      paneId: 'indicator-pane',
      points: [{ x: 10, y: 10 }, { x: 90, y: 90 }],
      style: { color: '#ffffff', lineWidth: 1, lineStyle: 'solid' }
    });
    
    const priceObjects = getObjectsByPane('price-pane');
    const indicatorObjects = getObjectsByPane('indicator-pane');
    
    expect(priceObjects).toHaveLength(1);
    expect(indicatorObjects).toHaveLength(1);
    expect(priceObjects[0].type).toBe('trendline');
    expect(indicatorObjects[0].type).toBe('rectangle');
  });

  it('should toggle object properties', () => {
    const { addObject, setObjectProperties } = useDrawingStore.getState();
    
    const objectId = addObject({
      type: 'circle',
      paneId: 'price-pane',
      points: [{ x: 50, y: 50 }],
      style: { color: '#ffffff', lineWidth: 1, lineStyle: 'solid' }
    });
    
    // Toggle visibility
    setObjectProperties(objectId, { visible: false });
    let { objects } = useDrawingStore.getState();
    expect(objects[0].properties.visible).toBe(false);
    
    // Toggle lock
    setObjectProperties(objectId, { locked: true });
    objects = useDrawingStore.getState().objects;
    expect(objects[0].properties.locked).toBe(true);
  });

  it('should toggle drawing settings', () => {
    const { 
      toggleSnapToGrid, 
      toggleSnapToPrice, 
      toggleMagnetMode 
    } = useDrawingStore.getState();
    
    expect(useDrawingStore.getState().snapToGrid).toBe(false);
    expect(useDrawingStore.getState().snapToPrice).toBe(true);
    expect(useDrawingStore.getState().magnetMode).toBe(false);
    
    toggleSnapToGrid();
    expect(useDrawingStore.getState().snapToGrid).toBe(true);
    
    toggleSnapToPrice();
    expect(useDrawingStore.getState().snapToPrice).toBe(false);
    
    toggleMagnetMode();
    expect(useDrawingStore.getState().magnetMode).toBe(true);
  });
});

