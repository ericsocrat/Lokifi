'use client';

import { cn } from '@/lib/utils';
import * as React from 'react';

// ============================================================================
// Types
// ============================================================================

export type DialogSize = 'sm' | 'md' | 'lg' | 'xl' | 'full';

export interface DialogContextValue {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contentRef: React.RefObject<HTMLDivElement | null>;
  triggerRef: React.RefObject<HTMLButtonElement | null>;
  contentId: string;
  titleId: string;
  descriptionId: string;
}

export interface DialogProps {
  /** Children elements */
  children: React.ReactNode;
  /** Controlled open state */
  open?: boolean;
  /** Callback when open state changes */
  onOpenChange?: (open: boolean) => void;
  /** Default open state for uncontrolled mode */
  defaultOpen?: boolean;
  /** Whether to close on escape key */
  closeOnEscape?: boolean;
  /** Whether to close when clicking outside */
  closeOnOutsideClick?: boolean;
  /** Accessible label for the dialog */
  'aria-label'?: string;
}

export interface DialogTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Whether the trigger is rendered as a child component */
  asChild?: boolean;
}

export interface DialogContentProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Size of the dialog */
  size?: DialogSize;
  /** Whether to show the close button */
  showCloseButton?: boolean;
  /** Whether to render even when closed (for animations) */
  forceMount?: boolean;
  /** Custom close button element */
  closeButton?: React.ReactNode;
}

export type DialogHeaderProps = React.HTMLAttributes<HTMLDivElement>;

export type DialogTitleProps = React.HTMLAttributes<HTMLHeadingElement>;

export type DialogDescriptionProps = React.HTMLAttributes<HTMLParagraphElement>;

export type DialogFooterProps = React.HTMLAttributes<HTMLDivElement>;

export interface DialogCloseProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Whether the close button is rendered as a child component */
  asChild?: boolean;
}

export interface DialogOverlayProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Whether to render even when closed (for animations) */
  forceMount?: boolean;
}

export interface SimpleDialogProps {
  /** Whether the dialog is open */
  open: boolean;
  /** Callback when open state changes */
  onOpenChange: (open: boolean) => void;
  /** Dialog title */
  title: string;
  /** Optional description */
  description?: string;
  /** Dialog content */
  children: React.ReactNode;
  /** Size of the dialog */
  size?: DialogSize;
  /** Footer content (usually buttons) */
  footer?: React.ReactNode;
  /** Whether to show the close button */
  showCloseButton?: boolean;
  /** Whether to close on escape key */
  closeOnEscape?: boolean;
  /** Whether to close when clicking outside */
  closeOnOutsideClick?: boolean;
  /** Additional className for the dialog */
  className?: string;
}

export interface ConfirmDialogProps {
  /** Whether the dialog is open */
  open: boolean;
  /** Callback when open state changes */
  onOpenChange: (open: boolean) => void;
  /** Dialog title */
  title: string;
  /** Confirmation message */
  message: string;
  /** Confirm button text */
  confirmText?: string;
  /** Cancel button text */
  cancelText?: string;
  /** Callback when confirmed */
  onConfirm: () => void;
  /** Callback when cancelled */
  onCancel?: () => void;
  /** Visual variant for confirm button */
  variant?: 'default' | 'danger';
  /** Whether confirm action is loading */
  loading?: boolean;
}

// ============================================================================
// Context
// ============================================================================

const DialogContext = React.createContext<DialogContextValue | undefined>(undefined);

export function useDialogContext() {
  const context = React.useContext(DialogContext);
  if (!context) {
    throw new Error('Dialog components must be used within a Dialog provider');
  }
  return context;
}

// ============================================================================
// Dialog Root
// ============================================================================

let dialogIdCounter = 0;

