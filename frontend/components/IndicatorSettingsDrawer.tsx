"use client";
import { useEffect, useState } from "react";
import { indicatorStore, type IndicatorState } from "@/lib/indicatorStore";
import { symbolStore } from "@/lib/symbolStore";

export default function IndicatorSettingsDrawer(){
  const [s, setS] = useState<IndicatorState>(indicatorStore.get());
  const [open, setOpen] = useState<boolean>(false);
  useEffect(()=> indicatorStore.subscribe(setS), []);

  const setParam = (key: keyof IndicatorState["params"]) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = Number(e.target.value);
    if (Number.isFinite(v) && v > 0) indicatorStore.set({ params: { ...s.params, [key]: v } as any });
  };

  return (
    <div className="rounded-2xl border border-neutral-800">
      <button onClick={()=> setOpen(!open)} className="w-full px-3 py-2 text-left font-semibold">
        Indicator Settings {open ? "▾" : "▸"}
      </button>
      {open && (
        <div className="p-3 grid grid-cols-2 gap-3 text-sm">
          <div className="col-span-2 font-medium opacity-80">Bollinger Bands</div>
          <label className="flex items-center gap-2">
            Period
            <input type="number" value={s.params.bbPeriod} onChange={setParam("bbPeriod")} className="w-20 px-2 py-1 bg-neutral-900 border border-neutral-800 rounded" />
          </label>
          <label className="flex items-center gap-2">
            Mult
            <input type="number" step="0.5" value={s.params.bbMult} onChange={setParam("bbMult")} className="w-20 px-2 py-1 bg-neutral-900 border border-neutral-800 rounded" />
          </label>

          <div className="col-span-2 font-medium opacity-80 mt-2">VWMA</div>
          <label className="flex items-center gap-2">
            Period
            <input type="number" value={s.params.vwmaPeriod} onChange={setParam("vwmaPeriod")} className="w-20 px-2 py-1 bg-neutral-900 border border-neutral-800 rounded" />
          </label>

          <div className="col-span-2 font-medium opacity-80 mt-2">StdDev Channels</div>
          <label className="flex items-center gap-2">
            Period
            <input type="number" value={s.params.stddevPeriod} onChange={setParam("stddevPeriod")} className="w-20 px-2 py-1 bg-neutral-900 border border-neutral-800 rounded" />
          </label>
          <label className="flex items-center gap-2">
            Mult
            <input type="number" step="0.5" value={s.params.stddevMult} onChange={setParam("stddevMult")} className="w-20 px-2 py-1 bg-neutral-900 border border-neutral-800 rounded" />
          </label>
          <div className="col-span-2 font-medium opacity-80 mt-2">Bollinger Band Fill</div>
<label className="flex items-center gap-2">
  Palette
  <select value={s.style.palette ?? "Brand"} onChange={(e)=> indicatorStore.applyPalette(e.target.value)} className="px-2 py-1 bg-neutral-900 border border-neutral-800 rounded">
    <option value="Brand">Brand</option>
    <option value="Calm">Calm</option>
    <option value="Heatmap">Heatmap</option>
  </select>
</label>
          <label className="flex items-center gap-2">
            Color
            <input type="color" value={s.style.bbFillColor} onChange={(e)=> indicatorStore.set({ style: { ...s.style, bbFillColor: e.target.value } as any })} className="w-10 h-8 bg-transparent" />
          </label>
          <label className="flex items-center gap-2">
            Opacity
            <input type="range" min={0} max={1} step={0.05} value={s.style.bbFillOpacity} onChange={(e)=> indicatorStore.set({ style: { ...s.style, bbFillOpacity: Number(e.target.value) } as any })} />
            <span className="tabular-nums">{Math.round(s.style.bbFillOpacity*100)}%</span>
          </label>

          <div className="col-span-2 mt-3 flex gap-2 flex-wrap">
  <button onClick={()=> indicatorStore.reset()} className="px-3 py-2 rounded-xl border border-neutral-700 hover:bg-neutral-900">Reset to defaults</button>
  <button onClick={()=> indicatorStore.saveForSymbol(symbolStore.get())} className="px-3 py-2 rounded-xl border border-neutral-700 hover:bg-neutral-900">Save for {symbolStore.get()}</button>
  <button onClick={()=> { indicatorStore.clearForSymbol(symbolStore.get()); }} className="px-3 py-2 rounded-xl border border-rose-700 hover:bg-neutral-900">Clear {symbolStore.get()} preset</button>
</div>
        </div>
      )}
    </div>
  );
}
