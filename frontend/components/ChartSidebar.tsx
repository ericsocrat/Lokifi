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
    const unsub = drawStore.subscribe((s) => {
      setTool(s.tool);
      setSnap(s.snap);
      setSelCount(s.selectedIds.length);
    });
    return () => {
      unsub();
    };
  }, []);

  useEffect(() => {
    const t = setInterval(() => setTick((x) => x + 1), 300);
    return () => clearInterval(t);
  }, []);

  const activePlugin = pluginManager.activeToolId;

  return (
    <>
      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="absolute left-2 top-2 z-30 p-2 rounded-xl bg-bg-secondary/90 border border-border-default backdrop-blur hover:bg-bg-elevated transition-smooth"
        title={isOpen ? 'Close Toolbar' : 'Open Toolbar'}
      >
        {isOpen ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
      </button>

      {/* Sliding Sidebar */}
      <div
        className={`absolute left-0 top-0 z-20 h-full bg-bg-secondary/95 border-r border-border-default backdrop-blur transition-transform duration-300 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{ width: '280px' }}
      >
        <div className="p-4 pt-16 flex flex-col gap-4 h-full">
          {/* Basic Tools */}
          <div>
            <h3 className="text-[11px] uppercase tracking-wide opacity-70 mb-3">Tools</h3>
            <div className="grid grid-cols-2 gap-2">
              {TOOLS.map((t) => (
                <button
                  key={t.key}
                  onClick={() => drawStore.setTool(t.key)}
                  className={`p-3 rounded-xl border text-left flex items-center gap-2 text-sm transition-smooth ${
                    tool === t.key
                      ? 'bg-primary/30 border-primary'
                      : 'border-border-default hover:bg-bg-elevated'
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
          <div className="flex items-center gap-3 p-2 rounded-xl border border-border-default">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={snap}
                onChange={(e) => drawStore.setSnap(e.target.checked)}
              />
              Snap to OHLC
            </label>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <button
              onClick={() => drawStore.undo()}
              className="flex-1 px-3 py-2 text-sm border border-border-default rounded-xl hover:bg-bg-elevated transition-smooth"
            >
              Undo
            </button>
            <button
              onClick={() => drawStore.redo()}
              className="flex-1 px-3 py-2 text-sm border border-border-default rounded-xl hover:bg-bg-elevated transition-smooth"
            >
              Redo
            </button>
          </div>

          {/* Plugins */}
          {EXPERIMENTAL_PLUGINS && (
            <div>
              <h3 className="text-[11px] uppercase tracking-wide opacity-70 mb-3">Plugins</h3>
              <div className="space-y-2">
                {PLUGINS.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => pluginManager.setActiveTool(p.id)}
                    className={`w-full p-3 rounded-xl border text-left flex items-center gap-2 text-sm transition-smooth ${
                      activePlugin === p.id
                        ? 'bg-primary/30 border-primary'
                        : 'border-border-default hover:bg-bg-elevated'
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
            <div className="border-t border-border-default pt-4 mt-auto">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm opacity-70">{selCount} selected</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => drawStore.removeSelected()}
                    className="px-3 py-1 text-sm bg-trading-loss/30 border border-trading-loss text-trading-loss-light rounded-xl hover:bg-trading-loss/50 transition-smooth"
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
            className="w-full px-3 py-2 text-sm border border-trading-loss text-trading-loss-light rounded-xl hover:bg-trading-loss/20 transition-smooth"
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
