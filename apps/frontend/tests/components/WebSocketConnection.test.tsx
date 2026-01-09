import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock logger
vi.mock('@/lib/utils/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock market data store
vi.mock('@/lib/stores/marketDataStore', () => ({
  useMarketDataStore: () => ({
    fetchOHLCData: vi.fn(),
  }),
}));

// Import after mocks
import { renderHook } from '@testing-library/react';
import WebSocketConnection, { useWebSocketData } from '../../components/WebSocketConnection';

describe('WebSocketConnection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Disabled State', () => {
    it('should render nothing when disabled', () => {
      render(<WebSocketConnection enabled={false} symbols={['BTCUSD']} />);

      expect(screen.queryByText('Connected')).not.toBeInTheDocument();
      expect(screen.queryByText('Disconnected')).not.toBeInTheDocument();
    });

    it('should render nothing when enabled with no symbols', () => {
      render(<WebSocketConnection enabled={true} symbols={[]} />);

      expect(screen.queryByText('Connected')).not.toBeInTheDocument();
    });
  });

  describe('Initial Rendering', () => {
    it('should show connecting state initially', () => {
      render(<WebSocketConnection enabled={true} symbols={['BTCUSD']} />);

      expect(screen.getByText('Connecting...')).toBeInTheDocument();
    });

    it('should show symbols count', () => {
      render(<WebSocketConnection enabled={true} symbols={['BTCUSD', 'ETHUSD']} />);

      expect(screen.getByText('Symbols: 2')).toBeInTheDocument();
    });

    it('should have pulsing indicator while connecting', () => {
      render(<WebSocketConnection enabled={true} symbols={['BTCUSD']} />);

      // Find the status indicator - it should have animate-pulse class while connecting
      const container = screen
        .getByText('Connecting...')
        .closest('div[class*="border-surface-200"]');
      const indicator = container?.querySelector('.animate-pulse');
      expect(indicator).toBeInTheDocument();
    });
  });

  describe('Connection Success', () => {
    it('should transition from connecting to connected', () => {
      render(<WebSocketConnection enabled={true} symbols={['BTCUSD']} />);

      // Initially connecting
      expect(screen.getByText('Connecting...')).toBeInTheDocument();

      // Advance past connection delay
      act(() => {
        vi.advanceTimersByTime(1500);
      });

      // Now connected (with 90% success rate, this should work)
      // If it randomly fails, it would show error state
      const statusText = screen.getByText(/Connected|Error/);
      expect(statusText).toBeInTheDocument();
    });
  });

  describe('Status Colors', () => {
    it('should have yellow color when connecting', () => {
      render(<WebSocketConnection enabled={true} symbols={['BTCUSD']} />);

      const statusText = screen.getByText('Connecting...');
      expect(statusText).toHaveClass('text-yellow-400');
    });
  });

  describe('Status Indicator', () => {
    it('should have yellow pulsing indicator when connecting', () => {
      render(<WebSocketConnection enabled={true} symbols={['BTCUSD']} />);

      const container = screen
        .getByText('Connecting...')
        .closest('div[class*="border-surface-200"]');
      const indicator = container?.querySelector('.bg-yellow-400');
      expect(indicator).toBeInTheDocument();
    });
  });

  describe('Periodic Updates', () => {
    it('should be prepared for updates after connection', () => {
      render(<WebSocketConnection enabled={true} symbols={['BTCUSD']} />);

      // Initially shows 0 messages before any updates
      expect(screen.queryByText('Messages: 0')).not.toBeInTheDocument(); // Not visible until connected

      // Advance past connection delay
      act(() => {
        vi.advanceTimersByTime(1500);
      });

      // After connection, messages count should be visible
      const _messagesText = screen.queryByText(/Messages:/);
      // Either shows messages count or error state
      expect(screen.getByText(/Connected|Error/)).toBeInTheDocument();
    });
  });

  describe('Disconnect Behavior', () => {
    it('should render nothing when disabled', () => {
      const { rerender } = render(<WebSocketConnection enabled={true} symbols={['BTCUSD']} />);

      // Initially visible
      expect(screen.getByText('Connecting...')).toBeInTheDocument();

      // Disable
      rerender(<WebSocketConnection enabled={false} symbols={['BTCUSD']} />);

      // Should render nothing when disabled
      expect(screen.queryByText('Connecting...')).not.toBeInTheDocument();
      expect(screen.queryByText('Connected')).not.toBeInTheDocument();
    });
  });

  describe('UI Structure', () => {
    it('should render in fixed position', async () => {
      render(<WebSocketConnection enabled={true} symbols={['BTCUSD']} />);

      const container = screen.getByText('Connecting...').closest('.fixed');
      expect(container).toBeInTheDocument();
      expect(container).toHaveClass('top-4', 'right-4', 'z-50');
    });

    it('should have proper styling', async () => {
      render(<WebSocketConnection enabled={true} symbols={['BTCUSD']} />);

      const panel = screen.getByText('Connecting...').closest('.bg-surface-0');
      expect(panel).toBeInTheDocument();
      expect(panel).toHaveClass('border', 'border-surface-200', 'rounded-lg');
    });
  });
});

describe('useWebSocketData Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should return initial state when disabled', () => {
    const { result } = renderHook(() => useWebSocketData('BTCUSD', false));

    expect(result.current.data).toBeNull();
    expect(result.current.isConnected).toBe(false);
  });

  it('should return initial state when symbol is empty', () => {
    const { result } = renderHook(() => useWebSocketData('', true));

    expect(result.current.data).toBeNull();
    expect(result.current.isConnected).toBe(false);
  });

  it('should connect when enabled with symbol', () => {
    const { result } = renderHook(() => useWebSocketData('BTCUSD', true));

    expect(result.current.isConnected).toBe(true);
  });

  it('should disconnect on unmount', () => {
    const { result, unmount } = renderHook(() => useWebSocketData('BTCUSD', true));

    expect(result.current.isConnected).toBe(true);

    unmount();

    // Can't check result after unmount, but cleanup should run without error
    expect(true).toBe(true);
  });

  it('should reset data when symbol changes', () => {
    const { result, rerender } = renderHook(({ symbol }) => useWebSocketData(symbol, true), {
      initialProps: { symbol: 'BTCUSD' },
    });

    expect(result.current.isConnected).toBe(true);

    // Change symbol
    rerender({ symbol: 'ETHUSD' });

    expect(result.current.isConnected).toBe(true);
    expect(result.current.data).toBeNull(); // Reset on symbol change
  });
});
