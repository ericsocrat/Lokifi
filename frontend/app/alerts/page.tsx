"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/src/components/AuthProvider";
import { requireAuth } from "@/src/lib/auth-guard";
import { createAlert, deleteAlert, listAlerts, toggleAlert, subscribeAlerts, type Alert } from "@/src/lib/alerts";
import { AuthModal } from "@/src/components/AuthModal";

type Kind = "price_threshold" | "pct_change";

export default function AlertsPage() {
  const { user } = useAuth();
  const [needAuthModal, setNeedAuthModal] = useState(false);

  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [form, setForm] = useState<{ kind: Kind; symbol: string; timeframe: string; direction: string; number: string; window: string; }>(
    { kind: "price_threshold", symbol: "BTCUSD", timeframe: "1h", direction: "above", number: "45000", window: "60" }
  );
  const [log, setLog] = useState<string[]>([]);
  const subRef = useRef<(() => void) | undefined>(undefined);

  useEffect(() => {
    (async () => {
      try {
        await requireAuth();
      } catch {
        setNeedAuthModal(true);
        return;
      }
      await refresh();
      // subscribe SSE
      subRef.current = subscribeAlerts((ev) => {
        setLog((l) => [`${new Date(ev.at).toLocaleTimeString()} ${ev.kind} ${ev.price ? `@ $${ev.price}` : ''}`, ...l].slice(0, 50));
      }, true);
    })();
    return () => { subRef.current?.(); };
  }, []);

  async function refresh() {
    const ls = await listAlerts();
    setAlerts(ls);
  }

  async function create() {
    const { kind, symbol, direction, number, window } = form;
    if (kind === "price_threshold") {
      await createAlert({ 
        kind: "price_threshold", 
        note: `${symbol} ${direction} ${number}`,
        sound: "ping",
        maxTriggers: 1
      });
    } else {
      const dir = (direction === "above" || direction === "up") ? "up" : (direction === "below" || direction === "down") ? "down" : "abs";
      await createAlert({ 
        kind: "pct_change", 
        note: `${symbol} ${dir} ${number}%`, 
        sound: "ping",
        maxTriggers: 1
      });
    }
    await refresh();
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Alerts</h1>

      {needAuthModal && <AuthModal onClose={() => setNeedAuthModal(false)} />}

      <div className="rounded-2xl border border-neutral-800 p-4 bg-neutral-900 space-y-3">
        <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
          <select className="px-3 py-2 rounded-lg bg-neutral-800 border border-neutral-700" value={form.kind} onChange={(e)=>setForm({...form, kind: e.target.value as Kind})}>
            <option value="price_threshold">Price threshold</option>
            <option value="pct_change">% change</option>
          </select>
          <input className="px-3 py-2 rounded-lg bg-neutral-800 border border-neutral-700" placeholder="Symbol" value={form.symbol} onChange={(e)=>setForm({...form, symbol:e.target.value})} />
          <select className="px-3 py-2 rounded-lg bg-neutral-800 border border-neutral-700" value={form.timeframe} onChange={(e)=>setForm({...form, timeframe:e.target.value})}>
            <option>1m</option><option>5m</option><option>15m</option><option>1h</option><option>4h</option><option>1d</option>
          </select>
          <select className="px-3 py-2 rounded-lg bg-neutral-800 border border-neutral-700" value={form.direction} onChange={(e)=>setForm({...form, direction:e.target.value})}>
            <option value="above">Above/Up</option>
            <option value="below">Below/Down</option>
            <option value="abs">Abs (for %)</option>
          </select>
          <input className="px-3 py-2 rounded-lg bg-neutral-800 border border-neutral-700" placeholder="Price or % threshold" value={form.number} onChange={(e)=>setForm({...form, number:e.target.value})} />
          <input className="px-3 py-2 rounded-lg bg-neutral-800 border border-neutral-700" placeholder="Window (min, % only)" value={form.window} onChange={(e)=>setForm({...form, window:e.target.value})} />
        </div>
        <div className="flex gap-2">
          <button onClick={create} className="px-3 py-2 rounded-lg bg-sky-600 hover:bg-sky-500">Create alert</button>
          <button onClick={refresh} className="px-3 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700">Refresh</button>
        </div>
      </div>

      <div className="grid gap-2">
        {alerts.map(a => (
          <div key={a.id} className="rounded-xl border border-neutral-800 p-3 bg-neutral-900 flex flex-col md:flex-row md:items-center md:justify-between gap-2">
            <div className="text-sm">
              <span className="font-medium">{a.kind}</span>
              {a.note && <span className="ml-2 opacity-70">{a.note}</span>}
              {a.maxTriggers && <span className="ml-2 opacity-50">(max {a.maxTriggers})</span>}
              {(a.triggers ?? 0) > 0 && <span className="ml-2 opacity-50">({a.triggers}x)</span>}
            </div>
            <div className="flex items-center gap-2">
              <button onClick={async ()=>{ await toggleAlert(a.id, !a.enabled); await refresh(); }} className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-sm">
                {a.enabled ? "Disable" : "Enable"}
              </button>
              <button onClick={async ()=>{ await deleteAlert(a.id); await refresh(); }} className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-sm">Delete</button>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-neutral-800 p-3 bg-neutral-900">
        <div className="font-medium mb-2">Live triggers</div>
        <div className="space-y-1 text-sm text-neutral-300 max-h-64 overflow-auto">
          {log.map((l, i) => <div key={i} className="font-mono">{l}</div>)}
        </div>
      </div>
    </div>
  );
}
