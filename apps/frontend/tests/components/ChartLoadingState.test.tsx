import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ChartLoadingState } from '../../components/ChartLoadingState';

describe('ChartLoadingState', () => {
  describe('Rendering', () => {
    it('should render the loading container', () => {
      render(<ChartLoadingState />);
      expect(screen.getByText('Loading Chart')).toBeInTheDocument();
    });

    it('should render default message when no props provided', () => {
      render(<ChartLoadingState />);
      expect(screen.getByText('Fetching market data...')).toBeInTheDocument();
    });
  });

  describe('Custom Messages', () => {
    it('should display symbol in loading message', () => {
      render(<ChartLoadingState symbol="BTCUSD" />);
      expect(screen.getByText('Fetching BTCUSD data...')).toBeInTheDocument();
    });

    it('should display timeframe in loading message', () => {
      render(<ChartLoadingState symbol="AAPL" timeframe="1h" />);
      expect(screen.getByText('Fetching AAPL data (1h)...')).toBeInTheDocument();
    });

    it('should display timeframe without symbol', () => {
      render(<ChartLoadingState timeframe="4h" />);
      expect(screen.getByText('Fetching market data (4h)...')).toBeInTheDocument();
    });

    it('should display custom message when provided', () => {
      const customMessage = 'Connecting to WebSocket...';
      render(<ChartLoadingState message={customMessage} />);
      expect(screen.getByText(customMessage)).toBeInTheDocument();
    });

    it('should prefer custom message over generated message', () => {
      render(<ChartLoadingState symbol="BTCUSD" timeframe="1h" message="Custom loading..." />);
      expect(screen.getByText('Custom loading...')).toBeInTheDocument();
      expect(screen.queryByText(/Fetching BTCUSD/)).not.toBeInTheDocument();
    });
  });

  describe('Loading Animation', () => {
    it('should have spinning loader', () => {
      const { container } = render(<ChartLoadingState />);
      const spinner = container.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });
  });

  describe('Styling', () => {
    it('should have proper container styling', () => {
      const { container } = render(<ChartLoadingState />);
      const container_el = container.querySelector('.bg-neutral-900.rounded-2xl');
      expect(container_el).toBeInTheDocument();
    });

    it('should have border styling', () => {
      const { container } = render(<ChartLoadingState />);
      const container_el = container.querySelector('.border.border-neutral-800');
      expect(container_el).toBeInTheDocument();
    });

    it('should center content', () => {
      const { container } = render(<ChartLoadingState />);
      const flexContainer = container.querySelector('.flex.flex-col.items-center.justify-center');
      expect(flexContainer).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have heading for loading state', () => {
      render(<ChartLoadingState />);
      expect(screen.getByRole('heading', { level: 3, name: /loading chart/i })).toBeInTheDocument();
    });
  });
});
