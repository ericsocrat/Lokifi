'use client';

import { cn } from '@/lib/utils';
import * as React from 'react';

// ============================================================================
// Types
// ============================================================================

export type ToastVariant = 'default' | 'success' | 'warning' | 'error' | 'info';
export type ToastPosition =
  | 'top-left'
  | 'top-center'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-center'
  | 'bottom-right';

export interface Toast {
  /** Unique identifier */
  id: string;
  /** Toast title */
  title?: string;
  /** Toast message/description */
  message: string;
  /** Visual variant */
  variant?: ToastVariant;
  /** Duration in ms before auto-dismiss (0 = persistent) */
  duration?: number;
  /** Whether the toast can be dismissed */
  dismissible?: boolean;
  /** Action button configuration */
  action?: {
    label: string;
    onClick: () => void;
  };
  /** Custom icon */
  icon?: React.ReactNode;
  /** Timestamp when toast was created */
  createdAt: number;
}

export interface ToastProps extends Omit<Toast, 'id' | 'createdAt'> {
  /** Toast ID */
  id: string;
  /** Callback when toast is dismissed */
  onDismiss: (id: string) => void;
  /** Remaining time until auto-dismiss */
  remainingTime?: number;
}

export interface ToasterProps {
  /** Position of the toast container */
  position?: ToastPosition;
  /** Maximum number of visible toasts */
  maxToasts?: number;
  /** Default duration for toasts */
  defaultDuration?: number;
  /** Whether to show progress bar for auto-dismiss */
  showProgress?: boolean;
  /** Gap between toasts */
  gap?: number;
  /** Custom className for the container */
  className?: string;
}

export interface ToastContextValue {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id' | 'createdAt'>) => string;
  removeToast: (id: string) => void;
  removeAllToasts: () => void;
  updateToast: (id: string, toast: Partial<Omit<Toast, 'id' | 'createdAt'>>) => void;
}

// ============================================================================
// Context
// ============================================================================

const ToastContext = React.createContext<ToastContextValue | undefined>(undefined);

export function useToast() {
  const context = React.useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

// ============================================================================
// Toast ID Generator
// ============================================================================

let toastIdCounter = 0;

function generateToastId(): string {
  return `toast-${++toastIdCounter}`;
}

// ============================================================================
// Toast Provider
// ============================================================================

export interface ToastProviderProps {
  children: React.ReactNode;
}

export function ToastProvider({ children }: ToastProviderProps) {
  const [toasts, setToasts] = React.useState<Toast[]>([]);

  const addToast = React.useCallback((toast: Omit<Toast, 'id' | 'createdAt'>): string => {
    const id = generateToastId();
    const newToast: Toast = {
      ...toast,
      id,
      createdAt: Date.now(),
      variant: toast.variant || 'default',
      duration: toast.duration ?? 5000,
      dismissible: toast.dismissible ?? true,
    };

    setToasts((prev) => [...prev, newToast]);
    return id;
  }, []);

  const removeToast = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const removeAllToasts = React.useCallback(() => {
    setToasts([]);
  }, []);

  const updateToast = React.useCallback(
    (id: string, updates: Partial<Omit<Toast, 'id' | 'createdAt'>>) => {
      setToasts((prev) =>
        prev.map((toast) => (toast.id === id ? { ...toast, ...updates } : toast))
      );
    },
    []
  );

  const value = React.useMemo<ToastContextValue>(
    () => ({
      toasts,
      addToast,
      removeToast,
      removeAllToasts,
      updateToast,
    }),
    [toasts, addToast, removeToast, removeAllToasts, updateToast]
  );

  return <ToastContext.Provider value={value}>{children}</ToastContext.Provider>;
}

// ============================================================================
// Toast Icons
// ============================================================================

const CheckIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const AlertTriangleIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

const XCircleIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="12" r="10" />
    <line x1="15" y1="9" x2="9" y2="15" />
    <line x1="9" y1="9" x2="15" y2="15" />
  </svg>
);

const InfoIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="16" x2="12" y2="12" />
    <line x1="12" y1="8" x2="12.01" y2="8" />
  </svg>
);

const XIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

// ============================================================================
// Variant Styles
// ============================================================================

const variantStyles: Record<ToastVariant, string> = {
  default: 'bg-background border-border text-foreground',
  success:
    'bg-green-50 border-green-200 text-green-900 dark:bg-green-950 dark:border-green-800 dark:text-green-100',
  warning:
    'bg-yellow-50 border-yellow-200 text-yellow-900 dark:bg-yellow-950 dark:border-yellow-800 dark:text-yellow-100',
  error:
    'bg-red-50 border-red-200 text-red-900 dark:bg-red-950 dark:border-red-800 dark:text-red-100',
  info: 'bg-blue-50 border-blue-200 text-blue-900 dark:bg-blue-950 dark:border-blue-800 dark:text-blue-100',
};

