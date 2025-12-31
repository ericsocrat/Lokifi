const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:8000/api';

// Lightweight token store (localStorage). In a production app, consider httpOnly cookies.
const KEY = 'lokifi_token';

export function setToken(token: string | null) {
  if (typeof window === 'undefined') return;
  if (token) localStorage.setItem(KEY, token);
  else localStorage.removeItem(KEY);
}

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(KEY);
}

export async function apiFetch(input: string, init: RequestInit = {}) {
  const url = `${API_BASE}${input}`;

  const headers = new Headers(init.headers || {});
  // Using HTTP-only cookies for auth, no need for Authorization header
  headers.set('Content-Type', headers.get('Content-Type') || 'application/json');

  try {
    const res = await fetch(url, {
      ...init,
      headers,
      credentials: 'include', // Enable sending/receiving cookies
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      // Try to parse error detail from JSON response
      try {
        const errorData = JSON.parse(text);
        const errorMessage = errorData.detail || text || res.statusText;
        throw new Error(errorMessage);
      } catch (_parseError) {
        // If JSON parse fails, use raw text
        throw new Error(text || res.statusText);
      }
    }

    return res;
  } catch (error) {
    // Development-only error logging
    if (process.env.NODE_ENV === 'development') {
      console.error('❌ apiFetch failed:', error);
    }
    throw error;
  }
}
