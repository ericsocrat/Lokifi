# GitHub Copilot Instructions for Lokifi

> **Project Context**: Lokifi is a full-stack financial application with Next.js frontend, FastAPI backend, and Redis caching.

> **🎯 Quality-First Philosophy**: Take whatever time, commits, and tokens needed to achieve world-class code quality, structure, and tests. No rush - systematic, thorough work is valued over speed. Multiple debugging sessions and deep root cause analysis are encouraged.

> **✅ Session Best Practices**:
> - Systematic root cause analysis > quick symptom fixes
> - Deep log investigation reveals issues status checks miss
> - Multiple commits per issue are fine - prefer atomic, well-documented changes
> - Token budget is generous - use it for thorough analysis
> - Marathon debugging sessions are acceptable for complex issues

## 📚 Quick Navigation

**Core Sections**:
- **Core Technologies** - Tech stack overview (Next.js, FastAPI, PostgreSQL, Redis)
- **Code Style & Standards** - TypeScript/Python conventions, testing patterns
- **Task Tracking** - Todo list management (NEVER delete!), CHECKLISTS.md, TODO Tree
- **Common Patterns** - Component/Store/Route/Test templates
- **Security Best Practices** - Frontend/Backend security, anti-patterns
- **CI/CD Standards** - Service configs, credentials, health checks (Sessions 8-9)
- **Performance** - React/Zustand optimization patterns
- **Documentation References** - Key docs to reference

**When You Need**:
- 🔍 **Service Configuration**: See "CI/CD & Workflow Standards" section
- 📋 **Process Checklists**: Reference `/docs/CHECKLISTS.md`
- 🔐 **Security Guidance**: See "Security Best Practices" section
- 🎯 **Code Patterns**: See "Common Patterns" section
- 🐛 **Anti-Patterns**: See "Common Anti-Patterns to Avoid" section

## Core Technologies

### Frontend Stack
- **Framework**: Next.js 15.1.3 (App Router)
- **UI**: React 19, TailwindCSS 3.4.17, shadcn/ui
- **State**: Zustand for global state
- **Charts**: Recharts for data visualization
- **Testing**: Vitest 3.2.4, Testing Library, Playwright

### Backend Stack
- **Framework**: FastAPI (Python 3.11+)
- **Database**: PostgreSQL with SQLAlchemy
- **Cache**: Redis
- **Testing**: Pytest with coverage

### Infrastructure & Deployment
- **Containerization**: Docker & Docker Compose
- **Production Server**: Traefik reverse proxy with auto SSL
- **Domain**: lokifi.com (hosted on Cloudflare)
- **Production URL**: www.lokifi.com
- **API URL**: api.www.lokifi.com
- **Email Addresses**:
  - hello@lokifi.com (general inquiries)
  - admin@lokifi.com (administrative)
  - support@lokifi.com (customer support)

## Code Style & Standards

### TypeScript/JavaScript
- Use TypeScript for all new files
- Prefer functional components with hooks
- Use `const` for all variables unless mutation needed
- Named exports over default exports
- File naming: `kebab-case.ts` for utilities, `PascalCase.tsx` for components

### Python
- Type hints required for all functions
- Use Black for formatting (line length: 88)
- Follow PEP 8 conventions
- Docstrings for all public functions

### Testing Conventions
- **Frontend**: Vitest with `describe()` > `it()` structure
- **Backend**: Pytest with fixtures and parametrize
- Aim for 80%+ coverage on new code
- Test file naming: `*.test.ts` (frontend), `test_*.py` (backend)
- **Solo dev workflow**: Skip detailed documentation during test creation - tests ARE the documentation
- **No completion summaries**: Create tests, verify pass rate, move to next component immediately

### Testing Best Practices
**Smart Test Selection:**
```bash
# Run only changed files' tests (fast feedback)
.\tools\test-runner.ps1 -Smart

# Run full test suite before commit
.\tools\test-runner.ps1 -PreCommit

# Run all tests with coverage
.\tools\test-runner.ps1 -All
```

**Coverage Improvement Workflow:**
1. Identify low-coverage files: `npm run test:coverage`
2. Focus on critical paths first (API routes, core business logic)
3. Write behavior tests, not implementation tests
4. Aim for 80%+ on new code, don't retroactively fix old code

### 🤖 Automatic Coverage Tracking

**Status**: ✅ Fully Automated - Zero Manual Work Required

Lokifi has a **fully automatic coverage tracking system** integrated into CI/CD. Coverage metrics are tracked, documented, and synchronized automatically.

**How It Works:**
1. **Tests Run** → CI/CD executes frontend and backend tests
2. **Coverage Extracted** → Metrics auto-pulled from coverage reports
3. **Config Updated** → `coverage.config.json` (single source of truth) updated
4. **Docs Synced** → All 6+ documentation files automatically synchronized
5. **Auto-Committed** → Changes committed with `[skip ci]` tag

**Key Points for Developers:**
- ✅ **No manual updates needed** - System handles everything automatically
- ✅ **Always current** - Coverage metrics update after every test run in CI/CD
- ✅ **Single source of truth** - `coverage.config.json` is the master config
- ✅ **Verification only** - Use `npm run coverage:verify` for local checks

**Current Coverage** (auto-updated):
- Frontend: 11.61% (passing 10% threshold ✅)
- Backend: 27% (below 80% target ⚠️)
- Overall: 19.31% (passing 20% threshold ✅)

