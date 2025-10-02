# 🎨 Lokifi Theme System

**"Dark Terminal Elegance" - Professional Trading Platform Theme**

A comprehensive, automated theme system for consistent design across the entire Lokifi platform.

---

## 🚀 Quick Start (30 seconds)

```typescript
// 1. Import theme
import { colors, spacing } from "@/lib/theme";

// 2. Use in your component
export function MyComponent() {
  return (
    <div className="card-hover">
      <button className="btn-primary">Trade Now</button>
    </div>
  );
}
```

That's it! The theme is automatically applied. 🎉

---

## 📦 What's Included

### Core Files

- **`lib/theme.ts`** - 600+ lines of theme configuration
- **`tailwind.config.ts`** - Tailwind integration
- **`styles/globals.css`** - 400+ pre-built utility classes

### Documentation

- **`THEME_DOCUMENTATION.md`** - Complete user guide (500+ lines)
- **`AI_THEME_GUIDE.md`** - AI assistant integration guide
- **`THEME_SYSTEM_SUMMARY.md`** - Implementation summary

### Tools

- **`theme-checker.js`** - Automatic validation tool
- **`check-theme.ps1`** - Easy-to-use PowerShell runner
- **`pre-commit`** - Git hook for auto-validation

---

## 🎨 Theme Overview

### Color Palette

| Color           | Hex       | Usage                      |
| --------------- | --------- | -------------------------- |
| 🔵 Primary      | `#3B82F6` | Main actions, links, brand |
| 🟠 Secondary    | `#F97316` | Alerts, highlights         |
| 🟢 Trading Up   | `#10B981` | Gains, positive changes    |
| 🔴 Trading Down | `#EF4444` | Losses, negative changes   |
| ⚫ Background   | `#0B0B0F` | Page background            |
| ⬛ Card         | `#262626` | Card backgrounds           |

### Pre-built Components

**Buttons:**

```tsx
<button className="btn-primary">Primary</button>
<button className="btn-secondary">Secondary</button>
<button className="btn-ghost">Ghost</button>
<button className="btn-danger">Danger</button>
<button className="btn-success">Success</button>
```

**Cards:**

```tsx
<div className="card">Basic Card</div>
<div className="card-hover">Hoverable Card</div>
<div className="card-glass">Glass Effect</div>
<div className="frosted-card">Frosted Glass</div>
```

**Effects:**

```tsx
<div className="glass">Glass-morphism</div>
<div className="glow-blue">Blue Glow</div>
<div className="animate-fade-in">Fade In</div>
<div className="hover-lift">Lifts on Hover</div>
```

---

## 📚 Documentation

### For Developers

👉 **[THEME_DOCUMENTATION.md](./THEME_DOCUMENTATION.md)**

- Complete reference guide
- Component patterns
- Usage examples
- Best practices

### For AI Assistants

👉 **[AI_THEME_GUIDE.md](./AI_THEME_GUIDE.md)**

- Auto-application rules
- Component templates
- Detection patterns
- Validation checklist

### Implementation Details

👉 **[THEME_SYSTEM_SUMMARY.md](./THEME_SYSTEM_SUMMARY.md)**

- What was implemented
- File structure
- Usage examples
- Migration guide

---

## 🔧 Usage

### Method 1: Pre-built Classes (Recommended)

```tsx
export function TradingCard() {
  return (
    <div className="card-hover">
      <h3 className="text-xl font-semibold mb-4">BTC/USD</h3>
      <p className="font-mono text-3xl font-bold">$42,580</p>
      <span className="badge-success">+5.2%</span>
      <button className="btn-primary w-full mt-4">Trade</button>
    </div>
  );
}
```

### Method 2: Theme Constants

```tsx
import { colors, spacing, typography } from "@/lib/theme";

export function CustomComponent() {
  return (
    <div
      style={{
        backgroundColor: colors.background.secondary,
        padding: spacing.lg,
        borderRadius: "1rem",
        color: colors.text.primary,
      }}
    >
      <p style={{ fontFamily: typography.fontFamily.mono }}>$42,580.50</p>
    </div>
  );
}
```

### Method 3: Utility Functions

```tsx
import { getTradingColor } from "@/lib/theme";

export function PriceChange({ value }: { value: number }) {
  const color = getTradingColor(value);

  return (
    <span style={{ color }}>
      {value > 0 ? "▲" : "▼"} {Math.abs(value)}%
    </span>
  );
}
```

---

## 🛠️ Tools

### Theme Checker

Automatically validates theme usage across your codebase.

```powershell
# Run once
.\scripts\utilities\check-theme.ps1

# Watch mode (continuous checking)
.\scripts\utilities\check-theme.ps1 -Watch

# Open report after checking
.\scripts\utilities\check-theme.ps1 -Report
```

**What it checks:**

- ✅ Hardcoded colors
- ✅ Hardcoded spacing
- ✅ Theme import usage
- ✅ Generates detailed reports

### Pre-commit Hook

Automatically runs on every commit to validate theme compliance.

**Location:** `.git/hooks/pre-commit`

**Behavior:** Warns about violations but allows commit (non-blocking)

