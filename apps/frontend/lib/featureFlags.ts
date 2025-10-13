/**
 * Typed feature flag system for Lokifi
 * All Part G enhancements are gated behind these flags (default: OFF)
 */

export interface FeatureFlags {
  // Part G - Enhancements (all OFF by default)
  multiChart: boolean;
  watchlist: boolean;
  screener: boolean;
  corpActions: boolean;
  templates: boolean;
  imgExport: boolean;
  alertsV2: boolean;
  backtester: boolean;
  providerReliability: boolean;
  social: boolean;
  paperTrading: boolean;
  observability: boolean;
  mobileA11y: boolean;
  performance: boolean;
  monitoring: boolean;
  rollback: boolean;
  progressiveDeployment: boolean;
  environmentManagement: boolean;
  configurationSync: boolean;
  integrationTesting: boolean;
  otel: boolean;
  visualRegression: boolean;
  firstRunTour: boolean;
}

// Environment variable mappings
const ENV_FLAGS = {
  multiChart: process.env.NEXT_PUBLIC_FLAG_MULTI_CHART === '1',
  watchlist: process.env.NEXT_PUBLIC_FLAG_WATCHLIST === '1',
  screener: process.env.NEXT_PUBLIC_FLAG_SCREENER === '1',
  corpActions: process.env.NEXT_PUBLIC_FLAG_CORP_ACTIONS === '1',
  templates: process.env.NEXT_PUBLIC_FLAG_TEMPLATES === '1',
  imgExport: process.env.NEXT_PUBLIC_FLAG_IMG_EXPORT === '1',
  alertsV2: process.env.NEXT_PUBLIC_FLAG_ALERTS_V2 === '1',
  backtester: process.env.NEXT_PUBLIC_FLAG_BACKTESTER === '1',
  providerReliability: process.env.NEXT_PUBLIC_FLAG_PROVIDER_RELIABILITY === '1',
  social: process.env.NEXT_PUBLIC_FLAG_SOCIAL === '1',
  paperTrading: process.env.NEXT_PUBLIC_FLAG_PAPER_TRADING === '1',
  observability: process.env.NEXT_PUBLIC_FLAG_OBSERVABILITY === '1',
  mobileA11y: process.env.NEXT_PUBLIC_FLAG_MOBILE_A11Y === '1',
  performance: process.env.NEXT_PUBLIC_FLAG_PERFORMANCE === '1',
  monitoring: process.env.NEXT_PUBLIC_FLAG_MONITORING === '1',
  rollback: process.env.NEXT_PUBLIC_FLAG_ROLLBACK === '1',
  progressiveDeployment: process.env.NEXT_PUBLIC_FLAG_PROGRESSIVE_DEPLOYMENT === '1',
  environmentManagement: process.env.NEXT_PUBLIC_FLAG_ENVIRONMENT_MANAGEMENT === '1',
  configurationSync: process.env.NEXT_PUBLIC_FLAG_CONFIGURATION_SYNC === '1',
  integrationTesting: process.env.NEXT_PUBLIC_FLAG_INTEGRATION_TESTING === '1',
  otel: process.env.NEXT_PUBLIC_FLAG_OTEL === '1',
  visualRegression: process.env.NEXT_PUBLIC_FLAG_VISUAL_REGRESSION === '1',
  firstRunTour: process.env.NEXT_PUBLIC_FLAG_FIRST_RUN_TOUR === '1',
} as const;

// Default flags (all enhancements OFF)
const DEFAULT_FLAGS: FeatureFlags = {
  multiChart: false,
  watchlist: false,
  screener: false,
  corpActions: false,
  templates: false,
  imgExport: false,
  alertsV2: false,
  backtester: false,
  providerReliability: false,
  social: false,
  paperTrading: false,
  observability: false,
  mobileA11y: false,
  performance: false,
  monitoring: false,
  rollback: false,
  progressiveDeployment: false,
  environmentManagement: false,
  configurationSync: false,
  integrationTesting: false,
  otel: false,
  visualRegression: false,
  firstRunTour: false,
};

// Remote config support (optional Redis override)
let remoteFlags: Partial<FeatureFlags> = {};

export function setRemoteFlags(flags: Partial<FeatureFlags>) {
  remoteFlags = { ...flags };
}

// Typed flag getters
export const FLAGS: FeatureFlags = new Proxy(DEFAULT_FLAGS, {
  get(target, prop: keyof FeatureFlags) {
    // Priority: Remote config > Environment > Default
    return remoteFlags[prop] ?? ENV_FLAGS[prop] ?? target[prop];
  },
});

// Helper functions
export function isFeatureEnabled(flag: keyof FeatureFlags): boolean {
  return FLAGS[flag];
}

export function getAllFlags(): FeatureFlags {
  const result = {} as FeatureFlags;
  for (const key in DEFAULT_FLAGS) {
    result[key as keyof FeatureFlags] = FLAGS[key as keyof FeatureFlags];
  }
  return result;
}

// Dev-only utilities
export function setDevFlag(flag: keyof FeatureFlags, enabled: boolean) {
  if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
    remoteFlags[flag] = enabled;
  }
}
