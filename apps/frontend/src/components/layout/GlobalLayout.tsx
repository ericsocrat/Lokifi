'use client';

import { NotificationBell } from '@/components/NotificationBell';
import { AuthModal } from '@/src/components/AuthModal';
import { useAuth } from '@/src/components/AuthProvider';
import { usePreferences } from '@/src/components/dashboard/PreferencesContext';
import {
  BarChart3,
  Bell,
  Clock,
  CreditCard,
  LayoutDashboard,
  Menu,
  Moon,
  Search,
  Settings,
  Sun,
  TrendingUp,
  User,
  Wallet,
  X,
} from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { useCallback, useMemo, useState } from 'react';

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
          } bg-surface-50 border-r border-surface-300/50 transition-all duration-300 flex flex-col`}
        >
          {/* Logo & Toggle */}
          <div className="h-16 flex items-center justify-between px-4 border-b border-surface-300/50">
            <button
              onClick={() => router.push('/dashboard')}
              className="flex items-center gap-3 group"
            >
              <div className="w-10 h-10 bg-gradient-to-br from-lokifi to-electric rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-lokifi/30 group-hover:scale-105 transition-all duration-200">
                <span className="text-white font-bold text-xl">L</span>
              </div>
              {sidebarOpen && <span className="font-bold text-xl text-gradient">Lokifi</span>}
            </button>
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 rounded-lg hover:bg-surface-200 transition-colors"
              aria-label="Toggle sidebar"
            >
              {sidebarOpen ? (
                <X className="w-5 h-5 text-gray-400" />
              ) : (
                <Menu className="w-5 h-5 text-gray-400" />
              )}
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);

              return (
                <button
                  key={item.href}
                  onClick={() => router.push(item.href)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${
                    active
                      ? 'bg-gradient-to-r from-lokifi/15 to-electric/10 text-lokifi-light border border-lokifi/20'
                      : 'text-gray-400 hover:bg-surface-200 hover:text-white'
                  }`}
                >
                  <Icon className={`w-5 h-5 flex-shrink-0 ${active ? 'text-lokifi-light' : ''}`} />
                  {sidebarOpen && (
                    <div className="flex-1 text-left">
                      <div className={`font-medium ${active ? 'text-lokifi-light' : ''}`}>
                        {item.name}
                      </div>
                      <div className="text-xs text-gray-500">{item.description}</div>
                    </div>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Footer Settings */}
          <div className="p-4 border-t border-surface-300/50 space-y-2">
            <button
              onClick={() => router.push('/settings')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-400 hover:bg-surface-200 hover:text-white transition-all duration-200`}
            >
              <Settings className="w-5 h-5 flex-shrink-0" />
              {sidebarOpen && <span className="font-medium">Settings</span>}
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Top Header */}
          <header className="h-16 bg-surface-50/80 backdrop-blur-xl border-b border-surface-300/50 flex items-center justify-between px-6">
            {/* Search Bar */}
            <div className="flex-1 max-w-xl">
              <div className="relative group">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500 group-focus-within:text-lokifi-light transition-colors" />
                <input
                  type="text"
                  placeholder="Search cryptocurrencies..."
                  value={searchQuery}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setSearchQuery(e.target.value)
                  }
                  className="w-full pl-10 pr-4 py-2.5 bg-surface-100 border border-surface-300 focus:border-lokifi/50 focus:ring-2 focus:ring-lokifi/20 rounded-xl text-white placeholder-gray-500 focus:outline-none transition-all duration-200"
                />
              </div>
            </div>

            {/* Right Side Actions */}
            <div className="flex items-center gap-3 ml-6">
              {/* Currency Selector */}
              <select
                value={currency}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setCurrency(e.target.value)}
                className="px-3 py-2 bg-surface-100 border border-surface-300 rounded-xl text-sm font-medium text-gray-300 focus:outline-none focus:ring-2 focus:ring-lokifi/20 focus:border-lokifi/50 transition-all cursor-pointer"
              >
                {currencies.map((curr: string) => (
                  <option key={curr} value={curr}>
                    {curr} €
                  </option>
                ))}
              </select>

              {/* Dark Mode Toggle */}
              <button
                onClick={() => setDarkMode(!darkMode)}
                className="p-2.5 rounded-xl bg-surface-100 border border-surface-300 hover:border-lokifi/30 hover:bg-surface-200 transition-all duration-200"
                aria-label="Toggle dark mode"
              >
                {darkMode ? (
                  <Sun className="w-5 h-5 text-amber-400" />
                ) : (
                  <Moon className="w-5 h-5 text-gray-400" />
                )}
              </button>

              {/* Authentication Section */}
              <div className="flex items-center gap-3 pl-4 border-l border-surface-300/50">
                {loading ? (
                  // Loading skeleton
                  <div className="flex items-center gap-3 animate-pulse">
                    <div className="w-10 h-10 rounded-xl bg-surface-200" />
                  </div>
                ) : isLoggedIn ? (
                  <>
                    {/* Notification Bell */}
                    <NotificationBell />

                    {/* User Profile Link */}
                    <button
                      onClick={() => router.push('/profile')}
                      className="flex items-center gap-2 px-3 py-2 bg-surface-100 hover:bg-surface-200 border border-surface-300 hover:border-lokifi/30 rounded-xl transition-all duration-200 hover:shadow-lg hover:shadow-lokifi/10"
                      aria-label="User profile"
                    >
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-lokifi to-electric flex items-center justify-center">
                        <User size={16} className="text-white" />
                      </div>
                      <span className="text-sm font-medium text-white hidden sm:inline">
                        {displayName}
                      </span>
                    </button>
                  </>
                ) : (
                  <>
                    {/* Bell icon (non-functional when logged out) */}
                    <button
                      disabled
                      className="p-2 text-gray-600 cursor-not-allowed"
                      title="Login to view notifications"
                    >
                      <Bell size={20} />
                    </button>

                    {/* Log In / Sign Up Button */}
                    <button
                      onClick={handleOpenLogin}
                      className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-lokifi to-electric hover:from-lokifi-dark hover:to-electric/90 rounded-xl text-white font-medium transition-all duration-200 hover:shadow-lg hover:shadow-lokifi/30"
                      aria-label="Log in or sign up"
                    >
                      <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center">
                        <User size={16} className="text-white" />
                      </div>
                      <span className="text-sm font-medium">Log In / Sign Up</span>
                    </button>
                  </>
                )}
              </div>
            </div>
          </header>

          {/* Page Content */}
          <main className="flex-1 overflow-auto bg-surface-0">{children}</main>
        </div>
      </div>

      {/* Auth Modal */}
      {isAuthModalOpen && <AuthModal initialMode={authModalTab} onClose={handleCloseAuthModal} />}
    </div>
  );
}
