'use client';

import { cn } from '@/lib/utils/cn';

interface ProgressRingProps {
  /** Progress value from 0 to 100 */
  progress: number;
  /** Size of the ring in pixels */
  size?: number;
  /** Width of the stroke in pixels */
  strokeWidth?: number;
  /** Color of the progress ring (CSS color value) */
  color?: string;
  /** Whether to show the percentage text in the center */
  showLabel?: boolean;
  /** Custom label to show instead of percentage */
  customLabel?: string;
  /** Additional CSS classes for the container */
  className?: string;
  /** CSS classes for the label */
  labelClassName?: string;
  /** Background track color */
  trackColor?: string;
  /** Animation duration in milliseconds */
  animationDuration?: number;
}

/**
 * ProgressRing - A circular progress indicator component
 *
 * @example
 * // Basic usage
 * <ProgressRing progress={75} />
 *
 * @example
 * // Custom size and color
 * <ProgressRing progress={50} size={120} color="#10B981" />
 *
 * @example
 * // With custom label
 * <ProgressRing progress={80} customLabel="4/5" />
 */
export function ProgressRing({
  progress,
  size = 80,
  strokeWidth = 6,
  color = '#8B5CF6',
  showLabel = true,
  customLabel,
  className,
  labelClassName,
  trackColor,
  animationDuration = 500,
}: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const clampedProgress = Math.min(Math.max(progress, 0), 100);
  const offset = circumference - (clampedProgress / 100) * circumference;

  const displayLabel = customLabel ?? `${Math.round(clampedProgress)}%`;

  return (
    <div
      className={cn('relative inline-flex items-center justify-center', className)}
      style={{ width: size, height: size }}
      role="progressbar"
      aria-valuenow={clampedProgress}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={`Progress: ${Math.round(clampedProgress)}%`}
    >
      <svg className="transform -rotate-90" width={size} height={size}>
        {/* Background track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={trackColor || 'currentColor'}
          strokeWidth={strokeWidth}
          className={trackColor ? '' : 'text-surface-3'}
        />
        {/* Progress arc */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{
            transition: `stroke-dashoffset ${animationDuration}ms ease-out`,
          }}
        />
      </svg>
      {/* Center label */}
      {showLabel && (
        <span
          className={cn('absolute text-lg font-bold text-white', labelClassName)}
          style={{
            fontSize: size * 0.2,
          }}
        >
          {displayLabel}
        </span>
      )}
    </div>
  );
}

// Named export for tree-shaking
export default ProgressRing;

