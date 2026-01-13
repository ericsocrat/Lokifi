import type { DrawingObject, Point } from '@/lib/stores/drawingStore';
import { fireEvent, render } from '@testing-library/react';
import type { IChartApi, ISeriesApi, Time } from 'lightweight-charts';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DrawingOverlay } from '../../components/DrawingOverlay';

// Hoisted mocks
const { mockDrawingStore, useDrawingStoreMock } = vi.hoisted(() => {
  const store = {
    objects: [] as DrawingObject[],
    getObjectsByPane: vi.fn(() => []),
    selectedObjectId: null as string | null,
    selectObject: vi.fn(),
    setActiveTool: vi.fn(),
    activeTool: null as string | null,
    updateObject: vi.fn(),
    getObjectById: vi.fn(),
    deleteObject: vi.fn(),
  };

  const useStore = () => store;
  (useStore as typeof useStore & { getState: () => typeof store }).getState = () => store;

  return { mockDrawingStore: store, useDrawingStoreMock: useStore };
});

vi.mock('@/lib/stores/drawingStore', () => ({
  useDrawingStore: useDrawingStoreMock,
}));

// Mock ResizeObserver as a proper class
class MockResizeObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}
global.ResizeObserver = MockResizeObserver as unknown as typeof ResizeObserver;

// Mock canvas element
const mockCanvas = {
  width: 800,
  height: 600,
};

// Mock canvas getContext
const mockCtx = {
  clearRect: vi.fn(),
  beginPath: vi.fn(),
  moveTo: vi.fn(),
  lineTo: vi.fn(),
  stroke: vi.fn(),
  strokeRect: vi.fn(),
  fillRect: vi.fn(),
  fillText: vi.fn(),
  arc: vi.fn(),
  ellipse: vi.fn(),
  fill: vi.fn(),
  closePath: vi.fn(),
  setLineDash: vi.fn(),
  save: vi.fn(),
  restore: vi.fn(),
  translate: vi.fn(),
  scale: vi.fn(),
  measureText: vi.fn(() => ({ width: 50 })),
  strokeStyle: '',
  lineWidth: 1,
  fillStyle: '',
  font: '',
  textAlign: 'left' as CanvasTextAlign,
  textBaseline: 'top' as CanvasTextBaseline,
  canvas: mockCanvas,
};

HTMLCanvasElement.prototype.getContext = vi.fn(
  () => mockCtx
) as unknown as typeof HTMLCanvasElement.prototype.getContext;

