"use client";
import { AccountSettings } from "./features/AccountSettings";
import { EmptyPortfolio } from "./features/EmptyPortfolio";
import { HoldingDetail } from "./features/HoldingDetail";
import { PortfolioOverview } from "./features/PortfolioOverview";
import { WatchlistView } from "./features/WatchlistView";

import {
  ArrowRight,
  Layers3,
  LayoutDashboard,
  LogOut,
  MessageSquare,
  Plus,
  Settings2,
  ShieldCheck,
  Star,
  Wallet,
  X,
} from "lucide-react";
import { Assistant } from "./features/Assistant";
import { Turnstile } from "./features/Turnstile";
import Link from "./components/Link";
import { useRouter } from "./routing";
import { useEffect, useRef, useState } from "react";
import { api, ApiError, type Detail, type Holding, type Portfolio, type User, type Watch } from "./api";
import { Field } from "./components/Field";
import { Logo } from "./components/Logo";
import { Modal } from "./components/Modal";
import { message } from "./constants";
import { HoldingForm } from "./features/HoldingForm";
import { ImportForm } from "./features/ImportForm";
import { InstrumentFields, readInstrument } from "./features/instruments";
export function App({ path, assistantPortfolioId }: { path: string; assistantPortfolioId?: string }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [holding, setHolding] = useState<Holding | null>(null);
  const [watchlist, setWatchlist] = useState<Watch[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState("");
  const [assistantOpen, setAssistantOpen] = useState(false);
  const assistantDialog = useRef<HTMLDialogElement>(null);
  const assistantTrigger = useRef<HTMLButtonElement>(null);
  function closeAssistant() {
    assistantDialog.current?.close();
    setAssistantOpen(false);
    assistantTrigger.current?.focus();
  }
  useEffect(() => {
    if (assistantOpen) assistantDialog.current?.showModal();
  }, [assistantOpen]);
  const [cold, setCold] = useState(false);
  const [challengeToken, setChallengeToken] = useState("");
  const [challengeAttempt, setChallengeAttempt] = useState(0);
  const [publicConfig, setPublicConfig] = useState<{
    turnstile_site_key: string | null;
    signup_enabled: boolean;
  } | null>(null);
  const [panel, setPanel] = useState<null | "portfolio" | "holding" | "import" | "watch" | "remove" | "rename">(null);

  async function load() {
    const ps = await api<Portfolio[]>("/portfolios");
    setPortfolios(ps);
    if (path === "/watchlist") {
      setWatchlist(await api<Watch[]>("/watchlist"));
    } else if (path.startsWith("/holdings/")) {
      setHolding(await api<Holding>(path));
    } else {
      const id = path.startsWith("/portfolios/") ? path.split("/")[2] : (ps.find((p) => !p.is_demo) || ps[0])?.id;
      setDetail(id ? await api<Detail>(`/portfolios/${id}`) : null);
    }
    setLoadFailed(false);
  }
  useEffect(() => {
    let active = true;
    const wakeup = setTimeout(() => {
      if (active) setCold(true);
    }, 5000);
    void api<{ turnstile_site_key: string | null; signup_enabled: boolean }>("/config")
      .then((c) => {
        if (active) setPublicConfig(c);
      })
      .catch(() => {});
    async function init() {
      try {
        const u = await api<User>("/auth/me");
        if (!active) return;
        setUser(u);
        if (path === "/" || path === "/login" || path === "/register") {
          router.replace("/dashboard");
          return;
        }
        await load();
      } catch (e) {
        if (!active) return;
        if (e instanceof ApiError && e.status === 401) {
          if (!["/", "/login", "/register"].includes(path)) router.replace("/login");
        } else {
          setError(message(e));
          setLoadFailed(true);
        }
      } finally {
        if (active) setReady(true);
      }
    }
    void init();
    return () => {
      active = false;
      clearTimeout(wakeup);
    };
    // Each route mounts a new workspace; mutation refreshes use the same loader.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, router]);
  async function action(fn: () => Promise<unknown>, success?: string) {
    setBusy(true);
    setError("");
    setToast("");
    try {
      await fn();
      await load();
      setPanel(null);
      if (success) setToast(success);
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  }
  function open(p: typeof panel) {
    setError("");
    setPanel(p);
  }
  if (!ready)
    return (
      <main className="loading" role="status">
        <span className="logo-mark">L</span>
        <p>{cold ? "Starting Lokifi… This can take about a minute after inactivity." : "Opening your workspace…"}</p>
      </main>
    );
  if (!user) {
    const register = path === "/register";
    return (
      <div className="public-shell">
        <header>
          <Logo />
          <Link className="text-link" href={register ? "/login" : "/register"}>
            {register ? "Already have an account?" : "Create an account"}
            <ArrowRight size={16} />
          </Link>
        </header>
        <main className="welcome">
          <section>
            <p className="eyebrow">YOUR PORTFOLIO, CLEARLY</p>
            <h1>
              Know what you own.
              <br />
              <span>Understand its value.</span>
            </h1>
            <p className="intro">
              Your investments in one considered space. Bring your holdings, record their value, and see the source
              behind every figure.
            </p>
            <div className="principles">
              <p>
                <Layers3 />
                Stocks, ETFs, crypto and cash
              </p>
              <p>
                <ShieldCheck />
                Dated valuations. Explicit sources.
              </p>
              <p>
                <Wallet />A consistent view in euros
              </p>
            </div>
            <div className="welcome-note">
              <span className="dot" />
              Automatic crypto, manual and imported valuations
            </div>
          </section>
          <section className="auth-card">
            <p className="eyebrow">WELCOME TO LOKIFI</p>
            <h2>{register ? "Make room for clarity." : "Welcome back."}</h2>
            <p className="muted">
              {register ? "Create your account to start a portfolio." : "Sign in to your portfolio workspace."}
            </p>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const f = new FormData(e.currentTarget);
                setBusy(true);
                setError("");
                try {
                  await api(`/auth/${register ? "register" : "login"}`, "POST", {
                    email: String(f.get("email")),
                    password: String(f.get("password")),
                    ...(register ? { name: String(f.get("name")), turnstile_token: challengeToken || null } : {}),
                  });
                  router.replace("/dashboard");
                } catch (e) {
                  setError(message(e));
                } finally {
                  setBusy(false);
                  setChallengeToken("");
                  setChallengeAttempt((n) => n + 1);
                }
              }}
            >
              {register && <Field label="Your name" name="name" />}
              <Field label="Email address" name="email" type="email" />
              <Field
                label="Password"
                name="password"
                type="password"
                help={register ? "At least 12 characters." : ""}
              />
              {error && (
                <p role="alert" className="error">
                  {error}
                </p>
              )}
              {register && (
                <Turnstile
                  siteKey={publicConfig?.turnstile_site_key || null}
                  action="signup"
                  onToken={setChallengeToken}
                  attempt={challengeAttempt}
                />
              )}
              {register && publicConfig?.signup_enabled === false && (
                <p className="notice">Public registration is not open yet.</p>
              )}
              <button
                disabled={
                  busy ||
                  (register &&
                    (publicConfig?.signup_enabled === false || (!!publicConfig?.turnstile_site_key && !challengeToken)))
                }
                className="full"
              >
                {busy ? "Please wait…" : register ? "Create account" : "Sign in"}
                <ArrowRight size={17} />
              </button>
            </form>
            <p className="small muted">
              {register ? "Already have an account?" : "New to Lokifi?"}{" "}
              <Link href={register ? "/login" : "/register"}>{register ? "Sign in" : "Create an account"}</Link>
            </p>
            {!register && (
              <Link className="text-link" href="/recovery">
                Forgot your password?
              </Link>
            )}
          </section>
        </main>
        <footer>
          Lokifi · Public beta.
          <span>
            <Link href="/privacy">Privacy & data</Link> · <Link href="/about">About this beta</Link>
          </span>
        </footer>
      </div>
    );
  }
  const section =
    path === "/assistant"
      ? "Assistant"
      : path === "/watchlist"
        ? "Watchlist"
        : path === "/settings"
          ? "Settings"
          : holding
            ? "Holding detail"
            : "Overview";
  return (
    <div className="workspace">
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <aside className="sidebar">
        <Logo />
        <div className="workspace-label">PERSONAL WORKSPACE</div>
        <nav aria-label="Main navigation">
          <Link href="/assistant" className={section === "Assistant" ? "active" : ""}>
            <MessageSquare size={18} />
            Assistant
          </Link>
          <Link href="/dashboard" className={section === "Overview" || holding ? "active" : ""}>
            <LayoutDashboard size={18} />
            Overview
          </Link>
          <Link href="/watchlist" className={section === "Watchlist" ? "active" : ""}>
            <Star size={18} />
            Watchlist
          </Link>
          <Link href="/settings" className={section === "Settings" ? "active" : ""}>
            <Settings2 size={18} />
            Settings
          </Link>
        </nav>
        <div className="sidebar-portfolios">
          <div className="section-label">
            YOUR PORTFOLIOS
            <button className="icon-button" aria-label="Create portfolio" onClick={() => open("portfolio")}>
              <Plus size={15} />
            </button>
          </div>
          {portfolios.map((p) => (
            <Link key={p.id} href={"/portfolios/" + p.id} className={detail?.id === p.id ? "selected" : ""}>
              <span className={"portfolio-dot" + (p.is_demo ? " demo-dot" : "")} />
              <span>{p.name}</span>
              {p.is_demo && <span className="mini-tag">DEMO</span>}
            </Link>
          ))}
        </div>
        <div className="sidebar-bottom">
          <div className="private-note">
            <ShieldCheck size={18} />
            <span>
              Clarity starts with the source.<small>Your records stay in your workspace.</small>
            </span>
          </div>
          <button className="user-card" onClick={() => router.push("/settings")}>
            <span className="avatar">{user.name.slice(0, 1).toUpperCase()}</span>
            <span>
              {user.name}
              <small>Personal account</small>
            </span>
            <Settings2 size={16} />
          </button>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <span>
            <span className="muted">Workspace</span>
            <span className="slash">/</span>
            {section}
          </span>
          <div className="topbar-right">
            <select
              className="portfolio-switch"
              aria-label="Switch portfolio"
              value={detail?.id || ""}
              onChange={(e) => {
                if (e.target.value === "new") open("portfolio");
                else if (e.target.value) router.push("/portfolios/" + e.target.value);
              }}
            >
              <option value="" disabled>
                Portfolios
              </option>
              {portfolios.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                  {p.is_demo ? " · Demo" : ""}
                </option>
              ))}
              <option value="new">+ Create portfolio</option>
            </select>
            <span className="mode">
              <span className="dot" />
              Sourced valuations
            </span>
            <span className="currency-tag">EUR</span>
            <button
              className="icon-button"
              aria-label="Sign out"
              onClick={async () => {
                setBusy(true);
                try {
                  await api("/auth/logout", "POST");
                  setUser(null);
                  setDetail(null);
                  setHolding(null);
                  router.replace("/login");
                } catch (e) {
                  setError(message(e));
                } finally {
                  setBusy(false);
                }
              }}
              disabled={busy}
            >
              <LogOut size={17} />
            </button>
          </div>
        </header>
        <main id="main" tabIndex={-1}>
          {toast && (
            <div role="status" className="success">
              {toast}
            </div>
          )}
          {error && !panel && (
            <div role="alert" className="error">
              {error}
              <button className="secondary" onClick={() => void action(async () => {})}>
                Retry
              </button>
            </div>
          )}
          {loadFailed ? (
            <section className="card">
              <h1>Your records couldn’t be loaded.</h1>
              <p className="muted">This is not an empty portfolio. Use Retry above to reconnect to storage.</p>
            </section>
          ) : section === "Assistant" ? (
            <Assistant
              portfolios={portfolios}
              initialPortfolioId={assistantPortfolioId || detail?.id}
              onChanged={() => void load()}
            />
          ) : section === "Settings" ? (
            <AccountSettings user={user} setUser={setUser} action={action} busy={busy} />
          ) : section === "Watchlist" ? (
            <WatchlistView watchlist={watchlist} open={open} action={action} busy={busy} />
          ) : holding ? (
            <HoldingDetail holding={holding} open={open} action={action} busy={busy} error={error} />
          ) : !detail ? (
            <EmptyPortfolio open={open} action={action} busy={busy} />
          ) : (
            <>
              <button
                ref={assistantTrigger}
                className="secondary ask-portfolio"
                onClick={() => {
                  if (window.matchMedia("(max-width: 760px)").matches) router.push(`/assistant?portfolio=${detail.id}`);
                  else setAssistantOpen(true);
                }}
              >
                <MessageSquare size={16} />
                Ask about this portfolio
              </button>
              <PortfolioOverview detail={detail} open={open} />
            </>
          )}
        </main>
        <footer className="app-footer">
          Lokifi · Public beta.
          <span>
            <Link href="/privacy">Privacy & data</Link> · <Link href="/about">Free allowances apply</Link>
          </span>
        </footer>
      </div>
      {assistantOpen && (
        <dialog
          ref={assistantDialog}
          className="assistant-drawer"
          aria-label="Portfolio assistant"
          onCancel={(event) => {
            event.preventDefault();
            closeAssistant();
          }}
        >
          <button className="icon-button close-assistant" aria-label="Close assistant" onClick={closeAssistant}>
            <X size={19} />
          </button>
          <Assistant portfolios={portfolios} initialPortfolioId={detail?.id} onChanged={() => void load()} />
        </dialog>
      )}
      {panel && (
        <Modal
          title={
            panel === "portfolio"
              ? "Create a portfolio"
              : panel === "holding"
                ? "Add a holding"
                : panel === "import"
                  ? "Import your holdings"
                  : panel === "watch"
                    ? "Add to watchlist"
                    : panel === "rename"
                      ? "Rename portfolio"
                      : "Remove this holding?"
          }
          close={() => {
            setPanel(null);
            setError("");
          }}
        >
          {(panel === "portfolio" || panel === "rename") && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const name = String(new FormData(e.currentTarget).get("name"));
                void action(async () => {
                  const p = await api<Portfolio>(
                    panel === "rename" ? `/portfolios/${detail!.id}` : "/portfolios",
                    panel === "rename" ? "PATCH" : "POST",
                    { name },
                  );
                  router.push("/portfolios/" + p.id);
                }, "Portfolio saved.");
              }}
            >
              <p className="muted">Give this group of holdings a name that makes sense to you.</p>
              <Field label="Portfolio name" name="name" value={panel === "rename" ? detail?.name : ""} />
              {error && (
                <p role="alert" className="error">
                  {error}
                </p>
              )}
              <button disabled={busy} className="full">
                {busy ? "Saving…" : "Save portfolio"}
                <ArrowRight size={16} />
              </button>
            </form>
          )}
          {panel === "holding" && detail && (
            <HoldingForm
              error={error}
              busy={busy}
              onSave={async (value) => {
                await action(() => api(`/portfolios/${detail.id}/holdings`, "POST", value), "Holding added.");
              }}
            />
          )}
          {panel === "import" && detail && (
            <ImportForm
              portfolioId={detail.id}
              onDone={async () => {
                await load();
                setPanel(null);
                setToast("Holdings imported.");
              }}
            />
          )}
          {panel === "watch" && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const instrument = readInstrument(new FormData(e.currentTarget));
                void action(() => api("/watchlist", "POST", { instrument }), "Instrument saved to watchlist.");
              }}
            >
              <p className="muted">Record the instrument’s identity. No position or price is needed.</p>
              <div className="form-grid">
                <InstrumentFields />
              </div>
              {error && (
                <p role="alert" className="error">
                  {error}
                </p>
              )}
              <button disabled={busy} className="full">
                Save instrument
                <Star size={16} />
              </button>
            </form>
          )}
          {panel === "remove" && holding && (
            <>
              <p>
                This removes <strong>{holding.instrument.name}</strong> from this portfolio. Export your records first
                if you need a copy.
              </p>
              {error && (
                <p role="alert" className="error">
                  {error}
                </p>
              )}
              <div className="actions">
                <button className="secondary" onClick={() => setPanel(null)}>
                  Keep holding
                </button>
                <button
                  disabled={busy}
                  onClick={() =>
                    void action(async () => {
                      await api(`/holdings/${holding.id}`, "DELETE");
                      router.replace("/dashboard");
                    })
                  }
                >
                  Remove holding
                </button>
              </div>
            </>
          )}
        </Modal>
      )}
    </div>
  );
}
