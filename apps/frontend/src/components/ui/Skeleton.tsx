'use client';

import { cn } from '@/lib/utils';
import { forwardRef } from 'react';

export interface SkeletonProps {
  /** Width of the skeleton (CSS value or preset) */
  width?: string | number;
  /** Height of the skeleton (CSS value or preset) */
  height?: string | number;
  /** Whether to animate the skeleton */
  animate?: boolean;
  /** Animation variant */
  animation?: 'pulse' | 'shimmer' | 'none';
  /** Border radius variant */
  variant?: 'rectangular' | 'circular' | 'rounded' | 'text';
  /** Number of text lines to render (only for variant="text") */
  lines?: number;
  /** Additional className */
  className?: string;
  /** Test ID for testing */
  'data-testid'?: string;
}

const variantClasses = {
  rectangular: 'rounded-none',
  circular: 'rounded-full',
  rounded: 'rounded-lg',
  text: 'rounded',
};

const animationClasses = {
  pulse: 'animate-pulse',
  shimmer: 'relative overflow-hidden',
  none: '',
};

/**
 * Skeleton loading placeholder component.
 * Used to indicate loading states for content.
 *
 * @example
 * // Basic usage
 * <Skeleton width={200} height={20} />
 *
 * @example
 * // Circular avatar placeholder
 * <Skeleton variant="circular" width={40} height={40} />
 *
 * @example
 * // Text placeholder with multiple lines
 * <Skeleton variant="text" lines={3} />
 *
 * @example
 * // Card skeleton
 * <div className="space-y-2">
 *   <Skeleton variant="rounded" height={200} />
 *   <Skeleton variant="text" width="60%" />
 *   <Skeleton variant="text" width="80%" />
 * </div>
 */
export const Skeleton = forwardRef<HTMLDivElement, SkeletonProps>(
  (
    {
      width,
      height,
      animate = true,
      animation = 'pulse',
      variant = 'rectangular',
      lines = 1,
      className,
      'data-testid': testId,
    },
    ref
  ) => {
    const baseClass = cn(
      'bg-surface-200/50',
      variantClasses[variant],
      animate ? animationClasses[animation] : '',
      className
    );

    const style: React.CSSProperties = {
      width: typeof width === 'number' ? `${width}px` : width,
      height: typeof height === 'number' ? `${height}px` : height,
    };

    // Shimmer overlay for shimmer animation
    const shimmerOverlay =
      animate && animation === 'shimmer' ? (
        <div
          className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent animate-[shimmer_2s_infinite]"
          aria-hidden="true"
        />
      ) : null;

    // For text variant with multiple lines
    if (variant === 'text' && lines > 1) {
      return (
        <div
          ref={ref}
          className="space-y-2"
          data-testid={testId}
          role="status"
          aria-label="Loading"
          aria-busy="true"
        >
          {Array.from({ length: lines }).map((_, index) => {
            // Last line is typically shorter
            const lineWidth = index === lines - 1 ? '60%' : index === lines - 2 ? '80%' : '100%';
            return (
              <div
                key={index}
                className={baseClass}
                style={{
                  ...style,
                  width: width || lineWidth,
                  height: height || '1em',
                }}
                data-testid={testId ? `${testId}-line-${index}` : undefined}
              >
                {shimmerOverlay}
              </div>
            );
          })}
        </div>
      );
    }

    // Default text height
    const defaultHeight = variant === 'text' ? '1em' : undefined;
    // Default circular dimensions (square)
    const circularSize = variant === 'circular' ? width || height || 40 : undefined;

    return (
      <div
        ref={ref}
        className={baseClass}
        style={{
          ...style,
          width: circularSize
            ? typeof circularSize === 'number'
              ? `${circularSize}px`
              : circularSize
            : style.width,
          height: circularSize
            ? typeof circularSize === 'number'
              ? `${circularSize}px`
              : circularSize
            : style.height || defaultHeight,
        }}
        data-testid={testId}
        role="status"
        aria-label="Loading"
        aria-busy="true"
      >
        {shimmerOverlay}
      </div>
    );
  }
);

Skeleton.displayName = 'Skeleton';

// Preset skeleton components for common use cases
export type SkeletonTextProps = Omit<SkeletonProps, 'variant'>;

