"use client";
import { useState } from "react";
import { api, type User } from "../api";
import { Turnstile } from "./Turnstile";

export function PendingVerification({
  user,
  siteKey,
  onVerified,
  onSignOut,
}: {
  user: User;
  siteKey: string | null;
  onVerified: (user: User) => Promise<void>;
  onSignOut: () => Promise<void>;
}) {
  const [token, setToken] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <main className="standalone verification-screen">
      <p className="eyebrow">ONE MORE STEP</p>
      <h1>Verify your email to open Lokifi.</h1>
      <p>
        Check <strong>{user.email}</strong> for your verification link. Your portfolio workspace stays locked until
        verification is complete.
      </p>
      <p>
        A link is requested automatically when you sign up. If it has not arrived, check Junk or Spam and mark the
        message as safe. You can also request another link below.
      </p>
      <button
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          try {
            const current = await api<User>("/auth/me");
            if (current.email_verified) await onVerified(current);
            else setNote("Your email is not verified yet. Open the link and complete verification first.");
          } catch (e) {
            setNote(e instanceof Error ? e.message : "Could not check verification");
          } finally {
            setBusy(false);
          }
        }}
      >
        I have verified my email
      </button>
      <Turnstile siteKey={siteKey} action="verify_email" onToken={setToken} attempt={attempt} />
      <button
        className="secondary"
        disabled={busy || (!!siteKey && !token)}
        onClick={async () => {
          setBusy(true);
          try {
            const result = await api<{ detail: string }>("/auth/verification/request", "POST", {
              turnstile_token: token || null,
            });
            setNote(result.detail);
          } catch (e) {
            setNote(e instanceof Error ? e.message : "Could not request the email");
          } finally {
            setToken("");
            setAttempt((value) => value + 1);
            setBusy(false);
          }
        }}
      >
        Resend verification email
      </button>
      {note && <p role="status">{note}</p>}
      <p>
        <button
          className="text-button"
          disabled={busy}
          onClick={async () => {
            try {
              await onSignOut();
            } catch {
              setNote("Could not sign out. Please retry.");
            }
          }}
        >
          Sign out or use another account
        </button>
      </p>
      <details>
        <summary>Delete this unverified account</summary>
        <p>This permanently deletes the account. Enter your password to confirm.</p>
        <form
          onSubmit={async (event) => {
            event.preventDefault();
            setBusy(true);
            const password = String(new FormData(event.currentTarget).get("password"));
            try {
              await api("/account", "DELETE", { password });
              await onSignOut();
            } catch (e) {
              setNote(e instanceof Error ? e.message : "Account deletion failed");
            } finally {
              setBusy(false);
            }
          }}
        >
          <label className="field">
            <span>Password</span>
            <input type="password" name="password" autoComplete="current-password" required />
          </label>
          <button className="danger" disabled={busy}>
            Delete unverified account
          </button>
        </form>
      </details>
      <p>
        <a href="mailto:support@lokifi.com">Contact Lokifi support</a> · <a href="/privacy">Privacy & data</a>
      </p>
    </main>
  );
}
