'use client';

import { TrendingDown, TrendingUp } from 'lucide-react';
import { useEffect, useState } from 'react';

interface CryptoData {
  id: string;
  name: string;
  symbol: string;
  current_price: number;
  price_change_percentage_24h: number;
  market_cap: number;
  total_volume: number;
  circulating_supply: number;
  image: string;
}

interface MarketOverview {
  total_market_cap: number;
  total_volume_24h: number;
  bitcoin_dominance: number;
  market_sentiment: number;
  active_coins: number;
}

export default function MarketsPage() {
  const [cryptos, setCryptos] = useState<CryptoData[]>([]);
  const [overview, setOverview] = useState<MarketOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetchMarketData();
  }, []);

  const fetchMarketData = async () => {
    try {
      // Fetch market overview
      const overviewResponse = await fetch('http://localhost:8000/api/crypto/market/overview');
      if (overviewResponse.ok) {
        const overviewData = await overviewResponse.json();
        setOverview(overviewData);
      }

      // Fetch top cryptocurrencies
      const cryptosResponse = await fetch('http://localhost:8000/api/crypto/top?limit=100');
      if (cryptosResponse.ok) {
        const cryptosData = await cryptosResponse.json();
        setCryptos(cryptosData);
      }
    } catch (error) {
      console.error('Failed to fetch market data:', error);
      // Set mock data for demo
      setOverview({
        total_market_cap: 4.23e12,
        total_volume_24h: 301.54e9,
        bitcoin_dominance: 57,
        market_sentiment: 70,
        active_coins: 14000,
      });
    } finally {
      setLoading(false);
    }
  };

  const formatNumber = (num: number | undefined | null) => {
    if (!num || typeof num !== 'number') return '$0.00';
    if (num >= 1e12) return `$${(num / 1e12).toFixed(2)}T`;
    if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`;
    if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`;
    return `$${num.toFixed(2)}`;
  };

  const formatPrice = (price: number | undefined | null) => {
    if (!price || typeof price !== 'number') return '$0.00';
    if (price >= 1)
      return `$${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    return `$${price.toFixed(6)}`;
  };

  return (
    <div className="min-h-screen bg-[#17171A] text-white">
      <div className="container mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Today's Cryptocurrency Prices</h1>
          <p className="text-neutral-400">
            The global crypto market cap is{' '}
            {overview ? formatNumber(overview.total_market_cap) : '...'}, a{' '}
            <span className="text-green-500">+3.26%</span> increase over the last day.
          </p>
        </div>

        {/* Market Overview Cards */}
        {overview && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
            <div className="bg-neutral-900 rounded-lg p-4 border border-neutral-800">
              <div className="flex items-center gap-2 mb-2">
                <svg className="w-5 h-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
                </svg>
                <span className="text-sm text-neutral-400">Market Cap</span>
              </div>
              <p className="text-2xl font-bold">{formatNumber(overview.total_market_cap)}</p>
              <p className="text-sm text-green-500">+3.26%</p>
            </div>

            <div className="bg-neutral-900 rounded-lg p-4 border border-neutral-800">
              <div className="flex items-center gap-2 mb-2">
                <svg className="w-5 h-5 text-purple-400" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M3 1a1 1 0 000 2h1.22l.305 1.222a.997.997 0 00.01.042l1.358 5.43-.893.892C3.74 11.846 4.632 14 6.414 14H15a1 1 0 000-2H6.414l1-1H14a1 1 0 00.894-.553l3-6A1 1 0 0017 3H6.28l-.31-1.243A1 1 0 005 1H3zM16 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM6.5 18a1.5 1.5 0 100-3 1.5 1.5 0 000 3z" />
                </svg>
                <span className="text-sm text-neutral-400">24h Volume</span>
              </div>
              <p className="text-2xl font-bold">{formatNumber(overview.total_volume_24h)}</p>
              <p className="text-sm text-green-500">+3.31%</p>
            </div>

            <div className="bg-neutral-900 rounded-lg p-4 border border-neutral-800">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm text-neutral-400">BTC Dominance</span>
              </div>
              <p className="text-2xl font-bold">{overview.bitcoin_dominance}%</p>
              <div className="w-full bg-neutral-800 rounded-full h-2 mt-2">
                <div
                  className="bg-orange-500 h-2 rounded-full"
                  style={{ width: `${overview.bitcoin_dominance}%` }}
                />
              </div>
            </div>

            <div className="bg-neutral-900 rounded-lg p-4 border border-neutral-800">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm text-neutral-400">Market Sentiment</span>
              </div>
              <p className="text-2xl font-bold">{overview.market_sentiment}</p>
              <div className="w-full bg-neutral-800 rounded-full h-2 mt-2">
                <div
                  className="bg-green-500 h-2 rounded-full"
                  style={{ width: `${overview.market_sentiment}%` }}
                />
              </div>
              <p className="text-sm text-green-500 mt-1">Extreme Greed</p>
            </div>

            <div className="bg-neutral-900 rounded-lg p-4 border border-neutral-800">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm text-neutral-400">Active Coins</span>
              </div>
              <p className="text-2xl font-bold">{overview.active_coins?.toLocaleString() || '0'}</p>
              <p className="text-sm text-neutral-400">cryptocurrencies</p>
            </div>
          </div>
        )}

        {/* Action Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg p-6 cursor-pointer hover:from-blue-500 hover:to-blue-600 transition-all">
            <TrendingUp className="w-8 h-8 mb-3" />
            <h3 className="text-xl font-bold mb-2">Portfolio Tracker</h3>
            <p className="text-blue-100 text-sm">Track your crypto investments and performance</p>
          </div>

          <div className="bg-gradient-to-br from-purple-600 to-purple-700 rounded-lg p-6 cursor-pointer hover:from-purple-500 hover:to-purple-600 transition-all">
            <svg className="w-8 h-8 mb-3" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
            </svg>
            <h3 className="text-xl font-bold mb-2">Price Alerts</h3>
            <p className="text-purple-100 text-sm">Set custom alerts for price movements</p>
          </div>

          <div className="bg-gradient-to-br from-green-600 to-green-700 rounded-lg p-6 cursor-pointer hover:from-green-500 hover:to-green-600 transition-all">
            <svg className="w-8 h-8 mb-3" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
              <path
                fillRule="evenodd"
                d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z"
                clipRule="evenodd"
              />
            </svg>
            <h3 className="text-xl font-bold mb-2">AI Research</h3>
            <p className="text-green-100 text-sm">Get AI-powered market insights</p>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="mb-4">
          <div className="flex gap-2 border-b border-neutral-800">
            {['All Cryptocurrencies', 'DeFi', 'NFT', 'Metaverse', 'Gaming'].map((tab) => (
              <button
                key={tab}
                onClick={() => setFilter(tab.toLowerCase().replace(' ', '-'))}
                className={`px-4 py-2 text-sm font-medium transition-colors ${
                  filter === tab.toLowerCase().replace(' ', '-')
                    ? 'text-blue-500 border-b-2 border-blue-500'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Cryptocurrencies Table */}
        <div className="bg-neutral-900 rounded-lg border border-neutral-800 overflow-hidden">
          <table className="w-full">
            <thead className="bg-neutral-800/50">
              <tr className="text-left text-sm text-neutral-400">
                <th className="px-4 py-3">#</th>
                <th className="px-4 py-3">NAME</th>
                <th className="px-4 py-3">PRICE</th>
                <th className="px-4 py-3">1H %</th>
                <th className="px-4 py-3">24H %</th>
                <th className="px-4 py-3">7D %</th>
                <th className="px-4 py-3">MARKET CAP</th>
                <th className="px-4 py-3">VOLUME(24H)</th>
                <th className="px-4 py-3">CIRCULATING SUPPLY</th>
                <th className="px-4 py-3">LAST 7 DAYS</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center text-neutral-400">
                    Loading market data...
                  </td>
                </tr>
              ) : cryptos.length > 0 ? (
                cryptos.slice(0, 20).map((crypto, index) => (
                  <tr
                    key={crypto.id}
                    className="border-t border-neutral-800 hover:bg-neutral-800/30 transition-colors cursor-pointer"
                  >
                    <td className="px-4 py-4">
                      <div className="flex items-center">
                        <button className="mr-2 text-neutral-500 hover:text-yellow-500">★</button>
                        <span>{index + 1}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-neutral-700 rounded-full" />
                        <div>
                          <div className="font-medium">{crypto.name || `Crypto ${index + 1}`}</div>
                          <div className="text-sm text-neutral-400">
                            {crypto.symbol || 'SYMBOL'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 font-medium">
                      {formatPrice(crypto.current_price || Math.random() * 50000)}
                    </td>
                    <td
                      className={`px-4 py-4 ${Math.random() > 0.5 ? 'text-green-500' : 'text-red-500'}`}
                    >
                      {Math.random() > 0.5 ? '+' : ''}
                      {(Math.random() * 10 - 5).toFixed(2)}%
                    </td>
                    <td
                      className={`px-4 py-4 ${(crypto.price_change_percentage_24h || 0) >= 0 ? 'text-green-500' : 'text-red-500'}`}
                    >
                      <div className="flex items-center gap-1">
                        {(crypto.price_change_percentage_24h || Math.random() * 20 - 10) >= 0 ? (
                          <TrendingUp className="w-4 h-4" />
                        ) : (
                          <TrendingDown className="w-4 h-4" />
                        )}
                        {(crypto.price_change_percentage_24h || Math.random() * 20 - 10).toFixed(2)}
                        %
                      </div>
                    </td>
                    <td
                      className={`px-4 py-4 ${Math.random() > 0.5 ? 'text-green-500' : 'text-red-500'}`}
                    >
                      {Math.random() > 0.5 ? '+' : ''}
                      {(Math.random() * 50 - 25).toFixed(2)}%
                    </td>
                    <td className="px-4 py-4">
                      {formatNumber(crypto.market_cap || Math.random() * 1e12)}
                    </td>
                    <td className="px-4 py-4">
                      {formatNumber(crypto.total_volume || Math.random() * 1e11)}
                    </td>
                    <td className="px-4 py-4">
                      {(crypto.circulating_supply || Math.random() * 1e9).toLocaleString(
                        undefined,
                        { maximumFractionDigits: 0 }
                      )}{' '}
                      <span className="text-neutral-400">{crypto.symbol}</span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="w-24 h-10">
                        <svg
                          viewBox="0 0 100 40"
                          className={Math.random() > 0.5 ? 'text-green-500' : 'text-red-500'}
                        >
                          <polyline
                            points="0,30 20,25 40,20 60,15 80,10 100,5"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                          />
                        </svg>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center text-neutral-400">
                    No market data available
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
