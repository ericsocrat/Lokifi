'use client';

import { cn } from '@/lib/utils';
import * as React from 'react';
import { createContext, forwardRef, useContext } from 'react';

// ============================================================================
// Types
// ============================================================================

export type AlertVariant = 'default' | 'info' | 'success' | 'warning' | 'error' | 'destructive';
export type AlertSize = 'sm' | 'md' | 'lg';

export interface AlertContextValue {
  variant: AlertVariant;
  size: AlertSize;
}

// ============================================================================
// Context
// ============================================================================

const AlertContext = createContext<AlertContextValue | null>(null);

const useAlertContext = () => {
  const context = useContext(AlertContext);
  return context ?? { variant: 'default' as AlertVariant, size: 'md' as AlertSize };
};

// ============================================================================
// Variant Styles
// ============================================================================

const variantStyles: Record<AlertVariant, string> = {
  default:
    'bg-gray-50 border-gray-200 text-gray-900 dark:bg-gray-900 dark:border-gray-800 dark:text-gray-100',
  info: 'bg-blue-50 border-blue-200 text-blue-900 dark:bg-blue-950 dark:border-blue-800 dark:text-blue-100',
  success:
    'bg-green-50 border-green-200 text-green-900 dark:bg-green-950 dark:border-green-800 dark:text-green-100',
  warning:
    'bg-amber-50 border-amber-200 text-amber-900 dark:bg-amber-950 dark:border-amber-800 dark:text-amber-100',
  error:
    'bg-red-50 border-red-200 text-red-900 dark:bg-red-950 dark:border-red-800 dark:text-red-100',
  destructive: 'bg-red-600 border-red-600 text-white dark:bg-red-600 dark:border-red-600',
};

const iconColors: Record<AlertVariant, string> = {
  default: 'text-gray-500 dark:text-gray-400',
  info: 'text-blue-500 dark:text-blue-400',
  success: 'text-green-500 dark:text-green-400',
  warning: 'text-amber-500 dark:text-amber-400',
  error: 'text-red-500 dark:text-red-400',
  destructive: 'text-white',
};

const sizeStyles: Record<AlertSize, string> = {
  sm: 'p-3 text-sm',
  md: 'p-4 text-sm',
  lg: 'p-5 text-base',
};

const iconSizes: Record<AlertSize, string> = {
  sm: 'w-4 h-4',
  md: 'w-5 h-5',
  lg: 'w-6 h-6',
};

// ============================================================================
// Icons
// ============================================================================

const InfoIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <circle cx="12" cy="12" r="10" strokeWidth="2" />
    <path strokeLinecap="round" strokeWidth="2" d="M12 16v-4M12 8h.01" />
  </svg>
);

const SuccessIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <circle cx="12" cy="12" r="10" strokeWidth="2" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4" />
  </svg>
);

const WarningIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
    />
  </svg>
);

const ErrorIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <circle cx="12" cy="12" r="10" strokeWidth="2" />
    <path strokeLinecap="round" strokeWidth="2" d="M15 9l-6 6M9 9l6 6" />
  </svg>
);

const variantIcons: Record<AlertVariant, React.FC<{ className?: string }>> = {
  default: InfoIcon,
  info: InfoIcon,
  success: SuccessIcon,
  warning: WarningIcon,
  error: ErrorIcon,
  destructive: ErrorIcon,
};

// ============================================================================
// Alert (Root)
// ============================================================================

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Visual variant */
  variant?: AlertVariant;
  /** Size of the alert */
  size?: AlertSize;
  /** Show default icon for variant */
  icon?: boolean;
  /** Custom icon element */
  customIcon?: React.ReactNode;
  /** Whether the alert can be dismissed */
  dismissible?: boolean;
  /** Callback when dismissed */
  onDismiss?: () => void;
}

export const Alert = forwardRef<HTMLDivElement, AlertProps>(
  (
    {
      className,
      children,
      variant = 'default',
      size = 'md',
      icon = false,
      customIcon,
      dismissible = false,
      onDismiss,
      ...props
    },
    ref
  ) => {
    const IconComponent = variantIcons[variant];

    return (
      <AlertContext.Provider value={{ variant, size }}>
        <div
          ref={ref}
          role="alert"
          className={cn(
            'relative rounded-lg border',
            variantStyles[variant],
            sizeStyles[size],
            (icon || customIcon) && 'flex gap-3',
            className
          )}
          data-alert=""
          data-variant={variant}
          data-size={size}
          {...props}
        >
          {(icon || customIcon) && (
            <div className={cn('shrink-0', iconColors[variant])} data-alert-icon="">
              {customIcon ?? <IconComponent className={iconSizes[size]} />}
            </div>
          )}
          <div className="flex-1 min-w-0">{children}</div>
          {dismissible && (
            <button
              type="button"
              onClick={onDismiss}
              className={cn(
                'absolute right-2 top-2 rounded-sm opacity-70 transition-opacity',
                'hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-offset-2',
                variant === 'destructive'
                  ? 'focus:ring-white'
                  : 'focus:ring-gray-500 dark:focus:ring-gray-400'
              )}
              aria-label="Dismiss"
              data-alert-dismiss=""
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          )}
        </div>
      </AlertContext.Provider>
    );
  }
);

