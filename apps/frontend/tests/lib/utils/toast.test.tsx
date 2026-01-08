import { toast, ToastHost } from '@/lib/utils/toast';
import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('toast utility', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('ToastHost', () => {
    it('renders without crashing', () => {
      render(<ToastHost />);
      // Should render the container div
      const container = document.querySelector('.fixed');
      expect(container).toBeInTheDocument();
    });

    it('renders empty when no toasts', () => {
      render(<ToastHost />);
      // Should have no visible toast messages
      expect(screen.queryByText(/./)).not.toBeInTheDocument();
    });

    it('displays toast message when toast() is called', async () => {
      render(<ToastHost />);

      act(() => {
        toast('Test message');
      });

      expect(screen.getByText('Test message')).toBeInTheDocument();
    });

    it('displays multiple toasts', () => {
      render(<ToastHost />);

      act(() => {
        toast('First message');
        toast('Second message');
      });

      expect(screen.getByText('First message')).toBeInTheDocument();
      expect(screen.getByText('Second message')).toBeInTheDocument();
    });

    it('removes toast after default TTL (1200ms)', async () => {
      render(<ToastHost />);

      act(() => {
        toast('Temporary message');
      });

      expect(screen.getByText('Temporary message')).toBeInTheDocument();

      // Advance time past the default TTL
      act(() => {
        vi.advanceTimersByTime(1200);
      });

      expect(screen.queryByText('Temporary message')).not.toBeInTheDocument();
    });

    it('removes toast after custom TTL', async () => {
      render(<ToastHost />);

      act(() => {
        toast('Short-lived message', 500);
      });

      expect(screen.getByText('Short-lived message')).toBeInTheDocument();

      // Advance time to just before TTL
      act(() => {
        vi.advanceTimersByTime(499);
      });

      expect(screen.getByText('Short-lived message')).toBeInTheDocument();

      // Advance time past TTL
      act(() => {
        vi.advanceTimersByTime(2);
      });

      expect(screen.queryByText('Short-lived message')).not.toBeInTheDocument();
    });

    it('handles multiple toasts with different TTLs', () => {
      render(<ToastHost />);

      act(() => {
        toast('Long message', 2000);
        toast('Short message', 500);
      });

      expect(screen.getByText('Long message')).toBeInTheDocument();
      expect(screen.getByText('Short message')).toBeInTheDocument();

      // Advance past short TTL
      act(() => {
        vi.advanceTimersByTime(501);
      });

      expect(screen.getByText('Long message')).toBeInTheDocument();
      expect(screen.queryByText('Short message')).not.toBeInTheDocument();

      // Advance past long TTL
      act(() => {
        vi.advanceTimersByTime(1500);
      });

      expect(screen.queryByText('Long message')).not.toBeInTheDocument();
    });

    it('cleans up listener on unmount', () => {
      const { unmount } = render(<ToastHost />);

      act(() => {
        toast('Before unmount');
      });

      expect(screen.getByText('Before unmount')).toBeInTheDocument();

      unmount();

      // Re-render and toast again - should not see old messages
      render(<ToastHost />);

      act(() => {
        toast('After remount');
      });

      expect(screen.queryByText('Before unmount')).not.toBeInTheDocument();
      expect(screen.getByText('After remount')).toBeInTheDocument();
    });
  });

  describe('toast function', () => {
    it('assigns unique IDs to each toast', () => {
      render(<ToastHost />);

      act(() => {
        toast('First');
        toast('Second');
      });

      // Both should be visible (unique IDs prevent overwriting)
      expect(screen.getByText('First')).toBeInTheDocument();
      expect(screen.getByText('Second')).toBeInTheDocument();
    });

    it('uses default TTL of 1200ms', () => {
      render(<ToastHost />);

      act(() => {
        toast('Default TTL');
      });

      // Should still be visible at 1199ms
      act(() => {
        vi.advanceTimersByTime(1199);
      });

      expect(screen.getByText('Default TTL')).toBeInTheDocument();

      // Should be gone at 1200ms
      act(() => {
        vi.advanceTimersByTime(2);
      });

      expect(screen.queryByText('Default TTL')).not.toBeInTheDocument();
    });

    it('handles empty string message', () => {
      render(<ToastHost />);

      act(() => {
        toast('');
      });

      // Empty toast should still create an element
      const container = document.querySelector('.fixed');
      expect(container?.children.length).toBe(1);
    });

    it('handles special characters in message', () => {
      render(<ToastHost />);

      act(() => {
        toast('<script>alert("xss")</script>');
      });

      // Should render as text, not execute
      expect(screen.getByText('<script>alert("xss")</script>')).toBeInTheDocument();
    });

    it('handles very long messages', () => {
      render(<ToastHost />);
      const longMessage = 'A'.repeat(1000);

      act(() => {
        toast(longMessage);
      });

      expect(screen.getByText(longMessage)).toBeInTheDocument();
    });

    it('handles rapid sequential toasts', () => {
      render(<ToastHost />);

      act(() => {
        for (let i = 0; i < 10; i++) {
          toast(`Message ${i}`);
        }
      });

      // All 10 should be visible
      for (let i = 0; i < 10; i++) {
        expect(screen.getByText(`Message ${i}`)).toBeInTheDocument();
      }
    });
  });

  describe('ToastHost styling', () => {
    it('applies correct positioning classes', () => {
      render(<ToastHost />);

      const container = document.querySelector('.fixed');
      expect(container).toHaveClass('bottom-4');
      expect(container).toHaveClass('right-4');
      expect(container).toHaveClass('z-[999]');
    });

    it('applies correct toast styling', () => {
      render(<ToastHost />);

      act(() => {
        toast('Styled toast');
      });

      const toastElement = screen.getByText('Styled toast');
      expect(toastElement).toHaveClass('rounded-md');
      expect(toastElement).toHaveClass('shadow');
    });
  });

  describe('edge cases', () => {
    it('handles toast called before ToastHost mounts', () => {
      // Toast called before render - should be ignored (no listener)
      toast('Before mount');

      render(<ToastHost />);

      // Should not show the pre-mount toast
      expect(screen.queryByText('Before mount')).not.toBeInTheDocument();

      // But should show toasts after mount
      act(() => {
        toast('After mount');
      });

      expect(screen.getByText('After mount')).toBeInTheDocument();
    });

    it('handles multiple ToastHost instances', () => {
      const { container: container1 } = render(<ToastHost />);
      const { container: container2 } = render(<ToastHost />);

      act(() => {
        toast('Dual host message');
      });

      // Both hosts should show the message
      expect(container1.querySelector('[class*="rounded-md"]')).toBeInTheDocument();
      expect(container2.querySelector('[class*="rounded-md"]')).toBeInTheDocument();
    });

    it('handles TTL of 0', () => {
      render(<ToastHost />);

      act(() => {
        toast('Instant disappear', 0);
      });

      // Should appear briefly
      expect(screen.getByText('Instant disappear')).toBeInTheDocument();

      // Should disappear immediately after next tick
      act(() => {
        vi.advanceTimersByTime(1);
      });

      expect(screen.queryByText('Instant disappear')).not.toBeInTheDocument();
    });
  });
});
