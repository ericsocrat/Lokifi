export const today = () => new Date().toISOString().slice(0, 10);
export const categories = ["stock", "etf", "crypto", "cash"] as const;
export const categoryNames: Record<string, string> = { stock: "Stocks", etf: "ETFs", crypto: "Crypto", cash: "Cash" };
export const currencies = [
  "EUR",
  "USD",
  "GBP",
  "PLN",
  "CHF",
  "JPY",
  "CAD",
  "SEK",
  "AUD",
  "DKK",
  "NOK",
  "CZK",
  "HUF",
  "HKD",
  "SGD",
];
export const message = (e: unknown) => (e instanceof Error ? e.message : "Something went wrong. Please try again.");