export function Dialog({
  children,
  open: controlledOpen,
  onOpenChange,
  defaultOpen = false,
  closeOnEscape = true,
  closeOnOutsideClick = true,
  'aria-label': ariaLabel,
}: DialogProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(defaultOpen);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : uncontrolledOpen;

  const contentRef = React.useRef<HTMLDivElement | null>(null);
  const triggerRef = React.useRef<HTMLButtonElement | null>(null);

  const idPrefix = React.useRef(`dialog-${++dialogIdCounter}`);
  const contentId = `${idPrefix.current}-content`;
  const titleId = `${idPrefix.current}-title`;
  const descriptionId = `${idPrefix.current}-description`;

  const handleOpenChange = React.useCallback(
    (newOpen: boolean) => {
      if (!isControlled) {
        setUncontrolledOpen(newOpen);
      }
      onOpenChange?.(newOpen);
    },
    [isControlled, onOpenChange]
  );

  // Handle escape key
  React.useEffect(() => {
    if (!open || !closeOnEscape) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        handleOpenChange(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, closeOnEscape, handleOpenChange]);

  // Handle outside click
  React.useEffect(() => {
    if (!open || !closeOnOutsideClick) return;

    const handleClick = (e: MouseEvent) => {
      if (contentRef.current && !contentRef.current.contains(e.target as Node)) {
        handleOpenChange(false);
      }
    };

    // Delay to prevent immediate close when opening
    const timeoutId = setTimeout(() => {
      document.addEventListener('click', handleClick);
    }, 0);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('click', handleClick);
    };
  }, [open, closeOnOutsideClick, handleOpenChange]);

  // Return focus to trigger when closed
  React.useEffect(() => {
    if (!open && triggerRef.current) {
      triggerRef.current.focus();
    }
  }, [open]);

  // Trap focus and prevent body scroll when open
  React.useEffect(() => {
    if (!open) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [open]);

  const contextValue = React.useMemo<DialogContextValue>(
    () => ({
      open,
      onOpenChange: handleOpenChange,
      contentRef,
      triggerRef,
      contentId,
      titleId,
      descriptionId,
    }),
    [open, handleOpenChange, contentId, titleId, descriptionId]
  );

  return (
    <DialogContext.Provider value={contextValue}>
      <div aria-label={ariaLabel} data-state={open ? 'open' : 'closed'}>
        {children}
      </div>
    </DialogContext.Provider>
  );
}

// ============================================================================
// Dialog Trigger
// ============================================================================

export const DialogTrigger = React.forwardRef<HTMLButtonElement, DialogTriggerProps>(
  function DialogTrigger({ children, asChild, onClick, className, ...props }, ref) {
    const { open, onOpenChange, triggerRef, contentId } = useDialogContext();

    const combinedRef = React.useCallback(
      (node: HTMLButtonElement | null) => {
        (triggerRef as React.MutableRefObject<HTMLButtonElement | null>).current = node;
        if (typeof ref === 'function') {
          ref(node);
        } else if (ref) {
          ref.current = node;
        }
      },
      [ref, triggerRef]
    );

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      onClick?.(e);
      onOpenChange(!open);
    };

    if (asChild && React.isValidElement(children)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return React.cloneElement(children as React.ReactElement<any>, {
        ref: combinedRef,
        onClick: handleClick,
        'aria-expanded': open,
        'aria-controls': open ? contentId : undefined,
        'aria-haspopup': 'dialog',
        'data-state': open ? 'open' : 'closed',
      });
    }

    return (
      <button
        ref={combinedRef}
        type="button"
        onClick={handleClick}
        aria-expanded={open}
        aria-controls={open ? contentId : undefined}
        aria-haspopup="dialog"
        data-state={open ? 'open' : 'closed'}
        className={cn(
          'inline-flex items-center justify-center rounded-md text-sm font-medium',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          className
        )}
        {...props}
      >
        {children}
      </button>
    );
  }
);

// ============================================================================
// Dialog Portal & Overlay
// ============================================================================

export const DialogOverlay = React.forwardRef<HTMLDivElement, DialogOverlayProps>(
  function DialogOverlay({ className, forceMount, ...props }, ref) {
    const { open } = useDialogContext();

    if (!open && !forceMount) return null;

    return (
      <div
        ref={ref}
        className={cn(
          'fixed inset-0 z-50 bg-black/50',
          'data-[state=open]:animate-in data-[state=closed]:animate-out',
          'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
          className
        )}
        data-state={open ? 'open' : 'closed'}
        aria-hidden="true"
        {...props}
      />
    );
  }
);

// ============================================================================
// Dialog Content
// ============================================================================

const sizeClasses: Record<DialogSize, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  full: 'max-w-[calc(100vw-2rem)] max-h-[calc(100vh-2rem)]',
};

export const DialogContent = React.forwardRef<HTMLDivElement, DialogContentProps>(
  function DialogContent(
    { children, className, size = 'md', showCloseButton = true, forceMount, closeButton, ...props },
    ref
  ) {
    const { open, onOpenChange, contentRef, contentId, titleId, descriptionId } =
      useDialogContext();

    const combinedRef = React.useCallback(
      (node: HTMLDivElement | null) => {
        (contentRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
        if (typeof ref === 'function') {
          ref(node);
        } else if (ref) {
          ref.current = node;
        }
      },
      [ref, contentRef]
    );

    // Focus the content when opened
    React.useEffect(() => {
      if (open && contentRef.current) {
        // Find first focusable element or focus the content itself
        const focusable = contentRef.current.querySelector<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusable) {
          focusable.focus();
        } else {
          contentRef.current.focus();
        }
      }
    }, [open, contentRef]);

    if (!open && !forceMount) return null;

    const defaultCloseButton = (
      <button
        type="button"
        onClick={() => onOpenChange(false)}
        className={cn(
          'absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background',
          'transition-opacity hover:opacity-100 focus:outline-none focus:ring-2',
          'focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none'
        )}
        aria-label="Close dialog"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-4 w-4"
        >
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    );

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <DialogOverlay />
        <div
          ref={combinedRef}
          id={contentId}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          aria-describedby={descriptionId}
          tabIndex={-1}
          data-state={open ? 'open' : 'closed'}
          className={cn(
            'relative z-50 w-full bg-background p-6 shadow-lg sm:rounded-lg',
            'data-[state=open]:animate-in data-[state=closed]:animate-out',
            'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
            'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
            sizeClasses[size],
            className
          )}
          {...props}
        >
          {children}
          {showCloseButton && (closeButton || defaultCloseButton)}
        </div>
      </div>
    );
  }
);

