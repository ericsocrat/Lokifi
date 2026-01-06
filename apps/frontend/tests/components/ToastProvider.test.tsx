/**
 * @fileoverview Tests for ToastProvider component
 *
 * ToastProvider is a context provider for toast notifications.
 * Features:
 * - Context-based toast management with addToast, removeToast
 * - Convenience methods: success, error, info, warning
 * - Auto-removal after configurable duration
 * - Visual toast container with close buttons
 *
 * Test categories:
 * 1. Context Provider - Children rendering, context availability
 * 2. useToast Hook - Error when outside provider, methods available
 * 3. Toast Creation - addToast, success, error, info, warning
 * 4. Toast Removal - Manual remove, auto-remove after duration
 * 5. Toast Display - Rendering, styling per type, close button
 * 6. Multiple Toasts - Adding multiple, order, removing one
 * 7. Integration - Complete toast workflow scenarios
 */
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ToastProvider, useToast } from '@/components/dashboard/ToastProvider';

// Helper component to access toast context in tests
function ToastConsumer({ onMount }: { onMount?: (toast: ReturnType<typeof useToast>) => void }) {
  const toast = useToast();

  React.useEffect(() => {
    onMount?.(toast);
  }, [toast, onMount]);

  return (
    <div data-testid="consumer">
      <button onClick={() => toast.success('Success!')}>Success</button>
      <button onClick={() => toast.error('Error!')}>Error</button>
      <button onClick={() => toast.info('Info!')}>Info</button>
      <button onClick={() => toast.warning('Warning!')}>Warning</button>
      <button onClick={() => toast.addToast('Custom', 'success', 1000)}>Custom</button>
      <span data-testid="toast-count">{toast.toasts.length}</span>
    </div>
  );
}

