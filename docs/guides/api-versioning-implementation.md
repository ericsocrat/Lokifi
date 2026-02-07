## Phase 5A: API Versioning Implementation

**Status**: ✅ IMPLEMENTED (Session 199)
**Completion Date**: February 7, 2026
**Design Doc**: [phase-5a-api-versioning-design.md](../../architecture/phases/phase-5a-api-versioning-design.md)

### Overview

Phase 5A implements **API versioning infrastructure** for sustainable growth and backward-compatible API evolution. The implementation uses a **middleware-based approach** that detects versions from URL paths or headers and automatically tracks versioning without requiring route reorganization.

### Architecture Components

#### 1. Core Versioning Utilities (`app/core/versioning.py`)

**APIVersion Enum**:

```python
class APIVersion(str, Enum):
    """Supported API versions"""
    V1 = "v1"  # Current stable
    V2 = "v2"  # Future version (opt-in)
```

**Version Detection Function** (`get_api_version()`):

- Extracts version from request URL path
- Falls back to Accept-Version header
- Defaults to V1 for backward compatibility
- **Priority**: URL path > header > v1 default

Example usage:

```python
@router.get("/endpoint")
async def my_endpoint(request: Request):
    version = request.state.api_version
    # Respond based on version
```

**Deprecation Warnings**:

```python
class DeprecationWarning:
    """RFC 8594 compliant deprecation notices"""
    - sunset_date: When endpoint stops working
    - replacement_endpoint: Where to migrate to
    - migration_guide_url: Documentation URL
    - to_header(): Convert to HTTP headers
```

#### 2. Version Detection Middleware (`app/middleware/versioning.py`)

**VersionDetectionMiddleware**:

- Runs on EVERY request through the API
- Extracts version using `get_api_version()`
- Stores version in `request.state.api_version`
- Adds `X-API-Version` response header
- Adds `Vary: Accept-Version` header

**Registration** (in `app/main.py`):

```python
# Phase 5A: Version detection middleware
app.add_middleware(VersionDetectionMiddleware)
```

#### 3. Example Versioned Endpoints (`app/api/routes/versioning.py`)

**Three example endpoints demonstrating versioning**:

1. `/api/v1/example/version` - Returns detected version
2. `/api/v1/example/schema` - Shows v1 vs v2 schema differences
3. `/api/v1/example/compatibility` - Version compatibility info

**Schema Differences Example**:

```python
# V1 Response (basic schema)
{
    "id": "usr_123",
    "name": "John Doe",
    "email": "john@example.com"
}

# V2 Response (enhanced with metadata)
{
    "id": "usr_123",
    "name": "John Doe",
    "email": "john@example.com",
    "created_at": "2026-02-07T00:00:00Z",
    "updated_at": "2026-02-07T12:00:00Z",
    "metadata": {
        "last_login": "2026-02-07T11:30:00Z",
        "login_count": 42
    }
}
```

### Usage Patterns

#### Pattern 1: Accessing Version in Endpoints

```python
from fastapi import APIRouter, Request
from app.core.versioning import APIVersion

@router.get("/users/{user_id}")
async def get_user(user_id: str, request: Request):
    api_version = request.state.api_version

    user = await db.get_user(user_id)

    if api_version == APIVersion.V2:
        # Return v2 schema with additional fields
        return {
            **user,
            "metadata": {
                "created_at": user.created_at,
                "updated_at": user.updated_at,
            }
        }
    else:
        # Return v1 schema (minimal fields)
        return {
            "id": user.id,
            "name": user.name,
            "email": user.email,
        }
```

#### Pattern 2: Version-Specific Logic

```python
@router.post("/posts")
async def create_post(data: PostCreate, request: Request):
    api_version = request.state.api_version

    post = await db.create_post(data)

    if api_version == APIVersion.V2:
        # V2 supports advanced fields
        await post.update(tags=data.tags, ai_summary=data.ai_summary)

    return post
```

#### Pattern 3: Deprecation Notices

```python
from app.core.versioning import V1_DEPRECATION

@router.get("/old-endpoint", deprecated=True)
async def old_endpoint(request: Request):
    """
    This endpoint is deprecated in v1 but removed in v2.
    Migrate to /new-endpoint instead.
    """
    deprecation = V1_DEPRECATION["endpoint"]

    # Add deprecation headers to response
    # (Future: middleware will do this automatically)

    return {"message": "Use /new-endpoint instead"}
```

### API Client Examples

#### Request with URL Path Version

```bash
# Explicitly request v2 API
curl -X GET http://localhost:8000/api/v2/example/schema

# Response headers show version
# X-API-Version: v2

# Response body is v2 schema
```

