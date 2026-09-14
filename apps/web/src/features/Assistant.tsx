"use client";
import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, Check, MessageSquare, Plus, Send, Square, Trash2 } from "lucide-react";
import { api, type Portfolio } from "../api";
import { Turnstile } from "./Turnstile";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

function Answer({ text }: { text: string }) {
  return (
    <Markdown
      skipHtml
      remarkPlugins={[remarkGfm]}
      allowedElements={[
        "p",
        "strong",
        "em",
        "code",
        "pre",
        "ul",
        "ol",
        "li",
        "a",
        "blockquote",
        "br",
        "table",
        "thead",
        "tbody",
        "tr",
        "th",
        "td",
      ]}
      components={{
        a: ({ href, children }) =>
          href?.startsWith("https://") ? (
            <a href={href} target="_blank" rel="noreferrer">
              {children}
            </a>
          ) : (
            <span>{children}</span>
          ),
      }}
    >
      {text}
    </Markdown>
  );
}

interface Conversation {
  id: string;
  title: string;
  portfolio_id: string | null;
  created_at: string;
}
interface Proposal {
  id: string;
  action: string;
  payload: Record<string, unknown>;
  status: string;
  expires_at: string;
}
interface Detail extends Conversation {
  messages: { id: string; role: string; content: string }[];
  proposals: Proposal[];
  runs: { id: string; status: string; events: { type: string; data: Record<string, unknown> }[] }[];
}
interface Status {
  configured: boolean;
  verified: boolean;
  consented: boolean;
  remaining_turns: number;
  research_enabled: boolean;
}

function ProposalCard({ proposal, onSaved }: { proposal: Proposal; onSaved: () => void }) {
  const [payload, setPayload] = useState(proposal.payload);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  function change(path: string[], value: unknown) {
    setPayload((previous) => {
      const next = structuredClone(previous);
      let at: Record<string, unknown> = next;
      for (const p of path.slice(0, -1)) at = at[p] as Record<string, unknown>;
      at[path[path.length - 1]] = value;
      return next;
    });
  }
  function fields(obj: Record<string, unknown>, path: string[] = []): React.ReactNode {
    return Object.entries(obj).map(([key, value]) => {
      if (value && typeof value === "object" && !Array.isArray(value))
        return (
          <fieldset key={key}>
            <legend>{key.replaceAll("_", " ")}</legend>
            {fields(value as Record<string, unknown>, [...path, key])}
          </fieldset>
        );
      return (
        <label className="field" key={key}>
          <span>{key.replaceAll("_", " ")}</span>
          <input
            disabled={key.endsWith("_id")}
            value={value === null ? "" : String(value)}
            onChange={(e) => change([...path, key], e.target.value || null)}
          />
        </label>
      );
    });
  }
  return (
    <article className="proposal-card">
      <span className="badge neutral">{proposal.status === "pending" ? "Review before saving" : proposal.status}</span>
      <h3>{proposal.action.replaceAll("_", " ")}</h3>
      <p className="small muted">Nothing is changed until you confirm. This proposal expires after 15 minutes.</p>
      {proposal.status === "pending" && (
        <>
          <details open>
            <summary>Review and edit fields</summary>
            {fields(payload)}
          </details>
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          <button
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await api(`/chat/proposals/${proposal.id}/confirm`, "POST", { payload });
                onSaved();
              } catch (e) {
                setError(e instanceof Error ? e.message : "Save failed");
              } finally {
                setBusy(false);
              }
            }}
          >
            <Check size={15} />
            {busy ? "Saving…" : "Confirm change"}
          </button>
        </>
      )}
    </article>
  );
}

