/**
 * LOKIFI THEME SYSTEM
 * Comprehensive theme configuration for consistent design across the entire application
 * Theme: "Dark Terminal Elegance" - Professional Trading Platform
 *
 * Usage: Import and use theme constants instead of hardcoded values
 * Example: import { colors, spacing, animations } from '@/lib/theme'
 */

// ============================================================================
// COLOR SYSTEM
// ============================================================================

export const colors = {
  // Primary Brand Colors
  primary: {
    main: '#3B82F6', // Electric Blue - Main brand color
    light: '#60A5FA', // Lighter blue for hover states
    dark: '#2563EB', // Darker blue for active states
    glow: 'rgba(59, 130, 246, 0.5)', // Blue glow effect
    subtle: 'rgba(59, 130, 246, 0.1)', // Very subtle blue tint
  },

  // Secondary Brand Colors
  secondary: {
    main: '#F97316', // Ember Orange - Secondary accent
    light: '#FB923C', // Lighter orange
    dark: '#EA580C', // Darker orange
    glow: 'rgba(249, 115, 22, 0.5)',
    subtle: 'rgba(249, 115, 22, 0.1)',
  },

  // Trading Colors
  trading: {
    up: '#10B981', // Emerald Green - Gains/Bullish
    upLight: '#34D399', // Lighter green
    upDark: '#059669', // Darker green
    upGlow: 'rgba(16, 185, 129, 0.3)',

    down: '#EF4444', // Red - Losses/Bearish
    downLight: '#F87171', // Lighter red
    downDark: '#DC2626', // Darker red
    downGlow: 'rgba(239, 68, 68, 0.3)',

    neutral: '#6B7280', // Gray - Unchanged
  },

  // Background Layers (from darkest to lightest)
  background: {
    base: '#0B0B0F', // Near-black base
    primary: '#1A1A1A', // Primary surface
    secondary: '#262626', // Secondary surface (cards)
    tertiary: '#333333', // Tertiary surface (nested elements)
    hover: '#2D2D2D', // Hover state background
    elevated: '#3A3A3A', // Elevated elements
  },

  // Border Colors
  border: {
    subtle: '#1F1F1F', // Very subtle borders
    default: '#374151', // Default border color
    focus: '#3B82F6', // Focused element border
    hover: '#4B5563', // Hover state border
    divider: '#2A2A2A', // Divider lines
  },

  // Text Colors
  text: {
    primary: '#E5E7EB', // Main text color
    secondary: '#D1D5DB', // Secondary text
    tertiary: '#9CA3AF', // Tertiary/muted text
    disabled: '#6B7280', // Disabled text
    inverse: '#0B0B0F', // Text on light backgrounds
  },

  // Status Colors
  status: {
    success: '#10B981', // Success states
    warning: '#F59E0B', // Warning states
    error: '#EF4444', // Error states
    info: '#3B82F6', // Info states
  },

  // Overlay Colors (for modals, dropdowns, etc.)
  overlay: {
    light: 'rgba(0, 0, 0, 0.3)',
    medium: 'rgba(0, 0, 0, 0.6)',
    heavy: 'rgba(0, 0, 0, 0.8)',
    glass: 'rgba(26, 26, 26, 0.8)', // Glass-morphism
  },

  // Chart-specific Colors
  chart: {
    background: '#1A1A1A',
    gridLines: '#374151',
    textColor: '#D1D5DB',
    crosshair: '#6B7280',
    candleUp: '#10B981',
    candleDown: '#EF4444',
    wickUp: '#10B981',
    wickDown: '#EF4444',
    volume: 'rgba(59, 130, 246, 0.4)',
  },

  // Asset Type Colors (for symbol picker)
  assetTypes: {
    stock: '#3B82F6', // Blue for stocks
    crypto: '#F59E0B', // Amber for crypto
    forex: '#10B981', // Green for forex
    commodity: '#8B5CF6', // Purple for commodities
    index: '#EC4899', // Pink for indices
  },
} as const;

// ============================================================================
// GRADIENTS
// ============================================================================

