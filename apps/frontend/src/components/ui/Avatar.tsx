'use client';

import * as React from 'react';
import { forwardRef, useEffect, useMemo, useState } from 'react';

// ============================================================================
// Types
// ============================================================================

type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
type AvatarVariant = 'circle' | 'rounded' | 'square';
type AvatarStatus = 'online' | 'offline' | 'away' | 'busy' | 'none';

interface AvatarContextValue {
  imageLoaded: boolean;
  imageError: boolean;
}

// ============================================================================
// Context
// ============================================================================

const AvatarContext = React.createContext<AvatarContextValue | null>(null);

function useAvatarContext() {
  const context = React.useContext(AvatarContext);
  if (!context) {
    throw new Error('Avatar components must be used within an Avatar');
  }
  return context;
}

// ============================================================================
// Utility Functions
// ============================================================================

function getInitials(name: string, maxLength = 2): string {
  if (!name) return '';

  const words = name.trim().split(/\s+/);
  if (words.length === 1) {
    return words[0].substring(0, maxLength).toUpperCase();
  }

  return words
    .slice(0, maxLength)
    .map((word) => word[0])
    .join('')
    .toUpperCase();
}

function stringToColor(str: string): string {
  // Generate a consistent color from a string
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }

  // List of pleasant colors for avatars
  const colors = [
    '#3B82F6', // blue
    '#8B5CF6', // purple
    '#EC4899', // pink
    '#EF4444', // red
    '#F97316', // orange
    '#F59E0B', // amber
    '#10B981', // emerald
    '#14B8A6', // teal
    '#06B6D4', // cyan
    '#6366F1', // indigo
  ];

  return colors[Math.abs(hash) % colors.length];
}

// ============================================================================
// Size Configuration
// ============================================================================

const sizeClasses: Record<AvatarSize, { container: string; text: string; status: string }> = {
  xs: {
    container: 'h-6 w-6',
    text: 'text-xs',
    status: 'h-1.5 w-1.5 border',
  },
  sm: {
    container: 'h-8 w-8',
    text: 'text-sm',
    status: 'h-2 w-2 border',
  },
  md: {
    container: 'h-10 w-10',
    text: 'text-base',
    status: 'h-2.5 w-2.5 border-2',
  },
  lg: {
    container: 'h-12 w-12',
    text: 'text-lg',
    status: 'h-3 w-3 border-2',
  },
  xl: {
    container: 'h-16 w-16',
    text: 'text-xl',
    status: 'h-4 w-4 border-2',
  },
  '2xl': {
    container: 'h-20 w-20',
    text: 'text-2xl',
    status: 'h-5 w-5 border-2',
  },
};

const variantClasses: Record<AvatarVariant, string> = {
  circle: 'rounded-full',
  rounded: 'rounded-lg',
  square: 'rounded-none',
};

const statusColors: Record<Exclude<AvatarStatus, 'none'>, string> = {
  online: 'bg-green-500',
  offline: 'bg-gray-400',
  away: 'bg-yellow-500',
  busy: 'bg-red-500',
};

// ============================================================================
// Avatar (Root)
// ============================================================================

export interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Size of the avatar */
  size?: AvatarSize;
  /** Shape variant */
  variant?: AvatarVariant;
  /** Online status indicator */
  status?: AvatarStatus;
  /** Custom status position */
  statusPosition?: 'top-right' | 'bottom-right' | 'top-left' | 'bottom-left';
}

export const Avatar = forwardRef<HTMLDivElement, AvatarProps>(
  (
    {
      children,
      className,
      size = 'md',
      variant = 'circle',
      status = 'none',
      statusPosition = 'bottom-right',
      ...props
    },
    ref
  ) => {
    const [imageLoaded, setImageLoaded] = useState(false);
    const [imageError, setImageError] = useState(false);

    const contextValue = useMemo<AvatarContextValue>(
      () => ({
        imageLoaded,
        imageError,
      }),
      [imageLoaded, imageError]
    );

    // Clone children to inject state setters
    const enhancedChildren = React.Children.map(children, (child) => {
      if (React.isValidElement(child) && child.type === AvatarImage) {
        return React.cloneElement(
          child as React.ReactElement<
            AvatarImageProps & { _onLoad: () => void; _onError: () => void }
          >,
          {
            _onLoad: () => setImageLoaded(true),
            _onError: () => setImageError(true),
          }
        );
      }
      return child;
    });

    const sizeConfig = sizeClasses[size];
    const variantClass = variantClasses[variant];

    const statusPositionClasses: Record<string, string> = {
      'top-right': 'top-0 right-0',
      'bottom-right': 'bottom-0 right-0',
      'top-left': 'top-0 left-0',
      'bottom-left': 'bottom-0 left-0',
    };

    const baseClasses = [
      'relative inline-flex items-center justify-center',
      'bg-gray-200 dark:bg-gray-700',
      'overflow-hidden',
      'shrink-0',
      sizeConfig.container,
      variantClass,
    ].join(' ');

    return (
      <AvatarContext.Provider value={contextValue}>
        <div
          ref={ref}
          className={className ? `${baseClasses} ${className}` : baseClasses}
          data-avatar=""
          data-size={size}
          data-variant={variant}
          {...props}
        >
          {enhancedChildren}
          {status !== 'none' && (
            <span
              className={[
                'absolute',
                statusPositionClasses[statusPosition],
                sizeConfig.status,
                'rounded-full',
                'border-white dark:border-gray-900',
                statusColors[status],
              ].join(' ')}
              data-avatar-status={status}
              aria-label={`Status: ${status}`}
            />
          )}
        </div>
      </AvatarContext.Provider>
    );
  }
);

