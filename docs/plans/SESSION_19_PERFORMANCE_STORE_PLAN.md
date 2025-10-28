# Session 19 - performanceStore.tsx Type Safety Implementation

**Date**: October 28, 2025
**Status**: IN PROGRESS
**Target**: apps/frontend/src/lib/stores/performanceStore.tsx (1,719 lines)
**Estimated Time**: ~1 hour (bulk replacement efficiency)

---

## 📊 Initial Analysis

**File Metrics**:
- **Total Lines**: 1,719 (similar to configurationSyncStore)
- **Total `any` Types**: 114 occurrences
- **Complexity**: High - performance profiling, benchmarking, metrics collection

**Type Categories Identified**:
1. State parameter types (state: any) - ~40 occurrences
2. Function parameter types (profileId: any, updates: any, etc.) - ~35 occurrences
3. Array operation types (p: any, b: any, m: any in filters/finds) - ~25 occurrences
4. Zustand persist (persistedState: any) - 1 acceptable

**Expected Outcome**: 114 → ~5-10 acceptable `any` types

---

## 🎯 Implementation Strategy

### Phase 1: Type Foundations (5 minutes)

1. **Add Imports**
   ```typescript
   import type { Draft } from 'immer';
   ```

2. **Define Combined Store Type**
   ```typescript
   type PerformanceStore = PerformanceState & PerformanceActions;
   ```

3. **Update Store Creation**
   ```typescript
   export const usePerformanceStore = create<PerformanceStore>()(
     persist(
       subscribeWithSelector(
         immer((set, get) => ({
           // ... implementation
         }))
       ),
       { name: 'performance-store' }
     )
   );
   ```

### Phase 2: Bulk State Mutations Fix (5 minutes)

**Use PowerShell bulk replacement** (proven in Sessions 17-18):

```powershell
# State mutations: ~40 occurrences
$content = $content -replace '\(state:\s*any\)', '(draft: Draft<PerformanceStore>)'
$content = $content -replace '(?<!draft)(\s)state\.', '$1draft.'

# Array lambdas: ~25 occurrences
$content = $content -replace '\(p:\s*any\)', '(p)'
$content = $content -replace '\(b:\s*any\)', '(b)'
$content = $content -replace '\(m:\s*any\)', '(m)'
$content = $content -replace '\(metric:\s*any\)', '(metric)'
$content = $content -replace '\(benchmark:\s*any\)', '(benchmark)'
```

**Expected**: ~65 fixes in seconds

### Phase 3: Fix Action Parameters (40 minutes)

**Categories to Fix** (estimated 20-25 actions):

1. **Profile Management** (5 actions):
   - `createProfile(profileData: Omit<PerformanceProfile, 'id'>)`
   - `updateProfile(profileId: string, updates: Partial<PerformanceProfile>)`
   - `deleteProfile(profileId: string)`
   - `setActiveProfile(profileId: string | null)`
   - `cloneProfile(profileId: string, name: string)`

2. **Metrics Collection** (4 actions):
   - `collectMetrics(): Promise<void>`
   - `recordMetric(metric: Omit<PerformanceMetrics, 'id' | 'timestamp'>)`
   - `clearMetrics(olderThan: Date)`
   - `exportMetrics(): Promise<Blob>`

3. **Benchmarking** (5 actions):
   - `runBenchmark(config: BenchmarkConfig): Promise<string>`
   - `compareBenchmarks(benchmarkId1: string, benchmarkId2: string): BenchmarkComparison | null`
   - `deleteBenchmark(benchmarkId: string)`
   - `exportBenchmark(benchmarkId: string): Promise<Blob>`
   - `importBenchmark(file: File): Promise<void>`

4. **Optimization** (4 actions):
   - `applyOptimizations(profileId: string): void`
   - `revertOptimizations(): void`
   - `testOptimization(optimization: string): Promise<OptimizationResult>`
   - `scheduleOptimization(config: OptimizationSchedule): void`

5. **Monitoring** (3 actions):
   - `startMonitoring(): void`
   - `stopMonitoring(): void`
   - `setMonitoringInterval(interval: number)`

6. **Analysis** (3 actions):
   - `analyzePerformance(): PerformanceAnalysis`
   - `getRecommendations(): PerformanceRecommendation[]`
   - `compareWithBaseline(baselineId: string): PerformanceComparison`

7. **UI/Settings** (3 actions):
   - `updateConfig(config: Partial<PerformanceConfig>)`
   - `resetConfig(): void`
   - `setVisualizationMode(mode: VisualizationMode)`

**Bulk Replacement Strategy**:
```powershell
$replacements = @(
  @{Pattern = 'deleteProfile: \(profileId: any\)'; Replacement = 'deleteProfile: (profileId: string)'},
  @{Pattern = 'setActiveProfile: \(profileId: any\)'; Replacement = 'setActiveProfile: (profileId: string | null)'},
  @{Pattern = 'deleteBenchmark: \(benchmarkId: any\)'; Replacement = 'deleteBenchmark: (benchmarkId: string)'},
  @{Pattern = 'clearMetrics: \(olderThan: any\)'; Replacement = 'clearMetrics: (olderThan: Date)'}
)
```

### Phase 4: Validation & Build (10 minutes)

```powershell
# Type check
npm run type-check

# Count remaining any
Select-String -Path "src/lib/stores/performanceStore.tsx" -Pattern ':\s*any\b' | Measure-Object

# Build verification
npm run build
```

**Expected Result**: 114 → ~5-10 acceptable `any` types

---

## 📝 Action Categories Summary

**Total Actions**: ~25 actions across 7 categories

**Estimated Breakdown**:
- Profile Management: 5 actions
- Metrics Collection: 4 actions
- Benchmarking: 5 actions
- Optimization: 4 actions
- Monitoring: 3 actions
- Analysis: 3 actions
- UI/Settings: 3 actions

---

## ✅ Success Criteria

- [ ] All action parameters properly typed (string, Partial, Omit, Date)
- [ ] All state mutations use Draft<PerformanceStore>
- [ ] Build successful with no type errors
- [ ] Only acceptable `any` types remaining (Zustand persist + domain requirements)
- [ ] Time: Complete within 1 hour

---

## 🎯 Expected Final Metrics

- **File**: performanceStore.tsx (1,719 lines)
- **Progress**: 114 any → ~5-10 acceptable (90%+ improvement)
- **Actions**: 25+ properly typed (100%)
- **Categories**: 7/7 complete (100%)
- **Time**: ~1 hour (with bulk replacements)
- **Build**: ✅ SUCCESS

**Sprint 2 Impact**: 50% complete (5/10 stores after Session 19)
