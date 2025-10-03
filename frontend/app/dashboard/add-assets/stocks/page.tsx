'use client';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ArrowLeft, Search } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function AddStocksPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStock, setSelectedStock] = useState<string | null>(null);
  const [quantity, setQuantity] = useState('');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAddStock = async () => {
    if (!selectedStock || !quantity) {
      alert('Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      // Get stock details
      const stockDetails = popularStocks.find((s) => s.symbol === selectedStock);

      // Save to localStorage
      const storedAssets = localStorage.getItem('portfolioAssets');
      const assets = storedAssets ? JSON.parse(storedAssets) : [];

      const newAsset = {
        id: `${selectedStock}-${Date.now()}`,
        name: stockDetails?.name || selectedStock,
        symbol: selectedStock,
        type: 'stock',
        shares: parseInt(quantity),
        value: Math.floor(Math.random() * 10000) + 1000, // Random value for demo
      };

      assets.push(newAsset);
      localStorage.setItem('portfolioAssets', JSON.stringify(assets));

      // Also try to save to backend API
      try {
        await fetch('http://localhost:8000/api/portfolio', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            symbol: selectedStock,
            qty: parseFloat(quantity),
            cost_basis: parseFloat(purchasePrice || '0'),
            tags: ['stock'],
          }),
        });
      } catch (apiError) {
        console.log('Backend API not available, using localStorage only');
      }

      // Redirect to assets page
      router.push('/dashboard/assets');
    } catch (error) {
      console.error('Error adding stock:', error);
      alert('Error adding stock');
    } finally {
      setLoading(false);
    }
  };

  const popularStocks = [
    { symbol: 'AAPL', name: 'Apple Inc.' },
    { symbol: 'MSFT', name: 'Microsoft Corporation' },
    { symbol: 'GOOGL', name: 'Alphabet Inc.' },
    { symbol: 'AMZN', name: 'Amazon.com Inc.' },
    { symbol: 'TSLA', name: 'Tesla Inc.' },
    { symbol: 'NVDA', name: 'NVIDIA Corporation' },
    { symbol: 'META', name: 'Meta Platforms Inc.' },
    { symbol: 'JPM', name: 'JPMorgan Chase & Co.' },
  ];

  const filteredStocks = searchQuery
    ? popularStocks.filter(
        (stock) =>
          stock.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
          stock.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : popularStocks;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <button
            onClick={() => router.push('/dashboard/add-assets')}
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back</span>
          </button>
          <h1 className="text-xl font-bold text-gray-900">Add Stock Tickers</h1>
          <div className="w-20"></div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto p-8">
        <Card className="p-8 bg-white shadow-sm rounded-2xl border border-gray-200">
          {/* Search */}
          <div className="mb-8">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Search Stock Symbol or Name
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="e.g., AAPL, Apple, TSLA..."
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Popular Stocks */}
          <div className="mb-8">
            <h3 className="text-sm font-medium text-gray-700 mb-4">Popular Stocks</h3>
            <div className="grid grid-cols-2 gap-3">
              {filteredStocks.map((stock) => (
                <button
                  key={stock.symbol}
                  onClick={() => setSelectedStock(stock.symbol)}
                  className={`p-4 rounded-lg border-2 text-left transition-all ${
                    selectedStock === stock.symbol
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="font-semibold text-gray-900">{stock.symbol}</div>
                  <div className="text-sm text-gray-500">{stock.name}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Stock Details Form */}
          {selectedStock && (
            <div className="space-y-6 pt-6 border-t border-gray-200">
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="text-sm text-gray-600 mb-1">Selected Stock</div>
                <div className="text-2xl font-bold text-gray-900">{selectedStock}</div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Quantity (Shares)
                  </label>
                  <input
                    type="number"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    placeholder="e.g., 10"
                    step="0.01"
                    min="0"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Purchase Price per Share ($)
                  </label>
                  <input
                    type="number"
                    value={purchasePrice}
                    onChange={(e) => setPurchasePrice(e.target.value)}
                    placeholder="e.g., 150.00"
                    step="0.01"
                    min="0"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Total Cost Preview */}
              {quantity && purchasePrice && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Total Cost:</span>
                    <span className="text-2xl font-bold text-gray-900">
                      ${(parseFloat(quantity) * parseFloat(purchasePrice)).toFixed(2)}
                    </span>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex space-x-4 pt-4">
                <Button
                  onClick={handleAddStock}
                  disabled={loading || !quantity}
                  className="flex-1 bg-black hover:bg-gray-800 text-white px-6 py-3 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Adding...' : 'Done'}
                </Button>
                <Button
                  onClick={() => router.push('/dashboard/add-assets')}
                  className="px-6 py-3 rounded-lg border border-gray-300 hover:bg-gray-50 font-medium"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
