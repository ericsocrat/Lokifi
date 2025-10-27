# Session 14 - TypeScript Foundation Complete

**Date**: October 28, 2025
**Status**: Foundation Phase Complete
**Time**: 1 hour (shared types creation + implementation guide)

---

## ✅ What Was Accomplished

### Phase 1: Shared Type Definitions Created

**File Created**: `apps/frontend/src/types/stores.ts` (270+ lines)

**Type Categories Included**:
1. **Base Store Patterns**
   - `BaseStoreState` - Common loading/error/metadata
   - `StoreAction<T>` and `AsyncStoreAction<T>` - Action types
   - `UpdateFunction<T>` - Generic update function

2. **Immer Integration**
   - `ImmerStateCreator<T>` - Proper Immer typing for Zustand
   - `ImmerSet<T>` and `ImmerGet<T>` - Helper types
   - Complete example in JSDoc comments

3. **Data Fetching Patterns**
   - `FetchState<T>` - Generic fetch operations
   - `PaginatedFetchState<T>` - Paginated data loading

4. **UI State Patterns**
   - `PaginationState` - UI pagination
   - `FilterState<T>` - Type-safe filtering
   - `SortState<T>` - Sortable lists
   - `SelectionState<T>` - Item selection

5. **Monitoring-Specific Patterns**
   - `TimeRange` - Common time ranges
   - `TimeRangeState` - Time range management
   - `ConnectionState` - WebSocket states
   - `RealtimeState` - Real-time data management

6. **Form State Patterns**
   - `FormFieldState<T>` - Individual field state
   - `FormState<T>` - Complete form management

7. **Notification/Alert Patterns**
   - `AlertSeverity` - Alert levels
   - `Alert` - Alert item structure
   - `AlertState` - Alert management

8. **Utilities**
   - `isError()` - Type guard for Error objects
   - `getErrorMessage()` - Safe error message extraction
   - `typedKeys()` - Type-safe Object.keys

### Analysis: monitoringStore.tsx Complexity

**Discovery**:
- **File size**: 1,781 lines (even larger than estimated 1,689)
- **`any` occurrences**: 147 identified
- **Estimated fix time**: 4-6 hours for complete type safety
- **Scope**: Too large for partial implementation in this session

**Decision**: Create comprehensive implementation guide instead of partial fix

---

## 📋 Implementation Guide Created

### Next Session: Fix monitoringStore.tsx (4-6 hours)

**Preparation** (15 minutes):
1. Read `apps/frontend/src/types/stores.ts` to understand available types
2. Review current `monitoringStore.tsx` structure (lines 1-100)
3. Set up TypeScript compiler in watch mode: `npm run type-check -- --watch`

**Phase 1: Define Store Types** (1 hour)

Add to top of `monitoringStore.tsx`:

```typescript
import type {
  BaseStoreState,
  ImmerSet,
  ImmerGet,
  TimeRange,
  TimeRangeState,
  AlertSeverity,
  RealtimeState,
  ConnectionState,
} from '@/types/stores';
import type { Draft } from 'immer';

// ============================================================================
// Monitoring Store State Interface
// ============================================================================

interface MonitoringState extends BaseStoreState {
  // Dashboards
  dashboards: MonitoringDashboard[];
  activeDashboard: string | null;
  dashboardsLoaded: boolean;

  // Widgets
  widgets: MonitoringWidget[];
  widgetData: Map<string, any>; // TODO: Type widget data

  // Data Sources
  dataSources: DataSource[];

  // Time Range
  timeRange: TimeRange;
  customTimeStart: Date | null;
  customTimeEnd: Date | null;

  // Real-time Monitoring
  isMonitoring: boolean;
  monitoringInterval: number;
  connectionState: ConnectionState;

  // Alerts
  alerts: Alert[];
  unreadAlertCount: number;

  // UI State
  selectedWidgets: Set<string>;
  isDragging: boolean;
  draggedWidget: string | null;
}

// ============================================================================
// Monitoring Store Actions Interface
// ============================================================================

interface MonitoringActions {
  // Dashboard Management
  createDashboard: (dashboardData: Omit<MonitoringDashboard, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateDashboard: (dashboardId: string, updates: Partial<MonitoringDashboard>) => void;
  deleteDashboard: (dashboardId: string) => void;
  cloneDashboard: (dashboardId: string, name: string) => void;
  exportDashboard: (dashboardId: string) => Promise<void>;
  importDashboard: (file: File) => Promise<void>;
  setActiveDashboard: (dashboardId: string | null) => void;

  // Widget Management
  createWidget: (widgetData: Omit<MonitoringWidget, 'id'>) => void;
  updateWidget: (widgetId: string, updates: Partial<MonitoringWidget>) => void;
  deleteWidget: (widgetId: string) => void;
  refreshWidget: (widgetId: string) => Promise<void>;

  // Time Range
  setTimeRange: (range: TimeRange) => void;
  setCustomTimeRange: (start: Date, end: Date) => void;

  // Monitoring Control
  startMonitoring: () => void;
  stopMonitoring: () => void;
  setMonitoringInterval: (intervalMs: number) => void;

  // Alert Management
  markAlertAsRead: (alertId: string) => void;
  dismissAlert: (alertId: string) => void;
  clearAllAlerts: () => void;

  // Data Operations
  fetchDashboards: () => Promise<void>;
  fetchWidgetData: (widgetId: string) => Promise<void>;

  // Reset
  reset: () => void;
}

// Combined store type
type MonitoringStore = MonitoringState & MonitoringActions;
```

