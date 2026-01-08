'use client';

import { cn } from '@/lib/utils';
import * as React from 'react';

// ============================================================================
// Types
// ============================================================================

export type DropdownMenuAlign = 'start' | 'center' | 'end';
export type DropdownMenuSide = 'top' | 'right' | 'bottom' | 'left';

export interface DropdownMenuContextValue {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  triggerId: string;
  contentId: string;
  activeItemIndex: number;
  setActiveItemIndex: React.Dispatch<React.SetStateAction<number>>;
  registerItem: (id: string) => void;
  unregisterItem: (id: string) => void;
  items: string[];
}

export interface DropdownMenuProps {
  /** Controlled open state */
  open?: boolean;
  /** Default open state */
  defaultOpen?: boolean;
  /** Callback when open state changes */
  onOpenChange?: (open: boolean) => void;
  /** Menu content */
  children: React.ReactNode;
  /** Whether the menu is modal (blocks outside interactions) */
  modal?: boolean;
}

export interface DropdownMenuTriggerProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Trigger content */
  children: React.ReactNode;
  /** Custom className */
  className?: string;
  /** Whether the trigger is disabled */
  disabled?: boolean;
  /** Additional props for accessibility */
  asChild?: boolean;
}

export interface DropdownMenuContentProps {
  /** Menu items */
  children: React.ReactNode;
  /** Custom className */
  className?: string;
  /** Alignment relative to trigger */
  align?: DropdownMenuAlign;
  /** Side relative to trigger */
  side?: DropdownMenuSide;
  /** Offset from trigger in pixels */
  sideOffset?: number;
  /** Whether to close on escape */
  closeOnEscape?: boolean;
  /** Whether to close on click outside */
  closeOnClickOutside?: boolean;
  /** Callback when escape is pressed */
  onEscapeKeyDown?: (event: KeyboardEvent) => void;
  /** Callback when pointer down outside */
  onPointerDownOutside?: (event: PointerEvent) => void;
  /** Whether to force mount (for animations) */
  forceMount?: boolean;
}

export interface DropdownMenuItemProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Item content */
  children: React.ReactNode;
  /** Custom className */
  className?: string;
  /** Whether the item is disabled */
  disabled?: boolean;
  /** Icon displayed before the label */
  icon?: React.ReactNode;
  /** Shortcut key hint */
  shortcut?: string;
  /** Whether clicking closes the menu */
  closeOnClick?: boolean;
  /** Whether this is a destructive action */
  destructive?: boolean;
}

export interface DropdownMenuLabelProps {
  /** Label content */
  children: React.ReactNode;
  /** Custom className */
  className?: string;
  /** Whether to add inset padding */
  inset?: boolean;
}

export interface DropdownMenuSeparatorProps {
  /** Custom className */
  className?: string;
}

export interface DropdownMenuGroupProps {
  /** Group content */
  children: React.ReactNode;
  /** Custom className */
  className?: string;
}

export interface DropdownMenuCheckboxItemProps extends DropdownMenuItemProps {
  /** Whether the item is checked */
  checked?: boolean;
  /** Callback when checked state changes */
  onCheckedChange?: (checked: boolean) => void;
}

export interface DropdownMenuRadioGroupProps {
  /** Group content */
  children: React.ReactNode;
  /** Current value */
  value?: string;
  /** Callback when value changes */
  onValueChange?: (value: string) => void;
  /** Custom className */
  className?: string;
}

export interface DropdownMenuRadioItemProps extends DropdownMenuItemProps {
  /** Value for this radio item */
  value: string;
}

// ============================================================================
// Context
// ============================================================================

const DropdownMenuContext = React.createContext<DropdownMenuContextValue | undefined>(
  undefined
);

const RadioGroupContext = React.createContext<{
  value?: string;
  onValueChange?: (value: string) => void;
} | null>(null);

function useDropdownMenu() {
  const context = React.useContext(DropdownMenuContext);
  if (!context) {
    throw new Error('useDropdownMenu must be used within a DropdownMenu');
  }
  return context;
}

// ============================================================================
// ID Generator
// ============================================================================

let dropdownIdCounter = 0;

function generateDropdownId(): string {
  return `dropdown-${++dropdownIdCounter}`;
}

// ============================================================================
// Icons
// ============================================================================

