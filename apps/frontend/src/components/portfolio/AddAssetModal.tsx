'use client';

import { X, Search, ArrowLeft, TrendingUp, Coins, Home, Briefcase, Wallet as WalletIcon, CreditCard, Car, Gem } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useAllAssets, useAssetSearch } from '@/src/hooks/useMarketData';
import { MarketAsset } from '@/src/services/marketData';
import { AssetIcon } from '@/src/utils/assetIcons';

// Asset Categories
export const ASSET_CATEGORIES = [
  { id: 'stocks', name: 'Stocks & ETFs', icon: TrendingUp, description: 'Publicly traded securities' },
  { id: 'crypto', name: 'Cryptocurrency', icon: Coins, description: 'Digital currencies' },
  { id: 'real-estate', name: 'Real Estate', icon: Home, description: 'Properties and land' },
  { id: 'business', name: 'Business', icon: Briefcase, description: 'Business ownership' },
  { id: 'cash', name: 'Cash & Bank', icon: WalletIcon, description: 'Cash and deposits' },
  { id: 'debt', name: 'Debt', icon: CreditCard, description: 'Loans and liabilities' },
  { id: 'vehicle', name: 'Vehicles', icon: Car, description: 'Cars, boats, etc.' },
  { id: 'other', name: 'Other Assets', icon: Gem, description: 'Collectibles, jewelry, etc.' },
];

interface SelectedAsset {
  symbol: string;
  name: string;
  price?: number;
  quantity?: number;
  value?: number;
  category?: string;
  color?: string;
}

interface AddAssetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddAssets: (assets: SelectedAsset[], category: string) => void;
}

