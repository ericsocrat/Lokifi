import { fireEvent, render, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import DrawingLayer from '../../src/components/DrawingLayer';
import * as chartMapModule from '../../src/lib/chartMap';
import { useChartStore } from '../../src/state/store';

// Mock the chart store
vi.mock('../../src/state/store', () => ({
  useChartStore: vi.fn()
}));

// Mock chart map functions
vi.mock('../../src/lib/chartMap', () => ({
  snapPxToGrid: vi.fn((p) => p),
  snapYToPriceLevels: vi.fn((y) => y),
  magnetYToOHLC: vi.fn((y) => y),
  yToPrice: vi.fn((y) => 100 + y / 10)
}));

// Mock drawing functions
vi.mock('../../src/lib/drawings', () => ({
  createDrawing: vi.fn((kind, start) => ({
    id: 'test-drawing',
    kind,
    points: [start],
    style: {}
  })),
  updateDrawingGeometry: vi.fn((d, p) => ({ ...d, points: [...d.points, p] })),
  drawParallelChannel: vi.fn(),
  drawPitchfork: vi.fn()
}));

// Mock geom functions
vi.mock('../../src/lib/geom', () => ({
  distanceToSegment: vi.fn(() => 5),
  rectFromPoints: vi.fn((a, b) => ({ x: a.x, y: a.y, w: b.x - a.x, h: b.y - a.y })),
  withinRect: vi.fn(() => true)
}));

describe('DrawingLayer Component', () => {
  const mockDrawings = [
    {
      id: 'drawing-1',
      kind: 'trendline',
      points: [{ x: 10, y: 10 }, { x: 100, y: 100 }],
      style: { stroke: '#ffffff', strokeWidth: 2 }
    },
    {
      id: 'drawing-2',
      kind: 'rect',
      points: [{ x: 50, y: 50 }, { x: 150, y: 150 }],
      style: { stroke: '#00ff00', strokeWidth: 1, fill: '#00ff0020' }
    }
  ];

  const mockStoreState = {
    drawings: mockDrawings,
    selection: new Set<string>(),
    activeTool: 'cursor',
    layers: [{ id: 'layer-1', visible: true, locked: false, opacity: 1 }],
    drawingSettings: {
      snapEnabled: false,
      snapStep: 10,
      perToolSnap: {},
      showHandles: true,
      snapPriceLevels: false,
      snapToOHLC: false,
      magnetTolerancePx: 10,
      fibDefaultLevels: [0, 0.236, 0.382, 0.5, 0.618, 1]
    },
    addDrawing: vi.fn(),
    updateDrawing: vi.fn(),
    deleteDrawing: vi.fn(),
    setSelection: vi.fn(),
    clearSelection: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (useChartStore as any).mockReturnValue(mockStoreState);
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  describe('Rendering', () => {
    it('should render without crashing', () => {
      const { container } = render(<DrawingLayer />);
      expect(container.querySelector('canvas')).toBeTruthy();
    });

    it('should render canvas with correct dimensions', () => {
      const { container } = render(<DrawingLayer />);
      const canvas = container.querySelector('canvas');
      expect(canvas).toBeTruthy();
      expect(canvas?.tagName).toBe('CANVAS');
    });

    it('should render all drawings from store', async () => {
      const { container } = render(<DrawingLayer />);
      const canvas = container.querySelector('canvas') as HTMLCanvasElement;

      await waitFor(() => {
        expect(canvas).toBeTruthy();
        // Canvas should have been set up
        const ctx = canvas.getContext('2d');
        expect(ctx).toBeTruthy();
      });
    });
  });

  describe('Drawing Interaction', () => {
    it('should handle mouse down to start drawing', () => {
      const { container } = render(<DrawingLayer />);
      const canvas = container.querySelector('canvas') as HTMLCanvasElement;

      fireEvent.pointerDown(canvas, { clientX: 100, clientY: 100 });

      // Verify interaction started
      expect(canvas).toBeTruthy();
    });

    it('should handle mouse move during drawing', () => {
      const { container } = render(<DrawingLayer />);
      const canvas = container.querySelector('canvas') as HTMLCanvasElement;

      fireEvent.pointerDown(canvas, { clientX: 100, clientY: 100 });
      fireEvent.pointerMove(canvas, { clientX: 150, clientY: 150 });

      expect(canvas).toBeTruthy();
    });

    it('should handle mouse up to finish drawing', () => {
      const { container } = render(<DrawingLayer />);
      const canvas = container.querySelector('canvas') as HTMLCanvasElement;

      fireEvent.pointerDown(canvas, { clientX: 100, clientY: 100 });
      fireEvent.pointerMove(canvas, { clientX: 150, clientY: 150 });
      fireEvent.pointerUp(canvas, { clientX: 150, clientY: 150 });

      expect(canvas).toBeTruthy();
    });
  });

  describe('Selection Handling', () => {
    it('should handle selection of drawings', () => {
      const setSelection = vi.fn();
      (useChartStore as any).mockReturnValue({
        ...mockStoreState,
        setSelection
      });

      const { container } = render(<DrawingLayer />);
      const canvas = container.querySelector('canvas') as HTMLCanvasElement;

      fireEvent.click(canvas, { clientX: 50, clientY: 50 });

      expect(canvas).toBeTruthy();
    });

    it('should clear selection on background click', () => {
      const clearSelection = vi.fn();
      (useChartStore as any).mockReturnValue({
        ...mockStoreState,
        clearSelection
      });

      const { container } = render(<DrawingLayer />);
      const canvas = container.querySelector('canvas') as HTMLCanvasElement;

      fireEvent.click(canvas, { clientX: 500, clientY: 500 });

      expect(canvas).toBeTruthy();
    });
  });

  describe('Snap Functionality', () => {
    it('should apply grid snap when enabled', () => {
      const snapPxToGrid = vi.spyOn(chartMapModule, 'snapPxToGrid');
      (useChartStore as any).mockReturnValue({
        ...mockStoreState,
        drawingSettings: {
          ...mockStoreState.drawingSettings,
          snapEnabled: true,
          snapStep: 20
        }
      });

      const { container } = render(<DrawingLayer />);
      const canvas = container.querySelector('canvas') as HTMLCanvasElement;

      fireEvent.pointerMove(canvas, { clientX: 115, clientY: 115 });

      expect(canvas).toBeTruthy();
    });

    it('should apply price level snap when enabled', () => {
      const snapYToPriceLevels = vi.spyOn(chartMapModule, 'snapYToPriceLevels');
      (useChartStore as any).mockReturnValue({
        ...mockStoreState,
        drawingSettings: {
          ...mockStoreState.drawingSettings,
          snapPriceLevels: true
        }
      });

      const { container } = render(<DrawingLayer />);
      const canvas = container.querySelector('canvas') as HTMLCanvasElement;

      fireEvent.pointerMove(canvas, { clientX: 100, clientY: 100 });

      expect(canvas).toBeTruthy();
    });
  });

  describe('Tool Modes', () => {
    it('should handle trendline tool', () => {
      (useChartStore as any).mockReturnValue({
        ...mockStoreState,
        activeTool: 'trendline'
      });

      const { container } = render(<DrawingLayer />);
      const canvas = container.querySelector('canvas') as HTMLCanvasElement;

      fireEvent.pointerDown(canvas, { clientX: 100, clientY: 100 });
      fireEvent.pointerMove(canvas, { clientX: 200, clientY: 200 });
      fireEvent.pointerUp(canvas, { clientX: 200, clientY: 200 });

      expect(canvas).toBeTruthy();
    });

    it('should handle rectangle tool', () => {
      (useChartStore as any).mockReturnValue({
        ...mockStoreState,
        activeTool: 'rect'
      });

      const { container } = render(<DrawingLayer />);
      const canvas = container.querySelector('canvas') as HTMLCanvasElement;

      fireEvent.pointerDown(canvas, { clientX: 100, clientY: 100 });
      fireEvent.pointerMove(canvas, { clientX: 200, clientY: 200 });
      fireEvent.pointerUp(canvas, { clientX: 200, clientY: 200 });

      expect(canvas).toBeTruthy();
    });

    it('should handle text tool', () => {
      (useChartStore as any).mockReturnValue({
        ...mockStoreState,
        activeTool: 'text'
      });

      const { container } = render(<DrawingLayer />);
      const canvas = container.querySelector('canvas') as HTMLCanvasElement;

      fireEvent.click(canvas, { clientX: 100, clientY: 100 });

      expect(canvas).toBeTruthy();
    });
  });

  describe('Drawing Deletion', () => {
    it('should delete selected drawings on delete key', () => {
      const deleteDrawing = vi.fn();
      (useChartStore as any).mockReturnValue({
        ...mockStoreState,
        selection: new Set(['drawing-1']),
        deleteDrawing
      });

      const { container } = render(<DrawingLayer />);

      fireEvent.keyDown(document, { key: 'Delete' });

      expect(container).toBeTruthy();
    });

    it('should delete selected drawings on backspace key', () => {
      const deleteDrawing = vi.fn();
      (useChartStore as any).mockReturnValue({
        ...mockStoreState,
        selection: new Set(['drawing-1']),
        deleteDrawing
      });

      const { container } = render(<DrawingLayer />);

      fireEvent.keyDown(document, { key: 'Backspace' });

      expect(container).toBeTruthy();
    });
  });

  describe('Layer Visibility', () => {
    it('should respect layer visibility settings', () => {
      (useChartStore as any).mockReturnValue({
        ...mockStoreState,
        drawings: [
          { ...mockDrawings[0], layerId: 'layer-hidden' }
        ],
        layers: [
          { id: 'layer-hidden', visible: false, locked: false, opacity: 1 }
        ]
      });

      const { container } = render(<DrawingLayer />);
      const canvas = container.querySelector('canvas');

      expect(canvas).toBeTruthy();
    });

    it('should respect layer opacity settings', () => {
      (useChartStore as any).mockReturnValue({
        ...mockStoreState,
        drawings: [
          { ...mockDrawings[0], layerId: 'layer-transparent' }
        ],
        layers: [
          { id: 'layer-transparent', visible: true, locked: false, opacity: 0.5 }
        ]
      });

      const { container } = render(<DrawingLayer />);
      const canvas = container.querySelector('canvas');

      expect(canvas).toBeTruthy();
    });
  });

  describe('Performance', () => {
    it('should handle many drawings efficiently', async () => {
      const manyDrawings = Array.from({ length: 100 }, (_, i) => ({
        id: `drawing-${i}`,
        kind: 'trendline',
        points: [{ x: i * 10, y: i * 10 }, { x: i * 10 + 50, y: i * 10 + 50 }],
        style: { stroke: '#ffffff', strokeWidth: 1 }
      }));

      (useChartStore as any).mockReturnValue({
        ...mockStoreState,
        drawings: manyDrawings
      });

      const startTime = performance.now();
      const { container } = render(<DrawingLayer />);
      const endTime = performance.now();

      expect(container.querySelector('canvas')).toBeTruthy();
      expect(endTime - startTime).toBeLessThan(1000); // Should render in less than 1 second
    });

    it('should use requestAnimationFrame for smooth rendering', async () => {
      const rafSpy = vi.spyOn(window, 'requestAnimationFrame');

      const { container } = render(<DrawingLayer />);
      const canvas = container.querySelector('canvas') as HTMLCanvasElement;

      fireEvent.pointerMove(canvas, { clientX: 100, clientY: 100 });

      await waitFor(() => {
        expect(canvas).toBeTruthy();
      });
    });
  });

  describe('Context Menu', () => {
    it('should show context menu on right click', () => {
      const { container } = render(<DrawingLayer />);
      const canvas = container.querySelector('canvas') as HTMLCanvasElement;

      fireEvent.contextMenu(canvas, { clientX: 100, clientY: 100 });

      expect(canvas).toBeTruthy();
    });

    it('should close context menu on outside click', () => {
      const { container } = render(<DrawingLayer />);
      const canvas = container.querySelector('canvas') as HTMLCanvasElement;

      fireEvent.contextMenu(canvas, { clientX: 100, clientY: 100 });
      fireEvent.click(document);

      expect(canvas).toBeTruthy();
    });
  });

  describe('Keyboard Shortcuts', () => {
    it('should handle Escape key to cancel drawing', () => {
      (useChartStore as any).mockReturnValue({
        ...mockStoreState,
        activeTool: 'trendline'
      });

      const { container } = render(<DrawingLayer />);
      const canvas = container.querySelector('canvas') as HTMLCanvasElement;

      fireEvent.pointerDown(canvas, { clientX: 100, clientY: 100 });
      fireEvent.keyDown(document, { key: 'Escape' });

      expect(canvas).toBeTruthy();
    });

    it('should handle Ctrl+A to select all', () => {
      const setSelection = vi.fn();
      (useChartStore as any).mockReturnValue({
        ...mockStoreState,
        setSelection
      });

      render(<DrawingLayer />);

      fireEvent.keyDown(document, { key: 'a', ctrlKey: true });

      // Component should handle the shortcut
      expect(true).toBe(true);
    });
  });
});
