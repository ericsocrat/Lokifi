'use client';

import { Card } from '@/components/ui/card';
import { usePreferences } from '@/src/components/dashboard/PreferencesContext';
import { ProfileDropdown } from '@/src/components/dashboard/ProfileDropdown';
import { useCurrencyFormatter } from '@/src/components/dashboard/useCurrencyFormatter';
import {
  AlertCircle,
  Bell,
  Menu,
  PieChart,
  Search,
  Settings,
  Share2,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button } from '../../components/ui/button';
import {
  getStats,
  hasAssets as checkHasAssets,
  getAllocationByCategory,
  getTopHoldings,
  getNetWorthChange,
  type DashboardStats,
  type AllocationItem,
  type TopHolding,
} from '@/src/lib/dashboardData';
import { usePortfolioPrices } from '@/src/hooks/useMarketData';
import { loadPortfolio } from '@/src/lib/portfolioStorage';

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
  const [netWorthData, setNetWorthData] = useState({ value: 0, change: 0, changePercent: 0 });
  const { darkMode, setDarkMode } = usePreferences();

  // Get live portfolio data from master market data service
  const portfolio = loadPortfolio();
  const holdings = portfolio.flatMap((section: any) =>
    section.assets.map((asset: any) => ({
      symbol: asset.symbol,
      shares: asset.shares,
    }))
  );
  
  const { totalValue: liveNetWorth, totalChange: liveChange, totalChangePercent: liveChangePercent } = 
    usePortfolioPrices(holdings);

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    // Load portfolio data
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

        const holdings = getTopHoldings(5);
        setTopHoldings(holdings);

        // Use live net worth instead of static data
        setNetWorthData({
          value: liveNetWorth,
          change: liveChange,
          changePercent: liveChangePercent
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
        // Backend not available or not authenticated
        // For demo purposes, use a default user
        setUser({ email: 'demo@example.com', name: 'Demo User' });
        await fetchPortfolioData();
        setLoading(false);
        return;
      }

      const userData = await response.json();
      setUser(userData);

      // Fetch portfolio data
      await fetchPortfolioData();
    } catch (error) {
      console.error('Auth check failed:', error);
      // Backend not available - use demo mode
      setUser({ email: 'demo@example.com', name: 'Demo User' });
      await fetchPortfolioData();
    } finally {
      setLoading(false);
    }
  };

  const fetchPortfolioData = async () => {
    try {
      // Load portfolio data from storage (no longer from API)
      setLoading(false);
    } catch (error) {
      console.error('Auth check failed:', error);
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
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
          {!hasAnyAssets ? (
            // Empty State - Welcome Message
            <div className="max-w-5xl mx-auto">
              <Card className="p-10 bg-white shadow-sm rounded-2xl border border-gray-200">
                <div className="flex items-start justify-between">
                  <div className="flex-1 max-w-2xl">
                    <h2 className="text-3xl font-semibold text-gray-900 mb-6">
                      Yassou, {getFirstName()}
                      <span className="text-blue-600">*</span>
                    </h2>
                    <p className="text-gray-700 text-lg mb-3 leading-relaxed">
                      Here&apos;s where you come to see the overview of your portfolio.
                    </p>
                    <p className="text-gray-700 text-lg mb-4 leading-relaxed">
                      These numbers and charts will come alive when there&apos;s enough data.{' '}
                      <span className="font-semibold text-gray-900">
                        Please add your assets to get started.
                      </span>
                    </p>
                    <p className="text-gray-500 text-base mb-8">
                      You will be notified when the dashboard is ready.
                    </p>
                    <Button
                      onClick={() => router.push('/dashboard/add-assets')}
                      className="bg-black hover:bg-gray-800 text-white px-8 py-3 rounded-lg font-medium text-base shadow-sm transition-all"
                    >
                      Add Assets
                    </Button>
                  </div>
                  <div className="ml-12">
                    <div className="w-32 h-32 rounded-full bg-gray-900 flex items-center justify-center">
                      <div className="w-24 h-24 rounded-full bg-gray-800"></div>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Stats Preview Cards - Show SAMPLE data when empty */}
              <div className="grid grid-cols-3 gap-6 mt-8">
                {/* Net Worth Card */}
                <Card className="p-6 bg-white shadow-sm rounded-2xl border border-gray-200">
                  <div className="mb-6">
                    <p className="text-sm text-gray-500 mb-2 font-medium">Net Worth</p>
                    <p className="text-4xl font-semibold text-gray-900">€1.5 Million</p>
                    <p className="text-xs text-gray-400 mt-2">SAMPLE DATA</p>
                  </div>
                  <div className="mb-6">
                    <p className="text-sm text-gray-500 mb-2 flex items-center">
                      Investable Assets
                      <span className="ml-1 w-4 h-4 rounded-full bg-gray-200 flex items-center justify-center text-xs text-gray-600">
                        ⓘ
                      </span>
                    </p>
                    <p className="text-2xl font-semibold text-gray-900">€1.2 Million</p>
                  </div>
                  <div className="grid grid-cols-3 gap-3 text-xs">
                    <div>
                      <p className="text-green-600 mb-1 font-medium">NET WORTH</p>
                      <p className="text-green-600 font-semibold text-sm">+180%</p>
                    </div>
                    <div>
                      <p className="text-green-600 mb-1 font-medium">INVESTABLE</p>
                      <p className="text-green-600 font-semibold text-sm">+150%</p>
                    </div>
                    <div>
                      <p className="text-green-600 mb-1 font-medium">T-BILL</p>
                      <p className="text-green-600 font-semibold text-sm">+200%</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-xs mt-3">
                    <div>
                      <p className="text-green-600 mb-1 font-medium">S&P500</p>
                      <p className="text-green-600 font-semibold text-sm">+140%</p>
                    </div>
                    <div>
                      <p className="text-green-600 mb-1 font-medium">DOW JONES</p>
                      <p className="text-green-600 font-semibold text-sm">+150%</p>
                    </div>
                  </div>
                </Card>

                {/* Assets Card */}
                <Card className="p-6 bg-white shadow-sm rounded-2xl border border-gray-200">
                  <div className="mb-6">
                    <p className="text-sm text-gray-500 mb-2 font-medium">Assets</p>
                    <p className="text-4xl font-semibold text-gray-900">€2 Million</p>
                    <p className="text-xs text-gray-400 mt-2">1 DAY</p>
                  </div>
                  <div className="space-y-4 mt-8">
                    <div>
                      <p className="text-sm text-gray-600 mb-1 font-medium">LIQUID</p>
                      <p className="text-green-600 text-base font-semibold">+€36,244 (53%)</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 mb-1 font-medium">ILLIQUID</p>
                      <p className="text-green-600 text-base font-semibold">+€200,345 (103%)</p>
                    </div>
                  </div>
                </Card>

                {/* Debts Card */}
                <Card className="p-6 bg-white shadow-sm rounded-2xl border border-gray-200">
                  <div className="mb-6">
                    <p className="text-sm text-gray-500 mb-2 font-medium">Debts</p>
                    <p className="text-4xl font-semibold text-gray-900">€500,000</p>
                    <p className="text-xs text-gray-400 mt-2">1 DAY</p>
                  </div>
                  <div className="space-y-4 mt-8">
                    <div>
                      <p className="text-sm text-gray-600 mb-1 font-medium">LOAN</p>
                      <p className="text-red-600 text-base font-semibold">-€0</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 mb-1 font-medium">MORTGAGE</p>
                      <p className="text-green-600 text-base font-semibold">+€24,000 (100%)</p>
                    </div>
                  </div>
                </Card>
              </div>

              {/* Additional Cards Row */}
              <div className="grid grid-cols-2 gap-6 mt-6">
                <Card className="p-6 bg-white shadow-sm rounded-2xl border border-gray-200">
                  <p className="text-sm text-gray-500 mb-2 flex items-center font-medium">
                    Cash on Hand
                    <span className="ml-1 w-4 h-4 rounded-full bg-gray-200 flex items-center justify-center text-xs text-gray-600">
                      ⓘ
                    </span>
                  </p>
                  <p className="text-3xl font-semibold text-gray-900">€100,000</p>
                </Card>

                <Card className="p-6 bg-white shadow-sm rounded-2xl border border-gray-200">
                  <p className="text-sm text-gray-500 mb-2 flex items-center font-medium">
                    Illiquid
                    <span className="ml-1 w-4 h-4 rounded-full bg-gray-200 flex items-center justify-center text-xs text-gray-600">
                      ⓘ
                    </span>
                  </p>
                  <p className="text-3xl font-semibold text-gray-900">€120,000</p>
                </Card>
              </div>

              {/* Net Worth Chart */}
              <div className="mt-8">
                <Card className="p-8 bg-white shadow-sm rounded-2xl border border-gray-200">
                  <h3 className="text-xl font-semibold mb-6 text-gray-900">Net Worth</h3>
                  <div className="relative h-80 bg-gradient-to-b from-purple-100 via-purple-150 to-purple-200 rounded-xl overflow-hidden">
                    <svg
                      className="w-full h-full"
                      preserveAspectRatio="none"
                      viewBox="0 0 1000 320"
                    >
                      <path
                        d="M0,160 Q100,140 200,145 T400,155 T600,140 T800,150 T1000,145"
                        fill="url(#gradient)"
                        stroke="none"
                      />
                      <defs>
                        <linearGradient id="gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                          <stop offset="0%" stopColor="rgba(196, 181, 253, 0.6)" />
                          <stop offset="100%" stopColor="rgba(196, 181, 253, 0.1)" />
                        </linearGradient>
                      </defs>
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <p className="text-8xl font-bold text-gray-300 opacity-20 select-none">
                        SAMPLE
                      </p>
                    </div>
                  </div>
                </Card>
              </div>

              {/* Allocations Charts */}
              <div className="mt-8">
                <Card className="p-8 bg-white shadow-sm rounded-2xl border border-gray-200">
                  <h3 className="text-xl font-semibold mb-8 text-gray-900">Allocations</h3>
                  <div className="grid grid-cols-2 gap-12">
                    {/* Left Donut Chart */}
                    <div className="relative flex flex-col items-center">
                      <div className="relative w-64 h-64">
                        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                          <circle
                            cx="50"
                            cy="50"
                            r="35"
                            fill="none"
                            stroke="#e5e7eb"
                            strokeWidth="12"
                          />
                          <circle
                            cx="50"
                            cy="50"
                            r="35"
                            fill="none"
                            stroke="#c4b5fd"
                            strokeWidth="12"
                            strokeDasharray="70 150"
                            strokeLinecap="round"
                          />
                          <circle
                            cx="50"
                            cy="50"
                            r="35"
                            fill="none"
                            stroke="#a78bfa"
                            strokeWidth="12"
                            strokeDasharray="50 150"
                            strokeDashoffset="-70"
                            strokeLinecap="round"
                          />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <p className="text-4xl font-bold text-gray-300 opacity-30 select-none">
                            SAMPLE
                          </p>
                        </div>
                      </div>
                      <div className="mt-6 space-y-2 text-sm">
                        <div className="flex items-center space-x-2">
                          <div className="w-3 h-3 rounded-full bg-purple-300"></div>
                          <span className="text-gray-600">Stocks</span>
                          <span className="text-gray-400 ml-auto">12%</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <div className="w-3 h-3 rounded-full bg-purple-400"></div>
                          <span className="text-gray-600">Crypto</span>
                          <span className="text-gray-400 ml-auto">18%</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <div className="w-3 h-3 rounded-full bg-gray-300"></div>
                          <span className="text-gray-600">Other</span>
                          <span className="text-gray-400 ml-auto">70%</span>
                        </div>
                      </div>
                    </div>

                    {/* Right Donut Chart */}
                    <div className="relative flex flex-col items-center">
                      <div className="relative w-64 h-64">
                        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                          <circle
                            cx="50"
                            cy="50"
                            r="35"
                            fill="none"
                            stroke="#e5e7eb"
                            strokeWidth="12"
                          />
                          <circle
                            cx="50"
                            cy="50"
                            r="35"
                            fill="none"
                            stroke="#c4b5fd"
                            strokeWidth="12"
                            strokeDasharray="80 150"
                            strokeLinecap="round"
                          />
                          <circle
                            cx="50"
                            cy="50"
                            r="35"
                            fill="none"
                            stroke="#a78bfa"
                            strokeWidth="12"
                            strokeDasharray="40 150"
                            strokeDashoffset="-80"
                            strokeLinecap="round"
                          />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <p className="text-4xl font-bold text-gray-300 opacity-30 select-none">
                            SAMPLE
                          </p>
                        </div>
                      </div>
                      <div className="mt-6 space-y-2 text-sm">
                        <div className="flex items-center space-x-2">
                          <div className="w-3 h-3 rounded-full bg-purple-300"></div>
                          <span className="text-gray-600">Technology</span>
                          <span className="text-gray-400 ml-auto">36%</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <div className="w-3 h-3 rounded-full bg-purple-400"></div>
                          <span className="text-gray-600">Equities</span>
                          <span className="text-gray-400 ml-auto">28%</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <div className="w-3 h-3 rounded-full bg-gray-300"></div>
                          <span className="text-gray-600">Other</span>
                          <span className="text-gray-400 ml-auto">36%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          ) : (
            // Populated State - Show Real Data
            <div className="max-w-5xl mx-auto">
              {/* Net Worth Overview */}
              <Card className="p-8 bg-white dark:bg-gray-900 shadow-sm rounded-2xl border border-gray-200 dark:border-gray-800 mb-8 transition-colors">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400">Net Worth</h2>
                      <span className="inline-flex items-center gap-1 text-xs text-green-600 dark:text-green-400 font-semibold uppercase tracking-wide">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                        </span>
                        LIVE
                      </span>
                    </div>
                    <p className="text-5xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                      {formatCurrency(liveNetWorth)}
                    </p>
                    <div className="flex items-center space-x-2">
                      <span className={`text-sm font-medium ${liveChange >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                        {liveChange >= 0 ? '↑ +' : '↓ '}{formatCurrency(Math.abs(liveChange))} ({liveChangePercent >= 0 ? '+' : ''}{liveChangePercent.toFixed(2)}%)
                      </span>
                      <span className="text-xs text-gray-400 dark:text-gray-500 uppercase">TODAY</span>
                    </div>
                  </div>
                  {/* Period Selector */}
                  <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
                    {(['1d', '7d', '30d', '1y', 'all'] as TimePeriod[]).map((period: any) => (
                      <button
                        key={period}
                        onClick={() => setSelectedPeriod(period)}
                        className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                          selectedPeriod === period
                            ? 'bg-white text-gray-900 shadow-sm'
                            : 'text-gray-600 hover:text-gray-900'
                        }`}
                      >
                        {period.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>
              </Card>

              {/* Stats Cards Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <Card className="p-4 bg-white shadow-sm rounded-lg border border-gray-200">
                  <p className="text-xs font-medium text-gray-500 mb-1">Investable Assets</p>
                  <p className="text-2xl font-semibold text-gray-900">{formatCurrency(stats?.investableAssets || 0)}</p>
                </Card>
                <Card className="p-4 bg-white shadow-sm rounded-lg border border-gray-200">
                  <p className="text-xs font-medium text-gray-500 mb-1">Cash on Hand</p>
                  <p className="text-2xl font-semibold text-gray-900">{formatCurrency(stats?.cashOnHand || 0)}</p>
                </Card>
                <Card className="p-4 bg-white shadow-sm rounded-lg border border-gray-200">
                  <p className="text-xs font-medium text-gray-500 mb-1">Illiquid</p>
                  <p className="text-2xl font-semibold text-gray-900">{formatCurrency(stats?.illiquid || 0)}</p>
                </Card>
                <Card className="p-4 bg-white shadow-sm rounded-lg border border-gray-200">
                  <p className="text-xs font-medium text-gray-500 mb-1">Debts</p>
                  <p className="text-2xl font-semibold text-red-600">{formatCurrency(stats?.debts || 0)}</p>
                </Card>
              </div>

              {/* Allocations and Top Holdings */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                {/* Allocation Chart */}
                <Card className="p-6 bg-white shadow-sm rounded-2xl border border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900 mb-6">Allocation by Category</h3>
                  {allocations.length > 0 ? (
                    <div className="space-y-3">
                      {allocations.map((item: any, index: any) => (
                        <div key={index} className="flex items-center justify-between">
                          <div className="flex items-center space-x-2 flex-1">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                            <span className="text-sm text-gray-700">{item.name}</span>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-semibold text-gray-900">{formatCurrency(item.value)}</p>
                            <p className="text-xs text-gray-500">{item.percentage.toFixed(1)}%</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-center py-8">No allocations yet</p>
                  )}
                </Card>

                {/* Top Holdings */}
                <Card className="p-6 bg-white shadow-sm rounded-2xl border border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900 mb-6">Top Holdings</h3>
                  {topHoldings.length > 0 ? (
                    <div className="space-y-3">
                      {topHoldings.map((holding: any, index: any) => (
                        <div key={index} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
                              <span className="text-xs font-semibold text-purple-600">{index + 1}</span>
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-gray-900">{holding.symbol}</p>
                              <p className="text-xs text-gray-500">{holding.name}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-semibold text-gray-900">{formatCurrency(holding.value)}</p>
                            <p className="text-xs text-gray-500">{holding.percentage.toFixed(1)}%</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-center py-8">No holdings yet</p>
                  )}
                </Card>
              </div>

              {/* Quick Actions */}
              <div className="flex space-x-4">
                <Button
                  onClick={() => router.push('/portfolio')}
                  className="bg-black hover:bg-gray-800 text-white px-6 py-3 rounded-lg font-medium"
                >
                  View Full Portfolio
                </Button>
                <Button
                  onClick={() => router.push('/dashboard/add-assets')}
                  variant="outline"
                  className="px-6 py-3 rounded-lg font-medium"
                >
                  Add More Assets
                </Button>
              </div>
            </div>
          )}
    </div>
  );
}
