'use client';

/**
 * MarketStats Component
 *
 * Displays key market statistics across all asset types:
 * - Total market capitalization
 * - Average 24h price change
 * - Top performing asset (gainer)
 * - Worst performing asset (loser)
 *
 * Enhanced with animations and better visual hierarchy
 */

import { useCurrencyFormatter } from '@/components/dashboard/useCurrencyFormatter';
import { DollarSign, Sparkles, TrendingDown, TrendingUp } from 'lucide-react';
import { useMemo } from 'react';

interface MarketStatsProps {
  data: {
    crypto?: any[];
    stocks?: any[];
    indices?: any[];
    forex?: any[];
  };
}

export function MarketStats({ data }: MarketStatsProps) {
  const { formatCurrency } = useCurrencyFormatter();

  // Memoize expensive calculations
  const stats = useMemo(() => {
    // Combine all assets
    const allAssets = [
      ...(data.crypto || []),
      ...(data.stocks || []),
      ...(data.indices || []),
      ...(data.forex || []),
    ];

    if (allAssets.length === 0) {
      return null;
    }

    // Calculate total market cap (only for crypto and stocks that have market_cap)
    const totalMarketCap = [...(data.crypto || []), ...(data.stocks || [])].reduce(
      (sum: any, asset: any) => sum + (asset.market_cap || 0),
      0
    );

    // Calculate average 24h change
    const assetsWithChange = allAssets.filter(
      (a: any) =>
        a.price_change_percentage_24h !== undefined && a.price_change_percentage_24h !== null
    );
    const avgChange =
      assetsWithChange.length > 0
        ? assetsWithChange.reduce((sum: any, a: any) => sum + a.price_change_percentage_24h, 0) /
          assetsWithChange.length
        : 0;

    // Find top gainer
    const topGainer = assetsWithChange.reduce((max: any, asset: any) => {
      return asset.price_change_percentage_24h > (max?.price_change_percentage_24h || -Infinity)
        ? asset
        : max;
    }, assetsWithChange[0]);

    // Find top loser
    const topLoser = assetsWithChange.reduce((min: any, asset: any) => {
      return asset.price_change_percentage_24h < (min?.price_change_percentage_24h || Infinity)
        ? asset
        : min;
    }, assetsWithChange[0]);

    // Count assets by type
    const assetCounts = {
      crypto: data.crypto?.length || 0,
      stocks: data.stocks?.length || 0,
      indices: data.indices?.length || 0,
      forex: data.forex?.length || 0,
    };

    return {
      allAssets,
      totalMarketCap,
      avgChange,
      topGainer,
      topLoser,
      assetCounts,
    };
  }, [data]);

  if (!stats) {
    return null;
  }

  const { totalMarketCap, avgChange, topGainer, topLoser, assetCounts, allAssets } = stats;

  return (
    <div className="mb-8 animate-fade-in">
      <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
        <Sparkles className="w-5 h-5 text-blue-500 animate-pulse" />
        Market Overview
        <span className="text-xs text-neutral-500 font-normal">• Real-time Statistics</span>
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Market Cap */}
        {totalMarketCap > 0 && (
          <StatCard
            title="Total Market Cap"
            value={formatCurrency(totalMarketCap)}
            subtitle={`${assetCounts.crypto} crypto + ${assetCounts.stocks} stocks`}
            icon={<DollarSign className="w-5 h-5" />}
            color="blue"
          />
        )}

        {/* Average Change */}
        <StatCard
          title="Average 24h Change"
          value={`${avgChange >= 0 ? '+' : ''}${avgChange.toFixed(2)}%`}
          subtitle={`Across ${allAssets.length} assets`}
          icon={
            avgChange >= 0 ? (
              <TrendingUp className="w-5 h-5" />
            ) : (
              <TrendingDown className="w-5 h-5" />
            )
          }
          color={avgChange >= 0 ? 'green' : 'red'}
        />

        {/* Top Gainer */}
        {topGainer && (
          <StatCard
            title="Top Gainer"
            value={topGainer.symbol}
            subtitle={`+${topGainer.price_change_percentage_24h.toFixed(2)}%`}
            icon={<TrendingUp className="w-5 h-5" />}
            color="green"
          />
        )}

        {/* Top Loser */}
        {topLoser && (
          <StatCard
            title="Top Loser"
            value={topLoser.symbol}
            subtitle={`${topLoser.price_change_percentage_24h.toFixed(2)}%`}
            icon={<TrendingDown className="w-5 h-5" />}
            color="red"
          />
        )}
      </div>
    </div>
  );
}

interface StatCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ReactNode;
  color: 'blue' | 'green' | 'red';
}

function StatCard({ title, value, subtitle, icon, color }: StatCardProps) {
  const colorClasses = {
    blue: 'bg-blue-500/10 border-blue-500/20 hover:bg-blue-500/15',
    green: 'bg-green-500/10 border-green-500/20 hover:bg-green-500/15',
    red: 'bg-red-500/10 border-red-500/20 hover:bg-red-500/15',
  };

  const iconColorClasses = {
    blue: 'text-blue-500',
    green: 'text-green-500',
    red: 'text-red-500',
  };

  return (
    <div
      className={`border rounded-lg p-4 ${colorClasses[color]} transition-all duration-300 hover:scale-105 hover:shadow-lg cursor-default`}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-neutral-400 font-medium">{title}</span>
        <div className={iconColorClasses[color]}>{icon}</div>
      </div>
      <div className="text-xl font-bold text-white mb-1">{value}</div>
      {subtitle && <div className="text-xs text-neutral-500">{subtitle}</div>}
    </div>
  );
}