export function Assistant({
  portfolios,
  initialPortfolioId,
  onChanged,
}: {
  portfolios: Portfolio[];
  initialPortfolioId?: string;
  onChanged: () => void;
}) {
  const [status, setStatus] = useState<Status | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selected, setSelected] = useState<Detail | null>(null);
  const [portfolioId, setPortfolioId] = useState(initialPortfolioId || "");
  const [prompt, setPrompt] = useState("");
  const [busy, setBusy] = useState(false);
  const [partial, setPartial] = useState("");
  const [progress, setProgress] = useState("");
  const [error, setError] = useState("");
  const [sources, setSources] = useState<{ url: string; title: string }[]>([]);
  const [liveProposals, setLiveProposals] = useState<Proposal[]>([]);
  const [siteKey, setSiteKey] = useState<string | null>(null);
  const [token, setToken] = useState("");
  const [note, setNote] = useState("");
  const [verificationAttempt, setVerificationAttempt] = useState(0);
  const abort = useRef<AbortController | null>(null);
  const runId = useRef<string | null>(null);
  const lastRequest = useRef<{ id: string; message: string; conversation: string } | null>(null);
  async function refresh() {
    const [s, c] = await Promise.all([api<Status>("/chat/status"), api<Conversation[]>("/chat/conversations")]);
    setStatus(s);
    setConversations(c);
  }
  useEffect(() => {
    void refresh().catch((e) => setError(e.message));
    void api<{ turnstile_site_key: string | null }>("/config").then((c) => setSiteKey(c.turnstile_site_key));
    return () => abort.current?.abort();
  }, []);
  async function open(id: string) {
    setSelected(await api<Detail>("/chat/conversations/" + id));
    setPartial("");
    setSources([]);
    setLiveProposals([]);
    setError("");
  }
  async function send(retry = false, newTurn = false) {
    if (busy || (!prompt.trim() && !retry)) return;
    setBusy(true);
    setError("");
    setPartial("");
    setLiveProposals([]);
    setSources([]);
    setProgress("Starting the assistant…");
    let conversation = selected;
    try {
      if (!conversation) {
        const c = await api<Conversation>("/chat/conversations", "POST", { portfolio_id: portfolioId || null });
        conversation = { ...c, messages: [], proposals: [], runs: [] };
        setSelected(conversation);
      }
      const submission =
        retry && lastRequest.current
          ? { ...lastRequest.current, id: newTurn ? crypto.randomUUID() : lastRequest.current.id }
          : { id: crypto.randomUUID(), message: prompt.trim(), conversation: conversation.id };
      lastRequest.current = submission;
      setPrompt("");
      abort.current = new AbortController();
      const response = await fetch(`/api/v1/chat/conversations/${submission.conversation}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: submission.message, idempotency_key: submission.id }),
        signal: abort.current.signal,
      });
      if (!response.ok) {
        const body = await response.json();
        throw new Error(body.detail || "The assistant is unavailable");
      }
      if (!response.headers.get("content-type")?.includes("text/event-stream")) {
        await open(submission.conversation);
        setProgress("Retrieved the existing turn without sending another model request.");
        return;
      }
      setSelected((previous) =>
        previous
          ? {
              ...previous,
              messages: [...previous.messages, { id: submission.id, role: "user", content: submission.message }],
            }
          : previous,
      );
      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const pieces = buffer.split("\n\n");
        buffer = pieces.pop() || "";
        for (const piece of pieces) {
          if (!piece.startsWith("data: ")) continue;
          const event = JSON.parse(piece.slice(6));
          runId.current = event.run_id;
          if (event.type === "text") {
            setPartial((p) => p + event.data.text);
            setProgress("");
          }
          if (event.type === "progress") setProgress(event.data.text);
          if (event.type === "citation" && event.data.url?.startsWith("https://"))
            setSources((s) => [...s, event.data]);
          if (event.type === "proposal") setLiveProposals((p) => [...p, event.data]);
          if (event.type === "error") setError(event.data.message);
          if (event.type === "cancelled") setProgress("Response stopped.");
        }
      }
      const result = await api<Detail>("/chat/conversations/" + submission.conversation);
      setSelected(result);
      setPartial("");
      setLiveProposals([]);
      await refresh();
    } catch (e) {
      if (e instanceof Error && e.name === "AbortError") setProgress("Response stopped.");
      else setError(e instanceof Error ? e.message : "The connection was interrupted");
    } finally {
      setBusy(false);
      abort.current = null;
      runId.current = null;
      setProgress("");
    }
  }
  return (
    <section className="assistant-workspace" aria-label="Lokifi Assistant">
      <div className="assistant-heading">
        <div>
          <p className="eyebrow">YOUR PORTFOLIO, EXPLAINED</p>
          <h2>
            <MessageSquare size={22} />
            Lokifi Assistant
          </h2>
        </div>
        <button
          className="secondary"
          disabled={busy}
          onClick={() => {
            setSelected(null);
            setPartial("");
            setSources([]);
            setError("");
          }}
        >
          <Plus size={16} />
          New chat
        </button>
      </div>
      <label className="field">
        <span>Portfolio context</span>
        <select
          disabled={!!selected || busy}
          value={selected?.portfolio_id || portfolioId}
          onChange={(e) => setPortfolioId(e.target.value)}
        >
          <option value="">General questions only</option>
          {portfolios.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
              {p.is_demo ? " · synthetic example" : ""}
            </option>
          ))}
        </select>
      </label>
      {!status?.verified && (
        <div className="notice">
          <strong>Verify your email to use AI.</strong>
          <p>We protect the shared free allowance with verified accounts.</p>
          <Turnstile siteKey={siteKey} action="verify_email" onToken={setToken} attempt={verificationAttempt} />
          <button
            disabled={!!siteKey && !token}
            className="secondary"
            onClick={async () => {
              try {
                const r = await api<{ detail: string }>("/auth/verification/request", "POST", {
                  turnstile_token: token || null,
                });
                setNote(r.detail);
              } catch (e) {
                setNote(e instanceof Error ? e.message : "Email failed");
              } finally {
                setToken("");
                setVerificationAttempt((attempt) => attempt + 1);
              }
            }}
          >
            Send verification link
          </button>
          <button className="text-button" onClick={() => void refresh()}>
            Check verification
          </button>
          {note && <p role="status">{note}</p>}
        </div>
      )}
      {status?.verified && !status.consented && (
        <div className="notice">
          <strong>Choose to share context with Groq.</strong>
          <p>
            Your questions and relevant holdings, quantities and dated valuations from the selected portfolio will be
            sent to Groq for AI processing. Identity, credentials and unrelated portfolios are excluded. Public research
            uses separate public asset queries. Chat history is retained for 30 days and can be deleted.
          </p>
          <button
            onClick={async () => {
              await api("/account/ai-consent", "POST");
              await refresh();
            }}
          >
            Allow selected portfolio context
          </button>
        </div>
      )}
      {status && !status.configured && (
        <p className="notice">
          The assistant is waiting for its verified free provider connection. Portfolio features remain available.
        </p>
      )}
      <div className="chat-history-picker">
        <label className="field">
          <span>Conversations</span>
          <select
            disabled={busy}
            value={selected?.id || ""}
            onChange={(e) => {
              if (e.target.value) void open(e.target.value);
            }}
          >
            <option value="">New conversation</option>
            {conversations.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>
        </label>
        {selected && (
          <button
            className="icon-button"
            disabled={busy}
            aria-label="Delete conversation"
            onClick={async () => {
              await api("/chat/conversations/" + selected.id, "DELETE");
              setSelected(null);
              await refresh();
            }}
          >
            <Trash2 size={17} />
          </button>
        )}
      </div>
      <div className="chat-messages" aria-live="polite">
        {!selected?.messages.length && !partial && (
          <div className="chat-empty">
            <SparklesIcon />
            <h3>What would you like to understand?</h3>
            {["Explain my allocation", "Which prices need updating?", "Add 0.25 BTC bought on 1 January 2024"].map(
              (text) => (
                <button className="secondary" key={text} onClick={() => setPrompt(text)}>
                  {text}
                </button>
              ),
            )}
          </div>
        )}
        {selected?.messages.map((m) => (
          <article key={m.id} className={"chat-message " + m.role}>
            <span>{m.role === "user" ? "You" : "Lokifi"}</span>
            {m.role === "assistant" ? <Answer text={m.content} /> : <p>{m.content}</p>}
          </article>
        ))}
        {partial && (
          <article className="chat-message assistant">
            <span>Lokifi</span>
            <Answer text={partial} />
          </article>
        )}
        {[...(selected?.proposals || []), ...liveProposals].map((p) => (
          <ProposalCard
            key={p.id}
            proposal={p}
            onSaved={() => {
              if (selected) void open(selected.id);
              onChanged();
            }}
          />
        ))}
        {sources.map((s, i) => (
          <a className="text-link chat-source" key={i} href={s.url} target="_blank" rel="noreferrer">
            {s.title}
            <ArrowUpRight size={13} />
          </a>
        ))}
        {selected?.runs
          .flatMap((r) => r.events.filter((e) => e.type === "citation"))
          .map((e, i) =>
            typeof e.data.url === "string" && e.data.url.startsWith("https://") ? (
              <a className="text-link chat-source" href={e.data.url} key={i} target="_blank" rel="noreferrer">
                {String(e.data.title || "Source")}
                <ArrowUpRight size={13} />
              </a>
            ) : null,
          )}
      </div>
      {selected?.runs[0]?.status === "running" && !busy && (
        <div className="notice" role="status">
          This response is still running. Refreshing retrieves its saved result without another model request.
          <button className="secondary" onClick={() => void open(selected.id)}>
            Refresh response
          </button>
          <button
            className="secondary"
            onClick={async () => {
              try {
                await api(`/chat/runs/${selected.runs[0].id}/cancel`, "POST");
                await open(selected.id);
              } catch (e) {
                setError(e instanceof Error ? e.message : "Could not stop this response");
              }
            }}
          >
            Stop response
          </button>
        </div>
      )}
      {selected?.runs[0] && ["cancelled", "failed", "interrupted"].includes(selected.runs[0].status) && (
        <p role="status" className="notice">
          {selected.runs[0].status === "cancelled" ? "Response stopped." : "The last response did not finish."} Your
          records were not changed by the response. Any pending proposal still requires confirmation.
        </p>
      )}
      {progress && (
        <p role="status" className="muted">
          {progress}
        </p>
      )}
      {error && (
        <p role="alert" className="error">
          {error}
          {lastRequest.current && (
            <button className="secondary" disabled={busy} onClick={() => void send(true)}>
              Retrieve existing response
            </button>
          )}
          {lastRequest.current && (
            <button className="secondary" disabled={busy} onClick={() => void send(true, true)}>
              Retry as new turn
            </button>
          )}
        </p>
      )}
      <form
        className="chat-composer"
        onSubmit={(e) => {
          e.preventDefault();
          void send();
        }}
      >
        <label className="sr-only" htmlFor="chat-prompt">
          Message the assistant
        </label>
        <textarea
          id="chat-prompt"
          maxLength={2000}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Ask about your portfolio…"
          disabled={!status?.verified || !status?.consented || !status?.configured || status.remaining_turns === 0}
        />
        {busy ? (
          <button
            type="button"
            onClick={async () => {
              try {
                if (runId.current) await api("/chat/runs/" + runId.current + "/cancel", "POST");
              } catch {
                setError("The connection was stopped; retrieve the response to check its final status.");
              } finally {
                abort.current?.abort();
              }
            }}
          >
            <Square size={16} />
            Stop
          </button>
        ) : (
          <button
            disabled={
              !prompt.trim() ||
              !status?.verified ||
              !status?.consented ||
              !status?.configured ||
              status.remaining_turns === 0
            }
          >
            <Send size={16} />
            Send
          </button>
        )}
      </form>
      <p className="small muted">
        {status?.remaining_turns ?? 0} free turns left today · Groq-hosted AI · Changes always require confirmation.
      </p>
    </section>
  );
}
function SparklesIcon() {
  return <MessageSquare size={32} />;
}
