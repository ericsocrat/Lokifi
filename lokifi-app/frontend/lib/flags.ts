
// lib/flags.ts - Feature flag definitions
export const FEATURE_FLAGS = {
  EXPERIMENTAL_PLUGINS: process.env.NEXT_PUBLIC_FEATURE_EXPERIMENTAL_PLUGINS === 'true',
  MULTI_CHART_LAYOUT: process.env.NEXT_PUBLIC_FEATURE_MULTI_CHART === 'true',
  WATCHLIST_SCREENER: process.env.NEXT_PUBLIC_FEATURE_WATCHLIST === 'true',
  SOCIAL_FEATURES: process.env.NEXT_PUBLIC_FEATURE_SOCIAL === 'true',
  PAPER_TRADING: process.env.NEXT_PUBLIC_FEATURE_PAPER_TRADING === 'true',
  ADVANCED_ALERTS: process.env.NEXT_PUBLIC_FEATURE_ADVANCED_ALERTS === 'true',
  STRATEGY_BACKTESTER: process.env.NEXT_PUBLIC_FEATURE_BACKTESTER === 'true',
} as const;

// Legacy exports for backward compatibility
export const EXPERIMENTAL_PLUGINS = process.env.NEXT_PUBLIC_EXPERIMENTAL_PLUGINS === "false"
  ? false
  : true; // default on for demo
