'use client';

import * as React from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';

// ============================================================================
// Types
// ============================================================================

export type PopoverPlacement =
  | 'top'
  | 'top-start'
  | 'top-end'
  | 'bottom'
  | 'bottom-start'
  | 'bottom-end'
  | 'left'
  | 'left-start'
  | 'left-end'
  | 'right'
  | 'right-start'
  | 'right-end';

export type PopoverTriggerType = 'click' | 'hover' | 'focus' | 'contextMenu';

export interface PopoverContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
  triggerRef: React.RefObject<HTMLElement | null>;
  contentRef: React.RefObject<HTMLDivElement | null>;
  triggerId: string;
  contentId: string;
  placement: PopoverPlacement;
  triggerType: PopoverTriggerType;
  closeOnBlur: boolean;
  closeOnEscape: boolean;
  hoverDelay: number;
  disabled: boolean;
}

export interface PopoverProps {
  /** Content of the popover */
  children: React.ReactNode;
  /** Controlled open state */
  open?: boolean;
  /** Callback when open state changes */
  onOpenChange?: (open: boolean) => void;
  /** Default open state for uncontrolled mode */
  defaultOpen?: boolean;
  /** Placement of the popover */
  placement?: PopoverPlacement;
  /** What triggers the popover */
  triggerType?: PopoverTriggerType;
  /** Close when clicking outside */
  closeOnBlur?: boolean;
  /** Close when pressing Escape */
  closeOnEscape?: boolean;
  /** Delay before showing on hover (ms) */
  hoverDelay?: number;
  /** Delay before hiding on hover (ms) */
  hoverCloseDelay?: number;
  /** Disable the popover */
  disabled?: boolean;
}

export interface PopoverTriggerProps extends React.HTMLAttributes<HTMLElement> {
  /** Content of the trigger */
  children: React.ReactNode;
  /** Render trigger as this element */
  as?: React.ElementType;
}

export interface PopoverContentProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Content of the popover */
  children: React.ReactNode;
  /** Offset from trigger (px) */
  offset?: number;
  /** Use portal to render outside DOM hierarchy */
  portal?: boolean;
  /** Portal container */
  portalContainer?: HTMLElement;
  /** Keep content mounted when closed */
  forceMount?: boolean;
  /** Show arrow indicator */
  showArrow?: boolean;
  /** Arrow size in pixels */
  arrowSize?: number;
  /** Align content relative to trigger */
  align?: 'start' | 'center' | 'end';
  /** Side offset (px) */
  sideOffset?: number;
  /** Align offset (px) */
  alignOffset?: number;
}

export interface PopoverCloseProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Content of the close button */
  children: React.ReactNode;
}

// ============================================================================
// Context
// ============================================================================

const PopoverContext = React.createContext<PopoverContextValue | null>(null);

const usePopoverContext = () => {
  const context = React.useContext(PopoverContext);
  if (!context) {
    throw new Error('Popover components must be used within a Popover');
  }
  return context;
};

// ============================================================================
// Utility Hooks
// ============================================================================

const useUniqueId = (prefix: string) => {
  const [id] = React.useState(() => `${prefix}-${Math.random().toString(36).substr(2, 9)}`);
  return id;
};

// ============================================================================
// Popover Component
// ============================================================================

/**
 * Popover - A compound component for creating popovers
 *
 * @example
 * ```tsx
 * <Popover>
 *   <PopoverTrigger>Open</PopoverTrigger>
 *   <PopoverContent>Popover content here</PopoverContent>
 * </Popover>
 * ```
 */
export function Popover({
  children,
  open: controlledOpen,
  onOpenChange,
  defaultOpen = false,
  placement = 'bottom',
  triggerType = 'click',
  closeOnBlur = true,
  closeOnEscape = true,
  hoverDelay = 0,
  disabled = false,
}: PopoverProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(defaultOpen);
  const triggerRef = React.useRef<HTMLElement | null>(null);
  const contentRef = React.useRef<HTMLDivElement | null>(null);
  const triggerId = useUniqueId('popover-trigger');
  const contentId = useUniqueId('popover-content');

  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : uncontrolledOpen;

  const setOpen = React.useCallback(
    (newOpen: boolean) => {
      if (disabled && newOpen) return;

      if (!isControlled) {
        setUncontrolledOpen(newOpen);
      }
      onOpenChange?.(newOpen);
    },
    [disabled, isControlled, onOpenChange]
  );

  const contextValue = React.useMemo<PopoverContextValue>(
    () => ({
      open,
      setOpen,
      triggerRef,
      contentRef,
      triggerId,
      contentId,
      placement,
      triggerType,
      closeOnBlur,
      closeOnEscape,
      hoverDelay,
      disabled,
    }),
    [
      open,
      setOpen,
      triggerId,
      contentId,
      placement,
      triggerType,
      closeOnBlur,
      closeOnEscape,
      hoverDelay,
      disabled,
    ]
  );

  return <PopoverContext.Provider value={contextValue}>{children}</PopoverContext.Provider>;
}

