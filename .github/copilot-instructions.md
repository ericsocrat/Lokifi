# GitHub Copilot Instructions for Lokifi

> **Project Context**: Lokifi is a full-stack financial application with Next.js frontend, FastAPI backend, and Redis caching.

> **⚡ Solo Dev Mode**: Skip lengthy documentation and summaries. Tests are self-documenting with descriptive `it()` statements. Focus on: code → test → validate → next task.

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
- **CHECKLISTS.md**: Use for quality gates, deployment steps, and process standards
  - Pre-commit checks, deployment checklists, code review standards
  - Reference: `/docs/CHECKLISTS.md`
- **Inline TODO Comments**: Use in code for implementation-level reminders
  - Format: `// TODO: Description` or `# TODO: Description`
  - Supported tags: TODO, FIXME, BUG, HACK, OPTIMIZE, REFACTOR, SECURITY, PERF, NOTE, REVIEW
  - Example: `// TODO: Add input validation for email field`
- **TODO Tree Extension**: Provides visual overview and navigation
  - Automatically scans codebase for TODO comments
  - Groups by tag type with color-coded icons
  - View in VS Code sidebar for quick navigation

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
1. **Always add TypeScript types** - No `any` unless absolutely necessary
2. **Error handling** - Use try/catch and proper error boundaries
3. **Accessibility** - Include ARIA labels and semantic HTML
4. **Performance** - Use React.memo, useMemo, useCallback appropriately
5. **Security** - Sanitize inputs, validate on both frontend and backend

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

1. **Categorize errors** - Separate false positives from real failures
2. **Look for patterns** - Do multiple workflows fail with similar errors?
3. **Check service configurations** - Are PostgreSQL/Redis available?
4. **Verify credentials** - Are they consistent across workflows?
5. **Compare working vs broken** - What's different between passing and failing workflows?
6. **Fix root cause, not symptoms** - One fix can resolve multiple failures

**Example**: Sessions 8-9 resolved 7-8 failures by fixing one root cause (missing PostgreSQL services).

## Documentation References

When suggesting code or answering questions, prefer these docs:
- **Testing**: `/docs/TEST_QUICK_REFERENCE.md`
- **Standards**: `/docs/CODING_STANDARDS.md`
- **Architecture**: `/docs/REPOSITORY_STRUCTURE.md`
- **Copilot Guide**: `/.vscode/COPILOT_GUIDE.md`
- **Sessions 8-9**: `/docs/SESSION_8_9_SECURITY_AND_CI_RESOLUTION.md` - Security + CI learnings
- **Deployment**: `/docs/deployment/README.md` - Production deployment guides
- **Local Development**: `/infra/docker/LOCAL_DEVELOPMENT.md` - Docker local setup
- **DNS Configuration**: `/docs/deployment/DNS_CONFIGURATION_GUIDE.md` - Domain setup

## Common Commands

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
