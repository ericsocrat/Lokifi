'use client';

import { cn } from '@/lib/utils';
import {
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type HTMLAttributes,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';

// ============================================================================
// Types
// ============================================================================

export type TooltipPlacement =
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

export type TooltipVariant = 'dark' | 'light' | 'primary' | 'info' | 'success' | 'warning' | 'danger';

export interface TooltipContextValue {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  triggerRef: React.RefObject<HTMLElement | null>;
  tooltipId: string;
  placement: TooltipPlacement;
  variant: TooltipVariant;
  offset: number;
  delay: number;
  delayHide: number;
  interactive: boolean;
}

// ============================================================================
// Context
// ============================================================================

const TooltipContext = createContext<TooltipContextValue | null>(null);

function useTooltipContext() {
  const context = useContext(TooltipContext);
  if (!context) {
    throw new Error('Tooltip components must be used within a TooltipProvider');
  }
  return context;
}

// ============================================================================
// TooltipProvider Component
// ============================================================================

export interface TooltipProviderProps {
  children: ReactNode;
  /** Default delay before showing tooltip (ms) */
  defaultDelay?: number;
  /** Default delay before hiding tooltip (ms) */
  defaultDelayHide?: number;
  /** Skip delay on subsequent hovers within this time window (ms) */
  skipDelayDuration?: number;
}

interface TooltipProviderContextValue {
  defaultDelay: number;
  defaultDelayHide: number;
  skipDelayDuration: number;
  lastHideTime: number;
  setLastHideTime: (time: number) => void;
}

const TooltipProviderContext = createContext<TooltipProviderContextValue>({
  defaultDelay: 700,
  defaultDelayHide: 0,
  skipDelayDuration: 300,
  lastHideTime: 0,
  setLastHideTime: () => {},
});

export function TooltipProvider({
  children,
  defaultDelay = 700,
  defaultDelayHide = 0,
  skipDelayDuration = 300,
}: TooltipProviderProps) {
  const [lastHideTime, setLastHideTime] = useState(0);

  const value = useMemo(
    () => ({
      defaultDelay,
      defaultDelayHide,
      skipDelayDuration,
      lastHideTime,
      setLastHideTime,
    }),
    [defaultDelay, defaultDelayHide, skipDelayDuration, lastHideTime]
  );

  return (
    <TooltipProviderContext.Provider value={value}>
      {children}
    </TooltipProviderContext.Provider>
  );
}

// ============================================================================
// Tooltip Root Component
// ============================================================================

export interface TooltipProps {
  children: ReactNode;
  /** Placement of the tooltip */
  placement?: TooltipPlacement;
  /** Visual variant */
  variant?: TooltipVariant;
  /** Distance from trigger element (px) */
  offset?: number;
  /** Delay before showing (ms) - overrides provider default */
  delay?: number;
  /** Delay before hiding (ms) - overrides provider default */
  delayHide?: number;
  /** Whether tooltip stays open when hovering over it */
  interactive?: boolean;
  /** Controlled open state */
  open?: boolean;
  /** Callback when open state changes */
  onOpenChange?: (open: boolean) => void;
  /** Default open state (uncontrolled) */
  defaultOpen?: boolean;
}

export function Tooltip({
  children,
  placement = 'top',
  variant = 'dark',
  offset = 8,
  delay,
  delayHide,
  interactive = false,
  open,
  onOpenChange,
  defaultOpen = false,
}: TooltipProps) {
  const tooltipId = useId();
  const triggerRef = useRef<HTMLElement | null>(null);
  const [internalOpen, setInternalOpen] = useState(defaultOpen);

  const { defaultDelay, defaultDelayHide } = useContext(TooltipProviderContext);
  const effectiveDelay = delay ?? defaultDelay;
  const effectiveDelayHide = delayHide ?? defaultDelayHide;

  const isOpen = open !== undefined ? open : internalOpen;

  const setIsOpen = useCallback(
    (newOpen: boolean) => {
      if (open === undefined) {
        setInternalOpen(newOpen);
      }
      onOpenChange?.(newOpen);
    },
    [open, onOpenChange]
  );

  const contextValue = useMemo(
    () => ({
      isOpen,
      setIsOpen,
      triggerRef,
      tooltipId,
      placement,
      variant,
      offset,
      delay: effectiveDelay,
      delayHide: effectiveDelayHide,
      interactive,
    }),
    [
      isOpen,
      setIsOpen,
      tooltipId,
      placement,
      variant,
      offset,
      effectiveDelay,
      effectiveDelayHide,
      interactive,
    ]
  );

  return (
    <TooltipContext.Provider value={contextValue}>
      {children}
    </TooltipContext.Provider>
  );
}

// ============================================================================
// TooltipTrigger Component
// ============================================================================

export interface TooltipTriggerProps extends HTMLAttributes<HTMLElement> {
  /** Element to render as trigger */
  asChild?: boolean;
  children: ReactNode;
}

export const TooltipTrigger = forwardRef<HTMLElement, TooltipTriggerProps>(
  ({ asChild = false, children, className, ...props }, ref) => {
    const { setIsOpen, triggerRef, tooltipId, delay, delayHide, interactive } =
      useTooltipContext();
    const { skipDelayDuration, lastHideTime, setLastHideTime } = useContext(
      TooltipProviderContext
    );

    const showTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const clearTimeouts = useCallback(() => {
      if (showTimeoutRef.current) {
        clearTimeout(showTimeoutRef.current);
        showTimeoutRef.current = null;
      }
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
        hideTimeoutRef.current = null;
      }
    }, []);

    const handleShow = useCallback(() => {
      clearTimeouts();

      // Skip delay if recently hid another tooltip
      const timeSinceLastHide = Date.now() - lastHideTime;
      const effectiveDelay =
        timeSinceLastHide < skipDelayDuration ? 0 : delay;

      showTimeoutRef.current = setTimeout(() => {
        setIsOpen(true);
      }, effectiveDelay);
    }, [clearTimeouts, delay, lastHideTime, setIsOpen, skipDelayDuration]);

    const handleHide = useCallback(() => {
      clearTimeouts();

      hideTimeoutRef.current = setTimeout(() => {
        setIsOpen(false);
        setLastHideTime(Date.now());
      }, delayHide);
    }, [clearTimeouts, delayHide, setIsOpen, setLastHideTime]);

    const handleMouseEnter = useCallback(() => {
      handleShow();
    }, [handleShow]);

    const handleMouseLeave = useCallback(() => {
      if (!interactive) {
        handleHide();
      }
    }, [handleHide, interactive]);

    const handleFocus = useCallback(() => {
      handleShow();
    }, [handleShow]);

    const handleBlur = useCallback(() => {
      handleHide();
    }, [handleHide]);

    // Set ref for positioning
    const setRefs = useCallback(
      (element: HTMLElement | null) => {
        triggerRef.current = element;
        if (typeof ref === 'function') {
          ref(element);
        } else if (ref) {
          ref.current = element;
        }
      },
      [ref, triggerRef]
    );

    // Cleanup on unmount
    useEffect(() => {
      return () => {
        clearTimeouts();
      };
    }, [clearTimeouts]);

    const triggerProps = {
      ref: setRefs,
      onMouseEnter: handleMouseEnter,
      onMouseLeave: handleMouseLeave,
      onFocus: handleFocus,
      onBlur: handleBlur,
      'aria-describedby': tooltipId,
      className: cn('outline-none', className),
      ...props,
    };

    // If asChild is true, clone the child element with tooltip props
    if (asChild && typeof children === 'object' && children !== null) {
      // This is a simplified implementation
      // For full asChild support, consider using @radix-ui/react-slot
      return (
        <span {...triggerProps} data-testid="tooltip-trigger">
          {children}
        </span>
      );
    }

    return (
      <span {...triggerProps} data-testid="tooltip-trigger">
        {children}
      </span>
    );
  }
);

