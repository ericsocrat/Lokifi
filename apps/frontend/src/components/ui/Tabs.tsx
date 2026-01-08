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
  type KeyboardEvent,
  type ReactNode,
} from 'react';

// ============================================================================
// Types
// ============================================================================

export type TabsVariant = 'default' | 'pills' | 'underline' | 'enclosed';
export type TabsSize = 'sm' | 'md' | 'lg';
export type TabsOrientation = 'horizontal' | 'vertical';

export interface TabItem {
  /** Unique identifier for the tab */
  value: string;
  /** Display label for the tab */
  label: ReactNode;
  /** Icon to display before the label */
  icon?: ReactNode;
  /** Badge content (e.g., count) */
  badge?: ReactNode;
  /** Whether the tab is disabled */
  disabled?: boolean;
  /** Content to render when tab is active */
  content?: ReactNode;
}

export interface TabsContextValue {
  activeTab: string;
  setActiveTab: (value: string) => void;
  variant: TabsVariant;
  size: TabsSize;
  orientation: TabsOrientation;
  baseId: string;
  disabled: boolean;
}

// ============================================================================
// Context
// ============================================================================

const TabsContext = createContext<TabsContextValue | null>(null);

function useTabsContext() {
  const context = useContext(TabsContext);
  if (!context) {
    throw new Error('Tab components must be used within a Tabs component');
  }
  return context;
}

// ============================================================================
// Main Tabs Component
// ============================================================================

export interface TabsProps extends Omit<HTMLAttributes<HTMLDivElement>, 'onChange'> {
  /** Currently active tab value (controlled) */
  value?: string;
  /** Default active tab value (uncontrolled) */
  defaultValue?: string;
  /** Callback when active tab changes */
  onChange?: (value: string) => void;
  /** Visual variant */
  variant?: TabsVariant;
  /** Size variant */
  size?: TabsSize;
  /** Orientation of tabs */
  orientation?: TabsOrientation;
  /** Whether all tabs are disabled */
  disabled?: boolean;
  /** Tab items for simple usage */
  items?: TabItem[];
  /** Full width tabs (fills container) */
  fullWidth?: boolean;
  /** Custom class for tabs list */
  tabsListClassName?: string;
  /** Custom class for tabs content */
  tabsContentClassName?: string;
}

export const Tabs = forwardRef<HTMLDivElement, TabsProps>(
  (
    {
      value,
      defaultValue,
      onChange,
      variant = 'default',
      size = 'md',
      orientation = 'horizontal',
      disabled = false,
      items,
      fullWidth = false,
      tabsListClassName,
      tabsContentClassName,
      className,
      children,
      ...props
    },
    ref
  ) => {
    const baseId = useId();
    const [internalValue, setInternalValue] = useState(defaultValue || items?.[0]?.value || '');

    const activeTab = value !== undefined ? value : internalValue;

    const setActiveTab = useCallback(
      (newValue: string) => {
        if (value === undefined) {
          setInternalValue(newValue);
        }
        onChange?.(newValue);
      },
      [value, onChange]
    );

    const contextValue = useMemo(
      () => ({
        activeTab,
        setActiveTab,
        variant,
        size,
        orientation,
        baseId,
        disabled,
      }),
      [activeTab, setActiveTab, variant, size, orientation, baseId, disabled]
    );

    // Simple API with items prop
    if (items) {
      return (
        <TabsContext.Provider value={contextValue}>
          <div
            ref={ref}
            className={cn('w-full', orientation === 'vertical' && 'flex gap-4', className)}
            data-testid="tabs"
            {...props}
          >
            <TabsList fullWidth={fullWidth} className={tabsListClassName}>
              {items.map((item) => (
                <TabsTrigger
                  key={item.value}
                  value={item.value}
                  disabled={item.disabled}
                  icon={item.icon}
                  badge={item.badge}
                >
                  {item.label}
                </TabsTrigger>
              ))}
            </TabsList>
            <div className={cn('flex-1', tabsContentClassName)}>
              {items.map((item) => (
                <TabsContent key={item.value} value={item.value}>
                  {item.content}
                </TabsContent>
              ))}
            </div>
          </div>
        </TabsContext.Provider>
      );
    }

    // Compound component API
    return (
      <TabsContext.Provider value={contextValue}>
        <div
          ref={ref}
          className={cn('w-full', orientation === 'vertical' && 'flex gap-4', className)}
          data-testid="tabs"
          {...props}
        >
          {children}
        </div>
      </TabsContext.Provider>
    );
  }
);