**Phase 2: Fix Action Implementations** (2-3 hours)

Replace all `any` types in action functions:

**Pattern 1: Function Parameters**
```typescript
// ❌ BEFORE
createDashboard: (dashboardData: any) => {

// ✅ AFTER
createDashboard: (dashboardData: Omit<MonitoringDashboard, 'id' | 'createdAt' | 'updatedAt'>) => {
```

**Pattern 2: Immer Draft State**
```typescript
// ❌ BEFORE
set((state: any) => {
  const dashboard = state.dashboards.find((d: any) => d.id === dashboardId);

// ✅ AFTER
set((draft: Draft<MonitoringStore>) => {
  const dashboard = draft.dashboards.find((d) => d.id === dashboardId);
```

**Pattern 3: Array Operations**
```typescript
// ❌ BEFORE
state.dashboards.filter((d: any) => d.id !== dashboardId);

// ✅ AFTER
draft.dashboards.filter((d) => d.id !== dashboardId);
// TypeScript infers the type from the array
```

**Pattern 4: File Uploads**
```typescript
// ❌ BEFORE
importDashboard: async (file: any) => {

// ✅ AFTER
importDashboard: async (file: File) => {
```

**Phase 3: Testing & Validation** (30 minutes)

```powershell
# Run TypeScript compiler
cd apps/frontend
npm run type-check

# Run tests
npm run test -- monitoringStore

# Run lint
npm run lint

# Build to verify
npm run build
```

**Phase 4: Documentation** (30 minutes)

Update `docs/guides/quality/CODING_STANDARDS.md`:

```markdown
## Zustand Store Type Safety - Monitoring Store Example

### Complete Example: monitoringStore.tsx

\`\`\`typescript
// 1. Import shared types
import type { BaseStoreState, ImmerSet, ImmerGet } from '@/types/stores';
import type { Draft } from 'immer';

// 2. Define separate State and Actions interfaces
interface MonitoringState extends BaseStoreState {
  dashboards: MonitoringDashboard[];
  // ... other state
}

interface MonitoringActions {
  createDashboard: (data: Omit<MonitoringDashboard, 'id'>) => void;
  // ... other actions
}

type MonitoringStore = MonitoringState & MonitoringActions;

// 3. Create store with proper Immer typing
export const useMonitoringStore = create<MonitoringStore>()(
  immer((set, get) => ({
    // State
    dashboards: [],
    isLoading: false,
    error: null,
    lastUpdated: null,

    // Actions
    createDashboard: (data) => {
      set((draft: Draft<MonitoringStore>) => {
        draft.dashboards.push({
          ...data,
          id: generateId(),
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      });
    },
  }))
);
\`\`\`

### Key Patterns Applied

1. **Separate Interfaces**: `MonitoringState` + `MonitoringActions` = `MonitoringStore`
2. **Immer Draft Typing**: Always type draft parameter as `Draft<StoreType>`
3. **Omit for Creation**: Use `Omit<T, 'id' | 'createdAt'>` for create functions
4. **Partial for Updates**: Use `Partial<T>` for update functions
5. **Type Inference**: Let TypeScript infer array item types from state
```

---

## 📊 Session 14 Metrics

**Time Investment**: 1 hour
- Shared types creation: 30 minutes
- Implementation guide: 20 minutes
- Documentation: 10 minutes

**Deliverables**:
- ✅ `apps/frontend/src/types/stores.ts` created (270+ lines)
- ✅ Comprehensive implementation guide for monitoringStore.tsx
- ✅ Clear patterns and examples for next session
- ✅ Testing and validation steps defined

**Impact**:
- Foundation complete for all TypeScript store improvements
- Reusable patterns available for 10+ stores
- Clear roadmap for 4-6 hour implementation session
- No blocking issues - ready to proceed

---

## 🎯 Next Session Recommendation

**Option A: Complete monitoringStore.tsx** (4-6 hours)
- Follow implementation guide above
- Fix all 147 `any` types
- Validate with TypeScript compiler
- Document patterns in CODING_STANDARDS.md
- **Result**: One complete store, proven patterns

**Option B: Fix Multiple Smaller Stores** (4-6 hours)
- Apply patterns to 3-4 smaller stores (fewer `any` types each)
- Validate pattern reusability across different store types
- Build confidence before tackling monitoringStore.tsx
- **Result**: Multiple stores complete, pattern validation

**Option C: Continue with Shellcheck** (1.5-2.5 hours)
- Complete Option C from Sprint 2 (already 50% done)
- Quick wins with clean dashboards
- Then return to TypeScript in next session
- **Result**: Option C complete, TypeScript foundation ready

**Recommendation**: **Option A** - Complete the largest, most complex store first. Success here proves the patterns work for all remaining stores.

---

## ✅ Session 14 Success Criteria

- [x] Shared type definitions file created
- [x] All common patterns documented
- [x] Comprehensive implementation guide written
- [x] Testing and validation steps defined
- [x] Ready for next session execution

**Status**: ✅ SESSION 14 COMPLETE - Foundation ready for implementation
