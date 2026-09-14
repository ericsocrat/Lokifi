# Draft<T> for State Mutations Pattern

**Category**: Code Quality
**Difficulty**: 🟡 Intermediate
**Success Rate**: 100% (15/15 stores - Sessions 15-24)
**Impact**: ✅ Proven (type-safe mutations, zero runtime errors)
**Time Investment**: 5-10 minutes per action
**Sessions Used**: Sessions 15-24 (Sprint 2 comprehensive typing)

## Problem

Zustand + Immer mutations without proper typing lead to type errors and confusion:

❌ **Using `state` inside `set()`**: Common mistake with Immer
❌ **Implicit `any` types**: No type safety for draft parameter
❌ **Wrong mutation patterns**: Using spread operators instead of direct mutations
❌ **TypeScript errors**: "Property does not exist" when types wrong

## Context

**When to use:**
- ALL Zustand store actions (mandatory with Immer)
- Any `set()` call that mutates state
- Complex nested state updates
- When type safety is critical

**When NOT to use:**
- Simple useState hooks (overkill)
- Read-only operations (selectors)
- Stores without Immer middleware

**Prerequisites:**
- Zustand + Immer middleware configured
- TypeScript configured
- Understanding of [Zustand + Immer Pattern](./zustand-immer-pattern.md)

**Related Patterns:**
- [Zustand + Immer Pattern](./zustand-immer-pattern.md) - Foundation pattern
- [TypeScript Any Elimination](./typescript-any-elimination.md) - Type safety methodology

## Solution

### Step 1: Import Draft Type

**Always import from Immer:**
```typescript
import type { Draft } from 'immer';
```

### Step 2: Define State Interface

**Clear state structure:**
```typescript
interface StoreState {
  items: Item[];
  count: number;
  metadata: {
    lastUpdated: Date;
    source: string;
  };
}
```

### Step 3: Type Draft Parameter

**Critical: Use `Draft<StoreState>` not `StoreState`:**
```typescript
// ❌ BAD - Wrong type (causes errors)
set((state: StoreState) => {
  state.items.push(item);  // TypeScript error OR no effect!
})

// ✅ GOOD - Correct Draft<T> type
set((draft: Draft<StoreState>) => {
  draft.items.push(item);  // Type-safe, works correctly
})
```

### Step 4: Use Direct Mutations

**Immer allows direct mutations:**
```typescript
// Array mutations
set((draft: Draft<StoreState>) => {
  draft.items.push(item);           // ✅ Add
  draft.items.splice(index, 1);     // ✅ Remove
  draft.items[0] = newItem;         // ✅ Update by index
  draft.items = draft.items.filter(...);  // ✅ Filter
})

// Object mutations
set((draft: Draft<StoreState>) => {
  draft.count++;                    // ✅ Increment
  draft.metadata.source = 'remote'; // ✅ Nested update
  Object.assign(draft.metadata, updates);  // ✅ Merge updates
})
```

### Step 5: Handle Async Operations

**Type draft in async contexts:**
```typescript
fetchItems: async () => {
  // Set loading state
  set((draft: Draft<StoreState>) => {
    draft.isLoading = true;
    draft.error = null;
  });

  try {
    const data = await fetch('/api/items').then(r => r.json());

    // Update with data
    set((draft: Draft<StoreState>) => {
      draft.items = data;
      draft.isLoading = false;
    });
  } catch (error) {
    // Handle error
    set((draft: Draft<StoreState>) => {
      draft.error = error instanceof Error ? error.message : 'Unknown error';
      draft.isLoading = false;
    });
  }
}
```

## Example: Sprint 2 (Sessions 15-24) - Draft<T> Usage

**Real-world implementation from Sprint 2:**

### portfolioStore.tsx (Session 15)

**❌ BEFORE** (Without Draft<T> typing):
```typescript
addPortfolio: (portfolio) =>
  set((state) => {  // state is any!
    state.portfolios.push({  // No type safety
      ...portfolio,
      id: uuid(),
      createdAt: new Date()
    });
  })
```

**✅ AFTER** (With Draft<T> typing):
```typescript
addPortfolio: (portfolio: Omit<Portfolio, 'id' | 'createdAt'>) =>
  set((draft: Draft<PortfolioState>) => {  // Type-safe
    draft.portfolios.push({
      ...portfolio,
      id: uuid(),
      createdAt: new Date()
    });
  })
```

### transactionStore.tsx (Session 17)

**Complex nested updates with Draft<T>:**
```typescript
interface TransactionState {
  transactions: Transaction[];
  summary: {
    totalIncome: number;
    totalExpense: number;
    netCashFlow: number;
  };
}

addTransaction: (transaction: Omit<Transaction, 'id' | 'createdAt'>) =>
  set((draft: Draft<TransactionState>) => {
    // Add transaction
    const newTransaction = {
      ...transaction,
      id: uuid(),
      createdAt: new Date()
    };
    draft.transactions.push(newTransaction);

    // Update summary (nested mutation)
    if (transaction.type === 'income') {
      draft.summary.totalIncome += transaction.amount;
    } else {
      draft.summary.totalExpense += transaction.amount;
    }
    draft.summary.netCashFlow =
      draft.summary.totalIncome - draft.summary.totalExpense;
  })
```

### watchlistStore.tsx (Session 16)

