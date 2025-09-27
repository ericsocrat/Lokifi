/**
 * Alerts API (typed, minimal, compile-safe).
 * Replace later with real HTTP calls to your backend.
 */

export type Alert = {
  id: string;
  symbol: string;
  type: string;        // e.g. "price", "cross", etc.
  timeframe: string;   // e.g. "1h"
  active: boolean;
  config?: Record<string, any>;
  createdAt?: number;  // epoch seconds
};

export type AlertEvent = {
  type: "alert";
  data: { ts: number; payload: any };
  alertId?: string;
};

// --- CRUD-ish stubs ---

export async function listAlerts(): Promise<Alert[]> {
  // TODO: wire to backend
  return [];
}

export async function createAlert(payload: Partial<Alert> & { type: string; symbol: string; timeframe: string; config?: any }): Promise<Alert> {
  return {
    id: String(Date.now()),
    symbol: payload.symbol!,
    type: payload.type!,
    timeframe: payload.timeframe!,
    active: true,
    config: payload.config,
    createdAt: Math.floor(Date.now() / 1000),
  };
}

export async function toggleAlert(id: string, active: boolean): Promise<boolean> {
  // TODO: wire to backend
  return true;
}

export async function deleteAlert(id: string): Promise<boolean> {
  // TODO: wire to backend
  return true;
}

// --- SSE-like subscription stub (returns unsubscribe) ---

export function subscribeAlerts(cb: (ev: AlertEvent) => void, withPast?: boolean): () => void {
  // Demo ticker; replace with real EventSource/WebSocket later
  let stopped = false;
  const tick = () => {
    if (stopped) return;
    // no-op demo event each minute
    setTimeout(tick, 60_000);
  };
  tick();
  return () => { stopped = true; };
}