// ============================================================================
// PopoverTrigger Component
// ============================================================================

/**
 * PopoverTrigger - The trigger element for the popover
 */
export const PopoverTrigger = React.forwardRef<HTMLElement, PopoverTriggerProps>(
  ({ children, className, as: Component = 'button', ...props }, forwardedRef) => {
    const context = usePopoverContext();
    const {
      open,
      setOpen,
      triggerRef,
      triggerId,
      contentId,
      triggerType,
      hoverDelay,
      disabled,
    } = context;

    const hoverTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

    // Merge refs
    const mergedRef = React.useCallback(
      (node: HTMLElement | null) => {
        triggerRef.current = node;
        if (typeof forwardedRef === 'function') {
          forwardedRef(node);
        } else if (forwardedRef) {
          forwardedRef.current = node;
        }
      },
      [triggerRef, forwardedRef]
    );

    const handleClick = (e: React.MouseEvent<HTMLElement>) => {
      if (disabled) return;
      if (triggerType === 'click') {
        setOpen(!open);
      }
      props.onClick?.(e);
    };

    const handleContextMenu = (e: React.MouseEvent<HTMLElement>) => {
      if (disabled) return;
      if (triggerType === 'contextMenu') {
        e.preventDefault();
        setOpen(!open);
      }
      props.onContextMenu?.(e);
    };

    const handleMouseEnter = (e: React.MouseEvent<HTMLElement>) => {
      if (disabled) return;
      if (triggerType === 'hover') {
        if (hoverTimeoutRef.current) {
          clearTimeout(hoverTimeoutRef.current);
        }
        if (hoverDelay > 0) {
          hoverTimeoutRef.current = setTimeout(() => setOpen(true), hoverDelay);
        } else {
          setOpen(true);
        }
      }
      props.onMouseEnter?.(e);
    };

    const handleMouseLeave = (e: React.MouseEvent<HTMLElement>) => {
      if (triggerType === 'hover') {
        if (hoverTimeoutRef.current) {
          clearTimeout(hoverTimeoutRef.current);
        }
        setOpen(false);
      }
      props.onMouseLeave?.(e);
    };

    const handleFocus = (e: React.FocusEvent<HTMLElement>) => {
      if (disabled) return;
      if (triggerType === 'focus') {
        setOpen(true);
      }
      props.onFocus?.(e);
    };

    const handleBlur = (e: React.FocusEvent<HTMLElement>) => {
      if (triggerType === 'focus') {
        setOpen(false);
      }
      props.onBlur?.(e);
    };

    // Cleanup timeout on unmount
    React.useEffect(() => {
      return () => {
        if (hoverTimeoutRef.current) {
          clearTimeout(hoverTimeoutRef.current);
        }
      };
    }, []);

    const triggerProps = {
      ref: mergedRef,
      id: triggerId,
      'aria-haspopup': 'dialog' as const,
      'aria-expanded': open,
      'aria-controls': open ? contentId : undefined,
      'aria-disabled': disabled ? true : undefined,
      'data-state': open ? 'open' : 'closed',
      'data-testid': 'popover-trigger',
      onClick: handleClick,
      onContextMenu: handleContextMenu,
      onMouseEnter: handleMouseEnter,
      onMouseLeave: handleMouseLeave,
      onFocus: handleFocus,
      onBlur: handleBlur,
      disabled: Component === 'button' ? disabled : undefined,
      className: cn(
        'inline-flex items-center justify-center',
        disabled && 'opacity-50 cursor-not-allowed',
        className
      ),
      ...props,
    };

    return <Component {...triggerProps}>{children}</Component>;
  }
);

PopoverTrigger.displayName = 'PopoverTrigger';

