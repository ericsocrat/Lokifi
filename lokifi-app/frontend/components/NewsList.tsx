"use client";
import useSWR from "swr";
import { API } from "@/lib/api";

export default function NewsList({ symbol = "BTC" }: { symbol?: string }) {
  const { data } = useSWR(`${API}/news?symbol=${symbol}&limit=10`);
  return (
    <div className="rounded-2xl border border-neutral-800 p-3">
      <div className="font-semibold mb-2">News</div>
      <ul className="space-y-2">
        {(data || []).map((n: any) => (
          <li key={n.id} className="text-sm opacity-90 hover:opacity-100">
            <a href={n.url} target="_blank" rel="noreferrer" className="hover:underline">{n.title}</a>
            <div className="text-xs text-neutral-400">{n.source} · {new Date(n.published_at).toLocaleString()}</div>
          </li>
        ))}
      </ul>
    </div>
  );
}