Tabs.displayName = 'Tabs';

// ============================================================================
// TabsList Component
// ============================================================================

export interface TabsListProps extends HTMLAttributes<HTMLDivElement> {
  /** Whether tabs should fill the container width */
  fullWidth?: boolean;
}

export const TabsList = forwardRef<HTMLDivElement, TabsListProps>(
  ({ fullWidth = false, className, children, ...props }, ref) => {
    const { variant, size, orientation, baseId, disabled } = useTabsContext();

    // Get all tab triggers for keyboard navigation
    const handleKeyDown = useCallback(
      (e: KeyboardEvent<HTMLDivElement>) => {
        const target = e.target as HTMLElement;
        if (target.getAttribute('role') !== 'tab') return;

        const tabs = Array.from(
          e.currentTarget.querySelectorAll('[role="tab"]:not([disabled])')
        ) as HTMLElement[];
        const currentIndex = tabs.indexOf(target);

        let newIndex = currentIndex;
        const isHorizontal = orientation === 'horizontal';

        switch (e.key) {
          case 'ArrowRight':
            if (isHorizontal) {
              newIndex = (currentIndex + 1) % tabs.length;
            }
            break;
          case 'ArrowLeft':
            if (isHorizontal) {
              newIndex = (currentIndex - 1 + tabs.length) % tabs.length;
            }
            break;
          case 'ArrowDown':
            if (!isHorizontal) {
              newIndex = (currentIndex + 1) % tabs.length;
            }
            break;
          case 'ArrowUp':
            if (!isHorizontal) {
              newIndex = (currentIndex - 1 + tabs.length) % tabs.length;
            }
            break;
          case 'Home':
            newIndex = 0;
            break;
          case 'End':
            newIndex = tabs.length - 1;
            break;
          default:
            return;
        }

        e.preventDefault();
        tabs[newIndex]?.focus();
        tabs[newIndex]?.click();
      },
      [orientation]
    );

    const sizeStyles = {
      sm: 'gap-0.5',
      md: 'gap-1',
      lg: 'gap-2',
    };

    const variantStyles = {
      default: 'bg-surface-100 p-1 rounded-lg',
      pills: 'gap-2',
      underline: 'border-b border-border',
      enclosed: 'border-b border-border',
    };

    return (
      <div
        ref={ref}
        role="tablist"
        aria-orientation={orientation}
        aria-disabled={disabled}
        onKeyDown={handleKeyDown}
        className={cn(
          'flex',
          orientation === 'vertical' ? 'flex-col' : 'flex-row',
          fullWidth && orientation === 'horizontal' && '*:flex-1',
          sizeStyles[size],
          variantStyles[variant],
          className
        )}
        data-testid="tabs-list"
        {...props}
      >
        {children}
      </div>
    );
  }
);

TabsList.displayName = 'TabsList';

// ============================================================================
// TabsTrigger Component
// ============================================================================

export interface TabsTriggerProps extends Omit<HTMLAttributes<HTMLButtonElement>, 'children'> {
  /** Value to identify this tab */
  value: string;
  /** Whether the tab is disabled */
  disabled?: boolean;
  /** Icon to display before the label */
  icon?: ReactNode;
  /** Badge content (e.g., count) */
  badge?: ReactNode;
  /** Tab label content */
  children?: ReactNode;
}

