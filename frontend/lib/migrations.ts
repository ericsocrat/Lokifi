/**
 * Versioned schema system for client-side state persistence
 * All persisted state carries { schemaVersion } for safe migrations
 */

export const CURRENT_SCHEMA_VERSION = 1;

export interface VersionedState {
  schemaVersion: number;
  data: unknown;
}

export interface MigrationFunction<From = unknown, To = unknown> {
  (state: From): To;
}

export interface StateMigrations {
  [version: number]: MigrationFunction;
}

// Base versioned state interfaces
export interface LayoutState extends VersionedState {
  data: {
    panes: Array<{
      id: string;
      type: 'price' | 'indicator';
      height: number;
      indicators: string[];
      visible: boolean;
      locked: boolean;
    }>;
    layout: '1x1' | '1x2' | '2x2';
    linkedDimensions: {
      symbol: boolean;
      timeframe: boolean;
      cursor: boolean;
    };
  };
}

export interface DrawingsState extends VersionedState {
  data: {
    objects: Array<{
      id: string;
      type: string;
      paneId: string;
      points: Array<{ x: number; y: number; time?: string | number; price?: number }>;
      style: Record<string, unknown>;
      properties: Record<string, unknown>;
    }>;
  };
}

export interface IndicatorState extends VersionedState {
  data: {
    indicators: Array<{
      id: string;
      name: string;
      paneId: string;
      settings: Record<string, unknown>;
      isVisible: boolean;
    }>;
  };
}

export interface WatchlistState extends VersionedState {
  data: {
    lists: Array<{
      id: string;
      name: string;
      symbols: string[];
      order: number;
    }>;
  };
}

export interface AlertsState extends VersionedState {
  data: {
    alerts: Array<{
      id: string;
      symbol: string;
      condition: Record<string, unknown>;
      enabled: boolean;
      createdAt: number;
    }>;
  };
}

export interface PortfolioState extends VersionedState {
  data: {
    positions: Array<{
      symbol: string;
      quantity: number;
      averagePrice: number;
      unrealizedPnL: number;
    }>;
    orders: Array<{
      id: string;
      symbol: string;
      side: 'buy' | 'sell';
      type: 'market' | 'limit' | 'stop';
      quantity: number;
      price?: number;
      status: 'pending' | 'filled' | 'cancelled';
    }>;
    balance: number;
  };
}

// Migration registry
const MIGRATIONS: Record<string, StateMigrations> = {
  layout: {},
  drawings: {},
  indicators: {},
  watchlist: {},
  alerts: {},
  portfolio: {},
};

/**
 * Register a migration for a specific state type and version
 */
export function registerMigration(
  stateType: string,
  fromVersion: number,
  migration: MigrationFunction
) {
  if (!MIGRATIONS[stateType]) {
    MIGRATIONS[stateType] = {};
  }
  MIGRATIONS[stateType][fromVersion] = migration;
}

/**
 * Migrate state from any version to current
 */
export function migrateState<T extends VersionedState>(
  stateType: string,
  state: VersionedState
): T {
  if (!state || typeof state !== 'object' || typeof state.schemaVersion !== 'number') {
    throw new Error(`Invalid state format for ${stateType}`);
  }

  let currentState = { ...state };
  const migrations = MIGRATIONS[stateType] || {};

  // Apply migrations sequentially
  while (currentState.schemaVersion < CURRENT_SCHEMA_VERSION) {
    const migration = migrations[currentState.schemaVersion];
    if (!migration) {
      throw new Error(
        `No migration found for ${stateType} from version ${currentState.schemaVersion} to ${currentState.schemaVersion + 1}`
      );
    }

    currentState = {
      schemaVersion: currentState.schemaVersion + 1,
      data: migration(currentState.data),
    };
  }

  return currentState as T;
}

/**
 * Migrate all state types
 */
export function migrateAll(allState: Record<string, VersionedState>): Record<string, VersionedState> {
  const migrated: Record<string, VersionedState> = {};

  for (const [stateType, state] of Object.entries(allState)) {
    try {
      migrated[stateType] = migrateState(stateType, state);
    } catch (error) {
      console.warn(`Failed to migrate ${stateType}:`, error);
      // Preserve original state if migration fails
      migrated[stateType] = state;
    }
  }

  return migrated;
}

/**
 * Create initial versioned state
 */
export function createVersionedState<T>(data: T): VersionedState {
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    data,
  };
}

/**
 * Check if state needs migration
 */
export function needsMigration(state: VersionedState): boolean {
  return state.schemaVersion < CURRENT_SCHEMA_VERSION;
}

/**
 * Get migration path for a state
 */
export function getMigrationPath(stateType: string, fromVersion: number): number[] {
  const path: number[] = [];
  const migrations = MIGRATIONS[stateType] || {};

  for (let version = fromVersion; version < CURRENT_SCHEMA_VERSION; version++) {
    if (migrations[version]) {
      path.push(version);
    } else {
      throw new Error(`Missing migration for ${stateType} from version ${version}`);
    }
  }

  return path;
}