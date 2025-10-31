import type { Drawing } from '@/lib/utils/drawings';
import type { Alert } from '@/lib/utils/alerts';
import { useChartStore } from '@/state/store';
import React from 'react';

type Props = { open: boolean; onClose: () => void };
export default function AlertModal({ open, onClose }: Props) {
  const s = useChartStore();
  const [kind, setKind] = React.useState<string>('cross');
  const [note, setNote] = React.useState('Alert');
  const [sound, setSound] = React.useState<'ping' | 'none'>('ping');
  const [cooldown, setCooldown] = React.useState(60_000);
  const [maxTriggers, setMaxTriggers] = React.useState<number | ''>('');
  const [fibLevel, setFibLevel] = React.useState(0.618);
  const [when, setWhen] = React.useState<string>('');

  if (!open) return null;

  const selection = Array.from(s.selection || []);
  const primary = selection.length
    ? s.drawings.find((d: Drawing) => d.id === selection[0])
    : undefined;

  // Type guard: GroupDrawing uses 'type' not 'kind'
  const hasKind = (d: Drawing | undefined): d is Drawing & { kind: string } =>
    d !== undefined && 'kind' in d && typeof d.kind === 'string';

  const canCross =
    primary &&
    hasKind(primary) &&
    (primary.kind === 'hline' || primary.kind === 'trendline' || primary.kind === 'arrow');
  const canFib = primary && hasKind(primary) && primary.kind === 'fib';
  const canRegion = primary && hasKind(primary) && primary.kind === 'rect';

  const submit = () => {
    const baseProps = {
      note,
      sound: sound as 'ping' | 'none',
      cooldownMs: cooldown || 0,
      maxTriggers: maxTriggers === '' ? undefined : Number(maxTriggers),
    };
    
    if (kind === 'time') {
      if (!when) return;
      s.addAlert({ 
        ...baseProps, 
        kind: 'time' as const, 
        when: new Date(when).getTime() 
      });
    } else {
      if (!primary) return;
      if (kind === 'fib-cross') {
        s.addAlert({ 
          ...baseProps, 
          kind: 'fib-cross' as const, 
          drawingId: primary.id, 
          fibLevel 
        });
      } else if (kind === 'region-touch') {
        s.addAlert({ 
          ...baseProps, 
          kind: 'region-touch' as const, 
          drawingId: primary.id 
        });
      } else {
        s.addAlert({ 
          ...baseProps, 
          kind: 'cross' as const, 
          drawingId: primary.id 
        });
      }
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-10 w-[420px] rounded-xl border border-white/15 bg-neutral-900 p-4 space-y-3">
        <div className="text-sm font-semibold">Create Alert</div>

        <div className="grid grid-cols-3 gap-2 text-sm">
          <label className="col-span-1 opacity-70">Type</label>
          <select
            className="col-span-2 bg-transparent border border-white/15 rounded px-2 py-1"
            value={kind}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setKind(e.target.value)}
          >
            <option value="cross" disabled={!canCross}>
              Line cross
            </option>
            <option value="fib-cross" disabled={!canFib}>
              Fib level cross
            </option>
            <option value="region-touch" disabled={!canRegion}>
              Region touch
            </option>
            <option value="time">Time reminder</option>
          </select>

          <label className="col-span-1 opacity-70">Note</label>
          <input
            className="col-span-2 bg-transparent border border-white/15 rounded px-2 py-1"
            value={note}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNote(e.target.value)}
          />

          {kind === 'fib-cross' && (
            <>
              <label className="col-span-1 opacity-70">Fib level</label>
              <input
                type="number"
                step="0.001"
                min="0"
                max="1"
                className="col-span-2 bg-transparent border border-white/15 rounded px-2 py-1"
                value={fibLevel}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setFibLevel(parseFloat(e.target.value))
                }
              />
            </>
          )}

          {kind === 'time' && (
            <>
              <label className="col-span-1 opacity-70">When</label>
              <input
                type="datetime-local"
                className="col-span-2 bg-transparent border border-white/15 rounded px-2 py-1"
                value={when}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setWhen(e.target.value)}
              />
            </>
          )}

          <label className="col-span-1 opacity-70">Cooldown</label>
          <div className="col-span-2 flex gap-2">
            <input
              type="number"
              min="0"
              className="flex-1 bg-transparent border border-white/15 rounded px-2 py-1"
              value={cooldown}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setCooldown(parseInt(e.target.value || '0', 10))
              }
            />
            <span className="opacity-60 self-center text-xs">ms</span>
          </div>

          <label className="col-span-1 opacity-70">Max triggers</label>
          <input
            type="number"
            min="1"
            className="col-span-2 bg-transparent border border-white/15 rounded px-2 py-1"
            value={maxTriggers}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setMaxTriggers(e.target.value === '' ? '' : parseInt(e.target.value, 10))
            }
          />

          <label className="col-span-1 opacity-70">Sound</label>
          <select
            className="col-span-2 bg-transparent border border-white/15 rounded px-2 py-1"
            value={sound}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
              setSound(e.target.value as 'ping' | 'none')
            }
          >
            <option value="ping">Ping</option>
            <option value="none">None</option>
          </select>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button
            className="px-3 py-1 text-xs rounded border border-white/15 hover:bg-white/10"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            className="px-3 py-1 text-xs rounded border border-emerald-500/40 hover:bg-emerald-500/10"
            onClick={submit}
            disabled={kind !== 'time' && !primary}
          >
            Create
          </button>
        </div>
      </div>
    </div>
  );
}
