import ReportPortal from '@/components/ReportPortal';
import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock ReportComposer since we're testing the portal wrapper
vi.mock('@/components/ReportComposer', () => ({
  default: ({ open, onClose }: { open: boolean; onClose: () => void }) =>
    open ? (
      <div data-testid="report-composer">
        <div>Report Composer</div>
        <button onClick={onClose}>Close</button>
      </div>
    ) : null,
}));

describe('ReportPortal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Initial State', () => {
    it('should render without composer initially', () => {
      render(<ReportPortal />);

      const composer = screen.queryByTestId('report-composer');
      expect(composer).not.toBeInTheDocument();
    });

    it('should not show report composer by default', () => {
      render(<ReportPortal />);

      expect(screen.queryByText('Report Composer')).not.toBeInTheDocument();
    });

    it('should return null when closed', () => {
      const { container } = render(<ReportPortal />);

      // Should render nothing initially
      expect(container.firstChild).toBeNull();
    });
  });

  describe('Event Handling', () => {
    it('should open composer when lokifi:open-report event is dispatched', async () => {
      render(<ReportPortal />);

      // Dispatch the custom event
      window.dispatchEvent(new Event('lokifi:open-report'));

      await waitFor(() => {
        expect(screen.getByTestId('report-composer')).toBeInTheDocument();
      });
    });

    it('should show Report Composer content after event', async () => {
      render(<ReportPortal />);

      window.dispatchEvent(new Event('lokifi:open-report'));

      await waitFor(() => {
        expect(screen.getByText('Report Composer')).toBeInTheDocument();
      });
    });

    it('should pass open=true to ReportComposer after event', async () => {
      render(<ReportPortal />);

      window.dispatchEvent(new Event('lokifi:open-report'));

      await waitFor(() => {
        const composer = screen.getByTestId('report-composer');
        expect(composer).toBeInTheDocument();
      });
    });

    it('should register event listener on mount', () => {
      const addEventListenerSpy = vi.spyOn(window, 'addEventListener');

      render(<ReportPortal />);

      expect(addEventListenerSpy).toHaveBeenCalledWith('lokifi:open-report', expect.any(Function));
    });

    it('should handle multiple event dispatches', async () => {
      render(<ReportPortal />);

      // First event
      window.dispatchEvent(new Event('lokifi:open-report'));
      await waitFor(() => {
        expect(screen.getByTestId('report-composer')).toBeInTheDocument();
      });

      // Second event (should still be open)
      window.dispatchEvent(new Event('lokifi:open-report'));
      await waitFor(() => {
        expect(screen.getByTestId('report-composer')).toBeInTheDocument();
      });
    });
  });

  describe('Close Functionality', () => {
    it('should close composer when onClose is called', async () => {
      render(<ReportPortal />);

      // Open the composer
      window.dispatchEvent(new Event('lokifi:open-report'));

      await waitFor(() => {
        expect(screen.getByTestId('report-composer')).toBeInTheDocument();
      });

      // Click close button
      const closeButton = screen.getByText('Close');
      closeButton.click();

      await waitFor(() => {
        expect(screen.queryByTestId('report-composer')).not.toBeInTheDocument();
      });
    });

    it('should pass onClose callback to ReportComposer', async () => {
      render(<ReportPortal />);

      window.dispatchEvent(new Event('lokifi:open-report'));

      await waitFor(() => {
        const closeButton = screen.getByText('Close');
        expect(closeButton).toBeInTheDocument();
      });
    });

    it('should hide composer after closing', async () => {
      render(<ReportPortal />);

      // Open
      window.dispatchEvent(new Event('lokifi:open-report'));
      await waitFor(() => {
        expect(screen.getByText('Report Composer')).toBeInTheDocument();
      });

      // Close
      screen.getByText('Close').click();
      await waitFor(() => {
        expect(screen.queryByText('Report Composer')).not.toBeInTheDocument();
      });
    });
  });

  describe('Cleanup', () => {
    it('should remove event listener on unmount', () => {
      const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');

      const { unmount } = render(<ReportPortal />);

      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        'lokifi:open-report',
        expect.any(Function)
      );
    });

    it('should not respond to events after unmount', async () => {
      const { unmount } = render(<ReportPortal />);

      unmount();

      // Try to dispatch event after unmount
      window.dispatchEvent(new Event('lokifi:open-report'));

      // Nothing should render since component is unmounted
      expect(screen.queryByTestId('report-composer')).not.toBeInTheDocument();
    });

    it('should clean up event listener properly', () => {
      const addSpy = vi.spyOn(window, 'addEventListener');
      const removeSpy = vi.spyOn(window, 'removeEventListener');

      const { unmount } = render(<ReportPortal />);

      const addedHandler = addSpy.mock.calls[0]?.[1];

      unmount();

      const removedHandler = removeSpy.mock.calls[0]?.[1];
      expect(removedHandler).toBe(addedHandler);
    });
  });

  describe('Edge Cases', () => {
    it('should handle rapid open/close cycles', async () => {
      render(<ReportPortal />);

      // Open
      window.dispatchEvent(new Event('lokifi:open-report'));
      await waitFor(() => {
        expect(screen.getByTestId('report-composer')).toBeInTheDocument();
      });

      // Close
      screen.getByText('Close').click();

      // Open again quickly
      window.dispatchEvent(new Event('lokifi:open-report'));
      await waitFor(() => {
        expect(screen.getByTestId('report-composer')).toBeInTheDocument();
      });
    });

    it('should maintain state independence across instances', () => {
      const { rerender } = render(<ReportPortal />);

      // Rerender should maintain independence
      rerender(<ReportPortal />);

      expect(screen.queryByTestId('report-composer')).not.toBeInTheDocument();
    });
  });
});
