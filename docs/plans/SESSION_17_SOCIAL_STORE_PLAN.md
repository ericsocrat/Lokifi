# Session 17 - socialStore.tsx TypeScript Implementation Plan

**Date**: October 28, 2025
**Status**: 🔄 READY TO START
**Target**: apps/frontend/src/lib/stores/socialStore.tsx (1,314 lines)
**Estimated Time**: 2-3 hours (based on Session 15 & 16 results)

---

## 📊 Target Analysis

**File Complexity**:
- **Total Lines**: 1,314 lines
- **`any` Types**: 124 identified (verified)
- **Actions**: 30+ methods across 8 categories
- **Pattern**: Similar structure to monitoringStore & environmentManagementStore ✅

**Success Pattern from Sessions 15 & 16**:
- Monitor Store: 1,846 lines, 147 `any` → 2.5 hours → 100% type-safe ✅
- Environment Store: 1,904 lines, 116 `any` → 2-2.5 hours → 100% type-safe ✅
- Social Store: 1,314 lines, 124 `any` → **Estimated 2-3 hours**

**Advantages**:
- ✅ Type interfaces already defined (SocialState & SocialActions)
- ✅ Proven patterns from 2 previous large stores
- ✅ Smaller than previous stores (1,314 vs 1,846/1,904 lines)
- ✅ Clear action categories already identified

---

## 🎯 Implementation Plan

### Phase 1: Type Foundations (30 minutes)

**Tasks**:
1. Add proper imports at top of file
2. Add `Draft` import from 'immer'
3. Add section markers for organization
4. Verify SocialState & SocialActions interfaces complete
5. Add combined store type

**Expected Changes**:
```typescript
// Add to imports
import type { Draft } from 'immer';

// Verify combined type exists (around line 275)
type SocialStore = SocialState & SocialActions;
```

---

### Phase 2: Fix Action Implementations by Category (1.5-2 hours)

#### Category 1: Authentication (3/3 actions)
- `login: async (credentials: any)` → `(credentials: { username: string; password: string })`
- `logout: ()` → Already correctly typed
- `updateProfile: async (updates: any)` → `(updates: Partial<SocialUser>)`

**Pattern**:
```typescript
// ❌ BEFORE
login: async (credentials: any) => {
  set((state: any) => {
    state.isLoading = true;
  });
}

// ✅ AFTER
login: async (credentials: { username: string; password: string }) => {
  set((draft: Draft<SocialStore>) => {
    draft.isLoading = true;
  });
}
```

#### Category 2: Content Creation (3/3 actions)
- `createPost: async (postData: any)` → Use Omit type from interface
- `updatePost: async (postId: string, updates: any)` → `updates: Partial<SocialPost>`
- `deletePost: async (postId: string)` → Verify string parameter

#### Category 3: Content Interaction (5/5 actions)
- `likePost: async (postId: string)` 
- `unlikePost: async (postId: string)`
- `bookmarkPost: async (postId: string)`
- `unbookmarkPost: async (postId: string)`
- `sharePost: async (postId: string, platform?: any)` → `platform?: string`

#### Category 4: Comments (4/4 actions)
- `addComment: async (postId: string, content: string, parentId?: string)`
- `updateComment: async (commentId: string, content: string)`
- `deleteComment: async (commentId: string)`
- `likeComment: async (commentId: string)`

#### Category 5: Social Interactions (4/4 actions)
- `followUser: async (userId: string)`
- `unfollowUser: async (userId: string)`
- `blockUser: async (userId: string)`
- `reportContent: async (contentId: string, type: 'post' | 'comment', reason: string)`

#### Category 6: Feed Management (3/3 actions)
- `loadFeed: async (filter?: any, offset?: number)` → `filter?: SocialState['feedFilter']`
- `loadSymbolThread: async (symbol: string)`
- `searchContent: async (query: string)`

#### Category 7: Copy Trading (4/4 actions)
- `startCopyTrading: async (traderId: string, settings: any)` → `settings: CopyTrading['settings']`
- `stopCopyTrading: async (copyTradingId: string)`
- `updateCopySettings: async (copyTradingId: string, settings: any)` → `settings: Partial<CopyTrading['settings']>`
- `loadTraderStats: async (traderId: string)`

#### Category 8: Notifications & Realtime (5/5 actions)
- `loadNotifications: async ()`
- `markNotificationRead: async (notificationId: string)`
- `markAllNotificationsRead: async ()`
- `connectRealtime: ()`
- `disconnectRealtime: ()`

#### Category 9: Settings & UI State (3/3 actions)
- `updateSocialSettings: (settings: any)` → `settings: Partial<SocialState['socialSettings']>`
- `setSelectedSymbol: (symbol: string | null)`
- `setFeedFilter: (filter: any)` → `filter: SocialState['feedFilter']`
- `setSearchQuery: (query: string)`

---

### Phase 3: Validation & Testing (30 minutes)

**Type Check**:
```powershell
cd apps/frontend
npm run type-check
```

**Build Verification**:
```powershell
npm run build
```

**Check Remaining `any` Types**:
```powershell
Select-String -Pattern ':\s*any\b' src/lib/stores/socialStore.tsx
```

**Expected Result**: 0-3 acceptable `any` types (Zustand persist API, etc.)

---

### Phase 4: Documentation (30 minutes)

**Update Files**:
1. Mark Session 17 complete in this document
2. Update TECHNICAL_ROADMAP.md (Sprint 2: 3/10 stores, 30%)
3. Update CHECKLISTS.md (Sprint 2 progress)
4. Update copilot-instructions.md (Session 17 complete section)
5. Update Todo list with Session 17 completion

---

## 📋 Key Patterns to Apply

### Pattern 1: Draft State Mutations
```typescript
set((draft: Draft<SocialStore>) => {
  draft.feed.push(post);
})
```

### Pattern 2: Omit for Creation
```typescript
createPost: async (postData: Omit<SocialPost, 'id' | 'author' | 'createdAt' | 'likes' | 'comments' | 'shares' | 'views' | 'isLiked' | 'isBookmarked' | 'isDeleted' | 'reportCount'>)
```

### Pattern 3: Partial for Updates
```typescript
updatePost: async (postId: string, updates: Partial<SocialPost>)
```

### Pattern 4: Union Types
```typescript
reportContent: async (contentId: string, type: 'post' | 'comment', reason: string)
```

### Pattern 5: Type References
```typescript
setFeedFilter: (filter: SocialState['feedFilter'])
```

---

## 🎯 Success Metrics

**Target**:
- ✅ 124 `any` types → 0-3 acceptable
- ✅ 30+ actions properly typed (100%)
- ✅ 9 categories complete (100%)
- ✅ Build successful
- ✅ 2-3 hours total time

**Sprint 2 Impact**:
- Progress: 3/10 stores complete (30%)
- Pattern validation: Consistent across 3 diverse stores
- Foundation: Ready for remaining 7 stores

---

## 📝 Notes

**Advantages of socialStore.tsx**:
1. Already has complete type interfaces defined
2. Smaller than previous 2 stores
3. Similar pattern to proven successful sessions
4. Clear action categorization
5. Good candidate for validating patterns on different domain

**Expected Challenges**:
1. Map and Set data structures (following, followers, threads)
2. Nested comment structures
3. Real-time connection state
4. Copy trading complex types

**Mitigation**:
- All challenges have precedents in previous stores
- Draft typing handles Map/Set mutations
- Type inference works well for nested structures
- Complex types already defined in interfaces
