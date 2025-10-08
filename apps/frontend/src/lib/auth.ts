import { apiFetch, setToken, getToken } from "./apiFetch";

export async function register(
  email: string,
  password: string,
  full_name: string,
  username?: string
) {
  const res = await apiFetch(`/auth/register`, {
    method: "POST",
    body: JSON.stringify({ email, password, full_name, username }),
  });
  const data = await res.json();
  // Using HTTP-only cookies, no need to store token in localStorage
  return data;
}

export async function login(email: string, password: string) {
  const res = await apiFetch(`/auth/login`, {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  // Using HTTP-only cookies, no need to store token in localStorage
  return data;
}

export async function googleAuth(accessToken: string) {
  const res = await apiFetch(`/auth/google`, {
    method: "POST",
    body: JSON.stringify({ access_token: accessToken }),
  });
  const data = await res.json();
  // Using HTTP-only cookies, no need to store token in localStorage
  return data;
}

export async function logout() {
  // Call backend logout to clear HTTP-only cookies
  await apiFetch(`/auth/logout`, { method: "POST" });
}

export async function me() {
  const res = await apiFetch(`/auth/me`, { method: "GET" });
  return res.json();
}

export function authToken() {
  return getToken();
}
