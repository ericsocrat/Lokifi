'use client';

import { useToast } from '@/src/components/dashboard/ToastProvider';
import {
  loadPortfolio,
  PortfolioSection,
  addAssets as storageAddAssets,
  addSection as storageAddSection,
  deleteAsset as storageDeleteAsset,
  totalValue as storageTotalValue,
  Asset as StorageAsset,
} from '@/src/lib/portfolioStorage';
import { usePreferences } from '@/src/components/dashboard/PreferencesContext';
import { ProfileDropdown } from '@/src/components/dashboard/ProfileDropdown';
import { useCurrencyFormatter } from '@/src/components/dashboard/useCurrencyFormatter';
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
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ProtectedRoute } from '@/src/components/ProtectedRoute';

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
}

interface AddAssetModalState {
  show: boolean;
  step: 'stocks' | 'metals' | 'quantity';
  selectedItems: any[];
}

function PortfolioPageContent() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [connectingBanks, setConnectingBanks] = useState<ConnectingBank[]>([]);
  const [sections, setSections] = useState<PortfolioSection[]>([]);
  const toast = useToast();
  const [modal, setModal] = useState<AddAssetModalState>({
    show: false,
    step: 'stocks',
    selectedItems: [],
  });
  const [shares, setShares] = useState<{ [key: string]: string }>({});
  const { darkMode, setDarkMode } = usePreferences();

  useEffect(() => {
    checkAuth();
    loadData();
    simulateBankConnections();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/auth/me', {
        credentials: 'include',
      });

      if (!response.ok) {
        // Backend not available or not authenticated
        // For demo purposes, use a default user
        setUser({ email: 'demo@example.com', name: 'Demo User' });
        setLoading(false);
        return;
      }

      const userData = await response.json();
      setUser(userData);
    } catch (error) {
      console.error('Auth check failed:', error);
      // Backend not available - use demo mode
      setUser({ email: 'demo@example.com', name: 'Demo User' });
    } finally {
      setLoading(false);
    }
  };

  const loadData = () => {
    // Load connecting banks
    const storedBanks = localStorage.getItem('connectingBanks');
    if (storedBanks) {
      setConnectingBanks(JSON.parse(storedBanks));
    }
    const portfolio = loadPortfolio();
    setSections(portfolio);
  };

  const openAddAssetModal = () => {
    // Navigate to add-assets page to show category selection
    router.push('/dashboard/add-assets');
  };

  const handleDone = () => {
    const items = modal.selectedItems.map((item: any) => ({
      name: item.name,
      symbol: item.symbol,
      shares: parseInt(shares[item.symbol] || '0'),
      value: Math.floor(Math.random() * 10000) + 1000,
      change: 0,
    }));
    storageAddAssets('Investments', items as any);
    const updated = loadPortfolio();
    setSections(updated);
    setModal({ show: false, step: 'stocks', selectedItems: [] });
    setShares({});
    toast.success(`${items.length} item(s) added.`);
  };

  const { formatCurrency } = useCurrencyFormatter();

  const getTotalValue = () =>
    storageTotalValue() + connectingBanks.reduce((s, b) => s + b.value, 0);

  const addNewSection = () => {
    storageAddSection({ title: 'New Section', assets: [] });
    const updated = loadPortfolio();
    setSections(updated);
  };

  const removeAsset = (sectionTitle: string, id: string) => {
    storageDeleteAsset(sectionTitle, id);
    const updated = loadPortfolio();
    setSections(updated);
    toast.info('Asset deleted.');
  };

  const hasAnyAssets = sections.some((s) => s.assets.length > 0);

  const simulateBankConnections = () => {
    const banks = JSON.parse(localStorage.getItem('connectingBanks') || '[]');
    banks
      .filter((b: ConnectingBank) => b.status === 'connecting')
      .forEach((b: ConnectingBank) => {
        const delay = 3000 + Math.random() * 3000;
        setTimeout(() => {
          const current = JSON.parse(localStorage.getItem('connectingBanks') || '[]');
          const target = current.find((x: ConnectingBank) => x.id === b.id);
          if (target && target.status === 'connecting') {
            target.status = 'connected';
            target.message = 'Connected';
            localStorage.setItem('connectingBanks', JSON.stringify(current));
            setConnectingBanks(current);
            (window as any).dispatchEvent(
              new CustomEvent('lokifi.toast', {
                detail: {
                  type: 'success',
                  title: 'Bank Connected',
                  message: `${target.name} connected.`,
                },
              })
            );
          }
        }, delay);
      });
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 transition-colors">
      {/* Navigation Bar */}
      <nav className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-6 py-4 transition-colors">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center space-x-4">
            <Menu className="w-6 h-6 text-gray-600 cursor-pointer" />
            <div className="flex items-center gap-2 select-none">
              <svg
                className="w-6 h-6"
                viewBox="0 0 32 32"
                fill="none"
                role="img"
                aria-label="Lokifi Logo"
              >
                <circle
                  cx="16"
                  cy="16"
                  r="16"
                  className="fill-black dark:fill-white transition-colors"
                />
                <path
                  d="M11 9v14h10"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="stroke-white dark:stroke-black"
                />
              </svg>
              <span className="text-xl font-bold tracking-wide">Lokifi</span>
            </div>
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
            <button
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
              title="Toggle Dark Mode"
              onClick={() => {
                setDarkMode(!darkMode);
              }}
            >
              <Settings className="w-5 h-5 text-gray-600 dark:text-gray-300" />
            </button>
            <span className="text-sm text-gray-600">EUR €</span>
            <span className="text-sm font-medium text-gray-900 hidden sm:inline-block">
              {getFirstName()}
            </span>
            <ProfileDropdown
              userName={user?.name || getFirstName()}
              userEmail={user?.email || 'user@example.com'}
              onLogout={() => {
                setUser(null);
              }}
            />
          </div>
        </div>
      </nav>

      <div className="flex">
        {/* Sidebar */}
        <aside className="w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 min-h-screen p-4 transition-colors">
          <nav className="space-y-1">
            <a
              href="/dashboard"
              className="flex items-center justify-between px-4 py-3 text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800 rounded-lg transition-colors"
            >
              <div className="flex items-center space-x-3">
                <Wallet className="w-5 h-5" />
                <span>Net Worth</span>
              </div>
              <span className="text-sm text-gray-500">{formatCurrency(getTotalValue())}</span>
            </a>
            <a
              href="/portfolio"
              className="flex items-center justify-between px-4 py-3 bg-gray-100 dark:bg-gray-800 rounded-lg text-gray-900 dark:text-gray-100 font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              <div className="flex items-center space-x-3">
                <TrendingUp className="w-5 h-5" />
                <span>Portfolio</span>
              </div>
              <span className="text-sm text-gray-500">{formatCurrency(getTotalValue())}</span>
            </a>
            <a
              href="/dashboard/debts"
              className="flex items-center justify-between px-4 py-3 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
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
                <h1 className="text-3xl font-bold text-gray-900 mb-1">Portfolio</h1>
                <p className="text-base text-gray-500">
                  <span className="text-xs">1 DAY</span>{' '}
                  <span className="font-semibold text-gray-700">
                    {formatCurrency(getTotalValue())}
                  </span>
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

            {/* Category Tabs */}
            <div className="flex items-center space-x-6 mb-6 border-b border-gray-200">
              <button className="pb-3 border-b-2 border-black font-semibold text-gray-900">
                Investments
              </button>
              <button className="pb-3 text-gray-500 hover:text-gray-700">Real Estate</button>
              <button className="pb-3 text-gray-500 hover:text-gray-700">Others</button>
              <button className="pb-3 text-gray-500 hover:text-gray-700">
                Sheet &<br />
                Other
              </button>
            </div>

            {sections.map((section, idx) => {
              const sectionValue = section.assets.reduce((s, a) => s + a.value, 0);
              return (
                <section className="mb-8" key={section.title}>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      {section.title}
                    </h2>
                    <span className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                      {formatCurrency(sectionValue)}
                    </span>
                  </div>
                  <div className="space-y-2">
                    <div className="px-4 py-2">
                      <span className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">
                        ASSET
                      </span>
                    </div>
                    {idx === 0 &&
                      connectingBanks.map((bank) => (
                        <ConnectingBankItem key={bank.id} bank={bank} />
                      ))}
                    {section.assets.map((asset) => (
                      <AssetItem
                        key={asset.id}
                        asset={asset}
                        onDelete={() => removeAsset(section.title, asset.id)}
                      />
                    ))}
                    <div className="bg-gray-700 hover:bg-gray-600 rounded-lg p-4 cursor-pointer transition-colors group dark:bg-gray-800 dark:hover:bg-gray-700">
                      <button
                        onClick={openAddAssetModal}
                        className="w-full text-center text-white font-medium"
                      >
                        + ADD ASSET
                      </button>
                      <div className="text-center text-sm text-gray-300 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {formatCurrency(getTotalValue())}
                      </div>
                    </div>
                  </div>
                </section>
              );
            })}

            <section>
              <div className="flex items-center space-x-4 text-sm text-gray-500 mb-4">
                <button onClick={addNewSection} className="hover:text-gray-700">
                  + NEW SECTION
                </button>
                <button onClick={openAddAssetModal} className="hover:text-gray-700">
                  + ADD ASSET
                </button>
              </div>
              {!hasAnyAssets && connectingBanks.length === 0 && (
                <div className="text-center py-16 border-2 border-dashed rounded-lg text-gray-500 dark:text-gray-400 dark:border-gray-700">
                  <p className="mb-4 font-medium">No assets yet</p>
                  <button
                    onClick={openAddAssetModal}
                    className="px-4 py-2 bg-black text-white rounded text-sm"
                  >
                    Add your first asset
                  </button>
                </div>
              )}
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}

