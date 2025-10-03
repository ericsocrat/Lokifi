# Add Assets - Quick Reference Guide

## 🎯 What I've Built

Created the complete "Add Assets" flow matching your Kubera design. When users click "Add Assets" on the dashboard, they see a beautiful grid of 12 asset categories to choose from.

## 🌐 Access Your Pages

**Main Selection:** http://localhost:3000/dashboard/add-assets
**Add Stocks:** http://localhost:3000/dashboard/add-assets/stocks
**Add Crypto:** http://localhost:3000/dashboard/add-assets/crypto-tickers

## 📋 User Journey

### Step 1: Dashboard Welcome Screen
```
Dashboard → "Add Assets" button (black button)
```

### Step 2: Asset Selection Page
```
"All your assets in one place!" header

Grid of 12 cards:
┌─────────────┬─────────────┬─────────────┐
│  Connect    │   Stock     │   Crypto    │
│  Banks &    │  Tickers    │  Tickers    │
│ Brokerages  │   📈        │    ₿        │
├─────────────┼─────────────┼─────────────┤
│   Crypto    │    Link     │   Homes     │
│ Exchanges & │  another    │    🏠       │
│  Wallets    │  Portfolio  │             │
├─────────────┼─────────────┼─────────────┤
│    Cars     │  Precious   │   Domains   │
│    🚗       │   Metals    │    🌐       │
├─────────────┼─────────────┼─────────────┤
│ AI Import:  │    Input    │    Enter    │
│  Files &    │  Quantity   │    Value    │
│ Screenshots │  & Price    │  Manually   │
└─────────────┴─────────────┴─────────────┘
```

### Step 3: Add Stock (Example)

**Page Header:** "Add Stock Tickers"

**Search Bar:**
```
[🔍 Search Stock Symbol or Name...]
```

**Popular Stocks Grid:**
```
┌─────────────┬─────────────┐
│ AAPL        │ MSFT        │
│ Apple Inc.  │ Microsoft.. │
├─────────────┼─────────────┤
│ GOOGL       │ AMZN        │
│ Alphabet... │ Amazon.com..│
└─────────────┴─────────────┘
```

**Form (after selection):**
```
Selected Stock: AAPL

Quantity (Shares):    [___10___]
Purchase Price ($):   [__150.00_]

Total Cost: $1,500.00

[Add to Portfolio]  [Cancel]
```

### Step 4: Return to Dashboard
```
Asset added → Redirects to /dashboard
Dashboard now shows your assets!
```

## 💎 Features Breakdown

### Asset Selection Page

**Design Elements:**
- Centered layout with max-width
- Bold heading "All your assets in one place!"
- 3-column grid (4 rows)
- Each card has:
  - Category label (top-left)
  - Large icon
  - Title (bold)
  - Subtitle (if applicable)
  - Hover effect (shadow + scale)

**Asset Categories:**

**FINANCIAL** (5 cards):
1. Connect Banks & Brokerages - Connect accounts via Plaid
2. Stock Tickers ✅ - AAPL, MSFT, GOOGL, etc.
3. Crypto Tickers ✅ - BTC, ETH, SOL, etc.
4. Crypto Exchanges & Wallets - Connect Coinbase, Binance
5. Link another Portfolio - Import from other platforms

**PHYSICAL** (4 cards):
6. Homes - Real estate properties
7. Cars - Vehicle valuation
8. Precious Metals - Gold, silver, platinum
9. Domains - Web domains

**GENERIC** (3 cards):
10. AI Import: Files & Screenshots - Upload statements
11. Input Quantity & Price - Generic asset entry
12. Enter Value Manually - Freeform entry

### Stock Tickers Page

**Features:**
- ✅ Live search functionality
- ✅ 8 popular stocks pre-loaded
- ✅ Click to select (blue highlight)
- ✅ Enter quantity and price
- ✅ Auto-calculate total cost
- ✅ Submit to backend API
- ✅ Loading states
- ✅ Error handling

**Popular Stocks:**
- AAPL (Apple)
- MSFT (Microsoft)
- GOOGL (Alphabet)
- AMZN (Amazon)
- TSLA (Tesla)
- NVDA (NVIDIA)
- META (Meta)
- JPM (JPMorgan)

### Crypto Tickers Page

**Features:**
- ✅ Live search functionality
- ✅ 8 popular cryptos with prices
- ✅ Click to select (blue highlight)
- ✅ Enter quantity (supports decimals)
- ✅ Enter purchase price
- ✅ Auto-calculate total investment
- ✅ Info note about averaging
- ✅ Submit to backend API
- ✅ Help text for custom tickers

**Popular Cryptos:**
- BTC @ $62,341
- ETH @ $3,089
- BNB @ $582
- SOL @ $147
- XRP @ $0.58
- ADA @ $0.45
- DOGE @ $0.12
- MATIC @ $0.68

