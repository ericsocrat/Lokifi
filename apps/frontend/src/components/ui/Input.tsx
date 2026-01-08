'use client';

import { cn } from '@/lib/utils/cn';
import * as React from 'react';

// ============================================================================
// Types & Interfaces
// ============================================================================

/**
 * Input variants for different visual styles
 */
export type InputVariant = 'default' | 'filled' | 'outlined' | 'ghost';

/**
 * Input sizes
 */
export type InputSize = 'sm' | 'md' | 'lg';

/**
 * Input state for visual feedback
 */
export type InputState = 'default' | 'error' | 'success' | 'warning';

/**
 * Props for the Input component
 */
export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  /** Visual style variant */
  variant?: InputVariant;
  /** Size of the input */
  inputSize?: InputSize;
  /** Visual state (error, success, etc.) */
  state?: InputState;
  /** Icon to display at the start of the input */
  startIcon?: React.ReactNode;
  /** Icon to display at the end of the input */
  endIcon?: React.ReactNode;
  /** Action element (button, icon button) to display at the end */
  endAction?: React.ReactNode;
  /** Helper text displayed below the input */
  helperText?: string;
  /** Error message (also sets state to error) */
  error?: string;
  /** Label for the input */
  label?: string;
  /** Whether the label should float above the input */
  floatingLabel?: boolean;
  /** Whether the input takes full width */
  fullWidth?: boolean;
  /** Custom wrapper className */
  wrapperClassName?: string;
}

// ============================================================================
// Variant & Size Styles
// ============================================================================

const inputVariants: Record<InputVariant, string> = {
  default:
    'border border-surface-3 bg-surface-1 focus:border-electric-2 focus:ring-1 focus:ring-electric-2',
  filled: 'border-0 bg-surface-2 focus:bg-surface-3 focus:ring-2 focus:ring-electric-2',
  outlined: 'border-2 border-surface-3 bg-transparent focus:border-electric-2 focus:ring-0',
  ghost: 'border-0 bg-transparent hover:bg-surface-2 focus:bg-surface-2 focus:ring-0',
};

const inputSizes: Record<InputSize, string> = {
  sm: 'h-8 text-sm px-2.5 py-1',
  md: 'h-10 text-base px-3 py-2',
  lg: 'h-12 text-lg px-4 py-2.5',
};

const inputStates: Record<InputState, string> = {
  default: '',
  error: 'border-red-500 focus:border-red-500 focus:ring-red-500',
  success: 'border-green-500 focus:border-green-500 focus:ring-green-500',
  warning: 'border-yellow-500 focus:border-yellow-500 focus:ring-yellow-500',
};

const iconSizes: Record<InputSize, string> = {
  sm: 'w-4 h-4',
  md: 'w-5 h-5',
  lg: 'w-6 h-6',
};

// ============================================================================
// Input Component
// ============================================================================

/**
 * Input - A versatile text input component
 *
 * @example
 * // Basic usage
 * <Input placeholder="Enter text..." />
 *
 * @example
 * // With label and helper text
 * <Input label="Email" helperText="We'll never share your email" />
 *
 * @example
 * // With error state
 * <Input label="Password" error="Password is required" type="password" />
 *
 * @example
 * // With icons
 * <Input startIcon={<SearchIcon />} placeholder="Search..." />
 */
