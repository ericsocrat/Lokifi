import DataStatus from '@/components/DataStatus';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

describe('DataStatus', () => {
  describe('Rendering', () => {
    it('should render all data fields', () => {
      render(<DataStatus provider="Binance" symbol="BTCUSD" timeframe="1h" />);

      expect(screen.getByText('Data')).toBeInTheDocument();
      expect(screen.getByText('provider:')).toBeInTheDocument();
      expect(screen.getByText('Binance')).toBeInTheDocument();
      expect(screen.getByText('symbol:')).toBeInTheDocument();
      expect(screen.getByText('BTCUSD')).toBeInTheDocument();
      expect(screen.getByText('tf:')).toBeInTheDocument();
      expect(screen.getByText('1h')).toBeInTheDocument();
    });

    it('should render with different provider', () => {
      render(<DataStatus provider="Coinbase" symbol="ETHUSD" timeframe="4h" />);

      expect(screen.getByText('Coinbase')).toBeInTheDocument();
      expect(screen.getByText('ETHUSD')).toBeInTheDocument();
      expect(screen.getByText('4h')).toBeInTheDocument();
    });

    it('should render with empty strings', () => {
      render(<DataStatus provider="" symbol="" timeframe="" />);

      expect(screen.getByText('Data')).toBeInTheDocument();
      expect(screen.getByText('provider:')).toBeInTheDocument();
      expect(screen.getByText('symbol:')).toBeInTheDocument();
      expect(screen.getByText('tf:')).toBeInTheDocument();
    });

    it('should render with special characters', () => {
      render(<DataStatus provider="Test-Provider_123" symbol="BTC/USD" timeframe="1h-test" />);

      expect(screen.getByText('Test-Provider_123')).toBeInTheDocument();
      expect(screen.getByText('BTC/USD')).toBeInTheDocument();
      expect(screen.getByText('1h-test')).toBeInTheDocument();
    });

    it('should render with long strings', () => {
      const longProvider = 'A'.repeat(100);
      const longSymbol = 'B'.repeat(100);
      const longTimeframe = 'C'.repeat(100);

      render(<DataStatus provider={longProvider} symbol={longSymbol} timeframe={longTimeframe} />);

      expect(screen.getByText(longProvider)).toBeInTheDocument();
      expect(screen.getByText(longSymbol)).toBeInTheDocument();
      expect(screen.getByText(longTimeframe)).toBeInTheDocument();
    });
  });

  describe('Props', () => {
    it('should update when props change', () => {
      const { rerender } = render(<DataStatus provider="Initial" symbol="BTC" timeframe="1h" />);

      expect(screen.getByText('Initial')).toBeInTheDocument();
      expect(screen.getByText('BTC')).toBeInTheDocument();

      rerender(<DataStatus provider="Updated" symbol="ETH" timeframe="4h" />);

      expect(screen.queryByText('Initial')).not.toBeInTheDocument();
      expect(screen.queryByText('BTC')).not.toBeInTheDocument();
      expect(screen.getByText('Updated')).toBeInTheDocument();
      expect(screen.getByText('ETH')).toBeInTheDocument();
      expect(screen.getByText('4h')).toBeInTheDocument();
    });

    it('should handle prop updates to empty strings', () => {
      const { rerender } = render(<DataStatus provider="Binance" symbol="BTCUSD" timeframe="1h" />);

      expect(screen.getByText('Binance')).toBeInTheDocument();

      rerender(<DataStatus provider="" symbol="" timeframe="" />);

      expect(screen.queryByText('Binance')).not.toBeInTheDocument();
      expect(screen.queryByText('BTCUSD')).not.toBeInTheDocument();
      expect(screen.queryByText('1h')).not.toBeInTheDocument();
    });
  });

  describe('Structure', () => {
    it('should have correct container element', () => {
      const { container } = render(
        <DataStatus provider="Binance" symbol="BTCUSD" timeframe="1h" />
      );

      const dataStatus = container.firstChild as HTMLElement;
      expect(dataStatus).toBeInTheDocument();
      expect(dataStatus.tagName).toBe('DIV');
    });

    it('should render Data label', () => {
      render(<DataStatus provider="Binance" symbol="BTCUSD" timeframe="1h" />);

      const dataLabel = screen.getByText('Data');
      expect(dataLabel).toBeInTheDocument();
      expect(dataLabel.tagName).toBe('DIV');
    });

    it('should render all three data rows', () => {
      const { container } = render(
        <DataStatus provider="Binance" symbol="BTCUSD" timeframe="1h" />
      );

      // Should have 4 divs total: container + 3 data rows + 1 label
      const divs = container.querySelectorAll('div');
      expect(divs.length).toBeGreaterThanOrEqual(4);
    });
  });

  describe('Edge Cases', () => {
    it('should render with numeric values as strings', () => {
      render(<DataStatus provider="123" symbol="456" timeframe="789" />);

      expect(screen.getByText('123')).toBeInTheDocument();
      expect(screen.getByText('456')).toBeInTheDocument();
      expect(screen.getByText('789')).toBeInTheDocument();
    });

    it('should render with unicode characters', () => {
      render(<DataStatus provider="Provider™" symbol="BTC€USD" timeframe="1h→4h" />);

      expect(screen.getByText('Provider™')).toBeInTheDocument();
      expect(screen.getByText('BTC€USD')).toBeInTheDocument();
      expect(screen.getByText('1h→4h')).toBeInTheDocument();
    });

    it('should render with whitespace in values', () => {
      const { container } = render(
        <DataStatus provider="Binance Pro" symbol="BTC USD" timeframe="1 h" />
      );

      // Values with spaces should render correctly
      expect(screen.getByText(/Binance Pro/)).toBeInTheDocument();
      expect(screen.getByText(/BTC USD/)).toBeInTheDocument();
      expect(screen.getByText(/1 h/)).toBeInTheDocument();
    });

    it('should handle multiple components rendering independently', () => {
      const { container } = render(
        <>
          <DataStatus provider="Provider1" symbol="BTC" timeframe="1h" />
          <DataStatus provider="Provider2" symbol="ETH" timeframe="4h" />
        </>
      );

      expect(screen.getByText('Provider1')).toBeInTheDocument();
      expect(screen.getByText('Provider2')).toBeInTheDocument();
      expect(screen.getByText('BTC')).toBeInTheDocument();
      expect(screen.getByText('ETH')).toBeInTheDocument();

      // Should have 2 separate components
      const allDataLabels = screen.getAllByText('Data');
      expect(allDataLabels).toHaveLength(2);
    });
  });
});
