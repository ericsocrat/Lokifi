'use client';

import { cn } from '@/lib/utils';
import * as React from 'react';
import { createContext, forwardRef, useContext } from 'react';

// ============================================================================
// Types
// ============================================================================

export type BreadcrumbVariant = 'default' | 'chevron' | 'slash' | 'dot' | 'arrow';
export type BreadcrumbSize = 'sm' | 'md' | 'lg';

export interface BreadcrumbContextValue {
  separator: React.ReactNode;
  size: BreadcrumbSize;
}

// ============================================================================
// Context
// ============================================================================

const BreadcrumbContext = createContext<BreadcrumbContextValue | null>(null);

function useBreadcrumbContext() {
  const context = useContext(BreadcrumbContext);
  if (!context) {
    throw new Error('Breadcrumb components must be used within a Breadcrumb');
  }
  return context;
}

// ============================================================================
// Separator Icons
// ============================================================================

const separatorIcons: Record<BreadcrumbVariant, React.ReactNode> = {
  default: (
    <svg
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
  ),
  chevron: (
    <svg
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
  ),
  slash: <span aria-hidden="true">/</span>,
  dot: <span className="h-1 w-1 rounded-full bg-current" aria-hidden="true" />,
  arrow: (
    <svg
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
    </svg>
  ),
};

// ============================================================================
// Size Classes
// ============================================================================

const sizeClasses: Record<BreadcrumbSize, { text: string; gap: string; icon: string }> = {
  sm: { text: 'text-xs', gap: 'gap-1', icon: 'h-3 w-3' },
  md: { text: 'text-sm', gap: 'gap-1.5', icon: 'h-4 w-4' },
  lg: { text: 'text-base', gap: 'gap-2', icon: 'h-5 w-5' },
};

// ============================================================================
// Breadcrumb (Root)
// ============================================================================

export interface BreadcrumbProps extends React.HTMLAttributes<HTMLElement> {
  /** Visual separator variant */
  variant?: BreadcrumbVariant;
  /** Custom separator element */
  separator?: React.ReactNode;
  /** Size of the breadcrumb */
  size?: BreadcrumbSize;
  /** Maximum items to show (middle items are collapsed) */
  maxItems?: number;
  /** Number of items to show before ellipsis */
  itemsBeforeCollapse?: number;
  /** Number of items to show after ellipsis */
  itemsAfterCollapse?: number;
}

export const Breadcrumb = forwardRef<HTMLElement, BreadcrumbProps>(
  (
    {
      className,
      children,
      variant = 'default',
      separator,
      size = 'md',
      maxItems,
      itemsBeforeCollapse = 1,
      itemsAfterCollapse = 1,
      ...props
    },
    ref
  ) => {
    const resolvedSeparator = separator ?? separatorIcons[variant];
    const sizeConfig = sizeClasses[size];

    const childArray = React.Children.toArray(children);
    const shouldCollapse = maxItems !== undefined && childArray.length > maxItems;

    let displayedChildren: React.ReactNode[];

    if (shouldCollapse) {
      const beforeItems = childArray.slice(0, itemsBeforeCollapse);
      const afterItems = childArray.slice(-itemsAfterCollapse);

      displayedChildren = [...beforeItems, <BreadcrumbEllipsis key="ellipsis" />, ...afterItems];
    } else {
      displayedChildren = childArray;
    }

    // Add separators between items
    const itemsWithSeparators = displayedChildren.reduce<React.ReactNode[]>((acc, child, index) => {
      if (index > 0) {
        acc.push(
          <BreadcrumbSeparator key={`sep-${index}`} size={size}>
            {resolvedSeparator}
          </BreadcrumbSeparator>
        );
      }
      acc.push(child);
      return acc;
    }, []);

    const contextValue: BreadcrumbContextValue = {
      separator: resolvedSeparator,
      size,
    };

    return (
      <BreadcrumbContext.Provider value={contextValue}>
        <nav
          ref={ref}
          aria-label="Breadcrumb"
          className={className}
          data-breadcrumb=""
          data-variant={variant}
          {...props}
        >
          <ol
            className={cn(
              'flex flex-wrap items-center',
              sizeConfig.gap,
              sizeConfig.text,
              'text-surface-300'
            )}
            data-breadcrumb-list=""
          >
            {itemsWithSeparators}
          </ol>
        </nav>
      </BreadcrumbContext.Provider>
    );
  }
);

Breadcrumb.displayName = 'Breadcrumb';

// ============================================================================
// BreadcrumbItem
// ============================================================================

export interface BreadcrumbItemProps extends React.LiHTMLAttributes<HTMLLIElement> {
  /** Whether this is the current/active page */
  isCurrent?: boolean;
}

