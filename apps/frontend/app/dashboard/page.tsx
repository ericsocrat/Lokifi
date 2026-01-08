'use client';

import { usePreferences } from '@/src/components/dashboard/PreferencesContext';
import { useCurrencyFormatter } from '@/src/components/dashboard/useCurrencyFormatter';
import { usePortfolioPrices } from '@/src/hooks/useMarketData';
import {
  hasAssets as checkHasAssets,
  getAllocationByCategory,
  getStats,
  getTopHoldings,
  type AllocationItem,
  type DashboardStats,
  type TopHolding,
} from '@/src/lib/data/dashboardData';
import {
  loadPortfolio,
  type Asset as PortfolioAsset,
  type PortfolioSection,
} from '@/src/lib/data/portfolioStorage';
import {
  ArrowRight,
  BarChart3,
  ChevronRight,
  DollarSign,
  PieChart,
  Plus,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

interface User {
  email: string;
  name?: string;
}

type TimePeriod = '1d' | '7d' | '30d' | '1y' | 'all';

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasAnyAssets, setHasAnyAssets] = useState(false);
  const [allocations, setAllocations] = useState<AllocationItem[]>([]);
  const [topHoldings, setTopHoldings] = useState<TopHolding[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>('1d');
  const [_netWorthData, setNetWorthData] = useState({ value: 0, change: 0, changePercent: 0 });
  const { darkMode: _darkMode, setDarkMode: _setDarkMode } = usePreferences();

  // Get live portfolio data from master market data service
  const portfolio = loadPortfolio();
  const holdings = portfolio.flatMap((section: PortfolioSection) =>
    section.assets.map((asset: PortfolioAsset) => ({
      symbol: asset.symbol,
      shares: asset.shares,
    }))
  );

  const {
    totalValue: liveNetWorth,
    totalChange: liveChange,
    totalChangePercent: liveChangePercent,
  } = usePortfolioPrices(holdings);

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, [selectedPeriod]);

  const loadDashboardData = () => {
    try {
      const hasData = checkHasAssets();
      setHasAnyAssets(hasData);

      if (hasData) {
        const dashboardStats = getStats();
        setStats(dashboardStats);

        const categoryAllocations = getAllocationByCategory();
        setAllocations(categoryAllocations);

        const topHoldingsData = getTopHoldings(5);
        setTopHoldings(topHoldingsData);

        setNetWorthData({
          value: liveNetWorth,
          change: liveChange,
          changePercent: liveChangePercent,
        });
      }
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    }
  };

  const checkAuth = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/auth/me', {
        credentials: 'include',
      });

      if (!response.ok) {
        setUser({ email: 'demo@example.com', name: 'Demo User' });
        setLoading(false);
        return;
      }

      const userData = await response.json();
      setUser(userData);
    } catch (error) {
      console.error('Auth check failed:', error);
      setUser({ email: 'demo@example.com', name: 'Demo User' });
    } finally {
      setLoading(false);
    }
  };

  const { formatCurrency } = useCurrencyFormatter();

  const getFirstName = () => {
    if (user?.name) {
      return user.name.split(' ')[0];
    }
    if (user?.email) {
      const emailName = user.email.split('@')[0];
      return emailName.charAt(0).toUpperCase() + emailName.slice(1);
    }
    return 'User';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-neutral-950 via-neutral-900 to-neutral-950 flex items-center justify-center">
        <div className="flex items-center gap-3 text-neutral-400">
          <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <span>Loading dashboard...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-950 via-neutral-900 to-neutral-950">
      {/* Header */}
      <div className="border-b border-neutral-800 bg-[#17171A]/80 backdrop-blur-xl sticky top-16 z-40">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                <Sparkles className="w-6 h-6 text-purple-500" />
                Welcome back, {getFirstName()}
              </h1>
              <p className="text-sm text-neutral-400 mt-1">Your financial overview at a glance</p>
            </div>
            <button
              onClick={() => router.push('/dashboard/add-assets')}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 rounded-lg text-white font-medium transition-all shadow-lg shadow-purple-500/20"
            >
              <Plus className="w-4 h-4" />
              Add Assets
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {!hasAnyAssets ? (
          /* Empty State */
          <div className="space-y-8">
            {/* Welcome Card */}
            <div className="border border-purple-500/20 rounded-xl bg-gradient-to-br from-purple-500/10 to-blue-500/10 p-8">
              <div className="flex items-start justify-between">
                <div className="flex-1 max-w-2xl">
                  <h2 className="text-3xl font-bold text-white mb-4">
                    Yassou, {getFirstName()}! 👋
                  </h2>
                  <p className="text-neutral-300 text-lg mb-3 leading-relaxed">
                    Here&apos;s where you come to see the overview of your portfolio.
                  </p>
                  <p className="text-neutral-400 text-base mb-6 leading-relaxed">
                    These numbers and charts will come alive when there&apos;s enough data.{' '}
                    <span className="font-semibold text-white">
                      Please add your assets to get started.
                    </span>
                  </p>
                  <button
                    onClick={() => router.push('/dashboard/add-assets')}
                    className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 rounded-lg text-white font-semibold transition-all shadow-lg shadow-purple-500/20"
                  >
                    <Plus className="w-5 h-5" />
                    Add Your First Asset
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
                <div className="hidden md:block ml-8">
                  <div className="w-32 h-32 rounded-full bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center shadow-2xl shadow-purple-500/30">
                    <Wallet className="w-16 h-16 text-white" />
                  </div>
                </div>
              </div>
            </div>

            {/* Sample Stats Preview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Net Worth Card */}
              <div className="border border-green-500/20 rounded-xl bg-green-500/5 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-2 bg-green-500/10 rounded-lg">
                    <DollarSign className="w-5 h-5 text-green-500" />
                  </div>
                  <span className="text-xs text-neutral-500 uppercase tracking-wide">Sample</span>
                </div>
                <p className="text-sm text-neutral-400 mb-1">Net Worth</p>
                <p className="text-3xl font-bold text-white">€1.5M</p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="flex items-center gap-1 text-sm text-green-500">
                    <TrendingUp className="w-3 h-3" />
                    +180%
                  </span>
                  <span className="text-xs text-neutral-500">all time</span>
                </div>
              </div>

              {/* Assets Card */}
              <div className="border border-blue-500/20 rounded-xl bg-blue-500/5 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-2 bg-blue-500/10 rounded-lg">
                    <Wallet className="w-5 h-5 text-blue-500" />
                  </div>
                  <span className="text-xs text-neutral-500 uppercase tracking-wide">Sample</span>
                </div>
                <p className="text-sm text-neutral-400 mb-1">Total Assets</p>
                <p className="text-3xl font-bold text-white">€2M</p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="flex items-center gap-1 text-sm text-green-500">
                    <TrendingUp className="w-3 h-3" />
                    +53%
                  </span>
                  <span className="text-xs text-neutral-500">liquid</span>
                </div>
              </div>

              {/* Debts Card */}
              <div className="border border-red-500/20 rounded-xl bg-red-500/5 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-2 bg-red-500/10 rounded-lg">
                    <BarChart3 className="w-5 h-5 text-red-500" />
                  </div>
                  <span className="text-xs text-neutral-500 uppercase tracking-wide">Sample</span>
                </div>
                <p className="text-sm text-neutral-400 mb-1">Debts</p>
                <p className="text-3xl font-bold text-white">€500K</p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="flex items-center gap-1 text-sm text-red-500">
                    <TrendingDown className="w-3 h-3" />
                    -€24K
                  </span>
                  <span className="text-xs text-neutral-500">paid off</span>
                </div>
              </div>
            </div>

            {/* Sample Charts Preview */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Net Worth Chart Preview */}
              <div className="border border-neutral-800 rounded-xl bg-neutral-900/50 p-6">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-purple-500" />
                  Net Worth Over Time
                </h3>
                <div className="relative h-48 bg-gradient-to-b from-purple-500/20 to-transparent rounded-lg overflow-hidden">
                  <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 100 40">
                    <path
                      d="M0,35 Q10,32 20,30 T40,25 T60,20 T80,15 T100,10"
                      fill="none"
                      stroke="rgba(168, 85, 247, 0.5)"
                      strokeWidth="0.5"
                    />
                    <path
                      d="M0,35 Q10,32 20,30 T40,25 T60,20 T80,15 T100,10 V40 H0 Z"
                      fill="url(#chartGradient)"
                    />
                    <defs>
                      <linearGradient id="chartGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="rgba(168, 85, 247, 0.3)" />
                        <stop offset="100%" stopColor="rgba(168, 85, 247, 0)" />
                      </linearGradient>
                    </defs>
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-4xl font-bold text-neutral-700/50">SAMPLE</span>
                  </div>
                </div>
              </div>

              {/* Allocation Chart Preview */}
              <div className="border border-neutral-800 rounded-xl bg-neutral-900/50 p-6">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <PieChart className="w-5 h-5 text-blue-500" />
                  Asset Allocation
                </h3>
                <div className="flex items-center justify-center h-48">
                  <div className="relative">
                    <svg className="w-32 h-32" viewBox="0 0 100 100">
                      <circle
                        cx="50"
                        cy="50"
                        r="40"
                        fill="none"
                        stroke="#374151"
                        strokeWidth="20"
                      />
                      <circle
                        cx="50"
                        cy="50"
                        r="40"
                        fill="none"
                        stroke="#8B5CF6"
                        strokeWidth="20"
                        strokeDasharray="75 175"
                        transform="rotate(-90 50 50)"
                      />
                      <circle
                        cx="50"
                        cy="50"
                        r="40"
                        fill="none"
                        stroke="#3B82F6"
                        strokeWidth="20"
                        strokeDasharray="50 200"
                        strokeDashoffset="-75"
                        transform="rotate(-90 50 50)"
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-sm font-semibold text-neutral-400">SAMPLE</span>
                    </div>
                  </div>
                  <div className="ml-8 space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-purple-500" />
                      <span className="text-sm text-neutral-300">Stocks</span>
                      <span className="text-sm text-neutral-500 ml-auto">30%</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-blue-500" />
                      <span className="text-sm text-neutral-300">Crypto</span>
                      <span className="text-sm text-neutral-500 ml-auto">20%</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-neutral-600" />
                      <span className="text-sm text-neutral-300">Other</span>
                      <span className="text-sm text-neutral-500 ml-auto">50%</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Populated State - Real Data */
          <div className="space-y-8">
            {/* Net Worth Overview */}
            <div className="border border-neutral-800 rounded-xl bg-neutral-900/50 p-6">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <h2 className="text-sm font-medium text-neutral-400">Net Worth</h2>
                    <span className="inline-flex items-center gap-1 text-xs text-green-500 font-semibold uppercase tracking-wide">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
                      </span>
                      LIVE
                    </span>
                  </div>
                  <p className="text-5xl font-bold text-white mb-2">
                    {formatCurrency(liveNetWorth)}
                  </p>
                  <div className="flex items-center space-x-2">
                    <span
                      className={`flex items-center gap-1 text-sm font-medium ${liveChange >= 0 ? 'text-green-500' : 'text-red-500'}`}
                    >
                      {liveChange >= 0 ? (
                        <TrendingUp className="w-4 h-4" />
                      ) : (
                        <TrendingDown className="w-4 h-4" />
                      )}
                      {liveChange >= 0 ? '+' : ''}
                      {formatCurrency(liveChange)} ({liveChangePercent >= 0 ? '+' : ''}
                      {liveChangePercent.toFixed(2)}%)
                    </span>
                    <span className="text-xs text-neutral-500 uppercase">TODAY</span>
                  </div>
                </div>
                {/* Period Selector */}
                <div className="flex space-x-1 bg-neutral-800/50 rounded-lg p-1">
                  {(['1d', '7d', '30d', '1y', 'all'] as TimePeriod[]).map((period: TimePeriod) => (
                    <button
                      key={period}
                      onClick={() => setSelectedPeriod(period)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                        selectedPeriod === period
                          ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/20'
                          : 'text-neutral-400 hover:text-white hover:bg-neutral-700'
                      }`}
                    >
                      {period.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Stats Cards Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="border border-neutral-800 rounded-xl bg-neutral-900/50 p-4">
                <p className="text-xs font-medium text-neutral-400 mb-1">Investable Assets</p>
                <p className="text-2xl font-bold text-white">
                  {formatCurrency(stats?.investableAssets || 0)}
                </p>
              </div>
              <div className="border border-neutral-800 rounded-xl bg-neutral-900/50 p-4">
                <p className="text-xs font-medium text-neutral-400 mb-1">Cash on Hand</p>
                <p className="text-2xl font-bold text-white">
                  {formatCurrency(stats?.cashOnHand || 0)}
                </p>
              </div>
              <div className="border border-neutral-800 rounded-xl bg-neutral-900/50 p-4">
                <p className="text-xs font-medium text-neutral-400 mb-1">Illiquid</p>
                <p className="text-2xl font-bold text-white">
                  {formatCurrency(stats?.illiquid || 0)}
                </p>
              </div>
              <div className="border border-red-500/20 rounded-xl bg-red-500/5 p-4">
                <p className="text-xs font-medium text-neutral-400 mb-1">Debts</p>
                <p className="text-2xl font-bold text-red-500">
                  {formatCurrency(stats?.debts || 0)}
                </p>
              </div>
            </div>

            {/* Allocations and Top Holdings */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Allocation Chart */}
              <div className="border border-neutral-800 rounded-xl bg-neutral-900/50 p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                    <PieChart className="w-5 h-5 text-blue-500" />
                    Allocation by Category
                  </h3>
                </div>
                {allocations.length > 0 ? (
                  <div className="space-y-3">
                    {allocations.map((item: AllocationItem, index: number) => (
                      <div key={index} className="flex items-center justify-between">
                        <div className="flex items-center space-x-3 flex-1">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: item.color }}
                          />
                          <span className="text-sm text-neutral-300">{item.name}</span>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-white">
                            {formatCurrency(item.value)}
                          </p>
                          <p className="text-xs text-neutral-500">{item.percentage.toFixed(1)}%</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center justify-center py-12 text-neutral-500">
                    No allocations yet
                  </div>
                )}
              </div>

              {/* Top Holdings */}
              <div className="border border-neutral-800 rounded-xl bg-neutral-900/50 p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-green-500" />
                    Top Holdings
                  </h3>
                  <button
                    onClick={() => router.push('/portfolio')}
                    className="text-sm text-blue-500 hover:text-blue-400 flex items-center gap-1"
                  >
                    View All
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
                {topHoldings.length > 0 ? (
                  <div className="space-y-3">
                    {topHoldings.map((holding: TopHolding, index: number) => (
                      <div
                        key={index}
                        className="flex items-center justify-between py-2 border-b border-neutral-800 last:border-0"
                      >
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center shadow-lg">
                            <span className="text-xs font-bold text-white">{index + 1}</span>
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-white">{holding.symbol}</p>
                            <p className="text-xs text-neutral-500">{holding.name}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-white">
                            {formatCurrency(holding.value)}
                          </p>
                          <p className="text-xs text-neutral-500">
                            {holding.percentage.toFixed(1)}%
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center justify-center py-12 text-neutral-500">
                    No holdings yet
                  </div>
                )}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex flex-wrap gap-4">
              <button
                onClick={() => router.push('/portfolio')}
                className="flex items-center gap-2 px-6 py-3 bg-neutral-800 hover:bg-neutral-700 rounded-lg text-white font-medium transition-colors"
              >
                <Wallet className="w-4 h-4" />
                View Full Portfolio
              </button>
              <button
                onClick={() => router.push('/dashboard/add-assets')}
                className="flex items-center gap-2 px-6 py-3 border border-neutral-700 hover:border-neutral-600 hover:bg-neutral-800/50 rounded-lg text-white font-medium transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add More Assets
              </button>
              <button
                onClick={() => router.push('/markets')}
                className="flex items-center gap-2 px-6 py-3 border border-neutral-700 hover:border-neutral-600 hover:bg-neutral-800/50 rounded-lg text-white font-medium transition-colors"
              >
                <BarChart3 className="w-4 h-4" />
                Explore Markets
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
