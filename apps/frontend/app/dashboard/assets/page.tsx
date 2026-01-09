'use client';

import { usePreferences } from '@/src/components/dashboard/PreferencesContext';
import { ProfileDropdown } from '@/src/components/dashboard/ProfileDropdown';
import { useToast } from '@/src/components/dashboard/ToastProvider';
import { useCurrencyFormatter } from '@/src/components/dashboard/useCurrencyFormatter';
import type { Asset as PortfolioAsset, PortfolioSection } from '@/src/lib/data/portfolioStorage';
import {
  loadPortfolio,
  addAssets as storageAddAssets,
  addSection as storageAddSection,
  deleteAsset as storageDeleteAsset,
  totalValue as storageTotalValue,
} from '@/src/lib/data/portfolioStorage';
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
  step: 'stocks' | 'metals' | 'quantity';
  selectedItems: Asset[];
}

export default function AssetsPage() {
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

  const _handleDone = () => {
    const items = modal.selectedItems.map((item: Asset) => ({
      id: Math.random().toString(36).substring(2, 9),
      name: item.name,
      symbol: item.symbol,
      shares: parseInt(shares[item.symbol] || '0'),
      value: Math.floor(Math.random() * 10000) + 1000,
      change: 0,
    }));
    storageAddAssets('Default', items);
    setSections(loadPortfolio());
    setModal({ show: false, step: 'stocks', selectedItems: [] });
    setShares({});
    toast.success(`${items.length} item(s) added.`);
  };

  const { formatCurrency } = useCurrencyFormatter();

  const getTotalValue = () =>
    storageTotalValue() + connectingBanks.reduce((s: number, b: ConnectingBank) => s + b.value, 0);

  const addNewSection = () => {
    const newSection: PortfolioSection = {
      title: 'New Section',
      assets: [],
    };
    storageAddSection(newSection);
    setSections(loadPortfolio());
  };

  const removeAsset = (sectionTitle: string, id: string) => {
    storageDeleteAsset(sectionTitle, id);
    setSections(loadPortfolio());
    toast.info('Asset deleted.');
  };

  const hasAnyAssets = sections.some((s: PortfolioSection) => s.assets.length > 0);

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
            window.dispatchEvent(
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
      <div className="flex items-center justify-center min-h-screen bg-surface-0">
        <div className="flex items-center gap-3 text-surface-400">
          <div className="w-5 h-5 border-2 border-lokifi border-t-transparent rounded-full animate-spin" />
          <span>Loading assets...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-0 transition-colors">
      {/* Navigation Bar */}
      <nav className="bg-surface-50/80 border-b border-surface-300/50 backdrop-blur-xl px-6 py-4 transition-colors">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center space-x-4">
            <Menu className="w-6 h-6 text-surface-400 cursor-pointer hover:text-white transition-colors" />
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
                  className="fill-lokifi"
                />
                <path
                  d="M11 9v14h10"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="stroke-white"
                />
              </svg>
              <span className="text-xl font-bold tracking-wide text-white">Lokifi</span>
            </div>
          </div>
          <div className="flex items-center space-x-6">
            <button aria-label="Notifications" className="p-2 hover:bg-surface-200 rounded-lg transition-colors">
              <Bell className="w-5 h-5 text-surface-400 hover:text-white" />
            </button>
            <button aria-label="Search" className="p-2 hover:bg-surface-200 rounded-lg transition-colors">
              <Search className="w-5 h-5 text-surface-400 hover:text-white" />
            </button>
            <button aria-label="Share" className="p-2 hover:bg-surface-200 rounded-lg transition-colors">
              <Share2 className="w-5 h-5 text-surface-400 hover:text-white" />
            </button>
            <button
              className="p-2 hover:bg-surface-200 rounded-lg transition-colors"
              title="Toggle Theme"
              onClick={() => {
                setDarkMode(!darkMode);
              }}
            >
              <Settings className="w-5 h-5 text-surface-400 hover:text-white" />
            </button>
            <span className="text-sm text-surface-400">EUR €</span>
            <span className="text-sm font-medium text-white hidden sm:inline-block">
              {getFirstName()}
            </span>
            <ProfileDropdown
              userName={user?.name}
              userEmail={user?.email}
              onLogout={() => {
                setUser(null);
              }}
            />
          </div>
        </div>
      </nav>

      <div className="flex">
        {/* Sidebar */}
        <aside className="w-64 bg-surface-50/80 border-r border-surface-300/50 min-h-screen p-4 transition-colors">
          <nav className="space-y-1">
            <a
              href="/dashboard"
              className="flex items-center justify-between px-4 py-3 text-surface-400 hover:bg-surface-200 hover:text-white rounded-lg transition-colors"
            >
              <div className="flex items-center space-x-3">
                <Wallet className="w-5 h-5" />
                <span>Net Worth</span>
              </div>
              <span className="text-sm text-surface-400">{formatCurrency(getTotalValue())}</span>
            </a>
            <a
              href="/dashboard/assets"
              className="flex items-center justify-between px-4 py-3 bg-linear-to-r from-lokifi/20 to-electric/10 rounded-lg text-white font-medium hover:from-lokifi/30 hover:to-electric/20 transition-colors border border-lokifi/20"
            >
              <div className="flex items-center space-x-3">
                <TrendingUp className="w-5 h-5 text-lokifi-light" />
                <span>Assets</span>
              </div>
              <span className="text-sm text-surface-300">{formatCurrency(getTotalValue())}</span>
            </a>
            <a
              href="/dashboard/debts"
              className="flex items-center justify-between px-4 py-3 text-surface-400 hover:bg-surface-200 hover:text-white rounded-lg transition-colors"
            >
              <div className="flex items-center space-x-3">
                <AlertCircle className="w-5 h-5" />
                <span>Debts</span>
              </div>
              <span className="text-sm text-surface-400">€0</span>
            </a>
            <a
              href="/dashboard/recap"
              className="flex items-center space-x-3 px-4 py-3 text-surface-400 hover:bg-surface-200 hover:text-white rounded-lg transition-colors"
            >
              <PieChart className="w-5 h-5" />
              <span>Recap</span>
            </a>
            <a
              href="/dashboard/fast-forward"
              className="flex items-center space-x-3 px-4 py-3 text-surface-400 hover:bg-surface-200 hover:text-white rounded-lg transition-colors"
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
              className="flex items-center space-x-3 px-4 py-3 text-surface-400 hover:bg-surface-200 hover:text-white rounded-lg transition-colors"
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
                <h1 className="text-3xl font-bold text-white mb-1">Assets</h1>
                <p className="text-base text-surface-400">
                  <span className="text-xs">1 DAY</span>{' '}
                  <span className="font-semibold text-white">
                    {formatCurrency(getTotalValue())}
                  </span>
                </p>
              </div>
              <div className="flex items-center space-x-3">
                <span className="text-sm text-surface-400">Click on the</span>
                <span className="inline-flex items-center justify-center w-6 h-6 rounded bg-surface-200 text-surface-400">
                  <MoreHorizontal className="w-4 h-4" />
                </span>
                <span className="text-sm text-surface-400">menu for more details</span>
              </div>
            </div>

            {/* Category Tabs */}
            <div className="flex items-center space-x-6 mb-6 border-b border-surface-300/50">
              <button className="pb-3 border-b-2 border-lokifi font-semibold text-white">
                Investments
              </button>
              <button className="pb-3 text-surface-400 hover:text-white transition-colors">Real Estate</button>
              <button className="pb-3 text-surface-400 hover:text-white transition-colors">Others</button>
              <button className="pb-3 text-surface-400 hover:text-white transition-colors">
                Sheet &<br />
                Other
              </button>
            </div>

            {sections.map((section: PortfolioSection, idx: number) => {
              const sectionValue = section.assets.reduce(
                (s: number, a: PortfolioAsset) => s + a.value,
                0
              );
              return (
                <section className="mb-8" key={idx}>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-sm font-medium text-surface-400">
                      {section.title}
                    </h2>
                    <span className="text-sm text-surface-400 font-medium">
                      {formatCurrency(sectionValue)}
                    </span>
                  </div>
                  <div className="space-y-2">
                    <div className="px-4 py-2">
                      <span className="text-xs font-medium text-surface-400 uppercase tracking-wide">
                        ASSET
                      </span>
                    </div>
                    {idx === 0 &&
                      connectingBanks.map((bank: ConnectingBank) => (
                        <ConnectingBankItem key={bank.id} bank={bank} />
                      ))}
                    {section.assets.map((asset: PortfolioAsset) => (
                      <AssetItem
                        key={asset.id}
                        asset={asset as unknown as Asset}
                        onDelete={() => removeAsset(section.title, asset.id)}
                      />
                    ))}
                    <div className="bg-linear-to-r from-lokifi/20 to-electric/10 hover:from-lokifi/30 hover:to-electric/20 rounded-xl p-4 cursor-pointer transition-all duration-200 group border border-lokifi/20 hover:border-lokifi/40">
                      <button
                        onClick={openAddAssetModal}
                        className="w-full text-center text-white font-medium"
                      >
                        + ADD ASSET
                      </button>
                      <div className="text-center text-sm text-surface-300 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {formatCurrency(getTotalValue())}
                      </div>
                    </div>
                  </div>
                </section>
              );
            })}

            <section>
              <div className="flex items-center space-x-4 text-sm text-surface-400 mb-4">
                <button onClick={addNewSection} className="hover:text-white transition-colors">
                  + NEW SECTION
                </button>
                <button onClick={openAddAssetModal} className="hover:text-white transition-colors">
                  + ADD ASSET
                </button>
              </div>
              {!hasAnyAssets && connectingBanks.length === 0 && (
                <div className="text-center py-16 border-2 border-dashed border-surface-300/50 rounded-2xl text-surface-400">
                  <p className="mb-4 font-medium">No assets yet</p>
                  <button
                    onClick={openAddAssetModal}
                    className="px-6 py-3 bg-linear-to-r from-lokifi to-electric hover:from-lokifi-dark hover:to-electric/90 text-white rounded-xl text-sm font-medium transition-all duration-200 shadow-lg shadow-lokifi/30"
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
      setAnimatedValue((prev: number) => {
        const change = Math.floor(Math.random() * 200) - 100;
        return Math.max(0, prev + change);
      });
    }, 150);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-surface-100/50 border border-surface-300/50 rounded-xl p-4 flex items-center justify-between hover:border-surface-300 hover:shadow-lg hover:shadow-lokifi/5 transition-all duration-200">
      <div className="flex items-center space-x-4 flex-1">
        <div className="w-10 h-10 rounded-xl bg-linear-to-br from-lokifi to-electric text-white flex items-center justify-center font-semibold text-sm shadow-lg shadow-lokifi/20">
          {bank.name.substring(0, 2).toUpperCase()}
        </div>
        <div className="flex-1">
          <div className="flex items-center space-x-2">
            <h3 className="font-semibold text-white">{bank.name}</h3>
            <Loader2 className="w-4 h-4 text-lokifi-light animate-spin" />
          </div>
          <p className="text-sm text-surface-400 mt-0.5">{bank.message}</p>
        </div>
      </div>
      <div className="flex items-center space-x-4">
        <div className="text-right">
          <p className="text-lg font-semibold text-white tabular-nums">
            {formatCurrency(animatedValue)}
          </p>
        </div>
        <button
          className="p-1 hover:bg-surface-200 rounded-lg transition-colors"
          aria-label="Options"
        >
          <MoreHorizontal className="w-5 h-5 text-surface-400" />
        </button>
      </div>
    </div>
  );
}

