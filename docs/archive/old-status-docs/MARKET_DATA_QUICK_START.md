# Quick Reference: Using the Master Market Data System

## 🎯 Import What You Need

```typescript
import { 
  useAsset,              // Single asset
  useAssets,             // Multiple assets
  useAllAssets,          // All stocks or all crypto
  useAssetSearch,        // Search functionality
  useMarketStats,        // Market statistics
  useHistoricalData,     // Chart data
  usePortfolioPrices,    // Portfolio calculations
  useTopMovers,          // Gainers/losers
  useAssetFormatter      // Formatting helpers
} from '@/src/hooks/useMarketData';
```

## 🔥 Common Use Cases

### Get Live Price for ONE Asset
```typescript
const bitcoin = useAsset('BTC');
console.log(bitcoin?.price);        // Updates every 3 seconds!
console.log(bitcoin?.changePercent); // +2.45% or -1.23%
```

### Get Live Prices for MULTIPLE Assets
```typescript
const assets = useAssets(['AAPL', 'MSFT', 'GOOGL']);
assets.forEach((asset, symbol) => {
  console.log(`${symbol}: $${asset.price}`);
});
```

### Get ALL Stocks or ALL Crypto
```typescript
const allStocks = useAllAssets('stock');  // 100+ stocks
const allCrypto = useAllAssets('crypto'); // 50+ cryptos
console.log(`Found ${allStocks.length} stocks`); // 100+
```

### Search for Assets
```typescript
const [query, setQuery] = useState('');
const results = useAssetSearch(query); // Live results as user types

<input 
  value={query} 
  onChange={(e) => setQuery(e.target.value)}
  placeholder="Search stocks or crypto..."
/>
```

### Calculate Portfolio Value (LIVE!)
```typescript
const holdings = [
  { symbol: 'AAPL', shares: 10 },
  { symbol: 'BTC', shares: 0.5 },
  { symbol: 'ETH', shares: 2 }
];

const { totalValue, totalChange, totalChangePercent } = 
  usePortfolioPrices(holdings);

// These values update every 3 seconds automatically!
console.log(`Portfolio: $${totalValue.toLocaleString()}`);
console.log(`Change: ${totalChangePercent.toFixed(2)}%`);
```

## 🚀 Quick Start Checklist

- [ ] Import the hook you need
- [ ] Call it in your component
- [ ] Use the returned data in your JSX
- [ ] Watch it update automatically every 3 seconds!

That's it! The system handles everything else automatically. 🎉
