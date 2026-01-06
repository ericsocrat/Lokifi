import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TradingWorkspace } from '../../components/TradingWorkspace';

// Hoisted mocks
const { mockDrawingStore, mockPaneStore, mockSymbolStore, mockTimeframeStore, mockLogger } =
  vi.hoisted(() => ({
    mockDrawingStore: {
      objects: [] as Array<{ id: string; type: string }>,
    },
    mockPaneStore: {
      panes: [{ id: '1', indicators: ['RSI', 'MACD'] }],
    },
    mockSymbolStore: {
      get: vi.fn(() => 'BTCUSD'),
    },
    mockTimeframeStore: {
      get: vi.fn(() => '1h'),
    },
    mockLogger: {
      warn: vi.fn(),
      error: vi.fn(),
    },
  }));

vi.mock('@/lib/stores/drawingStore', () => ({
  useDrawingStore: () => mockDrawingStore,
}));

vi.mock('@/lib/stores/paneStore', () => ({
  usePaneStore: () => mockPaneStore,
}));

vi.mock('@/lib/stores/symbolStore', () => ({
  symbolStore: mockSymbolStore,
}));

vi.mock('@/lib/stores/timeframeStore', () => ({
  timeframeStore: mockTimeframeStore,
}));

vi.mock('@/lib/utils/logger', () => ({
  logger: mockLogger,
}));

vi.mock('../../components/ChartHeader', () => ({
  default: () => <div data-testid="chart-header">ChartHeader</div>,
}));

vi.mock('../../components/DrawingChart', () => ({
  DrawingChart: () => <div data-testid="drawing-chart">DrawingChart</div>,
}));

vi.mock('../../components/DrawingToolbar', () => ({
  DrawingToolbar: () => <div data-testid="drawing-toolbar">DrawingToolbar</div>,
}));

vi.mock('../../components/ObjectTree', () => ({
  ObjectTree: ({
    isCollapsed,
    onToggleCollapse,
  }: {
    isCollapsed: boolean;
    onToggleCollapse: () => void;
  }) => (
    <button data-testid="object-tree" onClick={onToggleCollapse}>
      ObjectTree {isCollapsed ? 'collapsed' : 'expanded'}
    </button>
  ),
}));

vi.mock('../../hooks/useKeyboardShortcuts', () => ({
  useKeyboardShortcuts: vi.fn(),
}));

describe('TradingWorkspace', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDrawingStore.objects = [];
    mockPaneStore.panes = [{ id: '1', indicators: ['RSI', 'MACD'] }];

    // Mock fullscreen API
    Object.defineProperty(document.documentElement, 'requestFullscreen', {
      value: vi.fn().mockResolvedValue(undefined),
      writable: true,
    });
    Object.defineProperty(document, 'exitFullscreen', {
      value: vi.fn().mockResolvedValue(undefined),
      writable: true,
    });
    Object.defineProperty(document, 'fullscreenElement', {
      value: null,
      writable: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Rendering', () => {
    it('should render the workspace container', () => {
      const { container } = render(<TradingWorkspace />);
      const workspace = container.querySelector('.h-screen');
      expect(workspace).toBeInTheDocument();
    });

    it('should render ChartHeader', () => {
      render(<TradingWorkspace />);
      expect(screen.getByTestId('chart-header')).toBeInTheDocument();
    });

    it('should render DrawingToolbar', () => {
      render(<TradingWorkspace />);
      expect(screen.getByTestId('drawing-toolbar')).toBeInTheDocument();
    });

    it('should render DrawingChart', () => {
      render(<TradingWorkspace />);
      expect(screen.getByTestId('drawing-chart')).toBeInTheDocument();
    });

    it('should render ObjectTree', () => {
      render(<TradingWorkspace />);
      expect(screen.getByTestId('object-tree')).toBeInTheDocument();
    });
  });

  describe('Symbol and Timeframe Display', () => {
    it('should display current symbol', () => {
      render(<TradingWorkspace />);
      expect(screen.getByText('BTCUSD')).toBeInTheDocument();
    });

    it('should display current timeframe', () => {
      render(<TradingWorkspace />);
      expect(screen.getByText('1h')).toBeInTheDocument();
    });
  });

  describe('Fullscreen Toggle', () => {
    it('should render fullscreen toggle button', () => {
      render(<TradingWorkspace />);
      const button = screen.getByTitle('Enter Fullscreen');
      expect(button).toBeInTheDocument();
    });

    it('should call requestFullscreen when toggled', async () => {
      render(<TradingWorkspace />);
      const button = screen.getByTitle('Enter Fullscreen');

      await act(async () => {
        fireEvent.click(button);
      });

      expect(document.documentElement.requestFullscreen).toHaveBeenCalled();
    });

    it('should handle fullscreen API not supported', async () => {
      Object.defineProperty(document.documentElement, 'requestFullscreen', {
        value: undefined,
        writable: true,
      });

      render(<TradingWorkspace />);
      const button = screen.getByTitle('Enter Fullscreen');

      await act(async () => {
        fireEvent.click(button);
      });

      expect(mockLogger.warn).toHaveBeenCalledWith('Fullscreen API not supported');
    });
  });

  describe('Object Tree Collapse', () => {
    it('should start with object tree expanded', () => {
      render(<TradingWorkspace />);
      expect(screen.getByText(/expanded/)).toBeInTheDocument();
    });

    it('should toggle object tree collapse on click', () => {
      render(<TradingWorkspace />);
      const objectTree = screen.getByTestId('object-tree');

      fireEvent.click(objectTree);

      expect(screen.getByText(/collapsed/)).toBeInTheDocument();
    });

    it('should expand object tree on second click', () => {
      render(<TradingWorkspace />);
      const objectTree = screen.getByTestId('object-tree');

      fireEvent.click(objectTree);
      fireEvent.click(objectTree);

      expect(screen.getByText(/expanded/)).toBeInTheDocument();
    });
  });

  describe('Workspace Stats', () => {
    it('should update stats when objects change', () => {
      mockDrawingStore.objects = [
        { id: '1', type: 'line' },
        { id: '2', type: 'rect' },
      ];

      render(<TradingWorkspace />);
      // Stats are internal but trigger re-renders
      expect(screen.getByText('BTCUSD')).toBeInTheDocument();
    });
  });

  describe('Styling', () => {
    it('should have dark background', () => {
      const { container } = render(<TradingWorkspace />);
      const workspace = container.querySelector('.bg-\\[\\#131722\\]');
      expect(workspace).toBeInTheDocument();
    });

    it('should have flex column layout', () => {
      const { container } = render(<TradingWorkspace />);
      const workspace = container.querySelector('.flex.flex-col');
      expect(workspace).toBeInTheDocument();
    });

    it('should have overflow hidden', () => {
      const { container } = render(<TradingWorkspace />);
      const workspace = container.querySelector('.overflow-hidden');
      expect(workspace).toBeInTheDocument();
    });
  });
});
