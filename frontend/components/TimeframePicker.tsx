"use client";
import { useEffect, useState } from "react";
import { timeframeStore } from "@/lib/timeframeStore";

type TimeFrame = "15m" | "30m" | "1h" | "4h" | "1d" | "1w";
const TF: TimeFrame[] = ["15m","30m","1h","4h","1d","1w"];

export default function TimeframePicker(){
  const [active, setActive] = useState<TimeFrame>(timeframeStore.get() as TimeFrame);
  useEffect(() => {
    const unsub = timeframeStore.subscribe((t) => setActive(t as TimeFrame));
    return () => { unsub(); };
  }, []);
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
