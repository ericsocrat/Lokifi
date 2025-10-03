# Sign Up Implementation Plan

## Current State Analysis

### Backend ✅ (Already Complete)
The backend authentication system is fully implemented:

**Endpoint**: `POST /api/auth/register`

**Expected Request**:
```json
{
  "email": "user@example.com",
  "password": "password123",
  "full_name": "John Doe",
  "username": "johndoe" // optional
}
```

**Features**:
- ✅ Email validation (EmailStr from Pydantic)
- ✅ Password strength validation (min 8 characters)
- ✅ Duplicate email check (returns 409 Conflict)
- ✅ Username uniqueness check (if provided)
- ✅ Password hashing (bcrypt)
- ✅ Automatic profile creation
- ✅ Notification preferences initialization
- ✅ JWT token generation (access + refresh)
- ✅ HTTP-only cookie setup (secure session)
- ✅ Rate limiting protection

**Response**:
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "full_name": "John Doe",
    "is_active": true,
    "is_verified": false,
    "created_at": "2025-10-03T..."
  },
  "profile": {
    "id": "uuid",
    "user_id": "uuid",
    "username": "johndoe",
    "display_name": "John Doe",
    "bio": null,
    "avatar_url": null,
    "is_public": true,
    "follower_count": 0,
    "following_count": 0,
    "created_at": "...",
    "updated_at": "..."
  }
}
```

### Frontend ❌ (Needs Update)
The frontend has a basic AuthModal but uses the wrong API contract:

**Current Issues**:
1. ❌ Sends `handle` instead of `email`
2. ❌ Missing `full_name` field (required)
3. ❌ Sends `bio` which doesn't exist in backend schema
4. ❌ No validation before submission
5. ❌ Basic error handling
6. ❌ No loading states
7. ❌ No success feedback
8. ❌ Username is not sent (but it's optional)

**Current AuthModal**:
```tsx
// Sends: { handle, password, bio }
// Backend expects: { email, password, full_name, username? }
```

## Implementation Strategy

### Phase 1: Fix Frontend Auth Functions ✅ Priority 1
Update `frontend/src/lib/auth.ts` to match backend contract:

**Before**:
```typescript
register(handle: string, password: string, avatar_url?: string, bio?: string)
```

**After**:
```typescript
register(email: string, password: string, full_name: string, username?: string)
```

### Phase 2: Update AuthModal Component ✅ Priority 1
Upgrade `frontend/src/components/AuthModal.tsx` with:

**Required Changes**:
1. ✅ Add `email` field (EmailStr validation)
2. ✅ Add `full_name` field (required)
3. ✅ Add `username` field (optional)
4. ✅ Remove `bio` field (not in registration)
5. ✅ Add client-side validation:
   - Email format validation
   - Password strength indicator
   - Name validation (min 1 char)
   - Username format (3-30 chars, alphanumeric)
6. ✅ Improve error messages
7. ✅ Add loading spinner
8. ✅ Add success state
9. ✅ Better UX/UI

**New Field Structure**:
```tsx
// Login mode
- email
- password

// Register mode
- email
- password
- confirm password (recommended)
- full_name
- username (optional)
```

### Phase 3: Enhanced Sign Up Page (Optional) 🎨 Priority 2
Create dedicated sign-up page: `frontend/app/signup/page.tsx`

**Features**:
- Standalone page (not modal)
- Multi-step wizard (optional)
  - Step 1: Email + Password
  - Step 2: Personal Info (name, username)
  - Step 3: Preferences (optional)
- Social auth buttons (Google OAuth - already backend ready)
- Email verification flow
- Terms & conditions checkbox
- Privacy policy link

### Phase 4: Password Validation Component 🔐 Priority 2
Create `frontend/src/components/PasswordStrengthIndicator.tsx`:

**Features**:
- Real-time password strength meter
- Visual feedback (weak/medium/strong)
- Requirements checklist:
  - ✅ Min 8 characters
  - ✅ Contains uppercase
  - ✅ Contains lowercase
  - ✅ Contains number
  - ✅ Contains special character

### Phase 5: Email Verification (Future) 📧 Priority 3
Backend is ready (`is_verified` field exists):

**Flow**:
1. User registers → `is_verified: false`
2. Backend sends verification email
3. User clicks link → `/verify-email?token=xxx`
4. Backend validates token → `is_verified: true`
5. User can now access all features

**Required**:
- Email service setup (SendGrid/AWS SES)
- Verification token generation
- Frontend verification page
- Resend verification option

## Quick Start: Minimal Fix

### Step 1: Update auth.ts
```typescript
// frontend/src/lib/auth.ts
export async function register(
  email: string,
  password: string,
  full_name: string,
  username?: string
) {
  const res = await apiFetch(`/auth/register`, {
    method: "POST",
    body: JSON.stringify({ email, password, full_name, username }),
  });
  const data = await res.json();
  setToken(data.access_token);
  return data;
}
```

### Step 2: Update AuthModal.tsx
```tsx
// Add new state
const [email, setEmail] = useState("");
const [fullName, setFullName] = useState("");
const [username, setUsername] = useState("");

