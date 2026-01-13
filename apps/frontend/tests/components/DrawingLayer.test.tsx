import { fireEvent, render, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Stub ContextMenu to a simple element for visibility checks
vi.mock('@/components/ContextMenu', () => ({
  default: ({ x, y, onClose }: { x: number; y: number; onClose: () => void }) => (
    <div data-testid="ctx-menu" data-x={x} data-y={y} onClick={onClose}>
      ctx
    </div>
  ),
}));

// Lightweight chart snapping/magnet mocks
vi.mock('@/lib/charts/chartMap', () => ({
  magnetYToOHLC: (y: number) => y,
  snapPxToGrid: (p: { x: number; y: number }, _step: number, _enabled: boolean) => p,
  snapYToPriceLevels: (y: number) => y,
  yToPrice: (y: number) => y,
}));

// Canvas helpers mocked as no-ops
vi.mock('@/lib/drawing/canvasHelpers', () => ({
  clearCanvas: () => {},
  drawLine: () => {},
  drawArrowHead: () => {},
  drawLineHandles: () => {},
  drawLineLabel: () => {},
  drawRay: () => {},
  drawHorizontalLine: () => {},
  drawHandle: () => {},
  drawVerticalLine: () => {},
  drawRect: () => {},
  drawRectHandles: () => {},
  drawEllipse: () => {},
  drawFibonacci: () => {},
  drawParallelChannel: () => {},
  drawPitchfork: () => {},
  drawText: () => {},
  extendRay: (a: { x: number; y: number }, b: { x: number; y: number }) => ({ start: a, end: b }),
}));

// Control drawing create/update paths for stable interactions
vi.mock('@/lib/utils/drawings', () => ({
  createDrawing: (kind: string, p: { x: number; y: number }) => ({
    id: 'new-1',
    kind: kind === 'line' ? 'trendline' : kind,
    points: [p, p],
    style: {},
  }),
  updateDrawingGeometry: (dr: any, p: { x: number; y: number }) => ({
    ...dr,
    points: [dr.points[0], p],
  }),
}));

// Minimal mock for the chart store used by DrawingLayer
const makeStore = () => {
  const store: any = {
    drawings: [] as Array<any>,
    selection: new Set<string>(),
    activeTool: 'select',
    activeLayerId: 'layer-1',
    layers: [{ id: 'layer-1', visible: true, locked: false, opacity: 1 }],
    drawingSettings: {
      lineCap: 'round',
      arrowHead: 'simple',
      arrowHeadSize: 8,
      showHandles: true,
      showLineLabels: false,
      fibDefaultLevels: [0, 0.382, 0.5, 0.618, 1],
      snapStep: 10,
      snapEnabled: false,
      snapPriceLevels: false,
      snapToOHLC: false,
      magnetTolerancePx: 4,
      perToolSnap: {},
    },
    clearSelection: vi.fn(() => {
      store.selection.clear();
    }),
    toggleSelect: vi.fn((id: string, reset: boolean) => {
      if (reset) store.selection.clear();
      store.selection.add(id);
    }),
    addDrawing: vi.fn((d: any) => {
      store.drawings.push(d);
    }),
    updateDrawing: vi.fn((id: string, updater: (d: any) => any) => {
      const idx = store.drawings.findIndex((x: any) => x.id === id);
      if (idx >= 0) store.drawings[idx] = updater(store.drawings[idx]);
    }),
    setSelection: vi.fn((set: Set<string>) => {
      store.selection = set;
    }),
  };
  return store;
};

let storeRef: any;

vi.mock('@/state/store', () => {
  const useChartStore: any = Object.assign(() => storeRef, {
    subscribe: (_listener: (state: any) => void) => {
      // No-op subscription for tests; return unsubscribe
      return () => {};
    },
  });
  return { useChartStore };
});

// Component under test
import DrawingLayer from '@/components/DrawingLayer';

describe('DrawingLayer interactions', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    storeRef = makeStore();
    // Ensure canvas/container have layout
    vi.spyOn(Element.prototype as any, 'getBoundingClientRect').mockReturnValue({
      width: 800,
      height: 600,
      left: 0,
      top: 0,
      right: 800,
      bottom: 600,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    });
  });

  it('select tool: starts marquee and clears selection when no hit', async () => {
    storeRef.activeTool = 'select';
    storeRef.drawings = [];

    const { container } = render(<DrawingLayer useOffscreen={false} />);
    const canvas = container.querySelector('canvas')!;

    fireEvent.mouseDown(canvas, { clientX: 50, clientY: 50, button: 0 });
    fireEvent.mouseMove(canvas, { clientX: 80, clientY: 80 });
    fireEvent.mouseUp(canvas, { clientX: 80, clientY: 80, button: 0 });

    expect(storeRef.clearSelection).toHaveBeenCalledTimes(1);
    expect(storeRef.setSelection).toHaveBeenCalledTimes(1);
    const arg = storeRef.setSelection.mock.calls[0][0] as Set<string>;
    expect(arg.size).toBe(0);
  });

  it('select tool: toggles selection on hit and drags to update', async () => {
    storeRef.activeTool = 'select';
    storeRef.drawings = [
      {
        id: 'd1',
        kind: 'hline',
        points: [{ x: 0, y: 50 }],
        style: {},
      },
    ];

    const { container } = render(<DrawingLayer useOffscreen={false} />);
    const canvas = container.querySelector('canvas')!;

    // Click near the line to hit-test within threshold
    fireEvent.mouseDown(canvas, { clientX: 50, clientY: 50, button: 0 });
    await waitFor(() => {
      expect(storeRef.toggleSelect).toHaveBeenCalledWith('d1', expect.any(Boolean));
    });
    fireEvent.mouseMove(canvas, { clientX: 80, clientY: 50 });
    expect(storeRef.updateDrawing).toHaveBeenCalled();
    const [idArg] = storeRef.updateDrawing.mock.calls[0];
    expect(idArg).toBe('d1');
    fireEvent.mouseUp(canvas, { clientX: 80, clientY: 50, button: 0 });
  });

  it('non-select tool: creates a drawing and allows dragging updates', async () => {
    storeRef.activeTool = 'rect';

    const { container } = render(<DrawingLayer useOffscreen={false} />);
    const canvas = container.querySelector('canvas')!;

    fireEvent.mouseDown(canvas, { clientX: 20, clientY: 20, button: 0 });
    expect(storeRef.addDrawing).toHaveBeenCalledTimes(1);
    fireEvent.mouseMove(canvas, { clientX: 120, clientY: 120 });
    expect(storeRef.updateDrawing).toHaveBeenCalled();
    const [idArg] = storeRef.updateDrawing.mock.calls[0];
    expect(idArg).toBe('new-1');
    fireEvent.mouseUp(canvas, { clientX: 120, clientY: 120, button: 0 });
  });

  it('context menu: opens on right-click', async () => {
    const { container, getByTestId } = render(<DrawingLayer useOffscreen={false} />);
    const canvas = container.querySelector('canvas')!;

    fireEvent.contextMenu(canvas, { clientX: 10, clientY: 10 });

    expect(getByTestId('ctx-menu')).toBeTruthy();
  });

  it('cursor: shows pointer over selectable drawing with select tool', async () => {
    storeRef.activeTool = 'select';
    storeRef.drawings = [
      {
        id: 'd2',
        kind: 'hline',
        points: [{ x: 0, y: 200 }],
        style: {},
      },
    ];

    const { container } = render(<DrawingLayer useOffscreen={false} />);
    const canvas = container.querySelector('canvas')!;

    fireEvent.mouseMove(canvas, { clientX: 220, clientY: 200 });
    // hoverId should be set internally; style cursor switches to pointer
    await waitFor(() => {
      expect(canvas.style.cursor).toBe('pointer');
    });
  });
});