const CheckIcon = () => (
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
    className="flex-shrink-0"
  >
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const DotIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="currentColor"
    className="flex-shrink-0"
  >
    <circle cx="12" cy="12" r="4" />
  </svg>
);

const ChevronRightIcon = () => (
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
    <polyline points="9 18 15 12 9 6" />
  </svg>
);

// ============================================================================
// DropdownMenu Root
// ============================================================================

export function DropdownMenu({
  open: controlledOpen,
  defaultOpen = false,
  onOpenChange,
  children,
  modal: _modal = true,
}: DropdownMenuProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(defaultOpen);
  const [activeItemIndex, setActiveItemIndex] = React.useState(-1);
  const [items, setItems] = React.useState<string[]>([]);

  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : uncontrolledOpen;

  const setOpen = React.useCallback(
    (value: React.SetStateAction<boolean>) => {
      const newValue = typeof value === 'function' ? value(open) : value;
      if (!isControlled) {
        setUncontrolledOpen(newValue);
      }
      onOpenChange?.(newValue);
    },
    [isControlled, open, onOpenChange]
  );

  const baseId = React.useRef(generateDropdownId()).current;
  const triggerId = `${baseId}-trigger`;
  const contentId = `${baseId}-content`;

  const registerItem = React.useCallback((id: string) => {
    setItems((prev) => (prev.includes(id) ? prev : [...prev, id]));
  }, []);

  const unregisterItem = React.useCallback((id: string) => {
    setItems((prev) => prev.filter((item) => item !== id));
  }, []);

  // Reset active item when menu closes
  React.useEffect(() => {
    if (!open) {
      setActiveItemIndex(-1);
    }
  }, [open]);

  const value = React.useMemo<DropdownMenuContextValue>(
    () => ({
      open,
      setOpen,
      triggerId,
      contentId,
      activeItemIndex,
      setActiveItemIndex,
      registerItem,
      unregisterItem,
      items,
    }),
    [
      open,
      setOpen,
      triggerId,
      contentId,
      activeItemIndex,
      setActiveItemIndex,
      registerItem,
      unregisterItem,
      items,
    ]
  );

  return (
    <DropdownMenuContext.Provider value={value}>
      <div className="relative inline-block">{children}</div>
    </DropdownMenuContext.Provider>
  );
}

// ============================================================================
// DropdownMenuTrigger
// ============================================================================

export const DropdownMenuTrigger = React.forwardRef<
  HTMLButtonElement,
  DropdownMenuTriggerProps
>(({ children, className, disabled, asChild: _asChild, ...props }, ref) => {
  const { open, setOpen, triggerId, contentId } = useDropdownMenu();

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (disabled) return;
    e.preventDefault();
    setOpen((prev) => !prev);
    props.onClick?.(e);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (disabled) return;
    if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
      e.preventDefault();
      setOpen(true);
    }
    props.onKeyDown?.(e);
  };

  return (
    <button
      ref={ref}
      type="button"
      id={triggerId}
      aria-haspopup="menu"
      aria-expanded={open}
      aria-controls={open ? contentId : undefined}
      disabled={disabled}
      data-state={open ? 'open' : 'closed'}
      data-disabled={disabled || undefined}
      className={cn(
        'inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        'disabled:pointer-events-none disabled:opacity-50',
        className
      )}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      {...props}
    >
      {children}
    </button>
  );
});

DropdownMenuTrigger.displayName = 'DropdownMenuTrigger';

// ============================================================================
// DropdownMenuContent
// ============================================================================

export const DropdownMenuContent = React.forwardRef<
  HTMLDivElement,
  DropdownMenuContentProps
