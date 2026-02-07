## Phase 5B: Endpoint Migration Guide

**Status**: Planning (Ready to execute)
**Scope**: Migrate critical endpoints to use Phase 5A versioning
**Priority**: High (enables client version awareness)

### Overview

Phase 5B migrates critical endpoints from Phase 5A foundation to actually use versioning. Rather than physical route reorganization, we add version awareness to existing endpoints using the `request.state.api_version` pattern.

### Endpoints to Version (Priority Order)

#### Tier 1 (Critical) - Session 200

1. **Social Endpoints** (in `app/api/routes/social.py`):
   - `/api/posts` - List posts
   - `/api/posts/{post_id}` - Get single post
   - `/api/follows` - List follows
   - `/api/users/{user_id}/followers` - Get followers

   **Versioning Strategy**:
   - V1: Current schema (existing fields)
   - V2: Add enhanced fields (timestamps, metadata, engagement metrics)

2. **Auth Endpoints** (in `app/routers/auth.py`):
   - `/api/auth/login` - User login
   - `/api/auth/register` - User registration
   - `/api/auth/refresh` - Token refresh

   **Versioning Strategy**:
   - V1: Basic token response
   - V2: Add additional metadata (expiry info, scopes)

#### Tier 2 (Important) - Session 201

1. **Profile Endpoints** (in `app/routers/profile.py`):
   - `/api/profile/me` - Get current user
   - `/api/profile/{user_id}` - Get user profile
   - `/api/profile/me` (PUT) - Update profile

   **Versioning Strategy**:
   - V1: Basic user fields
   - V2: Add profile metadata (preferences, settings)

2. **Portfolio Endpoints** (in `app/routers/portfolio.py`):
   - `/api/portfolio` - Get portfolio
   - `/api/portfolio/positions` - Get positions

   **Versioning Strategy**:
   - V1: Current schema
   - V2: Add performance metrics, historical data

#### Tier 3 (Enhancement) - Session 202+

- Market data endpoints
- Admin endpoints
- Webhook endpoints

### Migration Pattern

#### Step 1: Import Version Detection

```python
from app.core.versioning import APIVersion
from fastapi import APIRouter, Request

@router.get("/posts")
async def list_posts(
    request: Request,
    skip: int = 0,
    limit: int = 10,
):
    api_version = request.state.api_version
    # Rest of endpoint...
```

#### Step 2: Add Version-Aware Logic

```python
@router.get("/posts/{post_id}")
async def get_post(
    post_id: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """Get a single post with version-aware response"""
    api_version = request.state.api_version

    post = await db.get_post(post_id)
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")

    # V1: Basic response
    response = {
        "id": post.id,
        "title": post.title,
        "content": post.content,
        "author_id": post.author_id,
    }

    # V2: Enhanced response with metadata
    if api_version == APIVersion.V2:
        response.update({
            "created_at": post.created_at.isoformat(),
            "updated_at": post.updated_at.isoformat(),
            "like_count": post.like_count,
            "comment_count": post.comment_count,
            "metadata": {
                "word_count": len(post.content.split()),
                "reading_time_minutes": len(post.content.split()) // 200 + 1,
            }
        })

    return response
```

#### Step 3: Update Response Model (Optional)

```python
from pydantic import BaseModel, Field

class PostV1(BaseModel):
    id: str
    title: str
    content: str
    author_id: str

class PostV2(PostV1):
    created_at: str
    updated_at: str
    like_count: int
    comment_count: int
    metadata: dict

@router.get("/posts/{post_id}")
async def get_post(
    post_id: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """Get post - returns PostV1 or PostV2 based on version"""
    api_version = request.state.api_version
    post_data = await fetch_post(post_id, db)

    # Pydantic handles validation for correct version
    if api_version == APIVersion.V2:
        return PostV2(**post_data)
    else:
        return PostV1(**post_data)
```

#### Step 4: Document in Docstring