export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      variant = 'default',
      inputSize = 'md',
      state = 'default',
      startIcon,
      endIcon,
      endAction,
      helperText,
      error,
      label,
      floatingLabel = false,
      fullWidth = false,
      wrapperClassName,
      disabled,
      required,
      id,
      ...props
    },
    ref
  ) => {
    const generatedId = React.useId();
    const inputId = id || generatedId;
    const helperId = `${inputId}-helper`;
    const effectiveState = error ? 'error' : state;

    const baseStyles =
      'w-full rounded-md text-white placeholder:text-surface-4 transition-all duration-200 outline-none disabled:cursor-not-allowed disabled:opacity-50';

    const hasStartIcon = !!startIcon;
    const hasEndContent = !!endIcon || !!endAction;

    const paddingLeft = hasStartIcon
      ? inputSize === 'sm'
        ? 'pl-8'
        : inputSize === 'lg'
          ? 'pl-12'
          : 'pl-10'
      : '';

    const paddingRight = hasEndContent
      ? inputSize === 'sm'
        ? 'pr-8'
        : inputSize === 'lg'
          ? 'pr-12'
          : 'pr-10'
      : '';

    return (
      <div
        className={cn('relative', fullWidth ? 'w-full' : 'w-fit', wrapperClassName)}
        data-input-wrapper
      >
        {/* Label */}
        {label && !floatingLabel && (
          <label
            htmlFor={inputId}
            className={cn(
              'mb-1.5 block text-sm font-medium text-surface-5',
              disabled && 'opacity-50'
            )}
          >
            {label}
            {required && <span className="ml-0.5 text-red-500">*</span>}
          </label>
        )}

        {/* Input wrapper for icons */}
        <div className="relative">
          {/* Start icon */}
          {startIcon && (
            <div
              className={cn(
                'pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-surface-4',
                iconSizes[inputSize]
              )}
              data-testid="input-start-icon"
            >
              {startIcon}
            </div>
          )}

          {/* Floating label */}
          {label && floatingLabel && (
            <label
              htmlFor={inputId}
              className={cn(
                'absolute left-3 top-1/2 -translate-y-1/2 text-surface-4 transition-all duration-200 pointer-events-none',
                'peer-focus:-translate-y-[1.75rem] peer-focus:text-xs peer-focus:text-electric-2',
                'peer-placeholder-shown:translate-y-1/2 peer-placeholder-shown:text-base',
                disabled && 'opacity-50'
              )}
            >
              {label}
              {required && <span className="ml-0.5 text-red-500">*</span>}
            </label>
          )}

          {/* Input element */}
          <input
            ref={ref}
            id={inputId}
            disabled={disabled}
            required={required}
            aria-invalid={effectiveState === 'error'}
            aria-describedby={helperText || error ? helperId : undefined}
            className={cn(
              baseStyles,
              inputVariants[variant],
              inputSizes[inputSize],
              inputStates[effectiveState],
              paddingLeft,
              paddingRight,
              floatingLabel && 'peer',
              className
            )}
            {...props}
          />

          {/* End icon */}
          {endIcon && !endAction && (
            <div
              className={cn(
                'pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-surface-4',
                iconSizes[inputSize]
              )}
              data-testid="input-end-icon"
            >
              {endIcon}
            </div>
          )}

          {/* End action (clickable) */}
          {endAction && (
            <div
              className="absolute right-2 top-1/2 -translate-y-1/2"
              data-testid="input-end-action"
            >
              {endAction}
            </div>
          )}
        </div>

        {/* Helper text / Error message */}
        {(helperText || error) && (
          <p
            id={helperId}
            className={cn(
              'mt-1.5 text-sm',
              effectiveState === 'error' ? 'text-red-500' : 'text-surface-4'
            )}
            role={error ? 'alert' : undefined}
          >
            {error || helperText}
          </p>
        )}
      </div>
    );
  }
);
Input.displayName = 'Input';

// ============================================================================
// InputGroup Component
// ============================================================================

export interface InputGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

/**
 * InputGroup - Groups multiple inputs or input addons together
 *
 * @example
 * <InputGroup>
 *   <InputAddon>$</InputAddon>
 *   <Input placeholder="Amount" />
 * </InputGroup>
 */
export const InputGroup = React.forwardRef<HTMLDivElement, InputGroupProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div ref={ref} className={cn('flex items-stretch', className)} role="group" {...props}>
        {children}
      </div>
    );
  }
);
InputGroup.displayName = 'InputGroup';

