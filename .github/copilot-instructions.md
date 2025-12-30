# GitHub Copilot Instructions for Lokifi

> **Project Context**: Lokifi is a full-stack financial application with Next.js frontend, FastAPI backend, and Redis caching.

## 🎯 Core Working Principles

**These principles guide ALL development work. Follow them systematically for every task.**

### 1. Continue with Recommended Steps
- Follow the next logical steps based on current progress and priorities
- If multiple paths exist, prioritize tasks that:
  - Deliver the highest impact to code quality or test coverage
  - Align with project goals and sprint objectives
  - Validate recently established patterns across multiple use cases
  - Unlock future work or remove blockers

### 2. Proactive Recommendations
- While working on tasks, proactively identify and suggest:
  - Code improvements, optimizations, or refactoring opportunities
  - Additional test cases, edge cases, or error scenarios
  - Documentation gaps or unclear workflows
  - Reusable patterns or best practices
- **If you encounter effective patterns**, document them immediately in the relevant `docs/` folder
- Don't wait to be asked - suggest improvements when you see them

### 3. Documentation Standards
- **Document effective patterns in `/docs/architecture/patterns/`** (accessed via Pattern Library MCP)
- **Update guides in `/docs/guides/`** for comprehensive implementation examples
- **Quality checklist**: Clear problem, solution with examples, anti-patterns, success metrics, references

### 4. Guidance and Checklists
- **Check `/docs/checklists.md` FIRST** for ANY workflow question
- **Use Pattern Library MCP** to search proven solutions before suggesting new approaches
- **Reference specific checklist sections** in responses for world-class quality standards

### 5. Quality-First Philosophy
- **Prioritize systematic, thorough work over speed**:
  - Take whatever time, commits, and tokens needed
  - No rush - quality is valued over completion speed
  - Multiple debugging sessions encouraged for complex issues
  - Deep root cause analysis over quick symptom fixes
- **Never compromise on quality**, even for minor tasks:
  - World-class test coverage (80%+ for new code)
  - Comprehensive error handling (all edge cases)
  - Type safety (zero tolerance for `any` without documentation)
  - Production-ready documentation

### 6. Unlimited Resources Mindset
- **Assume unlimited time and tokens are available**:
  - Focus on delivering the best possible outcomes
  - No shortcuts or rushed decisions
  - Marathon debugging sessions acceptable
  - Multiple iterations to achieve world-class quality
- **Token budget is generous** - use it for:
  - Thorough analysis and investigation
  - Comprehensive documentation
  - Multiple validation approaches
  - Deep root cause analysis

### 7. Validation and Testing
- **Ensure ALL changes are validated comprehensively**:
  - Unit tests with edge cases and error scenarios
  - Integration tests for cross-component interactions
  - Full test suite execution (verify no regressions)
  - Coverage improvements measured and documented
- **Before claiming completion**:
  - ✅ All tests passing (100% pass rate)
  - ✅ Coverage meets or exceeds targets (80%+ for new code)
  - ✅ Pre-commit hooks pass (quality + security gates)
  - ✅ Documentation updated (code + patterns)
  - ✅ Commit message follows conventions

### 8. Commit and Communication Standards
- **Use clear, detailed commit messages** following conventional commits:
  - Format: `<type>(<scope>): <description>` with comprehensive body
  - Explain changes, their impact, and validation steps taken
  - Reference related issues, PRs, or documentation
  - Include metrics (test counts, coverage gains, time saved)
- **Communicate progress, blockers, and discoveries effectively**:
  - Provide fact-based status updates
  - Document discoveries and lessons learned
  - Raise blockers early with context
  - Celebrate wins with metrics

### 9. Iterative Improvements
- **After completing a task**: Review for refinements, identify follow-ups, update docs, add patterns to `/docs/architecture/patterns/`
- **Continuously improve**: Codebase (refactoring), documentation (clarity), processes (efficiency), test coverage (edge cases)

### 10. Focus on Impact
- **Prioritize tasks that deliver measurable improvements**:
  - Code quality (type safety, error handling, structure)
  - Test coverage (percentage gains, edge cases)
  - Developer experience (documentation, tooling, workflows)
  - Production readiness (performance, security, reliability)
- **Balance quick wins with long-term strategic goals**:
  - Quick wins: Validate patterns, fix critical bugs, document discoveries
  - Strategic: Refactor complex systems, comprehensive test suites, tooling improvements

---

> **📋 ALWAYS Reference Checklists**: For ANY workflow question (pre-merge, security, Renovate PRs, testing, deployment, CI/CD debugging), ALWAYS check `/docs/checklists.md` FIRST. It contains ALL repeatable processes with step-by-step instructions. Reference specific checklist sections in your responses.

> **✅ Session Best Practices**:
> - **Check checklists.md first** for standard workflows before suggesting custom solutions
> - Systematic root cause analysis > quick symptom fixes
> - Deep log investigation reveals issues status checks miss
> - Multiple commits per issue are fine - prefer atomic, well-documented changes
> - Token budget is generous - use it for thorough analysis
> - Marathon debugging sessions are acceptable for complex issues

## 📚 Quick Navigation

**Core Sections**:
- **Core Technologies** - Tech stack overview (Next.js, FastAPI, PostgreSQL, Redis)
- **Code Style & Standards** - TypeScript/Python conventions, testing patterns
- **Task Tracking** - Todo list management (NEVER delete!), checklists.md, TODO Tree
- **Common Patterns** - Component/Store/Route/Test templates
- **Pre-Flight Checks** - Path verification, dependency management, quality checks (NEW! ⭐)
- **Security Best Practices** - Frontend/Backend security, anti-patterns
- **CI/CD Standards** - Service configs, credentials, health checks (Sessions 8-9)
- **Performance** - React/Zustand optimization patterns
- **Documentation References** - Key docs to reference

