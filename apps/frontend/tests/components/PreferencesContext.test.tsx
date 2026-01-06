import { act, render, renderHook, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { PreferencesProvider, usePreferences } from '@/components/dashboard/PreferencesContext';

// Mock localStorage
const createLocalStorageMock = () => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
    get store() {
      return store;
    },
  };
};

let localStorageMock = createLocalStorageMock();
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

describe('PreferencesContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Create fresh localStorage mock for each test
    localStorageMock = createLocalStorageMock();
    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock,
      writable: true,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('PreferencesProvider', () => {
    it('should provide default values', () => {
      const { result } = renderHook(() => usePreferences(), {
        wrapper: PreferencesProvider,
      });

      expect(result.current.darkMode).toBe(true);
      expect(result.current.currency).toBe('USD');
    });

    it('should load darkMode from localStorage', async () => {
      localStorageMock.store['darkMode'] = 'false';

      const { result } = renderHook(() => usePreferences(), {
        wrapper: PreferencesProvider,
      });

      // Wait for the useEffect to load from localStorage
      await waitFor(() => {
        expect(result.current.darkMode).toBe(false);
      });
    });

    it('should load currency from localStorage', async () => {
      localStorageMock.store['currency'] = 'EUR';

      const { result } = renderHook(() => usePreferences(), {
        wrapper: PreferencesProvider,
      });

      // Wait for the useEffect to load from localStorage
      await waitFor(() => {
        expect(result.current.currency).toBe('EUR');
      });
    });

    it('should update darkMode', () => {
      const { result } = renderHook(() => usePreferences(), {
        wrapper: PreferencesProvider,
      });

      act(() => {
        result.current.setDarkMode(false);
      });

      expect(result.current.darkMode).toBe(false);
    });

    it('should update currency', () => {
      const { result } = renderHook(() => usePreferences(), {
        wrapper: PreferencesProvider,
      });

      act(() => {
        result.current.setCurrency('GBP');
      });

      expect(result.current.currency).toBe('GBP');
    });

    it('should save darkMode to localStorage', async () => {
      const { result } = renderHook(() => usePreferences(), {
        wrapper: PreferencesProvider,
      });

      act(() => {
        result.current.setDarkMode(false);
      });

      await waitFor(() => {
        expect(localStorageMock.setItem).toHaveBeenCalledWith('darkMode', 'false');
      });
    });

    it('should save currency to localStorage', async () => {
      const { result } = renderHook(() => usePreferences(), {
        wrapper: PreferencesProvider,
      });

      act(() => {
        result.current.setCurrency('EUR');
      });

      await waitFor(() => {
        expect(localStorageMock.setItem).toHaveBeenCalledWith('currency', 'EUR');
      });
    });

    it('should render children', () => {
      render(
        <PreferencesProvider>
          <div data-testid="child">Child Content</div>
        </PreferencesProvider>
      );

      expect(screen.getByTestId('child')).toBeInTheDocument();
    });
  });

  describe('usePreferences Hook', () => {
    it('should throw error when used outside provider', () => {
      // Suppress console.error for this test
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        renderHook(() => usePreferences());
      }).toThrow('usePreferences must be used within a PreferencesProvider');

      consoleSpy.mockRestore();
    });

    it('should return all context values', () => {
      const { result } = renderHook(() => usePreferences(), {
        wrapper: PreferencesProvider,
      });

      expect(result.current).toHaveProperty('darkMode');
      expect(result.current).toHaveProperty('setDarkMode');
      expect(result.current).toHaveProperty('currency');
      expect(result.current).toHaveProperty('setCurrency');
    });

    it('should have functions as setters', () => {
      const { result } = renderHook(() => usePreferences(), {
        wrapper: PreferencesProvider,
      });

      expect(typeof result.current.setDarkMode).toBe('function');
      expect(typeof result.current.setCurrency).toBe('function');
    });
  });

  describe('Integration', () => {
    function TestComponent() {
      const { darkMode, setDarkMode, currency, setCurrency } = usePreferences();
      return (
        <div>
          <span data-testid="darkMode">{String(darkMode)}</span>
          <span data-testid="currency">{currency}</span>
          <button onClick={() => setDarkMode(!darkMode)}>Toggle Dark Mode</button>
          <button onClick={() => setCurrency('EUR')}>Set EUR</button>
        </div>
      );
    }

    it('should update UI when darkMode toggled', async () => {
      const user = userEvent.setup();
      render(
        <PreferencesProvider>
          <TestComponent />
        </PreferencesProvider>
      );

      const darkModeElement = screen.getByTestId('darkMode');
      const initialValue = darkModeElement.textContent;

      await user.click(screen.getByText('Toggle Dark Mode'));

      // After toggle, value should be opposite
      await waitFor(() => {
        const newValue = screen.getByTestId('darkMode').textContent;
        expect(newValue).not.toBe(initialValue);
      });
    });

    it('should update UI when currency changes via button', async () => {
      const user = userEvent.setup();
      render(
        <PreferencesProvider>
          <TestComponent />
        </PreferencesProvider>
      );

      await user.click(screen.getByText('Set EUR'));

      await waitFor(() => {
        expect(screen.getByTestId('currency')).toHaveTextContent('EUR');
      });
    });

    it('should allow multiple toggles', async () => {
      const user = userEvent.setup();
      render(
        <PreferencesProvider>
          <TestComponent />
        </PreferencesProvider>
      );

      const darkModeElement = screen.getByTestId('darkMode');
      const initialValue = darkModeElement.textContent;

      // Toggle twice
      await user.click(screen.getByText('Toggle Dark Mode'));
      await user.click(screen.getByText('Toggle Dark Mode'));

      // Should be back to initial value
      await waitFor(() => {
        expect(screen.getByTestId('darkMode').textContent).toBe(initialValue);
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty localStorage gracefully', () => {
      const { result } = renderHook(() => usePreferences(), {
        wrapper: PreferencesProvider,
      });

      expect(result.current.darkMode).toBe(true); // Default
      expect(result.current.currency).toBe('USD'); // Default
    });

    it('should handle invalid darkMode value in localStorage', async () => {
      localStorageMock.store['darkMode'] = 'invalid';

      const { result } = renderHook(() => usePreferences(), {
        wrapper: PreferencesProvider,
      });

      // 'invalid' === 'true' is false
      await waitFor(() => {
        expect(result.current.darkMode).toBe(false);
      });
    });

    it('should handle null currency in localStorage', () => {
      localStorageMock.store['currency'] = '';

      const { result } = renderHook(() => usePreferences(), {
        wrapper: PreferencesProvider,
      });

      // Empty string is falsy, so default is used
      expect(result.current.currency).toBe('USD');
    });
  });
});
