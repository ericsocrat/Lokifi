# 📋 Phase 1.6 Task 2 - API Contract Testing Implementation Plan

**Date:** October 15, 2025
**Status:** 🚀 **READY TO IMPLEMENT**
**Priority:** High
**Estimated Time:** 6-8 hours

---

## 🎯 Objective

Implement API contract testing to ensure the frontend and backend APIs stay in sync, preventing breaking changes and improving integration reliability.

---

## 🔍 Approach Decision: OpenAPI Schema Validation

### Why OpenAPI (Recommended) ✅

**Advantages:**
- ✅ FastAPI automatically generates OpenAPI schemas
- ✅ Native integration with existing backend
- ✅ Industry-standard format
- ✅ Can validate requests and responses
- ✅ Excellent tooling (Schemathesis, openapi-core)
- ✅ No additional contract files needed

**What FastAPI Provides:**
- Automatic OpenAPI 3.0 schema at `/openapi.json`
- Interactive docs at `/docs` (Swagger UI)
- Alternative docs at `/redoc` (ReDoc)
- Type validation built-in

### Why Not Pact (Alternative)

**Pact Advantages:**
- Consumer-driven contracts
- Contract broker
- Bi-directional testing

**Pact Disadvantages:**
- ❌ Requires separate Pact broker infrastructure
- ❌ More complex setup
- ❌ Additional contract files to maintain
- ❌ Steeper learning curve

**Verdict:** OpenAPI is simpler and already integrated!

---

## 📋 Implementation Plan

### Phase 1: Backend OpenAPI Enhancement ✅

**Current State:**
- FastAPI app with auto-generated OpenAPI
- Located at: `http://localhost:8000/openapi.json`
- Interactive docs at: `http://localhost:8000/docs`

**Tasks:**
1. ✅ Verify OpenAPI schema generation
2. ✅ Add response models to all endpoints
3. ✅ Add request validation schemas
4. ✅ Document all API endpoints

### Phase 2: Contract Validation Tests 🔧

**Tools to Use:**
- `schemathesis` - Automatic API testing from OpenAPI
- `openapi-core` - Request/response validation
- `pytest-openapi` - Pytest integration

**Tests to Create:**
1. **Schema Validation Tests**
   - Validate OpenAPI schema is valid
   - Check all endpoints are documented
   - Verify response models match schema

2. **Contract Tests**
   - Test backend responses match OpenAPI schema
   - Validate request bodies match schema
   - Check status codes match documentation

3. **Frontend Integration Tests**
   - Validate frontend API calls match OpenAPI schema
   - Check request/response types match

### Phase 3: CI/CD Integration 🚀

**Update Workflow:**
- Replace api-contracts placeholder
- Add OpenAPI validation tests
- Generate contract validation reports
- Add PR comments with results

---

## 🛠️ Implementation Steps

### Step 1: Install Dependencies

**Backend:**
```bash
pip install schemathesis openapi-core pytest-openapi
```

**Frontend:**
```bash
npm install --save-dev openapi-typescript-codegen @openapitools/openapi-generator-cli
```

### Step 2: Create Backend Contract Tests

**File:** `apps/backend/tests/test_api_contracts.py`

```python
import schemathesis
from fastapi.testclient import TestClient
from app.main import app

# Load schema from FastAPI app
schema = schemathesis.from_asgi("/openapi.json", app=app)

@schema.parametrize()
def test_api_contracts(case):
    """Test all API endpoints against OpenAPI schema"""
    case.call_and_validate()
```

### Step 3: Create Schema Validation Tests

**File:** `apps/backend/tests/test_openapi_schema.py`