Avatar.displayName = 'Avatar';

// ============================================================================
// AvatarImage
// ============================================================================

export interface AvatarImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  /** Callback when image fails to load */
  onLoadingStatusChange?: (status: 'loading' | 'loaded' | 'error') => void;
  // Internal props - not for external use
  _onLoad?: () => void;
  _onError?: () => void;
}

export const AvatarImage = forwardRef<HTMLImageElement, AvatarImageProps>(
  (
    {
      className,
      src,
      alt = '',
      onLoadingStatusChange,
      _onLoad,
      _onError,
      onLoad,
      onError,
      ...props
    },
    ref
  ) => {
    const [status, setStatus] = useState<'loading' | 'loaded' | 'error'>('loading');

    useEffect(() => {
      if (!src) {
        setStatus('error');
        _onError?.();
        onLoadingStatusChange?.('error');
      }
    }, [src, _onError, onLoadingStatusChange]);

    const handleLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
      setStatus('loaded');
      _onLoad?.();
      onLoadingStatusChange?.('loaded');
      onLoad?.(e);
    };

    const handleError = (e: React.SyntheticEvent<HTMLImageElement>) => {
      setStatus('error');
      _onError?.();
      onLoadingStatusChange?.('error');
      onError?.(e);
    };

    if (status === 'error' || !src) {
      return null;
    }

    const baseClasses = ['h-full w-full object-cover'].join(' ');

    return (
      <img
        ref={ref}
        className={className ? `${baseClasses} ${className}` : baseClasses}
        src={src}
        alt={alt}
        onLoad={handleLoad}
        onError={handleError}
        data-avatar-image=""
        {...props}
      />
    );
  }
);

AvatarImage.displayName = 'AvatarImage';

// ============================================================================
// AvatarFallback
// ============================================================================

export interface AvatarFallbackProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Name to generate initials from */
  name?: string;
  /** Custom initials (overrides name) */
  initials?: string;
  /** Maximum number of initials */
  maxInitials?: number;
  /** Whether to use a generated background color based on name */
  colorize?: boolean;
  /** Delay before showing fallback (allows image to load) */
  delayMs?: number;
}

export const AvatarFallback = forwardRef<HTMLSpanElement, AvatarFallbackProps>(
  (
    {
      children,
      className,
      name,
      initials,
      maxInitials = 2,
      colorize = false,
      delayMs = 0,
      style,
      ...props
    },
    ref
  ) => {
    const context = useAvatarContext();
    const [visible, setVisible] = useState(delayMs === 0);

    useEffect(() => {
      if (delayMs > 0) {
        const timer = setTimeout(() => setVisible(true), delayMs);
        return () => clearTimeout(timer);
      }
      return undefined;
    }, [delayMs]);

    // Don't show fallback if image loaded successfully
    if (context.imageLoaded || !visible) {
      return null;
    }

    const displayText = initials ?? (name ? getInitials(name, maxInitials) : null);
    const bgColor = colorize && name ? stringToColor(name) : undefined;

    const baseClasses = [
      'flex h-full w-full items-center justify-center',
      'font-medium',
      'text-gray-600 dark:text-gray-300',
      !bgColor && 'bg-gray-200 dark:bg-gray-700',
    ]
      .filter(Boolean)
      .join(' ');

    const combinedStyle: React.CSSProperties = {
      ...style,
      ...(bgColor && { backgroundColor: bgColor, color: 'white' }),
    };

    return (
      <span
        ref={ref}
        className={className ? `${baseClasses} ${className}` : baseClasses}
        style={combinedStyle}
        data-avatar-fallback=""
        {...props}
      >
        {children ?? displayText ?? (
          <svg
            className="h-1/2 w-1/2 text-gray-400"
            fill="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path d="M24 20.993V24H0v-2.996A14.977 14.977 0 0112.004 15c4.904 0 9.26 2.354 11.996 5.993zM16.002 8.999a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
        )}
      </span>
    );
  }
);

