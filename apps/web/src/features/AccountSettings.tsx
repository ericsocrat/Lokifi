"use client";
import { ArrowDownToLine, CircleHelp } from "lucide-react";
import { api, type User } from "../api";
import { Field } from "../components/Field";
import { useState } from "react";
import { useRouter } from "../routing";
import type { Action } from "./types";
export function AccountSettings({
  user,
  setUser,
  action,
  busy,
}: {
  user: User;
  setUser: (u: User) => void;
  action: Action;
  busy: boolean;
}) {
  const [deleting, setDeleting] = useState(false);
  const router = useRouter();
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">YOUR WORKSPACE</p>
          <h1>Account settings</h1>
          <p className="muted">A few essentials, all in one place.</p>
        </div>
      </div>
      <div className="settings-grid">
        <section className="card">
          <h2>Personal details</h2>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const name = String(new FormData(e.currentTarget).get("name"));
              void action(async () => {
                setUser(await api<User>("/auth/me", "PATCH", { name }));
              }, "Profile saved.");
            }}
          >
            <Field label="Display name" name="name" value={user.name} />
            <p className="small muted">Signed in as {user.email}</p>
            <button disabled={busy}>Save profile</button>
          </form>
        </section>
        <section className="card">
          <h2>Password & sessions</h2>
          <p className="muted small">Changing your password signs out other sessions.</p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const form = e.currentTarget;
              const f = new FormData(form);
              void action(async () => {
                await api("/auth/password", "POST", {
                  current_password: String(f.get("current_password")),
                  new_password: String(f.get("new_password")),
                });
                form.reset();
              }, "Password changed. Other sessions signed out.");
            }}
          >
            <Field label="Current password" name="current_password" type="password" />
            <Field label="New password" name="new_password" type="password" help="At least 12 characters." />
            <button disabled={busy}>Update password</button>
          </form>
        </section>
        <section className="card">
          <h2>Your records belong to you.</h2>
          <p className="muted">
            Export your portfolios, dated valuations and watchlist in a structured file. Passwords and sessions are
            never included.
          </p>
          <a className="button secondary" href="/api/v1/account/export" download>
            <ArrowDownToLine size={16} />
            Export all records
          </a>
        </section>
        <section className="card soft">
          <CircleHelp size={22} />
          <h2>About your data</h2>
          <p className="muted">
            Valuations are entered or imported by you. A dated source makes their origin visible; it does not
            independently verify the price. Dates older than seven days are flagged for review.
          </p>
          <p className="small muted">
            Reporting currency: EUR. Supported crypto references come from Coinbase Exchange; other holdings remain
            manual.
          </p>
        </section>
        <section className="card">
          <h2>AI and chat privacy</h2>
          <p>Delete all conversations and withdraw consent to send portfolio context to Groq.</p>
          <button
            className="secondary"
            disabled={busy}
            onClick={() =>
              void action(() => api("/account/chat-data", "DELETE"), "Chat data deleted and AI consent withdrawn.")
            }
          >
            Delete chat history
          </button>
        </section>
        <section className="card">
          <h2>Delete your account</h2>
          <p>Export first if you need a copy. Deletion removes your portfolios, holdings, watchlist and chats.</p>
          {!deleting ? (
            <button className="secondary" onClick={() => setDeleting(true)}>
              Delete account…
            </button>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const password = String(new FormData(e.currentTarget).get("password"));
                void action(async () => {
                  await api("/account", "DELETE", { password });
                  router.replace("/login");
                });
              }}
            >
              <Field label="Confirm your password" name="password" type="password" />
              <button disabled={busy}>Permanently delete my account</button>
              <button className="secondary" type="button" onClick={() => setDeleting(false)}>
                Cancel
              </button>
            </form>
          )}
        </section>
      </div>
    </>
  );
}
