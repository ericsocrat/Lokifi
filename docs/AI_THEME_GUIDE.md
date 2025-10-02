# 🤖 AI Assistant Theme Integration Guide

**For AI Coding Assistants working on Lokifi**

This guide ensures AI assistants automatically apply the Lokifi theme system when generating or modifying code.

---

## 🎯 Core Directive

**ALWAYS use the Lokifi theme system for ALL new components and features.**

When generating code, AUTOMATICALLY:

1. Import theme constants from `@/lib/theme`
2. Use pre-built Tailwind classes from `globals.css`
3. Apply consistent styling patterns
4. Follow the "Dark Terminal Elegance" theme

---

## 📋 Quick Reference

### Standard Imports

```typescript
// For TypeScript/React components
import { colors, typography, spacing, animations } from "@/lib/theme";

// Full theme object (if needed)
import theme from "@/lib/theme";
```

### Color Usage

```typescript
// ❌ NEVER DO THIS
backgroundColor: "#3B82F6";
color: "#10B981";

// ✅ ALWAYS DO THIS
backgroundColor: colors.primary.main;
color: colors.trading.up;

// Or use Tailwind
className = "bg-primary text-trading-up";
```

### Component Classes

```typescript
// ❌ NEVER DO THIS
<button style={{ padding: '8px 16px', backgroundColor: '#3B82F6' }}>

// ✅ ALWAYS DO THIS
<button className="btn-primary">

// Available classes:
btn-primary, btn-secondary, btn-ghost, btn-danger, btn-success
card, card-hover, card-glass, frosted-card
input, input-error
badge-primary, badge-success, badge-danger
```

---

## 🔄 Automatic Application Rules

### Rule 1: Component Creation

When creating ANY new component, automatically:

```typescript
import { colors } from "@/lib/theme";

export function NewComponent() {
  return (
    <div className="card-hover">
      {" "}
      {/* Use theme classes */}
      {/* Content */}
    </div>
  );
}
```

### Rule 2: Styling Patterns

**Buttons:**

```tsx
<button className="btn-primary">Action</button>
<button className="btn-secondary">Cancel</button>
<button className="btn-ghost">Secondary Action</button>
```

**Cards:**

```tsx
<div className="card-hover">
  <h3 className="text-xl font-semibold mb-4">Title</h3>
  <p className="text-gray-300">Content</p>
</div>
```

**Inputs:**

```tsx
<input type="text" className="input focus-glow" placeholder="Enter value" />
```

**Trading Elements:**

```tsx
const color = getTradingColor(priceChange);
<span style={{ color }}>{priceChange > 0 ? '▲' : '▼'} {priceChange}%</span>

// Or use Tailwind
<span className={priceChange > 0 ? 'text-trading-up' : 'text-trading-down'}>
  {priceChange}%
</span>
```

### Rule 3: Layout & Spacing

**Background Layers:**

```tsx
<div className="bg-bg-base">
  {" "}
  {/* Page level */}
  <div className="bg-bg-primary">
    {" "}
    {/* Container level */}
    <div className="bg-bg-secondary">
      {" "}
      {/* Card level */}
      {/* Content */}
    </div>
  </div>
</div>
```

**Spacing:**

```tsx
<div className="p-6 gap-4">
  {" "}
  {/* Use Tailwind spacing */}
  <div className="mb-4">
    {" "}
    {/* Consistent spacing scale */}
    {/* Content */}
  </div>
</div>
```

### Rule 4: Animations

**Apply animations automatically:**

```tsx
// Modal appearance
<div className="animate-fade-in">

// Slide up content
<div className="animate-slide-up">

// Hover effects
<button className="hover-lift active-scale">

// Loading states
<div className="animate-pulse-slow">
```

---

## 🎨 Theme Color Map

Use these constants instead of raw values:

| Purpose        | Theme Constant                | Tailwind Class      | Hex     |
| -------------- | ----------------------------- | ------------------- | ------- |
| Primary action | `colors.primary.main`         | `bg-primary`        | #3B82F6 |
| Primary hover  | `colors.primary.light`        | `bg-primary-light`  | #60A5FA |
| Gains/Up       | `colors.trading.up`           | `text-trading-up`   | #10B981 |
| Losses/Down    | `colors.trading.down`         | `text-trading-down` | #EF4444 |
| Background     | `colors.background.base`      | `bg-bg-base`        | #0B0B0F |
| Card bg        | `colors.background.secondary` | `bg-bg-secondary`   | #262626 |
| Text primary   | `colors.text.primary`         | `text-gray-200`     | #E5E7EB |
| Text secondary | `colors.text.secondary`       | `text-gray-300`     | #D1D5DB |
| Border         | `colors.border.default`       | `border-gray-700`   | #374151 |

---

## 🧩 Component Templates

### Template 1: Data Display Component

```typescript
import { colors, getTradingColor } from "@/lib/theme";

interface DataDisplayProps {
  label: string;
  value: number;
  change: number;
}

export function DataDisplay({ label, value, change }: DataDisplayProps) {
  const changeColor = getTradingColor(change);

  return (
    <div className="card-hover">
      <p className="text-sm text-gray-400 mb-2">{label}</p>
      <p className="font-mono text-2xl font-bold mb-1">
        ${value.toLocaleString()}
      </p>
      <p className="text-sm font-semibold" style={{ color: changeColor }}>
        {change > 0 ? "▲" : "▼"} {Math.abs(change)}%
      </p>
    </div>
  );
}
```