// ============================================================================
// InputAddon Component
// ============================================================================

export interface InputAddonProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Position of the addon */
  position?: 'start' | 'end';
  children: React.ReactNode;
}

/**
 * InputAddon - An addon element for InputGroup (prefix/suffix)
 *
 * @example
 * <InputGroup>
 *   <InputAddon position="start">https://</InputAddon>
 *   <Input placeholder="website.com" />
 * </InputGroup>
 */
export const InputAddon = React.forwardRef<HTMLDivElement, InputAddonProps>(
  ({ className, position = 'start', children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'flex items-center px-3 text-sm text-surface-4 bg-surface-2 border border-surface-3',
          position === 'start' ? 'rounded-l-md border-r-0' : 'rounded-r-md border-l-0',
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);
InputAddon.displayName = 'InputAddon';

// ============================================================================
// TextArea Component
// ============================================================================

export interface TextAreaProps extends Omit<
  React.TextareaHTMLAttributes<HTMLTextAreaElement>,
  'children'
> {
  /** Visual style variant */
  variant?: InputVariant;
  /** Visual state (error, success, etc.) */
  state?: InputState;
  /** Helper text displayed below the textarea */
  helperText?: string;
  /** Error message (also sets state to error) */
  error?: string;
  /** Label for the textarea */
  label?: string;
  /** Whether the textarea takes full width */
  fullWidth?: boolean;
  /** Whether to enable auto-resize */
  autoResize?: boolean;
  /** Minimum number of rows */
  minRows?: number;
  /** Maximum number of rows (only when autoResize is true) */
  maxRows?: number;
  /** Custom wrapper className */
  wrapperClassName?: string;
}

/**
 * TextArea - A multi-line text input component
 *
 * @example
 * // Basic usage
 * <TextArea placeholder="Enter description..." />
 *
 * @example
 * // With auto-resize
 * <TextArea autoResize minRows={3} maxRows={10} />
 */
export const TextArea = React.forwardRef<HTMLTextAreaElement, TextAreaProps>(
  (
    {
      className,
      variant = 'default',
      state = 'default',
      helperText,
      error,
      label,
      fullWidth = false,
      autoResize = false,
      minRows = 3,
      maxRows,
      wrapperClassName,
      disabled,
      required,
      id,
      onChange,
      ...props
    },
    ref
  ) => {
    const generatedId = React.useId();
    const textareaId = id || generatedId;
    const helperId = `${textareaId}-helper`;
    const effectiveState = error ? 'error' : state;
    const internalRef = React.useRef<HTMLTextAreaElement | null>(null);

    const setRefs = React.useCallback(
      (node: HTMLTextAreaElement | null) => {
        internalRef.current = node;
        if (typeof ref === 'function') {
          ref(node);
        } else if (ref) {
          ref.current = node;
        }
      },
      [ref]
    );

    const handleChange = React.useCallback(
      (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        if (autoResize && internalRef.current) {
          const textarea = internalRef.current;
          textarea.style.height = 'auto';

          const lineHeight = parseInt(getComputedStyle(textarea).lineHeight) || 20;
          const minHeight = minRows * lineHeight;
          const maxHeight = maxRows ? maxRows * lineHeight : undefined;

          let newHeight = Math.max(textarea.scrollHeight, minHeight);
          if (maxHeight) {
            newHeight = Math.min(newHeight, maxHeight);
          }

          textarea.style.height = `${newHeight}px`;
        }

        onChange?.(e);
      },
      [autoResize, minRows, maxRows, onChange]
    );

    const baseStyles =
      'w-full rounded-md text-white placeholder:text-surface-4 transition-all duration-200 outline-none disabled:cursor-not-allowed disabled:opacity-50 resize-none';

    return (
      <div
        className={cn('relative', fullWidth ? 'w-full' : 'w-fit', wrapperClassName)}
        data-textarea-wrapper
      >
        {/* Label */}
        {label && (
          <label
            htmlFor={textareaId}
            className={cn(
              'mb-1.5 block text-sm font-medium text-surface-5',
              disabled && 'opacity-50'
            )}
          >
            {label}
            {required && <span className="ml-0.5 text-red-500">*</span>}
          </label>
        )}

        {/* Textarea element */}
        <textarea
          ref={setRefs}
          id={textareaId}
          disabled={disabled}
          required={required}
          rows={minRows}
          aria-invalid={effectiveState === 'error'}
          aria-describedby={helperText || error ? helperId : undefined}
          onChange={handleChange}
          className={cn(
            baseStyles,
            inputVariants[variant],
            'px-3 py-2',
            inputStates[effectiveState],
            autoResize && 'overflow-hidden',
            className
          )}
          {...props}
        />

        {/* Helper text / Error message */}
        {(helperText || error) && (
          <p
            id={helperId}
            className={cn(
              'mt-1.5 text-sm',
              effectiveState === 'error' ? 'text-red-500' : 'text-surface-4'
            )}
            role={error ? 'alert' : undefined}
          >
            {error || helperText}
          </p>
        )}
      </div>
    );
  }
);
TextArea.displayName = 'TextArea';

// ============================================================================
// SearchInput Component
// ============================================================================

export interface SearchInputProps extends Omit<InputProps, 'startIcon' | 'type'> {
  /** Callback when search is submitted */
  onSearch?: (value: string) => void;
  /** Whether to show a clear button */
  showClear?: boolean;
  /** Whether to show a loading spinner */
  loading?: boolean;
}

const SearchIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
    />
  </svg>
);

const ClearIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const LoadingSpinner: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={cn('animate-spin', className)} fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path
      className="opacity-75"
      fill="currentColor"
      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
    />
  </svg>
);

