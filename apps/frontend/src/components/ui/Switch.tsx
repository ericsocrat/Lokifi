/**
 * Switch Component
 *
 * Toggle switch components for binary state controls:
 * - Switch: Base toggle switch with multiple sizes, colors, and states
 * - SwitchGroup: Group of switches with shared label
 * - SwitchCard: Card-style switch for settings panels
 *
 * @module components/ui/Switch
 */

'use client';

import * as React from 'react';
import { cn } from '../../lib/utils';

// ============================================================================
// Types
// ============================================================================

export type SwitchSize = 'sm' | 'md' | 'lg';
export type SwitchColor = 'default' | 'primary' | 'success' | 'warning' | 'error';

export interface SwitchProps extends Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  'size' | 'type'
> {
  /** Size variant */
  size?: SwitchSize;
  /** Color variant */
  color?: SwitchColor;
  /** Label text */
  label?: React.ReactNode;
  /** Description text below label */
  description?: React.ReactNode;
  /** Error message */
  error?: string;
  /** Position of the label relative to switch */
  labelPosition?: 'left' | 'right';
  /** Show loading indicator */
  loading?: boolean;
  /** Icon to show when checked */
  checkedIcon?: React.ReactNode;
  /** Icon to show when unchecked */
  uncheckedIcon?: React.ReactNode;
  /** Class name for the wrapper */
  wrapperClassName?: string;
}

export interface SwitchGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Group label */
  label?: React.ReactNode;
  /** Helper text */
  helperText?: string;
  /** Error message */
  error?: string;
  /** Orientation of the switches */
  orientation?: 'horizontal' | 'vertical';
  /** Required indicator */
  required?: boolean;
}

export interface SwitchCardProps extends Omit<SwitchProps, 'label' | 'description' | 'title'> {
  /** Card title */
  title: React.ReactNode;
  /** Card description */
  description?: React.ReactNode;
  /** Icon to display */
  icon?: React.ReactNode;
  /** Badge content */
  badge?: React.ReactNode;
}

// ============================================================================
// Constants
// ============================================================================

const switchSizes = {
  sm: {
    track: 'h-4 w-7',
    thumb: 'h-3 w-3',
    translate: 'peer-checked:translate-x-3',
    icon: 'h-2 w-2',
    label: 'text-sm',
  },
  md: {
    track: 'h-6 w-11',
    thumb: 'h-5 w-5',
    translate: 'peer-checked:translate-x-5',
    icon: 'h-3 w-3',
    label: 'text-base',
  },
  lg: {
    track: 'h-8 w-14',
    thumb: 'h-7 w-7',
    translate: 'peer-checked:translate-x-6',
    icon: 'h-4 w-4',
    label: 'text-lg',
  },
};

const switchColors = {
  default: {
    track: 'peer-checked:bg-electric-2',
    focus: 'peer-focus-visible:ring-electric-2/50',
  },
  primary: {
    track: 'peer-checked:bg-blue-500',
    focus: 'peer-focus-visible:ring-blue-500/50',
  },
  success: {
    track: 'peer-checked:bg-green-500',
    focus: 'peer-focus-visible:ring-green-500/50',
  },
  warning: {
    track: 'peer-checked:bg-yellow-500',
    focus: 'peer-focus-visible:ring-yellow-500/50',
  },
  error: {
    track: 'peer-checked:bg-red-500',
    focus: 'peer-focus-visible:ring-red-500/50',
  },
};

// ============================================================================
// Switch Component
// ============================================================================

