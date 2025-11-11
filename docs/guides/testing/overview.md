# Testing Guide for Lokifi

## Overview
This guide provides comprehensive information about the testing structure, conventions, and best practices for the Lokifi project.

## Test Organization

### Backend Tests (`apps/backend/tests/`)

```
tests/
├── api/                    # API endpoint tests
│   ├── test_api.py
│   ├── test_auth_endpoints.py
│   ├── test_endpoints.py
│   ├── test_follow_endpoints.py
│   ├── test_profile_endpoints.py
│   └── test_health.py
│
├── unit/                   # Unit tests for individual components
│   ├── test_auth.py
│   ├── test_follow.py
│   ├── test_follow_actions.py
│   ├── test_follow_extended.py
│   ├── test_follow_notifications.py
│   ├── test_j52_features.py
│   ├── test_j52_imports.py
│   ├── test_j53_features.py
│   ├── test_j6_notifications.py
│   ├── test_j63_core.py
│   ├── test_j64_quality_enhanced.py
│   ├── test_minimal_server.py
│   ├── test_phase_j2_frontend.py
│   ├── test_server_startup.py
│   └── test_specific_issues.py
│
├── integration/            # Integration tests (multiple components)
│   ├── test_phase_j2_comprehensive.py
│   ├── test_phase_j2_enhanced.py
│   ├── test_j62_comprehensive.py
│   └── test_track4_comprehensive.py
│
├── e2e/                    # End-to-end tests (complete workflows)
│   └── test_j6_e2e_notifications.py
│
├── services/               # Service layer tests
│   ├── test_ai_chatbot.py
│   └── test_direct_messages.py
│
└── security/               # Security-related tests
    ├── test_alert_system.py
    └── test_security_features.py
```

### Frontend Tests (`apps/frontend/tests/`)

```
tests/
├── api/                    # API contract and integration tests
│   └── contracts/
│       ├── auth.contract.test.ts
│       ├── ohlc.contract.test.ts
│       └── websocket.contract.test.ts
│
├── components/             # React component tests
│   ├── DrawingLayer.test.tsx
│   └── PriceChart.test.tsx
│
├── unit/                   # Unit tests
│   ├── chart-reliability.test.tsx
│   ├── formattingAndPortfolio.test.ts
│   └── multiChart.test.tsx
│
├── e2e/                    # End-to-end tests
│   └── (E2E tests go here)
│
├── security/               # Security tests
│   ├── auth-security.test.ts
│   └── input-validation.test.ts
│
├── lib/                    # Library/utility tests
│   ├── perf.test.ts
│   └── webVitals.test.ts
│
├── a11y/                   # Accessibility tests
│   └── (Accessibility tests go here)
│
├── visual/                 # Visual regression tests
│   └── (Visual tests go here)
│
└── types/                  # TypeScript type tests
    └── (Type tests go here)
```

## Naming Conventions

### Backend (Python)
- **Test files**: `test_<feature_name>.py`
- **Test classes**: `Test<FeatureName>` (optional, for grouping)
- **Test functions**: `test_<specific_behavior>()`
- **Fixtures**: Use pytest fixtures with descriptive names

Example:
```python
# test_auth.py
import pytest

@pytest.fixture
async def authenticated_client():
    """Create a test client with authentication"""
    # setup code
    yield client
    # teardown code

class TestAuthentication:
    async def test_register_new_user(self, client):
        """Test successful user registration"""
        # test code

    async def test_login_with_valid_credentials(self, authenticated_client):
        """Test login with valid credentials"""
        # test code
```

### Frontend (TypeScript)
- **Test files**: `<component-name>.test.tsx` or `<module-name>.test.ts`
- **Test suites**: `describe('<Component/Feature Name>', () => {})`
- **Test cases**: `it('should <expected behavior>', () => {})` or `test('<behavior>', () => {})`

Example:
```typescript
// PriceChart.test.tsx
import { render, screen } from '@testing-library/react';
import { PriceChart } from './PriceChart';

describe('PriceChart', () => {
  it('should render without crashing', () => {
    render(<PriceChart data={mockData} />);
    expect(screen.getByTestId('price-chart')).toBeInTheDocument();
  });

  it('should display correct price data', () => {
    render(<PriceChart data={mockData} />);
    expect(screen.getByText('$100.00')).toBeInTheDocument();
  });
});
```

## Test Types

### 1. Unit Tests
**Purpose**: Test individual functions, classes, or components in isolation.

**Location**:
- Backend: `tests/unit/`
- Frontend: `tests/unit/`

**Characteristics**:
- Fast execution
- No external dependencies
- Mock all external calls
- Test single responsibility

