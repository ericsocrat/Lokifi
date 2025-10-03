'use client';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Search, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

interface Crypto {
  symbol: string;
  name: string;
  icon?: string;
}

export default function AddCryptoPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCrypto, setSelectedCrypto] = useState<Crypto | null>(null);
  const [quantity, setQuantity] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAddCrypto = async () => {
    if (!selectedCrypto || !quantity) {
      alert('Please select a cryptocurrency and enter quantity');
      return;
    }

    setLoading(true);
    try {
      // Get crypto details
      const cryptoDetails = popularCryptos.find(c => c.symbol === selectedCrypto.symbol);
      
      // Save to localStorage
      const storedAssets = localStorage.getItem('portfolioAssets');
      const assets = storedAssets ? JSON.parse(storedAssets) : [];
      
      const newAsset = {
        id: `${selectedCrypto.symbol}-${Date.now()}`,
        name: cryptoDetails?.name || selectedCrypto.name,
        symbol: selectedCrypto.symbol,
        type: 'crypto',
        shares: parseFloat(quantity),
        value: Math.floor(Math.random() * 100000) + 10000, // Random value for demo
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
            symbol: selectedCrypto.symbol,
            qty: parseFloat(quantity),
            cost_basis: 0,
            tags: ['crypto'],
          }),
        });
      } catch (apiError) {
        console.log('Backend API not available, using localStorage only');
      }

      // Redirect to assets page
      router.push('/dashboard/assets');
    } catch (error) {
      console.error('Error adding crypto:', error);
      alert('Error adding cryptocurrency');
    } finally {
      setLoading(false);
    }
  };

  const popularCryptos: Crypto[] = [
    { symbol: 'BTC', name: 'Bitcoin' },
    { symbol: 'ETH', name: 'Ethereum' },
    { symbol: 'USDT', name: 'Tether' },
    { symbol: 'XRP', name: 'XRP' },
    { symbol: 'BNB', name: 'BNB' },
    { symbol: 'SOL', name: 'Solana' },
    { symbol: 'USDC', name: 'USD Coin' },
    { symbol: 'DOGE', name: 'Dogecoin' },
    { symbol: 'TRX', name: 'TRON' },
    { symbol: 'stETH', name: 'Lido Staked Ether' },
    { symbol: 'ADA', name: 'Cardano' },
    { symbol: 'HYPE', name: 'Hyperliquid' },
  ];

  const filteredCryptos = searchQuery
    ? popularCryptos.filter(
        (crypto) =>
          crypto.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
          crypto.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : popularCryptos;

  // If crypto is selected, show quantity input
  if (selectedCrypto) {
    return (
      <div className="min-h-screen bg-gray-50/50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-white shadow-xl rounded-2xl p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">Crypto Coins</h2>
            <button
              onClick={() => router.push('/dashboard/add-assets')}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Selected Crypto */}
          <div className="mb-6">
            <div className="bg-gray-50 border border-gray-300 rounded-lg p-4 flex items-center justify-between">
              <div>
                <div className="font-semibold text-gray-900">{selectedCrypto.name} ({selectedCrypto.symbol})</div>
              </div>
              <button
                onClick={() => setSelectedCrypto(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Quantity Input */}
          <div className="mb-6">
            <label className="block text-sm text-gray-600 mb-2">Quantity</label>
            <input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="Quantity"
              step="0.00000001"
              min="0"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              autoFocus
            />
          </div>

          {/* Add More Link */}
          <div className="mb-6">
            <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
              Add more
            </button>
          </div>

          {/* Done Button */}
          <button
            onClick={handleAddCrypto}
            disabled={loading || !quantity}
            className="w-full bg-black hover:bg-gray-800 text-white px-6 py-3 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Adding...' : 'Done'}
          </button>
        </Card>
      </div>
    );
  }

  // Default view - show crypto selection
  return (
    <div className="min-h-screen bg-gray-50/50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-white shadow-xl rounded-2xl p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900">Crypto Coins</h2>
          <button
            onClick={() => router.push('/dashboard/add-assets')}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search for a coin name or ticker symbol"
              className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
            />
          </div>
        </div>

        {/* Popular Cryptos Grid */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          {filteredCryptos.map((crypto) => (
            <button
              key={crypto.symbol}
              onClick={() => setSelectedCrypto(crypto)}
              className="p-3 border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all text-center"
            >
              <div className="w-8 h-8 bg-orange-500 rounded-full mx-auto mb-2 flex items-center justify-center text-white text-xs font-bold">
                {crypto.symbol.substring(0, 1)}
              </div>
              <div className="text-xs font-semibold text-gray-900">{crypto.name}</div>
            </button>
          ))}
        </div>

        {/* Search for more */}
        <div className="text-center">
          <p className="text-sm text-gray-500">Search for more coins.</p>
        </div>
      </Card>
    </div>
  );
}