>(
  (
    {
      children,
      className,
      align = 'start',
      side = 'bottom',
      sideOffset = 4,
      closeOnEscape = true,
      closeOnClickOutside = true,
      onEscapeKeyDown,
      onPointerDownOutside,
      forceMount,
    },
    ref
  ) => {
    const {
      open,
      setOpen,
      triggerId,
      contentId,
      activeItemIndex,
      setActiveItemIndex,
      items,
    } = useDropdownMenu();
    const internalRef = React.useRef<HTMLDivElement>(null);
    const menuRef = (ref as React.RefObject<HTMLDivElement>) || internalRef;

    // Handle click outside
    React.useEffect(() => {
      if (!open || !closeOnClickOutside) return;

      const handlePointerDown = (event: PointerEvent) => {
        const target = event.target as Node;
        const menu = menuRef.current;
        const trigger = document.getElementById(triggerId);

        if (
          menu &&
          !menu.contains(target) &&
          trigger &&
          !trigger.contains(target)
        ) {
          onPointerDownOutside?.(event);
          setOpen(false);
        }
      };

      document.addEventListener('pointerdown', handlePointerDown);
      return () => document.removeEventListener('pointerdown', handlePointerDown);
    }, [open, closeOnClickOutside, setOpen, triggerId, menuRef, onPointerDownOutside]);

    // Handle escape key
    React.useEffect(() => {
      if (!open || !closeOnEscape) return;

      const handleKeyDown = (event: KeyboardEvent) => {
        if (event.key === 'Escape') {
          onEscapeKeyDown?.(event);
          if (!event.defaultPrevented) {
            setOpen(false);
            document.getElementById(triggerId)?.focus();
          }
        }
      };

      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }, [open, closeOnEscape, setOpen, triggerId, onEscapeKeyDown]);

    // Handle keyboard navigation
    const handleKeyDown = (e: React.KeyboardEvent) => {
      const enabledItems = items.filter((id) => {
        const el = document.getElementById(id);
        return el && !el.hasAttribute('data-disabled');
      });

      if (enabledItems.length === 0) return;

      switch (e.key) {
        case 'ArrowDown': {
          e.preventDefault();
          const nextIndex =
            activeItemIndex < enabledItems.length - 1 ? activeItemIndex + 1 : 0;
          setActiveItemIndex(nextIndex);
          document.getElementById(enabledItems[nextIndex])?.focus();
          break;
        }
        case 'ArrowUp': {
          e.preventDefault();
          const prevIndex =
            activeItemIndex > 0 ? activeItemIndex - 1 : enabledItems.length - 1;
          setActiveItemIndex(prevIndex);
          document.getElementById(enabledItems[prevIndex])?.focus();
          break;
        }
        case 'Home': {
          e.preventDefault();
          setActiveItemIndex(0);
          document.getElementById(enabledItems[0])?.focus();
          break;
        }
        case 'End': {
          e.preventDefault();
          const lastIndex = enabledItems.length - 1;
          setActiveItemIndex(lastIndex);
          document.getElementById(enabledItems[lastIndex])?.focus();
          break;
        }
        case 'Tab': {
          e.preventDefault();
          setOpen(false);
          break;
        }
      }
    };

    // Focus first item when menu opens
    React.useEffect(() => {
      if (open && items.length > 0) {
        const enabledItems = items.filter((id) => {
          const el = document.getElementById(id);
          return el && !el.hasAttribute('data-disabled');
        });
        if (enabledItems.length > 0) {
          requestAnimationFrame(() => {
            setActiveItemIndex(0);
            document.getElementById(enabledItems[0])?.focus();
          });
        }
      }
    }, [open, items, setActiveItemIndex]);

    // Position styles
    const positionStyles = React.useMemo(() => {
      const alignmentMap: Record<DropdownMenuAlign, string> = {
        start: 'left-0',
        center: 'left-1/2 -translate-x-1/2',
        end: 'right-0',
      };

      const sideMap: Record<DropdownMenuSide, string> = {
        top: 'bottom-full',
        right: 'left-full top-0',
        bottom: 'top-full',
        left: 'right-full top-0',
      };

      const marginMap: Record<DropdownMenuSide, string> = {
        top: `mb-[${sideOffset}px]`,
        right: `ml-[${sideOffset}px]`,
        bottom: `mt-[${sideOffset}px]`,
        left: `mr-[${sideOffset}px]`,
      };

      return cn(alignmentMap[align], sideMap[side], marginMap[side]);
    }, [align, side, sideOffset]);

    if (!open && !forceMount) return null;

    return (
      <div
        ref={menuRef}
        id={contentId}
        role="menu"
        aria-orientation="vertical"
        aria-labelledby={triggerId}
        tabIndex={-1}
        data-state={open ? 'open' : 'closed'}
        data-side={side}
        data-align={align}
        className={cn(
          'absolute z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md',
          'animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95',
          'data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2',
          'data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2',
          positionStyles,
          className
        )}
        style={{ marginTop: side === 'bottom' ? sideOffset : undefined }}
        onKeyDown={handleKeyDown}
      >
        {children}
      </div>
    );
  }
);