**Example**:
```python
# Backend unit test
def test_calculate_portfolio_value():
    portfolio = Portfolio([
        Asset(symbol="BTC", amount=1.0, price=50000),
        Asset(symbol="ETH", amount=10.0, price=3000)
    ])
    assert portfolio.total_value() == 80000
```

### 2. Integration Tests
**Purpose**: Test how multiple components work together.

**Location**: `tests/integration/`

**Characteristics**:
- Test component interactions
- May use test database
- More comprehensive than unit tests
- Slower than unit tests

**Example**:
```python
# Backend integration test
async def test_user_registration_and_login_flow(client, db_session):
    # Register user
    response = await client.post("/api/auth/register", json=user_data)
    assert response.status_code == 201

    # Login with registered user
    response = await client.post("/api/auth/login", json=login_data)
    assert response.status_code == 200
    assert "access_token" in response.json()
```

### 3. End-to-End (E2E) Tests
**Purpose**: Test complete user workflows from start to finish.

**Location**: `tests/e2e/`

**Characteristics**:
- Test entire application flow
- Use real or test database
- Simulate real user interactions
- Slowest but most comprehensive

**Example**:
```python
# Backend E2E test
async def test_complete_notification_workflow(client, websocket_client):
    # Create notification
    # Verify notification stored in database
    # Verify websocket notification sent
    # Verify notification appears in UI
    # Clear notification
    # Verify notification cleared
```

### 4. API Tests
**Purpose**: Test REST API endpoints.

**Location**: `tests/api/`

**Characteristics**:
- Test request/response
- Validate status codes
- Check response schemas
- Test error handling

### 5. Service Tests
**Purpose**: Test business logic services.

**Location**: `tests/services/`

**Characteristics**:
- Test service layer
- Mock dependencies
- Focus on business rules

### 6. Security Tests
**Purpose**: Test security features and vulnerabilities.

**Location**: `tests/security/`

**Characteristics**:
- Test authentication/authorization
- Test input validation
- Test rate limiting
- Test XSS/CSRF protection

## Running Tests

### Backend Tests

```bash
# Run all tests
pytest

# Run specific test directory
pytest apps/backend/tests/unit/
pytest apps/backend/tests/integration/

# Run specific test file
pytest apps/backend/tests/api/test_auth_endpoints.py

# Run specific test
pytest apps/backend/tests/api/test_auth_endpoints.py::test_register_user

# Run with coverage
pytest --cov=app --cov-report=html

# Run in verbose mode
pytest -v

# Run with output
pytest -s
```

### Frontend Tests

```bash
# Run all tests
npm test

# Run specific test file
npm test -- PriceChart.test.tsx

# Run with coverage
npm run test:coverage

# Run in watch mode
npm test -- --watch

# Run E2E tests
npm run test:e2e
```

## Test Coverage

### Current Coverage Status
- **Backend**: 21%
- **Frontend**: 13.7%
- **Overall**: 17.4%
- **Target**: 20%+

### Coverage Goals
- **Unit Tests**: Aim for 80%+ coverage
- **Integration Tests**: Cover critical user paths
- **E2E Tests**: Cover main user workflows
- **API Tests**: 100% endpoint coverage

### Checking Coverage

```bash
# Backend
cd apps/backend
pytest --cov=app --cov-report=html
# Open apps/backend/htmlcov/index.html

# Frontend
cd apps/frontend
npm run test:coverage
# Open coverage/index.html
```

### Running CI Coverage Check

```bash
# Run the enhanced CI protection script
./tools/test-runner.ps1 -PreCommit
```

## Best Practices

### General
1. **Test Behavior, Not Implementation**: Focus on what the code does, not how it does it
2. **Keep Tests Independent**: Each test should run independently
3. **Use Descriptive Names**: Test names should describe what is being tested
4. **Follow AAA Pattern**: Arrange, Act, Assert
5. **Mock External Dependencies**: Use mocks/stubs for external services
6. **Keep Tests Fast**: Unit tests should run in milliseconds
7. **One Assertion Per Test**: Ideally test one thing at a time
8. **Use Fixtures**: Reuse common setup code

### Backend-Specific
1. **Use Async/Await**: For async code in FastAPI
2. **Clean Up After Tests**: Use fixtures with cleanup
3. **Use Test Database**: Never test against production
4. **Test Error Cases**: Don't just test happy paths
5. **Use Factories**: For creating test data
6. **Test Permissions**: Verify authorization checks

### Frontend-Specific
1. **Test User Interactions**: Use @testing-library/react
2. **Avoid Implementation Details**: Test from user perspective
3. **Mock API Calls**: Use MSW or similar
4. **Test Accessibility**: Include a11y tests
5. **Snapshot Testing**: Use sparingly, for stable components
6. **Test Loading States**: Test loading, error, and success states

## Writing New Tests

### Adding a Backend Test

