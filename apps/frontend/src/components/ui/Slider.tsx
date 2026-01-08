'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

// ============================================================================
// Types
// ============================================================================

export type SliderSize = 'sm' | 'md' | 'lg';
export type SliderVariant = 'default' | 'primary' | 'success' | 'warning' | 'danger';
export type SliderOrientation = 'horizontal' | 'vertical';

export interface SliderProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onChange' | 'defaultValue'> {
  /** Current value(s) - single number or array for range */
  value?: number | number[];
  /** Default value(s) for uncontrolled mode */
  defaultValue?: number | number[];
  /** Callback when value changes */
  onChange?: (value: number | number[]) => void;
  /** Callback when value change is committed (on mouse up) */
  onChangeEnd?: (value: number | number[]) => void;
  /** Minimum value */
  min?: number;
  /** Maximum value */
  max?: number;
  /** Step increment */
  step?: number;
  /** Size of the slider */
  size?: SliderSize;
  /** Visual variant */
  variant?: SliderVariant;
  /** Orientation */
  orientation?: SliderOrientation;
  /** Disable the slider */
  disabled?: boolean;
  /** Show marks at step intervals */
  marks?: boolean | { value: number; label?: string }[];
  /** Show current value tooltip */
  showValue?: boolean;
  /** Format value for display */
  formatValue?: (value: number) => string;
  /** Name for form submission */
  name?: string;
  /** Accessible label */
  'aria-label'?: string;
  /** ID of element that labels this slider */
  'aria-labelledby'?: string;
}

// ============================================================================
// Style Constants
// ============================================================================

const sizeStyles: Record<SliderSize, { track: string; thumb: string; mark: string }> = {
  sm: {
    track: 'h-1',
    thumb: 'h-3.5 w-3.5',
    mark: 'h-1.5 w-1.5',
  },
  md: {
    track: 'h-2',
    thumb: 'h-5 w-5',
    mark: 'h-2 w-2',
  },
  lg: {
    track: 'h-3',
    thumb: 'h-6 w-6',
    mark: 'h-2.5 w-2.5',
  },
};

const variantStyles: Record<SliderVariant, { track: string; fill: string; thumb: string }> = {
  default: {
    track: 'bg-zinc-200 dark:bg-zinc-700',
    fill: 'bg-zinc-900 dark:bg-zinc-50',
    thumb: 'border-zinc-900 dark:border-zinc-50',
  },
  primary: {
    track: 'bg-blue-100 dark:bg-blue-900',
    fill: 'bg-blue-600 dark:bg-blue-400',
    thumb: 'border-blue-600 dark:border-blue-400',
  },
  success: {
    track: 'bg-green-100 dark:bg-green-900',
    fill: 'bg-green-600 dark:bg-green-400',
    thumb: 'border-green-600 dark:border-green-400',
  },
  warning: {
    track: 'bg-yellow-100 dark:bg-yellow-900',
    fill: 'bg-yellow-600 dark:bg-yellow-400',
    thumb: 'border-yellow-600 dark:border-yellow-400',
  },
  danger: {
    track: 'bg-red-100 dark:bg-red-900',
    fill: 'bg-red-600 dark:bg-red-400',
    thumb: 'border-red-600 dark:border-red-400',
  },
};

// ============================================================================
// Helper Functions
// ============================================================================

const clamp = (value: number, min: number, max: number): number => {
  return Math.min(Math.max(value, min), max);
};

const roundToStep = (value: number, step: number, min: number): number => {
  const stepsFromMin = Math.round((value - min) / step);
  return min + stepsFromMin * step;
};

const getPercentage = (value: number, min: number, max: number): number => {
  return ((value - min) / (max - min)) * 100;
};

// ============================================================================
// Slider Component
// ============================================================================

/**
 * Slider - A customizable range input component
 *
 * @example
 * ```tsx
 * <Slider
 *   value={50}
 *   onChange={(value) => console.log(value)}
 *   min={0}
 *   max={100}
 * />
 *
 * // Range slider
 * <Slider
 *   value={[20, 80]}
 *   onChange={(value) => console.log(value)}
 * />
 * ```
 */
