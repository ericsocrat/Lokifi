/**
 * Store Testing Utilities
 *
 * Helper functions for testing Zustand stores with proper cleanup and mocking.
 */
import { act } from '@testing-library/react';
import type { StoreApi, UseBoundStore } from 'zustand';

/**
 * Creates a mock Zustand store for testing
 * @param initialState - Initial state for the mock store
 * @returns Mock store with state and actions
 */
export function createMockStore<T extends object>(initialState: T) {
  let state = { ...initialState };
  const listeners = new Set<(state: T) => void>();

  const store = {
    getState: () => state,
    setState: (partial: Partial<T> | ((state: T) => Partial<T>)) => {
      const updates = typeof partial === 'function' ? partial(state) : partial;
      state = { ...state, ...updates };
      listeners.forEach((listener) => listener(state));
    },
    subscribe: (listener: (state: T) => void) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    destroy: () => {
      listeners.clear();
    },
  };

  return store;
}

/**
 * Resets a Zustand store to its initial state
 * @param store - The Zustand store to reset
 * @param initialState - The initial state to reset to
 */
export function resetStore<T extends object>(store: UseBoundStore<StoreApi<T>>, initialState: T) {
  act(() => {
    store.setState(initialState as any, true); // true = replace entire state
  });
}

/**
 * Waits for a store to update with a specific condition
 * @param store - The Zustand store to watch
 * @param condition - Function that returns true when condition is met
 * @param timeout - Maximum time to wait in ms (default: 5000)
 * @returns Promise that resolves when condition is met
 */
export async function waitForStoreUpdate<T extends object>(
  store: UseBoundStore<StoreApi<T>>,
  condition: (state: T) => boolean,
  timeout = 5000
): Promise<void> {
  return new Promise((resolve, reject) => {
    // Check if condition is already met
    if (condition(store.getState())) {
      resolve();
      return;
    }

    const timeoutId = setTimeout(() => {
      unsubscribe();
      reject(new Error(`Store condition not met within ${timeout}ms`));
    }, timeout);

    const unsubscribe = store.subscribe((state) => {
      if (condition(state)) {
        clearTimeout(timeoutId);
        unsubscribe();
        resolve();
      }
    });
  });
}

/**
 * Captures all state updates during an action
 * @param store - The Zustand store to watch
 * @param action - Function that triggers state updates
 * @returns Array of all state snapshots
 */
export async function captureStoreUpdates<T extends object>(
  store: UseBoundStore<StoreApi<T>>,
  action: () => void | Promise<void>
): Promise<T[]> {
  const snapshots: T[] = [];

  const unsubscribe = store.subscribe((state) => {
    snapshots.push({ ...state });
  });

  try {
    await act(async () => {
      await action();
    });
  } finally {
    unsubscribe();
  }

  return snapshots;
}

/**
 * Creates a spy for store actions to track calls
 * @param store - The Zustand store
 * @param actionName - Name of the action to spy on
 * @returns Spy object with call tracking
 */
export function spyOnStoreAction<T extends object, K extends keyof T>(
  store: UseBoundStore<StoreApi<T>>,
  actionName: K
) {
  const calls: any[][] = [];
  const originalAction = store.getState()[actionName];

  if (typeof originalAction !== 'function') {
    throw new Error(`${String(actionName)} is not a function in the store`);
  }

  const spy = (...args: any[]) => {
    calls.push(args);
    return (originalAction as any)(...args);
  };

  // Replace the action temporarily
  store.setState({ [actionName]: spy } as any);

  return {
    calls,
    callCount: () => calls.length,
    calledWith: (...args: any[]) =>
      calls.some((call) => JSON.stringify(call) === JSON.stringify(args)),
    restore: () => {
      store.setState({ [actionName]: originalAction } as any);
    },
  };
}

/**
 * Mocks localStorage for stores using persist middleware
 * @returns Object with mock functions and helper to restore
 */
export function mockLocalStorage() {
  const storage: Record<string, string> = {};

  const mock = {
    getItem: (key: string) => storage[key] ?? null,
    setItem: (key: string, value: string) => {
      storage[key] = value;
    },
    removeItem: (key: string) => {
      delete storage[key];
    },
    clear: () => {
      Object.keys(storage).forEach((key) => delete storage[key]);
    },
    get length() {
      return Object.keys(storage).length;
    },
    key: (index: number) => Object.keys(storage)[index] ?? null,
    getStorage: () => ({ ...storage }),
  };

  // Store original localStorage
  const originalLocalStorage = global.localStorage;

  // Replace localStorage
  Object.defineProperty(global, 'localStorage', {
    value: mock,
    writable: true,
  });

  return {
    ...mock,
    restore: () => {
      Object.defineProperty(global, 'localStorage', {
        value: originalLocalStorage,
        writable: true,
      });
    },
  };
}

/**
 * Asserts that a store state matches expected partial state
 * @param store - The Zustand store
 * @param expected - Expected partial state
 */
export function assertStoreState<T extends object>(
  store: UseBoundStore<StoreApi<T>>,
  expected: Partial<T>
) {
  const actual = store.getState();

  Object.entries(expected).forEach(([key, value]) => {
    const actualValue = (actual as any)[key];

    if (JSON.stringify(actualValue) !== JSON.stringify(value)) {
      throw new Error(
        `Store state mismatch for "${key}":\n` +
          `  Expected: ${JSON.stringify(value)}\n` +
          `  Actual: ${JSON.stringify(actualValue)}`
      );
    }
  });
}

/**
 * Example usage patterns
 *
 * @example Basic store reset
 * ```typescript
 * beforeEach(() => {
 *   resetStore(useMyStore, INITIAL_STATE);
 * });
 * ```
 *
 * @example Wait for async store update
 * ```typescript
 * await waitForStoreUpdate(
 *   useMyStore,
 *   (state) => state.loading === false,
 *   3000
 * );
 * ```
 *
 * @example Spy on store actions
 * ```typescript
 * const spy = spyOnStoreAction(useMyStore, 'fetchData');
 * await useMyStore.getState().fetchData();
 * expect(spy.callCount()).toBe(1);
 * spy.restore();
 * ```
 *
 * @example Mock localStorage
 * ```typescript
 * const storage = mockLocalStorage();
 * // ... run tests
 * storage.restore();
 * ```
 */