**When You Need**:
- � **Process Checklists**: `/docs/checklists.md` (CHECK THIS FIRST FOR ALL WORKFLOWS!) ⭐⭐⭐
- �🛫 **Pre-Flight Checks**: See "Pre-Flight Checks & Code Generation" section (ALWAYS USE!)
- 🔍 **Service Configuration**: See "CI/CD & Workflow Standards" section
- � **Security Guidance**: `/docs/checklists.md` Security Implementation section + "Security Best Practices" section
- 🤖 **Renovate PRs**: `/docs/checklists.md` Renovate PR Review Checklist
- 🚀 **Deployment**: `/docs/checklists.md` Deployment Checklist
- 🎯 **Code Patterns**: See "Common Patterns" section
- 🐛 **Anti-Patterns**: See "Common Anti-Patterns to Avoid" section

## Core Technologies

### Frontend Stack
- **Framework**: Next.js 15.1.3 (App Router)
- **UI**: React 19, TailwindCSS 3.4.17, shadcn/ui
- **State**: Zustand for global state
- **Charts**: Recharts for data visualization
- **Testing**: Vitest 3.2.4, Testing Library, Playwright
- **Node.js**: v22 LTS (specified in `.nvmrc`)

### Backend Stack
- **Framework**: FastAPI (Python 3.13.9)
- **Database**: PostgreSQL with SQLAlchemy
- **Cache**: Redis
- **Testing**: Pytest with coverage, asyncio_mode=auto
- **Type Checking**: MyPy with pydantic & sqlalchemy plugins
- **Linting**: Ruff (target: py313)

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
- **ESLint Rules**:
  - `no-unused-vars`: Warn (prefix with `_` to intentionally mark unused)
  - `consistent-type-imports`: Use `import type` for type-only imports
  - `no-console`: Warn (allows `console.warn` and `console.error`)
  - `prefer-const`: Enforced for variables never reassigned

### Python
- Type hints required for all functions
- Use Black for formatting (line length: 88)
- Follow PEP 8 conventions
- Docstrings for all public functions
- **Ruff Config**: Target Python 3.13, rules include E, F, W, I, C4, SIM, PTH
- **MyPy Plugins**: pydantic.mypy, sqlalchemy.ext.mypy.plugin enabled

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
3. **Config Updated** → `config/coverage.config.json` (single source of truth) updated
4. **Docs Synced** → All 6+ documentation files automatically synchronized
5. **Auto-Committed** → Changes committed with `[skip ci]` tag

**Key Points for Developers:**
- ✅ **No manual updates needed** - System handles everything automatically
- ✅ **Always current** - Coverage metrics update after every test run in CI/CD
- ✅ **Single source of truth** - `config/coverage.config.json` is the master config
- ✅ **Verification only** - Use `npm run coverage:verify` for local checks

**Current Coverage** (auto-updated):
- Frontend: 11.61% (passing 10% threshold ✅)
- Backend: 27% (below 80% target ⚠️)
- Overall: 19.31% (passing 20% threshold ✅)

**Coverage Documentation:**
- Master Config: `/config/coverage.config.json`
- Baseline: `/docs/guides/coverage.md`
- Automation: Fully integrated in CI/CD workflows

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

1. **checklists.md** (`/docs/checklists.md`) - Use for **repeatable processes**:
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
    ├── security-scanner.ps1         # Security scanning
    └── setup-precommit-hooks.ps1    # Git pre-commit hooks
```

## Common Patterns

> **📚 Pattern Library**: For battle-tested patterns with success metrics, examples, and anti-patterns, see:
> - **Testing Patterns** - AsyncMock, Pure Functions, Mathematical Indicator Testing, Fixtures
> - **UI/UX Patterns** - React Keyboard Shortcuts
> - **CI/CD Patterns** - Workflow Health Check, GitHub CLI Investigation, Service Config Standards
> - **Code Quality Patterns** - TypeScript Any Elimination, Zustand+Immer, Draft<T>, Python Ruff, ESLint
> - **Dependencies** - Conflict Resolution, Pin vs Replace, Renovate Migration, Security Patches
> - **Python Patterns** - Python 3.10 Compatibility, UTC Import, Lambda UTC
> - **Debugging Patterns** - Root Cause Analysis, Log Analysis

### Quick Code Templates (For Copilot Generation)

**Note**: These are minimal boilerplate templates for fast code generation. For comprehensive production patterns with real-world examples and success metrics, see the Pattern Library above.

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

### Zustand Store Pattern (Basic)

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

**TypeScript Type Inference Best Practices** (Sprint 3 learnings):
```typescript
// ❌ BAD: Redundant type annotations when TypeScript can infer
const numbers = [1, 2, 3];
numbers.map((n: number) => n * 2);  // number is inferred from array
store.subscribe((state: StoreType) => ...);  // StoreType inferred from store

// ✅ GOOD: Let TypeScript infer when obvious
numbers.map((n) => n * 2);  // Inferred
store.subscribe((state) => ...);  // Inferred

// ✅ GOOD: Annotate when inference needs help
const data = response.data as ApiResponse;  // Type assertion when needed
const callback: (id: string) => void = handleDelete;  // Complex callback
```

**Acceptable `any` Categories** (Document inline with reason):
```typescript
// ✅ ACCEPTABLE: Dynamic configuration systems
const config: Record<string, any> = { ... };  // any required: user-defined config values

// ✅ ACCEPTABLE: Generic performance wrappers (variadic arguments)
function debounce<T extends (...args: any[]) => any>(fn: T): T { ... }  // any required: variadic args

// ✅ ACCEPTABLE: External API adapters (varying formats)
function normalizeData(raw: any): NormalizedType { ... }  // any required: external API formats vary