DropdownMenuContent.displayName = 'DropdownMenuContent';

// ============================================================================
// DropdownMenuItem
// ============================================================================

export const DropdownMenuItem = React.forwardRef<
  HTMLButtonElement,
  DropdownMenuItemProps
>(
  (
    {
      children,
      className,
      disabled,
      icon,
      shortcut,
      closeOnClick = true,
      destructive,
      onClick,
      ...props
    },
    ref
  ) => {
    const { setOpen, registerItem, unregisterItem } = useDropdownMenu();
    const itemId = React.useRef(generateDropdownId()).current;

    React.useEffect(() => {
      if (!disabled) {
        registerItem(itemId);
        return () => unregisterItem(itemId);
      }
      return undefined;
    }, [disabled, itemId, registerItem, unregisterItem]);

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (disabled) return;
      onClick?.(e);
      if (closeOnClick) {
        setOpen(false);
      }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
      if (disabled) return;
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleClick(e as unknown as React.MouseEvent<HTMLButtonElement>);
      }
      // Arrow keys, Home, End, Tab, Escape should bubble to parent for navigation
      // No need to call e.preventDefault() or e.stopPropagation()
    };

    return (
      <button
        ref={ref}
        id={itemId}
        type="button"
        role="menuitem"
        tabIndex={-1}
        disabled={disabled}
        data-disabled={disabled || undefined}
        data-testid="dropdown-menu-item"
        className={cn(
          'relative flex w-full cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors',
          'focus:bg-accent focus:text-accent-foreground',
          'data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
          destructive &&
            'text-destructive focus:bg-destructive/10 focus:text-destructive',
          className
        )}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        {...props}
      >
        {icon && <span className="mr-2 flex-shrink-0">{icon}</span>}
        <span className="flex-1">{children}</span>
        {shortcut && (
          <span className="ml-auto pl-2 text-xs tracking-widest text-muted-foreground">
            {shortcut}
          </span>
        )}
      </button>
    );
  }
);

DropdownMenuItem.displayName = 'DropdownMenuItem';

// ============================================================================
// DropdownMenuLabel
// ============================================================================

export const DropdownMenuLabel = React.forwardRef<
  HTMLDivElement,
  DropdownMenuLabelProps
>(({ children, className, inset }, ref) => {
  return (
    <div
      ref={ref}
      className={cn(
        'px-2 py-1.5 text-sm font-semibold text-foreground',
        inset && 'pl-8',
        className
      )}
      data-testid="dropdown-menu-label"
    >
      {children}
    </div>
  );
});

DropdownMenuLabel.displayName = 'DropdownMenuLabel';

// ============================================================================
// DropdownMenuSeparator
// ============================================================================

export const DropdownMenuSeparator = React.forwardRef<
  HTMLDivElement,
  DropdownMenuSeparatorProps
>(({ className }, ref) => {
  return (
    <div
      ref={ref}
      role="separator"
      className={cn('-mx-1 my-1 h-px bg-border', className)}
      data-testid="dropdown-menu-separator"
    />
  );
});

DropdownMenuSeparator.displayName = 'DropdownMenuSeparator';

// ============================================================================
// DropdownMenuGroup
// ============================================================================

export const DropdownMenuGroup = React.forwardRef<
  HTMLDivElement,
  DropdownMenuGroupProps
>(({ children, className }, ref) => {
  return (
    <div ref={ref} role="group" className={cn(className)} data-testid="dropdown-menu-group">
      {children}
    </div>
  );
});

DropdownMenuGroup.displayName = 'DropdownMenuGroup';

// ============================================================================
// DropdownMenuCheckboxItem
// ============================================================================

export const DropdownMenuCheckboxItem = React.forwardRef<
  HTMLButtonElement,
  DropdownMenuCheckboxItemProps
