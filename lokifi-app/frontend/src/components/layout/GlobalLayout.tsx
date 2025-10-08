'use client';

import { usePathname, useRouter } from 'next/navigation';
import { usePreferences } from '@/src/components/dashboard/PreferencesContext';
import { useAuth } from '@/src/components/AuthProvider';
import { AuthModal } from '@/src/components/AuthModal';
import { NotificationBell } from '@/components/NotificationBell';
import { useState, useCallback, useMemo } from 'react';
import {
  LayoutDashboard,
  TrendingUp,
  Wallet,
  CreditCard,
  Clock,
  BarChart3,
  Search,
  Bell,
  Settings,
  Menu,
  X,
  User,
  Sun,
  Moon,
} from 'lucide-react';

interface GlobalLayoutProps {
  children: React.ReactNode;
}

export function GlobalLayout({ children }: GlobalLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { darkMode, setDarkMode, currency, setCurrency } = usePreferences();
  const { user, loading } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalTab, setAuthModalTab] = useState<'login' | 'register'>('login');

  // Memoize derived state to prevent unnecessary re-renders
  const isLoggedIn = useMemo(() => !!user, [user]);
  const displayName = useMemo(() => {
    if (!user) return '';
    return user.username ? `@${user.username}` : user.email?.split('@')[0] || 'User';
  }, [user]);
  
  // Memoize callbacks to prevent re-creating functions
  const handleOpenLogin = useCallback(() => {
    setAuthModalTab('login');
    setIsAuthModalOpen(true);
  }, []);
  
  const handleCloseAuthModal = useCallback(() => {
    setIsAuthModalOpen(false);
  }, []);

  const navigationItems = [
    {
      name: 'Net Worth',
      href: '/dashboard',
      icon: LayoutDashboard,
      description: 'Overview',
    },
    {
      name: 'Portfolio',
      href: '/portfolio',
      icon: Wallet,
      description: 'Holdings',
    },
    {
      name: 'Markets',
      href: '/markets',
      icon: TrendingUp,
      description: 'Live Prices',
    },
    {
      name: 'Debts',
      href: '/debts',
      icon: CreditCard,
      description: 'Liabilities',
    },
    {
      name: 'Recap',
      href: '/recap',
      icon: Clock,
      description: 'History',
    },
    {
      name: 'Chart',
      href: '/chart',
      icon: BarChart3,
      description: 'Analytics',
    },
    {
      name: 'Alerts',
      href: '/alerts',
      icon: Bell,
      description: 'Notifications',
    },
    {
      name: 'AI Research',
      href: '/ai-research',
      icon: Search,
      description: 'Insights',
    },
  ];

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard' || pathname === '/';
    return pathname?.startsWith(href);
  };

  const currencies = ['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD'];

  return (
    <div className={`min-h-screen ${darkMode ? 'dark' : ''}`}>
      <div className="flex h-screen bg-gray-50 dark:bg-gray-950">
        {/* Sidebar */}
        <aside
          className={`${
            sidebarOpen ? 'w-64' : 'w-20'
          } bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 transition-all duration-300 flex flex-col`}
        >
          {/* Logo & Toggle */}
          <div className="h-16 flex items-center justify-between px-4 border-b border-gray-200 dark:border-gray-800">
            <button
              onClick={() => router.push('/dashboard')}
              className="flex items-center gap-3 group"
            >
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow">
                <span className="text-white font-bold text-xl">L</span>
              </div>
              {sidebarOpen && (
                <span className="font-bold text-xl bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  Lokifi
                </span>
              )}
            </button>
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              aria-label="Toggle sidebar"
            >
              {sidebarOpen ? (
                <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              ) : (
                <Menu className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              )}
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {navigationItems.map((item: any) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              
              return (
                <button
                  key={item.href}
                  onClick={() => router.push(item.href)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${
                    active
                      ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
                >
                  <Icon className={`w-5 h-5 flex-shrink-0 ${active ? 'text-blue-600 dark:text-blue-400' : ''}`} />
                  {sidebarOpen && (
                    <div className="flex-1 text-left">
                      <div className={`font-medium ${active ? 'text-blue-600 dark:text-blue-400' : ''}`}>
                        {item.name}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-500">
                        {item.description}
                      </div>
                    </div>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Footer Settings */}
          <div className="p-4 border-t border-gray-200 dark:border-gray-800 space-y-2">
            <button
              onClick={() => router.push('/settings')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors`}
            >
              <Settings className="w-5 h-5 flex-shrink-0" />
              {sidebarOpen && <span className="font-medium">Settings</span>}
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Top Header */}
          <header className="h-16 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between px-6">
            {/* Search Bar */}
            <div className="flex-1 max-w-xl">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search cryptocurrencies..."
                  value={searchQuery}
                  onChange={(e: any) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-gray-100 dark:bg-gray-800 border border-transparent focus:border-blue-500 dark:focus:border-blue-500 rounded-lg text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none transition-colors"
                />
              </div>
            </div>

            {/* Right Side Actions */}
            <div className="flex items-center gap-4 ml-6">
              {/* Currency Selector */}
              <select
                value={currency}
                onChange={(e: any) => setCurrency(e.target.value)}
                className="px-3 py-2 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors cursor-pointer"
              >
                {currencies.map((curr: any) => (
                  <option key={curr} value={curr}>
                    {curr} €
                  </option>
                ))}
              </select>

              {/* Dark Mode Toggle */}
              <button
                onClick={() => setDarkMode(!darkMode)}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                aria-label="Toggle dark mode"
              >
                {darkMode ? (
                  <Sun className="w-5 h-5 text-yellow-500" />
                ) : (
                  <Moon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                )}
              </button>

              {/* Authentication Section */}
              <div className="flex items-center gap-3 pl-4 border-l border-gray-200 dark:border-gray-800">
                {loading ? (
                  // Loading skeleton
                  <div className="flex items-center gap-3 animate-pulse">
                    <div className="w-10 h-10 rounded-lg bg-gray-200 dark:bg-gray-800" />
                  </div>
                ) : isLoggedIn ? (
                  <>
                    {/* Notification Bell */}
                    <NotificationBell />

                    {/* User Profile Link */}
                    <button
                      onClick={() => router.push('/profile')}
                      className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg transition-all hover:shadow-lg hover:shadow-blue-500/10"
                      aria-label="User profile"
                    >
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                        <User size={16} className="text-white" />
                      </div>
                      <span className="text-sm font-medium text-gray-900 dark:text-white hidden sm:inline">
                        {displayName}
                      </span>
                    </button>
                  </>
                ) : (
                  <>
                    {/* Bell icon (non-functional when logged out) */}
                    <button
                      disabled
                      className="p-2 text-gray-400 dark:text-gray-600 cursor-not-allowed"
                      title="Login to view notifications"
                    >
                      <Bell size={20} />
                    </button>

                    {/* Log In / Sign Up Button */}
                    <button
                      onClick={handleOpenLogin}
                      className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg transition-colors hover:shadow-lg hover:shadow-blue-500/20"
                      aria-label="Log in or sign up"
                    >
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                        <User size={16} className="text-white" />
                      </div>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        Log In / Sign Up
                      </span>
                    </button>
                  </>
                )}
              </div>
            </div>
          </header>

          {/* Page Content */}
          <main className="flex-1 overflow-auto bg-gray-50 dark:bg-gray-950">
            {children}
          </main>
        </div>
      </div>

      {/* Auth Modal */}
      {isAuthModalOpen && (
        <AuthModal initialMode={authModalTab} onClose={handleCloseAuthModal} />
      )}
    </div>
  );
}
