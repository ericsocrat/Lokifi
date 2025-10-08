
import { timeframeStore } from "@/lib/timeframeStore";
import { symbolStore } from "@/lib/symbolStore";

export type Tool = "cursor" | "trendline" | "ray" | "hline" | "rect" | "fib";
export type Point = { t: number; p: number };
export type Shape =
  | { id: string; type: "trendline"; a: Point; b: Point }
  | { id: string; type: "ray"; a: Point; b: Point }
  | { id: string; type: "hline"; y: number }
  | { id: string; type: "rect"; a: Point; b: Point }
  | { id: string; type: "fib"; a: Point; b: Point; levels?: number[] }
  | { id: string; type: "measure"; a: Point; b: Point }
  | { id: string; type: "channel"; a: Point; b: Point; width: number; widthMode?: "price" | "pixels"; widthPx?: number }
  | { id: string; type: "channel3"; a: Point; b: Point; c: Point; widthMode?: "price" | "pixels"; widthPx?: number };

export type DrawState = {
  tool: Tool;
  snap: boolean;
  shapes: Shape[];
  selectedIds: string[];
};

const LS_PREFIX = "lokifi.drawings";
function key(sym: string, tf: string){ return `${LS_PREFIX}.${sym}.${tf}`; }
function load(sym: string, tf: string): Shape[] { try{ const raw = localStorage.getItem(key(sym, tf)); return raw ? JSON.parse(raw) as Shape[] : []; } catch { return []; } }
function save(sym: string, tf: string, shapes: Shape[]){ try{ localStorage.setItem(key(sym, tf), JSON.stringify(shapes)); } catch {} }

const listeners = new Set<(s: DrawState)=>void>();
let _state: DrawState = { tool: "cursor", snap: true, shapes: [], selectedIds: [] };
let undoStack: Shape[][] = []; let redoStack: Shape[][] = [];

export const drawStore = {
  get(){ return _state; },
  subscribe(fn: (s: DrawState)=>void){ listeners.add(fn); fn(_state); return ()=> listeners.delete(fn); },
  setTool(tool: Tool){ _state = { ..._state, tool }; listeners.forEach(l=>l(_state)); },
  setSnap(snap: boolean){ _state = { ..._state, snap }; listeners.forEach(l=>l(_state)); },

  setSelection(ids: string[]){ _state = { ..._state, selectedIds: Array.from(new Set(ids)) }; listeners.forEach(l=>l(_state)); },
  selectOne(id: string | null){ _state = { ..._state, selectedIds: id ? [id] : [] }; listeners.forEach(l=>l(_state)); },
  toggle(id: string){ const s = new Set(_state.selectedIds); if (s.has(id)) s.delete(id); else s.add(id); _state = { ..._state, selectedIds: Array.from(s) }; listeners.forEach(l=>l(_state)); },
  clearSelection(){ _state = { ..._state, selectedIds: [] }; listeners.forEach(l=>l(_state)); },

  addShape(sh: Shape){
    undoStack.push(_state.shapes.map(s=>({...(s as any)}))); redoStack = [];
    const sym = symbolStore.get(); const tf = timeframeStore.get();
    _state = { ..._state, shapes: [..._state.shapes, sh] };
    save(sym, tf, _state.shapes);
    listeners.forEach(l=>l(_state));
  },
  updateShape(id: string, updater: (s: Shape) => Shape){
    const idx = _state.shapes.findIndex(s=>s.id===id);
    if (idx < 0) return;
    undoStack.push(_state.shapes.map(s=>({...(s as any)}))); redoStack = [];
    const copy = _state.shapes.slice();
    copy[idx] = updater(copy[idx]);
    const sym = symbolStore.get(); const tf = timeframeStore.get();
    _state = { ..._state, shapes: copy };
    save(sym, tf, _state.shapes);
    listeners.forEach(l=>l(_state));
  },
  moveSelectedBy(dt: number, dp: number){
    const ids = new Set(_state.selectedIds); if (!ids.size) return;
    undoStack.push(_state.shapes.map(s=>({...(s as any)}))); redoStack = [];
    const moved = _state.shapes.map(s => {
      if (!ids.has(s.id)) return s;
      if (s.type==='hline') return { ...s, y: s.y + dp };
      if ('a' in s && 'b' in s) return { ...(s as any), a: { t: s.a.t + dt, p: s.a.p + dp }, b: { t: s.b.t + dt, p: s.b.p + dp } };
      return s;
    });
    const sym = symbolStore.get(); const tf = timeframeStore.get();
    _state = { ..._state, shapes: moved };
    save(sym, tf, _state.shapes);
    listeners.forEach(l=>l(_state));
  },
  replaceShapes(newShapes: Shape[]){
    const sym = symbolStore.get(); const tf = timeframeStore.get();
    undoStack.push(_state.shapes.map(s=>({...(s as any)}))); redoStack = [];
    _state = { ..._state, shapes: newShapes };
    save(sym, tf, _state.shapes);
    listeners.forEach(l=>l(_state));
  },
  clear(){ const sym = symbolStore.get(); const tf = timeframeStore.get(); undoStack.push(_state.shapes); _state = { ..._state, shapes: [], selectedIds: []}; save(sym, tf, []); listeners.forEach(l=>l(_state)); },
  undo(){ if(!undoStack.length) return; redoStack.push(_state.shapes); const prev = undoStack.pop()!; _state = { ..._state, shapes: prev }; const sym = symbolStore.get(); const tf = timeframeStore.get(); save(sym, tf, _state.shapes); listeners.forEach(l=>l(_state)); },
  redo(){ if(!redoStack.length) return; undoStack.push(_state.shapes); const next = redoStack.pop()!; _state = { ..._state, shapes: next }; const sym = symbolStore.get(); const tf = timeframeStore.get(); save(sym, tf, _state.shapes); listeners.forEach(l=>l(_state)); },
  removeSelected(){ const ids=new Set(_state.selectedIds); if(!ids.size) return; const sym = symbolStore.get(); const tf = timeframeStore.get(); undoStack.push(_state.shapes.map(s=>({...(s as any)}))); redoStack=[]; _state={..._state, shapes: _state.shapes.filter(s=>!ids.has(s.id)), selectedIds: []}; save(sym, tf, _state.shapes); listeners.forEach(l=>l(_state)); },
  loadCurrent(){ const sym = symbolStore.get(); const tf = timeframeStore.get(); _state = { ..._state, shapes: load(sym, tf) }; listeners.forEach(l=>l(_state)); },
};
