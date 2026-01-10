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
      <main
        className="min-h-screen flex items-center justify-center bg-surface-0"
        role="main"
        aria-label="Loading chart workspace"
      >
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4" />
          <p className="text-surface-300 font-medium">Loading chart workspace...</p>
        </div>
      </main>
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

  return (
    <main
      className="min-h-screen flex items-center justify-center bg-surface-0"
      role="main"
      aria-label={`Chart workspace for ${symbol ? symbol.toUpperCase() : 'selected symbol'}`}
    >
      <TradingWorkspace />
    </main>
  );
}
