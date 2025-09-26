import { apiFetch } from "./apiFetch";

export interface Position {
  id: number;
  symbol: string;
  qty: number;
  cost_basis: number;
  tags?: string[] | null;
  created_at: string;
  updated_at: string;
  current_price?: number | null;
  market_value?: number | null;
  cost_value?: number | null;
  unrealized_pl?: number | null;
  pl_pct?: number | null;
}

export interface PortfolioSummary {
  handle: string;
  total_cost: number;
  total_value: number;
  total_pl: number;
  total_pl_pct: number;
  by_symbol: Record<string, {
    qty: number;
    cost_basis: number;
    cost_value: number;
    current_price: number | null;
    market_value: number | null;
    unrealized_pl: number | null;
    pl_pct: number | null;
  }>;
}

export async function listPortfolio(): Promise<Position[]> {
  const res = await apiFetch(`/portfolio`, { method: "GET" });
  return res.json();
}

export async function addPosition(params: {
  symbol: string; qty: number; cost_basis: number; tags?: string[];
  create_alerts?: boolean;
}): Promise<Position> {
  const url = `/portfolio/position${params.create_alerts ? "?create_alerts=true" : ""}`;
  const res = await apiFetch(url, {
    method: "POST",
    body: JSON.stringify({
      symbol: params.symbol,
      qty: params.qty,
      cost_basis: params.cost_basis,
      tags: params.tags ?? []
    }),
  });
  return res.json();
}

export async function deletePosition(position_id: number): Promise<void> {
  await apiFetch(`/portfolio/${position_id}`, { method: "DELETE" });
}

export async function importCsvText(csv_text: string, create_alerts?: boolean): Promise<{ok: boolean; added: number;}> {
  const url = `/portfolio/import_text${create_alerts ? "?create_alerts=true" : ""}`;
  const res = await apiFetch(url, {
    method: "POST",
    body: JSON.stringify({ csv_text }),
  });
  return res.json();
}

export async function getPortfolioSummary(): Promise<PortfolioSummary> {
  const res = await apiFetch(`/portfolio/summary`, { method: "GET" });
  return res.json();
}
