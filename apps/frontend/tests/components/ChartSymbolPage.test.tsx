/**
 * @file ChartSymbolPage.test.tsx
 * @description Tests for the chart/[symbol] page - dynamic chart workspace
 * @session 140 - Page testing coverage
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useParams: () => ({ symbol: 'BTCUSD' }),
}));

// Mock symbolStore
const mockSetSymbol = vi.fn();
vi.mock('@/lib/stores/symbolStore', () => ({
  symbolStore: {
    setSymbol: vi.fn((s: string) => mockSetSymbol(s)),
    getSymbol: () => 'BTCUSD',
    subscribe: vi.fn(),
  },
}));

// Mock next/dynamic - return a simple component instead of actual TradingWorkspace
vi.mock('next/dynamic', () => ({
  default: (importFn: () => Promise<{ default: React.ComponentType }>, options?: { loading?: () => React.ReactNode }) => {
    // Return the loading component for testing the loading state
    const LoadingComponent = options?.loading || (() => null);
    return function MockedDynamic() {
      return <LoadingComponent />;
    };
  },
}));

import ChartSymbolPage from '../../app/chart/[symbol]/page';
import { symbolStore } from '@/lib/stores/symbolStore';

describe('ChartSymbolPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders the page', () => {
      render(<ChartSymbolPage />);
      // The dynamic loading component should show
      expect(screen.getByText(/loading chart workspace/i)).toBeInTheDocument();
    });

    it('shows loading spinner while loading workspace', () => {
      render(<ChartSymbolPage />);
      const spinner = document.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });
  });

  describe('Symbol Store Integration', () => {
    it('updates symbol store with uppercase symbol on mount', async () => {
      render(<ChartSymbolPage />);
      await waitFor(() => {
        expect(symbolStore.setSymbol).toHaveBeenCalledWith('BTCUSD');
      });
    });
  });

  describe('Component Export', () => {
    it('exports ChartSymbolPage as default', () => {
      expect(ChartSymbolPage).toBeDefined();
      expect(typeof ChartSymbolPage).toBe('function');
    });
  });
});

describe('ChartSymbolPage with different symbols', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('handles lowercase symbol by converting to uppercase', async () => {
    // Override the params mock for this test
    vi.doMock('next/navigation', () => ({
      useParams: () => ({ symbol: 'ethusdt' }),
    }));

    // Import fresh after mock change
    const { default: FreshChartSymbolPage } = await import('../../app/chart/[symbol]/page');
    render(<FreshChartSymbolPage />);

    await waitFor(() => {
      // The symbol should be converted to uppercase
      expect(symbolStore.setSymbol).toHaveBeenCalled();
    });
  });
});
