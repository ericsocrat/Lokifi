"use client";

import Link from "next/link";
import { useAuth } from "./AuthProvider";
import { NotificationBell } from "../../components/NotificationBell";
import { useState } from "react";
import { AuthModal } from "./AuthModal";

export function Navbar() {
  const { user, logout } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);

  return (
    <>
      <header className="border-b border-neutral-800 bg-neutral-900/50">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <nav className="flex items-center gap-4">
            <Link href="/" className="font-semibold">Lokifi</Link>
            <Link href="/portfolio" className="text-neutral-300 hover:text-white">Portfolio</Link>
            <Link href="/alerts" className="text-neutral-300 hover:text-white">Alerts</Link>
            <Link href="/chat" className="text-neutral-300 hover:text-white">Chat</Link>
          </nav>
          <div className="flex items-center gap-3">
            {user ? (
              <>
                <NotificationBell className="mr-2" />
                <span className="text-sm text-neutral-300">{user.full_name || user.email}</span>
                <button 
                  onClick={logout} 
                  className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-sm transition-colors"
                >
                  Logout
                </button>
              </>
            ) : (
              <button 
                onClick={() => setShowAuthModal(true)}
                className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors"
              >
                Login / Sign Up
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Auth Modal */}
      {showAuthModal && (
        <AuthModal onClose={() => setShowAuthModal(false)} />
      )}
    </>
  );
}

