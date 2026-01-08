'use client';

import { cn } from '@/lib/utils/cn';
import * as React from 'react';

// ============================================================================
// Types & Interfaces
// ============================================================================

/**
 * Checkbox size variants
 */
export type CheckboxSize = 'sm' | 'md' | 'lg';

/**
 * Checkbox color variants
 */
export type CheckboxColor = 'default' | 'primary' | 'success' | 'warning' | 'error';

/**
 * Props for the Checkbox component
 */
export interface CheckboxProps extends Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  'size' | 'type'
> {
  /** Size of the checkbox */
  size?: CheckboxSize;
  /** Color theme */
  color?: CheckboxColor;
  /** Label text */
  label?: string;
  /** Description text (shown below label) */
  description?: string;
  /** Whether the checkbox is in an indeterminate state */
  indeterminate?: boolean;
  /** Error message */
  error?: string;
  /** Position of the checkbox relative to label */
  labelPosition?: 'left' | 'right';
  /** Custom wrapper className */
  wrapperClassName?: string;
}

// ============================================================================
// Style Definitions
// ============================================================================

const checkboxSizes: Record<CheckboxSize, { box: string; icon: string; label: string }> = {
  sm: {
    box: 'h-4 w-4',
    icon: 'h-3 w-3',
    label: 'text-sm',
  },
  md: {
    box: 'h-5 w-5',
    icon: 'h-3.5 w-3.5',
    label: 'text-base',
  },
  lg: {
    box: 'h-6 w-6',
    icon: 'h-4 w-4',
    label: 'text-lg',
  },
};

const checkboxColors: Record<CheckboxColor, { checked: string; focus: string }> = {
  default: {
    checked: 'bg-electric-2 border-electric-2',
    focus: 'focus:ring-electric-2',
  },
  primary: {
    checked: 'bg-blue-500 border-blue-500',
    focus: 'focus:ring-blue-500',
  },
  success: {
    checked: 'bg-green-500 border-green-500',
    focus: 'focus:ring-green-500',
  },
  warning: {
    checked: 'bg-yellow-500 border-yellow-500',
    focus: 'focus:ring-yellow-500',
  },
  error: {
    checked: 'bg-red-500 border-red-500',
    focus: 'focus:ring-red-500',
  },
};

// ============================================================================
// Icon Components
// ============================================================================

const CheckIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
  </svg>
);

const IndeterminateIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14" />
  </svg>
);

// ============================================================================
// Checkbox Component
// ============================================================================

/**
 * Checkbox - A customizable checkbox input component
 *
 * @example
 * // Basic usage
 * <Checkbox label="Accept terms" />
 *
 * @example
 * // With description
 * <Checkbox
 *   label="Marketing emails"
 *   description="Receive updates about new features"
 * />
 *
 * @example
 * // Indeterminate state (for "select all" scenarios)
 * <Checkbox label="Select all" indeterminate />
 */
