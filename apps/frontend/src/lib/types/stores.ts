/* istanbul ignore file */
/**
 * Shared type definitions for Zustand stores
 * Created: Sprint 2, Session 14 - TypeScript Type Safety
 * Purpose: Eliminate 'any' types and establish reusable patterns
 */

import type { Draft } from 'immer';

// ============================================================================
// Base Store Patterns
// ============================================================================

/**
 * Base state interface that all stores should extend
 * Provides common loading, error, and metadata properties
 */
export interface BaseStoreState {
  isLoading: boolean;
  error: string | null;
  lastUpdated: Date | null;
}

/**
 * Common action types for store mutations
 */
export type StoreAction<T> = (state: T) => Partial<T> | void;
export type AsyncStoreAction<T> = (state: T) => Promise<Partial<T> | void>;

/**
 * Generic update function type for store actions
 */
export type UpdateFunction<T> = (updater: Partial<T> | StoreAction<T>) => void;

// ============================================================================
// Immer Integration
// ============================================================================

/**
 * Proper typing for Zustand stores using Immer middleware
 * Use this to type your store creator function
 *
 * Example:
 * ```typescript
 * export const useMyStore = create<MyStore>()(
 *   immer((set, get) => ({
 *     // State
 *     data: [],
 *
 *     // Actions
 *     updateData: () => {
 *       set((draft: Draft<MyStore>) => {
 *         draft.data = newData;
 *       });
 *     }
 *   }))
 * );
 * ```
 */
export type ImmerStateCreator<T> = (
  set: (fn: (draft: Draft<T>) => void) => void,
  get: () => T
) => T;

/**
 * Helper type for Immer set function
 */
export type ImmerSet<T> = (fn: (draft: Draft<T>) => void) => void;

/**
 * Helper type for Immer get function
 */
export type ImmerGet<T> = () => T;

// ============================================================================
// Common Data Fetching Patterns
// ============================================================================

/**
 * Generic fetch state for data loading operations
 * Includes data, loading state, error handling, and reset capability
 */
export interface FetchState<T> {
  data: T | null;
  isLoading: boolean;
  error: string | null;
  fetchData: () => Promise<void>;
  reset: () => void;
}

/**
 * Paginated fetch state for list data
 */
export interface PaginatedFetchState<T> extends FetchState<T[]> {
  page: number;
  pageSize: number;
  totalPages: number;
  totalItems: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  goToPage: (page: number) => void;
  nextPage: () => void;
  previousPage: () => void;
}

// ============================================================================
// UI State Patterns
// ============================================================================

/**
 * Pagination state for UI components
 */
export interface PaginationState {
  page: number;
  pageSize: number;
  totalPages: number;
  totalItems: number;
}

/**
 * Filter state with typed filters
 * @template T - Type of the filter object
 */
export interface FilterState<T> {
  filters: T;
  setFilter: <K extends keyof T>(key: K, value: T[K]) => void;
  resetFilters: () => void;
}

/**
 * Sort state for sortable lists
 */
export interface SortState<T extends string = string> {
  sortBy: T;
  sortOrder: 'asc' | 'desc';
  setSortBy: (field: T) => void;
  toggleSortOrder: () => void;
}

/**
 * Selection state for selectable items
 */
export interface SelectionState<T = string> {
  selectedIds: Set<T>;
  selectItem: (id: T) => void;
  deselectItem: (id: T) => void;
  toggleItem: (id: T) => void;
  selectAll: (ids: T[]) => void;
  deselectAll: () => void;
  isSelected: (id: T) => boolean;
}

// ============================================================================
// Time Range Patterns (for monitoring, analytics, etc.)
// ============================================================================

/**
 * Common time range options for data visualization
 */
export type TimeRange = '1h' | '24h' | '7d' | '30d' | '90d' | '1y' | 'custom';

/**
 * Time range state with custom range support
 */
export interface TimeRangeState {
  timeRange: TimeRange;
  customStart: Date | null;
  customEnd: Date | null;
  setTimeRange: (range: TimeRange) => void;
  setCustomRange: (start: Date, end: Date) => void;
}

// ============================================================================
// WebSocket/Real-time Data Patterns
// ============================================================================

/**
 * WebSocket connection state
 */
export type ConnectionState =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'error';

/**
 * Real-time data state with connection management
 */
export interface RealtimeState {
  connectionState: ConnectionState;
  lastMessageTime: Date | null;
  reconnectAttempts: number;
  maxReconnectAttempts: number;
}

// ============================================================================
// Form State Patterns
// ============================================================================

/**
 * Form field state with validation
 */
export interface FormFieldState<T = string> {
  value: T;
  error: string | null;
  touched: boolean;
  dirty: boolean;
}

/**
 * Generic form state
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Form values can be any type
export interface FormState<T extends Record<string, any>> {
  fields: { [K in keyof T]: FormFieldState<T[K]> };
  isValid: boolean;
  isSubmitting: boolean;
  submitError: string | null;
  setField: <K extends keyof T>(field: K, value: T[K]) => void;
  setFieldError: <K extends keyof T>(field: K, error: string | null) => void;
  touchField: <K extends keyof T>(field: K) => void;
  reset: () => void;
  submit: () => Promise<void>;
}

// ============================================================================
// Notification/Alert Patterns
// ============================================================================

/**
 * Alert severity levels
 */
export type AlertSeverity = 'info' | 'success' | 'warning' | 'error' | 'critical';

/**
 * Alert/notification item
 */
export interface Alert {
  id: string;
  severity: AlertSeverity;
  message: string;
  timestamp: Date;
  read: boolean;
  dismissed: boolean;
}

/**
 * Alert state management
 */
export interface AlertState {
  alerts: Alert[];
  unreadCount: number;
  addAlert: (alert: Omit<Alert, 'id' | 'timestamp' | 'read' | 'dismissed'>) => void;
  markAsRead: (id: string) => void;
  dismiss: (id: string) => void;
  clearAll: () => void;
}

// ============================================================================
// Type Guards and Utilities
// ============================================================================

/**
 * Type guard to check if an error is an Error object
 */
export function isError(error: unknown): error is Error {
  return error instanceof Error;
}

/**
 * Extract error message from unknown error type
 */
export function getErrorMessage(error: unknown): string {
  if (isError(error)) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'An unknown error occurred';
}

/**
 * Type-safe Object.keys that preserves key types
 */
export function typedKeys<T extends object>(obj: T): Array<keyof T> {
  return Object.keys(obj) as Array<keyof T>;
}
