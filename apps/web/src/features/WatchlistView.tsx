"use client";
import { Plus, Star, X } from "lucide-react";
import { api, type Watch } from "../api";
import { categoryNames } from "../constants";
import type { Action, OpenPanel } from "./types";
export function WatchlistView({
  watchlist,
  open,
  action,
  busy,
}: {
  watchlist: Watch[];
  open: OpenPanel;
  action: Action;
  busy: boolean;
}) {
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">KEEP IN VIEW</p>
          <h1>Your watchlist</h1>
          <p className="muted">A place for instruments you want to come back to.</p>
        </div>
        <button onClick={() => open("watch")}>
          <Plus size={17} />
          Add instrument
        </button>
      </div>
      <section className="card">
        {watchlist.length ? (
          <div className="watch-grid">
            {watchlist.map((w) => (
              <article className="watch-item" key={w.id}>
                <div className={"asset-mark " + w.instrument.category}>{w.instrument.name.slice(0, 1)}</div>
                <div>
                  <h3>{w.instrument.name}</h3>
                  <p className="small muted">
                    {w.instrument.identifier} · {w.instrument.venue}
                  </p>
                  <span className="badge neutral">
                    {categoryNames[w.instrument.category]} · {w.instrument.currency}
                  </span>
                </div>
                <button
                  aria-label={"Remove " + w.instrument.name + " from watchlist"}
                  className="icon-button"
                  onClick={() => void action(() => api(`/watchlist/${w.id}`, "DELETE"), "Removed from watchlist.")}
                  disabled={busy}
                >
                  <X size={18} />
                </button>
              </article>
            ))}
          </div>
        ) : (
          <div className="empty">
            <Star size={32} />
            <h2>A little space for what’s next.</h2>
            <p>
              Save an instrument by its identifier and exchange.
              <br />
              No prices or trading signals are generated here.
            </p>
            <button className="secondary" onClick={() => open("watch")}>
              Add your first instrument
              <Plus size={16} />
            </button>
          </div>
        )}
      </section>
    </>
  );
}
