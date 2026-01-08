import {
  createToastHelpers,
  Toaster,
  ToastItem,
  ToastProvider,
  useToast,
  useToastHelpers,
  type Toast,
  type ToastPosition,
  type ToastVariant,
} from '@/components/ui/Toast';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

// ============================================================================
// Test Utilities
// ============================================================================

function TestComponent({ onMount }: { onMount?: (context: ReturnType<typeof useToast>) => void }) {
  const context = useToast();

  React.useEffect(() => {
    onMount?.(context);
  }, [onMount, context]);

  return null;
}

function ToastTestWrapper({
  children,
  position = 'bottom-right',
  maxToasts = 5,
  showProgress = false,
}: {
  children?: React.ReactNode;
  position?: ToastPosition;
  maxToasts?: number;
  showProgress?: boolean;
}) {
  return (
    <ToastProvider>
      {children}
      <Toaster position={position} maxToasts={maxToasts} showProgress={showProgress} />
    </ToastProvider>
  );
}

function ToastTrigger({
  message = 'Test message',
  variant,
  title,
  duration = 0, // Persistent by default for testing
  dismissible,
  action,
}: Partial<Omit<Toast, 'id' | 'createdAt'>>) {
  const { addToast } = useToast();

  return (
    <button
      onClick={() => addToast({ message, variant, title, duration, dismissible, action })}
      data-testid="add-toast"
    >
      Add Toast
    </button>
  );
}

// ============================================================================
// Tests
// ============================================================================

