'use client';

import { useAuth } from '@/src/components/AuthProvider';
import { Bell, User, Search, TrendingUp, X } from 'lucide-react';
import Link from 'next/link';
import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { AuthModal } from '@/src/components/AuthModal';
import { NotificationBell } from './NotificationBell';
import { useCryptoSearch } from '@/src/hooks/useBackendPrices';
import Image from 'next/image';

export default function GlobalHeader() {
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalTab, setAuthModalTab] = useState<'login' | 'register'>('login');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const { user, loading } = useAuth();
  const searchRef = useRef<HTMLDivElement>(null);
  
  // Search functionality
  const { results: searchResults, loading: searchLoading } = useCryptoSearch(searchQuery, 300);
  const showSearchResults = isSearchFocused && searchQuery.length >= 2;
  
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

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  }, []);

  const handleClearSearch = useCallback(() => {
    setSearchQuery('');
    setIsSearchFocused(false);
  }, []);

  // Close search results when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsSearchFocused(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b border-neutral-800 bg-[#17171A]/95 backdrop-blur supports-[backdrop-filter]:bg-[#17171A]/80">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          {/* Left: Logo and Navigation */}
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                <span className="text-white font-bold text-lg">L</span>
              </div>
              <span className="text-xl font-bold text-white">Lokifi</span>
            </Link>

            <nav className="hidden md:flex items-center gap-6" role="navigation" aria-label="Main navigation">
              <Link
                href="/markets"
                className="text-sm font-medium text-neutral-400 hover:text-white transition-colors relative group"
              >
                Markets
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-blue-500 group-hover:w-full transition-all duration-300" />
              </Link>
              <Link
                href="/chart"
                className="text-sm font-medium text-neutral-400 hover:text-white transition-colors relative group"
              >
                Chart
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-blue-500 group-hover:w-full transition-all duration-300" />
              </Link>
              <Link
                href="/portfolio"
                className="text-sm font-medium text-neutral-400 hover:text-white transition-colors relative group"
              >
                Portfolio
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-blue-500 group-hover:w-full transition-all duration-300" />
              </Link>
              <Link
                href="/alerts"
                className="text-sm font-medium text-neutral-400 hover:text-white transition-colors relative group"
              >
                Alerts
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-blue-500 group-hover:w-full transition-all duration-300" />
              </Link>
              <Link
                href="/ai-research"
                className="text-sm font-medium text-neutral-400 hover:text-white transition-colors relative group"
              >
                AI Research
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-blue-500 group-hover:w-full transition-all duration-300" />
              </Link>
            </nav>
          </div>

          {/* Center: Search Bar */}
          <div className="hidden lg:flex flex-1 max-w-md mx-8" ref={searchRef}>
            <div className="relative w-full group">
              <Search 
                className="absolute left-3 top-2.5 w-4 h-4 text-neutral-500 group-focus-within:text-blue-500 transition-colors" 
                aria-hidden="true"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={handleSearchChange}
                onFocus={() => setIsSearchFocused(true)}
                placeholder="Search cryptocurrencies..."
                className="w-full px-4 py-2 pl-10 pr-10 bg-neutral-900 border border-neutral-800 rounded-lg text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                aria-label="Search cryptocurrencies"
              />
              {searchQuery && (
                <button
                  onClick={handleClearSearch}
                  className="absolute right-3 top-2.5 text-neutral-500 hover:text-white transition-colors"
                  aria-label="Clear search"
                >
                  <X className="w-4 h-4" />
                </button>
              )}

              {/* Search Results Dropdown */}
              {showSearchResults && (
                <div className="absolute top-full mt-2 w-full bg-neutral-900 border border-neutral-800 rounded-lg shadow-2xl shadow-black/50 max-h-96 overflow-y-auto z-50">
                  {searchLoading ? (
                    <div className="p-4 text-center text-neutral-500">
                      <div className="inline-block w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                      <span className="ml-2">Searching...</span>
                    </div>
                  ) : searchResults.length > 0 ? (
                    <div className="py-2">
                      {searchResults.map((crypto: any) => (
                        <Link
                          key={crypto.id}
                          href={`/asset/${crypto.symbol}`}
                          onClick={() => {
                            setSearchQuery('');
                            setIsSearchFocused(false);
                          }}
                          className="flex items-center gap-3 px-4 py-3 hover:bg-neutral-800 transition-colors"
                        >
                          <div className="relative w-8 h-8 rounded-full overflow-hidden bg-neutral-800 flex-shrink-0">
                            {crypto.image ? (
                              <Image
                                src={crypto.image}
                                alt={crypto.name}
                                fill
                                className="object-cover"
                                sizes="32px"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-xs font-bold text-neutral-500">
                                {crypto.symbol?.substring(0, 2).toUpperCase()}
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-white truncate">{crypto.name}</span>
                              <span className="text-xs text-neutral-500 uppercase">{crypto.symbol}</span>
                            </div>
                            {crypto.market_cap_rank && (
                              <div className="text-xs text-neutral-500">
                                Rank #{crypto.market_cap_rank}
                              </div>
                            )}
                          </div>
                          <div className="text-right flex-shrink-0">
                            {crypto.current_price && (
                              <div className="text-sm font-medium text-white">
                                ${crypto.current_price.toLocaleString(undefined, {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: crypto.current_price < 1 ? 6 : 2
                                })}
                              </div>
                            )}
                            {crypto.price_change_percentage_24h !== null && crypto.price_change_percentage_24h !== undefined && (
                              <div className={`text-xs ${crypto.price_change_percentage_24h >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                {crypto.price_change_percentage_24h >= 0 ? '+' : ''}
                                {crypto.price_change_percentage_24h.toFixed(2)}%
                              </div>
                            )}
                          </div>
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 text-center text-neutral-500">
                      No results found for &quot;{searchQuery}&quot;
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right: Notifications and Auth */}
          <div className="flex items-center gap-3">
            {loading ? (
              // Loading skeleton
              <div className="flex items-center gap-3 animate-pulse">
                <div className="w-10 h-10 rounded-lg bg-neutral-800" />
                <div className="hidden sm:block w-24 h-10 rounded-lg bg-neutral-800" />
              </div>
            ) : isLoggedIn ? (
              <>
                {/* Notification Bell */}
                <NotificationBell />

                {/* User Profile Link */}
                <Link
                  href="/profile"
                  className="flex items-center gap-2 px-3 py-2 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 hover:border-neutral-700 rounded-lg text-white transition-all hover:shadow-lg hover:shadow-blue-500/10"
                  aria-label="User profile"
                >
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                    <User size={16} className="text-white" />
                  </div>
                  <span className="text-sm font-medium hidden sm:inline">{displayName}</span>
                </Link>
              </>
            ) : (
              <>
                {/* Bell icon (non-functional when logged out) */}
                <button
                  disabled
                  className="p-2 text-neutral-600 cursor-not-allowed"
                  title="Login to view notifications"
                >
                  <Bell size={20} />
                </button>

                {/* Log In / Sign Up Button */}
                <button
                  onClick={handleOpenLogin}
                  className="flex items-center gap-2 px-4 py-2 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 hover:border-neutral-700 rounded-lg text-white transition-colors hover:shadow-lg hover:shadow-blue-500/20"
                  aria-label="Log in or sign up"
                >
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                    <User size={16} className="text-white" />
                  </div>
                  <span className="text-sm font-medium">Log In / Sign Up</span>
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Auth Modal */}
      {isAuthModalOpen && (
        <AuthModal initialMode={authModalTab} onClose={handleCloseAuthModal} />
      )}
    </>
  );
}
