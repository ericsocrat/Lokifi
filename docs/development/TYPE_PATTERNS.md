# TypeScript Type Patterns & Coding Standards

**Last Updated:** September 30, 2025
**Version:** 1.0
**Status:** Active

---

## 🎯 Overview

This document defines the TypeScript type patterns and coding standards for the Lokifi project. Following these standards ensures code consistency, type safety, and maintainability.

---

## 📐 Type Safety Principles

### 1. **Avoid `any` Type**

❌ **Bad:**
```typescript
function processData(data: any) {
  return data.value;
}
```

✅ **Good:**
```typescript
interface DataPayload {
  value: string;
  timestamp: number;
}

function processData(data: DataPayload) {
  return data.value;
}
```

### 2. **Use Strict Null Checks**

❌ **Bad:**
```typescript
let user: User;
console.log(user.name); // Potential runtime error
```

✅ **Good:**
```typescript
let user: User | null = null;
if (user) {
  console.log(user.name);
}
```

### 3. **Prefer Interfaces Over Types for Objects**

✅ **Good:**
```typescript
interface User {
  id: string;
  name: string;
  email: string;
}
```

💡 **Use Type Aliases for:**
- Union types: `type Status = 'active' | 'inactive' | 'pending'`
- Intersection types: `type UserWithRole = User & { role: Role }`
- Function signatures: `type Handler = (event: Event) => void`

---

## 🏗️ Common Type Patterns

### API Response Types

```typescript
// Base response structure
interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
  errors?: ApiError[];
}

interface ApiError {
  field?: string;
  message: string;
  code: string;
}

// Usage
interface User {
  id: string;
  name: string;
  email: string;
}

type UserResponse = ApiResponse<User>;
type UsersResponse = ApiResponse<User[]>;
```

### State Management (Zustand)

```typescript
interface StoreState {
  // Data
  items: Item[];
  selectedId: string | null;

  // Loading states
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchItems: () => Promise<void>;
  selectItem: (id: string) => void;
  clearError: () => void;
}

// Create store
const useStore = create<StoreState>((set, get) => ({
  items: [],
  selectedId: null,
  isLoading: false,
  error: null,

  fetchItems: async () => {
    set({ isLoading: true, error: null });
    try {
      const items = await fetchApi<Item[]>('/items');
      set({ items, isLoading: false });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  selectItem: (id) => set({ selectedId: id }),
  clearError: () => set({ error: null }),
}));
```

### Component Props

```typescript
// Base props with children
interface BaseProps {
  className?: string;
  children?: React.ReactNode;
}

// Extend base props
interface ButtonProps extends BaseProps {
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  onClick?: () => void;
}

// Component
export function Button({
  variant = 'primary',
  size = 'md',
  className,
  children,
  ...props
}: ButtonProps) {
  return <button className={cn(styles[variant], className)} {...props}>{children}</button>;
}
```

### Event Handlers

```typescript
// Form events
const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
  e.preventDefault();
  // Handle form submission
};

const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  setValue(e.target.value);
};

// Mouse events
const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
  console.log('Button clicked');
};

// Keyboard events
const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
  if (e.key === 'Enter') {
    handleSubmit();
  }
};
```

### Async/Await with Proper Error Handling

```typescript
// API fetch wrapper
async function fetchApi<T>(url: string): Promise<T> {
  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data as T;
  } catch (error) {
    console.error('API fetch error:', error);
    throw error;
  }
}

// Usage in component
const [data, setData] = useState<User | null>(null);
const [error, setError] = useState<string | null>(null);

useEffect(() => {
  fetchApi<User>('/api/user/me')
    .then(setData)
    .catch((err) => setError(err.message));
}, []);
```

---

## 🎨 React Patterns

### Custom Hooks

```typescript
// Define hook return type
interface UseAuthReturn {
  user: User | null;
  isAuthenticated: boolean;
  login: (credentials: Credentials) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
}

function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const login = async (credentials: Credentials) => {
    // Login logic
  };

  const logout = () => {
    setUser(null);
  };

  return {
    user,
    isAuthenticated: !!user,
    login,
    logout,
    isLoading,
  };
}
```

### Context with TypeScript

```typescript
interface ThemeContextValue {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
}
```

---

## 🔧 Utility Type Patterns

### Generic Utility Types

```typescript
// Pick specific properties
type UserPreview = Pick<User, 'id' | 'name' | 'avatar'>;

// Omit properties
type UserWithoutPassword = Omit<User, 'password'>;

// Make all properties optional
type PartialUser = Partial<User>;

// Make all properties required
type RequiredUser = Required<User>;

// Make properties readonly
type ReadonlyUser = Readonly<User>;

// Extract from union
type Status = 'pending' | 'active' | 'inactive';
type ActiveStatus = Extract<Status, 'active'>; // 'active'

// Exclude from union
type NonPendingStatus = Exclude<Status, 'pending'>; // 'active' | 'inactive'
```

