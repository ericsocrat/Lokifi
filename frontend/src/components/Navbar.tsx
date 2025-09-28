"use client";

import Link from "next/link";
import { useAuth } from "./AuthProvider";
import { NotificationBell } from "../../components/NotificationBell";

export function Navbar() {
  const { user, logout } = useAuth();
  return (
    <header className="border-b border-neutral-800 bg-neutral-900/50">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        <nav className="flex items-center gap-4">
          <Link href="/" className="font-semibold">Fynix</Link>
          <Link href="/portfolio" className="text-neutral-300 hover:text-white">Portfolio</Link>
          <Link href="/alerts" className="text-neutral-300 hover:text-white">Alerts</Link>
                  <Link href="/chat" className="text-neutral-300 hover:text-white">Chat</Link>
        </nav>
        <div className="flex items-center gap-3">
          {user ? (
            <>
              <NotificationBell className="mr-2" />
              <span className="text-sm text-neutral-300">@{user.handle}</span>
              <button onClick={logout} className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-sm">Logout</button>
            </>
          ) : (
            <Link href="/login" className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-sm">Login</Link>
          )}
        </div>
      </div>
    </header>
  );
}