Alert.displayName = 'Alert';

// ============================================================================
// AlertTitle
// ============================================================================

export interface AlertTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {
  /** Heading level */
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
}

export const AlertTitle = forwardRef<HTMLHeadingElement, AlertTitleProps>(
  ({ className, children, as: Component = 'h5', ...props }, ref) => {
    const { size } = useAlertContext();

    const sizeClasses: Record<AlertSize, string> = {
      sm: 'text-sm font-medium',
      md: 'text-base font-medium',
      lg: 'text-lg font-semibold',
    };

    return (
      <Component
        ref={ref}
        className={cn('mb-1 tracking-tight', sizeClasses[size], className)}
        data-alert-title=""
        {...props}
      >
        {children}
      </Component>
    );
  }
);

AlertTitle.displayName = 'AlertTitle';

// ============================================================================
// AlertDescription
// ============================================================================

export type AlertDescriptionProps = React.HTMLAttributes<HTMLParagraphElement>;

export const AlertDescription = forwardRef<HTMLParagraphElement, AlertDescriptionProps>(
  ({ className, children, ...props }, ref) => {
    const { variant } = useAlertContext();

    return (
      <p
        ref={ref}
        className={cn(
          'leading-relaxed',
          variant === 'destructive' ? 'text-white/90' : 'text-inherit opacity-90',
          className
        )}
        data-alert-description=""
        {...props}
      >
        {children}
      </p>
    );
  }
);

AlertDescription.displayName = 'AlertDescription';

// ============================================================================
// AlertActions
// ============================================================================

export type AlertActionsProps = React.HTMLAttributes<HTMLDivElement>;

export const AlertActions = forwardRef<HTMLDivElement, AlertActionsProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div ref={ref} className={cn('mt-3 flex gap-2', className)} data-alert-actions="" {...props}>
        {children}
      </div>
    );
  }
);

AlertActions.displayName = 'AlertActions';

// ============================================================================
// AlertLink
// ============================================================================

export type AlertLinkProps = React.AnchorHTMLAttributes<HTMLAnchorElement>;

export const AlertLink = forwardRef<HTMLAnchorElement, AlertLinkProps>(
  ({ className, children, ...props }, ref) => {
    const { variant } = useAlertContext();

    return (
      <a
        ref={ref}
        className={cn(
          'font-medium underline underline-offset-4',
          'hover:no-underline focus:outline-none focus:ring-2 focus:ring-offset-2',
          variant === 'destructive'
            ? 'text-white hover:text-white/80 focus:ring-white'
            : 'hover:opacity-80',
          className
        )}
        data-alert-link=""
        {...props}
      >
        {children}
      </a>
    );
  }
);

AlertLink.displayName = 'AlertLink';

// ============================================================================
// Convenience Components - Pre-configured Alert Variants
// ============================================================================

export interface SimpleAlertProps extends Omit<AlertProps, 'variant'> {
  /** Alert title */
  title?: string;
  /** Alert description */
  description?: string;
}

export const InfoAlert = forwardRef<HTMLDivElement, SimpleAlertProps>(
  ({ title, description, children, ...props }, ref) => (
    <Alert ref={ref} variant="info" icon {...props}>
      {title && <AlertTitle>{title}</AlertTitle>}
      {description && <AlertDescription>{description}</AlertDescription>}
      {children}
    </Alert>
  )
);
InfoAlert.displayName = 'InfoAlert';

export const SuccessAlert = forwardRef<HTMLDivElement, SimpleAlertProps>(
  ({ title, description, children, ...props }, ref) => (
    <Alert ref={ref} variant="success" icon {...props}>
      {title && <AlertTitle>{title}</AlertTitle>}
      {description && <AlertDescription>{description}</AlertDescription>}
      {children}
    </Alert>
  )
);
SuccessAlert.displayName = 'SuccessAlert';

export const WarningAlert = forwardRef<HTMLDivElement, SimpleAlertProps>(
  ({ title, description, children, ...props }, ref) => (
    <Alert ref={ref} variant="warning" icon {...props}>
      {title && <AlertTitle>{title}</AlertTitle>}
      {description && <AlertDescription>{description}</AlertDescription>}
      {children}
    </Alert>
  )
);
WarningAlert.displayName = 'WarningAlert';