describe('Toast', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('renders toast provider without crashing', () => {
      render(
        <ToastProvider>
          <div>Content</div>
        </ToastProvider>
      );
      expect(screen.getByText('Content')).toBeInTheDocument();
    });

    it('renders toaster when toasts exist', () => {
      render(
        <ToastTestWrapper>
          <ToastTrigger message="Hello World" />
        </ToastTestWrapper>
      );

      fireEvent.click(screen.getByTestId('add-toast'));
      expect(screen.getByText('Hello World')).toBeInTheDocument();
    });

    it('does not render toaster when no toasts', () => {
      render(
        <ToastTestWrapper>
          <div>Empty</div>
        </ToastTestWrapper>
      );

      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('renders toast with title and message', () => {
      render(
        <ToastTestWrapper>
          <ToastTrigger title="Success!" message="Operation completed" />
        </ToastTestWrapper>
      );

      fireEvent.click(screen.getByTestId('add-toast'));
      expect(screen.getByTestId('toast-title')).toHaveTextContent('Success!');
      expect(screen.getByTestId('toast-message')).toHaveTextContent('Operation completed');
    });

    it('renders toast without title', () => {
      render(
        <ToastTestWrapper>
          <ToastTrigger message="Just a message" />
        </ToastTestWrapper>
      );

      fireEvent.click(screen.getByTestId('add-toast'));
      expect(screen.queryByTestId('toast-title')).not.toBeInTheDocument();
      expect(screen.getByTestId('toast-message')).toHaveTextContent('Just a message');
    });
  });

  describe('Variants', () => {
    const variants: ToastVariant[] = ['default', 'success', 'warning', 'error', 'info'];

    variants.forEach((variant) => {
      it(`renders ${variant} variant correctly`, () => {
        render(
          <ToastTestWrapper>
            <ToastTrigger message={`${variant} toast`} variant={variant} />
          </ToastTestWrapper>
        );

        fireEvent.click(screen.getByTestId('add-toast'));
        const toast = screen.getByRole('alert');
        expect(toast).toHaveAttribute('data-variant', variant);
      });
    });

    it('renders icon for success variant', () => {
      render(
        <ToastTestWrapper>
          <ToastTrigger message="Success" variant="success" />
        </ToastTestWrapper>
      );

      fireEvent.click(screen.getByTestId('add-toast'));
      expect(screen.getByTestId('toast-icon')).toBeInTheDocument();
    });

    it('renders icon for error variant', () => {
      render(
        <ToastTestWrapper>
          <ToastTrigger message="Error" variant="error" />
        </ToastTestWrapper>
      );

      fireEvent.click(screen.getByTestId('add-toast'));
      expect(screen.getByTestId('toast-icon')).toBeInTheDocument();
    });

    it('does not render icon for default variant', () => {
      render(
        <ToastTestWrapper>
          <ToastTrigger message="Default" variant="default" />
        </ToastTestWrapper>
      );

      fireEvent.click(screen.getByTestId('add-toast'));
      expect(screen.queryByTestId('toast-icon')).not.toBeInTheDocument();
    });
  });

  describe('Dismissing Toasts', () => {
    it('dismisses toast when close button is clicked', async () => {
      render(
        <ToastTestWrapper>
          <ToastTrigger message="Dismissible toast" />
        </ToastTestWrapper>
      );

      fireEvent.click(screen.getByTestId('add-toast'));
      expect(screen.getByText('Dismissible toast')).toBeInTheDocument();

      fireEvent.click(screen.getByTestId('toast-dismiss'));
      await waitFor(() => {
        expect(screen.queryByText('Dismissible toast')).not.toBeInTheDocument();
      });
    });

    it('does not show dismiss button when dismissible is false', () => {
      render(
        <ToastTestWrapper>
          <ToastTrigger message="Non-dismissible" dismissible={false} />
        </ToastTestWrapper>
      );

      fireEvent.click(screen.getByTestId('add-toast'));
      expect(screen.queryByTestId('toast-dismiss')).not.toBeInTheDocument();
    });

    it('auto-dismisses toast after duration', async () => {
      render(
        <ToastTestWrapper>
          <ToastTrigger message="Auto dismiss" duration={50} />
        </ToastTestWrapper>
      );

      fireEvent.click(screen.getByTestId('add-toast'));
      expect(screen.getByText('Auto dismiss')).toBeInTheDocument();

      await waitFor(
        () => {
          expect(screen.queryByText('Auto dismiss')).not.toBeInTheDocument();
        },
        { timeout: 500 }
      );
    });

    it('does not auto-dismiss when duration is 0', async () => {
      render(
        <ToastTestWrapper>
          <ToastTrigger message="Persistent toast" duration={0} />
        </ToastTestWrapper>
      );

      fireEvent.click(screen.getByTestId('add-toast'));

      // Small delay to ensure it doesn't auto-dismiss
      await new Promise((resolve) => setTimeout(resolve, 100));
      expect(screen.getByText('Persistent toast')).toBeInTheDocument();
    });
  });

  describe('Positions', () => {
    const positions: ToastPosition[] = [
      'top-left',
      'top-center',
      'top-right',
      'bottom-left',
      'bottom-center',
      'bottom-right',
    ];

    positions.forEach((position) => {
      it(`renders at ${position} position`, () => {
        render(
          <ToastTestWrapper position={position}>
            <ToastTrigger message="Positioned toast" />
          </ToastTestWrapper>
        );

        fireEvent.click(screen.getByTestId('add-toast'));
        const container = screen.getByLabelText('Notifications');
        expect(container).toHaveAttribute('data-position', position);
      });
    });
  });

  describe('Max Toasts', () => {
    it('limits visible toasts to maxToasts', () => {
      render(
        <ToastTestWrapper maxToasts={3}>
          <ToastTrigger />
        </ToastTestWrapper>
      );

      for (let i = 0; i < 5; i++) {
        fireEvent.click(screen.getByTestId('add-toast'));
      }

      const toasts = screen.getAllByRole('alert');
      expect(toasts).toHaveLength(3);
    });

    it('shows newest toasts when limit exceeded', () => {
      function MultiToastTrigger() {
        const { addToast } = useToast();
        return (
          <>
            <button
              onClick={() => addToast({ message: 'Toast 1', duration: 0 })}
              data-testid="add-1"
            >
              Add 1
            </button>
            <button
              onClick={() => addToast({ message: 'Toast 2', duration: 0 })}
              data-testid="add-2"
            >
              Add 2
            </button>
            <button
              onClick={() => addToast({ message: 'Toast 3', duration: 0 })}
              data-testid="add-3"
            >
              Add 3
            </button>
            <button
              onClick={() => addToast({ message: 'Toast 4', duration: 0 })}
              data-testid="add-4"
            >
              Add 4
            </button>
          </>
        );
      }

      render(
        <ToastTestWrapper maxToasts={2}>
          <MultiToastTrigger />
        </ToastTestWrapper>
      );

      fireEvent.click(screen.getByTestId('add-1'));
      fireEvent.click(screen.getByTestId('add-2'));
      fireEvent.click(screen.getByTestId('add-3'));
      fireEvent.click(screen.getByTestId('add-4'));

      expect(screen.queryByText('Toast 1')).not.toBeInTheDocument();
      expect(screen.queryByText('Toast 2')).not.toBeInTheDocument();
      expect(screen.getByText('Toast 3')).toBeInTheDocument();
      expect(screen.getByText('Toast 4')).toBeInTheDocument();
    });
  });

  describe('Action Button', () => {
    it('renders action button when provided', () => {
      const onAction = vi.fn();
      render(
        <ToastTestWrapper>
          <ToastTrigger message="Action toast" action={{ label: 'Undo', onClick: onAction }} />
        </ToastTestWrapper>
      );

      fireEvent.click(screen.getByTestId('add-toast'));
      expect(screen.getByTestId('toast-action')).toHaveTextContent('Undo');
    });

    it('calls action callback when clicked', () => {
      const onAction = vi.fn();
      render(
        <ToastTestWrapper>
          <ToastTrigger message="Action toast" action={{ label: 'Undo', onClick: onAction }} />
        </ToastTestWrapper>
      );

      fireEvent.click(screen.getByTestId('add-toast'));
      fireEvent.click(screen.getByTestId('toast-action'));
      expect(onAction).toHaveBeenCalledTimes(1);
    });
  });

  describe('Progress Bar', () => {
    it('shows progress bar when showProgress is true and duration > 0', () => {
      render(
        <ToastTestWrapper showProgress={true}>
          <ToastTrigger message="Progress toast" duration={5000} />
        </ToastTestWrapper>
      );

      fireEvent.click(screen.getByTestId('add-toast'));
      expect(screen.getByTestId('toast-progress')).toBeInTheDocument();
    });

    it('does not show progress bar when showProgress is false', () => {
      render(
        <ToastTestWrapper showProgress={false}>
          <ToastTrigger message="No progress" duration={5000} />
        </ToastTestWrapper>
      );

      fireEvent.click(screen.getByTestId('add-toast'));
      expect(screen.queryByTestId('toast-progress')).not.toBeInTheDocument();
    });

    it('does not show progress bar when duration is 0', () => {
      render(
        <ToastTestWrapper showProgress={true}>
          <ToastTrigger message="Persistent" duration={0} />
        </ToastTestWrapper>
      );

      fireEvent.click(screen.getByTestId('add-toast'));
      expect(screen.queryByTestId('toast-progress')).not.toBeInTheDocument();
    });
  });

  describe('useToast Hook', () => {
    it('throws error when used outside provider', () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        render(<TestComponent />);
      }).toThrow('useToast must be used within a ToastProvider');

      consoleError.mockRestore();
    });

    it('provides addToast function', () => {
      let contextRef: ReturnType<typeof useToast> | null = null;

      render(
        <ToastProvider>
          <TestComponent
            onMount={(ctx) => {
              contextRef = ctx;
            }}
          />
        </ToastProvider>
      );

      expect(contextRef).not.toBeNull();
      expect(typeof contextRef!.addToast).toBe('function');
    });

    it('provides removeToast function', () => {
      let contextRef: ReturnType<typeof useToast> | null = null;

      render(
        <ToastProvider>
          <TestComponent
            onMount={(ctx) => {
              contextRef = ctx;
            }}
          />
        </ToastProvider>
      );

      expect(typeof contextRef!.removeToast).toBe('function');
    });

    it('provides removeAllToasts function', () => {
      let contextRef: ReturnType<typeof useToast> | null = null;

      render(
        <ToastProvider>
          <TestComponent
            onMount={(ctx) => {
              contextRef = ctx;
            }}
          />
        </ToastProvider>
      );

      expect(typeof contextRef!.removeAllToasts).toBe('function');
    });

    it('provides updateToast function', () => {
      let contextRef: ReturnType<typeof useToast> | null = null;

      render(
        <ToastProvider>
          <TestComponent
            onMount={(ctx) => {
              contextRef = ctx;
            }}
          />
        </ToastProvider>
      );

      expect(typeof contextRef!.updateToast).toBe('function');
    });

    it('provides toasts array', () => {
      let contextRef: ReturnType<typeof useToast> | null = null;

      render(
        <ToastProvider>
          <TestComponent
            onMount={(ctx) => {
              contextRef = ctx;
            }}
          />
        </ToastProvider>
      );

      expect(Array.isArray(contextRef!.toasts)).toBe(true);
    });
  });

  describe('Context Operations', () => {
    it('addToast returns toast id', () => {
      let toastId: string | null = null;

      function IdCapture() {
        const { addToast } = useToast();
        return (
          <button
            onClick={() => {
              toastId = addToast({ message: 'Test' });
            }}
            data-testid="capture"
          >
            Add
          </button>
        );
      }

      render(
        <ToastTestWrapper>
          <IdCapture />
        </ToastTestWrapper>
      );

      fireEvent.click(screen.getByTestId('capture'));
      expect(toastId).toBeTruthy();
      expect(toastId!.startsWith('toast-')).toBe(true);
    });

    it('removeAllToasts clears all toasts', async () => {
      function ClearTrigger() {
        const { addToast, removeAllToasts } = useToast();
        return (
          <>
            <button onClick={() => addToast({ message: 'Toast 1', duration: 0 })} data-testid="add">
              Add
            </button>
            <button onClick={removeAllToasts} data-testid="clear">
              Clear
            </button>
          </>
        );
      }

      render(
        <ToastTestWrapper>
          <ClearTrigger />
        </ToastTestWrapper>
      );

      fireEvent.click(screen.getByTestId('add'));
      fireEvent.click(screen.getByTestId('add'));
      expect(screen.getAllByRole('alert')).toHaveLength(2);

      fireEvent.click(screen.getByTestId('clear'));
      await waitFor(() => {
        expect(screen.queryByRole('alert')).not.toBeInTheDocument();
      });
    });

    it('updateToast updates existing toast', async () => {
      function UpdateTrigger() {
        const { addToast, updateToast } = useToast();
        const [id, setId] = React.useState<string | null>(null);

        return (
          <>
            <button
              onClick={() => setId(addToast({ message: 'Original', duration: 0 }))}
              data-testid="add"
            >
              Add
            </button>
            <button
              onClick={() => id && updateToast(id, { message: 'Updated' })}
              data-testid="update"
            >
              Update
            </button>
          </>
        );
      }

      render(
        <ToastTestWrapper>
          <UpdateTrigger />
        </ToastTestWrapper>
      );

      fireEvent.click(screen.getByTestId('add'));
      expect(screen.getByText('Original')).toBeInTheDocument();

      fireEvent.click(screen.getByTestId('update'));
      await waitFor(() => {
        expect(screen.getByText('Updated')).toBeInTheDocument();
        expect(screen.queryByText('Original')).not.toBeInTheDocument();
      });
    });
  });

  describe('Toast Helpers', () => {
    it('toast() creates default toast', () => {
      function HelperTrigger() {
        const helpers = useToastHelpers();
        return (
          <button
            onClick={() => helpers.toast('Default toast', { duration: 0 })}
            data-testid="trigger"
          >
            Toast
          </button>
        );
      }

      render(
        <ToastTestWrapper>
          <HelperTrigger />
        </ToastTestWrapper>
      );

      fireEvent.click(screen.getByTestId('trigger'));
      expect(screen.getByText('Default toast')).toBeInTheDocument();
    });

    it('success() creates success toast', () => {
      function HelperTrigger() {
        const helpers = useToastHelpers();
        return (
          <button
            onClick={() => helpers.success('Success!', { duration: 0 })}
            data-testid="trigger"
          >
            Success
          </button>
        );
      }

      render(
        <ToastTestWrapper>
          <HelperTrigger />
        </ToastTestWrapper>
      );

      fireEvent.click(screen.getByTestId('trigger'));
      const toast = screen.getByRole('alert');
      expect(toast).toHaveAttribute('data-variant', 'success');
    });

    it('error() creates error toast', () => {
      function HelperTrigger() {
        const helpers = useToastHelpers();
        return (
          <button onClick={() => helpers.error('Error!', { duration: 0 })} data-testid="trigger">
            Error
          </button>
        );
      }

      render(
        <ToastTestWrapper>
          <HelperTrigger />
        </ToastTestWrapper>
      );

      fireEvent.click(screen.getByTestId('trigger'));
      const toast = screen.getByRole('alert');
      expect(toast).toHaveAttribute('data-variant', 'error');
    });

    it('warning() creates warning toast', () => {
      function HelperTrigger() {
        const helpers = useToastHelpers();
        return (
          <button
            onClick={() => helpers.warning('Warning!', { duration: 0 })}
            data-testid="trigger"
          >
            Warning
          </button>
        );
      }

      render(
        <ToastTestWrapper>
          <HelperTrigger />
        </ToastTestWrapper>
      );

      fireEvent.click(screen.getByTestId('trigger'));
      const toast = screen.getByRole('alert');
      expect(toast).toHaveAttribute('data-variant', 'warning');
    });

    it('info() creates info toast', () => {
      function HelperTrigger() {
        const helpers = useToastHelpers();
        return (
          <button onClick={() => helpers.info('Info!', { duration: 0 })} data-testid="trigger">
            Info
          </button>
        );
      }

      render(
        <ToastTestWrapper>
          <HelperTrigger />
        </ToastTestWrapper>
      );

      fireEvent.click(screen.getByTestId('trigger'));
      const toast = screen.getByRole('alert');
      expect(toast).toHaveAttribute('data-variant', 'info');
    });

    it('dismiss() removes specific toast', async () => {
      function DismissTrigger() {
        const helpers = useToastHelpers();
        const [id, setId] = React.useState<string | null>(null);

        return (
          <>
            <button
              onClick={() => setId(helpers.toast('To dismiss', { duration: 0 }))}
              data-testid="add"
            >
              Add
            </button>
            <button onClick={() => id && helpers.dismiss(id)} data-testid="dismiss">
              Dismiss
            </button>
          </>
        );
      }

      render(
        <ToastTestWrapper>
          <DismissTrigger />
        </ToastTestWrapper>
      );

      fireEvent.click(screen.getByTestId('add'));
      expect(screen.getByText('To dismiss')).toBeInTheDocument();

      fireEvent.click(screen.getByTestId('dismiss'));
      await waitFor(() => {
        expect(screen.queryByText('To dismiss')).not.toBeInTheDocument();
      });
    });

    it('dismissAll() removes all toasts', async () => {
      function DismissAllTrigger() {
        const helpers = useToastHelpers();

        return (
          <>
            <button onClick={() => helpers.toast('Toast 1', { duration: 0 })} data-testid="add">
              Add
            </button>
            <button onClick={() => helpers.dismissAll()} data-testid="clear">
              Clear
            </button>
          </>
        );
      }

      render(
        <ToastTestWrapper>
          <DismissAllTrigger />
        </ToastTestWrapper>
      );

      fireEvent.click(screen.getByTestId('add'));
      fireEvent.click(screen.getByTestId('add'));
      expect(screen.getAllByRole('alert')).toHaveLength(2);

      fireEvent.click(screen.getByTestId('clear'));
      await waitFor(() => {
        expect(screen.queryByRole('alert')).not.toBeInTheDocument();
      });
    });
  });

  describe('Promise Toasts', () => {
    it('shows loading state for promise', () => {
      function PromiseTrigger() {
        const helpers = useToastHelpers();

        return (
          <button
            onClick={() => {
              helpers.promise(new Promise(() => {}), {
                loading: 'Loading...',
                success: 'Done!',
                error: 'Failed!',
              });
            }}
            data-testid="trigger"
          >
            Promise
          </button>
        );
      }

      render(
        <ToastTestWrapper>
          <PromiseTrigger />
        </ToastTestWrapper>
      );

      fireEvent.click(screen.getByTestId('trigger'));
      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });

    it('updates to success on promise resolve', async () => {
      function PromiseTrigger() {
        const helpers = useToastHelpers();

        return (
          <button
            onClick={() => {
              helpers.promise(Promise.resolve('data'), {
                loading: 'Loading...',
                success: 'Done!',
                error: 'Failed!',
              });
            }}
            data-testid="trigger"
          >
            Promise
          </button>
        );
      }

      render(
        <ToastTestWrapper>
          <PromiseTrigger />
        </ToastTestWrapper>
      );

      fireEvent.click(screen.getByTestId('trigger'));

      await waitFor(() => {
        expect(screen.getByText('Done!')).toBeInTheDocument();
      });
    });

    it('updates to error on promise reject', async () => {
      function PromiseTrigger() {
        const helpers = useToastHelpers();

        return (
          <button
            onClick={() => {
              helpers.promise(Promise.reject(new Error('Oops')), {
                loading: 'Loading...',
                success: 'Done!',
                error: 'Failed!',
              });
            }}
            data-testid="trigger"
          >
            Promise
          </button>
        );
      }

      render(
        <ToastTestWrapper>
          <PromiseTrigger />
        </ToastTestWrapper>
      );

      fireEvent.click(screen.getByTestId('trigger'));

      await waitFor(() => {
        expect(screen.getByText('Failed!')).toBeInTheDocument();
      });
    });

    it('supports dynamic success message', async () => {
      function PromiseTrigger() {
        const helpers = useToastHelpers();

        return (
          <button
            onClick={() => {
              helpers.promise(Promise.resolve({ count: 5 }), {
                loading: 'Loading...',
                success: (data) => `Loaded ${data.count} items`,
                error: 'Failed!',
              });
            }}
            data-testid="trigger"
          >
            Promise
          </button>
        );
      }

      render(
        <ToastTestWrapper>
          <PromiseTrigger />
        </ToastTestWrapper>
      );

      fireEvent.click(screen.getByTestId('trigger'));

      await waitFor(() => {
        expect(screen.getByText('Loaded 5 items')).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('has role="alert" for announcements', () => {
      render(
        <ToastTestWrapper>
          <ToastTrigger message="Alert" />
        </ToastTestWrapper>
      );

      fireEvent.click(screen.getByTestId('add-toast'));
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    it('has aria-live="polite" for non-intrusive announcements', () => {
      render(
        <ToastTestWrapper>
          <ToastTrigger message="Polite" />
        </ToastTestWrapper>
      );

      fireEvent.click(screen.getByTestId('add-toast'));
      expect(screen.getByRole('alert')).toHaveAttribute('aria-live', 'polite');
    });

    it('dismiss button has accessible label', () => {
      render(
        <ToastTestWrapper>
          <ToastTrigger message="Dismissible" />
        </ToastTestWrapper>
      );

      fireEvent.click(screen.getByTestId('add-toast'));
      const dismissButton = screen.getByTestId('toast-dismiss');
      expect(dismissButton).toHaveAttribute('aria-label', 'Dismiss toast');
    });

    it('container has aria-label', () => {
      render(
        <ToastTestWrapper>
          <ToastTrigger message="Toast" />
        </ToastTestWrapper>
      );

      fireEvent.click(screen.getByTestId('add-toast'));
      expect(screen.getByLabelText('Notifications')).toBeInTheDocument();
    });
  });

  describe('Custom Icons', () => {
    it('renders custom icon instead of variant icon', () => {
      function CustomIconToast() {
        const { addToast } = useToast();
        return (
          <button
            onClick={() =>
              addToast({
                message: 'Custom icon',
                variant: 'success',
                icon: <span data-testid="custom-icon">★</span>,
                duration: 0,
              })
            }
            data-testid="add-toast"
          >
            Add
          </button>
        );
      }

      render(
        <ToastTestWrapper>
          <CustomIconToast />
        </ToastTestWrapper>
      );

      fireEvent.click(screen.getByTestId('add-toast'));
      expect(screen.getByTestId('custom-icon')).toBeInTheDocument();
    });
  });

  describe('ToastItem Component', () => {
    it('renders standalone with required props', () => {
      const onDismiss = vi.fn();
      render(<ToastItem id="test-1" message="Standalone toast" onDismiss={onDismiss} />);

      expect(screen.getByText('Standalone toast')).toBeInTheDocument();
    });

    it('calls onDismiss with id when dismissed', () => {
      const onDismiss = vi.fn();
      render(<ToastItem id="test-1" message="Test" onDismiss={onDismiss} />);

      fireEvent.click(screen.getByTestId('toast-dismiss'));
      expect(onDismiss).toHaveBeenCalledWith('test-1');
    });

    it('applies data-toast-id attribute', () => {
      const onDismiss = vi.fn();
      render(<ToastItem id="unique-id" message="Test" onDismiss={onDismiss} />);

      expect(screen.getByRole('alert')).toHaveAttribute('data-toast-id', 'unique-id');
    });
  });

  describe('createToastHelpers', () => {
    it('creates helpers from context', () => {
      const mockContext: ReturnType<typeof useToast> = {
        toasts: [],
        addToast: vi.fn(() => 'toast-1'),
        removeToast: vi.fn(),
        removeAllToasts: vi.fn(),
        updateToast: vi.fn(),
      };

      const helpers = createToastHelpers(mockContext);

      expect(typeof helpers.toast).toBe('function');
      expect(typeof helpers.success).toBe('function');
      expect(typeof helpers.error).toBe('function');
      expect(typeof helpers.warning).toBe('function');
      expect(typeof helpers.info).toBe('function');
      expect(typeof helpers.promise).toBe('function');
      expect(typeof helpers.dismiss).toBe('function');
      expect(typeof helpers.dismissAll).toBe('function');
    });

    it('toast helper calls addToast', () => {
      const mockContext: ReturnType<typeof useToast> = {
        toasts: [],
        addToast: vi.fn(() => 'toast-1'),
        removeToast: vi.fn(),
        removeAllToasts: vi.fn(),
        updateToast: vi.fn(),
      };

      const helpers = createToastHelpers(mockContext);
      helpers.toast('Test message');

      expect(mockContext.addToast).toHaveBeenCalledWith({ message: 'Test message' });
    });

    it('success helper calls addToast with success variant', () => {
      const mockContext: ReturnType<typeof useToast> = {
        toasts: [],
        addToast: vi.fn(() => 'toast-1'),
        removeToast: vi.fn(),
        removeAllToasts: vi.fn(),
        updateToast: vi.fn(),
      };

      const helpers = createToastHelpers(mockContext);
      helpers.success('Success!');

      expect(mockContext.addToast).toHaveBeenCalledWith({
        message: 'Success!',
        variant: 'success',
      });
    });
  });

  describe('Edge Cases', () => {
    it('handles rapid toast additions', () => {
      render(
        <ToastTestWrapper maxToasts={10}>
          <ToastTrigger />
        </ToastTestWrapper>
      );

      for (let i = 0; i < 10; i++) {
        fireEvent.click(screen.getByTestId('add-toast'));
      }

      expect(screen.getAllByRole('alert')).toHaveLength(10);
    });

    it('handles empty message', () => {
      render(
        <ToastTestWrapper>
          <ToastTrigger message="" />
        </ToastTestWrapper>
      );

      fireEvent.click(screen.getByTestId('add-toast'));
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    it('handles very long message', () => {
      const longMessage = 'A'.repeat(500);
      render(
        <ToastTestWrapper>
          <ToastTrigger message={longMessage} />
        </ToastTestWrapper>
      );

      fireEvent.click(screen.getByTestId('add-toast'));
      expect(screen.getByText(longMessage)).toBeInTheDocument();
    });

    it('handles special characters in message', () => {
      const specialMessage = '<script>alert("XSS")</script>';
      render(
        <ToastTestWrapper>
          <ToastTrigger message={specialMessage} />
        </ToastTestWrapper>
      );

      fireEvent.click(screen.getByTestId('add-toast'));
      expect(screen.getByText(specialMessage)).toBeInTheDocument();
    });
  });
});
