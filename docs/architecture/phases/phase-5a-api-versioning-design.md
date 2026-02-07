# Phase 5A: API Versioning Implementation

**Objective**: Enable parallel API versions (v1/v2) without breaking production clients
**Timeline**: 2-3 sessions
**Strategic Value**: Foundation for sustainable feature development

---

## API Versioning Strategy

### Design Pattern

```
GET /api/v1/users          → Current stable API
GET /api/v2/users          → New features API

Headers:
  Accept-Version: v1
  Accept-Version: v2
  (fallback to URL path)
```

### Implementation Components

#### 1. **Version Router Factory** (Middleware)

```python
# app/core/versioning.py
class APIVersion(str, Enum):
    V1 = "v1"
    V2 = "v2"

def get_api_version(request: Request) -> APIVersion:
    """Extract version from URL path or headers"""
    # Priority: URL path > Accept-Version header > default (v1)
```

#### 2. **Route Organization**

```
app/api/v1/
  routes/
    auth.py
    social.py
    alerts.py
    cache.py
    ...

app/api/v2/
  routes/
    auth.py          # Enhanced v2 auth
    social.py        # New social features
    users.py         # User management v2
    ...
```

#### 3. **Shared Models & Utilities**

```
app/api/common/
  schemas.py         # Shared Pydantic models
  responses.py       # Common response types
  versioned_models.py # Version-specific model variants
```

#### 4. **Router Registration**

```python
# app/main.py
from app.api.v1 import router as v1_router
from app.api.v2 import router as v2_router

app.include_router(v1_router, prefix="/api/v1")
app.include_router(v2_router, prefix="/api/v2")
```

---

## Phase 5A Milestones

### Milestone 1: Foundation (Session N+1)

- [ ] Create versioning router factory
- [ ] Migrate v1 routes (existing → /api/v1/)
- [ ] Create v2 route structure (stub endpoints)
- [ ] Add API docs for both versions
- [ ] Test version routing

**Deliverable**: Dual API endpoints working, all v1 endpoints accessible at /api/v1

### Milestone 2: Migration & Enhancement (Session N+2)

- [ ] Deep copy v1 endpoints to v2 (new baseline)
- [ ] Add v2 enhancements:
  - Improved error responses
  - New fields in responses
  - Enhanced query parameters
- [ ] Create deprecation pathway (v1 → v2)
- [ ] Release notes & migration guide

**Deliverable**: v2 API with enhancements, migration guide for clients

### Milestone 3: Maturity & Scalability (Session N+3)

- [ ] Performance benchmarks (v1 vs v2)
- [ ] Backward compatibility testing
- [ ] Rate limiting per version
- [ ] Version lifecycle documentation
- [ ] Archive & deprecate old versions (future)

**Deliverable**: Production-ready versioned API with full documentation

---

## v1 vs v2 API Differences

### v1 (Current - Stable)

✅ `/api/social/users` - create users
✅ `/api/social/posts` - create/list posts
✅ `/api/social/follows` - manage follows
✅ Basic error responses

### v2 (Enhanced - New Features)

✅ `/api/v2/users` - user management endpoints
✅ `/api/v2/posts` - posts with search/filter
✅ `/api/v2/social` - enhanced social graph
🆕 `/api/v2/feed` - personalized feeds
🆕 `/api/v2/recommendations` - user recommendations
🆕 Response pagination, granular fields, sorting

---

## Backward Compatibility Strategy

### Phase 1: Coexistence

```
/api/social/*     → Deprecated (soft)
/api/v1/*         → Current production
/api/v2/*         → New development
```

### Phase 2: Deprecation

- Announce v1 EOL (3-6 months notice)
- Mark v1 endpoints with `Deprecation` headers
- Provide migration tooling

### Phase 3: Sunset

- Full migration to v2
- Retire v1 (long-term maintenance option?)

---

## Implementation Checklist

### Code Structure

- [ ] `app/api/__init__.py` - Version registry
- [ ] `app/api/v1/__init__.py` - v1 router
- [ ] `app/api/v2/__init__.py` - v2 router
- [ ] `app/api/common/versioned_models.py` - Shared models
- [ ] `app/core/versioning.py` - Version utilities

### Testing

- [ ] Version routing tests
- [ ] v1 endpoint tests (existing → migrated)
- [ ] v2 endpoint tests (new features)
- [ ] Backward compatibility matrix
- [ ] OpenAPI spec generation for both versions

### Documentation

- [ ] Migration guide (v1 → v2)
- [ ] API reference (both versions)
- [ ] Changelog with version timeline
- [ ] SDK/client examples

### Deployment

- [ ] Feature flag for v2 enablement
- [ ] Gradual rollout plan
- [ ] Health checks for both versions
- [ ] Monitoring & analytics per version

---

## Expected Outcomes

**After Phase 5A**:

1. ✅ Dual API versions operational
2. ✅ v2 with enhanced features ready for development
3. ✅ Clear upgrade path for API clients
4. ✅ Foundation for Phase 5B-D work
5. ✅ Team can work on v2 features without disrupting v1

**Value Delivered**:

- 🚀 Sustainable growth
- 🔄 Backward compatibility
- 👥 Team collaboration enabled
- 📈 Production maturity milestone

---

## Next Steps

**Session N+1 Actionable Plan**:

1. Create versioning middleware (`app/core/versioning.py`)
2. Organize v1 routes under `/api/v1/`
3. Create v2 route stubs
4. Update `app/main.py` to register both routers
5. Write version routing tests
6. Update API docs

**Estimate**: 1-2 hours to complete foundation
**Dependencies**: None (fully backward compatible)
**Risk Level**: Low (v1 unchanged, v2 parallel)
