import { apiFetch } from "./apiFetch";

export interface UserProfile {
  handle: string;
  avatar_url?: string;
  bio?: string;
  created_at: string;
  following_count: number;
  followers_count: number;
  posts_count: number;
}

export interface Post {
  id: number;
  handle: string;
  content: string;
  symbol?: string | null;
  created_at: string;
  avatar_url?: string | null;
}

export async function createUser(handle: string, avatar_url?: string, bio?: string): Promise<UserProfile> {
  const base = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000/api";
  const res = await fetch(`${base}/social/users`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ handle, avatar_url, bio }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function getUser(handle: string): Promise<UserProfile> {
  const base = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000/api";
  const res = await fetch(`${base}/social/users/${handle}`, { cache: "no-store" });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function follow(handle: string): Promise<void> {
  await apiFetch(`/social/follow/${handle}`, { method: "POST" });
}

export async function unfollow(handle: string): Promise<void> {
  await apiFetch(`/social/follow/${handle}`, { method: "DELETE" });
}

export async function createPost(myHandle: string, content: string, symbol?: string): Promise<Post> {
  const res = await apiFetch(`/social/posts`, {
    method: "POST",
    body: JSON.stringify({ handle: myHandle, content, symbol }),
  });
  return res.json();
}

export async function listPosts(params: { symbol?: string; limit?: number; after_id?: number } = {}): Promise<Post[]> {
  const base = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000/api";
  const url = new URL(`${base}/social/posts`);
  if (params.symbol) url.searchParams.set("symbol", params.symbol);
  if (params.limit) url.searchParams.set("limit", String(params.limit));
  if (params.after_id) url.searchParams.set("after_id", String(params.after_id));
  const res = await fetch(url.toString(), { cache: "no-store" });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function feed(params: { handle: string; symbol?: string; limit?: number; after_id?: number }): Promise<Post[]> {
  const base = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000/api";
  const url = new URL(`${base}/social/feed`);
  url.searchParams.set("handle", params.handle);
  if (params.symbol) url.searchParams.set("symbol", params.symbol);
  if (params.limit) url.searchParams.set("limit", String(params.limit));
  if (params.after_id) url.searchParams.set("after_id", String(params.after_id));
  const res = await fetch(url.toString(), { cache: "no-store" });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