describe('ToastProvider', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ==========================================================================
  // Context Provider Tests
  // ==========================================================================

  describe('context provider', () => {
    it('should render children', () => {
      render(
        <ToastProvider>
          <div data-testid="child">Test Child</div>
        </ToastProvider>
      );

      expect(screen.getByTestId('child')).toBeInTheDocument();
      expect(screen.getByText('Test Child')).toBeInTheDocument();
    });

    it('should render toast container', () => {
      render(
        <ToastProvider>
          <div>Content</div>
        </ToastProvider>
      );

      // Toast container is always rendered (empty when no toasts)
      const container = document.querySelector('.fixed.bottom-4.right-4');
      expect(container).toBeInTheDocument();
    });

    it('should provide context to children', () => {
      let contextValue: ReturnType<typeof useToast> | null = null;

      render(
        <ToastProvider>
          <ToastConsumer
            onMount={(toast) => {
              contextValue = toast;
            }}
          />
        </ToastProvider>
      );

      expect(contextValue).not.toBeNull();
      expect(contextValue!.toasts).toEqual([]);
      expect(typeof contextValue!.addToast).toBe('function');
      expect(typeof contextValue!.removeToast).toBe('function');
      expect(typeof contextValue!.success).toBe('function');
      expect(typeof contextValue!.error).toBe('function');
      expect(typeof contextValue!.info).toBe('function');
      expect(typeof contextValue!.warning).toBe('function');
    });
  });

  // ==========================================================================
  // useToast Hook Tests
  // ==========================================================================

  describe('useToast hook', () => {
    it('should throw error when used outside provider', () => {
      // Suppress console.error for this test
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        render(<ToastConsumer />);
      }).toThrow('useToast must be used within a ToastProvider');

      consoleError.mockRestore();
    });

    it('should return context methods when inside provider', () => {
      let hookResult: ReturnType<typeof useToast> | null = null;

      render(
        <ToastProvider>
          <ToastConsumer
            onMount={(toast) => {
              hookResult = toast;
            }}
          />
        </ToastProvider>
      );

      expect(hookResult).toHaveProperty('toasts');
      expect(hookResult).toHaveProperty('addToast');
      expect(hookResult).toHaveProperty('removeToast');
      expect(hookResult).toHaveProperty('success');
      expect(hookResult).toHaveProperty('error');
      expect(hookResult).toHaveProperty('info');
      expect(hookResult).toHaveProperty('warning');
    });
  });

  // ==========================================================================
  // Toast Creation Tests
  // ==========================================================================

  describe('toast creation', () => {
    it('should add toast via addToast', async () => {
      render(
        <ToastProvider>
          <ToastConsumer />
        </ToastProvider>
      );

      await user.click(screen.getByRole('button', { name: 'Custom' }));

      // Toast message is 'Custom' but in a <p> element inside the toast container
      const toastContainer = document.querySelector('.fixed.bottom-4.right-4');
      expect(toastContainer?.textContent).toContain('Custom');
    });

    it('should add success toast', async () => {
      render(
        <ToastProvider>
          <ToastConsumer />
        </ToastProvider>
      );

      await user.click(screen.getByText('Success'));

      expect(screen.getByText('Success!')).toBeInTheDocument();
    });

    it('should add error toast', async () => {
      render(
        <ToastProvider>
          <ToastConsumer />
        </ToastProvider>
      );

      await user.click(screen.getByText('Error'));

      expect(screen.getByText('Error!')).toBeInTheDocument();
    });

    it('should add info toast', async () => {
      render(
        <ToastProvider>
          <ToastConsumer />
        </ToastProvider>
      );

      await user.click(screen.getByText('Info'));

      expect(screen.getByText('Info!')).toBeInTheDocument();
    });

    it('should add warning toast', async () => {
      render(
        <ToastProvider>
          <ToastConsumer />
        </ToastProvider>
      );

      await user.click(screen.getByText('Warning'));

      expect(screen.getByText('Warning!')).toBeInTheDocument();
    });

    it('should generate unique IDs for toasts', async () => {
      let contextValue: ReturnType<typeof useToast> | null = null;

      render(
        <ToastProvider>
          <ToastConsumer
            onMount={(toast) => {
              contextValue = toast;
            }}
          />
        </ToastProvider>
      );

      await user.click(screen.getByText('Success'));
      await user.click(screen.getByText('Success'));

      const ids = contextValue!.toasts.map((t) => t.id);
      expect(ids[0]).not.toBe(ids[1]);
    });

    it('should default to info type', async () => {
      let contextValue: ReturnType<typeof useToast> | null = null;

      // Custom component to test default type
      function DefaultTypeConsumer() {
        const toast = useToast();
        contextValue = toast;
        return <button onClick={() => toast.addToast('Default type')}>Add Default</button>;
      }

      render(
        <ToastProvider>
          <DefaultTypeConsumer />
        </ToastProvider>
      );

      await user.click(screen.getByText('Add Default'));

      expect(contextValue!.toasts[0].type).toBe('info');
    });

    it('should default to 5000ms duration', async () => {
      let contextValue: ReturnType<typeof useToast> | null = null;

      render(
        <ToastProvider>
          <ToastConsumer
            onMount={(toast) => {
              contextValue = toast;
            }}
          />
        </ToastProvider>
      );

      await user.click(screen.getByText('Success'));

      expect(contextValue!.toasts[0].duration).toBe(5000);
    });
  });

  // ==========================================================================
  // Toast Removal Tests
  // ==========================================================================

  describe('toast removal', () => {
    it('should remove toast when close button clicked', async () => {
      render(
        <ToastProvider>
          <ToastConsumer />
        </ToastProvider>
      );

      await user.click(screen.getByText('Success'));
      expect(screen.getByText('Success!')).toBeInTheDocument();

      // Find and click close button
      const closeButton = screen.getByRole('button', { name: '' }); // SVG button
      await user.click(closeButton);

      expect(screen.queryByText('Success!')).not.toBeInTheDocument();
    });

    it('should auto-remove toast after duration', async () => {
      render(
        <ToastProvider>
          <ToastConsumer />
        </ToastProvider>
      );

      await user.click(screen.getByRole('button', { name: 'Custom' })); // 1000ms duration

      // Verify toast is displayed in toast container
      const toastContainer = document.querySelector('.fixed.bottom-4.right-4');
      expect(toastContainer?.textContent).toContain('Custom');

      // Advance time past duration
      act(() => {
        vi.advanceTimersByTime(1100);
      });

      await waitFor(() => {
        expect(toastContainer?.textContent).not.toContain('Custom');
      });
    });

    it('should not auto-remove if duration is 0', async () => {
      function PersistentConsumer() {
        const toast = useToast();
        return <button onClick={() => toast.addToast('Persistent Toast', 'info', 0)}>Add Persistent</button>;
      }

      render(
        <ToastProvider>
          <PersistentConsumer />
        </ToastProvider>
      );

      await user.click(screen.getByRole('button', { name: 'Add Persistent' }));
      expect(screen.getByText('Persistent Toast')).toBeInTheDocument();

      // Advance time significantly
      act(() => {
        vi.advanceTimersByTime(10000);
      });

      // Toast should still be there
      expect(screen.getByText('Persistent Toast')).toBeInTheDocument();
    });

    it('should remove specific toast by ID', async () => {
      let contextValue: ReturnType<typeof useToast> | null = null;

      render(
        <ToastProvider>
          <ToastConsumer
            onMount={(toast) => {
              contextValue = toast;
            }}
          />
        </ToastProvider>
      );

      await user.click(screen.getByText('Success'));
      await user.click(screen.getByText('Error'));

      expect(screen.getByText('Success!')).toBeInTheDocument();
      expect(screen.getByText('Error!')).toBeInTheDocument();

      // Remove first toast by ID
      const firstId = contextValue!.toasts[0].id;
      act(() => {
        contextValue!.removeToast(firstId);
      });

      expect(screen.queryByText('Success!')).not.toBeInTheDocument();
      expect(screen.getByText('Error!')).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Toast Display Tests
  // ==========================================================================

  describe('toast display', () => {
    it('should render toast message', async () => {
      render(
        <ToastProvider>
          <ToastConsumer />
        </ToastProvider>
      );

      await user.click(screen.getByText('Success'));

      expect(screen.getByText('Success!')).toBeInTheDocument();
    });

    it('should apply success styling', async () => {
      render(
        <ToastProvider>
          <ToastConsumer />
        </ToastProvider>
      );

      await user.click(screen.getByText('Success'));

      const toastElement = screen.getByText('Success!').closest('div[class*="rounded"]');
      expect(toastElement).toHaveClass('bg-green-900/90');
      expect(toastElement).toHaveClass('border-green-500');
    });

    it('should apply error styling', async () => {
      render(
        <ToastProvider>
          <ToastConsumer />
        </ToastProvider>
      );

      await user.click(screen.getByText('Error'));

      const toastElement = screen.getByText('Error!').closest('div[class*="rounded"]');
      expect(toastElement).toHaveClass('bg-red-900/90');
      expect(toastElement).toHaveClass('border-red-500');
    });

    it('should apply warning styling', async () => {
      render(
        <ToastProvider>
          <ToastConsumer />
        </ToastProvider>
      );

      await user.click(screen.getByText('Warning'));

      const toastElement = screen.getByText('Warning!').closest('div[class*="rounded"]');
      expect(toastElement).toHaveClass('bg-yellow-900/90');
      expect(toastElement).toHaveClass('border-yellow-500');
    });

    it('should apply info styling', async () => {
      render(
        <ToastProvider>
          <ToastConsumer />
        </ToastProvider>
      );

      await user.click(screen.getByText('Info'));

      const toastElement = screen.getByText('Info!').closest('div[class*="rounded"]');
      expect(toastElement).toHaveClass('bg-blue-900/90');
      expect(toastElement).toHaveClass('border-blue-500');
    });

    it('should have close button in each toast', async () => {
      render(
        <ToastProvider>
          <ToastConsumer />
        </ToastProvider>
      );

      await user.click(screen.getByText('Success'));

      const toastElement = screen.getByText('Success!').closest('div[class*="rounded"]');
      const closeButton = toastElement?.querySelector('button');
      expect(closeButton).toBeInTheDocument();
    });

    it('should render SVG icon in close button', async () => {
      render(
        <ToastProvider>
          <ToastConsumer />
        </ToastProvider>
      );

      await user.click(screen.getByText('Success'));

      const svg = document.querySelector('svg');
      expect(svg).toBeInTheDocument();
      expect(svg).toHaveClass('w-4', 'h-4');
    });
  });

  // ==========================================================================
  // Multiple Toasts Tests
  // ==========================================================================

  describe('multiple toasts', () => {
    it('should display multiple toasts', async () => {
      render(
        <ToastProvider>
          <ToastConsumer />
        </ToastProvider>
      );

      await user.click(screen.getByText('Success'));
      await user.click(screen.getByText('Error'));
      await user.click(screen.getByText('Info'));

      expect(screen.getByText('Success!')).toBeInTheDocument();
      expect(screen.getByText('Error!')).toBeInTheDocument();
      expect(screen.getByText('Info!')).toBeInTheDocument();
    });

    it('should maintain order of toasts', async () => {
      let contextValue: ReturnType<typeof useToast> | null = null;

      render(
        <ToastProvider>
          <ToastConsumer
            onMount={(toast) => {
              contextValue = toast;
            }}
          />
        </ToastProvider>
      );

      await user.click(screen.getByText('Success'));
      await user.click(screen.getByText('Error'));
      await user.click(screen.getByText('Info'));

      const messages = contextValue!.toasts.map((t) => t.message);
      expect(messages).toEqual(['Success!', 'Error!', 'Info!']);
    });

    it('should update count correctly', async () => {
      render(
        <ToastProvider>
          <ToastConsumer />
        </ToastProvider>
      );

      expect(screen.getByTestId('toast-count')).toHaveTextContent('0');

      await user.click(screen.getByText('Success'));
      expect(screen.getByTestId('toast-count')).toHaveTextContent('1');

      await user.click(screen.getByText('Error'));
      expect(screen.getByTestId('toast-count')).toHaveTextContent('2');
    });

    it('should remove only the specific toast', async () => {
      render(
        <ToastProvider>
          <ToastConsumer />
        </ToastProvider>
      );

      await user.click(screen.getByText('Success'));
      await user.click(screen.getByText('Error'));

      expect(screen.getByTestId('toast-count')).toHaveTextContent('2');

      // Click first close button
      const closeButtons = document.querySelectorAll('button svg');
      await user.click(closeButtons[0].parentElement!);

      expect(screen.getByTestId('toast-count')).toHaveTextContent('1');
      expect(screen.queryByText('Success!')).not.toBeInTheDocument();
      expect(screen.getByText('Error!')).toBeInTheDocument();
    });

    it('should handle auto-remove for different durations', async () => {
      function DurationConsumer() {
        const toast = useToast();
        return (
          <>
            <button onClick={() => toast.addToast('Short Toast', 'info', 500)}>Add Short</button>
            <button onClick={() => toast.addToast('Long Toast', 'info', 2000)}>Add Long</button>
          </>
        );
      }

      render(
        <ToastProvider>
          <DurationConsumer />
        </ToastProvider>
      );

      await user.click(screen.getByRole('button', { name: 'Add Short' }));
      await user.click(screen.getByRole('button', { name: 'Add Long' }));

      expect(screen.getByText('Short Toast')).toBeInTheDocument();
      expect(screen.getByText('Long Toast')).toBeInTheDocument();

      // Advance past short duration
      act(() => {
        vi.advanceTimersByTime(600);
      });

      await waitFor(() => {
        expect(screen.queryByText('Short Toast')).not.toBeInTheDocument();
      });
      expect(screen.getByText('Long Toast')).toBeInTheDocument();

      // Advance past long duration
      act(() => {
        vi.advanceTimersByTime(1500);
      });

      await waitFor(() => {
        expect(screen.queryByText('Long Toast')).not.toBeInTheDocument();
      });
    });
  });

  // ==========================================================================
  // Integration Tests
  // ==========================================================================

  describe('integration', () => {
    it('should complete full notification workflow', async () => {
      render(
        <ToastProvider>
          <ToastConsumer />
        </ToastProvider>
      );

      // Add multiple toasts of different types
      await user.click(screen.getByText('Success'));
      await user.click(screen.getByText('Error'));
      await user.click(screen.getByText('Warning'));

      // Verify all displayed
      expect(screen.getByText('Success!')).toBeInTheDocument();
      expect(screen.getByText('Error!')).toBeInTheDocument();
      expect(screen.getByText('Warning!')).toBeInTheDocument();
      expect(screen.getByTestId('toast-count')).toHaveTextContent('3');

      // Close one manually
      const closeButtons = document.querySelectorAll('button svg');
      await user.click(closeButtons[1].parentElement!);
      expect(screen.getByTestId('toast-count')).toHaveTextContent('2');

      // Let the rest auto-expire
      act(() => {
        vi.advanceTimersByTime(6000);
      });

      await waitFor(() => {
        expect(screen.getByTestId('toast-count')).toHaveTextContent('0');
      });
    });

    it('should work with nested consumers', async () => {
      function NestedConsumer() {
        const toast = useToast();
        return <button onClick={() => toast.info('Nested!')}>Nested Button</button>;
      }

      render(
        <ToastProvider>
          <ToastConsumer />
          <div>
            <NestedConsumer />
          </div>
        </ToastProvider>
      );

      await user.click(screen.getByText('Nested Button'));

      expect(screen.getByText('Nested!')).toBeInTheDocument();
    });

    it('should handle rapid toast additions', async () => {
      let contextValue: ReturnType<typeof useToast> | null = null;

      render(
        <ToastProvider>
          <ToastConsumer
            onMount={(toast) => {
              contextValue = toast;
            }}
          />
        </ToastProvider>
      );

      // Rapidly add 5 toasts
      for (let i = 0; i < 5; i++) {
        await user.click(screen.getByText('Success'));
      }

      expect(contextValue!.toasts).toHaveLength(5);
    });

    it('should preserve context across child re-renders', async () => {
      function ReRenderingChild() {
        const toast = useToast();
        const [count, setCount] = React.useState(0);

        return (
          <>
            <button onClick={() => setCount((c) => c + 1)}>Re-render</button>
            <button onClick={() => toast.success('After re-render')}>Add Toast</button>
            <span data-testid="render-count">{count}</span>
          </>
        );
      }

      render(
        <ToastProvider>
          <ReRenderingChild />
        </ToastProvider>
      );

      // Re-render child multiple times
      await user.click(screen.getByText('Re-render'));
      await user.click(screen.getByText('Re-render'));
      expect(screen.getByTestId('render-count')).toHaveTextContent('2');

      // Toast should still work
      await user.click(screen.getByText('Add Toast'));
      expect(screen.getByText('After re-render')).toBeInTheDocument();
    });
  });
});
