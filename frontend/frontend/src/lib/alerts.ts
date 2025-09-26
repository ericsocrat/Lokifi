const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000/api";

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
}

export async function listAlerts(): Promise<Alert[]> {
  const res = await fetch(`${API_BASE}/alerts`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to list alerts");
  return res.json();
}

export async function createAlert(a: Omit<Alert, "id" | "active" | "created_at" | "last_triggered_at"> & { active?: boolean }): Promise<Alert> {
  const body = {
    type: a.type,
    symbol: a.symbol,
    timeframe: a.timeframe,
    min_interval_sec: a.min_interval_sec ?? 300,
    config: a.config,
  };
  const res = await fetch(`${API_BASE}/alerts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function deleteAlert(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/alerts/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error(await res.text());
}

export async function toggleAlert(id: string, active: boolean): Promise<void> {
  const url = new URL(`${API_BASE}/alerts/${id}/toggle`);
  url.searchParams.set("active", String(active));
  const res = await fetch(url.toString(), { method: "POST" });
  if (!res.ok) throw new Error(await res.text());
}

export type AlertEvent =
  | { type: "hello"; data: any }
  | { type: "keepalive"; data: any }
  | { type: "alert"; data: { type: "alert.triggered"; alert: Alert; payload: any; ts: number } };

export function subscribeAlerts(onEvent: (ev: AlertEvent) => void): () => void {
  const url = `${API_BASE}/alerts/stream`;
  const es = new EventSource(url);
  es.addEventListener("hello", (e) => onEvent({ type: "hello", data: JSON.parse((e as MessageEvent).data) }));
  es.addEventListener("keepalive", (e) => onEvent({ type: "keepalive", data: JSON.parse((e as MessageEvent).data) }));
  es.addEventListener("alert", (e) => onEvent({ type: "alert", data: JSON.parse((e as MessageEvent).data) }));
  es.onerror = () => { /* network hiccups are normal; EventSource will retry */ };
  return () => es.close();
}
