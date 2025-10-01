
import type { ToolPlugin } from "./types";
const ghostKey = "__lokifiGhost";
import { pluginSettingsStore } from "@/lib/pluginSettingsStore";

function uuid(){ return (globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2)); }

function levels(){
  const s = pluginSettingsStore.get();
  if (s.fibPreset === 'Classic') return [0,0.236,0.382,0.5,0.618,0.786,1];
  if (s.fibPreset === 'Aggressive') return [0,0.236,0.382,0.5,0.618,0.786,1,1.272,1.414,1.618,2,2.618,3.618,4.236];
  if (s.fibPreset === 'Custom') return s.fibCustomLevels?.length ? s.fibCustomLevels : [0,0.236,0.382,0.5,0.618,0.786,1];
  return [0,0.236,0.382,0.5,0.618,0.786,1,1.272,1.414,1.618,2,2.618];
}

export const fibExtended: ToolPlugin = {
  id: "fib-extended",
  label: "Fib+",
  kind: "tool",
  onPointerDown(e, ctx){
    const g = (globalThis as any)[ghostKey]; if (g && g.type && g._plugin) (globalThis as any)[ghostKey] = null;
    const { snapped } = ctx.xy(e);
    const st: any = (fibExtended as any)._state || ((fibExtended as any)._state = { a: null as null | { t:number, p:number } });
    if (!st.a){ st.a = snapped; (globalThis as any).__lokifiAnchor = { t: snapped.t, p: snapped.p }; return true; }
    const a = st.a; const b = snapped;
    ctx.draw.add({ id: uuid(), type: "fib", a, b, levels: levels() } as any);
    (fibExtended as any)._state = { a: null };
    return true;
  },
  onPointerMove(e, ctx){ const st: any = (fibExtended as any)._state; if (!st?.a) return false; const { snapped } = ctx.xy(e); (globalThis as any)[ghostKey] = { type:'fib', a: st.a, b: snapped, _plugin:'fib-extended' }; return true; },
  onPointerUp(){ return !!(fibExtended as any)._state?.a; }
};
