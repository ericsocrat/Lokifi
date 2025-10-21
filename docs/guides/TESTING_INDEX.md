# 🧪 Testing Documentation Index

Welcome to the Lokifi testing documentation! This index will help you find the information you need.

## 📚 Documentation Overview

### 🎯 Start Here
- **[Quick Reference Card](TEST_QUICK_REFERENCE.md)** - One-page cheat sheet for quick lookups
- **[Testing Guide](TESTING_GUIDE.md)** - Complete guide to testing in Lokifi
- **[Integration Tests Guide](INTEGRATION_TESTS_GUIDE.md)** - Integration testing specifics

### 📂 Quick References
- **[Quick Reference Card](TEST_QUICK_REFERENCE.md)** - Fast command reference
- **[Backend Tests README](../../apps/backend/tests/README.md)** - Backend testing quick reference
- **[Frontend Tests README](../../apps/frontend/tests/README.md)** - Frontend testing quick reference

## 🗂️ Test Structure

### Backend (`apps/backend/tests/`)
```bash
├── api/              # 6 files - REST API endpoint tests
├── unit/             # 15 files - Unit tests for individual components
├── integration/      # 4 files - Multi-component integration tests
├── e2e/              # 1 file - End-to-end workflow tests
├── services/         # 2 files - Business logic service tests
└── security/         # 2 files - Security and authentication tests
```bash

### Frontend (`apps/frontend/tests/`)
```bash
├── api/              # API contract and integration tests
├── components/       # React component tests
├── unit/             # Unit tests for functions, hooks, utilities
├── e2e/              # End-to-end user workflow tests
├── security/         # XSS, CSRF, auth, validation tests
├── lib/              # Library and utility tests
├── a11y/             # Accessibility tests (WCAG compliance)
├── visual/           # Visual regression tests
└── types/            # TypeScript type tests
```bash

## 📊 Current Status

| Metric | Value | Target | Status |
|--------|-------|--------|--------|
| Backend Coverage | 20.5% | 80%+ | ⚠️ In Progress |
| Frontend Coverage | 12.1% | 80%+ | ⚠️ In Progress |
| Overall Coverage | 16.3% | 20%+ | ⚠️ Below Threshold |
| Total Test Files | 60+ | Growing | ✅ Good |

## 🚀 Quick Start

### Running Tests

**Backend Tests (pytest)**:
```bash
cd apps/backend
pytest tests/                              # All tests
pytest tests/api/                          # API tests only
pytest tests/unit/                         # Unit tests only
pytest tests/ --cov                        # With coverage
pytest tests/api/test_auth_endpoints.py    # Specific file
```

**Frontend Tests (Vitest)**:
```bash
cd apps/frontend
npm test                                   # All tests
npm test -- tests/components/              # Component tests
npm run test:coverage                      # With coverage
npm test -- PriceChart.test.tsx            # Specific file
```

**Traditional Methods** (Still supported):
```bash
# Backend
pytest                              # All tests
pytest apps/backend/tests/api/      # API tests only
pytest --cov=app --cov-report=html  # With coverage

# Frontend
npm test                            # All tests
npm test -- tests/components/       # Component tests only
npm run test:coverage               # With coverage
```bash

**Check Coverage**:
```bash
# Backend
cd apps/backend
pytest --cov=app --cov-report=html

# Frontend
cd apps/frontend
npm run test:coverage
```

### Writing Tests

1. **Choose test type**: Unit, Integration, E2E, API, Service, or Security
2. **Place in correct directory**
3. **Follow naming conventions**:
   - Backend: `test_<feature>.py`
   - Frontend: `<Component>.test.tsx` or `<module>.test.ts`
4. **Follow the pattern** (see Testing Guide)
5. **Run and verify**

## 📖 Documentation Guide

### For New Team Members
1. Start with **[Quick Reference Card](TEST_QUICK_REFERENCE.md)** - One-page cheat sheet
2. Check **[Testing Guide](TESTING_GUIDE.md)** - Complete testing practices
3. Check **[Backend README](../../apps/backend/tests/README.md)** or **[Frontend README](../../apps/frontend/tests/README.md)**
4. Look at existing tests for examples
5. Write your first test following the patterns
6. Run with: `npm test` or `pytest`

### For Existing Team Members
1. **[Quick Reference Card](TEST_QUICK_REFERENCE.md)** - Fast command lookup
2. **[Testing Guide](TESTING_GUIDE.md)** - Reference for conventions and best practices
3. Check updated test organization structure

### For Test Coverage Improvement
1. Check current coverage: `./tools/ci-cd/enhanced-ci-protection.ps1`
2. Identify gaps: `pytest --cov=app --cov-report=html` (backend) or `npm run test:coverage` (frontend)
3. Choose test type based on what needs coverage
4. Write tests following the guide
5. Verify improvement

## 🎓 Learning Path

