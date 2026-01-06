import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import LeftDock from '../../components/LeftDock';

// Hoisted mocks
const { mockDrawStore, mockPluginManager, mockFlags } = vi.hoisted(() => ({
  mockDrawStore: {
    get: vi.fn(() => ({ tool: 'cursor' })),
    subscribe: vi.fn((callback) => {
      // Store callback for testing
      (mockDrawStore as { _callback?: (state: { tool: string }) => void })._callback = callback;
      return vi.fn();
    }),
    setTool: vi.fn(),
  },
  mockPluginManager: {
    activeToolId: null as string | null,
    setActiveTool: vi.fn(),
  },
  mockFlags: {
    EXPERIMENTAL_PLUGINS: true,
  },
}));

vi.mock('@/stores/drawStore', () => ({
  drawStore: mockDrawStore,
}));

vi.mock('plugins/registry', () => ({
  pluginManager: mockPluginManager,
}));

vi.mock('@/constants/flags', () => mockFlags);

vi.mock('@/components/PluginSettingsDrawer', () => ({
  default: ({ open, onClose }: { open: boolean; onClose: () => void }) =>
    open ? (
      <div data-testid="settings-drawer" onClick={onClose}>
        Settings Drawer
      </div>
    ) : null,
}));

describe('LeftDock', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDrawStore.get.mockReturnValue({ tool: 'cursor' });
    mockPluginManager.activeToolId = null;
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Rendering', () => {
    it('should render the dock container', () => {
      render(<LeftDock />);
      expect(screen.getByText('Tools')).toBeInTheDocument();
    });

    it('should render keyboard shortcut hints', () => {
      render(<LeftDock />);
      expect(screen.getByText(/Keys: V T H M/)).toBeInTheDocument();
    });
  });

  describe('Tool Buttons', () => {
    it('should render Cursor button', () => {
      render(<LeftDock />);
      expect(screen.getByTitle('Cursor (V)')).toBeInTheDocument();
    });

    it('should render Trendline button', () => {
      render(<LeftDock />);
      expect(screen.getByTitle('Trendline (T)')).toBeInTheDocument();
    });

    it('should render HLine button', () => {
      render(<LeftDock />);
      expect(screen.getByTitle('HLine (H)')).toBeInTheDocument();
    });

    it('should render Rectangle button', () => {
      render(<LeftDock />);
      expect(screen.getByTitle('Rectangle (M)')).toBeInTheDocument();
    });

    it('should render Settings button', () => {
      render(<LeftDock />);
      expect(screen.getByTitle('Settings (Gear)')).toBeInTheDocument();
    });
  });

  describe('Tool Selection', () => {
    it('should highlight active tool', () => {
      render(<LeftDock />);
      const cursorButton = screen.getByTitle('Cursor (V)');
      expect(cursorButton).toHaveClass('bg-electric/30');
    });

    it('should call setTool when Cursor is clicked', () => {
      render(<LeftDock />);
      fireEvent.click(screen.getByTitle('Cursor (V)'));

      expect(mockPluginManager.setActiveTool).toHaveBeenCalledWith(null);
      expect(mockDrawStore.setTool).toHaveBeenCalledWith('cursor');
    });

    it('should call setTool when Trendline is clicked', () => {
      render(<LeftDock />);
      fireEvent.click(screen.getByTitle('Trendline (T)'));

      expect(mockPluginManager.setActiveTool).toHaveBeenCalledWith(null);
      expect(mockDrawStore.setTool).toHaveBeenCalledWith('trendline');
    });

    it('should call setTool when HLine is clicked', () => {
      render(<LeftDock />);
      fireEvent.click(screen.getByTitle('HLine (H)'));

      expect(mockPluginManager.setActiveTool).toHaveBeenCalledWith(null);
      expect(mockDrawStore.setTool).toHaveBeenCalledWith('hline');
    });

    it('should call setTool when Rectangle is clicked', () => {
      render(<LeftDock />);
      fireEvent.click(screen.getByTitle('Rectangle (M)'));

      expect(mockPluginManager.setActiveTool).toHaveBeenCalledWith(null);
      expect(mockDrawStore.setTool).toHaveBeenCalledWith('rect');
    });
  });

  describe('Plugin Buttons (when EXPERIMENTAL_PLUGINS is true)', () => {
    it('should render Plugins section header', () => {
      render(<LeftDock />);
      expect(screen.getByText('Plugins')).toBeInTheDocument();
    });

    it('should render Ruler button', () => {
      render(<LeftDock />);
      expect(screen.getByTitle('Ruler (R)')).toBeInTheDocument();
    });

    it('should render Channel button', () => {
      render(<LeftDock />);
      expect(screen.getByTitle('Channel (C)')).toBeInTheDocument();
    });

    it('should render Channel 3pt button', () => {
      render(<LeftDock />);
      expect(screen.getByTitle('Channel 3pt (Shift+C)')).toBeInTheDocument();
    });

    it('should render Fib+ button', () => {
      render(<LeftDock />);
      expect(screen.getByTitle('Fib+ (F)')).toBeInTheDocument();
    });

    it('should toggle ruler-measure plugin on click', () => {
      render(<LeftDock />);
      fireEvent.click(screen.getByTitle('Ruler (R)'));

      expect(mockPluginManager.setActiveTool).toHaveBeenCalledWith('ruler-measure');
    });

    it('should deactivate ruler-measure when already active', () => {
      mockPluginManager.activeToolId = 'ruler-measure';
      render(<LeftDock />);

      act(() => {
        vi.advanceTimersByTime(300);
      });

      fireEvent.click(screen.getByTitle('Ruler (R)'));
      expect(mockPluginManager.setActiveTool).toHaveBeenCalledWith(null);
    });
  });

  describe('Settings Drawer', () => {
    it('should not show settings drawer by default', () => {
      render(<LeftDock />);
      expect(screen.queryByTestId('settings-drawer')).not.toBeInTheDocument();
    });

    it('should open settings drawer when settings button is clicked', () => {
      render(<LeftDock />);
      fireEvent.click(screen.getByTitle('Settings (Gear)'));

      expect(screen.getByTestId('settings-drawer')).toBeInTheDocument();
    });

    it('should close settings drawer when close is triggered', () => {
      render(<LeftDock />);
      fireEvent.click(screen.getByTitle('Settings (Gear)'));
      expect(screen.getByTestId('settings-drawer')).toBeInTheDocument();

      fireEvent.click(screen.getByTestId('settings-drawer'));
      expect(screen.queryByTestId('settings-drawer')).not.toBeInTheDocument();
    });
  });

  describe('Store Subscription', () => {
    it('should subscribe to drawStore on mount', () => {
      render(<LeftDock />);
      expect(mockDrawStore.subscribe).toHaveBeenCalled();
    });

    it('should update active tool when store changes', () => {
      mockDrawStore.get.mockReturnValue({ tool: 'cursor' });
      render(<LeftDock />);

      // Simulate store update
      act(() => {
        const callback = (mockDrawStore as { _callback?: (state: { tool: string }) => void })
          ._callback;
        callback?.({ tool: 'trendline' });
      });

      // The trendline button should now be active
      const trendlineButton = screen.getByTitle('Trendline (T)');
      expect(trendlineButton).toHaveClass('bg-electric/30');
    });
  });

  describe('Styling', () => {
    it('should have absolute positioning', () => {
      const { container } = render(<LeftDock />);
      const dock = container.querySelector('.absolute.left-2.top-16');
      expect(dock).toBeInTheDocument();
    });

    it('should have proper z-index', () => {
      const { container } = render(<LeftDock />);
      const dock = container.querySelector('.z-20');
      expect(dock).toBeInTheDocument();
    });

    it('should have rounded corners', () => {
      const { container } = render(<LeftDock />);
      const dock = container.querySelector('.rounded-2xl');
      expect(dock).toBeInTheDocument();
    });
  });
});
