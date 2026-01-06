import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import PluginSideToolbar from '../../components/PluginSideToolbar';

// Hoisted mocks
const { mockFlags, mockPluginManager } = vi.hoisted(() => ({
  mockFlags: {
    EXPERIMENTAL_PLUGINS: true,
  },
  mockPluginManager: {
    activeToolId: null as string | null,
    setActiveTool: vi.fn(),
  },
}));

vi.mock('@/constants/flags', () => ({
  get EXPERIMENTAL_PLUGINS() {
    return mockFlags.EXPERIMENTAL_PLUGINS;
  },
}));

vi.mock('plugins/registry', () => ({
  pluginManager: {
    get activeToolId() {
      return mockPluginManager.activeToolId;
    },
    setActiveTool: mockPluginManager.setActiveTool,
  },
}));

vi.mock('@/components/PluginSettingsDrawer', () => ({
  default: ({ open, onClose }: { open: boolean; onClose: () => void }) => (
    <div data-testid="plugin-settings-drawer" data-open={open}>
      <button onClick={onClose} data-testid="close-drawer">
        Close
      </button>
    </div>
  ),
}));

describe('PluginSideToolbar', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    mockFlags.EXPERIMENTAL_PLUGINS = true;
    mockPluginManager.activeToolId = null;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Feature Flag', () => {
    it('should render nothing when EXPERIMENTAL_PLUGINS is false', () => {
      mockFlags.EXPERIMENTAL_PLUGINS = false;
      const { container } = render(<PluginSideToolbar />);
      expect(container.innerHTML).toBe('');
    });

    it('should render toolbar when EXPERIMENTAL_PLUGINS is true', () => {
      mockFlags.EXPERIMENTAL_PLUGINS = true;
      render(<PluginSideToolbar />);
      expect(screen.getByText('Plugins')).toBeInTheDocument();
    });
  });

  describe('Rendering', () => {
    it('should render the plugins header', () => {
      render(<PluginSideToolbar />);
      expect(screen.getByText('Plugins')).toBeInTheDocument();
    });

    it('should render the settings button', () => {
      render(<PluginSideToolbar />);
      expect(screen.getByText('Settings')).toBeInTheDocument();
    });

    it('should render the description text', () => {
      render(<PluginSideToolbar />);
      expect(screen.getByText('Ghost previews while placing points')).toBeInTheDocument();
    });

    it('should render all 4 plugin buttons', () => {
      render(<PluginSideToolbar />);
      expect(screen.getByText('Trend+')).toBeInTheDocument();
      expect(screen.getByText('Ruler')).toBeInTheDocument();
      expect(screen.getByText('Channel')).toBeInTheDocument();
      expect(screen.getByText('Fib+')).toBeInTheDocument();
    });
  });

  describe('Tool Selection', () => {
    it('should activate tool when clicked', () => {
      render(<PluginSideToolbar />);
      fireEvent.click(screen.getByText('Trend+'));
      expect(mockPluginManager.setActiveTool).toHaveBeenCalledWith('trendline-plus');
    });

    it('should deactivate tool when clicking active tool', () => {
      mockPluginManager.activeToolId = 'trendline-plus';
      render(<PluginSideToolbar />);
      fireEvent.click(screen.getByText('Trend+'));
      expect(mockPluginManager.setActiveTool).toHaveBeenCalledWith(null);
    });

    it('should highlight active tool', () => {
      mockPluginManager.activeToolId = 'ruler-measure';
      render(<PluginSideToolbar />);
      const rulerButton = screen.getByText('Ruler');
      expect(rulerButton).toHaveClass('bg-emerald-600/30');
    });

    it('should not highlight inactive tools', () => {
      mockPluginManager.activeToolId = 'ruler-measure';
      render(<PluginSideToolbar />);
      const trendButton = screen.getByText('Trend+');
      expect(trendButton).not.toHaveClass('bg-emerald-600/30');
    });

    it('should allow selecting different tools', () => {
      render(<PluginSideToolbar />);

      fireEvent.click(screen.getByText('Ruler'));
      expect(mockPluginManager.setActiveTool).toHaveBeenCalledWith('ruler-measure');

      fireEvent.click(screen.getByText('Channel'));
      expect(mockPluginManager.setActiveTool).toHaveBeenCalledWith('parallel-channel');

      fireEvent.click(screen.getByText('Fib+'));
      expect(mockPluginManager.setActiveTool).toHaveBeenCalledWith('fib-extended');
    });
  });

  describe('Settings Drawer', () => {
    it('should render the settings drawer component', () => {
      render(<PluginSideToolbar />);
      expect(screen.getByTestId('plugin-settings-drawer')).toBeInTheDocument();
    });

    it('should open drawer when settings button is clicked', () => {
      render(<PluginSideToolbar />);
      const drawer = screen.getByTestId('plugin-settings-drawer');
      expect(drawer).toHaveAttribute('data-open', 'false');

      fireEvent.click(screen.getByText('Settings'));
      expect(drawer).toHaveAttribute('data-open', 'true');
    });

    it('should close drawer when onClose is called', () => {
      render(<PluginSideToolbar />);

      // Open the drawer
      fireEvent.click(screen.getByText('Settings'));
      const drawer = screen.getByTestId('plugin-settings-drawer');
      expect(drawer).toHaveAttribute('data-open', 'true');

      // Close via onClose callback
      fireEvent.click(screen.getByTestId('close-drawer'));
      expect(drawer).toHaveAttribute('data-open', 'false');
    });

    it('should toggle drawer on repeated settings clicks', () => {
      render(<PluginSideToolbar />);
      const settingsBtn = screen.getByText('Settings');
      const drawer = screen.getByTestId('plugin-settings-drawer');

      // Initially closed
      expect(drawer).toHaveAttribute('data-open', 'false');

      // Click to open
      fireEvent.click(settingsBtn);
      expect(drawer).toHaveAttribute('data-open', 'true');

      // Click to close
      fireEvent.click(settingsBtn);
      expect(drawer).toHaveAttribute('data-open', 'false');
    });
  });

  describe('Refresh Interval', () => {
    it('should set up interval on mount', () => {
      render(<PluginSideToolbar />);

      // The component uses setInterval for re-rendering
      act(() => {
        vi.advanceTimersByTime(300);
      });

      // Component should still be rendered after timer tick
      expect(screen.getByText('Plugins')).toBeInTheDocument();
    });

    it('should clear interval on unmount', () => {
      const { unmount } = render(<PluginSideToolbar />);
      const clearIntervalSpy = vi.spyOn(globalThis, 'clearInterval');

      unmount();

      expect(clearIntervalSpy).toHaveBeenCalled();
      clearIntervalSpy.mockRestore();
    });
  });

  describe('Styling', () => {
    it('should have proper container styling', () => {
      const { container } = render(<PluginSideToolbar />);
      const toolbar = container.querySelector('.absolute.left-2.top-16');
      expect(toolbar).toBeInTheDocument();
    });

    it('should have active button styling with emerald border', () => {
      mockPluginManager.activeToolId = 'fib-extended';
      render(<PluginSideToolbar />);
      const fibButton = screen.getByText('Fib+');
      expect(fibButton).toHaveClass('border-emerald-500');
    });
  });
});