>(
  (
    { children, className, checked = false, onCheckedChange, disabled, ...props },
    ref
  ) => {
    const { setOpen: _setOpen, registerItem, unregisterItem } = useDropdownMenu();
    const itemId = React.useRef(generateDropdownId()).current;

    React.useEffect(() => {
      if (!disabled) {
        registerItem(itemId);
        return () => unregisterItem(itemId);
      }
      return undefined;
    }, [disabled, itemId, registerItem, unregisterItem]);

    const handleClick = () => {
      if (disabled) return;
      onCheckedChange?.(!checked);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
      if (disabled) return;
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleClick();
      }
    };

    return (
      <button
        ref={ref}
        id={itemId}
        type="button"
        role="menuitemcheckbox"
        aria-checked={checked}
        tabIndex={-1}
        disabled={disabled}
        data-disabled={disabled || undefined}
        data-state={checked ? 'checked' : 'unchecked'}
        data-testid="dropdown-menu-checkbox-item"
        className={cn(
          'relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none transition-colors',
          'focus:bg-accent focus:text-accent-foreground',
          'data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
          className
        )}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        {...props}
      >
        <span className="absolute left-2 flex h-4 w-4 items-center justify-center">
          {checked && <CheckIcon />}
        </span>
        {children}
      </button>
    );
  }
);

DropdownMenuCheckboxItem.displayName = 'DropdownMenuCheckboxItem';

// ============================================================================
// DropdownMenuRadioGroup
// ============================================================================

export const DropdownMenuRadioGroup = React.forwardRef<
  HTMLDivElement,
  DropdownMenuRadioGroupProps
>(({ children, value, onValueChange, className }, ref) => {
  return (
    <RadioGroupContext.Provider value={{ value, onValueChange }}>
      <div ref={ref} role="group" className={cn(className)} data-testid="dropdown-menu-radio-group">
        {children}
      </div>
    </RadioGroupContext.Provider>
  );
});

DropdownMenuRadioGroup.displayName = 'DropdownMenuRadioGroup';

// ============================================================================
// DropdownMenuRadioItem
// ============================================================================

export const DropdownMenuRadioItem = React.forwardRef<
  HTMLButtonElement,
  DropdownMenuRadioItemProps
>(({ children, className, value, disabled, ...props }, ref) => {
  const radioContext = React.useContext(RadioGroupContext);
  const { registerItem, unregisterItem } = useDropdownMenu();
  const itemId = React.useRef(generateDropdownId()).current;
  const isChecked = radioContext?.value === value;

  React.useEffect(() => {
    if (!disabled) {
      registerItem(itemId);
      return () => unregisterItem(itemId);
    }
    return undefined;
  }, [disabled, itemId, registerItem, unregisterItem]);

  const handleClick = () => {
    if (disabled) return;
    radioContext?.onValueChange?.(value);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (disabled) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    }
  };

  return (
    <button
      ref={ref}
      id={itemId}
      type="button"
      role="menuitemradio"
      aria-checked={isChecked}
      tabIndex={-1}
      disabled={disabled}
      data-disabled={disabled || undefined}
      data-state={isChecked ? 'checked' : 'unchecked'}
      data-testid="dropdown-menu-radio-item"
      className={cn(
        'relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none transition-colors',
        'focus:bg-accent focus:text-accent-foreground',
        'data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
        className
      )}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      {...props}
    >
      <span className="absolute left-2 flex h-4 w-4 items-center justify-center">
        {isChecked && <DotIcon />}
      </span>
      {children}
    </button>
  );
});

DropdownMenuRadioItem.displayName = 'DropdownMenuRadioItem';

// ============================================================================
// DropdownMenuShortcut (for display only)
// ============================================================================

export function DropdownMenuShortcut({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn('ml-auto text-xs tracking-widest text-muted-foreground', className)}
      data-testid="dropdown-menu-shortcut"
    >
      {children}
    </span>
  );
}

DropdownMenuShortcut.displayName = 'DropdownMenuShortcut';

// ============================================================================
// DropdownMenuSub (Submenu support)
// ============================================================================

export interface DropdownMenuSubProps {
  children: React.ReactNode;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export interface DropdownMenuSubTriggerProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  className?: string;
  inset?: boolean;
  disabled?: boolean;
}

export interface DropdownMenuSubContentProps {
  children: React.ReactNode;
  className?: string;
  sideOffset?: number;
}

const SubMenuContext = React.createContext<{
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  triggerId: string;
  contentId: string;
} | null>(null);