export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  (
    {
      className,
      size = 'md',
      color = 'default',
      label,
      description,
      indeterminate = false,
      error,
      labelPosition = 'right',
      wrapperClassName,
      disabled,
      checked,
      defaultChecked,
      id,
      onChange,
      ...props
    },
    ref
  ) => {
    const generatedId = React.useId();
    const checkboxId = id || generatedId;
    const descriptionId = `${checkboxId}-description`;
    const errorId = `${checkboxId}-error`;

    // Handle indeterminate state
    const internalRef = React.useRef<HTMLInputElement | null>(null);

    const setRefs = React.useCallback(
      (node: HTMLInputElement | null) => {
        internalRef.current = node;
        if (typeof ref === 'function') {
          ref(node);
        } else if (ref) {
          ref.current = node;
        }
      },
      [ref]
    );

    React.useEffect(() => {
      if (internalRef.current) {
        internalRef.current.indeterminate = indeterminate;
      }
    }, [indeterminate]);

    const sizeStyles = checkboxSizes[size];
    const colorStyles = checkboxColors[error ? 'error' : color];

    const checkboxElement = (
      <div className="relative flex items-center">
        {/* Hidden native checkbox */}
        <input
          ref={setRefs}
          type="checkbox"
          id={checkboxId}
          disabled={disabled}
          checked={checked}
          defaultChecked={defaultChecked}
          onChange={onChange}
          aria-invalid={!!error}
          aria-describedby={
            [description && descriptionId, error && errorId].filter(Boolean).join(' ') || undefined
          }
          className={cn(
            'peer absolute opacity-0 cursor-pointer',
            sizeStyles.box,
            disabled && 'cursor-not-allowed'
          )}
          {...props}
        />

        {/* Custom checkbox appearance */}
        <div
          className={cn(
            'flex items-center justify-center rounded border-2 transition-all duration-200',
            sizeStyles.box,
            'border-surface-4 bg-surface-2',
            'peer-checked:border-0',
            `peer-checked:${colorStyles.checked.split(' ')[0]}`,
            'peer-focus:ring-2 peer-focus:ring-offset-2 peer-focus:ring-offset-surface-1',
            colorStyles.focus,
            error && 'border-red-500',
            disabled && 'opacity-50 cursor-not-allowed',
            className
          )}
          aria-hidden="true"
        >
          {/* Check icon (shown when checked) */}
          <CheckIcon
            className={cn(
              sizeStyles.icon,
              'text-white opacity-0 scale-0 transition-all duration-200',
              'peer-checked:opacity-100 peer-checked:scale-100',
              indeterminate && 'hidden'
            )}
          />

          {/* Indeterminate icon */}
          {indeterminate && <IndeterminateIcon className={cn(sizeStyles.icon, 'text-white')} />}
        </div>
      </div>
    );

    const labelElement = (label || description) && (
      <div className={cn('flex flex-col', labelPosition === 'left' ? 'mr-3' : 'ml-3')}>
        {label && (
          <label
            htmlFor={checkboxId}
            className={cn(
              'font-medium text-white cursor-pointer select-none',
              sizeStyles.label,
              disabled && 'opacity-50 cursor-not-allowed'
            )}
          >
            {label}
          </label>
        )}
        {description && (
          <span
            id={descriptionId}
            className={cn('text-sm text-surface-4', disabled && 'opacity-50')}
          >
            {description}
          </span>
        )}
      </div>
    );

    return (
      <div className={cn('inline-flex flex-col', wrapperClassName)}>
        <div className="flex items-start">
          {labelPosition === 'left' && labelElement}
          {checkboxElement}
          {labelPosition === 'right' && labelElement}
        </div>

        {/* Error message */}
        {error && (
          <span id={errorId} className="mt-1 text-sm text-red-500" role="alert">
            {error}
          </span>
        )}
      </div>
    );
  }
);
Checkbox.displayName = 'Checkbox';

// ============================================================================
// CheckboxGroup Component
// ============================================================================

export interface CheckboxGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Group label */
  label?: string;
  /** Helper text */
  helperText?: string;
  /** Error message for the group */
  error?: string;
  /** Layout direction */
  orientation?: 'horizontal' | 'vertical';
  /** Whether the entire group is required */
  required?: boolean;
  children: React.ReactNode;
}

/**
 * CheckboxGroup - Groups related checkboxes together
 *
 * @example
 * <CheckboxGroup label="Notifications" orientation="vertical">
 *   <Checkbox label="Email" value="email" />
 *   <Checkbox label="SMS" value="sms" />
 *   <Checkbox label="Push" value="push" />
 * </CheckboxGroup>
 */
export const CheckboxGroup = React.forwardRef<HTMLDivElement, CheckboxGroupProps>(
  (
    { className, label, helperText, error, orientation = 'vertical', required, children, ...props },
    ref
  ) => {
    const groupId = React.useId();
    const helperId = `${groupId}-helper`;

    return (
      <div
        ref={ref}
        role="group"
        aria-labelledby={label ? `${groupId}-label` : undefined}
        aria-describedby={helperText || error ? helperId : undefined}
        className={cn('flex flex-col', className)}
        {...props}
      >
        {/* Label */}
        {label && (
          <span id={`${groupId}-label`} className="mb-2 font-medium text-white">
            {label}
            {required && <span className="ml-0.5 text-red-500">*</span>}
          </span>
        )}

        {/* Checkboxes */}
        <div
          className={cn(
            'flex',
            orientation === 'vertical' ? 'flex-col gap-2' : 'flex-row flex-wrap gap-4'
          )}
        >
          {children}
        </div>

        {/* Helper/Error text */}
        {(helperText || error) && (
          <span
            id={helperId}
            className={cn('mt-2 text-sm', error ? 'text-red-500' : 'text-surface-4')}
            role={error ? 'alert' : undefined}
          >
            {error || helperText}
          </span>
        )}
      </div>
    );
  }
);
CheckboxGroup.displayName = 'CheckboxGroup';

