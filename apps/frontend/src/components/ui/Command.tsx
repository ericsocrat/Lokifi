'use client';

import * as React from 'react';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

// ============================================================================
// Types
// ============================================================================

interface CommandContextValue {
  search: string;
  setSearch: (search: string) => void;
  selectedIndex: number;
  setSelectedIndex: (index: number) => void;
  filteredItems: CommandItemData[];
  selectableItems: CommandItemData[];
  registerItem: (item: CommandItemData) => void;
  unregisterItem: (id: string) => void;
  onSelect: (value: string) => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
  listRef: React.RefObject<HTMLDivElement | null>;
}

interface CommandItemData {
  id: string;
  value: string;
  keywords?: string[];
  disabled?: boolean;
  groupId?: string;
}

interface CommandGroupContextValue {
  groupId: string;
}

// ============================================================================
// Context
// ============================================================================

const CommandContext = createContext<CommandContextValue | null>(null);
const CommandGroupContext = createContext<CommandGroupContextValue | null>(null);

function useCommandContext() {
  const context = useContext(CommandContext);
  if (!context) {
    throw new Error('Command components must be used within a Command');
  }
  return context;
}

function useCommandGroupContext() {
  return useContext(CommandGroupContext);
}

// ============================================================================
// Utility Functions
// ============================================================================

function generateId(): string {
  return Math.random().toString(36).substring(2, 11);
}

function normalizeString(str: string): string {
  return str.toLowerCase().trim();
}

function matchesSearch(item: CommandItemData, search: string): boolean {
  if (!search) return true;

  const normalizedSearch = normalizeString(search);
  const normalizedValue = normalizeString(item.value);

  // Check value
  if (normalizedValue.includes(normalizedSearch)) return true;

  // Check keywords
  if (item.keywords) {
    return item.keywords.some((keyword) => normalizeString(keyword).includes(normalizedSearch));
  }

  return false;
}

// ============================================================================
// Command (Root)
// ============================================================================

export interface CommandProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onSelect'> {
  /** Callback when an item is selected */
  onSelect?: (value: string) => void;
  /** Default search value */
  defaultSearch?: string;
  /** Controlled search value */
  search?: string;
  /** Callback when search changes */
  onSearchChange?: (search: string) => void;
  /** Whether the command is in a dialog */
  dialog?: boolean;
  /** Custom filter function */
  filter?: (value: string, search: string) => boolean;
  /** Whether to loop keyboard navigation */
  loop?: boolean;
}

