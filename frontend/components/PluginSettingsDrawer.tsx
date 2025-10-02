'use client';
import { EXPERIMENTAL_PLUGINS } from '@/lib/flags';
import { pluginSettingsStore } from '@/lib/pluginSettingsStore';
import { useEffect, useState } from 'react';

type Settings = ReturnType<typeof pluginSettingsStore.get>;

export default function PluginSettingsDrawer({
  open,
  onCloseAction,
}: {
  open: boolean;
  onCloseAction: () => void;
}) {
  const [s, setS] = useState<Settings>(pluginSettingsStore.get());
  useEffect(() => {
    const unsub = pluginSettingsStore.subscribe(setS);
    return () => {
      unsub();
    };
  }, []);
  if (!EXPERIMENTAL_PLUGINS || !open) return null;
  return (
    <div className="fixed right-4 top-16 z-40 w-80 rounded-2xl border border-border-default bg-bg-secondary/95 backdrop-blur p-3 shadow-xl">
      <div className="flex items-center justify-between mb-2">
        <div className="font-semibold text-text-primary">Plugin Settings</div>
        <button
          onClick={onCloseAction}
          className="text-xs text-text-secondary hover:text-text-primary transition-smooth"
        >
          Close
        </button>
      </div>

      <div className="space-y-4 text-sm">
        <section>
          <div className="font-medium mb-1 text-text-primary">Parallel Channel</div>
          <label className="flex items-center gap-2 mb-2 text-text-secondary">
            <span>Width mode</span>
            <select
              value={s.channelWidthMode as any}
              onChange={(e) => pluginSettingsStore.set('channelWidthMode', e.target.value as any)}
              className="ml-auto px-2 py-1 bg-bg-elevated border border-border-default rounded-lg text-text-primary"
            >
              <option value="percent">% of price</option>
              <option value="pixels">Pixels</option>
            </select>
          </label>
          <label className="flex items-center gap-2 text-text-secondary">
            <span>Default width (% of price)</span>
            <input
              type="number"
              step="0.1"
              min="0"
              max="50"
              value={s.channelDefaultWidthPct}
              onChange={(e) =>
                pluginSettingsStore.set('channelDefaultWidthPct', parseFloat(e.target.value || '0'))
              }
              className="ml-auto w-24 px-2 py-1 bg-bg-elevated border border-border-default rounded-lg text-text-primary"
            />
          </label>
        </section>

        <section>
          <div className="font-medium mb-1 text-text-primary">Fibonacci Levels</div>
          <div className="flex items-center gap-2">
            <select
              value={s.fibPreset}
              onChange={(e) => pluginSettingsStore.set('fibPreset', e.target.value as any)}
              className="px-2 py-1 bg-bg-elevated border border-border-default rounded-lg text-text-primary"
            >
              <option value="Classic">Classic (0→1)</option>
              <option value="Extended">Extended (0→2.618)</option>
              <option value="Aggressive">Aggressive (0→4.236)</option>
              <option value="Custom">Custom…</option>
            </select>
          </div>
          {s.fibPreset === 'Custom' && (
            <div className="mt-2">
              <input
                value={s.fibCustomLevels.join(',')}
                onChange={(e) => {
                  const vals = e.target.value
                    .split(',')
                    .map((x) => parseFloat(x.trim()))
                    .filter((n) => !Number.isNaN(n));
                  pluginSettingsStore.set('fibCustomLevels', vals);
                }}
                className="w-full px-2 py-1 bg-bg-elevated border border-border-default rounded-lg text-text-primary"
                placeholder="Comma-separated (e.g., 0,0.382,0.5,0.618,1,1.272,1.618,2)"
              />
              <div className="text-[11px] text-text-tertiary mt-1">
                Tip: include 0 and 1 to see the base box.
              </div>
            </div>
          )}
        </section>

        <section className="pt-2 border-t border-border-default">
          <div className="font-medium mb-1 text-text-primary">Per-symbol settings</div>
          <div className="text-[12px] text-text-tertiary mb-2">
            Save these settings for the current symbol + timeframe only.
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => (window as any).__lokifiApplySymbolSettings?.()}
              className="text-xs px-2 py-1 rounded border border-border-default hover:bg-bg-elevated-hover transition-smooth text-text-primary"
            >
              Apply to current
            </button>
            <button
              onClick={() => (window as any).__lokifiClearSymbolSettings?.()}
              className="text-xs px-2 py-1 rounded border border-border-default hover:bg-bg-elevated-hover transition-smooth text-text-primary"
            >
              Clear current
            </button>
          </div>
        </section>
        <div className="flex justify-between items-center">
          <button
            onClick={() => pluginSettingsStore.reset()}
            className="text-xs px-2 py-1 rounded border border-border-default hover:bg-bg-elevated-hover transition-smooth text-text-primary"
          >
            Reset
          </button>
          <div className="text-[11px] text-text-tertiary">Saved locally</div>
        </div>
      </div>
    </div>
  );
}
