/**
 * Alert API (typed, minimal, compile-safe).
 * Replace later with real HTTP calls to your backend.
 */

export type Alert = {
  id: string;
  kind: string;        // e.g. "price", "cross", etc.
  enabled: boolean;
  sound?: 'ping' | 'none';
  snoozedUntil?: number;  // timestamp in ms
  maxTriggers?: number;
  triggers?: number;
  note?: string;
};

export type AlertEvent = {
  id: string;
  kind: string;
  at: number;  // timestamp in ms
  price?: number;
};

// --- CRUD-ish stubs ---

export async function listAlerts(): Promise<Alert[]> {
  // TODO: wire to backend
  return [];
}

export async function createAlert(payload: Omit<Alert, 'id'|'enabled'|'triggers'>): Promise<Alert> {
  return {
    id: String(Date.now()),
    enabled: true,
    triggers: 0,
    ...payload
  };
}

export async function toggleAlert(id: string, enabled: boolean): Promise<boolean> {
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