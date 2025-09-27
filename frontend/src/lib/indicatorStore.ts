/**
 * Indicator store v2 (structured internal + flattened snapshot).
 */
export type IndicatorFlags = {
  ema20: boolean; ema50: boolean; bband: boolean; bbFill: boolean;
  vwap: boolean; vwma: boolean; rsi: boolean; macd: boolean; stddev: boolean;
};
export type IndicatorParams = { bbPeriod: number; bbMult: number; vwmaPeriod: number; stddevPeriod: number; stddevMult: number; };
export type IndicatorStyle = { bbFillColor: string; bbFillOpacity: number; };
export type IndicatorStateInternal = { flags: IndicatorFlags; params: IndicatorParams; style: IndicatorStyle; };
export type IndicatorSnapshot = IndicatorStateInternal & IndicatorFlags; // flattened (ema20 etc. at top-level)

const DEFAULT_FLAGS: IndicatorFlags = { ema20: true, ema50: false, bband: false, bbFill: true, vwap: false, vwma: false, rsi: false, macd: false, stddev: false };
const DEFAULT_PARAMS: IndicatorParams = { bbPeriod: 20, bbMult: 2, vwmaPeriod: 20, stddevPeriod: 20, stddevMult: 2 };
const DEFAULT_STYLE: IndicatorStyle = { bbFillColor: "#22d3ee", bbFillOpacity: 0.12 };

function cloneInternal(s: IndicatorStateInternal): IndicatorStateInternal {
  return { flags: { ...s.flags }, params: { ...s.params }, style: { ...s.style } };
}
function flatten(s: IndicatorStateInternal): IndicatorSnapshot {
  return Object.freeze({ ...cloneInternal(s), ...s.flags }) as IndicatorSnapshot;
}
type Subscriber = (snap: IndicatorSnapshot) => void;

class IndicatorStore {
  private internal: IndicatorStateInternal = { flags: { ...DEFAULT_FLAGS }, params: { ...DEFAULT_PARAMS }, style: { ...DEFAULT_STYLE } };
  private subs = new Set<Subscriber>();
  private cache = new Map<string, Partial<IndicatorStateInternal>>();

  get(): IndicatorSnapshot { return flatten(this.internal); }
  subscribe(fn: Subscriber){ this.subs.add(fn); try{ fn(this.get()); }catch{} return () => this.subs.delete(fn) }
  private emit(){ const snap = this.get(); for(const fn of Array.from(this.subs)){ try{ fn(snap) }catch{} } }
  private commit(next: Partial<IndicatorStateInternal>){
    if(next.flags) this.internal.flags = { ...this.internal.flags, ...next.flags };
    if(next.params) this.internal.params = { ...this.internal.params, ...next.params };
    if(next.style) this.internal.style = { ...this.internal.style, ...next.style };
    this.emit();
  }

  toggle<K extends keyof IndicatorFlags>(key: K, value?: boolean){
    const cur = !!this.internal.flags[key];
    const next = typeof value === "boolean" ? value : !cur;
    this.commit({ flags: { [key]: next } as Partial<IndicatorFlags> });
  }
  setParam<K extends keyof IndicatorParams>(key: K, value: IndicatorParams[K]){ this.commit({ params: { [key]: value } as Partial<IndicatorParams> }) }
  setStyle<K extends keyof IndicatorStyle>(key: K, value: IndicatorStyle[K]){ this.commit({ style: { [key]: value } as Partial<IndicatorStyle> }) }
  set(partial: Partial<IndicatorStateInternal>){ this.commit(partial) }
  reset(){ this.internal = { flags: { ...DEFAULT_FLAGS }, params: { ...DEFAULT_PARAMS }, style: { ...DEFAULT_STYLE } }; this.emit() }

  private key(symbol: string, timeframe?: string){ const tf = timeframe && timeframe.trim() ? ":"+timeframe : ""; return `fynix:inds:${symbol}${tf}` }

  loadForSymbol(symbol: string, timeframe?: string){
    const k = this.key(symbol, timeframe);
    const cached = this.cache.get(k); if(cached){ this.commit(cached); return }
    if(typeof window!=="undefined" && typeof localStorage!=="undefined"){
      try{ const raw = localStorage.getItem(k); if(raw){ const parsed = JSON.parse(raw) as Partial<IndicatorStateInternal>; this.cache.set(k, parsed); this.commit(parsed); return } }catch{}
    }
    this.reset();
  }
  saveForSymbol(symbol: string, timeframe?: string){
    const k=this.key(symbol, timeframe);
    const override = cloneInternal(this.internal);
    this.cache.set(k, override);
    if(typeof window!=="undefined" && typeof localStorage!=="undefined"){ try{ localStorage.setItem(k, JSON.stringify(override)) }catch{} }
  }
  clearForSymbol(symbol: string, timeframe?: string){
    const k=this.key(symbol, timeframe);
    this.cache.delete(k);
    if(typeof window!=="undefined" && typeof localStorage!=="undefined"){ try{ localStorage.removeItem(k) }catch{} }
    this.reset();
  }
}
export const indicatorStore = new IndicatorStore();
export const DEFAULT_INDICATOR_FLAGS = DEFAULT_FLAGS;
export const DEFAULT_INDICATOR_PARAMS = DEFAULT_PARAMS;
export const DEFAULT_INDICATOR_STYLE = DEFAULT_STYLE;