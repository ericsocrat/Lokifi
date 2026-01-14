# Phase 4c: Extended Caching Initiative

**Status:** In Progress 🚀  
**Objective:** Apply proven caching patterns from Phase 4b (auth, portfolio, social) to additional high-impact routes  
**Target Completion:** 80+ new tests, 50x+ speedup on market/alerts routes  
**Performance Goal:** 70%+ database load reduction across extended routes

## Overview

Phase 4b successfully established caching patterns for core user routes (auth, portfolio, social). Phase 4c extends these patterns to additional data-intensive routes:

### Scope: 3 Route Files, ~20 High-Impact Endpoints

| Route File | Endpoints | Caching Opportunity | Priority |
|-----------|-----------|-------------------|----------|
| **market.py** | 2 endpoints | Price/OHLC data (read-heavy) | 🔴 HIGH |
| **alerts.py** | 6+ endpoints | User alerts, configurations | 🟠 MEDIUM |
| **chat.py** | 3+ endpoints | AI/Tool responses, portfolios | 🟠 MEDIUM |

---

## Phase 4c-1: Market Data Caching (market.py)

### Endpoints to Cache

#### 1. GET /ohlc (get_ohlc)
**Current:** Fetches from external provider each time  
**Cache Opportunity:** OHLC data is immutable (historical) + slowly updated (latest bars)

```python
@router.get("/ohlc")
async def get_ohlc(
    symbol: str = Query(...),
    timeframe: str = Query("1h"),
    limit: int = Query(500, ge=1, le=5000)
) -> list[dict[str, Any]]:
```

**Caching Strategy:**
- **Cache Region:** `MEDIUM_TERM` (300s TTL)
- **Key:** `f"{symbol}:{timeframe}:{limit}"`
- **Volatility:** LOW - OHLC data is immutable for past bars
- **Expected Speedup:** 100x+ (external API call eliminated)
- **DB Impact:** 80%+ reduction (no DB calls after cache hit)

**Cached Query Function Signature:**
```python
@cached_query(region=MEDIUM_TERM)
async def get_market_ohlc(
    symbol: str,
    timeframe: str,
    limit: int
) -> list[dict[str, Any]]:
```

### Risk Assessment
- ✅ **No mutations** - OHLC data is read-only
- ✅ **Immutable key** - Symbol/timeframe/limit are stable
- ✅ **External API call** - Caching is critical for performance
- ⚠️ **Data freshness** - Need proper TTL for latest bars

---

## Phase 4c-2: Alerts & Monitoring Caching (alerts.py)

### Endpoints to Cache

#### 1. GET /alerts (list_alerts)
**Current:** Fetches all alerts from store  
**Cache Opportunity:** User's alert list changes infrequently

```python
@router.get("/alerts")
async def list_alerts(authorization: str | None = Header(None)) -> list[dict[str, Any]]:
```

**Caching Strategy:**
- **Cache Region:** `SHORT_TERM` (60s TTL)
- **Key:** `f"alerts:{user_handle}"`
- **Volatility:** MEDIUM - Alerts can be created/deleted
- **Expected Speedup:** 10-20x (store lookup + filtering)
- **DB Impact:** 60%+ reduction

**Cached Query Function:**
```python
@cached_query(region=SHORT_TERM)
async def get_user_alerts(handle: str) -> list[dict[str, Any]]:
```

#### 2. POST /alerts (create_alert) - No Cache
**Note:** Mutations should invalidate related caches automatically

#### 3. GET /alerts/stream (stream_alerts)
**Note:** Real-time streaming - cache not applicable

### Risks & Mitigation
- ⚠️ **Stale alert data** - SHORT_TERM (60s) balances freshness and performance
- ⚠️ **Cache invalidation** - Must clear on create/delete/toggle
- ✅ **User isolation** - Cache key includes handle to prevent leaks

---

## Phase 4c-3: Chat & AI Caching (chat.py)

### Tool Functions (Already Optimized)

These functions call other cached endpoints:
```python
async def tool_get_price(symbol: str, timeframe: str = "1h"):
    # Calls fetch_ohlc → will use Phase 4c-1 cache
    
async def tool_portfolio_summary(authorization: str | None):
    # Calls _portfolio_summary → already cached from Phase 4b
    
async def tool_create_price_alert(...):
    # Mutation - no cache, invalidates alerts cache
```

### Main Endpoint: POST /chat (chat)
**Current:** Calls OpenAI API + tools  
**Cache Opportunity:** Tool responses are deterministic for same inputs

```python
@router.post("/chat")
async def chat(payload: ChatRequest, authorization: str | None = Header(None)):
```

**Analysis:**
- 🔴 **NOT Cacheable** - AI responses vary (temperature, context)
- ✅ **Tool calls ARE cached** - Underlying tools use Phase 4b+4c caches
- 💡 **Optimization:** Tool responses cached individually

---

## Implementation Plan: Phase 4c-1 (Market Caching)

### Step 1: Create Market Cached Query Functions
**File:** `app/core/cached_queries.py` (add to existing)

```python
@cached_query(region=MEDIUM_TERM)
async def get_market_ohlc(
    symbol: str,
    timeframe: str,
    limit: int,
) -> list[dict[str, Any]]:
    """
    Get OHLC data for symbol with caching.
    
    Cache strategy: MEDIUM_TERM (300s) - OHLC data is immutable
    Expected speedup: 100x+ (eliminates external API call)
    """
    return await fetch_ohlc(symbol=symbol, timeframe=timeframe, limit=limit)
```

