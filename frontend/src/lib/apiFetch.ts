const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000/api";

// Lightweight token store (localStorage). In a production app, consider httpOnly cookies.
const KEY = "lokifi_token";

export function setToken(token: string | null) {
  if (typeof window === "undefined") return;
  if (token) localStorage.setItem(KEY, token);
  else localStorage.removeItem(KEY);
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(KEY);
}

export async function apiFetch(input: string, init: RequestInit = {}) {
  const token = getToken();
  const headers = new Headers(init.headers || {});
  if (token) headers.set("Authorization", `Bearer ${token}`);
  headers.set("Content-Type", headers.get("Content-Type") || "application/json");
  const res = await fetch(`${API_BASE}${input}`, { ...init, headers });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`${res.status}: ${t || res.statusText}`);
  }
  return res;
}
