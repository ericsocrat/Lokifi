/**
 * Alert API (typed, minimal, compile-safe).
 * Replace later with real HTTP calls to your backend.
 */

// Base properties shared by all alert types
interface BaseAlert {
  id: string;
  enabled: boolean;
  sound?: 'ping' | 'none';
  snoozedUntil?: number;  // timestamp in ms
  maxTriggers?: number;
  triggers?: number;
  note?: string;
  cooldownMs?: number;
}

// Specific alert types with discriminated 'kind' property
export type TimeAlert = BaseAlert & {
  kind: 'time';
  when: number;  // timestamp in ms
};

export type CrossAlert = BaseAlert & {
  kind: 'cross';
  drawingId: string;
};

export type FibCrossAlert = BaseAlert & {
  kind: 'fib-cross';
  drawingId: string;
  fibLevel: number;
};

export type RegionTouchAlert = BaseAlert & {
  kind: 'region-touch';
  drawingId: string;
};

export type PriceThresholdAlert = BaseAlert & {
  kind: 'price_threshold';
};

export type PctChangeAlert = BaseAlert & {
  kind: 'pct_change';
};

// Discriminated union of all alert types
export type Alert = 
  | TimeAlert 
  | CrossAlert 
  | FibCrossAlert 
  | RegionTouchAlert
  | PriceThresholdAlert
  | PctChangeAlert;

// Helper type for creating new alerts (omit auto-generated fields)
export type CreateAlertInput =
  | Omit<TimeAlert, 'id' | 'enabled' | 'triggers'>
  | Omit<CrossAlert, 'id' | 'enabled' | 'triggers'>
  | Omit<FibCrossAlert, 'id' | 'enabled' | 'triggers'>
  | Omit<RegionTouchAlert, 'id' | 'enabled' | 'triggers'>
  | Omit<PriceThresholdAlert, 'id' | 'enabled' | 'triggers'>
  | Omit<PctChangeAlert, 'id' | 'enabled' | 'triggers'>;

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
  } as Alert;  // any required: Generic object construction for discriminated union
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