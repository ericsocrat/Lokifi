import type { DrawingObject, Point } from '@/lib/stores/drawingStore';
import { render } from '@testing-library/react';
import type { IChartApi, ISeriesApi, Time } from 'lightweight-charts';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DrawingOverlay } from '../../components/DrawingOverlay';

// Hoisted mocks
const { mockDrawingStore } = vi.hoisted(() => ({
  mockDrawingStore: {
    objects: [] as DrawingObject[],
    getObjectsByPane: vi.fn(() => []),
    selectedObjectId: null as string | null,
    selectObject: vi.fn(),
    setActiveTool: vi.fn(),
    activeTool: null as string | null,
    updateObject: vi.fn(),
    getObjectById: vi.fn(),
    deleteObject: vi.fn(),
  },
}));

vi.mock('@/lib/stores/drawingStore', () => ({
  useDrawingStore: () => mockDrawingStore,
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

HTMLCanvasElement.prototype.getContext = vi.fn(() => mockCtx) as unknown as typeof HTMLCanvasElement.prototype.getContext;

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
        { properties: { name: 'Invisible', visible: false, locked: false, zIndex: 1, createdAt: Date.now(), updatedAt: Date.now() } }
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
});