### Step 2: Update Market Routes
**File:** `app/api/routes/market.py`

```python
from app.core.cached_queries import get_market_ohlc

@router.get("/ohlc")
async def get_ohlc(
    symbol: str = Query(...),
    timeframe: str = Query("1h"),
    limit: int = Query(500, ge=1, le=5000),
) -> list[dict[str, Any]]:
    return await get_market_ohlc(symbol, timeframe, limit)
```

### Step 3: Create Market Route Tests
**File:** `tests/routes/test_market_cached.py` (NEW)

**Test Categories:**
1. **Cache Hit/Miss** (5 tests)
   - First call loads from provider
   - Second call hits cache
   - Cache TTL respected

2. **Different Parameters** (4 tests)
   - Different symbols → different cache entries
   - Different timeframes → different cache entries
   - Different limits → different cache entries

3. **Performance** (3 tests)
   - Cached call <1ms
   - Speedup 100x+ validated
   - Database load reduced

4. **Integration** (2 tests)
   - Cache visible in monitoring
   - Statistics tracked

**Total:** 14 tests for Phase 4c-1

### Step 4: Validation Suite
**File:** `tests/integration/test_market_cache_validation.py` (NEW)

Same pattern as Phase 4b:
- 5 integration tests (route completeness, cache usage)
- 3 performance tests (speedup, throughput)
- Total: 8 tests

---

## Phase 4c Expected Outcomes

### Metrics
| Metric | Phase 4b | Phase 4c Est. | Target |
|--------|----------|--------------|--------|
| Routes Cached | 13 endpoints | +8-10 endpoints | 25+ |
| Total Tests | 116 | 180+ | 250+ |
| Speedup Range | 50x (avg) | 50-100x | 50-100x |
| DB Load Reduction | 75% | 70-80% | 70%+ |

### Quality Targets
- ✅ 80+ new tests
- ✅ 100% test pass rate
- ✅ Code quality: 0 Ruff violations
- ✅ Type safety: 0 MyPy errors
- ✅ Coverage: 80%+ for new code

---

## Testing Strategy (Phase 4c Pattern)

Each phase uses proven pattern:

1. **Unit Tests** (30 tests)
   - Test each cached query function
   - Mock external dependencies
   - Verify cache behavior

2. **Route Tests** (30 tests)
   - Test endpoints with patched queries
   - Verify response format
   - Check parameter validation

3. **Integration Tests** (10 tests)
   - Static analysis of route completeness
   - Cache decorator verification
   - Phase completeness checks

4. **Performance Tests** (10 tests)
   - Benchmark cached queries
   - Validate speedup targets
   - Verify database load reduction

5. **Monitoring Tests** (5 tests)
   - Cache stats available
   - Monitoring endpoints functional

**Total Phase 4c Tests:** 85 tests across all categories

---

## Risk Mitigation

### Risk: Stale Market Data
**Mitigation:** MEDIUM_TERM (300s) TTL balances freshness and performance
- OHLC data: historically immutable, latest bar ~5min old is acceptable
- Real-time users: accept 5-minute staleness for 100x speedup

### Risk: Cache Invalidation
**Mitigation:** Cache keys include all parameters
- Different symbol → different cache entry
- Different timeframe → different cache entry
- TTL expiry = automatic invalidation

### Risk: External API Limits
**Mitigation:** Cache reduces API calls by 99%+
- Without cache: 100 requests/sec → 100 API calls/sec
- With cache: 100 requests/sec → 1 API call/sec (95%+ hit rate)
- Cost reduction: 99%+ less external API usage

---

## Success Criteria for Phase 4c

✅ **All Phase 4c endpoints**
- Market data: 2 endpoints (get_ohlc)
- Alerts: 2+ endpoints (list_alerts)
- Chat tools: Implicit caching via tool dependencies

✅ **Performance Validation**
- 50-100x speedup on market queries
- 70%+ database load reduction
- <1ms cached query latency

✅ **Test Coverage**
- 85+ new tests across categories
- 100% pass rate (0 failures)
- >80% coverage on cached functions

✅ **Production Readiness**
- All quality gates passing
- Type safety verified (MyPy 0 errors)
- Code formatting (Black) validated
- Security scan passed

---

## Timeline & Next Steps

1. **Phase 4c-1:** Market data caching (2-3 hours)
   - Create cached_market_ohlc function
   - Update routes
   - Add 22 tests (14 route + 8 integration)

2. **Phase 4c-2:** Alerts caching (2-3 hours)
   - Create cached_user_alerts function
   - Update routes with invalidation
   - Add 20+ tests

3. **Phase 4c-3:** Validation & optimization (1-2 hours)
   - Performance benchmarks
   - Monitoring integration
   - Final documentation

4. **Phase 4c-4:** Final validation (1 hour)
   - Comprehensive test suite
   - Performance targets confirmed
   - Phase 4c complete

**Total Estimated Time:** 6-9 hours of focused development

---

**Phase 4c Status:** Ready to begin ✅  
**Next Action:** Start Phase 4c-1 market data caching
