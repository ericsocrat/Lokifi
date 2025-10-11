# Backend Tests

This directory contains all backend tests organized by type.

## Directory Structure

```
tests/
├── api/              # API endpoint tests (REST API)
├── unit/             # Unit tests (individual functions/classes)
├── integration/      # Integration tests (multiple components)
├── e2e/              # End-to-end tests (complete workflows)
├── services/         # Service layer tests (business logic)
└── security/         # Security tests (auth, validation, etc.)
```

## Quick Start

### Run All Tests
```bash
pytest
```

### Run Specific Category
```bash
pytest tests/api/           # API tests only
pytest tests/unit/          # Unit tests only
pytest tests/integration/   # Integration tests only
pytest tests/e2e/           # E2E tests only
pytest tests/services/      # Service tests only
pytest tests/security/      # Security tests only
```

### Run With Coverage
```bash
pytest --cov=app --cov-report=html
```

### Run Specific Test File
```bash
pytest tests/api/test_auth_endpoints.py
```

### Run Specific Test
```bash
pytest tests/api/test_auth_endpoints.py::test_register_user
```

## Test Categories Explained

### API Tests (`api/`)
- Test REST API endpoints
- Validate request/response
- Check status codes and schemas
- Test error handling

**Examples**: Authentication endpoints, user profile endpoints, health checks

### Unit Tests (`unit/`)
- Test individual functions or classes
- Fast execution
- No external dependencies
- Fully mocked

**Examples**: Business logic functions, utility functions, model methods

### Integration Tests (`integration/`)
- Test multiple components working together
- May use test database
- Test component interactions
- More comprehensive than unit tests

**Examples**: Complete feature workflows, database operations with API calls

### E2E Tests (`e2e/`)
- Test complete user workflows
- From frontend to database
- Simulate real user scenarios
- Slowest but most comprehensive

**Examples**: Complete notification workflow from creation to UI display

### Service Tests (`services/`)
- Test business logic services
- Service layer between API and data
- Mock external dependencies
- Focus on business rules

**Examples**: AI chatbot service, messaging service, notification service

### Security Tests (`security/`)
- Test authentication and authorization
- Test input validation
- Test rate limiting
- Test XSS/CSRF protection

**Examples**: Security alert system, permission checks, data sanitization

## Writing New Tests

1. **Choose the right directory** based on test type
2. **Name your test file**: `test_<feature_name>.py`
3. **Follow the pattern**:

```python
import pytest
from fastapi.testclient import TestClient
from app.main import app

@pytest.fixture
async def client():
    """Create test client"""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as ac:
        yield ac

async def test_feature_name(client):
    """Test description"""
    # Arrange
    data = {"key": "value"}
    
    # Act
    response = await client.post("/api/endpoint", json=data)
    
    # Assert
    assert response.status_code == 200
    assert response.json()["key"] == "value"
```

## Current Coverage

- **Backend**: 20.5%
- **Target**: 80%+

## Best Practices

✅ Test behavior, not implementation
✅ Keep tests independent
✅ Use descriptive test names
✅ Follow AAA pattern (Arrange, Act, Assert)
✅ Mock external dependencies
✅ Clean up after tests
✅ Test error cases

❌ Don't test implementation details
❌ Don't share state between tests
❌ Don't test third-party libraries
❌ Don't use production database

## More Information

See the comprehensive [Testing Guide](../../../docs/guides/TESTING_GUIDE.md) for:
- Detailed examples
- Best practices
- Debugging tips
- CI/CD integration
- And more...

---

**Need Help?** Check the [Testing Guide](../../../docs/guides/TESTING_GUIDE.md) or ask the team!
