"use client";
import { 
  BarChart3, 
  Bell, 
  BookOpen, 
  Home, 
  MessageSquare, 
  TrendingUp, 
  User, 
  Wallet 
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import React from 'react';

const navigationItems = [
  { href: '/', icon: Home, label: 'Chart' },
  { href: '/portfolio', icon: Wallet, label: 'Portfolio' },
  { href: '/alerts', icon: Bell, label: 'Alerts' },
  { href: '/chat', icon: MessageSquare, label: 'Chat' },
  { href: '/profile', icon: User, label: 'Profile' },
];

export const Navigation: React.FC = () => {
  const pathname = usePathname();

  return (
    <nav className="bg-gray-900 border-r border-gray-700 w-16 flex flex-col items-center py-4 space-y-2">
      {/* Logo */}
      <Link 
        href="/" 
        className="mb-4 p-2 bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
        title="Lokifi"
      >
        <TrendingUp className="w-6 h-6 text-white" />
      </Link>

      {/* Navigation Items */}
      {navigationItems.map((item) => {
        const isActive = pathname === item.href;
        const Icon = item.icon;

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`p-3 rounded-lg transition-colors group relative ${
              isActive
                ? 'bg-blue-600 text-white'
                : 'text-gray-400 hover:text-white hover:bg-gray-800'
            }`}
            title={item.label}
          >
            <Icon className="w-5 h-5" />
            
            {/* Tooltip */}
            <span className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
              {item.label}
            </span>
          </Link>
        );
      })}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Bottom Items */}
      <Link
        href="/docs"
        className="p-3 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors group relative"
        title="Documentation"
      >
        <BookOpen className="w-5 h-5" />
        <span className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
          Docs
        </span>
      </Link>
    </nav>
  );
};