export const gradients = {
  primary: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)',
  secondary: 'linear-gradient(135deg, #F97316 0%, #EA580C 100%)',
  success: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
  danger: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)',

  // Subtle background gradients
  backgroundSubtle: 'linear-gradient(180deg, #1A1A1A 0%, #0B0B0F 100%)',
  backgroundRadial:
    'radial-gradient(circle at top right, rgba(59, 130, 246, 0.1) 0%, transparent 50%)',

  // Glass-morphism gradient
  glass: 'linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.02) 100%)',

  // Hero section gradients
  hero: 'linear-gradient(135deg, rgba(59, 130, 246, 0.2) 0%, rgba(249, 115, 22, 0.2) 100%)',
} as const;

// ============================================================================
// SHADOWS & EFFECTS
// ============================================================================

export const shadows = {
  sm: '0 1px 2px 0 rgba(0, 0, 0, 0.3)',
  base: '0 1px 3px 0 rgba(0, 0, 0, 0.4), 0 1px 2px -1px rgba(0, 0, 0, 0.4)',
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.5), 0 2px 4px -2px rgba(0, 0, 0, 0.5)',
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.6), 0 4px 6px -4px rgba(0, 0, 0, 0.6)',
  xl: '0 20px 25px -5px rgba(0, 0, 0, 0.7), 0 8px 10px -6px rgba(0, 0, 0, 0.7)',
  '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.8)',

  // Glow effects
  glowBlue: '0 0 20px rgba(59, 130, 246, 0.5)',
  glowOrange: '0 0 20px rgba(249, 115, 22, 0.5)',
  glowGreen: '0 0 20px rgba(16, 185, 129, 0.5)',
  glowRed: '0 0 20px rgba(239, 68, 68, 0.5)',

  // Focus ring
  focusRing: '0 0 0 3px rgba(59, 130, 246, 0.3)',

  // Inner shadows
  inner: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.3)',
  innerLg: 'inset 0 4px 8px 0 rgba(0, 0, 0, 0.4)',
} as const;

export const effects = {
  glassmorphism: {
    background: 'rgba(26, 26, 26, 0.8)',
    backdropFilter: 'blur(12px) saturate(180%)',
    border: '1px solid rgba(255, 255, 255, 0.05)',
    boxShadow: shadows.lg,
  },

  frostedGlass: {
    background: 'rgba(26, 26, 26, 0.6)',
    backdropFilter: 'blur(16px)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
  },
} as const;

// ============================================================================
// SPACING SYSTEM
// ============================================================================

export const spacing = {
  xs: '0.25rem', // 4px
  sm: '0.5rem', // 8px
  md: '1rem', // 16px
  lg: '1.5rem', // 24px
  xl: '2rem', // 32px
  '2xl': '3rem', // 48px
  '3xl': '4rem', // 64px
  '4xl': '6rem', // 96px
  '5xl': '8rem', // 128px
} as const;

// ============================================================================
// BORDER RADIUS
// ============================================================================

export const borderRadius = {
  none: '0',
  sm: '0.25rem', // 4px
  base: '0.5rem', // 8px
  md: '0.75rem', // 12px
  lg: '1rem', // 16px
  xl: '1.25rem', // 20px
  '2xl': '1.5rem', // 24px
  '3xl': '2rem', // 32px
  full: '9999px', // Fully rounded
} as const;

// ============================================================================
// TYPOGRAPHY
// ============================================================================

export const typography = {
  fontFamily: {
    sans: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", sans-serif',
    mono: '"Roboto Mono", "JetBrains Mono", "Fira Code", monospace',
  },

  fontSize: {
    xs: '0.75rem', // 12px
    sm: '0.875rem', // 14px
    base: '1rem', // 16px
    lg: '1.125rem', // 18px
    xl: '1.25rem', // 20px
    '2xl': '1.5rem', // 24px
    '3xl': '1.875rem', // 30px
    '4xl': '2.25rem', // 36px
    '5xl': '3rem', // 48px
    '6xl': '3.75rem', // 60px
  },

  fontWeight: {
    light: '300',
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
    extrabold: '800',
  },

  lineHeight: {
    tight: '1.25',
    normal: '1.5',
    relaxed: '1.75',
  },

  letterSpacing: {
    tight: '-0.025em',
    normal: '0',
    wide: '0.025em',
  },
} as const;