/**
 * SearchInput - A specialized input for search functionality
 *
 * @example
 * <SearchInput
 *   placeholder="Search..."
 *   onSearch={(value) => console.log('Search:', value)}
 * />
 */
export const SearchInput = React.forwardRef<HTMLInputElement, SearchInputProps>(
  (
    {
      onSearch,
      showClear = true,
      loading = false,
      onKeyDown,
      onChange,
      value,
      defaultValue,
      ...props
    },
    ref
  ) => {
    const [internalValue, setInternalValue] = React.useState(defaultValue || '');
    const isControlled = value !== undefined;
    const currentValue = isControlled ? value : internalValue;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!isControlled) {
        setInternalValue(e.target.value);
      }
      onChange?.(e);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' && onSearch) {
        onSearch(String(currentValue));
      }
      onKeyDown?.(e);
    };

    const handleClear = () => {
      if (!isControlled) {
        setInternalValue('');
      }
      // Trigger onChange with empty value
      const event = {
        target: { value: '' },
        currentTarget: { value: '' },
      } as React.ChangeEvent<HTMLInputElement>;
      onChange?.(event);
    };

    return (
      <Input
        ref={ref}
        type="search"
        value={currentValue}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        startIcon={<SearchIcon className="w-4 h-4" />}
        endAction={
          loading ? (
            <LoadingSpinner className="w-4 h-4 text-surface-4" />
          ) : showClear && currentValue ? (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 rounded hover:bg-surface-3 text-surface-4 hover:text-white transition-colors"
              aria-label="Clear search"
            >
              <ClearIcon className="w-4 h-4" />
            </button>
          ) : null
        }
        {...props}
      />
    );
  }
);
SearchInput.displayName = 'SearchInput';

// ============================================================================
// NumberInput Component
// ============================================================================

