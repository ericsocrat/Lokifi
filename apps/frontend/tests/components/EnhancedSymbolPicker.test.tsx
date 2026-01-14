import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EnhancedSymbolPicker } from '../../components/EnhancedSymbolPicker';

// Hoisted mocks
const { mockSymbolStore, mockLogger } = vi.hoisted(() => ({
  mockSymbolStore: {
    get: vi.fn(() => 'BTCUSD'),
    set: vi.fn(),
    subscribe: vi.fn((callback) => {
      (mockSymbolStore as { _callback?: (symbol: string) => void })._callback = callback;
      return vi.fn();
    }),
  },
  mockLogger: {
    error: vi.fn(),
  },
}));

vi.mock('@/lib/stores/symbolStore', () => ({
  symbolStore: mockSymbolStore,
}));

vi.mock('@/lib/utils/logger', () => ({
  logger: mockLogger,
}));

describe('EnhancedSymbolPicker', () => {
  const mockSymbols = [
    {
      symbol: 'AAPL',
      name: 'Apple Inc.',
      asset_type: 'stock',
      exchange: 'NASDAQ',
      currency: 'USD',
    },
    {
      symbol: 'BTCUSD',
      name: 'Bitcoin',
      asset_type: 'crypto',
      exchange: 'Crypto',
      currency: 'USD',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockSymbolStore.get.mockReturnValue('BTCUSD');

    // Mock fetch globally
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockSymbols,
    });

    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe('Rendering', () => {
    it('should render the symbol picker button', async () => {
      render(<EnhancedSymbolPicker />);

      await act(async () => {
        await vi.runAllTimersAsync();
      });

      expect(screen.getByText('BTCUSD')).toBeInTheDocument();
    });

    it('should show dropdown when clicked', async () => {
      render(<EnhancedSymbolPicker />);

      await act(async () => {
        await vi.runAllTimersAsync();
      });

      const button = screen.getByText('BTCUSD');
      fireEvent.click(button);

      expect(screen.getByPlaceholderText(/search symbols/i)).toBeInTheDocument();
    });
  });

  describe('Tabs', () => {
    it('should show Popular tab by default', async () => {
      render(<EnhancedSymbolPicker />);

      await act(async () => {
        await vi.runAllTimersAsync();
      });

      fireEvent.click(screen.getByText('BTCUSD'));

      expect(screen.getByRole('button', { name: /popular/i })).toBeInTheDocument();
    });

    it('should show Search Results tab', async () => {
      render(<EnhancedSymbolPicker />);

      await act(async () => {
        await vi.runAllTimersAsync();
      });

      fireEvent.click(screen.getByText('BTCUSD'));

      expect(screen.getByRole('button', { name: /search results/i })).toBeInTheDocument();
    });

    it('should switch to Search Results tab when clicked', async () => {
      render(<EnhancedSymbolPicker />);

      await act(async () => {
        await vi.runAllTimersAsync();
      });

      fireEvent.click(screen.getByText('BTCUSD'));

      const searchTab = screen.getByRole('button', { name: /search results/i });
      fireEvent.click(searchTab);

      // Search tab should now be active (has bg-blue-600 class when active)
      expect(searchTab).toHaveClass('bg-blue-600');
    });
  });

  describe('Search', () => {
    it('should render search input when dropdown is open', async () => {
      render(<EnhancedSymbolPicker />);

      await act(async () => {
        await vi.runAllTimersAsync();
      });

      fireEvent.click(screen.getByText('BTCUSD'));

      const searchInput = screen.getByPlaceholderText(/search symbols/i);
      expect(searchInput).toBeInTheDocument();
    });

    it('should update search query on input', async () => {
      render(<EnhancedSymbolPicker />);

      await act(async () => {
        await vi.runAllTimersAsync();
      });

      fireEvent.click(screen.getByText('BTCUSD'));
      const searchInput = screen.getByPlaceholderText(/search symbols/i);

      fireEvent.change(searchInput, { target: { value: 'AAPL' } });
      expect(searchInput).toHaveValue('AAPL');
    });

    it('should debounce search requests when query >= 2 chars', async () => {
      render(<EnhancedSymbolPicker />);

      await act(async () => {
        await vi.runAllTimersAsync();
      });

      // Clear fetch calls from initial popular symbols load
      (global.fetch as ReturnType<typeof vi.fn>).mockClear();

      fireEvent.click(screen.getByText('BTCUSD'));
      const searchInput = screen.getByPlaceholderText(/search symbols/i);

      await act(async () => {
        fireEvent.change(searchInput, { target: { value: 'AAPL' } });
      });

      // Advance timers past debounce delay
      await act(async () => {
        await vi.advanceTimersByTimeAsync(350);
      });

      // Search should be triggered after debounce (query >= 2 chars)
      expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/api/v1/symbols/search'));
    });

    it('should not search when query < 2 chars', async () => {
      render(<EnhancedSymbolPicker />);

      await act(async () => {
        await vi.runAllTimersAsync();
      });

      // Clear fetch calls from initial popular symbols load
      (global.fetch as ReturnType<typeof vi.fn>).mockClear();

      fireEvent.click(screen.getByText('BTCUSD'));
      const searchInput = screen.getByPlaceholderText(/search symbols/i);

      await act(async () => {
        fireEvent.change(searchInput, { target: { value: 'A' } });
      });

      await act(async () => {
        await vi.advanceTimersByTimeAsync(350);
      });

      // Search should NOT be triggered for single char
      expect(global.fetch).not.toHaveBeenCalled();
    });
  });

  describe('Symbol Selection', () => {
    it('should display symbols from popular list after loading', async () => {
      // Ensure fetch returns data
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: async () => mockSymbols,
      });

      render(<EnhancedSymbolPicker />);

      // Run all timers to complete async operations
      await act(async () => {
        await vi.runAllTimersAsync();
      });

      fireEvent.click(screen.getByText('BTCUSD'));

      // Run timers again for focus timeout
      await act(async () => {
        await vi.runAllTimersAsync();
      });

      // Check that the symbol list is loaded
      // After fetch resolves, symbols should show
      expect(screen.getByText('Apple Inc.')).toBeInTheDocument();
    });

    it('should call symbolStore.set when symbol is selected', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: async () => mockSymbols,
      });

      render(<EnhancedSymbolPicker />);

      await act(async () => {
        await vi.runAllTimersAsync();
      });

      fireEvent.click(screen.getByText('BTCUSD'));

      await act(async () => {
        await vi.runAllTimersAsync();
      });

      // Find and click the AAPL button
      const aaplButton = screen.getByRole('button', { name: /AAPL/i });
      fireEvent.click(aaplButton);

      expect(mockSymbolStore.set).toHaveBeenCalledWith('AAPL');
    });

    it('should close dropdown after selection', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: async () => mockSymbols,
      });

      render(<EnhancedSymbolPicker />);

      await act(async () => {
        await vi.runAllTimersAsync();
      });

      fireEvent.click(screen.getByText('BTCUSD'));

      await act(async () => {
        await vi.runAllTimersAsync();
      });

      // Select a symbol
      const aaplButton = screen.getByRole('button', { name: /AAPL/i });
      fireEvent.click(aaplButton);

      // Dropdown should be closed
      expect(screen.queryByPlaceholderText(/search symbols/i)).not.toBeInTheDocument();
    });
  });

  describe('Click Outside', () => {
    it('should close dropdown when clicking outside', async () => {
      render(
        <div>
          <div data-testid="outside">Outside</div>
          <EnhancedSymbolPicker />
        </div>
      );

      await act(async () => {
        await vi.runAllTimersAsync();
      });

      fireEvent.click(screen.getByText('BTCUSD'));
      expect(screen.getByPlaceholderText(/search symbols/i)).toBeInTheDocument();

      fireEvent.mouseDown(screen.getByTestId('outside'));

      expect(screen.queryByPlaceholderText(/search symbols/i)).not.toBeInTheDocument();
    });
  });

  describe('Store Subscription', () => {
    it('should subscribe to symbol store on mount', async () => {
      render(<EnhancedSymbolPicker />);

      await act(async () => {
        await vi.runAllTimersAsync();
      });

      expect(mockSymbolStore.subscribe).toHaveBeenCalled();
    });

    it('should update displayed symbol when store changes', async () => {
      render(<EnhancedSymbolPicker />);

      await act(async () => {
        await vi.runAllTimersAsync();
      });

      expect(screen.getByText('BTCUSD')).toBeInTheDocument();

      // Simulate store update
      act(() => {
        const callback = (mockSymbolStore as { _callback?: (symbol: string) => void })._callback;
        callback?.('ETHUSD');
      });

      expect(screen.getByText('ETHUSD')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should handle fetch error and use fallback data', async () => {
      // Mock fetch to throw error
      (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Network error'));

      render(<EnhancedSymbolPicker />);

      await act(async () => {
        await vi.runAllTimersAsync();
      });

      // Component does silent fail with fallback data (by design)
      // Logger should NOT be called - backend may not be running
      expect(mockLogger.error).not.toHaveBeenCalled();

      // Fallback symbols should be available after error
      fireEvent.click(screen.getByText('BTCUSD'));

      await act(async () => {
        await vi.runAllTimersAsync();
      });

      // Fallback data should be displayed
      expect(screen.getByText('Apple Inc.')).toBeInTheDocument();
    });
  });

  describe('Styling', () => {
    it('should have button styling for main trigger', async () => {
      const { container } = render(<EnhancedSymbolPicker />);

      await act(async () => {
        await vi.runAllTimersAsync();
      });

      const button = container.querySelector('button');
      expect(button).toBeInTheDocument();
    });
  });
});