export function Command({
  children,
  className,
  onSelect,
  defaultSearch = '',
  search: controlledSearch,
  onSearchChange,
  dialog = false,
  filter,
  loop = false,
  ...props
}: CommandProps) {
  const [internalSearch, setInternalSearch] = useState(defaultSearch);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [items, setItems] = useState<CommandItemData[]>([]);

  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Use controlled or internal search
  const search = controlledSearch ?? internalSearch;

  const setSearch = useCallback(
    (newSearch: string) => {
      setInternalSearch(newSearch);
      onSearchChange?.(newSearch);
      setSelectedIndex(0);
    },
    [onSearchChange]
  );

  // Filter items based on search (keep disabled items but mark them)
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (filter) return filter(item.value, search);
      return matchesSearch(item, search);
    });
  }, [items, search, filter]);

  // Get selectable items (non-disabled) for keyboard navigation
  const selectableItems = useMemo(() => {
    return filteredItems.filter((item) => !item.disabled);
  }, [filteredItems]);

  // Register/unregister items
  const registerItem = useCallback((item: CommandItemData) => {
    setItems((prev) => {
      const exists = prev.find((i) => i.id === item.id);
      if (exists) return prev;
      return [...prev, item];
    });
  }, []);

  const unregisterItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  // Handle selection
  const handleSelect = useCallback(
    (value: string) => {
      onSelect?.(value);
    },
    [onSelect]
  );

  // Keyboard navigation - use selectable (non-disabled) items
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!selectableItems.length) return;

      switch (e.key) {
        case 'ArrowDown': {
          e.preventDefault();
          setSelectedIndex((prev) => {
            const next = prev + 1;
            if (next >= selectableItems.length) {
              return loop ? 0 : prev;
            }
            return next;
          });
          break;
        }
        case 'ArrowUp': {
          e.preventDefault();
          setSelectedIndex((prev) => {
            const next = prev - 1;
            if (next < 0) {
              return loop ? selectableItems.length - 1 : 0;
            }
            return next;
          });
          break;
        }
        case 'Enter': {
          e.preventDefault();
          const selectedItem = selectableItems[selectedIndex];
          if (selectedItem && !selectedItem.disabled) {
            handleSelect(selectedItem.value);
          }
          break;
        }
        case 'Home': {
          e.preventDefault();
          setSelectedIndex(0);
          break;
        }
        case 'End': {
          e.preventDefault();
          setSelectedIndex(selectableItems.length - 1);
          break;
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [selectableItems, selectedIndex, handleSelect, loop]);

  // Scroll selected item into view
  useEffect(() => {
    const list = listRef.current;
    if (!list) return;

    const selectedElement = list.querySelector('[data-selected="true"]');
    if (selectedElement && typeof selectedElement.scrollIntoView === 'function') {
      selectedElement.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex]);

  const contextValue = useMemo<CommandContextValue>(
    () => ({
      search,
      setSearch,
      selectedIndex,
      setSelectedIndex,
      filteredItems,
      selectableItems,
      registerItem,
      unregisterItem,
      onSelect: handleSelect,
      inputRef,
      listRef,
    }),
    [
      search,
      setSearch,
      selectedIndex,
      filteredItems,
      selectableItems,
      registerItem,
      unregisterItem,
      handleSelect,
    ]
  );

  const baseClasses = [
    'flex flex-col overflow-hidden rounded-lg',
    'bg-white dark:bg-gray-900',
    'border border-gray-200 dark:border-gray-700',
    dialog ? 'shadow-2xl' : 'shadow-md',
  ].join(' ');

  return (
    <CommandContext.Provider value={contextValue}>
      <div
        className={className ? `${baseClasses} ${className}` : baseClasses}
        data-command=""
        data-dialog={dialog || undefined}
        role="listbox"
        aria-label="Command menu"
        {...props}
      >
        {children}
      </div>
    </CommandContext.Provider>
  );
}

// ============================================================================
// CommandDialog
// ============================================================================

export interface CommandDialogProps {
  /** Whether the dialog is open */
  open: boolean;
  /** Callback when the dialog should close */
  onOpenChange: (open: boolean) => void;
  /** Dialog content */
  children: React.ReactNode;
  /** Class name for the dialog container */
  className?: string;
  /** Whether to show the backdrop */
  showBackdrop?: boolean;
}

export function CommandDialog({
  open,
  onOpenChange,
  children,
  className,
  showBackdrop = true,
}: CommandDialogProps) {
  // Close on Escape
  useEffect(() => {
    if (!open) return undefined;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onOpenChange(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onOpenChange]);

  // Close on backdrop click
  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) {
        onOpenChange(false);
      }
    },
    [onOpenChange]
  );

  // Prevent scroll when open
  useEffect(() => {
    if (!open) return undefined;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [open]);

  if (!open) return null;

  const overlayClasses = [
    'fixed inset-0 z-50 flex items-start justify-center pt-[15vh]',
    showBackdrop ? 'bg-black/50 backdrop-blur-sm' : '',
    'animate-in fade-in duration-200',
  ].join(' ');

  const dialogClasses = [
    'w-full max-w-lg',
    'animate-in slide-in-from-top-2 duration-200',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      className={overlayClasses}
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-label="Command dialog"
      data-command-dialog=""
    >
      <div className={dialogClasses}>{children}</div>
    </div>
  );
}

// ============================================================================
// CommandInput
// ============================================================================

export interface CommandInputProps extends Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  'onChange' | 'value'
> {
  /** Placeholder text */
  placeholder?: string;
  /** Icon to show before the input */
  icon?: React.ReactNode;
}

export function CommandInput({
  placeholder = 'Type a command or search...',
  icon,
  className,
  ...props
}: CommandInputProps) {
  const { search, setSearch, inputRef } = useCommandContext();

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, [inputRef]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setSearch(e.target.value);
    },
    [setSearch]
  );

  const defaultIcon = (
    <svg
      className="h-4 w-4 shrink-0 text-gray-400"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
      />
    </svg>
  );

  const baseClasses = [
    'flex items-center gap-2 px-3 py-3',
    'border-b border-gray-200 dark:border-gray-700',
  ].join(' ');

  const inputClasses = [
    'flex-1 bg-transparent text-sm',
    'text-gray-900 dark:text-gray-100',
    'placeholder:text-gray-400 dark:placeholder:text-gray-500',
    'outline-none border-none',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={baseClasses} data-command-input-wrapper="">
      {icon ?? defaultIcon}
      <input
        ref={inputRef}
        type="text"
        className={inputClasses}
        placeholder={placeholder}
        value={search}
        onChange={handleChange}
        aria-label="Search commands"
        data-command-input=""
        {...props}
      />
    </div>
  );
}

// ============================================================================
// CommandList
// ============================================================================

export interface CommandListProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Maximum height of the list */
  maxHeight?: number | string;
}

