import type { ToolPlugin } from './types';
const ghostKey = '__lokifiGhost';

function uuid() {
  return globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2);
}

export const trendlinePlus: ToolPlugin = {
  id: 'trendline-plus',
  label: 'Trendline+',
  kind: 'tool',
  mount() {
    /* no-op for now */
  },
  unmount() {
    /* no-op */
  },

  // two-click trendline with snap
  onPointerDown(e, ctx) {
    const g = (globalThis as any)[ghostKey];
    if (g && g.type && g._plugin) (globalThis as any)[ghostKey] = null;
    const { snapped } = ctx.xy(e);
    const state: any =
      (trendlinePlus as any)._state ||
      ((trendlinePlus as any)._state = { a: null as null | { t: number; p: number } });
    if (!state.a) {
      state.a = { t: snapped.t, p: snapped.p };
      return true;
    } else {
      const a = state.a;
      const b = { t: snapped.t, p: snapped.p };
      ctx.draw.add({ id: uuid(), type: 'trendline', a, b } as any);
      (trendlinePlus as any)._state = { a: null };
      return true;
    }
  },
  onPointerMove(e, ctx) {
    // Could render a ghost preview in future by updating a temp shape id
    return !!(trendlinePlus as any)._state?.a;
  },
  onPointerUp() {
    return !!(trendlinePlus as any)._state?.a;
  },
};