// Animated Connecting Bank Component
function ConnectingBankItem({ bank }: { bank: ConnectingBank }) {
  const [animatedValue, setAnimatedValue] = useState(bank.value);
  const { formatCurrency } = useCurrencyFormatter();

  useEffect(() => {
    const interval = setInterval(() => {
      setAnimatedValue((prev) => {
        const change = Math.floor(Math.random() * 200) - 100;
        return Math.max(0, prev + change);
      });
    }, 150);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-white dark:bg-bg-secondary border border-gray-200 dark:border-gray-700 rounded-lg p-4 flex items-center justify-between hover:shadow-md transition-shadow">
      <div className="flex items-center space-x-4 flex-1">
        <div className="w-10 h-10 rounded-full bg-black text-white flex items-center justify-center font-semibold text-sm dark:bg-gray-900">
          {bank.name.substring(0, 2).toUpperCase()}
        </div>
        <div className="flex-1">
          <div className="flex items-center space-x-2">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">{bank.name}</h3>
            <Loader2 className="w-4 h-4 text-blue-600 dark:text-blue-400 animate-spin" />
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{bank.message}</p>
        </div>
      </div>
      <div className="flex items-center space-x-4">
        <div className="text-right">
          <p className="text-lg font-semibold text-gray-900 dark:text-gray-100 tabular-nums">
            {formatCurrency(animatedValue)}
          </p>
        </div>
        <button
          className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
          aria-label="Options"
        >
          <MoreHorizontal className="w-5 h-5 text-gray-400 dark:text-gray-500" />
        </button>
      </div>
    </div>
  );
}

// Asset Item Component
function AssetItem({ asset, onDelete }: { asset: StorageAsset; onDelete?: () => void }) {
  const { formatCurrency } = useCurrencyFormatter();
  return (
    <div className="bg-white dark:bg-bg-secondary border border-gray-200 dark:border-gray-700 rounded-lg p-4 flex items-center justify-between hover:shadow-md transition-shadow group">
      <div className="flex items-center space-x-4 flex-1">
        <div className="text-sm text-gray-500 dark:text-gray-400">{asset.symbol}</div>
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">{asset.name}</h3>
        </div>
      </div>
      <div className="flex items-center space-x-4 relative">
        <div className="text-right">
          <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {formatCurrency(asset.value)}
          </p>
        </div>
        <button
          className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
          aria-label="Options"
        >
          <MoreHorizontal className="w-5 h-5 text-gray-400 dark:text-gray-500" />
        </button>
        {onDelete && (
          <div className="absolute right-0 top-8 w-32 bg-white dark:bg-bg-secondary border border-gray-200 dark:border-gray-700 rounded shadow-lg py-1 text-xs opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none group-hover:pointer-events-auto">
            <button
              onClick={onDelete}
              className="w-full text-left px-3 py-1.5 hover:bg-gray-50 dark:hover:bg-gray-800 text-red-600"
            >
              Delete
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// Export the protected page
export default function PortfolioPage() {
  return (
    <ProtectedRoute>
      <PortfolioPageContent />
    </ProtectedRoute>
  );
}
