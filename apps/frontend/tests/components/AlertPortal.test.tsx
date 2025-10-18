import AlertPortal from '@/components/AlertPortal';
import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock AlertModal since we're testing the portal wrapper
vi.mock('@/components/AlertModal', () => ({
  default: ({ open, onClose }: { open: boolean; onClose: () => void }) =>
    open ? (
      <div data-testid="alert-modal">
        <div>Alert Modal</div>
        <button onClick={onClose}>Close Alert</button>
      </div>
    ) : null,
}));

describe('AlertPortal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Initial State', () => {
    it('should render without modal initially', () => {
      render(<AlertPortal />);

      const modal = screen.queryByTestId('alert-modal');
      expect(modal).not.toBeInTheDocument();
    });

    it('should not show alert modal by default', () => {
      render(<AlertPortal />);

      expect(screen.queryByText('Alert Modal')).not.toBeInTheDocument();
    });

    it('should return null when closed', () => {
      const { container } = render(<AlertPortal />);

      // Should render nothing initially
      expect(container.firstChild).toBeNull();
    });
  });

  describe('Event Handling', () => {
    it('should open modal when lokifi:open-alert event is dispatched', async () => {
      render(<AlertPortal />);

      // Dispatch the custom event
      window.dispatchEvent(new Event('lokifi:open-alert'));

      await waitFor(() => {
        expect(screen.getByTestId('alert-modal')).toBeInTheDocument();
      });
    });

    it('should show Alert Modal content after event', async () => {
      render(<AlertPortal />);

      window.dispatchEvent(new Event('lokifi:open-alert'));

      await waitFor(() => {
        expect(screen.getByText('Alert Modal')).toBeInTheDocument();
      });
    });

    it('should pass open=true to AlertModal after event', async () => {
      render(<AlertPortal />);

      window.dispatchEvent(new Event('lokifi:open-alert'));

      await waitFor(() => {
        const modal = screen.getByTestId('alert-modal');
        expect(modal).toBeInTheDocument();
      });
    });

    it('should register event listener on mount', () => {
      const addEventListenerSpy = vi.spyOn(window, 'addEventListener');

      render(<AlertPortal />);

      expect(addEventListenerSpy).toHaveBeenCalledWith('lokifi:open-alert', expect.any(Function));
    });

    it('should handle multiple event dispatches', async () => {
      render(<AlertPortal />);

      // First event
      window.dispatchEvent(new Event('lokifi:open-alert'));
      await waitFor(() => {
        expect(screen.getByTestId('alert-modal')).toBeInTheDocument();
      });

      // Second event (should still be open)
      window.dispatchEvent(new Event('lokifi:open-alert'));
      await waitFor(() => {
        expect(screen.getByTestId('alert-modal')).toBeInTheDocument();
      });
    });
  });

  describe('Close Functionality', () => {
    it('should close modal when onClose is called', async () => {
      render(<AlertPortal />);

      // Open the modal
      window.dispatchEvent(new Event('lokifi:open-alert'));

      await waitFor(() => {
        expect(screen.getByTestId('alert-modal')).toBeInTheDocument();
      });

      // Click close button
      const closeButton = screen.getByText('Close Alert');
      closeButton.click();

      await waitFor(() => {
        expect(screen.queryByTestId('alert-modal')).not.toBeInTheDocument();
      });
    });

    it('should pass onClose callback to AlertModal', async () => {
      render(<AlertPortal />);

      window.dispatchEvent(new Event('lokifi:open-alert'));

      await waitFor(() => {
        const closeButton = screen.getByText('Close Alert');
        expect(closeButton).toBeInTheDocument();
      });
    });

    it('should hide modal after closing', async () => {
      render(<AlertPortal />);

      // Open
      window.dispatchEvent(new Event('lokifi:open-alert'));
      await waitFor(() => {
        expect(screen.getByText('Alert Modal')).toBeInTheDocument();
      });

      // Close
      screen.getByText('Close Alert').click();
      await waitFor(() => {
        expect(screen.queryByText('Alert Modal')).not.toBeInTheDocument();
      });
    });
  });

  describe('Cleanup', () => {
    it('should remove event listener on unmount', () => {
      const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');

      const { unmount } = render(<AlertPortal />);

      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        'lokifi:open-alert',
        expect.any(Function)
      );
    });

    it('should not respond to events after unmount', async () => {
      const { unmount } = render(<AlertPortal />);

      unmount();

      // Try to dispatch event after unmount
      window.dispatchEvent(new Event('lokifi:open-alert'));

      // Nothing should render since component is unmounted
      expect(screen.queryByTestId('alert-modal')).not.toBeInTheDocument();
    });

    it('should clean up event listener properly', () => {
      const addSpy = vi.spyOn(window, 'addEventListener');
      const removeSpy = vi.spyOn(window, 'removeEventListener');

      const { unmount } = render(<AlertPortal />);

      const addedHandler = addSpy.mock.calls[0]?.[1];

      unmount();

      const removedHandler = removeSpy.mock.calls[0]?.[1];
      expect(removedHandler).toBe(addedHandler);
    });
  });

  describe('Edge Cases', () => {
    it('should handle rapid open/close cycles', async () => {
      render(<AlertPortal />);

      // Open
      window.dispatchEvent(new Event('lokifi:open-alert'));
      await waitFor(() => {
        expect(screen.getByTestId('alert-modal')).toBeInTheDocument();
      });

      // Close
      screen.getByText('Close Alert').click();

      // Open again quickly
      window.dispatchEvent(new Event('lokifi:open-alert'));
      await waitFor(() => {
        expect(screen.getByTestId('alert-modal')).toBeInTheDocument();
      });
    });

    it('should maintain state independence across instances', () => {
      const { rerender } = render(<AlertPortal />);

      // Rerender should maintain independence
      rerender(<AlertPortal />);

      expect(screen.queryByTestId('alert-modal')).not.toBeInTheDocument();
    });

    it('should use correct event name (lokifi:open-alert)', () => {
      const addEventListenerSpy = vi.spyOn(window, 'addEventListener');

      render(<AlertPortal />);

      // Verify the exact event name
      const calls = addEventListenerSpy.mock.calls;
      const lokifiCall = calls.find((call) => call[0] === 'lokifi:open-alert');
      expect(lokifiCall).toBeDefined();
    });
  });

  describe('Comparison with ReportPortal Pattern', () => {
    it('should follow same portal pattern as ReportPortal', async () => {
      render(<AlertPortal />);

      // Starts closed
      expect(screen.queryByTestId('alert-modal')).not.toBeInTheDocument();

      // Opens on event
      window.dispatchEvent(new Event('lokifi:open-alert'));
      await waitFor(() => {
        expect(screen.getByTestId('alert-modal')).toBeInTheDocument();
      });

      // Closes on button click
      screen.getByText('Close Alert').click();
      await waitFor(() => {
        expect(screen.queryByTestId('alert-modal')).not.toBeInTheDocument();
      });
    });
  });
});
