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
├── frontend/          # Next.js application
│   ├── app/          # Next.js App Router pages
│   ├── components/   # React components
│   ├── lib/          # Utilities and helpers
│   ├── hooks/        # Custom React hooks
│   └── tests/        # Vitest test files
├── backend/          # FastAPI application
│   ├── app/          # Main application code
│   │   ├── api/      # API routes
│   │   ├── core/     # Core functionality
│   │   ├── models/   # SQLAlchemy models
│   │   └── services/ # Business logic
│   └── tests/        # Pytest test files
└── docs/             # Documentation
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

## Common Commands

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