export default function AddAssetModal({ isOpen, onClose, onAddAssets }: AddAssetModalProps) {
  const [step, setStep] = useState<'category' | 'selection' | 'quantity'>('category');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAssets, setSelectedAssets] = useState<SelectedAsset[]>([]);
  const [quantities, setQuantities] = useState<{ [key: string]: string }>({});
  const [values, setValues] = useState<{ [key: string]: string }>({});

  // Get real-time market data
  const allStocks = useAllAssets('stock');
  const allCrypto = useAllAssets('crypto');
  const searchResults = useAssetSearch(searchQuery);

  if (!isOpen) return null;

  const handleCategorySelect = (categoryId: string) => {
    setSelectedCategory(categoryId);
    setStep('selection');
  };

  const handleBack = () => {
    if (step === 'quantity') {
      setStep('selection');
    } else if (step === 'selection') {
      setStep('category');
      setSelectedAssets([]);
      setSearchQuery('');
    }
  };

  const handleAssetToggle = (asset: MarketAsset) => {
    const exists = selectedAssets.find((a: any) => a.symbol === asset.symbol);
    if (exists) {
      setSelectedAssets(selectedAssets.filter((a: any) => a.symbol !== asset.symbol));
    } else {
      setSelectedAssets([...selectedAssets, {
        symbol: asset.symbol,
        name: asset.name,
        price: asset.price,
      }]);
    }
  };

  const handleContinue = () => {
    if (step === 'selection' && selectedAssets.length > 0) {
      setStep('quantity');
    }
  };

  const handleDone = () => {
    const assetsWithQuantity = selectedAssets.map((asset: any) => ({
      ...asset,
      quantity: parseFloat(quantities[asset.symbol] || '1'),
      value: parseFloat(values[asset.symbol] || String(asset.price || 0)),
    }));
    onAddAssets(assetsWithQuantity, selectedCategory);
    handleClose();
  };

  const handleClose = () => {
    setStep('category');
    setSelectedCategory('');
    setSearchQuery('');
    setSelectedAssets([]);
    setQuantities({});
    setValues({});
    onClose();
  };

  const getAssetsForCategory = (): MarketAsset[] => {
    if (selectedCategory === 'stocks') return allStocks;
    if (selectedCategory === 'crypto') return allCrypto;
    return [];
  };

  // Use search results if searching, otherwise show all assets for category
  const filteredAssets = searchQuery.trim().length > 0 
    ? searchResults.filter((asset: any) => 
        (selectedCategory === 'stocks' && asset.type === 'stock') ||
        (selectedCategory === 'crypto' && asset.type === 'crypto')
      )
    : getAssetsForCategory();

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center space-x-3">
            {step !== 'category' && (
              <button
                onClick={handleBack}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </button>
            )}
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              {step === 'category' && 'Select Asset Category'}
              {step === 'selection' && `Select ${ASSET_CATEGORIES.find((c: any) => c.id === selectedCategory)?.name}`}
              {step === 'quantity' && 'Enter Details'}
            </h2>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-140px)]">
          {/* Step 1: Category Selection */}
          {step === 'category' && (
            <div className="p-6">
              <div className="grid grid-cols-2 gap-4">
                {ASSET_CATEGORIES.map((category: any) => {
                  const Icon = category.icon;
                  return (
                    <button
                      key={category.id}
                      onClick={() => handleCategorySelect(category.id)}
                      className="p-6 border border-gray-200 dark:border-gray-700 rounded-xl hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all text-left group"
                    >
                      <Icon className="w-8 h-8 text-gray-600 dark:text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 mb-3" />
                      <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">
                        {category.name}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {category.description}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Step 2: Asset Selection */}
          {step === 'selection' && (
            <div className="p-6">
              {/* Market Data Status */}
              <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                <p className="text-xs text-green-900 dark:text-green-100">
                  ✅ <strong>Live Market Data:</strong> 2,070 assets (1,800 stocks + 270 cryptos) updated every 30 minutes from multiple APIs.
                </p>
              </div>
              
              {/* Search */}
              <div className="mb-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search assets..."
                    value={searchQuery}
                    onChange={(e: any) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-gray-100"
                  />
                </div>
              </div>

              {/* Asset List */}
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {filteredAssets.map((asset: any) => {
                  const isSelected = selectedAssets.some((a: any) => a.symbol === asset.symbol);
                  return (
                    <button
                      key={asset.symbol}
                      onClick={() => handleAssetToggle(asset)}
                      className={`w-full p-4 border rounded-lg text-left transition-all ${
                        isSelected
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3 flex-1">
                          <AssetIcon 
                            symbol={asset.symbol} 
                            type={asset.type} 
                            size={40}
                            className="flex-shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-gray-900 dark:text-gray-100">
                              {asset.symbol}
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400 truncate">
                              {asset.name}
                            </div>
                          </div>
                        </div>
                        <div className="text-right ml-3 flex-shrink-0">
                          <div className="font-semibold text-gray-900 dark:text-gray-100">
                            ${asset.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: asset.price < 1 ? 6 : 2 })}
                          </div>
                          <div className={`text-xs ${asset.changePercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {asset.changePercent >= 0 ? '+' : ''}{asset.changePercent.toFixed(2)}%
                          </div>
                          {isSelected && (
                            <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">✓ Selected</div>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {selectedAssets.length > 0 && (
                <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <div className="text-sm text-blue-900 dark:text-blue-100">
                    {selectedAssets.length} asset{selectedAssets.length > 1 ? 's' : ''} selected
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 3: Quantity Input */}
          {step === 'quantity' && (
            <div className="p-6">
              <div className="space-y-4">
                {selectedAssets.map((asset: any) => {
                  // Find the full asset data from the market data
                  const fullAsset = filteredAssets.find((a: any) => a.symbol === asset.symbol);
                  return (
                    <div key={asset.symbol} className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                      <div className="mb-3 flex items-center space-x-3">
                        <AssetIcon 
                          symbol={asset.symbol} 
                          type={fullAsset?.type || 'stock'} 
                          size={36}
                          className="flex-shrink-0"
                        />
                        <div className="flex-1">
                          <div className="font-semibold text-gray-900 dark:text-gray-100">
                            {asset.symbol}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {asset.name}
                          </div>
                        </div>
                        </div>
                      <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Quantity
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          value={quantities[asset.symbol] || ''}
                          onChange={(e: any) => setQuantities({ ...quantities, [asset.symbol]: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-gray-100"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Value ($)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          placeholder={asset.price?.toFixed(2) || '0.00'}
                          value={values[asset.symbol] || ''}
                          onChange={(e: any) => setValues({ ...values, [asset.symbol]: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-gray-100"
                        />
                      </div>
                    </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 dark:border-gray-800 flex items-center justify-end space-x-3">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            Cancel
          </button>
          {step === 'selection' && (
            <button
              onClick={handleContinue}
              disabled={selectedAssets.length === 0}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              Continue ({selectedAssets.length})
            </button>
          )}
          {step === 'quantity' && (
            <button
              onClick={handleDone}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Add Assets
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