// ============================================================================
// CheckboxCard Component
// ============================================================================

export interface CheckboxCardProps extends CheckboxProps {
  /** Title for the card */
  title?: string;
  /** Icon to display */
  icon?: React.ReactNode;
}

/**
 * CheckboxCard - A card-style checkbox with richer content
 *
 * @example
 * <CheckboxCard
 *   title="Premium Plan"
 *   description="Access all features including priority support"
 *   icon={<StarIcon />}
 * />
 */
export const CheckboxCard = React.forwardRef<HTMLInputElement, CheckboxCardProps>(
  (
    {
      className,
      title,
      description,
      icon,
      disabled,
      // Destructure CheckboxProps-specific fields to avoid passing to native input
      size: _size,
      color: _color,
      label: _label,
      indeterminate: _indeterminate,
      error: _error,
      labelPosition: _labelPosition,
      wrapperClassName: _wrapperClassName,
      ...props
    },
    ref
  ) => {
    const cardId = React.useId();

    return (
      <label
        htmlFor={props.id || cardId}
        className={cn(
          'relative flex cursor-pointer rounded-lg border-2 border-surface-3 bg-surface-2 p-4 transition-all duration-200',
          'hover:border-surface-4 hover:bg-surface-3',
          'has-[:checked]:border-electric-2 has-[:checked]:bg-surface-3',
          'has-[:focus]:ring-2 has-[:focus]:ring-electric-2 has-[:focus]:ring-offset-2 has-[:focus]:ring-offset-surface-1',
          disabled && 'opacity-50 cursor-not-allowed hover:border-surface-3 hover:bg-surface-2',
          className
        )}
      >
        <input
          ref={ref}
          type="checkbox"
          id={props.id || cardId}
          disabled={disabled}
          className="sr-only"
          {...props}
        />

        <div className="flex items-start gap-4">
          {/* Icon */}
          {icon && (
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-surface-1 text-electric-2">
              {icon}
            </div>
          )}

          {/* Content */}
          <div className="flex-1">
            {title && <span className="block font-semibold text-white">{title}</span>}
            {description && (
              <span className="mt-1 block text-sm text-surface-4">{description}</span>
            )}
          </div>

          {/* Check indicator */}
          <div
            className={cn(
              'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 border-surface-4 transition-all',
              'peer-checked:border-0 peer-checked:bg-electric-2'
            )}
          >
            <CheckIcon className="h-3 w-3 text-white opacity-0 transition-opacity peer-checked:opacity-100" />
          </div>
        </div>
      </label>
    );
  }
);
CheckboxCard.displayName = 'CheckboxCard';

// ============================================================================
// useCheckboxGroup Hook
// ============================================================================

export interface UseCheckboxGroupOptions<T extends string = string> {
  /** Initial selected values */
  defaultValue?: T[];
  /** Controlled value */
  value?: T[];
  /** Callback when selection changes */
  onChange?: (value: T[]) => void;
  /** Minimum selections required */
  min?: number;
  /** Maximum selections allowed */
  max?: number;
}

export interface UseCheckboxGroupReturn<T extends string = string> {
  /** Currently selected values */
  value: T[];
  /** Whether all items are selected */
  isAllSelected: boolean;
  /** Whether some (but not all) items are selected */
  isIndeterminate: boolean;
  /** Get props for individual checkbox */
  getCheckboxProps: (itemValue: T) => {
    checked: boolean;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    disabled?: boolean;
  };
  /** Get props for "select all" checkbox */
  getSelectAllProps: (allValues: T[]) => {
    checked: boolean;
    indeterminate: boolean;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  };
  /** Select specific items */
  select: (items: T | T[]) => void;
  /** Deselect specific items */
  deselect: (items: T | T[]) => void;
  /** Toggle selection of specific items */
  toggle: (items: T | T[]) => void;
  /** Clear all selections */
  clear: () => void;
  /** Select all items */
  selectAll: (allValues: T[]) => void;
}

