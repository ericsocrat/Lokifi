'use client';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

/**
 * Chart index page - Redirects to default symbol (BTCUSD)
 * This ensures users always land on a chart with data.
 */
export default function ChartIndexPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to default symbol
    router.replace('/chart/BTCUSD');
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="flex flex-col items-center gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        <p className="text-sm text-muted-foreground">Loading chart...</p>
      </div>
    </div>
  );
}