export const Slider = React.forwardRef<HTMLDivElement, SliderProps>(
  (
    {
      value: controlledValue,
      defaultValue = 0,
      onChange,
      onChangeEnd,
      min = 0,
      max = 100,
      step = 1,
      size = 'md',
      variant = 'default',
      orientation = 'horizontal',
      disabled = false,
      marks = false,
      showValue = false,
      formatValue = (v) => String(v),
      name,
      className,
      'aria-label': ariaLabel,
      'aria-labelledby': ariaLabelledBy,
      ...props
    },
    ref
  ) => {
    // Normalize to array for internal handling
    const normalizeValue = (v: number | number[]): number[] => {
      return Array.isArray(v) ? v : [v];
    };

    const denormalizeValue = (v: number[]): number | number[] => {
      return isRange ? v : v[0];
    };

    const [internalValue, setInternalValue] = React.useState<number[]>(
      normalizeValue(controlledValue ?? defaultValue)
    );
    const [activeThumb, setActiveThumb] = React.useState<number | null>(null);
    const [hoveredThumb, setHoveredThumb] = React.useState<number | null>(null);
    const trackRef = React.useRef<HTMLDivElement>(null);
    const isDragging = React.useRef(false);

    const isControlled = controlledValue !== undefined;
    const value = isControlled ? normalizeValue(controlledValue) : internalValue;
    const isRange = value.length > 1;
    const isHorizontal = orientation === 'horizontal';

    // Update internal value when controlled value changes
    React.useEffect(() => {
      if (isControlled) {
        setInternalValue(normalizeValue(controlledValue));
      }
    }, [controlledValue, isControlled]);

    // Get value from mouse/touch position
    const getValueFromPosition = React.useCallback(
      (clientX: number, clientY: number): number => {
        if (!trackRef.current) return min;

        const rect = trackRef.current.getBoundingClientRect();
        let percentage: number;

        if (isHorizontal) {
          percentage = (clientX - rect.left) / rect.width;
        } else {
          percentage = 1 - (clientY - rect.top) / rect.height;
        }

        const rawValue = min + percentage * (max - min);
        const steppedValue = roundToStep(rawValue, step, min);
        return clamp(steppedValue, min, max);
      },
      [min, max, step, isHorizontal]
    );

    // Find closest thumb to a value
    const findClosestThumb = React.useCallback(
      (targetValue: number): number => {
        if (!isRange) return 0;

        const distances = value.map((v) => Math.abs(v - targetValue));
        return distances[0] <= distances[1] ? 0 : 1;
      },
      [value, isRange]
    );

    // Update value for a specific thumb
    const updateValue = React.useCallback(
      (thumbIndex: number, newValue: number) => {
        const newValues = [...value];

        // For range slider, prevent thumbs from crossing
        if (isRange) {
          if (thumbIndex === 0) {
            newValue = Math.min(newValue, newValues[1]);
          } else {
            newValue = Math.max(newValue, newValues[0]);
          }
        }

        newValues[thumbIndex] = newValue;

        if (!isControlled) {
          setInternalValue(newValues);
        }
        onChange?.(denormalizeValue(newValues));
      },
      [value, isRange, isControlled, onChange]
    );

    // Mouse event handlers
    const handleTrackMouseDown = (e: React.MouseEvent) => {
      if (disabled) return;

      const newValue = getValueFromPosition(e.clientX, e.clientY);
      const thumbIndex = findClosestThumb(newValue);

      updateValue(thumbIndex, newValue);
      setActiveThumb(thumbIndex);
      isDragging.current = true;

      e.preventDefault();
    };

    // Global mouse move/up handlers
    React.useEffect(() => {
      if (activeThumb === null) return;

      const handleMouseMove = (e: MouseEvent) => {
        if (!isDragging.current || activeThumb === null) return;

        const newValue = getValueFromPosition(e.clientX, e.clientY);
        updateValue(activeThumb, newValue);
      };

      const handleMouseUp = () => {
        if (isDragging.current) {
          isDragging.current = false;
          onChangeEnd?.(denormalizeValue(value));
        }
        setActiveThumb(null);
      };

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);

      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }, [activeThumb, getValueFromPosition, updateValue, onChangeEnd, value]);

    // Keyboard handlers
    const handleThumbKeyDown = (thumbIndex: number, e: React.KeyboardEvent) => {
      if (disabled) return;

      let newValue = value[thumbIndex];
      const largeStep = step * 10;

      switch (e.key) {
        case 'ArrowRight':
        case 'ArrowUp':
          newValue = clamp(newValue + step, min, max);
          break;
        case 'ArrowLeft':
        case 'ArrowDown':
          newValue = clamp(newValue - step, min, max);
          break;
        case 'PageUp':
          newValue = clamp(newValue + largeStep, min, max);
          break;
        case 'PageDown':
          newValue = clamp(newValue - largeStep, min, max);
          break;
        case 'Home':
          newValue = min;
          break;
        case 'End':
          newValue = max;
          break;
        default:
          return;
      }

      e.preventDefault();
      updateValue(thumbIndex, newValue);
    };

    // Generate marks
    const renderMarks = () => {
      if (!marks) return null;

      let markValues: { value: number; label?: string }[];

      if (Array.isArray(marks)) {
        markValues = marks;
      } else {
        markValues = [];
        for (let v = min; v <= max; v += step) {
          markValues.push({ value: v });
        }
      }

      return (
        <div className="absolute inset-0" data-testid="slider-marks">
          {markValues.map((mark) => {
            const percentage = getPercentage(mark.value, min, max);
            const style = isHorizontal
              ? { left: `${percentage}%` }
              : { bottom: `${percentage}%` };

            return (
              <div
                key={mark.value}
                className={cn(
                  'absolute transform',
                  isHorizontal ? '-translate-x-1/2 top-1/2 -translate-y-1/2' : '-translate-y-1/2 left-1/2 -translate-x-1/2',
                  'rounded-full bg-zinc-400 dark:bg-zinc-500',
                  sizeStyles[size].mark
                )}
                style={style}
              />
            );
          })}
        </div>
      );
    };

    // Render thumb
    const renderThumb = (thumbIndex: number) => {
      const thumbValue = value[thumbIndex];
      const percentage = getPercentage(thumbValue, min, max);
      const isActive = activeThumb === thumbIndex;
      const isHovered = hoveredThumb === thumbIndex;

      const style = isHorizontal
        ? { left: `${percentage}%` }
        : { bottom: `${percentage}%` };

      return (
        <div
          key={thumbIndex}
          role="slider"
          tabIndex={disabled ? -1 : 0}
          aria-valuenow={thumbValue}
          aria-valuemin={min}
          aria-valuemax={max}
          aria-disabled={disabled}
          aria-label={ariaLabel}
          aria-labelledby={ariaLabelledBy}
          aria-orientation={orientation}
          data-testid={`slider-thumb${isRange ? `-${thumbIndex}` : ''}`}
          data-state={isActive ? 'active' : 'idle'}
          data-disabled={disabled ? '' : undefined}
          className={cn(
            'absolute transform',
            isHorizontal ? '-translate-x-1/2 -translate-y-1/2 top-1/2' : '-translate-x-1/2 -translate-y-1/2 left-1/2',
            'rounded-full bg-white border-2 shadow-md',
            'transition-transform duration-75',
            'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500',
            variantStyles[variant].thumb,
            sizeStyles[size].thumb,
            (isActive || isHovered) && 'scale-110',
            disabled && 'opacity-50 cursor-not-allowed'
          )}
          style={style}
          onKeyDown={(e) => handleThumbKeyDown(thumbIndex, e)}
          onMouseEnter={() => setHoveredThumb(thumbIndex)}
          onMouseLeave={() => setHoveredThumb(null)}
        >
          {showValue && (isActive || isHovered) && (
            <div
              className={cn(
                'absolute whitespace-nowrap text-xs font-medium',
                'bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900',
                'px-2 py-1 rounded shadow-lg',
                isHorizontal ? '-top-8 left-1/2 -translate-x-1/2' : 'left-full ml-2 top-1/2 -translate-y-1/2'
              )}
              data-testid="slider-value"
            >
              {formatValue(thumbValue)}
            </div>
          )}
        </div>
      );
    };

    // Calculate fill position and size
    const getFillStyle = () => {
      if (isRange) {
        const startPercent = getPercentage(value[0], min, max);
        const endPercent = getPercentage(value[1], min, max);

        return isHorizontal
          ? { left: `${startPercent}%`, width: `${endPercent - startPercent}%` }
          : { bottom: `${startPercent}%`, height: `${endPercent - startPercent}%` };
      }

      const percentage = getPercentage(value[0], min, max);
      return isHorizontal
        ? { left: 0, width: `${percentage}%` }
        : { bottom: 0, height: `${percentage}%` };
    };

    return (
      <div
        ref={ref}
        data-testid="slider"
        data-disabled={disabled ? '' : undefined}
        data-orientation={orientation}
        className={cn(
          'relative flex items-center',
          isHorizontal ? 'w-full h-5' : 'h-full w-5 flex-col',
          disabled && 'opacity-50 pointer-events-none',
          className
        )}
        {...props}
      >
        {/* Hidden inputs for form submission */}
        {name && value.map((v, i) => (
          <input
            key={i}
            type="hidden"
            name={isRange ? `${name}[${i}]` : name}
            value={v}
          />
        ))}

        {/* Track */}
        <div
          ref={trackRef}
          data-testid="slider-track"
          className={cn(
            'relative rounded-full cursor-pointer',
            isHorizontal ? 'w-full' : 'h-full',
            variantStyles[variant].track,
            sizeStyles[size].track
          )}
          onMouseDown={handleTrackMouseDown}
        >
          {/* Fill */}
          <div
            data-testid="slider-fill"
            className={cn(
              'absolute rounded-full',
              isHorizontal ? 'h-full' : 'w-full',
              variantStyles[variant].fill
            )}
            style={getFillStyle()}
          />

          {/* Marks */}
          {renderMarks()}

          {/* Thumbs */}
          {value.map((_, index) => renderThumb(index))}
        </div>
      </div>
    );
  }
);

