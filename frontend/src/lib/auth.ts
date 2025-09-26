import { apiFetch, setToken, getToken } from "./apiFetch";

export async function register(handle: string, password: string, avatar_url?: string, bio?: string) {
  const res = await apiFetch(`/auth/register`, {
    method: "POST",
    body: JSON.stringify({ handle, password, avatar_url, bio }),
  });
  const data = await res.json();
  setToken(data.access_token);
  return data;
}

export async function login(handle: string, password: string) {
  const res = await apiFetch(`/auth/login`, {
    method: "POST",
    body: JSON.stringify({ handle, password }),
  });
  const data = await res.json();
  setToken(data.access_token);
  return data;
}

export function logout() {
  setToken(null);
}

export async function me() {
  const res = await apiFetch(`/auth/me`, { method: "GET" });
  return res.json();
}

export function authToken() {
  return getToken();
}
