"use client";
import { useEffect, useState } from "react";
import { api } from "../api";
import { Field } from "../components/Field";
import { Turnstile } from "./Turnstile";
export function AccountRecovery({ mode }: { mode: "recovery" | "reset-password" | "verify-email" }) {
  const [config, setConfig] = useState<{ turnstile_site_key: string | null } | null>(null);
  const [token, setToken] = useState("");
  const [challenge, setChallenge] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    setToken(new URLSearchParams(location.hash.slice(1)).get("token") || "");
    void api<{ turnstile_site_key: string | null }>("/config").then(setConfig);
  }, []);
  return (
    <main className="standalone">
      <a className="text-link" href="/login">
        ← Sign in
      </a>
      <h1>
        {mode === "recovery"
          ? "Recover your account"
          : mode === "reset-password"
            ? "Choose a new password"
            : "Verify your email"}
      </h1>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setNote("");
          const f = new FormData(e.currentTarget);
          try {
            const result = await api<{ detail: string }>(
              mode === "recovery"
                ? "/auth/recovery"
                : mode === "reset-password"
                  ? "/auth/reset-password"
                  : "/auth/verification/confirm",
              "POST",
              mode === "recovery"
                ? { email: String(f.get("email")), turnstile_token: challenge || null }
                : mode === "reset-password"
                  ? { token, password: String(f.get("password")) }
                  : { token },
            );
            setNote(result.detail);
          } catch (e) {
            setNote(e instanceof Error ? e.message : "Please try again");
          } finally {
            setBusy(false);
            setChallenge("");
            setAttempt((n) => n + 1);
          }
        }}
      >
        {mode === "recovery" && (
          <>
            <Field label="Email address" name="email" type="email" />
            <Turnstile
              siteKey={config?.turnstile_site_key || null}
              action="recovery"
              onToken={setChallenge}
              attempt={attempt}
            />
          </>
        )}
        {mode === "reset-password" && (
          <Field label="New password" name="password" type="password" help="At least 12 characters." />
        )}
        <button
          disabled={
            busy ||
            (mode !== "recovery" && !token) ||
            (mode === "recovery" && !!config?.turnstile_site_key && !challenge)
          }
          className="full"
        >
          {busy
            ? "Please wait…"
            : mode === "recovery"
              ? "Send reset link"
              : mode === "reset-password"
                ? "Reset password"
                : "Verify email"}
        </button>
      </form>
      {note && (
        <p role="status" className="notice">
          {note}
        </p>
      )}
    </main>
  );
}
