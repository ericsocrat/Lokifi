/**
 * ToastProvider Tests
 *
 * Tests for the ToastProvider context and toast notification system.
 * Covers toast creation, rendering, auto-dismiss, and type variations.
 */

import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ToastProvider, useToast } from '@/components/dashboard/ToastProvider';

// Test component that uses the toast hook
function TestComponent() {
  const toast = useToast();
  return (
    <div>
      <button onClick={() => toast.success('Success message')}>Show Success</button>
      <button onClick={() => toast.error('Error message')}>Show Error</button>
      <button onClick={() => toast.warning('Warning message')}>Show Warning</button>
      <button onClick={() => toast.info('Info message')}>Show Info</button>
      <button onClick={() => toast.addToast('Custom toast', 'success', 0)}>Permanent Toast</button>
      <div data-testid="toast-count">{toast.toasts.length}</div>
    </div>
  );
}

// Context capture component for direct API testing
function ContextCapture({ onCapture }: { onCapture: (ctx: ReturnType<typeof useToast>) => void }) {
  const ctx = useToast();
  onCapture(ctx);
  return null;
}

describe('ToastProvider', () => {
  describe('Context Setup', () => {
    it('renders children correctly', () => {
      render(
        <ToastProvider>
          <div data-testid="child">Child content</div>
        </ToastProvider>
      );

      expect(screen.getByTestId('child')).toHaveTextContent('Child content');
    });

    it('throws error when useToast is used outside provider', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      function BadComponent() {
        useToast();
        return null;
      }

      expect(() => render(<BadComponent />)).toThrow(
        'useToast must be used within a ToastProvider'
      );

      consoleSpy.mockRestore();
    });

    it('provides toast context to children', () => {
      render(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>
      );

      expect(screen.getByTestId('toast-count')).toHaveTextContent('0');
    });
  });

  describe('Toast Creation via API', () => {
    it('creates success toast', () => {
      let ctx: ReturnType<typeof useToast>;

      render(
        <ToastProvider>
          <ContextCapture onCapture={(c) => (ctx = c)} />
        </ToastProvider>
      );

      act(() => {
        ctx.success('Success message');
      });

      expect(screen.getByText('Success message')).toBeInTheDocument();
    });

    it('creates error toast', () => {
      let ctx: ReturnType<typeof useToast>;

      render(
        <ToastProvider>
          <ContextCapture onCapture={(c) => (ctx = c)} />
        </ToastProvider>
      );

      act(() => {
        ctx.error('Error message');
      });

      expect(screen.getByText('Error message')).toBeInTheDocument();
    });

    it('creates warning toast', () => {
      let ctx: ReturnType<typeof useToast>;

      render(
        <ToastProvider>
          <ContextCapture onCapture={(c) => (ctx = c)} />
        </ToastProvider>
      );

      act(() => {
        ctx.warning('Warning message');
      });

      expect(screen.getByText('Warning message')).toBeInTheDocument();
    });

    it('creates info toast', () => {
      let ctx: ReturnType<typeof useToast>;

      render(
        <ToastProvider>
          <ContextCapture onCapture={(c) => (ctx = c)} />
        </ToastProvider>
      );

      act(() => {
        ctx.info('Info message');
      });

      expect(screen.getByText('Info message')).toBeInTheDocument();
    });

    it('creates multiple toasts', () => {
      let ctx: ReturnType<typeof useToast>;

      render(
        <ToastProvider>
          <ContextCapture onCapture={(c) => (ctx = c)} />
        </ToastProvider>
      );

      act(() => {
        ctx.success('Toast 1', 0);
        ctx.error('Toast 2', 0);
        ctx.warning('Toast 3', 0);
      });

      expect(screen.getByText('Toast 1')).toBeInTheDocument();
      expect(screen.getByText('Toast 2')).toBeInTheDocument();
      expect(screen.getByText('Toast 3')).toBeInTheDocument();
      expect(ctx.toasts.length).toBe(3);
    });
  });

  describe('Toast Styling', () => {
    it('applies success styling (green)', () => {
      let ctx: ReturnType<typeof useToast>;

      render(
        <ToastProvider>
          <ContextCapture onCapture={(c) => (ctx = c)} />
        </ToastProvider>
      );

      act(() => {
        ctx.success('Success toast', 0);
      });

      const toastOuter = screen.getByText('Success toast').closest('[class*="rounded-lg"]');
      expect(toastOuter?.className).toMatch(/green/);
    });

    it('applies error styling (red)', () => {
      let ctx: ReturnType<typeof useToast>;

      render(
        <ToastProvider>
          <ContextCapture onCapture={(c) => (ctx = c)} />
        </ToastProvider>
      );

      act(() => {
        ctx.error('Error toast', 0);
      });

      const toastOuter = screen.getByText('Error toast').closest('[class*="rounded-lg"]');
      expect(toastOuter?.className).toMatch(/red/);
    });

    it('applies warning styling (yellow)', () => {
      let ctx: ReturnType<typeof useToast>;

      render(
        <ToastProvider>
          <ContextCapture onCapture={(c) => (ctx = c)} />
        </ToastProvider>
      );

      act(() => {
        ctx.warning('Warning toast', 0);
      });

      const toastOuter = screen.getByText('Warning toast').closest('[class*="rounded-lg"]');
      expect(toastOuter?.className).toMatch(/yellow/);
    });

    it('applies info styling (blue)', () => {
      let ctx: ReturnType<typeof useToast>;

      render(
        <ToastProvider>
          <ContextCapture onCapture={(c) => (ctx = c)} />
        </ToastProvider>
      );

      act(() => {
        ctx.info('Info toast', 0);
      });

      const toastOuter = screen.getByText('Info toast').closest('[class*="rounded-lg"]');
      expect(toastOuter?.className).toMatch(/blue/);
    });
  });

  describe('Auto-Dismiss (with fake timers)', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.runOnlyPendingTimers();
      vi.useRealTimers();
    });

    it('auto-dismisses toast after default duration', async () => {
      let ctx: ReturnType<typeof useToast>;

      render(
        <ToastProvider>
          <ContextCapture onCapture={(c) => (ctx = c)} />
        </ToastProvider>
      );

      act(() => {
        ctx.success('Auto dismiss test');
      });

      expect(screen.getByText('Auto dismiss test')).toBeInTheDocument();

      act(() => {
        vi.advanceTimersByTime(5000);
      });

      expect(screen.queryByText('Auto dismiss test')).not.toBeInTheDocument();
    });

    it('does not auto-dismiss toast with duration 0', () => {
      let ctx: ReturnType<typeof useToast>;

      render(
        <ToastProvider>
          <ContextCapture onCapture={(c) => (ctx = c)} />
        </ToastProvider>
      );

      act(() => {
        ctx.addToast('Permanent toast', 'info', 0);
      });

      expect(screen.getByText('Permanent toast')).toBeInTheDocument();

      act(() => {
        vi.advanceTimersByTime(10000);
      });

      expect(screen.getByText('Permanent toast')).toBeInTheDocument();
    });

    it('respects custom duration', () => {
      let ctx: ReturnType<typeof useToast>;

      render(
        <ToastProvider>
          <ContextCapture onCapture={(c) => (ctx = c)} />
        </ToastProvider>
      );

      act(() => {
        ctx.success('Custom duration', 2000);
      });

      expect(screen.getByText('Custom duration')).toBeInTheDocument();

      act(() => {
        vi.advanceTimersByTime(1500);
      });

      // Still present
      expect(screen.getByText('Custom duration')).toBeInTheDocument();

      act(() => {
        vi.advanceTimersByTime(600);
      });

      // Now gone
      expect(screen.queryByText('Custom duration')).not.toBeInTheDocument();
    });
  });

  describe('Manual Dismiss', () => {
    it('removes toast via removeToast', () => {
      let ctx: ReturnType<typeof useToast>;

      render(
        <ToastProvider>
          <ContextCapture onCapture={(c) => (ctx = c)} />
        </ToastProvider>
      );

      act(() => {
        ctx.addToast('Removable toast', 'info', 0);
      });

      expect(screen.getByText('Removable toast')).toBeInTheDocument();
      const toastId = ctx.toasts[0].id;

      act(() => {
        ctx.removeToast(toastId);
      });

      expect(screen.queryByText('Removable toast')).not.toBeInTheDocument();
    });

    it('removes only the targeted toast', () => {
      let ctx: ReturnType<typeof useToast>;

      render(
        <ToastProvider>
          <ContextCapture onCapture={(c) => (ctx = c)} />
        </ToastProvider>
      );

      act(() => {
        ctx.addToast('First toast', 'info', 0);
        ctx.addToast('Second toast', 'info', 0);
      });

      const firstId = ctx.toasts[0].id;

      act(() => {
        ctx.removeToast(firstId);
      });

      expect(screen.queryByText('First toast')).not.toBeInTheDocument();
      expect(screen.getByText('Second toast')).toBeInTheDocument();
    });

    it('handles removal of non-existent toast gracefully', () => {
      let ctx: ReturnType<typeof useToast>;

      render(
        <ToastProvider>
          <ContextCapture onCapture={(c) => (ctx = c)} />
        </ToastProvider>
      );

      expect(() => {
        act(() => {
          ctx.removeToast('non-existent-id');
        });
      }).not.toThrow();
    });
  });

  describe('addToast Method', () => {
    it('accepts custom message', () => {
      let ctx: ReturnType<typeof useToast>;

      render(
        <ToastProvider>
          <ContextCapture onCapture={(c) => (ctx = c)} />
        </ToastProvider>
      );

      act(() => {
        ctx.addToast('My custom message', 'info', 0);
      });

      expect(screen.getByText('My custom message')).toBeInTheDocument();
    });

    it('defaults to info type when type is not specified', () => {
      let ctx: ReturnType<typeof useToast>;

      render(
        <ToastProvider>
          <ContextCapture onCapture={(c) => (ctx = c)} />
        </ToastProvider>
      );

      act(() => {
        ctx.addToast('Default type toast');
      });

      const toastOuter = screen.getByText('Default type toast').closest('[class*="rounded-lg"]');
      expect(toastOuter?.className).toMatch(/blue/);
    });

    it('stores toast data correctly', () => {
      let ctx: ReturnType<typeof useToast>;

      render(
        <ToastProvider>
          <ContextCapture onCapture={(c) => (ctx = c)} />
        </ToastProvider>
      );

      act(() => {
        ctx.addToast('Test message', 'warning', 0);
      });

      expect(ctx.toasts[0]).toMatchObject({
        message: 'Test message',
        type: 'warning',
        duration: 0,
      });
      expect(ctx.toasts[0].id).toBeDefined();
    });
  });

  describe('Toast Container', () => {
    it('renders toast container at bottom-right', () => {
      render(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>
      );

      const containers = document.querySelectorAll('.fixed.bottom-4.right-4');
      expect(containers.length).toBeGreaterThanOrEqual(1);
    });

    it('renders toasts in a stacked layout', () => {
      let ctx: ReturnType<typeof useToast>;

      render(
        <ToastProvider>
          <ContextCapture onCapture={(c) => (ctx = c)} />
        </ToastProvider>
      );

      act(() => {
        ctx.addToast('Toast 1', 'info', 0);
        ctx.addToast('Toast 2', 'info', 0);
      });

      const toastContainer = document.querySelector('.fixed.bottom-4.right-4');
      const toasts = toastContainer?.querySelectorAll('[class*="rounded-lg"]');
      expect(toasts?.length).toBe(2);
    });
  });

  describe('Toast Uniqueness', () => {
    it('generates unique ids for each toast', () => {
      let ctx: ReturnType<typeof useToast>;

      render(
        <ToastProvider>
          <ContextCapture onCapture={(c) => (ctx = c)} />
        </ToastProvider>
      );

      act(() => {
        ctx.addToast('Toast 1', 'info', 0);
        ctx.addToast('Toast 2', 'info', 0);
        ctx.addToast('Toast 3', 'info', 0);
      });

      const ids = ctx.toasts.map((t) => t.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(3);
    });
  });

  describe('User Interaction', () => {
    it('closes toast via close button click', async () => {
      const user = userEvent.setup();
      let ctx: ReturnType<typeof useToast>;

      render(
        <ToastProvider>
          <ContextCapture onCapture={(c) => (ctx = c)} />
        </ToastProvider>
      );

      act(() => {
        ctx.addToast('Click to close', 'info', 0);
      });

      expect(screen.getByText('Click to close')).toBeInTheDocument();

      // Find the close button in the toast
      const toastContainer = screen.getByText('Click to close').closest('[class*="rounded-lg"]');
      const closeButton = toastContainer?.querySelector('button');

      if (closeButton) {
        await user.click(closeButton);
      }

      await waitFor(() => {
        expect(screen.queryByText('Click to close')).not.toBeInTheDocument();
      });
    });

    it('button click creates toast', async () => {
      const user = userEvent.setup();

      render(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>
      );

      await user.click(screen.getByText('Show Success'));

      expect(screen.getByText('Success message')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('handles empty message', () => {
      let ctx: ReturnType<typeof useToast>;

      render(
        <ToastProvider>
          <ContextCapture onCapture={(c) => (ctx = c)} />
        </ToastProvider>
      );

      act(() => {
        ctx.addToast('', 'info', 0);
      });

      expect(ctx.toasts.length).toBe(1);
    });

    it('handles very long message', () => {
      let ctx: ReturnType<typeof useToast>;

      render(
        <ToastProvider>
          <ContextCapture onCapture={(c) => (ctx = c)} />
        </ToastProvider>
      );

      const longMessage = 'A'.repeat(1000);

      act(() => {
        ctx.addToast(longMessage, 'info', 0);
      });

      expect(screen.getByText(longMessage)).toBeInTheDocument();
    });

    it('handles rapid toast creation', () => {
      let ctx: ReturnType<typeof useToast>;

      render(
        <ToastProvider>
          <ContextCapture onCapture={(c) => (ctx = c)} />
        </ToastProvider>
      );

      act(() => {
        for (let i = 0; i < 10; i++) {
          ctx.addToast(`Toast ${i}`, 'info', 0);
        }
      });

      expect(ctx.toasts.length).toBe(10);
    });

    it('handles special characters in message', () => {
      let ctx: ReturnType<typeof useToast>;

      render(
        <ToastProvider>
          <ContextCapture onCapture={(c) => (ctx = c)} />
        </ToastProvider>
      );

      const specialMessage = '<script>alert("xss")</script> & "quotes" \'apostrophe\'';

      act(() => {
        ctx.addToast(specialMessage, 'info', 0);
      });

      // React escapes HTML by default
      expect(screen.getByText(specialMessage)).toBeInTheDocument();
    });

    it('handles unicode characters', () => {
      let ctx: ReturnType<typeof useToast>;

      render(
        <ToastProvider>
          <ContextCapture onCapture={(c) => (ctx = c)} />
        </ToastProvider>
      );

      const unicodeMessage = '✅ Success! 🎉 日本語';

      act(() => {
        ctx.addToast(unicodeMessage, 'success', 0);
      });

      expect(screen.getByText(unicodeMessage)).toBeInTheDocument();
    });
  });

  describe('Toast Types Export', () => {
    it('exports ToastType union', () => {
      let ctx: ReturnType<typeof useToast>;

      render(
        <ToastProvider>
          <ContextCapture onCapture={(c) => (ctx = c)} />
        </ToastProvider>
      );

      // Test all 4 toast types work
      const types = ['success', 'error', 'info', 'warning'] as const;

      act(() => {
        types.forEach((type) => {
          ctx.addToast(`${type} toast`, type, 0);
        });
      });

      expect(ctx.toasts.length).toBe(4);
    });
  });
});
