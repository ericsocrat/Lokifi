'use client';
import { TrendingUp } from 'lucide-react';
import { useEffect, useState } from 'react';

interface MarketStats {
  marketCap: string;
  volume24h: string;
  btcDominance: number;
  activeCoins: number;
  sentiment: string;
  sentimentScore: number;
}

interface MarketOverviewResponse {
  totalMarketCap: number;
  volume24h: number;
  btcDominance: number;
  activeCryptocurrencies: number;
  sentiment: string;
  sentimentScore: number;
  provider?: string;
}

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

function formatCurrency(value: number): string {
  if (value >= 1e12) return `$${(value / 1e12).toFixed(2)}T`;
  if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
  if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
  return `$${value.toFixed(2)}`;
}

export function MarketOverview() {
  const [stats, setStats] = useState<MarketStats>({
    marketCap: '$4.15T',
    volume24h: '$263.90B',
    btcDominance: 67,
    activeCoins: 14234,
    sentiment: 'Neutral',
    sentimentScore: 51,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMarketOverview = async () => {
      try {
        const response = await fetch(`${BACKEND_URL}/api/crypto/market/overview`);

        if (!response.ok) {
          throw new Error('Failed to fetch market overview');
        }

        const data: MarketOverviewResponse = await response.json();

        setStats({
          marketCap: formatCurrency(data.totalMarketCap),
          volume24h: formatCurrency(data.volume24h),
          btcDominance: Math.round(data.btcDominance),
          activeCoins: data.activeCryptocurrencies,
          sentiment: data.sentiment,
          sentimentScore: Math.abs(data.sentimentScore) > 100 ? 51 : 50 + data.sentimentScore / 2,
        });
        setLoading(false);
      } catch (err) {
        console.error('Error fetching market overview:', err);
        // Keep fallback data on error
        setLoading(false);
      }
    };

    fetchMarketOverview();

    // Refresh every 60 seconds
    const interval = setInterval(fetchMarketOverview, 60000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
      {/* Market Cap */}
      <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
        <div className="flex items-center justify-between mb-2">
          <span className="text-gray-400 text-sm">Market Cap</span>
          <TrendingUp className="w-4 h-4 text-green-500" />
        </div>
        <div className="text-2xl font-bold text-white">{stats.marketCap}</div>
        <div className="text-green-500 text-sm">+3.26%</div>
      </div>

      {/* 24h Volume */}
      <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
        <div className="flex items-center justify-between mb-2">
          <span className="text-gray-400 text-sm">24h Volume</span>
        </div>
        <div className="text-2xl font-bold text-white">{stats.volume24h}</div>
        <div className="text-green-500 text-sm">+3.31%</div>
      </div>

      {/* BTC Dominance */}
      <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
        <div className="flex items-center justify-between mb-2">
          <span className="text-gray-400 text-sm">BTC Dominance</span>
        </div>
        <div className="text-2xl font-bold text-white">{stats.btcDominance}%</div>
        <div className="text-gray-400 text-sm">/ 100</div>
      </div>

      {/* Fear & Greed */}
      <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
        <div className="flex items-center justify-between mb-2">
          <span className="text-gray-400 text-sm">Market Sentiment</span>
        </div>
        <div className="text-2xl font-bold text-white">{Math.round(stats.sentimentScore)}</div>
        <div className="flex items-center gap-2 mt-1">
          <div className="h-2 flex-1 bg-gray-700 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all ${
                stats.sentimentScore > 60
                  ? 'bg-green-500'
                  : stats.sentimentScore < 40
                    ? 'bg-red-500'
                    : 'bg-yellow-500'
              }`}
              style={{ width: `${stats.sentimentScore}%` }}
            />
          </div>
          <span className="text-gray-400 text-xs">{stats.sentiment}</span>
        </div>
      </div>

      {/* Active Coins */}
      <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
        <div className="flex items-center justify-between mb-2">
          <span className="text-gray-400 text-sm">Active Coins</span>
        </div>
        <div className="text-2xl font-bold text-white">{stats.activeCoins.toLocaleString()}</div>
        <div className="text-gray-400 text-sm">cryptocurrencies</div>
      </div>
    </div>
  );
}