export interface NumberInputProps extends Omit<InputProps, 'type' | 'onChange'> {
  /** Minimum value */
  min?: number;
  /** Maximum value */
  max?: number;
  /** Step increment */
  step?: number;
  /** Precision (decimal places) */
  precision?: number;
  /** Whether to show increment/decrement buttons */
  showControls?: boolean;
  /** Value (controlled) */
  value?: number | string;
  /** Default value */
  defaultValue?: number | string;
  /** Change handler */
  onChange?: (value: number | undefined, event: React.ChangeEvent<HTMLInputElement>) => void;
  /** Format display value */
  formatValue?: (value: number) => string;
  /** Parse input value */
  parseValue?: (value: string) => number | undefined;
}

const ChevronUpIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
  </svg>
);

const ChevronDownIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
  </svg>
);

/**
 * NumberInput - A specialized input for numeric values
 *
 * @example
 * <NumberInput
 *   label="Quantity"
 *   min={0}
 *   max={100}
 *   step={1}
 *   showControls
 * />
 *
 * @example
 * // Currency input
 * <NumberInput
 *   label="Price"
 *   precision={2}
 *   formatValue={(v) => v.toFixed(2)}
 *   startIcon={<span>$</span>}
 * />
 */
export const NumberInput = React.forwardRef<HTMLInputElement, NumberInputProps>(
  (
    {
      min,
      max,
      step = 1,
      precision,
      showControls = false,
      value,
      defaultValue,
      onChange,
      formatValue,
      parseValue,
      disabled,
      inputSize = 'md',
      ...props
    },
    ref
  ) => {
    const parseNumber = React.useCallback(
      (val: string): number | undefined => {
        if (parseValue) return parseValue(val);
        const parsed = parseFloat(val);
        return isNaN(parsed) ? undefined : parsed;
      },
      [parseValue]
    );

    const formatNumber = React.useCallback(
      (num: number): string => {
        if (formatValue) return formatValue(num);
        if (precision !== undefined) return num.toFixed(precision);
        return String(num);
      },
      [formatValue, precision]
    );

    const clampValue = React.useCallback(
      (val: number): number => {
        let result = val;
        if (min !== undefined) result = Math.max(min, result);
        if (max !== undefined) result = Math.min(max, result);
        return result;
      },
      [min, max]
    );

    const [internalValue, setInternalValue] = React.useState<string>(() => {
      const initial = defaultValue !== undefined ? Number(defaultValue) : undefined;
      return initial !== undefined ? formatNumber(initial) : '';
    });

    const isControlled = value !== undefined;
    const displayValue = isControlled
      ? value !== undefined && value !== ''
        ? formatNumber(Number(value))
        : ''
      : internalValue;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      const parsed = parseNumber(newValue);

      if (!isControlled) {
        setInternalValue(newValue);
      }

      onChange?.(parsed, e);
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      const parsed = parseNumber(e.target.value);
      if (parsed !== undefined) {
        const clamped = clampValue(parsed);
        const formatted = formatNumber(clamped);
        if (!isControlled) {
          setInternalValue(formatted);
        }
        if (clamped !== parsed) {
          onChange?.(clamped, e as unknown as React.ChangeEvent<HTMLInputElement>);
        }
      }
      props.onBlur?.(e);
    };

    const increment = () => {
      const current = parseNumber(displayValue) ?? 0;
      const newValue = clampValue(current + step);
      const formatted = formatNumber(newValue);
      if (!isControlled) {
        setInternalValue(formatted);
      }
      const fakeEvent = {
        target: { value: formatted },
      } as React.ChangeEvent<HTMLInputElement>;
      onChange?.(newValue, fakeEvent);
    };

    const decrement = () => {
      const current = parseNumber(displayValue) ?? 0;
      const newValue = clampValue(current - step);
      const formatted = formatNumber(newValue);
      if (!isControlled) {
        setInternalValue(formatted);
      }
      const fakeEvent = {
        target: { value: formatted },
      } as React.ChangeEvent<HTMLInputElement>;
      onChange?.(newValue, fakeEvent);
    };

    return (
      <Input
        ref={ref}
        type="text"
        inputMode="decimal"
        value={displayValue}
        onChange={handleChange}
        onBlur={handleBlur}
        disabled={disabled}
        inputSize={inputSize}
        endAction={
          showControls ? (
            <div className="flex flex-col -my-1">
              <button
                type="button"
                onClick={increment}
                disabled={disabled || (max !== undefined && parseNumber(displayValue) === max)}
                className="px-1 py-0.5 hover:bg-surface-3 rounded-t text-surface-4 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Increment"
                tabIndex={-1}
              >
                <ChevronUpIcon className="w-3 h-3" />
              </button>
              <button
                type="button"
                onClick={decrement}
                disabled={disabled || (min !== undefined && parseNumber(displayValue) === min)}
                className="px-1 py-0.5 hover:bg-surface-3 rounded-b text-surface-4 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Decrement"
                tabIndex={-1}
              >
                <ChevronDownIcon className="w-3 h-3" />
              </button>
            </div>
          ) : undefined
        }
        {...props}
      />
    );
  }
);
NumberInput.displayName = 'NumberInput';

