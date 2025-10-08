"use client";

import { useState } from "react";
import { useAuth } from "./AuthProvider";

export function AuthModal({ onClose }: { onClose: () => void }) {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [handle, setHandle] = useState("");
  const [password, setPassword] = useState("");
  const [bio, setBio] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null); setBusy(true);
    try {
      if (mode === "login") await login(handle, password);
      else await register(handle, password, undefined, bio);
      onClose();
    } catch (err: any) {
      setError(err?.message || "Failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="w-full max-w-md rounded-2xl bg-neutral-900 border border-neutral-800 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">{mode === "login" ? "Login" : "Register"}</h2>
          <button onClick={onClose} className="text-neutral-400 hover:text-white">✕</button>
        </div>
        <form onSubmit={submit} className="space-y-3">
          <input className="w-full px-3 py-2 rounded-lg bg-neutral-800 border border-neutral-700" placeholder="Handle" value={handle} onChange={(e)=>setHandle(e.target.value)} required />
          <input className="w-full px-3 py-2 rounded-lg bg-neutral-800 border border-neutral-700" type="password" placeholder="Password" value={password} onChange={(e)=>setPassword(e.target.value)} required />
          {mode === "register" && (
            <textarea className="w-full px-3 py-2 rounded-lg bg-neutral-800 border border-neutral-700" placeholder="Bio (optional)" value={bio} onChange={(e)=>setBio(e.target.value)} />
          )}
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button disabled={busy} className="w-full px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60">{busy ? "Please wait…" : (mode === "login" ? "Login" : "Register")}</button>
        </form>
        <div className="mt-3 text-sm text-neutral-400">
          {mode === "login" ? (
            <button onClick={()=>setMode("register")} className="underline">Create an account</button>
          ) : (
            <button onClick={()=>setMode("login")} className="underline">Have an account? Login</button>
          )}
        </div>
      </div>
    </div>
  );
}