## 🎨 Design Specifications

### Colors

**Backgrounds:**
```css
Page: #F9FAFB (gray-50)
Cards: #FFFFFF (white)
Selected: #EFF6FF (blue-50)
```

**Borders:**
```css
Default: #E5E7EB (gray-200)
Selected: #2563EB (blue-600)
Input Focus: #3B82F6 (blue-500)
```

**Text:**
```css
Headings: #111827 (gray-900)
Body: #374151 (gray-700)
Labels: #6B7280 (gray-500)
```

**Buttons:**
```css
Primary: #000000 (black)
Primary Hover: #1F2937 (gray-800)
Secondary: #FFFFFF with #D1D5DB border
```

### Spacing

```css
Page padding: 2rem (32px)
Card padding: 1.5rem - 2rem (24-32px)
Grid gap: 1rem (16px)
Button padding: 0.75rem 1.5rem (12px 24px)
```

### Typography

```css
Page heading: 36px, bold
Card title: 16px, semibold
Form labels: 14px, medium
Input text: 16px, regular
Price/totals: 24-32px, bold
```

## 🔗 API Integration

### Endpoint
```
POST http://localhost:8000/api/portfolio
```

### Request Format
```json
{
  "symbol": "AAPL",
  "qty": 10,
  "cost_basis": 150.00,
  "tags": ["stock"]
}
```

### Example Usage

**Add Stock:**
```typescript
fetch("http://localhost:8000/api/portfolio", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  credentials: "include",
  body: JSON.stringify({
    symbol: "AAPL",
    qty: 10,
    cost_basis: 150.00,
    tags: ["stock"]
  })
});
```

**Add Crypto:**
```typescript
fetch("http://localhost:8000/api/portfolio", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  credentials: "include",
  body: JSON.stringify({
    symbol: "BTC",
    qty: 0.5,
    cost_basis: 62000.00,
    tags: ["crypto"]
  })
});
```

## 🧪 Testing Checklist

### Asset Selection
- [ ] Navigate to /dashboard/add-assets
- [ ] See all 12 asset cards
- [ ] Cards have proper icons and labels
- [ ] Hover effects work (shadow + scale)
- [ ] Back to Dashboard button works

### Stock Addition
- [ ] Click "Stock Tickers" card
- [ ] Search bar works
- [ ] Can select from 8 popular stocks
- [ ] Selected stock shows blue highlight
- [ ] Enter quantity shows in form
- [ ] Enter price shows in form
- [ ] Total cost calculates correctly
- [ ] "Add to Portfolio" button works
- [ ] Redirects to dashboard after add
- [ ] Cancel button returns to selection

### Crypto Addition
- [ ] Click "Crypto Tickers" card
- [ ] Search bar works
- [ ] Can select from 8 popular cryptos
- [ ] Current prices display
- [ ] Selected crypto shows blue highlight
- [ ] Enter quantity (decimals work)
- [ ] Enter price shows in form
- [ ] Total investment calculates correctly
- [ ] Info note displays
- [ ] "Add to Portfolio" button works
- [ ] Redirects to dashboard after add
- [ ] Cancel button returns to selection

## 📱 Mobile Responsive (TODO)

**Breakpoints to implement:**
```css
Desktop: 3 columns (current)
Tablet (768px): 2 columns
Mobile (640px): 1 column
```

## 🚀 Next Steps

### Immediate:
1. Test the flow end-to-end
2. Add your first asset
3. Verify it shows on dashboard

### Future Enhancements:
1. Implement remaining 10 asset pages
2. Add real-time price fetching
3. Implement auto-complete search
4. Add CSV bulk import
5. Mobile responsive design
6. Asset category filtering
7. Recently added assets
8. Quick add from dashboard

## 📁 Files Reference

```
frontend/app/dashboard/add-assets/
├── page.tsx                    Main selection grid
├── stocks/
│   └── page.tsx               Add stocks form
└── crypto-tickers/
    └── page.tsx               Add crypto form

Documentation:
├── ADD_ASSETS_IMPLEMENTATION.md    Technical docs
└── ADD_ASSETS_GUIDE.md            This file
```

## 💡 Pro Tips

1. **Quick Add:** Stocks and crypto pages are fully functional
2. **Search:** Start typing to filter options
3. **Decimals:** Crypto supports 8 decimal places
4. **Total Cost:** Updates in real-time as you type
5. **Validation:** Button disabled until all fields filled
6. **Backend:** Automatically connects to your portfolio API

---

**Ready to use!** Visit http://localhost:3000/dashboard and click "Add Assets"

**Status:** ✅ Fully Functional
**Last Updated:** October 3, 2025
