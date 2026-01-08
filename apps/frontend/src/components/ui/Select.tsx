'use client';

import { cn } from '@/lib/utils';
import { Check, ChevronDown, X } from 'lucide-react';
import { forwardRef, useCallback, useEffect, useId, useRef, useState } from 'react';

export interface SelectOption {
  /** Unique value for the option */
  value: string;
  /** Display label for the option */
  label: string;
  /** Whether the option is disabled */
  disabled?: boolean;
  /** Optional icon to display */
  icon?: React.ReactNode;
  /** Optional description text */
  description?: string;
  /** Group name for grouping options */
  group?: string;
}

export interface SelectProps {
  /** Array of options to display */
  options: SelectOption[];
  /** Currently selected value(s) */
  value?: string | string[];
  /** Default value for uncontrolled usage */
  defaultValue?: string | string[];
  /** Called when selection changes */
  onChange?: (value: string | string[]) => void;
  /** Placeholder text when no selection */
  placeholder?: string;
  /** Whether to allow multiple selections */
  multiple?: boolean;
  /** Whether the select is disabled */
  disabled?: boolean;
  /** Whether the select is required */
  required?: boolean;
  /** Whether the select is in error state */
  error?: boolean;
  /** Error message to display */
  errorMessage?: string;
  /** Label text */
  label?: string;
  /** Helper text */
  helperText?: string;
  /** Whether to allow clearing selection */
  clearable?: boolean;
  /** Whether to allow searching/filtering options */
  searchable?: boolean;
  /** Search placeholder text */
  searchPlaceholder?: string;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Maximum height of dropdown (CSS value) */
  maxHeight?: string | number;
  /** Additional className for trigger */
  className?: string;
  /** Additional className for dropdown */
  dropdownClassName?: string;
  /** Name attribute for form submission */
  name?: string;
  /** aria-label for accessibility */
  'aria-label'?: string;
  /** Test ID for testing */
  'data-testid'?: string;
}

const sizeClasses = {
  sm: {
    trigger: 'h-8 px-2 text-sm gap-1',
    option: 'px-2 py-1.5 text-sm',
    icon: 'w-4 h-4',
  },
  md: {
    trigger: 'h-10 px-3 text-sm gap-2',
    option: 'px-3 py-2 text-sm',
    icon: 'w-4 h-4',
  },
  lg: {
    trigger: 'h-12 px-4 text-base gap-2',
    option: 'px-4 py-3 text-base',
    icon: 'w-5 h-5',
  },
};

/**
 * Select dropdown component with support for single/multiple selection,
 * search, groups, and accessibility features.
 *
 * @example
 * // Basic usage
 * <Select
 *   options={[
 *     { value: 'apple', label: 'Apple' },
 *     { value: 'banana', label: 'Banana' },
 *   ]}
 *   placeholder="Select a fruit"
 * />
 *
 * @example
 * // With groups and search
 * <Select
 *   searchable
 *   options={[
 *     { value: 'usd', label: 'US Dollar', group: 'Popular' },
 *     { value: 'eur', label: 'Euro', group: 'Popular' },
 *     { value: 'jpy', label: 'Japanese Yen', group: 'Asian' },
 *   ]}
 * />
 */