// ✅ ACCEPTABLE: Plugin systems (runtime loading)
const plugin: any = (globalThis as any).dynamicPlugin;  // any required: runtime plugin loading

// ✅ ACCEPTABLE: Browser APIs with incomplete types
const observer = new PerformanceObserver((list: any) => { ... });  // any required: PerformanceObserverEntryList incomplete

// ✅ ACCEPTABLE: Test mocking (test files only)
const mockFn = vi.fn() as any;  // any required: flexible test mock

// ❌ NEVER ACCEPTABLE: Lack of effort or laziness
function process(data: any) { ... }  // NO - define proper interface!
const items: any[] = [...];  // NO - use proper Item[] type!
```

**Zustand + Immer Store Pattern**: For type-safe state mutations with `Draft<T>`, see **Zustand+Immer Pattern** via Pattern Library MCP.

**React Event Handler Types** (Common patterns):
```typescript
import type React from 'react';

// ✅ GOOD: Use React type imports for all event handlers
const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => { ... };
const handleTextArea = (e: React.ChangeEvent<HTMLTextAreaElement>) => { ... };
const handleSelect = (e: React.ChangeEvent<HTMLSelectElement>) => { ... };
const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => { ... };
const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => { ... };
const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => { ... };

// ❌ BAD: Don't use any for event handlers
const handleChange = (e: any) => { ... };  // NO!
```

**API Response Types** (External data):
```typescript
// ✅ GOOD: Define interfaces for API responses
interface ApiResponse<T> {
  data: T;
  status: number;
  message: string;
}

async function fetchData(): Promise<ApiResponse<User[]>> {
  const response = await fetch('/api/users');
  return response.json();  // Type-safe return
}

// ❌ BAD: Implicit any return
async function fetchData() {  // Returns Promise<any>
  const response = await fetch('/api/users');
  return response.json();
}
```

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

**For TypeScript/Frontend Work**:

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

**Why This Matters**:
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

**If Validation Fails**:
- ❌ DO NOT claim session complete
- 🔧 Fix errors immediately while context is fresh
- 📝 Document what went wrong and prevention strategy
- ✅ Re-run validation until all steps pass

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

## Pre-Flight Checks & Code Generation

**🎯 CRITICAL: Always verify context and environment BEFORE taking action**

These checks prevent wasted effort, broken code, and misaligned implementations. Every code generation, file operation, or dependency installation MUST follow this checklist.

### 1. Path & Directory Verification (MANDATORY)

**Before ANY file operation (create, edit, install dependencies):**

✅ **Verify correct directory context**:
```powershell
# Check current working directory
Get-Location

# Verify you're in the correct subdirectory
# Frontend work: apps/frontend/
# Backend work: apps/backend/
# Infrastructure: infra/docker/
# Documentation: docs/
# Tools: tools/

# Navigate to correct directory BEFORE operations
cd apps/frontend  # For frontend work
cd apps/backend   # For backend work
```

✅ **Use absolute paths when invoking tools**:
```typescript
// ❌ BAD - Relative path (ambiguous)
create_file("components/Button.tsx", content)

// ✅ GOOD - Absolute path (explicit)
create_file("c:\\Users\\USER\\Desktop\\lokifi\\apps\\frontend\\src\\components\\Button.tsx", content)
```

✅ **Verify write permissions and directory existence**:
```powershell
# Check if directory exists before creating files
Test-Path "apps/frontend/src/components"

# Create directory if needed (tools handle this, but verify first)
```

**Common Path Mistakes to Avoid**:
- ❌ Installing frontend packages while in `apps/backend/`
- ❌ Creating backend files in `apps/frontend/src/`
- ❌ Running `npm` commands from project root instead of `apps/frontend/`
- ❌ Running `pip` commands from project root instead of `apps/backend/`

### 2. Project Context Matching (CRITICAL)

**Before generating ANY code, verify you understand:**

✅ **Tech stack and versions**:
- Frontend: Next.js 15.1.3 (App Router), React 19, TypeScript, Vitest 3.2.4
- Backend: FastAPI, Python 3.13.9, Pytest
- State: Zustand for global state (NOT Redux, NOT Context API)
- Styling: TailwindCSS 3.4.17 + shadcn/ui (NOT CSS modules, NOT styled-components)

✅ **Framework-specific patterns**:
```typescript
// ✅ GOOD - Lokifi uses Zustand stores
import { usePortfolioStore } from '@/lib/stores/portfolioStore';

// ❌ BAD - Don't suggest Redux when project uses Zustand
import { useDispatch, useSelector } from 'react-redux';

// ✅ GOOD - Next.js App Router (app/)
export default function Page() { ... }

// ❌ BAD - Don't suggest Pages Router (pages/)
export default function HomePage() { ... }
```

✅ **Existing dependencies**:
```powershell
# Check package.json BEFORE suggesting new dependencies
cd apps/frontend
Get-Content package.json | Select-String -Pattern "recharts|zustand|vitest"