// ============================================================================
// Dialog Header
// ============================================================================

export const DialogHeader = React.forwardRef<HTMLDivElement, DialogHeaderProps>(
  function DialogHeader({ className, ...props }, ref) {
    return (
      <div
        ref={ref}
        className={cn('flex flex-col space-y-1.5 text-center sm:text-left', className)}
        {...props}
      />
    );
  }
);

// ============================================================================
// Dialog Title
// ============================================================================

export const DialogTitle = React.forwardRef<HTMLHeadingElement, DialogTitleProps>(
  function DialogTitle({ className, ...props }, ref) {
    const { titleId } = useDialogContext();

    return (
      <h2
        ref={ref}
        id={titleId}
        className={cn('text-lg font-semibold leading-none tracking-tight', className)}
        {...props}
      />
    );
  }
);

// ============================================================================
// Dialog Description
// ============================================================================

export const DialogDescription = React.forwardRef<HTMLParagraphElement, DialogDescriptionProps>(
  function DialogDescription({ className, ...props }, ref) {
    const { descriptionId } = useDialogContext();

    return (
      <p
        ref={ref}
        id={descriptionId}
        className={cn('text-sm text-muted-foreground', className)}
        {...props}
      />
    );
  }
);

// ============================================================================
// Dialog Footer
// ============================================================================

export const DialogFooter = React.forwardRef<HTMLDivElement, DialogFooterProps>(
  function DialogFooter({ className, ...props }, ref) {
    return (
      <div
        ref={ref}
        className={cn('flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2', className)}
        {...props}
      />
    );
  }
);

// ============================================================================
// Dialog Close
// ============================================================================

export const DialogClose = React.forwardRef<HTMLButtonElement, DialogCloseProps>(
  function DialogClose({ children, asChild, onClick, className, ...props }, ref) {
    const { onOpenChange } = useDialogContext();

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      onClick?.(e);
      onOpenChange(false);
    };

    if (asChild && React.isValidElement(children)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return React.cloneElement(children as React.ReactElement<any>, {
        ref,
        onClick: handleClick,
      });
    }

    return (
      <button
        ref={ref}
        type="button"
        onClick={handleClick}
        className={cn(
          'inline-flex items-center justify-center rounded-md text-sm font-medium',
          'ring-offset-background transition-colors focus-visible:outline-none',
          'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          'disabled:pointer-events-none disabled:opacity-50',
          className
        )}
        {...props}
      >
        {children}
      </button>
    );
  }
);

// ============================================================================
// Simple Dialog (Convenience Wrapper)
// ============================================================================

export function SimpleDialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  size = 'md',
  footer,
  showCloseButton = true,
  closeOnEscape = true,
  closeOnOutsideClick = true,
  className,
}: SimpleDialogProps) {
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      closeOnEscape={closeOnEscape}
      closeOnOutsideClick={closeOnOutsideClick}
    >
      <DialogContent size={size} showCloseButton={showCloseButton} className={className}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <div className="py-4">{children}</div>
        {footer && <DialogFooter>{footer}</DialogFooter>}
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// Confirm Dialog (Convenience Wrapper)
// ============================================================================

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  variant = 'default',
  loading = false,
}: ConfirmDialogProps) {
  const handleCancel = () => {
    onCancel?.();
    onOpenChange(false);
  };

  const handleConfirm = () => {
    onConfirm();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="sm" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{message}</DialogDescription>
        </DialogHeader>
        <DialogFooter className="mt-4">
          <button
            type="button"
            onClick={handleCancel}
            disabled={loading}
            className={cn(
              'inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium',
              'bg-secondary text-secondary-foreground hover:bg-secondary/80',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              'disabled:pointer-events-none disabled:opacity-50'
            )}
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={loading}
            className={cn(
              'inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              'disabled:pointer-events-none disabled:opacity-50',
              variant === 'danger'
                ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
                : 'bg-primary text-primary-foreground hover:bg-primary/90'
            )}
            data-variant={variant}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <svg
                  className="h-4 w-4 animate-spin"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Loading...
              </span>
            ) : (
              confirmText
            )}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// Export Display Names
// ============================================================================

Dialog.displayName = 'Dialog';
DialogTrigger.displayName = 'DialogTrigger';
DialogOverlay.displayName = 'DialogOverlay';
DialogContent.displayName = 'DialogContent';
DialogHeader.displayName = 'DialogHeader';
DialogTitle.displayName = 'DialogTitle';
DialogDescription.displayName = 'DialogDescription';
DialogFooter.displayName = 'DialogFooter';
DialogClose.displayName = 'DialogClose';
SimpleDialog.displayName = 'SimpleDialog';
ConfirmDialog.displayName = 'ConfirmDialog';


