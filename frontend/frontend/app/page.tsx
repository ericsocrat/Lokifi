"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { me } from "@/src/lib/auth";

export default function Home() {
  const [user, setUser] = useState<any>(null);
  useEffect(() => { me().then(setUser).catch(() => setUser(null)); }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Welcome to Fynix</h1>
      <p className="text-neutral-300">Your market, social, and alerts hub.</p>
      <div className="flex gap-3">
        <Link className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500" href="/portfolio">Portfolio</Link>
        <Link className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500" href="/alerts">Alerts</Link>
        {!user && <Link className="px-4 py-2 rounded-xl bg-zinc-700 hover:bg-zinc-600" href="/login">Login</Link>}
      </div>
    </div>
  );
}