export const Switch = React.forwardRef<HTMLInputElement, SwitchProps>(
  (
    {
      size = 'md',
      color = 'default',
      label,
      description,
      error,
      labelPosition = 'right',
      loading = false,
      checkedIcon,
      uncheckedIcon,
      wrapperClassName,
      className,
      disabled,
      id,
      ...props
    },
    ref
  ) => {
    const generatedId = React.useId();
    const switchId = id || generatedId;
    const descriptionId = description ? `${switchId}-desc` : undefined;
    const errorId = error ? `${switchId}-error` : undefined;

    const sizeStyles = switchSizes[size];
    const colorStyles = error ? switchColors.error : switchColors[color];

    const switchElement = (
      <label
        className={cn(
          'relative inline-flex shrink-0 cursor-pointer items-center',
          disabled && 'cursor-not-allowed opacity-50',
          wrapperClassName
        )}
      >
        {/* Hidden input */}
        <input
          ref={ref}
          type="checkbox"
          role="switch"
          id={switchId}
          disabled={disabled || loading}
          className="peer sr-only"
          aria-describedby={
            descriptionId || errorId
              ? [descriptionId, errorId].filter(Boolean).join(' ')
              : undefined
          }
          aria-invalid={error ? 'true' : undefined}
          {...props}
        />

        {/* Track */}
        <span
          className={cn(
            'relative rounded-full bg-surface-4 transition-colors duration-200',
            'peer-focus-visible:ring-2 peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-surface-1',
            sizeStyles.track,
            colorStyles.track,
            colorStyles.focus,
            error && 'bg-red-500/20'
          )}
          aria-hidden="true"
        >
          {/* Thumb */}
          <span
            className={cn(
              'absolute left-0.5 top-1/2 -translate-y-1/2 rounded-full bg-white shadow-sm transition-transform duration-200',
              'flex items-center justify-center',
              sizeStyles.thumb,
              sizeStyles.translate,
              loading && 'animate-pulse'
            )}
          >
            {/* Loading spinner */}
            {loading && (
              <svg
                className={cn('animate-spin text-surface-5', sizeStyles.icon)}
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
            )}

            {/* Icons */}
            {!loading && checkedIcon && uncheckedIcon && (
              <>
                <span className={cn('hidden peer-checked:block', sizeStyles.icon)}>
                  {checkedIcon}
                </span>
                <span className={cn('block peer-checked:hidden', sizeStyles.icon)}>
                  {uncheckedIcon}
                </span>
              </>
            )}
          </span>
        </span>
      </label>
    );

    // If no label, just return the switch
    if (!label && !description && !error) {
      return switchElement;
    }

    // Wrap with label container
    return (
      <div
        className={cn(
          'flex',
          labelPosition === 'left' ? 'flex-row-reverse justify-end' : 'flex-row',
          'gap-3',
          className
        )}
      >
        {switchElement}

        <div className="flex flex-col">
          {label && (
            <label
              htmlFor={switchId}
              className={cn(
                'cursor-pointer select-none font-medium text-lokifi-1',
                sizeStyles.label,
                disabled && 'cursor-not-allowed opacity-50'
              )}
            >
              {label}
            </label>
          )}
          {description && (
            <span id={descriptionId} className="mt-0.5 text-sm text-lokifi-3">
              {description}
            </span>
          )}
          {error && (
            <span id={errorId} className="mt-1 text-sm text-red-500" role="alert">
              {error}
            </span>
          )}
        </div>
      </div>
    );
  }
);

Switch.displayName = 'Switch';

// ============================================================================
// SwitchGroup Component
// ============================================================================

export const SwitchGroup = React.forwardRef<HTMLDivElement, SwitchGroupProps>(
  (
    { label, helperText, error, orientation = 'vertical', required, children, className, ...props },
    ref
  ) => {
    const groupId = React.useId();
    const labelId = label ? `${groupId}-label` : undefined;
    const helperId = helperText || error ? `${groupId}-helper` : undefined;

    return (
      <div
        ref={ref}
        role="group"
        aria-labelledby={labelId}
        aria-describedby={helperId}
        className={cn('space-y-2', className)}
        {...props}
      >
        {label && (
          <div id={labelId} className="font-medium text-lokifi-1">
            {label}
            {required && <span className="ml-1 text-red-500">*</span>}
          </div>
        )}

        <div
          className={cn(
            'flex',
            orientation === 'vertical' ? 'flex-col gap-3' : 'flex-row flex-wrap gap-6'
          )}
        >
          {children}
        </div>

        {(helperText || error) && (
          <div
            id={helperId}
            className={cn('text-sm', error ? 'text-red-500' : 'text-lokifi-3')}
            role={error ? 'alert' : undefined}
          >
            {error || helperText}
          </div>
        )}
      </div>
    );
  }
);

