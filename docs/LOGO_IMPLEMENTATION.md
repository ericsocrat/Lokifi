# Logo Implementation Guide

## 🎨 Logo Assets

All logo files are located in `frontend/public/`:

| File                 | Purpose                 | Dimensions | Usage                              |
| -------------------- | ----------------------- | ---------- | ---------------------------------- |
| `logo.svg`           | Main horizontal logo    | 200x60     | Marketing, headers, full branding  |
| `logo-icon-only.svg` | Icon/monogram only      | 60x60      | Navigation, small spaces, app icon |
| `favicon.svg`        | Browser favicon         | 32x32      | Browser tabs, bookmarks            |
| `logo-dark.svg`      | Dark background version | 240x70     | Dark mode contexts, presentations  |

## 📍 Implementation Locations

### 1. **Navigation Bar** (`frontend/components/Navigation.tsx`)

- **Logo Used**: `logo-icon-only.svg`
- **Size**: 32x32px
- **Location**: Top-left corner of the navigation sidebar
- **Implementation**: Next.js `Image` component with hover effect

```tsx
<Image
  src="/logo-icon-only.svg"
  alt="Lokifi"
  width={32}
  height={32}
  className="w-8 h-8"
/>
```

### 2. **Browser Tab/Favicon** (`frontend/app/layout.tsx`)

- **Logo Used**: `favicon.svg` (primary), with fallback to `favicon.ico`
- **Location**: Browser tab, bookmarks, PWA icon
- **Implementation**: Next.js metadata configuration

```tsx
export const metadata: Metadata = {
  title: "Lokifi - Professional Trading Terminal",
  description:
    "Advanced trading platform with real-time market data, technical analysis, and professional tools",
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon.ico", sizes: "any" },
    ],
    apple: "/logo-icon-only.svg",
  },
};
```

### 3. **Loading States** (`frontend/components/ChartLoadingState.tsx`)

- **Logo Used**: `logo-icon-only.svg`
- **Size**: 48x48px
- **Location**: Center of loading spinners
- **Implementation**: Animated with loader icon overlay

```tsx
<Image
  src="/logo-icon-only.svg"
  alt="Lokifi"
  width={48}
  height={48}
  className="w-12 h-12 opacity-50"
/>
```

## 🎯 Design Specifications

### Color Palette

- **Primary (Electric Blue)**: `#3B82F6`
- **Secondary (Ember Orange)**: `#F97316`
- **Background**: `#0B0B0F` (near-black)
- **Text**: `#E5E7EB` (light gray)

### Logo Concept

The logo features:

1. **"L" Shape**: Stylized "L" in Electric Blue representing "Lokifi" and upward market trends
2. **"F" Candlestick Bars**: Two horizontal bars in the theme colors representing trading candlesticks
3. **Modern Typography**: "LOKIFI" text with color-accented final "F" and "I"

### Glow Effect

The logo includes a subtle glow filter (`#glow-orange`) on key elements for a premium, terminal-like appearance.

## 🔄 Future Implementation Opportunities

### Recommended Additional Locations

1. **Login/Auth Pages**: Add full horizontal logo (`logo.svg`)
2. **Email Templates**: Use `logo.svg` for email headers
3. **Error Pages** (404, 500): Include logo for brand consistency
4. **Splash Screen/PWA**: Use `logo-icon-only.svg`
5. **Marketing Pages**: Use `logo.svg` in hero sections
6. **Social Media Cards**: Generate OG image with logo
7. **Documentation Headers**: Add logo to docs pages

### SEO & PWA Enhancements

- [ ] Generate `favicon.ico` (multi-size ICO format)
- [ ] Create `apple-touch-icon.png` (180x180)
- [ ] Generate PWA icons (192x192, 512x512)
- [ ] Create OG image with logo (1200x630)
- [ ] Add Twitter card image (1200x600)

## 📝 Usage Guidelines

### DO ✅

- Use the SVG versions for all web implementations (scalable, crisp)
- Maintain the color palette (Electric Blue #3B82F6, Ember Orange #F97316)
- Keep adequate spacing around the logo (minimum 16px clearance)
- Use `logo-icon-only.svg` for square/compact spaces
- Use `logo.svg` for horizontal layouts with ample space

### DON'T ❌

- Modify the colors without updating the theme system
- Stretch or distort the logo (always maintain aspect ratio)
- Add additional effects (shadow, outline) that conflict with the design
- Use low-resolution raster versions when SVG is available
- Place the logo on backgrounds that reduce contrast/readability

## 🛠️ Technical Notes

### Next.js Image Optimization

All logo implementations use Next.js `<Image>` component for:

- Automatic optimization
- Lazy loading
- Proper alt text for accessibility
- Responsive sizing

### Performance

- SVG format keeps file sizes minimal (< 5KB each)
- No external dependencies required
- Fast load times on all devices
- Retina/HiDPI display ready

## 🔗 Related Files

- Theme Configuration: `frontend/lib/theme/themeConstants.ts`
- Tailwind Config: `frontend/tailwind.config.ts`
- Global Styles: `frontend/styles/globals.css`

---

**Last Updated**: October 2, 2025
**Theme**: Dark Terminal Elegance
**Version**: 2.0 (Redesigned with LF Monogram + Candlestick concept)
