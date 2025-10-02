'use client';
import { Bell, BookOpen, Home, MessageSquare, User, Wallet } from 'lucide-react';
import Image from 'next/image';
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
    <nav className="bg-bg-primary border-r border-border-default w-16 flex flex-col items-center py-4 space-y-2">
      {/* Logo */}
      <Link
        href="/"
        className="mb-4 p-2 rounded-lg hover:bg-bg-secondary/50 transition-smooth"
        title="Lokifi"
      >
        <Image src="/logo-icon-only.svg" alt="Lokifi" width={32} height={32} className="w-8 h-8" />
      </Link>

      {/* Navigation Items */}
      {navigationItems.map((item) => {
        const isActive = pathname === item.href;
        const Icon = item.icon;

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`group ${isActive ? 'nav-item-active' : 'nav-item-inactive'}`}
            title={item.label}
          >
            <Icon className="w-5 h-5" />

            {/* Tooltip */}
            <span className="tooltip left-full ml-2">{item.label}</span>
          </Link>
        );
      })}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Bottom Items */}
      <Link href="/docs" className="group nav-item-inactive" title="Documentation">
        <BookOpen className="w-5 h-5" />
        <span className="tooltip left-full ml-2">Docs</span>
      </Link>
    </nav>
  );
};
