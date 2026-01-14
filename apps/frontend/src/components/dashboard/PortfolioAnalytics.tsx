import React from 'react';
import type {
  AllocationEntry,
  Concentration,
  MoverEntry,
  Movers,
  PortfolioAnalytics as PortfolioAnalyticsType,
} from '@/lib/utils/portfolio';
import { getPortfolioAnalytics } from '@/lib/utils/portfolio';
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger('PortfolioAnalytics');

interface PortfolioAnalyticsProps {
  autoLoad?: boolean;
}

export function PortfolioAnalytics({ autoLoad = true }: PortfolioAnalyticsProps) {
  const [data, setData] = React.useState<PortfolioAnalyticsType | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const loadAnalytics = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const analytics = await getPortfolioAnalytics();
      setData(analytics);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load analytics';
      setError(message);
      logger.error('Failed to load portfolio analytics', { error: err });
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (autoLoad) {
      loadAnalytics();
    }
  }, [autoLoad, loadAnalytics]);

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
        <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
        <h3 className="text-red-800 dark:text-red-200 font-semibold">
          Failed to load analytics
        </h3>
        <p className="text-red-600 dark:text-red-300 text-sm mt-1">{error}</p>
        <button
          onClick={loadAnalytics}
          className="mt-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md text-sm font-medium transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        <p>No analytics data available</p>
        <button
          onClick={loadAnalytics}
          className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium transition-colors"
        >
          Load Analytics
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Portfolio Overview */}
      <section className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
          Portfolio Overview
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Total Cost</p>
            <p className="text-lg font-semibold text-gray-900 dark:text-white">
              ${data.total_cost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Total Value</p>
            <p className="text-lg font-semibold text-gray-900 dark:text-white">
              ${data.total_value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Total P/L</p>
            <p className={`text-lg font-semibold ${data.total_pl >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
              ${data.total_pl.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Total P/L %</p>
            <p className={`text-lg font-semibold ${data.total_pl_pct >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
              {data.total_pl_pct >= 0 ? '+' : ''}{data.total_pl_pct.toFixed(2)}%
            </p>
          </div>
        </div>
      </section>

      {/* Allocations */}
      <section className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
          Allocations
        </h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead>
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Symbol
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Weight %
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Market Value
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Cost Value
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Qty
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Price
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  P/L %
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {data.allocations.map((allocation: AllocationEntry) => (
                <tr key={allocation.symbol} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">
                    {allocation.symbol}
                  </td>
                  <td className="px-4 py-3 text-sm text-right text-gray-900 dark:text-white">
                    {allocation.weight_pct.toFixed(2)}%
                  </td>
                  <td className="px-4 py-3 text-sm text-right text-gray-900 dark:text-white">
                    ${allocation.market_value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="px-4 py-3 text-sm text-right text-gray-900 dark:text-white">
                    ${allocation.cost_value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="px-4 py-3 text-sm text-right text-gray-900 dark:text-white">
                    {allocation.qty.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 8 })}
                  </td>
                  <td className="px-4 py-3 text-sm text-right text-gray-900 dark:text-white">
                    {allocation.current_price !== null
                      ? `$${allocation.current_price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                      : 'N/A'}
                  </td>
                  <td className={`px-4 py-3 text-sm text-right font-medium ${allocation.pl_pct !== null && allocation.pl_pct >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    {allocation.pl_pct !== null
                      ? `${allocation.pl_pct >= 0 ? '+' : ''}${allocation.pl_pct.toFixed(2)}%`
                      : 'N/A'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Movers (Gainers & Losers) */}
      <section className="grid md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-xl font-bold text-green-600 dark:text-green-400 mb-4">
            Top Gainers
          </h2>
          {data.movers.gainers.length > 0 ? (
            <ul className="space-y-2">
              {data.movers.gainers.map((mover: MoverEntry) => (
                <li key={mover.symbol} className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {mover.symbol}
                  </span>
                  <span className="text-sm font-semibold text-green-600 dark:text-green-400">
                    {mover.pl_pct !== null ? `+${mover.pl_pct.toFixed(2)}%` : 'N/A'}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-500 dark:text-gray-400">No gainers</p>
          )}
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-xl font-bold text-red-600 dark:text-red-400 mb-4">
            Top Losers
          </h2>
          {data.movers.losers.length > 0 ? (
            <ul className="space-y-2">
              {data.movers.losers.map((mover: MoverEntry) => (
                <li key={mover.symbol} className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {mover.symbol}
                  </span>
                  <span className="text-sm font-semibold text-red-600 dark:text-red-400">
                    {mover.pl_pct !== null ? `${mover.pl_pct.toFixed(2)}%` : 'N/A'}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-500 dark:text-gray-400">No losers</p>
          )}
        </div>
      </section>

      {/* Concentration Metrics */}
      <section className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
          Concentration Metrics
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Top 3 Weight</p>
            <p className="text-lg font-semibold text-gray-900 dark:text-white">
              {data.concentration.top3_weight_pct.toFixed(2)}%
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {data.concentration.top3_weight_pct > 50
                ? 'High concentration'
                : data.concentration.top3_weight_pct > 30
                  ? 'Moderate concentration'
                  : 'Well diversified'}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Total Positions</p>
            <p className="text-lg font-semibold text-gray-900 dark:text-white">
              {data.concentration.position_count}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Priced Positions</p>
            <p className="text-lg font-semibold text-gray-900 dark:text-white">
              {data.concentration.priced_positions}
            </p>
            {data.concentration.priced_positions < data.concentration.position_count && (
              <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
                {data.concentration.position_count - data.concentration.priced_positions} positions missing prices
              </p>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