```python
@router.get(
    "/posts",
    description="""
    Get all posts.

    *Version Differences*:
    - **V1**: Returns basic post fields (id, title, content, author_id)
    - **V2**: Adds metadata (timestamps, engagement metrics, reading_time)
    """,
)
async def list_posts(request: Request, ...):
    # Implementation
    pass
```

### Session 200 Detailed Plan

**Session Goal**: Version 4 critical social endpoints

**Endpoints to Migrate**:

1. `POST /api/posts` - Create post
2. `GET /api/posts` - List posts
3. `GET /api/posts/{post_id}` - Get post
4. `PUT /api/posts/{post_id}` - Update post

**Changes per Endpoint**:

- Add `request: Request` parameter
- Extract `api_version = request.state.api_version`
- Add v2 fields (timestamps, metrics)
- Update docstrings with version notes
- Add to existing tests, create v2 specific tests

**Code Amount**: ~150-200 lines (4 endpoints × 40-50 lines each)

**Testing**:

- Verify v1 responses unchanged (backward compatibility)
- Verify v2 responses have additional fields
- Test version detection via URL path
- Test version detection via header

**Example Changes**:

```python
# BEFORE
@router.get("/posts/{post_id}")
async def get_post(post_id: str, db: AsyncSession = Depends(get_db)):
    post = await db.get_post(post_id)
    return post

# AFTER
@router.get("/posts/{post_id}")
async def get_post(
    post_id: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    api_version = request.state.api_version
    post = await db.get_post(post_id)

    response = {
        "id": post.id,
        "title": post.title,
        "content": post.content,
    }

    if api_version == APIVersion.V2:
        response.update({
            "created_at": post.created_at.isoformat(),
            "updated_at": post.updated_at.isoformat(),
            "like_count": post.like_count,
        })

    return response
```

### Backward Compatibility Checklist

For each versioned endpoint:

- [ ] V1 response unchanged (100% backward compatible)
- [ ] V2 response includes all V1 fields plus new fields
- [ ] Default version is V1 (existing clients unaffected)
- [ ] URL path version works (`/api/v2/posts`)
- [ ] Header version works (`Accept-Version: v2`)
- [ ] Tests verify both versions work

### Success Metrics

After Phase 5B:

- ✅ 4+ critical endpoints versioned
- ✅ V1/V2 responses documented
- ✅ Version detection tested with real data
- ✅ Backward compatibility proven
- ✅ Clients can opt into v2 fields

### Testing Strategy

```python
# tests/integration/test_endpoint_versioning.py

def test_posts_list_v1():
    """V1 response has basic fields only"""
    response = client.get("/api/v1/posts")
    assert all(key in response.json()[0] for key in ["id", "title", "content"])
    assert "created_at" not in response.json()[0]  # V2 only

def test_posts_list_v2():
    """V2 response has enhanced fields"""
    response = client.get("/api/v2/posts")
    assert all(key in response.json()[0] for key in ["id", "title", "created_at", "like_count"])

def test_posts_backward_compatibility():
    """Old clients using v1 still get consistent response"""
    v1_response = client.get("/api/posts").json()
    v1_explicit = client.get("/api/v1/posts").json()
    assert v1_response[0] == v1_explicit[0]
```

### Documentation Updates Needed

1. **API Docs**: Update OpenAPI specs with version notes
2. **Migration Guide**: When to upgrade to v2 (if applicable)
3. **Changelog**: Document v2 additions
4. **Client Guide**: Example requests for v1 vs v2

### Future Enhancements (Phase 5C+)

- RFC 8594 deprecation headers (auto-add)
- Version sunset dates
- Automatic request/response schema transformation
- Version usage analytics
- Gradual deprecation timeline

### Success Criteria

- [ ] 4+ endpoints fully versioned in Session 200
- [ ] All tests passing for v1 and v2
- [ ] Backward compatibility verified
- [ ] Documentation complete
- [ ] Example curl commands work for both versions
- [ ] Client guide updated