**Array filtering with Draft<T>:**
```typescript
removeFromWatchlist: (symbol: string) =>
  set((draft: Draft<WatchlistState>) => {
    // Direct filter mutation
    draft.watchlist = draft.watchlist.filter(item => item.symbol !== symbol);

    // Update count
    draft.count = draft.watchlist.length;
  })
```

## Success Metrics

### Sprint 2 (Sessions 15-24): Draft<T> Adoption
- **Stores using Draft<T>**: 15/15 (100%)
- **Type safety improvement**: 96.3% (1,102 `any` → 42 acceptable)
- **TypeScript errors fixed**: 637 errors resolved
- **Runtime mutation bugs**: 0 (Immer + Draft<T> prevents all)
- **Time per action**: ~5-10 minutes (including type definitions)

**Sessions with Bulk Replacement**:
- Sessions 18-21: Used bulk `state.` → `draft.` replacement with validation
- Pattern: Replace in 5-10 line batches, verify types after each batch
- Success rate: 100% (no regressions, all replacements correct)

## Anti-Patterns

### ❌ Using state parameter name (CRITICAL)

```typescript
// ❌ BAD - Using 'state' inside set() with Immer
set((state: Draft<StoreState>) => {
  state.items.push(item);  // Confusing, even with correct type
})
```

```typescript
// ✅ GOOD - Always use 'draft' parameter name
set((draft: Draft<StoreState>) => {
  draft.items.push(item);  // Clear Immer usage
})
```

### ❌ Not typing Draft parameter

```typescript
// ❌ BAD - Implicit any
set((draft) => {
  draft.items.push(item);  // draft is any, no type safety
})
```

```typescript
// ✅ GOOD - Explicit Draft<T>
set((draft: Draft<StoreState>) => {
  draft.items.push(item);  // Type-safe
})
```

### ❌ Using spread operators with Immer

```typescript
// ❌ BAD - Unnecessary with Immer
set((draft: Draft<StoreState>) => {
  draft.items = [...draft.items, item];  // Spread not needed!
})
```

```typescript
// ✅ GOOD - Direct mutation (Immer handles immutability)
set((draft: Draft<StoreState>) => {
  draft.items.push(item);  // Simpler and faster
})
```

### ❌ Mixed state and draft references

```typescript
// ❌ BAD - Inconsistent naming
set((state: Draft<StoreState>) => {
  state.items.push(item);  // Called 'state' but is Draft
})

// Later in same store...
set((draft: Draft<StoreState>) => {
  draft.count++;  // Now called 'draft'
})
```

```typescript
// ✅ GOOD - Consistent naming
set((draft: Draft<StoreState>) => {
  draft.items.push(item);
})

set((draft: Draft<StoreState>) => {
  draft.count++;
})
```

## Related Patterns

- **[Zustand + Immer Pattern](./zustand-immer-pattern.md)** - Foundation pattern for state management
- **[TypeScript Any Elimination](./typescript-any-elimination.md)** - Type safety methodology (Sprint 2)

## Best Practices

1. **Always type Draft parameter** - `Draft<StoreState>` for every `set()` call
2. **Use 'draft' not 'state'** - Clear indication you're using Immer
3. **Direct mutations OK** - `push`, `splice`, `filter`, `Object.assign` all work
4. **No spread operators** - Unnecessary with Immer, use direct mutations
5. **Consistent naming** - All stores use same `draft` parameter name
6. **Validate types** - Run `npm run typecheck` after bulk replacements
7. **Document acceptable any** - If Draft<T> causes rare issues, document why

## Quick Reference

```typescript
import type { Draft } from 'immer';

interface StoreState {
  items: Item[];
  count: number;
}

// Basic mutation
set((draft: Draft<StoreState>) => {
  draft.items.push(item);
  draft.count++;
})

// Array operations
set((draft: Draft<StoreState>) => {
  draft.items.push(item);                      // Add
  draft.items = draft.items.filter(...);       // Filter
  draft.items.splice(index, 1);                // Remove by index
  draft.items[0] = newItem;                    // Update by index
})

// Object operations
set((draft: Draft<StoreState>) => {
  draft.count++;                               // Increment
  Object.assign(draft.item, updates);          // Merge updates
  draft.item.nested.property = value;          // Nested update
})

// Async operations
set((draft: Draft<StoreState>) => {
  draft.isLoading = true;  // Start
});

try {
  const data = await fetch(...);
  set((draft: Draft<StoreState>) => {
    draft.items = data;
    draft.isLoading = false;  // Success
  });
} catch (error) {
  set((draft: Draft<StoreState>) => {
    draft.error = error.message;
    draft.isLoading = false;  // Error
  });
}
```

## References

- **Sprint 2 (Sessions 15-24)**: 15 stores with Draft<T> - [history.md](../../plans/history.md)
- **Validation Summary**: [VALIDATION_SUMMARY_SESSIONS_18-21.md](../../guides/VALIDATION_SUMMARY_SESSIONS_18-21.md)
- **Immer docs**: [TypeScript usage](https://immerjs.github.io/immer/typescript/)
- **Zustand + Immer**: [zustand-immer-pattern.md](./zustand-immer-pattern.md)

---

**Last Updated**: November 2, 2025 (Session 66 documentation)
**Pattern Status**: ✅ Proven (15/15 stores, 100% success rate, Sprint 2)
**Recommended For**: ALL Zustand store mutations (mandatory pattern)
