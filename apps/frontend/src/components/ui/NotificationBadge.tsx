'use client';

import { cn } from '@/lib/utils/cn';

interface NotificationBadgeProps {
  /** Number of notifications to display */
  count: number;
  /** Maximum number to display before showing "99+" */
  max?: number;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Color variant */
  variant?: 'default' | 'success' | 'warning' | 'error';
  /** Whether to show the badge when count is 0 */
  showZero?: boolean;
  /** Whether to show as a dot instead of a number */
  dot?: boolean;
  /** Whether to pulse/animate */
  pulse?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Position relative to parent (when used as overlay) */
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  /** Children to wrap with the badge */
  children?: React.ReactNode;
}

/**
 * NotificationBadge - A badge component for showing notification counts
 *
 * @example
 * // Basic usage
 * <NotificationBadge count={5} />
 *
 * @example
 * // As overlay on icon
 * <NotificationBadge count={3} position="top-right">
 *   <BellIcon />
 * </NotificationBadge>
 *
 * @example
 * // Dot indicator
 * <NotificationBadge dot pulse>
 *   <MessageIcon />
 * </NotificationBadge>
 */
export function NotificationBadge({
  count,
  max = 99,
  size = 'md',
  variant = 'default',
  showZero = false,
  dot = false,
  pulse = false,
  className,
  position = 'top-right',
  children,
}: NotificationBadgeProps) {
  const shouldShow = count > 0 || showZero || dot;

  if (!shouldShow && !children) return null;

  const displayCount = count > max ? `${max}+` : count.toString();

  const sizeClasses = {
    sm: dot ? 'w-2 h-2' : 'min-w-4 h-4 text-[10px] px-1',
    md: dot ? 'w-2.5 h-2.5' : 'min-w-5 h-5 text-xs px-1.5',
    lg: dot ? 'w-3 h-3' : 'min-w-6 h-6 text-sm px-2',
  };

  const variantClasses = {
    default: 'bg-lokifi-500 text-white',
    success: 'bg-emerald-500 text-white',
    warning: 'bg-amber-500 text-white',
    error: 'bg-rose-500 text-white',
  };

  const positionClasses = {
    'top-right': '-top-1 -right-1',
    'top-left': '-top-1 -left-1',
    'bottom-right': '-bottom-1 -right-1',
    'bottom-left': '-bottom-1 -left-1',
  };

  const badge = (
    <span
      className={cn(
        'inline-flex items-center justify-center font-semibold rounded-full',
        sizeClasses[size],
        variantClasses[variant],
        pulse && 'animate-pulse',
        className
      )}
      role="status"
      aria-label={dot ? 'New notifications' : `${count} notifications`}
    >
      {!dot && displayCount}
    </span>
  );

  // If no children, just return the badge
  if (!children) return badge;

  // Wrap children with positioned badge
  return (
    <div className="relative inline-flex">
      {children}
      {shouldShow && <span className={cn('absolute', positionClasses[position])}>{badge}</span>}
    </div>
  );
}

// Standalone badge without wrapper for inline usage
export function Badge({
  children,
  variant = 'default',
  size = 'md',
  className,
}: {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'error' | 'secondary';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const sizeClasses = {
    sm: 'text-[10px] px-1.5 py-0.5',
    md: 'text-xs px-2 py-0.5',
    lg: 'text-sm px-2.5 py-1',
  };

  const variantClasses = {
    default: 'bg-lokifi-500/20 text-lokifi-400',
    success: 'bg-emerald-500/20 text-emerald-400',
    warning: 'bg-amber-500/20 text-amber-400',
    error: 'bg-rose-500/20 text-rose-400',
    secondary: 'bg-surface-3 text-surface-11',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full font-medium',
        sizeClasses[size],
        variantClasses[variant],
        className
      )}
    >
      {children}
    </span>
  );
}

export default NotificationBadge;