// ============================================================================
// ANIMATIONS & TRANSITIONS
// ============================================================================

export const animations = {
  // Transition durations
  duration: {
    fast: '150ms',
    base: '200ms',
    slow: '300ms',
    slower: '500ms',
  },

  // Transition timing functions
  timing: {
    ease: 'ease',
    easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
    easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
    easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
    spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
  },

  // Common transition combinations
  transition: {
    all: 'all 200ms cubic-bezier(0.4, 0, 0.2, 1)',
    colors:
      'background-color 200ms cubic-bezier(0.4, 0, 0.2, 1), color 200ms cubic-bezier(0.4, 0, 0.2, 1), border-color 200ms cubic-bezier(0.4, 0, 0.2, 1)',
    transform: 'transform 200ms cubic-bezier(0.4, 0, 0.2, 1)',
    opacity: 'opacity 200ms cubic-bezier(0.4, 0, 0.2, 1)',
    shadow: 'box-shadow 200ms cubic-bezier(0.4, 0, 0.2, 1)',
  },

  // Keyframe animations
  keyframes: {
    fadeIn: {
      from: { opacity: 0 },
      to: { opacity: 1 },
    },
    fadeOut: {
      from: { opacity: 1 },
      to: { opacity: 0 },
    },
    slideUp: {
      from: { transform: 'translateY(10px)', opacity: 0 },
      to: { transform: 'translateY(0)', opacity: 1 },
    },
    slideDown: {
      from: { transform: 'translateY(-10px)', opacity: 0 },
      to: { transform: 'translateY(0)', opacity: 1 },
    },
    scaleIn: {
      from: { transform: 'scale(0.95)', opacity: 0 },
      to: { transform: 'scale(1)', opacity: 1 },
    },
    pulse: {
      '0%, 100%': { opacity: 1 },
      '50%': { opacity: 0.5 },
    },
    glow: {
      '0%, 100%': { boxShadow: '0 0 5px rgba(59, 130, 246, 0.5)' },
      '50%': { boxShadow: '0 0 20px rgba(59, 130, 246, 0.8)' },
    },
  },
} as const;

// ============================================================================
// Z-INDEX LAYERS
// ============================================================================

export const zIndex = {
  base: 0,
  dropdown: 1000,
  sticky: 1100,
  fixed: 1200,
  modalBackdrop: 1300,
  modal: 1400,
  popover: 1500,
  tooltip: 1600,
  notification: 1700,
  max: 9999,
} as const;

// ============================================================================
// BREAKPOINTS
// ============================================================================

export const breakpoints = {
  xs: '475px',
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
} as const;

// ============================================================================
// COMPONENT-SPECIFIC STYLES
// ============================================================================