1. **Identify Test Type**: Unit, Integration, E2E, API, Service, or Security
2. **Create Test File**: In appropriate directory
3. **Import Dependencies**:
   ```python
   import pytest
   from fastapi.testclient import TestClient
   from app.main import app
   ```
4. **Create Fixtures** (if needed):
   ```python
   @pytest.fixture
   async def client():
       transport = ASGITransport(app=app)
       async with AsyncClient(transport=transport, base_url="http://testserver") as ac:
           yield ac
   ```
5. **Write Test**:
   ```python
   async def test_feature_name(client):
       # Arrange
       data = {"key": "value"}

       # Act
       response = await client.post("/api/endpoint", json=data)

       # Assert
       assert response.status_code == 200
       assert response.json()["key"] == "value"
   ```

### Adding a Frontend Test

1. **Create Test File**: Next to component or in appropriate test directory
2. **Import Dependencies**:
   ```typescript
   import { render, screen, fireEvent } from '@testing-library/react';
   import { ComponentName } from './ComponentName';
   ```
3. **Write Test**:
   ```typescript
   describe('ComponentName', () => {
     it('should render correctly', () => {
       // Arrange
       const props = { title: 'Test' };

       // Act
       render(<ComponentName {...props} />);

       // Assert
       expect(screen.getByText('Test')).toBeInTheDocument();
     });
   });
   ```

## Debugging Tests

### Backend
```bash
# Run with debugging output
pytest -s -vv

# Run with pdb (Python debugger)
pytest --pdb

# Stop on first failure
pytest -x
```

### Frontend
```bash
# Run with debugging
npm test -- --verbose

# Update snapshots
npm test -- -u

# Run specific test with debugging
npm test -- --testNamePattern="should render"
```

## Continuous Integration

The CI pipeline automatically runs tests on:
- Pull requests
- Commits to main branch
- Before deployments

### CI Protection Gates
1. **Code Quality**: Linting, formatting
2. **Test Coverage**: Minimum 20% coverage
3. **Security Scan**: No critical vulnerabilities
4. **Performance**: Build time < 5 minutes

## Resources

