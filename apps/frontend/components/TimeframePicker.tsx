'use client';
import { timeframeStore, type TF } from '@/lib/stores/timeframeStore';
import { Clock } from 'lucide-react';
import { useEffect, useState } from 'react';

// TradingView-standard timeframe intervals with labels
const TIMEFRAMES: { value: TF; label: string }[] = [
  { value: '1m', label: '1m' },
  { value: '5m', label: '5m' },
  { value: '15m', label: '15m' },
  { value: '30m', label: '30m' },
  { value: '1h', label: '1H' },
  { value: '4h', label: '4H' },
  { value: '1d', label: '1D' },
  { value: '1w', label: '1W' },
  { value: '1M', label: '1M' },
];

export default function TimeframePicker() {
  const [active, setActive] = useState<TF>(timeframeStore.get());

  useEffect(() => {
    const unsub = timeframeStore.subscribe((t) => setActive(t));
    return () => unsub();
  }, []);

  return (
    <div className="flex items-center gap-2">
      {/* Timeframe Icon */}
      <div className="flex items-center gap-1.5 text-xs text-gray-400">
        <Clock className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Timeframe</span>
      </div>

      {/* Timeframe Buttons */}
      <div className="flex items-center gap-1 bg-gray-800/50 rounded-lg p-1">
        {TIMEFRAMES.map((tf) => (
          <button
            key={tf.value}
            onClick={() => timeframeStore.set(tf.value)}
            className={`px-2.5 py-1 text-xs font-bold rounded transition-all ${
              active === tf.value
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
            }`}
            title={`Switch to ${tf.label} timeframe`}
          >
            {tf.label}
          </button>
        ))}
      </div>
    </div>
  );
}
