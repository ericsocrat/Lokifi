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
└── infra/                # Infrastructure & DevOps
    └── docker/           # Docker configurations
        ├── .env          # Production secrets (gitignored)
        ├── .env.example  # Template for .env
        ├── docker-compose.yml              # Local development
        ├── docker-compose.production.yml   # Full production
        └── docker-compose.prod-minimal.yml # Production (cloud DB)
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

## Documentation References

When suggesting code or answering questions, prefer these docs:
- **Testing**: `/docs/TEST_QUICK_REFERENCE.md`
- **Standards**: `/docs/CODING_STANDARDS.md`
- **Architecture**: `/docs/REPOSITORY_STRUCTURE.md`
- **Copilot Guide**: `/.vscode/COPILOT_GUIDE.md`
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

### TypeScript Type Fixing (Replaces universal-fixer.ps1)
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
