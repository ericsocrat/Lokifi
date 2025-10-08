/**
 * QuickStats Component
 * 
 * Displays quick statistics for market pages
 */

import { TrendingUp, TrendingDown, Activity, DollarSign } from 'lucide-react';
import { useCurrencyFormatter } from '@/src/components/dashboard/useCurrencyFormatter';

interface QuickStatsProps {
  data: any[];
  showMarketCap?: boolean;
}

export function QuickStats({ data, showMarketCap = false }: QuickStatsProps) {
  const { formatCurrency } = useCurrencyFormatter();
  
  if (data.length === 0) return null;
  
  // Calculate statistics
  const assetsWithChange = data.filter(a => a.price_change_percentage_24h !== undefined);
  
  const avgChange = assetsWithChange.length > 0
    ? assetsWithChange.reduce((sum, a) => sum + a.price_change_percentage_24h, 0) / assetsWithChange.length
    : 0;
  
  const gainers = assetsWithChange.filter(a => a.price_change_percentage_24h > 0).length;
  const losers = assetsWithChange.filter(a => a.price_change_percentage_24h < 0).length;
  
  const totalVolume = data.reduce((sum, a) => sum + (a.total_volume || 0), 0);
  const totalMarketCap = data.reduce((sum, a) => sum + (a.market_cap || 0), 0);
  
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      {/* Total Assets */}
      <div className="bg-neutral-900/50 border border-neutral-800 rounded-lg p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-neutral-400">Total Assets</span>
          <Activity className="w-4 h-4 text-blue-500" />
        </div>
        <div className="text-2xl font-bold text-white">{data.length}</div>
        <div className="text-xs text-neutral-500 mt-1">
          {gainers} up · {losers} down
        </div>
      </div>
      
      {/* Average Change */}
      <div className="bg-neutral-900/50 border border-neutral-800 rounded-lg p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-neutral-400">Avg 24h Change</span>
          {avgChange >= 0 ? (
            <TrendingUp className="w-4 h-4 text-green-500" />
          ) : (
            <TrendingDown className="w-4 h-4 text-red-500" />
          )}
        </div>
        <div className={`text-2xl font-bold ${avgChange >= 0 ? 'text-green-500' : 'text-red-500'}`}>
          {avgChange >= 0 ? '+' : ''}{avgChange.toFixed(2)}%
        </div>
        <div className="text-xs text-neutral-500 mt-1">
          Across all assets
        </div>
      </div>
      
      {/* Market Cap (if applicable) */}
      {showMarketCap && totalMarketCap > 0 && (
        <div className="bg-neutral-900/50 border border-neutral-800 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-neutral-400">Total Market Cap</span>
            <DollarSign className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-2xl font-bold text-white">
            ${(totalMarketCap / 1e9).toFixed(2)}B
          </div>
          <div className="text-xs text-neutral-500 mt-1">
            Combined value
          </div>
        </div>
      )}
      
      {/* Total Volume */}
      {totalVolume > 0 && (
        <div className="bg-neutral-900/50 border border-neutral-800 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-neutral-400">24h Volume</span>
            <Activity className="w-4 h-4 text-orange-500" />
          </div>
          <div className="text-2xl font-bold text-white">
            ${(totalVolume / 1e9).toFixed(2)}B
          </div>
          <div className="text-xs text-neutral-500 mt-1">
            Trading volume
          </div>
        </div>
      )}
    </div>
  );
}