export const BreadcrumbItem = forwardRef<HTMLLIElement, BreadcrumbItemProps>(
  ({ className, children, isCurrent = false, ...props }, ref) => {
    return (
      <li
        ref={ref}
        className={cn('inline-flex items-center', className)}
        aria-current={isCurrent ? 'page' : undefined}
        data-breadcrumb-item=""
        data-current={isCurrent ? '' : undefined}
        {...props}
      >
        {children}
      </li>
    );
  }
);

BreadcrumbItem.displayName = 'BreadcrumbItem';

// ============================================================================
// BreadcrumbLink
// ============================================================================

export interface BreadcrumbLinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  /** Whether this link is the current page (disables link) */
  isCurrent?: boolean;
  /** Custom component to render (for Next.js Link, etc.) */
  asChild?: boolean;
}

export const BreadcrumbLink = forwardRef<HTMLAnchorElement, BreadcrumbLinkProps>(
  ({ className, children, href, isCurrent = false, asChild: _asChild, ...props }, ref) => {
    const baseClasses = cn(
      'transition-colors',
      isCurrent
        ? 'font-medium text-white pointer-events-none'
        : 'hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-lokifi-500 focus-visible:ring-offset-1 rounded'
    );

    if (isCurrent) {
      return (
        <span
          ref={ref as React.Ref<HTMLSpanElement>}
          className={cn(baseClasses, className)}
          data-breadcrumb-link=""
          data-current=""
          {...(props as React.HTMLAttributes<HTMLSpanElement>)}
        >
          {children}
        </span>
      );
    }

    return (
      <a
        ref={ref}
        href={href}
        className={cn(baseClasses, className)}
        data-breadcrumb-link=""
        {...props}
      >
        {children}
      </a>
    );
  }
);

BreadcrumbLink.displayName = 'BreadcrumbLink';

// ============================================================================
// BreadcrumbSeparator
// ============================================================================

export interface BreadcrumbSeparatorProps extends React.LiHTMLAttributes<HTMLLIElement> {
  /** Size for scaling the separator */
  size?: BreadcrumbSize;
}

export const BreadcrumbSeparator = forwardRef<HTMLLIElement, BreadcrumbSeparatorProps>(
  ({ className, children, size: _size = 'md', ...props }, ref) => {
    return (
      <li
        ref={ref}
        role="presentation"
        aria-hidden="true"
        className={cn('text-surface-300 flex items-center', className)}
        data-breadcrumb-separator=""
        {...props}
      >
        {children}
      </li>
    );
  }
);

BreadcrumbSeparator.displayName = 'BreadcrumbSeparator';

// ============================================================================
// BreadcrumbEllipsis
// ============================================================================

export interface BreadcrumbEllipsisProps extends React.LiHTMLAttributes<HTMLLIElement> {
  /** Custom label for accessibility */
  label?: string;
}

export const BreadcrumbEllipsis = forwardRef<HTMLLIElement, BreadcrumbEllipsisProps>(
  ({ className, label = 'More pages', ...props }, ref) => {
    return (
      <li
        ref={ref}
        className={cn('flex items-center', className)}
        data-breadcrumb-ellipsis=""
        {...props}
      >
        <span className="sr-only">{label}</span>
        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="6" cy="12" r="2" />
          <circle cx="12" cy="12" r="2" />
          <circle cx="18" cy="12" r="2" />
        </svg>
      </li>
    );
  }
);

BreadcrumbEllipsis.displayName = 'BreadcrumbEllipsis';

// ============================================================================
// BreadcrumbPage (Convenience component for current page)
// ============================================================================

export type BreadcrumbPageProps = React.HTMLAttributes<HTMLSpanElement>;

export const BreadcrumbPage = forwardRef<HTMLSpanElement, BreadcrumbPageProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <span
        ref={ref}
        className={cn('font-medium text-white', className)}
        aria-current="page"
        data-breadcrumb-page=""
        {...props}
      >
        {children}
      </span>
    );
  }
);

BreadcrumbPage.displayName = 'BreadcrumbPage';

// ============================================================================
// BreadcrumbHome (Convenience component for home link with icon)
// ============================================================================

export interface BreadcrumbHomeProps extends Omit<BreadcrumbLinkProps, 'children'> {
  /** Show text alongside icon */
  showText?: boolean;
  /** Custom text (default: "Home") */
  text?: string;
}

export const BreadcrumbHome = forwardRef<HTMLAnchorElement, BreadcrumbHomeProps>(
  ({ className, showText = false, text = 'Home', href = '/', ...props }, ref) => {
    return (
      <BreadcrumbLink
        ref={ref}
        href={href}
        className={cn('inline-flex items-center gap-1', className)}
        data-breadcrumb-home=""
        {...props}
      >
        <svg
          className="h-4 w-4"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
          />
        </svg>
        {showText && <span>{text}</span>}
        {!showText && <span className="sr-only">{text}</span>}
      </BreadcrumbLink>
    );
  }
);

BreadcrumbHome.displayName = 'BreadcrumbHome';

// ============================================================================
// Convenience Exports
// ============================================================================

export { BreadcrumbContext, useBreadcrumbContext };
