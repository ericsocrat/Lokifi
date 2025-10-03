'use client';

import { useAuth } from '@/src/components/AuthProvider';
import { Bell, User } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { AuthModalCMC } from './AuthModalCMC';
import { NotificationBell } from './NotificationBell';

export default function GlobalHeader() {
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalTab, setAuthModalTab] = useState<'login' | 'signup'>('login');
  const { user } = useAuth();
  const isLoggedIn = !!user;

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

            <nav className="hidden md:flex items-center gap-6">
              <Link
                href="/markets"
                className="text-sm font-medium text-neutral-400 hover:text-white transition-colors"
              >
                Markets
              </Link>
              <Link
                href="/chart"
                className="text-sm font-medium text-neutral-400 hover:text-white transition-colors"
              >
                Chart
              </Link>
              <Link
                href="/portfolio"
                className="text-sm font-medium text-neutral-400 hover:text-white transition-colors"
              >
                Portfolio
              </Link>
              <Link
                href="/alerts"
                className="text-sm font-medium text-neutral-400 hover:text-white transition-colors"
              >
                Alerts
              </Link>
              <Link
                href="/ai-research"
                className="text-sm font-medium text-neutral-400 hover:text-white transition-colors"
              >
                AI Research
              </Link>
            </nav>
          </div>

          {/* Center: Search Bar */}
          <div className="hidden lg:flex flex-1 max-w-md mx-8">
            <div className="relative w-full">
              <input
                type="text"
                placeholder="Search cryptocurrencies..."
                className="w-full px-4 py-2 pl-10 bg-neutral-900 border border-neutral-800 rounded-lg text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-blue-500 transition-colors"
              />
              <svg
                className="absolute left-3 top-2.5 w-4 h-4 text-neutral-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
          </div>

          {/* Right: Notifications and Auth */}
          <div className="flex items-center gap-3">
            {isLoggedIn ? (
              <>
                {/* Notification Bell */}
                <NotificationBell />

                {/* User Profile Link */}
                <Link
                  href="/profile"
                  className="flex items-center gap-2 px-3 py-2 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 hover:border-neutral-700 rounded-lg text-white transition-colors"
                >
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                    <User size={16} className="text-white" />
                  </div>
                  <span className="text-sm font-medium hidden sm:inline">@{user.handle}</span>
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
                  onClick={() => {
                    setAuthModalTab('login');
                    setIsAuthModalOpen(true);
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 hover:border-neutral-700 rounded-lg text-white transition-colors"
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
        <AuthModalCMC defaultTab={authModalTab} onClose={() => setIsAuthModalOpen(false)} />
      )}
    </>
  );
}
