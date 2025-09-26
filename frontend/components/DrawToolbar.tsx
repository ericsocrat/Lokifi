
"use client";
import { useEffect, useState } from "react";
import { drawStore, type Tool } from "@/lib/drawStore";
import { pluginManager } from "@/plugins";

const TOOLS: { key: Tool; label: string }[] = [
  { key: "cursor", label: "Cursor" },
  { key: "trendline", label: "Trend" },
  { key: "ray", label: "Ray" },
  { key: "hline", label: "HLine" },
  { key: "rect", label: "Rect" },
  { key: "fib", label: "Fib" },
];

export default function DrawToolbar(){
  const [tool, setTool] = useState<Tool>(drawStore.get().tool);
  const [snap, setSnap] = useState<boolean>(drawStore.get().snap);
  const [selCount, setSelCount] = useState<number>(drawStore.get().selectedIds.length);
  useEffect(()=> drawStore.subscribe(s => { setTool(s.tool); setSnap(s.snap); setSelCount(s.selectedIds.length); }), []);

  return (
    <div className="flex items-center gap-2 px-2 py-1 rounded-xl bg-neutral-900/90 border border-neutral-800 backdrop-blur">
      {TOOLS.map(t => (
        <button
          key={t.key}
          onClick={()=> drawStore.setTool(t.key)}
          className={`text-xs px-2 py-1 rounded ${tool===t.key?"bg-electric/30 border border-electric":"border border-neutral-700 hover:bg-neutral-800"}`}
        >{t.label}</button>
      ))}
      <div className="w-px h-5 bg-neutral-800 mx-1" />
      <label className="flex items-center gap-1 text-xs">
        <input type="checkbox" checked={snap} onChange={e=> drawStore.setSnap(e.target.checked)} /> Snap
      </label>
      <div className="w-px h-5 bg-neutral-800 mx-1" />
      <button className="text-xs px-2 py-1 border border-neutral-700 rounded hover:bg-neutral-800" onClick={()=> drawStore.undo()}>Undo</button>
      <button className="text-xs px-2 py-1 border border-neutral-700 rounded hover:bg-neutral-800" onClick={()=> drawStore.redo()}>Redo</button>
      <div className="w-px h-5 bg-neutral-800 mx-1" />
      <div className="flex items-center gap-1">
        <span className="text-[11px] opacity-70">Plugins:</span>
        <button onClick={()=> pluginManager.setActiveTool(pluginManager.activeToolId === "trendline-plus" ? null : "trendline-plus")} className={`text-xs px-2 py-1 rounded ${pluginManager.activeToolId === "trendline-plus" ? "bg-emerald-600/30 border border-emerald-500" : "border border-neutral-700 hover:bg-neutral-800"}`}>Trend+</button>
        <button onClick={()=> pluginManager.setActiveTool(pluginManager.activeToolId === "ruler-measure" ? null : "ruler-measure")} className={`text-xs px-2 py-1 rounded ${pluginManager.activeToolId === "ruler-measure" ? "bg-emerald-600/30 border border-emerald-500" : "border border-neutral-700 hover:bg-neutral-800"}`}>Ruler</button>
        <button onClick={()=> pluginManager.setActiveTool(pluginManager.activeToolId === "parallel-channel" ? null : "parallel-channel")} className={`text-xs px-2 py-1 rounded ${pluginManager.activeToolId === "parallel-channel" ? "bg-emerald-600/30 border border-emerald-500" : "border border-neutral-700 hover:bg-neutral-800"}`}>Channel</button>
        <button onClick={()=> pluginManager.setActiveTool(pluginManager.activeToolId === "fib-extended" ? null : "fib-extended")} className={`text-xs px-2 py-1 rounded ${pluginManager.activeToolId === "fib-extended" ? "bg-emerald-600/30 border border-emerald-500" : "border border-neutral-700 hover:bg-neutral-800"}`}>Fib+</button>
        <button onClick={()=> pluginManager.setActiveTool(pluginManager.activeToolId === "parallel-channel-3pt" ? null : "parallel-channel-3pt")} className={`text-xs px-2 py-1 rounded ${pluginManager.activeToolId === "parallel-channel-3pt" ? "bg-emerald-600/30 border border-emerald-500" : "border border-neutral-700 hover:bg-neutral-800"}`}>Channel 3pt</button>
      </div>
      <button disabled={!selCount} className={`text-xs px-2 py-1 rounded ${selCount?"border border-rose-700 text-rose-300 hover:bg-neutral-900":"opacity-50 border border-neutral-800"}`} onClick={()=> drawStore.removeSelected()}>Delete{selCount?` (${selCount})`:""}</button>
      <button className="text-xs px-2 py-1 border border-rose-700 text-rose-300 rounded hover:bg-neutral-900" onClick={()=> drawStore.clear()}>Clear</button>
    </div>
  );
}
