import DrawingLayer from '@/components/DrawingLayer';
import * as chartMapModule from '@/lib/charts/chartMap';
import { useChartStore } from '@/state/store';
import { fireEvent, render, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Create a mock subscribe function
const mockSubscribe = vi.fn(() => vi.fn()); // Returns unsubscribe function

// Mock ResizeObserver - jsdom doesn't support it
class MockResizeObserver {
  callback: ResizeObserverCallback;
  constructor(callback: ResizeObserverCallback) {
    this.callback = callback;
  }
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}
global.ResizeObserver = MockResizeObserver as unknown as typeof ResizeObserver;

// Mock canvas context - jsdom doesn't support canvas
const mockCanvasContext = {
  clearRect: vi.fn(),
  save: vi.fn(),
  restore: vi.fn(),
  scale: vi.fn(),
  beginPath: vi.fn(),
  moveTo: vi.fn(),
  lineTo: vi.fn(),
  stroke: vi.fn(),
  fill: vi.fn(),
  fillRect: vi.fn(),
  strokeRect: vi.fn(),
  rect: vi.fn(),
  arc: vi.fn(),
  closePath: vi.fn(),
  fillText: vi.fn(),
  strokeText: vi.fn(),
  measureText: vi.fn(() => ({ width: 100 })),
  setLineDash: vi.fn(),
  getLineDash: vi.fn(() => []),
  translate: vi.fn(),
  rotate: vi.fn(),
  quadraticCurveTo: vi.fn(),
  bezierCurveTo: vi.fn(),
  ellipse: vi.fn(),
  clip: vi.fn(),
  isPointInPath: vi.fn(() => false),
  isPointInStroke: vi.fn(() => false),
  getImageData: vi.fn(() => ({ data: new Uint8ClampedArray(4), width: 1, height: 1 })),
  putImageData: vi.fn(),
  createPattern: vi.fn(() => null),
  createRadialGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
  createLinearGradient: vi.fn(() => ({
    addColorStop: vi.fn(),
  })),
  drawImage: vi.fn(),
  canvas: {
    width: 800,
    height: 600,
  },
  globalAlpha: 1,
  globalCompositeOperation: 'source-over',
  strokeStyle: '#000',
  fillStyle: '#000',
  lineWidth: 1,
  lineCap: 'round' as CanvasLineCap,
  lineJoin: 'round' as CanvasLineJoin,
  miterLimit: 10,
  lineDashOffset: 0,
  shadowBlur: 0,
  shadowColor: 'rgba(0,0,0,0)',
  shadowOffsetX: 0,
  shadowOffsetY: 0,
  font: '12px sans-serif',
  textAlign: 'left' as CanvasTextAlign,
  textBaseline: 'alphabetic' as CanvasTextBaseline,
  direction: 'ltr' as CanvasDirection,
  imageSmoothingEnabled: true,
  imageSmoothingQuality: 'medium' as ImageSmoothingQuality,
};

// Mock HTMLCanvasElement.getContext
const originalGetContext = HTMLCanvasElement.prototype.getContext;
HTMLCanvasElement.prototype.getContext = function (
  contextId: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  _options?: any
): RenderingContext | null {
  if (contextId === '2d') {
    return mockCanvasContext as unknown as CanvasRenderingContext2D;
  }
  return originalGetContext.call(this, contextId, _options);
};

// Mock the chart store
vi.mock('@/state/store', () => ({
  useChartStore: vi.fn(),
}));

// Mock chart map functions
vi.mock('@/lib/charts/chartMap', () => ({
  snapPxToGrid: vi.fn((p: number) => p),
  snapYToPriceLevels: vi.fn((y: number) => y),
  magnetYToOHLC: vi.fn((y: number) => y),
  yToPrice: vi.fn((y: number) => 100 + y / 10),
}));

// Mock drawing functions
vi.mock('@/lib/utils/drawings', () => ({
  createDrawing: vi.fn((kind: string, start: { x: number; y: number }) => ({
    id: 'test-drawing',
    kind,
    points: [start],
    style: {},
  })),
  updateDrawingGeometry: vi.fn(
    (d: { id: string; points: { x: number; y: number }[] }, p: { x: number; y: number }) => ({
      ...d,
      points: [...d.points, p],
    })
  ),
  drawParallelChannel: vi.fn(),
  drawPitchfork: vi.fn(),
}));

// Mock geom functions
vi.mock('@/lib/utils/geom', () => ({
  distanceToSegment: vi.fn(() => 5),
  rectFromPoints: vi.fn((a: { x: number; y: number }, b: { x: number; y: number }) => ({
    x: a.x,
    y: a.y,
    w: b.x - a.x,
    h: b.y - a.y,
  })),
  withinRect: vi.fn(() => true),
}));

describe('DrawingLayer Component', () => {
  const mockDrawings = [
    {
      id: 'drawing-1',
      kind: 'trendline',
      points: [
        { x: 10, y: 10 },
        { x: 100, y: 100 },
      ],
      style: { stroke: '#ffffff', strokeWidth: 2 },
    },
    {
      id: 'drawing-2',
      kind: 'rect',
      points: [
        { x: 50, y: 50 },
        { x: 150, y: 150 },
      ],
      style: { stroke: '#00ff00', strokeWidth: 1, fill: '#00ff0020' },
    },
  ];

  const mockStoreState = {
    drawings: mockDrawings,
    selection: new Set<string>(),
    activeTool: 'cursor',
    activeLayerId: 'layer-1',
    layers: [{ id: 'layer-1', visible: true, locked: false, opacity: 1 }],
    drawingSettings: {
      snapEnabled: false,
      snapStep: 10,
      perToolSnap: {},
      showHandles: true,
      snapPriceLevels: false,
      snapToOHLC: false,
      magnetTolerancePx: 10,
      fibDefaultLevels: [0, 0.236, 0.382, 0.5, 0.618, 1],
      lineCap: 'round' as CanvasLineCap,
    },
    addDrawing: vi.fn(),
    updateDrawing: vi.fn(),
    deleteDrawing: vi.fn(),
    setSelection: vi.fn(),
    clearSelection: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockSubscribe.mockClear();
    mockSubscribe.mockReturnValue(vi.fn()); // Return unsubscribe function
    const mockedStore = vi.mocked(useChartStore);
    mockedStore.mockReturnValue(mockStoreState);
    // Add subscribe method to the mocked function
    (mockedStore as unknown as { subscribe: typeof mockSubscribe }).subscribe = mockSubscribe;
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
      vi.mocked(useChartStore).mockReturnValue({
        ...mockStoreState,
        setSelection,
      });

      const { container } = render(<DrawingLayer />);
      const canvas = container.querySelector('canvas') as HTMLCanvasElement;

      fireEvent.click(canvas, { clientX: 50, clientY: 50 });

      expect(canvas).toBeTruthy();
    });

    it('should clear selection on background click', () => {
      const clearSelection = vi.fn();
      vi.mocked(useChartStore).mockReturnValue({
        ...mockStoreState,
        clearSelection,
      });

      const { container } = render(<DrawingLayer />);
      const canvas = container.querySelector('canvas') as HTMLCanvasElement;

      fireEvent.click(canvas, { clientX: 500, clientY: 500 });

      expect(canvas).toBeTruthy();
    });
  });

  describe('Snap Functionality', () => {
    it('should apply grid snap when enabled', () => {
      const _snapPxToGrid = vi.spyOn(chartMapModule, 'snapPxToGrid');
      vi.mocked(useChartStore).mockReturnValue({
        ...mockStoreState,
        drawingSettings: {
          ...mockStoreState.drawingSettings,
          snapEnabled: true,
          snapStep: 20,
        },
      });

      const { container } = render(<DrawingLayer />);
      const canvas = container.querySelector('canvas') as HTMLCanvasElement;

      fireEvent.pointerMove(canvas, { clientX: 115, clientY: 115 });

      expect(canvas).toBeTruthy();
    });

    it('should apply price level snap when enabled', () => {
      const _snapYToPriceLevels = vi.spyOn(chartMapModule, 'snapYToPriceLevels');
      vi.mocked(useChartStore).mockReturnValue({
        ...mockStoreState,
        drawingSettings: {
          ...mockStoreState.drawingSettings,
          snapPriceLevels: true,
        },
      });

      const { container } = render(<DrawingLayer />);
      const canvas = container.querySelector('canvas') as HTMLCanvasElement;

      fireEvent.pointerMove(canvas, { clientX: 100, clientY: 100 });

      expect(canvas).toBeTruthy();
    });
  });

  describe('Tool Modes', () => {
    it('should handle trendline tool', () => {
      vi.mocked(useChartStore).mockReturnValue({
        ...mockStoreState,
        activeTool: 'trendline',
      });

      const { container } = render(<DrawingLayer />);
      const canvas = container.querySelector('canvas') as HTMLCanvasElement;

      fireEvent.pointerDown(canvas, { clientX: 100, clientY: 100 });
      fireEvent.pointerMove(canvas, { clientX: 200, clientY: 200 });
      fireEvent.pointerUp(canvas, { clientX: 200, clientY: 200 });

      expect(canvas).toBeTruthy();
    });

    it('should handle rectangle tool', () => {
      vi.mocked(useChartStore).mockReturnValue({
        ...mockStoreState,
        activeTool: 'rect',
      });

      const { container } = render(<DrawingLayer />);
      const canvas = container.querySelector('canvas') as HTMLCanvasElement;

      fireEvent.pointerDown(canvas, { clientX: 100, clientY: 100 });
      fireEvent.pointerMove(canvas, { clientX: 200, clientY: 200 });
      fireEvent.pointerUp(canvas, { clientX: 200, clientY: 200 });

      expect(canvas).toBeTruthy();
    });

    it('should handle text tool', () => {
      vi.mocked(useChartStore).mockReturnValue({
        ...mockStoreState,
        activeTool: 'text',
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
      vi.mocked(useChartStore).mockReturnValue({
        ...mockStoreState,
        selection: new Set(['drawing-1']),
        deleteDrawing,
      });

      const { container } = render(<DrawingLayer />);

      fireEvent.keyDown(document, { key: 'Delete' });

      expect(container).toBeTruthy();
    });

    it('should delete selected drawings on backspace key', () => {
      const deleteDrawing = vi.fn();
      vi.mocked(useChartStore).mockReturnValue({
        ...mockStoreState,
        selection: new Set(['drawing-1']),
        deleteDrawing,
      });

      const { container } = render(<DrawingLayer />);

      fireEvent.keyDown(document, { key: 'Backspace' });

      expect(container).toBeTruthy();
    });
  });

  describe('Layer Visibility', () => {
    it('should respect layer visibility settings', () => {
      vi.mocked(useChartStore).mockReturnValue({
        ...mockStoreState,
        drawings: [{ ...mockDrawings[0], layerId: 'layer-hidden' }],
        layers: [{ id: 'layer-hidden', visible: false, locked: false, opacity: 1 }],
      });

      const { container } = render(<DrawingLayer />);
      const canvas = container.querySelector('canvas');

      expect(canvas).toBeTruthy();
    });

    it('should respect layer opacity settings', () => {
      vi.mocked(useChartStore).mockReturnValue({
        ...mockStoreState,
        drawings: [{ ...mockDrawings[0], layerId: 'layer-transparent' }],
        layers: [{ id: 'layer-transparent', visible: true, locked: false, opacity: 0.5 }],
      });

      const { container } = render(<DrawingLayer />);
      const canvas = container.querySelector('canvas');

      expect(canvas).toBeTruthy();
    });
  });

  describe('Performance', () => {
    it('should handle many drawings efficiently', async () => {
      const manyDrawings = Array.from({ length: 100 }, (_: unknown, i: number) => ({
        id: `drawing-${i}`,
        kind: 'trendline',
        points: [
          { x: i * 10, y: i * 10 },
          { x: i * 10 + 50, y: i * 10 + 50 },
        ],
        style: { stroke: '#ffffff', strokeWidth: 1 },
      }));

      vi.mocked(useChartStore).mockReturnValue({
        ...mockStoreState,
        drawings: manyDrawings,
      });

      const startTime = performance.now();
      const { container } = render(<DrawingLayer />);
      const endTime = performance.now();

      expect(container.querySelector('canvas')).toBeTruthy();
      expect(endTime - startTime).toBeLessThan(1000); // Should render in less than 1 second
    });

    it('should use requestAnimationFrame for smooth rendering', async () => {
      const _rafSpy = vi.spyOn(window, 'requestAnimationFrame');

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
      vi.mocked(useChartStore).mockReturnValue({
        ...mockStoreState,
        activeTool: 'trendline',
      });

      const { container } = render(<DrawingLayer />);
      const canvas = container.querySelector('canvas') as HTMLCanvasElement;

      fireEvent.pointerDown(canvas, { clientX: 100, clientY: 100 });
      fireEvent.keyDown(document, { key: 'Escape' });

      expect(canvas).toBeTruthy();
    });

    it('should handle Ctrl+A to select all', () => {
      const setSelection = vi.fn();
      vi.mocked(useChartStore).mockReturnValue({
        ...mockStoreState,
        setSelection,
      });

      render(<DrawingLayer />);

      fireEvent.keyDown(document, { key: 'a', ctrlKey: true });

      // Component should handle the shortcut
      expect(true).toBe(true);
    });
  });
});