// ============================================================================
// PopoverContent Component
// ============================================================================

/**
 * PopoverContent - The content container for the popover
 */
export const PopoverContent = React.forwardRef<HTMLDivElement, PopoverContentProps>(
  (
    {
      children,
      className,
      offset = 8,
      portal = true,
      portalContainer,
      forceMount = false,
      showArrow = false,
      arrowSize = 8,
      sideOffset = 0,
      alignOffset = 0,
      ...props
    },
    forwardedRef
  ) => {
    const context = usePopoverContext();
    const {
      open,
      setOpen,
      triggerRef,
      contentRef,
      triggerId,
      contentId,
      placement,
      closeOnBlur,
      closeOnEscape,
      triggerType,
    } = context;

    const [position, setPosition] = React.useState({ top: 0, left: 0 });
    const [arrowPosition, setArrowPosition] = React.useState({ top: 0, left: 0 });
    const [mounted, setMounted] = React.useState(false);

    // Merge refs
    const mergedRef = React.useCallback(
      (node: HTMLDivElement | null) => {
        contentRef.current = node;
        if (typeof forwardedRef === 'function') {
          forwardedRef(node);
        } else if (forwardedRef) {
          forwardedRef.current = node;
        }
      },
      [contentRef, forwardedRef]
    );

    // Handle client-side mounting for portal
    React.useEffect(() => {
      setMounted(true);
    }, []);

    // Calculate position
    React.useEffect(() => {
      if (!open || !triggerRef.current || !contentRef.current) return;

      const trigger = triggerRef.current;
      const content = contentRef.current;
      const triggerRect = trigger.getBoundingClientRect();
      const contentRect = content.getBoundingClientRect();

      let top = 0;
      let left = 0;
      let arrowTop = 0;
      let arrowLeft = 0;

      const [side, alignment = 'center'] = placement.split('-') as [string, string?];

      // Calculate main position based on side
      switch (side) {
        case 'top':
          top = triggerRect.top - contentRect.height - offset;
          left = triggerRect.left + (triggerRect.width - contentRect.width) / 2;
          arrowTop = contentRect.height;
          arrowLeft = contentRect.width / 2 - arrowSize / 2;
          break;
        case 'bottom':
          top = triggerRect.bottom + offset;
          left = triggerRect.left + (triggerRect.width - contentRect.width) / 2;
          arrowTop = -arrowSize;
          arrowLeft = contentRect.width / 2 - arrowSize / 2;
          break;
        case 'left':
          top = triggerRect.top + (triggerRect.height - contentRect.height) / 2;
          left = triggerRect.left - contentRect.width - offset;
          arrowTop = contentRect.height / 2 - arrowSize / 2;
          arrowLeft = contentRect.width;
          break;
        case 'right':
          top = triggerRect.top + (triggerRect.height - contentRect.height) / 2;
          left = triggerRect.right + offset;
          arrowTop = contentRect.height / 2 - arrowSize / 2;
          arrowLeft = -arrowSize;
          break;
      }

      // Adjust for alignment
      if (side === 'top' || side === 'bottom') {
        switch (alignment) {
          case 'start':
            left = triggerRect.left;
            arrowLeft = triggerRect.width / 2 - arrowSize / 2;
            break;
          case 'end':
            left = triggerRect.right - contentRect.width;
            arrowLeft = contentRect.width - triggerRect.width / 2 - arrowSize / 2;
            break;
        }
      } else {
        switch (alignment) {
          case 'start':
            top = triggerRect.top;
            arrowTop = triggerRect.height / 2 - arrowSize / 2;
            break;
          case 'end':
            top = triggerRect.bottom - contentRect.height;
            arrowTop = contentRect.height - triggerRect.height / 2 - arrowSize / 2;
            break;
        }
      }

      // Apply offsets
      left += sideOffset;
      top += alignOffset;

      setPosition({ top, left });
      setArrowPosition({ top: arrowTop, left: arrowLeft });
    }, [open, placement, offset, arrowSize, sideOffset, alignOffset, triggerRef, contentRef]);

    // Handle click outside
    React.useEffect(() => {
      if (!open || !closeOnBlur) return;

      const handleClickOutside = (e: MouseEvent) => {
        const target = e.target as Node;
        if (
          contentRef.current &&
          !contentRef.current.contains(target) &&
          triggerRef.current &&
          !triggerRef.current.contains(target)
        ) {
          setOpen(false);
        }
      };

      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [open, closeOnBlur, setOpen, contentRef, triggerRef]);

    // Handle escape key
    React.useEffect(() => {
      if (!open || !closeOnEscape) return;

      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          setOpen(false);
          triggerRef.current?.focus();
        }
      };

      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }, [open, closeOnEscape, setOpen, triggerRef]);

    // Hover handlers for hover trigger type
    const handleMouseEnter = (e: React.MouseEvent<HTMLDivElement>) => {
      if (triggerType === 'hover') {
        setOpen(true);
      }
      props.onMouseEnter?.(e);
    };

    const handleMouseLeave = (e: React.MouseEvent<HTMLDivElement>) => {
      if (triggerType === 'hover') {
        setOpen(false);
      }
      props.onMouseLeave?.(e);
    };

    const shouldShow = forceMount || open;
    if (!shouldShow) return null;

    const arrowStyles = {
      position: 'absolute' as const,
      top: arrowPosition.top,
      left: arrowPosition.left,
      width: arrowSize,
      height: arrowSize,
      transform: 'rotate(45deg)',
    };

    const content = (
      <div
        ref={mergedRef}
        id={contentId}
        role="dialog"
        aria-modal="false"
        aria-labelledby={triggerId}
        data-state={open ? 'open' : 'closed'}
        data-testid="popover-content"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className={cn(
          'z-50 rounded-lg border border-zinc-200 bg-white p-4 shadow-lg',
          'dark:border-zinc-800 dark:bg-zinc-950',
          'outline-none',
          !open && forceMount && 'hidden',
          className
        )}
        style={{
          position: 'fixed',
          top: position.top,
          left: position.left,
        }}
        {...props}
      >
        {showArrow && (
          <div
            data-testid="popover-arrow"
            className="bg-white border-l border-t border-zinc-200 dark:bg-zinc-950 dark:border-zinc-800"
            style={arrowStyles}
          />
        )}
        {children}
      </div>
    );

    if (portal && mounted) {
      return createPortal(content, portalContainer || document.body);
    }

    return content;
  }
);

