"use client";
import { useState, useEffect } from "react";
import { symbolStore } from "@/lib/symbolStore";

export default function SymbolPicker() {
  const [v, setV] = useState(symbolStore.get());
  useEffect(()=>{ symbolStore.set(v); },[])
  const onChange = (s: string) => { const u = s.toUpperCase(); setV(u); symbolStore.set(u); };
  return (
    <input value={v} onChange={e=>onChange(e.target.value)} placeholder="Symbol (e.g., BTCUSD, AAPL)" className="px-3 py-2 bg-neutral-900 rounded-xl border border-neutral-800" />
  );
}