### Template 2: Interactive Card

```typescript
interface CardProps {
  title: string;
  children: React.ReactNode;
  onAction?: () => void;
}

export function InteractiveCard({ title, children, onAction }: CardProps) {
  return (
    <div className="card-hover">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-semibold">{title}</h3>
        {onAction && (
          <button className="btn-ghost" onClick={onAction}>
            Action
          </button>
        )}
      </div>
      {children}
    </div>
  );
}
```

### Template 3: Form Input

```typescript
interface FormInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
}

export function FormInput({ label, value, onChange, error }: FormInputProps) {
  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-300 mb-2">
        {label}
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`input ${error ? "input-error" : ""}`}
      />
      {error && <p className="text-trading-down text-sm mt-1">{error}</p>}
    </div>
  );
}
```

### Template 4: Modal

```typescript
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export function Modal({ isOpen, onClose, title, children }: ModalProps) {
  if (!isOpen) return null;

  return (
    <div className="modal-backdrop animate-fade-in" onClick={onClose}>
      <div
        className="modal-content animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">{title}</h2>
          <button className="btn-ghost" onClick={onClose}>
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
```

---

## 🔍 Detection Patterns

When you see these patterns in existing code, suggest improvements:

### Pattern 1: Hardcoded Colors

```typescript
// ❌ Found this
style={{ backgroundColor: '#3B82F6' }}

// ✅ Suggest this
import { colors } from '@/lib/theme';
style={{ backgroundColor: colors.primary.main }}
// OR
className="bg-primary"
```

### Pattern 2: Inconsistent Spacing

```typescript
// ❌ Found this
style={{ padding: '12px', margin: '8px' }}

// ✅ Suggest this
className="p-3 m-2"
```

### Pattern 3: Missing Animations

```typescript
// ❌ Found this
<button onClick={...}>

// ✅ Suggest this
<button className="btn-primary hover-lift active-scale" onClick={...}>
```

---

## 📊 Chart Theming

For chart components, automatically apply:

```typescript
const chartOptions = {
  layout: {
    background: { color: colors.chart.background },
    textColor: colors.chart.textColor,
  },
  grid: {
    vertLines: { color: colors.chart.gridLines },
    horzLines: { color: colors.chart.gridLines },
  },
  // Candlestick colors
  upColor: colors.chart.candleUp,
  downColor: colors.chart.candleDown,
  wickUpColor: colors.chart.wickUp,
  wickDownColor: colors.chart.wickDown,
};
```

---

## ✅ Validation Checklist

Before finalizing ANY component, verify:

- [ ] Imports theme from `@/lib/theme` OR uses Tailwind classes
- [ ] No hardcoded hex colors (#XXXXXX)
- [ ] No hardcoded rgb/rgba values
- [ ] Uses semantic color names (primary, trading.up, etc.)
- [ ] Applies consistent spacing scale
- [ ] Uses pre-built component classes when available
- [ ] Includes hover/focus states
- [ ] Adds appropriate animations
- [ ] Follows background layering hierarchy
- [ ] Uses proper typography (font-mono for numbers)

---

## 🚨 Common Mistakes to Avoid

1. **Don't mix theme systems**

   ```typescript
   // ❌ Bad - mixing hardcoded and theme
   style={{ color: '#3B82F6', padding: spacing.md }}

   // ✅ Good - consistent theme usage
   className="text-primary p-4"
   ```

2. **Don't skip imports**

   ```typescript
   // ❌ Bad - assuming colors exist
   style={{ color: colors.primary.main }} // ERROR if not imported

   // ✅ Good - proper import
   import { colors } from '@/lib/theme';
   style={{ color: colors.primary.main }}
   ```

3. **Don't ignore component classes**

   ```typescript
   // ❌ Bad - reinventing the wheel
   <button style={{ bg: '#3B82F6', padding: '8px 16px', ... }}>

   // ✅ Good - using pre-built
   <button className="btn-primary">
   ```

---

## 🎓 Learning Resources

- **Full Documentation**: `docs/THEME_DOCUMENTATION.md`
- **Theme Configuration**: `frontend/lib/theme.ts`
- **Global Styles**: `frontend/styles/globals.css`
- **Tailwind Config**: `frontend/tailwind.config.ts`
- **Check Theme Usage**: Run `node scripts/utilities/theme-checker.js`

---

## 💡 Pro Tips

1. **Use Tailwind IntelliSense** in VS Code for autocomplete
2. **Check existing components** for patterns before creating new ones
3. **Run theme checker** after making changes
4. **Preview in browser** to see animations and hover effects
5. **Keep components small** and focused on single responsibility

---

## 🔄 Update Protocol

When this guide is updated:

1. Version is incremented in footer
2. Changelog entry added below
3. All AI assistants re-read this guide
4. Theme checker updated if needed

---

## 📝 Changelog

**v1.0.0** - October 2, 2025

- Initial theme system integration guide
- Added component templates
- Added validation checklist
- Added detection patterns

---

**Version**: 1.0.0
**Last Updated**: October 2, 2025
**For**: AI Coding Assistants (GitHub Copilot, Cursor, etc.)