# Check requirements.txt for backend
cd apps/backend
Get-Content requirements.txt | Select-String -Pattern "fastapi|pytest|sqlalchemy"
```

**Anti-Pattern Examples**:
- ❌ Suggesting `axios` when project uses native `fetch`
- ❌ Recommending `jest` when project uses `vitest`
- ❌ Proposing `unittest` when project uses `pytest`
- ❌ Using `styled-components` when project uses TailwindCSS

### 3. Code Organization & Conventions (FOLLOW EXISTING PATTERNS)

**Before creating new files, understand the project structure:**

✅ **Frontend file organization**:
```
apps/frontend/src/
├── app/              # Next.js App Router pages (route handlers)
├── components/       # React components (PascalCase.tsx)
│   ├── ui/          # shadcn/ui components
│   └── dashboard/   # Domain-specific components
├── lib/             # Utilities and helpers
│   ├── stores/      # Zustand stores (camelCase + Store.tsx)
│   ├── api/         # API client utilities
│   └── utils/       # Helper functions
├── hooks/           # Custom React hooks (use*.ts)
└── tests/           # Vitest tests (*.test.ts(x))
```

✅ **Backend file organization**:
```
apps/backend/app/
├── api/             # API routes (FastAPI routers)
├── core/            # Core functionality (config, security)
├── models/          # SQLAlchemy models + Pydantic schemas
├── services/        # Business logic layer
└── tests/           # Pytest tests (test_*.py)
```

✅ **Naming conventions**:
- **Components**: `PascalCase.tsx` (e.g., `PriceChart.tsx`)
- **Stores**: `camelCaseStore.tsx` (e.g., `portfolioStore.tsx`)
- **Utilities**: `kebab-case.ts` (e.g., `format-currency.ts`)
- **Hooks**: `useCamelCase.ts` (e.g., `usePortfolio.ts`)
- **Tests**: `*.test.ts` (frontend), `test_*.py` (backend)

✅ **Import paths**:
```typescript
// ✅ GOOD - Use @ alias for src imports
import { usePortfolioStore } from '@/lib/stores/portfolioStore';
import { Button } from '@/components/ui/button';

// ❌ BAD - Don't use relative paths for src imports
import { usePortfolioStore } from '../../lib/stores/portfolioStore';
```

**Pre-Creation Checklist**:
- [ ] File location matches project structure
- [ ] Naming convention follows project standards
- [ ] Import paths use `@/` alias (frontend)
- [ ] Component/Store/Test pattern matches existing files

### 4. Documentation & Comment Standards (KEEP DOCS CURRENT)

**Before claiming "work complete", ensure documentation is updated:**

✅ **Documentation updates required**:
- **README.md**: Update if adding new features, dependencies, or setup steps
- **checklists.md**: Update "Current Focus" section for sprint objectives, update process checklists if new workflows introduced
- **Todo list**: Mark completed tasks, add new follow-up tasks
- **Git commits**: Use as source of truth for detailed history and sprint transitions

✅ **Code comment standards**:
```typescript
// ✅ GOOD - Explain WHY, not WHAT
// Feature flags OFF by default to prevent incomplete features in production
if (!FLAGS.monitoring) return '';

// ❌ BAD - Obvious comment (WHAT)
// Return empty string if monitoring flag is false
if (!FLAGS.monitoring) return '';

// ✅ GOOD - Document acceptable 'any' types
const handleError = (error: any) => {  // any required: browser Error types vary
  logError(error);
};

// ✅ GOOD - TODO comments with context
// TODO: Add input validation after API schema finalized (Sprint 4)
```

✅ **Inline task tracking**:
```typescript
// Use these tags for inline task tracking (TODO Tree extension scans these)
// TODO: Task to be completed
// FIXME: Known bug that needs fixing
// BUG: Critical bug blocking functionality
// HACK: Temporary workaround (technical debt)
// OPTIMIZE: Performance improvement opportunity
// REFACTOR: Code cleanup needed
// SECURITY: Security concern to address
// PERF: Performance bottleneck
// NOTE: Important context for future developers
// REVIEW: Needs code review or validation
```

**Documentation Anti-Patterns**:
- ❌ Marking session complete without updating todo list
- ❌ Creating new docs when existing docs should be updated (see "Documentation Management Guidelines")
- ❌ Leaving TODO comments without context or session reference
- ❌ Documenting WHAT code does instead of WHY

### 5. Pre-Flight Quality Checks (RUN BEFORE CLAIMING COMPLETE)

**Before committing or claiming "session complete", run these checks:**

✅ **Frontend checks**:
```powershell
cd apps/frontend

# 1. Type safety (CRITICAL - catches errors build misses)
npm run typecheck

# 2. Linting (catches code smells)
npm run lint

# 3. Formatting (auto-fix if using Prettier)
# Should auto-run on save - verify no manual changes needed

# 4. Tests (if you modified logic)
npm test

# 5. Build verification (production readiness)
npm run build
```

✅ **Backend checks**:
```powershell
cd apps/backend

# 1. Activate virtual environment first
./venv/Scripts/Activate.ps1  # Windows
source venv/bin/activate      # Linux/Mac

# 2. Type checking (Python 3.13.9 type hints)
# (No explicit command - pytest validates types)

# 3. Linting (Ruff for fast linting)
ruff check .

# 4. Formatting (Black for code formatting)
black . --check  # Check only
black .          # Auto-format

# 5. Tests (if you modified logic)
pytest