export function CommandList({ children, className, maxHeight = 300, ...props }: CommandListProps) {
  const { listRef } = useCommandContext();

  const baseClasses = ['overflow-y-auto overflow-x-hidden py-2'].join(' ');

  const style: React.CSSProperties = {
    maxHeight: typeof maxHeight === 'number' ? `${maxHeight}px` : maxHeight,
  };

  return (
    <div
      ref={listRef}
      className={className ? `${baseClasses} ${className}` : baseClasses}
      style={style}
      role="group"
      data-command-list=""
      {...props}
    >
      {children}
    </div>
  );
}

// ============================================================================
// CommandEmpty
// ============================================================================

export interface CommandEmptyProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Custom empty message */
  message?: string;
}

export function CommandEmpty({
  children,
  className,
  message = 'No results found.',
  ...props
}: CommandEmptyProps) {
  const { filteredItems, search } = useCommandContext();

  // Only show when there's a search and no results
  if (!search || filteredItems.length > 0) return null;

  const baseClasses = ['py-6 text-center text-sm text-gray-500 dark:text-gray-400'].join(' ');

  return (
    <div
      className={className ? `${baseClasses} ${className}` : baseClasses}
      role="status"
      aria-live="polite"
      data-command-empty=""
      {...props}
    >
      {children ?? message}
    </div>
  );
}

// ============================================================================
// CommandGroup
// ============================================================================

export interface CommandGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Group heading */
  heading?: string;
  /** Whether to force render even if all items are filtered */
  forceMount?: boolean;
}

export function CommandGroup({
  children,
  className,
  heading,
  forceMount = false,
  ...props
}: CommandGroupProps) {
  const groupId = useMemo(() => generateId(), []);
  const { filteredItems } = useCommandContext();

  // Check if any items in this group match the filter
  const hasVisibleItems = filteredItems.some((item) => item.groupId === groupId);

  // Don't render if no visible items (unless forceMount)
  if (!forceMount && !hasVisibleItems && filteredItems.length > 0) {
    // Still provide context for items to register
    return (
      <CommandGroupContext.Provider value={{ groupId }}>
        <div style={{ display: 'none' }}>{children}</div>
      </CommandGroupContext.Provider>
    );
  }

  const baseClasses = ['overflow-hidden'].join(' ');

  const headingClasses = ['px-3 py-2 text-xs font-medium', 'text-gray-500 dark:text-gray-400'].join(
    ' '
  );

  return (
    <CommandGroupContext.Provider value={{ groupId }}>
      <div
        className={className ? `${baseClasses} ${className}` : baseClasses}
        role="group"
        aria-labelledby={heading ? `command-group-${groupId}` : undefined}
        data-command-group=""
        {...props}
      >
        {heading && (
          <div
            id={`command-group-${groupId}`}
            className={headingClasses}
            data-command-group-heading=""
          >
            {heading}
          </div>
        )}
        {children}
      </div>
    </CommandGroupContext.Provider>
  );
}

// ============================================================================
// CommandItem
// ============================================================================

export interface CommandItemProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onSelect'> {
  /** Value used for filtering and selection */
  value: string;
  /** Keywords for search matching */
  keywords?: string[];
  /** Whether the item is disabled */
  disabled?: boolean;
  /** Callback when the item is selected */
  onSelect?: (value: string) => void;
  /** Icon to show before the item */
  icon?: React.ReactNode;
  /** Shortcut to display */
  shortcut?: string;
}

export function CommandItem({
  children,
  className,
  value,
  keywords,
  disabled = false,
  onSelect,
  icon,
  shortcut,
  ...props
}: CommandItemProps) {
  const id = useMemo(() => generateId(), []);
  const groupContext = useCommandGroupContext();
  const {
    registerItem,
    unregisterItem,
    filteredItems,
    selectableItems,
    selectedIndex,
    onSelect: contextOnSelect,
    setSelectedIndex,
  } = useCommandContext();

  // Register item
  useEffect(() => {
    registerItem({
      id,
      value,
      keywords,
      disabled,
      groupId: groupContext?.groupId,
    });

    return () => unregisterItem(id);
  }, [id, value, keywords, disabled, groupContext?.groupId, registerItem, unregisterItem]);

  // Find this item's index in filtered items (for visibility)
  const itemIndex = filteredItems.findIndex((item) => item.id === id);
  const isVisible = itemIndex !== -1;

  // Find this item's index in selectable items (for selection state)
  const selectableIndex = selectableItems.findIndex((item) => item.id === id);
  const isSelected = !disabled && selectableIndex !== -1 && selectableIndex === selectedIndex;

  // Handle selection
  const handleClick = useCallback(() => {
    if (disabled) return;
    onSelect?.(value);
    contextOnSelect(value);
  }, [disabled, value, onSelect, contextOnSelect]);

  // Handle mouse enter to select (use selectable index)
  const handleMouseEnter = useCallback(() => {
    if (disabled || selectableIndex === -1) return;
    setSelectedIndex(selectableIndex);
  }, [disabled, selectableIndex, setSelectedIndex]);

  if (!isVisible) return null;

  const baseClasses = [
    'relative flex items-center gap-2 px-3 py-2 mx-1 rounded-md',
    'text-sm text-gray-900 dark:text-gray-100',
    'cursor-pointer select-none outline-none',
    'transition-colors duration-100',
    isSelected && !disabled
      ? 'bg-gray-100 dark:bg-gray-800'
      : 'hover:bg-gray-50 dark:hover:bg-gray-800/50',
    disabled ? 'opacity-50 cursor-not-allowed' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const shortcutClasses = ['ml-auto text-xs text-gray-400 dark:text-gray-500', 'font-mono'].join(
    ' '
  );

  return (
    <div
      className={className ? `${baseClasses} ${className}` : baseClasses}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      role="option"
      aria-selected={isSelected}
      aria-disabled={disabled}
      data-selected={isSelected}
      data-disabled={disabled || undefined}
      data-command-item=""
      data-value={value}
      {...props}
    >
      {icon && (
        <span className="shrink-0 text-gray-500 dark:text-gray-400" aria-hidden="true">
          {icon}
        </span>
      )}
      <span className="flex-1 truncate">{children}</span>
      {shortcut && (
        <kbd className={shortcutClasses} aria-label={`Shortcut: ${shortcut}`}>
          {shortcut}
        </kbd>
      )}
    </div>
  );
}

// ============================================================================
// CommandSeparator
// ============================================================================

export interface CommandSeparatorProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Whether to always show (even when filtering) */
  alwaysRender?: boolean;
}