export const Select = forwardRef<HTMLButtonElement, SelectProps>(
  (
    {
      options,
      value: controlledValue,
      defaultValue,
      onChange,
      placeholder = 'Select...',
      multiple = false,
      disabled = false,
      required = false,
      error = false,
      errorMessage,
      label,
      helperText,
      clearable = false,
      searchable = false,
      searchPlaceholder = 'Search...',
      size = 'md',
      maxHeight = 300,
      className,
      dropdownClassName,
      name,
      'aria-label': ariaLabel,
      'data-testid': testId,
    },
    ref
  ) => {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const [highlightedIndex, setHighlightedIndex] = useState(-1);
    const [internalValue, setInternalValue] = useState<string | string[]>(
      defaultValue || (multiple ? [] : '')
    );

    const generatedId = useId();
    const labelId = `${generatedId}-label`;
    const listboxId = `${generatedId}-listbox`;
    const errorId = errorMessage ? `${generatedId}-error` : undefined;
    const helperId = helperText ? `${generatedId}-helper` : undefined;

    const triggerRef = useRef<HTMLButtonElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);

    // Determine if controlled
    const isControlled = controlledValue !== undefined;
    const value = isControlled ? controlledValue : internalValue;

    // Filter options based on search
    const filteredOptions =
      searchable && search
        ? options.filter(
            (opt) =>
              opt.label.toLowerCase().includes(search.toLowerCase()) ||
              opt.description?.toLowerCase().includes(search.toLowerCase())
          )
        : options;

    // Group options if they have group property
    const groupedOptions = filteredOptions.reduce(
      (acc, option) => {
        const group = option.group || '';
        if (!acc[group]) acc[group] = [];
        acc[group].push(option);
        return acc;
      },
      {} as Record<string, SelectOption[]>
    );

    const hasGroups = Object.keys(groupedOptions).some((g) => g !== '');

    // Get selected option(s)
    const selectedOptions = options.filter((opt) =>
      multiple ? (value as string[]).includes(opt.value) : opt.value === value
    );

    // Handle selection
    const handleSelect = useCallback(
      (optionValue: string) => {
        if (multiple) {
          const currentValues = value as string[];
          const newValues = currentValues.includes(optionValue)
            ? currentValues.filter((v) => v !== optionValue)
            : [...currentValues, optionValue];
          if (!isControlled) setInternalValue(newValues);
          onChange?.(newValues);
        } else {
          if (!isControlled) setInternalValue(optionValue);
          onChange?.(optionValue);
          setIsOpen(false);
        }
        setSearch('');
      },
      [value, multiple, isControlled, onChange]
    );

    // Handle clear
    const handleClear = useCallback(
      (e: React.MouseEvent) => {
        e.stopPropagation();
        const emptyValue = multiple ? [] : '';
        if (!isControlled) setInternalValue(emptyValue);
        onChange?.(emptyValue);
      },
      [multiple, isControlled, onChange]
    );

    // Handle keyboard navigation
    const handleKeyDown = useCallback(
      (e: React.KeyboardEvent) => {
        if (disabled) return;

        switch (e.key) {
          case 'Enter':
          case ' ':
            e.preventDefault();
            if (!isOpen) {
              setIsOpen(true);
            } else if (highlightedIndex >= 0) {
              const flatOptions = filteredOptions.filter((o) => !o.disabled);
              const option = flatOptions[highlightedIndex];
              if (option) handleSelect(option.value);
            }
            break;
          case 'ArrowDown':
            e.preventDefault();
            if (!isOpen) {
              setIsOpen(true);
            } else {
              const flatOptions = filteredOptions.filter((o) => !o.disabled);
              setHighlightedIndex((prev) => (prev < flatOptions.length - 1 ? prev + 1 : 0));
            }
            break;
          case 'ArrowUp':
            e.preventDefault();
            if (isOpen) {
              const flatOptions = filteredOptions.filter((o) => !o.disabled);
              setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : flatOptions.length - 1));
            }
            break;
          case 'Escape':
            setIsOpen(false);
            setSearch('');
            triggerRef.current?.focus();
            break;
          case 'Tab':
            setIsOpen(false);
            setSearch('');
            break;
        }
      },
      [disabled, isOpen, highlightedIndex, filteredOptions, handleSelect]
    );

    // Close on outside click
    useEffect(() => {
      const handleClickOutside = (e: MouseEvent) => {
        if (
          dropdownRef.current &&
          !dropdownRef.current.contains(e.target as Node) &&
          triggerRef.current &&
          !triggerRef.current.contains(e.target as Node)
        ) {
          setIsOpen(false);
          setSearch('');
        }
      };

      if (isOpen) {
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
      }
      return undefined;
    }, [isOpen]);

    // Focus search input when dropdown opens
    useEffect(() => {
      if (isOpen && searchable) {
        searchInputRef.current?.focus();
      }
    }, [isOpen, searchable]);

    // Reset highlight when search changes
    useEffect(() => {
      setHighlightedIndex(0);
    }, [search]);

    const sizeConfig = sizeClasses[size];

    const renderValue = () => {
      if (selectedOptions.length === 0) {
        return <span className="text-gray-500">{placeholder}</span>;
      }

      if (multiple) {
        if (selectedOptions.length === 1) {
          return (
            <span className="flex items-center gap-2">
              {selectedOptions[0].icon}
              {selectedOptions[0].label}
            </span>
          );
        }
        return <span>{selectedOptions.length} selected</span>;
      }

      return (
        <span className="flex items-center gap-2">
          {selectedOptions[0].icon}
          {selectedOptions[0].label}
        </span>
      );
    };

    const renderOption = (option: SelectOption, _index: number) => {
      const isSelected = multiple
        ? (value as string[]).includes(option.value)
        : option.value === value;
      const flatOptions = filteredOptions.filter((o) => !o.disabled);
      const flatIndex = flatOptions.indexOf(option);
      const isHighlighted = flatIndex === highlightedIndex;

      return (
        <button
          key={option.value}
          type="button"
          role="option"
          aria-selected={isSelected}
          aria-disabled={option.disabled}
          disabled={option.disabled}
          onClick={() => !option.disabled && handleSelect(option.value)}
          onMouseEnter={() => !option.disabled && setHighlightedIndex(flatIndex)}
          className={cn(
            'w-full flex items-center justify-between',
            sizeConfig.option,
            'transition-colors',
            option.disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
            isHighlighted && !option.disabled && 'bg-surface-200',
            isSelected && 'text-blue-400'
          )}
          data-testid={testId ? `${testId}-option-${option.value}` : undefined}
        >
          <div className="flex items-center gap-2 min-w-0">
            {option.icon && <span className={sizeConfig.icon}>{option.icon}</span>}
            <div className="flex flex-col items-start min-w-0">
              <span className="truncate">{option.label}</span>
              {option.description && (
                <span className="text-xs text-gray-500 truncate">{option.description}</span>
              )}
            </div>
          </div>
          {isSelected && (
            <Check
              className={cn(sizeConfig.icon, 'shrink-0 text-blue-400')}
              aria-hidden="true"
            />
          )}
        </button>
      );
    };

    return (
      <div className="relative">
        {/* Label */}
        {label && (
          <label
            id={labelId}
            className={cn(
              'block mb-1.5 font-medium',
              size === 'sm' ? 'text-xs' : 'text-sm',
              disabled ? 'text-gray-500' : 'text-white'
            )}
          >
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}

        {/* Hidden input for form submission */}
        {name && (
          <input
            type="hidden"
            name={name}
            value={multiple ? (value as string[]).join(',') : (value as string)}
          />
        )}

        {/* Trigger Button */}
        <button
          ref={(node) => {
            (triggerRef as React.MutableRefObject<HTMLButtonElement | null>).current = node;
            if (typeof ref === 'function') ref(node);
            else if (ref) ref.current = node;
          }}
          type="button"
          role="combobox"
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          aria-controls={listboxId}
          aria-labelledby={label ? labelId : undefined}
          aria-label={ariaLabel}
          aria-describedby={[errorId, helperId].filter(Boolean).join(' ') || undefined}
          aria-invalid={error}
          aria-required={required}
          disabled={disabled}
          onClick={() => !disabled && setIsOpen(!isOpen)}
          onKeyDown={handleKeyDown}
          data-testid={testId}
          className={cn(
            'w-full flex items-center justify-between',
            'rounded-lg border bg-surface-100',
            'transition-colors',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500',
            sizeConfig.trigger,
            error
              ? 'border-red-500 focus-visible:ring-red-500'
              : 'border-surface-300 hover:border-surface-400',
            disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
            className
          )}
        >
          <span className="flex-1 text-left truncate text-white">{renderValue()}</span>
          <div className="flex items-center gap-1 shrink-0">
            {clearable && selectedOptions.length > 0 && !disabled && (
              <button
                type="button"
                onClick={handleClear}
                className="p-0.5 hover:bg-surface-200 rounded"
                aria-label="Clear selection"
                data-testid={testId ? `${testId}-clear` : undefined}
              >
                <X className={cn(sizeConfig.icon, 'text-gray-400')} />
              </button>
            )}
            <ChevronDown
              className={cn(
                sizeConfig.icon,
                'text-gray-400 transition-transform',
                isOpen && 'rotate-180'
              )}
              aria-hidden="true"
            />
          </div>
        </button>

        {/* Helper/Error Text */}
        {(helperText || errorMessage) && (
          <p
            id={error ? errorId : helperId}
            className={cn(
              'mt-1.5',
              size === 'sm' ? 'text-xs' : 'text-sm',
              error ? 'text-red-500' : 'text-gray-500'
            )}
          >
            {error ? errorMessage : helperText}
          </p>
        )}

        {/* Dropdown */}
        {isOpen && (
          <div
            ref={dropdownRef}
            role="listbox"
            id={listboxId}
            aria-multiselectable={multiple}
            className={cn(
              'absolute z-50 w-full mt-1',
              'rounded-lg border border-surface-300 bg-surface-100 shadow-xl',
              'overflow-hidden',
              dropdownClassName
            )}
            style={{
              maxHeight: typeof maxHeight === 'number' ? `${maxHeight}px` : maxHeight,
            }}
            data-testid={testId ? `${testId}-dropdown` : undefined}
          >
            {/* Search Input */}
            {searchable && (
              <div className="p-2 border-b border-surface-300">
                <input
                  ref={searchInputRef}
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={searchPlaceholder}
                  className={cn(
                    'w-full px-3 py-2 rounded-md',
                    'bg-surface-200 border border-surface-300',
                    'text-white placeholder-gray-500',
                    'focus:outline-none focus:ring-2 focus:ring-blue-500',
                    size === 'sm' ? 'text-xs' : 'text-sm'
                  )}
                  onKeyDown={handleKeyDown}
                  data-testid={testId ? `${testId}-search` : undefined}
                />
              </div>
            )}

            {/* Options */}
            <div
              className="overflow-y-auto"
              style={{
                maxHeight:
                  typeof maxHeight === 'number'
                    ? `${maxHeight - (searchable ? 52 : 0)}px`
                    : maxHeight,
              }}
            >
              {filteredOptions.length === 0 ? (
                <div
                  className={cn(
                    'text-center text-gray-500 py-4',
                    size === 'sm' ? 'text-xs' : 'text-sm'
                  )}
                >
                  No options found
                </div>
              ) : hasGroups ? (
                Object.entries(groupedOptions).map(([group, groupOptions]) => (
                  <div key={group || 'ungrouped'}>
                    {group && (
                      <div
                        className={cn(
                          'px-3 py-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wider',
                          'bg-surface-50'
                        )}
                      >
                        {group}
                      </div>
                    )}
                    {groupOptions.map((option, index) => renderOption(option, index))}
                  </div>
                ))
              ) : (
                filteredOptions.map((option, index) => renderOption(option, index))
              )}
            </div>
          </div>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';

export default Select;