PopoverContent.displayName = 'PopoverContent';

// ============================================================================
// PopoverClose Component
// ============================================================================

/**
 * PopoverClose - A button that closes the popover
 */
export const PopoverClose = React.forwardRef<HTMLButtonElement, PopoverCloseProps>(
  ({ children, className, onClick, ...props }, ref) => {
    const { setOpen, triggerRef } = usePopoverContext();

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      setOpen(false);
      triggerRef.current?.focus();
      onClick?.(e);
    };

    return (
      <button
        ref={ref}
        type="button"
        data-testid="popover-close"
        onClick={handleClick}
        className={cn(
          'inline-flex items-center justify-center rounded-md p-1',
          'hover:bg-zinc-100 dark:hover:bg-zinc-800',
          'focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:ring-offset-2',
          className
        )}
        {...props}
      >
        {children}
      </button>
    );
  }
);

PopoverClose.displayName = 'PopoverClose';

// ============================================================================
// SimplePopover Component
// ============================================================================

export interface SimplePopoverProps extends Omit<PopoverProps, 'children'> {
  /** Trigger content */
  trigger: React.ReactNode;
  /** Popover content */
  content: React.ReactNode;
  /** Custom trigger className */
  triggerClassName?: string;
  /** Custom content className */
  contentClassName?: string;
  /** Show arrow indicator */
  showArrow?: boolean;
  /** Offset from trigger */
  offset?: number;
}

/**
 * SimplePopover - A simplified popover with sensible defaults
 *
 * @example
 * ```tsx
 * <SimplePopover
 *   trigger={<button>Open</button>}
 *   content={<div>Popover content</div>}
 * />
 * ```
 */
export function SimplePopover({
  trigger,
  content,
  triggerClassName,
  contentClassName,
  showArrow = false,
  offset = 8,
  ...popoverProps
}: SimplePopoverProps) {
  return (
    <Popover {...popoverProps}>
      <PopoverTrigger className={triggerClassName}>{trigger}</PopoverTrigger>
      <PopoverContent className={contentClassName} showArrow={showArrow} offset={offset}>
        {content}
      </PopoverContent>
    </Popover>
  );
}

// ============================================================================
// Exports
// ============================================================================

export { usePopoverContext };
