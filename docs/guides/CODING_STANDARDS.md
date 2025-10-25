# Coding Standards & Best Practices

**Last Updated:** September 30, 2025
**Version:** 1.0
**Project:** Lokifi Trading Platform

---

## 📋 Table of Contents

1. [General Principles](#general-principles)
2. [TypeScript](#typescript)
3. [React Components](#react-components)
4. [Python/Backend](#pythonbackend)
5. [Git Workflow](#git-workflow)
6. [Testing](#testing)
7. [Documentation](#documentation)
8. [Performance](#performance)

---

## 🎯 General Principles

### Code Quality Principles

1. **DRY (Don't Repeat Yourself)**
   - Extract repeated logic into reusable functions
   - Create shared components and utilities
   - Use composition over duplication

2. **KISS (Keep It Simple, Stupid)**
   - Prefer simple solutions over complex ones
   - Write code that's easy to understand
   - Avoid premature optimization

3. **YAGNI (You Aren't Gonna Need It)**
   - Don't build features before they're needed
   - Keep the codebase lean and focused
   - Add complexity only when necessary

4. **Separation of Concerns**
   - Business logic separate from UI
   - Data layer separate from presentation
   - Clear module boundaries

---

## 💻 TypeScript

### File Organization

```
src/
├── components/       # React components
├── hooks/           # Custom React hooks
├── stores/          # Zustand stores
├── lib/             # Utility functions
├── types/           # TypeScript type definitions
├── services/        # API clients and external services
└── app/             # Next.js app router pages
```

### Import Organization

```typescript
// 1. External dependencies
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

// 2. Internal absolute imports
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/hooks/useAuth';

// 3. Relative imports
import { formatDate } from '../lib/utils';
import type { User } from '../types/user';

// 4. Styles
import styles from './Component.module.css';
```

### Variable Declarations

```typescript
// ✅ Use const by default
const userName = 'John';
const items = [1, 2, 3];

// ✅ Use let only when reassignment is needed
let counter = 0;
counter++;

// ❌ Never use var
var x = 10; // DON'T DO THIS
```

### Function Declarations

```typescript
// ✅ Arrow functions for simple expressions
const add = (a: number, b: number): number => a + b;

// ✅ Named functions for complex logic or hoisting needs
function calculateTotal(items: Item[]): number {
  return items.reduce((sum, item) => sum + item.price, 0);
}

// ✅ Async/await over promises
async function fetchUser(id: string): Promise<User> {
  // Use centralized API client (see API documentation section below)
  const response = await fetch(`/api/users/${id}`);
  return response.json();
}
```

### Error Handling

```typescript
// ✅ Always handle errors explicitly
try {
  const data = await fetchData();
  processData(data);
} catch (error) {
  console.error('Failed to fetch data:', error);
  // Handle error appropriately
  showErrorNotification(error instanceof Error ? error.message : 'Unknown error');
}

// ✅ Use type guards for error handling
function isApiError(error: unknown): error is ApiError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    'message' in error
  );
}
```

### Comments

```typescript
// ✅ Use comments to explain "why", not "what"
// Debounce user input to avoid excessive API calls
const debouncedSearch = useMemo(() => debounce(handleSearch, 300), []);

// ✅ Document complex algorithms
/**
 * Calculates the optimal chart viewport based on visible data range.
 * Uses binary search to find the ideal time range that fits the canvas.
 *
 * @param data - Array of OHLC data points
 * @param canvasWidth - Width of the chart canvas in pixels
 * @returns Optimal time range [start, end]
 */
function calculateViewport(data: OHLCData[], canvasWidth: number): [number, number] {
  // Implementation
}

// ❌ Don't state the obvious
// Get the user's name
const name = user.name;
```

---

## ⚛️ React Components

### Component Structure

```typescript
// 1. Imports
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';

// 2. Types/Interfaces
interface ComponentProps {
  title: string;
  onSave: (data: Data) => void;
}

// 3. Constants (outside component to avoid recreation)
const DEFAULT_OPTIONS = {
  autoSave: true,
  timeout: 5000,
};

// 4. Component
export function Component({ title, onSave }: ComponentProps) {
  // 4.1 Hooks
  const [data, setData] = useState<Data | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // 4.2 Effects
  useEffect(() => {
    loadData();
  }, []);

  // 4.3 Event handlers
  const handleSave = async () => {
    setIsLoading(true);
    try {
      await onSave(data);
    } finally {
      setIsLoading(false);
    }
  };

  // 4.4 Render logic
  if (isLoading) {
    return <LoadingSpinner />;
  }

  // 4.5 JSX
  return (
    <div>
      <h1>{title}</h1>
      <Button onClick={handleSave}>Save</Button>
    </div>
  );
}

// 5. Exports (if needed)
export type { ComponentProps };
```

### Component Best Practices

```typescript
// ✅ Keep components small and focused
// Instead of one large component, split into smaller ones
function UserDashboard() {
  return (
    <>
      <UserHeader />
      <UserStats />
      <UserActivity />
    </>
  );
}

// ✅ Extract custom hooks for complex logic
function useUserData(userId: string) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUser(userId).then(setUser).finally(() => setLoading(false));
  }, [userId]);

  return { user, loading };
}

// ✅ Use composition over props drilling
// Bad: Passing props through multiple levels
<Parent user={user}>
  <Child user={user}>
    <GrandChild user={user} />
  </Child>
</Parent>

// Good: Use Context or composition
<UserProvider user={user}>
  <Parent>
    <Child>
      <GrandChild />
    </Child>
  </Parent>
</UserProvider>
```

### Conditional Rendering

```typescript
// ✅ Use early returns for guards
function UserProfile({ userId }: { userId?: string }) {
  if (!userId) {
    return <LoginPrompt />;
  }

  return <ProfileContent userId={userId} />;
}

// ✅ Use && for simple conditionals
{isLoggedIn && <WelcomeMessage />}

// ✅ Use ternary for either/or
{isLoading ? <Spinner /> : <Content />}

// ❌ Avoid complex nested ternaries
{isLoading ? <Spinner /> : data ? <Content /> : error ? <Error /> : null}

// ✅ Better: Extract to variable or function
const renderContent = () => {
  if (isLoading) return <Spinner />;
  if (error) return <Error />;
  if (data) return <Content />;
  return null;
};

return <div>{renderContent()}</div>;
```

---

## 🐍 Python/Backend

### File Organization

```
backend/
├── app/
│   ├── api/          # API routes
│   ├── core/         # Core functionality
│   ├── models/       # Database models
│   ├── schemas/      # Pydantic schemas
│   ├── services/     # Business logic
│   └── utils/        # Utility functions
├── tests/            # Test files
└── alembic/          # Database migrations
```

### Code Style (PEP 8)

```python
# ✅ Use snake_case for functions and variables
def calculate_total_price(items: list[Item]) -> float:
    return sum(item.price for item in items)

# ✅ Use PascalCase for classes
class UserService:
    def __init__(self, db: Database):
        self.db = db

# ✅ Use SCREAMING_SNAKE_CASE for constants
MAX_RETRIES = 3
API_TIMEOUT = 30

# ✅ Use type hints
def get_user(user_id: str) -> User | None:
    return db.query(User).filter(User.id == user_id).first()

# ✅ Use async/await for I/O operations
async def fetch_market_data(symbol: str) -> MarketData:
    # Use centralized API patterns (see API documentation section below)
    async with httpx.AsyncClient() as client:
        response = await client.get(f"/api/market/{symbol}")
        return MarketData(**response.json())
```

### Error Handling

```python
# ✅ Use specific exceptions
from fastapi import HTTPException

async def get_user(user_id: str) -> User:
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

# ✅ Create custom exceptions
class InsufficientFundsError(Exception):
    """Raised when user has insufficient funds for transaction."""
    pass

# ✅ Use try/except for expected errors
try:
    result = await process_payment(amount)
except InsufficientFundsError:
    return {"error": "Insufficient funds"}
except PaymentError as e:
    logger.error(f"Payment failed: {e}")
    return {"error": "Payment processing failed"}
```

### Dependency Injection (FastAPI)

```python
# ✅ Use FastAPI's dependency injection
from fastapi import Depends

def get_db() -> Database:
    db = Database()
    try:
        yield db
    finally:
        db.close()

@app.get("/users/{user_id}")
async def get_user(
    user_id: str,
    db: Database = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> User:
    return await db.get(User, user_id)
```

---

## 🔀 Git Workflow

### Branch Naming

```bash
# Feature branches
feature/user-authentication
feature/chart-drawing-tools

# Bug fixes
fix/login-redirect-issue
fix/chart-rendering-glitch

# Hotfixes
hotfix/security-vulnerability

# Refactoring
refactor/extract-chart-logic

# Documentation
docs/update-api-documentation
```

### Commit Messages

```bash
# ✅ Use conventional commits format
feat: add real-time price updates to chart
fix: resolve WebSocket connection timeout issue
docs: update API documentation for user endpoints
refactor: extract chart rendering logic into separate module
test: add unit tests for portfolio calculations
chore: update dependencies to latest versions

# ✅ Include context in body (optional)
feat: add real-time price updates to chart

- Implement WebSocket connection for live data
- Add automatic reconnection logic
- Update chart state on price changes

Closes #123
```

### Pull Request Guidelines

1. **Keep PRs focused and small** (< 400 lines changed)
2. **Write clear PR descriptions** explaining what and why
3. **Link related issues** using "Closes #123" or "Fixes #456"
4. **Request reviews** from at least one team member
5. **Update tests** and documentation
6. **Ensure CI passes** before requesting review

---

## 🧪 Testing

### Test File Organization

```
tests/
├── unit/           # Unit tests
├── integration/    # Integration tests
└── e2e/           # End-to-end tests
```

### Writing Good Tests

```typescript
// ✅ Use descriptive test names
describe('UserProfile', () => {
  it('should display user information when loaded', () => {
    // Test implementation
  });

  it('should show loading spinner while fetching data', () => {
    // Test implementation
  });

  it('should handle error when user not found', () => {
    // Test implementation
  });
});

// ✅ Follow AAA pattern (Arrange, Act, Assert)
it('should calculate total price correctly', () => {
  // Arrange
  const items = [
    { name: 'Item 1', price: 10 },
    { name: 'Item 2', price: 20 },
  ];

  // Act
  const total = calculateTotal(items);

  // Assert
  expect(total).toBe(30);
});

// ✅ Test behavior, not implementation
// Bad: Testing implementation details
it('should call setState with correct value', () => {
  // ...
});

// Good: Testing user-facing behavior
it('should display success message after form submission', () => {
  // ...
});
```

---

## 📚 Documentation

### Code Documentation

```typescript
/**
 * Calculates the moving average for a given data series.
 *
 * @param data - Array of numeric values
 * @param period - Number of periods for the moving average
 * @returns Array of moving average values
 *
 * @example
 * ```typescript
 * const prices = [10, 12, 15, 14, 16];
 * const ma = calculateMA(prices, 3);
 * // Returns: [null, null, 12.33, 13.67, 15]
 * ```
 */
function calculateMA(data: number[], period: number): (number | null)[] {
  // Implementation
}
```

### README Requirements

Every feature module should have documentation covering:
1. **Purpose** - What does this module do?
2. **Usage** - How do you use it?
3. **Examples** - Code examples
4. **API Reference** - Available functions/components
5. **Dependencies** - What does it depend on?

---

## ⚡ Performance

### Frontend Performance

```typescript
// ✅ Use React.memo for expensive components
export const ChartPanel = React.memo(function ChartPanel({ data }: Props) {
  // Component implementation
});

// ✅ Use useMemo for expensive calculations
const sortedData = useMemo(() => {
  return data.sort((a, b) => a.timestamp - b.timestamp);
}, [data]);

// ✅ Use useCallback for event handlers passed to children
const handleClick = useCallback(() => {
  // Handle click
}, [dependency]);

// ✅ Lazy load components
const ChartEditor = lazy(() => import('./ChartEditor'));

// ✅ Debounce rapid events
const debouncedSearch = useMemo(
  () => debounce((query: string) => search(query), 300),
  []
);
```

### Backend Performance

```python
# ✅ Use database indexes
class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True)
    email = Column(String, unique=True, index=True)  # Indexed for fast lookups
    created_at = Column(DateTime, index=True)  # Indexed for sorting

# ✅ Use async operations
async def get_multiple_users(user_ids: list[str]) -> list[User]:
    # Parallel database queries
    return await asyncio.gather(
        *[get_user(user_id) for user_id in user_ids]
    )

# ✅ Implement caching
from functools import lru_cache

@lru_cache(maxsize=128)
def get_market_config(symbol: str) -> MarketConfig:
    return db.query(MarketConfig).filter_by(symbol=symbol).first()

# ✅ Use pagination
@app.get("/users")
async def list_users(skip: int = 0, limit: int = 100):
    return db.query(User).offset(skip).limit(limit).all()
```

---

## ✅ Pre-commit Checklist

Before committing code, ensure:

- [ ] Code follows project style guidelines
- [ ] All tests pass (see [`TESTING_GUIDE.md`](TESTING_GUIDE.md) for commands)
- [ ] TypeScript compilation succeeds (`npm run typecheck`)
- [ ] Linting passes with no errors (`npm run lint`)
- [ ] No console.log statements in production code
- [ ] Documentation updated if needed
- [ ] Commit message follows conventions

---

## 🔄 Code Review Checklist

When reviewing code:

- [ ] Code is clear and understandable
- [ ] No unnecessary complexity
- [ ] Error handling is appropriate
- [ ] Tests cover new functionality
- [ ] Performance considerations addressed
- [ ] Security implications considered
- [ ] Documentation is adequate

---

## 📚 API Documentation Reference

**📖 For complete API patterns and endpoints:**
- [`../api/API_DOCUMENTATION.md`](../api/API_DOCUMENTATION.md) - Comprehensive API reference and examples

---

*These standards evolve with the project. Suggest improvements via pull requests to this document.*
