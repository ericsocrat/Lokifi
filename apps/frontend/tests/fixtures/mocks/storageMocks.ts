/**
 * Create a mock localStorage/sessionStorage implementation for testing
 */
export const createStorageMock = () => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
    get length() {
      return Object.keys(store).length;
    },
    key: (index: number) => Object.keys(store)[index] || null,
  };
};

/**
 * Mock localStorage for tests
 */
export const mockLocalStorage = createStorageMock();

/**
 * Mock sessionStorage for tests
 */
export const mockSessionStorage = createStorageMock();

/**
 * Setup storage mocks in global scope
 */
export const setupStorageMocks = () => {
  Object.defineProperty(global, 'localStorage', {
    value: createStorageMock(),
    writable: true,
  });

  Object.defineProperty(global, 'sessionStorage', {
    value: createStorageMock(),
    writable: true,
  });
};

/**
 * Clear all storage mocks
 */
export const clearStorageMocks = () => {
  global.localStorage?.clear();
  global.sessionStorage?.clear();
};
