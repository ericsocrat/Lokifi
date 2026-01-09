'use client';

import { cn } from '@/lib/utils';
import * as React from 'react';
import { forwardRef } from 'react';

// ============================================================================
// Types
// ============================================================================

export type BadgeVariant =
  | 'default'
  | 'primary'
  | 'secondary'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'outline';

export type BadgeSize = 'xs' | 'sm' | 'md' | 'lg';

// ============================================================================
// Style Mappings
// ============================================================================

const variantClasses: Record<BadgeVariant, string> = {
  default: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
  primary: 'bg-lokifi-100 text-lokifi-800 dark:bg-lokifi-900 dark:text-lokifi-200',
  secondary: 'bg-electric-100 text-electric-800 dark:bg-electric-900 dark:text-electric-200',
  success: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  warning: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  danger: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  info: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  outline: 'border border-current bg-transparent',
};

const sizeClasses: Record<BadgeSize, string> = {
  xs: 'px-1.5 py-0.5 text-xs',
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-0.5 text-sm',
  lg: 'px-3 py-1 text-sm',
};

// ============================================================================
// Badge
// ============================================================================

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Visual variant of the badge */
  variant?: BadgeVariant;
  /** Size of the badge */
  size?: BadgeSize;
  /** Icon to display before text */
  icon?: React.ReactNode;
  /** Icon to display after text */
  endIcon?: React.ReactNode;
  /** Whether the badge should have rounded-full corners */
  pill?: boolean;
  /** Whether to show a dot indicator */
  dot?: boolean;
  /** Color of the dot indicator */
  dotColor?: 'green' | 'yellow' | 'red' | 'blue' | 'gray';
  /** Whether the badge is removable */
  removable?: boolean;
  /** Callback when remove button is clicked */
  onRemove?: () => void;
  /** Whether the badge is interactive (clickable) */
  interactive?: boolean;
}

const dotColorClasses: Record<string, string> = {
  green: 'bg-green-500',
  yellow: 'bg-yellow-500',
  red: 'bg-red-500',
  blue: 'bg-blue-500',
  gray: 'bg-gray-500',
};

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  (
    {
      className,
      children,
      variant = 'default',
      size = 'md',
      icon,
      endIcon,
      pill = false,
      dot = false,
      dotColor = 'gray',
      removable = false,
      onRemove,
      interactive = false,
      onClick,
      ...props
    },
    ref
  ) => {
    const baseClasses = [
      'inline-flex items-center gap-1 font-medium',
      pill ? 'rounded-full' : 'rounded-md',
      interactive && 'cursor-pointer hover:opacity-80 transition-opacity',
    ]
      .filter(Boolean)
      .join(' ');

    const handleRemove = (e: React.MouseEvent) => {
      e.stopPropagation();
      onRemove?.();
    };

    const handleClick = (e: React.MouseEvent<HTMLSpanElement>) => {
      if (interactive || onClick) {
        onClick?.(e);
      }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLSpanElement>) => {
      if ((e.key === 'Enter' || e.key === ' ') && (interactive || onClick)) {
        e.preventDefault();
        onClick?.(e as unknown as React.MouseEvent<HTMLSpanElement>);
      }
    };

    return (
      <span
        ref={ref}
        className={cn(baseClasses, variantClasses[variant], sizeClasses[size], className)}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        role={interactive ? 'button' : undefined}
        tabIndex={interactive ? 0 : undefined}
        data-badge=""
        data-variant={variant}
        data-size={size}
        {...props}
      >
        {dot && (
          <span
            className={cn('h-1.5 w-1.5 rounded-full', dotColorClasses[dotColor])}
            data-badge-dot=""
            aria-hidden="true"
          />
        )}
        {icon && (
          <span className="shrink-0" data-badge-icon="">
            {icon}
          </span>
        )}
        {children}
        {endIcon && (
          <span className="shrink-0" data-badge-end-icon="">
            {endIcon}
          </span>
        )}
        {removable && (
          <button
            type="button"
            className="ml-1 shrink-0 hover:opacity-70 focus:outline-none"
            onClick={handleRemove}
            aria-label="Remove"
            data-badge-remove=""
          >
            <svg
              className="h-3 w-3"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </span>
    );
  }
);

Badge.displayName = 'Badge';

// ============================================================================
// BadgeGroup
// ============================================================================

export interface BadgeGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Maximum badges to show */
  max?: number;
  /** Size for all badges in the group */
  size?: BadgeSize;
  /** Variant for all badges */
  variant?: BadgeVariant;
  /** Gap between badges */
  gap?: 'xs' | 'sm' | 'md';
  /** Whether badges should wrap */
  wrap?: boolean;
}

const gapClasses: Record<string, string> = {
  xs: 'gap-1',
  sm: 'gap-1.5',
  md: 'gap-2',
};

export const BadgeGroup = forwardRef<HTMLDivElement, BadgeGroupProps>(
  (
    {
      children,
      className,
      max,
      size = 'md',
      variant = 'default',
      gap = 'sm',
      wrap = true,
      ...props
    },
    ref
  ) => {
    const childArray = React.Children.toArray(children);
    const visibleChildren = max ? childArray.slice(0, max) : childArray;
    const hiddenCount = max ? Math.max(0, childArray.length - max) : 0;

    // Clone children to apply size and variant
    const enhancedChildren = visibleChildren.map((child, index) => {
      if (React.isValidElement<BadgeProps>(child) && child.type === Badge) {
        return React.cloneElement(child, {
          key: child.key ?? index,
          size: child.props.size ?? size,
          variant: child.props.variant ?? variant,
        });
      }
      return child;
    });

    const baseClasses = ['inline-flex items-center', gapClasses[gap], wrap && 'flex-wrap']
      .filter(Boolean)
      .join(' ');

    return (
      <div
        ref={ref}
        className={cn(baseClasses, className)}
        role="group"
        aria-label={`Group of ${childArray.length} badges`}
        data-badge-group=""
        {...props}
      >
        {enhancedChildren}
        {hiddenCount > 0 && (
          <Badge variant={variant} size={size} data-badge-overflow="">
            +{hiddenCount}
          </Badge>
        )}
      </div>
    );
  }
);

