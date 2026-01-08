'use client';

import { cn } from '@/lib/utils';
import {
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useId,
  useMemo,
  useState,
  type HTMLAttributes,
  type ReactNode,
} from 'react';

// ============================================================================
// Types
// ============================================================================

export type AccordionType = 'single' | 'multiple';

export type AccordionVariant = 'default' | 'bordered' | 'separated' | 'flush';

export interface AccordionContextValue {
  expandedItems: string[];
  toggleItem: (itemId: string) => void;
  type: AccordionType;
  variant: AccordionVariant;
  disabled: boolean;
  iconPosition: 'left' | 'right';
  collapsible: boolean;
}

export interface AccordionItemContextValue {
  itemId: string;
  isExpanded: boolean;
  isDisabled: boolean;
  triggerId: string;
  contentId: string;
}

// ============================================================================
// Contexts
// ============================================================================

const AccordionContext = createContext<AccordionContextValue | null>(null);

function useAccordionContext() {
  const context = useContext(AccordionContext);
  if (!context) {
    throw new Error('Accordion components must be used within an Accordion');
  }
  return context;
}

const AccordionItemContext = createContext<AccordionItemContextValue | null>(null);

function useAccordionItemContext() {
  const context = useContext(AccordionItemContext);
  if (!context) {
    throw new Error('AccordionTrigger and AccordionContent must be used within an AccordionItem');
  }
  return context;
}

// ============================================================================
// Accordion Root Component
// ============================================================================

export interface AccordionProps extends Omit<HTMLAttributes<HTMLDivElement>, 'onChange'> {
  children: ReactNode;
  /** Single or multiple items can be expanded */
  type?: AccordionType;
  /** Visual variant */
  variant?: AccordionVariant;
  /** Controlled value for expanded items */
  value?: string | string[];
  /** Default expanded items (uncontrolled) */
  defaultValue?: string | string[];
  /** Callback when expanded items change */
  onValueChange?: (value: string | string[]) => void;
  /** Disable all items */
  disabled?: boolean;
  /** Position of expand/collapse icon */
  iconPosition?: 'left' | 'right';
  /** Allow collapsing all items in single mode */
  collapsible?: boolean;
}

export const Accordion = forwardRef<HTMLDivElement, AccordionProps>(
  (
    {
      children,
      type = 'single',
      variant = 'default',
      value,
      defaultValue,
      onValueChange,
      disabled = false,
      iconPosition = 'right',
      collapsible = false,
      className,
      ...props
    },
    ref
  ) => {
    // Convert defaultValue to array for internal state
    const getInitialState = (): string[] => {
      if (defaultValue !== undefined) {
        return Array.isArray(defaultValue) ? defaultValue : [defaultValue];
      }
      return [];
    };

    const [internalExpanded, setInternalExpanded] = useState<string[]>(getInitialState);

    // Handle controlled vs uncontrolled
    const expandedItems = useMemo(() => {
      if (value !== undefined) {
        return Array.isArray(value) ? value : [value];
      }
      return internalExpanded;
    }, [value, internalExpanded]);

    const toggleItem = useCallback(
      (itemId: string) => {
        const isExpanded = expandedItems.includes(itemId);

        let newExpanded: string[];

        if (type === 'single') {
          if (isExpanded) {
            // In single mode, only collapse if collapsible is true
            newExpanded = collapsible ? [] : [itemId];
          } else {
            newExpanded = [itemId];
          }
        } else {
          // Multiple mode
          if (isExpanded) {
            newExpanded = expandedItems.filter((id) => id !== itemId);
          } else {
            newExpanded = [...expandedItems, itemId];
          }
        }

        // Update internal state if uncontrolled
        if (value === undefined) {
          setInternalExpanded(newExpanded);
        }

        // Call onValueChange callback
        if (onValueChange) {
          if (type === 'single') {
            onValueChange(newExpanded[0] || '');
          } else {
            onValueChange(newExpanded);
          }
        }
      },
      [expandedItems, type, collapsible, value, onValueChange]
    );

    const contextValue = useMemo(
      () => ({
        expandedItems,
        toggleItem,
        type,
        variant,
        disabled,
        iconPosition,
        collapsible,
      }),
      [expandedItems, toggleItem, type, variant, disabled, iconPosition, collapsible]
    );

    const variantStyles = {
      default: 'divide-y divide-border',
      bordered: 'border border-border rounded-lg divide-y divide-border overflow-hidden',
      separated: 'space-y-2',
      flush: '',
    };

    return (
      <AccordionContext.Provider value={contextValue}>
        <div
          ref={ref}
          role="region"
          className={cn(variantStyles[variant], className)}
          data-testid="accordion"
          {...props}
        >
          {children}
        </div>
      </AccordionContext.Provider>
    );
  }
);

Accordion.displayName = 'Accordion';

// ============================================================================
// AccordionItem Component
// ============================================================================

export interface AccordionItemProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  /** Unique identifier for this item */
  value: string;
  /** Disable this specific item */
  disabled?: boolean;
}

