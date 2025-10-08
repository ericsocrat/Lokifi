import { keyFromEvent } from '@/lib/keys';
import { useChartStore } from '@/state/store';
import React from 'react';

const HOTKEYS: Array<{ action: string; label: string }> = [
  { action: 'DeleteSelected', label: 'Delete selected' },
  { action: 'DuplicateSelected', label: 'Duplicate selected' },
  { action: 'ArrowSizeDecrease', label: 'Arrow size −' },
  { action: 'ArrowSizeIncrease', label: 'Arrow size +' },
  { action: 'CycleLineCap', label: 'Cycle line cap' },
  { action: 'CycleArrowHead', label: 'Cycle arrow head' },
  { action: 'AlignLeft', label: 'Align left' },
  { action: 'AlignRight', label: 'Align right' },
  { action: 'AlignTop', label: 'Align top' },
  { action: 'AlignBottom', label: 'Align bottom' },
  { action: 'DistributeHoriz', label: 'Distribute horizontal' },
  { action: 'DistributeVert', label: 'Distribute vertical' },
];

export default function DrawingSettingsPanel() {
  const ds = useChartStore((s: any) => s.drawingSettings);
  const setDS = useChartStore((s: any) => s.setDrawingSettings);
  const resetDS = useChartStore((s: any) => s.resetDrawingSettings);
  const hk = useChartStore((s: any) => s.hotkeys);
  const setHK = useChartStore((s: any) => s.setHotkey);
  const resetHK = useChartStore((s: any) => s.resetHotkeys);

  const ding = React.useRef<number>(0);
  const saved = (msg = 'Saved') => {
    const now = Date.now();
    if (now - ding.current > 250) {
      try {
        (window as any).__fynix_toast?.('Saved');
      } catch {}
      ding.current = now;
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Drawing Settings</h2>

      <div className="grid grid-cols-2 gap-2 text-sm">
        <label className="col-span-1 flex items-center gap-2">
          <input
            type="checkbox"
            checked={ds.snapEnabled}
            onChange={(e: any) => {
              setDS({ snapEnabled: e.target.checked });
              saved();
            }}
          />
          Grid snap
        </label>
        <div className="col-span-1 flex items-center gap-2">
          <span className="opacity-70">Step</span>
          <input
            type="number"
            className="w-16 bg-transparent border border-white/15 rounded px-2 py-1"
            value={ds.snapStep}
            min={1}
            max={50}
            onChange={(e: any) => {
              setDS({ snapStep: Math.max(1, parseInt(e.target.value || '1', 10)) });
              saved();
            }}
          />
        </div>

        <label className="col-span-2 flex items-center gap-2">
          <input
            type="checkbox"
            checked={ds.snapPriceLevels}
            onChange={(e: any) => {
              setDS({ snapPriceLevels: e.target.checked });
              saved();
            }}
          />
          Snap to price levels (OHLC/close)
        </label>

        <label className="col-span-2 flex items-center gap-2">
          <input
            type="checkbox"
            checked={ds.showHandles}
            onChange={(e: any) => {
              setDS({ showHandles: e.target.checked });
              saved();
            }}
          />
          Show selection handles
        </label>

        <label className="col-span-2 flex items-center gap-2">
          <input
            type="checkbox"
            checked={ds.showLineLabels}
            onChange={(e: any) => {
              setDS({ showLineLabels: e.target.checked });
              saved();
            }}
          />
          Show line labels (% change)
        </label>

        <div className="col-span-2 h-px bg-white/10 my-1" />

        <div className="col-span-1">
          <div className="opacity-70 mb-1">Line cap</div>
          <select
            className="w-full bg-transparent border border-white/15 rounded px-2 py-1"
            value={ds.lineCap}
            onChange={(e: any) => {
              setDS({ lineCap: e.target.value as any });
              saved();
            }}
          >
            <option value="butt">butt</option>
            <option value="round">round</option>
            <option value="square">square</option>
          </select>
        </div>

        <div className="col-span-1">
          <div className="opacity-70 mb-1">Arrow head</div>
          <select
            className="w-full bg-transparent border border-white/15 rounded px-2 py-1"
            value={ds.arrowHead}
            onChange={(e: any) => {
              setDS({ arrowHead: e.target.value as any });
              saved();
            }}
          >
            <option value="none">none</option>
            <option value="open">open</option>
            <option value="filled">filled</option>
          </select>
        </div>

        <div className="col-span-2 flex items-center gap-2">
          <div className="opacity-70">Arrow size</div>
          <input
            type="range"
            min={6}
            max={48}
            value={ds.arrowHeadSize}
            onChange={(e: any) => {
              setDS({ arrowHeadSize: parseInt(e.target.value, 10) });
              saved();
            }}
            className="flex-1"
          />
          <div className="w-10 text-right">{ds.arrowHeadSize}</div>
        </div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => {
            resetDS();
            try {
              window.__fynix_toast?.('Drawing settings reset');
            } catch {}
          }}
          className="px-3 py-2 rounded border border-white/15 hover:bg-white/10 text-sm"
        >
          Reset drawing settings
        </button>
      </div>

      <div className="h-px bg-white/10" />

      <h3 className="font-semibold">Hotkeys</h3>
      <div className="space-y-2">
        {HOTKEYS.map((k: any) => (
          <div key={k.action} className="flex items-center justify-between gap-2 text-sm">
            <div className="opacity-80">{k.label}</div>
            <input
              className="w-44 bg-transparent border border-white/15 rounded px-2 py-1"
              value={hk[k.action] || ''}
              onKeyDown={(e: any) => {
                e.preventDefault();
                const combo = keyFromEvent(e);
                const s = useChartStore.getState();
                const prev = Object.keys(s.hotkeys).find(
                  (a: any) => s.hotkeys[a] === combo && a !== k.action
                );
                if (prev) s.setHotkey(prev, '');
                setHK(k.action, combo);
                try {
                  window.__fynix_toast?.('Saved');
                } catch {}
              }}
              onChange={() => {}}
              placeholder="Press keys…"
            />
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => {
            resetHK();
            try {
              window.__fynix_toast?.('Hotkeys reset');
            } catch {}
          }}
          className="px-3 py-2 rounded border border-white/15 hover:bg-white/10 text-sm"
        >
          Reset hotkeys
        </button>
      </div>
    </div>
  );
}