/**
 * useCheckboxGroup - Hook for managing checkbox group state
 *
 * @example
 * const { value, getCheckboxProps, getSelectAllProps } = useCheckboxGroup({
 *   defaultValue: ['email'],
 *   onChange: (selected) => console.log(selected),
 * });
 */
export function useCheckboxGroup<T extends string = string>(
  options: UseCheckboxGroupOptions<T> = {}
): UseCheckboxGroupReturn<T> {
  const { defaultValue = [], value: controlledValue, onChange, min, max } = options;

  const [internalValue, setInternalValue] = React.useState<T[]>(defaultValue);
  const isControlled = controlledValue !== undefined;
  const value = isControlled ? controlledValue : internalValue;

  const updateValue = React.useCallback(
    (newValue: T[]) => {
      if (!isControlled) {
        setInternalValue(newValue);
      }
      onChange?.(newValue);
    },
    [isControlled, onChange]
  );

  const isAllSelected = React.useCallback(
    (allValues?: T[]) => {
      if (!allValues) return false;
      return allValues.length > 0 && allValues.every((v) => value.includes(v));
    },
    [value]
  );

  const isIndeterminate = React.useCallback(
    (allValues?: T[]) => {
      if (!allValues) return false;
      const selectedCount = allValues.filter((v) => value.includes(v)).length;
      return selectedCount > 0 && selectedCount < allValues.length;
    },
    [value]
  );

  const canSelect = React.useCallback(
    (count: number) => {
      if (max === undefined) return true;
      return value.length + count <= max;
    },
    [max, value.length]
  );

  const canDeselect = React.useCallback(
    (count: number) => {
      if (min === undefined) return true;
      return value.length - count >= min;
    },
    [min, value.length]
  );

  const select = React.useCallback(
    (items: T | T[]) => {
      const itemsArray = Array.isArray(items) ? items : [items];
      const newItems = itemsArray.filter((item) => !value.includes(item));
      if (canSelect(newItems.length)) {
        updateValue([...value, ...newItems]);
      }
    },
    [value, canSelect, updateValue]
  );

  const deselect = React.useCallback(
    (items: T | T[]) => {
      const itemsArray = Array.isArray(items) ? items : [items];
      const itemsToRemove = itemsArray.filter((item) => value.includes(item));
      if (canDeselect(itemsToRemove.length)) {
        updateValue(value.filter((v) => !itemsArray.includes(v)));
      }
    },
    [value, canDeselect, updateValue]
  );

  const toggle = React.useCallback(
    (items: T | T[]) => {
      const itemsArray = Array.isArray(items) ? items : [items];
      const newValue = [...value];

      itemsArray.forEach((item) => {
        const index = newValue.indexOf(item);
        if (index === -1) {
          if (canSelect(1)) {
            newValue.push(item);
          }
        } else {
          if (canDeselect(1)) {
            newValue.splice(index, 1);
          }
        }
      });

      updateValue(newValue);
    },
    [value, canSelect, canDeselect, updateValue]
  );

  const clear = React.useCallback(() => {
    if (canDeselect(value.length)) {
      updateValue([]);
    }
  }, [value.length, canDeselect, updateValue]);

  const selectAll = React.useCallback(
    (allValues: T[]) => {
      const newItems = allValues.filter((v) => !value.includes(v));
      if (canSelect(newItems.length)) {
        updateValue([...allValues]);
      }
    },
    [value, canSelect, updateValue]
  );

  const getCheckboxProps = React.useCallback(
    (itemValue: T) => ({
      checked: value.includes(itemValue),
      onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
          select(itemValue);
        } else {
          deselect(itemValue);
        }
      },
      disabled: !value.includes(itemValue) && !canSelect(1),
    }),
    [value, select, deselect, canSelect]
  );

  const getSelectAllProps = React.useCallback(
    (allValues: T[]) => ({
      checked: isAllSelected(allValues),
      indeterminate: isIndeterminate(allValues),
      onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
          selectAll(allValues);
        } else {
          clear();
        }
      },
    }),
    [isAllSelected, isIndeterminate, selectAll, clear]
  );

  return {
    value,
    isAllSelected: isAllSelected([]),
    isIndeterminate: isIndeterminate([]),
    getCheckboxProps,
    getSelectAllProps,
    select,
    deselect,
    toggle,
    clear,
    selectAll,
  };
}

// ============================================================================
// Exports
// ============================================================================

export default Checkbox;