// Asset Item Component
function AssetItem({ asset, onDelete }: { asset: Asset; onDelete?: () => void }) {
  const { formatCurrency } = useCurrencyFormatter();
  return (
    <div className="bg-surface-100/50 border border-surface-300/50 rounded-xl p-4 flex items-center justify-between hover:border-surface-300 hover:shadow-lg hover:shadow-lokifi/5 transition-all duration-200 group">
      <div className="flex items-center space-x-4 flex-1">
        <div className="text-sm text-surface-400">{asset.symbol}</div>
        <div className="flex-1">
          <h3 className="font-semibold text-white">{asset.name}</h3>
        </div>
      </div>
      <div className="flex items-center space-x-4 relative">
        <div className="text-right">
          <p className="text-lg font-semibold text-white">
            {formatCurrency(asset.value)}
          </p>
        </div>
        <button
          className="p-1 hover:bg-surface-200 rounded-lg transition-colors"
          aria-label="Options"
        >
          <MoreHorizontal className="w-5 h-5 text-surface-400" />
        </button>
        {onDelete && (
          <div className="absolute right-0 top-8 w-32 bg-surface-100 border border-surface-300/50 rounded-xl shadow-lg py-1 text-xs opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none group-hover:pointer-events-auto">
            <button
              onClick={onDelete}
              className="w-full text-left px-3 py-1.5 hover:bg-surface-200 text-rose-400 transition-colors"
            >
              Delete
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

