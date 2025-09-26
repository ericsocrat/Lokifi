"use client";
import { useRef, useState } from "react";
import { API } from "@/lib/api";
import { symbolStore } from "@/lib/symbolStore";
import { timeframeStore } from "@/lib/timeframeStore";

const PRESETS = [
  { label: "llama3.1 (Ollama)", value: "llama3.1" },
  { label: "qwen2.5 (Ollama)", value: "qwen2.5" },
  { label: "Custom…", value: "__custom__" },
] as const;

export default function CopilotChat(){
  const [q, setQ] = useState("");
  const [log, setLog] = useState("");
  const [preset, setPreset] = useState<string>(PRESETS[0].value);
  const [customModel, setCustomModel] = useState<string>("");
  const [useChartCtx, setUseChartCtx] = useState<boolean>(true);
  const esRef = useRef<EventSource | null>(null);

  const chosenModel = preset === "__custom__" && customModel.trim() ? customModel.trim() : preset;

  const ask = () => {
    esRef.current?.close();
    setLog("");
    const ctx = useChartCtx ? symbolStore.get() : "";
    const tf = useChartCtx ? timeframeStore.get() : "";
    const url = `${API}/chat/stream?q=${encodeURIComponent(q)}$1${ctx ? `&ctx_symbols=${encodeURIComponent(ctx)}` : ""}${tf ? `&ctx_timeframe=${encodeURIComponent(tf)}` : ""}`;
    const es = new EventSource(url);
    es.onmessage = (e) => setLog(prev => prev + e.data);
    es.onerror = () => es.close();
    esRef.current = es;
  };

  return (
    <div className="rounded-2xl border border-neutral-800 p-3">
      <div className="font-semibold mb-2">AI Copilot</div>
      <div className="flex flex-col gap-2">
        <div className="flex gap-2 items-center">
          <select
            value={preset}
            onChange={(e)=> setPreset(e.target.value)}
            className="px-3 py-2 bg-neutral-900 rounded-xl border border-neutral-800"
            aria-label="Model preset"
          >
            {PRESETS.map(p => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>
          {preset === "__custom__" && (
            <input
              value={customModel}
              onChange={(e)=> setCustomModel(e.target.value)}
              placeholder="ollama model id (e.g., llama3.1:8b)"
              className="flex-1 bg-neutral-900 rounded-xl border border-neutral-800 px-3 py-2"
            />
          )}
        </div>
        <label className="flex items-center gap-2 text-sm opacity-90">
          <input type="checkbox" checked={useChartCtx} onChange={e=>setUseChartCtx(e.target.checked)} />
          Use chart as context (send active symbol)
        </label>
        <div className="flex gap-2">
          <input
            value={q}
            onChange={e=>setQ(e.target.value)}
            className="flex-1 bg-neutral-900 rounded-xl border border-neutral-800 px-3 py-2"
            placeholder="Ask about BTC, AAPL, RSI, news..."
          />
          <button onClick={ask} className="px-3 py-2 rounded-xl bg-electric hover:brightness-110">Ask</button>
        </div>
        <pre className="whitespace-pre-wrap text-sm mt-1 opacity-90">{log}</pre>
      </div>
    </div>
  );
}
