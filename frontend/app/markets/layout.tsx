'use client';

/**
 * Markets Layout
 * 
 * Provides navigation tabs for different market sections.
 */

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Bitcoin, DollarSign, BarChart3, Sparkles, Globe2 } from 'lucide-react';

export default function MarketsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const tabs = [
    {
      name: 'Overview',
      href: '/markets',
      icon: Sparkles,
      exact: true,
    },
    {
      name: 'Crypto',
      href: '/markets/crypto',
      icon: Bitcoin,
    },
    {
      name: 'Stocks',
      href: '/markets/stocks',
      icon: DollarSign,
    },
    {
      name: 'Indices',
      href: '/markets/indices',
      icon: BarChart3,
    },
    {
      name: 'Forex',
      href: '/markets/forex',
      icon: Globe2,
    },
  ];

  const isActive = (tab: typeof tabs[0]) => {
    if (tab.exact) {
      return pathname === tab.href;
    }
    return pathname?.startsWith(tab.href);
  };

  return (
    <div className="min-h-screen">
      {/* Navigation Tabs */}
      <div className="border-b border-neutral-800 bg-[#17171A]/60 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6">
          <nav className="flex gap-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const active = isActive(tab);

              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={`
                    flex items-center gap-2 px-4 py-3 border-b-2 transition-all
                    ${
                      active
                        ? 'border-blue-500 text-white font-medium'
                        : 'border-transparent text-neutral-400 hover:text-white hover:border-neutral-700'
                    }
                  `}
                >
                  <Icon className="w-4 h-4" />
                  {tab.name}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Page Content */}
      {children}
    </div>
  );
}
