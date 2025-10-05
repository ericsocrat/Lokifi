# 🔄 Dashboard/Net Worth Page Restoration Plan

## Overview
Restoring the complete Net Worth / Dashboard page with all features from the original implementation.

## Current State Analysis

### Dashboard Page (`/dashboard`)
**Has:**
- ✅ Full navigation sidebar
- ✅ Net Worth overview card
- ✅ Stats breakdown (Investable Assets, Assets, Debts, Cash on Hand, Illiquid)
- ✅ Net Worth chart (sample data)
- ✅ Allocation donut charts (2 charts)
- ✅ Welcome message for empty state
- ✅ Add Assets button
- ⚠️ Shows sample/placeholder data

**Missing:**
- ❌ Real asset data integration
- ❌ Real-time calculations
- ❌ Connection to portfolio storage
- ❌ Actual asset listings
- ❌ Bank connections
- ❌ Recent activity
- ❌ Performance metrics

### Portfolio Page (`/portfolio`)
**Has:**
- ✅ Real asset management
- ✅ Portfolio sections
- ✅ Add/remove assets
- ✅ Bank connection simulation
- ✅ Data persistence (localStorage)
- ✅ Asset cards with details

**Missing:**
- ❌ Net worth calculations
- ❌ Charts and visualizations
- ❌ Stats cards
- ❌ Allocation breakdowns

## Restoration Plan

### Phase 1: Consolidate Data Layer ✅
- Merge portfolio storage functions
- Add net worth calculations
- Add allocation calculations
- Add category breakdowns

### Phase 2: Enhanced Dashboard Page 🔄
Update `/dashboard` page to:
1. **Connect to real data**
   - Load portfolio from storage
   - Calculate actual net worth
   - Calculate actual stats

2. **Real Stats Cards**
   - Net Worth (total value)
   - Investable Assets (stocks, crypto)
   - Assets (total of all)
   - Debts (if tracked)
   - Cash on Hand (cash accounts)
   - Illiquid (real estate, etc.)

3. **Real Charts**
   - Net worth trend over time
   - Allocation by category
   - Allocation by asset class

4. **Asset Summary**
   - Recent additions
   - Top holdings
   - Performance summary

5. **Quick Actions**
   - Add Assets (existing)
   - Connect Bank
   - View Portfolio

### Phase 3: Enhanced Portfolio Page 🔄
Keep `/portfolio` as detailed asset management:
- Asset list with full details
- Add/edit/remove assets
- Organize by sections
- Bank connections
- Asset search/filter

### Phase 4: Navigation & UX ✅
- Dashboard = Overview/Net Worth
- Portfolio = Detailed asset management
- Seamless navigation between both

## Implementation Steps

### Step 1: Create Data Integration Layer
```typescript
// lib/dashboardData.ts
- getTotalNetWorth()
- getInvestableAssets()
- getTotalAssets()
- getCashOnHand()
- getIlliquidAssets()
- getDebts()
- getAllocationByCategory()
- getAllocationByType()
- getRecentActivity()
```

### Step 2: Update Dashboard Page
- Replace sample data with real data
- Wire up calculations
- Add real charts
- Add asset summaries
- Keep beautiful UI

### Step 3: Polish & Test
- Test all calculations
- Verify data flow
- Check responsiveness
- Test empty states
- Test with real data

## Features to Restore

### 1. Net Worth Overview ✅
- Total net worth display
- 1 DAY/7 DAY/30 DAY/1 YEAR/ALL TIME toggles
- Trend indicator

### 2. Stats Cards ✅
- Investable Assets with tooltip
- Total Assets
- Debts (with breakdown)
- Cash on Hand
- Illiquid assets

### 3. Charts & Visualizations ✅
- **Net Worth Chart**
  - Line/area chart
  - Historical data
  - Interactive tooltips
  
- **Allocation Charts**
  - By category (Stocks, Crypto, Real Estate, etc.)
  - By asset class
  - Donut/pie charts
  - Legend with percentages

### 4. Asset Insights 🆕
- Top 5 holdings
- Recent additions
- Best performers
- Worst performers

### 5. Quick Actions ✅
- Add Assets
- Connect Bank
- View Full Portfolio
- Generate Report

## Data Structure

```typescript
interface DashboardData {
  netWorth: {
    current: number;
    previous: number;
    change: number;
    changePercent: number;
  };
  
  stats: {
    investableAssets: number;
    totalAssets: number;
    debts: number;
    cashOnHand: number;
    illiquid: number;
  };
  
  allocations: {
    byCategory: AllocationItem[];
    byType: AllocationItem[];
  };
  
  recentActivity: Activity[];
  topHoldings: Asset[];
}

interface AllocationItem {
  name: string;
  value: number;
  percentage: number;
  color: string;
}
```

## Timeline

- ✅ Phase 1: Data Layer - 30 minutes
- 🔄 Phase 2: Dashboard Update - 45 minutes
- ⏳ Phase 3: Portfolio Polish - 30 minutes
- ⏳ Phase 4: Testing - 15 minutes

**Total Estimated Time**: 2 hours

## Next Steps

1. Create `lib/dashboardData.ts` with all calculation functions
2. Update `/dashboard/page.tsx` to use real data
3. Add missing features to `/portfolio/page.tsx`
4. Test thoroughly
5. Deploy

---

**Status**: 🟡 IN PROGRESS
**Started**: 2025-10-04 15:00 UTC+3
**Target Completion**: 2025-10-04 17:00 UTC+3
