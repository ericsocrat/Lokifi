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
import { useCurrencyFormatter } from '@/src/components/dashboard/useCurrencyFormatter';
import {
  ChevronRight,
  Loader2,
  MoreHorizontal,
  TrendingUp,
  TrendingDown,
  Plus,
  Eye,
  Download,
  Filter,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  Sparkles,
  Wallet2,
  Building2,
  Home,
  Briefcase,
  ChevronDown,
  BarChart3,
  PieChart,
  ArrowUpDown,
  Calendar,
  Zap,
  Target,
  DollarSign,
  Percent,
  Clock,
  Star,
  Edit2,
  Trash2,
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

import type { AddAssetModalState, SelectedAsset, Asset } from '@/src/types/assets';
import AddAssetModal from '@/src/components/portfolio/AddAssetModal';
import { usePortfolioPrices, useAssets } from '@/src/hooks/useMarketData';


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
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());
  const [showAddAssetModal, setShowAddAssetModal] = useState(false);
  
  // New state for advanced features
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [sortBy, setSortBy] = useState<'value' | 'change' | 'name' | 'symbol'>('value');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedTimeframe, setSelectedTimeframe] = useState<'1D' | '1W' | '1M' | '1Y' | 'ALL'>('1D');

  // Get live portfolio prices from master market data service
  const holdings = sections.flatMap((section: any) =>
    section.assets.map((asset: any) => ({
      symbol: asset.symbol,
      shares: asset.shares,
    }))
  );
  
  const { prices, totalValue: livePortfolioValue, totalChange, totalChangePercent } = 
    usePortfolioPrices(holdings);

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
    setShowAddAssetModal(true);
  };

  const handleAddAssets = (assets: any[], category: string) => {
    const items: Asset[] = assets.map((asset: any) => ({
      id: `${asset.symbol}-${Date.now()}-${Math.random()}`,
      name: asset.name,
      symbol: asset.symbol,
      shares: asset.quantity || 1,
      value: asset.value || asset.price || 0,
      change: 0,
    }));
    
    // Add to the first section by default (Investments), or create one
    const targetSection = sections[0]?.title || 'Investments';
    storageAddAssets(targetSection, items);
    const updated = loadPortfolio();
    setSections(updated);
    toast.success(`${items.length} asset${items.length > 1 ? 's' : ''} added successfully!`);
  };

  const { formatCurrency } = useCurrencyFormatter();

  const getTotalValue = () => {
    // Use live portfolio value + connecting banks value
    const banksValue = connectingBanks.reduce((s: any, b: any) => s + b.value, 0);
    return livePortfolioValue + banksValue;
  };

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

  const toggleSection = (sectionTitle: string) => {
    setCollapsedSections((prev: Set<string>) => {
      const next = new Set(prev);
      if (next.has(sectionTitle)) {
        next.delete(sectionTitle);
      } else {
        next.add(sectionTitle);
      }
      return next;
    });
  };

  const hasAnyAssets = sections.some((s: any) => s.assets.length > 0);

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
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-950">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="p-6 max-w-7xl mx-auto">
        {/* Hero Stats Section */}
        <div className="mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            {/* Total Portfolio Value Card */}
            <div className="md:col-span-2 bg-gradient-to-br from-blue-600 via-blue-700 to-purple-600 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden">
              {/* Background Pattern */}
              <div className="absolute inset-0 opacity-10">
                <div className="absolute inset-0" style={{
                  backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)',
                  backgroundSize: '32px 32px'
                }}></div>
              </div>
              
              <div className="relative z-10">
                <div className="flex items-start justify-between mb-6">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Wallet2 className="w-5 h-5" />
                      <span className="text-sm font-medium opacity-90">Total Portfolio Value</span>
                      <div className="flex items-center gap-1.5 px-2.5 py-1 bg-white/10 backdrop-blur-sm rounded-full ml-auto">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-green-400"></span>
                        </span>
                        <span className="text-xs font-medium">LIVE</span>
                      </div>
                    </div>
                    <div className="flex items-baseline gap-3 mb-3">
                      <h2 className="text-4xl font-bold tracking-tight">{formatCurrency(getTotalValue())}</h2>
                      {totalChangePercent !== 0 && (
                        <div className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-semibold ${
                          totalChangePercent >= 0 
                            ? 'bg-green-500/20 text-green-100 ring-2 ring-green-400/30' 
                            : 'bg-red-500/20 text-red-100 ring-2 ring-red-400/30'
                        }`}>
                          {totalChangePercent >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                          {totalChangePercent >= 0 ? '+' : ''}{totalChangePercent.toFixed(2)}%
                        </div>
                      )}
                    </div>
                    {totalChange !== 0 && (
                      <div className="flex items-center gap-2 text-sm mb-4">
                        <span className="opacity-80">Today's Change:</span>
                        <span className="font-semibold text-base">
                          {totalChange >= 0 ? '+' : ''}{formatCurrency(totalChange)}
                        </span>
                      </div>
                    )}
                    
                    {/* Timeframe Selector */}
                    <div className="flex items-center gap-1 bg-white/10 backdrop-blur-sm rounded-xl p-1">
                      {(['1D', '1W', '1M', '1Y', 'ALL'] as const).map((tf: any) => (
                        <button
                          key={tf}
                          onClick={() => setSelectedTimeframe(tf)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                            selectedTimeframe === tf
                              ? 'bg-white text-blue-600 shadow-lg'
                              : 'text-white/70 hover:text-white hover:bg-white/10'
                          }`}
                        >
                          {tf}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                
                {/* Mini Chart Visualization */}
                <div className="h-20 flex items-end gap-1 mb-2">
                  {Array.from({ length: 30 }).map((_: any, i: any) => {
                    const height = 20 + Math.random() * 60;
                    const isPositive = Math.random() > 0.4;
                    return (
                      <div
                        key={i}
                        className={`flex-1 rounded-t transition-all hover:opacity-80 ${
                          isPositive ? 'bg-green-400/60' : 'bg-red-400/60'
                        }`}
                        style={{ height: `${height}%` }}
                      />
                    );
                  })}
                </div>
                <div className="flex items-center justify-between text-xs opacity-60">
                  <span>Performance over time</span>
                  <span className="flex items-center gap-1">
                    <Activity className="w-3 h-3" />
                    Real-time data
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Actions & Insights Card */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 border border-gray-200 dark:border-gray-800 shadow-sm">
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-4 flex items-center gap-2">
                <Zap className="w-4 h-4" />
                Quick Actions
              </h3>
              <div className="space-y-2.5 mb-6">
                <button
                  onClick={openAddAssetModal}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-all hover:shadow-lg hover:scale-[1.02]"
                >
                  <Plus className="w-4 h-4" />
                  Add Asset
                </button>
                <button className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-900 dark:text-white rounded-xl font-medium transition-all">
                  <Download className="w-4 h-4" />
                  Export PDF
                </button>
                <button className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-500 text-gray-700 dark:text-gray-300 rounded-xl font-medium transition-all">
                  <BarChart3 className="w-4 h-4" />
                  Analytics
                </button>
              </div>
              
              {/* Quick Stats */}
              <div className="space-y-3 pt-4 border-t border-gray-200 dark:border-gray-800">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400 flex items-center gap-2">
                    <Target className="w-4 h-4" />
                    Avg. Return
                  </span>
                  <span className="font-semibold text-green-600 dark:text-green-400">
                    +{totalChangePercent > 0 ? totalChangePercent.toFixed(1) : '0.0'}%
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400 flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Updated
                  </span>
                  <span className="font-medium text-gray-900 dark:text-white">Just now</span>
                </div>
              </div>
            </div>
          </div>

          {/* Performance Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-gray-900 rounded-xl p-5 border border-gray-200 dark:border-gray-800 hover:shadow-lg hover:border-blue-300 dark:hover:border-blue-700 transition-all group cursor-pointer">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Briefcase className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Assets</span>
                </div>
              </div>
              <div className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
                {sections.reduce((sum: any, s: any) => sum + s.assets.length, 0)}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                Total holdings
              </div>
            </div>
            
            <div className="bg-white dark:bg-gray-900 rounded-xl p-5 border border-gray-200 dark:border-gray-800 hover:shadow-lg hover:border-purple-300 dark:hover:border-purple-700 transition-all group cursor-pointer">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <PieChart className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Diversity</span>
                </div>
              </div>
              <div className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
                {sections.length}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                Sections
              </div>
            </div>

            <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl p-5 border border-green-200 dark:border-green-800 hover:shadow-lg transition-all group cursor-pointer">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/40 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <TrendingUp className="w-5 h-5 text-green-600 dark:text-green-400" />
                  </div>
                  <span className="text-xs font-medium text-green-700 dark:text-green-400 uppercase tracking-wide">Performance</span>
                </div>
              </div>
              <div className="text-3xl font-bold text-green-600 dark:text-green-400 mb-1">
                {totalChangePercent >= 0 ? '+' : ''}{totalChangePercent.toFixed(1)}%
              </div>
              <div className="text-xs text-green-600/70 dark:text-green-400/70">
                Total return
              </div>
            </div>

            <div className="bg-white dark:bg-gray-900 rounded-xl p-5 border border-gray-200 dark:border-gray-800 hover:shadow-lg hover:border-orange-300 dark:hover:border-orange-700 transition-all group cursor-pointer">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-lg bg-orange-100 dark:bg-orange-900/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Star className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                  </div>
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Rating</span>
                </div>
              </div>
              <div className="text-3xl font-bold text-gray-900 dark:text-white mb-1 flex items-center gap-1">
                A+
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                Portfolio health
              </div>
            </div>
          </div>
        </div>

        {/* Header with Advanced Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">Portfolio Overview</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Track and manage all your investments</p>
          </div>
          <div className="flex items-center gap-3">
            {/* Sort Dropdown */}
            <div className="relative">
              <button className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                <ArrowUpDown className="w-4 h-4" />
                Sort: {sortBy === 'value' ? 'Value' : sortBy === 'change' ? 'Change' : sortBy === 'name' ? 'Name' : 'Symbol'}
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>
            
            {/* Filter Button */}
            <button 
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-4 py-2 border rounded-xl text-sm font-medium transition-all ${
                showFilters 
                  ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700 text-blue-600 dark:text-blue-400' 
                  : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}
            >
              <Filter className="w-4 h-4" />
              Filters
              {showFilters && <span className="w-2 h-2 bg-blue-600 rounded-full"></span>}
            </button>
            
            {/* View Toggle */}
            <div className="flex items-center gap-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-1">
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-lg transition-colors ${
                  viewMode === 'list'
                    ? 'bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                    : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
                }`}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-lg transition-colors ${
                  viewMode === 'grid'
                    ? 'bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                    : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
                }`}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zM14 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Advanced Filters Panel */}
        {showFilters && (
          <div className="mb-6 p-5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Asset Type
                </label>
                <select className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                  <option>All Assets</option>
                  <option>Stocks</option>
                  <option>Crypto</option>
                  <option>Real Estate</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Performance
                </label>
                <select className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                  <option>All Performance</option>
                  <option>Gainers Only</option>
                  <option>Losers Only</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Value Range
                </label>
                <select className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                  <option>Any Value</option>
                  <option>Under $1,000</option>
                  <option>$1,000 - $10,000</option>
                  <option>Over $10,000</option>
                </select>
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between">
              <button className="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
                Clear all filters
              </button>
              <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors">
                Apply Filters
              </button>
            </div>
          </div>
        )}

        {/* Category Tabs */}
        <div className="flex items-center gap-2 mb-6 bg-white dark:bg-gray-900 rounded-xl p-1.5 border border-gray-200 dark:border-gray-800 w-fit">
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium transition-colors">
            <div className="flex items-center gap-2">
              <Briefcase className="w-4 h-4" />
              Investments
            </div>
          </button>
          <button className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-sm font-medium transition-colors">
            <div className="flex items-center gap-2">
              <Home className="w-4 h-4" />
              Real Estate
            </div>
          </button>
          <button className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-sm font-medium transition-colors">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              Others
            </div>
          </button>
        </div>

        {/* Sections */}
        {sections.map((section: any, idx: any) => {
          // Calculate live section value using current market prices
          const liveSectionValue = section.assets.reduce((sum: any, asset: any) => {
            const livePrice = prices.get(asset.symbol) || (asset.value / asset.shares);
            return sum + (livePrice * asset.shares);
          }, 0);
          
          const isCollapsed = collapsedSections.has(section.title);
          return (
            <div className="mb-6" key={section.title}>
              <div
                className="flex items-center justify-between mb-3 cursor-pointer group"
                onClick={() => toggleSection(section.title)}
              >
                <div className="flex items-center gap-3">
                  <ChevronDown
                    className={`w-5 h-5 text-gray-400 transition-transform ${
                      isCollapsed ? '-rotate-90' : ''
                    }`}
                  />
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {section.title}
                  </h2>
                  <span className="px-2.5 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-xs font-medium rounded-full">
                    {section.assets.length} {section.assets.length === 1 ? 'asset' : 'assets'}
                  </span>
                </div>
                <span className="text-lg font-semibold text-gray-900 dark:text-white">
                  {formatCurrency(liveSectionValue)}
                </span>
              </div>
              
              {!isCollapsed && (
                <div className="space-y-3">
                  {idx === 0 && connectingBanks.map((bank: any) => (
                    <ConnectingBankItem key={bank.id} bank={bank} />
                  ))}
                  {section.assets.map((asset: any) => (
                    <AssetItem
                      key={asset.id}
                      asset={asset}
                      livePrice={prices.get(asset.symbol)}
                      onDelete={() => removeAsset(section.title, asset.id)}
                    />
                  ))}
                  <button
                    onClick={(e: any) => {
                      e.stopPropagation();
                      openAddAssetModal();
                    }}
                    className="w-full flex items-center justify-center gap-2 px-4 py-4 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-xl font-medium transition-colors border-2 border-dashed border-gray-300 dark:border-gray-700"
                  >
                    <Plus className="w-5 h-5" />
                    Add Asset to {section.title}
                  </button>
                </div>
              )}
            </div>
          );
        })}

        {/* Empty State or Add Section */}
        {!hasAnyAssets && connectingBanks.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-gray-900 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-2xl">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center">
                <Wallet2 className="w-8 h-8 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No assets yet</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6">Start building your portfolio by adding your first asset</p>
            <button
              onClick={openAddAssetModal}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors"
            >
              Add Your First Asset
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-4 mt-8">
            <button
              onClick={addNewSection}
              className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              <Plus className="w-4 h-4" />
              New Section
            </button>
            <button
              onClick={openAddAssetModal}
              className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Asset
            </button>
          </div>
        )}
      </div>

      {/* Add Asset Modal */}
      <AddAssetModal
        isOpen={showAddAssetModal}
        onClose={() => setShowAddAssetModal(false)}
        onAddAssets={handleAddAssets}
      />
    </div>
  );
}

