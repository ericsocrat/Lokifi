/**
 * Lightweight indicator store (no external deps).
 * API matches prior usage: indicatorStore.get(), .subscribe(fn), .set(partial),
 * .toggle(key), .setParam(k,v), .setStyle(k,v), .loadForSymbol(sym), .reset().
 */

interface IndicatorFlags {
  ema20: boolean;
  ema50: boolean;
  bband: boolean;
  bbFill: boolean;
  vwap: boolean;
  vwma: boolean;
  rsi: boolean;
  macd: boolean;
  stddev: boolean;
}

interface IndicatorParams {
  bbPeriod: number;     // Bollinger period
  bbMult: number;       // Bollinger deviation multiplier
  vwmaPeriod: number;   // VWMA period
  vwapAnchorIndex: number; // VWAP anchor point
  stddevPeriod: number; // StdDev channel period
  stddevMult: number;   // StdDev channel multiplier
}

interface IndicatorStyle {
  bbFillColor: string;   // hex or css color
  bbFillOpacity: number; // 0..1
}

interface IndicatorState {
  /** enabled/disabled indicators */
  flags: IndicatorFlags;
  /** parameters */
  params: IndicatorParams;
  /** visual styles */
  style: IndicatorStyle;
}

export type { IndicatorState, IndicatorFlags, IndicatorParams, IndicatorStyle };

const DEFAULT_FLAGS: IndicatorFlags = {
  ema20: true,
  ema50: false,
  bband: false,
  bbFill: true,
  vwap: false,
  vwma: false,
  rsi: false,
  macd: false,
  stddev: false,
};

const DEFAULT_PARAMS: IndicatorParams = {
  bbPeriod: 20,
  bbMult: 2,
  vwmaPeriod: 20,
  vwapAnchorIndex: 0,
  stddevPeriod: 20,
  stddevMult: 2,
};

const DEFAULT_STYLE: IndicatorStyle = {
  bbFillColor: "#22d3ee",
  bbFillOpacity: 0.12,
};

const DEFAULT_STATE: IndicatorState = {
  flags: { ...DEFAULT_FLAGS },
  params: { ...DEFAULT_PARAMS },
  style: { ...DEFAULT_STYLE },
};

type Subscriber = (s: IndicatorState) => void;

class IndicatorStore {
  private state: IndicatorState = structuredClone(DEFAULT_STATE);
  private subs: Set<Subscriber> = new Set();
  /** Per-symbol overrides cache (merged over defaults on loadForSymbol) */
  private symbolCache: Map<string, Partial<IndicatorState>> = new Map();

  /** Read current state (immutable copy) */
  get(): IndicatorState {
    // Shallow copy to discourage external mutation
    return {
      flags: { ...this.state.flags },
      params: { ...this.state.params },
      style: { ...this.state.style },
    };
  }

  /** Internal set + notify */
  private commit(next: Partial<IndicatorState>) {
    if (next.flags) this.state.flags = { ...this.state.flags, ...next.flags };
    if (next.params) this.state.params = { ...this.state.params, ...next.params };
    if (next.style) this.state.style = { ...this.state.style, ...next.style };
    this.notify();
  }

  /** Merge partial state and notify */
  set(partial: Partial<IndicatorState>) {
    this.commit(partial);
  }

  /** Subscribe to state changes (returns unsubscribe) */
  subscribe(fn: Subscriber) {
    this.subs.add(fn);
    try { fn(this.get()); } catch {}
    return () => { this.subs.delete(fn); };
  }

  private notify() {
    const snap = this.get();
    this.subs.forEach((fn: any) => { try { fn(snap); } catch {} });
  }

  /** Toggle a boolean flag in state.flags by key */
  toggle<K extends keyof IndicatorFlags>(key: K, value?: boolean) {
    const current = !!this.state.flags[key];
    const next = (typeof value === "boolean") ? value : !current;
    this.commit({ flags: { [key]: next } as Partial<IndicatorFlags> } as Partial<IndicatorState>);
  }

  /** Set numeric parameter */
  setParam<K extends keyof IndicatorParams>(key: K, value: IndicatorParams[K]) {
    this.commit({ params: { [key]: value } as Partial<IndicatorParams> } as Partial<IndicatorState>);
  }

  /** Set style parameter */
  setStyle<K extends keyof IndicatorStyle>(key: K, value: IndicatorStyle[K]) {
    this.commit({ style: { [key]: value } as Partial<IndicatorStyle> } as Partial<IndicatorState>);
  }

  /** Reset to defaults */
  reset() {
    this.state = structuredClone(DEFAULT_STATE);
    this.notify();
  }

  /**
   * Load settings for a symbol (and optional timeframe) and merge over defaults.
   * Persists to localStorage under key: lokifi:inds:<symbol>[:<tf>]
   */
  loadForSymbol(symbol: string, timeframe?: string) {
    const key = this.key(symbol, timeframe);
    // memory cache first
    const cached = this.symbolCache.get(key);
    if (cached) { this.commit(cached); return; }

    // localStorage (browser only)
    if (typeof window !== "undefined" && typeof localStorage !== "undefined") {
      try {
        const raw = localStorage.getItem(key);
        if (raw) {
          const parsed = JSON.parse(raw) as Partial<IndicatorState>;
          this.symbolCache.set(key, parsed);
          this.commit(parsed);
          return;
        }
      } catch {}
    }
    // fall back to defaults
    this.reset();
  }

  /** Save current state as override for symbol/timeframe */
  saveForSymbol(symbol: string, timeframe?: string) {
    const key = this.key(symbol, timeframe);
    const override: Partial<IndicatorState> = {
      flags: { ...this.state.flags },
      params: { ...this.state.params },
      style: { ...this.state.style },
    };
    this.symbolCache.set(key, override);
    if (typeof window !== "undefined" && typeof localStorage !== "undefined") {
      try { localStorage.setItem(key, JSON.stringify(override)); } catch {}
    }
  }

  /** Clear stored override and revert to defaults */
  clearForSymbol(symbol: string, timeframe?: string) {
    const key = this.key(symbol, timeframe);
    this.symbolCache.delete(key);
    if (typeof window !== "undefined" && typeof localStorage !== "undefined") {
      try { localStorage.removeItem(key); } catch {}
    }
    this.reset();
  }

  private key(symbol: string, timeframe?: string) {
    const tf = (timeframe && timeframe.trim()) ? ":" + timeframe : "";
    return `lokifi:inds:${symbol}${tf}`;
  }
}

// Singleton export
export const indicatorStore = new IndicatorStore();

// Convenience named exports if other modules do destructuring
export const DEFAULT_INDICATOR_FLAGS = DEFAULT_FLAGS;
export const DEFAULT_INDICATOR_PARAMS = DEFAULT_PARAMS;
export const DEFAULT_INDICATOR_STYLE = DEFAULT_STYLE;