const variantIcons: Record<ToastVariant, React.ReactNode> = {
  default: null,
  success: <CheckIcon />,
  warning: <AlertTriangleIcon />,
  error: <XCircleIcon />,
  info: <InfoIcon />,
};

const progressBarStyles: Record<ToastVariant, string> = {
  default: 'bg-foreground/20',
  success: 'bg-green-500',
  warning: 'bg-yellow-500',
  error: 'bg-red-500',
  info: 'bg-blue-500',
};

// ============================================================================
// Toast Item Component
// ============================================================================

export function ToastItem({
  id,
  title,
  message,
  variant = 'default',
  duration = 5000,
  dismissible = true,
  action,
  icon,
  onDismiss,
  remainingTime,
}: ToastProps) {
  const displayIcon = icon ?? variantIcons[variant];
  const progress =
    remainingTime !== undefined && duration > 0 ? (remainingTime / duration) * 100 : null;

  return (
    <div
      role="alert"
      aria-live="polite"
      data-toast-id={id}
      data-variant={variant}
      className={cn(
        'relative flex w-full items-start gap-3 rounded-lg border p-4 shadow-lg',
        'animate-in slide-in-from-right-full fade-in-0 duration-300',
        variantStyles[variant]
      )}
    >
      {displayIcon && (
        <div className="shrink-0 mt-0.5" data-testid="toast-icon">
          {displayIcon}
        </div>
      )}

      <div className="flex-1 min-w-0">
        {title && (
          <div className="font-semibold text-sm" data-testid="toast-title">
            {title}
          </div>
        )}
        <div className={cn('text-sm', title && 'mt-1')} data-testid="toast-message">
          {message}
        </div>

        {action && (
          <button
            type="button"
            onClick={action.onClick}
            className={cn(
              'mt-2 text-sm font-medium underline-offset-4 hover:underline',
              'focus:outline-none focus:ring-2 focus:ring-offset-2 rounded'
            )}
            data-testid="toast-action"
          >
            {action.label}
          </button>
        )}
      </div>

      {dismissible && (
        <button
          type="button"
          onClick={() => onDismiss(id)}
          className={cn(
            'shrink-0 rounded-sm opacity-70 hover:opacity-100',
            'focus:outline-none focus:ring-2 focus:ring-offset-2'
          )}
          aria-label="Dismiss toast"
          data-testid="toast-dismiss"
        >
          <XIcon />
        </button>
      )}

      {progress !== null && (
        <div
          className="absolute bottom-0 left-0 right-0 h-1 overflow-hidden rounded-b-lg"
          data-testid="toast-progress"
        >
          <div
            className={cn('h-full transition-all duration-100', progressBarStyles[variant])}
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Position Styles
// ============================================================================

const positionStyles: Record<ToastPosition, string> = {
  'top-left': 'top-4 left-4',
  'top-center': 'top-4 left-1/2 -translate-x-1/2',
  'top-right': 'top-4 right-4',
  'bottom-left': 'bottom-4 left-4',
  'bottom-center': 'bottom-4 left-1/2 -translate-x-1/2',
  'bottom-right': 'bottom-4 right-4',
};

// ============================================================================
// Toaster Component
// ============================================================================

export function Toaster({
  position = 'bottom-right',
  maxToasts = 5,
  defaultDuration: _defaultDuration = 5000,
  showProgress = true,
  gap = 8,
  className,
}: ToasterProps) {
  const { toasts, removeToast } = useToast();
  const [remainingTimes, setRemainingTimes] = React.useState<Record<string, number>>({});
  const timerRefs = React.useRef<{
    timeouts: Record<string, ReturnType<typeof setTimeout>>;
    intervals: Record<string, ReturnType<typeof setInterval>>;
  }>({ timeouts: {}, intervals: {} });

  // Limit visible toasts
  const visibleToasts = toasts.slice(-maxToasts);

  // Get stable list of toast IDs for dependency tracking
  const visibleToastIds = visibleToasts.map((t) => t.id).join(',');

  // Handle auto-dismiss timers for each toast individually
  React.useEffect(() => {
    const { timeouts, intervals } = timerRefs.current;

    visibleToasts.forEach((toast) => {
      // Skip if timer already exists for this toast
      if (timeouts[toast.id]) return;

      if (toast.duration && toast.duration > 0) {
        const elapsed = Date.now() - toast.createdAt;
        const remaining = Math.max(0, toast.duration - elapsed);

        // Set initial remaining time
        setRemainingTimes((prev) => ({ ...prev, [toast.id]: remaining }));

        // Update progress every 100ms
        if (showProgress && !intervals[toast.id]) {
          intervals[toast.id] = setInterval(() => {
            setRemainingTimes((prev) => {
              const newRemaining = Math.max(0, (prev[toast.id] || 0) - 100);
              return { ...prev, [toast.id]: newRemaining };
            });
          }, 100);
        }

        // Auto dismiss
        timeouts[toast.id] = setTimeout(() => {
          removeToast(toast.id);
          // Clean up refs
          delete timeouts[toast.id];
          if (intervals[toast.id]) {
            clearInterval(intervals[toast.id]);
            delete intervals[toast.id];
          }
        }, remaining);
      }
    });

    // Clean up timers for removed toasts
    const currentIds = new Set(visibleToasts.map((t) => t.id));
    Object.keys(timeouts).forEach((id) => {
      if (!currentIds.has(id)) {
        clearTimeout(timeouts[id]);
        delete timeouts[id];
      }
    });
    Object.keys(intervals).forEach((id) => {
      if (!currentIds.has(id)) {
        clearInterval(intervals[id]);
        delete intervals[id];
      }
    });
  }, [visibleToastIds, removeToast, showProgress]);

  // Cleanup all timers on unmount
  React.useEffect(() => {
    return () => {
      const { timeouts, intervals } = timerRefs.current;
      Object.values(timeouts).forEach(clearTimeout);
      Object.values(intervals).forEach(clearInterval);
    };
  }, []);

  // Clean up remaining times for removed toasts
  React.useEffect(() => {
    const toastIds = new Set(toasts.map((t) => t.id));
    setRemainingTimes((prev) => {
      const cleaned: Record<string, number> = {};
      Object.entries(prev).forEach(([id, time]) => {
        if (toastIds.has(id)) {
          cleaned[id] = time;
        }
      });
      return cleaned;
    });
  }, [toasts]);

  if (visibleToasts.length === 0) return null;

  return (
    <div
      className={cn(
        'fixed z-50 flex flex-col w-full max-w-sm pointer-events-none',
        positionStyles[position],
        className
      )}
      style={{ gap: `${gap}px` }}
      data-position={position}
      aria-label="Notifications"
    >
      {visibleToasts.map((toast) => (
        <div key={toast.id} className="pointer-events-auto">
          <ToastItem
            {...toast}
            onDismiss={removeToast}
            remainingTime={showProgress ? remainingTimes[toast.id] : undefined}
          />
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// Convenience Functions (for use with useToast)
// ============================================================================

export function createToastHelpers(context: ToastContextValue) {
  const { addToast, removeToast, removeAllToasts } = context;

  return {
    toast: (message: string, options?: Partial<Omit<Toast, 'id' | 'createdAt' | 'message'>>) =>
      addToast({ message, ...options }),

    success: (
      message: string,
      options?: Partial<Omit<Toast, 'id' | 'createdAt' | 'message' | 'variant'>>
    ) => addToast({ message, variant: 'success', ...options }),

    error: (
      message: string,
      options?: Partial<Omit<Toast, 'id' | 'createdAt' | 'message' | 'variant'>>
    ) => addToast({ message, variant: 'error', ...options }),

    warning: (
      message: string,
      options?: Partial<Omit<Toast, 'id' | 'createdAt' | 'message' | 'variant'>>
    ) => addToast({ message, variant: 'warning', ...options }),

    info: (
      message: string,
      options?: Partial<Omit<Toast, 'id' | 'createdAt' | 'message' | 'variant'>>
    ) => addToast({ message, variant: 'info', ...options }),

    promise: <T,>(
      promise: Promise<T>,
      messages: {
        loading: string;
        success: string | ((data: T) => string);
        error: string | ((err: unknown) => string);
      },
      options?: Partial<Omit<Toast, 'id' | 'createdAt' | 'message' | 'variant'>>
    ) => {
      const id = addToast({ message: messages.loading, variant: 'info', duration: 0, ...options });

      promise
        .then((data) => {
          const successMessage =
            typeof messages.success === 'function' ? messages.success(data) : messages.success;
          context.updateToast(id, { message: successMessage, variant: 'success', duration: 5000 });
        })
        .catch((err) => {
          const errorMessage =
            typeof messages.error === 'function' ? messages.error(err) : messages.error;
          context.updateToast(id, { message: errorMessage, variant: 'error', duration: 5000 });
        });

      return id;
    },

    dismiss: removeToast,
    dismissAll: removeAllToasts,
  };
}

// ============================================================================
// Hook for toast helpers
// ============================================================================

export function useToastHelpers() {
  const context = useToast();
  return React.useMemo(() => createToastHelpers(context), [context]);
}

// ============================================================================
// Display Names
// ============================================================================

ToastProvider.displayName = 'ToastProvider';
ToastItem.displayName = 'ToastItem';
Toaster.displayName = 'Toaster';

