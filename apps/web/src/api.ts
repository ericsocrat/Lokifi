import type { components } from "./api-schema";
export type User = components["schemas"]["UserView"];
export type Portfolio = components["schemas"]["PortfolioView"];
export type Detail = components["schemas"]["PortfolioDetail"];
export type Holding = components["schemas"]["HoldingView"];
export type Instrument = components["schemas"]["InstrumentInput"];
export type HoldingInput = components["schemas"]["HoldingInput"];
export type Preview = components["schemas"]["ImportPreview"];
export type Watch = components["schemas"]["WatchView"];

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}
export async function api<T>(path: string, method = "GET", body?: unknown): Promise<T> {
  const response = await fetch("/api/v1" + path, {
    method,
    credentials: "same-origin",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  const value = await response.json();
  if (!response.ok) throw new ApiError(value.detail || "We couldn’t complete this request.", response.status);
  return value as T;
}
export function money(value: string | null, currency = "EUR") {
  if (value === null) return "—";
  // Preserve decimal cents even beyond Number.MAX_SAFE_INTEGER; half-even display rounding.
  const negative = value.startsWith("-");
  const [whole, fraction = ""] = value.replace(/^-/, "").split(".");
  const centsText = (fraction + "00").slice(0, 2);
  let cents = BigInt(whole) * 100n + BigInt(centsText);
  const remainder = fraction.slice(2);
  if (
    remainder &&
    (remainder[0] > "5" || (remainder[0] === "5" && (/[1-9]/.test(remainder.slice(1)) || cents % 2n === 1n)))
  )
    cents += 1n;
  const formatted = new Intl.NumberFormat("en-IE", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return formatted
    .formatToParts(negative ? -(cents / 100n) : cents / 100n)
    .map((p) => (p.type === "fraction" ? (cents % 100n).toString().padStart(2, "0") : p.value))
    .join("");
}
export function units(value: string) {
  return value.includes(".") ? value.replace(/0+$/, "").replace(/\.$/, "") : value;
}