Slider.displayName = 'Slider';

// ============================================================================
// SimpleSlider Component
// ============================================================================

export interface SimpleSliderProps extends Omit<SliderProps, 'marks'> {
  /** Label for the slider */
  label?: string;
  /** Show min/max labels */
  showMinMax?: boolean;
  /** Custom min label */
  minLabel?: string;
  /** Custom max label */
  maxLabel?: string;
}

/**
 * SimpleSlider - A slider with built-in label and value display
 *
 * @example
 * ```tsx
 * <SimpleSlider
 *   label="Volume"
 *   value={50}
 *   onChange={(value) => console.log(value)}
 *   showMinMax
 * />
 * ```
 */
export function SimpleSlider({
  label,
  showMinMax = false,
  minLabel,
  maxLabel,
  min = 0,
  max = 100,
  formatValue = (v) => String(v),
  value,
  defaultValue = 0,
  className,
  ...props
}: SimpleSliderProps) {
  const [internalValue, setInternalValue] = React.useState<number | number[]>(
    value ?? defaultValue
  );

  React.useEffect(() => {
    if (value !== undefined) {
      setInternalValue(value);
    }
  }, [value]);

  const handleChange = (newValue: number | number[]) => {
    setInternalValue(newValue);
    props.onChange?.(newValue);
  };

  const displayValue = Array.isArray(internalValue)
    ? `${formatValue(internalValue[0])} - ${formatValue(internalValue[1])}`
    : formatValue(internalValue);

  return (
    <div className={cn('w-full space-y-2', className)} data-testid="simple-slider">
      {label && (
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            {label}
          </label>
          <span className="text-sm text-zinc-500 dark:text-zinc-400" data-testid="simple-slider-value">
            {displayValue}
          </span>
        </div>
      )}

      <div className="flex items-center gap-3">
        {showMinMax && (
          <span className="text-xs text-zinc-500 dark:text-zinc-400 min-w-[2rem] text-right">
            {minLabel ?? formatValue(min)}
          </span>
        )}

        <Slider
          {...props}
          value={internalValue}
          defaultValue={defaultValue}
          onChange={handleChange}
          min={min}
          max={max}
          formatValue={formatValue}
          className="flex-1"
        />

        {showMinMax && (
          <span className="text-xs text-zinc-500 dark:text-zinc-400 min-w-[2rem]">
            {maxLabel ?? formatValue(max)}
          </span>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Exports
// ============================================================================

export { getPercentage, clamp, roundToStep };