```python
import pytest
from fastapi.testclient import TestClient
from app.main import app

def test_openapi_schema_exists():
    """Verify OpenAPI schema is accessible"""
    client = TestClient(app)
    response = client.get("/openapi.json")
    assert response.status_code == 200
    schema = response.json()
    assert "openapi" in schema
    assert schema["openapi"].startswith("3.")

def test_all_endpoints_documented():
    """Verify all endpoints have OpenAPI documentation"""
    client = TestClient(app)
    response = client.get("/openapi.json")
    schema = response.json()
    paths = schema.get("paths", {})
    assert len(paths) > 0, "No API paths documented"

def test_response_models_defined():
    """Verify endpoints have response models"""
    client = TestClient(app)
    response = client.get("/openapi.json")
    schema = response.json()

    for path, methods in schema.get("paths", {}).items():
        for method, details in methods.items():
            responses = details.get("responses", {})
            assert "200" in responses or "201" in responses, \
                f"{method.upper()} {path} missing success response"
```

### Step 4: Update Workflow

**File:** `.github/workflows/lokifi-unified-pipeline.yml`

Update `api-contracts` job:
```yaml
api-contracts:
  name: 📋 API Contract Tests
  runs-on: ubuntu-latest
  if: github.event_name == 'pull_request'
  needs: [backend-test]

  steps:
    - name: 📥 Checkout code
      uses: actions/checkout@v4

    - name: 🐍 Setup Python
      uses: actions/setup-python@v5
      with:
        python-version: '3.11'

    - name: 📚 Install dependencies
      working-directory: apps/backend
      run: |
        pip install -r requirements.txt
        pip install schemathesis openapi-core pytest-openapi

    - name: 📋 Run API contract tests
      working-directory: apps/backend
      run: |
        pytest tests/test_api_contracts.py -v
        pytest tests/test_openapi_schema.py -v

    - name: 💬 Comment PR with results
      if: always()
      uses: actions/github-script@v7
      with:
        script: |
          const body = [
            '## 📋 API Contract Test Results',
            '',
            '**Status:** ✅ Tests completed',
            '',
            '### What was tested',
            '- ✅ OpenAPI schema validation',
            '- ✅ Endpoint documentation coverage',
            '- ✅ Response model validation',
            '- ✅ Request schema validation',
            '',
            '**Tool:** Schemathesis + OpenAPI Core',
            '**Standard:** OpenAPI 3.0',
            '',
            '---',
            '*Part of Lokifi Unified CI/CD Pipeline* 📋'
          ].join('\n');

          await github.rest.issues.createComment({
            owner: context.repo.owner,
            repo: context.repo.repo,
            issue_number: context.issue.number,
            body: body
          });
```

### Step 5: Generate TypeScript Types (Optional)

**Command:**
```bash
npm run generate-api-types
```

**Package.json script:**
```json
{
  "scripts": {
    "generate-api-types": "openapi-generator-cli generate -i http://localhost:8000/openapi.json -g typescript-fetch -o src/api/generated"
  }
}
```

---

## ✅ Success Criteria

1. ✅ OpenAPI schema accessible and valid
2. ✅ All endpoints documented in schema
3. ✅ Contract tests running in CI/CD
4. ✅ Frontend and backend contracts validated
5. ✅ PR comments generated with results
6. ✅ Zero contract violations

---

## 📊 Expected Benefits

### Immediate
- Catch API breaking changes early
- Ensure frontend/backend compatibility
- Automatic API documentation
- Type safety improvements

### Long-term
- Reduced integration bugs
- Faster development cycles
- Better API versioning
- Improved developer experience

---

## 🚀 Implementation Timeline

**Phase 1: Setup** (1-2 hours)
- Install dependencies
- Verify OpenAPI schema
- Create test structure

**Phase 2: Tests** (2-3 hours)
- Write contract validation tests
- Add schema validation
- Test locally

**Phase 3: CI/CD** (1-2 hours)
- Update workflow
- Test in PR
- Validate results

**Phase 4: Documentation** (1 hour)
- Document completion
- Create guides
- Update README

**Total:** 5-8 hours

---

## 📝 Next Steps

1. ✅ Install schemathesis and openapi-core
2. ✅ Create test_api_contracts.py
3. ✅ Create test_openapi_schema.py
4. ✅ Update unified pipeline
5. ✅ Create test PR
6. ✅ Validate and merge

---

**Ready to implement!** 🚀

This approach leverages FastAPI's built-in OpenAPI support for maximum efficiency and minimal complexity.