### Backend Testing
- [Pytest Documentation](https://docs.pytest.org/)
- [FastAPI Testing](https://fastapi.tiangolo.com/tutorial/testing/)
- [Coverage.py](https://coverage.readthedocs.io/)

### Frontend Testing
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Vitest Documentation](https://vitest.dev/)

## Contributing

When contributing tests:
1. Follow the naming conventions
2. Place tests in appropriate directories
3. Write descriptive test names
4. Include docstrings/comments
5. Ensure tests pass before committing
6. Update this guide if needed

## Questions?

If you have questions about testing:
1. Check this guide first
2. Look at existing tests for examples
3. Ask in the team chat
4. Review the linked resources

---

## Integration Testing

Integration tests verify that all services (backend, frontend, database, Redis) work together correctly in a Docker environment.

### Quick Start - Running Integration Tests Locally

```bash
# 1. Start services
docker compose -f infra/docker/docker-compose.yml up -d

# 2. Wait for services to be ready
curl http://localhost:8000/api/health  # Backend
curl http://localhost:3000/            # Frontend

# 3. Run tests
npm ci --legacy-peer-deps
# Backend: pytest apps/backend/tests/integration/
# Frontend: npm test -- integration

# 4. Stop services
docker compose -f infra/docker/docker-compose.yml down -v
```

### Docker Services Configuration

**Services Included:**
1. **PostgreSQL** - Database (port 5432)
2. **Redis** - Cache/Queue (port 6379)
3. **Backend** - FastAPI (port 8000)
4. **Frontend** - Next.js (port 3000)

**Startup Sequence:**
1. PostgreSQL starts (~5 seconds)
2. Redis starts (~3 seconds)
3. Backend starts (~10 seconds) - Connects to database/Redis, runs migrations
4. Frontend starts (~15 seconds) - Builds Next.js, starts server

**Total startup time:** ~30-40 seconds

### Health Endpoints

**Backend Health Check:**
- **URL:** `http://localhost:8000/api/health`
- **Expected Response:**
  ```json
  {
    "ok": true
  }
  ```

**Frontend Health Check:**
- **URL:** `http://localhost:3000/`
- **Expected:** 200 OK (renders page)

### CI/CD Automation

**Workflow File:** `.github/workflows/integration-ci.yml`

**Triggers:**
- Push to `main`
- Pull requests to `main`

**Steps:**
1. Build Docker images
2. Start services
3. Wait for health checks
4. Run integration tests
5. Show logs on failure
6. Cleanup

**Duration:** ~5-8 minutes

### Troubleshooting Integration Tests

#### Services Won't Start
```bash
# Check service status
docker compose -f infra/docker/docker-compose.yml ps

# View logs
docker compose -f infra/docker/docker-compose.yml logs

# Restart services
docker compose -f infra/docker/docker-compose.yml restart
```

#### Health Checks Failing
```bash
# Test backend directly
docker exec -it lokifi-backend-dev curl http://localhost:8000/api/health

# Check backend logs
docker compose -f infra/docker/docker-compose.yml logs backend
```

#### Port Conflicts
```bash
# Check what's using ports
netstat -ano | findstr "8000"  # Backend
netstat -ano | findstr "3000"  # Frontend
netstat -ano | findstr "5432"  # PostgreSQL
netstat -ano | findstr "6379"  # Redis

# Kill processes or change ports in docker-compose.yml
```

#### Database Connection Issues
```bash
# Test database connection
docker exec -it lokifi-postgres-dev psql -U lokifi -d lokifi_db -c "SELECT 1;"

# Check database logs
docker compose -f infra/docker/docker-compose.yml logs postgres
```

### Common Docker Commands

```bash
# Start services
docker compose -f infra/docker/docker-compose.yml up -d

# Stop services
docker compose -f infra/docker/docker-compose.yml down

# Stop and remove volumes (clean slate)
docker compose -f infra/docker/docker-compose.yml down -v

# View logs (all services)
docker compose -f infra/docker/docker-compose.yml logs -f

# View specific service logs
docker compose -f infra/docker/docker-compose.yml logs backend -f

# Rebuild images
docker compose -f infra/docker/docker-compose.yml build --no-cache

# Restart a service
docker compose -f infra/docker/docker-compose.yml restart backend

# Execute command in container
docker exec -it lokifi-backend-dev bash
```

### Integration Testing Checklist

Before pushing changes:

- [ ] Services start successfully
- [ ] Health endpoints return 200
- [ ] Backend can connect to database
- [ ] Backend can connect to Redis
- [ ] Frontend can reach backend
- [ ] Integration tests pass
- [ ] Services shut down cleanly

### Success Criteria

Integration tests are passing when:

✅ All services start within timeout (90s)
✅ Health endpoints return 200
✅ No error logs in services
✅ Tests complete successfully
✅ Services shut down cleanly

### Environment Differences

| Environment | Purpose | Dockerfile | Port |
|-------------|---------|------------|------|
| Development | Local dev with hot reload | Dockerfile.dev | Default |
| Integration | Automation testing | Dockerfile | Default |
| Production | Deployed application | Dockerfile.prod | Configured |

### Known Issues

1. **First build takes longer** - Docker layer caching helps subsequent builds
2. **Port conflicts** - Stop other local services if needed
3. **Volume permissions** - May need to adjust on some systems

---

## Related Documentation

### Testing Patterns & Best Practices
- [Frontend Testing Patterns](./frontend-testing-patterns.md) - AsyncMock for React, Mathematical Indicator Testing (9 indicators proven)
- [Backend Testing Patterns](./external-api-testing-patterns.md) - External API mocking, AsyncMock for Python (157 tests proven)
- [Backend Coverage Best Practices](./backend-coverage-best-practices.md) - Branch coverage, smart exclusions, pytest patterns
- [Coverage Baseline](./coverage.md) - Coverage thresholds and tracking

### Development Tools
- [Coverage Dashboard](../../development/tooling/coverage-dashboard-integration.md) - Real-time coverage metrics
- [MCP Coverage Server](../../development/tooling/mcp-coverage-server.md) - AI-powered coverage insights
- [Quick Reference](../../development/tooling/coverage-dashboard-quick-ref.md) - Coverage dashboard shortcuts

### Infrastructure & Setup
- [Developer Workflow](../../development/setup/workflow.md) - Complete development setup
- [Docker Configuration](../../../infra/docker/docker-compose.yml) - Local development services
- [Environment Setup](../../security/environment.md) - Environment variables configuration
- [Database Guide](../backend/database/postgresql.md) - PostgreSQL configuration
- [Cache Guide](../backend/database/redis.md) - Redis configuration

### API & Architecture
- [API Reference](../../api/reference.md) - Complete API endpoint documentation
- [API Overview](../../api/overview.md) - API design and conventions
- [Architecture Structure](../../architecture/structure.md) - Project structure and organization

### CI/CD & Quality
- [CI/CD Guide](../../ci-cd/guides/workflow-guide.md) - Complete CI/CD pipeline explanation
- [Performance Guide](../../ci-cd/guides/performance.md) - CI/CD performance metrics and optimizations
- [Quality Standards](../quality/standards.md) - Code quality requirements
- [Quality Overview](../quality/overview.md) - Quality tooling and automation

---

**Last Updated**: November 11, 2025
**Status**: ✅ Consolidated from overview.md + integration.md
**Maintainer**: Development Team
