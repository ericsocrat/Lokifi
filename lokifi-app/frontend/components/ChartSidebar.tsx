'use client';
import { drawStore, type Tool } from '@/lib/drawStore';
import { EXPERIMENTAL_PLUGINS } from '@/lib/flags';
import { pluginManager } from '@/plugins/registry';
import {
  Boxes,
  Brackets,
  ChartLine,
  ChevronLeft,
  ChevronRight,
  Landmark,
  MousePointer,
  Ruler,
  Waves,
} from 'lucide-react';
import { useEffect, useState } from 'react';

const TOOLS: { key: Tool; label: string; icon: React.ReactNode; shortcut?: string }[] = [
  { key: 'cursor', label: 'Cursor', icon: <MousePointer size={16} />, shortcut: 'V' },
  { key: 'trendline', label: 'Trendline', icon: <ChartLine size={16} />, shortcut: 'T' },
  { key: 'hline', label: 'HLine', icon: <Landmark size={16} />, shortcut: 'H' },
  { key: 'rect', label: 'Rectangle', icon: <Boxes size={16} />, shortcut: 'M' },
];

const PLUGINS = [
  { id: 'ruler-measure', label: 'Ruler', icon: <Ruler size={16} />, shortcut: 'R' },
  { id: 'parallel-channel', label: 'Channel', icon: <Waves size={16} />, shortcut: 'C' },
  {
    id: 'parallel-channel-3pt',
    label: 'Channel 3pt',
    icon: <Waves size={16} />,
    shortcut: 'Shift+C',
  },
  { id: 'fib-extended', label: 'Fib+', icon: <Brackets size={16} />, shortcut: 'F' },
];

export default function ChartSidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const [tool, setTool] = useState<Tool>(drawStore.get().tool);
  const [snap, setSnap] = useState<boolean>(drawStore.get().snap);
  const [selCount, setSelCount] = useState<number>(drawStore.get().selectedIds.length);
  const [, setTick] = useState(0);

  useEffect(() => {
    const unsub = drawStore.subscribe((s: any) => {
      setTool(s.tool);
      setSnap(s.snap);
      setSelCount(s.selectedIds.length);
    });
    return () => {
      unsub();
    };
  }, []);

  useEffect(() => {
    const t = setInterval(() => setTick((x: any) => x + 1), 300);
    return () => clearInterval(t);
  }, []);

  const activePlugin = pluginManager.activeToolId;

  return (
    <>
      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="absolute left-2 top-2 z-30 p-2 rounded-xl bg-neutral-900/90 border border-neutral-800 backdrop-blur hover:bg-neutral-800 transition-colors"
        title={isOpen ? 'Close Toolbar' : 'Open Toolbar'}
      >
        {isOpen ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
      </button>

      {/* Sliding Sidebar */}
      <div
        className={`absolute left-0 top-0 z-20 h-full bg-neutral-900/95 border-r border-neutral-800 backdrop-blur transition-transform duration-300 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{ width: '280px' }}
      >
        <div className="p-4 pt-16 flex flex-col gap-4 h-full">
          {/* Basic Tools */}
          <div>
            <h3 className="text-[11px] uppercase tracking-wide opacity-70 mb-3">Tools</h3>
            <div className="grid grid-cols-2 gap-2">
              {TOOLS.map((t: any) => (
                <button
                  key={t.key}
                  onClick={() => drawStore.setTool(t.key)}
                  className={`p-3 rounded-xl border text-left flex items-center gap-2 text-sm transition-colors ${
                    tool === t.key
                      ? 'bg-electric/30 border-electric'
                      : 'border-neutral-700 hover:bg-neutral-800'
                  }`}
                  title={`${t.label} ${t.shortcut ? `(${t.shortcut})` : ''}`}
                >
                  {t.icon}
                  <div>
                    <div>{t.label}</div>
                    {t.shortcut && <div className="text-[10px] opacity-60">{t.shortcut}</div>}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Settings */}
          <div className="flex items-center gap-3 p-2 rounded-xl border border-neutral-700">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={snap}
                onChange={(e: any) => drawStore.setSnap(e.target.checked)}
              />
              Snap to OHLC
            </label>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <button
              onClick={() => drawStore.undo()}
              className="flex-1 px-3 py-2 text-sm border border-neutral-700 rounded-xl hover:bg-neutral-800"
            >
              Undo
            </button>
            <button
              onClick={() => drawStore.redo()}
              className="flex-1 px-3 py-2 text-sm border border-neutral-700 rounded-xl hover:bg-neutral-800"
            >
              Redo
            </button>
          </div>

          {/* Plugins */}
          {EXPERIMENTAL_PLUGINS && (
            <div>
              <h3 className="text-[11px] uppercase tracking-wide opacity-70 mb-3">Plugins</h3>
              <div className="space-y-2">
                {PLUGINS.map((p: any) => (
                  <button
                    key={p.id}
                    onClick={() => pluginManager.setActiveTool(p.id)}
                    className={`w-full p-3 rounded-xl border text-left flex items-center gap-2 text-sm transition-colors ${
                      activePlugin === p.id
                        ? 'bg-electric/30 border-electric'
                        : 'border-neutral-700 hover:bg-neutral-800'
                    }`}
                    title={`${p.label} ${p.shortcut ? `(${p.shortcut})` : ''}`}
                  >
                    {p.icon}
                    <div>
                      <div>{p.label}</div>
                      {p.shortcut && <div className="text-[10px] opacity-60">{p.shortcut}</div>}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Selection Actions */}
          {selCount > 0 && (
            <div className="border-t border-neutral-800 pt-4 mt-auto">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm opacity-70">{selCount} selected</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => drawStore.removeSelected()}
                    className="px-3 py-1 text-sm bg-red-900/30 border border-red-700 text-red-300 rounded-xl hover:bg-red-900/50"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Clear All */}
          <button
            onClick={() => drawStore.clear()}
            className="w-full px-3 py-2 text-sm border border-rose-700 text-rose-300 rounded-xl hover:bg-rose-900/20"
          >
            Clear All
          </button>
        </div>
      </div>

      {/* Overlay to close sidebar when clicking outside */}
      {isOpen && (
        <div className="absolute inset-0 z-10 bg-black/20" onClick={() => setIsOpen(false)} />
      )}
    </>
  );
}