### Custom Utility Types

```typescript
// Make specific keys optional
type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

// Usage
interface User {
  id: string;
  name: string;
  email: string;
}

type UserInput = PartialBy<User, 'id'>; // id is optional, others required

// Require at least one property
type RequireAtLeastOne<T> = {
  [K in keyof T]-?: Required<Pick<T, K>> & Partial<Pick<T, Exclude<keyof T, K>>>;
}[keyof T];

// Deep Partial
type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};
```

---

## 📝 Naming Conventions

### Files
- **Components:** PascalCase - `UserProfile.tsx`, `ChartPanel.tsx`
- **Hooks:** camelCase with 'use' prefix - `useAuth.ts`, `useWebSocket.ts`
- **Utilities:** camelCase - `formatDate.ts`, `apiClient.ts`
- **Types:** PascalCase - `User.ts`, `ApiResponse.ts`
- **Constants:** SCREAMING_SNAKE_CASE - `API_ENDPOINTS.ts`, `APP_CONFIG.ts`

### Variables & Functions
- **Variables:** camelCase - `userName`, `isLoading`
- **Constants:** SCREAMING_SNAKE_CASE - `MAX_RETRIES`, `API_BASE_URL`
- **Functions:** camelCase - `fetchUser`, `handleClick`
- **Interfaces:** PascalCase - `User`, `ApiResponse`
- **Types:** PascalCase - `Status`, `Handler`
- **Enums:** PascalCase - `UserRole`, `ResponseStatus`

---

## 🚫 Anti-Patterns to Avoid

### 1. Type Assertions Without Validation

❌ **Bad:**
```typescript
const data = JSON.parse(response) as User; // Unsafe!
```

✅ **Good:**
```typescript
function isUser(obj: unknown): obj is User {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'id' in obj &&
    'name' in obj &&
    'email' in obj
  );
}

const data = JSON.parse(response);
if (isUser(data)) {
  // data is now safely typed as User
}
```

### 2. Using `any` for Complex Types

❌ **Bad:**
```typescript
function handleData(data: any) {
  return data.items.map((item: any) => item.value);
}
```

✅ **Good:**
```typescript
interface DataPayload {
  items: Array<{ value: string }>;
}

function handleData(data: DataPayload) {
  return data.items.map((item) => item.value);
}
```

### 3. Overusing Type Assertions

❌ **Bad:**
```typescript
const element = document.getElementById('root')!;
element.innerHTML = 'Hello'; // Could crash if element is null
```

✅ **Good:**
```typescript
const element = document.getElementById('root');
if (element) {
  element.innerHTML = 'Hello';
}
```

---

## ✅ Best Practices

1. **Always define return types for functions**
   ```typescript
   function getUser(id: string): Promise<User> {
     return fetchApi<User>(`/users/${id}`);
   }
   ```

2. **Use discriminated unions for state**
   ```typescript
   type LoadingState<T> =
     | { status: 'idle' }
     | { status: 'loading' }
     | { status: 'success'; data: T }
     | { status: 'error'; error: string };
   ```

3. **Extract shared interfaces**
   ```typescript
   // Instead of duplicating
   interface CreateUserPayload { name: string; email: string; }
   interface UpdateUserPayload { name: string; email: string; }

   // Create shared interface
   interface UserBase { name: string; email: string; }
   type CreateUserPayload = UserBase;
   type UpdateUserPayload = Partial<UserBase>;
   ```

4. **Use const assertions for readonly objects**
   ```typescript
   const CONFIG = {
     API_URL: 'https://api.example.com',
     TIMEOUT: 5000,
   } as const;
   ```

5. **Document complex types**
   ```typescript
   /**
    * Represents a chart drawing object with position and style information.
    * Used for rendering user-created drawings on the chart canvas.
    */
   interface DrawingObject {
     id: string;
     type: 'line' | 'rectangle' | 'circle';
     points: Point[];
     style: DrawingStyle;
   }
   ```

---

## 🔍 Type Checking Commands

```bash
# Check types without emitting files
npm run typecheck

# Watch mode for type checking
tsc --noEmit --watch

# Check specific file
npx tsc --noEmit src/components/Chart.tsx
```

---

## 📚 Resources

- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)
- [React TypeScript Cheatsheet](https://react-typescript-cheatsheet.netlify.app/)
- [TypeScript Deep Dive](https://basarat.gitbook.io/typescript/)
- [Effective TypeScript](https://effectivetypescript.com/)

---

*This document should be updated as new patterns emerge and the codebase evolves.*
