import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import PluginSettingsDrawer from '../../components/PluginSettingsDrawer';

// Hoisted mocks
const { mockPluginSettingsStore, mockFlags } = vi.hoisted(() => ({
  mockPluginSettingsStore: {
    get: vi.fn(() => ({
      channelWidthMode: 'percent' as 'percent' | 'pixels',
      channelDefaultWidthPct: 2.0,
      fibPreset: 'Classic' as 'Classic' | 'Extended' | 'Aggressive' | 'Custom',
      fibCustomLevels: [0, 0.382, 0.5, 0.618, 1],
    })),
    set: vi.fn(),
    reset: vi.fn(),
    subscribe: vi.fn((callback) => {
      // Store callback for testing
      (
        mockPluginSettingsStore as {
          _callback?: (state: ReturnType<typeof mockPluginSettingsStore.get>) => void;
        }
      )._callback = callback;
      return vi.fn();
    }),
  },
  mockFlags: {
    EXPERIMENTAL_PLUGINS: true,
  },
}));

vi.mock('@/stores/pluginSettingsStore', () => ({
  pluginSettingsStore: mockPluginSettingsStore,
}));

vi.mock('@/constants/flags', () => mockFlags);

describe('PluginSettingsDrawer', () => {
  const defaultProps = {
    open: true,
    onClose: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockFlags.EXPERIMENTAL_PLUGINS = true;
    mockPluginSettingsStore.get.mockReturnValue({
      channelWidthMode: 'percent',
      channelDefaultWidthPct: 2.0,
      fibPreset: 'Classic',
      fibCustomLevels: [0, 0.382, 0.5, 0.618, 1],
    });
  });

  describe('Rendering', () => {
    it('should render when open and plugins enabled', () => {
      render(<PluginSettingsDrawer {...defaultProps} />);
      expect(screen.getByText('Plugin Settings')).toBeInTheDocument();
    });

    it('should not render when closed', () => {
      render(<PluginSettingsDrawer {...defaultProps} open={false} />);
      expect(screen.queryByText('Plugin Settings')).not.toBeInTheDocument();
    });

    it('should not render when plugins disabled', () => {
      mockFlags.EXPERIMENTAL_PLUGINS = false;
      render(<PluginSettingsDrawer {...defaultProps} />);
      expect(screen.queryByText('Plugin Settings')).not.toBeInTheDocument();
    });
  });

  describe('Close Button', () => {
    it('should render close button', () => {
      render(<PluginSettingsDrawer {...defaultProps} />);
      expect(screen.getByText('Close')).toBeInTheDocument();
    });

    it('should call onClose when clicked', () => {
      render(<PluginSettingsDrawer {...defaultProps} />);
      fireEvent.click(screen.getByText('Close'));
      expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('Parallel Channel Settings', () => {
    it('should render channel settings section', () => {
      render(<PluginSettingsDrawer {...defaultProps} />);
      expect(screen.getByText('Parallel Channel')).toBeInTheDocument();
    });

    it('should render width mode select', () => {
      render(<PluginSettingsDrawer {...defaultProps} />);
      expect(screen.getByText('Width mode')).toBeInTheDocument();
    });

    it('should change width mode on select', () => {
      render(<PluginSettingsDrawer {...defaultProps} />);
      const select = screen.getByDisplayValue('% of price');

      fireEvent.change(select, { target: { value: 'pixels' } });

      expect(mockPluginSettingsStore.set).toHaveBeenCalledWith('channelWidthMode', 'pixels');
    });

    it('should render default width input', () => {
      render(<PluginSettingsDrawer {...defaultProps} />);
      const input = screen.getByDisplayValue('2');
      expect(input).toBeInTheDocument();
    });

    it('should update width on input change', () => {
      render(<PluginSettingsDrawer {...defaultProps} />);
      const input = screen.getByDisplayValue('2');

      fireEvent.change(input, { target: { value: '5.5' } });

      expect(mockPluginSettingsStore.set).toHaveBeenCalledWith('channelDefaultWidthPct', 5.5);
    });
  });

  describe('Fibonacci Settings', () => {
    it('should render fibonacci settings section', () => {
      render(<PluginSettingsDrawer {...defaultProps} />);
      expect(screen.getByText('Fibonacci Levels')).toBeInTheDocument();
    });

    it('should render preset options', () => {
      render(<PluginSettingsDrawer {...defaultProps} />);
      expect(screen.getByText('Classic (0→1)')).toBeInTheDocument();
    });

    it('should change preset on select', () => {
      render(<PluginSettingsDrawer {...defaultProps} />);
      const select = screen.getByDisplayValue('Classic (0→1)');

      fireEvent.change(select, { target: { value: 'Extended' } });

      expect(mockPluginSettingsStore.set).toHaveBeenCalledWith('fibPreset', 'Extended');
    });

    it('should show custom input when Custom preset selected', () => {
      mockPluginSettingsStore.get.mockReturnValue({
        channelWidthMode: 'percent',
        channelDefaultWidthPct: 2.0,
        fibPreset: 'Custom',
        fibCustomLevels: [0, 0.5, 1],
      });

      render(<PluginSettingsDrawer {...defaultProps} />);

      expect(screen.getByPlaceholderText(/comma-separated/i)).toBeInTheDocument();
    });

    it('should parse custom levels input', () => {
      mockPluginSettingsStore.get.mockReturnValue({
        channelWidthMode: 'percent',
        channelDefaultWidthPct: 2.0,
        fibPreset: 'Custom',
        fibCustomLevels: [0, 0.5, 1],
      });

      render(<PluginSettingsDrawer {...defaultProps} />);
      const input = screen.getByPlaceholderText(/comma-separated/i);

      fireEvent.change(input, { target: { value: '0, 0.5, 1, 1.618' } });

      expect(mockPluginSettingsStore.set).toHaveBeenCalledWith(
        'fibCustomLevels',
        [0, 0.5, 1, 1.618]
      );
    });
  });

  describe('Per-Symbol Settings', () => {
    it('should render per-symbol settings section', () => {
      render(<PluginSettingsDrawer {...defaultProps} />);
      expect(screen.getByText('Per-symbol settings')).toBeInTheDocument();
    });

    it('should render Apply to current button', () => {
      render(<PluginSettingsDrawer {...defaultProps} />);
      expect(screen.getByText('Apply to current')).toBeInTheDocument();
    });

    it('should render Clear current button', () => {
      render(<PluginSettingsDrawer {...defaultProps} />);
      expect(screen.getByText('Clear current')).toBeInTheDocument();
    });
  });

  describe('Reset Button', () => {
    it('should render reset button', () => {
      render(<PluginSettingsDrawer {...defaultProps} />);
      expect(screen.getByText('Reset')).toBeInTheDocument();
    });

    it('should call reset on click', () => {
      render(<PluginSettingsDrawer {...defaultProps} />);
      fireEvent.click(screen.getByText('Reset'));

      expect(mockPluginSettingsStore.reset).toHaveBeenCalled();
    });
  });

  describe('Store Subscription', () => {
    it('should subscribe to store on mount', () => {
      render(<PluginSettingsDrawer {...defaultProps} />);
      expect(mockPluginSettingsStore.subscribe).toHaveBeenCalled();
    });
  });

  describe('Styling', () => {
    it('should have fixed positioning', () => {
      const { container } = render(<PluginSettingsDrawer {...defaultProps} />);
      const drawer = container.querySelector('.fixed');
      expect(drawer).toBeInTheDocument();
    });

    it('should have backdrop blur', () => {
      const { container } = render(<PluginSettingsDrawer {...defaultProps} />);
      const drawer = container.querySelector('.backdrop-blur');
      expect(drawer).toBeInTheDocument();
    });

    it('should have high z-index', () => {
      const { container } = render(<PluginSettingsDrawer {...defaultProps} />);
      const drawer = container.querySelector('.z-40');
      expect(drawer).toBeInTheDocument();
    });
  });
});