// Animated Connecting Bank Component
function ConnectingBankItem({ bank }: { bank: ConnectingBank }) {
  const [animatedValue, setAnimatedValue] = useState(bank.value);
  const { formatCurrency } = useCurrencyFormatter();

  useEffect(() => {
    const interval = setInterval(() => {
      setAnimatedValue((prev: any) => {
        const change = Math.floor(Math.random() * 200) - 100;
        return Math.max(0, prev + change);
      });
    }, 150);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5 flex items-center justify-between hover:shadow-lg hover:border-blue-300 dark:hover:border-blue-700 transition-all group">
      <div className="flex items-center gap-4 flex-1">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 text-white flex items-center justify-center font-bold text-base shadow-lg">
          {bank.name.substring(0, 2).toUpperCase()}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-gray-900 dark:text-white text-base">{bank.name}</h3>
            <Loader2 className="w-4 h-4 text-blue-600 dark:text-blue-400 animate-spin" />
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">{bank.message}</p>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <div className="text-right">
          <p className="text-xl font-bold text-gray-900 dark:text-white tabular-nums">
            {formatCurrency(animatedValue)}
          </p>
        </div>
        <button
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
          aria-label="Options"
        >
          <MoreHorizontal className="w-5 h-5 text-gray-400" />
        </button>
      </div>
    </div>
  );
}

// Asset Item Component with Live Prices
function AssetItem({ 
  asset, 
  livePrice, 
  onDelete 
}: { 
  asset: StorageAsset; 
  livePrice?: number;
  onDelete?: () => void;
}) {
  const { formatCurrency } = useCurrencyFormatter();
  const [showMenu, setShowMenu] = useState(false);
  const [isStarred, setIsStarred] = useState(false);
  
  // Calculate live value based on current market price
  const currentPrice = livePrice || (asset.value / asset.shares);
  const liveValue = currentPrice * asset.shares;
  
  // Calculate change from original purchase value
  const originalPrice = asset.value / asset.shares;
  const priceChange = currentPrice - originalPrice;
  const priceChangePercent = (priceChange / originalPrice) * 100;
  const isPositive = priceChangePercent >= 0;
  
  // Calculate profit/loss amount
  const profitLoss = (currentPrice - originalPrice) * asset.shares;
  
  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5 flex items-center justify-between hover:shadow-xl hover:border-blue-300 dark:hover:border-blue-700 transition-all duration-300 group relative overflow-hidden">
      {/* Gradient background on hover */}
      <div className="absolute inset-0 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/5 dark:to-purple-900/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
      
      <div className="flex items-center gap-4 flex-1 relative z-10">
        {/* Asset Icon and Symbol */}
        <div className="flex flex-col items-center min-w-[80px]">
          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30 flex items-center justify-center mb-1.5 shadow-sm group-hover:shadow-md transition-shadow border border-gray-200 dark:border-gray-700">
            <span className="text-base font-bold bg-gradient-to-br from-blue-600 to-purple-600 bg-clip-text text-transparent">
              {asset.symbol.substring(0, 3)}
            </span>
          </div>
          <span className="text-xs font-mono text-gray-600 dark:text-gray-400 font-medium">
            {asset.symbol}
          </span>
        </div>
        
        {/* Asset Details */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-gray-900 dark:text-white text-base truncate">
              {asset.name}
            </h3>
            <button
              onClick={() => setIsStarred(!isStarred)}
              className="opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <Star className={`w-4 h-4 ${isStarred ? 'fill-yellow-400 text-yellow-400' : 'text-gray-400'}`} />
            </button>
          </div>
          <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
            <span className="flex items-center gap-1">
              <DollarSign className="w-3.5 h-3.5" />
              {asset.shares.toFixed(4)} shares
            </span>
            <span className="flex items-center gap-1">
              <Percent className="w-3.5 h-3.5" />
              {formatCurrency(currentPrice)} each
            </span>
          </div>
        </div>
      </div>
      
      {/* Value and Performance */}
      <div className="flex items-center gap-8 relative z-10">
        <div className="text-right">
          <p className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
            {formatCurrency(liveValue)}
          </p>
          {livePrice && priceChangePercent !== 0 && (
            <>
              <div className={`flex items-center justify-end gap-1 text-sm font-bold mb-1 ${
                isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
              }`}>
                {isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                {isPositive ? '+' : ''}{priceChangePercent.toFixed(2)}%
              </div>
              <div className={`text-xs font-medium ${
                isPositive ? 'text-green-600/70 dark:text-green-400/70' : 'text-red-600/70 dark:text-red-400/70'
              }`}>
                {isPositive ? '+' : ''}{formatCurrency(profitLoss)} P/L
              </div>
            </>
          )}
        </div>
        
        {/* Actions Menu */}
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-2.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-all opacity-0 group-hover:opacity-100 hover:scale-110"
            aria-label="Options"
          >
            <MoreHorizontal className="w-5 h-5 text-gray-400" />
          </button>
          {showMenu && (
            <div className="absolute right-0 top-12 w-48 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-xl py-2 z-20 animate-in fade-in slide-in-from-top-2 duration-200">
              <button className="w-full text-left px-4 py-2.5 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-gray-700 dark:text-gray-300 text-sm font-medium transition-colors flex items-center gap-2">
                <Eye className="w-4 h-4" />
                View Details
              </button>
              <button className="w-full text-left px-4 py-2.5 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-gray-700 dark:text-gray-300 text-sm font-medium transition-colors flex items-center gap-2">
                <Edit2 className="w-4 h-4" />
                Edit Asset
              </button>
              <div className="my-1 border-t border-gray-200 dark:border-gray-700"></div>
              {onDelete && (
                <button
                  onClick={() => {
                    onDelete();
                    setShowMenu(false);
                  }}
                  className="w-full text-left px-4 py-2.5 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 text-sm font-medium transition-colors flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete Asset
                </button>
              )}
            </div>
          )}
        </div>
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