---

## ✨ Features

### Glass-morphism ✅

```tsx
<div className="glass">Semi-transparent with blur</div>
<div className="glass-light">Lighter variant</div>
<div className="frosted-card">Advanced frosted effect</div>
```

### Glow Effects ✅

```tsx
<button className="btn-primary hover:shadow-glow-blue">
  Glowing Button
</button>

<div className="glow-green">+15.2%</div>
<div className="glow-red">-8.5%</div>
```

### Micro-animations ✅

```tsx
<div className="animate-fade-in">Fade in</div>
<div className="animate-slide-up">Slide up</div>
<button className="hover-lift active-scale">Interactive</button>
<div className="animate-glow">Pulsing glow</div>
```

### Gradient Overlays ✅

```tsx
<div className="bg-gradient-primary">Primary gradient</div>
<div className="bg-gradient-radial">Radial gradient</div>
<h1 className="gradient-text">Gradient text</h1>
```

---

## 📊 Theme Structure

```
Theme System Architecture:

frontend/lib/theme.ts
    ↓ (imports)
    ├─→ components/ (auto-applies)
    ├─→ app/ (auto-applies)
    └─→ tailwind.config.ts
            ↓
        styles/globals.css
            ↓
        All Components
```

---

## 🎯 Best Practices

### ✅ DO

```typescript
// Use theme constants
import { colors } from '@/lib/theme';
style={{ color: colors.primary.main }}

// Use pre-built classes
<button className="btn-primary">

// Use semantic names
const upColor = colors.trading.up;

// Apply consistent spacing
<div className="p-6 gap-4 mb-4">
```

### ❌ DON'T

```typescript
// Don't hardcode colors
style={{ color: '#3B82F6' }}

// Don't mix systems
style={{ color: '#3B82F6', padding: spacing.md }}

// Don't skip imports
<div style={{ color: colors.primary.main }}> // Error if not imported

// Don't use random spacing
style={{ padding: '13px' }}
```

---

## 🔍 Examples

### Example 1: Trading Card

```tsx
import { getTradingColor } from "@/lib/theme";

export function TradingCard({ symbol, price, change }) {
  const changeColor = getTradingColor(change);

  return (
    <div className="card-hover">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-semibold">{symbol}</h3>
        <span className={change > 0 ? "badge-success" : "badge-danger"}>
          {change > 0 ? "+" : ""}
          {change}%
        </span>
      </div>

      <p className="font-mono text-3xl font-bold mb-2">
        ${price.toLocaleString()}
      </p>

      <div className="flex gap-2">
        <button className="btn-success flex-1">Buy</button>
        <button className="btn-danger flex-1">Sell</button>
      </div>
    </div>
  );
}
```

### Example 2: Modal

```tsx
export function TradeModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="modal-backdrop animate-fade-in" onClick={onClose}>
      <div
        className="modal-content animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-2xl font-bold mb-6">Place Order</h2>

        <input
          type="number"
          className="input focus-glow mb-4"
          placeholder="Amount"
        />

        <button className="btn-primary w-full">Confirm Trade</button>
      </div>
    </div>
  );
}
```

---

## 🚀 Getting Started

1. **Read the quick start** at the top of this file
2. **Browse examples** in `THEME_DOCUMENTATION.md`
3. **Use pre-built classes** for rapid development
4. **Run theme checker** to validate compliance
5. **Check AI guide** if you're an AI assistant

---

## 📈 Metrics

- **Configuration**: 600+ lines
- **Utilities**: 400+ CSS classes
- **Documentation**: 1,300+ lines
- **Components**: 20+ pre-built patterns
- **Colors**: 50+ semantic tokens
- **Animations**: 10+ pre-built effects

---

## 🎓 Resources

- [Complete Documentation](./THEME_DOCUMENTATION.md) - Full reference
- [AI Integration Guide](./AI_THEME_GUIDE.md) - For AI assistants
- [Implementation Summary](./THEME_SYSTEM_SUMMARY.md) - Technical details
- [Theme Source](../frontend/lib/theme.ts) - TypeScript definitions

---

## 💡 Tips

1. **Use Tailwind IntelliSense** - Enable in VS Code for autocomplete
2. **Preview in browser** - See animations and effects live
3. **Check existing components** - Find patterns before creating new ones
4. **Run validation regularly** - Use theme checker frequently
5. **Read the docs** - Comprehensive examples available

---

## 🔄 Updates

The theme system is versioned and maintained. Check the changelog in each documentation file for updates.

**Current Version**: 1.0.0
**Last Updated**: October 2, 2025
**Status**: Production Ready ✅

---

## 🤝 Contributing

When adding new components:

1. Import theme: `import { colors } from '@/lib/theme'`
2. Use pre-built classes where possible
3. Run theme checker before committing
4. Update documentation if adding new patterns

---

## 📞 Support

- **Documentation**: See files in `docs/` folder
- **Issues**: Check theme checker output for suggestions
- **Questions**: Reference `THEME_DOCUMENTATION.md`

---

**Built with ❤️ for Lokifi**
_Making trading interfaces beautiful, one component at a time._