### Level 1: Beginner
- [ ] Read [Testing Guide](guides/TESTING_GUIDE.md) overview
- [ ] Understand test organization structure
- [ ] Run existing tests locally
- [ ] Read backend/frontend READMEs
- [ ] Look at simple unit test examples

### Level 2: Intermediate
- [ ] Write your first unit test
- [ ] Write a component test (frontend) or API test (backend)
- [ ] Use fixtures and mocks
- [ ] Run tests with coverage
- [ ] Fix a failing test

### Level 3: Advanced
- [ ] Write integration tests
- [ ] Write E2E tests
- [ ] Mock external services
- [ ] Optimize test performance
- [ ] Review others' tests
- [ ] Improve test coverage

## 🛠️ Test Types Reference

| Type | Speed | Isolation | Scope | Coverage |
|------|-------|-----------|-------|----------|
| **Unit** | ⚡⚡⚡ Fast | ✅ High | Single function/class | High (80%+) |
| **Integration** | ⚡⚡ Medium | ⚠️ Medium | Multiple components | Medium (60%+) |
| **E2E** | ⚡ Slow | ❌ Low | Complete workflow | Low (20%+) |
| **API** | ⚡⚡ Medium | ✅ High | REST endpoints | High (100%) |
| **Service** | ⚡⚡ Medium | ✅ High | Business logic | High (80%+) |
| **Security** | ⚡⚡ Medium | ✅ High | Auth, validation | Critical (100%) |

## 🔧 Tools & Frameworks

### Backend
- **pytest** - Test framework
- **pytest-asyncio** - Async test support
- **FastAPI TestClient** - API testing
- **unittest.mock** - Mocking
- **coverage.py** - Coverage reporting

### Frontend
- **Vitest** / **Jest** - Test framework
- **React Testing Library** - Component testing
- **@testing-library/user-event** - User interactions
- **MSW** - API mocking
- **Playwright** / **Cypress** - E2E testing

## 📝 Best Practices Summary

### ✅ Do
- Test behavior, not implementation
- Use descriptive test names
- Follow AAA pattern (Arrange, Act, Assert)
- Keep tests independent
- Mock external dependencies
- Test error cases
- Clean up after tests

### ❌ Don't
- Test implementation details
- Share state between tests
- Test third-party libraries
- Use production database
- Skip error testing
- Ignore test failures

## 🚦 CI/CD Integration

Tests run automatically on:
- ✅ Pull requests
- ✅ Commits to main
- ✅ Before deployments

### Quality Gates
1. **Code Quality** - Linting, formatting
2. **Test Coverage** - Minimum 20% (target 80%+)
3. **Security Scan** - No critical vulnerabilities
4. **Performance** - Build time < 5 minutes

Run protection check:
```bash
./tools/ci-cd/enhanced-ci-protection.ps1
```bash

## 📞 Getting Help

### Resources
1. **[Testing Guide](guides/TESTING_GUIDE.md)** - Comprehensive guide
2. **Backend/Frontend READMEs** - Quick references
3. **Existing tests** - Look for examples
4. **Team chat** - Ask questions
5. **Documentation links** - External resources

### Common Issues
- **Tests not found**: Check file naming (`test_*.py` or `*.test.ts`)
- **Import errors**: Check Python path or TypeScript config
- **Async errors**: Use proper async/await patterns
- **Mock not working**: Verify mock setup and patching

## 🎯 Goals

### Short Term (Q4 2025)
- [ ] Reach 20% overall coverage (CI gate)
- [ ] Document all test patterns
- [ ] Set up E2E test infrastructure
- [ ] Add security test suite

### Medium Term (Q1 2026)
- [ ] Reach 50% overall coverage
- [ ] Implement visual regression testing
- [ ] Add performance benchmarks
- [ ] Automate test generation

### Long Term (Q2 2026)
- [ ] Reach 80%+ overall coverage
- [ ] Full E2E test coverage
- [ ] Automated accessibility testing
- [ ] Continuous test improvement

## 📅 Recent Updates

### October 10, 2025
- ✅ Fixed test coverage calculation
- ✅ Organized all backend tests into categories
- ✅ Created comprehensive testing documentation
- ✅ Added quick reference READMEs
- ✅ Verified CI integration

## 🔗 External Resources

### Backend Testing
- [Pytest Documentation](https://docs.pytest.org/)
- [FastAPI Testing Guide](https://fastapi.tiangolo.com/tutorial/testing/)
- [Coverage.py Documentation](https://coverage.readthedocs.io/)

### Frontend Testing
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Vitest Documentation](https://vitest.dev/)
- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Testing Library Queries](https://testing-library.com/docs/queries/about)

## 📄 License & Contributing

Follow the [Contributing Guidelines](../CONTRIBUTING.md) when adding tests.

---

**Last Updated**: October 10, 2025
**Maintained By**: Development Team
**Questions?** Check the guides or ask in team chat!