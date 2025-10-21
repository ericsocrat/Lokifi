# 🎨 Lokifi Theme System Documentation

**Theme: "Dark Terminal Elegance" - Professional Trading Platform**

This document provides comprehensive guidance on using the Lokifi theme system across all components and features.

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Quick Start](#quick-start)
3. [Color System](#color-system)
4. [Typography](#typography)
5. [Component Patterns](#component-patterns)
6. [Animations & Transitions](#animations--transitions)
7. [Best Practices](#best-practices)
8. [Examples](#examples)

---

## 🎯 Overview

The Lokifi theme system provides:

- **Centralized Configuration**: All design tokens in one place (`lib/theme.ts`)
- **Tailwind Integration**: Custom utilities and classes (`tailwind.config.ts`)
- **Global Styles**: Pre-built component classes (`styles/globals.css`)
- **Type Safety**: Full TypeScript support
- **Auto-Application**: Consistent theming across all new components

### Design Philosophy

- **Minimalist**: Clean, distraction-free interface
- **Data-First**: Charts and numbers take center stage
- **Professional**: Resembles Bloomberg Terminal/TradingView
- **Modern**: Smooth transitions, rounded corners, subtle effects

---

## 🚀 Quick Start

### 1. Import the Theme

```typescript
// Import full theme object
import theme from '@/lib/theme';

// Or import specific parts
import { colors, typography, animations } from '@/lib/theme';
```n
### 2. Use Theme Constants

```typescript
// Instead of hardcoded colors:
// ❌ Bad
<div style={{ color: '#3B82F6' }}>

// ✅ Good
import { colors } from '@/lib/theme';
<div style={{ color: colors.primary.main }}>
```n
### 3. Use Tailwind Classes

```tsx
// Use pre-built component classes
<button className="btn-primary">
  Click Me
</button>

// Use theme-aware utilities
<div className="card-glass">
  <h2 className="gradient-text">Title</h2>
</div>
```n
---

## 🎨 Color System

### Primary Colors

| Color | Hex | Usage |
|-------|-----|-------|
| **Primary** | `#3B82F6` | Main brand color, CTAs, links |
| **Primary Light** | `#60A5FA` | Hover states, highlights |
| **Primary Dark** | `#2563EB` | Active states, pressed buttons |
| **Secondary** | `#F97316` | Alerts, secondary actions |

### Trading Colors

```typescript
// Gains/Bullish
colors.trading.up        // #10B981
colors.trading.upLight   // #34D399

// Losses/Bearish
colors.trading.down      // #EF4444
colors.trading.downLight // #F87171

// Usage example
const priceColor = price > 0 
  ? colors.trading.up 
  : colors.trading.down;
```n
### Background Layers

```typescript
// From darkest to lightest
colors.background.base      // #0B0B0F - Page background
colors.background.primary   // #1A1A1A - Main containers
colors.background.secondary // #262626 - Cards
colors.background.tertiary  // #333333 - Nested elements
colors.background.hover     // #2D2D2D - Hover states
```n
### Asset Type Colors

```typescript
// Color coding for different asset types
colors.assetTypes.stock     // Blue
colors.assetTypes.crypto    // Amber
colors.assetTypes.forex     // Green
colors.assetTypes.commodity // Purple
colors.assetTypes.index     // Pink
```n
### Tailwind Classes

```html
<!-- Primary colors -->
<div class="bg-primary text-white"></div>
<div class="bg-primary-light"></div>

<!-- Trading colors -->
<span class="text-trading-up">+5.2%</span>
<span class="text-trading-down">-2.1%</span>

<!-- Background layers -->
<div class="bg-bg-base">
  <div class="bg-bg-secondary">
    <div class="bg-bg-tertiary"></div>
  </div>
</div>
```n
---

## 📝 Typography

### Font Families

```typescript
typography.fontFamily.sans  // Inter (UI)
typography.fontFamily.mono  // Roboto Mono (numbers/code)
```n
### Font Sizes

```typescript
typography.fontSize.xs    // 12px - Small labels
typography.fontSize.sm    // 14px - Secondary text
typography.fontSize.base  // 16px - Body text
typography.fontSize.lg    // 18px - Subheadings
typography.fontSize.xl    // 20px - Headings
typography.fontSize['2xl'] // 24px - Large headings
```n
### Usage Examples

```tsx
// Numbers and data (monospace)
<span className="font-mono text-xl font-semibold">
  $42,580.50
</span>

// Regular text
<p className="text-base text-gray-300">
  Trading volume increased by 15%
</p>

// Headings
<h1 className="text-3xl font-bold text-white">
  Market Overview
</h1>
```n
---

## 🧩 Component Patterns

### Buttons

```tsx
// Primary button
<button className="btn-primary">
  Buy Now
</button>

// Secondary button
<button className="btn-secondary">
  Cancel
</button>

// Ghost button
<button className="btn-ghost">
  Learn More
</button>

// Danger button
<button className="btn-danger">
  Delete Account
</button>

// Success button
<button className="btn-success">
  Confirm Trade
</button>
```n
### Cards

```tsx
// Basic card
<div className="card">
  <h3>Title</h3>
  <p>Content</p>
</div>

// Hoverable card
<div className="card-hover">
  <h3>Interactive Card</h3>
</div>

// Glass-morphism card
<div className="card-glass">
  <h3>Frosted Glass Effect</h3>
</div>

// Frosted card (advanced)
<div className="frosted-card">
  <h3>Advanced Glass Effect</h3>
</div>
```n
### Inputs

```tsx
// Text input
<input 
  type="text" 
  className="input" 
  placeholder="Enter amount"
/>

// Input with error
<input 
  type="text" 
  className="input input-error" 
  placeholder="Invalid email"
/>

// Focused input (automatic)
<input 
  type="text" 
  className="input focus-glow" 
  placeholder="Auto focus glow"
/>
```n
### Badges

```tsx
// Primary badge
<span className="badge-primary">New</span>

// Success badge
<span className="badge-success">+12.5%</span>

// Danger badge
<span className="badge-danger">-3.2%</span>
```n
### Charts

```tsx
// Chart container
<div className="chart-container">
  <div className="chart-header">
    <h3>BTC/USD</h3>
  </div>
  <div className="p-4">
    {/* Chart component */}
  </div>
</div>
```n
### Modals

```tsx
// Modal backdrop
<div className="modal-backdrop">
  <div className="modal-content">
    <h2>Modal Title</h2>
    <p>Modal content...</p>
  </div>
</div>
```n
### Navigation

```tsx
// Active nav item
<button className="nav-item-active">
  <HomeIcon />
  Home
</button>

// Inactive nav item
<button className="nav-item-inactive">
  <ChartIcon />
  Charts
</button>
```n
---

## ✨ Animations & Transitions

### Pre-built Animations

```html
<!-- Fade in -->
<div class="animate-fade-in">Content</div>

<!-- Slide up -->
<div class="animate-slide-up">Content</div>

<!-- Scale in -->
<div class="animate-scale-in">Content</div>

<!-- Pulse (slow) -->
<div class="animate-pulse-slow">Content</div>

<!-- Glow effect -->
<div class="animate-glow">Content</div>
```n
### Transition Utilities

```html
<!-- Smooth all properties -->
<button class="transition-smooth hover:scale-105">
  Hover me
</button>

<!-- Colors only -->
<div class="transition-colors-smooth hover:bg-primary">
  Hover for color change
</div>

<!-- Hover lift -->
<div class="hover-lift">
  Lifts on hover
</div>

<!-- Active scale -->
<button class="active-scale">
  Shrinks when clicked
</button>
```n
### Glow Effects

```html
<!-- Blue glow -->
<div class="glow-blue">Primary element</div>

<!-- Green glow (gains) -->
<div class="glow-green">+15.2%</div>

<!-- Red glow (losses) -->
<div class="glow-red">-8.5%</div>

<!-- Focus glow -->
<input class="input focus-glow" />
```n
---

## 💎 Best Practices

### 1. Always Use Theme Constants

```typescript
// ❌ Bad - Hardcoded values
const buttonStyle = {
  backgroundColor: '#3B82F6',
  padding: '8px 16px',
};

// ✅ Good - Theme constants
import { colors, spacing } from '@/lib/theme';
const buttonStyle = {
  backgroundColor: colors.primary.main,
  padding: `${spacing.sm} ${spacing.md}`,
};
```n
### 2. Prefer Tailwind Classes for Common Patterns

```tsx
// ❌ Bad - Inline styles
<button style={{ 
  backgroundColor: '#3B82F6',
  color: 'white',
  padding: '8px 16px',
  borderRadius: '8px',
}}>

// ✅ Good - Tailwind classes
<button className="btn-primary">
```n
### 3. Use Semantic Color Names

```typescript
// ❌ Bad - Non-semantic
const color = '#10B981';

// ✅ Good - Semantic
const color = colors.trading.up;
```n
### 4. Apply Consistent Spacing

```html
<!-- Use spacing scale consistently -->
<div class="p-4 gap-4">  <!-- 16px -->
  <div class="mb-2">     <!-- 8px -->
  <div class="mt-6">     <!-- 24px -->
</div>
```n
### 5. Layer Backgrounds Properly

```html
<!-- Proper background layering -->
<div class="bg-bg-base">           <!-- Page -->
  <div class="bg-bg-primary">      <!-- Container -->
    <div class="bg-bg-secondary">  <!-- Card -->
      <div class="bg-bg-tertiary"> <!-- Nested -->
      </div>
    </div>
  </div>
</div>
```n
---

## 📚 Examples

### Example 1: Trading Card

```tsx
import { colors } from '@/lib/theme';

function TradingCard({ symbol, price, change }) {
  const isPositive = change > 0;
  
  return (
    <div className="card-hover">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-semibold">{symbol}</h3>
        <span className={isPositive ? 'badge-success' : 'badge-danger'}>
          {isPositive ? '+' : ''}{change}%
        </span>
      </div>
      
      <p className="font-mono text-2xl font-bold">
        ${price.toLocaleString()}
      </p>
      
      <button className="btn-primary w-full mt-4">
        Trade Now
      </button>
    </div>
  );
}
```n
### Example 2: Chart Header

```tsx
function ChartHeader({ symbol, timeframe, onTimeframeChange }) {
  return (
    <div className="chart-header">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-semibold">{symbol}</h2>
          <span className="badge-primary">{timeframe}</span>
        </div>
        
        <div className="flex gap-2">
          {['1D', '1W', '1M', '1Y'].map((tf) => (
            <button
              key={tf}
              onClick={() => onTimeframeChange(tf)}
              className={tf === timeframe ? 'btn-primary' : 'btn-ghost'}
            >
              {tf}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
```n
### Example 3: Price Display

```tsx
import { getTradingColor } from '@/lib/theme';

function PriceDisplay({ price, change }) {
  const changeColor = getTradingColor(change);
  
  return (
    <div className="glass-light p-6 rounded-xl">
      <div className="font-mono text-4xl font-bold mb-2">
        ${price.toLocaleString()}
      </div>
      
      <div 
        className="text-lg font-semibold"
        style={{ color: changeColor }}
      >
        {change > 0 ? '▲' : '▼'} {Math.abs(change)}%
      </div>
    </div>
  );
}
```n
### Example 4: Modal with Glass Effect

```tsx
function TradeModal({ isOpen, onClose }) {
  if (!isOpen) return null;
  
  return (
    <div className="modal-backdrop animate-fade-in">
      <div className="modal-content animate-scale-in">
        <h2 className="text-2xl font-bold mb-4">Place Order</h2>
        
        <input 
          type="number" 
          className="input mb-4" 
          placeholder="Amount"
        />
        
        <div className="flex gap-2">
          <button className="btn-success flex-1">
            Buy
          </button>
          <button className="btn-danger flex-1">
            Sell
          </button>
        </div>
        
        <button className="btn-ghost w-full mt-2" onClick={onClose}>
          Cancel
        </button>
      </div>
    </div>
  );
}
```n
### Example 5: Asset Type Badge

```tsx
import { getAssetTypeColor } from '@/lib/theme';

function AssetBadge({ type }) {
  const color = getAssetTypeColor(type);
  
  return (
    <span 
      className="badge"
      style={{ 
        backgroundColor: `${color}20`, 
        color: color,
        borderColor: `${color}40`,
      }}
    >
      {type.toUpperCase()}
    </span>
  );
}
```n
---

## 🔄 Auto-Application

### New Components

When creating new components, the theme is automatically applied through:

1. **Global CSS**: Base styles applied to all elements
2. **Tailwind Classes**: Pre-configured utilities
3. **Theme Import**: Type-safe constants

### Example Template for New Components

```tsx
import { colors, typography, spacing } from '@/lib/theme';

export function NewComponent() {
  return (
    <div className="card-hover">
      {/* Component content */}
    </div>
  );
}
```n
---

## 🎯 Theme Utility Functions

### `rgba(hex, alpha)`
Convert hex color to rgba with opacity

```typescript
import { rgba } from '@/lib/theme';
const color = rgba(colors.primary.main, 0.5);
// Result: 'rgba(59, 130, 246, 0.5)'
```n
### `getTradingColor(value)`
Get color based on positive/negative value

```typescript
import { getTradingColor } from '@/lib/theme';
const color = getTradingColor(priceChange);
// Returns green for positive, red for negative
```n
### `getAssetTypeColor(type)`
Get color for asset type

```typescript
import { getAssetTypeColor } from '@/lib/theme';
const color = getAssetTypeColor('crypto');
// Returns amber color
```n
---

## 📦 Files Reference

- **`lib/theme.ts`**: Main theme configuration
- **`tailwind.config.ts`**: Tailwind integration
- **`styles/globals.css`**: Global styles and utilities
- **`docs/THEME_DOCUMENTATION.md`**: This file

---

## 🚀 Future Enhancements

Planned additions to the theme system:

- [ ] Dark/Light mode toggle
- [ ] Theme customization per user
- [ ] Additional component variants
- [ ] More animation presets
- [ ] Color palette generator
- [ ] Accessibility improvements (WCAG AAA)

---

**Last Updated**: October 2, 2025  
**Version**: 1.0.0  
**Maintained by**: Lokifi Team