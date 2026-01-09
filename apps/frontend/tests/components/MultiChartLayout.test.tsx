import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MultiChartControls, MultiChartLayout } from '../../components/MultiChartLayout';

// Hoisted mocks
const { mockHook, mockFlags, MockLayoutSelector, MockLinkingControls } = vi.hoisted(() => ({
  mockHook: {
    isMultiChartEnabled: false,
    currentLayout: '1x1' as '1x1' | '1x2' | '2x2',
    charts: [] as Array<{
      id: string;
      symbol: string;
      timeframe: string;
      position: { row: number; col: number };
    }>,
  },
  mockFlags: {
    multiChart: true,
  },
  MockLayoutSelector: vi.fn(() => <div data-testid="layout-selector">Layout Selector</div>),
  MockLinkingControls: vi.fn(() => <div data-testid="linking-controls">Linking Controls</div>),
}));

vi.mock('@/lib/stores/multiChartStore', () => ({
  useMultiChart: () => mockHook,
  LayoutSelector: MockLayoutSelector,
  LinkingControls: MockLinkingControls,
}));

vi.mock('@/lib/utils/featureFlags', () => {
  return {
    FLAGS: {
      get multiChart() {
        return mockFlags.multiChart;
      },
    },
  };
});

describe('MultiChartLayout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHook.isMultiChartEnabled = false;
    mockHook.currentLayout = '1x1';
    mockHook.charts = [];
    mockFlags.multiChart = true;
  });

  describe('Single Chart Mode', () => {
    it('should render children when multi-chart is disabled', () => {
      mockHook.isMultiChartEnabled = false;
      render(
        <MultiChartLayout>
          <div data-testid="child">Child content</div>
        </MultiChartLayout>
      );

      expect(screen.getByTestId('child')).toBeInTheDocument();
      expect(screen.queryByTestId('layout-selector')).not.toBeInTheDocument();
    });

    it('should render children when FLAGS.multiChart is false', () => {
      mockHook.isMultiChartEnabled = true;
      mockFlags.multiChart = false;

      render(
        <MultiChartLayout>
          <div data-testid="child">Child content</div>
        </MultiChartLayout>
      );

      expect(screen.getByTestId('child')).toBeInTheDocument();
      expect(screen.queryByTestId('layout-selector')).not.toBeInTheDocument();
    });
  });

  describe('Multi Chart Mode', () => {
    beforeEach(() => {
      mockHook.isMultiChartEnabled = true;
      mockFlags.multiChart = true;
      mockHook.charts = [
        { id: '1', symbol: 'BTCUSD', timeframe: '1h', position: { row: 0, col: 0 } },
      ];
    });

    it('should render layout selector and linking controls', () => {
      render(
        <MultiChartLayout>
          <div>Chart</div>
        </MultiChartLayout>
      );

      expect(screen.getByTestId('layout-selector')).toBeInTheDocument();
      expect(screen.getByTestId('linking-controls')).toBeInTheDocument();
    });

    it('should render chart grid with charts', () => {
      mockHook.charts = [
        { id: '1', symbol: 'BTCUSD', timeframe: '1h', position: { row: 0, col: 0 } },
        { id: '2', symbol: 'ETHUSD', timeframe: '4h', position: { row: 0, col: 1 } },
      ];

      render(
        <MultiChartLayout>
          <div data-testid="chart-content">Chart</div>
        </MultiChartLayout>
      );

      expect(screen.getByText('BTCUSD • 1h')).toBeInTheDocument();
      expect(screen.getByText('ETHUSD • 4h')).toBeInTheDocument();
    });

    it('should render children for each chart', () => {
      mockHook.charts = [
        { id: '1', symbol: 'BTCUSD', timeframe: '1h', position: { row: 0, col: 0 } },
        { id: '2', symbol: 'ETHUSD', timeframe: '4h', position: { row: 0, col: 1 } },
      ];

      render(
        <MultiChartLayout>
          <div data-testid="chart-content">Chart Content</div>
        </MultiChartLayout>
      );

      // Children should be rendered for each chart
      const chartContents = screen.getAllByTestId('chart-content');
      expect(chartContents).toHaveLength(2);
    });
  });

  describe('Grid Layout Classes', () => {
    beforeEach(() => {
      mockHook.isMultiChartEnabled = true;
      mockFlags.multiChart = true;
      mockHook.charts = [
        { id: '1', symbol: 'BTCUSD', timeframe: '1h', position: { row: 0, col: 0 } },
      ];
    });

    it('should use 1x1 grid layout', () => {
      mockHook.currentLayout = '1x1';
      const { container } = render(
        <MultiChartLayout>
          <div>Chart</div>
        </MultiChartLayout>
      );

      const grid = container.querySelector('.grid-cols-1.grid-rows-1');
      expect(grid).toBeInTheDocument();
    });

    it('should use 1x2 grid layout', () => {
      mockHook.currentLayout = '1x2';
      const { container } = render(
        <MultiChartLayout>
          <div>Chart</div>
        </MultiChartLayout>
      );

      const grid = container.querySelector('.grid-cols-1.grid-rows-2');
      expect(grid).toBeInTheDocument();
    });

    it('should use 2x2 grid layout', () => {
      mockHook.currentLayout = '2x2';
      const { container } = render(
        <MultiChartLayout>
          <div>Chart</div>
        </MultiChartLayout>
      );

      const grid = container.querySelector('.grid-cols-2.grid-rows-2');
      expect(grid).toBeInTheDocument();
    });

    it('should default to 1x1 for unknown layouts', () => {
      // @ts-expect-error - Testing unknown layout
      mockHook.currentLayout = 'unknown';
      const { container } = render(
        <MultiChartLayout>
          <div>Chart</div>
        </MultiChartLayout>
      );

      const grid = container.querySelector('.grid-cols-1.grid-rows-1');
      expect(grid).toBeInTheDocument();
    });
  });

  describe('Chart Positioning', () => {
    beforeEach(() => {
      mockHook.isMultiChartEnabled = true;
      mockFlags.multiChart = true;
    });

    it('should position charts based on row and column', () => {
      mockHook.charts = [
        { id: '1', symbol: 'BTCUSD', timeframe: '1h', position: { row: 0, col: 0 } },
        { id: '2', symbol: 'ETHUSD', timeframe: '4h', position: { row: 1, col: 1 } },
      ];

      const { container } = render(
        <MultiChartLayout>
          <div>Chart</div>
        </MultiChartLayout>
      );

      const chartCells = container.querySelectorAll('.bg-surface-0.border');
      expect(chartCells[0]).toHaveStyle({ gridRow: '1', gridColumn: '1' });
      expect(chartCells[1]).toHaveStyle({ gridRow: '2', gridColumn: '2' });
    });
  });
});

describe('MultiChartControls', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFlags.multiChart = true;
  });

  it('should render layout selector and linking controls when flag is enabled', () => {
    mockFlags.multiChart = true;
    render(<MultiChartControls />);

    expect(screen.getByTestId('layout-selector')).toBeInTheDocument();
    expect(screen.getByTestId('linking-controls')).toBeInTheDocument();
  });

  it('should render nothing when flag is disabled', () => {
    mockFlags.multiChart = false;
    const { container } = render(<MultiChartControls />);

    expect(container.innerHTML).toBe('');
  });
});