export const components = {
  // Button Styles
  button: {
    base: {
      fontWeight: typography.fontWeight.medium,
      borderRadius: borderRadius.lg,
      transition: animations.transition.all,
      cursor: 'pointer',
    },

    sizes: {
      sm: {
        padding: `${spacing.xs} ${spacing.md}`,
        fontSize: typography.fontSize.sm,
      },
      md: {
        padding: `${spacing.sm} ${spacing.lg}`,
        fontSize: typography.fontSize.base,
      },
      lg: {
        padding: `${spacing.md} ${spacing.xl}`,
        fontSize: typography.fontSize.lg,
      },
    },

    variants: {
      primary: {
        background: colors.primary.main,
        color: colors.text.primary,
        border: 'none',
        hover: {
          background: colors.primary.light,
          boxShadow: shadows.glowBlue,
        },
        active: {
          background: colors.primary.dark,
        },
        focus: {
          boxShadow: shadows.focusRing,
        },
      },

      secondary: {
        background: colors.background.secondary,
        color: colors.text.primary,
        border: `1px solid ${colors.border.default}`,
        hover: {
          background: colors.background.hover,
          borderColor: colors.border.hover,
        },
      },

      ghost: {
        background: 'transparent',
        color: colors.text.secondary,
        border: 'none',
        hover: {
          background: colors.background.hover,
          color: colors.text.primary,
        },
      },

      danger: {
        background: colors.trading.down,
        color: colors.text.primary,
        border: 'none',
        hover: {
          background: colors.trading.downLight,
          boxShadow: shadows.glowRed,
        },
      },
    },
  },

  // Input Styles
  input: {
    base: {
      background: colors.background.secondary,
      color: colors.text.primary,
      border: `1px solid ${colors.border.default}`,
      borderRadius: borderRadius.lg,
      padding: `${spacing.sm} ${spacing.md}`,
      fontSize: typography.fontSize.base,
      transition: animations.transition.all,
    },

    focus: {
      borderColor: colors.border.focus,
      boxShadow: shadows.focusRing,
      outline: 'none',
    },

    error: {
      borderColor: colors.status.error,
      boxShadow: `0 0 0 3px ${colors.trading.downGlow}`,
    },

    disabled: {
      background: colors.background.primary,
      color: colors.text.disabled,
      cursor: 'not-allowed',
      opacity: 0.6,
    },
  },

  // Card Styles
  card: {
    base: {
      background: colors.background.secondary,
      border: `1px solid ${colors.border.subtle}`,
      borderRadius: borderRadius.xl,
      padding: spacing.lg,
      boxShadow: shadows.base,
    },

    hover: {
      borderColor: colors.border.default,
      boxShadow: shadows.md,
      transform: 'translateY(-2px)',
    },

    elevated: {
      background: colors.background.tertiary,
      boxShadow: shadows.lg,
    },

    glass: {
      ...effects.glassmorphism,
      borderRadius: borderRadius.xl,
      padding: spacing.lg,
    },
  },

  // Modal Styles
  modal: {
    backdrop: {
      background: colors.overlay.medium,
      backdropFilter: 'blur(4px)',
    },

    content: {
      ...effects.glassmorphism,
      borderRadius: borderRadius['2xl'],
      padding: spacing.xl,
      maxWidth: '600px',
      boxShadow: shadows['2xl'],
    },
  },

  // Tooltip Styles
  tooltip: {
    base: {
      background: colors.background.elevated,
      color: colors.text.primary,
      border: `1px solid ${colors.border.default}`,
      borderRadius: borderRadius.md,
      padding: `${spacing.xs} ${spacing.sm}`,
      fontSize: typography.fontSize.sm,
      boxShadow: shadows.lg,
    },
  },

  // Chart Container Styles
  chartContainer: {
    base: {
      background: colors.chart.background,
      border: `1px solid ${colors.border.default}`,
      borderRadius: borderRadius.xl,
      overflow: 'hidden',
    },

    header: {
      background: colors.background.tertiary,
      borderBottom: `1px solid ${colors.border.divider}`,
      padding: spacing.md,
    },
  },
} as const;

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Generate rgba color from hex with alpha
 */
export const rgba = (hex: string, alpha: number): string => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

/**
 * Get color for trading direction
 */
export const getTradingColor = (value: number, neutral = false): string => {
  if (neutral || value === 0) return colors.trading.neutral;
  return value > 0 ? colors.trading.up : colors.trading.down;
};

/**
 * Get asset type color
 */
export const getAssetTypeColor = (type: keyof typeof colors.assetTypes): string => {
  return colors.assetTypes[type] || colors.primary.main;
};

/**
 * Create hover state style object
 */
export const createHoverState = (baseColor: string, intensity = 1.1): string => {
  // This is a simplified version - for production, use a proper color manipulation library
  return baseColor;
};

/**
 * Get responsive value based on breakpoint
 */
export const responsive = (values: Partial<Record<keyof typeof breakpoints, string>>): string => {
  return Object.entries(values)
    .map(
      ([breakpoint, value]) =>
        `@media (min-width: ${breakpoints[breakpoint as keyof typeof breakpoints]}) { ${value} }`
    )
    .join(' ');
};

// ============================================================================
// THEME OBJECT (Complete Export)
// ============================================================================

export const theme = {
  colors,
  gradients,
  shadows,
  effects,
  spacing,
  borderRadius,
  typography,
  animations,
  zIndex,
  breakpoints,
  components,
  // Utility functions
  utils: {
    rgba,
    getTradingColor,
    getAssetTypeColor,
    createHoverState,
    responsive,
  },
} as const;

export type Theme = typeof theme;

export default theme;
