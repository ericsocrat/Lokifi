'use client';
import type { Time } from 'lightweight-charts';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type DrawingTool =
  | 'cursor'
  | 'trendline'
  | 'hline'
  | 'vline'
  | 'rectangle'
  | 'circle'
  | 'fibonacciRetracement'
  | 'fibonacciExtension'
  | 'parallelChannel'
  | 'pitchfork'
  | 'gannFan'
  | 'elliottWave'
  | 'arrow'
  | 'textNote';

export interface Point {
  // Legacy pixel coordinates (deprecated, for migration only)
  x?: number;
  y?: number;
  // New price/time coordinates (preferred)
  time?: Time | string | number;
  price?: number;
}

export interface DrawingObject {
  id: string;
  type: DrawingTool;
  paneId: string;
  points: Point[];
  style: {
    color: string;
    lineWidth: number;
    lineStyle: 'solid' | 'dashed' | 'dotted';
    fillColor?: string;
    fillOpacity?: number;
    fontSize?: number;
    text?: string;
  };
  properties: {
    name: string;
    locked: boolean;
    visible: boolean;
    zIndex: number;
    createdAt: number;
    updatedAt: number;
  };
  // any required: Arbitrary user-defined metadata (application-specific key-value pairs)
  metadata?: Record<string, any>;
}

interface DrawingState {
  // Current state
  activeTool: DrawingTool;
  isDrawing: boolean;
  objects: DrawingObject[];
  selectedObjectId: string | null;
  draggedObjectId: string | null;

  // Drawing session
  currentDrawing: Partial<DrawingObject> | null;
  snapToGrid: boolean;
  snapToPrice: boolean;
  magnetMode: boolean;

  // Actions
  setActiveTool: (tool: DrawingTool) => void;
  startDrawing: (paneId: string, point: Point) => void;
  addPoint: (point: Point) => void;
  finishDrawing: () => void;
  cancelDrawing: () => void;

  // Object management
  addObject: (object: Omit<DrawingObject, 'id' | 'properties'>) => string;
  updateObject: (id: string, updates: Partial<DrawingObject>) => void;
  deleteObject: (id: string) => void;
  duplicateObject: (id: string) => string;

  // Selection
  selectObject: (id: string | null) => void;
  selectObjectsInRect: (rect: {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    paneId: string;
  }) => void;
  clearSelection: () => void;

  // Transform
  moveObject: (id: string, deltaX: number, deltaY: number) => void;
  moveObjectToPane: (id: string, targetPaneId: string) => void;
  setObjectStyle: (id: string, style: Partial<DrawingObject['style']>) => void;
  setObjectProperties: (id: string, properties: Partial<DrawingObject['properties']>) => void;

  // Bulk operations
  deleteSelectedObjects: () => void;
  duplicateSelectedObjects: () => string[];
  lockSelectedObjects: (locked: boolean) => void;
  setSelectedObjectsVisible: (visible: boolean) => void;

  // Utilities
  getObjectsByPane: (paneId: string) => DrawingObject[];
  getSelectedObjects: () => DrawingObject[];
  getObjectById: (id: string) => DrawingObject | undefined;
  clearAllObjects: () => void;

  // Settings
  toggleSnapToGrid: () => void;
  toggleSnapToPrice: () => void;
  toggleMagnetMode: () => void;
}