BadgeGroup.displayName = 'BadgeGroup';

// ============================================================================
// StatusBadge - Specialized badge for status indicators
// ============================================================================

export type StatusType = 'online' | 'offline' | 'busy' | 'away' | 'pending' | 'active' | 'inactive';

export interface StatusBadgeProps extends Omit<BadgeProps, 'variant' | 'dot' | 'dotColor'> {
  /** The status to display */
  status: StatusType;
  /** Show the status text */
  showText?: boolean;
}

const statusConfig: Record<StatusType, { color: string; dotColor: string; text: string }> = {
  online: { color: 'success', dotColor: 'green', text: 'Online' },
  offline: { color: 'default', dotColor: 'gray', text: 'Offline' },
  busy: { color: 'danger', dotColor: 'red', text: 'Busy' },
  away: { color: 'warning', dotColor: 'yellow', text: 'Away' },
  pending: { color: 'warning', dotColor: 'yellow', text: 'Pending' },
  active: { color: 'success', dotColor: 'green', text: 'Active' },
  inactive: { color: 'default', dotColor: 'gray', text: 'Inactive' },
};

export const StatusBadge = forwardRef<HTMLSpanElement, StatusBadgeProps>(
  ({ status, showText = true, children, ...props }, ref) => {
    const config = statusConfig[status];

    return (
      <Badge
        ref={ref}
        variant={config.color as BadgeVariant}
        dot
        dotColor={config.dotColor as 'green' | 'yellow' | 'red' | 'blue' | 'gray'}
        data-status-badge=""
        data-status={status}
        {...props}
      >
        {children ?? (showText && config.text)}
      </Badge>
    );
  }
);

StatusBadge.displayName = 'StatusBadge';

// ============================================================================
// CountBadge - Specialized badge for counts/numbers
// ============================================================================

export interface CountBadgeProps extends Omit<BadgeProps, 'children'> {
  /** The count to display */
  count: number;
  /** Maximum count to display (shows "99+" for > 99) */
  max?: number;
  /** Show zero count */
  showZero?: boolean;
  /** Offset position when used as overlay */
  offset?: { x?: number; y?: number };
}

export const CountBadge = forwardRef<HTMLSpanElement, CountBadgeProps>(
  ({ count, max = 99, showZero = false, offset: _offset, pill = true, size = 'xs', ...props }, ref) => {
    // Don't render if count is zero and showZero is false
    if (count === 0 && !showZero) {
      return null;
    }

    const displayCount = count > max ? `${max}+` : count.toString();

    return (
      <Badge ref={ref} pill={pill} size={size} data-count-badge="" {...props}>
        {displayCount}
      </Badge>
    );
  }
);

CountBadge.displayName = 'CountBadge';

// ============================================================================
// PriorityBadge - For priority indicators
// ============================================================================

export type PriorityLevel = 'critical' | 'high' | 'medium' | 'low' | 'none';

export interface PriorityBadgeProps extends Omit<BadgeProps, 'variant'> {
  /** The priority level */
  priority: PriorityLevel;
  /** Show priority text */
  showText?: boolean;
}

const priorityConfig: Record<
  PriorityLevel,
  { variant: BadgeVariant; icon: React.ReactNode; text: string }
> = {
  critical: {
    variant: 'danger',
    icon: (
      <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
        <path
          fillRule="evenodd"
          d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
          clipRule="evenodd"
        />
      </svg>
    ),
    text: 'Critical',
  },
  high: {
    variant: 'warning',
    icon: (
      <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
        <path
          fillRule="evenodd"
          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.707l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414L9 9.414V13a1 1 0 102 0V9.414l1.293 1.293a1 1 0 001.414-1.414z"
          clipRule="evenodd"
        />
      </svg>
    ),
    text: 'High',
  },
  medium: {
    variant: 'info',
    icon: (
      <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
        <path
          fillRule="evenodd"
          d="M10 18a8 8 0 100-16 8 8 0 000 16zM7 9a1 1 0 000 2h6a1 1 0 100-2H7z"
          clipRule="evenodd"
        />
      </svg>
    ),
    text: 'Medium',
  },
  low: {
    variant: 'success',
    icon: (
      <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
        <path
          fillRule="evenodd"
          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.707l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414L9 9.414V13a1 1 0 102 0V9.414l1.293 1.293a1 1 0 001.414-1.414z"
          clipRule="evenodd"
          transform="rotate(180 10 10)"
        />
      </svg>
    ),
    text: 'Low',
  },
  none: {
    variant: 'default',
    icon: null,
    text: 'None',
  },
};

export const PriorityBadge = forwardRef<HTMLSpanElement, PriorityBadgeProps>(
  ({ priority, showText = true, children, ...props }, ref) => {
    const config = priorityConfig[priority];

    return (
      <Badge
        ref={ref}
        variant={config.variant}
        icon={config.icon}
        data-priority-badge=""
        data-priority={priority}
        {...props}
      >
        {children ?? (showText && config.text)}
      </Badge>
    );
  }
);

PriorityBadge.displayName = 'PriorityBadge';


