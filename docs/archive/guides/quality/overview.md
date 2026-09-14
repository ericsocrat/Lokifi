# 🎯 Lokifi Code Quality Guide

**Last Updated:** October 20, 2025
**Purpose:** Comprehensive code quality standards and automation
**Status:** Production Ready

---

## 📊 Current Quality Status

### Health Score: 98% ⭐⭐⭐⭐⭐

| Category | Score | Status |
|----------|-------|--------|
| **Repository Structure** | 100% | ✅ Perfect |
| **Git Hygiene** | 100% | ✅ Perfect |
| **Security** | 100% | ✅ Perfect |
| **Documentation** | 98% | ⭐ Excellent |
| **Performance** | 95% | ⭐ Excellent |
| **PowerShell Quality** | 95% | ⭐ Excellent |
| **TypeScript Strict Types** | 88% | 🟡 Good |
| **Logging Standards** | 85% | 🟡 Good |

---

## ✅ Automated Code Quality

### Pre-commit Automation (Husky + lint-staged)

**Active Hooks:**
- `husky@^9.1.7` - Git hooks management
- `lint-staged@^16.2.3` - Staged file linting

**What Happens on Every Commit:**
1. **ESLint** runs with auto-fix on TypeScript files
2. **Prettier** formats all supported files
3. **Type checking** validates TypeScript compilation
4. **Import organization** sorts and cleans imports
5. **Only allows commit** if all checks pass

### Prettier Configuration
```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 100,
  "tabWidth": 2,
  "useTabs": false,
  "arrowParens": "always",
  "endOfLine": "lf"
}
```

### ESLint Rules (Active)
- ✅ TypeScript strict mode
- ✅ React hooks rules
- ✅ Next.js best practices
- ✅ No unused variables (except `_` prefix)
- ✅ Accessibility checks
- ✅ Security rules
- ✅ Performance optimizations

---

## 🛠️ Quality Analysis Tools

### Code Quality Scripts
```powershell
# Comprehensive 6-phase analysis
.\\tools\\codebase-analyzer.ps1

# Console logging audit
.\\tools\\analyze-console-logging.ps1

# TypeScript type safety analysis
.\\tools\\analyze-typescript-types.ps1
```

### Analysis Results Examples
```powershell
# Console logging analysis
📊 Frontend Console Logging Analysis
Found 12 console.log statements:
   components/Chart.tsx:45 - console.log('Chart data updated')
   services/api.ts:23 - console.error('API failed')

Recommendations:
   ✅ Replace with logger.debug() for development
   ✅ Use logger.error() for production errors
```

```powershell
# TypeScript type analysis
🔍 TypeScript Type Safety Analysis
Found 3 'any' types:
   types/api.ts:12 - response: any
   hooks/useChart.ts:34 - data: any[]

Suggestions:
   ✅ Define proper interface for API responses
   ✅ Use generic types for arrays
```

---

## 🎯 Logging Standards

### Professional Logging Utility

**Location:** `apps/frontend/src/utils/logger.ts`

**Features:**
- Environment-aware (dev/prod different behaviors)
- Structured log levels (DEBUG, INFO, WARN, ERROR)
- Specialized logging (WebSocket, API, Performance)
- Production-ready error tracking integration

### Usage Patterns

#### Basic Logging
```typescript
import { logger } from '@/src/utils/logger';

// Development debugging (only shows in dev)
logger.debug('Component mounted', { props, state });

// Important application events
logger.info('User authentication successful', { userId });

// Warnings for attention
logger.warn('API rate limit approaching', { remaining: 5 });

// Errors requiring action
logger.error('Data fetch failed', error, { context });
```

#### Specialized Logging
```typescript
// WebSocket events
logger.websocket('Connected to price feed', { url, protocols });
logger.websocket('Received price update', { symbol, price });

// API operations (see api/overview.md for endpoint details)
logger.api('GET', '/api/v1/endpoint', { duration: 234 });
logger.api('POST', '/api/v1/resource', { resourceId, status: 'created' });

// Performance monitoring
logger.perf('Chart render time', 45, 'ms');
logger.perf('API response time', 234, 'ms');
```

### Migration from console.log

#### Step 1: Import Logger
```typescript
// Add to top of file
import { logger } from '@/src/utils/logger';
```

