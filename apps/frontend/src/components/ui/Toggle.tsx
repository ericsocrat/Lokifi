'use client';

import { cn } from '@/lib/utils';
import { forwardRef, useId } from 'react';

export interface ToggleProps {
  /** Whether the toggle is checked/on */
  checked?: boolean;
  /** Default checked state for uncontrolled usage */
  defaultChecked?: boolean;
  /** Called when the toggle state changes */
  onChange?: (checked: boolean) => void;
  /** Whether the toggle is disabled */
  disabled?: boolean;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Color variant when checked */
  color?: 'primary' | 'success' | 'warning' | 'danger';
  /** Label text displayed next to the toggle */
  label?: string;
  /** Description text displayed below the label */
  description?: string;
  /** Position of the label relative to the toggle */
  labelPosition?: 'left' | 'right';
  /** Additional className for the container */
  className?: string;
  /** Name attribute for form submission */
  name?: string;
  /** Value attribute for form submission */
  value?: string;
  /** aria-label for accessibility when no visible label */
  'aria-label'?: string;
  /** aria-labelledby for referencing external label */
  'aria-labelledby'?: string;
  /** Test ID for testing purposes */
  'data-testid'?: string;
}

const sizeClasses = {
  sm: {
    track: 'h-4 w-7',
    thumb: 'h-3 w-3',
    translate: 'translate-x-3',
    label: 'text-sm',
    description: 'text-xs',
  },
  md: {
    track: 'h-5 w-9',
    thumb: 'h-4 w-4',
    translate: 'translate-x-4',
    label: 'text-sm',
    description: 'text-xs',
  },
  lg: {
    track: 'h-6 w-11',
    thumb: 'h-5 w-5',
    translate: 'translate-x-5',
    label: 'text-base',
    description: 'text-sm',
  },
};

const colorClasses = {
  primary: 'bg-blue-600',
  success: 'bg-green-600',
  warning: 'bg-yellow-500',
  danger: 'bg-red-600',
};

/**
 * Toggle/Switch component for binary on/off states.
 * Supports both controlled and uncontrolled usage.
 *
 * @example
 * // Controlled usage
 * const [isEnabled, setIsEnabled] = useState(false);
 * <Toggle checked={isEnabled} onChange={setIsEnabled} label="Enable notifications" />
 *
 * @example
 * // Uncontrolled with defaultChecked
 * <Toggle defaultChecked label="Dark mode" />
 *
 * @example
 * // With description
 * <Toggle
 *   label="Marketing emails"
 *   description="Receive promotional content and updates"
 * />
 */
export const Toggle = forwardRef<HTMLButtonElement, ToggleProps>(
  (
    {
      checked,
      defaultChecked = false,
      onChange,
      disabled = false,
      size = 'md',
      color = 'primary',
      label,
      description,
      labelPosition = 'right',
      className,
      name,
      value,
      'aria-label': ariaLabel,
      'aria-labelledby': ariaLabelledBy,
      'data-testid': testId,
    },
    ref
  ) => {
    const generatedId = useId();
    const labelId = `${generatedId}-label`;
    const descriptionId = description ? `${generatedId}-description` : undefined;

    // For uncontrolled mode, we use internal state
    const isControlled = checked !== undefined;
    const isChecked = isControlled ? checked : defaultChecked;

    const handleClick = () => {
      if (disabled) return;
      onChange?.(!isChecked);
    };

    const handleKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        handleClick();
      }
    };

    const sizeConfig = sizeClasses[size];
    const colorClass = colorClasses[color];

    const renderLabel = () => {
      if (!label) return null;
      return (
        <div className="flex flex-col">
          <span
            id={labelId}
            className={cn(
              sizeConfig.label,
              'font-medium',
              disabled ? 'text-gray-500' : 'text-white'
            )}
          >
            {label}
          </span>
          {description && (
            <span
              id={descriptionId}
              className={cn(sizeConfig.description, disabled ? 'text-gray-600' : 'text-gray-400')}
            >
              {description}
            </span>
          )}
        </div>
      );
    };

    const toggle = (
      <button
        ref={ref}
        type="button"
        role="switch"
        aria-checked={isChecked}
        aria-label={ariaLabel}
        aria-labelledby={label ? labelId : ariaLabelledBy}
        aria-describedby={descriptionId}
        aria-disabled={disabled}
        disabled={disabled}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        data-testid={testId}
        data-state={isChecked ? 'checked' : 'unchecked'}
        className={cn(
          'relative inline-flex flex-shrink-0 items-center rounded-full',
          'transition-colors duration-200 ease-in-out',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-0',
          sizeConfig.track,
          isChecked ? colorClass : 'bg-gray-600',
          disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
        )}
      >
        {/* Hidden input for form submission */}
        {name && <input type="hidden" name={name} value={isChecked ? value || 'on' : ''} />}
        {/* Thumb */}
        <span
          aria-hidden="true"
          className={cn(
            'pointer-events-none inline-block rounded-full bg-white shadow-lg',
            'transform transition-transform duration-200 ease-in-out',
            sizeConfig.thumb,
            isChecked ? sizeConfig.translate : 'translate-x-0.5'
          )}
        />
      </button>
    );

    // If no label, just return the toggle
    if (!label) {
      return (
        <div
          className={cn('inline-flex', className)}
          data-testid={testId ? `${testId}-container` : undefined}
        >
          {toggle}
        </div>
      );
    }

    // Return toggle with label
    return (
      <div
        className={cn(
          'flex items-center gap-3',
          disabled ? 'cursor-not-allowed' : 'cursor-pointer',
          className
        )}
        onClick={handleClick}
        data-testid={testId ? `${testId}-container` : undefined}
      >
        {labelPosition === 'left' && renderLabel()}
        {toggle}
        {labelPosition === 'right' && renderLabel()}
      </div>
    );
  }
);

Toggle.displayName = 'Toggle';

export default Toggle;