// ============================================================================
// CurrencyInput Component
// ============================================================================

export interface CurrencyInputProps extends Omit<NumberInputProps, 'formatValue' | 'parseValue'> {
  /** Currency symbol */
  currency?: string;
  /** Locale for formatting */
  locale?: string;
}

/**
 * CurrencyInput - A specialized input for currency values
 *
 * @example
 * <CurrencyInput label="Price" currency="$" />
 *
 * @example
 * // With EUR
 * <CurrencyInput label="Amount" currency="€" locale="de-DE" />
 */
export const CurrencyInput = React.forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ currency = '$', locale = 'en-US', precision = 2, ...props }, ref) => {
    const formatValue = React.useCallback(
      (value: number): string => {
        return new Intl.NumberFormat(locale, {
          minimumFractionDigits: precision,
          maximumFractionDigits: precision,
        }).format(value);
      },
      [locale, precision]
    );

    const parseValue = React.useCallback((value: string): number | undefined => {
      // Remove currency symbols and thousands separators
      const cleaned = value.replace(/[^0-9.-]/g, '');
      const parsed = parseFloat(cleaned);
      return isNaN(parsed) ? undefined : parsed;
    }, []);

    return (
      <NumberInput
        ref={ref}
        precision={precision}
        formatValue={formatValue}
        parseValue={parseValue}
        startIcon={<span className="text-surface-4">{currency}</span>}
        {...props}
      />
    );
  }
);
CurrencyInput.displayName = 'CurrencyInput';

// ============================================================================
// PasswordInput Component
// ============================================================================

export interface PasswordInputProps extends Omit<InputProps, 'type' | 'endIcon' | 'endAction'> {
  /** Whether to show the toggle visibility button */
  showToggle?: boolean;
}

const EyeIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
    />
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
    />
  </svg>
);

const EyeOffIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
    />
  </svg>
);

/**
 * PasswordInput - A password input with visibility toggle
 *
 * @example
 * <PasswordInput label="Password" placeholder="Enter password" />
 */
export const PasswordInput = React.forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ showToggle = true, disabled, ...props }, ref) => {
    const [visible, setVisible] = React.useState(false);

    return (
      <Input
        ref={ref}
        type={visible ? 'text' : 'password'}
        disabled={disabled}
        endAction={
          showToggle ? (
            <button
              type="button"
              onClick={() => setVisible(!visible)}
              disabled={disabled}
              className="p-1 rounded hover:bg-surface-3 text-surface-4 hover:text-white transition-colors disabled:opacity-50"
              aria-label={visible ? 'Hide password' : 'Show password'}
            >
              {visible ? <EyeOffIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
            </button>
          ) : undefined
        }
        {...props}
      />
    );
  }
);
PasswordInput.displayName = 'PasswordInput';

// ============================================================================
// Exports
// ============================================================================

export default Input;

