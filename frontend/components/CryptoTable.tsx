'use client';
import { Star } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

interface CryptoData {
  rank: number;
  id: string;
  symbol: string;
  name: string;
  price: number;
  change1h: number;
  change24h: number;
  change7d: number;
  marketCap: number;
  volume24h: number;
  circulatingSupply: number;
  sparkline: number[];
  logo?: string;
  lastUpdated?: string;
}

interface CryptoAPIResponse {
  data: CryptoData[];
  total: number;
  page: number;
  limit: number;
  provider: string;
  timestamp: string;
}

// Fallback data if API fails
const FALLBACK_DATA: CryptoData[] = [
  {
    rank: 1,
    id: 'bitcoin',
    symbol: 'BTC',
    name: 'Bitcoin',
    price: 120697.39,
    change1h: -0.24,
    change24h: 2.83,
    change7d: 10.44,
    marketCap: 2405282125951,
    volume24h: 71334567518,
    circulatingSupply: 19.92,
    sparkline: [100, 102, 98, 105, 103, 108, 110],
  },
  {
    rank: 2,
    id: 'ethereum',
    symbol: 'ETH',
    name: 'Ethereum',
    price: 4486.28,
    change1h: -0.08,
    change24h: 3.49,
    change7d: 15.14,
    marketCap: 541508268218,
    volume24h: 48181429305,
    circulatingSupply: 120.7,
    sparkline: [100, 103, 101, 107, 105, 112, 115],
  },
  {
    rank: 3,
    id: 'xrp',
    symbol: 'XRP',
    name: 'XRP',
    price: 3.08,
    change1h: -0.1,
    change24h: 4.0,
    change7d: 11.08,
    marketCap: 183682617374,
    volume24h: 6931963704,
    circulatingSupply: 59.87,
    sparkline: [100, 101, 99, 104, 106, 109, 111],
  },
  {
    rank: 4,
    id: 'tether',
    symbol: 'USDT',
    name: 'Tether',
    price: 1.0,
    change1h: 0.01,
    change24h: 0.02,
    change7d: 0.02,
    marketCap: 175837855452,
    volume24h: 168301765443,
    circulatingSupply: 175.72,
    sparkline: [100, 100, 100, 100, 100, 100, 100],
  },
  {
    rank: 5,
    id: 'bnb',
    symbol: 'BNB',
    name: 'BNB',
    price: 1078.04,
    change1h: 0.34,
    change24h: 5.69,
    change7d: 12.45,
    marketCap: 148769491792,
    volume24h: 3388003437,
    circulatingSupply: 139.16,
    sparkline: [100, 102, 104, 106, 108, 110, 112],
  },
  {
    rank: 6,
    id: 'solana',
    symbol: 'SOL',
    name: 'Solana',
    price: 232.34,
    change1h: -0.5,
    change24h: 5.61,
    change7d: 17.25,
    marketCap: 126295349053,
    volume24h: 9178333920,
    circulatingSupply: 543.57,
    sparkline: [100, 103, 105, 102, 108, 112, 117],
  },
  {
    rank: 7,
    id: 'usdc',
    symbol: 'USDC',
    name: 'USDC',
    price: 0.9998,
    change1h: 0.01,
    change24h: 0.0,
    change7d: -0.01,
    marketCap: 74321446481,
    volume24h: 19168224004,
    circulatingSupply: 74.33,
    sparkline: [100, 100, 100, 100, 100, 100, 100],
  },
  {
    rank: 8,
    id: 'dogecoin',
    symbol: 'DOGE',
    name: 'Dogecoin',
    price: 0.2593,
    change1h: -0.36,
    change24h: 5.14,
    change7d: 14.92,
    marketCap: 39216794885,
    volume24h: 3301691842,
    circulatingSupply: 151.18,
    sparkline: [100, 102, 101, 105, 107, 110, 115],
  },
];

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export function CryptoTable() {
  const [cryptos, setCryptos] = useState<CryptoData[]>(FALLBACK_DATA);
  const [watchlist, setWatchlist] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState<'rank' | 'price' | 'change24h' | 'marketCap'>('rank');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [provider, setProvider] = useState<string>('');

  // Fetch crypto data from backend
  useEffect(() => {
    const fetchCryptos = async () => {
      try {
        setLoading(true);
        setError(null);

        const params = new URLSearchParams({
          limit: '100',
          page: currentPage.toString(),
        });

        if (selectedCategory && selectedCategory !== 'all') {
          params.append('category', selectedCategory);
        }

        const response = await fetch(`${BACKEND_URL}/api/crypto/list?${params}`);

        if (!response.ok) {
          throw new Error(`Failed to fetch: ${response.status}`);
        }

        const data: CryptoAPIResponse = await response.json();
        setCryptos(data.data);
        setProvider(data.provider || 'unknown');
        setLoading(false);
      } catch (err) {
        console.error('Error fetching crypto data:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch data');
        // Keep fallback data on error
        setCryptos(FALLBACK_DATA);
        setLoading(false);
      }
    };

    fetchCryptos();

    // Refresh every 30 seconds
    const interval = setInterval(fetchCryptos, 30000);

    return () => clearInterval(interval);
  }, [currentPage, selectedCategory]);

  const toggleWatchlist = (id: string) => {
    const newWatchlist = new Set(watchlist);
    if (newWatchlist.has(id)) {
      newWatchlist.delete(id);
    } else {
      newWatchlist.add(id);
    }
    setWatchlist(newWatchlist);
  };

  const formatPrice = (price: number) => {
    if (price < 1) return `$${price.toFixed(4)}`;
    if (price < 100) return `$${price.toFixed(2)}`;
    return `$${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatMarketCap = (cap: number) => {
    if (cap >= 1e12) return `$${(cap / 1e12).toFixed(2)}T`;
    if (cap >= 1e9) return `$${(cap / 1e9).toFixed(2)}B`;
    if (cap >= 1e6) return `$${(cap / 1e6).toFixed(2)}M`;
    return `$${cap.toLocaleString()}`;
  };

  const formatVolume = (vol: number) => {
    if (vol >= 1e9) return `$${(vol / 1e9).toFixed(2)}B`;
    if (vol >= 1e6) return `$${(vol / 1e6).toFixed(2)}M`;
    return `$${vol.toLocaleString()}`;
  };

  const renderSparkline = (data: number[]) => {
    const max = Math.max(...data);
    const min = Math.min(...data);
    const range = max - min;
    const points = data
      .map((val, i) => {
        const x = (i / (data.length - 1)) * 100;
        const y = 100 - ((val - min) / range) * 100;
        return `${x},${y}`;
      })
      .join(' ');

    const isPositive = data[data.length - 1] >= data[0];
    const color = isPositive ? '#16a34a' : '#dc2626';

    return (
      <svg width="100" height="40" className="inline-block">
        <polyline
          points={points}
          fill="none"
          stroke={color}
          strokeWidth="2"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    );
  };

  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
      {/* Table Header Tabs */}
      <div className="flex items-center gap-4 px-6 py-4 border-b border-gray-700 bg-gray-900">
        <button className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg">
          All Cryptocurrencies
        </button>
        <button className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg">
          DeFi
        </button>
        <button className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg">
          NFT
        </button>
        <button className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg">
          Metaverse
        </button>
        <button className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg">
          Gaming
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-700 bg-gray-900">
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider w-12">
                #
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                Name
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                Price
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                1h %
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                24h %
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                7d %
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                Market Cap
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                Volume(24h)
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                Circulating Supply
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider w-32">
                Last 7 Days
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {cryptos.map((crypto) => (
              <tr key={crypto.id} className="hover:bg-gray-750 transition-colors cursor-pointer">
                <td className="px-4 py-4">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleWatchlist(crypto.id);
                      }}
                      className="text-gray-400 hover:text-yellow-400 transition-colors"
                    >
                      <Star
                        size={16}
                        className={
                          watchlist.has(crypto.id) ? 'fill-yellow-400 text-yellow-400' : ''
                        }
                      />
                    </button>
                    <span className="text-gray-400 text-sm">{crypto.rank}</span>
                  </div>
                </td>
                <td className="px-4 py-4">
                  <Link href={`/chart?symbol=${crypto.symbol}`}>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-lg font-bold">
                        {crypto.symbol.charAt(0)}
                      </div>
                      <div>
                        <div className="font-medium text-white">{crypto.name}</div>
                        <div className="text-sm text-gray-400">{crypto.symbol}</div>
                      </div>
                    </div>
                  </Link>
                </td>
                <td className="px-4 py-4 text-right font-medium text-white">
                  {formatPrice(crypto.price)}
                </td>
                <td
                  className={`px-4 py-4 text-right text-sm ${crypto.change1h >= 0 ? 'text-green-500' : 'text-red-500'}`}
                >
                  {crypto.change1h >= 0 ? '+' : ''}
                  {crypto.change1h.toFixed(2)}%
                </td>
                <td
                  className={`px-4 py-4 text-right text-sm ${crypto.change24h >= 0 ? 'text-green-500' : 'text-red-500'}`}
                >
                  {crypto.change24h >= 0 ? '+' : ''}
                  {crypto.change24h.toFixed(2)}%
                </td>
                <td
                  className={`px-4 py-4 text-right text-sm ${crypto.change7d >= 0 ? 'text-green-500' : 'text-red-500'}`}
                >
                  {crypto.change7d >= 0 ? '+' : ''}
                  {crypto.change7d.toFixed(2)}%
                </td>
                <td className="px-4 py-4 text-right text-white">
                  <div>{formatMarketCap(crypto.marketCap)}</div>
                </td>
                <td className="px-4 py-4 text-right text-white">
                  <div>{formatVolume(crypto.volume24h)}</div>
                </td>
                <td className="px-4 py-4 text-right text-white">
                  <div>
                    {crypto.circulatingSupply}M {crypto.symbol}
                  </div>
                </td>
                <td className="px-4 py-4 text-right">{renderSparkline(crypto.sparkline)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between px-6 py-4 border-t border-gray-700 bg-gray-900">
        <div className="text-sm text-gray-400">Showing 1-10 of 14,234 cryptocurrencies</div>
        <div className="flex items-center gap-2">
          <button className="px-3 py-1 text-sm text-gray-400 hover:text-white border border-gray-700 rounded hover:bg-gray-700">
            Previous
          </button>
          <button className="px-3 py-1 text-sm bg-blue-600 text-white rounded">1</button>
          <button className="px-3 py-1 text-sm text-gray-400 hover:text-white border border-gray-700 rounded hover:bg-gray-700">
            2
          </button>
          <button className="px-3 py-1 text-sm text-gray-400 hover:text-white border border-gray-700 rounded hover:bg-gray-700">
            3
          </button>
          <span className="px-2 text-gray-400">...</span>
          <button className="px-3 py-1 text-sm text-gray-400 hover:text-white border border-gray-700 rounded hover:bg-gray-700">
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
