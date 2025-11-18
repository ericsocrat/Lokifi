'use client';

import { symbolStore } from '@/lib/stores/symbolStore';
import dynamic from 'next/dynamic';
import { useParams } from 'next/navigation';
import { useEffect } from 'react';

const TradingWorkspace = dynamic(
  () =>
    import('../../../components/TradingWorkspace').then((mod) => ({
      default: mod.TradingWorkspace,
    })),
  {
    loading: () => (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-400 font-medium">Loading chart workspace...</p>
        </div>
      </div>
    ),
    ssr: false,
  }
);

export default function ChartSymbolPage() {
  const params = useParams();
  const symbol = params?.symbol as string;

  useEffect(() => {
    if (symbol) {
      symbolStore.setSymbol(symbol.toUpperCase());
    }
  }, [symbol]);

  return <TradingWorkspace />;
}