export function CommandSeparator({
  className,
  alwaysRender = false,
  ...props
}: CommandSeparatorProps) {
  const { search } = useCommandContext();

  // Hide separator when filtering (unless alwaysRender)
  if (!alwaysRender && search) return null;

  const baseClasses = ['h-px my-2 mx-3', 'bg-gray-200 dark:bg-gray-700'].join(' ');

  return (
    <div
      className={className ? `${baseClasses} ${className}` : baseClasses}
      role="separator"
      aria-orientation="horizontal"
      data-command-separator=""
      {...props}
    />
  );
}

// ============================================================================
// CommandShortcut
// ============================================================================

export interface CommandShortcutProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Keyboard shortcut keys */
  keys: string[];
}

export function CommandShortcut({ keys, className, ...props }: CommandShortcutProps) {
  const baseClasses = [
    'ml-auto flex items-center gap-1',
    'text-xs text-gray-400 dark:text-gray-500',
  ].join(' ');

  const keyClasses = [
    'inline-flex h-5 min-w-[20px] items-center justify-center',
    'rounded border border-gray-200 dark:border-gray-600',
    'bg-gray-50 dark:bg-gray-800',
    'px-1 font-mono text-[10px] font-medium',
    'text-gray-500 dark:text-gray-400',
  ].join(' ');

  return (
    <span
      className={className ? `${baseClasses} ${className}` : baseClasses}
      aria-label={`Keyboard shortcut: ${keys.join(' + ')}`}
      data-command-shortcut=""
      {...props}
    >
      {keys.map((key, index) => (
        <kbd key={index} className={keyClasses}>
          {key}
        </kbd>
      ))}
    </span>
  );
}

// ============================================================================
// CommandLoading
// ============================================================================

export interface CommandLoadingProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Loading message */
  message?: string;
  /** Whether to show the loading indicator */
  loading?: boolean;
}

export function CommandLoading({
  children,
  className,
  message = 'Loading...',
  loading = true,
  ...props
}: CommandLoadingProps) {
  if (!loading) return null;

  const baseClasses = [
    'flex items-center justify-center gap-2 py-6',
    'text-sm text-gray-500 dark:text-gray-400',
  ].join(' ');

  const spinnerClasses = [
    'h-4 w-4 animate-spin',
    'border-2 border-gray-300 dark:border-gray-600',
    'border-t-gray-600 dark:border-t-gray-300',
    'rounded-full',
  ].join(' ');

  return (
    <div
      className={className ? `${baseClasses} ${className}` : baseClasses}
      role="status"
      aria-live="polite"
      aria-label={message}
      data-command-loading=""
      {...props}
    >
      <div className={spinnerClasses} aria-hidden="true" />
      <span>{children ?? message}</span>
    </div>
  );
}

// ============================================================================
// Hook: useCommandState
// ============================================================================

/**
 * Hook to access command state from outside the Command component
 */
export function useCommandState() {
  const context = useContext(CommandContext);

  if (!context) {
    return {
      search: '',
      selectedIndex: -1,
      filteredCount: 0,
    };
  }

  return {
    search: context.search,
    selectedIndex: context.selectedIndex,
    filteredCount: context.filteredItems.length,
  };
}

// ============================================================================
// Exports
// ============================================================================

export { CommandContext, useCommandContext };