#### Step 2: Replace Console Statements
```typescript
// Before: Development debugging
console.log('✅ WebSocket connected', data);
// After: Structured logging
logger.websocket('Connected', { data });

// Before: Error logging
console.error('API call failed:', error);
// After: Proper error handling
logger.error('API request failed', error, { endpoint, method });

// Before: Performance logging
console.log(`Request took ${duration}ms`);
// After: Performance tracking
logger.perf('API request', duration, 'ms');
```

#### Step 3: Use Appropriate Levels
```typescript
// Debug info (dev only)
logger.debug('State updated', { newState });

// User actions (important)
logger.info('Order placed', { orderId, amount });

// Potential issues (attention needed)
logger.warn('Slow API response', { duration: 5000 });

// Actual problems (action required)
logger.error('Order failed', error, { orderId });
```

---

## 🔧 TypeScript Quality Standards

### Type Safety Best Practices

#### Avoid `any` Type
```typescript
// ❌ Avoid
const response: any = await fetch('/api/data');
const items: any[] = response.data;

// ✅ Better
interface ApiResponse {
  data: AssetPrice[];
  status: 'success' | 'error';
  message?: string;
}

const response: ApiResponse = await fetch('/api/data');
const items: AssetPrice[] = response.data;
```

#### Use Proper Interface Definitions
```typescript
// ✅ Component props
interface PriceChartProps {
  symbol: string;
  data: OHLCV[];
  timeframe: '1d' | '1w' | '1m' | '3m' | '1y';
  onTimeframeChange: (timeframe: string) => void;
}

// ✅ API responses
interface PriceUpdateMessage {
  type: 'price_update';
  symbol: string;
  price: number;
  timestamp: number;
  change24h: number;
}

// ✅ State management
interface PortfolioState {
  assets: Asset[];
  totalValue: number;
  loading: boolean;
  error: string | null;
}
```

#### Generic Types for Reusability
```typescript
// ✅ Generic API response wrapper
interface ApiResponse<T> {
  data: T;
  status: 'success' | 'error';
  message?: string;
}

// Usage with specific types
type AssetPriceResponse = ApiResponse<AssetPrice>;
type HistoricalDataResponse = ApiResponse<OHLCV[]>;

// ✅ Generic hooks
function useApi<T>(endpoint: string): {
  data: T | null;
  loading: boolean;
  error: string | null;
} {
  // Implementation
}
```

---

## 📋 Code Review Standards

### What to Check

#### ✅ Code Quality Checklist
- [ ] **No `console.log`** statements in production code
- [ ] **No `any` types** without proper justification
- [ ] **Proper error handling** with try/catch or error boundaries
- [ ] **Type safety** with interfaces and proper typing
- [ ] **Consistent formatting** (Prettier should handle this)
- [ ] **No unused variables/imports** (ESLint catches these)
- [ ] **Accessibility** attributes for UI components
- [ ] **Performance considerations** (memoization, lazy loading)

#### ✅ React Component Standards
```typescript
// ✅ Good component structure
interface Props {
  title: string;
  data: ChartData[];
  onUpdate: (data: ChartData[]) => void;
}

export const PriceChart = ({ title, data, onUpdate }: Props) => {
  // Memoized expensive calculations
  const chartOptions = useMemo(() =>
    generateChartOptions(data), [data]
  );

  // Proper error boundary usage
  if (!data?.length) {
    return <ErrorFallback message="No chart data available" />;
  }

  return (
    <div role="img" aria-label={`${title} price chart`}>
      {/* Chart implementation */}
    </div>
  );
};
```

#### ✅ API Integration Standards
```typescript
// ✅ Proper error handling
async function fetchAssetPrice(symbol: string): Promise<AssetPrice> {
  try {
    // For actual endpoints, see api/overview.md
    const response = await fetch(`/api/v1/assets/${symbol}/price`);

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data: ApiResponse<AssetPrice> = await response.json();

    if (data.status === 'error') {
      throw new Error(data.message || 'Unknown API error');
    }

    return data.data;
  } catch (error) {
    logger.error('Failed to fetch asset price', error, { symbol });
    throw error;
  }
}
```

---

## 🚀 Performance Standards

### Frontend Optimization

#### Bundle Size Management
```typescript
// ✅ Lazy loading for routes
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Portfolio = lazy(() => import('./pages/Portfolio'));

// ✅ Code splitting for large components
const TradingView = lazy(() => import('./components/TradingView'));

// ✅ Tree shaking friendly imports
import { debounce } from 'lodash-es';
// ❌ Avoid: import _ from 'lodash';
```

