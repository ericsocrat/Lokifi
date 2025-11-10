# Copilot Quick Reference Card

> 🚀 **Fast access to Copilot tips and shortcuts for Lokifi development**

## ⌨️ Essential Shortcuts

| Action | Windows/Linux | Mac | Description |
|--------|---------------|-----|-------------|
| **Accept suggestion** | `Tab` | `Tab` | Accept current inline suggestion |
| **Reject suggestion** | `Esc` | `Esc` | Dismiss current suggestion |
| **Next suggestion** | `Alt + ]` | `Option + ]` | Cycle to next suggestion |
| **Previous suggestion** | `Alt + [` | `Option + [` | Cycle to previous suggestion |
| **Inline chat** | `Ctrl + I` | `Cmd + I` | Open inline chat for quick edits |
| **Copilot chat** | `Ctrl + Shift + I` | `Cmd + Shift + I` | Open Copilot chat panel |
| **Explain this** | `Ctrl + K, E` | `Cmd + K, E` | Explain selected code |

## 💡 Quick Prompts

### Frontend (TypeScript/React)

```typescript
// Component with state and effects
// Create a user profile component with form validation

// Store with persistence
// Create a Zustand store for theme preferences with localStorage

// Tests
// Generate Vitest tests with 80% coverage for this component

// Styling
// Add Tailwind CSS responsive layout with dark mode
```

### Backend (Python/FastAPI)

```python
# API endpoint
# Create FastAPI endpoint for user authentication with JWT

# Model
# Create SQLAlchemy model for Transaction with User relationship

# Tests
# Generate pytest tests including error cases

# Schema
# Create Pydantic schema with validation
```

### Testing

```typescript
// Unit test
// Generate unit tests covering edge cases

// Mock
// Create mock data factory for realistic test data

// Integration
// Create integration test for this API flow
```

## 🎯 Best Practices (Quick Version)

### ✅ DO
- Write descriptive comments before code
- Use TypeScript with explicit types
- Keep related files open for context
- Accept good suggestions quickly
- Use inline chat for refactoring

### ❌ DON'T
- Use `any` types (be specific)
- Write vague function names
- Leave too many tabs open
- Accept suggestions without review
- Store secrets in comments

## 📐 Project Patterns

### TypeScript
```typescript
// Functional component
const Component: React.FC<Props> = ({ prop }) => {
  // Hooks at top
  const [state, setState] = useState();

  // Effects
  useEffect(() => {}, []);

  // Handlers
  const handleClick = () => {};

  // Render
  return <div />;
};
```

### Python
```python
# FastAPI endpoint
@router.get("/endpoint", response_model=Schema)
async def get_data(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Schema:
    """Google-style docstring."""
    # Implementation
    return result
```

### Testing (Vitest)
```typescript
describe('Component', () => {
  it('should do something', () => {
    // Arrange
    const props = {};

    // Act
    render(<Component {...props} />);

    // Assert
    expect(screen.getByText('...')).toBeInTheDocument();
  });
});
```

## 🔥 Common Tasks

### Create Component
1. Type component name
2. Let Copilot suggest structure
3. Add comment: `// Component for [purpose]`
4. Accept suggestions
5. Refine with inline chat if needed

### Write Tests
1. Create test file: `Component.test.tsx`
2. Comment: `// Tests for Component with 80% coverage`
3. Type: `describe('Component', () => {`
4. Let Copilot generate test cases
5. Review and customize

### Refactor Code
1. Select code to refactor
2. Press `Ctrl/Cmd + I`
3. Type: "Refactor to use async/await"
4. Review suggestion
5. Accept or iterate

## 📊 Quality Checklist

Before accepting suggestions:
- [ ] Types are explicit (no `any`)
- [ ] Naming is clear and descriptive
- [ ] Error handling is included
- [ ] Code follows project patterns
- [ ] No hardcoded secrets/credentials
- [ ] Tests are comprehensive

## 🚨 When Copilot Struggles

**Issue:** Generic suggestions
**Fix:** Add more context in comments or keep related files open

**Issue:** Wrong patterns
**Fix:** Use inline chat with explicit instructions

**Issue:** Incomplete code
**Fix:** Add more specific comments about expected behavior

**Issue:** Wrong imports
**Fix:** Open the file with correct imports first

## 📚 Learn More

### VS Code Configuration
- **Full Guide**: `.vscode/COPILOT_GUIDE.md`
- **Configuration**: `.vscode/settings.json`
- **Summary**: `.vscode/COPILOT_OPTIMIZATION_SUMMARY.md`
- **Excluded Files**: `.copilotignore`

### Project Documentation
- **[Copilot Instructions](../../.github/copilot-instructions.md)** - Complete project patterns, conventions, and quality standards
- **[Pattern Library](../architecture/patterns/README.md)** - 44 battle-tested patterns from 89+ sessions
- **[Documentation Home](../README.md)** - Complete documentation index
- **[Development Guides](./README.md)** - All development guides overview

### Testing & Quality
- **[Frontend Testing Patterns](./frontend-testing-patterns.md)** - Comprehensive React/TypeScript testing guide
- **[Backend Testing Patterns](./external-api-testing-patterns.md)** - Python/FastAPI testing patterns
- **[Backend Coverage Best Practices](./backend-coverage-best-practices.md)** - Branch coverage and smart exclusions

---

**Pro Tip:** Keep this file open in a pinned tab for quick reference! 📌