export const SkeletonText = forwardRef<HTMLDivElement, SkeletonTextProps>((props, ref) => (
  <Skeleton ref={ref} variant="text" {...props} />
));
SkeletonText.displayName = 'SkeletonText';

export interface SkeletonCircleProps extends Omit<SkeletonProps, 'variant'> {
  /** Size of the circle (width and height) */
  size?: number | string;
}

export const SkeletonCircle = forwardRef<HTMLDivElement, SkeletonCircleProps>(
  ({ size, ...props }, ref) => (
    <Skeleton ref={ref} variant="circular" width={size} height={size} {...props} />
  )
);
SkeletonCircle.displayName = 'SkeletonCircle';

export interface SkeletonCardProps {
  /** Show image placeholder at top */
  showImage?: boolean;
  /** Number of text lines */
  lines?: number;
  /** Additional className */
  className?: string;
  /** Test ID */
  'data-testid'?: string;
}

/**
 * Pre-built card skeleton for loading states
 */
export const SkeletonCard = forwardRef<HTMLDivElement, SkeletonCardProps>(
  ({ showImage = true, lines = 3, className, 'data-testid': testId }, ref) => (
    <div
      ref={ref}
      className={cn('space-y-3 p-4 rounded-xl bg-surface-100/50', className)}
      data-testid={testId}
      role="status"
      aria-label="Loading card"
      aria-busy="true"
    >
      {showImage && <Skeleton variant="rounded" height={150} />}
      <Skeleton variant="text" width="60%" height={24} />
      <Skeleton variant="text" lines={lines} />
    </div>
  )
);
SkeletonCard.displayName = 'SkeletonCard';

export interface SkeletonAvatarGroupProps {
  /** Number of avatars to show */
  count?: number;
  /** Size of each avatar */
  size?: number;
  /** Additional className */
  className?: string;
  /** Test ID */
  'data-testid'?: string;
}

/**
 * Pre-built avatar group skeleton for loading states
 */
export const SkeletonAvatarGroup = forwardRef<HTMLDivElement, SkeletonAvatarGroupProps>(
  ({ count = 3, size = 40, className, 'data-testid': testId }, ref) => (
    <div
      ref={ref}
      className={cn('flex -space-x-2', className)}
      data-testid={testId}
      role="status"
      aria-label="Loading avatars"
      aria-busy="true"
    >
      {Array.from({ length: count }).map((_, index) => (
        <SkeletonCircle
          key={index}
          size={size}
          className="border-2 border-surface-0"
          data-testid={testId ? `${testId}-avatar-${index}` : undefined}
        />
      ))}
    </div>
  )
);
SkeletonAvatarGroup.displayName = 'SkeletonAvatarGroup';

export interface SkeletonTableProps {
  /** Number of rows */
  rows?: number;
  /** Number of columns */
  columns?: number;
  /** Show header row */
  showHeader?: boolean;
  /** Additional className */
  className?: string;
  /** Test ID */
  'data-testid'?: string;
}

/**
 * Pre-built table skeleton for loading states
 */
export const SkeletonTable = forwardRef<HTMLDivElement, SkeletonTableProps>(
  ({ rows = 5, columns = 4, showHeader = true, className, 'data-testid': testId }, ref) => (
    <div
      ref={ref}
      className={cn('space-y-2', className)}
      data-testid={testId}
      role="status"
      aria-label="Loading table"
      aria-busy="true"
    >
      {showHeader && (
        <div className="flex gap-4 p-3 bg-surface-200/50 rounded-lg">
          {Array.from({ length: columns }).map((_, i) => (
            <Skeleton
              key={i}
              variant="text"
              height={20}
              className="flex-1"
              data-testid={testId ? `${testId}-header-${i}` : undefined}
            />
          ))}
        </div>
      )}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div
          key={rowIndex}
          className="flex gap-4 p-3"
          data-testid={testId ? `${testId}-row-${rowIndex}` : undefined}
        >
          {Array.from({ length: columns }).map((_, colIndex) => (
            <Skeleton
              key={colIndex}
              variant="text"
              height={16}
              className="flex-1"
              data-testid={testId ? `${testId}-cell-${rowIndex}-${colIndex}` : undefined}
            />
          ))}
        </div>
      ))}
    </div>
  )
);
SkeletonTable.displayName = 'SkeletonTable';

export default Skeleton;