#### React Performance
```typescript
// ✅ Memoization for expensive calculations
const ExpensiveChart = React.memo(({ data }: { data: OHLCV[] }) => {
  const chartConfig = useMemo(() =>
    processChartData(data), [data]
  );

  return <Chart config={chartConfig} />;
});

// ✅ Callback optimization
const handlePriceUpdate = useCallback((newPrice: number) => {
  setPrice(newPrice);
  logger.debug('Price updated', { newPrice });
}, []);
```

### Backend Performance
```python
# ✅ Async/await for I/O operations
async def get_asset_price(symbol: str) -> AssetPrice:
    async with httpx.AsyncClient() as client:
        response = await client.get(f"/price/{symbol}")
        return AssetPrice.parse_obj(response.json())

# ✅ Database query optimization
@lru_cache(maxsize=128)
async def get_cached_market_data(symbol: str) -> MarketData:
    return await fetch_market_data(symbol)

# ✅ Pydantic for validation and serialization
class AssetPriceRequest(BaseModel):
    symbol: str = Field(..., regex=r'^[A-Z]{2,10}$')
    timeframe: str = Field('1d', regex=r'^(1d|1w|1m|3m|1y)$')
```

---

## 🔐 Security Standards

### Input Validation
```typescript
// ✅ Frontend validation
const symbolSchema = z.string()
  .min(2)
  .max(10)
  .regex(/^[A-Z]+$/);

function validateSymbol(symbol: string): boolean {
  return symbolSchema.safeParse(symbol).success;
}
```

```python
# ✅ Backend validation
from pydantic import BaseModel, Field, validator

class AssetRequest(BaseModel):
    symbol: str = Field(..., min_length=2, max_length=10)

    @validator('symbol')
    def validate_symbol(cls, v):
        if not v.isalpha() or not v.isupper():
            raise ValueError('Symbol must be uppercase letters only')
        return v
```

### Authentication & Authorization

> **📖 Environment variables:** See [Environment Configuration Guide](../security/environment.md#security-best-practices) for complete setup

```typescript
// ✅ Secure token handling
const authToken = process.env.API_TOKEN;
if (!authToken) {
  throw new Error('API_TOKEN environment variable required');
}

// ✅ Request authentication
const headers = {
  'Authorization': `Bearer ${authToken}`,
  'Content-Type': 'application/json',
};
```

---

## 📊 Quality Metrics & Monitoring

### Test Coverage Standards
- **Unit tests**: 80%+ coverage for critical business logic
- **Integration tests**: Key user workflows covered
- **E2E tests**: Main application paths validated
- **Security tests**: Input validation and auth flows

### Performance Metrics
- **First Contentful Paint**: < 1.5s
- **Largest Contentful Paint**: < 2.5s
- **Bundle size**: < 500KB gzipped
- **API response time**: < 200ms average

### Code Quality Metrics
- **ESLint errors**: 0 (enforced by pre-commit)
- **TypeScript errors**: 0 (enforced by CI)
- **`any` types**: < 5% of total types
- **console.log statements**: 0 in production

---

## 🛠️ Development Workflow

### Daily Quality Routine
1. **Start development**: `.\start-servers.ps1`
2. **Code with quality**: Let pre-commit hooks handle formatting
3. **Regular analysis**: Run quality scripts weekly
4. **Before PR**: Comprehensive test suite validation

### Quality Gates
1. **Pre-commit**: Linting, formatting, type checking
2. **CI/CD**: Full test suite, build validation
3. **Code review**: Manual quality checklist
4. **Deployment**: Automated security and performance checks

---

## 📚 Resources & References

### Documentation
- **Type Patterns**: Complete TypeScript patterns guide
- **Coding Standards**: Detailed coding conventions
- **Testing Guide**: Comprehensive testing strategies
- **Security Guide**: Security best practices

### Tools & Extensions
- **ESLint**: Code quality linting
- **Prettier**: Code formatting
- **Husky**: Git hooks management
- **TypeScript**: Static type checking
- **Vitest**: Testing framework
- **Playwright**: E2E testing

---

**Remember**: Quality is not a destination, it's a journey. Consistent small improvements lead to exceptional code! 🚀
