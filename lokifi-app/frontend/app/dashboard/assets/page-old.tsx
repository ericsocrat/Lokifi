'use client';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  AlertCircle,
  Bell,
  Loader2,
  Menu,
  MoreHorizontal,
  PieChart,
  Search,
  Settings,
  Share2,
  TrendingUp,
  Wallet,
  X,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

interface User {
  email: string;
  name?: string;
}

interface ConnectingBank {
  id: string;
  name: string;
  status: 'connecting' | 'connected' | 'failed';
  message: string;
  value: number;
  logo?: string;
}

interface Asset {
  id: string;
  name: string;
  symbol: string;
  type: 'stock' | 'metal';
  shares: number;
  value: number;
}

interface AddAssetModalState {
  show: boolean;
  step: 'category' | 'stocks' | 'metals' | 'quantity';
  selectedAsset: any;
}

export default function AssetsPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [connectingBanks, setConnectingBanks] = useState<ConnectingBank[]>([]);

  useEffect(() => {
    checkAuth();
    loadConnectingBanks();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/auth/me', {
        credentials: 'include',
      });

      if (!response.ok) {
        router.push('/');
        return;
      }

      const userData = await response.json();
      setUser(userData);
    } catch (error) {
      console.error('Auth check failed:', error);
      router.push('/');
    } finally {
      setLoading(false);
    }
  };

  const loadConnectingBanks = () => {
    // Check localStorage for connecting banks
    const storedBanks = localStorage.getItem('connectingBanks');
    if (storedBanks) {
      const banks = JSON.parse(storedBanks);
      setConnectingBanks(banks);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

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
    <div className="min-h-screen bg-gray-50">
      {/* Navigation Bar */}
      <nav className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center space-x-4">
            <Menu className="w-6 h-6 text-gray-600 cursor-pointer" />
            <h1 className="text-xl font-bold">KUBERA</h1>
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
            <button className="p-2 hover:bg-gray-100 rounded-lg">
              <Settings className="w-5 h-5 text-gray-600" />
            </button>
            <span className="text-sm text-gray-600">EUR €</span>
            <span className="text-sm font-medium text-gray-900">{getFirstName()}</span>
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm font-semibold cursor-pointer">
              {getFirstName()[0].toUpperCase()}
            </div>
          </div>
        </div>
      </nav>

      <div className="flex">
        {/* Sidebar */}
        <aside className="w-64 bg-white border-r border-gray-200 min-h-screen p-4">
          <nav className="space-y-1">
            <a
              href="/dashboard"
              className="flex items-center justify-between px-4 py-3 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
            >
              <div className="flex items-center space-x-3">
                <Wallet className="w-5 h-5" />
                <span>Net Worth</span>
              </div>
              <span className="text-sm text-gray-500">€0</span>
            </a>
            <a
              href="/dashboard/assets"
              className="flex items-center justify-between px-4 py-3 bg-gray-100 rounded-lg text-gray-900 font-medium hover:bg-gray-200 transition-colors"
            >
              <div className="flex items-center space-x-3">
                <TrendingUp className="w-5 h-5" />
                <span>Assets</span>
              </div>
              <span className="text-sm text-gray-500">€0</span>
            </a>
            <a
              href="/dashboard/debts"
              className="flex items-center justify-between px-4 py-3 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
            >
              <div className="flex items-center space-x-3">
                <AlertCircle className="w-5 h-5" />
                <span>Debts</span>
              </div>
              <span className="text-sm text-gray-500">€0</span>
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
          <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-1">Assets</h1>
                <p className="text-base text-gray-500">
                  Total: <span className="font-semibold text-gray-700">€0</span>
                </p>
              </div>
              <div className="flex items-center space-x-3">
                <span className="text-sm text-gray-500">Click on the</span>
                <span className="inline-flex items-center justify-center w-6 h-6 rounded bg-gray-200 text-gray-600">
                  <MoreHorizontal className="w-4 h-4" />
                </span>
                <span className="text-sm text-gray-500">menu for more details</span>
              </div>
            </div>

            {/* Sections */}
            <div className="space-y-6">
              {/* Investments Section */}
              <section>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                    Investments
                  </h2>
                  <span className="text-sm font-medium text-gray-500">€€€€</span>
                </div>

                {/* Real Estate Subsection */}
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2 px-4">
                    <h3 className="text-xs font-medium text-gray-500 uppercase">Real Estate</h3>
                    <span className="text-xs text-gray-400">€€€€</span>
                  </div>
                </div>

                {/* Connecting Banks */}
                <div className="space-y-3">
                  {connectingBanks.map((bank: any) => (
                    <ConnectingBankItem key={bank.id} bank={bank} />
                  ))}
                </div>

                {/* Add Asset Button */}
                <div className="mt-4 flex justify-center">
                  <Button
                    onClick={() => router.push('/dashboard/add-assets')}
                    variant="ghost"
                    className="text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                  >
                    + ADD ASSET
                  </Button>
                </div>
              </section>

              {/* New Section Button */}
              <div className="flex justify-start">
                <Button
                  variant="ghost"
                  className="text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                >
                  + NEW SECTION
                </Button>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

// Animated Connecting Bank Component
function ConnectingBankItem({ bank }: { bank: ConnectingBank }) {
  const [animatedValue, setAnimatedValue] = useState(bank.value);

  useEffect(() => {
    // Animate value changing
    const interval = setInterval(() => {
      setAnimatedValue((prev: any) => {
        const change = Math.floor(Math.random() * 200) - 100; // Random change -100 to +100
        const newValue = Math.max(0, prev + change);
        return newValue;
      });
    }, 150); // Change every 150ms for smooth animation

    return () => clearInterval(interval);
  }, []);

  const formatCurrency = (amount: number) => {
    return `€${amount.toLocaleString()}`;
  };

  const getBankInitials = (name: string) => {
    return name
      .split(' ')
      .map((word: any) => word[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
  };

  return (
    <Card className="border border-gray-200 rounded-lg hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center space-x-4 flex-1">
          {/* Bank Logo/Icon */}
          <div className="w-10 h-10 rounded-full bg-black text-white flex items-center justify-center font-semibold text-sm">
            {getBankInitials(bank.name)}
          </div>

          {/* Bank Info */}
          <div className="flex-1">
            <div className="flex items-center space-x-2">
              <h3 className="font-semibold text-gray-900">{bank.name}</h3>
              {bank.status === 'connecting' && (
                <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
              )}
            </div>
            <p className="text-sm text-gray-500 mt-0.5">{bank.message}</p>
          </div>
        </div>

        {/* Value */}
        <div className="flex items-center space-x-4">
          <div className="text-right">
            <p className="text-lg font-semibold text-gray-900 tabular-nums">
              {formatCurrency(animatedValue)}
            </p>
          </div>

          {/* More Options */}
          <button className="p-1 hover:bg-gray-100 rounded transition-colors">
            <MoreHorizontal className="w-5 h-5 text-gray-400" />
          </button>
        </div>
      </div>
    </Card>
  );
}
