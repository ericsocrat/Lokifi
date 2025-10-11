# Frontend Tests

This directory contains all frontend tests organized by type.

## Directory Structure

```
tests/
├── api/              # API contract and integration tests
│   └── contracts/    # Contract tests for backend APIs
├── components/       # React component tests
├── unit/             # Unit tests (functions, hooks, utilities)
├── e2e/              # End-to-end tests (complete user workflows)
├── security/         # Security tests (XSS, CSRF, auth, validation)
├── lib/              # Library and utility tests
├── a11y/             # Accessibility tests (WCAG compliance)
├── visual/           # Visual regression tests (screenshots)
└── types/            # TypeScript type tests
```

## Quick Start

### Run All Tests
```bash
npm test
```

### Run Specific Category
```bash
npm test -- tests/components/    # Component tests
npm test -- tests/unit/          # Unit tests
npm test -- tests/security/      # Security tests
npm test -- tests/api/           # API tests
```

### Run With Coverage
```bash
npm run test:coverage
```

### Run in Watch Mode
```bash
npm test -- --watch
```

### Run E2E Tests
```bash
npm run test:e2e
```

## Test Categories Explained

### Component Tests (`components/`)
- Test React components
- User interactions
- Rendering behavior
- Props validation

**Examples**: PriceChart, DrawingLayer, Modal components

### Unit Tests (`unit/`)
- Test utility functions
- Test custom hooks
- Test pure functions
- Fast, isolated tests

**Examples**: Formatting functions, calculation utilities, validators

### API Tests (`api/contracts/`)
- Test API integration
- Contract testing
- Request/response validation
- Error handling

**Examples**: WebSocket contracts, authentication API, OHLC data API

### E2E Tests (`e2e/`)
- Test complete user workflows
- Browser automation
- Real user scenarios
- Multi-page flows

**Examples**: User registration to portfolio management, trading workflows

### Security Tests (`security/`)
- Test input validation
- Test XSS protection
- Test CSRF protection
- Test authentication flows

**Examples**: Input sanitization, auth security, token validation

### Library Tests (`lib/`)
- Test utility libraries
- Test performance utilities
- Test web vitals
- Test helpers

**Examples**: Performance monitoring, web vitals tracking

### Accessibility Tests (`a11y/`)
- Test WCAG compliance
- Test keyboard navigation
- Test screen reader support
- Test color contrast

**Examples**: Form accessibility, navigation accessibility

### Visual Tests (`visual/`)
- Screenshot comparison
- UI regression testing
- Cross-browser testing
- Responsive design testing

**Examples**: Component visual regression, layout consistency

### Type Tests (`types/`)
- Test TypeScript types
- Test type inference
- Test type guards
- Test complex types

**Examples**: API response types, component prop types

## Writing New Tests

1. **Choose the right directory** based on test type
2. **Name your test file**: `<ComponentName>.test.tsx` or `<module-name>.test.ts`
3. **Follow the pattern**:

```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { ComponentName } from './ComponentName';

describe('ComponentName', () => {
  it('should render correctly', () => {
    // Arrange
    const props = { title: 'Test' };
    
    // Act
    render(<ComponentName {...props} />);
    
    // Assert
    expect(screen.getByText('Test')).toBeInTheDocument();
  });

  it('should handle user interaction', () => {
    // Arrange
    const onClickMock = jest.fn();
    render(<ComponentName onClick={onClickMock} />);
    
    // Act
    fireEvent.click(screen.getByRole('button'));
    
    // Assert
    expect(onClickMock).toHaveBeenCalledTimes(1);
  });
});
```

## Testing Utilities

### React Testing Library
```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
```

### Custom Render with Providers
```typescript
const customRender = (ui: React.ReactElement, options = {}) => {
  return render(ui, {
    wrapper: ({ children }) => (
      <ThemeProvider>
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      </ThemeProvider>
    ),
    ...options,
  });
};
```

### Mock API Calls
```typescript
import { rest } from 'msw';
import { setupServer } from 'msw/node';

const server = setupServer(
  rest.get('/api/user', (req, res, ctx) => {
    return res(ctx.json({ username: 'testuser' }));
  })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

## Current Coverage

- **Frontend**: 12.1%
- **Target**: 80%+

## Best Practices

✅ Test user behavior, not implementation
✅ Use semantic queries (getByRole, getByLabelText)
✅ Test accessibility
✅ Mock external dependencies
✅ Use user-event for interactions
✅ Test loading and error states
✅ Keep tests independent

❌ Don't test implementation details
❌ Don't use container/wrapper queries
❌ Don't test third-party libraries
❌ Don't rely on internal state
❌ Don't snapshot everything

## Common Patterns

### Testing Async Behavior
```typescript
it('should load data', async () => {
  render(<AsyncComponent />);
  expect(screen.getByText('Loading...')).toBeInTheDocument();
  
  const data = await screen.findByText('Data loaded');
  expect(data).toBeInTheDocument();
});
```

### Testing Forms
```typescript
it('should submit form', async () => {
  const onSubmit = jest.fn();
  render(<Form onSubmit={onSubmit} />);
  
  await userEvent.type(screen.getByLabelText('Email'), 'test@example.com');
  await userEvent.click(screen.getByRole('button', { name: 'Submit' }));
  
  expect(onSubmit).toHaveBeenCalledWith({ email: 'test@example.com' });
});
```

### Testing Hooks
```typescript
import { renderHook } from '@testing-library/react';
import { useCustomHook } from './useCustomHook';

it('should update value', () => {
  const { result } = renderHook(() => useCustomHook());
  
  act(() => {
    result.current.setValue('new value');
  });
  
  expect(result.current.value).toBe('new value');
});
```

## Debugging Tests

```bash
# Run with verbose output
npm test -- --verbose

# Run single test file
npm test -- ComponentName.test.tsx

# Update snapshots
npm test -- -u

# Run with debugging
npm test -- --testNamePattern="should render"
```

## More Information

See the comprehensive [Testing Guide](../../../docs/guides/TESTING_GUIDE.md) for:
- Detailed examples
- Best practices
- Debugging tips
- CI/CD integration
- And more...

---

**Need Help?** Check the [Testing Guide](../../../docs/guides/TESTING_GUIDE.md) or ask the team!
