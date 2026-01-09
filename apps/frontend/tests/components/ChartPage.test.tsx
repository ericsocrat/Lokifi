/**
 * @fileoverview Comprehensive tests for Chart pages
 * Tests the chart index page (redirect) and dynamic chart symbol page
 */

import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mocks must be defined at top level before vi.mock calls due to hoisting
const mockReplace = vi.fn();
const mockUseParams = vi.fn();
const mockSetSymbol = vi.fn();

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    replace: mockReplace,
  }),
  useParams: () => mockUseParams(),
}));

// Mock symbol store - use getter to avoid hoisting issues
vi.mock('@/lib/stores/symbolStore', () => ({
  symbolStore: {
    get setSymbol() {
      return mockSetSymbol;
    },
  },
}));

// Mock TradingWorkspace component
vi.mock('../../../components/TradingWorkspace', () => ({
  TradingWorkspace: () => <div data-testid="trading-workspace">Trading Workspace Component</div>,
}));

// Import components after mocks
import ChartSymbolPage from '../../app/chart/[symbol]/page';
import ChartIndexPage from '../../app/chart/page';

describe('ChartPage Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseParams.mockReturnValue({ symbol: 'BTCUSD' });
  });

  afterEach(() => {
    cleanup();
  });

  // ============================================
  // CHART INDEX PAGE TESTS
  // ============================================
  describe('ChartIndexPage', () => {
    describe('Redirect Behavior', () => {
      it('redirects to default symbol BTCUSD', async () => {
        render(<ChartIndexPage />);

        await waitFor(() => {
          expect(mockReplace).toHaveBeenCalledWith('/chart/BTCUSD');
        });
      });

      it('calls replace only once', async () => {
        render(<ChartIndexPage />);

        await waitFor(() => {
          expect(mockReplace).toHaveBeenCalledTimes(1);
        });
      });
    });

    describe('Loading State', () => {
      it('shows loading spinner', () => {
        render(<ChartIndexPage />);

        const spinner = document.querySelector('.animate-spin');
        expect(spinner).toBeInTheDocument();
      });

      it('shows loading text', () => {
        render(<ChartIndexPage />);

        expect(screen.getByText('Loading chart...')).toBeInTheDocument();
      });

      it('applies spinner styling', () => {
        render(<ChartIndexPage />);

        const spinner = document.querySelector('.animate-spin');
        expect(spinner).toHaveClass('rounded-full');
        expect(spinner).toHaveClass('h-12');
        expect(spinner).toHaveClass('w-12');
        expect(spinner).toHaveClass('border-b-2');
        expect(spinner).toHaveClass('border-primary');
      });

      it('applies loading text styling', () => {
        render(<ChartIndexPage />);

        const loadingText = screen.getByText('Loading chart...');
        expect(loadingText).toHaveClass('text-sm');
        expect(loadingText).toHaveClass('text-muted-foreground');
      });
    });

    describe('Layout', () => {
      it('centers content on page', () => {
        const { container } = render(<ChartIndexPage />);

        const wrapper = container.firstChild;
        expect(wrapper).toHaveClass('flex');
        expect(wrapper).toHaveClass('items-center');
        expect(wrapper).toHaveClass('justify-center');
        expect(wrapper).toHaveClass('min-h-screen');
      });

      it('has flex column layout for content', () => {
        const { container } = render(<ChartIndexPage />);

        const content = container.querySelector('.flex-col');
        expect(content).toBeInTheDocument();
        expect(content).toHaveClass('items-center');
        expect(content).toHaveClass('gap-4');
      });
    });
  });

  // ============================================
  // CHART SYMBOL PAGE TESTS
  // ============================================
  describe('ChartSymbolPage', () => {
    describe('Symbol Handling', () => {
      it('sets symbol from URL params', async () => {
        mockUseParams.mockReturnValue({ symbol: 'ETHUSD' });

        render(<ChartSymbolPage />);

        await waitFor(() => {
          expect(mockSetSymbol).toHaveBeenCalledWith('ETHUSD');
        });
      });

      it('converts symbol to uppercase', async () => {
        mockUseParams.mockReturnValue({ symbol: 'btcusd' });

        render(<ChartSymbolPage />);

        await waitFor(() => {
          expect(mockSetSymbol).toHaveBeenCalledWith('BTCUSD');
        });
      });

      it('handles mixed case symbols', async () => {
        mockUseParams.mockReturnValue({ symbol: 'EthUsD' });

        render(<ChartSymbolPage />);

        await waitFor(() => {
          expect(mockSetSymbol).toHaveBeenCalledWith('ETHUSD');
        });
      });

      it('does not set symbol when params are empty', async () => {
        mockUseParams.mockReturnValue({ symbol: '' });

        render(<ChartSymbolPage />);

        // Wait a tick to ensure effect has run
        await new Promise((resolve) => setTimeout(resolve, 0));

        expect(mockSetSymbol).not.toHaveBeenCalled();
      });

      it('does not set symbol when params are undefined', async () => {
        mockUseParams.mockReturnValue({});

        render(<ChartSymbolPage />);

        // Wait a tick to ensure effect has run
        await new Promise((resolve) => setTimeout(resolve, 0));

        expect(mockSetSymbol).not.toHaveBeenCalled();
      });

      it('sets symbol only once per render', async () => {
        mockUseParams.mockReturnValue({ symbol: 'BTCUSD' });

        render(<ChartSymbolPage />);

        await waitFor(() => {
          expect(mockSetSymbol).toHaveBeenCalledTimes(1);
        });
      });
    });

    describe('TradingWorkspace Integration', () => {
      it('shows loading state while TradingWorkspace loads', () => {
        // Dynamic import with ssr: false shows loading fallback in test environment
        render(<ChartSymbolPage />);

        expect(screen.getByText('Loading chart workspace...')).toBeInTheDocument();
      });

      it('displays loading spinner while workspace loads', () => {
        render(<ChartSymbolPage />);

        const spinner = document.querySelector('.animate-spin');
        expect(spinner).toBeInTheDocument();
        expect(spinner).toHaveClass('border-blue-500');
      });

      it('has centered loading layout', () => {
        const { container } = render(<ChartSymbolPage />);

        const wrapper = container.querySelector('.min-h-screen');
        expect(wrapper).toHaveClass('flex');
        expect(wrapper).toHaveClass('items-center');
        expect(wrapper).toHaveClass('justify-center');
      });
    });

    describe('Different Symbol Scenarios', () => {
      it('handles crypto symbols', async () => {
        mockUseParams.mockReturnValue({ symbol: 'SOLUSD' });

        render(<ChartSymbolPage />);

        await waitFor(() => {
          expect(mockSetSymbol).toHaveBeenCalledWith('SOLUSD');
        });
      });

      it('handles stock symbols', async () => {
        mockUseParams.mockReturnValue({ symbol: 'AAPL' });

        render(<ChartSymbolPage />);

        await waitFor(() => {
          expect(mockSetSymbol).toHaveBeenCalledWith('AAPL');
        });
      });

      it('handles forex symbols', async () => {
        mockUseParams.mockReturnValue({ symbol: 'EURUSD' });

        render(<ChartSymbolPage />);

        await waitFor(() => {
          expect(mockSetSymbol).toHaveBeenCalledWith('EURUSD');
        });
      });

      it('handles symbols with numbers', async () => {
        mockUseParams.mockReturnValue({ symbol: 'BTC2USD' });

        render(<ChartSymbolPage />);

        await waitFor(() => {
          expect(mockSetSymbol).toHaveBeenCalledWith('BTC2USD');
        });
      });
    });

    describe('Symbol Updates', () => {
      it('updates symbol when params change', async () => {
        mockUseParams.mockReturnValue({ symbol: 'BTCUSD' });
        const { rerender } = render(<ChartSymbolPage />);

        await waitFor(() => {
          expect(mockSetSymbol).toHaveBeenCalledWith('BTCUSD');
        });

        mockSetSymbol.mockClear();
        mockUseParams.mockReturnValue({ symbol: 'ETHUSD' });

        rerender(<ChartSymbolPage />);

        await waitFor(() => {
          expect(mockSetSymbol).toHaveBeenCalledWith('ETHUSD');
        });
      });
    });
  });

  // ============================================
  // ACCESSIBILITY TESTS
  // ============================================
  describe('Accessibility', () => {
    describe('ChartIndexPage', () => {
      it('has accessible loading text', () => {
        render(<ChartIndexPage />);

        const loadingText = screen.getByText('Loading chart...');
        expect(loadingText).toBeVisible();
      });
    });

    describe('ChartSymbolPage', () => {
      it('shows loading state with text', () => {
        render(<ChartSymbolPage />);

        expect(screen.getByText('Loading chart workspace...')).toBeVisible();
      });
    });
  });

  // ============================================
  // EDGE CASES
  // ============================================
  describe('Edge Cases', () => {
    it('handles null params gracefully', () => {
      mockUseParams.mockReturnValue(null);

      expect(() => render(<ChartSymbolPage />)).not.toThrow();
    });

    it('handles very long symbol names', async () => {
      mockUseParams.mockReturnValue({ symbol: 'VERYLONGSYMBOLNAME' });

      render(<ChartSymbolPage />);

      await waitFor(() => {
        expect(mockSetSymbol).toHaveBeenCalledWith('VERYLONGSYMBOLNAME');
      });
    });

    it('handles special characters in symbol gracefully', async () => {
      // The component just uppercases - testing the actual behavior
      mockUseParams.mockReturnValue({ symbol: 'btc-usd' });

      render(<ChartSymbolPage />);

      await waitFor(() => {
        expect(mockSetSymbol).toHaveBeenCalledWith('BTC-USD');
      });
    });
  });
});