TooltipTrigger.displayName = 'TooltipTrigger';

// ============================================================================
// TooltipContent Component
// ============================================================================

export interface TooltipContentProps extends HTMLAttributes<HTMLDivElement> {
  /** Arrow indicator */
  arrow?: boolean;
  /** Max width of tooltip */
  maxWidth?: number | string;
  /** Force mount (keep in DOM when hidden) */
  forceMount?: boolean;
  /** Callback for mouse enter on tooltip content (for interactive mode) */
  onMouseEnter?: () => void;
  /** Callback for mouse leave on tooltip content (for interactive mode) */
  onMouseLeave?: () => void;
}

export const TooltipContent = forwardRef<HTMLDivElement, TooltipContentProps>(
  (
    {
      arrow = true,
      maxWidth = 300,
      forceMount = false,
      className,
      children,
      ...props
    },
    ref
  ) => {
    const {
      isOpen,
      setIsOpen,
      triggerRef,
      tooltipId,
      placement,
      variant,
      offset,
      delayHide,
      interactive,
    } = useTooltipContext();
    const { setLastHideTime } = useContext(TooltipProviderContext);

    const [position, setPosition] = useState({ top: 0, left: 0 });
    const [mounted, setMounted] = useState(false);
    const tooltipRef = useRef<HTMLDivElement | null>(null);
    const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Handle client-side mounting for portal
    useEffect(() => {
      setMounted(true);
    }, []);

    // Calculate position
    useEffect(() => {
      if (!isOpen || !triggerRef.current) return;

      const updatePosition = () => {
        const trigger = triggerRef.current;
        const tooltip = tooltipRef.current;
        if (!trigger || !tooltip) return;

        const triggerRect = trigger.getBoundingClientRect();
        const tooltipRect = tooltip.getBoundingClientRect();

        let top = 0;
        let left = 0;

        // Calculate base position
        const [side, align] = placement.includes('-')
          ? (placement.split('-') as [string, string])
          : [placement, 'center'];

        switch (side) {
          case 'top':
            top = triggerRect.top - tooltipRect.height - offset;
            left = triggerRect.left + (triggerRect.width - tooltipRect.width) / 2;
            break;
          case 'bottom':
            top = triggerRect.bottom + offset;
            left = triggerRect.left + (triggerRect.width - tooltipRect.width) / 2;
            break;
          case 'left':
            top = triggerRect.top + (triggerRect.height - tooltipRect.height) / 2;
            left = triggerRect.left - tooltipRect.width - offset;
            break;
          case 'right':
            top = triggerRect.top + (triggerRect.height - tooltipRect.height) / 2;
            left = triggerRect.right + offset;
            break;
        }

        // Apply alignment
        if (align === 'start') {
          if (side === 'top' || side === 'bottom') {
            left = triggerRect.left;
          } else {
            top = triggerRect.top;
          }
        } else if (align === 'end') {
          if (side === 'top' || side === 'bottom') {
            left = triggerRect.right - tooltipRect.width;
          } else {
            top = triggerRect.bottom - tooltipRect.height;
          }
        }

        // Add scroll offset
        top += window.scrollY;
        left += window.scrollX;

        setPosition({ top, left });
      };

      updatePosition();
      window.addEventListener('scroll', updatePosition, true);
      window.addEventListener('resize', updatePosition);

      return () => {
        window.removeEventListener('scroll', updatePosition, true);
        window.removeEventListener('resize', updatePosition);
      };
    }, [isOpen, placement, offset, triggerRef]);

    // Handle interactive tooltip
    const handleMouseEnter = useCallback(() => {
      if (interactive && hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
        hideTimeoutRef.current = null;
      }
    }, [interactive]);

    const handleMouseLeave = useCallback(() => {
      if (interactive) {
        hideTimeoutRef.current = setTimeout(() => {
          setIsOpen(false);
          setLastHideTime(Date.now());
        }, delayHide);
      }
    }, [interactive, delayHide, setIsOpen, setLastHideTime]);

    // Cleanup on unmount
    useEffect(() => {
      return () => {
        if (hideTimeoutRef.current) {
          clearTimeout(hideTimeoutRef.current);
        }
      };
    }, []);

    // Set refs
    const setRefs = useCallback(
      (element: HTMLDivElement | null) => {
        tooltipRef.current = element;
        if (typeof ref === 'function') {
          ref(element);
        } else if (ref) {
          ref.current = element;
        }
      },
      [ref]
    );

    const variantStyles = {
      dark: 'bg-surface-900 text-white',
      light: 'bg-white text-surface-900 border border-border shadow-lg',
      primary: 'bg-primary text-white',
      info: 'bg-blue-500 text-white',
      success: 'bg-green-500 text-white',
      warning: 'bg-yellow-500 text-surface-900',
      danger: 'bg-red-500 text-white',
    };

    const arrowStyles = {
      dark: 'border-surface-900',
      light: 'border-white',
      primary: 'border-primary',
      info: 'border-blue-500',
      success: 'border-green-500',
      warning: 'border-yellow-500',
      danger: 'border-red-500',
    };

    const getArrowPosition = () => {
      const [side] = placement.includes('-')
        ? (placement.split('-') as [string, string])
        : [placement, 'center'];

      switch (side) {
        case 'top':
          return 'bottom-0 left-1/2 -translate-x-1/2 translate-y-full border-l-transparent border-r-transparent border-b-transparent';
        case 'bottom':
          return 'top-0 left-1/2 -translate-x-1/2 -translate-y-full border-l-transparent border-r-transparent border-t-transparent';
        case 'left':
          return 'right-0 top-1/2 translate-x-full -translate-y-1/2 border-t-transparent border-b-transparent border-r-transparent';
        case 'right':
          return 'left-0 top-1/2 -translate-x-full -translate-y-1/2 border-t-transparent border-b-transparent border-l-transparent';
        default:
          return '';
      }
    };

    if (!mounted) return null;
    if (!isOpen && !forceMount) return null;

    const tooltipContent = (
      <div
        ref={setRefs}
        id={tooltipId}
        role="tooltip"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        style={{
          position: 'absolute',
          top: position.top,
          left: position.left,
          maxWidth: typeof maxWidth === 'number' ? `${maxWidth}px` : maxWidth,
          zIndex: 9999,
          visibility: isOpen ? 'visible' : 'hidden',
          opacity: isOpen ? 1 : 0,
        }}
        className={cn(
          'px-3 py-1.5 text-sm rounded-lg transition-opacity duration-200',
          variantStyles[variant],
          className
        )}
        data-testid="tooltip-content"
        data-state={isOpen ? 'open' : 'closed'}
        data-side={placement.split('-')[0]}
        {...props}
      >
        {children}
        {arrow && (
          <span
            className={cn(
              'absolute w-0 h-0 border-4',
              getArrowPosition(),
              arrowStyles[variant]
            )}
            data-testid="tooltip-arrow"
          />
        )}
      </div>
    );

    return createPortal(tooltipContent, document.body);
  }
);

TooltipContent.displayName = 'TooltipContent';

// ============================================================================
// Simple Tooltip Component (combines all parts)
// ============================================================================

export interface SimpleTooltipProps extends Omit<TooltipProps, 'children'> {
  /** Tooltip content */
  content: ReactNode;
  /** Trigger element */
  children: ReactNode;
  /** Show arrow */
  arrow?: boolean;
  /** Max width */
  maxWidth?: number | string;
  /** Custom className for content */
  contentClassName?: string;
  /** Custom className for trigger */
  triggerClassName?: string;
}

export function SimpleTooltip({
  content,
  children,
  arrow = true,
  maxWidth = 300,
  contentClassName,
  triggerClassName,
  ...tooltipProps
}: SimpleTooltipProps) {
  return (
    <Tooltip {...tooltipProps}>
      <TooltipTrigger className={triggerClassName}>
        {children}
      </TooltipTrigger>
      <TooltipContent
        arrow={arrow}
        maxWidth={maxWidth}
        className={contentClassName}
      >
        {content}
      </TooltipContent>
    </Tooltip>
  );
}

// ============================================================================
// Exports
// ============================================================================

export default Tooltip;