# 6. Coverage (optional but recommended)
pytest --cov
```

✅ **CI/CD workflow checks** (if modified `.github/workflows/`):
```powershell
# Validate workflow syntax
./tools/actionlint .github/workflows/*.yml

# Validate YAML syntax
# (Use yamllint if available, or check in VS Code)
```

**Pre-Commit Validation Order** (MANDATORY):
1. **Typecheck/Lint** → Fix errors immediately
2. **Format** → Auto-fix with formatters
3. **Test** → Only if logic changed (not for pure type work)
4. **Build** → Verify production readiness
5. **Commit** → Only after ALL checks pass

### 6. Change Communication & Integration (COORDINATE WITH TEAM)

**Before pushing changes, ensure proper communication:**

✅ **Commit message standards**:
```bash
# Format: <type>(<scope>): <description>
# Types: feat, fix, docs, style, refactor, test, chore

# ✅ GOOD - Clear, specific, with context
feat(types): portfolioStore.tsx type-safe (150 any → 5 acceptable)
fix(backend): datetime.timezone import error in advanced_redis_client.py
docs(session27): test coverage discovery + backend pytest fix

# ❌ BAD - Vague, no context
fix: fixed bugs
update: changes
WIP: stuff
```

✅ **Pull request requirements**:
- **Title**: Clear summary of changes
- **Description**: Context, problem solved, approach taken
- **Testing**: Steps to verify changes
- **Screenshots**: For UI changes
- **Breaking changes**: Clearly documented
- **References**: Link related issues/PRs

✅ **CHANGELOG.md updates** (for significant features):
```markdown
## [Unreleased]

### Added
- Session 27: Test coverage discovery and backend datetime fix

### Fixed
- Backend pytest import error (datetime.timezone.utc)

### Changed
- Enhanced copilot-instructions.md with pre-flight checks
```

✅ **Dependency updates** (document in PRs):
```markdown
**Dependencies Added:**
- None (used existing vitest)

**Dependencies Updated:**
- None

**Breaking Changes:**
- None - backward compatible
```

**Communication Anti-Patterns**:
- ❌ Pushing to main without todo list updates
- ❌ Commit messages like "fix", "update", "WIP"
- ❌ Adding dependencies without documenting in package.json
- ❌ Breaking changes without migration guide

### 7. World-Class Pre-Flight Checklist Summary

**Use this checklist BEFORE every significant code operation:**

```markdown
## 🛫 Pre-Flight Checklist

### Context Verification
- [ ] Confirmed current working directory (Get-Location)
- [ ] Verified correct subdirectory (apps/frontend/ or apps/backend/)
- [ ] Checked existing file structure (ls or Get-ChildItem)
- [ ] Reviewed package.json/requirements.txt for dependencies

### Pattern Matching
- [ ] Tech stack matches project (Zustand not Redux, Vitest not Jest)
- [ ] Framework version correct (Next.js 15.1.3 App Router)
- [ ] File naming follows conventions (PascalCase, camelCase, kebab-case)
- [ ] Import paths use @ alias (frontend)

### Code Organization
- [ ] File location matches project structure
- [ ] Component/Store/Test pattern matches existing files
- [ ] No duplicate functionality (checked for existing implementations)
- [ ] Follows established patterns (Zustand stores, FastAPI routes)

### Quality Checks
- [ ] TypeScript typecheck passes (npm run typecheck)
- [ ] Linting passes (npm run lint or ruff check)
- [ ] Tests pass (npm test or pytest)
- [ ] Build succeeds (npm run build)

### Documentation
- [ ] Todo list updated (manage_todo_list)
- [ ] Inline comments explain WHY not WHAT
- [ ] Acceptable any types documented

### Communication
- [ ] Commit message follows convention
- [ ] Changes documented in commit description
- [ ] Breaking changes noted (if any)
- [ ] Dependencies documented (if added/updated)
```

**When to Use This Checklist**:
- ✅ Before creating new files or components
- ✅ Before installing dependencies
- ✅ Before significant refactoring
- ✅ Before claiming "session complete"
- ✅ Before pushing commits to remote

**When to Skip** (simple operations):
- Reading files or documentation
- Small text edits (typo fixes)
- Running diagnostic commands
- Answering informational questions

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

### Quality Metrics & Success Patterns

**Key Insight**: For type safety work, TypeScript compilation IS the validation. If it compiles without errors, the types are correct.

**Success Factors**:
1. TypeScript compilation verifies all types
2. Build success confirms no breaking changes
3. Auto-formatters handle style automatically
4. Pattern consistency across codebase
5. Only type annotations changed, not runtime logic

## Security Best Practices

### Frontend Security
- **Never use `eval()` or `Function()` constructors** - XSS vulnerabilities
- **Avoid `dangerouslySetInnerHTML`** - Use DOMPurify if absolutely needed
- **Sanitize all user inputs** - Especially before API calls
- **Use environment variables** - Never hardcode API keys or secrets
- **Validate on both frontend and backend** - Defense in depth
- **Security Headers** (configured in `next.config.mjs`):
  - `X-Content-Type-Options: nosniff` - Prevents MIME-type sniffing
  - `X-Frame-Options: DENY` - Prevents clickjacking
  - `X-XSS-Protection: 1; mode=block` - Legacy XSS protection
  - `Referrer-Policy: strict-origin-when-cross-origin` - Controls referrer info

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

### YAML Linter False Positives (GitHub Actions)

**Known Issue**: VS Code YAML extension reports "Context access might be invalid" for GitHub Actions expressions like `${{ steps.step_id.outputs.output_name }}`.

**Why This Happens**:
- YAML linters don't understand GitHub Actions expression syntax
- Context properties with hyphens (e.g., `severity-emoji`, `commit-sha`) are flagged as invalid
- These warnings are **FALSE POSITIVES** - the expressions are valid and required

**Solution Applied**:
1. **`.yamllint.yml` configuration**: Relaxed rules for GitHub Actions workflows
2. **Workflow file comments**: Added explicit notes that warnings are expected
3. **Documentation**: This section explains the issue for future reference

**Reference**:
- GitHub Actions Expressions: https://docs.github.com/en/actions/learn-github-actions/expressions
- Session 65: Fixed ~35 false positive warnings across 2 workflow files

**Pattern to Recognize**:
```yaml
# ✅ VALID - Despite YAML linter warnings
payload: |
  {
    "text": "${{ steps.details.outputs.commit-sha }}"
  }

# These are VALID GitHub Actions expressions:
# - steps.details.outputs.severity-emoji ✅
# - steps.details.outputs.workflow-url ✅
# - steps.details.outputs.commit-message ✅
```

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
gh pr checks <pr-number> --repo ericsocrat/Lokifi

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
2. **Update existing**: Prefer updating checklists.md or existing guides
3. **Avoid duplication**: Don't create session-specific docs when Git commits track history
4. **Archive outdated**: Move replaced documents to .archive/ folder with context
5. **Document decisions**: Add to existing decision logs, not new files

**Examples**:
- ❌ **Bad**: Create `NEW_SPRINT_PLAN.md` when `checklists.md` "Current Focus" section exists
- ✅ **Good**: Update `checklists.md` "Current Focus" section with sprint objectives
- ❌ **Bad**: Create `SESSION_NOTES.md` when Git commits provide detailed history
- ✅ **Good**: Write comprehensive Git commit messages with all session details
- ❌ **Bad**: Create `DEPLOYMENT_CHECKLIST.md` when `checklists.md` exists
- ✅ **Good**: Update `checklists.md` with new deployment section
- ❌ **Bad**: Create `TESTING_BEST_PRACTICES.md` when `TESTING_GUIDE.md` exists
- ✅ **Good**: Update `TESTING_GUIDE.md` with new best practices section
- ❌ **Bad**: Keep both old and new versions of same document
- ✅ **Good**: Archive old version to `.archive/` folder, update all cross-references

**Archive Structure**:
- Use `.archive/` subfolder within category (e.g., `docs/guides/.archive/`)
- Preserve historical documents for reference
- Update parent README.md to explain archived content
- Update all cross-references to point to new locations

## 📚 Pattern Library

> **⚡ ACCESS PATTERNS VIA MCP**: Use Pattern Library MCP Server for instant access to 37+ battle-tested patterns. All pattern details, code examples, anti-patterns, and success metrics available on-demand.

**Pattern Library Location**: `/docs/architecture/patterns/` (single source of truth)

**Quick MCP Queries**:
- "Show me the AsyncMock pattern" - Get full pattern with code examples
- "List all testing patterns" - See 14 testing patterns
- "Get success metrics" - View overall success rates and top patterns
- "Search patterns for [keyword]" - Find relevant patterns by topic

**Pattern Categories** (37 patterns across 7 categories):
- **Testing** (14) - AsyncMock, Mathematical Indicator Testing, Mock side_effect, 2-Tier Caching, Frontend React Testing, Pure Functions, Fixtures, Branch Coverage
- **CI/CD** (4) - Workflow Health Check, GitHub CLI Investigation, Service Config Standards, Working Directory Context
- **Code Quality** (5) - Zustand+Immer, TypeScript Any Elimination, Draft<T> Mutations, Python Ruff, ESLint Quality
- **Dependencies** (4) - Conflict Resolution, Pin vs Replace, Renovate Migration, Security Patch Evaluation
- **Python** (7) - arg-type Elimination, attr-defined Elimination, Assignment Errors, Python 3.10 Compatibility, UTC Imports
- **Debugging** (2) - Root Cause Analysis, Log Analysis
- **Security** (2) - Secure Logging, Security Implementation

**Success Metrics**: 96% average success rate, 500+ percentage points coverage gained, 100+ hours saved

**Pattern Documentation**: See `/docs/architecture/patterns/README.md` for complete index with difficulty ratings, success rates, impact levels, and decision trees.

**Note**: Full pattern details (Problem, Context, Solution, Examples, Anti-Patterns, References) available via MCP - no need to search files manually!

## Documentation References

> **💡 MCP Integration**: All documentation searchable via Documentation Search MCP Server. Query: "Search docs for [topic]" or "Show me the [guide name]"

**Quick Access Documentation** (Most Frequently Referenced):
- **Process Checklists + Current Focus**: `/docs/checklists.md` - ALL repeatable workflows + active sprint objectives ⭐⭐⭐
- **Pattern Library**: See "Pattern Library" section above - Use MCP for full details ⭐
- **Frontend Testing Patterns**: `/docs/guides/testing/frontend-testing-patterns.md` - Session 79 comprehensive guide ⭐⭐⭐
- **Backend Testing Patterns**: `/docs/guides/testing/external-api-testing-patterns.md` - Session 77 comprehensive guide ⭐⭐⭐

**Type Safety Documentation**:
- **attr-defined Elimination**: `/docs/development/type-safety/attr-defined-elimination-session76.md` ⭐ 🏆
- **arg-type Elimination**: `/docs/development/type-safety/arg-type-elimination-session75.md` ⭐ 🏆
- **Assignment Error Patterns**: `/docs/development/assignment-error-patterns-session74.md` ⭐
- **Cascading Type Fixes**: `/docs/development/type-safety/cascading-type-fixes.md` ⭐
- **MyPy Analysis**: `/docs/development/mypy-error-analysis-session73.md` ⭐

**Core Guides** (Use MCP for search):
- **Workflow**: `/docs/guides/workflow.md` - Setup, daily workflows, PR process
- **Testing**: `/docs/guides/overview.md` - Comprehensive testing guide
- **Standards**: `/docs/guides/standards.md` - Code style and conventions
- **Architecture**: `/docs/guides/structure.md` - Project structure

**CI/CD & Deployment** (Use MCP for search):
- **CI/CD Optimization**: `/docs/ci-cd/optimization.md` - Workflow optimization
- **Renovate Bot**: `/docs/ci-cd/dependencies/renovate-evaluation.md` - Dependency management
- **Deployment**: `/docs/deployment/README.md` - Production deployment guides
- **DNS Configuration**: `/docs/deployment/dns.md` - Domain setup

**Complete Documentation Index**: `/docs/README.md` - Use MCP to search across all 109+ files ⭐

## Common Commands

### Development Server Management

**Start All Services (Recommended):**
```powershell
# VS Code Command Palette (Ctrl+Shift+P / Cmd+Shift+P)
Tasks: Run Task → 🚀 Start All Servers

# This starts (in sequence):
# 1. Redis (Docker Compose) - Port 6379 - Completes and closes terminal
# 2. PostgreSQL (Docker Compose) - Port 5432 - Completes and closes terminal
# 3. Backend (FastAPI) - Port 8000 - Persistent terminal with hot-reload
# 4. Frontend (Next.js) - Port 3000 - Persistent terminal with hot-reload
# 5. Coverage Dashboard - Port 3002 - Persistent terminal serving live metrics ⭐
```

**Architecture:**
- **Docker Compose Services** (Redis, PostgreSQL): Start via `infra/docker/docker-compose.yml`
  - Containers: `lokifi-redis-dev`, `lokifi-postgres-dev`
  - Run in background, terminals close after startup
- **Local Terminal Services** (Backend, Frontend, Dashboard): Run in VS Code terminals
  - Keep terminals open for logs and hot-reload
  - Press Ctrl+C to stop individual services

**Service URLs:**
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs
- **Coverage Dashboard**: http://localhost:3002 ⭐ (Live test coverage metrics)

**Stop All Services:**
```powershell
Tasks: Run Task → 🛑 Stop All Servers
# Stops Docker Compose services (Redis, PostgreSQL)
# Manually close terminal servers (Backend, Frontend, Dashboard) with Ctrl+C
```

**Restart All Services:**
```powershell
Tasks: Run Task → 🔄 Restart All Servers
# 1. Stops Docker Compose services
# 2. Shows instructions to close terminal servers
# 3. Re-run "🚀 Start All Servers" after closing terminals
```

**Coverage Dashboard Features:**
- Real-time metrics, file-level breakdown, trend analysis, protected thresholds
- Documentation: `/docs/development/tooling/coverage-dashboard-*.md`

### GitHub CLI (Workflow Monitoring & Health Checks)
```powershell
# PR Status & Workflow Monitoring
gh pr view <pr-number> --repo ericsocrat/Lokifi              # View PR details
gh pr checks <pr-number> --repo ericsocrat/Lokifi            # Check all workflow statuses
gh pr view <pr-number> --json statusCheckRollup              # JSON format for parsing

# Workflow Run Management
gh run list --repo ericsocrat/Lokifi --branch <branch-name>
gh run view <run-id> --repo ericsocrat/Lokifi       # View specific run details
gh run view <run-id> --repo ericsocrat/Lokifi --log-failed  # Get failure logs
gh run rerun <run-id> --repo ericsocrat/Lokifi      # Rerun failed workflow

# Security & Dependency Management
gh api /repos/ericsocrat/Lokifi/code-scanning/alerts # CodeQL alerts
# Renovate dashboard: https://developer.mend.io/

# Workflow Health Check Examples
gh pr checks <pr-number> --repo ericsocrat/Lokifi | Select-String "failing|successful"
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
npm run typecheck    # TypeScript type checking (tsc --noEmit)
npm run build        # Production build
```

### Root Workspace Scripts (Convenience Commands)
```bash
# From project root - run these without changing directories
npm run dev          # Start frontend dev server
npm run dev:frontend # Alias: frontend dev server
npm run dev:backend  # Start backend with uvicorn
npm run build        # Build frontend for production
npm run lint         # Lint frontend
npm run lint:backend # Lint backend with ruff
npm run typecheck    # TypeScript typecheck
npm run test         # Run frontend tests
npm run test:coverage # Frontend tests with coverage
npm run clean        # Clean all build artifacts
npm run clean:frontend # Clean frontend (.next, node_modules)
npm run clean:backend  # Clean backend (__pycache__, venv)
```

### Backend
```bash
uvicorn app.main:app --reload  # Start dev server
pytest                         # Run tests
pytest --cov                   # With coverage
black .                        # Format code
ruff check                     # Lint code
ruff check --fix               # Auto-fix lint issues
mypy .                         # Type checking with plugins
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
.\tools\codebase-analyzer.ps1

# Export to JSON for CI/CD integration
.\tools\codebase-analyzer.ps1 -OutputFormat json

# Region-specific cost estimates (US, EU, Asia, Remote)
.\tools\codebase-analyzer.ps1 -Region eu -Detailed

# Compare with previous analysis
.\tools\codebase-analyzer.ps1 -CompareWith "path/to/previous-report.md"
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

## 🛠️ VS Code Copilot Tool Sets

**Status**: ✅ Configured - 5 tool sets active for automated workflow assistance

Lokifi uses custom Copilot Tool Sets to automatically execute project-specific commands. These are pre-configured command groups that Copilot can use based on context.

### Available Tool Sets

**1. Lokifi Testing** 🧪
- **Purpose**: Run tests, check coverage, validate code quality
- **When Used**: Test execution, coverage analysis, pre-commit validation
- **Key Commands**:
  - `.\tools\test-runner.ps1` (Smart, All, PreCommit modes)
  - `npm test`, `npm run test:coverage` (Frontend)
  - `pytest`, `pytest --cov` (Backend)
  - Coverage dashboard server

**2. Lokifi Quality Checks** ✅
- **Purpose**: Type checking, linting, code formatting validation
- **When Used**: Pre-commit checks, CI debugging, quality assurance
- **Key Commands**:
  - `npm run typecheck`, `npm run lint`, `npm run build` (Frontend)
  - `ruff check .`, `black . --check` (Backend)
  - Pre-commit validation workflows

**3. Lokifi Development** 🚀
- **Purpose**: Start/stop servers, manage development environment
- **When Used**: Starting development session, server management
- **Key Commands**:
  - VS Code tasks (Start All Servers, Stop All Servers)
  - Docker Compose commands (up, down, logs)
  - Service status checks

**4. Lokifi Debugging** 🔍
- **Purpose**: CI/CD investigation, logs, workflow debugging
- **When Used**: CI failures, workflow debugging, error investigation
- **Key Commands**:
  - GitHub CLI debugging (`gh pr checks`, `gh run view --log-failed`)
  - Local debugging (git status, typecheck with error filtering)
  - Error log analysis

**5. Lokifi Deployment** 📊
- **Purpose**: Deployment checks, Docker builds, production validation
- **When Used**: Pre-deployment validation, production deployment
- **Key Commands**:
  - Pre-deployment checks (test-runner PreCommit mode)
  - Docker production builds
  - Health check validation

### How Tool Sets Work

**Automatic Invocation**:
- Copilot automatically suggests relevant tool sets based on conversation context
- Example: Discussing test failures → Copilot offers "Lokifi Testing" tools
- Example: Debugging CI → Copilot offers "Lokifi Debugging" tools

**Manual Invocation**:
- Reference tool sets by name: "Run the Lokifi Testing tool set"
- Ask for specific commands: "Use the test-runner with PreCommit mode"
- Copilot will execute appropriate commands from the tool set

**Integration with Instructions**:
- Tool sets complement the documentation in this file
- Commands match patterns described in "Common Commands" section
- Pre-configured to use correct working directories and flags

### Best Practices

- ✅ Let Copilot suggest tool sets automatically based on context
- ✅ Tool sets respect project structure (apps/frontend, apps/backend)
- ✅ Commands include proper error handling and output formatting
- ✅ Tool sets integrate with existing VS Code tasks
- ❌ Don't manually run commands that tool sets can handle
- ❌ Don't override tool set paths unless troubleshooting

## 📊 MCP Coverage Server

> **⚡ REAL-TIME COVERAGE**: Query test coverage metrics instantly without running tests via MCP.

**Status**: ✅ Active - 7 tools for coverage analysis 🆕 +2

**Quick MCP Queries**:
- "What's my test coverage?" - Overall metrics + threshold status
- "Which files need more tests?" - Top 20 low-coverage files
- "Show coverage trends" - Historical comparison
- "Coverage for portfolioStore" - Line-by-line analysis
- "Am I ready to merge?" - Threshold validation
- "Show coverage by directory" 🆕 - Category breakdown (components/, lib/stores/, hooks/)
- "Prioritize my testing work" 🆕 - Smart recommendations with scoring

**Coverage Tools** (7):
1. **get_coverage_summary** - Quick overview (metrics, test counts, thresholds)
2. **get_low_coverage_files** - Find testing priorities (sorted by coverage %)
3. **get_coverage_trends** - Track improvements over time
4. **get_file_coverage** - Detailed file analysis (uncovered lines)
5. **check_coverage_thresholds** - Pre-merge validation (pass/fail)
6. **get_coverage_by_category** 🆕 - Group by directory, identify weak areas
7. **suggest_test_priorities** 🆕 - Multi-factor scoring (coverage + complexity + criticality)

**Benefits**:
- Query coverage without running tests (saves 30-60 seconds)
- Pre-commit validation without CI wait
- Data-driven test suggestions with smart prioritization 🆕
- Track progress automatically by category 🆕

**Documentation**: `/tools/mcp-coverage-server.js` | `/docs/development/tooling/mcp-coverage-server.md`

## 🤖 MCP Tooling Ecosystem

> **⚡ 4 ACTIVE MCP SERVERS**: 25 tools provide instant access to patterns, docs, git history, and coverage.

**Status**: ✅ Production-Ready - Node.js v18.0.0+ required

**MCP Servers** (4 servers, 25 tools):
1. **Pattern Library** - 37 patterns from `/docs/architecture/patterns/` (6 tools) 🆕 +2
2. **Documentation Search** - 109 markdown files indexed (6 tools) 🆕 +2
3. **Git History** - 883+ commits searchable (6 tools) 🆕 +2
4. **Coverage** - Real-time test metrics (7 tools) 🆕 +2

**Quick Example Queries**:
- Patterns: "Show me the AsyncMock pattern" | "List testing patterns" | "Compare AsyncMock vs Pure Functions" 🆕 | "Recommend patterns for API testing" 🆕
- Docs: "Search docs for deployment" | "Show testing best practices" | "What changed in the last 7 days?" 🆕 | "Find docs related to mcp-coverage-server.md" 🆕
- Git: "What was done in Session 75?" | "Search commits for 'MCP'" | "Show commits that modified portfolioStore.tsx" 🆕 | "Compare main vs feature/mcp-enhancements" 🆕
- Coverage: "What's my coverage?" | "Which files need tests?" | "Show coverage by directory" 🆕 | "Prioritize my testing work" 🆕

**Benefits**:
- ✅ Instant access - No manual file searching
- ✅ Context-aware - AI knows project patterns/conventions
- ✅ Session recovery - Recover lost chat context via git history
- ✅ Data-driven - Coverage metrics inform test suggestions

**Configuration**: `.vscode/settings.json` (gitignored) - See `/docs/development/tooling/` for setup guides

**Troubleshooting**:
- **Not responding**: Restart VS Code (MCP servers initialize on startup)
- **Node.js**: Verify `node --version` ≥18.0.0
- **SDK**: Check `cd tools && npm list @modelcontextprotocol/sdk`

**Documentation**:
- Pattern Library: `/docs/development/tooling/mcp-pattern-library.md`
- Docs Search: `/docs/development/tooling/mcp-docs-search.md`
- Git History: `/docs/development/tooling/mcp-git-history.md`
- Coverage: `/docs/development/tooling/mcp-coverage-server.md`

## Tips for Best Results

### Use Workspace Context
- Use `@workspace` to query entire codebase
- Use the file reference syntax with hash symbol followed by file: and the filename
- Highlight code in your editor to provide targeted context for questions

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
