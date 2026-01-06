import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ChartErrorBoundary } from '../../components/ChartErrorBoundary';

// Mock logger
vi.mock('@/lib/utils/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}));

// Component that throws an error
const ErrorThrower = ({ shouldThrow = true }: { shouldThrow?: boolean }) => {
  if (shouldThrow) {
    throw new Error('Test error message');
  }
  return <div data-testid="child-content">Child rendered successfully</div>;
};

// Prevent console.error from cluttering test output
const originalError = console.error;

describe('ChartErrorBoundary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Suppress React error boundary console.error
    console.error = vi.fn();
  });

  afterEach(() => {
    console.error = originalError;
  });

  describe('Normal Operation', () => {
    it('should render children when no error occurs', () => {
      render(
        <ChartErrorBoundary>
          <div data-testid="child">Test child</div>
        </ChartErrorBoundary>
      );
      expect(screen.getByTestId('child')).toBeInTheDocument();
    });

    it('should not show error UI when children render successfully', () => {
      render(
        <ChartErrorBoundary>
          <div>Normal content</div>
        </ChartErrorBoundary>
      );
      expect(screen.queryByText('Chart Error')).not.toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should catch errors and display error UI', () => {
      render(
        <ChartErrorBoundary>
          <ErrorThrower shouldThrow={true} />
        </ChartErrorBoundary>
      );

      expect(screen.getByText('Chart Error')).toBeInTheDocument();
      expect(screen.getByText('Test error message')).toBeInTheDocument();
    });

    it('should show default error message when error has no message', () => {
      // Component that throws an error without message
      const EmptyErrorThrower = () => {
        throw new Error();
      };

      render(
        <ChartErrorBoundary>
          <EmptyErrorThrower />
        </ChartErrorBoundary>
      );

      expect(screen.getByText('Chart Error')).toBeInTheDocument();
      expect(
        screen.getByText(/An error occurred while rendering the chart/)
      ).toBeInTheDocument();
    });

    it('should log error with logger', async () => {
      const { logger } = await import('@/lib/utils/logger');

      render(
        <ChartErrorBoundary>
          <ErrorThrower shouldThrow={true} />
        </ChartErrorBoundary>
      );

      expect(logger.error).toHaveBeenCalledWith(
        'Chart error boundary caught error',
        expect.objectContaining({
          error: expect.any(Error),
        })
      );
    });
  });

  describe('Custom Fallback', () => {
    it('should render custom fallback when provided', () => {
      render(
        <ChartErrorBoundary fallback={<div data-testid="custom-fallback">Custom error</div>}>
          <ErrorThrower shouldThrow={true} />
        </ChartErrorBoundary>
      );

      expect(screen.getByTestId('custom-fallback')).toBeInTheDocument();
      expect(screen.queryByText('Chart Error')).not.toBeInTheDocument();
    });
  });

  describe('Retry Functionality', () => {
    it('should render retry button', () => {
      render(
        <ChartErrorBoundary>
          <ErrorThrower shouldThrow={true} />
        </ChartErrorBoundary>
      );

      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    });

    it('should call onRetry callback when retry button is clicked', () => {
      const onRetry = vi.fn();

      render(
        <ChartErrorBoundary onRetry={onRetry}>
          <ErrorThrower shouldThrow={true} />
        </ChartErrorBoundary>
      );

      fireEvent.click(screen.getByRole('button', { name: /retry/i }));
      expect(onRetry).toHaveBeenCalledTimes(1);
    });

    it('should reset error state when retry is clicked', () => {
      // Create a controllable error component
      let shouldThrow = true;

      const ControllableErrorThrower = () => {
        if (shouldThrow) {
          throw new Error('Initial error');
        }
        return <div data-testid="recovered">Recovered!</div>;
      };

      const onRetry = () => {
        shouldThrow = false;
      };

      const { rerender } = render(
        <ChartErrorBoundary onRetry={onRetry}>
          <ControllableErrorThrower />
        </ChartErrorBoundary>
      );

      // Initially shows error
      expect(screen.getByText('Chart Error')).toBeInTheDocument();

      // Click retry
      fireEvent.click(screen.getByRole('button', { name: /retry/i }));

      // Need to rerender since state was reset
      rerender(
        <ChartErrorBoundary onRetry={onRetry}>
          <ControllableErrorThrower />
        </ChartErrorBoundary>
      );

      // Now should show recovered content
      expect(screen.getByTestId('recovered')).toBeInTheDocument();
    });
  });

  describe('Error UI Styling', () => {
    it('should render AlertTriangle icon', () => {
      render(
        <ChartErrorBoundary>
          <ErrorThrower shouldThrow={true} />
        </ChartErrorBoundary>
      );

      // lucide icons are rendered as svg
      const container = screen.getByText('Chart Error').closest('.flex');
      expect(container?.querySelector('svg')).toBeInTheDocument();
    });

    it('should have proper container styling', () => {
      render(
        <ChartErrorBoundary>
          <ErrorThrower shouldThrow={true} />
        </ChartErrorBoundary>
      );

      const container = screen.getByText('Chart Error').closest('.flex-col');
      expect(container).toHaveClass('items-center');
      expect(container).toHaveClass('justify-center');
    });

    it('should render RefreshCw icon in retry button', () => {
      render(
        <ChartErrorBoundary>
          <ErrorThrower shouldThrow={true} />
        </ChartErrorBoundary>
      );

      const retryButton = screen.getByRole('button', { name: /retry/i });
      expect(retryButton.querySelector('svg')).toBeInTheDocument();
    });
  });

  describe('Multiple Children', () => {
    it('should handle multiple children', () => {
      render(
        <ChartErrorBoundary>
          <div data-testid="child-1">Child 1</div>
          <div data-testid="child-2">Child 2</div>
        </ChartErrorBoundary>
      );

      expect(screen.getByTestId('child-1')).toBeInTheDocument();
      expect(screen.getByTestId('child-2')).toBeInTheDocument();
    });
  });
});