export function DropdownMenuSub({
  children,
  open: controlledOpen,
  defaultOpen = false,
  onOpenChange,
}: DropdownMenuSubProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(defaultOpen);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : uncontrolledOpen;

  const setOpen = React.useCallback(
    (value: React.SetStateAction<boolean>) => {
      const newValue = typeof value === 'function' ? value(open) : value;
      if (!isControlled) {
        setUncontrolledOpen(newValue);
      }
      onOpenChange?.(newValue);
    },
    [isControlled, open, onOpenChange]
  );

  const baseId = React.useRef(generateDropdownId()).current;

  return (
    <SubMenuContext.Provider
      value={{
        open,
        setOpen,
        triggerId: `${baseId}-sub-trigger`,
        contentId: `${baseId}-sub-content`,
      }}
    >
      <div className="relative">{children}</div>
    </SubMenuContext.Provider>
  );
}

export const DropdownMenuSubTrigger = React.forwardRef<
  HTMLButtonElement,
  DropdownMenuSubTriggerProps
>(({ children, className, inset, disabled, ...props }, ref) => {
  const subContext = React.useContext(SubMenuContext);
  const { registerItem, unregisterItem } = useDropdownMenu();
  const itemId = React.useRef(generateDropdownId()).current;

  React.useEffect(() => {
    if (!disabled) {
      registerItem(itemId);
      return () => unregisterItem(itemId);
    }
    return undefined;
  }, [disabled, itemId, registerItem, unregisterItem]);

  if (!subContext) {
    throw new Error('DropdownMenuSubTrigger must be used within DropdownMenuSub');
  }

  const handleMouseEnter = () => {
    if (!disabled) {
      subContext.setOpen(true);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (disabled) return;
    if (e.key === 'ArrowRight' || e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      subContext.setOpen(true);
    }
  };

  return (
    <button
      ref={ref}
      id={itemId}
      type="button"
      role="menuitem"
      aria-haspopup="menu"
      aria-expanded={subContext.open}
      aria-controls={subContext.open ? subContext.contentId : undefined}
      tabIndex={-1}
      disabled={disabled}
      data-disabled={disabled || undefined}
      data-state={subContext.open ? 'open' : 'closed'}
      data-testid="dropdown-menu-sub-trigger"
      className={cn(
        'relative flex w-full cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors',
        'focus:bg-accent focus:text-accent-foreground',
        'data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
        'data-[state=open]:bg-accent',
        inset && 'pl-8',
        className
      )}
      onMouseEnter={handleMouseEnter}
      onKeyDown={handleKeyDown}
      {...props}
    >
      {children}
      <ChevronRightIcon />
    </button>
  );
});

DropdownMenuSubTrigger.displayName = 'DropdownMenuSubTrigger';

export const DropdownMenuSubContent = React.forwardRef<
  HTMLDivElement,
  DropdownMenuSubContentProps
>(({ children, className, sideOffset = 4 }, ref) => {
  const subContext = React.useContext(SubMenuContext);
  const parentContext = useDropdownMenu();

  if (!subContext) {
    throw new Error('DropdownMenuSubContent must be used within DropdownMenuSub');
  }

  // Close submenu when parent closes
  React.useEffect(() => {
    if (!parentContext.open) {
      subContext.setOpen(false);
    }
  }, [parentContext.open, subContext]);

  const handleMouseLeave = () => {
    subContext.setOpen(false);
  };

  if (!subContext.open) return null;

  return (
    <div
      ref={ref}
      id={subContext.contentId}
      role="menu"
      aria-orientation="vertical"
      data-state={subContext.open ? 'open' : 'closed'}
      data-testid="dropdown-menu-sub-content"
      className={cn(
        'absolute left-full top-0 z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md',
        'animate-in fade-in-0 zoom-in-95 slide-in-from-left-2',
        className
      )}
      style={{ marginLeft: sideOffset }}
      onMouseLeave={handleMouseLeave}
    >
      {children}
    </div>
  );
});

DropdownMenuSubContent.displayName = 'DropdownMenuSubContent';

// ============================================================================
// Display Names
// ============================================================================

DropdownMenu.displayName = 'DropdownMenu';
DropdownMenuSub.displayName = 'DropdownMenuSub';
