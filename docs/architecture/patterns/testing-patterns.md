# 🧪 Lokifi Testing Patterns

> **Extracted from 7,800+ frontend tests across 132+ sessions**
> 
> These patterns are implementation-agnostic and will survive a frontend rewrite.

---

## Quick Reference

| Pattern | Use When | Survives Rewrite? |
|---------|----------|-------------------|
| [Component Test](#1-component-test-pattern) | Testing React components | ❌ Needs rewrite |
| [Store Test](#2-store-test-pattern) | Testing Zustand/state stores | ⚠️ If same state lib |
| [Utility Test](#3-utility-function-test-pattern) | Testing pure functions | ✅ Yes |
| [API Client Test](#4-api-client-test-pattern) | Testing fetch/axios wrappers | ✅ Yes |
| [Hook Test](#5-hook-test-pattern) | Testing custom React hooks | ❌ Needs rewrite |
| [E2E Test](#6-e2e-test-pattern) | Testing user flows | ⚠️ Partial |
| [Security Test](#7-security-test-pattern) | Testing input validation | ✅ Yes |

---

## 1. Component Test Pattern

**Use for:** React components with props, state, and user interactions

```typescript
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// 1️⃣ Mock dependencies BEFORE importing component
const mockCallback = vi.fn();

vi.mock('@/components/SomeDependency', () => ({
  useSomething: () => ({
    action: mockCallback,
  }),
}));

// 2️⃣ Import component AFTER mocks
import { MyComponent } from '@/components/MyComponent';

describe('MyComponent', () => {
  const defaultProps = {
    onClose: vi.fn(),
    initialValue: 'default',
  };

  // 3️⃣ Reset mocks before each test
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // 4️⃣ Group tests by behavior category
  describe('Rendering', () => {
    it('should render with default props', () => {
      render(<MyComponent {...defaultProps} />);
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('should render with custom initial value', () => {
      render(<MyComponent {...defaultProps} initialValue="custom" />);
      expect(screen.getByText('custom')).toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    it('should handle click events', async () => {
      const user = userEvent.setup();
      render(<MyComponent {...defaultProps} />);

      await user.click(screen.getByRole('button'));

      expect(defaultProps.onClose).toHaveBeenCalled();
    });

    it('should handle form submission', async () => {
      const user = userEvent.setup();
      render(<MyComponent {...defaultProps} />);

      await user.type(screen.getByPlaceholderText('Enter value...'), 'test');
      fireEvent.submit(document.querySelector('form')!);

      await waitFor(() => {
        expect(mockCallback).toHaveBeenCalledWith('test');
      });
    });
  });

  describe('Validation', () => {
    it('should show error for invalid input', async () => {
      const user = userEvent.setup();
      render(<MyComponent {...defaultProps} />);

      await user.type(screen.getByPlaceholderText('Email...'), 'invalid');
      fireEvent.submit(document.querySelector('form')!);

      await waitFor(() => {
        expect(screen.getByText('Invalid email')).toBeInTheDocument();
      });
    });
  });

  describe('Loading States', () => {
    it('should show loading during async operation', async () => {
      // Use a promise that we control
      let resolvePromise: () => void;
      mockCallback.mockImplementation(
        () => new Promise((resolve) => { resolvePromise = resolve; })
      );

      const user = userEvent.setup();
      render(<MyComponent {...defaultProps} />);
      
      await user.click(screen.getByRole('button', { name: 'Submit' }));

      expect(screen.getByText('Loading...')).toBeInTheDocument();

      resolvePromise!();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      render(<MyComponent {...defaultProps} />);
      expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'true');
    });

    it('should have required attribute on mandatory fields', () => {
      render(<MyComponent {...defaultProps} />);
      expect(screen.getByPlaceholderText('Email...')).toBeRequired();
    });
  });
});
```

---

## 2. Store Test Pattern

**Use for:** Zustand, Jotai, or any state management

```typescript
import { useMyStore } from '@/lib/stores/myStore';
import { enableMapSet } from 'immer';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Enable Immer plugins if using Map/Set
enableMapSet();

// Mock feature flags if needed
vi.mock('@/lib/stores/featureFlags', () => ({
  FLAGS: { featureX: true },
}));

describe('myStore', () => {
  // 1️⃣ Reset store state before each test
  beforeEach(() => {
    useMyStore.setState({
      items: [],
      isLoading: false,
      error: null,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // 2️⃣ Test initial state
  describe('Initial State', () => {
    it('should have empty items array', () => {
      const { items } = useMyStore.getState();
      expect(items).toEqual([]);
    });

    it('should not be loading by default', () => {
      const { isLoading } = useMyStore.getState();
      expect(isLoading).toBe(false);
    });
  });

  // 3️⃣ Test actions
  describe('Actions', () => {
    describe('addItem', () => {
      it('should add item with generated ID', () => {
        const { addItem } = useMyStore.getState();

        const id = addItem({ name: 'Test' });

        const { items } = useMyStore.getState();
        expect(id).toMatch(/^item_\d+$/);
        expect(items).toHaveLength(1);
        expect(items[0]).toMatchObject({ name: 'Test', id });
      });
    });

    describe('removeItem', () => {
      it('should remove item by ID', () => {
        const { addItem, removeItem } = useMyStore.getState();
        const id = addItem({ name: 'Test' });

        removeItem(id);

        const { items } = useMyStore.getState();
        expect(items).toHaveLength(0);
      });

      it('should handle non-existent ID gracefully', () => {
        const { removeItem } = useMyStore.getState();
        
        expect(() => removeItem('non-existent')).not.toThrow();
      });
    });
  });

  // 4️⃣ Test derived state / selectors
  describe('Selectors', () => {
    it('should return active items only', () => {
      useMyStore.setState({
        items: [
          { id: '1', name: 'Active', isActive: true },
          { id: '2', name: 'Inactive', isActive: false },
        ],
      });

      const { getActiveItems } = useMyStore.getState();
      const active = getActiveItems();

      expect(active).toHaveLength(1);
      expect(active[0].name).toBe('Active');
    });
  });

  // 5️⃣ Test async actions
  describe('Async Actions', () => {
    it('should set loading state during fetch', async () => {
      const { fetchItems } = useMyStore.getState();

      const fetchPromise = fetchItems();

      // Check loading state immediately
      expect(useMyStore.getState().isLoading).toBe(true);

      await fetchPromise;

      expect(useMyStore.getState().isLoading).toBe(false);
    });

    it('should handle fetch errors', async () => {
      // Mock fetch to fail
      vi.spyOn(global, 'fetch').mockRejectedValueOnce(new Error('Network error'));

      const { fetchItems } = useMyStore.getState();
      await fetchItems();

      const { error } = useMyStore.getState();
      expect(error).toBe('Network error');
    });
  });
});
```

---

## 3. Utility Function Test Pattern

**Use for:** Pure functions, validators, formatters, sanitizers

```typescript
import { describe, expect, it } from 'vitest';
import { myUtility } from '@/lib/utils/myUtility';

describe('myUtility', () => {
  // 1️⃣ Group by input categories
  describe('Valid Inputs', () => {
    it('should handle normal input', () => {
      expect(myUtility('normal')).toBe('NORMAL');
    });

    it('should handle numeric strings', () => {
      expect(myUtility('123')).toBe('123');
    });
  });

  // 2️⃣ Test edge cases
  describe('Edge Cases', () => {
    it('should handle empty string', () => {
      expect(myUtility('')).toBe('');
    });

    it('should handle null', () => {
      expect(myUtility(null)).toBe('<null>');
    });

    it('should handle undefined', () => {
      expect(myUtility(undefined)).toBe('<null>');
    });
  });

  // 3️⃣ Test security-related behavior
  describe('Security', () => {
    it('should sanitize control characters', () => {
      const malicious = 'test\n\r\t\x00';
      const result = myUtility(malicious);
      
      expect(result).not.toContain('\n');
      expect(result).not.toContain('\r');
    });

    it('should escape HTML entities', () => {
      const xss = '<script>alert("xss")</script>';
      const result = myUtility(xss);
      
      expect(result).not.toContain('<');
      expect(result).toContain('&lt;');
    });

    it('should truncate to prevent overflow', () => {
      const long = 'A'.repeat(1000);
      const result = myUtility(long, { maxLength: 100 });
      
      expect(result.length).toBeLessThanOrEqual(103); // 100 + '...'
    });
  });

  // 4️⃣ Test type coercion
  describe('Type Handling', () => {
    it('should convert numbers to strings', () => {
      expect(myUtility(123)).toBe('123');
    });

    it('should convert booleans', () => {
      expect(myUtility(true)).toBe('true');
    });

    it('should handle objects', () => {
      expect(myUtility({ key: 'value' })).toContain('[object Object]');
    });
  });
});
```

---

## 4. API Client Test Pattern

**Use for:** HTTP client wrappers, API services

```typescript
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { server } from '../../mocks/server';
import { APIClient } from '@/lib/api/apiClient';

const API_URL = 'http://localhost:8000';

describe('APIClient', () => {
  let client: APIClient;

  beforeEach(() => {
    vi.clearAllMocks();
    client = new APIClient(API_URL);
  });

  // 1️⃣ Test successful requests
  describe('getItems', () => {
    it('should fetch items successfully', async () => {
      const mockData = {
        success: true,
        data: [{ id: '1', name: 'Item 1' }],
        total: 1,
      };

      server.use(
        http.get(`${API_URL}/api/items`, () => {
          return HttpResponse.json(mockData);
        })
      );

      const result = await client.getItems();

      expect(result).toEqual(mockData);
      expect(result.data).toHaveLength(1);
    });

    it('should pass query parameters', async () => {
      server.use(
        http.get(`${API_URL}/api/items`, ({ request }) => {
          const url = new URL(request.url);
          expect(url.searchParams.get('type')).toBe('active');
          return HttpResponse.json({ data: [] });
        })
      );

      await client.getItems({ type: 'active' });
    });
  });

  // 2️⃣ Test error handling
  describe('Error Handling', () => {
    it('should handle 404 errors', async () => {
      server.use(
        http.get(`${API_URL}/api/items/:id`, () => {
          return new HttpResponse(null, { status: 404 });
        })
      );

      await expect(client.getItem('999')).rejects.toThrow('Not found');
    });

    it('should handle network errors', async () => {
      server.use(
        http.get(`${API_URL}/api/items`, () => {
          return HttpResponse.error();
        })
      );

      await expect(client.getItems()).rejects.toThrow();
    });

    it('should handle 500 errors', async () => {
      server.use(
        http.get(`${API_URL}/api/items`, () => {
          return new HttpResponse(null, { status: 500 });
        })
      );

      await expect(client.getItems()).rejects.toThrow('Server error');
    });
  });

  // 3️⃣ Test POST/PUT/DELETE
  describe('Mutations', () => {
    it('should create item', async () => {
      server.use(
        http.post(`${API_URL}/api/items`, async ({ request }) => {
          const body = await request.json();
          expect(body).toEqual({ name: 'New Item' });
          return HttpResponse.json({ id: '123', ...body });
        })
      );

      const result = await client.createItem({ name: 'New Item' });
      expect(result.id).toBe('123');
    });

    it('should delete item', async () => {
      server.use(
        http.delete(`${API_URL}/api/items/:id`, ({ params }) => {
          expect(params.id).toBe('123');
          return new HttpResponse(null, { status: 204 });
        })
      );

      await expect(client.deleteItem('123')).resolves.not.toThrow();
    });
  });
});
```

---

## 5. Hook Test Pattern

**Use for:** Custom React hooks

```typescript
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useMyHook } from '@/hooks/useMyHook';

// Helper for dispatching events
const dispatchKeyEvent = (key: string, options = {}) => {
  const event = new KeyboardEvent('keydown', {
    key,
    bubbles: true,
    ...options,
  });
  document.dispatchEvent(event);
  return event;
};

describe('useMyHook', () => {
  beforeEach(() => {
    // Setup before each test
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // 1️⃣ Test initial state
  it('should return initial values', () => {
    const { result } = renderHook(() => useMyHook());

    expect(result.current.value).toBe('default');
    expect(result.current.isActive).toBe(false);
  });

  // 2️⃣ Test state updates
  it('should update value when setValue called', () => {
    const { result } = renderHook(() => useMyHook());

    act(() => {
      result.current.setValue('new value');
    });

    expect(result.current.value).toBe('new value');
  });

  // 3️⃣ Test event handlers
  describe('Keyboard Shortcuts', () => {
    const shortcuts = [
      { key: 'a', expected: 'action-a' },
      { key: 'b', expected: 'action-b' },
    ];

    it.each(shortcuts)(
      'should trigger "$expected" when "$key" is pressed',
      ({ key, expected }) => {
        const { result, unmount } = renderHook(() => useMyHook());

        act(() => {
          dispatchKeyEvent(key);
        });

        expect(result.current.lastAction).toBe(expected);

        unmount(); // Clean up event listeners
      }
    );
  });

  // 4️⃣ Test cleanup
  it('should clean up on unmount', () => {
    const removeEventListenerSpy = vi.spyOn(document, 'removeEventListener');
    const { unmount } = renderHook(() => useMyHook());

    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalled();
  });

  // 5️⃣ Test with dependencies
  it('should update when dependencies change', () => {
    const { result, rerender } = renderHook(
      ({ dep }) => useMyHook(dep),
      { initialProps: { dep: 'initial' } }
    );

    expect(result.current.computedValue).toBe('initial-computed');

    rerender({ dep: 'updated' });

    expect(result.current.computedValue).toBe('updated-computed');
  });
});
```

---

## 6. E2E Test Pattern

**Use for:** Full user flow testing with Playwright

```typescript
import { expect, test } from '@playwright/test';

test.describe('User Flow: Create Item', () => {
  // 1️⃣ Setup: Mock APIs if needed
  test.beforeEach(async ({ page }) => {
    // Mock API responses
    await page.route('**/api/items', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: [] }),
      });
    });

    // Navigate to page
    await page.goto('/items');
    await page.waitForLoadState('networkidle');
  });

  // 2️⃣ Test happy path
  test('user can create new item', async ({ page }) => {
    // Click create button
    await page.click('[data-testid="create-button"]');

    // Fill form
    await page.fill('[placeholder="Enter name..."]', 'New Item');
    await page.fill('[placeholder="Enter description..."]', 'Description');

    // Submit
    await page.click('[type="submit"]');

    // Verify success
    await expect(page.getByText('Item created')).toBeVisible();
  });

  // 3️⃣ Test validation
  test('shows error for invalid input', async ({ page }) => {
    await page.click('[data-testid="create-button"]');

    // Submit without filling required fields
    await page.click('[type="submit"]');

    // Verify error
    await expect(page.getByText('Name is required')).toBeVisible();
  });

  // 4️⃣ Test responsive behavior
  test('works on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });

    // Verify mobile menu is visible
    await expect(page.getByTestId('mobile-menu')).toBeVisible();
  });

  // 5️⃣ Test keyboard navigation
  test('supports keyboard navigation', async ({ page }) => {
    await page.keyboard.press('Tab');
    await page.keyboard.press('Enter');

    await expect(page.getByRole('dialog')).toBeVisible();
  });
});
```

---

## 7. Security Test Pattern

**Use for:** Input validation, injection prevention

```typescript
import { describe, expect, it } from 'vitest';

const API_URL = process.env.API_URL || 'http://localhost:8000';

describe('Security: Input Validation', () => {
  // 1️⃣ Path Traversal
  describe('Path Traversal Protection', () => {
    const payloads = [
      '../../../etc/passwd',
      '..\\..\\windows\\system.ini',
      '....//....//etc/passwd',
    ];

    it.each(payloads)('rejects path traversal: %s', async (payload) => {
      const response = await fetch(
        `${API_URL}/api/files/${encodeURIComponent(payload)}`
      );

      expect([400, 403, 404]).toContain(response.status);
    });
  });

  // 2️⃣ SQL Injection
  describe('SQL Injection Protection', () => {
    const payloads = [
      "'; DROP TABLE users; --",
      "1' OR '1'='1",
      "1; SELECT * FROM users",
    ];

    it.each(payloads)('sanitizes SQL injection: %s', async (payload) => {
      const response = await fetch(
        `${API_URL}/api/search?q=${encodeURIComponent(payload)}`
      );

      if (response.ok) {
        const data = await response.json();
        // Should not execute SQL
        expect(JSON.stringify(data)).not.toContain('DROP TABLE');
      }
    });
  });

  // 3️⃣ XSS Prevention
  describe('XSS Prevention', () => {
    it('escapes HTML in user input', async () => {
      const xssPayload = '<script>alert("xss")</script>';

      const response = await fetch(`${API_URL}/api/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: xssPayload }),
      });

      if (response.ok) {
        const data = await response.json();
        expect(data.text).not.toContain('<script>');
        expect(data.text).toContain('&lt;script&gt;');
      }
    });
  });

  // 4️⃣ Command Injection
  describe('Command Injection Protection', () => {
    const payloads = [
      '; ls -la',
      '| cat /etc/passwd',
      '`whoami`',
      '$(uname -a)',
    ];

    it.each(payloads)('rejects command injection: %s', async (payload) => {
      const response = await fetch(
        `${API_URL}/api/exec?cmd=${encodeURIComponent(payload)}`
      );

      expect([400, 403]).toContain(response.status);
    });
  });
});
```

---

## 🎯 Pattern Selection Guide

```
┌─────────────────────────────────────────────────────────────┐
│                    What are you testing?                    │
└─────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
        ▼                     ▼                     ▼
   ┌─────────┐          ┌─────────┐          ┌─────────┐
   │   UI    │          │  Logic  │          │   API   │
   └────┬────┘          └────┬────┘          └────┬────┘
        │                    │                    │
   ┌────┴────┐          ┌────┴────┐          ┌────┴────┐
   │Component│          │ Store/  │          │ Client/ │
   │   Test  │          │ Utility │          │ E2E     │
   └─────────┘          └─────────┘          └─────────┘
```

---

## 📚 Additional Resources

- **MSW Setup**: `tests/mocks/server.ts` - Mock Service Worker configuration
- **Test Helpers**: `tests/helpers/` - Shared test utilities
- **Fixtures**: `tests/fixtures/` - Reusable test data
- **Templates**: `tests/templates/` - Starting points for new tests

---

*Generated from Lokifi codebase patterns - January 2026*