export const ErrorAlert = forwardRef<HTMLDivElement, SimpleAlertProps>(
  ({ title, description, children, ...props }, ref) => (
    <Alert ref={ref} variant="error" icon {...props}>
      {title && <AlertTitle>{title}</AlertTitle>}
      {description && <AlertDescription>{description}</AlertDescription>}
      {children}
    </Alert>
  )
);
ErrorAlert.displayName = 'ErrorAlert';

// ============================================================================
// AlertBanner - Full-width alert for top/bottom of page
// ============================================================================

export interface AlertBannerProps extends Omit<AlertProps, 'size'> {
  /** Position of the banner */
  position?: 'top' | 'bottom' | 'inline';
  /** Center content */
  centered?: boolean;
}

export const AlertBanner = forwardRef<HTMLDivElement, AlertBannerProps>(
  (
    { className, children, position = 'inline', centered = false, variant = 'info', ...props },
    ref
  ) => {
    return (
      <Alert
        ref={ref}
        variant={variant}
        className={cn(
          'rounded-none border-x-0',
          position === 'top' && 'fixed top-0 left-0 right-0 z-50',
          position === 'bottom' && 'fixed bottom-0 left-0 right-0 z-50',
          centered && 'text-center',
          className
        )}
        data-alert-banner=""
        data-position={position}
        {...props}
      >
        {children}
      </Alert>
    );
  }
);

AlertBanner.displayName = 'AlertBanner';

// ============================================================================
// FinancialAlert - Pre-configured for financial notifications
// ============================================================================

export type FinancialAlertType =
  | 'price-up'
  | 'price-down'
  | 'trade-executed'
  | 'portfolio-update'
  | 'risk-warning';

const financialAlertConfig: Record<
  FinancialAlertType,
  { variant: AlertVariant; icon: React.FC<{ className?: string }>; defaultTitle: string }
> = {
  'price-up': {
    variant: 'success',
    icon: ({ className }) => (
      <svg
        className={className}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
        />
      </svg>
    ),
    defaultTitle: 'Price Increase',
  },
  'price-down': {
    variant: 'error',
    icon: ({ className }) => (
      <svg
        className={className}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6"
        />
      </svg>
    ),
    defaultTitle: 'Price Decrease',
  },
  'trade-executed': {
    variant: 'info',
    icon: ({ className }) => (
      <svg
        className={className}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
        />
      </svg>
    ),
    defaultTitle: 'Trade Executed',
  },
  'portfolio-update': {
    variant: 'default',
    icon: ({ className }) => (
      <svg
        className={className}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z"
        />
      </svg>
    ),
    defaultTitle: 'Portfolio Updated',
  },
  'risk-warning': {
    variant: 'warning',
    icon: WarningIcon,
    defaultTitle: 'Risk Warning',
  },
};

export interface FinancialAlertProps extends Omit<AlertProps, 'variant' | 'icon' | 'customIcon'> {
  /** Type of financial alert */
  type: FinancialAlertType;
  /** Alert title (uses default if not provided) */
  title?: string;
  /** Alert description */
  description?: string;
  /** Optional value change (e.g., "+5.2%") */
  valueChange?: string;
  /** Optional asset symbol */
  symbol?: string;
}

export const FinancialAlert = forwardRef<HTMLDivElement, FinancialAlertProps>(
  ({ type, title, description, valueChange, symbol, children, className, ...props }, ref) => {
    const config = financialAlertConfig[type];
    const IconComponent = config.icon;
    const { size } = useAlertContext();

    return (
      <Alert
        ref={ref}
        variant={config.variant}
        customIcon={<IconComponent className={iconSizes[size ?? 'md']} />}
        className={className}
        data-financial-alert=""
        data-alert-type={type}
        {...props}
      >
        <div className="flex items-start justify-between">
          <div>
            <AlertTitle>{title ?? config.defaultTitle}</AlertTitle>
            {description && <AlertDescription>{description}</AlertDescription>}
          </div>
          {(valueChange || symbol) && (
            <div className="text-right">
              {symbol && <div className="font-medium">{symbol}</div>}
              {valueChange && (
                <div
                  className={cn(
                    'font-semibold',
                    type === 'price-up' && 'text-green-600 dark:text-green-400',
                    type === 'price-down' && 'text-red-600 dark:text-red-400'
                  )}
                >
                  {valueChange}
                </div>
              )}
            </div>
          )}
        </div>
        {children}
      </Alert>
    );
  }
);

FinancialAlert.displayName = 'FinancialAlert';


