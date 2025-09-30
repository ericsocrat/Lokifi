"use client";

import { AuthModal } from "@/src/components/AuthModal";
import { requireAuth } from "@/src/lib/auth-guard";
import { addPosition, deletePosition, getPortfolioSummary, listPortfolio, type PortfolioSummary, type Position } from "@/src/lib/portfolio";
import { useEffect, useState } from "react";

export default function PortfolioPage() {
  const [needAuthModal, setNeedAuthModal] = useState(false);

  const [positions, setPositions] = useState<Position[]>([]);
  const [summary, setSummary] = useState<PortfolioSummary | null>(null);
  const [form, setForm] = useState({ symbol: "", qty: "", cb: "", tags: "" });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        await requireAuth();
      } catch {
        setNeedAuthModal(true);
        return;
      }
      await refresh();
    })();
  }, []);

  async function refresh() {
    try {
      const [pos, sum] = await Promise.all([listPortfolio(), getPortfolioSummary()]);
      setPositions(pos); setSummary(sum);
    } catch (e: any) {
      setErr(e?.message || "Failed to load portfolio");
    }
  }

  async function add() {
    setErr(null); setBusy(true);
    try {
      await addPosition({
        symbol: form.symbol.trim(),
        qty: Number(form.qty),
        cost_basis: Number(form.cb),
        tags: form.tags ? form.tags.split(",").map(s => s.trim()).filter(Boolean) : [],
      });
      setForm({ symbol: "", qty: "", cb: "", tags: "" });
      await refresh();
    } catch (e: any) {
      setErr(e?.message || "Failed to add");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Portfolio</h1>
      </div>

      {needAuthModal && <AuthModal onClose={() => setNeedAuthModal(false)} />}

      <div className="rounded-2xl border border-neutral-800 p-4 bg-neutral-900 space-y-3">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          <input className="px-3 py-2 rounded-lg bg-neutral-800 border border-neutral-700" placeholder="Symbol (e.g., BTCUSD)" value={form.symbol} onChange={(e) => setForm({ ...form, symbol: e.target.value })} />
          <input className="px-3 py-2 rounded-lg bg-neutral-800 border border-neutral-700" placeholder="Qty" value={form.qty} onChange={(e) => setForm({ ...form, qty: e.target.value })} />
          <input className="px-3 py-2 rounded-lg bg-neutral-800 border border-neutral-700" placeholder="Cost basis" value={form.cb} onChange={(e) => setForm({ ...form, cb: e.target.value })} />
          <input className="px-3 py-2 rounded-lg bg-neutral-800 border border-neutral-700" placeholder="Tags (comma sep)" value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} />
          <button disabled={busy} onClick={add} className="px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60">Add / Update</button>
        </div>
        {err && <p className="text-sm text-red-400">{err}</p>}
      </div>

      <div className="grid gap-3">
        {positions.map(p => (
          <div key={p.id} className="rounded-xl border border-neutral-800 p-4 bg-neutral-900 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div className="space-y-1">
              <div className="font-medium">{p.symbol}</div>
              <div className="text-sm text-neutral-400">Qty {p.qty} · Cost {p.cost_basis}</div>
              <div className="text-sm text-neutral-400">Px {p.current_price ?? "-"} · MV {p.market_value ?? "-"} · P/L {p.unrealized_pl ?? "-"} ({p.pl_pct?.toFixed(2) ?? "-"}%)</div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={async () => { await deletePosition(p.id); await refresh(); }} className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-sm">Delete</button>
            </div>
          </div>
        ))}
      </div>

      {summary && (
        <div className="rounded-xl border border-neutral-800 p-4 bg-neutral-900">
          <div className="font-medium mb-2">Summary</div>
          <div className="text-sm text-neutral-300">Cost: {summary.total_cost} · Value: {summary.total_value} · P/L: {summary.total_pl} ({summary.total_pl_pct}%)</div>
        </div>
      )}
    </div>
  );
}
