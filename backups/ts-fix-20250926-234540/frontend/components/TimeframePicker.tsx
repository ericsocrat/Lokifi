"use client";
const TF = ["15m","30m","1h","4h","1d","1w"] as const;
import { useEffect, useState } from "react";
import { timeframeStore } from "@/lib/timeframeStore";
export default function TimeframePicker(){
  const [active, setActive] = useState<string>(timeframeStore.get());
  useEffect(()=> timeframeStore.subscribe((t)=>setActive(t)),[]);
  return (
    <div className="flex gap-2">
      {TF.map(t => (
        <button
          key={t}
          onClick={()=> timeframeStore.set(t as any)}
          className={`px-3 py-2 rounded-xl border ${active===t ? "bg-electric/20 border-electric" : "bg-neutral-900 border-neutral-800 hover:bg-neutral-800"}`}
        >{t}</button>
      ))}
    </div>
  );
}
