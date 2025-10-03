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

interface User {
  email: string;
  name?: string;
}

interface PortfolioStats {
  netWorth: number;
  assets: number;
  debts: number;
  investableAssets: number;
  cashOnHand: number;
  illiquid: number;
}

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [stats, setStats] = useState<PortfolioStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasAssets, setHasAssets] = useState(false);
  const { darkMode, setDarkMode } = usePreferences();

  useEffect(() => {
    checkAuth();
  }, []);

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
      // Check if user has any portfolio data
      const response = await fetch('http://localhost:8000/api/portfolio', {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        const hasData = data && data.length > 0;
        setHasAssets(hasData);

        if (hasData) {
          // TODO: Calculate stats from portfolio data
          setStats({
            netWorth: 0,
            assets: 0,
            debts: 0,
            investableAssets: 0,
            cashOnHand: 0,
            illiquid: 0,
          });
        } else {
          setStats({
            netWorth: 0,
            assets: 0,
            debts: 0,
            investableAssets: 0,
            cashOnHand: 0,
            illiquid: 0,
          });
        }
      } else {
        setStats({
          netWorth: 0,
          assets: 0,
          debts: 0,
          investableAssets: 0,
          cashOnHand: 0,
          illiquid: 0,
        });
        setHasAssets(false);
      }
    } catch (error) {
      console.error('Failed to fetch portfolio:', error);
      setStats({
        netWorth: 0,
        assets: 0,
        debts: 0,
        investableAssets: 0,
        cashOnHand: 0,
        illiquid: 0,
      });
      setHasAssets(false);
    }
  };

  const fmt = useCurrencyFormatter('EUR');
  const formatCurrency = (amount: number) => fmt(amount);

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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 transition-colors">
      {/* Navigation Bar */}
      <nav className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-6 py-4 transition-colors">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center space-x-4">
            <Menu className="w-6 h-6 text-gray-600 cursor-pointer" />
            <div className="flex items-center gap-2 select-none">
              <svg
                className="w-6 h-6"
                viewBox="0 0 32 32"
                fill="none"
                role="img"
                aria-label="Lokifi Logo"
              >
                <circle
                  cx="16"
                  cy="16"
                  r="16"
                  className="fill-black dark:fill-white transition-colors"
                />
                <path
                  d="M11 9v14h10"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="stroke-white dark:stroke-black"
                />
              </svg>
              <span className="text-xl font-bold tracking-wide">Lokifi</span>
            </div>
          </div>
          <div className="flex items-center space-x-6">
            <button className="p-2 hover:bg-gray-100 rounded-lg">
              <Bell className="w-5 h-5 text-gray-600" />
            </button>
            <button className="p-2 hover:bg-gray-100 rounded-lg">
              <Search className="w-5 h-5 text-gray-600" />
            </button>
            <button className="p-2 hover:bg-gray-100 rounded-lg">
              <Share2 className="w-5 h-5 text-gray-600" />
            </button>
            <button
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
              title="Cycle Theme"
              onClick={() => {
                const order = ['off', 'on', 'oled', 'off'];
                const next = order[(order.indexOf(darkMode) + 1) % order.length] as any;
                setDarkMode(next);
              }}
            >
              <Settings className="w-5 h-5 text-gray-600 dark:text-gray-300" />
            </button>
            <span className="text-sm text-gray-600">EUR €</span>
            <span className="text-sm font-medium text-gray-900 hidden sm:inline-block">
              {getFirstName()}
            </span>
            <ProfileDropdown
              user={user}
              onSignOut={() => {
                setUser(null);
              }}
              onUpdateUser={(u) => setUser((prev) => ({ ...prev, ...u }) as any)}
            />
          </div>
        </div>
      </nav>

      <div className="flex">
        {/* Sidebar */}
        <aside className="w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 min-h-screen p-4 transition-colors">
          <nav className="space-y-1">
            <a
              href="/dashboard"
              className="flex items-center justify-between px-4 py-3 bg-gray-100 dark:bg-gray-800 rounded-lg text-gray-900 dark:text-gray-100 font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              <div className="flex items-center space-x-3">
                <Wallet className="w-5 h-5" />
                <span>Net Worth</span>
              </div>
              <span className="text-sm text-gray-500">{formatCurrency(stats?.netWorth || 0)}</span>
            </a>
            <a
              href="/dashboard/assets"
              className="flex items-center justify-between px-4 py-3 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            >
              <div className="flex items-center space-x-3">
                <TrendingUp className="w-5 h-5" />
                <span>Assets</span>
              </div>
              <span className="text-sm text-gray-500">{formatCurrency(stats?.assets || 0)}</span>
            </a>
            <a
              href="/dashboard/debts"
              className="flex items-center justify-between px-4 py-3 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
            >
              <div className="flex items-center space-x-3">
                <AlertCircle className="w-5 h-5" />
                <span>Debts</span>
              </div>
              <span className="text-sm text-gray-500">{formatCurrency(stats?.debts || 0)}</span>
            </a>
            <a
              href="/dashboard/recap"
              className="flex items-center space-x-3 px-4 py-3 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
            >
              <PieChart className="w-5 h-5" />
              <span>Recap</span>
            </a>
            <a
              href="/dashboard/fast-forward"
              className="flex items-center space-x-3 px-4 py-3 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 7l5 5m0 0l-5 5m5-5H6"
                />
              </svg>
              <span>Fast Forward</span>
            </a>
            <a
              href="/dashboard/beneficiary"
              className="flex items-center space-x-3 px-4 py-3 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                />
              </svg>
              <span>Beneficiary</span>
            </a>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-8 overflow-auto">
          {!hasAssets ? (
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
                      Here's where you come to see the overview of your portfolio.
                    </p>
                    <p className="text-gray-700 text-lg mb-4 leading-relaxed">
                      These numbers and charts will come alive when there's enough data.{' '}
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

              {/* Stats Preview Cards */}
              <div className="grid grid-cols-3 gap-6 mt-8">
                {/* Net Worth Card */}
                <Card className="p-6 bg-white shadow-sm rounded-2xl border border-gray-200">
                  <div className="mb-6">
                    <p className="text-sm text-gray-500 mb-2 font-medium">Net Worth</p>
                    <p className="text-4xl font-semibold text-gray-900">€1.5 Million</p>
                    <p className="text-xs text-gray-400 mt-2">1 DAY</p>
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
            // TODO: Populated State - Will be implemented after you send the second image
            <div className="max-w-5xl mx-auto">
              <h2 className="text-2xl font-semibold text-gray-900 mb-6">
                Welcome back, {getFirstName()}!
              </h2>
              <p className="text-gray-600">
                Your portfolio with assets will be displayed here once you send the populated state
                image...
              </p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
