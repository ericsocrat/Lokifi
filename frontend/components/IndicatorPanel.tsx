"use client";
import { useEffect, useState } from "react";
import { indicatorStore, type IndicatorState } from "@/lib/indicatorStore";

export default function IndicatorPanel(){
  const [s, setS] = useState<IndicatorState>(indicatorStore.get());
  useEffect(()=> indicatorStore.subscribe(setS), []);

  const toggle = (k: keyof IndicatorState) => () => indicatorStore.set({ [k]: !s[k] });

  return (
    <div className="rounded-2xl border border-neutral-800 p-3">
      <div className="font-semibold mb-2">Indicators</div>
      <div className="grid grid-cols-2 gap-2 text-sm">
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={s.ema20} onChange={toggle("ema20")} /> EMA20
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={s.ema50} onChange={toggle("ema50")} /> EMA50
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={s.rsi} onChange={toggle("rsi")} /> RSI(14)
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={s.macd} onChange={toggle("macd")} /> MACD(12,26,9)
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={s.bband} onChange={toggle("bband")} /> Bollinger Bands (20,2)
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={s.vwap} onChange={toggle("vwap")} /> VWAP (volume-weighted)
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={s.bband} onChange={toggle("bband")} /> Bollinger Bands (20,2)
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={s.bbFill} onChange={toggle("bbFill")} /> BB fill (shade between bands)
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={s.vwap} onChange={toggle("vwap")} /> VWAP
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={s.vwma} onChange={toggle("vwma")} /> VWMA
        </label>
        <label className="flex items-center gap-2 col-span-2">
          <input type="checkbox" checked={s.stddev} onChange={toggle("stddev")} /> StdDev Channels
        </label>
      </div>
      <div className="mt-3">
        </div>
    </div>
  );
}
