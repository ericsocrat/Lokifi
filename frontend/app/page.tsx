'use client';
import { Activity, Newspaper, TrendingUp } from 'lucide-react';
import Link from 'next/link';
import { CryptoTable } from '../components/CryptoTable';
import { MarketOverview } from '../components/MarketOverview';
import { TopHeader } from '../components/TopHeader';

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-900">
      <TopHeader />

      <main className="container mx-auto px-4 py-6">
        {/* Hero Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-4xl font-bold text-white mb-2">Today's Cryptocurrency Prices</h1>
              <p className="text-gray-400 text-lg">
                The global crypto market cap is{' '}
                <span className="text-white font-semibold">$4.15T</span>, a{' '}
                <span className="text-green-500">+3.26%</span> increase over the last day.
              </p>
            </div>
            <Link
              href="/chart"
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
            >
              <Activity size={20} />
              Open Chart
            </Link>
          </div>
        </div>

        {/* Market Overview Stats */}
        <MarketOverview />

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Link
            href="/portfolio"
            className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-lg p-6 hover:from-blue-700 hover:to-blue-900 transition-all"
          >
            <TrendingUp className="w-8 h-8 text-white mb-3" />
            <h3 className="text-xl font-bold text-white mb-2">Portfolio Tracker</h3>
            <p className="text-blue-100">Track your crypto investments and performance</p>
          </Link>

          <Link
            href="/alerts"
            className="bg-gradient-to-br from-purple-600 to-purple-800 rounded-lg p-6 hover:from-purple-700 hover:to-purple-900 transition-all"
          >
            <Activity className="w-8 h-8 text-white mb-3" />
            <h3 className="text-xl font-bold text-white mb-2">Price Alerts</h3>
            <p className="text-purple-100">Set custom alerts for price movements</p>
          </Link>

          <Link
            href="/chat"
            className="bg-gradient-to-br from-green-600 to-green-800 rounded-lg p-6 hover:from-green-700 hover:to-green-900 transition-all"
          >
            <Newspaper className="w-8 h-8 text-white mb-3" />
            <h3 className="text-xl font-bold text-white mb-2">AI Research</h3>
            <p className="text-green-100">Get AI-powered market insights</p>
          </Link>
        </div>

        {/* Main Crypto Table */}
        <CryptoTable />

        {/* Trending Section */}
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <TrendingUp className="text-green-500" />
              🔥 Trending
            </h2>
            <div className="space-y-3">
              {['Bitcoin', 'Ethereum', 'Solana', 'XRP', 'Dogecoin'].map((coin, i) => (
                <div
                  key={coin}
                  className="flex items-center justify-between p-3 bg-gray-750 rounded-lg hover:bg-gray-700 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-gray-400 text-sm">#{i + 1}</span>
                    <span className="font-medium text-white">{coin}</span>
                  </div>
                  <span className="text-green-500 text-sm">
                    +{(Math.random() * 10).toFixed(2)}%
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Activity className="text-blue-500" />
              📈 Top Gainers
            </h2>
            <div className="space-y-3">
              {['Chainlink', 'Avalanche', 'Polygon', 'Uniswap', 'Litecoin'].map((coin, i) => (
                <div
                  key={coin}
                  className="flex items-center justify-between p-3 bg-gray-750 rounded-lg hover:bg-gray-700 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-gray-400 text-sm">#{i + 1}</span>
                    <span className="font-medium text-white">{coin}</span>
                  </div>
                  <span className="text-green-500 text-sm">
                    +{(15 + Math.random() * 10).toFixed(2)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-800 border-t border-gray-700 mt-12 py-8">
        <div className="container mx-auto px-4 text-center text-gray-400">
          <p>© 2025 Lokifi. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
