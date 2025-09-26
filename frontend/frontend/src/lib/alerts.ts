import { apiFetch } from "./apiFetch";

export type AlertType = "price_threshold" | "pct_change";

export interface Alert {
  id: string;
  type: AlertType;
  symbol: string;
  timeframe: string;
  active: boolean;
  created_at: number;
  min_interval_sec: number;
  last_triggered_at?: number | null;
  config: Record<string, any>;
  owner_handle?: string | null;
}

export async function listAlerts(): Promise<Alert[]> {
  const res = await apiFetch(`/alerts`, { method: "GET" });
  return res.json();
}

export async function createAlert(a: {
  type: AlertType; symbol: string; timeframe?: string; min_interval_sec?: number;
  config: Record<string, any>;
}): Promise<Alert> {
  const res = await apiFetch(`/alerts`, {
    method: "POST",
    body: JSON.stringify({
      type: a.type, symbol: a.symbol,
      timeframe: a.timeframe ?? "1h",
      min_interval_sec: a.min_interval_sec ?? 300,
      config: a.config
    }),
  });
  return res.json();
}

export async function deleteAlert(id: string): Promise<void> {
  await apiFetch(`/alerts/${id}`, { method: "DELETE" });
}

export async function toggleAlert(id: string, active: boolean): Promise<void> {
  const url = `/alerts/${id}/toggle?active=${String(active)}`;
  await apiFetch(url, { method: "POST" });
}

export type AlertEvent =
  | { type: "hello"; data: any }
  | { type: "keepalive"; data: any }
  | { type: "alert"; data: { type: "alert.triggered"; alert: Alert; payload: any; ts: number } };

export function subscribeAlerts(onEvent: (ev: AlertEvent) => void, mine = false): () => void {
  // For SSE, we cannot set headers via EventSource. If you want mine=true filtering,
  // set your token in localStorage and backend will still require it for HTTP routes.
  const base = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000/api";
  const url = `${base}/alerts/stream?mine=${mine ? "true" : "false"}`;
  const es = new EventSource(url);
  es.addEventListener("hello", (e) => onEvent({ type: "hello", data: JSON.parse((e as MessageEvent).data) }));
  es.addEventListener("keepalive", (e) => onEvent({ type: "keepalive", data: JSON.parse((e as MessageEvent).data) }));
  es.addEventListener("alert", (e) => onEvent({ type: "alert", data: JSON.parse((e as MessageEvent).data) }));
  es.onerror = () => { /* auto-retry */ };
  return () => es.close();
}