// Update submit
if (mode === "register") {
  await register(email, password, fullName, username || undefined);
} else {
  await login(email, password);
}

// Add fields in JSX
<input type="email" placeholder="Email" value={email} ... />
<input placeholder="Full Name" value={fullName} ... />
<input placeholder="Username (optional)" value={username} ... />
```

## Recommended: Enhanced Sign Up

### Option A: Enhanced Modal (Fastest)
Upgrade existing AuthModal with better validation and UX.

**Pros**:
- Quick to implement
- Consistent with current flow
- Works everywhere modal is used

**Cons**:
- Limited space for complex flows
- Harder to add multi-step wizards

### Option B: Dedicated Page (Best UX)
Create `/signup` page with full experience.

**Pros**:
- More space for fields and validation
- Can add onboarding wizard
- Better for SEO
- Easier to A/B test

**Cons**:
- Need to maintain both modal and page
- Slightly more development time

### Option C: Hybrid Approach (Recommended) ⭐
1. Fix modal for quick auth (Phase 1-2)
2. Add dedicated page for new users (Phase 3)
3. Use modal for "login required" prompts
4. Use page for marketing/landing flows

## Testing Checklist

### Backend Tests ✅
- [x] Email validation
- [x] Password strength check
- [x] Duplicate email detection
- [x] Username uniqueness
- [x] Profile creation
- [x] Token generation
- [x] Cookie setting

### Frontend Tests (To Do)
- [ ] Email format validation
- [ ] Password confirmation match
- [ ] Required field validation
- [ ] Username format validation
- [ ] Error message display
- [ ] Success redirect
- [ ] Token storage
- [ ] Cookie handling

## Next Steps

1. **Choose Approach**: Modal fix vs Dedicated page vs Hybrid
2. **Update Frontend**: Match backend contract
3. **Add Validation**: Client-side validation for better UX
4. **Test Flow**: Registration → Login → Protected route
5. **Polish UX**: Loading states, error messages, success feedback
6. **Documentation**: Update API docs with examples

## Decision Points

**Question 1**: Do you want to fix the existing modal or create a new sign-up page?
- A) Fix modal (fastest - 15 mins)
- B) Create dedicated page (best - 1-2 hours)
- C) Both (recommended - 2-3 hours)

**Question 2**: What level of validation do you want?
- A) Basic (email format, password length)
- B) Enhanced (password strength, username format)
- C) Full (password strength meter, real-time validation)

**Question 3**: Additional features?
- A) Just registration (minimal)
- B) + Social auth (Google OAuth)
- C) + Email verification
- D) + Onboarding wizard

**Question 4**: Where should users land after signup?
- A) Dashboard/Portfolio
- B) Onboarding/Welcome page
- C) Email verification prompt
- D) Same page with success message

## My Recommendation 🎯

**Start with**: Option A + B from Q1 (Fix modal + Create dedicated page)
**Validation**: Option B from Q2 (Enhanced validation)
**Features**: Option A from Q3 (Just registration first)
**Landing**: Option A from Q4 (Portfolio page)

**Timeline**:
- Phase 1-2: 30 minutes (fix modal - MVP)
- Phase 3: 1 hour (dedicated page)
- Phase 4: 30 minutes (password strength)
- Total: ~2 hours for complete sign-up experience

Ready to start? Let me know which approach you prefer!
