'use client';
import dynamic from 'next/dynamic';

// Lazy load TradingWorkspace (contains PriceChart with lightweight-charts)
// This prevents the heavy charting library from blocking initial page load
const TradingWorkspace = dynamic(
  () =>
    import('../../components/TradingWorkspace').then((mod) => ({ default: mod.TradingWorkspace })),
  {
    loading: () => (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <p className="text-sm text-muted-foreground">Loading chart workspace...</p>
        </div>
      </div>
    ),
    ssr: false, // Charts don't need SSR, skip for faster loading
  }
);

export default function ChartPage() {
  return <TradingWorkspace />;
}
