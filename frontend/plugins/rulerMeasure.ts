import type { ToolPlugin } from './types';
const ghostKey = '__fynixGhost';

function uuid() {
  return globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2);
}

export const rulerMeasure: ToolPlugin = {
  id: 'ruler-measure',
  label: 'Ruler',
  kind: 'tool',
  onPointerDown(e, ctx) {
    const g = (globalThis as any)[ghostKey];
    if (g && g.type && g._plugin) (globalThis as any)[ghostKey] = null;
    const { snapped } = ctx.xy(e);
    const st: any =
      (rulerMeasure as any)._state ||
      ((rulerMeasure as any)._state = { a: null as null | { t: number; p: number } });
    if (!st.a) {
      st.a = snapped;
      (globalThis as any).__fynixAnchor = { t: snapped.t, p: snapped.p };
      return true;
    }
    const a = st.a;
    const b = snapped;
    ctx.draw.add({ id: uuid(), type: 'measure', a, b } as any);
    (rulerMeasure as any)._state = { a: null };
    return true;
  },
  onPointerMove(e, ctx) {
    const st: any = (rulerMeasure as any)._state;
    if (!st?.a) return false;
    const { snapped } = ctx.xy(e);
    (globalThis as any)[ghostKey] = {
      type: 'measure',
      a: st.a,
      b: snapped,
      _plugin: 'ruler-measure',
    };
    return true;
  },
  onPointerUp() {
    return !!(rulerMeasure as any)._state?.a;
  },
};
