'use client';

import { Card } from '@/components/ui/card';
import {
  Bitcoin,
  Building2,
  Car,
  FileText,
  Gem,
  Globe,
  Home,
  LineChart,
  PenTool,
  Scale,
  Wallet2,
} from 'lucide-react';
import { useRouter } from 'next/navigation';

interface AssetCategory {
  id: string;
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  category: 'FINANCIAL' | 'PHYSICAL' | 'GENERIC';
  route: string;
}

export default function AddAssetsPage() {
  const router = useRouter();

  const assetCategories: AssetCategory[] = [
    {
      id: 'banks',
      title: 'Connect',
      subtitle: 'Banks & Brokerages',
      icon: <Building2 className="w-12 h-12" />,
      category: 'FINANCIAL',
      route: '/dashboard/add-assets/banks',
    },
    {
      id: 'stocks',
      title: 'Stock',
      subtitle: 'Tickers',
      icon: <LineChart className="w-12 h-12" />,
      category: 'FINANCIAL',
      route: '/dashboard/add-assets/stocks',
    },
    {
      id: 'crypto-tickers',
      title: 'Crypto',
      subtitle: 'Tickers',
      icon: <Bitcoin className="w-12 h-12" />,
      category: 'FINANCIAL',
      route: '/dashboard/add-assets/crypto-tickers',
    },
    {
      id: 'crypto-wallets',
      title: 'Crypto',
      subtitle: 'Exchanges & Wallets',
      icon: <Wallet2 className="w-12 h-12" />,
      category: 'FINANCIAL',
      route: '/dashboard/add-assets/crypto-wallets',
    },
    {
      id: 'link-portfolio',
      title: 'Link another',
      subtitle: 'Portfolio',
      icon: (
        <svg className="w-12 h-12" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
          />
        </svg>
      ),
      category: 'FINANCIAL',
      route: '/dashboard/add-assets/link-portfolio',
    },
    {
      id: 'homes',
      title: 'Homes',
      subtitle: '',
      icon: <Home className="w-12 h-12" />,
      category: 'PHYSICAL',
      route: '/dashboard/add-assets/homes',
    },
    {
      id: 'cars',
      title: 'Cars',
      subtitle: '',
      icon: <Car className="w-12 h-12" />,
      category: 'PHYSICAL',
      route: '/dashboard/add-assets/cars',
    },
    {
      id: 'precious-metals',
      title: 'Precious',
      subtitle: 'Metals',
      icon: <Gem className="w-12 h-12" />,
      category: 'PHYSICAL',
      route: '/dashboard/add-assets/precious-metals',
    },
    {
      id: 'domains',
      title: 'Domains',
      subtitle: '',
      icon: <Globe className="w-12 h-12" />,
      category: 'PHYSICAL',
      route: '/dashboard/add-assets/domains',
    },
    {
      id: 'files',
      title: 'AI Import:',
      subtitle: 'Files & Screenshots',
      icon: <FileText className="w-12 h-12" />,
      category: 'GENERIC',
      route: '/dashboard/add-assets/files',
    },
    {
      id: 'quantity-price',
      title: 'Input',
      subtitle: 'Quantity & Price',
      icon: <Scale className="w-12 h-12" />,
      category: 'GENERIC',
      route: '/dashboard/add-assets/quantity-price',
    },
    {
      id: 'manual',
      title: 'Enter Value',
      subtitle: 'Manually',
      icon: <PenTool className="w-12 h-12" />,
      category: 'GENERIC',
      route: '/dashboard/add-assets/manual',
    },
  ];

  const handleCategoryClick = (category: AssetCategory) => {
    // Route to specific asset pages
    router.push(category.route);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-8">
      <div className="max-w-4xl w-full">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-3">All your assets</h1>
          <h2 className="text-4xl font-bold text-gray-900">in one place!</h2>
        </div>

        {/* Asset Grid */}
        <div className="grid grid-cols-3 gap-4">
          {assetCategories.map((asset) => (
            <Card
              key={asset.id}
              onClick={() => handleCategoryClick(asset)}
              className="relative p-6 bg-white hover:bg-gray-50 border border-gray-200 rounded-xl cursor-pointer transition-all hover:shadow-md group"
            >
              {/* Category Label */}
              {asset.category && (
                <div className="absolute top-3 left-3 text-xs text-gray-400 font-medium">
                  {asset.category}
                </div>
              )}

              {/* Content */}
              <div className="flex flex-col items-center justify-center h-full pt-6">
                {/* Icon */}
                <div className="text-gray-700 group-hover:text-gray-900 transition-colors mb-3">
                  {asset.icon}
                </div>

                {/* Title */}
                <div className="text-center">
                  <h3 className="text-base font-semibold text-gray-900 mb-0.5">{asset.title}</h3>
                  {asset.subtitle && (
                    <p className="text-base font-semibold text-gray-900">{asset.subtitle}</p>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Back Button */}
        <div className="mt-8 text-center">
          <button
            onClick={() => router.push('/dashboard')}
            className="text-gray-600 hover:text-gray-900 font-medium text-sm transition-colors"
          >
            ← Back to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