SwitchGroup.displayName = 'SwitchGroup';

// ============================================================================
// SwitchCard Component
// ============================================================================

export const SwitchCard = React.forwardRef<HTMLInputElement, SwitchCardProps>(
  ({ title, description, icon, badge, disabled, className, ...props }, ref) => {
    const cardId = React.useId();

    return (
      <label
        htmlFor={cardId}
        className={cn(
          'flex cursor-pointer items-center justify-between rounded-lg border border-surface-3 bg-surface-1 p-4 transition-all',
          'hover:border-surface-4 hover:bg-surface-2',
          disabled && 'cursor-not-allowed opacity-50',
          className
        )}
      >
        <div className="flex items-center gap-3">
          {icon && (
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-surface-2 text-lokifi-2">
              {icon}
            </div>
          )}
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="font-medium text-lokifi-1">{title}</span>
              {badge}
            </div>
            {description && <span className="text-sm text-lokifi-3">{description}</span>}
          </div>
        </div>

        <Switch ref={ref} id={cardId} disabled={disabled} {...props} />
      </label>
    );
  }
);

SwitchCard.displayName = 'SwitchCard';

// ============================================================================
// useSwitchGroup Hook
// ============================================================================

export interface UseSwitchGroupOptions<T extends string = string> {
  /** Initial values */
  defaultValue?: T[];
  /** Controlled values */
  value?: T[];
  /** Change callback */
  onChange?: (value: T[]) => void;
}

export interface UseSwitchGroupReturn<T extends string = string> {
  /** Currently enabled values */
  value: T[];
  /** Enable a switch */
  enable: (item: T | T[]) => void;
  /** Disable a switch */
  disable: (item: T | T[]) => void;
  /** Toggle a switch */
  toggle: (item: T) => void;
  /** Enable all switches */
  enableAll: (items: T[]) => void;
  /** Disable all switches */
  disableAll: () => void;
  /** Check if an item is enabled */
  isEnabled: (item: T) => boolean;
  /** Get props for individual switch */
  getSwitchProps: (item: T) => {
    checked: boolean;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  };
}

export function useSwitchGroup<T extends string = string>(
  options: UseSwitchGroupOptions<T> = {}
): UseSwitchGroupReturn<T> {
  const { defaultValue = [], value: controlledValue, onChange } = options;
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

  const enable = React.useCallback(
    (item: T | T[]) => {
      const items = Array.isArray(item) ? item : [item];
      const newValue = [...new Set([...value, ...items])];
      updateValue(newValue);
    },
    [value, updateValue]
  );

  const disable = React.useCallback(
    (item: T | T[]) => {
      const items = Array.isArray(item) ? item : [item];
      const newValue = value.filter((v) => !items.includes(v));
      updateValue(newValue);
    },
    [value, updateValue]
  );

  const toggle = React.useCallback(
    (item: T) => {
      if (value.includes(item)) {
        disable(item);
      } else {
        enable(item);
      }
    },
    [value, enable, disable]
  );

  const enableAll = React.useCallback(
    (items: T[]) => {
      updateValue([...new Set([...value, ...items])]);
    },
    [value, updateValue]
  );

  const disableAll = React.useCallback(() => {
    updateValue([]);
  }, [updateValue]);

  const isEnabled = React.useCallback((item: T) => value.includes(item), [value]);

  const getSwitchProps = React.useCallback(
    (item: T) => ({
      checked: value.includes(item),
      onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
          enable(item);
        } else {
          disable(item);
        }
      },
    }),
    [value, enable, disable]
  );

  return {
    value,
    enable,
    disable,
    toggle,
    enableAll,
    disableAll,
    isEnabled,
    getSwitchProps,
  };
}

