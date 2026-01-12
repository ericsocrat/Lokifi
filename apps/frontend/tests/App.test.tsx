import App from '@/App';
import { useGlobalHotkeys } from '@/lib/utils/globalHotkeys';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock the hotkeys hook
vi.mock('@/lib/utils/globalHotkeys', () => ({
  useGlobalHotkeys: vi.fn(),
}));

// Mock the store - provide a proper implementation
vi.mock('@/state/store', () => ({
  useChartStore: vi.fn((selector) => {
    const mockState = {
      indicatorControlsPanelVisible: false,
      toggleIndicatorControlsPanel: vi.fn(),
    };
    return selector(mockState);
  }),
}));

// Mock child components to isolate App.tsx logic
vi.mock('@/components/AlertPortal', () => ({
  default: () => <div data-testid="alert-portal">Alert Portal</div>,
}));

vi.mock('@/components/dashboard/IndicatorControlsPanel', () => ({
  default: () => <div data-testid="indicator-controls">Indicator Controls</div>,
}));

vi.mock('@/components/DrawingLayer', () => ({
  default: () => <div data-testid="drawing-layer">Drawing Layer</div>,
}));

vi.mock('@/components/DrawingSettingsPanel', () => ({
  default: () => <div data-testid="drawing-settings">Drawing Settings</div>,
}));

vi.mock('@/components/DrawingSidePanel', () => ({
  default: () => <div data-testid="drawing-side-panel">Drawing Side Panel</div>,
}));

vi.mock('@/components/IndicatorSettingsDrawer', () => ({
  default: () => <div data-testid="indicator-settings-drawer">Indicator Settings</div>,
}));

vi.mock('@/components/LayersPanel', () => ({
  default: () => <div data-testid="layers-panel">Layers Panel</div>,
}));

vi.mock('@/components/PluginDrawer', () => ({
  default: () => <div data-testid="plugin-drawer">Plugin Drawer</div>,
}));

vi.mock('@/components/PriceChart', () => ({
  default: () => <div data-testid="price-chart">Price Chart</div>,
}));

vi.mock('@/components/SnapshotsPanel', () => ({
  default: () => <div data-testid="snapshots-panel">Snapshots Panel</div>,
}));

describe('App', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Layout Structure', () => {
    it('should render main grid layout with three columns', () => {
      render(<App />);
      const mainContainer = screen.getByRole('main');
      expect(mainContainer).toBeInTheDocument();

      // Check for both aside sections
      const asides = screen.getAllByRole('complementary');
      expect(asides.length).toBeGreaterThanOrEqual(2);
    });

    it('should render left sidebar with DrawingSidePanel, LayersPanel, and SnapshotsPanel', () => {
      render(<App />);
      expect(screen.getByTestId('drawing-side-panel')).toBeInTheDocument();
      expect(screen.getByTestId('layers-panel')).toBeInTheDocument();
      expect(screen.getByTestId('snapshots-panel')).toBeInTheDocument();
    });

    it('should render main content area with PriceChart, DrawingLayer, and AlertPortal', () => {
      render(<App />);
      expect(screen.getByTestId('price-chart')).toBeInTheDocument();
      expect(screen.getByTestId('drawing-layer')).toBeInTheDocument();
      expect(screen.getByTestId('alert-portal')).toBeInTheDocument();
    });

    it('should render right sidebar with IndicatorSettingsDrawer, PluginDrawer, and DrawingSettingsPanel', () => {
      render(<App />);
      expect(screen.getByTestId('indicator-settings-drawer')).toBeInTheDocument();
      expect(screen.getByTestId('plugin-drawer')).toBeInTheDocument();
      expect(screen.getByTestId('drawing-settings')).toBeInTheDocument();
    });
  });

  describe('Hotkeys Integration', () => {
    it('should call useGlobalHotkeys on mount', () => {
      render(<App />);
      expect(useGlobalHotkeys).toHaveBeenCalled();
    });
  });

  describe('Indicator Controls Toggle Button', () => {
    it('should render toggle button with proper styling', () => {
      render(<App />);
      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
      expect(button).toHaveClass('absolute', 'top-4', 'right-4');
    });

    it('should have proper title attribute for accessibility', () => {
      render(<App />);
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('title');
      expect(button.getAttribute('title')).toContain('Indicator Controls');
    });

    it('should have z-index of 20', () => {
      render(<App />);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('z-20');
    });
  });

  describe('CSS Classes', () => {
    it('should apply correct grid layout classes', () => {
      render(<App />);
      const main = screen.getByRole('main');
      const container = main.parentElement;
      expect(container).toHaveClass('grid', 'gap-4', 'p-4');
    });

    it('should apply correct styling to main content area', () => {
      render(<App />);
      const main = screen.getByRole('main');
      expect(main).toHaveClass('relative', 'border', 'rounded-2xl');
    });

    it('should have responsive border styling', () => {
      render(<App />);
      const main = screen.getByRole('main');
      expect(main).toHaveClass('border-neutral-700');
    });
  });

  describe('Component Rendering', () => {
    it('should render without crashing', () => {
      expect(() => {
        render(<App />);
      }).not.toThrow();
    });

    it('should render all critical child components', () => {
      render(<App />);

      const criticalComponents = [
        'price-chart',
        'drawing-layer',
        'alert-portal',
        'drawing-side-panel',
        'layers-panel',
        'snapshots-panel',
      ];

      criticalComponents.forEach((componentId) => {
        expect(screen.getByTestId(componentId)).toBeInTheDocument();
      });
    });
  });
});
