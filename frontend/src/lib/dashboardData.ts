/**
 * Dashboard Data Integration Layer
 * Connects portfolio storage to dashboard metrics and calculations
 */

import { loadPortfolio, totalValue } from './portfolioStorage';

export interface DashboardStats {
  netWorth: number;
  investableAssets: number;
  totalAssets: number;
  debts: number;
  cashOnHand: number;
  illiquid: number;
}

export interface AllocationItem {
  name: string;
  value: number;
  percentage: number;
  color: string;
}

export interface NetWorthTrend {
  date: string;
  value: number;
}

export interface TopHolding {
  symbol: string;
  name: string;
  value: number;
  percentage: number;
}

/**
 * Calculate total net worth from portfolio
 */
export function getTotalNetWorth(): number {
  return totalValue();
}

/**
 * Calculate stats breakdown
 */
export function getStats(): DashboardStats {
  const portfolio = loadPortfolio();
  let investableAssets = 0;
  let cashOnHand = 0;
  let illiquid = 0;
  let debts = 0;

  portfolio.forEach((section: any) => {
    const sectionTitle = section.title.toLowerCase();
    const sectionValue = section.assets.reduce((sum: any, asset: any) => sum + asset.value, 0);

    // Categorize based on section title
    if (sectionTitle.includes('invest') || sectionTitle.includes('stock') || sectionTitle.includes('crypto')) {
      investableAssets += sectionValue;
    } else if (sectionTitle.includes('cash') || sectionTitle.includes('bank') || sectionTitle.includes('checking') || sectionTitle.includes('savings')) {
      cashOnHand += sectionValue;
    } else if (sectionTitle.includes('real estate') || sectionTitle.includes('property') || sectionTitle.includes('house')) {
      illiquid += sectionValue;
    } else if (sectionTitle.includes('debt') || sectionTitle.includes('loan') || sectionTitle.includes('mortgage')) {
      debts += sectionValue;
    } else {
      // Default to investable assets
      investableAssets += sectionValue;
    }
  });

  const totalAssets = investableAssets + cashOnHand + illiquid;
  const netWorth = totalAssets - debts;

  return {
    netWorth,
    investableAssets,
    totalAssets,
    debts,
    cashOnHand,
    illiquid,
  };
}

/**
 * Get allocation by category (Stocks, Crypto, Real Estate, etc.)
 */
export function getAllocationByCategory(): AllocationItem[] {
  const portfolio = loadPortfolio();
  const categoryMap = new Map<string, number>();
  const total = totalValue();

  portfolio.forEach((section: any) => {
    const value = section.assets.reduce((sum: any, asset: any) => sum + asset.value, 0);
    categoryMap.set(section.title, value);
  });

  const colors = [
    '#a78bfa', // purple-400
    '#c4b5fd', // purple-300
    '#e9d5ff', // purple-200
    '#f3e8ff', // purple-100
    '#ddd6fe', // purple-200
    '#c7d2fe', // indigo-200
  ];

  let colorIndex = 0;
  const allocations: AllocationItem[] = [];

  categoryMap.forEach((value: any, name: any) => {
    allocations.push({
      name,
      value,
      percentage: total > 0 ? (value / total) * 100 : 0,
      color: colors[colorIndex % colors.length],
    });
    colorIndex++;
  });

  return allocations.sort((a: any, b: any) => b.value - a.value);
}

/**
 * Get allocation by asset type (individual assets)
 */
export function getAllocationByAssetType(): AllocationItem[] {
  const portfolio = loadPortfolio();
  const typeMap = new Map<string, number>();
  const total = totalValue();

  portfolio.forEach((section: any) => {
    section.assets.forEach((asset: any) => {
      // Group by symbol or name
      const key = asset.symbol || asset.name;
      const currentValue = typeMap.get(key) || 0;
      typeMap.set(key, currentValue + asset.value);
    });
  });

  const colors = [
    '#a78bfa', '#c4b5fd', '#e9d5ff', '#ddd6fe',
    '#c7d2fe', '#a5b4fc', '#93c5fd', '#7dd3fc',
  ];

  let colorIndex = 0;
  const allocations: AllocationItem[] = [];

  typeMap.forEach((value: any, name: any) => {
    allocations.push({
      name,
      value,
      percentage: total > 0 ? (value / total) * 100 : 0,
      color: colors[colorIndex % colors.length],
    });
    colorIndex++;
  });

  // Return top 10 only
  return allocations
    .sort((a: any, b: any) => b.value - a.value)
    .slice(0, 10);
}

/**
 * Get top holdings
 */
export function getTopHoldings(limit: number = 5): TopHolding[] {
  const portfolio = loadPortfolio();
  const holdings: TopHolding[] = [];
  const total = totalValue();

  portfolio.forEach((section: any) => {
    section.assets.forEach((asset: any) => {
      holdings.push({
        symbol: asset.symbol,
        name: asset.name,
        value: asset.value,
        percentage: total > 0 ? (asset.value / total) * 100 : 0,
      });
    });
  });

  return holdings
    .sort((a: any, b: any) => b.value - a.value)
    .slice(0, limit);
}

/**
 * Get net worth trend (mock data for now, will need historical data)
 */
export function getNetWorthTrend(days: number = 30): NetWorthTrend[] {
  const currentValue = getTotalNetWorth();
  const trend: NetWorthTrend[] = [];
  const today = new Date();

  // Generate sample trend data (in real app, load from history)
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    
    // Simulate slight variation
    const variation = (Math.random() - 0.5) * 0.02; // ±1%
    const value = currentValue * (1 + variation);

    trend.push({
      date: date.toISOString().split('T')[0],
      value: Math.round(value),
    });
  }

  // Make sure last value is current
  if (trend.length > 0) {
    trend[trend.length - 1].value = currentValue;
  }

  return trend;
}

/**
 * Get change statistics
 */
export function getNetWorthChange(period: '1d' | '7d' | '30d' | '1y' | 'all' = '1d'): {
  value: number;
  change: number;
  changePercent: number;
} {
  const current = getTotalNetWorth();
  
  // For now, simulate change (in real app, calculate from historical data)
  const daysMap = { '1d': 1, '7d': 7, '30d': 30, '1y': 365, 'all': 365 };
  const days = daysMap[period] || 1;
  
  // Simulate previous value (5% variation)
  const variation = (Math.random() - 0.3) * 0.05 * (days / 30);
  const previous = current * (1 - variation);
  const change = current - previous;
  const changePercent = previous > 0 ? (change / previous) * 100 : 0;

  return {
    value: current,
    change: Math.round(change),
    changePercent: Math.round(changePercent * 100) / 100,
  };
}

/**
 * Check if user has any assets
 */
export function hasAssets(): boolean {
  const portfolio = loadPortfolio();
  return portfolio.some((section: any) => section.assets.length > 0);
}

/**
 * Get asset count
 */
export function getAssetCount(): number {
  const portfolio = loadPortfolio();
  return portfolio.reduce((count: any, section: any) => count + section.assets.length, 0);
}