#### Request with Accept-Version Header

```bash
# Use header instead of URL path
curl -X GET http://localhost:8000/api/example/schema \
  -H "Accept-Version: v2"

# Response: v2 schema
```

#### Default to V1 (Backward Compatibility)

```bash
# Old clients still work without modification
curl -X GET http://localhost:8000/api/example/schema

# X-API-Version: v1 (default)
# Response: v1 schema
```

### Testing

**Phase 5A Test Suite** (`tests/unit/test_versioning.py`):

- ✅ Version detection from URL path
- ✅ Version detection from Accept-Version header
- ✅ X-API-Version response header present
- ✅ Version priority (URL > header > default)
- ✅ Schema differences for v1 vs v2
- ✅ Compatibility info endpoint

**Run tests**:

```bash
pytest tests/unit/test_versioning.py -v
```

### Migration Path for Endpoints

**Process to version an existing endpoint**:

1. **Identify endpoint to version**

   ```python
   @router.get("/api/posts")
   async def list_posts():
       ...
   ```

2. **Add version awareness**

   ```python
   @router.get("/api/posts")
   async def list_posts(request: Request):
       api_version = request.state.api_version

       posts = await db.list_posts()

       if api_version == APIVersion.V2:
           # Return enhanced v2 response
           return [{"id": p.id, **p.v2_fields()} for p in posts]
       else:
           # Return v1 response (backward compatible)
           return [{"id": p.id, "title": p.title} for p in posts]
   ```

3. **Document in OpenAPI**

   ```python
   @router.get(
       "/api/posts",
       description="Get all posts (v1: basic fields | v2: enhanced metadata)"
   )
   async def list_posts(request: Request):
       ...
   ```

4. **Add to test suite** (e.g., `test_versioning.py`)

### Future Extensions

#### 1. Request Schema Versioning

```python
class PostCreateV1(BaseModel):
    title: str
    content: str

class PostCreateV2(PostCreateV1):
    tags: list[str]
    ai_summary: str | None
```

#### 2. Automatic Deprecation Headers

```python
# Future: Middleware auto-adds RFC 8594 headers
@router.get("/old-endpoint", sunset_date="2026-12-31")
async def old_endpoint():
    # Middleware adds:
    # Deprecation: true
    # Sunset: Sun, 31 Dec 2026 00:00:00 GMT
    # Link: </new-endpoint>; rel="successor-version"
```

#### 3. Request/Response Transformations

```python
# Future: Automatic schema transformation
@router.get("/api/users/{user_id}")
@version_aware(
    v1_schema=UserV1,
    v2_schema=UserV2,
)
async def get_user(user_id: str):
    # Returns v1 OR v2 schema automatically based on version
    ...
```

#### 4. Version Deprecation Timeline

```python
# Future: Automatic v1 → v2 migration
VERSION_TIMELINE = {
    "v1": {
        "deprecated": "2026-08-01",
        "sunset": "2026-12-31",
        "replacement": "v2",
    },
    "v2": {
        "deprecated": None,
        "sunset": None,
        "replacement": None,
    },
}
```

### Metrics & Monitoring

**Recommended monitoring**:

```python
# Track version usage
- requests_by_version: Counter[v1, v2, ...]
- deprecated_endpoint_calls: Counter per endpoint
- version_migration_timeline: When clients upgrade

# Example Prometheus metrics
api_requests_total{version="v1", method="GET", path="/posts"}
api_requests_total{version="v2", method="GET", path="/posts"}

deprecated_endpoints{version="v1", endpoint="/old-api"}
```

### Compliance & Standards

- **RFC 8594**: Deprecation HTTP Header
- **Accept header syntax**: Standard HTTP content negotiation
- **Semver**: Version numbering (future)
- **OpenAPI**: Version documented in schema

### Summary

Phase 5A provides:

| Component                    | Purpose                         | Status      |
| ---------------------------- | ------------------------------- | ----------- |
| `APIVersion` enum            | Version constants               | ✅ Complete |
| `get_api_version()`          | Version detection logic         | ✅ Complete |
| `VersionDetectionMiddleware` | Auto-attach version to requests | ✅ Complete |
| Example endpoints            | Demonstrate v1 vs v2 patterns   | ✅ Complete |
| Test suite                   | Validate version routing        | ✅ Complete |
| This guide                   | Usage documentation             | ✅ Complete |

**Next phases**:

- 5B: Migrate critical endpoints (users, posts, follows)
- 5C: Automatic deprecation headers
- 5D: Request/response schema versioning
- 5E: Version migration analytics