const generateId = () => `drawing_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

/**
 * Migration Helper: Check if drawing object has valid time/price coordinates.
 * Legacy drawings (Session 91 and earlier) only have x/y pixel coordinates.
 * New drawings (Session 92+) use time/price coordinates for TradingView Primitives API.
 * 
 * @param obj - Drawing object to check
 * @returns true if object has valid time/price coordinates, false if legacy pixel-only
 */
const hasValidPrimitiveCoordinates = (obj: DrawingObject): boolean => {
  if (!obj.points || obj.points.length === 0) return false;
  
  // Check if all points have time/price coordinates (not just x/y pixels)
  return obj.points.every((point) => point.time !== undefined && point.price !== undefined);
};

/**
 * Migration Note: Legacy drawings with only x/y coordinates cannot be rendered
 * with Primitives API (requires time/price anchoring). These drawings will be
 * visible in the Objects panel but won't render on chart until migrated.
 * 
 * Future enhancement: Add migration UI to convert pixel coordinates to price/time
 * by prompting user to re-anchor drawing points on chart.
 */

const DEFAULT_STYLE = {
  color: '#60a5fa',
  lineWidth: 2,
  lineStyle: 'solid' as const,
  fillColor: '#60a5fa',
  fillOpacity: 0.1,
  fontSize: 12,
};

export const useDrawingStore = create<DrawingState>()(
  persist(
    (
      set: (
        partial: Partial<DrawingState> | ((state: DrawingState) => Partial<DrawingState>)
      ) => void,
      get: () => DrawingState
    ) => ({
      // Initial state
      activeTool: 'cursor',
      isDrawing: false,
      objects: [],
      selectedObjectId: null,
      draggedObjectId: null,
      currentDrawing: null,
      snapToGrid: false,
      snapToPrice: true,
      magnetMode: false,

      // Tool selection
      setActiveTool: (tool: DrawingTool) => {
        set({ activeTool: tool });
        if (tool === 'cursor') {
          get().cancelDrawing();
        }
      },

      // Drawing operations
      startDrawing: (paneId: string, point: Point) => {
        const { activeTool } = get();
        if (activeTool === 'cursor') return;

        // Validate that we have price/time coordinates (preferred for Primitives API)
        if (point.time === undefined || point.price === undefined) {
          console.warn('startDrawing called without time/price coordinates. Drawing may not work correctly.');
        }

        const newDrawing: Partial<DrawingObject> = {
          type: activeTool,
          paneId,
          points: [point],
          style: { ...DEFAULT_STYLE },
        };

        set({
          isDrawing: true,
          currentDrawing: newDrawing,
          selectedObjectId: null,
        });
      },

      addPoint: (point: Point) => {
        const { currentDrawing, isDrawing } = get();
        if (!isDrawing || !currentDrawing) return;

        // Validate that we have price/time coordinates (preferred for Primitives API)
        if (point.time === undefined || point.price === undefined) {
          console.warn('addPoint called without time/price coordinates. Drawing may not work correctly.');
        }

        set({
          currentDrawing: {
            ...currentDrawing,
            points: [...(currentDrawing.points || []), point],
          },
        });
      },

      finishDrawing: () => {
        const { currentDrawing, isDrawing, addObject } = get();
        if (!isDrawing || !currentDrawing) return;

        // Validate that we have the required data
        if (
          currentDrawing.type &&
          currentDrawing.paneId &&
          currentDrawing.points &&
          currentDrawing.points.length > 0
        ) {
          // Validate that all points have time/price coordinates (required for Primitives API)
          const hasValidCoordinates = currentDrawing.points.every(
            (p) => p.time !== undefined && p.price !== undefined
          );

          if (!hasValidCoordinates) {
            console.error('finishDrawing: Some points missing time/price coordinates. Cannot create primitive.');
            get().cancelDrawing();
            return;
          }

          const objectId = addObject({
            type: currentDrawing.type,
            paneId: currentDrawing.paneId,
            points: currentDrawing.points,
            style: currentDrawing.style || DEFAULT_STYLE,
            metadata: currentDrawing.metadata,
          });

          set({
            isDrawing: false,
            currentDrawing: null,
            selectedObjectId: objectId,
          });
        } else {
          get().cancelDrawing();
        }
      },

      cancelDrawing: () => {
        set({
          isDrawing: false,
          currentDrawing: null,
        });
      },

      // Object management
      addObject: (objectData: Omit<DrawingObject, 'id' | 'properties'>) => {
        const id = generateId();
        const now = Date.now();

        const newObject: DrawingObject = {
          id,
          ...objectData,
          properties: {
            name: `${objectData.type}_${id.slice(-6)}`,
            locked: false,
            visible: true,
            zIndex: now,
            createdAt: now,
            updatedAt: now,
          },
        };

        set((state) => ({
          objects: [...state.objects, newObject],
        }));

        return id;
      },

      updateObject: (id: string, updates: Partial<DrawingObject>) => {
        set((state) => ({
          objects: state.objects.map((obj: DrawingObject) =>
            obj.id === id
              ? {
                  ...obj,
                  ...updates,
                  properties: {
                    ...obj.properties,
                    ...updates.properties,
                    updatedAt: Date.now(),
                  },
                }
              : obj
          ),
        }));
      },

      deleteObject: (id: string) => {
        set((state) => ({
          objects: state.objects.filter((obj: DrawingObject) => obj.id !== id),
          selectedObjectId: state.selectedObjectId === id ? null : state.selectedObjectId,
        }));
      },

      duplicateObject: (id: string) => {
        const { objects, addObject } = get();
        const original = objects.find((obj: DrawingObject) => obj.id === id);
        if (!original) return '';

        // Offset the duplicate slightly (for pixel-based coordinates only)
        const offsetPoints = original.points.map((point: Point) => ({
          ...point,
          x: point.x !== undefined ? point.x + 10 : undefined,
          y: point.y !== undefined ? point.y + 10 : undefined,
        }));

        return addObject({
          type: original.type,
          paneId: original.paneId,
          points: offsetPoints,
          style: original.style,
          metadata: original.metadata,
        });
      },

      // Selection
      selectObject: (id: string | null) => {
        set({ selectedObjectId: id });
      },

      selectObjectsInRect: (rect: {
        x1: number;
        y1: number;
        x2: number;
        y2: number;
        paneId: string;
      }) => {
        // For now, just select the first object found in the rectangle (pixel-based coordinates only)
        const { objects } = get();
        const objectInRect = objects.find(
          (obj: DrawingObject) =>
            obj.paneId === rect.paneId &&
            obj.points.some(
              (point: Point) =>
                point.x !== undefined &&
                point.y !== undefined &&
                point.x >= Math.min(rect.x1, rect.x2) &&
                point.x <= Math.max(rect.x1, rect.x2) &&
                point.y >= Math.min(rect.y1, rect.y2) &&
                point.y <= Math.max(rect.y1, rect.y2)
            )
        );

        if (objectInRect) {
          set({ selectedObjectId: objectInRect.id });
        }
      },

      clearSelection: () => {
        set({ selectedObjectId: null });
      },

      // Transform (pixel-based coordinates only)
      moveObject: (id: string, deltaX: number, deltaY: number) => {
        set((state) => ({
          objects: state.objects.map((obj: DrawingObject) =>
            obj.id === id
              ? {
                  ...obj,
                  points: obj.points.map((point: Point) => ({
                    ...point,
                    x: point.x !== undefined ? point.x + deltaX : undefined,
                    y: point.y !== undefined ? point.y + deltaY : undefined,
                  })),
                  properties: {
                    ...obj.properties,
                    updatedAt: Date.now(),
                  },
                }
              : obj
          ),
        }));
      },

      moveObjectToPane: (id: string, targetPaneId: string) => {
        get().updateObject(id, { paneId: targetPaneId });
      },

      setObjectStyle: (id: string, style: Partial<DrawingObject['style']>) => {
        const currentObject = get().getObjectById(id);
        if (currentObject) {
          get().updateObject(id, {
            style: {
              ...currentObject.style,
              ...style,
            },
          });
        }
      },

      setObjectProperties: (id: string, properties: Partial<DrawingObject['properties']>) => {
        const currentObject = get().getObjectById(id);
        if (currentObject) {
          get().updateObject(id, {
            properties: {
              ...currentObject.properties,
              ...properties,
            },
          });
        }
      },

      // Bulk operations
      deleteSelectedObjects: () => {
        const { selectedObjectId } = get();
        if (selectedObjectId) {
          get().deleteObject(selectedObjectId);
        }
      },

      duplicateSelectedObjects: () => {
        const { selectedObjectId } = get();
        if (selectedObjectId) {
          const newId = get().duplicateObject(selectedObjectId);
          return [newId];
        }
        return [];
      },

      lockSelectedObjects: (locked: boolean) => {
        const { selectedObjectId } = get();
        if (selectedObjectId) {
          get().setObjectProperties(selectedObjectId, { locked });
        }
      },

      setSelectedObjectsVisible: (visible: boolean) => {
        const { selectedObjectId } = get();
        if (selectedObjectId) {
          get().setObjectProperties(selectedObjectId, { visible });
        }
      },

      // Utilities
      getObjectsByPane: (paneId: string) => {
        return get().objects.filter((obj: DrawingObject) => obj.paneId === paneId);
      },

      getSelectedObjects: () => {
        const { objects, selectedObjectId } = get();
        return selectedObjectId
          ? objects.filter((obj: DrawingObject) => obj.id === selectedObjectId)
          : [];
      },

      getObjectById: (id: string) => {
        return get().objects.find((obj: DrawingObject) => obj.id === id);
      },

      clearAllObjects: () => {
        set({ objects: [], selectedObjectId: null });
      },

      // Settings
      toggleSnapToGrid: () => {
        set((state) => ({ snapToGrid: !state.snapToGrid }));
      },

      toggleSnapToPrice: () => {
        set((state) => ({ snapToPrice: !state.snapToPrice }));
      },

      toggleMagnetMode: () => {
        set((state) => ({ magnetMode: !state.magnetMode }));
      },
    }),
    {
      name: 'lokifi-drawings',
      partialize: (state: DrawingState) => ({
        objects: state.objects,
        snapToGrid: state.snapToGrid,
        snapToPrice: state.snapToPrice,
        magnetMode: state.magnetMode,
      }),
    }
  )
);