export const TabsTrigger = forwardRef<HTMLButtonElement, TabsTriggerProps>(
  ({ value, disabled = false, icon, badge, className, children, ...props }, ref) => {
    const {
      activeTab,
      setActiveTab,
      variant,
      size,
      baseId,
      disabled: tabsDisabled,
    } = useTabsContext();

    const isActive = activeTab === value;
    const isDisabled = disabled || tabsDisabled;

    const handleClick = useCallback(() => {
      if (!isDisabled) {
        setActiveTab(value);
      }
    }, [isDisabled, setActiveTab, value]);

    const sizeStyles = {
      sm: 'px-2.5 py-1 text-xs',
      md: 'px-3 py-1.5 text-sm',
      lg: 'px-4 py-2 text-base',
    };

    const getVariantStyles = () => {
      const base =
        'font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2';

      switch (variant) {
        case 'default':
          return cn(
            base,
            'rounded-md',
            isActive
              ? 'bg-white text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground hover:bg-surface-50'
          );
        case 'pills':
          return cn(
            base,
            'rounded-full',
            isActive
              ? 'bg-primary text-white'
              : 'text-muted-foreground hover:text-foreground hover:bg-surface-100'
          );
        case 'underline':
          return cn(
            base,
            'border-b-2 -mb-px rounded-none',
            isActive
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
          );
        case 'enclosed':
          return cn(
            base,
            'border border-transparent -mb-px rounded-t-lg',
            isActive
              ? 'bg-background border-border border-b-background'
              : 'text-muted-foreground hover:text-foreground hover:bg-surface-50'
          );
        default:
          return base;
      }
    };

    return (
      <button
        ref={ref}
        type="button"
        role="tab"
        id={`${baseId}-tab-${value}`}
        aria-selected={isActive}
        aria-controls={`${baseId}-panel-${value}`}
        aria-disabled={isDisabled}
        disabled={isDisabled}
        tabIndex={isActive ? 0 : -1}
        onClick={handleClick}
        className={cn(
          'inline-flex items-center justify-center gap-2 whitespace-nowrap',
          sizeStyles[size],
          getVariantStyles(),
          isDisabled && 'opacity-50 cursor-not-allowed pointer-events-none',
          className
        )}
        data-testid={`tab-${value}`}
        data-state={isActive ? 'active' : 'inactive'}
        {...props}
      >
        {icon && <span className="shrink-0">{icon}</span>}
        {children}
        {badge !== undefined && badge !== null && (
          <span
            className={cn(
              'inline-flex items-center justify-center min-w-5 h-5 px-1.5 text-xs font-medium rounded-full',
              isActive
                ? variant === 'pills'
                  ? 'bg-white/20 text-white'
                  : 'bg-primary/10 text-primary'
                : 'bg-surface-200 text-muted-foreground'
            )}
          >
            {badge}
          </span>
        )}
      </button>
    );
  }
);

TabsTrigger.displayName = 'TabsTrigger';

// ============================================================================
// TabsContent Component
// ============================================================================

export interface TabsContentProps extends HTMLAttributes<HTMLDivElement> {
  /** Value to identify which tab this content belongs to */
  value: string;
  /** Whether to keep content mounted when inactive */
  forceMount?: boolean;
}

export const TabsContent = forwardRef<HTMLDivElement, TabsContentProps>(
  ({ value, forceMount = false, className, children, ...props }, ref) => {
    const { activeTab, baseId } = useTabsContext();
    const isActive = activeTab === value;

    // Don't render if not active and not force mounted
    if (!isActive && !forceMount) {
      return null;
    }

    return (
      <div
        ref={ref}
        id={`${baseId}-panel-${value}`}
        role="tabpanel"
        aria-labelledby={`${baseId}-tab-${value}`}
        tabIndex={0}
        hidden={!isActive}
        className={cn(
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-lg',
          forceMount && !isActive && 'hidden',
          className
        )}
        data-testid={`tab-content-${value}`}
        data-state={isActive ? 'active' : 'inactive'}
        {...props}
      >
        {children}
      </div>
    );
  }
);

TabsContent.displayName = 'TabsContent';

// ============================================================================
// Exports
// ============================================================================

export default Tabs;

