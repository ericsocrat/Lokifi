const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000/api";
import { apiFetch } from "./apiFetch";

export type ChatMessage = { role: "user" | "assistant" | "system"; content: string; name?: string };

export async function chat(messages: ChatMessage[]) {
  const res = await apiFetch(`/chat`, {
    method: "POST",
    body: JSON.stringify({ messages }),
  });
  return res.json() as Promise<{ mode: string; answer: string; result?: any }>;
}
