# Test Templates

## Overview

This directory contains templates for writing tests. Copy a template and replace the TODO comments with your actual test code.

## Available Templates

### 1. Store Test Template (`store.test.template.ts`)

For testing Zustand stores with React hooks.

**Usage:**

```bash
cp tests/templates/store.test.template.ts tests/unit/stores/myStore.test.ts
```

**Covers:**

- Initial state verification
- Action testing
- Computed values
- Side effects

**Example:**

```typescript
describe('useMyStore', () => {
  it('updates state', () => {
    const { result } = renderHook(() => useMyStore());

    act(() => {
      result.current.setValue(42);
    });

    expect(result.current.value).toBe(42);
  });
});
```

---

### 2. Component Test Template (`component.test.template.tsx`)

For testing React components with user interactions.

**Usage:**

```bash
cp tests/templates/component.test.template.tsx tests/components/MyComponent.test.tsx
```

**Covers:**

- Rendering tests
- User interactions (click, input, keyboard)
- Conditional rendering (loading, error, empty states)
- Async operations
- Accessibility

**Example:**

```typescript
describe('Button', () => {
  it('calls onClick when clicked', () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click me</Button>);
    fireEvent.click(screen.getByText('Click me'));
    expect(handleClick).toHaveBeenCalled();
  });
});
```

---

### 3. Utility Test Template (`utility.test.template.ts`)

For testing pure utility functions.

**Usage:**

```bash
cp tests/templates/utility.test.template.ts tests/unit/utils/myUtility.test.ts
```

**Covers:**

- Normal operation
- Edge cases (empty, null, undefined, large input)
- Error handling
- Performance testing
- Integration testing

**Example:**

```typescript
describe('formatCurrency', () => {
  it('formats USD correctly', () => {
    expect(formatCurrency(1234.56, 'USD')).toBe('$1,234.56');
  });

  it('handles null', () => {
    expect(formatCurrency(null, 'USD')).toBe('$0.00');
  });
});
```

---

## Best Practices

### 1. Descriptive Test Names

✅ **Good:**

```typescript
it('formats positive numbers with comma separators', () => {
  expect(formatNumber(1000)).toBe('1,000');
});
```

❌ **Bad:**

```typescript
it('works', () => {
  expect(formatNumber(1000)).toBe('1,000');
});
```

### 2. Arrange-Act-Assert Pattern

Structure tests in three clear phases:

```typescript
it('updates user profile', () => {
  // Arrange: Set up test data
  const user = { name: 'Alice', age: 30 };

  // Act: Execute the functionality
  const updated = updateUser(user, { age: 31 });

  // Assert: Verify the result
  expect(updated.age).toBe(31);
});
```

### 3. One Concept Per Test

✅ **Good:**

```typescript
it('validates email format', () => {
  expect(isValidEmail('test@example.com')).toBe(true);
});

it('rejects invalid email', () => {
  expect(isValidEmail('invalid')).toBe(false);
});
```

❌ **Bad:**

```typescript
it('validates email', () => {
  expect(isValidEmail('test@example.com')).toBe(true);
  expect(isValidEmail('invalid')).toBe(false);
  expect(isValidEmail('')).toBe(false);
  // Too many concepts in one test
});
```

### 4. Use Fixtures

Import shared test data instead of duplicating:

```typescript
import { mockCandleData, mockUser } from '@fixtures';

describe('MyTest', () => {
  it('processes candles', () => {
    const result = processCandles(mockCandleData);
    expect(result).toBeDefined();
  });
});
```

### 5. Mock External Dependencies

Isolate the code under test:

```typescript
import { vi } from 'vitest';

vi.mock('@/lib/api/apiFetch', () => ({
  apiFetch: vi.fn(),
}));

describe('fetchData', () => {
  it('calls API correctly', async () => {
    mockApiFetch.mockResolvedValue({ data: 'test' });
    const result = await fetchData();
    expect(mockApiFetch).toHaveBeenCalledWith('/endpoint');
  });
});
```

### 6. Clean Up Between Tests

```typescript
import { beforeEach, afterEach } from 'vitest';

beforeEach(() => {
  // Reset mocks and state
  vi.clearAllMocks();
  localStorage.clear();
});

afterEach(() => {
  // Clean up resources
  vi.restoreAllMocks();
});
```

---

## Using Fixtures

Import fixture data from `tests/fixtures/`:

```typescript
// Static data
import { mockCandleData, mockUser, mockPortfolio } from '@fixtures';

// Factories
import { createCandleSequence, createTrendingCandles } from '@fixtures';

// Mocks
import { mockLocalStorage, setupStorageMocks } from '@fixtures';

describe('MyTest', () => {
  beforeEach(() => {
    setupStorageMocks();
  });

  it('uses fixture data', () => {
    const candles = createCandleSequence(100);
    expect(candles).toHaveLength(100);
  });
});
```

---

## Running Tests

```bash
# Run all tests
npm test

# Run specific test file
npm test myComponent.test.tsx

# Run tests in directory
npm test tests/unit/stores/

# Run with coverage
npm test -- --coverage

# Run in watch mode
npm test -- --watch
```

---

## Examples

See existing tests for real-world examples:

- **Store:** `tests/unit/stores/multiChartStore.test.tsx`
- **Component:** `tests/components/PriceChart.test.tsx`
- **Utility:** `tests/unit/utils/portfolio.test.ts`

---

## Coverage Goals

- **Unit tests:** >90% coverage
- **Component tests:** >80% coverage
- **Integration tests:** Critical paths
- **E2E tests:** User workflows

---

## Questions?

See `tests/README.md` for more information about the test organization and best practices.
