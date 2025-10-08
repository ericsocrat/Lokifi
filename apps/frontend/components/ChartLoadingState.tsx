'use client';
import { Loader2, TrendingUp } from 'lucide-react';

interface LoadingStateProps {
  symbol?: string;
  timeframe?: string;
  message?: string;
}

export function ChartLoadingState({ symbol, timeframe, message }: LoadingStateProps) {
  return (
    <div className="flex flex-col items-center justify-center h-96 bg-neutral-900 rounded-2xl border border-neutral-800 p-8">
      <div className="relative mb-4">
        <TrendingUp className="w-12 h-12 text-electric opacity-50" />
        <Loader2 className="w-6 h-6 text-electric animate-spin absolute -top-1 -right-1" />
      </div>
      <h3 className="text-lg font-semibold text-white mb-2">Loading Chart</h3>
      <p className="text-neutral-400 text-center">
        {message || `Fetching ${symbol || 'market'} data${timeframe ? ` (${timeframe})` : ''}...`}
      </p>
    </div>
  );
}
