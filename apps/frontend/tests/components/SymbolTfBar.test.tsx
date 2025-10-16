import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SymbolTfBar from '@/components/SymbolTfBar';
import { useChartStore } from '@/state/store';
import { TF_PRESETS, SYMBOL_SUGGESTIONS } from '@/lib/utils/timeframes';

// Mock the store
vi.mock('@/state/store', () => ({
  useChartStore: vi.fn(),
}));

describe('SymbolTfBar', () => {
  let mockStore: any;

  beforeEach(() => {
    // Reset mock store
    mockStore = {
      symbol: 'BTCUSDT',
      timeframe: '1h',
      setSymbol: vi.fn(),
      setTimeframe: vi.fn(),
    };

    // Setup zustand mock to return values based on selector
    (useChartStore as any).mockImplementation((selector: any) => {
      if (typeof selector === 'function') {
        return selector(mockStore);
      }
      return mockStore;
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders the component with symbol and timeframe inputs', () => {
      render(<SymbolTfBar />);

      const symbolInput = screen.getByPlaceholderText('Symbol');
      expect(symbolInput).toBeInTheDocument();
      expect(symbolInput).toHaveValue('BTCUSDT');

      const tfInput = screen.getByPlaceholderText('e.g. 90m');
      expect(tfInput).toBeInTheDocument();
      expect(tfInput).toHaveValue('1h');
    });

    it('renders all timeframe preset buttons', () => {
      render(<SymbolTfBar />);

      TF_PRESETS.forEach((tf) => {
        const button = screen.getByRole('button', { name: tf });
        expect(button).toBeInTheDocument();
      });
    });

    it('highlights the active timeframe preset', () => {
      mockStore.timeframe = '15m';
      render(<SymbolTfBar />);

      const activeButton = screen.getByRole('button', { name: '15m' });
      expect(activeButton).toHaveClass('border-white/60', 'bg-white/10');

      const inactiveButton = screen.getByRole('button', { name: '1h' });
      expect(inactiveButton).toHaveClass('border-white/15');
      expect(inactiveButton).not.toHaveClass('bg-white/10');
    });

    it('renders Set buttons for symbol and timeframe', () => {
      render(<SymbolTfBar />);

      const setButtons = screen.getAllByRole('button', { name: 'Set' });
      expect(setButtons).toHaveLength(2);
    });
  });

  describe('Symbol Input', () => {
    it('updates symbol input value when typing', async () => {
      const user = userEvent.setup();
      render(<SymbolTfBar />);

      const symbolInput = screen.getByPlaceholderText('Symbol');
      await user.clear(symbolInput);
      await user.type(symbolInput, 'ETH');

      expect(symbolInput).toHaveValue('ETH');
    });

    it('converts symbol input to uppercase while typing', async () => {
      const user = userEvent.setup();
      render(<SymbolTfBar />);

      const symbolInput = screen.getByPlaceholderText('Symbol');
      await user.clear(symbolInput);
      await user.type(symbolInput, 'eth');

      expect(symbolInput).toHaveValue('ETH');
    });

    it('syncs input value when store symbol changes', () => {
      const { rerender } = render(<SymbolTfBar />);
      
      const symbolInput = screen.getByPlaceholderText('Symbol');
      expect(symbolInput).toHaveValue('BTCUSDT');

      // Update store and rerender
      mockStore.symbol = 'ETHUSDT';
      rerender(<SymbolTfBar />);

      expect(symbolInput).toHaveValue('ETHUSDT');
    });

    it('applies symbol on Set button click', async () => {
      const user = userEvent.setup();
      render(<SymbolTfBar />);

      const symbolInput = screen.getByPlaceholderText('Symbol');
      await user.clear(symbolInput);
      await user.type(symbolInput, 'ETHUSDT');

      const setButton = screen.getAllByRole('button', { name: 'Set' })[0];
      await user.click(setButton);

      expect(mockStore.setSymbol).toHaveBeenCalledWith('ETHUSDT');
    });

    it('applies symbol on Enter key press', async () => {
      const user = userEvent.setup();
      render(<SymbolTfBar />);

      const symbolInput = screen.getByPlaceholderText('Symbol');
      await user.clear(symbolInput);
      await user.type(symbolInput, 'SOLUSDT{Enter}');

      expect(mockStore.setSymbol).toHaveBeenCalledWith('SOLUSDT');
    });

    it('trims and uppercases symbol before applying', async () => {
      const user = userEvent.setup();
      render(<SymbolTfBar />);

      const symbolInput = screen.getByPlaceholderText('Symbol');
      await user.clear(symbolInput);
      await user.type(symbolInput, '  eth  {Enter}');

      expect(mockStore.setSymbol).toHaveBeenCalledWith('ETH');
    });

    it('does not apply empty symbol', async () => {
      const user = userEvent.setup();
      render(<SymbolTfBar />);

      const symbolInput = screen.getByPlaceholderText('Symbol');
      await user.clear(symbolInput);
      await user.type(symbolInput, '   {Enter}');

      expect(mockStore.setSymbol).not.toHaveBeenCalled();
    });
  });

  describe('Symbol Suggestions Menu', () => {
    it('shows suggestions menu when typing in symbol input', async () => {
      const user = userEvent.setup();
      render(<SymbolTfBar />);

      const symbolInput = screen.getByPlaceholderText('Symbol');
      await user.clear(symbolInput);
      await user.type(symbolInput, 'BTC');

      await waitFor(() => {
        expect(screen.getByText('BTCUSDT')).toBeInTheDocument();
      });
    });

    it('filters suggestions based on input', async () => {
      const user = userEvent.setup();
      render(<SymbolTfBar />);

      const symbolInput = screen.getByPlaceholderText('Symbol');
      await user.clear(symbolInput);
      await user.type(symbolInput, 'ETH');

      await waitFor(() => {
        expect(screen.getByText('ETHUSDT')).toBeInTheDocument();
        expect(screen.queryByText('BTCUSDT')).not.toBeInTheDocument();
      });
    });

    it('filters are case-insensitive', async () => {
      const user = userEvent.setup();
      render(<SymbolTfBar />);

      const symbolInput = screen.getByPlaceholderText('Symbol');
      await user.clear(symbolInput);
      await user.type(symbolInput, 'btc');

      await waitFor(() => {
        expect(screen.getByText('BTCUSDT')).toBeInTheDocument();
      });
    });

    it('limits suggestions to 20 results', async () => {
      const user = userEvent.setup();
      render(<SymbolTfBar />);

      const symbolInput = screen.getByPlaceholderText('Symbol');
      await user.clear(symbolInput);
      await user.type(symbolInput, 'U'); // Common character

      await waitFor(() => {
        const buttons = screen.getAllByRole('button');
        // Count only suggestion buttons (exclude Set buttons and timeframe buttons)
        const suggestionButtons = buttons.filter(
          (btn) => SYMBOL_SUGGESTIONS.includes(btn.textContent || '')
        );
        expect(suggestionButtons.length).toBeLessThanOrEqual(20);
      });
    });

    it('applies symbol when suggestion is clicked', async () => {
      const user = userEvent.setup();
      render(<SymbolTfBar />);

      const symbolInput = screen.getByPlaceholderText('Symbol');
      await user.clear(symbolInput);
      await user.type(symbolInput, 'ETH');

      await waitFor(() => {
        expect(screen.getByText('ETHUSDT')).toBeInTheDocument();
      });

      const suggestion = screen.getByText('ETHUSDT');
      await user.click(suggestion);

      expect(mockStore.setSymbol).toHaveBeenCalledWith('ETHUSDT');
    });

    it('closes menu when suggestion is clicked', async () => {
      const user = userEvent.setup();
      render(<SymbolTfBar />);

      const symbolInput = screen.getByPlaceholderText('Symbol');
      await user.clear(symbolInput);
      await user.type(symbolInput, 'ETH');

      await waitFor(() => {
        expect(screen.getByText('ETHUSDT')).toBeInTheDocument();
      });

      const suggestion = screen.getByText('ETHUSDT');
      await user.click(suggestion);

      await waitFor(() => {
        expect(screen.queryByText('ETHUSDT')).not.toBeInTheDocument();
      });
    });

    it('closes menu when clicking outside', async () => {
      const user = userEvent.setup();
      render(
        <div>
          <SymbolTfBar />
          <div data-testid="outside">Outside</div>
        </div>
      );

      const symbolInput = screen.getByPlaceholderText('Symbol');
      await user.clear(symbolInput);
      await user.type(symbolInput, 'BTC');

      await waitFor(() => {
        expect(screen.getByText('BTCUSDT')).toBeInTheDocument();
      });

      const outside = screen.getByTestId('outside');
      fireEvent.mouseDown(outside);

      await waitFor(() => {
        expect(screen.queryByText('BTCUSDT')).not.toBeInTheDocument();
      });
    });

    it('closes menu when Set button is clicked', async () => {
      const user = userEvent.setup();
      render(<SymbolTfBar />);

      const symbolInput = screen.getByPlaceholderText('Symbol');
      await user.clear(symbolInput);
      await user.type(symbolInput, 'BTC');

      await waitFor(() => {
        expect(screen.getByText('BTCUSDT')).toBeInTheDocument();
      });

      const setButton = screen.getAllByRole('button', { name: 'Set' })[0];
      await user.click(setButton);

      await waitFor(() => {
        expect(screen.queryByText('BTCUSDT')).not.toBeInTheDocument();
      });
    });

    it('menu is empty when filter returns no results', async () => {
      const user = userEvent.setup();
      render(<SymbolTfBar />);

      const symbolInput = screen.getByPlaceholderText('Symbol');
      await user.clear(symbolInput);
      await user.type(symbolInput, 'ZZZZZ');

      await waitFor(() => {
        // Menu should be visible but empty (no suggestion buttons)
        const buttons = screen.getAllByRole('button');
        const suggestionButtons = buttons.filter(
          (btn) => SYMBOL_SUGGESTIONS.includes(btn.textContent || '')
        );
        expect(suggestionButtons).toHaveLength(0);
      });
    });
  });

  describe('Timeframe Presets', () => {
    it('applies timeframe when preset button is clicked', async () => {
      const user = userEvent.setup();
      render(<SymbolTfBar />);

      const button = screen.getByRole('button', { name: '15m' });
      await user.click(button);

      expect(mockStore.setTimeframe).toHaveBeenCalledWith('15m');
    });

    it('applies each timeframe preset correctly', async () => {
      const user = userEvent.setup();
      render(<SymbolTfBar />);

      for (const tf of TF_PRESETS) {
        const button = screen.getByRole('button', { name: tf });
        await user.click(button);
        expect(mockStore.setTimeframe).toHaveBeenCalledWith(tf);
      }
    });
  });

  describe('Freeform Timeframe Input', () => {
    it('updates timeframe input value when typing', async () => {
      const user = userEvent.setup();
      render(<SymbolTfBar />);

      const tfInput = screen.getByPlaceholderText('e.g. 90m');
      await user.clear(tfInput);
      await user.type(tfInput, '90m');

      expect(tfInput).toHaveValue('90m');
    });

    it('syncs input value when store timeframe changes', () => {
      const { rerender } = render(<SymbolTfBar />);
      
      const tfInput = screen.getByPlaceholderText('e.g. 90m');
      expect(tfInput).toHaveValue('1h');

      // Update store and rerender
      mockStore.timeframe = '4h';
      rerender(<SymbolTfBar />);

      expect(tfInput).toHaveValue('4h');
    });

    it('applies timeframe on Set button click', async () => {
      const user = userEvent.setup();
      render(<SymbolTfBar />);

      const tfInput = screen.getByPlaceholderText('e.g. 90m');
      await user.clear(tfInput);
      await user.type(tfInput, '90m');

      const setButton = screen.getAllByRole('button', { name: 'Set' })[1];
      await user.click(setButton);

      expect(mockStore.setTimeframe).toHaveBeenCalledWith('90m');
    });

    it('applies timeframe on Enter key press', async () => {
      const user = userEvent.setup();
      render(<SymbolTfBar />);

      const tfInput = screen.getByPlaceholderText('e.g. 90m');
      await user.clear(tfInput);
      await user.type(tfInput, '2h{Enter}');

      expect(mockStore.setTimeframe).toHaveBeenCalledWith('2h');
    });

    it('normalizes timeframe before applying', async () => {
      const user = userEvent.setup();
      render(<SymbolTfBar />);

      const tfInput = screen.getByPlaceholderText('e.g. 90m');
      await user.clear(tfInput);
      await user.type(tfInput, '60{Enter}'); // Should normalize to 1h

      expect(mockStore.setTimeframe).toHaveBeenCalledWith('1h');
    });

    it('handles different timeframe formats', async () => {
      const user = userEvent.setup();
      const testCases = [
        { input: '240', expected: '4h' },
        { input: '1440', expected: '1d' },
        { input: '10080', expected: '1w' },
      ];

      for (const { input, expected } of testCases) {
        const { unmount } = render(<SymbolTfBar />);
        
        const tfInput = screen.getByPlaceholderText('e.g. 90m');
        await user.clear(tfInput);
        await user.type(tfInput, `${input}{Enter}`);

        expect(mockStore.setTimeframe).toHaveBeenCalledWith(expected);
        
        // Cleanup for next iteration
        vi.clearAllMocks();
        unmount();
      }
    });

    it('does not apply empty timeframe', async () => {
      const user = userEvent.setup();
      render(<SymbolTfBar />);

      const tfInput = screen.getByPlaceholderText('e.g. 90m');
      await user.clear(tfInput);
      await user.type(tfInput, '   {Enter}');

      expect(mockStore.setTimeframe).not.toHaveBeenCalled();
    });
  });

  describe('Event Cleanup', () => {
    it('removes mousedown listener on unmount', () => {
      const removeEventListenerSpy = vi.spyOn(document, 'removeEventListener');
      
      const { unmount } = render(<SymbolTfBar />);
      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith('mousedown', expect.any(Function));
      
      removeEventListenerSpy.mockRestore();
    });
  });

  describe('Edge Cases', () => {
    it('handles rapid input changes', async () => {
      const user = userEvent.setup();
      render(<SymbolTfBar />);

      const symbolInput = screen.getByPlaceholderText('Symbol');
      
      // Type rapidly
      await user.clear(symbolInput);
      await user.type(symbolInput, 'A');
      await user.type(symbolInput, 'B');
      await user.type(symbolInput, 'C');

      expect(symbolInput).toHaveValue('ABC');
    });

    it('handles special characters in symbol input', async () => {
      const user = userEvent.setup();
      render(<SymbolTfBar />);

      const symbolInput = screen.getByPlaceholderText('Symbol');
      await user.clear(symbolInput);
      await user.type(symbolInput, 'BTC-USD{Enter}');

      expect(mockStore.setSymbol).toHaveBeenCalledWith('BTC-USD');
    });

    it('maintains menu reference across renders', async () => {
      const user = userEvent.setup();
      const { rerender } = render(<SymbolTfBar />);

      const symbolInput = screen.getByPlaceholderText('Symbol');
      await user.clear(symbolInput);
      await user.type(symbolInput, 'BTC');

      await waitFor(() => {
        expect(screen.getByText('BTCUSDT')).toBeInTheDocument();
      });

      // Force rerender
      rerender(<SymbolTfBar />);

      // Menu should still be visible
      expect(screen.getByText('BTCUSDT')).toBeInTheDocument();
    });
  });
});
