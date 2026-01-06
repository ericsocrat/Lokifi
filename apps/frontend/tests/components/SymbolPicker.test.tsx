/**
 * @vitest-environment jsdom
 */
/**
 * SymbolPicker Tests
 *
 * Tests for the symbol input component that syncs with symbolStore.
 * Features:
 * - Text input for entering trading symbols
 * - Automatic uppercase conversion
 * - Store synchronization on mount and change
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Use vi.hoisted for mock state that can be modified in tests
const { mockSymbol, mockFns } = vi.hoisted(() => ({
  mockSymbol: { value: 'BTCUSD' },
  mockFns: {
    get: vi.fn(() => mockSymbol.value),
    set: vi.fn((val: string) => {
      mockSymbol.value = val;
    }),
  },
}));

// Mock the symbolStore
vi.mock('@/stores/symbolStore', () => ({
  symbolStore: {
    get: mockFns.get,
    set: mockFns.set,
  },
}));

// Import component after mocks
import SymbolPicker from '../../components/SymbolPicker';

describe('SymbolPicker', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    vi.clearAllMocks();
    mockSymbol.value = 'BTCUSD';
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Rendering', () => {
    it('should render an input element', () => {
      render(<SymbolPicker />);

      const input = screen.getByPlaceholderText('Symbol (e.g., BTCUSD, AAPL)');
      expect(input).toBeInTheDocument();
      expect(input.tagName).toBe('INPUT');
    });

    it('should display the initial symbol from store', () => {
      render(<SymbolPicker />);

      const input = screen.getByPlaceholderText('Symbol (e.g., BTCUSD, AAPL)');
      expect(input).toHaveValue('BTCUSD');
    });

    it('should have proper styling classes', () => {
      render(<SymbolPicker />);

      const input = screen.getByPlaceholderText('Symbol (e.g., BTCUSD, AAPL)');
      expect(input).toHaveClass(
        'px-3',
        'py-2',
        'bg-neutral-900',
        'rounded-xl',
        'border',
        'border-neutral-800'
      );
    });
  });

  describe('Store Initialization', () => {
    it('should read from store on mount', () => {
      render(<SymbolPicker />);

      expect(mockFns.get).toHaveBeenCalled();
    });

    it('should sync to store on mount via useEffect', () => {
      render(<SymbolPicker />);

      // The useEffect calls set with the initial value
      expect(mockFns.set).toHaveBeenCalledWith('BTCUSD');
    });
  });

  describe('User Input', () => {
    it('should update value when user types', async () => {
      render(<SymbolPicker />);

      const input = screen.getByPlaceholderText('Symbol (e.g., BTCUSD, AAPL)');

      // Clear and type new value
      await user.clear(input);
      await user.type(input, 'aapl');

      expect(input).toHaveValue('AAPL');
    });

    it('should convert input to uppercase', async () => {
      render(<SymbolPicker />);

      const input = screen.getByPlaceholderText('Symbol (e.g., BTCUSD, AAPL)');

      await user.clear(input);
      await user.type(input, 'ethusd');

      expect(input).toHaveValue('ETHUSD');
    });

    it('should sync to store when value changes', async () => {
      render(<SymbolPicker />);

      const input = screen.getByPlaceholderText('Symbol (e.g., BTCUSD, AAPL)');

      await user.clear(input);
      await user.type(input, 'tsla');

      // Check that set was called with uppercase value
      expect(mockFns.set).toHaveBeenCalledWith('TSLA');
    });

    it('should handle empty input', async () => {
      render(<SymbolPicker />);

      const input = screen.getByPlaceholderText('Symbol (e.g., BTCUSD, AAPL)');

      await user.clear(input);

      expect(input).toHaveValue('');
      expect(mockFns.set).toHaveBeenCalledWith('');
    });

    it('should handle special characters', async () => {
      render(<SymbolPicker />);

      const input = screen.getByPlaceholderText('Symbol (e.g., BTCUSD, AAPL)');

      await user.clear(input);
      await user.type(input, 'btc/usd');

      expect(input).toHaveValue('BTC/USD');
    });
  });

  describe('Different Initial States', () => {
    it('should handle empty initial store value', () => {
      mockSymbol.value = '';
      mockFns.get.mockReturnValue('');

      render(<SymbolPicker />);

      const input = screen.getByPlaceholderText('Symbol (e.g., BTCUSD, AAPL)');
      expect(input).toHaveValue('');
    });

    it('should handle different initial symbols', () => {
      mockSymbol.value = 'ETHUSD';
      mockFns.get.mockReturnValue('ETHUSD');

      render(<SymbolPicker />);

      const input = screen.getByPlaceholderText('Symbol (e.g., BTCUSD, AAPL)');
      expect(input).toHaveValue('ETHUSD');
    });
  });
});