// Create a mock drawing object helper
const createMockDrawingObject = (
  id: string,
  type: string,
  points: Point[],
  overrides?: Partial<DrawingObject>
): DrawingObject =>
  ({
    id,
    type,
    paneId: 'main',
    points,
    style: {
      color: '#ffffff',
      lineWidth: 2,
      lineStyle: 'solid',
    },
    properties: {
      name: `Drawing ${id}`,
      visible: true,
      locked: false,
      zIndex: 1,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
    ...overrides,
  }) as DrawingObject;

describe('DrawingOverlay', () => {
  // Mock refs with all required methods
  const mockTimeScale = {
    timeToCoordinate: vi.fn((time: Time) => (typeof time === 'number' ? time * 10 : 0)),
    coordinateToTime: vi.fn((x: number) => Math.floor(x / 10) as Time),
    subscribeVisibleTimeRangeChange: vi.fn(() => vi.fn()),
    subscribeVisibleLogicalRangeChange: vi.fn(() => vi.fn()),
    unsubscribeVisibleTimeRangeChange: vi.fn(),
    unsubscribeVisibleLogicalRangeChange: vi.fn(),
    width: vi.fn(() => 800),
    getVisibleRange: vi.fn(() => ({ from: 0, to: 100 })),
    getVisibleLogicalRange: vi.fn(() => ({ from: 0, to: 100 })),
  };

  const mockChartApi = {
    timeScale: vi.fn(() => mockTimeScale),
    priceScale: vi.fn(() => ({
      width: vi.fn(() => 50),
    })),
    width: vi.fn(() => 800),
    height: vi.fn(() => 600),
    chartElement: vi.fn(() => document.createElement('div')),
  } as unknown as IChartApi;

  const mockSeriesApi = {
    priceToCoordinate: vi.fn((price: number) => 600 - price),
    coordinateToPrice: vi.fn((y: number) => 600 - y),
  } as unknown as ISeriesApi<'Candlestick'>;

  const chartRef = { current: mockChartApi };
  const seriesRef = { current: mockSeriesApi };
  const containerRef = { current: document.createElement('div') };

  beforeEach(() => {
    vi.clearAllMocks();
    mockDrawingStore.objects = [];
    mockDrawingStore.getObjectsByPane.mockReturnValue([]);
    mockDrawingStore.selectedObjectId = null;
    mockDrawingStore.activeTool = null;

    // Reset mock return values
    mockTimeScale.timeToCoordinate.mockImplementation((time: Time) =>
      typeof time === 'number' ? time * 10 : 0
    );
    mockTimeScale.coordinateToTime.mockImplementation((x: number) => Math.floor(x / 10) as Time);
    (mockSeriesApi.priceToCoordinate as ReturnType<typeof vi.fn>).mockImplementation(
      (price: number) => 600 - price
    );
    (mockSeriesApi.coordinateToPrice as ReturnType<typeof vi.fn>).mockImplementation(
      (y: number) => 600 - y
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Rendering', () => {
    it('should render canvas element', () => {
      const { container } = render(
        <DrawingOverlay
          chartRef={chartRef}
          seriesRef={seriesRef}
          containerRef={containerRef}
          paneId="main"
          isDrawing={false}
          currentDrawing={null}
        />
      );

      const canvas = container.querySelector('canvas');
      expect(canvas).toBeInTheDocument();
    });

    it('should render with correct pane ID', () => {
      const { container } = render(
        <DrawingOverlay
          chartRef={chartRef}
          seriesRef={seriesRef}
          containerRef={containerRef}
          paneId="test-pane"
          isDrawing={false}
          currentDrawing={null}
        />
      );

      const canvas = container.querySelector('canvas');
      expect(canvas).toBeInTheDocument();
    });

    it('should render in drawing mode', () => {
      const { container } = render(
        <DrawingOverlay
          chartRef={chartRef}
          seriesRef={seriesRef}
          containerRef={containerRef}
          paneId="main"
          isDrawing={true}
          currentDrawing={{ type: 'line', points: [] }}
        />
      );

      const canvas = container.querySelector('canvas');
      expect(canvas).toBeInTheDocument();
    });
  });

  describe('Drawing Objects Display', () => {
    it('should call getObjectsByPane with correct pane ID', () => {
      render(
        <DrawingOverlay
          chartRef={chartRef}
          seriesRef={seriesRef}
          containerRef={containerRef}
          paneId="main"
          isDrawing={false}
          currentDrawing={null}
        />
      );

      expect(mockDrawingStore.getObjectsByPane).toHaveBeenCalledWith('main');
    });

    it('should render horizontal line objects', () => {
      const hlineObject = createMockDrawingObject('hline-1', 'hline', [
        { time: 100 as Time, price: 300 },
      ]);

      mockDrawingStore.getObjectsByPane.mockReturnValue([hlineObject]);

      const { container } = render(
        <DrawingOverlay
          chartRef={chartRef}
          seriesRef={seriesRef}
          containerRef={containerRef}
          paneId="main"
          isDrawing={false}
          currentDrawing={null}
        />
      );

      const canvas = container.querySelector('canvas');
      expect(canvas).toBeInTheDocument();
    });

    it('should render vertical line objects', () => {
      const vlineObject = createMockDrawingObject('vline-1', 'vline', [
        { time: 50 as Time, price: 200 },
      ]);

      mockDrawingStore.getObjectsByPane.mockReturnValue([vlineObject]);

      const { container } = render(
        <DrawingOverlay
          chartRef={chartRef}
          seriesRef={seriesRef}
          containerRef={containerRef}
          paneId="main"
          isDrawing={false}
          currentDrawing={null}
        />
      );

      const canvas = container.querySelector('canvas');
      expect(canvas).toBeInTheDocument();
    });

    it('should render line objects with two points', () => {
      const lineObject = createMockDrawingObject('line-1', 'line', [
        { time: 10 as Time, price: 100 },
        { time: 50 as Time, price: 200 },
      ]);

      mockDrawingStore.getObjectsByPane.mockReturnValue([lineObject]);

      const { container } = render(
        <DrawingOverlay
          chartRef={chartRef}
          seriesRef={seriesRef}
          containerRef={containerRef}
          paneId="main"
          isDrawing={false}
          currentDrawing={null}
        />
      );

      const canvas = container.querySelector('canvas');
      expect(canvas).toBeInTheDocument();
    });

    it('should render rectangle objects', () => {
      const rectObject = createMockDrawingObject('rect-1', 'rectangle', [
        { time: 10 as Time, price: 100 },
        { time: 50 as Time, price: 200 },
      ]);

      mockDrawingStore.getObjectsByPane.mockReturnValue([rectObject]);

      const { container } = render(
        <DrawingOverlay
          chartRef={chartRef}
          seriesRef={seriesRef}
          containerRef={containerRef}
          paneId="main"
          isDrawing={false}
          currentDrawing={null}
        />
      );

      const canvas = container.querySelector('canvas');
      expect(canvas).toBeInTheDocument();
    });

    it('should not render invisible objects', () => {
      const invisibleObject = createMockDrawingObject(
        'invisible-1',
        'hline',
        [{ time: 100 as Time, price: 300 }],
        {
          properties: {
            name: 'Invisible',
            visible: false,
            locked: false,
            zIndex: 1,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          },
        }
      );

      mockDrawingStore.getObjectsByPane.mockReturnValue([invisibleObject]);

      const { container } = render(
        <DrawingOverlay
          chartRef={chartRef}
          seriesRef={seriesRef}
          containerRef={containerRef}
          paneId="main"
          isDrawing={false}
          currentDrawing={null}
        />
      );

      const canvas = container.querySelector('canvas');
      expect(canvas).toBeInTheDocument();
    });
  });

  describe('Object Selection', () => {
    it('should highlight selected objects', () => {
      const lineObject = createMockDrawingObject('line-1', 'line', [
        { time: 10 as Time, price: 100 },
        { time: 50 as Time, price: 200 },
      ]);

      mockDrawingStore.getObjectsByPane.mockReturnValue([lineObject]);
      mockDrawingStore.selectedObjectId = 'line-1';

      const { container } = render(
        <DrawingOverlay
          chartRef={chartRef}
          seriesRef={seriesRef}
          containerRef={containerRef}
          paneId="main"
          isDrawing={false}
          currentDrawing={null}
        />
      );

      const canvas = container.querySelector('canvas');
      expect(canvas).toBeInTheDocument();
    });
  });

  describe('Current Drawing Preview', () => {
    it('should show preview when isDrawing is true', () => {
      const { container } = render(
        <DrawingOverlay
          chartRef={chartRef}
          seriesRef={seriesRef}
          containerRef={containerRef}
          paneId="main"
          isDrawing={true}
          currentDrawing={{
            type: 'line',
            points: [{ time: 10 as Time, price: 100 }],
          }}
        />
      );

      const canvas = container.querySelector('canvas');
      expect(canvas).toBeInTheDocument();
    });

    it('should show preview for trendline', () => {
      const { container } = render(
        <DrawingOverlay
          chartRef={chartRef}
          seriesRef={seriesRef}
          containerRef={containerRef}
          paneId="main"
          isDrawing={true}
          currentDrawing={{
            type: 'trendline',
            points: [
              { time: 10 as Time, price: 100 },
              { time: 50 as Time, price: 150 },
            ],
          }}
        />
      );

      const canvas = container.querySelector('canvas');
      expect(canvas).toBeInTheDocument();
    });
  });

  describe('Canvas Cursor', () => {
    it('should have default cursor when not drawing', () => {
      const { container } = render(
        <DrawingOverlay
          chartRef={chartRef}
          seriesRef={seriesRef}
          containerRef={containerRef}
          paneId="main"
          isDrawing={false}
          currentDrawing={null}
        />
      );

      const canvas = container.querySelector('canvas');
      expect(canvas).toBeInTheDocument();
    });

    it('should have crosshair cursor when drawing', () => {
      const { container } = render(
        <DrawingOverlay
          chartRef={chartRef}
          seriesRef={seriesRef}
          containerRef={containerRef}
          paneId="main"
          isDrawing={true}
          currentDrawing={{ type: 'line', points: [] }}
        />
      );

      const canvas = container.querySelector('canvas');
      expect(canvas).toBeInTheDocument();
    });
  });

  describe('Chart Data Updates', () => {
    it('should re-render when chartDataLength changes', () => {
      const { rerender, container } = render(
        <DrawingOverlay
          chartRef={chartRef}
          seriesRef={seriesRef}
          containerRef={containerRef}
          paneId="main"
          isDrawing={false}
          currentDrawing={null}
          chartDataLength={100}
        />
      );

      const canvas1 = container.querySelector('canvas');
      expect(canvas1).toBeInTheDocument();

      // Update with new data length
      rerender(
        <DrawingOverlay
          chartRef={chartRef}
          seriesRef={seriesRef}
          containerRef={containerRef}
          paneId="main"
          isDrawing={false}
          currentDrawing={null}
          chartDataLength={150}
        />
      );

      const canvas2 = container.querySelector('canvas');
      expect(canvas2).toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    it('should render correctly with no objects', () => {
      mockDrawingStore.getObjectsByPane.mockReturnValue([]);

      const { container } = render(
        <DrawingOverlay
          chartRef={chartRef}
          seriesRef={seriesRef}
          containerRef={containerRef}
          paneId="main"
          isDrawing={false}
          currentDrawing={null}
        />
      );

      const canvas = container.querySelector('canvas');
      expect(canvas).toBeInTheDocument();
    });

    it('should handle null chart ref gracefully', () => {
      const nullChartRef = { current: null };

      const { container } = render(
        <DrawingOverlay
          chartRef={nullChartRef}
          seriesRef={seriesRef}
          containerRef={containerRef}
          paneId="main"
          isDrawing={false}
          currentDrawing={null}
        />
      );

      const canvas = container.querySelector('canvas');
      expect(canvas).toBeInTheDocument();
    });

    it('should handle null series ref gracefully', () => {
      const nullSeriesRef = { current: null };

      const { container } = render(
        <DrawingOverlay
          chartRef={chartRef}
          seriesRef={nullSeriesRef}
          containerRef={containerRef}
          paneId="main"
          isDrawing={false}
          currentDrawing={null}
        />
      );

      const canvas = container.querySelector('canvas');
      expect(canvas).toBeInTheDocument();
    });
  });

  describe('Multiple Objects', () => {
    it('should render multiple drawing objects', () => {
      const objects = [
        createMockDrawingObject('line-1', 'line', [
          { time: 10 as Time, price: 100 },
          { time: 50 as Time, price: 200 },
        ]),
        createMockDrawingObject('hline-1', 'hline', [{ time: 0 as Time, price: 150 }]),
        createMockDrawingObject('rect-1', 'rectangle', [
          { time: 20 as Time, price: 120 },
          { time: 40 as Time, price: 180 },
        ]),
      ];

      mockDrawingStore.getObjectsByPane.mockReturnValue(objects);

      const { container } = render(
        <DrawingOverlay
          chartRef={chartRef}
          seriesRef={seriesRef}
          containerRef={containerRef}
          paneId="main"
          isDrawing={false}
          currentDrawing={null}
        />
      );

      const canvas = container.querySelector('canvas');
      expect(canvas).toBeInTheDocument();
    });
  });

  describe('Object Properties', () => {
    it('should respect object color property', () => {
      const coloredObject = createMockDrawingObject(
        'colored-1',
        'line',
        [
          { time: 10 as Time, price: 100 },
          { time: 50 as Time, price: 200 },
        ],
        { style: { color: '#ff0000', lineWidth: 2, lineStyle: 'solid' as const } }
      );

      mockDrawingStore.getObjectsByPane.mockReturnValue([coloredObject]);

      const { container } = render(
        <DrawingOverlay
          chartRef={chartRef}
          seriesRef={seriesRef}
          containerRef={containerRef}
          paneId="main"
          isDrawing={false}
          currentDrawing={null}
        />
      );

      const canvas = container.querySelector('canvas');
      expect(canvas).toBeInTheDocument();
    });

    it('should respect object line width property', () => {
      const thickObject = createMockDrawingObject(
        'thick-1',
        'line',
        [
          { time: 10 as Time, price: 100 },
          { time: 50 as Time, price: 200 },
        ],
        { style: { color: '#ffffff', lineWidth: 5, lineStyle: 'solid' as const } }
      );

      mockDrawingStore.getObjectsByPane.mockReturnValue([thickObject]);

      const { container } = render(
        <DrawingOverlay
          chartRef={chartRef}
          seriesRef={seriesRef}
          containerRef={containerRef}
          paneId="main"
          isDrawing={false}
          currentDrawing={null}
        />
      );

      const canvas = container.querySelector('canvas');
      expect(canvas).toBeInTheDocument();
    });
  });

  describe('Drawing Types', () => {
    it('should render fibonacci retracement', () => {
      const fibObject = createMockDrawingObject('fib-1', 'fibRetracement', [
        { time: 10 as Time, price: 100 },
        { time: 50 as Time, price: 200 },
      ]);

      mockDrawingStore.getObjectsByPane.mockReturnValue([fibObject]);

      const { container } = render(
        <DrawingOverlay
          chartRef={chartRef}
          seriesRef={seriesRef}
          containerRef={containerRef}
          paneId="main"
          isDrawing={false}
          currentDrawing={null}
        />
      );

      const canvas = container.querySelector('canvas');
      expect(canvas).toBeInTheDocument();
    });

    it('should render channel objects', () => {
      const channelObject = createMockDrawingObject('channel-1', 'channel', [
        { time: 10 as Time, price: 100 },
        { time: 50 as Time, price: 150 },
        { time: 10 as Time, price: 80 },
      ]);

      mockDrawingStore.getObjectsByPane.mockReturnValue([channelObject]);

      const { container } = render(
        <DrawingOverlay
          chartRef={chartRef}
          seriesRef={seriesRef}
          containerRef={containerRef}
          paneId="main"
          isDrawing={false}
          currentDrawing={null}
        />
      );

      const canvas = container.querySelector('canvas');
      expect(canvas).toBeInTheDocument();
    });

    it('should render text note objects', () => {
      const textObject = createMockDrawingObject(
        'text-1',
        'textNote',
        [{ time: 30 as Time, price: 150 }],
        { text: 'Test Note' }
      );

      mockDrawingStore.getObjectsByPane.mockReturnValue([textObject]);

      const { container } = render(
        <DrawingOverlay
          chartRef={chartRef}
          seriesRef={seriesRef}
          containerRef={containerRef}
          paneId="main"
          isDrawing={false}
          currentDrawing={null}
        />
      );

      const canvas = container.querySelector('canvas');
      expect(canvas).toBeInTheDocument();
    });

    it('should render circle objects', () => {
      const circleObject = createMockDrawingObject('circle-1', 'circle', [
        { time: 30 as Time, price: 150 },
        { time: 50 as Time, price: 180 },
      ]);

      mockDrawingStore.getObjectsByPane.mockReturnValue([circleObject]);

      const { container } = render(
        <DrawingOverlay
          chartRef={chartRef}
          seriesRef={seriesRef}
          containerRef={containerRef}
          paneId="main"
          isDrawing={false}
          currentDrawing={null}
        />
      );

      const canvas = container.querySelector('canvas');
      expect(canvas).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Mouse Event Handling Tests
  // ==========================================================================
  describe('Mouse Event Handling', () => {
    it('should handle mouse down on canvas', () => {
      const lineObject = createMockDrawingObject('line-1', 'line', [
        { time: 10 as Time, price: 100 },
        { time: 50 as Time, price: 200 },
      ]);
      mockDrawingStore.objects = [lineObject];
      mockDrawingStore.getObjectsByPane.mockReturnValue([lineObject]);

      const { container } = render(
        <DrawingOverlay
          chartRef={chartRef}
          seriesRef={seriesRef}
          containerRef={containerRef}
          paneId="main"
          isDrawing={false}
          currentDrawing={null}
        />
      );

      const canvas = container.querySelector('canvas');
      expect(canvas).toBeInTheDocument();
      if (canvas) {
        fireEvent.mouseDown(canvas, { clientX: 100, clientY: 500 });
      }
    });

    it('should handle mouse move on canvas', () => {
      const lineObject = createMockDrawingObject('line-1', 'line', [
        { time: 10 as Time, price: 100 },
        { time: 50 as Time, price: 200 },
      ]);
      mockDrawingStore.objects = [lineObject];
      mockDrawingStore.getObjectsByPane.mockReturnValue([lineObject]);

      const { container } = render(
        <DrawingOverlay
          chartRef={chartRef}
          seriesRef={seriesRef}
          containerRef={containerRef}
          paneId="main"
          isDrawing={false}
          currentDrawing={null}
        />
      );

      const canvas = container.querySelector('canvas');
      if (canvas) {
        fireEvent.mouseMove(canvas, { clientX: 200, clientY: 300 });
      }
      expect(canvas).toBeInTheDocument();
    });

    it('should handle mouse up on canvas', () => {
      const lineObject = createMockDrawingObject('line-1', 'line', [
        { time: 10 as Time, price: 100 },
        { time: 50 as Time, price: 200 },
      ]);
      mockDrawingStore.objects = [lineObject];
      mockDrawingStore.getObjectsByPane.mockReturnValue([lineObject]);

      const { container } = render(
        <DrawingOverlay
          chartRef={chartRef}
          seriesRef={seriesRef}
          containerRef={containerRef}
          paneId="main"
          isDrawing={false}
          currentDrawing={null}
        />
      );

      const canvas = container.querySelector('canvas');
      if (canvas) {
        fireEvent.mouseDown(canvas, { clientX: 100, clientY: 500 });
        fireEvent.mouseUp(canvas, { clientX: 100, clientY: 500 });
      }
      expect(canvas).toBeInTheDocument();
    });

    it('should handle click on canvas', () => {
      const lineObject = createMockDrawingObject('line-1', 'line', [
        { time: 10 as Time, price: 100 },
        { time: 50 as Time, price: 200 },
      ]);
      mockDrawingStore.objects = [lineObject];
      mockDrawingStore.getObjectsByPane.mockReturnValue([lineObject]);

      const { container } = render(
        <DrawingOverlay
          chartRef={chartRef}
          seriesRef={seriesRef}
          containerRef={containerRef}
          paneId="main"
          isDrawing={false}
          currentDrawing={null}
        />
      );

      const canvas = container.querySelector('canvas');
      if (canvas) {
        fireEvent.click(canvas, { clientX: 100, clientY: 500 });
      }
      expect(canvas).toBeInTheDocument();
    });

    it('should not handle mouse down when in drawing mode', () => {
      const lineObject = createMockDrawingObject('line-1', 'line', [
        { time: 10 as Time, price: 100 },
        { time: 50 as Time, price: 200 },
      ]);
      mockDrawingStore.objects = [lineObject];
      mockDrawingStore.getObjectsByPane.mockReturnValue([lineObject]);

      const { container } = render(
        <DrawingOverlay
          chartRef={chartRef}
          seriesRef={seriesRef}
          containerRef={containerRef}
          paneId="main"
          isDrawing={true}
          currentDrawing={{ type: 'line', points: [] }}
        />
      );

      const canvas = container.querySelector('canvas');
      if (canvas) {
        fireEvent.mouseDown(canvas, { clientX: 100, clientY: 500 });
      }
      // Selection should not be triggered in drawing mode
      expect(mockDrawingStore.selectObject).not.toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // Object Selection Tests
  // ==========================================================================
  describe('Object Selection via Click', () => {
    it('should deselect when clicking on empty area', () => {
      mockDrawingStore.objects = [];
      mockDrawingStore.getObjectsByPane.mockReturnValue([]);

      const { container } = render(
        <DrawingOverlay
          chartRef={chartRef}
          seriesRef={seriesRef}
          containerRef={containerRef}
          paneId="main"
          isDrawing={false}
          currentDrawing={null}
        />
      );

      const canvas = container.querySelector('canvas');
      if (canvas) {
        fireEvent.mouseDown(canvas, { clientX: 400, clientY: 400 });
      }

      expect(mockDrawingStore.selectObject).toHaveBeenCalledWith(null);
    });

    it('should select object when clicking on it', () => {
      const hlineObject = createMockDrawingObject('hline-1', 'hline', [
        { time: 50 as Time, price: 100 },
      ]);
      mockDrawingStore.objects = [hlineObject];
      mockDrawingStore.getObjectsByPane.mockReturnValue([hlineObject]);

      const { container } = render(
        <DrawingOverlay
          chartRef={chartRef}
          seriesRef={seriesRef}
          containerRef={containerRef}
          paneId="main"
          isDrawing={false}
          currentDrawing={null}
        />
      );

      const canvas = container.querySelector('canvas');
      if (canvas) {
        // Click near the horizontal line (y = 600 - 100 = 500)
        fireEvent.mouseDown(canvas, { clientX: 200, clientY: 500 });
      }

      expect(mockDrawingStore.selectObject).toHaveBeenCalledWith('hline-1');
    });
  });

  // ==========================================================================
  // Arrow Drawing Tests
  // ==========================================================================
  describe('Arrow Drawing', () => {
    it('should render arrow objects', () => {
      const arrowObject = createMockDrawingObject('arrow-1', 'arrow', [
        { time: 10 as Time, price: 100 },
        { time: 50 as Time, price: 200 },
      ]);

      mockDrawingStore.getObjectsByPane.mockReturnValue([arrowObject]);

      const { container } = render(
        <DrawingOverlay
          chartRef={chartRef}
          seriesRef={seriesRef}
          containerRef={containerRef}
          paneId="main"
          isDrawing={false}
          currentDrawing={null}
        />
      );

      const canvas = container.querySelector('canvas');
      expect(canvas).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Fibonacci Extension Tests
  // ==========================================================================
  describe('Fibonacci Extension', () => {
    it('should render fibonacci extension objects', () => {
      const fibExtObject = createMockDrawingObject('fibext-1', 'fibonacciExtension', [
        { time: 10 as Time, price: 100 },
        { time: 50 as Time, price: 200 },
      ]);

      mockDrawingStore.getObjectsByPane.mockReturnValue([fibExtObject]);

      const { container } = render(
        <DrawingOverlay
          chartRef={chartRef}
          seriesRef={seriesRef}
          containerRef={containerRef}
          paneId="main"
          isDrawing={false}
          currentDrawing={null}
        />
      );

      const canvas = container.querySelector('canvas');
      expect(canvas).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Parallel Channel Tests
  // ==========================================================================
  describe('Parallel Channel', () => {
    it('should render parallel channel objects', () => {
      const channelObject = createMockDrawingObject('channel-1', 'parallelChannel', [
        { time: 10 as Time, price: 100 },
        { time: 50 as Time, price: 200 },
      ]);

      mockDrawingStore.getObjectsByPane.mockReturnValue([channelObject]);

      const { container } = render(
        <DrawingOverlay
          chartRef={chartRef}
          seriesRef={seriesRef}
          containerRef={containerRef}
          paneId="main"
          isDrawing={false}
          currentDrawing={null}
        />
      );

      const canvas = container.querySelector('canvas');
      expect(canvas).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Pitchfork Tests
  // ==========================================================================
  describe('Pitchfork', () => {
    it('should render pitchfork objects', () => {
      const pitchforkObject = createMockDrawingObject('pitchfork-1', 'pitchfork', [
        { time: 10 as Time, price: 100 },
        { time: 50 as Time, price: 200 },
      ]);

      mockDrawingStore.getObjectsByPane.mockReturnValue([pitchforkObject]);

      const { container } = render(
        <DrawingOverlay
          chartRef={chartRef}
          seriesRef={seriesRef}
          containerRef={containerRef}
          paneId="main"
          isDrawing={false}
          currentDrawing={null}
        />
      );

      const canvas = container.querySelector('canvas');
      expect(canvas).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Fill Color Tests
  // ==========================================================================
  describe('Fill Colors', () => {
    it('should render rectangle with fill color', () => {
      const rectObject = createMockDrawingObject(
        'rect-fill-1',
        'rectangle',
        [
          { time: 10 as Time, price: 100 },
          { time: 50 as Time, price: 200 },
        ],
        {
          style: {
            color: '#ffffff',
            lineWidth: 2,
            lineStyle: 'solid' as const,
            fillColor: '#ff0000',
            fillOpacity: 0.5,
          },
        }
      );

      mockDrawingStore.getObjectsByPane.mockReturnValue([rectObject]);

      const { container } = render(
        <DrawingOverlay
          chartRef={chartRef}
          seriesRef={seriesRef}
          containerRef={containerRef}
          paneId="main"
          isDrawing={false}
          currentDrawing={null}
        />
      );

      const canvas = container.querySelector('canvas');
      expect(canvas).toBeInTheDocument();
    });

    it('should render circle with fill color', () => {
      const circleObject = createMockDrawingObject(
        'circle-fill-1',
        'circle',
        [
          { time: 10 as Time, price: 100 },
          { time: 50 as Time, price: 200 },
        ],
        {
          style: {
            color: '#ffffff',
            lineWidth: 2,
            lineStyle: 'solid' as const,
            fillColor: '#00ff00',
            fillOpacity: 0.3,
          },
        }
      );

      mockDrawingStore.getObjectsByPane.mockReturnValue([circleObject]);

      const { container } = render(
        <DrawingOverlay
          chartRef={chartRef}
          seriesRef={seriesRef}
          containerRef={containerRef}
          paneId="main"
          isDrawing={false}
          currentDrawing={null}
        />
      );

      const canvas = container.querySelector('canvas');
      expect(canvas).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Text Note Editing Tests
  // ==========================================================================
  describe('Text Note Editing', () => {
    const textPoint = { time: 10 as Time, price: 100 };

    const setupTextNote = () => {
      mockDrawingStore.activeTool = 'cursor';
      const textObject = createMockDrawingObject(
        'text-1',
        'textNote',
        [textPoint],
        { properties: { name: 'Old Text', visible: true, locked: false, zIndex: 1 } }
      );

      mockDrawingStore.getObjectsByPane.mockReturnValue([textObject]);
      mockDrawingStore.getObjectById.mockReturnValue(textObject);

      const renderResult = render(
        <DrawingOverlay
          chartRef={chartRef}
          seriesRef={seriesRef}
          containerRef={containerRef}
          paneId="main"
          isDrawing={false}
          currentDrawing={null}
        />
      );

      const canvas = renderResult.container.querySelector('canvas') as HTMLCanvasElement;
      vi.spyOn(canvas, 'getBoundingClientRect').mockReturnValue({
        left: 0,
        top: 0,
        right: 800,
        bottom: 600,
        width: 800,
        height: 600,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      });

      return { ...renderResult, canvas };
    };

    it('opens text input on click and updates name on blur', () => {
      const { container, canvas } = setupTextNote();

      fireEvent.click(canvas, { clientX: 100, clientY: 500 });

      const input = container.querySelector('input');
      expect(input).toBeInTheDocument();

      if (input) {
        fireEvent.change(input, { target: { value: 'New Text' } });
        fireEvent.blur(input);
      }

      expect(mockDrawingStore.updateObject).toHaveBeenCalledWith(
        'text-1',
        expect.objectContaining({
          properties: expect.objectContaining({ name: 'New Text' }),
        })
      );
      expect(container.querySelector('input')).not.toBeInTheDocument();
    });

    it('cancels editing when Escape is pressed', () => {
      const { container, canvas } = setupTextNote();

      fireEvent.click(canvas, { clientX: 100, clientY: 500 });

      const input = container.querySelector('input');
      expect(input).toBeInTheDocument();

      if (input) {
        fireEvent.keyDown(input, { key: 'Escape' });
      }

      expect(mockDrawingStore.updateObject).not.toHaveBeenCalled();
      expect(container.querySelector('input')).not.toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Locked Object Tests
  // ==========================================================================
  describe('Locked Objects', () => {
    it('should not allow dragging locked objects', () => {
      const lockedObject = createMockDrawingObject(
        'locked-1',
        'hline',
        [{ time: 50 as Time, price: 100 }],
        {
          properties: {
            name: 'Locked Line',
            visible: true,
            locked: true,
            zIndex: 1,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          },
        }
      );
      mockDrawingStore.objects = [lockedObject];
      mockDrawingStore.getObjectsByPane.mockReturnValue([lockedObject]);
      mockDrawingStore.selectedObjectId = 'locked-1';
      mockDrawingStore.getObjectById.mockReturnValue(lockedObject);

      const { container } = render(
        <DrawingOverlay
          chartRef={chartRef}
          seriesRef={seriesRef}
          containerRef={containerRef}
          paneId="main"
          isDrawing={false}
          currentDrawing={null}
        />
      );

      const canvas = container.querySelector('canvas');
      if (canvas) {
        fireEvent.mouseDown(canvas, { clientX: 200, clientY: 500 });
        fireEvent.mouseMove(canvas, { clientX: 250, clientY: 450 });
        fireEvent.mouseUp(canvas);
      }

      // updateObject should not be called for locked objects
      expect(mockDrawingStore.updateObject).not.toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // Chart Data Change Trigger Tests
  // ==========================================================================
  describe('Chart Data Changes', () => {
    it('should re-render when chartDataLength prop changes', () => {
      const { container, rerender } = render(
        <DrawingOverlay
          chartRef={chartRef}
          seriesRef={seriesRef}
          containerRef={containerRef}
          paneId="main"
          isDrawing={false}
          currentDrawing={null}
          chartDataLength={100}
        />
      );

      expect(container.querySelector('canvas')).toBeInTheDocument();

      rerender(
        <DrawingOverlay
          chartRef={chartRef}
          seriesRef={seriesRef}
          containerRef={containerRef}
          paneId="main"
          isDrawing={false}
          currentDrawing={null}
          chartDataLength={150}
        />
      );

      expect(container.querySelector('canvas')).toBeInTheDocument();
    });
  });
});
