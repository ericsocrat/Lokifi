# Quick Reference: Protect Any Page in 3 Steps

## Template for Protecting Pages

### Step 1: Import ProtectedRoute
```tsx
import { ProtectedRoute } from '@/src/components/ProtectedRoute';
```

### Step 2: Rename Your Component
```tsx
// Change this:
export default function YourPage() {
  return <div>Content</div>;
}

// To this:
function YourPageContent() {
  return <div>Content</div>;
}
```

### Step 3: Wrap with ProtectedRoute
```tsx
export default function YourPage() {
  return (
    <ProtectedRoute>
      <YourPageContent />
    </ProtectedRoute>
  );
}
```

## Even Simpler: Use withAuth HOC

```tsx
import { withAuth } from '@/src/lib/auth-protection';

function YourPage() {
  return <div>Content</div>;
}

export default withAuth(YourPage);
```

That's it! Just **one extra line**.

## Current Status

### ✅ Already Implemented
- **Global Navbar** - Login/Sign Up button appears on ALL pages
- **AuthModal** - Beautiful signup form matching screenshot
- **Portfolio Page** - Protected, requires authentication

### 🎯 Next: Apply to These Pages
1. `app/dashboard/page.tsx`
2. `app/dashboard/assets/page.tsx`
3. `app/alerts/page.tsx`

### 🌍 Keep Public (Don't Protect)
1. `app/page.tsx` (home)
2. `app/markets/page.tsx`

## Testing

1. Visit http://localhost:3000
2. Click "Login / Sign Up" button in top-right
3. Sign up with email/password
4. Try accessing Portfolio page
5. Should work seamlessly!

---
**Ready to use NOW!** Just copy the template above to any page. 🚀