**Coverage Documentation:**
- Master Config: `/coverage.config.json`
- Automation Guide: `/tools/scripts/coverage/README.md`
- Implementation: `/tools/scripts/coverage/AUTOMATION_COMPLETE.md`
- Baseline: `/docs/guides/COVERAGE_BASELINE.md`

**Test Quality Guidelines:**
- **Test user-facing behavior**, not internal implementation
- **Mock external dependencies** (APIs, databases, external services)
- **Use descriptive test names** that explain what's being tested
- **Keep tests isolated** - each test should be independent
- **Test edge cases** - empty arrays, null values, error states

### Task Tracking & Workflow

**Todo List Management** (Copilot's `manage_todo_list` tool):
- **NEVER delete existing todos** - Always preserve user's task history
- **Strategic reordering**: When adding new tasks, merge with existing todos and reorder by priority
- **Priority order**: CRITICAL → HIGH → MEDIUM → LOW → COMPLETED (move to bottom)
- **Status transitions**: not-started → in-progress → completed
- **Mark in-progress** before starting work on a task
- **Mark completed** immediately after finishing (don't batch completions)
- **Preserve context**: Keep detailed descriptions, commit references, file paths
- **Read first**: Always call `read` operation before `write` to see existing todos

**Example Priority Reordering**:
```javascript
// ❌ BAD - Deleting existing todos
todoList = [newTask1, newTask2, newTask3]  // Lost user's previous tasks!

// ✅ GOOD - Merging and reordering
todoList = [
  ...criticalTasks,     // User's urgent tasks first
  ...newHighPriority,   // New important tasks
  ...existingMedium,    // Preserve existing medium priority
  ...newMedium,         // Add new medium priority
  ...existingLow,       // Keep low priority tasks
  ...completedTasks     // Completed tasks at bottom
]
```

**Other Task Tracking Tools** (Strategic Usage):

1. **CHECKLISTS.md** (`/docs/CHECKLISTS.md`) - Use for **repeatable processes**:
   - ✅ Pre-commit quality gates (code formatting, tests, security)
   - ✅ Pre-merge checklists (testing, documentation, deployment)
   - ✅ Feature implementation workflows (API dev, frontend components, DB changes)
   - ✅ Security implementation (auth, validation, headers)
   - ✅ Performance optimization (frontend/backend patterns)
   - ✅ Deployment checklists (pre/during/post deployment)
   - **When to use**: Standard workflows, quality gates, team process enforcement
   - **When NOT to use**: One-off tasks, exploratory work, brainstorming

2. **TODO Tree Extension** - Use for **codebase-wide task visibility**:
   - 📋 Scans all files for TODO/FIXME/BUG/HACK/OPTIMIZE comments
   - 📊 Groups by tag type with color-coded icons in VS Code sidebar
   - 🔍 Quick navigation to specific code locations
   - 💡 Great for tracking technical debt and inline reminders
   - **Suggest when**: User wants overview of all pending code tasks
   - **Command**: Open TODO Tree view in VS Code sidebar
   - **Integration**: Works with inline TODO comments below

3. **Inline TODO Comments** - Use for **implementation-level reminders**:
   - Format: `// TODO: Description` or `# TODO: Description`
   - Supported tags: `TODO`, `FIXME`, `BUG`, `HACK`, `OPTIMIZE`, `REFACTOR`, `SECURITY`, `PERF`, `NOTE`, `REVIEW`
   - Example: `// TODO: Add input validation for email field`
   - **When to use**: Code-specific tasks, refactoring reminders, temporary workarounds
   - **When NOT to use**: Project-level tasks (use manage_todo_list instead)

## Project Structure

```
lokifi/
├── apps/
│   ├── frontend/          # Next.js application
│   │   ├── app/          # Next.js App Router pages
│   │   ├── components/   # React components
│   │   ├── lib/          # Utilities and helpers
│   │   ├── hooks/        # Custom React hooks
│   │   └── tests/        # Vitest test files
│   └── backend/          # FastAPI application
│       ├── app/          # Main application code
│       │   ├── api/      # API routes
│       │   ├── core/     # Core functionality
│       │   ├── models/   # SQLAlchemy models
│       │   └── services/ # Business logic
│       └── tests/        # Pytest test files
├── docs/                 # Documentation
│   ├── deployment/       # Production deployment guides
│   ├── guides/           # Development guides
│   └── security/         # Security documentation
├── infra/                # Infrastructure & DevOps
│   └── docker/           # Docker configurations
│       ├── .env          # Production secrets (gitignored)
│       ├── .env.example  # Template for .env
│       ├── docker-compose.yml              # Local development
│       ├── docker-compose.production.yml   # Full production
│       └── docker-compose.prod-minimal.yml # Production (cloud DB)
└── tools/                           # Automation & Utility Scripts (Flat Structure)
    ├── test-runner.ps1              # Comprehensive test execution
    ├── codebase-analyzer.ps1        # Project metrics & cost estimates
    ├── cleanup-master.ps1           # Cleanup utilities
    ├── security-scanner.ps1         # Security scanning
    ├── setup-precommit-hooks.ps1    # Git pre-commit hooks
    ├── universal-fetcher.js         # Universal data fetching
    └── templates/                   # HTML/Dashboard templates
```

## Common Patterns

### Frontend Component Pattern
```typescript
import { FC } from 'react';

interface Props {
  // Props with types
}

export const ComponentName: FC<Props> = ({ prop1, prop2 }) => {
  // Component logic
  return (
    <div>
      {/* JSX */}
    </div>
  );
};
```

### Zustand Store Pattern
```typescript
import { create } from 'zustand';

interface StoreState {
  data: DataType[];
  isLoading: boolean;
  error: string | null;
}

interface StoreActions {
  fetchData: () => Promise<void>;
  updateData: (data: DataType) => void;
  reset: () => void;
}

type Store = StoreState & StoreActions;

export const useStore = create<Store>((set, get) => ({
  // State
  data: [],
  isLoading: false,
  error: null,

  // Actions
  fetchData: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch('/api/data');
      const data = await response.json();
      set({ data, isLoading: false });
    } catch (error) {
      set({ error: error.message, isLoading: false });
    }
  },

  updateData: (newData) => {
    set((state) => ({
      data: [...state.data, newData]
    }));
  },

  reset: () => set({ data: [], isLoading: false, error: null })
}));
```

### Backend Route Pattern
```python
from fastapi import APIRouter, Depends
from app.models.schemas import ResponseModel

router = APIRouter()

@router.get("/endpoint", response_model=ResponseModel)
async def get_endpoint(
    param: str,
    db: Session = Depends(get_db)
) -> ResponseModel:
    """Function docstring."""
    # Implementation
    return result
```

### Test Pattern (Frontend)
```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

describe('ComponentName', () => {
  it('should render correctly', () => {
    render(<ComponentName />);
    expect(screen.getByText('text')).toBeInTheDocument();
  });
});
```

### Test Pattern (Backend)
```python
import pytest
from app.models.schemas import Model

def test_function_name(client, db_session):
    """Test description."""
    # Arrange
    data = {"key": "value"}

    # Act
    response = client.post("/endpoint", json=data)

    # Assert
    assert response.status_code == 200
```

## Key Guidelines

### When Writing Code

**🏆 World-Class Quality Standards** - Be extremely thorough and strict:

1. **TypeScript Type Safety** (ZERO TOLERANCE for `any`)
   - ❌ **NEVER use `any`** unless absolutely unavoidable (browser APIs, Zustand persist)
   - ✅ **Use proper types**: `Draft<T>`, `Omit<T, Keys>`, `Partial<T>`, `Record<K, V>`
   - ✅ **Type all parameters**: Every function parameter must have explicit types
   - ✅ **Type all return values**: Especially for async functions (`Promise<T>`)
   - ✅ **Use type inference**: Let TypeScript infer when types are obvious
   - ✅ **Document acceptable `any`**: If unavoidable, add comment explaining why
   - 🎯 **Target**: 95%+ type coverage (only 5% acceptable `any` for valid reasons)

2. **Error Handling** (COMPREHENSIVE coverage)
   - ✅ **Try/catch all async operations**: Every API call, file operation, external service
   - ✅ **Use Error boundaries**: Wrap React components in boundaries
   - ✅ **Typed errors**: Create custom error classes with proper types
   - ✅ **User-friendly messages**: Never expose stack traces to users
   - ✅ **Log for debugging**: Use proper logging service (not console.log in production)
   - ✅ **Handle edge cases**: null, undefined, empty arrays, network failures

3. **Code Organization** (CLEAN and MAINTAINABLE)
   - ✅ **Single Responsibility**: Each function does ONE thing well
   - ✅ **DRY Principle**: Don't repeat code - extract to reusable functions
   - ✅ **Meaningful names**: Variables/functions clearly describe their purpose
   - ✅ **Small functions**: Aim for <50 lines per function (complexity limit)
   - ✅ **Consistent patterns**: Follow established project patterns (Zustand stores, API routes)
   - ✅ **Comments for WHY, not WHAT**: Code should be self-documenting

4. **Performance** (OPTIMIZED by default)
   - ✅ **React.memo**: Wrap expensive components to prevent re-renders
   - ✅ **useMemo/useCallback**: Cache expensive computations and callbacks
   - ✅ **Lazy loading**: Use dynamic imports for large components
   - ✅ **Debounce/throttle**: Rate-limit expensive operations (search, API calls)
   - ✅ **Virtualization**: Use for large lists (react-window, react-virtual)
   - ✅ **Bundle size**: Avoid importing entire libraries (`import { specific } from 'lib'`)

5. **Security** (DEFENSE IN DEPTH)
   - ✅ **Input validation**: Validate ALL user inputs (frontend + backend)
   - ✅ **Sanitize outputs**: Escape HTML, prevent XSS attacks
   - ✅ **Environment variables**: NEVER hardcode secrets or API keys
   - ✅ **SQL injection prevention**: Use parameterized queries (SQLAlchemy ORM)
   - ✅ **CSRF protection**: Use built-in framework protections
   - ✅ **Rate limiting**: Prevent abuse on public endpoints

6. **Accessibility** (A11Y compliance)
   - ✅ **Semantic HTML**: Use proper HTML5 elements (`<nav>`, `<main>`, `<article>`)
   - ✅ **ARIA labels**: Add labels for screen readers where needed
   - ✅ **Keyboard navigation**: All interactive elements accessible via keyboard
   - ✅ **Color contrast**: Minimum WCAG AA compliance (4.5:1 ratio)
   - ✅ **Focus indicators**: Visible focus states for all interactive elements

### CRITICAL: Pre-Commit Validation (MANDATORY)

**⚠️ NEVER claim "session complete" without running ALL validation steps below:**

**For TypeScript/Frontend Work** (Sessions 15-24 pattern):

```powershell
# Step 1: TypeScript type checking (catches type errors build misses)
cd apps/frontend
npm run typecheck 2>&1 | Select-String -Pattern "<storeName>" -Context 2

# Step 2: If errors found, fix them NOW (don't commit broken code)
# Common error patterns to check:
# - state. references inside set((draft:) blocks → should be draft.
# - Optional parameters: Implementation vs interface mismatches
# - Missing type annotations: (param) → (param: Type)
# - Union types: string → 'literal1' | 'literal2'

# Step 3: Full typecheck (after fixing store-specific errors)
npm run typecheck

# Step 4: Build verification (production readiness)
npm run build

# Step 5: Only AFTER all pass → commit and report success
```

**Why This Matters** (Lesson from Sprint 2 Validation):
- ❌ `npm run build` **SKIPS** type validation (`Skipping validation of types`)
- ✅ `npm run typecheck` is the **ONLY** way to catch real type errors
- 🐛 Sprint 2 discovered 18 hidden errors in "completed" stores
- ⏱️ Fixing after the fact takes 3x longer than validating upfront

**Common Pitfalls to Avoid**:

1. **Bulk Replacement Edge Cases**:
   - Context-aware: Track when inside `set((draft:)` blocks
   - Nested conditionals: `if (state.x)` inside set() blocks → missed
   - Object operations: `Object.assign(state.y, ...)` → missed
   - Test on 5-10 lines first, then bulk replace

2. **Parameter Optionality**:
   - Always check interface definition, not just implementation
   - Use "Go to Type Definition" in VS Code
   - If interface says `(param?: Type)`, implementation MUST match

3. **Type References**:
   - Use existing types: `SomeType['field']` not `FieldType`
   - Check if type exists before using
   - Prefer type paths over creating new types

**Session Complete Criteria** (ALL must pass):

- [ ] Store-specific typecheck shows 0 errors (or only expected Zustand v5 error)
- [ ] Full `npm run typecheck` passes
- [ ] `npm run build` succeeds
- [ ] All acceptable `any` types documented inline with `// any required for: <reason>`
- [ ] Commit message includes validation confirmation

**Template for Session Completion**:

```markdown
## ✅ Session X Complete

**Validation Results**:
- ✅ Store-specific typecheck: 0 errors
- ✅ Full typecheck: Passed (only expected Zustand v5 error)
- ✅ Build: Successful
- ✅ Acceptable any: X documented (list reasons)

**Metrics**: X lines, Y any → Z acceptable (N% improvement)
**Time**: ~N minutes
**Commit**: <hash>
```

**If Validation Fails**:
- ❌ DO NOT claim session complete
- 🔧 Fix errors immediately while context is fresh
- 📝 Document what went wrong and prevention strategy
- ✅ Re-run validation until all steps pass

**Reference**: See `/docs/guides/VALIDATION_SUMMARY_SESSIONS_18-21.md` for detailed examples of validation errors and fixes.

### When Writing Tests
1. **Test behavior, not implementation** - Focus on user-facing outcomes
2. **Mock external dependencies** - Use vi.mock() or pytest fixtures
3. **Descriptive test names** - Should read like specifications
4. **Arrange-Act-Assert pattern** - Keep tests structured
5. **Cover edge cases** - Empty states, errors, loading states

### When Reviewing Code
1. Check for type safety violations
2. Verify test coverage exists
3. Look for security vulnerabilities
4. Ensure proper error handling
5. Validate accessibility compliance

### When Modifying CI/CD Workflows
1. **Standardize service configurations** - Use consistent PostgreSQL/Redis versions
2. **Centralize credentials** - Single source of truth for database credentials
3. **Health checks required** - All services need proper health check configurations
4. **Service availability** - Every test category needs its own database/cache services
5. **Version consistency** - Use postgres:16-alpine + redis:7-alpine everywhere
6. **Credential standard** - Always use lokifi:lokifi2025 for PostgreSQL
7. **Test locally first** - Run actionlint/yaml-lint before pushing workflow changes

## Code Quality & Verification Workflow

### Quality-First Philosophy

**Core Principle**: Take whatever time, commits, and iterations needed to achieve world-class code quality. Systematic, thorough work is valued over speed.

**Verification Layers** (Multi-layered validation approach):

1. **TypeScript Compilation** (Primary for type safety work)
   ```bash
   cd apps/frontend
   npm run build  # Full build with tsc + vite
   npm run typecheck  # Fast type-only check (tsc --noEmit)
   ```
   **What this catches**: Type errors, missing imports, invalid property access, function signature mismatches

   **For TypeScript refactoring**: If `npm run build` succeeds → types are valid → runtime behavior is predictable
   **Key insight**: TypeScript IS the test for type safety work. Compilation success = correct types.

2. **Linting & Formatting** (Automated via editor/pre-commit hooks)
   - **ESLint**: Runs automatically via `.eslintrc.json` configuration
   - **Prettier**: Auto-formats on save via editor settings
   - **Pre-commit hooks**: Husky + lint-staged enforce quality before commit

   **What this catches**: Style violations, code smells, unused imports, formatting issues

   **Agent note**: Don't manually run linters - your editor's auto-save formatters handle this automatically. If you see "Some edits were made by a formatter" - that's working as intended!

3. **Testing** (Behavior verification)
   ```bash
   # Frontend
   cd apps/frontend
   npm test                # Vitest unit tests
   npm run test:coverage   # With coverage report

   # Backend
   cd apps/backend
   pytest                  # Python tests
   pytest --cov           # With coverage
   ```
   **What this catches**: Broken business logic, integration issues, regression bugs

   **When to run**: After logic changes, before major commits, not needed for pure type annotation changes

4. **Build Success** (Production readiness)
   ```bash
   npm run build  # Frontend
   # Backend builds via Docker
   ```
   **What this catches**: Bundling errors, tree-shaking issues, production environment problems

5. **Pattern Validation** (Code review checklist)
   - [ ] State mutations use `Draft<StoreType>` (Zustand + Immer)
   - [ ] Creation functions use `Omit<Type, 'id' | 'createdAt' | ...>`
   - [ ] Update functions use `Partial<Type>`
   - [ ] Delete/Get functions use explicit types (string, number)
   - [ ] Async functions return `Promise<T>`
   - [ ] No `any` types except documented acceptable cases

### Verification Workflow Examples

**For TypeScript Type Safety Work** (Sprint 2 pattern):
```bash
# 1. Make type changes (add Draft<T>, Omit<T>, etc.)
# 2. Let auto-formatters run (Prettier/ESLint)
# 3. Verify TypeScript compilation
npm run build  # ✅ Success = types are valid

# 4. Count remaining any types
Select-String -Path "src/lib/stores/myStore.tsx" -Pattern ": any"
# Goal: Only acceptable any types remain (document why)

# 5. Commit with comprehensive message
git commit -m "feat(types): myStore.tsx type-safe (100 any → 3 acceptable)"
```

**For Feature Development**:
```bash
# 1. Implement feature with proper types
# 2. Write tests (behavior-driven)
npm test -- myFeature.test.ts

# 3. Verify build
npm run build

# 4. Pre-commit hooks run automatically
git commit -m "feat: implement feature X"
# Husky runs lint-staged → ESLint + Prettier
```

**For Bug Fixes**:
```bash
# 1. Write failing test first (TDD)
npm test -- bugFix.test.ts  # ❌ Should fail

# 2. Fix the bug
# 3. Verify test passes
npm test -- bugFix.test.ts  # ✅ Should pass

# 4. Verify no regressions
npm test  # All tests pass
npm run build  # Successful build
```

### What NOT To Do (Limitations)

When working through Copilot, be aware of verification limitations:

❌ **Don't assume runtime correctness** - Type safety doesn't guarantee business logic correctness
❌ **Don't skip testing for logic changes** - Only skip tests for pure type annotation work
❌ **Don't manually run formatters** - Let editor auto-save handle it (Prettier, ESLint)
❌ **Don't commit without build verification** - Always run `npm run build` or `pytest` first

### Confidence Checklist (Before Committing)

For **Type Safety Work**:
- [ ] `npm run build` succeeds with no errors
- [ ] Remaining `any` types are documented as acceptable
- [ ] Pattern validation passed (Draft, Omit, Partial used correctly)
- [ ] No runtime behavior changed (only type annotations)

For **Feature Work**:
- [ ] Tests written and passing
- [ ] `npm run build` succeeds
- [ ] Pre-commit hooks pass (automatic)
- [ ] Documentation updated if needed

For **Bug Fixes**:
- [ ] Reproduction test written (fails before fix)
- [ ] Test passes after fix
- [ ] No regressions (full test suite passes)
- [ ] Root cause documented in commit message

### Quality Metrics from Sprint 2 (Sessions 15-19)

**Proven Success Pattern**:
- ✅ 5 stores completed, all builds successful
- ✅ 637 `any` → 23 acceptable (96% improvement)
- ✅ No runtime behavior changed (pure type safety)
- ✅ Consistent 1-hour pace with bulk efficiency techniques
- ✅ Zustand v5 typing issue known and documented

**Key Success Factors**:
1. TypeScript compilation verifies all types
2. Build success confirms no breaking changes
3. Auto-formatters handle style automatically
4. Pattern consistency proven across diverse domains
5. Only type annotations changed, not runtime logic

**The key insight**: For type safety work, TypeScript compilation IS the validation. If it compiles without errors (except known Zustand v5 issue), the types are correct. 🎉

## Security Best Practices

### Frontend Security
- **Never use `eval()` or `Function()` constructors** - XSS vulnerabilities
- **Avoid `dangerouslySetInnerHTML`** - Use DOMPurify if absolutely needed
- **Sanitize all user inputs** - Especially before API calls
- **Use environment variables** - Never hardcode API keys or secrets
- **Validate on both frontend and backend** - Defense in depth

**Security Anti-Patterns to Avoid:**
```typescript
// ❌ BAD - XSS vulnerability
<div dangerouslySetInnerHTML={{ __html: userInput }} />

// ✅ GOOD - Safe rendering
<div>{userInput}</div>

// ❌ BAD - Exposed secrets
const API_KEY = "sk-1234567890";

// ✅ GOOD - Environment variables
const API_KEY = import.meta.env.VITE_API_KEY;

// ❌ BAD - No input validation
await fetch(`/api/users/${userId}`);

// ✅ GOOD - Validated input
const validId = parseInt(userId);
if (isNaN(validId)) throw new Error('Invalid ID');
await fetch(`/api/users/${validId}`);
```

### Backend Security
- **Use Pydantic for validation** - All request/response models
- **Implement rate limiting** - Prevent abuse
- **Use parameterized queries** - Prevent SQL injection (SQLAlchemy handles this)
- **Hash passwords** - Use bcrypt or Argon2
- **Validate JWT tokens** - Check expiry and signature

**Security Checklist:**
- [ ] All endpoints require authentication where needed
- [ ] Input validation on all request bodies
- [ ] Rate limiting on public endpoints
- [ ] CORS configured properly
- [ ] Secrets in environment variables (never committed)
- [ ] SQL queries use SQLAlchemy ORM (not raw SQL)

## Common Anti-Patterns to Avoid

### TypeScript Anti-Patterns
```typescript
// ❌ BAD - Implicit any
function processData(data) { ... }

// ✅ GOOD - Explicit types
function processData(data: DataType): ResultType { ... }

// ❌ BAD - console.log in production
console.log('User data:', userData);

// ✅ GOOD - Proper logging (or remove)
// Use logger.info() or remove debug logs

// ❌ BAD - Non-null assertion without check
const value = data!.field!.value;

// ✅ GOOD - Optional chaining
const value = data?.field?.value;

// ❌ BAD - Type assertion without validation
const user = response as User;

// ✅ GOOD - Type guards
if (isUser(response)) {
  const user = response;
}
```

### React Anti-Patterns
```typescript
// ❌ BAD - Missing key in lists
items.map(item => <Item {...item} />)

// ✅ GOOD - Unique keys
items.map(item => <Item key={item.id} {...item} />)

// ❌ BAD - State mutation
setState(state.push(item));

// ✅ GOOD - Immutable update
setState([...state, item]);

// ❌ BAD - Prop drilling (3+ levels)
<Parent data={data}>
  <Child data={data}>
    <GrandChild data={data} />

// ✅ GOOD - Context or Zustand store
const data = useStore(state => state.data);

// ❌ BAD - useEffect without dependencies
useEffect(() => {
  fetchData();
});

// ✅ GOOD - Proper dependencies
useEffect(() => {
  fetchData();
}, [fetchData]);
```

### FastAPI Anti-Patterns
```python
# ❌ BAD - No response model
@router.get("/users")
async def get_users():
    return users

# ✅ GOOD - Typed response
@router.get("/users", response_model=List[UserResponse])
async def get_users():
    return users

# ❌ BAD - No input validation
@router.post("/users")
async def create_user(data: dict):
    ...

# ✅ GOOD - Pydantic validation
@router.post("/users", response_model=UserResponse)
async def create_user(data: UserCreate):
    ...

# ❌ BAD - Blocking I/O
@router.get("/data")
async def get_data():
    return requests.get("https://api.example.com")

# ✅ GOOD - Async I/O
@router.get("/data")
async def get_data():
    async with httpx.AsyncClient() as client:
        return await client.get("https://api.example.com")
```

## Performance Optimization Patterns

### React Performance
```typescript
// Use React.memo for expensive components
export const ExpensiveComponent = React.memo(({ data }) => {
  // Expensive rendering logic
}, (prevProps, nextProps) => {
  // Custom comparison for when to re-render
  return prevProps.data.id === nextProps.data.id;
});

// Use useMemo for expensive computations
const sortedData = useMemo(() => {
  return data.sort((a, b) => a.value - b.value);
}, [data]);

// Use useCallback for stable function references
const handleClick = useCallback(() => {
  processData(data);
}, [data]);

// Lazy load components
const HeavyComponent = lazy(() => import('./HeavyComponent'));
```

### Zustand Performance
```typescript
// ✅ GOOD - Selective subscriptions (avoid re-renders)
const data = useStore(state => state.data);
const isLoading = useStore(state => state.isLoading);

// ❌ BAD - Subscribe to entire store
const store = useStore();

// ✅ GOOD - Shallow equality for objects
const user = useStore(state => state.user, shallow);
```

## CI/CD & Workflow Standards

### Service Configuration Standards (Sessions 8-9 Learnings)

**Database Service Configuration** (REQUIRED for all test workflows):
```yaml
services:
  postgres:
    image: postgres:16-alpine  # ✅ Standardized version
    env:
      POSTGRES_USER: lokifi    # ✅ Standardized credentials
      POSTGRES_PASSWORD: lokifi2025
      POSTGRES_DB: lokifi_test
    ports:
      - 5432:5432
    options: >-
      --health-cmd "pg_isready -U lokifi"
      --health-interval 10s
      --health-timeout 5s
      --health-retries 5

  redis:
    image: redis:7-alpine      # ✅ Standardized version
    ports:
      - 6379:6379
    options: >-
      --health-cmd "redis-cli ping"
      --health-interval 10s
      --health-timeout 5s
      --health-retries 5
```

**Environment Variables** (REQUIRED for database connections):
```yaml
env:
  DATABASE_URL: postgresql://lokifi:lokifi2025@localhost:5432/lokifi_test
  REDIS_URL: redis://localhost:6379/0
  TESTING: 1
```

### CI/CD Anti-Patterns (Sessions 8-9)

**❌ Common Mistakes**:
1. **Missing services in test workflows** → E2E/integration tests fail silently
2. **Inconsistent credentials** → Tests pass in one workflow, fail in another
3. **Version drift** → Different postgres versions (15 vs 16) cause compatibility issues
4. **No health checks** → Tests start before services are ready
5. **Duplicate upload steps** → CodeQL/SARIF conflicts

**✅ Solutions**:
1. **Every test workflow needs services** - Integration, E2E, coverage all need PostgreSQL + Redis
2. **Single source of truth** - lokifi:lokifi2025 everywhere
3. **Standardize versions** - postgres:16-alpine + redis:7-alpine
4. **Always use health checks** - Wait for services to be ready
5. **Let actions handle uploads** - Don't duplicate upload steps

### Root Cause Analysis Approach

When debugging CI failures, follow this systematic approach:

1. **Use GitHub CLI for quick status** - `gh pr checks <pr-number> --repo ericsocrat/Lokifi`
2. **Get detailed logs** - `gh run view <run-id> --repo ericsocrat/Lokifi --log-failed`
3. **Categorize errors** - Separate false positives from real failures
4. **Look for patterns** - Do multiple workflows fail with similar errors?
5. **Check service configurations** - Are PostgreSQL/Redis available?
6. **Verify credentials** - Are they consistent across workflows?
7. **Compare working vs broken** - What's different between passing and failing workflows?
8. **Fix root cause, not symptoms** - One fix can resolve multiple failures

**Example**: Sessions 8-9 resolved 7-8 failures by fixing one root cause (missing PostgreSQL services).

**GitHub CLI Workflow Health Check Pattern**:
```powershell
# Step 1: Check PR status
gh pr checks 27 --repo ericsocrat/Lokifi

# Step 2: Get failing workflow run IDs
gh run list --repo ericsocrat/Lokifi --branch <branch-name> --limit 5 --json name,conclusion,databaseId

# Step 3: Analyze failure logs
gh run view <run-id> --repo ericsocrat/Lokifi --log-failed | Select-String -Pattern "Error|FAILED" -Context 2

# Step 4: Document patterns and create fix tasks
# Add to todo list with manage_todo_list tool
```

---

## Documentation Management Guidelines

**🔄 Update vs Create Philosophy**:
- **Always update existing documents** instead of creating new ones
- **Only create new documents** when no suitable existing document exists
- **Archive or delete outdated documents** immediately after creating replacements
- **Consolidate fragmented documentation** into comprehensive guides

**Best Practices**:
1. **Search first**: Use `grep_search` or `file_search` to find existing related documents
2. **Update existing**: Prefer updating CHECKLISTS.md, TECHNICAL_ROADMAP.md, or existing guides
3. **Avoid duplication**: Don't create SESSION_NOTES.md when TECHNICAL_ROADMAP.md exists
4. **Archive outdated**: Move replaced documents to .archive/ folder with context
5. **Document decisions**: Add to existing decision logs, not new files

**Examples**:
- ❌ **Bad**: Create `NEW_FEATURE_PLAN.md` when `TECHNICAL_ROADMAP.md` already tracks sprints
- ✅ **Good**: Update `TECHNICAL_ROADMAP.md` with new sprint planning and add to Decision Log
- ❌ **Bad**: Create `DEPLOYMENT_CHECKLIST.md` when `CHECKLISTS.md` exists
- ✅ **Good**: Update `CHECKLISTS.md` with new deployment section
- ❌ **Bad**: Create `TESTING_BEST_PRACTICES.md` when `TESTING_GUIDE.md` exists
- ✅ **Good**: Update `TESTING_GUIDE.md` with new best practices section
- ❌ **Bad**: Keep both old and new versions of same document
- ✅ **Good**: Archive old version to `.archive/` folder, update all cross-references

**Archive Structure**:
- Use `.archive/` subfolder within category (e.g., `docs/guides/.archive/`)
- Preserve historical documents for reference
- Update parent README.md to explain archived content
- Update all cross-references to point to new locations

## Documentation References

When suggesting code or answering questions, prefer these docs:
- **Core Workflow**: `/docs/guides/DEVELOPER_WORKFLOW.md` - Complete setup & daily workflows ⭐
- **Pull Requests**: `/docs/guides/PULL_REQUEST_COMPLETE_GUIDE.md` - Complete PR workflow ⭐
- **Testing**: `/docs/guides/TESTING_GUIDE.md` - Comprehensive testing guide
- **Standards**: `/docs/guides/CODING_STANDARDS.md` - Code style and conventions
- **Code Quality**: `/docs/guides/CODE_QUALITY.md` - Quality tools and automation
- **Architecture**: `/docs/guides/REPOSITORY_STRUCTURE.md` - Project structure
- **CI/CD Optimization**: `/docs/ci-cd/WORKFLOW_OPTIMIZATION_COMPLETE.md` - Complete workflow optimization (Sessions 8-10)
- **CI/CD Guide**: `/docs/ci-cd/CI_CD_GUIDE.md` - Pipeline documentation
- **Dependabot**: `/docs/ci-cd/DEPENDABOT_ACTION_PLAN.md` - Dependency management
- **Deployment**: `/docs/deployment/README.md` - Production deployment guides
- **Local Development**: `/infra/docker/LOCAL_DEVELOPMENT.md` - Docker local setup
- **DNS Configuration**: `/docs/deployment/DNS_CONFIGURATION_GUIDE.md` - Domain setup
- **Documentation Index**: `/docs/README.md` - Complete documentation index ⭐

## Common Commands

### GitHub CLI (Workflow Monitoring & Health Checks)
```powershell
# PR Status & Workflow Monitoring
gh pr view 27 --repo ericsocrat/Lokifi              # View PR details
gh pr checks 27 --repo ericsocrat/Lokifi            # Check all workflow statuses
gh pr view 27 --json statusCheckRollup              # JSON format for parsing

# Workflow Run Management
gh run list --repo ericsocrat/Lokifi --branch test/workflow-optimizations-validation
gh run view <run-id> --repo ericsocrat/Lokifi       # View specific run details
gh run view <run-id> --repo ericsocrat/Lokifi --log-failed  # Get failure logs
gh run rerun <run-id> --repo ericsocrat/Lokifi      # Rerun failed workflow

# Security & Dependabot
gh api /repos/ericsocrat/Lokifi/dependabot/alerts   # List Dependabot alerts
gh api /repos/ericsocrat/Lokifi/code-scanning/alerts # CodeQL alerts

# Workflow Health Check Examples
gh pr checks 27 --repo ericsocrat/Lokifi | Select-String "failing|successful"
gh run list --repo ericsocrat/Lokifi --limit 10 --json conclusion,name,displayTitle
```

**GitHub CLI Best Practices**:
- **Always use `--repo ericsocrat/Lokifi`** to specify repository explicitly
- **Parse JSON output** with `ConvertFrom-Json` for programmatic analysis
- **Filter logs** with `Select-String` to reduce output size (avoid token overflow)
- **Use `--limit`** parameter to control number of results
- **Authenticated automatically** - gh CLI uses your GitHub login session

### Docker & Infrastructure
```bash
# Local Development (from infra/docker/)
docker compose up              # Start all services (PostgreSQL, Redis, Backend, Frontend)
docker compose down            # Stop all services
docker compose down -v         # Stop and remove volumes (fresh start)
docker compose logs -f         # View all logs
docker compose logs -f backend # View specific service logs

# Production Deployment (see docs/deployment/)
docker compose -f docker-compose.production.yml up -d      # Full stack with Traefik
docker compose -f docker-compose.prod-minimal.yml up -d    # Minimal (cloud database)
```

**Important Docker Notes:**
- Local development uses `docker-compose.yml` (localhost, simple passwords)
- Production uses `docker-compose.production.yml` or `docker-compose.prod-minimal.yml`
- `.env` file contains production secrets (gitignored)
- `.env.example` is the template (safe to commit)
- See `/infra/docker/LOCAL_DEVELOPMENT.md` for local dev guide
- See `/docs/deployment/` for production deployment guides

### Frontend
```bash
npm run dev          # Start dev server
npm run test         # Run Vitest tests
npm run test:ui      # Vitest UI
npm run test:coverage # Coverage report
npm run lint         # ESLint check
npm run build        # Production build
```

### Backend
```bash
uvicorn app.main:app --reload  # Start dev server
pytest                         # Run tests
pytest --cov                   # With coverage
black .                        # Format code
ruff check                     # Lint code
```

## Extension Integration

Copilot will automatically use these installed extensions:
- **Vitest Explorer** - For test discovery and running
- **Playwright** - For E2E test suggestions
- **GitLens** - For git history and blame
- **Pylance** - For Python type checking
- **ESLint** - For JavaScript/TypeScript linting
- **Database Client** - For SQL query assistance
- **Console Ninja** - For runtime debugging context
- **TODO Tree** - For task tracking and code annotation visualization

## Project Analysis & Reporting

### Codebase Analyzer
For project metrics, estimates, and stakeholder documentation, use the comprehensive codebase analyzer:

```bash
# Full analysis with project estimates
.\tools\scripts\analysis\codebase-analyzer.ps1

# Export to JSON for CI/CD integration
.\tools\scripts\analysis\codebase-analyzer.ps1 -OutputFormat json

# Region-specific cost estimates (US, EU, Asia, Remote)
.\tools\scripts\analysis\codebase-analyzer.ps1 -Region eu -Detailed

# Compare with previous analysis
.\tools\scripts\analysis\codebase-analyzer.ps1 -CompareWith "path/to/previous-report.md"
```

**Provides**:
- Project metrics and technical debt analysis
- Cost estimates with region-based pricing
- Git history insights (commits, contributors, churn)
- Multiple export formats (Markdown, JSON, CSV, HTML)
- Maintenance cost projections (1/3/5 years)
- CI/CD integration support

### Ad-hoc Code Analysis
For quick code analysis tasks, prefer interactive Copilot queries:
- **TypeScript type checking**: Use `@workspace` to find `any` types and suggest improvements
- **Console.log scanning**: Ask Copilot to find and suggest logger replacements
- **Dependency checks**: Run `npm outdated` or `npm audit` directly
- **Code quality**: Use `@workspace` context to analyze patterns and suggest refactoring

### TypeScript Type Fixing
For TypeScript type improvements, use **Copilot Edits** with full workspace context:

**Finding Issues**:
```
@workspace /search find all implicit 'any' types in the frontend
@workspace /search find components with missing prop types
@workspace /search find Zustand stores that need type definitions
```

**Interactive Fixing**:
1. Ask Copilot to analyze the specific file or component
2. Review suggested type definitions with full context
3. Apply fixes one at a time with proper type inference
4. Copilot understands business logic for accurate types

**Why better than automated scripts?**
- Context-aware: Sees entire codebase for accurate type inference
- Interactive: Review each fix before applying
- Intelligent: Understands component logic and data flow
- Safe: Prevents breaking changes from bulk automated fixes

**Example Queries**:
- "Fix all implicit 'any' types in `components/dashboard/PriceChart.tsx`"
- "Add proper type definitions to the `usePortfolio` Zustand store"
- "Improve type safety in the `lib/api/client.ts` file"

## Tips for Best Results

### Use Workspace Context
- Use `@workspace` to query entire codebase
- Use `#file:filename` to reference specific files
- Use `#selection` for selected code context

### Be Specific
- "Generate a Vitest test for the `calculateTotal` function in `lib/math.ts`"
- "Create a FastAPI route that handles user authentication with JWT tokens"
- "Fix the TypeScript type error in the PriceChart component"

### Leverage Project Knowledge
- Copilot knows the project structure from this file
- It can suggest code following existing patterns
- It will use the correct testing framework automatically

---

**Remember**: These instructions help Copilot provide better, more contextual suggestions. Always review generated code for correctness and alignment with project standards.
