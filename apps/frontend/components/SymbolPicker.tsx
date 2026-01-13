'use client';
import { symbolStore } from '@/stores/symbolStore';
import { memo, useEffect, useState } from 'react';

export default memo(function SymbolPicker() {
  const [v, setV] = useState(symbolStore.get());
  useEffect(() => {
    symbolStore.set(v);
  }, []);
  const onChange = (s: string) => {
    const u = s.toUpperCase();
    setV(u);
    symbolStore.set(u);
  };
  return (
    <input
      value={v}
      onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
        onChange(e.target.value)
      }
      placeholder="Symbol (e.g., BTCUSD, AAPL)"
      className="px-3 py-2 bg-neutral-900 rounded-xl border border-neutral-800"
    />
  );
});