export const AccordionItem = forwardRef<HTMLDivElement, AccordionItemProps>(
  ({ children, value, disabled: itemDisabled = false, className, ...props }, ref) => {
    const { expandedItems, disabled: accordionDisabled, variant } = useAccordionContext();
    const itemId = useId();

    const isExpanded = expandedItems.includes(value);
    const isDisabled = accordionDisabled || itemDisabled;

    const contextValue = useMemo(
      () => ({
        itemId: value,
        isExpanded,
        isDisabled,
        triggerId: `${itemId}-trigger`,
        contentId: `${itemId}-content`,
      }),
      [value, isExpanded, isDisabled, itemId]
    );

    const variantStyles = {
      default: '',
      bordered: '',
      separated: 'border border-border rounded-lg overflow-hidden',
      flush: '',
    };

    return (
      <AccordionItemContext.Provider value={contextValue}>
        <div
          ref={ref}
          data-state={isExpanded ? 'open' : 'closed'}
          data-disabled={isDisabled || undefined}
          className={cn(variantStyles[variant], className)}
          data-testid="accordion-item"
          {...props}
        >
          {children}
        </div>
      </AccordionItemContext.Provider>
    );
  }
);

AccordionItem.displayName = 'AccordionItem';

// ============================================================================
// AccordionTrigger Component
// ============================================================================

export interface AccordionTriggerProps extends HTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  /** Custom icon element */
  icon?: ReactNode;
  /** Hide the default icon */
  hideIcon?: boolean;
}

export const AccordionTrigger = forwardRef<HTMLButtonElement, AccordionTriggerProps>(
  ({ children, icon, hideIcon = false, className, ...props }, ref) => {
    const { toggleItem, iconPosition, variant } = useAccordionContext();
    const { itemId, isExpanded, isDisabled, triggerId, contentId } = useAccordionItemContext();

    const handleClick = useCallback(() => {
      if (!isDisabled) {
        toggleItem(itemId);
      }
    }, [isDisabled, toggleItem, itemId]);

    const handleKeyDown = useCallback(
      (e: React.KeyboardEvent<HTMLButtonElement>) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick();
        }
      },
      [handleClick]
    );

    const defaultIcon = (
      <svg
        className={cn(
          'h-4 w-4 shrink-0 transition-transform duration-200',
          isExpanded && 'rotate-180'
        )}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
      </svg>
    );

    const iconElement = !hideIcon && (
      <span className="flex items-center">{icon || defaultIcon}</span>
    );

    const variantStyles = {
      default: 'hover:bg-surface-100',
      bordered: 'hover:bg-surface-100',
      separated: 'hover:bg-surface-100',
      flush: 'hover:bg-surface-100',
    };

    return (
      <button
        ref={ref}
        id={triggerId}
        type="button"
        role="button"
        aria-expanded={isExpanded}
        aria-controls={contentId}
        aria-disabled={isDisabled}
        disabled={isDisabled}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        className={cn(
          'flex w-full items-center justify-between py-4 px-4 text-left font-medium transition-colors',
          variantStyles[variant],
          isDisabled && 'cursor-not-allowed opacity-50',
          className
        )}
        data-state={isExpanded ? 'open' : 'closed'}
        data-disabled={isDisabled || undefined}
        data-testid="accordion-trigger"
        {...props}
      >
        {iconPosition === 'left' && iconElement}
        <span className="flex-1">{children}</span>
        {iconPosition === 'right' && iconElement}
      </button>
    );
  }
);

AccordionTrigger.displayName = 'AccordionTrigger';

// ============================================================================
// AccordionContent Component
// ============================================================================

export interface AccordionContentProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  /** Force mount (keep in DOM when collapsed) */
  forceMount?: boolean;
}

export const AccordionContent = forwardRef<HTMLDivElement, AccordionContentProps>(
  ({ children, forceMount = false, className, ...props }, ref) => {
    const { isExpanded, isDisabled, triggerId, contentId } = useAccordionItemContext();

    if (!isExpanded && !forceMount) {
      return null;
    }

    return (
      <div
        ref={ref}
        id={contentId}
        role="region"
        aria-labelledby={triggerId}
        hidden={!isExpanded}
        className={cn(
          'overflow-hidden transition-all',
          isExpanded ? 'animate-accordion-down' : 'animate-accordion-up',
          !isExpanded && forceMount && 'hidden',
          className
        )}
        data-state={isExpanded ? 'open' : 'closed'}
        data-disabled={isDisabled || undefined}
        data-testid="accordion-content"
        {...props}
      >
        <div className="px-4 pb-4 pt-0">{children}</div>
      </div>
    );
  }
);

AccordionContent.displayName = 'AccordionContent';

// ============================================================================
// SimpleAccordion - Convenience wrapper with items prop
// ============================================================================

export interface AccordionItemData {
  /** Unique identifier */
  value: string;
  /** Trigger text */
  title: ReactNode;
  /** Content to show when expanded */
  content: ReactNode;
  /** Disable this item */
  disabled?: boolean;
  /** Custom icon for this item */
  icon?: ReactNode;
}

export interface SimpleAccordionProps extends Omit<AccordionProps, 'children'> {
  /** Array of accordion items */
  items: AccordionItemData[];
  /** Hide icons for all items */
  hideIcons?: boolean;
}

export const SimpleAccordion = forwardRef<HTMLDivElement, SimpleAccordionProps>(
  ({ items, hideIcons = false, ...props }, ref) => {
    return (
      <Accordion ref={ref} {...props}>
        {items.map((item) => (
          <AccordionItem key={item.value} value={item.value} disabled={item.disabled}>
            <AccordionTrigger icon={item.icon} hideIcon={hideIcons}>
              {item.title}
            </AccordionTrigger>
            <AccordionContent>{item.content}</AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    );
  }
);

SimpleAccordion.displayName = 'SimpleAccordion';

// ============================================================================
// Exports
// ============================================================================

export default Accordion;