AvatarFallback.displayName = 'AvatarFallback';

// ============================================================================
// AvatarGroup
// ============================================================================

export interface AvatarGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Maximum avatars to show */
  max?: number;
  /** Size for all avatars in the group */
  size?: AvatarSize;
  /** Spacing between avatars (negative for overlap) */
  spacing?: number;
  /** Whether to show the count of hidden avatars */
  showCount?: boolean;
}

export const AvatarGroup = forwardRef<HTMLDivElement, AvatarGroupProps>(
  ({ children, className, max, size = 'md', spacing = -8, showCount = true, ...props }, ref) => {
    const childArray = React.Children.toArray(children);
    const visibleChildren = max ? childArray.slice(0, max) : childArray;
    const hiddenCount = max ? Math.max(0, childArray.length - max) : 0;

    const sizeConfig = sizeClasses[size];

    // Clone children to apply size and z-index
    const enhancedChildren = visibleChildren.map((child, index) => {
      if (React.isValidElement<AvatarProps>(child) && child.type === Avatar) {
        return React.cloneElement(child, {
          key: index,
          size,
          style: {
            ...child.props.style,
            marginLeft: index === 0 ? 0 : spacing,
            zIndex: visibleChildren.length - index,
          },
          className: [child.props.className, 'ring-2 ring-white dark:ring-gray-900']
            .filter(Boolean)
            .join(' '),
        });
      }
      return child;
    });

    const baseClasses = ['flex items-center'].join(' ');

    return (
      <div
        ref={ref}
        className={className ? `${baseClasses} ${className}` : baseClasses}
        role="group"
        aria-label={`Group of ${childArray.length} avatars`}
        data-avatar-group=""
        {...props}
      >
        {enhancedChildren}
        {showCount && hiddenCount > 0 && (
          <span
            className={[
              'relative inline-flex items-center justify-center',
              'bg-gray-200 dark:bg-gray-700',
              'text-gray-600 dark:text-gray-300',
              'rounded-full',
              'ring-2 ring-white dark:ring-gray-900',
              'font-medium',
              sizeConfig.container,
              sizeConfig.text,
            ].join(' ')}
            style={{ marginLeft: spacing, zIndex: 0 }}
            data-avatar-count=""
          >
            +{hiddenCount}
          </span>
        )}
      </div>
    );
  }
);

AvatarGroup.displayName = 'AvatarGroup';

// ============================================================================
// AvatarBadge
// ============================================================================

export interface AvatarBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Badge position */
  position?: 'top-right' | 'bottom-right' | 'top-left' | 'bottom-left';
  /** Badge offset from corner */
  offset?: number;
}

export const AvatarBadge = forwardRef<HTMLSpanElement, AvatarBadgeProps>(
  ({ children, className, position = 'bottom-right', offset = 0, style, ...props }, ref) => {
    const positionClasses: Record<string, string> = {
      'top-right': 'top-0 right-0',
      'bottom-right': 'bottom-0 right-0',
      'top-left': 'top-0 left-0',
      'bottom-left': 'bottom-0 left-0',
    };

    const transformMap: Record<string, string> = {
      'top-right': `translate(${25 - offset}%, ${-25 + offset}%)`,
      'bottom-right': `translate(${25 - offset}%, ${25 - offset}%)`,
      'top-left': `translate(${-25 + offset}%, ${-25 + offset}%)`,
      'bottom-left': `translate(${-25 + offset}%, ${25 - offset}%)`,
    };

    const baseClasses = [
      'absolute',
      positionClasses[position],
      'flex items-center justify-center',
      'min-w-5 h-5 px-1',
      'text-xs font-medium',
      'bg-lokifi-600 text-white',
      'rounded-full',
      'ring-2 ring-white dark:ring-gray-900',
    ].join(' ');

    const combinedStyle: React.CSSProperties = {
      ...style,
      transform: transformMap[position],
    };

    return (
      <span
        ref={ref}
        className={className ? `${baseClasses} ${className}` : baseClasses}
        style={combinedStyle}
        data-avatar-badge=""
        {...props}
      >
        {children}
      </span>
    );
  }
);

AvatarBadge.displayName = 'AvatarBadge';

// ============================================================================
// Exports
// ============================================================================

export default Avatar;


