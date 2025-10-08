/**
 * useMarketData Hook
 * 
 * React hook for accessing real-time market data throughout the application.
 * Automatically subscribes to updates and provides live prices.
 */

import { useEffect, useState, useCallback } from 'react';
import marketData, { MarketAsset, MarketStats, PricePoint } from '@/src/services/marketData';

/**
 * Hook to get real-time data for a specific asset
 */
export function useAsset(symbol: string): MarketAsset | undefined {
  const [asset, setAsset] = useState<MarketAsset | undefined>(() => 
    marketData.getAsset(symbol)
  );

  useEffect(() => {
    const unsubscribe = marketData.subscribe((assets) => {
      const updated = assets.get(symbol.toUpperCase());
      setAsset(updated);
    });

    return unsubscribe;
  }, [symbol]);

  return asset;
}

/**
 * Hook to get real-time data for multiple assets
 */
export function useAssets(symbols: string[]): Map<string, MarketAsset> {
  const [assets, setAssets] = useState<Map<string, MarketAsset>>(new Map());

  useEffect(() => {
    const unsubscribe = marketData.subscribe((allAssets) => {
      const filtered = new Map<string, MarketAsset>();
      symbols.forEach(symbol => {
        const asset = allAssets.get(symbol.toUpperCase());
        if (asset) {
          filtered.set(symbol.toUpperCase(), asset);
        }
      });
      setAssets(filtered);
    });

    return unsubscribe;
  }, [symbols.join(',')]);

  return assets;
}

/**
 * Hook to get all assets with optional filtering
 */
export function useAllAssets(type?: 'stock' | 'crypto' | 'etf'): MarketAsset[] {
  const [assets, setAssets] = useState<MarketAsset[]>([]);

  useEffect(() => {
    const unsubscribe = marketData.subscribe(() => {
      const allAssets = type 
        ? marketData.getAssetsByType(type)
        : marketData.getAllAssets();
      setAssets(allAssets);
    });

    return unsubscribe;
  }, [type]);

  return assets;
}

/**
 * Hook for searching assets
 */
export function useAssetSearch(query: string): MarketAsset[] {
  const [results, setResults] = useState<MarketAsset[]>([]);

  useEffect(() => {
    if (!query || query.trim().length === 0) {
      setResults([]);
      return;
    }

    const unsubscribe = marketData.subscribe(() => {
      const searchResults = marketData.searchAssets(query);
      setResults(searchResults);
    });

    return unsubscribe;
  }, [query]);

  return results;
}

/**
 * Hook to get market statistics
 */
export function useMarketStats(): MarketStats {
  const [stats, setStats] = useState<MarketStats>(() => 
    marketData.getMarketStats()
  );

  useEffect(() => {
    const unsubscribe = marketData.subscribe(() => {
      const newStats = marketData.getMarketStats();
      setStats(newStats);
    });

    return unsubscribe;
  }, []);

  return stats;
}

/**
 * Hook to get historical data for charting
 */
export function useHistoricalData(
  symbol: string,
  period: '1d' | '7d' | '30d' | '1y' | 'all' = '1d'
): PricePoint[] {
  const [data, setData] = useState<PricePoint[]>([]);

  useEffect(() => {
    const historicalData = marketData.getHistoricalData(symbol, period);
    setData(historicalData);

    // Subscribe to updates to keep data fresh
    const unsubscribe = marketData.subscribe(() => {
      const updated = marketData.getHistoricalData(symbol, period);
      setData(updated);
    });

    return unsubscribe;
  }, [symbol, period]);

  return data;
}

/**
 * Hook to get live price updates for portfolio calculations
 */
export function usePortfolioPrices(holdings: { symbol: string; shares: number }[]): {
  prices: Map<string, number>;
  totalValue: number;
  totalChange: number;
  totalChangePercent: number;
} {
  const [prices, setPrices] = useState<Map<string, number>>(new Map());
  const [totalValue, setTotalValue] = useState(0);
  const [totalChange, setTotalChange] = useState(0);
  const [totalChangePercent, setTotalChangePercent] = useState(0);

  useEffect(() => {
    const calculatePortfolio = () => {
      const priceMap = new Map<string, number>();
      let value = 0;
      let previousValue = 0;

      holdings.forEach(({ symbol, shares }) => {
        const asset = marketData.getAsset(symbol);
        if (asset) {
          priceMap.set(symbol, asset.price);
          value += asset.price * shares;
          previousValue += asset.previousClose * shares;
        }
      });

      const change = value - previousValue;
      const changePercent = previousValue > 0 ? (change / previousValue) * 100 : 0;

      setPrices(priceMap);
      setTotalValue(value);
      setTotalChange(change);
      setTotalChangePercent(changePercent);
    };

    calculatePortfolio();

    const unsubscribe = marketData.subscribe(() => {
      calculatePortfolio();
    });

    return unsubscribe;
  }, [JSON.stringify(holdings)]);

  return { prices, totalValue, totalChange, totalChangePercent };
}

/**
 * Hook to get top movers (gainers/losers)
 */
export function useTopMovers(): {
  gainers: MarketAsset[];
  losers: MarketAsset[];
} {
  const [gainers, setGainers] = useState<MarketAsset[]>([]);
  const [losers, setLosers] = useState<MarketAsset[]>([]);

  useEffect(() => {
    const unsubscribe = marketData.subscribe(() => {
      const stats = marketData.getMarketStats();
      setGainers(stats.gainers);
      setLosers(stats.losers);
    });

    return unsubscribe;
  }, []);

  return { gainers, losers };
}

/**
 * Hook to format currency values based on asset type
 */
export function useAssetFormatter(symbol: string) {
  const asset = useAsset(symbol);

  const formatPrice = useCallback((price: number): string => {
    if (!asset) return `$${price.toFixed(2)}`;

    if (asset.type === 'crypto') {
      // Format based on price magnitude
      if (price < 0.01) {
        return `$${price.toFixed(6)}`;
      } else if (price < 1) {
        return `$${price.toFixed(4)}`;
      } else if (price < 100) {
        return `$${price.toFixed(2)}`;
      } else {
        return `$${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      }
    }

    // Stocks
    return `$${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }, [asset]);

  const formatChange = useCallback((change: number, changePercent: number): string => {
    const sign = change >= 0 ? '+' : '';
    return `${sign}${formatPrice(Math.abs(change))} (${sign}${changePercent.toFixed(2)}%)`;
  }, [formatPrice]);

  const formatMarketCap = useCallback((marketCap: number): string => {
    if (marketCap >= 1e12) {
      return `$${(marketCap / 1e12).toFixed(2)}T`;
    } else if (marketCap >= 1e9) {
      return `$${(marketCap / 1e9).toFixed(2)}B`;
    } else if (marketCap >= 1e6) {
      return `$${(marketCap / 1e6).toFixed(2)}M`;
    }
    return `$${marketCap.toLocaleString()}`;
  }, []);

  const formatVolume = useCallback((volume: number): string => {
    if (volume >= 1e9) {
      return `$${(volume / 1e9).toFixed(2)}B`;
    } else if (volume >= 1e6) {
      return `$${(volume / 1e6).toFixed(2)}M`;
    } else if (volume >= 1e3) {
      return `$${(volume / 1e3).toFixed(2)}K`;
    }
    return `$${volume.toLocaleString()}`;
  }, []);

  return {
    formatPrice,
    formatChange,
    formatMarketCap,
    formatVolume,
  };
}
