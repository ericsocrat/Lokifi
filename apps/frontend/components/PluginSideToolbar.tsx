'use client';
import PluginSettingsDrawer from '@/components/PluginSettingsDrawer';
import { EXPERIMENTAL_PLUGINS } from '@/constants/flags';
import { pluginManager } from 'plugins/registry';
import { useEffect, useState } from 'react';

type Item = { id: string; label: string; icon?: React.ReactNode };

const ITEMS: Item[] = [
  { id: 'trendline-plus', label: 'Trend+' },
  { id: 'ruler-measure', label: 'Ruler' },
  { id: 'parallel-channel', label: 'Channel' },
  { id: 'fib-extended', label: 'Fib+' },
];

export default function PluginSideToolbar() {
  const [, setTick] = useState(0);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const t = setInterval(() => setTick((x) => x + 1), 300);
    return () => clearInterval(t);
  }, []);
  if (!EXPERIMENTAL_PLUGINS) return null;
  const active = pluginManager.activeToolId;
  return (
    <>
      <div className="absolute left-2 top-16 z-20 flex flex-col gap-2 p-2 rounded-xl bg-neutral-900/90 border border-neutral-800">
        <div className="flex items-center justify-between gap-3">
          <div className="text-[11px] uppercase tracking-wide opacity-70">Plugins</div>
          <button
            onClick={() => setOpen((x) => !x)}
            className="text-[11px] px-2 py-1 border border-neutral-700 rounded hover:bg-neutral-800"
          >
            Settings
          </button>
        </div>
        <div className="text-[11px] opacity-60">Ghost previews while placing points</div>
        {ITEMS.map((it: any) => (
          <button
            key={it.id}
            onClick={() => pluginManager.setActiveTool(active === it.id ? null : it.id)}
            className={`text-xs px-2 py-1 rounded text-left ${active === it.id ? 'bg-emerald-600/30 border border-emerald-500' : 'border border-neutral-700 hover:bg-neutral-800'}`}
          >
            {it.label}
          </button>
        ))}
      </div>
      <PluginSettingsDrawer open={open} onClose={() => setOpen(false)} />
    </>
  );
}
